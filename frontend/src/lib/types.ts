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
