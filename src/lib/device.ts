// Bridge to the native ThailiPlugin (android/.../ThailiPlugin.java).
// In a browser there is no device: nothing granted, nothing installed.
import { Capacitor, registerPlugin } from "@capacitor/core";

export type Perms = { sms: boolean; notifications: boolean };

type Native = {
  status(): Promise<Perms>;
  requestSms(): Promise<Perms>;
  openNotificationAccess(): Promise<void>;
  openAppSettings(): Promise<void>;
  installedApps(o: { packages: string[] }): Promise<{ installed: string[] }>;
  authenticate(o: { title?: string }): Promise<{ ok: boolean; reason?: string }>;
  readSms(o: { sinceMs: number }): Promise<{ messages: Sms[] }>;
  setCapture(o: object): Promise<void>;
  addListener(e: "open", cb: (o: { open: string; at: number }) => void): Promise<{ remove: () => void }>;
  readNotifications(o: { sinceMs: number }): Promise<{ notifications: { pkg: string; body: string; at: number }[] }>;
  tap(): Promise<void>;
};

export type Sms = { sender: string; body: string; at: number };

const native = registerPlugin<Native>("Thaili");
export const isDevice = Capacitor.isNativePlatform();
const none: Perms = { sms: false, notifications: false };

export const permStatus = () => (isDevice ? native.status() : Promise.resolve(none));
export const requestSms = () => (isDevice ? native.requestSms() : Promise.resolve(none));
export const openNotificationAccess = () => (isDevice ? native.openNotificationAccess() : Promise.resolve());
export const openAppSettings = () => (isDevice ? native.openAppSettings() : Promise.resolve());
export const installedApps = (packages: string[]) =>
  isDevice ? native.installedApps({ packages }).then((r) => r.installed) : Promise.resolve([] as string[]);
// Browser preview has no lock to check, so it always passes.
export const authenticate = (title?: string) =>
  isDevice ? native.authenticate({ title }) : Promise.resolve({ ok: true, reason: undefined as string | undefined });
// Money messages since sinceMs (filtered natively: amount + debit/credit word, no OTPs).
export const readSms = (sinceMs: number) =>
  isDevice ? native.readSms({ sinceMs }).then((r) => r.messages) : Promise.resolve([] as Sms[]);
// What background capture watches and checks; see Capture.java and sms.ts nativeRules.
export const setCapture = (config: object) => (isDevice ? native.setCapture(config).catch(() => {}) : Promise.resolve());
// A tapped Thaili notification ("review" carries the spend's time).
export const onOpen = (cb: (o: { open: string; at: number }) => void) => { if (isDevice) native.addListener("open", cb); };
// Money notifications those apps posted since sinceMs (kept natively, even while Thaili was closed).
export const readNotifications = (sinceMs: number) =>
  isDevice ? native.readNotifications({ sinceMs }).then((r) => r.notifications) : Promise.resolve([] as { pkg: string; body: string; at: number }[]);
// Light haptic tick for taps; silent in a browser.
export const hapticTap = () => { if (isDevice) native.tap().catch(() => {}); };
