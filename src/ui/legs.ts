import type { TxStatus } from "./wallet-wait";

/* The multi-leg transaction sheet's model (design/perps-flow/MULTI-LEG.md, multileg.js). One action, several transactions ("legs"),
   usually under one wallet approval: Close all, a Perps open in parts, the margin first time, Flash repay. This file is the small
   adapter between the chain side (its per-leg callback `onLeg(index, phase, info)`, its cancel and stop handles, its errors) and the
   rows the sheet draws. It owns no chain code: the flows hand their send function a `LegRun`, and the sheet folds every event into
   `LegsState` with `legsReducer`. The copy helpers compose the title and the one-line summary from what really landed. */

/** A leg's state, as the rows show it (design words in WORD). */
export type LegPhase = "wait" | "queued" | "approve" | "check" | "send" | "confirm" | "unsure" | "done" | "failed" | "skipped";
export type LegInfo = { reason?: string; signature?: string };
/** One transaction of the action, in plain words ("Close META short", "Return 139.19 USDC to margin"). */
export type Leg = {
  id: string;
  label: string;
  /** How the summary names it ("META", "1.50 SOL"); the label when absent. */
  noun?: string;
  /** Legs of one stage run together (an independent batch); a later stage waits for the earlier ones. Default: its index (in order). */
  stage?: number;
  /** Which wallet approval signs this leg (0 = the first). A leg of a later approval is asked again after the earlier legs landed. Default 0. */
  approval?: number;
  phase: LegPhase;
  reason?: string;
  signature?: string;
};
/** What a flow supplies before the run: the legs it will send, in order. */
export type LegPlan = Omit<Leg, "phase" | "reason" | "signature">[];

/** The chain side's per-leg callback. `index` counts the legs of THIS run (all of the plan, or only the retried ones); a leg id works too. */
export type OnLeg = (index: number | string, phase: string, info?: LegInfo) => void;

/** What the sheet hands a multi-leg send: progress callbacks and the two user controls. */
export type LegRun = {
  onStatus: (s: TxStatus) => void;
  onLeg: OnLeg;
  /** Aborted when the person taps Cancel (or the X) while the wallet has not answered: end the wallet session, send nothing. */
  cancel: AbortSignal;
  /** Aborted when the person confirms Stop after approving: legs in flight finish, legs not yet sent are dropped. */
  stop: AbortSignal;
  /** A retry: the ids of the legs to build, sign (one approval) and send again. Landed legs are never in it. Absent = the whole plan. */
  only?: string[];
  /** The legs were rebuilt during the run (e.g. Flash repay approval 2, built from the chain after the closes landed): re-seed the rows. */
  onLegs?: (legs: (Omit<Leg, "phase"> & { phase?: string })[]) => void;
};
export type LegSend = (run: LegRun) => Promise<string | void>;

export const WORD: Record<LegPhase, string> = {
  wait: "Waiting to sign",
  queued: "Waiting",
  approve: "Needs approval",
  check: "Checking",
  send: "Sending",
  confirm: "Confirming",
  unsure: "Still confirming",
  done: "Done",
  failed: "Failed",
  skipped: "Not sent",
};
export const ACTIVE: LegPhase[] = ["check", "send", "confirm", "unsure"];
export const IN_FLIGHT: LegPhase[] = ["send", "confirm", "unsure"];
export const NOT_SENT: LegPhase[] = ["wait", "queued", "approve", "check"];
export const ENDED: LegPhase[] = ["done", "failed", "skipped"];

// The chain agent's words (waiting | checking | sending | confirming | done | failed | not-sent) and the design's own.
const FROM_CHAIN: Record<string, LegPhase> = {
  waiting: "wait", wait: "wait", queued: "queued", approve: "approve", "needs-approval": "approve",
  checking: "check", check: "check", sending: "send", send: "send", confirming: "confirm", confirm: "confirm",
  unsure: "unsure", "still-confirming": "unsure", timeout: "unsure",
  done: "done", landed: "done", confirmed: "done", failed: "failed", "not-sent": "skipped", skipped: "skipped",
};

export type LegsState = {
  legs: Leg[];
  /** The ids of the legs in the current run. */
  run: string[];
  /** The wallet has the request and has not answered yet. */
  asking: boolean;
  /** The wallet approved the current run. */
  signed: boolean;
  /** The current run is a retry (or Continue) of the legs that were left. */
  retry: boolean;
  /** Stop was confirmed: the legs in flight finish, nothing new is sent. */
  stopping: boolean;
  /** The chain reported per-leg events in this run (otherwise the settle fallbacks place the rows). */
  heard: boolean;
};

