import { defaultPrefs, genericPool, mockGroups, mockPlacePools, mockReels } from "./mock";
import type {
  CreateGroupInput,
  Group,
  Itinerary,
  Place,
  NewMember,
  ReactionKind,
  TimeBlock,
  Reel,
  TripPrefs,
} from "./types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

// in-memory store so mock edits survive client-side navigation
const store: Group[] = structuredClone(mockGroups);
let seq = 100;
const nextId = () => `mock-${seq++}`;

const reelStore: Record<string, Reel[]> = structuredClone(mockReels);
const prefStore: Record<string, TripPrefs> = {};
const planStore: Record<string, { generated: boolean; days: Itinerary["days"] }> = {};
const DAYS = 3;
const BLOCK_ORDER: TimeBlock[] = ["morning", "afternoon", "evening"];
const BLOCK_DEFAULTS: Record<TimeBlock, { start: string; min: number }> = {
  morning: { start: "10:00", min: 90 },
  afternoon: { start: "14:00", min: 120 },
  evening: { start: "19:00", min: 90 },
};
const applyBlock = (p: Place, block: TimeBlock) => {
  p.time_block = block;
  p.start_time = BLOCK_DEFAULTS[block].start;
  p.duration_min = p.duration_min ?? BLOCK_DEFAULTS[block].min;
};
const reelsOf = (gid: string) => (reelStore[gid] ??= []);
const withReelCount = (g: Group): Group => ({ ...g, reel_count: reelsOf(g.id).length });
const allPlaces = (gid: string) => reelsOf(gid).flatMap((r) => r.places);
const readyPlaces = (gid: string) => allPlaces(gid).filter((p) => p.status === "ready");
const findPlace = (gid: string, pid: string) => {
  const p = allPlaces(gid).find((x) => x.id === pid);
  if (!p) throw new Error("Place not found");
  return p;
};
const itinerary = (gid: string): Itinerary => ({
  generated: planStore[gid]?.generated ?? false,
  days: planStore[gid]?.days ?? [],
  places: structuredClone(readyPlaces(gid)),
});

