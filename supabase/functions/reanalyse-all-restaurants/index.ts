import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BATCH_SIZE = 10;
const DELAY_MS = 500;

interface RestaurantRow {
  id: string;
  place_id: string | null;
  name: string;
  address: string;
  venue_type: string;
  google_rating: number;
  google_review_count: number;
  image_url: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const offset = typeof body.offset === "number" ? body.offset : 0;

    const { data, error } = await supabase
      .from("restaurants")
      .select("id, place_id, name, address, venue_type, google_rating, google_review_count, image_url")
      .order("name", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const restaurants: RestaurantRow[] = data ?? [];

    if (restaurants.length === 0) {
      return new Response(
        JSON.stringify({ message: "No more restaurants to process", processed: 0, next_offset: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: { id: string; name: string; success: boolean; toddler_score?: number; confidence?: number; error?: string }[] = [];

    for (const restaurant of restaurants) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/ingest-restaurant`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            restaurant_id: restaurant.id,
            place_id: restaurant.place_id,
            name: restaurant.name,
            address: restaurant.address,
            venue_type: restaurant.venue_type,
            google_rating: restaurant.google_rating,
            google_review_count: restaurant.google_review_count,
            image_url: restaurant.image_url,
            force_refresh: false,
          }),
        });

        if (res.ok) {
          const resBody = await res.json();
          results.push({
            id: restaurant.id,
            name: restaurant.name,
            success: true,
            toddler_score: resBody.toddler_score,
            confidence: resBody.confidence,
          });
        } else {
          const resBody = await res.text();
          results.push({ id: restaurant.id, name: restaurant.name, success: false, error: resBody });
        }
      } catch (err) {
        results.push({
          id: restaurant.id,
          name: restaurant.name,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }

      await sleep(DELAY_MS);
    }

    const successCount = results.filter((r) => r.success).length;
    const nextOffset = restaurants.length === BATCH_SIZE ? offset + BATCH_SIZE : null;

    return new Response(
      JSON.stringify({
        processed: successCount,
        failed: results.length - successCount,
        next_offset: nextOffset,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
