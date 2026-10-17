import { randomUUID } from "node:crypto";
import path from "node:path";
import { mockGroups } from "@/lib/mock";
import type { Group, Place, Reel } from "@/lib/types";

const { extractInstagram } = require("../../../../backend/src/services/instagram-extract");
const cacheStore = process.env.INSTAGRAM_CACHE_DIR ?? path.resolve(process.cwd(), "..", "backend", ".data", "instagram");

const groups: Group[] = structuredClone(mockGroups);
const reelsByGroup = new Map<string, Reel[]>();

function groupOrThrow(groupId: string) {
  const group = groups.find((item) => item.id === groupId);
  if (!group) throw new Error("Trip not found");
  return group;
}

function candidatePlace(candidate: {
  name: string;
  locationContext?: string | null;
  evidence?: Array<{ quote?: string }>;
}, reelUrl: string, contributor: string, uncertainties: string[]): Place {
  const quote = candidate.evidence?.[0]?.quote ?? `Named in ${reelUrl}`;
  return {
    id: randomUUID(),
    name: candidate.name,
    summary: quote,
    location: candidate.locationContext ?? "Location pending place search",
    cost: "Cost unknown",
    caveats: uncertainties,
    label: "needs_info",
    reason: "Explicitly named in this Reel; independent place details are pending.",
    contributors: [contributor],
    reelUrl,
    counts: {},
    mine: null,
    status: "needs_confirmation",
    day: null,
  };
}

export function listTrips() {
  return groups.map((group) => ({ ...group, reel_count: (reelsByGroup.get(group.id) ?? []).length }));
}

export function getTrip(groupId: string) {
  const group = groupOrThrow(groupId);
  return { ...group, reel_count: (reelsByGroup.get(group.id) ?? []).length };
}

export function listReels(groupId: string) {
  groupOrThrow(groupId);
  return reelsByGroup.get(groupId) ?? [];
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
    places: (extraction.extraction?.candidates ?? []).map((candidate: Parameters<typeof candidatePlace>[0]) =>
      candidatePlace(candidate, extraction.canonicalUrl, group.members[0]?.name ?? "Group member", extraction.extraction?.uncertainties ?? []),
    ),
  };
  reelsByGroup.set(groupId, [...(reelsByGroup.get(groupId) ?? []), reel]);
  return reel;
}
