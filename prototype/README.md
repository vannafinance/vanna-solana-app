# Vanna app prototype (web build)

One offline HTML file that runs the real Android app (Expo / React Native, this repo's `src/`) in a phone frame,
on sample data, with a control panel for scenarios, theme, wallet answers and screen jumps.

## Build

```sh
node prototype/build.mjs                       # this checkout -> prototype/dist/Vanna-app-prototype.html
node prototype/build.mjs --root ../other-checkout --branch my-branch --out /tmp/x.html
```

About 15-20 s; the output is about 6 MB (the build fails above 15 MB). Open the file directly or serve it over http.

What the build does:

1. Installs `node_modules` (`npm ci`) if missing, then the web-only deps (`react-native-web`, `react-dom`,
   `@expo/metro-runtime`) with `npm install --no-save`. `package.json` and `package-lock.json` are never changed;
   a later `npm ci` removes the web deps again and the next build reinstalls them.
2. Stages a copy of the app in `prototype/.build/`: `src/`, `assets/`, `tsconfig.json`, an `app.json` with the web
   platform added (`app-config.js`), and the prototype entry (`index.js`). `--root` stages another checkout instead
   (its own `node_modules` is used).
3. Runs `expo export --platform web` there with `metro.config.js` (via `EXPO_OVERRIDE_METRO_CONFIG`).
4. Inlines every exported asset (images, the Plus Jakarta Sans fonts) into the bundle as data URIs.
5. Wraps everything into `panel/index.html`: the app page (Expo's `index.html` + `panel/app-frame.css`) becomes
   `window.__VN_APP` (the phone iframe's `srcdoc`), the bundle becomes `window.__VN_BUNDLE` (evaluated by the iframe),
   then `panel/control.js`. The "Built from" line is filled from git (branch, short sha, "+ uncommitted changes"
   when `src/` / `assets/` / `app.json` differ from HEAD, build date).

`prototype/.build/` and `prototype/dist/` are git-ignored.

## Files

| File | Role |
|---|---|
| `build.mjs` | the build (above) |
| `metro.config.js` | Expo's Metro config + module redirects + `babel-transformer.js` |
| `overrides.js` | the list of everything that differs from the Android build (redirects and source patches) |
| `babel-transformer.js` | applies the source patches; skips the React Compiler for the shims |
| `app-config.js` | `app.json` + web platform, single-page output |
| `index.js` | entry: `shims/prelude` then `expo-router/entry` (the app's own entry installs react-native-quick-crypto, native only) |
| `panel/` | the outer page: phone frame, control panel (`index.html`, `control.js`), CSS injected into the app page |

## Shims (`shims/`)

Run before the app (`prelude.js`, in this order):

- `memory-location.js` - in-memory location / history under `https://app.vanna.prototype` (`globalThis.__vnLocation`,
  `__vnHistory`, `vn-route` events). The app lives in a `srcdoc` iframe whose `location` is `about:srcdoc`.
- `appearance.js` - patches react-native-web's `Appearance`: the panel sets the device theme
  (`__vnAppearance.setDevice`), the app's own Profile > Appearance still overrides it.
- `svg-id-scope.js` - makes element ids inside each inline SVG unique (gradients of repeated icons).
- `wallet-stand-in.js` - `globalThis.__vnProto`: the stand-in wallet sheet ("Solflare", Approve / Reject), the
  one-shot "next wallet answer" queue the panel sets, auto-approve, and `go(path)` for the screen buttons.
- `fetch-interceptor.js` - every http(s) request is answered from `sample-data` `api()` after 120-280 ms; Offline
  makes requests fail; anything without sample data gets a 503 and a `[prototype] no sample data` console warning.

Redirected modules (`overrides.js`):

- `packages/mwa-transact.js` replaces `@solana-mobile/mobile-wallet-adapter-protocol-web3js`: `transact()` talks to the
  wallet stand-in and throws the real adapter's errors for queued failures.
- `packages/webview.js` replaces `react-native-webview`: the perps chart becomes an iframe with a seeded sample chart.
- `hooks/use-wallet-signer.js` replaces `src/hooks/use-wallet-signer.ts`: transactions run through the app's real
  review / approve / progress / result UI without building or sending anything; queued network failures are raised
  as the error text the network would give.
- `lib/*.js` wrap `src/lib/solana/{oracle-prices,earn-deposits,wallet-holdings,vault-accounts,farm-positions,kamino,wallet-transactions,fork-faucet}.ts`:
  each re-exports the original module and replaces its one on-chain read (`fetch...` / `requestFaucetGrant`) with sample data.

Source patches: six `expo-router/build` files read `__vnLocation` / `__vnHistory` instead of `window.location` /
`window.history`. If an Expo Router upgrade changes those files the build stops with `patch ... no longer matches`.

## Sample data and scenarios (`shims/sample-data/`)

One wallet (`ELSY...b93m`), fixed prices, and three accounts chosen with localStorage `vnScenario` (panel buttons):

- `trader` (default) - wallet balances, margin account with perps / farm positions, earn shares, history.
- `new` - some wallet tokens, no margin account. The first successful transaction "opens" one (`vnMarginOpened`).
- `empty` - nothing.

The test faucet adds tokens locally (`vnFaucet`). Backend endpoints answered: `/api/account/*`, `/api/pools`,
`/api/solana/history`, `/api/solana/spot-history`, `/api/jupiter/quote`, `/api/faucet/fork/*`. Solana JSON-RPC calls
are not answered; the reads the screens need are replaced in `lib/`. To change numbers, edit `sample-data/index.js`;
`events.js` encodes sample history as real Vanna program events, so the app's own decoders read it.

## Updating after UI changes

Just rebuild. Only revisit the shims when the replaced modules change shape: the return value of
`useWalletSigner`, the signatures of the wrapped `fetch...` functions, the backend endpoints, or the Expo Router files
listed in `overrides.js`. New native-only packages need a redirect in `overrides.js`.

## Versions and the comparison page

The team chose V2 (modules in the bottom bar, pages in the header pill); the V3 and V4 layouts were removed from `src/`.
To build the app as it is now, or V1 to compare against:

```bash
node prototype/build.mjs --title "Vanna app · V2 (modules at the bottom)" --notes prototype/notes/v2.html --out <dir>/v2.html
# V1 = the app before the restructure, from a clean worktree of 287e5a4:
git worktree add /tmp/app-base 287e5a4
node prototype/build.mjs --root /tmp/app-base --branch fix/wallet-timeout-message --title "Vanna app · V1 (original)" --notes prototype/notes/v1.html --out <dir>/v1.html
```

Run builds one at a time (they share `prototype/.build/`). The comparison page (`Design/Claude Design Files/vanna-app-compare/index.html` in the Vanna workspace) loads `v1.html#bare`, `v2.html#bare` and `v3.html#bare` side by side and drives them through `window.vnPanel` (`open`, `theme`, `scenario`, defined in `panel/control.js`). `#bare` shows the phone alone.
