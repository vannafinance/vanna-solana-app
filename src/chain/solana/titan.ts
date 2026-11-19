// Ported from Vanna_Finance_Backend apps/solana/lib/solana/titan.ts (margin swap through Titan's swap_route_v3 inside margin_execute).
//
// Titan quotes need a secret API key, so the app cannot ask Titan directly: it asks the website's quote route
// (https://test.vanna.finance/api/solana/titan/quote, POST JSON), which holds the key. That route is open to the app only once the
// backend change that makes it public (rate-limited per IP) is merged and deployed; until then the site's access gate answers 401
// and Titan is reported as unavailable (the Spot screen then offers Jupiter only).
//
// Margin swaps: the Vanna validator allows only swap_route_v3 with config 3 (keep the input account open, keep wSOL output as
// wSOL), no provider fee, the margin account as payer and user, and caps the spend at the routed amount; Titan's own minimum out is
// the slippage bound. The margin account cannot pay rent, so the wallet first creates any of Titan's atlas token accounts the route
// needs.
import { Buffer } from "buffer";

import { ASSOCIATED_TOKEN_PROGRAM_ID, findAta, findPda } from "./pda";
import { rpc } from "./rpc";
import type { AccountMeta, RawInstruction } from "./submit";

export const TITAN_PROGRAM_ID = "T1TANpTeScyeqVzzgNViGDNrkQ6qHz9KrSBS4aNXvGT";
/** Titan's atlas: the PDA owning the intermediate token accounts its routes use. */
export const TITAN_ATLAS = findPda(["atlas"], TITAN_PROGRAM_ID);
/** The website's Titan quote route (it holds the Titan API key; nothing secret lives in the app). */
export const TITAN_QUOTE_URL = "https://test.vanna.finance/api/solana/titan/quote";
export const TITAN_UNAVAILABLE = "Titan is unavailable right now";

const COMPUTE_BUDGET = "ComputeBudget111111111111111111111111111111";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const SWAP_ROUTE_V3 = 42;
/** KEEP_OUTPUT_WSOL | KEEP_INPUT_ACCOUNT: the only config the Vanna validator allows. */
const MARGIN_CONFIG = 3;
const FIXED_ACCOUNT_COUNT = 12;
/** Byte of swap_route_v3 data that holds the number of mints in the route (backend titan.ts: call.data[20]). */
const MINT_COUNT_AT = 20;
/** The route caps slippage at 50% (the Spot screen's own limit). */
export const TITAN_MAX_SLIPPAGE_BPS = 5000;

export interface TitanInstruction {
  p: string;
  a: { p: string; s: boolean; w: boolean }[];
  d: string;
}

/** A Titan quote as the website's route returns it (with its instructions). */
export interface TitanQuote {
  provider: string;
  inAmount: string;
  outAmount: string;
  slippageBps: number;
  instructions: TitanInstruction[];
  addressLookupTables: string[];
  labels: string[];
}

/** The quote route cannot be used right now (not deployed for the app yet, no key on the server, rate-limited, offline). */
export class TitanUnavailableError extends Error {
  constructor(message = `${TITAN_UNAVAILABLE}. Swap via Jupiter instead.`) {
    super(message);
    this.name = "TitanUnavailableError";
  }
}

const isKey = (v: unknown): v is string => typeof v === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
const isUint = (v: unknown): v is string => typeof v === "string" && /^\d{1,20}$/.test(v);