export type LegAction =
  | { t: "start"; only?: string[] }
  | { t: "status"; s: TxStatus }
  | { t: "signed" }
  | { t: "leg"; i: number | string; phase: string; info?: LegInfo }
  | { t: "stop" }
  | { t: "cancel" }
  | { t: "settle"; ok: boolean; hash?: string; reason?: string; nothingSent?: boolean; error?: unknown }
  | { t: "load"; state: LegsState }
  | { t: "reseed"; legs: (Omit<Leg, "phase"> & { phase?: string })[] };

export const initLegs = (plan: LegPlan): LegsState => ({
  legs: plan.map((l, i) => ({ stage: i, ...l, phase: "wait" })),
  run: plan.map((l) => l.id),
  asking: false,
  signed: false,
  retry: false,
  stopping: false,
  heard: false,
});

const patch = (s: LegsState, ids: string[], f: (l: Leg) => Leg | null) => ({
  ...s,
  legs: s.legs.map((l) => (ids.includes(l.id) ? f(l) ?? l : l)),
});

export function legsReducer(s: LegsState, a: LegAction): LegsState {
  switch (a.t) {
    case "load":
      return a.state;
    case "start": {
      const run = a.only ?? s.legs.filter((l) => l.phase !== "done").map((l) => l.id);
      const next = patch(s, run, (l) => ({ ...l, phase: "wait", reason: undefined }));
      return { ...next, run, asking: true, signed: false, retry: !!a.only, stopping: false, heard: false };
    }
    case "status":
      if (a.s === "waiting_for_wallet") {
        // a second approval (the USDC return after Close all, Flash repay approval 2): the legs not started yet need it
        if (!s.signed || s.asking) return { ...s, asking: true };
        const next = patch(s, s.run, (l) => (l.phase === "wait" || l.phase === "queued" ? { ...l, phase: "approve" } : null));
        return { ...next, asking: true };
      }
      return s.signed && !s.asking ? s : legsReducer(s, { t: "signed" });
    case "signed": {
      // approved: the legs of this run wait for their turn (nothing is shown as sent before the chain says so)
      const next = patch(s, s.run, (l) => (l.phase === "wait" || l.phase === "approve" ? { ...l, phase: "queued" } : null));
      return { ...next, asking: false, signed: true };
    }
    case "leg": {
      const id = typeof a.i === "string" ? a.i : s.run[a.i];
      let phase = FROM_CHAIN[a.phase];
      if (!id || !phase) return s;
      // "waiting" after the approval means waiting for the previous leg
      if (phase === "wait" && s.signed) phase = "queued";
      const moving = ACTIVE.includes(phase) || phase === "done" || phase === "failed";
      const next = patch(s, [id], (l) => ({
        ...l,
        phase,
        reason: phase === "failed" || phase === "unsure" ? a.info?.reason ?? (phase === "unsure" ? "Confirmation timed out. Reading the chain…" : l.reason) : undefined,
        signature: a.info?.signature ?? l.signature,
      }));
      return { ...next, heard: true, ...(moving && !s.signed ? { signed: true, asking: false } : moving ? { asking: false } : null) };
    }
    case "stop": {
      // only the legs held back by an earlier stage are dropped; the current stage is never interrupted
      const held = heldBack(s).map((l) => l.id);
      const next = patch(s, held, (l) => ({ ...l, phase: "skipped", reason: undefined }));
      return { ...next, stopping: true };
    }
    case "reseed": {
      const legs: Leg[] = a.legs.map((n, i) => {
        const old = s.legs.find((l) => l.id === n.id);
        const phase = (n.phase && FROM_CHAIN[n.phase]) || old?.phase || (s.signed ? "queued" : "wait");
        return { stage: i, ...n, phase: phase === "wait" && s.signed ? "queued" : phase, reason: n.reason ?? old?.reason, signature: n.signature ?? old?.signature };
      });
      // this run: the legs it had, plus any new one the rebuild added
      return { ...s, legs, run: legs.map((l) => l.id).filter((id) => s.run.includes(id) || !s.legs.some((o) => o.id === id)) };
    }
    case "cancel": {
      const next = patch(s, s.run, (l) => (ENDED.includes(l.phase) ? null : { ...l, phase: "skipped", reason: undefined }));
      return { ...next, asking: false };
    }
    case "settle": {
      const runLegs = s.legs.filter((l) => s.run.includes(l.id));
      const lastId = runLegs[runLegs.length - 1]?.id;
      if (a.ok) {
        // the run resolved: every leg it sent landed (after a Stop, only the ones in flight)
        const next = patch(s, s.run, (l) =>
          l.phase === "done" || l.phase === "failed"
            ? null
            : s.stopping && !IN_FLIGHT.includes(l.phase) && l.phase !== "check"
              ? { ...l, phase: "skipped" }
              : { ...l, phase: "done", reason: undefined, signature: l.signature ?? (l.id === lastId ? a.hash : undefined) },
        );
        return { ...next, asking: false };
      }
      if (a.nothingSent) return { ...legsReducer(s, { t: "cancel" }) };
      const fromErr = !s.heard ? batchError(a.error, runLegs.length) : null;
      if (fromErr) {
        const next = {
          ...s,
          legs: s.legs.map((l) => {
            const k = s.run.indexOf(l.id);
            if (k < 0 || l.phase === "done") return l;
            const f = fromErr.failed.find((x) => x.index === k);
            if (f) return { ...l, phase: "failed" as const, reason: shortReason(f.message) };
            if (fromErr.independent || k < fromErr.firstFailed) return { ...l, phase: "done" as const, reason: undefined };
            return { ...l, phase: "skipped" as const, reason: undefined };
          }),
        };
        return { ...next, asking: false };
      }
      // no per-leg news: the first leg that had not ended failed with the reason, the later ones were not sent
      let failedOne = s.legs.some((l) => s.run.includes(l.id) && l.phase === "failed");
      const next = patch(s, s.run, (l) => {
        if (ENDED.includes(l.phase)) return null;
        if (!failedOne && (!s.heard || ACTIVE.includes(l.phase))) {
          failedOne = true;
          return { ...l, phase: "failed", reason: a.reason ? shortReason(a.reason) : undefined };
        }
        return { ...l, phase: "skipped", reason: undefined };
      });
      return { ...next, asking: false };
    }
  }
}

