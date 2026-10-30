export const SCREENS = [
  "welcome", "register", "permission", "detect", "source", "src-new", "scan", "cats",
  "home", "txns", "stack", "detail", "insights",
  "flow", "leaks", "baseline", "add", "rules", "accounts", "source-detail", "goals", "goal-new", "settings", "profile",
] as const;
export type Screen = typeof SCREENS[number];
export const isScreen = (value: string): value is Screen => (SCREENS as readonly string[]).includes(value);
