import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Reads credentials from .env (VITE_ vars are inlined at build time).
   If they are missing the app still runs, falling back to device-local
   localStorage — so nothing breaks before you connect Supabase. */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Supabase renamed the browser key: "Publishable key" (new) === "anon key" (old).
// Accept either env name so the dashboard's copy-paste snippet works as-is.
const key =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

export const isSupabaseEnabled = Boolean(supabase);

/** The shared key/value table all events & availabilities live in. */
export const KV_TABLE = "kv";