/** The structured part of the chain's BatchPartError (submit.ts), read without importing it: which parts failed and why. */
function batchError(e: unknown, n: number): { failed: { index: number; message: string }[]; firstFailed: number; independent: boolean } | null {
  if (!e || typeof e !== "object") return null;
  const x = e as { failedIndex?: unknown; failed?: unknown; message?: unknown };
  if (Array.isArray(x.failed) && x.failed.length) {
    const failed = (x.failed as { index: number; message: string }[]).filter((f) => typeof f.index === "number" && f.index < n);
    return failed.length ? { failed, firstFailed: Math.min(...failed.map((f) => f.index)), independent: true } : null;
  }
  if (typeof x.failedIndex === "number" && x.failedIndex < n) {
    return { failed: [{ index: x.failedIndex, message: String(x.message ?? "") }], firstFailed: x.failedIndex, independent: false };
  }
  return null;
}

/** One short line for a failed row: the first sentence of the error, without the part label and transaction ids. */
export function shortReason(msg: string): string {
  const m = msg.replace(/\s*\(Tx: [^)]*\)/g, "").replace(/^[^:]{1,40}: /, "").split("\n")[0].trim();
  const first = m.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? m;
  return first.length > 120 ? `${first.slice(0, 117)}…` : first;
}

/* ------------------------------------------------------------------ errors from the chain's cancel and stop handles */

const named = (e: unknown, re: RegExp) => !!e && typeof e === "object" && re.test(String((e as { name?: unknown }).name ?? ""));
/** The person cancelled before the wallet answered (WalletCancelledError / CancelledError): nothing was sent. */
export const isCancelled = (e: unknown) => named(e, /^(Wallet)?Cancel+edError$/);
/** The person stopped between legs (StoppedError): some legs landed, the rest were not sent. */
export const isStopped = (e: unknown) => named(e, /^StoppedError$/);
/** The wallet said no (or never answered) before anything was sent. */
export const isWalletNo = (e: unknown) => /declined|did not answer|association cancel/i.test(e instanceof Error ? e.message : String(e ?? ""));
/** The wallet library's own words, said plainly: its session ended (the wallet screen closed) before anything was signed. */
export const walletWords = (msg: string) => (/association cancel/i.test(msg) ? "The wallet closed before you approved. Nothing was sent." : msg);

/* ------------------------------------------------------------------ queries */

export const doneLegs = (s: LegsState) => s.legs.filter((l) => l.phase === "done");
export const leftLegs = (s: LegsState) => s.legs.filter((l) => l.phase !== "done");
export const notSentLegs = (s: LegsState) => s.legs.filter((l) => s.run.includes(l.id) && NOT_SENT.includes(l.phase));
export const inFlight = (s: LegsState) => s.legs.some((l) => IN_FLIGHT.includes(l.phase));
export const anyActive = (s: LegsState) => s.legs.some((l) => ACTIVE.includes(l.phase));

