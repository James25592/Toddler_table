import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const REVIEW_CACHE_TTL_DAYS = 7;
const BATCH_SIZE = 5;

interface RestaurantRow {
  id: string;
  place_id: string | null;
  name: string;
  address: string;
  venue_type: string;
  google_rating: number;
  google_review_count: number;
  image_url: string;
  last_review_fetch: string | null;
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

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - REVIEW_CACHE_TTL_DAYS);

    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "id, place_id, name, address, venue_type, google_rating, google_review_count, image_url, last_review_fetch",
      )
      .or(`last_review_fetch.is.null,last_review_fetch.lt.${cutoff.toISOString()}`)
      .order("last_review_fetch", { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stale: RestaurantRow[] = data ?? [];

    if (stale.length === 0) {
      return new Response(
        JSON.stringify({ message: "All restaurants have fresh review data", refreshed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: { id: string; success: boolean; google_api_called?: boolean; error?: string }[] =
      [];

    for (const restaurant of stale) {
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
          }),
        });

        if (res.ok) {
          const body = await res.json();
          results.push({
            id: restaurant.id,
            success: true,
            google_api_called: body.google_api_called ?? false,
          });
        } else {
          const body = await res.text();
          results.push({ id: restaurant.id, success: false, error: body });
        }
      } catch (err) {
        results.push({
          id: restaurant.id,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const googleCallCount = results.filter((r) => r.google_api_called).length;

    return new Response(
      JSON.stringify({
        refreshed: successCount,
        google_api_calls_made: googleCallCount,
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
