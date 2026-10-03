# Thaili

Personal money tracker for Nepal: reads bank SMS, spots money apps, runs on the Bikram Sambat calendar.
Next.js static export wrapped with Capacitor (Android), Supabase for per-user storage.

```bash
cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm run dev                        # browser preview (no device features)
npm run android                    # build, sync and open in Android Studio
npm test                           # SMS parser + back-stack checks
bash supabase/test.sh supabase/migrations/*.sql   # migrations + RLS on a throwaway Postgres 17
```

- `src/lib/logic.tsx` — app state and the view model (`renderVals()`) the screens read.
- `src/screens/*.tsx` — the screens, hand-written with Tailwind. Shared pieces live in `src/components/ui.tsx`;
  colour/font/radius tokens are in the `@theme` block of `src/app/globals.css`. `design/Thaili v9.dc.html` is a visual reference only.
- `src/lib/store.ts` — load/save to Supabase. `sms.ts` — SMS parser. `bs.ts` — BS calendar. `nav.ts` — back stack.
- `android/.../ThailiPlugin.java` — native bridge: SMS, installed apps, biometrics, haptics.

## To do

- **Export everything** — CSV of every entry, account, rule and goal. Hidden from Settings until built.
- **Archive** — browse and restore deleted entries (rows keep `archived_at` for 30 days). Hidden from Settings until built.
- **Spend prompts** — Settings → Notifications and Quiet hours are saved but nothing sends a push yet; `supabase/functions/send-push` has no caller.
