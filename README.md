# Vanna Solana App

Android app for Vanna on Solana: connect a wallet, trade stocks and tokens with leverage (Perps), swap, supply to lending pools (Earn) and run leveraged yield positions (Farm).

Built with Expo SDK 57 and React Native. Package name `finance.vanna.solana`.

## Requirements

- Node.js 20 or later
- Android Studio with an Android SDK, and a phone or emulator (release builds are arm64)
- A Solana wallet that supports Mobile Wallet Adapter (Backpack, Solflare, Phantom)

## Setup

```sh
npm ci
cp .env.example .env
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_SOLANA_RPC_URL` | `https://rpc-devnet.solana.vanna.finance` | Solana RPC (Vanna's mainnet fork) |
| `EXPO_PUBLIC_API_BASE_URL` | `https://devnet.solana.vanna.finance` | Vanna API (pools, quotes, history) |
| `EXPO_PUBLIC_DEV_WALLET_ADDRESS` | empty | Read-only wallet for development builds only |
| `EXPO_PUBLIC_FORK_FAUCET` | on | Set to `off` to hide the fork faucet |

## Run

```sh
npm run android     # build and install a development build
npm start           # start Metro for an installed development build
```

## Build an APK

```sh
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

The APK is written to `android/app/build/outputs/apk/release/`. EAS profiles (`development`, `preview`, `production`) are in `eas.json`.

## Checks

```sh
npm run typecheck
npm run lint
npm run test:wallet
npm run test:portfolio
npm run test:transactions
npm run test:perps
npm run test:farm
npm run test:review
npm run test:vault
npm run test:appearance
```

## Project layout

| Path | Contents |
| --- | --- |
| `src/app` | Screens and routes (Expo Router) |
| `src/components` | UI components, grouped by feature |
| `src/hooks` | Data hooks used by screens |
| `src/lib` | Solana, wallet and protocol logic (earn, farm, perps, swap, portfolio) |
| `src/theme` | Colours, type and spacing for light and dark mode |
| `scripts` | Tests and maintenance scripts |
