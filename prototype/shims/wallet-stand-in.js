// `globalThis.__vnProto`: the stand-in for the wallet app, and the switchboard the outer control panel drives.
//
// On a phone, Vanna hands every connect / sign request to a wallet app (Solflare, Phantom) through the Mobile Wallet
// Adapter. In the prototype that adapter is replaced (packages/mwa-transact.js), and its requests come here: a sheet
// styled like the wallet slides up with Approve / Reject, unless "The wallet approves by itself" is on.
//
// The panel can also queue ONE failure ("next wallet answer"). It is consumed by the first request it applies to:
//   - CONNECT_FAILURES   while connecting (see packages/mwa-transact.js)
//   - SIGN_FAILURES      while a transaction is being approved in the wallet
//   - NETWORK_FAILURES   after signing, while the transaction is sent (see hooks/use-wallet-signer.js);
//                        "offline" stays set until switched off and also drives the app's simulated-offline store.

import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";
import { router } from "expo-router";

import { simulatedOffline } from "@/lib/dev/simulated-offline";

import { WALLET } from "./sample-data";

globalThis.Buffer = globalThis.Buffer || Buffer;

const CONNECT_FAILURES = ["connect-cancel", "declined", "no-wallet", "identity"];
const SIGN_FAILURES = ["cancel", "refused", "unreachable", "wallet-timeout"];
const NETWORK_FAILURES = ["network", "expired", "no-sol", "slippage", "no-tokens", "step2", "offline"];

const state = { next: "approve", auto: false, refusedUntil: 0, walletOpen: false };
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener(proto.snapshot()));

const SHEET_CSS = `
.vnw-scrim{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.5);animation:vnwFade .2s ease-out}
.vnw{position:fixed;left:0;right:0;bottom:0;z-index:2147483001;background:#161618;color:#F2F2F3;border-radius:28px 28px 0 0;padding:10px 20px 26px;
 font:400 14px/20px "Plus Jakarta Sans",system-ui,sans-serif;animation:vnwUp .32s cubic-bezier(.2,.9,.3,1)}
.vnw .g{width:32px;height:4px;border-radius:2px;background:#4A4A50;margin:0 auto 16px}
.vnw .who{display:flex;align-items:center;gap:10px;color:#A1A1A8;font-size:12px;line-height:16px}
.vnw .who b{display:block;color:#F2F2F3;font-size:14px;line-height:20px;font-weight:600}
.vnw .ic{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#FFEF46,#02CCA6);flex-shrink:0}
.vnw .dapp{margin-top:16px;padding:12px;border-radius:16px;background:#202024;display:flex;align-items:center;gap:12px}
.vnw .dapp i{width:40px;height:40px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:700;color:#703AE6}
.vnw .dapp span{flex:1}.vnw .dapp small{color:#A1A1A8}.vnw .dapp em{font-style:normal;font-size:11px;font-weight:700;color:#FFB020;background:#3A2E12;padding:3px 8px;border-radius:8px}
.vnw h3{margin:18px 0 4px;font-size:20px;line-height:26px;font-weight:600}.vnw .sub{color:#A1A1A8;font-size:13px}
.vnw .row{margin-top:12px;display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid #2A2A2E;font-size:13px}.vnw .row span:last-child{color:#A1A1A8}
.vnw .btns{margin-top:16px;display:flex;gap:10px}.vnw button{flex:1;height:52px;border-radius:26px;font:600 16px "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer}
.vnw .rej{background:transparent;color:#F2F2F3;border:1px solid #4A4A50}.vnw .ok{background:#F2F2F3;color:#161618;border:0}
.vnw .own{margin-top:10px;text-align:center;color:#6E6E76;font-size:11px;line-height:14px}
@keyframes vnwUp{from{transform:translateY(100%)}}@keyframes vnwFade{from{opacity:0}}`;

function installSheetStyles() {
  if (document.getElementById("vnw-css")) return;
  const style = document.createElement("style");
  style.id = "vnw-css";
  style.textContent = SHEET_CSS;
  document.head.appendChild(style);
}

/** Tiny DOM builder: el("div", { class: "row" }, "text", el("b", null, "bold"), ...). */
function el(tag, attributes, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes || {})) node.setAttribute(name, value);
  for (const child of children) node.append(child);
  return node;
}

