import type { Group, Place, Reel, TripPrefs } from "./types";

export const mockGroups: Group[] = [
  {
    id: "lisbon",
    name: "Lisbon Girls Trip",
    destination: "Lisbon, Portugal",
    start_date: "2026-06-12",
    end_date: "2026-06-15",
    reel_count: 14,
    members: [
      { id: "m1", name: "Maya Patel", phone: "+14155550101" },
      { id: "m2", name: "Dev Shah", phone: "+14155550102" },
      { id: "m3", name: "Sam Lee", phone: "+14155550103" },
    ],
  },
  {
    id: "tokyo",
    name: "Tokyo Spring Break",
    destination: "Tokyo, Japan",
    start_date: null,
    end_date: null,
    reel_count: 6,
    members: [
      { id: "m4", name: "Maya Patel", phone: "+14155550101" },
      { id: "m5", name: "Jo Kim", phone: "+14155550104" },
    ],
  },
  {
    id: "bigsur",
    name: "Miami Reel Demo",
    destination: "Miami, Florida",
    start_date: "2026-10-17",
    end_date: "2026-10-19",
    reel_count: 0,
    members: [
      { id: "m6", name: "Dev Shah", phone: "+14155550102" },
      { id: "m7", name: "Ana Ruiz", phone: "+14155550105" },
      { id: "m8", name: "Tom Ng", phone: "+14155550106" },
      { id: "m9", name: "Priya Rao", phone: "+14155550107" },
    ],
  },
];

export const defaultPrefs: TripPrefs = {
  base: "",
  start_date: null,
  end_date: null,
  transport: "transit",
  budget_pp: "",
  pace: "balanced",
  interests: [],
  notes: "",
};

const place = (id: string, over: Partial<Place>): Place => ({
  id,
  name: "",
  summary: "",
  location: "",
  cost: "Cost unknown",
  caveats: [],
  label: "needs_info",
  reason: "",
  contributors: ["Maya"],
  reelUrl: "https://www.instagram.com/reel/mock/",
  counts: {},
  mine: null,
  status: "ready",
  day: null,
  ...over,
});

