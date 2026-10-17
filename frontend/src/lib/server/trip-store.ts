import { randomUUID } from "node:crypto";
import path from "node:path";
import { defaultPrefs, mockGroups, mockPlacePools } from "@/lib/mock";
import type { CreateGroupInput, Group, Itinerary, NewMember, Place, ReactionKind, Reel, TimeBlock, TripPrefs } from "@/lib/types";

const { extractInstagram } = require("../../../../backend/src/services/instagram-extract");
const cacheStore = process.env.INSTAGRAM_CACHE_DIR ?? path.resolve(process.cwd(), "..", "backend", ".data", "instagram");

const groups: Group[] = structuredClone(mockGroups);
const reelsByGroup = new Map<string, Reel[]>();
const prefsByGroup = new Map<string, TripPrefs>();
const itineraryByGroup = new Map<string, Itinerary>();
let sequence = 1;
const BLOCKS: TimeBlock[] = ["morning", "afternoon", "evening"];
const BLOCK_START: Record<TimeBlock, string> = { morning: "10:00", afternoon: "14:00", evening: "19:00" };
const MIAMI_DEMO_NOTES = [
  "Beach, brunch, and Little Havana.",
  "City views, gardens, and local food.",
  "Street art, dinner, and an island escape.",
  "Design, coffee, and rooftop views.",
  "Extra time for your favorite Miami stops.",
];
const REACTION_PRIORITY: Record<ReactionKind, number> = {
  interested: 0,
  price: 1,
  distance: 1,
  effort: 1,
  pass: 2,
};
const REACTION_KINDS = new Set<ReactionKind>(["interested", "pass", "price", "distance", "effort"]);

function prioritySort(places: Place[]) {
  return [...places].sort((a, b) =>
    (a.mine ? REACTION_PRIORITY[a.mine] : 1.5) - (b.mine ? REACTION_PRIORITY[b.mine] : 1.5),
  );
}

function schedulePlaces(places: Place[]) {
  places.forEach((place, index) => {
    const slot = index % BLOCKS.length;
    place.day = Math.floor(index / BLOCKS.length) + 1;
    place.time_block = BLOCKS[slot];
    place.start_time = BLOCK_START[BLOCKS[slot]];
    place.duration_min = slot === 1 ? 120 : 90;
  });
}

function groupOrThrow(groupId: string) {
  const group = groups.find((item) => item.id === groupId);
  if (!group) throw new Error("Trip not found");
  return group;
}

function candidatePlace(candidate: {
  name: string;
  locationContext?: string | null;
  evidence?: Array<{ quote?: string }>;
}, reelUrl: string, contributor: string): Place {
  const quote = candidate.evidence?.[0]?.quote ?? `Named in ${reelUrl}`;
  const summary = quote.split(/\s+[—–-]\s+/u).slice(1).join(" — ").trim();
  return {
    id: randomUUID(),
    name: candidate.name,
    summary,
    location: candidate.locationContext ?? "",
    cost: "",
    caveats: [],
    label: "strong",
    reason: "",
    contributors: [contributor],
    reelUrl,
    counts: {},
    mine: null,
    status: "ready",
    day: null,
  };
}

export function listTrips() {
  return groups.map((group) => ({ ...group, reel_count: (reelsByGroup.get(group.id) ?? []).length }));
}

export function createTrip(input: CreateGroupInput) {
  if (!input || typeof input.name !== "string" || !input.name.trim() || typeof input.destination !== "string" || !input.destination.trim()) {
    throw new TypeError("Trip name and destination are required");
  }
  if (!Array.isArray(input.members)) throw new TypeError("Trip members must be a list");
  const members: Group["members"] = input.members.map((member: NewMember) => {
    if (typeof member.name !== "string" || !member.name.trim()) throw new TypeError("Each member needs a name");
    return { id: `member-${randomUUID()}`, name: member.name.trim(), phone: typeof member.phone === "string" ? member.phone.trim() : "" };
  });
  const group: Group = {
    id: `trip-${randomUUID()}`,
    name: input.name.trim(),
    destination: input.destination.trim(),
    start_date: null,
    end_date: null,
    reel_count: 0,
    members,
  };
  groups.unshift(group);
  return group;
}

export function getTrip(groupId: string) {
  const group = groupOrThrow(groupId);
  return { ...group, reel_count: (reelsByGroup.get(group.id) ?? []).length };
}

export function listReels(groupId: string) {
  groupOrThrow(groupId);
  return reelsByGroup.get(groupId) ?? [];
}

export function confirmPlace(groupId: string, placeId: string) {
  groupOrThrow(groupId);
  const place = (reelsByGroup.get(groupId) ?? []).flatMap((reel) => reel.places).find((item) => item.id === placeId);
  if (!place) throw new Error("Place not found");
  place.status = "ready";
  return place;
}