/** What a retry sends: every leg that did not land; for one row, that leg plus the not-sent legs of the later stages. */
export function retryIds(s: LegsState, onlyId?: string): string[] {
  if (!onlyId) return leftLegs(s).map((l) => l.id);
  const f = s.legs.find((l) => l.id === onlyId);
  if (!f) return [];
  return [f.id, ...s.legs.filter((l) => l.phase === "skipped" && (l.stage ?? 0) > (f.stage ?? 0)).map((l) => l.id)];
}

/** The bar's three labels, each lit by a real event: Sent (a leg left the phone), Processed (a leg landed), Confirmed (all landed). */
export function barLit(s: LegsState): [boolean, boolean, boolean] {
  const any = (ps: LegPhase[]) => s.legs.some((l) => ps.includes(l.phase));
  return [any(["send", "confirm", "unsure", "done"]), any(["done"]), s.legs.length > 0 && s.legs.every((l) => l.phase === "done")];
}

/* ------------------------------------------------------------------ copy: the whole operation, not the last leg */

const noun = (l: Leg) => l.noun ?? l.label;
/** "META, ETH and SOL" */
export const names = (ls: Leg[]) => {
  const a = ls.map(noun);
  return a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
};
export const isAre = (ls: Leg[]) => (ls.length === 1 ? "is" : "are");
export const wasWere = (ls: Leg[]) => (ls.length === 1 ? "was" : "were");

export type FinishKind = "done" | "part" | "stopped" | "cancelled" | "nothing";
export type Finish = { kind: FinishKind; ok: Leg[]; left: Leg[]; failed: Leg[]; why?: string };

export function finishOf(s: LegsState, kind: FinishKind, why?: string): Finish {
  return { kind, ok: doneLegs(s), left: leftLegs(s), failed: s.legs.filter((l) => l.phase === "failed"), why };
}

/** A flow's own words for its results (MULTI-LEG.md tables). Each returns [title, line]; absent = the generic copy below. */
export type LegCopy = {
  /** The header while it runs: "Closing 4 positions". */
  doing: string;
  part?: (ok: Leg[], left: Leg[], failed: Leg[]) => [string, string];
  stopped?: (ok: Leg[], left: Leg[]) => [string, string];
  /** The primary button after a Stop ("Continue repaying"); default "Continue". */
  continueLabel?: (left: Leg[]) => string;
  /** What the Stop texts call the legs already sent ("Closes" for Close all); default "Steps". */
  sentNoun?: string;
};

/** The finished sheet's title and line. `done`: the flow's all-done copy (TxSpec.done). */
export function summary(f: Finish, copy: LegCopy | undefined, done: { title: string; line?: string }, total: number, app?: string | null): [string, string] {
  switch (f.kind) {
    case "done":
      return [done.title, done.line ?? ""];
    case "cancelled":
      return ["Cancelled", cancelledLine(app)];
    case "nothing": {
      const why = (f.why ?? "").trim();
      return ["Not confirmed", /nothing was sent/i.test(why) ? why : `${why ? `${why} ` : ""}Nothing was sent.`];
    }
    case "stopped":
      if (copy?.stopped) return copy.stopped(f.ok, f.left);
      if (!f.ok.length) return ["Stopped", "Nothing was sent."];
      return [`Stopped: ${f.ok.length} of ${total} done`, `${names(f.left)} ${wasWere(f.left)} not sent.`];
    case "part":
      if (copy?.part) return copy.part(f.ok, f.left, f.failed);
      if (!f.ok.length) return ["Not confirmed", `${names(f.left)} didn't go through.`];
      return [`${f.ok.length} of ${total} done`, `${names(f.left)} didn't go through.`];
  }
}

/** The running header: waiting for the wallet (first approval, a retry, or a second approval), stopping, or the count. */
export function runHead(s: LegsState, copy: LegCopy | undefined, walletApp: string | null, fallbackDoing: string): [string, string] {
  const doing = copy?.doing ?? fallbackDoing;
  const n = s.legs.length;
  const app = walletApp ?? "your wallet";
  if (s.asking && walletApp) {
    const ls = s.legs.filter((l) => s.run.includes(l.id) && !ENDED.includes(l.phase));
    if (s.signed) {
      const more = ls.filter((l) => l.phase === "approve");
      return ["Approve once more", more.length ? `${app} asks again for: ${more.map((l) => l.label.toLowerCase()).join(", ")}.` : `${app} asks for one more approval.`];
    }
    if (s.retry) return ["Waiting for your wallet", `Approve the retry in ${app}: ${ls.length === 1 ? ls[0].label.toLowerCase() : `${ls.length} transactions`}. Done steps are not sent again.`];
    // Only the legs of this approval: a later one (the USDC return after Close all) is asked for separately.
    const first = Math.min(...ls.map((l) => l.approval ?? 0));
    const here = ls.filter((l) => (l.approval ?? 0) === first);
    return ["Waiting for your wallet", `Approve in ${app}${here.length > 1 ? ` (${here.length} transactions, one approval)` : ""}. If it shows a warning, tap Confirm (unsafe).`];
  }
  if (s.stopping) return ["Stopping after this step…", `${copy?.sentNoun ?? "Steps"} already sent will finish. Nothing else will be sent.`];
  return [doing, `${doneLegs(s).length} of ${n} done`];
}