function mockResearch(gid: string, reel: Reel) {
  setTimeout(() => {
    if (reel.url.includes("fail")) {
      reel.status = "failed";
      return;
    }
    const pool = mockPlacePools[gid] ?? genericPool(store.find((g) => g.id === gid)?.destination ?? "");
    const used = allPlaces(gid).length;
    reel.places = [0, 1].map((i) => ({
      ...structuredClone(pool[(used + i) % pool.length]),
      id: nextId(),
      reelUrl: reel.url,
      day: null,
    }));
    reel.status = "ready";
  }, 2500);
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async listGroups(): Promise<Group[]> {
    if (USE_MOCK) return store.map(withReelCount);
    return http<Group[]>("/api/trips");
  },

  async getGroup(id: string): Promise<Group | null> {
    if (USE_MOCK) {
      const g = store.find((x) => x.id === id);
      return g ? withReelCount(g) : null;
    }
    return http<Group>(`/api/trips/${id}`);
  },

  async createGroup(input: CreateGroupInput): Promise<Group> {
    if (USE_MOCK) {
      const group: Group = {
        id: nextId(),
        name: input.name,
        destination: input.destination,
        start_date: null,
        end_date: null,
        reel_count: 0,
        members: input.members.map((m) => ({ ...m, id: nextId() })),
      };
      store.unshift(group);
      return withReelCount(group);
    }
    return http<Group>("/api/trips", { method: "POST", body: JSON.stringify(input) });
  },

  async addMembers(groupId: string, members: NewMember[]): Promise<Group> {
    if (USE_MOCK) {
      const group = store.find((g) => g.id === groupId);
      if (!group) throw new Error("Group not found");
      group.members.push(...members.map((m) => ({ ...m, id: nextId() })));
      return withReelCount(group);
    }
    return http<Group>(`/api/trips/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ members }),
    });
  },

  async listReels(groupId: string): Promise<Reel[]> {
    if (USE_MOCK) return structuredClone(reelsOf(groupId));
    return http<Reel[]>(`/api/trips/${groupId}/reels`);
  },

  async addReel(groupId: string, url: string): Promise<Reel> {
    if (USE_MOCK) {
      const reel: Reel = { id: nextId(), url, status: "processing", places: [] };
      reelsOf(groupId).push(reel);
      mockResearch(groupId, reel);
      return structuredClone(reel);
    }
    return http<Reel>(`/api/trips/${groupId}/reels`, { method: "POST", body: JSON.stringify({ url }) });
  },

  async retryReel(groupId: string, reelId: string): Promise<void> {
    if (USE_MOCK) {
      const reel = reelsOf(groupId).find((r) => r.id === reelId);
      if (!reel) throw new Error("Reel not found");
      reel.url = reel.url.replace("fail", "");
      reel.status = "processing";
      mockResearch(groupId, reel);
      return;
    }
    await http(`/api/trips/${groupId}/reels/${reelId}/retry`, { method: "POST" });
  },

  async reactToPlace(groupId: string, placeId: string, kind: ReactionKind): Promise<void> {
    if (USE_MOCK) {
      const p = findPlace(groupId, placeId);
      if (p.mine) p.counts[p.mine] = Math.max(0, (p.counts[p.mine] ?? 1) - 1);
      if (p.mine === kind) p.mine = null;
      else {
        p.mine = kind;
        p.counts[kind] = (p.counts[kind] ?? 0) + 1;
      }
      return;
    }
    await http(`/api/trips/${groupId}/places/${placeId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ kind }),
    });
  },

  async confirmPlace(groupId: string, placeId: string): Promise<void> {
    if (USE_MOCK) {
      findPlace(groupId, placeId).status = "ready";
      return;
    }
    await http(`/api/trips/${groupId}/places/${placeId}/confirm`, { method: "POST" });
  },

  async fixPlace(groupId: string, placeId: string, name: string): Promise<void> {
    if (USE_MOCK) {
      const p = findPlace(groupId, placeId);
      p.name = name;
      p.status = "ready";
      return;
    }
    await http(`/api/trips/${groupId}/places/${placeId}/fix`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async getTripPrefs(groupId: string): Promise<TripPrefs> {
    if (USE_MOCK) {
      const g = store.find((x) => x.id === groupId);
      return {
        ...(prefStore[groupId] ?? {
          ...defaultPrefs,
          start_date: g?.start_date ?? null,
          end_date: g?.end_date ?? null,
        }),
      };
    }
    return http<TripPrefs>(`/api/trips/${groupId}/prefs`);
  },

  async updateTripPrefs(groupId: string, prefs: TripPrefs): Promise<TripPrefs> {
    if (USE_MOCK) {
      prefStore[groupId] = { ...prefs };
      return { ...prefs };
    }
    return http<TripPrefs>(`/api/trips/${groupId}/prefs`, {
      method: "PUT",
      body: JSON.stringify(prefs),
    });
  },

  async getItinerary(groupId: string): Promise<Itinerary> {
    if (USE_MOCK) return itinerary(groupId);
    return http<Itinerary>(`/api/trips/${groupId}/itinerary`);
  },

  /** Throws Error("confirm_required") when edits exist and confirm is false. */
  async generateItinerary(groupId: string, confirm = false): Promise<Itinerary> {
    if (USE_MOCK) {
      const ready = readyPlaces(groupId);
      if (ready.length === 0) throw new Error("No ready places");
      if (!confirm && ready.some((p) => p.day !== null)) throw new Error("confirm_required");
      await new Promise((r) => setTimeout(r, 1800));
      const days = Math.min(DAYS, Math.ceil(ready.length / 2));
      ready.forEach((p, i) => {
        p.day = i < days * 2 ? (i % days) + 1 : null;
        p.time_block = null;
        p.start_time = null;
        p.duration_min = null;
      });
      for (let d = 1; d <= days; d++) {
        ready
          .filter((p) => p.day === d)
          .forEach((p, i) => applyBlock(p, BLOCK_ORDER[Math.min(i, 2)]));
      }
      planStore[groupId] = {
        generated: true,
        days: Array.from({ length: days }, (_, i) => ({
          day: i + 1,
          explanation: `Day ${i + 1} groups nearby places and leaves room for downtime.`,
        })),
      };
      return itinerary(groupId);
    }
    const res = await fetch(`${BASE}/api/trips/${groupId}/itinerary/generate`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm }),
    });
    if (res.status === 409) throw new Error("confirm_required");
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return res.json() as Promise<Itinerary>;
  },

  async moveToDay(groupId: string, placeId: string, day: number | null): Promise<void> {
    if (USE_MOCK) {
      const p = findPlace(groupId, placeId);
      p.day = day;
      if (day === null) {
        p.time_block = null;
        p.start_time = null;
        p.duration_min = null;
      }
      return;
    }
    await http(`/api/trips/${groupId}/places/${placeId}/day`, {
      method: "PUT",
      body: JSON.stringify({ day }),
    });
  },

  async moveToBlock(groupId: string, placeId: string, block: TimeBlock): Promise<void> {
    if (USE_MOCK) {
      applyBlock(findPlace(groupId, placeId), block);
      return;
    }
    await http(`/api/trips/${groupId}/places/${placeId}/block`, {
      method: "PUT",
      body: JSON.stringify({ time_block: block }),
    });
  },

  async removeFromPlan(groupId: string, placeId: string): Promise<void> {
    return api.moveToDay(groupId, placeId, null);
  },
};
