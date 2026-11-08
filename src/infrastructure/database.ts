// Checked against the committed migrations. JSON is decoded before entering the application.
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };
export type SourceRow = { user_id: string; key: string; name: string; base: string; short: string; type: string; dot: string; opening: number; opening_at: string | null; acct: string | null; role: string; sort: number; created_at: string; packages: string[] };
export type TransactionRow = { user_id: string; id: string; src: string; to_src: string | null; merchant: string; amount: number; dir: "debit" | "credit" | "transfer"; cat: string | null; remarks: string | null; auto_rule: string | null; channel: string; capture: Json; raw: string | null; occurred_at: string; archived_at: string | null; created_at: string };
export type RuleRow = { user_id: string; id: string; kw: string; cat: string; own: boolean; sort: number };
export type GoalRow = { user_id: string; id: string; name: string; target: number; sort: number };
export type ProfileRow = { user_id: string; name: string; phone: string; created_at: string; updated_at: string };
export type SettingsRow = { user_id: string; prefs: Json; updated_at: string };
export type DeviceTokenRow = { user_id: string; token: string; platform: string; updated_at: string };
type Table<Row extends object, Required extends keyof Row> = {
  Row: Row; Insert: Pick<Row, Required> & Partial<Row>; Update: Partial<Row>; Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      sources: Table<SourceRow, "key" | "name" | "base" | "short" | "type" | "dot">;
      transactions: Table<TransactionRow, "id" | "src" | "merchant" | "amount" | "dir" | "channel">;
      rules: Table<RuleRow, "id" | "kw" | "cat">;
      goals: Table<GoalRow, "id" | "name" | "target">;
      profiles: Table<ProfileRow, "name" | "phone">;
      settings: Table<SettingsRow, never>;
      device_tokens: Table<DeviceTokenRow, "token" | "platform">;
    };
    Views: Record<string, never>; Functions: Record<string, never>;
    Enums: { txn_direction: "debit" | "credit" | "transfer" }; CompositeTypes: Record<string, never>;
  }
};
