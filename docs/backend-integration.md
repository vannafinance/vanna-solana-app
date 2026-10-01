# Backend integration

Reference: `vannafinance/Backend-Solana`, branch `devnet`. Mobile uses the same hosted web routes and Surfpool mainnet fork. The `devnet` hostname does not identify public Solana Devnet.

## Order

1. Wallet connection, restoration and logout.
2. Earn: pools, balances, positions, history, supply and redeem.
3. Swap: quote, simulation, signing, confirmation and history.
4. Farm and Perps: margin account, collateral, debt, prices and strategy positions.
5. Home, Markets and Settings: replace the remaining fixtures with the shared reads.

## Screen contracts

| Mobile surface | Web source | Data or action |
| --- | --- | --- |
| Welcome / Connect / Profile | `contexts/solana-provider.tsx`, `lib/solana/wallet-bridge.ts` | Wallet authorization. No separate password login API. Mobile uses MWA, not browser Wallet Adapter. |
| Earn vault list | `hooks/use-earn.ts`, `lib/pool-stats.ts` | `GET /api/pools`: seven pools keyed by asset, including supply/borrow APY, liquidity, exchange rate and rate-model parameters. |
| Earn positions / amount forms | `ContractService.getEarnAccountBalances` in `lib/solana/protocol.ts` | Fork RPC `getMultipleAccounts`: wallet balances and lender share accounts. Derive supplied underlying from shares and the pool exchange rate. |
| Earn vault details | `ContractService.getPoolStats`, `lib/solana/config.ts`, `lib/oracle-price.ts` | Reserve account and share mint; prices from fork Pyth accounts, with the web app's external price sources where needed. Missing mobile price data must remain unavailable, not use web static fallbacks. |
| Earn history | `getSolanaEarnHistory` in `lib/solana/history.ts` | `GET /api/solana/history?kind=earn&address=...` plus direct fork-RPC transaction history. |
| Supply | `ContractService.deposit` | Create missing token account; wrap SOL if needed; `lender_supply(amount, min_shares)`; simulate; wallet signs; app broadcasts to fork. |
| Withdraw | `ContractService.withdraw` | `lender_redeem(shares, min_assets)`; unwrap SOL through an isolated temporary account. Withdrawal input is underlying units; convert to shares explicitly. |
| Swap quote | `lib/solana/jupiter.ts`, `app/api/jupiter/quote/route.ts` | `GET /api/jupiter/quote?inputMint=...&outputMint=...&amount=...&slippageBps=...`; amount is an integer string in base units. |
| Wallet swap | `app/api/jupiter/swap/route.ts` | `POST /api/jupiter/swap` with `quoteResponse` and `userPublicKey`; replace the mainnet blockhash with the fork blockhash before signing. |
| Margin swap / Perps | `lib/solana/margin-swap.ts`, `hooks/use-margin.ts` | `POST /api/jupiter/swap-instructions`, wrapped in Vanna instructions. |
| Margin account / Home / Perps | `app/api/account/[addr]/route.ts`, `lib/account-snapshot.ts` | `GET /api/account/{wallet}` returns `hasMarginAccount` and, when present, account address and computed snapshot. |
| Farm positions | `hooks/use-kamino-reserve-stats.ts`, `lib/solana/carry-trade.ts` | `GET /api/kamino/positions/{owner}` plus fork RPC reserve/strategy reads. |
| Margin / Swap history | `lib/solana/history.ts` | History route with `kind=margin` or `kind=swap`, merged with fork RPC. Margin swap history uses the margin account address. |
| Spot history | `lib/solana/spot-history.ts` | `GET /api/solana/spot-history?address=...`; validate network/source before treating rows as fork trades. |
| Fork faucet | `app/api/faucet/fork/[token]/route.ts` | `POST /api/faucet/fork/{token}`. Fork-only; never use against public mainnet. |

## Network and credentials

- `hosted.env` matches the mobile RPC default. `localtest.env` points at a different RPC and is not active in mobile.
- Map only approved public configuration into Expo: RPC URL, WebSocket URL, program ID and API base URL. The original env files are not Expo env files and are not imported wholesale.
- Local testing needs both RPC and server routes pointed at the same fork. On Android, PC loopback is not device loopback; use an emulator-accessible host or `adb reverse`.
- Jupiter, Alchemy and Pyth credentials stay on the server. A `NEXT_PUBLIC_` prefix in the web reference does not make a private API credential appropriate for the mobile bundle.
- Wallet signing and broadcasting are separate. Never use wallet-side sign-and-send for the private fork.

## History caveat

Alchemy does not index a private Surfpool fork. The web app merges indexed history with an uncached fork-RPC scan (up to 200 recent signatures on the fork). Mobile must port the event/instruction decoding and de-duplicate by signature. An empty or failed indexed response alone is not proof that the connected account has no history.

## Verification

- Hosted `GET /api/pools` returned HTTP 200 with all seven pool keys on 2026-10-01.
- MWA connected account and session restoration were observed on the Android development build.
- Logout clears persisted authorization, cancels pending queries and clears query cache. Signed-out Profile offers Connect wallet.
- Earn, Swap, Farm, Perps and financial Home/Profile fields still use fixtures. They are not integrated transaction paths yet.
- Next transaction gate: verify the installed wallet supports sign-only transactions before porting supply/redeem.
