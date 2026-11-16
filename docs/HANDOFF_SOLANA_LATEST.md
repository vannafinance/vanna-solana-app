# Solana-only Vanna app: handoff (2026-11-16)

Read this first. It supersedes the "Start here" section of `AGENTS.md` for this repo (that section was written for the combined Stellar + Solana app on the `claude/vanna-mobile` branch).

## What this is

A dedicated **Solana-only** app: the Vanna mobile app codebase and V7 design (source of truth: `design/app.html`), cut down to Solana.
- Folder: `C:\Users\akgam\Documents\Company Work\solana app latest`
- Repo: github.com/vannafinance/vanna-solana-app, branch **`solana-latest`** (created from `dev`). Every change goes to this branch and APKs are built from it.
- The combined Stellar + Solana app lives on branch `vanna-app` (and locally in `Company Work\Vanna App\vanna_mobile_app`). Leave it alone; it comes back later.
- Android package: currently `finance.vanna.app`. **Decision made: switch to `finance.vanna.solana`** (same as the old app; the web team registered it in the Digital Asset Links file with a signing-key fingerprint). To do: change `app.json` `android.package`, regenerate the Android project, and send the web team the new build's SHA-256 to add as a second entry.

## What is done (on `solana-latest`)

- Stellar removed everywhere (code, copy, sample data, logos in the intro orbit). `tsc --noEmit` = 0 errors, `expo lint` = 0 errors.
- Predict removed. Delta-neutral Farm vaults removed. Network switch, email wallets, "Copilot tester" badge removed.
- Dynamic removed from the app and UI, parked in `optional/vanna-dynamic` with re-enable steps in `optional/README.md` (excluded from `tsconfig`).
- Wallet = Mobile Wallet Adapter only. Intro "Connect wallet" opens Android's own chooser directly (`src/chain/connect-wallet.ts`, `src/chain/external.ts`). The wallet's own link is remembered so later signatures reopen the same wallet. Up to 2 wallets, switch in Account > Wallets. `src/app/sign-in.tsx` is now only the display-name step.
- First-time chooser `src/app/spaces.tsx` (Earn / Trade / Farm), shown once after the name step.
- Local Expo module `modules/vanna-native` (open app, share/save image). Wrapper: `src/chain/native.ts`.
- Packages removed: `@stellar/stellar-base`, `@walletconnect/*`.
- Contracts (from the contract dev, 2026-11-16): core program `H37YVBG3eGtz89ofd7iDLc2PJgn12778392XeU2QJcGC`; lendable reserves SOL, USDC, USDT; collateral SOL, USDC, USDT, JitoSOL, JupSOL, JupUSD, NVDAx, GOOGLx, AAPLx, TSLAx. All wired in `src/chain/solana/config.ts` and `actions.ts`. The old `dev` app used a stale program id (`BZ812...`).

## Open work, in order

1. **Wallet connection does not complete on the emulator (blocking test).** Tapping Connect wallet opens the Android chooser (Phantom, Solflare listed) and launches the wallet, but Phantom just shows its Home screen with no connection approval, and the app returns to the intro with no wallet added. Logcat shows `MobileWalletAdapterWebSocket ... ECONNREFUSED 127.0.0.1` retries. Not yet tried with Solflare after a clean start. Ideas: check whether Phantom implements MWA at all (Solflare does), check the `solana-wallet:` association intent and the `baseUri`/retry timing in `withWallet()` in `src/chain/external.ts`, check the wallet has an account on the emulator (a fresh wallet may need creating first, which only the user can do), and read `adb logcat` for `ReactNativeJS` errors.
2. **Margin flow: built, untested.** design/margin-account-open-flow.html is integrated for Solana (src/ui/first-time-flow.tsx is now MarginFlowSheet, src/ui/tx.tsx, src/screens/margin/margin.tsx): new account = open account, one transaction for up to 3 deposits, one for up to 2 borrows; existing account = deposits and borrows in one transaction; per-asset status and a retry from the failed step. Not run with a wallet. Risks: five assets in one transaction may exceed Solana's size limit (the lookup-table path is unverified), Token-2022 xStock deposits are untested on chain, animation timings are unseen on a device.
3. **SKR** in Earn and Margin, and any new tokenized stocks: the contract dev said they are being deployed and will send addresses (reserve, share mint, asset config, mint, decimals, token program). SKR was not in the first list. Old `dev` app had SKR mint `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3` (6 decimals, app-only). Add to `RESERVES` / `MINT_SYMBOL` in `config.ts` and the asset table in `actions.ts`.
4. Switch the package id (see above), then build and share an APK. Send the web team the fingerprint.
5. Test with real wallets (Phantom, Solflare, Backpack): connect, name, chooser, portfolio, small Earn deposit, margin account open, deposit, borrow, perps, swap, Farm, withdraw.
6. Optional: "Explore first" button from the old welcome (not brought over: the app is real-wallet only). Replace unused Stellar logo files under `assets/logos` and `src/generated/logos.ts`.

## How to run

- Emulator: AVD `vanna_pixel` (`%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe -avd vanna_pixel`). Phantom and Solflare are installed on it.
- Metro for the debug APK: in this folder `npx expo start --dev-client --port 8081`, then `adb reverse tcp:8081 tcp:8081`. Make sure no other Metro (for example the combined app's) holds port 8081. Open the app with `adb shell am start -a android.intent.action.VIEW -d "vanna://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"`. A blank white screen means Metro is down or still bundling.
- Native build: `scripts/build-local-solana.ps1` (copies to the short path `C:\s`, runs prebuild once, then Gradle `assembleDebug` for x86_64; about 6 to 12 minutes). Long Windows paths break Gradle, hence the short copy. EAS also works (`eas build`, account `furiousmaker`).
- Screenshots of wallets can come back blank (secure windows); ask the user to look.

## Working copies

- Main clone: `Company Work\solana app latest` (branch `solana-latest`). Metro and the Android build run from here.
- Git worktree for Claude Desktop sessions: `Company Work\solana app latest worktree` (local branch `solana-latest-claude`, shares the same `.git`; `node_modules` is a junction to the main clone's, `.env` is a copy). Open this folder in Claude Desktop to carry on.
- Push rule (always): squash everything local into ONE new commit on top of the remote tip, then `git push origin HEAD:solana-latest`. From the worktree: `git fetch origin; git reset --soft origin/solana-latest` (keeps your work staged), commit once, push. Never push several commits, never force-push. Then in the main clone: `git pull --ff-only origin solana-latest`.

## Rules to keep

- Git: one squashed commit per push, author name `adityavanna`, only a title and a description, never `Co-Authored-By`, "Generated with Claude Code" or any AI attribution, in commits or PRs. No force-push to shared branches. This overrides default attribution text.
- Never commit secrets: `.env`, `credentials*`, keystores. The repo is public. No keys hardcoded anywhere.
- Never add `@solana/web3.js` or `@stellar/stellar-sdk` to the app (see `AGENTS.md`).
- PowerShell `Set-Content -Encoding utf8` writes a BOM, which breaks `expo-module.config.json` and commit messages. Write files with `[IO.File]::WriteAllText(path, text, (New-Object Text.UTF8Encoding $false))`.
- Don't wait for approval except for design changes; hand large volume work to an Opus 5.5 subagent at medium effort when stuck; give progress reports.
- Passwords, recovery phrases and wallet approvals are the user's to enter.