export function reactToPlace(groupId: string, placeId: string, kind: ReactionKind) {
  groupOrThrow(groupId);
  if (!REACTION_KINDS.has(kind)) throw new TypeError("Invalid reaction");
  const reelPlace = (reelsByGroup.get(groupId) ?? []).flatMap((reel) => reel.places).find((item) => item.id === placeId);
  const plan = itineraryByGroup.get(groupId);
  const planPlace = plan?.places.find((item) => item.id === placeId);
  const place = reelPlace ?? planPlace;
  if (!place) throw new Error("Place not found");

  const updateReaction = (item: Place) => {
    const previous = item.mine;
    if (previous) item.counts[previous] = Math.max(0, (item.counts[previous] ?? 1) - 1);
    if (previous === kind) {
      item.mine = null;
    } else {
      item.mine = kind;
      item.counts[kind] = (item.counts[kind] ?? 0) + 1;
    }
  };
  updateReaction(place);
  if (planPlace && planPlace !== place) updateReaction(planPlace);

  if (plan?.generated) {
    const places = prioritySort(plan.places);
    schedulePlaces(places);
    plan.places = places;
  }
  return structuredClone(place);
}

export function getTripPrefs(groupId: string): TripPrefs {
  const group = groupOrThrow(groupId);
  return structuredClone(prefsByGroup.get(groupId) ?? {
    ...defaultPrefs,
    start_date: group.start_date,
    end_date: group.end_date,
  });
}

export function updateTripPrefs(groupId: string, prefs: TripPrefs): TripPrefs {
  groupOrThrow(groupId);
  if (!prefs || !["walk", "transit", "car"].includes(prefs.transport) || !["chill", "balanced", "packed"].includes(prefs.pace) || !Array.isArray(prefs.interests)) {
    throw new TypeError("Invalid trip preferences");
  }
  prefsByGroup.set(groupId, structuredClone(prefs));
  return structuredClone(prefs);
}

export function getItinerary(groupId: string): Itinerary {
  groupOrThrow(groupId);
  return structuredClone(itineraryByGroup.get(groupId) ?? {
    generated: false,
    days: [],
    places: (reelsByGroup.get(groupId) ?? []).flatMap((reel) => reel.places).filter((place) => place.status === "ready"),
  });
}

export function generateItinerary(groupId: string, overwrite = false): Itinerary {
  const group = groupOrThrow(groupId);
  const previous = itineraryByGroup.get(groupId);
  if (previous?.generated && !overwrite) throw new Error("confirm_required");
  let places = (reelsByGroup.get(groupId) ?? []).flatMap((reel) => reel.places).filter((place) => place.status === "ready");
  const useMiamiDemo = places.length === 0 && group.destination === "Miami, Florida";
  if (useMiamiDemo) places = structuredClone(mockPlacePools.bigsur);
  if (!places.length) throw new Error("Confirm at least one place before generating a recommendation");
  places = prioritySort(places);

  const dayCount = Math.ceil(places.length / BLOCKS.length);
  const days = Array.from({ length: dayCount }, (_, index) => ({
    day: index + 1,
    explanation: useMiamiDemo
      ? MIAMI_DEMO_NOTES[index] ?? "Explore more Miami stops from the Reel."
      : `Draft from ${group.destination} places confirmed by your group.`,
  }));
  schedulePlaces(places);
  const plan: Itinerary = { generated: true, days, places: structuredClone(places) };
  itineraryByGroup.set(groupId, plan);
  return structuredClone(plan);
}

export async function importReel(groupId: string, url: string): Promise<Reel> {
  const group = groupOrThrow(groupId);
  if (typeof url !== "string" || !url.trim()) throw new TypeError("A public Instagram URL is required");
  const existing = (reelsByGroup.get(groupId) ?? []).find((reel) => reel.url === url.trim());
  if (existing) return existing;

  let extraction;
  try {
    extraction = await extractInstagram(url.trim(), {
      allowPaidRun: process.env.ALLOW_PAID_GLASSER === "true",
      store: cacheStore,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Instagram extraction failed";
    if (message.includes("requires approval")) {
      throw new Error("This new Reel needs paid-call approval before it can be extracted.");
    }
    throw new Error("Instagram extraction failed");
  }

  const reel: Reel = {
    id: randomUUID(),
    url: extraction.canonicalUrl,
    status: extraction.status === "completed" ? "ready" : "failed",
    sources: extraction.extraction?.sources ?? [],
    uncertainties: extraction.extraction?.uncertainties ?? [],
    places: (extraction.extraction?.candidates ?? []).map((candidate: Parameters<typeof candidatePlace>[0]) =>
      candidatePlace(candidate, extraction.canonicalUrl, group.members[0]?.name ?? "Group member"),
    ),
  };
  itineraryByGroup.delete(groupId);
  reelsByGroup.set(groupId, [...(reelsByGroup.get(groupId) ?? []), reel]);
  return reel;
}
