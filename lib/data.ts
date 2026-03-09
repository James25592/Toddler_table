import { Restaurant } from './types';

export const restaurants: Restaurant[] = [
  {
    id: 'the-boileroom-cafe',
    name: 'The Boileroom Café',
    address: '13 Stoke Fields, Guildford, GU1 4LS',
    type: 'cafe',
    googleRating: 4.5,
    googleReviewCount: 312,
    toddlerScore: 4.5,
    confidence: 0.85,
    summary: 'A relaxed, artsy café with plenty of space for buggies, a dedicated kids\' menu, and staff who genuinely welcome families with young children.',
    image: 'https://images.pexels.com/photos/1581554/pexels-photo-1581554.jpeg?auto=compress&cs=tinysrgb&w=800',
    positiveSignals: [
      { category: 'pram_space', evidence: 'Wide aisles and ample floor space for prams and buggies.' },
      { category: 'kids_menu', evidence: 'Dedicated kids\' menu with healthy options.' },
      { category: 'high_chair', evidence: 'High chairs available and in good condition.' },
      { category: 'staff_child_friendly', evidence: 'Staff described as "incredibly patient and welcoming".' },
      { category: 'family_friendly', evidence: 'Quiet enough during weekday mornings for nap schedules.' },
    ],
    negativeSignals: [
      { category: 'pram_space', evidence: 'Can get busy on weekends — harder to find buggy space.' },
    ],
    reviewEvidence: [
      {
        text: 'We came with our 18-month-old and the staff couldn\'t have been more helpful. They brought a high chair without us even asking and were totally unfazed by the mess. Will definitely be back.',
        author: 'Sarah M.',
        sentiment: 'positive',
        date: 'March 2024',
      },
      {
        text: 'Brilliant place for toddlers. There\'s actually space to park the buggy without blocking everyone, which is rare in Guildford. The kids\' menu is great — proper food, not just chips.',
        author: 'James T.',
        sentiment: 'positive',
        date: 'January 2024',
      },
      {
        text: 'On a Saturday afternoon it was absolutely rammed and getting the pushchair through was a real challenge. Suggest going mid-week if you have little ones.',
        author: 'Rachel B.',
        sentiment: 'negative',
        date: 'November 2023',
      },
      {
        text: 'Baby change was clean and well-stocked. Great coffee too. My toddler had a lovely time drawing on the paper they put on the tables.',
        author: 'Tom H.',
        sentiment: 'positive',
        date: 'February 2024',
      },
    ],
    evidence_quotes: [
      'Staff brought a high chair without us even asking.',
      'Space to park the buggy without blocking everyone.',
      'Baby change was clean and well-stocked.',
    ],
    ai_negative_signals: [
      'Getting the pushchair through was a real challenge on weekends.',
    ],
  },
  {
    id: 'watts-gallery-cafe',
    name: 'Watts Gallery Artists\' Village Café',
    address: 'Down Lane, Compton, Guildford, GU3 1DQ',
    type: 'cafe',
    googleRating: 4.6,
    googleReviewCount: 489,
    toddlerScore: 5.0,
    confidence: 0.85,
    summary: 'Set within beautiful grounds, this café is a gem for families. Outdoor space, friendly staff, and an environment where toddlers can roam freely make it a top pick.',
    image: 'https://images.pexels.com/photos/2074130/pexels-photo-2074130.jpeg?auto=compress&cs=tinysrgb&w=800',
    positiveSignals: [
      { category: 'family_friendly', evidence: 'Large outdoor seating area with room for toddlers to move around.' },
      { category: 'high_chair', evidence: 'Multiple high chairs available.' },
      { category: 'kids_menu', evidence: 'Dedicated children\'s food options on the menu.' },
      { category: 'staff_child_friendly', evidence: 'Staff go out of their way to accommodate families.' },
      { category: 'pram_space', evidence: 'Spacious grounds with easy buggy access throughout.' },
    ],
    negativeSignals: [
      { category: 'family_friendly', evidence: 'Gets very busy on school holidays; book ahead.' },
    ],
    reviewEvidence: [
      {
        text: 'This is our go-to with the kids. The grounds give you breathing room and the café is so relaxed about children. High chairs, kids\' meals, activity packs — they\'ve thought of everything.',
        author: 'Chloe R.',
        sentiment: 'positive',
        date: 'April 2024',
      },
      {
        text: 'Took our two-year-old for the first time last week. She ran around the garden while we actually got to enjoy our lunch. A true find for Guildford parents.',
        author: 'Mark D.',
        sentiment: 'positive',
        date: 'March 2024',
      },
      {
        text: 'Tried to go during half-term and it was packed. No criticism of the café itself — just be aware and book a table if you can.',
        author: 'Fiona G.',
        sentiment: 'neutral',
        date: 'October 2023',
      },
    ],
    evidence_quotes: [
      'High chairs, kids\' meals, activity packs — they\'ve thought of everything.',
      'Staff go out of their way to accommodate families.',
      'She ran around the garden while we actually got to enjoy our lunch.',
    ],
    ai_negative_signals: [
      'Very busy on school holidays — book ahead.',
    ],
  },
  {
    id: 'the-ivy-guildford',
    name: 'The Ivy Castle View',
    address: 'High Street, Guildford, GU1 3AJ',
    type: 'restaurant',
    googleRating: 4.3,
    googleReviewCount: 1204,
    toddlerScore: 2.5,
    confidence: 0.6,
    summary: 'A stylish brasserie with a sophisticated atmosphere. Toddlers are accommodated but the formal setting and closely spaced tables make it better suited to older children.',
    image: 'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=800',
    positiveSignals: [
      { category: 'high_chair', evidence: 'High chairs available on request.' },
      { category: 'kids_menu', evidence: 'Children\'s menu offered.' },
    ],
    negativeSignals: [
      { category: 'cramped', evidence: 'Tables are closely packed — limited buggy space.' },
      { category: 'not_child_friendly', evidence: 'Formal, quiet atmosphere not well suited to active toddlers.' },
      { category: 'not_child_friendly', evidence: 'Other diners have been described as visibly irritated by young children.' },
    ],
    reviewEvidence: [
      {
        text: 'Beautiful restaurant but we felt uncomfortable with our toddler. The atmosphere is quite formal and the tables are so close together. Wouldn\'t rush back with a young child.',
        author: 'Amanda K.',
        sentiment: 'negative',
        date: 'February 2024',
      },
      {
        text: 'They did have a high chair and a children\'s menu which was appreciated. But it\'s not really a toddler-friendly environment — more of a special occasion place for older kids.',
        author: 'Neil S.',
        sentiment: 'neutral',
        date: 'December 2023',
      },
      {
        text: 'Lovely food and service. Probably better for families with children 5 and above. Felt awkward when my two-year-old had a meltdown — all eyes on us.',
        author: 'Priya L.',
        sentiment: 'negative',
        date: 'January 2024',
      },
    ],
    evidence_quotes: [
      'They did have a high chair and a children\'s menu.',
    ],
    ai_negative_signals: [
      'Formal, quiet atmosphere not suited to active toddlers.',
      'Tables are closely packed — limited buggy space.',
      'Other diners visibly irritated by young children.',
    ],
  },
  {
    id: 'the-anchor-pub',
    name: 'The Anchor at Pyrford',
    address: 'Pyrford Lock, Old Woking Road, Woking, GU22 8XL',
    type: 'pub',
    googleRating: 4.4,
    googleReviewCount: 876,
    toddlerScore: 4.0,
    confidence: 0.85,
    summary: 'A waterside pub with a large beer garden and easy-going attitude toward families. The space and outdoor setting make it ideal for wrangling toddlers while still enjoying a meal.',
    image: 'https://images.pexels.com/photos/1590183/pexels-photo-1590183.jpeg?auto=compress&cs=tinysrgb&w=800',
    positiveSignals: [
      { category: 'family_friendly', evidence: 'Large beer garden directly on the River Wey canal — plenty of space.' },
      { category: 'high_chair', evidence: 'Very family-friendly attitude — high chairs readily available.' },
      { category: 'kids_menu', evidence: 'Children\'s menu with solid, simple options.' },
      { category: 'pram_space', evidence: 'Outdoor space means toddlers can move freely and buggies park easily.' },
    ],
    negativeSignals: [
      { category: 'family_friendly', evidence: 'Open water nearby — requires careful supervision of toddlers.' },
      { category: 'noise_issue', evidence: 'Can be very crowded on summer weekends.' },
    ],
    reviewEvidence: [
      {
        text: 'Perfect Sunday lunch spot with a toddler. The garden is huge, the staff were lovely, and my son could toddle around without me having a heart attack. Just watch them near the lock.',
        author: 'Laura P.',
        sentiment: 'positive',
        date: 'June 2023',
      },
      {
        text: 'Great pub for families. High chairs, kids\' menu, loads of outdoor space. My two little ones were in their element. The food is decent too — proper pub grub.',
        author: 'Chris W.',
        sentiment: 'positive',
        date: 'August 2023',
      },
      {
        text: 'Lovely spot but do keep a close eye on your toddlers — the canal is right there. Not a safety issue for attentive parents but worth knowing.',
        author: 'Hannah V.',
        sentiment: 'neutral',
        date: 'May 2023',
      },
    ],
    evidence_quotes: [
      'High chairs, kids\' menu, loads of outdoor space.',
      'My son could toddle around without me having a heart attack.',
      'Staff were lovely.',
    ],
    ai_negative_signals: [
      'Open water nearby — requires careful supervision.',
      'Very crowded on summer weekends.',
    ],
  },
  {
    id: 'white-house-tea-rooms',
    name: 'White House Tea Rooms',
    address: '8 Tunsgate, Guildford, GU1 3QT',
    type: 'cafe',
    googleRating: 4.2,
    googleReviewCount: 203,
    toddlerScore: 3.0,
    confidence: 0.3,
    summary: 'A charming traditional tea room in the heart of town. Welcoming to families but compact spaces and breakable crockery mean it works best for calmer toddlers.',
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
    positiveSignals: [
      { category: 'staff_child_friendly', evidence: 'Friendly and welcoming staff toward families with children.' },
      { category: 'kids_menu', evidence: 'Small but thoughtful children\'s food selection available.' },
    ],
    negativeSignals: [
      { category: 'cramped', evidence: 'Very compact interior — buggy access is difficult.' },
      { category: 'cramped', evidence: 'Narrow aisles between tables make movement tricky with a pram.' },
    ],
    reviewEvidence: [
      {
        text: 'Lovely tea room but it is quite small. Managed to fold the buggy and store it by the door. Staff were sweet with our daughter but I wouldn\'t bring a very active toddler here.',
        author: 'Sophie C.',
        sentiment: 'neutral',
        date: 'September 2023',
      },
      {
        text: 'Genuinely charming place. The staff were lovely with my toddler. Just be aware it\'s cosy — not a place for running around!',
        author: 'Dave M.',
        sentiment: 'positive',
        date: 'October 2023',
      },
    ],
    evidence_quotes: [
      'Staff were sweet with our daughter.',
      'The staff were lovely with my toddler.',
    ],
    ai_negative_signals: [
      'Very compact interior — buggy access is difficult.',
      'Not suitable for very active toddlers.',
    ],
  },
  {
    id: 'zizzi-guildford',
    name: 'Zizzi Guildford',
    address: '3-4 Friary Street, Guildford, GU1 4EH',
    type: 'restaurant',
    googleRating: 4.0,
    googleReviewCount: 1540,
    toddlerScore: 4.0,
    confidence: 0.85,
    summary: 'A reliable family-friendly Italian chain that genuinely delivers for toddlers. Colouring sheets, high chairs, and a varied kids\' menu make it a stress-free choice.',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
    positiveSignals: [
      { category: 'family_friendly', evidence: 'Colouring sheets and crayons provided for children at the table.' },
      { category: 'kids_menu', evidence: 'Kids\' menu with wide variety including pasta, pizza, and salad.' },
      { category: 'high_chair', evidence: 'High chairs available and clean.' },
      { category: 'pram_space', evidence: 'Spacious layout accommodates buggies well.' },
      { category: 'staff_child_friendly', evidence: 'Staff are experienced with families — relaxed and helpful.' },
    ],
    negativeSignals: [
      { category: 'noise_issue', evidence: 'Can be loud at peak times — may overwhelm sensitive toddlers.' },
    ],
    reviewEvidence: [
      {
        text: 'We go here regularly with our two-year-old. They bring out the colouring sheets immediately and the kids\' menu is genuinely good. The staff are brilliant with him.',
        author: 'Karen J.',
        sentiment: 'positive',
        date: 'March 2024',
      },
      {
        text: 'Solid choice for a family meal in Guildford. High chair was ready, food came quickly (important with a hungry toddler!), and staff were completely unfazed by our chaos.',
        author: 'Ben F.',
        sentiment: 'positive',
        date: 'February 2024',
      },
      {
        text: 'Came on a Friday evening and it was very loud. Our toddler got a bit overwhelmed. Would suggest going earlier in the day or on a quieter weekday.',
        author: 'Anya R.',
        sentiment: 'negative',
        date: 'January 2024',
      },
    ],
    evidence_quotes: [
      'They bring out the colouring sheets immediately.',
      'High chair was ready, food came quickly.',
      'Staff were completely unfazed by our chaos.',
    ],
    ai_negative_signals: [
      'Can be very loud at peak times — may overwhelm sensitive toddlers.',
    ],
  },
  {
    id: 'the-weyside',
    name: 'The Weyside',
    address: 'Millbrook, Guildford, GU1 3XJ',
    type: 'pub',
    googleRating: 4.1,
    googleReviewCount: 654,
    toddlerScore: 3.5,
    confidence: 0.6,
    summary: 'A pleasant riverside pub with a nice garden. Broadly welcoming to families with decent facilities, though the indoor space can feel cramped at busy times.',
    image: 'https://images.pexels.com/photos/696218/pexels-photo-696218.jpeg?auto=compress&cs=tinysrgb&w=800',
    positiveSignals: [
      { category: 'high_chair', evidence: 'High chairs available on request.' },
      { category: 'kids_menu', evidence: 'Children\'s menu with familiar options.' },
      { category: 'staff_child_friendly', evidence: 'Welcoming attitude from staff toward families.' },
    ],
    negativeSignals: [
      { category: 'cramped', evidence: 'Indoor area can be cramped — limited buggy space.' },
      { category: 'family_friendly', evidence: 'Garden not fenced — toddlers need supervision near the river.' },
    ],
    reviewEvidence: [
      {
        text: 'Nice pub with a lovely riverside setting. They were happy to accommodate us with our toddler and high chair. Garden is a bonus in good weather.',
        author: 'Phil N.',
        sentiment: 'positive',
        date: 'July 2023',
      },
      {
        text: 'Decent enough but the baby change left a lot to be desired. The garden is lovely but unfenced so my toddler needed constant supervision near the water.',
        author: 'Clare O.',
        sentiment: 'neutral',
        date: 'August 2023',
      },
    ],
    evidence_quotes: [
      'Happy to accommodate us with our toddler and high chair.',
      'Garden is a bonus in good weather.',
    ],
    ai_negative_signals: [
      'Baby change left a lot to be desired.',
      'Garden is unfenced — toddlers need supervision near the water.',
    ],
  },
  {
    id: 'boston-tea-party',
    name: 'Boston Tea Party Guildford',
    address: '74 North Street, Guildford, GU1 4AH',
    type: 'cafe',
    googleRating: 4.4,
    googleReviewCount: 721,
    toddlerScore: 4.5,
    confidence: 0.85,
    summary: 'A bright, airy café with a genuinely welcoming approach to families. The relaxed vibe, good-quality food, and thoughtful facilities make it a favourite with Guildford parents.',
    image: 'https://images.pexels.com/photos/1813466/pexels-photo-1813466.jpeg?auto=compress&cs=tinysrgb&w=800',
    positiveSignals: [
      { category: 'pram_space', evidence: 'Spacious interior with room for buggies and prams.' },
      { category: 'kids_menu', evidence: 'Quality children\'s food — wholesome, freshly made options.' },
      { category: 'high_chair', evidence: 'High chairs in good condition and readily available.' },
      { category: 'staff_child_friendly', evidence: 'Relaxed atmosphere — staff genuinely welcoming of mess and noise.' },
      { category: 'family_friendly', evidence: 'Parents describe it as "clean and well-equipped" for baby care.' },
    ],
    negativeSignals: [
      { category: 'family_friendly', evidence: 'Can get very busy on weekend mornings.' },
    ],
    reviewEvidence: [
      {
        text: 'My favourite café in Guildford to take my toddler. The staff are so friendly, the baby change is always clean, and I can actually relax while my daughter eats. The food is genuinely good too.',
        author: 'Olivia S.',
        sentiment: 'positive',
        date: 'April 2024',
      },
      {
        text: 'We go here almost every week. They know us by now! Great high chairs, great food, and a genuinely child-friendly space. Not just tolerating kids — they actually seem to enjoy having them.',
        author: 'Dan A.',
        sentiment: 'positive',
        date: 'March 2024',
      },
      {
        text: 'Packed on Saturday morning — had to wait 15 minutes for a table. Worth it, but go early or on a weekday if you can.',
        author: 'Michelle K.',
        sentiment: 'neutral',
        date: 'February 2024',
      },
    ],
    evidence_quotes: [
      'Staff are so friendly, the baby change is always clean.',
      'Great high chairs, great food, a genuinely child-friendly space.',
      'Not just tolerating kids — they actually seem to enjoy having them.',
    ],
    ai_negative_signals: [
      'Can get very busy on weekend mornings.',
    ],
  },
];

export function getRestaurantById(id: string): Restaurant | undefined {
  return restaurants.find((r) => r.id === id);
}

export const VALID_RESTAURANT_IDS = new Set(restaurants.map((r) => r.id));
