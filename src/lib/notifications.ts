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
