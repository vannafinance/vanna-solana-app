<p align="center">
  <img src="assets/images/icon.png" alt="Vanna" width="96" height="96" />
</p>

<h1 align="center">Vanna for Solana</h1>

<p align="center">
  Trade tokenized stocks with leverage, swap, lend and farm — from your phone.
</p>

<p align="center">
  <a href="https://github.com/vannafinance/vanna-solana-app/releases/latest"><img src="assets/readme/download-apk.svg" alt="Download APK" /></a>
  <img src="assets/readme/android.svg" alt="Android" />
  <img src="assets/readme/solana-mwa.svg" alt="Solana Mobile Wallet Adapter" />
  <img src="assets/readme/expo.svg" alt="Expo and React Native" />
</p>

<p align="center">
  <a href="https://vanna.finance">Website</a> ·
  <a href="https://devnet.solana.vanna.finance">Web app</a> ·
  <a href="https://docs.solana.vanna.finance/home">Docs</a> ·
  <a href="https://x.com/vannaprotocol">X</a> ·
  <a href="https://t.me/vannaprotocolann">Telegram</a>
</p>

---

## Download

Get the latest APK from **[Releases](https://github.com/vannafinance/vanna-solana-app/releases/latest)** and install it on any 64-bit Android phone, including the Solana Seeker. Each release lists the APK's SHA-256 checksum so you can check the download.

## Get started

1. **Install the APK.** Allow "Install unknown apps" for your browser or file manager if Android asks.
2. **Install a Solana wallet** that supports Mobile Wallet Adapter: Seed Vault (Seeker), Backpack, Solflare or Phantom. To try it on any phone without a wallet of your own, use Solana Mobile's [Mock MWA Wallet](https://github.com/solana-mobile/mock-mwa-wallet).
3. **Open Vanna and tap Connect wallet.** No custom RPC setting is needed in the wallet: Vanna sends transactions itself and the wallet only signs.
4. **Get test tokens** in Profile → Faucet. No real funds are needed.

## What you can do

| | |
| --- | --- |
| **Margin trade** | Long or short TSLAx, AAPLx, GOOGLx, ANTHROPIC, OPENAI and SKR with 2x–5x leverage |
| **Swap** | Any supported token, routed through Jupiter |
| **Earn** | Supply USDC, SOL or SKR to Vanna's lending pools |
| **Farm** | Borrow against stock collateral and earn Kamino yield in one tap |
| **Portfolio** | Health factor, open positions, earnings and history in one place |

## Network

This app runs on **Vanna's test network**, a fork of Solana mainnet at `rpc-devnet.solana.vanna.finance`, with test tokens only. Wallets read real mainnet, so they may show mainnet balances or a simulation warning while Vanna shows your test balances. That is expected.

**Known limits on the test network**

- An account with many open positions can need a temporary lookup table. Backpack signs it; Solflare may refuse. Close a position or use Backpack.
- Backpack sometimes fails its identity check on a slow connection ("Identity verification failed"). Go back to Vanna, wait a few seconds and tap Connect or Try again.

## Links

| | |
| --- | --- |
| Website | [vanna.finance](https://vanna.finance) |
| Web app | [devnet.solana.vanna.finance](https://devnet.solana.vanna.finance) |
| Docs | [docs.solana.vanna.finance](https://docs.solana.vanna.finance/home) |
| X | [@vannaprotocol](https://x.com/vannaprotocol) |
| Telegram | [t.me/vannaprotocolann](https://t.me/vannaprotocolann) |
| GitHub | [github.com/vannafinance](https://github.com/vannafinance) |

---

## For developers

Built with Expo SDK 57 and React Native. Package name `finance.vanna.solana`.

### Requirements

- Node.js 20 or later
- Android Studio with an Android SDK, and a phone or emulator (release builds are arm64)
- A Solana wallet that supports Mobile Wallet Adapter

### Setup

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

### Run

```sh
npm run android     # build and install a development build
npm start           # start Metro for an installed development build
```

### Build an APK

```sh
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

The APK is written to `android/app/build/outputs/apk/release/`. EAS profiles (`development`, `preview`, `production`) are in `eas.json`.

### Checks

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

### Project layout

| Path | Contents |
| --- | --- |
| `src/app` | Screens and routes (Expo Router) |
| `src/components` | UI components, grouped by feature |
| `src/hooks` | Data hooks used by screens |
| `src/lib` | Solana, wallet and protocol logic (earn, farm, perps, swap, portfolio) |
| `src/theme` | Colours, type and spacing for light and dark mode |
| `scripts` | Tests and maintenance scripts |
