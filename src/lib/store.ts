import { supabase, isSupabaseEnabled, KV_TABLE } from "./supabase";

/* ----------------------------- storage layer -----------------------------
   Two backends behind one API:
   - shared === true  → Supabase `kv` table (synced across all devices).
                        Falls back to localStorage if Supabase isn't configured.
   - shared === false → always localStorage (this device only, e.g. session).
-------------------------------------------------------------------------- */

export const hasStore = isSupabaseEnabled;

// last-resort in-memory map for environments without localStorage
const mem = new Map<string, unknown>();

const local = {
  get<T>(key: string): T | null {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return (mem.get(key) as T) ?? null;
    }
  },
  set(key: string, val: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      mem.set(key, val);
    }
  },
  del(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      mem.delete(key);
    }
  },
  list(prefix: string): string[] {
    try {
      const out: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) out.push(k);
      }
      return out;
    } catch {
      return [...mem.keys()].filter((k) => k.startsWith(prefix));
    }
  },
};

const useCloud = (shared: boolean) => shared && isSupabaseEnabled && supabase;

export const store = {
  async get<T = unknown>(key: string, shared = true): Promise<T | null> {
    if (useCloud(shared)) {
      const { data, error } = await supabase!
        .from(KV_TABLE)
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) return null;
      return data ? (data.value as T) : null;
    }
    return local.get<T>(key);
  },

  async set(key: string, val: unknown, shared = true): Promise<boolean> {
    if (useCloud(shared)) {
      const { error } = await supabase!
        .from(KV_TABLE)
        .upsert({ key, value: val }, { onConflict: "key" });
      return !error;
    }
    local.set(key, val);
    return true;
  },

  async del(key: string, shared = true): Promise<boolean> {
    if (useCloud(shared)) {
      const { error } = await supabase!.from(KV_TABLE).delete().eq("key", key);
      return !error;
    }
    local.del(key);
    return true;
  },

  async list(prefix: string, shared = true): Promise<string[]> {
    if (useCloud(shared)) {
      const { data, error } = await supabase!
        .from(KV_TABLE)
        .select("key")
        .like("key", `${prefix}%`);
      if (error || !data) return [];
      return data.map((r) => r.key as string);
    }
    return local.list(prefix);
  },
};

/* ------------------------------- key helpers ------------------------------ */
const enc = (s: string) => encodeURIComponent(s);
export const eventKey = (id: string) => `event:${id}`;
export const availKey = (eid: string, name: string) => `avail:${eid}:${enc(name)}`;
export const userKey = (name: string) => `user:${enc(name)}`;

/* --------------------------------- hashing -------------------------------- */
export async function hashPw(s: string): Promise<string> {
  try {
    const b = new TextEncoder().encode(s + "::maple-raid");
    const h = await crypto.subtle.digest("SHA-256", b);
    return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
  } catch {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return "f" + (h >>> 0).toString(16);
  }
}
