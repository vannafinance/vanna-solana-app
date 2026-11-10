# vanna-dynamic

Local Expo module: Dynamic email sign-in with embedded wallets, one Solana and one Stellar wallet per email.
Wraps Dynamic's native Kotlin SDK (Android, buildable) and Swift SDK (iOS, written from docs, never built).
JS entry for the app: `src/chain/dynamic.ts` (`available` is false in Expo Go).

## Build (development build only, Expo Go cannot load this)

1. `node modules/vanna-dynamic/scripts/fetch-android-sdk.mjs` downloads `dynamic-sdk-android.aar` and
   `solana-web3.aar` (SDK 1.7.1, from github.com/dynamic-labs-oss/android-sdk-and-sample-app) into
   `android/libs`. Dynamic does not publish to Maven; the config plugin refuses to prebuild without them.
2. Put `EXPO_PUBLIC_DYNAMIC_ENV_ID=<environment id>` in `.env` (the web app's id is in
   `apps/*/cloudbuild.yaml` of the web repo).
3. `npx expo run:android` (local, needs JDK 17 + Android SDK), or `eas build --profile development --platform android`
   (the `android/libs` AARs must be present in the uploaded project, so do not git-ignore them for EAS).
4. iOS: `eas build --profile development --platform ios` needs an Apple developer account. The Swift code
   pulls `https://github.com/dynamic-labs-oss/swift-sdk-and-sample-app.git` (>= 1.9.0) via `spm_dependency`
   in `ios/VannaDynamic.podspec`; unverified.

The config plugin (`plugin/withVannaDynamic.js`, registered in `app.json`) sets minSdk 28, adds INTERNET and
ACCESS_NETWORK_STATE, Dynamic's `AuthCallbackActivity` for scheme `vannadynamic`, the iOS URL scheme, and adds
the AARs to the app module.

## Dynamic dashboard (same environment as the web app)

- Chains: Solana and Stellar enabled (Stellar network = Testnet; check with `getStellarNetwork()`).
- Embedded wallets enabled for both, created automatically after sign-up.
- Login method: Email enabled.
- Security > Whitelist Mobile Deeplink: add `vannadynamic://`.
- Keep Device Registration off (the headless flow does not implement the verification screen).
- Do not rely on any "allowed origins" check for mobile; the SDK sends `appOrigin` = `https://test.vanna.finance`.

## API (TypeScript)

`configure()`, `sendEmailCode(email)`, `verifyEmailCode(code) -> { email, solanaAddress?, stellarAddress? }`,
`getSession()`, `signStellarXdr(xdr)`, `signSolanaTransaction(base64)`, `getStellarNetwork()`, `signOut()`.
Signing only signs; the app builds and submits transactions itself.

## Not verified

Nothing here has been compiled. See the report for which calls were confirmed against Dynamic's docs/sample app.