/** Checks the route's answer has the shape the builder needs (it is data from the network). */
export function parseTitanQuote(body: unknown): TitanQuote {
  const b = (body ?? {}) as Record<string, unknown>;
  const ixs = Array.isArray(b.instructions) ? b.instructions : null;
  const okIx = (ix: unknown): ix is TitanInstruction => {
    const i = ix as TitanInstruction;
    return !!i && isKey(i.p) && typeof i.d === "string" && Array.isArray(i.a) && i.a.every((a) => !!a && isKey(a.p) && typeof a.s === "boolean" && typeof a.w === "boolean");
  };
  if (!ixs || !ixs.every(okIx) || !isUint(b.outAmount) || BigInt(b.outAmount as string) <= 0n) throw new Error("Titan returned an unexpected quote");
  const tables = Array.isArray(b.addressLookupTables) ? b.addressLookupTables.filter(isKey) : [];
  return {
    provider: typeof b.provider === "string" ? b.provider : "Titan",
    inAmount: isUint(b.inAmount) ? (b.inAmount as string) : "0",
    outAmount: b.outAmount as string,
    slippageBps: Number(b.slippageBps) || 0,
    instructions: ixs as TitanInstruction[],
    addressLookupTables: tables,
    labels: Array.isArray(b.labels) ? b.labels.filter((l): l is string => typeof l === "string") : [],
  };
}

/**
 * Limits on a Titan route's size, passed by the quote route to Titan as accountsLimitTotal / onlyDirectRoutes (Titan Gateway
 * "Quote Swap" docs). A margin swap wraps Titan's one instruction in margin_execute, so a long route (69 to 87 accounts) does
 * not fit one wallet-signed transaction; a smaller route is asked for instead.
 */
export type TitanRouteLimit = { maxAccounts?: number; onlyDirectRoutes?: boolean };

/** The quote route predates the route-size limits (it refuses any field it does not know with 400 "Unknown field"). */
export class TitanLimitUnsupportedError extends Error {
  constructor() {
    super("The Titan quote route cannot limit the route size yet");
    this.name = "TitanLimitUnsupportedError";
  }
}

type QuoteParams = {
  inputMint: string;
  outputMint: string;
  amount: bigint | string;
  userPublicKey: string;
  slippageBps: number;
  mode: "wallet" | "margin";
  limit?: TitanRouteLimit;
};

async function post(body: unknown, timeoutMs: number): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(TITAN_QUOTE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
  } catch {
    throw new TitanUnavailableError();
  } finally {
    clearTimeout(timer);
  }
}

/** One Titan quote through the website's route. Throws TitanUnavailableError when the route cannot serve the app. */
export async function fetchTitanQuote(p: QuoteParams): Promise<TitanQuote> {
  const res = await post(
    {
      inputMint: p.inputMint,
      outputMint: p.outputMint,
      amount: String(p.amount),
      userPublicKey: p.userPublicKey,
      slippageBps: Math.max(1, Math.min(TITAN_MAX_SLIPPAGE_BPS, Math.round(p.slippageBps))),
      mode: p.mode,
      // Only sent when asked for: a route without the limit fields refuses unknown fields.
      ...(p.limit?.maxAccounts ? { maxAccounts: p.limit.maxAccounts } : {}),
      ...(p.limit?.onlyDirectRoutes ? { onlyDirectRoutes: true } : {}),
    },
    15_000,
  );
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  // 401: the site's access gate (route not opened for the app yet); 404/405: not deployed; 429: rate limit; 503: no Titan key.
  if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 405 || res.status === 429 || res.status >= 503) {
    noteTitanAvailability(false);
    throw new TitanUnavailableError();
  }
  if (res.status === 400 && p.limit && body?.error === "Unknown field") throw new TitanLimitUnsupportedError();
  if (!res.ok) {
    const msg = typeof body?.error === "string" && body.error.length < 160 ? body.error : "Titan could not quote this swap";
    throw new Error(`${msg}. Try another amount or Jupiter.`);
  }
  noteTitanAvailability(true);
  return parseTitanQuote(body);
}

// Availability, cached for a few minutes. The probe posts an empty body: once the route is open it answers 400 (invalid request)
// without asking Titan, so it costs no Titan call; 401 (gate), 404/405 (not deployed) and 503 (no key) mean unavailable.
const PROBE_TTL_MS = 5 * 60_000;
let known: { ok: boolean; at: number } | null = null;
let probing: Promise<boolean> | null = null;
const listeners = new Set<(ok: boolean) => void>();

function noteTitanAvailability(ok: boolean) {
  const changed = known?.ok !== ok;
  known = { ok, at: Date.now() };
  if (changed) listeners.forEach((f) => f(ok));
}

