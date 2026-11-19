# Perps, Farm and Titan swaps do not work with Phantom: problem, options, recommendation

For: contract / backend team. From: mobile app. Date: 2026-11-17.

## The problem

The app runs on the Vanna fork. The user's wallet (Phantom) signs each transaction, then the app sends it to the fork.

A transaction has a size limit of 1,232 bytes. Big transactions stay under it by using a **lookup table**, which is a list of addresses the transaction can refer to by number instead of spelling out.

**Phantom reads lookup tables from real Solana mainnet, not from the fork.**
So if a transaction uses a table that exists only on the fork, Phantom cannot open it. Phantom then freezes: the user approves, but the signature never comes back and nothing is sent.

Transactions with no table, or with a table that is identical on mainnet and the fork (Jupiter's tables), work fine.

## What works and what does not

Works with Phantom (tested through the app, on the fork): open margin account, deposit, borrow, repay, withdraw, Earn supply and withdraw (SOL, USDC, USDT, SKR), and Jupiter swaps.

Does not work with Phantom:

| Feature | Size without a fork-only table | Limit | What happens today |
|---|---|---|---|
| Farm: Kamino deposit | about 1,344 bytes | 1,232 | needs the fork-only table, Phantom freezes |
| Farm: Perena deposit | about 1,387 bytes | 1,232 | same |
| Perps: open, close, withdraw | about 1,100 bytes, only with a fork-only table | 1,232 | same |
| Swap through Titan | too large | 1,232 | the app refuses before asking Phantom: "This pair is too large for the wallet" |

Jupiter swaps work because the app can ask Jupiter for a route with fewer accounts. Titan routes cannot be limited that way yet.

## The options

**Option A: one shared lookup table on real mainnet.**
Someone creates one table on mainnet with Vanna's fixed accounts (protocol config, price book, oracles, token reserves and vaults, Phoenix and Kamino accounts). The fork copies it, so Phantom can read it.
- Cost: about 0.01 real SOL, paid once. Use a new key funded with just that amount, then freeze the table so it can never change.
- Limit: only fixed accounts can go in. Each user's own accounts (margin account, vaults) cannot, so the saving may not be enough. Not measured yet.

**Option B: split each operation into two transactions in the app.**
For example, Perps open = put collateral in, then place the order. Farm = create the receipt accounts, then deposit. Both are signed in one go, then sent in order.
- Cost: no money and no one else needed.
- Limit: the two parts are not all-or-nothing, so each part must be safe on its own. Phantom may show two approval screens.

**Option C (Titan only): let the app limit the number of accounts in Titan's quote.**
Jupiter allows this; the website's Titan quote route would need to pass the setting through.
- Cost: a small change to the website route.

## Recommendation

1. **Perps and Farm: Option B.** The app team can do it alone, at no cost, and it fixes the problem for good.
2. **Titan: Option C first.** If Titan allows limiting accounts, swaps fit with no table. If not, use Option A.
3. **Option A only if B turns out not to be enough,** and only after measuring how many bytes it saves. It is the only option that needs real money and someone's key.

## What we need from the contract / backend team

1. Does Titan's quote support a limit on accounts, and can the website route pass it?
2. Do you agree with Option B for Perps and Farm (two-step transactions)?
3. If Option A is wanted: who creates the mainnet table, and can the fork serve it unchanged? We will provide the address list and a reviewed script (no secrets in it).
