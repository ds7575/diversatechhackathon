export type GroupMember = {
  id: string;
  name: string;
  phone: string;
};

export type NewMember = {
  name: string;
  phone: string;
};

export type Group = {
  id: string;
  name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  members: GroupMember[];
  reel_count: number;
};

export type CreateGroupInput = {
  name: string;
  destination: string;
  members: NewMember[];
};

export type ReelStatus = "processing" | "ready" | "failed";
export type ReelSource = {
  source: "caption" | "transcript" | "on_screen_text";
  timestamp_seconds: number | null;
  extracted_text: string;
  uncertainty?: { uncertain: boolean; incomplete: boolean; reason: string | null };
};
export type TimeBlock = "morning" | "afternoon" | "evening";
export type RecLabel = "strong" | "discuss" | "needs_info";
export type ReactionKind = "interested" | "pass" | "price" | "distance" | "effort";

export type Place = {
  id: string;
  name: string;
  summary: string;
  location: string;
  cost: string;
  caveats: string[];
  label: RecLabel;
  reason: string;
  contributors: string[];
  reelUrl: string;
  counts: Partial<Record<ReactionKind, number>>;
  mine: ReactionKind | null;
  status: "ready" | "needs_confirmation";
  day: number | null;
  // optional suggested timing; null/undefined = no time
  time_block?: TimeBlock | null;
  start_time?: string | null; // "HH:MM"
  duration_min?: number | null;
};

export type Reel = {
  id: string;
  url: string;
  status: ReelStatus;
  places: Place[];
  sources?: ReelSource[];
  uncertainties?: string[];
};

export type Transport = "walk" | "transit" | "car";
export type Pace = "chill" | "balanced" | "packed";

export type TripPrefs = {
  base: string;
  start_date: string | null;
  end_date: string | null;
  transport: Transport;
  budget_pp: string;
  pace: Pace;
  interests: string[];
  notes: string;
};

export type ItineraryDay = { day: number; explanation: string };

export type Itinerary = {
  generated: boolean;
  days: ItineraryDay[];
  places: Place[]; // confirmed places; day === null means Standby
};