// per-group place pools; mock research draws only from its own group's pool
export const mockPlacePools: Record<string, Place[]> = {
  lisbon: [
    place("lis1", {
      name: "Time Out Market",
      summary: "Food hall with stalls from well-known local chefs.",
      location: "Cais do Sodré",
      cost: "EUR 15 pp",
      caveats: ["Busy at peak meal times"],
      label: "strong",
      reason: "Broad food interest, fits budget, easy to reach.",
    }),
    place("lis2", {
      name: "Miradouro da Senhora do Monte",
      summary: "Hilltop viewpoint over the city.",
      location: "Graça",
      caveats: ["Steep walk up", "Hours not found"],
      label: "discuss",
      reason: "Good for photos but effort concerns are open.",
      counts: { interested: 1, effort: 1 },
    }),
    place("lis3", {
      name: "Pastéis de Belém",
      summary: "Bakery known for custard tarts.",
      location: "Belém",
      cost: "EUR 3 pp",
      caveats: ["Queue length not confirmed"],
      label: "strong",
      reason: "Cheap, popular suggestion, one area with other sights.",
    }),
    place("lis4", {
      name: "LX Factory",
      summary: "Converted industrial complex with shops and cafes.",
      location: "Alcântara",
      reason: "No cost or hours retrieved yet.",
    }),
    place("lis5", {
      name: "Ramiro",
      summary: "Seafood restaurant. Match is ambiguous.",
      location: "Possible matches in Intendente and Alvalade",
      status: "needs_confirmation",
      reason: "Two locations matched. Confirm which one.",
    }),
  ],
  tokyo: [
    place("tok1", {
      name: "Tsukiji Outer Market",
      summary: "Street-food stalls around the former fish market.",
      location: "Chūō",
      caveats: ["Many stalls close by early afternoon"],
      label: "strong",
      reason: "Food-focused and easy by transit.",
    }),
    place("tok2", {
      name: "Shibuya Sky",
      summary: "Rooftop observation deck.",
      location: "Shibuya",
      caveats: ["Ticket price not retrieved"],
      reason: "Cost and booking needs unknown.",
    }),
    place("tok3", {
      name: "teamLab Planets",
      summary: "Walk-through digital art museum.",
      location: "Toyosu",
      label: "discuss",
      reason: "Popular pick, cost not retrieved.",
    }),
  ],
  bigsur: [
    place("mi1", {
      name: "South Beach",
      summary: "Turquoise water, white sand, and classic Miami beach energy.",
      location: "Miami Beach",
      label: "strong",
      reason: "A signature beach stop.",
    }),
    place("mi2", {
      name: "Pura Vida Miami",
      summary: "Healthy brunch and a relaxed Miami café vibe.",
      location: "Miami",
      label: "strong",
      reason: "A popular brunch stop.",
    }),
    place("mi3", {
      name: "Little Havana",
      summary: "Cuban culture, music, and cafecito along Calle Ocho.",
      location: "Calle Ocho, Miami",
      label: "strong",
      reason: "A lively neighborhood visit.",
    }),
    place("mi4", {
      name: "South Pointe Park",
      summary: "Sunset views at the southern tip of Miami Beach.",
      location: "Miami Beach",
      label: "strong",
      reason: "A scenic sunset stop.",
    }),
    place("mi5", {
      name: "Brickell district",
      summary: "Modern skyline, rooftop bars, and city views.",
      location: "Brickell, Miami",
      label: "strong",
      reason: "A city neighborhood stop.",
    }),
    place("mi6", {
      name: "Vizcaya Museum & Gardens",
      summary: "A European-style villa and gardens in a tropical setting.",
      location: "Coconut Grove, Miami",
      label: "strong",
      reason: "Museum and garden visit.",
    }),
    place("mi7", {
      name: "El Bagel",
      summary: "A casual stop for bagels.",
      location: "Miami",
      label: "strong",
      reason: "An easy breakfast stop.",
    }),
    place("mi8", {
      name: "Wynwood Walls",
      summary: "Outdoor murals and colorful street art.",
      location: "Wynwood, Miami",
      label: "strong",
      reason: "A walkable art stop.",
    }),
    place("mi9", {
      name: "Baires Grill, Miami Beach",
      summary: "Argentine parrilla and grilled steaks.",
      location: "Miami Beach",
      label: "strong",
      reason: "A dinner option.",
    }),
    place("mi10", {
      name: "Key Biscayne",
      summary: "A peaceful island escape with clear water and tropical views.",
      location: "Key Biscayne, Florida",
      label: "strong",
      reason: "An island and beach day option.",
    }),
    place("mi11", {
      name: "Miami Design District",
      summary: "Designer boutiques, contemporary art, and restaurants.",
      location: "Miami Design District",
      label: "strong",
      reason: "A shopping and art neighborhood stop.",
    }),
    place("mi12", {
      name: "Joe & The Juice",
      summary: "Coffee and juice before a day out.",
      location: "Miami",
      label: "strong",
      reason: "A quick café stop.",
    }),
    place("mi13", {
      name: "Sugar (East Miami)",
      summary: "Rooftop drinks with skyline views.",
      location: "Brickell, Miami",
      label: "strong",
      reason: "A rooftop evening stop.",
    }),
  ],
};

export const genericPool = (destination: string): Place[] => [
  place("gen1", {
    name: "Central market",
    summary: "Local market suggested in a Reel.",
    location: destination,
    reason: "Details not retrieved yet.",
  }),
  place("gen2", {
    name: "Old town walk",
    summary: "Self-guided walk through the historic centre.",
    location: destination,
    label: "discuss",
    reason: "Effort and timing open.",
  }),
];

const reel = (id: string, tag: string, places: Place[]): Reel => ({
  id,
  url: `https://www.instagram.com/reel/${tag}/`,
  status: "ready",
  places: places.map((p) => ({ ...p, reelUrl: `https://www.instagram.com/reel/${tag}/` })),
});

export const mockReels: Record<string, Reel[]> = {
  lisbon: [
    reel("r-lis1", "lisA", mockPlacePools.lisbon.slice(0, 2)),
    reel("r-lis2", "lisB", mockPlacePools.lisbon.slice(2, 5)),
  ],
  tokyo: [reel("r-tok1", "tokA", mockPlacePools.tokyo.slice(0, 2))],
  bigsur: [],
};
