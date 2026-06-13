/* ----------------------------- shared types ------------------------------ */
export interface User {
  name: string;
}

export interface RaidEvent {
  id: string;
  title: string;
  bossId?: string;
  dates: string[];
  startH: number;
  endH: number;
  step: number;
  participants: string[];
  createdAt: number;
  deadline?: string; // ISO date "YYYY-MM-DD"; filling locks after this day
  ownerName?: string; // creator's identity; only they can unlock after deadline
  unlocked?: boolean; // owner re-opened filling past the deadline
  deleted?: boolean; // soft-deleted: hidden from the list but kept in storage
  deletedAt?: number;
}

export interface AvailRecord {
  name: string;
  slots: string[];
  updatedAt: number;
}

export interface UserRecord {
  name: string;
  jobId?: string;
  hash: string;
  createdAt: number;
}
