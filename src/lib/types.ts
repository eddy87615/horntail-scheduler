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
}

export interface AvailRecord {
  name: string;
  slots: string[];
  updatedAt: number;
}

export interface UserRecord {
  name: string;
  hash: string;
  createdAt: number;
}
