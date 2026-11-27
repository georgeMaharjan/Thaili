// Local transaction-review notifications. No cloud registration or remote push.
import { Capacitor } from "@capacitor/core";

// Keep capture permission, and cancel the retired weekly reminder on upgrades.
export async function captureNotifications(on: boolean, ask = false): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({ notifications: [{ id: 7 }] });
  if (!on || !ask) return;
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") await LocalNotifications.requestPermissions();
}

const DAILY_REVIEW_ID = 9;

/** Schedules a local daily check-in at 9:00 in the device's local time. */
export async function syncDailyReviewReminder(on: boolean, ask = false, lang: "EN" | "NP" = "EN"): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({ notifications: [{ id: DAILY_REVIEW_ID }] });
  if (!on) return;

  let permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted" && ask) permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted") return;

  await LocalNotifications.schedule({ notifications: [{
    id: DAILY_REVIEW_ID,
    title: lang === "NP" ? "आजको खर्च समीक्षा" : "Daily money check-in",
    body: lang === "NP" ? "विश्लेषण हेर्नुहोस् र वर्गीकरण नभएका कारोबार मिलाउनुहोस्।" : "Review your insights and sort uncategorized transactions.",
    schedule: { on: { hour: 9, minute: 0 }, repeats: true },
    isExactNotification: false,
    extra: { open: "daily-review" }
  }] });
}
