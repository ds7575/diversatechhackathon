import { mockGroups } from "./mock";
import type { CreateGroupInput, Group, NewMember } from "./types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

// in-memory store so mock edits survive client-side navigation
const store: Group[] = structuredClone(mockGroups);
let seq = 100;
const nextId = () => `mock-${seq++}`;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const api = {
  async listGroups(): Promise<Group[]> {
    if (USE_MOCK) return [...store];
    return http<Group[]>("/api/trips");
  },

  async getGroup(id: string): Promise<Group | null> {
    if (USE_MOCK) return store.find((g) => g.id === id) ?? null;
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
      return group;
    }
    return http<Group>("/api/trips", { method: "POST", body: JSON.stringify(input) });
  },

  async addMembers(groupId: string, members: NewMember[]): Promise<Group> {
    if (USE_MOCK) {
      const group = store.find((g) => g.id === groupId);
      if (!group) throw new Error("Group not found");
      group.members.push(...members.map((m) => ({ ...m, id: nextId() })));
      return group;
    }
    return http<Group>(`/api/trips/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ members }),
    });
  },
};