/** The stage the run is on now: the lowest stage that still has a leg that has not ended. */
const curStage = (s: LegsState) => {
  const open = s.legs.filter((l) => s.run.includes(l.id) && !ENDED.includes(l.phase));
  return open.length ? Math.min(...open.map((l) => l.stage ?? 0)) : null;
};
/** Legs not sent yet that wait for an earlier stage to land: the only legs a Stop can still hold back. When every remaining leg is
 *  already on its way (Close all sends all closes at once; the last stage of any flow) a Stop could change nothing, so none is offered. */
export function heldBack(s: LegsState): Leg[] {
  const cur = curStage(s);
  if (cur === null) return [];
  return s.legs.filter((l) => s.run.includes(l.id) && NOT_SENT.includes(l.phase) && (l.stage ?? 0) > cur);
}

/** The inline Stop confirm's body: honest about what still happens. */
export function stopBody(s: LegsState, copy: LegCopy | undefined): string {
  const n = heldBack(s).length;
  return `${copy?.sentNoun ?? "Steps"} already sent will finish. The remaining ${n} step${n === 1 ? "" : "s"} will not be sent.`;
}

/** The Cancelled line. The wallet library cannot withdraw a request already shown in the wallet: whatever it signs later is thrown
 *  away, but the wallet keeps showing it until it is declined there. */
export const cancelledLine = (app?: string | null) => `Nothing was sent. If ${app ?? "your wallet"} still shows the request, decline it there.`;

/**
 * Maps the chain batch parts (onLeg by part index) onto the sheet legs. A leg can be several parts (a split "Add USDC"), and one part
 * can carry several legs (deposit and order in one transaction). The part count is learned from the "waiting" burst the chain reports
 * for every part right after the approval. A leg moves on with its least advanced part; it is done when all its parts are done.
 * `map(i, total)` names the leg id(s) of part i of `total`.
 */
export function partsToLegs(onLeg: OnLeg, map: (i: number, total: number) => string | string[]): (i: number, phase: string, info?: LegInfo) => void {
  const seen = new Map<number, string>();
  const info = new Map<number, LegInfo | undefined>();
  let total = 0;
  const RANK: Record<string, number> = { waiting: 0, checking: 1, sending: 2, confirming: 3, done: 4 };
  return (i, phase, inf) => {
    if (phase === "waiting" && !seen.has(i)) total = Math.max(total, i + 1);
    seen.set(i, phase);
    info.set(i, inf ?? info.get(i));
    if (!total) total = i + 1;
    const ids = ([] as string[]).concat(map(i, Math.max(total, i + 1)));
    for (const id of ids) {
      const parts = [...seen.keys()].filter((k) => ([] as string[]).concat(map(k, Math.max(total, k + 1))).includes(id));
      const ph = parts.map((k) => seen.get(k)!);
      let out: string;
      if (ph.includes("failed")) out = "failed";
      else if (ph.every((p) => p === "done") && parts.length >= ([...Array(Math.max(total, i + 1)).keys()].filter((k) => ([] as string[]).concat(map(k, Math.max(total, k + 1))).includes(id)).length)) out = "done";
      else if (ph.includes("not-sent") && !ph.some((p) => p === "sending" || p === "confirming" || p === "checking")) out = "not-sent";
      else {
        const live = ph.filter((p) => p in RANK && p !== "done");
        out = live.length ? live.reduce((a, b) => (RANK[b] > RANK[a] ? b : a)) : "waiting";
      }
      const last = parts[parts.length - 1];
      onLeg(id, out, out === "failed" ? info.get(parts.find((k) => seen.get(k) === "failed")!) : info.get(last));
    }
  };
}

/** Short signature for a row: "5Kq2…8sWd". */
export const shortSig = (h?: string) => (h ? `${h.slice(0, 4)}…${h.slice(-4)}` : "");
