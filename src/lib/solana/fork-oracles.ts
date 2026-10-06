import { type Connection, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";

import { type AssetInfo, assets } from "./assets";
import { FORK_CHEATCODES_ENABLED, RPC_URL } from "./config";
import { fetchRawJupiterQuote } from "./jupiter-quote";
import { priceAccountAddress } from "./oracle-prices";

const PYTH_RECEIVER_PROGRAM = "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ";
const PRICE_OFFSET = 73;
const CONF_OFFSET = 81;
const EXPONENT_OFFSET = 89;
const PUBLISH_TIME_OFFSET = 93;
const PREV_PUBLISH_TIME_OFFSET = 101;
const EMA_PRICE_OFFSET = 109;
const EMA_CONF_OFFSET = 117;
const CLOCK_TIMESTAMP_OFFSET = 32;
const PRICE_EXPONENT = -8;
const CONF_RATIO = 0.002;

// The program refuses a price older than an hour (max_price_age_secs). Rewriting at half of that leaves an order the
// whole other half to be signed and land.
const REFRESH_AFTER_SECS = 1_800n;
// The live price is read from a quote worth about this much, small enough for any pool and large enough to be exact.
const QUOTE_USD = 100;
const QUOTE_SLIPPAGE_BPS = 100;

const USDC = assets.find((asset) => asset.symbol === "USDC");

// What the pools pay for one whole token now, or undefined when there is no route. USDC itself stays at its oracle price.
async function livePrice(asset: AssetInfo, current: number): Promise<number | undefined> {
  if (!USDC || asset.symbol === "USDC" || !(current > 0)) return undefined;
  const tokens = QUOTE_USD / current;
  const amount = BigInt(Math.max(1, Math.round(tokens * 10 ** asset.decimals)));
  try {
    const { quote } = await fetchRawJupiterQuote(asset.mint, USDC.mint, amount, QUOTE_SLIPPAGE_BPS);
    const price = Number(quote.amountOut) / 10 ** USDC.decimals / (Number(amount) / 10 ** asset.decimals);
    return Number.isFinite(price) && price > 0 ? price : undefined;
  } catch {
    return undefined;
  }
}

function rewritten(data: Uint8Array, price: number, now: bigint): string {
  const next = Uint8Array.from(data);
  const view = new DataView(next.buffer);
  const raw = BigInt(Math.round(price * 10 ** -PRICE_EXPONENT));
  const conf = BigInt(Math.max(1, Math.round(price * CONF_RATIO * 10 ** -PRICE_EXPONENT)));
  view.setBigInt64(PRICE_OFFSET, raw, true);
  view.setBigUint64(CONF_OFFSET, conf, true);
  view.setInt32(EXPONENT_OFFSET, PRICE_EXPONENT, true);
  view.setBigInt64(PUBLISH_TIME_OFFSET, now, true);
  view.setBigInt64(PREV_PUBLISH_TIME_OFFSET, now - 1n, true);
  if (next.length >= EMA_CONF_OFFSET + 8) {
    view.setBigInt64(EMA_PRICE_OFFSET, raw, true);
    view.setBigUint64(EMA_CONF_OFFSET, conf, true);
  }
  return Buffer.from(next).toString("hex");
}

// Nothing on the fork keeps prices fresh except the website, which rewrites only the tokens it lists, so SKR (app only)
// goes stale within the hour and every price-checked instruction of an account holding it fails with StalePrice. Before
// such an order this rewrites, with the fork's own clock and a live pool price, every feed older than half the allowed
// age. One account read when all are fresh. Fork only: a real cluster has no such method and keeps Pyth fresh itself.
export async function freshenForkOracles(connection: Connection): Promise<void> {
  if (!FORK_CHEATCODES_ENABLED) return;
  try {
    const [clock, ...feeds] = await connection.getMultipleAccountsInfo([SYSVAR_CLOCK_PUBKEY, ...assets.map(priceAccountAddress)], "confirmed");
    if (!clock || clock.data.length < CLOCK_TIMESTAMP_OFFSET + 8) return;
    const now = new DataView(clock.data.buffer, clock.data.byteOffset, clock.data.byteLength).getBigInt64(CLOCK_TIMESTAMP_OFFSET, true);

    await Promise.all(
      assets.map(async (asset, index) => {
        const feed = feeds[index];
        if (!feed || feed.owner.toBase58() !== PYTH_RECEIVER_PROGRAM || feed.data.length < PREV_PUBLISH_TIME_OFFSET + 8) return;
        const view = new DataView(feed.data.buffer, feed.data.byteOffset, feed.data.byteLength);
        if (now - view.getBigInt64(PUBLISH_TIME_OFFSET, true) < REFRESH_AFTER_SECS) return;

        const current = Number(view.getBigInt64(PRICE_OFFSET, true)) * 10 ** view.getInt32(EXPONENT_OFFSET, true);
        const price = (await livePrice(asset, current)) ?? current;
        if (!(price > 0)) return;
        await fetch(RPC_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "surfnet_setAccount",
            params: [priceAccountAddress(asset).toBase58(), { lamports: feed.lamports, data: rewritten(feed.data, price, now), owner: PYTH_RECEIVER_PROGRAM, executable: false, rentEpoch: 0 }],
          }),
        });
      }),
    );
  } catch {
    // A failed refresh leaves the order to the simulation, which explains a stale price like any other failure.
  }
}