/** The last known answer (null before the first probe). */
export const titanAvailableCached = (): boolean | null => (known && Date.now() - known.at < PROBE_TTL_MS ? known.ok : null);

/** Whether the quote route serves the app right now (cached for 5 minutes). */
export function probeTitan(): Promise<boolean> {
  const cached = titanAvailableCached();
  if (cached !== null) return Promise.resolve(cached);
  if (!probing) {
    probing = (async () => {
      try {
        const res = await post({}, 8_000);
        const ok = res.status === 400;
        noteTitanAvailability(ok);
        return ok;
      } catch {
        noteTitanAvailability(false);
        return false;
      } finally {
        probing = null;
      }
    })();
  }
  return probing;
}

export function onTitanAvailability(fn: (ok: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The route's one Titan swap, checked against what the Vanna validator allows (backend titan.ts:marginSwapCall). */
export function marginTitanCall(quote: TitanQuote, margin: string): { data: Buffer; accounts: AccountMeta[]; mints: number } {
  const swaps = quote.instructions.filter((ix) => ix.p !== COMPUTE_BUDGET);
  if (swaps.length !== 1 || swaps[0].p !== TITAN_PROGRAM_ID) {
    throw new Error("Titan returned a route a margin account can't run (one Titan swap instruction only). Try Jupiter or another amount.");
  }
  const data = Buffer.from(swaps[0].d, "base64");
  if (data.length <= MINT_COUNT_AT || data[0] !== SWAP_ROUTE_V3) throw new Error("Titan returned a route type the margin adapter doesn't allow");
  // The config byte is two flags (KEEP_OUTPUT_WSOL = 1, KEEP_INPUT_ACCOUNT = 2) that only decide whether wSOL accounts get closed;
  // Titan picks them per pair. The margin's vaults must never be closed, so any combination is forced to both flags.
  if ((data[1] & ~MARGIN_CONFIG) !== 0) throw new Error(`Titan route config ${data[1]} isn't allowed for a margin account`);
  data[1] = MARGIN_CONFIG;
  const accounts: AccountMeta[] = swaps[0].a.map((a) => ({ pubkey: a.p, isSigner: false, isWritable: a.w }));
  if (accounts.length < FIXED_ACCOUNT_COUNT || accounts[0].pubkey !== margin || accounts[1].pubkey !== margin) {
    throw new Error("Titan route is not built for the margin account as payer and user");
  }
  return { data, accounts, mints: data[MINT_COUNT_AT] };
}

/** AssociatedTokenProgram.createIdempotent (same bytes as actions.ts createAssociatedTokenAccountIdempotentIx). */
function createAtaIdempotent(payer: string, ata: string, owner: string, mint: string, tokenProgram: string): RawInstruction {
  return {
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  };
}

/** Titan's atlas token accounts the route uses that don't exist yet; the wallet creates them (backend titan.ts:missingAtlasAccounts). */
export async function missingAtlasAccounts(payer: string, accounts: AccountMeta[], mints: number): Promise<RawInstruction[]> {
  const atlas = accounts.slice(FIXED_ACCOUNT_COUNT, FIXED_ACCOUNT_COUNT + mints).map((a) => a.pubkey);
  const mintKeys = accounts.slice(FIXED_ACCOUNT_COUNT + mints, FIXED_ACCOUNT_COUNT + 2 * mints).map((a) => a.pubkey);
  if (atlas.length === 0 || mintKeys.length !== atlas.length) return [];
  const res = await rpc<{ value: ({ owner: string } | null)[] }>("getMultipleAccounts", [[...atlas, ...mintKeys], { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]);
  const infos = res.value;
  const created: RawInstruction[] = [];
  atlas.forEach((account, i) => {
    const mint = infos[mints + i];
    if (infos[i] || !mint) return;
    // Only an atlas ATA of that mint (owner program = the mint's token program) is created; anything else is left to Titan.
    if (findAta(TITAN_ATLAS, mintKeys[i], mint.owner) !== account) return;
    created.push(createAtaIdempotent(payer, account, TITAN_ATLAS, mintKeys[i], mint.owner));
  });
  return created;
}
