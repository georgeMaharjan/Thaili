import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Static SPA + Capacitor: the client talks to Supabase directly from the device.
// NEXT_PUBLIC_* are inlined at build time. Absent → local mode, no persistence.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anon);

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

// Spec §22: no account creation up front. Every install starts as an anonymous
// user; "Back up your data" later links an email via supabase.auth.updateUser,
// which keeps the same user id so all rows stay owned.
// Shared across callers: load() and push registration both run at startup, and
// two concurrent anonymous sign-ins would split one person across two users.
let pending: Promise<string | null> | null = null;
export function ensureSession(): Promise<string | null> {
  pending ??= signIn().finally(() => { pending = null; });
  return pending;
}

async function signIn(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn("[thaili] anonymous sign-in failed:", error.message);
    return null;
  }
  return signed.user?.id ?? null;
}
