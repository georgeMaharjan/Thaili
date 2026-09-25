// Send an FCM push to every device of one user.
//
//   POST /functions/v1/send-push
//   Authorization: Bearer <service_role JWT>   (server-side callers only; deploy with verify_jwt on)
//   { "user_id": "...", "title": "...", "body": "...", "data": { "k": "v" } }
//
// Secret: FIREBASE_SERVICE_ACCOUNT = the service-account JSON from
// Firebase console → Project settings → Service accounts → Generate new private key.
//   supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)"
// Uses FCM HTTP v1 (the legacy server-key API was shut down in 2024).
import { createClient } from "npm:@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "npm:jose@5";

const sa = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") ?? "{}");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function jwtRole(req: Request): string | undefined {
  const payload = (req.headers.get("Authorization") ?? "").split(".")[1];
  if (!payload) return;
  try {
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role;
  } catch {
    return;
  }
}

// ponytail: mints a fresh OAuth token per request; cache it for ~55 min if volume grows.
async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(await importPKCS8(sa.private_key, "RS256"));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error(`oauth ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

Deno.serve(async (req) => {
  // The gateway (verify_jwt) has already checked the signature. Every signed-in
  // user, even anonymous, holds a valid JWT, so also require the service role.
  if (jwtRole(req) !== "service_role") return new Response("forbidden", { status: 403 });
  const { user_id, title, body, data } = await req.json();
  if (!user_id || !title) return new Response("user_id and title required", { status: 400 });
  if (!sa.private_key) return new Response("FIREBASE_SERVICE_ACCOUNT not set", { status: 500 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { data: rows } = await admin.from("device_tokens").select("token").eq("user_id", user_id);
  if (!rows?.length) return Response.json({ sent: 0 });

  const auth = `Bearer ${await accessToken()}`;
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const results = await Promise.all(rows.map(async ({ token }) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { token, notification: { title, body: body ?? "" }, data } }),
    });
    // Uninstalled app / rotated token: FCM says 404 UNREGISTERED. Drop it.
    if (res.status === 404) await admin.from("device_tokens").delete().eq("token", token);
    return res.ok;
  }));
  return Response.json({ sent: results.filter(Boolean).length, of: rows.length });
});