function buildSheet(connecting, transactionCount) {
  const title = connecting
    ? "Connect to Vanna?"
    : "Sign " + Math.max(1, transactionCount) + " transaction" + (transactionCount > 1 ? "s" : "");
  const subtitle = connecting
    ? "Vanna will see your address. It can ask you to sign, never sign for you."
    : "Requested by devnet.solana.vanna.finance. Check the details before you approve.";
  const detail = connecting ? ["Share your wallet address", "Yes"] : ["Network fee", "≈ 0.000005 SOL"];
  return el(
    "div",
    { class: "vnw", role: "dialog", "aria-label": "Wallet app" },
    el("div", { class: "g" }),
    el(
      "div",
      { class: "who" },
      el("span", { class: "ic" }),
      el("span", null, el("b", null, proto.walletLabel), "Your wallet app, opened by Vanna"),
    ),
    el(
      "div",
      { class: "dapp" },
      el("i", null, "V"),
      el("span", null, el("b", null, "Vanna"), el("br"), el("small", null, "devnet.solana.vanna.finance")),
      el("em", null, "Mainnet fork"),
    ),
    el("h3", null, title),
    el("div", { class: "sub" }, subtitle),
    el("div", { class: "row" }, el("span", null, detail[0]), el("span", null, detail[1])),
    el(
      "div",
      { class: "btns" },
      el("button", { type: "button", class: "rej" }, "Reject"),
      el("button", { type: "button", class: "ok" }, "Approve"),
    ),
    el("div", { class: "own" }, "Stand-in for your wallet app (Solflare or Phantom on a phone). Not part of Vanna."),
  );
}

const proto = {
  walletLabel: "Solflare",
  walletPublicKey: () => new PublicKey(WALLET),

  /** Shows the wallet sheet for a "connect" or "sign" request and resolves with "approve" or "reject". */
  askWallet(kind, transactionCount) {
    if (state.auto) return new Promise((resolve) => setTimeout(() => resolve("approve"), 800));
    installSheetStyles();
    return new Promise((resolve) => {
      const scrim = el("div", { class: "vnw-scrim" });
      const sheet = buildSheet(kind === "connect", transactionCount);
      const close = (answer) => {
        scrim.remove();
        sheet.remove();
        state.walletOpen = false;
        emit();
        resolve(answer);
      };
      sheet.querySelector(".ok").addEventListener("click", () => close("approve"));
      sheet.querySelector(".rej").addEventListener("click", () => close("reject"));
      scrim.addEventListener("click", () => close("reject"));
      document.body.appendChild(scrim);
      document.body.appendChild(sheet);
      state.walletOpen = true;
      emit();
    });
  },

  /** Queues the next wallet / network answer (a failure kind, "offline", or "approve"). */
  setNext(next) {
    state.next = next || "approve";
    simulatedOffline.set(state.next === "offline");
    emit();
  },
  setAuto(auto) {
    state.auto = !!auto;
    emit();
  },
  snapshot: () => ({ next: state.next, auto: state.auto, walletOpen: state.walletOpen }),
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Consumes the queued answer if it is one of `kinds` ("offline" is sticky and is not consumed). */
  take(kinds) {
    if (!kinds.includes(state.next)) return null;
    const taken = state.next;
    if (taken !== "offline") state.next = "approve";
    emit();
    return taken;
  },
  peek: () => state.next,
  takeNetworkFailure: (kinds) => proto.take(kinds || NETWORK_FAILURES),

  /**
   * One Mobile Wallet Adapter session. A session that starts without a stored authorization is a connect; it can only
   * fail with a connect failure. A session of a connected app can fail to re-authorize ("refused" keeps failing for 9 s,
   * so the app's single automatic retry also fails) or fail while signing.
   */
  startWalletSession() {
    let connecting = true;
    try {
      connecting = !localStorage.getItem("vanna-wallet-authorization-mainnet");
    } catch (error) {}
    return {
      connecting,
      walletFailure(step) {
        if (connecting) return step === "authorize" ? proto.take(CONNECT_FAILURES) : null;
        if (step === "authorize") {
          if (Date.now() < state.refusedUntil) return "refused";
          if (proto.take(["refused"])) {
            state.refusedUntil = Date.now() + 9000;
            return "refused";
          }
          return null;
        }
        return proto.take(SIGN_FAILURES.filter((kind) => kind !== "refused"));
      },
      end() {},
    };
  },

  /** The stand-in "signs" by handing the transactions back unchanged; nothing is ever sent to a network. */
  signTransactions: async (transactions) => transactions,

  /** Navigates the app (used by the control panel's screen buttons). */
  go(path) {
    router.navigate(path);
  },
};

globalThis.__vnProto = proto;

export default proto;
