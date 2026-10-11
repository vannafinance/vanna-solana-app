import type { AssetSymbol } from "@/lib/solana/assets";
import type { HistoryChip, MarginActivity } from "@/types/margin-history";
import type { EarningsPoint, EarningsRange, Side } from "@/types/perps";

const STOCKS: ReadonlySet<string> = new Set(["TSLAx", "GOOGLx", "AAPLx", "ANTHROPIC", "OPENAI", "SKR"]);
// An order on an account with several positions borrows in one transaction and swaps in the next (see margin-history).
const OPENING_WINDOW_SECONDS = 300;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const POINTS = 40;
const WINDOW_MS: Record<Exclude<EarningsRange, "All">, number> = { "1W": 7 * DAY, "1M": 30 * DAY, "3M": 91 * DAY };

type Leg = { asset: string; raw: bigint; decimals: number };

// One open position as history built it, keyed like PerpsPosition.id (`TSLAx-long`). `tokens` is the exposure (the stock
// bought for a long, the stock owed for a short), `usdc` what it was opened at, `principal` what was borrowed for it, in the
// borrowed asset's base units (USDC for a long, the stock for a short).
type Book = { tokens: bigint; usdc: bigint; principal: bigint; dust: bigint };

// A close's price P&L, in USD (6 decimals), at its block time in seconds.
export type RealizedTrade = { at: number; pnl: bigint };

export type TradeLedger = {
  realized: RealizedTrade[];
  // Principal still borrowed for each position history shows as open.
  principal: ReadonlyMap<string, bigint>;
  // Closes whose opening is older than the history that was read.
  unmatched: number;
  // The first margin trade, in seconds; null when there is none.
  firstAt: number | null;
};

const legOf = (leg: { asset: string; amount: { raw: bigint; decimals: number } }): Leg => ({ asset: leg.asset, raw: leg.amount.raw, decimals: leg.amount.decimals });
const dustOf = (decimals: number) => 10n ** BigInt(Math.max(decimals - 6, 0));
const borrowsOf = (chips: readonly HistoryChip[]): Leg[] => chips.flatMap((chip) => (chip.type === "borrow" ? [legOf(chip.leg)] : []));

// Replays the margin account's trades oldest first, the way the History tab reads them. A buy of a stock with a USDC borrow
// opens a long, a sale of a stock with a borrow of that stock opens a short; with no borrow, a trade closes the position it
// reverses. A close realizes its share of the position's opening value, and its share of the principal is taken as repaid.
export function tradeLedger(activity: readonly MarginActivity[]): TradeLedger {
  const books = new Map<string, Book>();
  const realized: RealizedTrade[] = [];
  let unmatched = 0;
  let firstAt: number | null = null;
  let pending: { at: number; borrows: Leg[] } | null = null;

  const close = (key: string, side: Side, tokens: bigint, usdc: bigint, at: number) => {
    const book = books.get(key);
    if (book === undefined || book.tokens <= 0n || tokens <= 0n) {
      unmatched += 1;
      return;
    }
    const closed = tokens < book.tokens ? tokens : book.tokens;
    const basis = (book.usdc * closed) / book.tokens;
    const proceeds = (usdc * closed) / tokens;
    realized.push({ at, pnl: side === "long" ? proceeds - basis : basis - proceeds });
    book.principal -= (book.principal * closed) / book.tokens;
    book.usdc -= basis;
    book.tokens -= closed;
    if (book.tokens <= book.dust) books.delete(key);
  };

  const open = (key: string, tokens: bigint, usdc: bigint, principal: bigint, decimals: number) => {
    const book = books.get(key) ?? { tokens: 0n, usdc: 0n, principal: 0n, dust: dustOf(decimals) };
    books.set(key, { ...book, tokens: book.tokens + tokens, usdc: book.usdc + usdc, principal: book.principal + principal });
  };

  for (const entry of [...activity].sort((a, b) => a.at - b.at)) {
    const swaps = entry.chips.flatMap((chip) => (chip.type === "swap" ? [{ from: legOf(chip.from), to: legOf(chip.to) }] : []));
    const own = borrowsOf(entry.chips);
    if (swaps.length === 0) {
      pending = own.length > 0 ? { at: entry.at, borrows: own } : pending;
      continue;
    }
    const borrows = own.length > 0 ? own : pending !== null && entry.at - pending.at <= OPENING_WINDOW_SECONDS ? pending.borrows : [];
    pending = null;

    for (const { from, to } of swaps) {
      const buy = from.asset === "USDC" && STOCKS.has(to.asset);
      const sell = to.asset === "USDC" && STOCKS.has(from.asset);
      if (!buy && !sell) continue;
      firstAt ??= entry.at;
      if (buy) {
        const stock = to.asset;
        const borrowedUsdc = borrows.find((leg) => leg.asset === "USDC");
        if (borrowedUsdc !== undefined || !books.has(`${stock}-short`)) open(`${stock}-long`, to.raw, from.raw, borrowedUsdc?.raw ?? 0n, to.decimals);
        else close(`${stock}-short`, "short", to.raw, from.raw, entry.at);
      } else {
        const stock = from.asset;
        const borrowedStock = borrows.find((leg) => leg.asset === stock);
        if (borrowedStock !== undefined) {
          // Stock deposited as margin is sold with the borrowed stock; the short is only what is owed.
          const owed = borrowedStock.raw < from.raw ? borrowedStock.raw : from.raw;
          open(`${stock}-short`, owed, (to.raw * owed) / from.raw, borrowedStock.raw, from.decimals);
        } else {
          close(`${stock}-long`, "long", from.raw, to.raw, entry.at);
        }
      }
    }
  }

  return { realized, principal: new Map([...books].map(([key, book]) => [key, book.principal])), unmatched, firstAt };
}

