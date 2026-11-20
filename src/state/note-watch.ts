import AsyncStorage from "@react-native-async-storage/async-storage";

import { addNote, takeOwnCloses } from "./notes";

// Real notifications from what the app reads: after each full account read it looks at the health factor and the open Perps positions
// and notes what changed since the last read (kept on the phone per wallet, so a change while the app was closed is noted on the next
// open). Health: below 1.5 and again below 1.25, once each; back above the limit (with a small margin, so it does not flicker) it says so.
const WATCH = 1.5;
const DANGER = 1.25;
const MARGIN = 0.1;
type Mem = { level: number; perps: { id: string; k: string; side: string }[] };
const key = (owner: string) => `vanna.noteWatch.v1.${owner}`;

const levelOf = (hf: number, prev: number) => {
  if (!Number.isFinite(hf)) return 0;
  if (hf < DANGER || (prev === 2 && hf < DANGER + MARGIN)) return 2;
  if (hf < WATCH || (prev >= 1 && hf < WATCH + MARGIN)) return 1;
  return 0;
};

export async function watchAccount(owner: string, hf: number | undefined, perps: { id: string; k: string; side: string }[]) {
  let mem: Mem | null = null;
  try {
    const raw = await AsyncStorage.getItem(key(owner));
    mem = raw ? (JSON.parse(raw) as Mem) : null;
  } catch {}
  const own = takeOwnCloses();
  const prev = mem?.level ?? 0;
  const level = hf === undefined ? 0 : levelOf(hf, prev);
  const now = Date.now();
  const shown = hf !== undefined && Number.isFinite(hf) ? hf.toFixed(2) : "";
  if (hf !== undefined && level > prev) {
    addNote({
      id: `hf-${now}`,
      chain: "solana",
      cat: "health",
      icon: "vanna",
      badge: "warning",
      time: "now",
      at: now,
      unread: true,
      title: level === 2 ? `Health factor ${shown}: close to liquidation` : `Health factor ${shown}`,
      msg: level === 2 ? "Liquidation starts at 1.10. Add collateral or repay a loan now." : "Your account is getting closer to liquidation. Add collateral or repay a loan to stay safe.",
    });
  } else if (hf !== undefined && level === 0 && prev > 0) {
    addNote({
      id: `hf-${now}`,
      chain: "solana",
      cat: "health",
      icon: "vanna",
      badge: "safe",
      time: "now",
      at: now,
      unread: true,
      title: `Health factor back to ${shown || "safe"}`,
      msg: "Your account is in a safe range again.",
    });
  }
  if (mem) {
    for (const p of mem.perps) {
      if (perps.some((q) => q.id === p.id) || own.has(p.id)) continue;
      addNote({
        id: `pos-${p.id}-${now}`,
        chain: "solana",
        cat: "trades",
        icon: "vanna",
        badge: "safe",
        time: "now",
        at: now,
        unread: true,
        title: `${p.k}-PERP ${p.side} closed`,
        msg: "This position is no longer open. Open History to see how it ended.",
      });
    }
  }
  const next: Mem = { level, perps };
  AsyncStorage.setItem(key(owner), JSON.stringify(next)).catch(() => {});
}
