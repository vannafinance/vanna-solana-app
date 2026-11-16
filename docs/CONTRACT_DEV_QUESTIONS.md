# Why Phantom and Solflare cannot sign most of our Solana transactions, and what we need from the contract developer

Nothing in this note asks anyone to deploy anything on mainnet. Section 7 explains why mainnet is mentioned at all.

## 0. Seedha samjho (short version in Hinglish)

Hamari app fork RPC se baat karti hai, lekin Phantom aur Solflare alag apps hain. Unka apna RPC asli Solana mainnet hai aur app unko "fork use karo" nahi bol sakti. Purani app mein transactions chhoti thi (koi lookup table nahi), isliye wallet unko padh leta tha, mainnet par simulation fail hota tha, wallet warning dikhata tha ("I trust this site" / "I understand" tick), aur user aage badh jata tha. Naye program `H37YVBG3…` mein har health check ke liye saare allowed tokens ke accounts jaate hain (60 se 90 accounts), jo 1,232 bytes mein nahi aate, isliye lookup table lagti hai. Wo table sirf fork par hai. Wallet ko wo table milti nahi, to wo transaction padh hi nahi paata aur refuse ya block kar deta hai. Solution: contract mein health check sirf wahi tokens ke accounts le jo account ke paas hain (jaise purane program mein). Phir table ki zaroorat hi nahi.

## 1. The issue in one paragraph

Our app builds transactions for the website's program `H37YVBG3eGtz89ofd7iDLc2PJgn12778392XeU2QJcGC`. Its health check lists the accounts of every allowed token in every borrow, withdraw, swap, Farm and Perps transaction. A Solana transaction can be at most 1,232 bytes, so those transactions only fit with an address lookup table. The table we use exists only on our mainnet fork. The wallet apps on the phone cannot read it, so they cannot read the transaction, and they refuse it, block it, or never answer.

## 2. "But we use the fork, why does mainnet matter?"

Because our app is not the wallet. Our app talks to the fork. **Phantom and Solflare are separate apps, and they look at real Solana mainnet.** We cannot change that from inside our app. Four pieces of proof:

1. **Same address, different balance (our own test).** In the emulator the Vanna app shows this address with **2,000 SOL** (read from the fork). Phantom, opened on the same address, shows an empty "Fund your account" screen. Phantom is reading mainnet.
2. **The old app's notes say the same.** `docs/testing-guide-aditya.md` section 2: "The wallet app shows mainnet balances, which are 0. That is normal. The Vanna app shows the fork balances."
3. **The wallet protocol has no RPC setting.** Mobile Wallet Adapter (the way an Android app asks a wallet to sign) takes only the app's identity and a chain name (`solana:mainnet`). There is no field for an RPC URL. I checked the installed library. The old app also only used the fork RPC for its own reads and sends.
4. **The website works differently.** `apps/solana/docs/README.md` tells website users to set a **custom RPC in their wallet** to the fork. A browser wallet allows that. On a phone through Mobile Wallet Adapter, we cannot ask the user to do it and the app cannot do it for them.

## 3. "Then how did the old Solana app work with Phantom and Solflare?"

It did work, with warnings. Two things made it possible:

**a) Its transactions were small and needed no lookup table.** The old program (`BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg`, also live on the fork) only listed accounts for the positions an account holds. A normal transaction listed every account directly.

**b) A wallet can still read a transaction that lists its accounts directly, even if those accounts do not exist on mainnet.**

| What the transaction looks like | What the wallet can do |
|---|---|
| Lists its accounts directly. Some of them do not exist on mainnet (they are fork-only). | It can read the transaction. It simulates it on mainnet, the simulation fails, and it shows a warning. The old app's notes: Solflare shows "Unknown site" and "Simulation failed", the user taps "I trust this site" and slides to approve. Phantom shows "Request blocked… Failed to simulate", and the user must tick "I understand…" and confirm. The user can go on. |
| Uses a **lookup table that does not exist on mainnet**. | The wallet cannot even tell which accounts the transaction touches, because the table is how it finds them. It cannot show or check anything. The old app's notes and commits (`2729d8c`, `8739c0a`, `e1bdfc9`): **Solflare refuses with "Security verification failed"**. |

So the old app worked because its transactions never needed a fork-only table. Ours do. Also, a phone with the Solana Mobile **Seed Vault** (Seeker) signs without this simulation check, which fits what you saw on Seeker. That last point is my reading, not something I tested.

