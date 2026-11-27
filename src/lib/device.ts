import type { CaptureConfiguration } from "../domain/capture-contract";
// Bridge to the native ThailiPlugin (android/.../ThailiPlugin.java).
// In a browser there is no device: nothing granted, nothing installed.
import { Capacitor,registerPlugin } from "@capacitor/core";
import type { InstalledApp } from "./money-apps";
import { knownSmsSenders } from "./sms";

export type Perms = { sms: boolean; notifications: boolean };

type Native = {
  status(): Promise<Perms>;
  requestSms(): Promise<Perms>;
  openNotificationAccess(): Promise<void>;
  openAppSettings(): Promise<void>;
  installedApps(): Promise<{ apps: InstalledApp[] }>;
  authenticate(o: { title?: string; deviceCredentialOnly?: boolean }): Promise<{ ok: boolean; reason?: string }>;
  installUpdate(o: { url: string }): Promise<void>;
  readSmsSenders(o: { sinceMs: number; senders: Record<string, string> }): Promise<{ senders: string[] }>;
  readSms(o: { sinceMs: number; senderIds: string[] }): Promise<{ messages: Sms[] }>;
  setCapture(o: CaptureConfiguration): Promise<void>;
  addListener(e: "open", cb: (o: { open: string; at: number }) => void): Promise<{ remove: () => void }>;
  addListener(e: "moneyNotification", cb: () => void): Promise<{ remove: () => void }>;
  readNotifications(o: { sinceMs: number }): Promise<{ notifications: MoneyNotification[] }>;
  tap(): Promise<void>;
  saveFile(o: { name: string; text: string }): Promise<{ saved: boolean }>;
  resetData(): Promise<void>;
};

export type Sms = { id?: string; sender: string; body: string; at: number };
export type MoneyNotification = { id?: string; pkg: string; body: string; at: number; receivedAt?: number };

const native = registerPlugin<Native>("Thaili");
export const isDevice = Capacitor.isNativePlatform();
const none: Perms = { sms: false, notifications: false };

export const permStatus = () => (isDevice ? native.status() : Promise.resolve(none));
export const requestSms = () => (isDevice ? native.requestSms() : Promise.resolve(none));
export const openNotificationAccess = () => (isDevice ? native.openNotificationAccess() : Promise.resolve());
export const openAppSettings = () => (isDevice ? native.openAppSettings() : Promise.resolve());
export const installedApps = () =>
  isDevice ? native.installedApps().then((r) => r.apps) : Promise.resolve([] as InstalledApp[]);
// Browser preview has no lock to check, so it always passes.
export const authenticate = (title?: string, method: "biometric" | "device-credential" = "biometric") =>
  isDevice ? native.authenticate({ title, deviceCredentialOnly: method === "device-credential" }) : Promise.resolve({ ok: true, reason: undefined as string | undefined });
export const installUpdate = (url: string) =>
  isDevice ? native.installUpdate({ url }) : Promise.reject(new Error("Updates are available in the Android app."));
// Discovery queries sender addresses only. Message bodies require exact selected sender IDs.
export const readSmsSenders = (sinceMs: number) =>
  isDevice ? native.readSmsSenders({ sinceMs, senders: knownSmsSenders }).then(r => r.senders) : Promise.resolve([] as string[]);
export const readSms = (sinceMs: number, senderIds: string[]) =>
  isDevice ? native.readSms({ sinceMs, senderIds }).then((r) => r.messages) : Promise.resolve([] as Sms[]);
// What background capture watches and checks; see Capture.java and sms.ts nativeRules.
export const setCapture = (config: CaptureConfiguration) => (isDevice ? native.setCapture(config).catch(() => {}) : Promise.resolve());
export const resetDeviceData = () => (isDevice ? native.resetData() : Promise.resolve());
// A tapped Thaili notification ("review" carries the spend's time).
export const onOpen = (cb: (o: { open: string; at: number }) => void) =>
  isDevice ? Promise.all([
    native.addListener("open", cb),
    import("@capacitor/local-notifications").then(({ LocalNotifications }) =>
      LocalNotifications.addListener("localNotificationActionPerformed", action => {
        const open = action.notification.extra?.open;
        if (typeof open === "string") cb({ open, at: Date.now() });
      }))
  ]).then(handles => ({ remove: () => Promise.all(handles.map(handle => handle.remove())) }))
    : Promise.resolve({ remove() {} });
export const onMoneyNotification = (cb: () => void) => isDevice ? native.addListener("moneyNotification", cb) : Promise.resolve({ remove: () => {} });
// Money notifications those apps posted since sinceMs (kept natively, even while Thaili was closed).
export const readNotifications = (sinceMs: number) =>
  isDevice ? native.readNotifications({ sinceMs }).then((r) => r.notifications) : Promise.resolve([] as MoneyNotification[]);
// Light haptic tick for taps; silent in a browser.
export const hapticTap = () => { if (isDevice) native.tap().catch(() => {}); };
// Opens Android's "Save as" screen; false when the user backs out. No device, nothing to save to.
export const saveFile = (name: string, text: string) =>
  isDevice ? native.saveFile({ name, text }).then((r) => r.saved) : Promise.resolve(false);
