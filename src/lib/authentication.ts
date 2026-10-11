export type AuthenticationResult = { ok: boolean; reason?: string };

// One prompt at a time. Hidden WebViews must not start a native prompt, and
// rejected requests must release the gate so the next Unlock tap can retry.
export class AuthenticationSession {
  active = false;
  private authenticate: (title: string) => Promise<AuthenticationResult>;
  private visible: () => boolean;
  private changed: (active: boolean) => void;

  constructor(authenticate: (title: string) => Promise<AuthenticationResult>, visible: () => boolean,
    changed: (active: boolean) => void = () => {}) {
    this.authenticate = authenticate;
    this.visible = visible;
    this.changed = changed;
  }

  async run(title: string): Promise<AuthenticationResult> {
    if (this.active) return { ok: false, reason: "busy" };
    if (!this.visible()) return { ok: false, reason: "not-ready" };
    this.active = true;
    this.changed(true);
    try { return await this.authenticate(title); }
    catch { return { ok: false, reason: "unavailable" }; }
    finally { this.active = false; this.changed(false); }
  }
}

export function authenticationMessage(reason?: string): string {
  switch (reason) {
    case "no-lock": return "Set a screen lock in Android settings, then try Unlock again.";
    case "not-ready": return "Thaili is not ready to authenticate yet. Tap Unlock again.";
    case "cancelled": return "Authentication cancelled. Tap Unlock to try again.";
    case "busy": return "Finish the current authentication prompt first.";
    case "unavailable": return "Phone authentication is unavailable. Tap Unlock to try again.";
    default: return reason || "Could not authenticate. Tap Unlock to try again.";
  }
}