For accounts with many positions the old developer also hit the size limit. His fixes (all in the old app's history): he created a lookup table **on real mainnet** (commit `dad2504`, table `Cf1aqtYwBr8A9BfL5Hi2WyeWYrBCU4nkbEH5uhpK2SdA`, about 0.012 SOL), split big actions into several small transactions approved in one wallet prompt, and dropped the compute-budget instruction when a transaction was a few bytes over. That table lists the old program's accounts. It covers only 4 of the 59 accounts our deposit + borrow needs, so it cannot be reused.

## 3A. What the old app's README and the website's code say (checked)

**Old Solana app, `README.md` on branch `main`:**
- "No custom RPC setting is needed in the wallet: Vanna sends transactions itself and the wallet only signs."
- "Wallets read real mainnet, so they may show mainnet balances or a simulation warning while Vanna shows your test balances. That is expected."
- "An account with many open positions can need a temporary lookup table. **Backpack signs it; Solflare may refuse.** Close a position or use Backpack."

So the old app never gave the wallet an RPC. It built the transaction, the wallet only signed it, and the **app** sent it through the fork RPC. Our new app works the same way (`https://rpc-devnet.solana.vanna.finance`, the same RPC the website uses). The wallet protocol has no field to hand an RPC to a wallet: when an app asks a wallet to connect it can only send its identity, a chain name, features, addresses and a saved token.

**Website code, `packages/shared/v4/connect-modal.tsx`:** the website only offers these external wallets as live:
- Solana: **Backpack** (live). **Solflare** and **Phantom** are shown as "Soon". The code comment says: "Solflare checks every transaction against Solana mainnet before it lets you sign and has no custom-RPC option, so it refuses Vanna's fork transactions."
- Stellar: **Freighter** and **OneKey** (live). **LOBSTR** is "Soon" because it signs for Stellar mainnet only.
- Solana users can also use the **email wallet**, which signs inside the app.

Our emulator test with Solflare gave the same result as the website team's comment (section 10).

## 4. Why our new transactions need a table

Your own documents:
- `apps/solana/docs/SOLANA_CONTRACT_REFERENCE.md`, section 4.1: for every health check the program reads **every allowed token**, "even ones the margin doesn't hold", 2 accounts per token.
- `apps/solana/docs/SOLANA_CONTRACT_AUDIT_REPORT.md`, item I-1: 16 allowed tokens means 32 accounts, plus 3 per debt, 2 per venue and all oracle accounts. About 110 accounts per transaction on the fork. "Make sure address lookup tables are used everywhere."

## 5. What we measured, for every Solana action

Two brand-new wallets each ran the whole list of actions on the fork, one after another, so later actions ran on an account that already had positions. For every transaction we recorded the instructions and computed its size in three cases. Sizes include the compute-budget instruction and one signature. The limit is 1,232 bytes.

"Shared table" means one lookup table on real mainnet holding every account that is the same for both wallets (asset configs, oracles, mints, reserves, programs, venue accounts). "This wallet" means accounts that differ per wallet (margin account, token accounts and so on).

| Action in the app | Accounts (shared / this wallet) | No table | With one shared mainnet table | What it needs |
|---|---|---|---|---|
| Earn: supply, withdraw | 14 (8 / 2) | 618 B ✓ | 404 B ✓ | Nothing. Works for every wallet today |
| Deposit collateral (no borrow) | 12 (3 to 6 / 3) | 533 to 572 B ✓ | ✓ | Nothing |
| Repay | 15 (8 / 4) | 658 B ✓ | ✓ | Nothing |
| Flash repay | 11 (5 / 3) | 519 B ✓ | ✓ | Nothing |
| Wallet swap (Jupiter) | not counted | 969 B ✓ (755 B with Jupiter's own mainnet table) | ✓ | Nothing |
| Deposit + borrow on a new margin account | 63 (34 / 26) | 2,275 B ✗ | 1,255 B ✗ (23 over) | Table and splitting into two transactions |
| Borrow (account holds two assets) | 66 (37 / 26) | 2,332 B ✗ | 1,219 B ✓ (13 under) | Table |
| Withdraw collateral | 67 (36 / 27) | 2,374 B ✗ | 1,292 B ✗ (60 over) | Table and splitting |
| Margin swap (Jupiter) | 84 (51 / 29) | 2,726 B ✗ (with Jupiter's mainnet table) | 1,424 B ✗ (192 over) | More than a table |
| Farm, Kamino deposit | 75 (45 / 26) | 2,643 B ✗ | 1,282 B ✗ (50 over) | Table and splitting |
| Farm, Kamino withdraw | 73 (44 / 26) | 2,569 B ✗ | 1,239 B ✗ (7 over) | Table and splitting |
| Farm, Perena deposit / withdraw | 76 (46 / 26) | 2,686 B ✗ | 1,294 B ✗ (62 over) | Table and splitting |
| Perps: open | 86 to 88 (55 to 57 / 27) | 3,282 to 3,363 B ✗ | 1,611 to 1,630 B ✗ (about 380 over) | More than a table |
| Perps: close | 76 to 78 (46 to 48 / 27) | 2,725 to 2,793 B ✗ | 1,333 to 1,339 B ✗ (about 100 over) | More than a table |
| Perps: withdraw | 86 (55 / 27) | 3,127 B ✗ | 1,456 B ✗ (224 over) | More than a table |

Today the app sends every ✗ row through a lookup table it writes per wallet onto the fork. That is the table the wallets cannot read.

The numbers are for accounts with only a handful of positions. More positions mean more wallet-specific accounts, so it gets worse. An earlier version of this note said a shared table would make deposit + borrow fit at about 956 bytes. That counted only 12 wallet-specific accounts; comparing two real wallets shows 26. This table replaces it.

## 6. Ways out, best first

**A. Contract change (recommended): health check only for tokens the account holds.**
The old program worked this way. With it, the big rows above would come down to about the size of Earn (14 accounts, 618 bytes). **No lookup table is needed anywhere, on the fork or on mainnet**, and every wallet can read and sign. Only the contract developer can do this.

**B. Keep the contract, do heavy work in the app.**
Needs all of: a shared lookup table on real mainnet (about 0.02 to 0.03 SOL, updated whenever a token is added), splitting most actions into several transactions approved in one prompt, trimming swaps and Perps, and using more existing mainnet tables. Even then the margin swap and Perps open probably still would not fit.

**C. Keep the contract, limit what external wallets can do.**
External wallets (Phantom, Solflare) get the actions that fit today (Earn, repay, deposits, flash repay, wallet swap). Everything else needs the Vanna email wallet, which signs inside the app with no mainnet check. This is possible in principle; the email wallet is not tested yet.

**D. Make the wallet use the fork RPC: not possible, and not acceptable as a product.**
The wallet protocol has no way for an app to give a wallet an RPC (section 3A). Solflare's mobile network screen only offers Mainnet, Testnet and Devnet, with no custom node. Asking users to configure a wallet by hand is not a solution. Backpack is the wallet the website and the old app rely on.

## 7. Why mainnet is mentioned at all

Only because of the two facts above: the wallet looks at mainnet, and a wallet cannot read a lookup table it cannot find. A table on mainnet is the workaround the old developer used. **We are not asking for it.** Option A needs nothing on mainnet at all.

## 8. Questions for the contract developer

1. **Which program should the mobile app use?** The website and our app use `H37YVBG3…`. The old app used `BZ812nUv…`. We believe `H37YVBG3…` is current. Please confirm.
2. **Can the health check list accounts only for the tokens the account actually holds (plus its real debts and venues), as the old program did?** This is option A. If yes, how big is the change and what does it affect (liquidation, the oracle, the audit)?
3. **If no: is option B or C the plan?** Which one should we build?
4. **Anything else:** can a health-checked action safely be split over more than one transaction, and will adding more allowed tokens later make this worse?

## 9. Stellar

Stellar does not have this problem. A Stellar transaction is one contract call with no long account list, and the app signs it through WalletConnect (Freighter, OneKey, LOBSTR). Not tested yet: a real wallet on a device (Freighter must be set to Testnet), and the Vanna email wallet.

## 10. What has and has not been tested

Tested:
- Every action in section 5, on the fork with throwaway wallets and real sends. All succeeded. The wallet swap was measured on its own because Jupiter rate-limited two parallel runs.
- Phantom on an Android emulator: connect works, the signing request for deposit + borrow arrives, no approval screen appears and Phantom never answers. This fits both explanations above (table unreadable, or Phantom's own blocking screen not shown). The old app's notes say Phantom "goes to its home screen, never answers" if the blocking screen is not ticked. Which one it is, is **not proven**.

- **Solflare 2.33.0 on the emulator, real test on the Vanna fork:**
  - Connect works, and Solflare accepts the saved approval (no repeated connect prompts).
  - **Earn supply:** Solflare shows "**Insufficient SOL** – make sure you have enough SOL to cover the transaction network fees", with only a Close button. The address has test funds on the fork (the Vanna app shows about $309,577) but **0 SOL on real mainnet**, which is what Solflare checks for the fee. Earn needs no lookup table, so this is not a table problem.
  - **Deposit + borrow:** Solflare shows "**Security verification failed** – we encountered a server error while attempting to verify this transaction for potential security risks", with only a Close button. This matches the old app's notes for a fork-only lookup table.
  - Both end in a cancel in the Vanna app. The wallet-adapter log shows the signing request was delivered and the user closed it.
  - The site name Solflare shows is `test.vanna.finance`, the name the app gives itself. Solflare does not verify it. The app's RPC `https://rpc-devnet.solana.vanna.finance` is the same one the website uses.

  - Note: Solflare's network must stay on **Mainnet** (the Vanna "testnet" is a copy of mainnet). When it was switched to Solana Testnet by mistake it showed "Failed to update balances".

Not tested yet:
- Backpack (the wallet the website and the old app rely on), and the email wallet.
- Phantom with a transaction that needs no table, for example Earn supply. This separates "Phantom blocks every fork transaction" from "Phantom cannot read our table".
- Accounts with many positions.
- Whether Phantom and Solflare would sign the big actions once a shared table is public.

Everything above was checked against the code, the docs in `_ref`, the old app's git history (branch `main`) and the live fork `https://rpc-devnet.solana.vanna.finance`.
