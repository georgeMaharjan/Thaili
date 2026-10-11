// Push (FCM via Firebase) via Capacitor. No-op on web.
import { Capacitor } from "@capacitor/core";
import { supabase, ensureSession } from "./supabase";

// Register this device with FCM and store its token so the send-push Edge
// Function can reach it. On app start pass ask=false: it registers only if the
// user already allowed notifications. Ask (ask=true) at the end of onboarding
// or from Settings, once the user knows what Thaili notifies about.
let registered = false;
export async function registerPush(ask = false): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  // register() crashes natively without android/app/google-services.json.
  // Set NEXT_PUBLIC_PUSH_ENABLED=1 once that file is in place.
  if (process.env.NEXT_PUBLIC_PUSH_ENABLED !== "1") return;
  const { PushNotifications } = await import("@capacitor/push-notifications");

  let perm = await PushNotifications.checkPermissions();
  if (ask && perm.receive !== "granted") perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted" || registered) return;
  registered = true; // listeners + register() once per app session, however many callers ask

  // Listeners must exist before register(): a token that arrives first is lost.
  await PushNotifications.addListener("registration", async (token) => {
    const uid = await ensureSession();
    if (!supabase || !uid) return;
    await supabase.from("device_tokens").upsert(
      { token: token.value, platform: Capacitor.getPlatform(), updated_at: new Date().toISOString() },
      { onConflict: "user_id,token" },
    );
  });
  await PushNotifications.addListener("registrationError", (e) =>
    console.warn("[thaili] push registration error", e),
  );

  await PushNotifications.register();
}

// Keep capture permission, and cancel the retired weekly reminder on upgrades.
export async function captureNotifications(on: boolean, ask = false): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({ notifications: [{ id: 7 }] });
  if (!on || !ask) return;
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") await LocalNotifications.requestPermissions();
}
