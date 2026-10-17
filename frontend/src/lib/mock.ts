import type { Group } from "./types";

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
    name: "Big Sur Weekend",
    destination: "Big Sur, California",
    start_date: null,
    end_date: null,
    reel_count: 0,
    members: [
      { id: "m6", name: "Dev Shah", phone: "+14155550102" },
      { id: "m7", name: "Ana Ruiz", phone: "+14155550105" },
      { id: "m8", name: "Tom Ng", phone: "+14155550106" },
      { id: "m9", name: "Priya Rao", phone: "+14155550107" },
    ],
  },
];
