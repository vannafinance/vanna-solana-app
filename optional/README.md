# Parked: Dynamic (email / Google / X sign-in)

The Solana-only app connects wallets through Mobile Wallet Adapter only. Dynamic is parked here, out of the build, so it can be switched
back on later.

What is here:
- `vanna-dynamic/` the native module (Dynamic Android SDK wrapper, AARs, config plugin, iOS part).
- `vanna-dynamic/js/` the app code that used it: `dynamic.ts` (module wrapper), `session-guard.ts`, `social-resume.ts`.

To switch it back on:
1. Move `optional/vanna-dynamic` back to `modules/vanna-dynamic`, and the three files in `js/` back to `src/chain/`.
2. Add `"./modules/vanna-dynamic/plugin/withVannaDynamic.js"` to `plugins` in `app.json`, set `EXPO_PUBLIC_DYNAMIC_ENV_ID` in `.env`.
3. Bring back the email / Google / X sign-in and the "Vanna wallet" (embedded) wallet kind from the combined app on the `vanna-app` branch
   (`src/app/sign-in.tsx`, `src/state/wallets.ts`, `src/chain/sign.ts`); that branch has the working versions, including the Google restart fix.

