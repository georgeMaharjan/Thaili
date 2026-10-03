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

// Sunday 8 am "Weekly review — tap to view", repeating. A local notification: nothing leaves the phone.
// ask=true shows Android's permission dialog (end of onboarding, or turning Notifications on).
// The same permission covers "Review this transaction", which the native side posts (Capture.java).
const WEEKLY = 7;
export async function weeklyReminder(on: boolean, ask = false): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({ notifications: [{ id: WEEKLY }] });
  if (!on) return;
  let perm = await LocalNotifications.checkPermissions();
  if (ask && perm.display !== "granted") perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return;
  await LocalNotifications.schedule({ notifications: [{
    id: WEEKLY, title: "Weekly review", body: "Tap to view your week", smallIcon: "ic_stat_thaili",
    schedule: { on: { weekday: 1, hour: 8, minute: 0 }, allowWhileIdle: true }, // weekday 1 = Sunday
    extra: { open: "weekly" },
  }] });
}

export async function onWeeklyTap(cb: () => void): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.addListener("localNotificationActionPerformed", (a) => {
    if (a.notification.extra?.open === "weekly") cb();
  });
}