type InterestInput = {
  positions: readonly { id: string; symbol: AssetSymbol; side: Side }[];
  principal: ReadonlyMap<string, bigint>;
  // What the margin account owes for its perps positions right now (Farm's share taken out), per asset in base units.
  debt: Partial<Record<AssetSymbol, bigint>>;
  // USD price (6 decimals) per whole token, and the token's decimals.
  prices: Partial<Record<AssetSymbol, bigint>>;
  decimals: (symbol: AssetSymbol) => number;
};

// Interest owed so far = what is owed now minus what was borrowed. Every long owes the one USDC balance, so the longs are
// taken together; each short owes its own stock, valued at today's price. Null when a position's principal is not in history.
export function interestAccrued({ positions, principal, debt, prices, decimals }: InterestInput): bigint | null {
  const longs = positions.filter((position) => position.side === "long");
  const shorts = positions.filter((position) => position.side === "short");
  const borrowedFor = (id: string) => principal.get(id) ?? 0n;
  if (positions.some((position) => borrowedFor(position.id) <= 0n)) return null;

  const above = (owed: bigint, borrowed: bigint) => (owed > borrowed ? owed - borrowed : 0n);
  let total = longs.length === 0 ? 0n : above(debt.USDC ?? 0n, longs.reduce((sum, position) => sum + borrowedFor(position.id), 0n));
  for (const position of shorts) {
    const price = prices[position.symbol];
    if (price === undefined) return null;
    total += (above(debt[position.symbol] ?? 0n, borrowedFor(position.id)) * price) / 10n ** BigInt(decimals(position.symbol));
  }
  return total;
}

// Net earnings over time: the realized P&L summed up to each step (40 steps over the range), ending today at the realized
// total plus the open P&L.
export function earningsSeries(realized: readonly RealizedTrade[], openPnl: bigint, firstAt: number | null, range: EarningsRange, now: number): { points: EarningsPoint[]; stepMs: number } {
  const first = firstAt === null ? now : firstAt * 1000;
  const span = range === "All" ? Math.max(now - first + 2 * DAY, 7 * DAY) : WINDOW_MS[range];
  const stepMs = Math.max(Math.floor(span / POINTS), HOUR);
  const realizedBy = (at: number) => realized.reduce((sum, trade) => (trade.at * 1000 <= at ? sum + trade.pnl : sum), 0n);

  const points: EarningsPoint[] = [];
  for (let at = now - span; at < now; at += stepMs) points.push({ at, usd: realizedBy(at) });
  points.push({ at: now, usd: realized.reduce((sum, trade) => sum + trade.pnl, 0n) + openPnl });
  return { points, stepMs };
}
