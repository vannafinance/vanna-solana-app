/* Wallet picker prototype (v2, dark only). One state object; the phone is rendered from it.
   Wallet names and icons are neutral placeholders: on the real device every name and icon is the installed app's own, from Android. */
(() => {
  "use strict";

  // ---------- icons ----------
  const I = {
    close: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chev: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    navBack: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 4v16L5 12z"/></svg>',
    navHome: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>',
    navRecent: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',
    ext: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    bang: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 6v8M12 18.5v.5"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 11v6M12 7v.5"/></svg>',
    apps: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>',
    // "an app icon goes here": the same neutral placeholder for every wallet that has an icon
    ph: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9.5" cy="9.5" r="1.6" fill="currentColor" stroke="none"/><path d="M5 17l4.5-4.5 3 3 2.5-2.5L19.5 17" stroke-linecap="round"/></svg>',
    wallet: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="6.5" width="18" height="13" rx="3"/><path d="M6.5 6.5V6a2 2 0 0 1 2-2H17"/><path d="M15.5 13h2.5" stroke-linecap="round"/></svg>`,
    sig: '<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M1 11h2V8H1zM5 11h2V6H5zM9 11h2V3H9zM13 11h2V0h-2z"/></svg>',
    bat: '<svg width="22" height="12" viewBox="0 0 22 12" fill="none" stroke="currentColor"><rect x=".5" y=".5" width="18" height="11" rx="3"/><rect x="2.5" y="2.5" width="12" height="7" rx="1.5" fill="currentColor" stroke="none"/><path d="M20.5 4v4" stroke-linecap="round"/></svg>',
  };

  // Sample of what Android reports for each installed app that answers the wallet link: label, icon (or none), package name.
  const WALLETS = {
    a: { id: "a", label: "Wallet A", pkg: "com.example.wallet.a", tint: "#5B4B8A" },
    b: { id: "b", label: "Wallet B", pkg: "com.example.wallet.b", tint: "#2F6F73" },
    c: { id: "c", label: "Wallet C", pkg: "com.example.wallet.c", tint: "#7A4A3A" },
    d: { id: "d", label: "Wallet D with a much longer name", pkg: "com.example.wallet.d", tint: "#4A5A7A" },
    e: { id: "e", label: "Wallet E (no icon)", pkg: "com.example.wallet.e", tint: null },
    f: { id: "f", label: "Wallet F", pkg: "com.example.wallet.f", tint: "#6B5A2E" },
    g: { id: "g", label: "Wallet G", pkg: "com.example.wallet.g", tint: "#3E6A4A" },
    h: { id: "h", label: "Wallet H", pkg: "com.example.wallet.h", tint: "#6A3E5E" },
  };
  const SCEN = { many: ["a", "b", "c", "d", "e"], eight: ["a", "b", "c", "d", "e", "f", "g", "h"], one: ["a"], none: [] };
  const ADDR = { a: "7xKX…9fQa", b: "4fHt…Qz8m", c: "3mPq…Lw2e", d: "9aRb…Tc1k", e: "2kLm…Vn7p", f: "5gYu…Hd3s", g: "8wEr…Jx6b", h: "6pNo…Fk4t" };
  const MAX_WALLETS = 2;
  const LIST_URL = "https://solanamobile.com/wallets";

  // ---------- state ----------
  const qs = new URLSearchParams(location.search);
  const S = {
    width: Number(qs.get("w")) === 412 ? 412 : 360,
    rm: matchMedia("(prefers-reduced-motion: reduce)").matches,
    layout: qs.get("layout") === "list" ? "list" : "grid", // the design is the grid; List stays behind the switch for comparison
    scenario: "many", // many | eight | one | none
    last: "b", // id of the wallet used before, or ""
    from: "intro", // intro | account
    acctN: 1, // Account: how many wallets are already connected (1 or 2)
    connected: [], // Account: [{id, addr}] in the wallet list, first one is in use
    replacing: null, // Account with 2 kept: the wallet the new one will replace (removed only after the new one connects)
    slow: false,
    // view: detect | list | wait | fail | done | none ; wait.phase: opening | waiting (the side panel plays the wallet app)
    sheet: null,
    opening: false,
    closing: false,
    chooser: false,
    toast: null,
    stateId: "intro",
  };
  const seedConnected = () => (S.connected = (S.acctN === 2 ? ["a", "c"] : ["a"]).map((id) => ({ id, addr: ADDR[id] })));
  seedConnected();
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => (timers.forEach(clearTimeout), (timers = []));
  let toastTimer;
  const W = (id) => WALLETS[id];
  const name = (sh) => (sh.generic ? "your wallet" : W(sh.wallet).label);
  const Name = (sh) => (sh.generic ? "Your wallet" : W(sh.wallet).label);

  // One wallet app = one connected wallet. From Account, apps that stay connected are not listed at all
  // (the app of the wallet being replaced is listed, since it is going away).
  const staysConnected = (id) => S.from === "account" && S.connected.some((c) => c.id === id) && id !== S.replacing;
  // detected wallets: the one used before first (first connect only), then A to Z
  function detected(all) {
    const lead = S.from === "intro" ? S.last : "";
    return SCEN[S.scenario]
      .filter((id) => all || !staysConnected(id))
      .sort((a, b) => (a === lead ? -1 : b === lead ? 1 : W(a).label.localeCompare(W(b).label)))
      .map(W);
  }
  const tagFor = (w) => (S.from === "intro" && w.id === S.last ? "Last used" : "");

  // ---------- flow ----------
  function openPicker() {
    clearTimers();
    S.chooser = false;
    S.sheet = { view: "detect" };
    S.opening = true;
    S.stateId = "detect";
    render();
    later(afterDetect, S.slow ? 1800 : 280);
  }
  // Account > Add wallet: with 2 kept, ask which one to replace first.
  function addWallet() {
    S.replacing = null;
    if (S.connected.length < MAX_WALLETS) return openPicker();
    clearTimers();
    S.chooser = false;
    S.sheet = { view: "replace" };
    S.opening = true;
    S.stateId = "replace";
    render();
  }
  function afterDetect() {
    const list = detected();
    if (!list.length && detected(true).length) set({ view: "allConnected" }, "allConnected");
    else if (!list.length) set({ view: "none" }, "none");
    else if (list.length === 1) startConnect(list[0].id, { single: true });
    else set({ view: "list" }, "list");
  }
  // Tap a wallet: "Opening X…" for the moment Android takes to bring the wallet up, then the wallet app is in front of Vanna.
  function startConnect(id, o = {}) {
    clearTimers();
    S.sheet = { view: "wait", wallet: id, phase: "opening", single: !!o.single, generic: !!o.generic };
    S.stateId = o.single ? "one" : "opening";
    render();
    later(goAway, 900);
  }
  // The wallet app is now in front (the side panel plays it); the sheet's own waiting state is what Vanna shows behind it.
  function goAway() {
    S.sheet.phase = "waiting";
    S.stateId = "waiting";
    render();
  }
  function set(patch, id) {
    S.sheet = Object.assign({}, S.sheet, patch);
    if (id) S.stateId = id;
    render();
  }
  function closeSheet(then) {
    clearTimers();
    if (!S.sheet) return;
    S.closing = true;
    render();
    setTimeout(() => {
      S.sheet = null;
      S.closing = false;
      S.replacing = null; // closing or cancelling never removes a wallet
      S.stateId = "intro";
      render();
      then && then();
    }, 230);
  }
  function toast(text, tone = "ok", ms = 2600) {
    clearTimeout(toastTimer);
    S.toast = { text, tone };
    render();
    toastTimer = setTimeout(() => ((S.toast = null), render()), ms);
  }
  // The wallet answers. Any answer brings the person back to Vanna, where the sheet shows the result.
  function walletAnswer(kind) {
    const sh = S.sheet;
    if (!sh || sh.view !== "wait" || sh.phase === "opening") return;
    clearTimers();
    if (kind === "approve") {
      set({ view: "done", phase: null }, "done");
      later(() => {
        const label = W(sh.wallet).label;
        let msg = `${label} connected`;
        if (!sh.generic) S.last = sh.wallet;
        if (S.from === "account") {
          // only now, after the new wallet connected, is the replaced one removed
          const entry = { id: sh.wallet, addr: ADDR[sh.wallet] };
          if (S.connected.some((c) => c.id === S.replacing)) {
            // after a replace the new wallet is always the one in use (first in the list)
            msg = `${label} connected. ${W(S.replacing).label} removed.`;
            S.connected = [entry, ...S.connected.filter((c) => c.id !== S.replacing)];
          } else S.connected.push(entry);
        }
        closeSheet(() => toast(msg));
      }, 1600); // the Connected link animation is about 1.2 s; then a short hold on the final frame
    } else if (kind === "never") {
      S.sheet.silent = true;
      render();
      later(() => set({ view: "fail", fail: "timeout", phase: null, silent: false }, "failTimeout"), 3500);
    }
    else set({ view: "fail", fail: kind, phase: null }, kind === "declined" ? "failDeclined" : "failError");
  }

  const ACT = {
    connect: () => openPicker(),
    close: () => (S.sheet && S.sheet.view === "wait" ? ACT.cancel() : closeSheet()),
    scrim: () => (S.sheet && S.sheet.view === "wait" ? toast(`Waiting for ${name(S.sheet)}. Open it again, or tap Cancel.`, "info") : closeSheet()),
    back: () => {
      if (S.chooser) return ((S.chooser = false), (S.stateId = "list"), render());
      if (!S.sheet) return toast("Back leaves the app here", "info");
      if (S.sheet.view === "wait") return ACT.cancel();
      closeSheet();
    },
    pick: (id) => startConnect(id),
    fallback: () => (clearTimers(), (S.chooser = true), (S.stateId = "chooser"), render()),
    chooserPick: (id) => ((S.chooser = false), startConnect(id, { generic: true })),
    chooserCancel: () => ((S.chooser = false), (S.stateId = S.sheet ? S.sheet.view : "intro"), render()),
    cancel: () => {
      clearTimers();
      if (S.sheet.single) return closeSheet();
      set({ view: "list", phase: null }, "list");
    },
    reopen: () => (S.sheet.generic ? ACT.fallback() : startConnect(S.sheet.wallet, { single: S.sheet.single })),
    retry: () => (S.sheet.generic ? ACT.fallback() : startConnect(S.sheet.wallet, { single: S.sheet.single })),
    another: () => (clearTimers(), set({ view: "list", single: false, phase: null }, "list")),
    recheck: () => {
      clearTimers();
      set({ view: "detect" }, "detect");
      later(afterDetect, S.slow ? 1800 : 400);
    },
    list: () => toast("Opens solanamobile.com/wallets in the browser", "info"),
    approve: () => walletAnswer("approve"),
    decline: () => walletAnswer("declined"),
    never: () => walletAnswer("never"),
    error: () => walletAnswer("error"),
    addFromAccount: () => addWallet(),
    replacePick: (id) => {
      S.replacing = id;
      set({ view: "detect" }, "detect");
      later(afterDetect, S.slow ? 1800 : 280);
    },
    closeSheet: () => closeSheet(),
  };

  // Jump to a state (held: nothing moves on until you tap something in it).
  const sg = () => S.scenario === "one";
  const JUMPS = [
    ["intro", "Closed", () => (S.sheet = null)],
    ["detect", "1 Detecting", () => ((S.sheet = { view: "detect" }), (S.opening = true))],
    ["list", "2 Several wallets", () => ((S.scenario = "many"), (S.sheet = { view: "list" }), (S.opening = true))],
    ["one", "3 One wallet", () => ((S.scenario = "one"), (S.sheet = { view: "wait", wallet: "a", phase: "opening", single: true }), (S.opening = true))],
    ["none", "4 No wallet", () => ((S.scenario = "none"), (S.sheet = { view: "none" }), (S.opening = true))],
    ["opening", "5a Opening", () => (S.sheet = { view: "wait", wallet: "b", phase: "opening", single: sg() })],
    ["waiting", "5b Waiting", () => (S.sheet = { view: "wait", wallet: "b", phase: "waiting", single: sg() })],
    ["failDeclined", "6 Declined", () => (S.sheet = { view: "fail", wallet: "b", fail: "declined", single: sg() })],
    ["failTimeout", "6b No answer", () => (S.sheet = { view: "fail", wallet: "b", fail: "timeout", single: sg() })],
    ["failError", "6c Didn't connect", () => (S.sheet = { view: "fail", wallet: "b", fail: "error", single: sg() })],
    ["chooser", "7 Can't see your wallet", () => ((S.scenario = "many"), (S.sheet = { view: "list" }), (S.chooser = true))],
    ["generic", "7b Waiting, after phone list", () => (S.sheet = { view: "wait", wallet: "e", phase: "waiting", generic: true })],
    ["eight", "2b Many wallets (8)", () => ((S.scenario = "eight"), (S.sheet = { view: "list" }), (S.opening = true))],
    ["done", "Connected", () => (S.sheet = { view: "done", wallet: "b" })],
    ["acctList", "A1 Add wallet: list", () => ((S.acctN = 1), (S.scenario = "many"), (S.sheet = { view: "list" }), (S.opening = true))],
    ["allConnected", "A2 All already connected", () => ((S.acctN = 1), (S.scenario = "one"), (S.sheet = { view: "allConnected" }), (S.opening = true))],
    ["replace", "A3 2 kept: which to replace", () => ((S.acctN = 2), (S.scenario = "many"), (S.sheet = { view: "replace" }), (S.opening = true))],
    ["replaceList", "A4 Replacing A: list", () => ((S.acctN = 2), (S.scenario = "many"), (S.replacing = "a"), (S.sheet = { view: "list" }), (S.opening = true))],
  ];
  const ACCOUNT_JUMPS = ["acctList", "allConnected", "replace", "replaceList"];
  function jump(id) {
    clearTimers();
    clearTimeout(toastTimer);
    S.toast = null;
    S.closing = false;
    S.chooser = false;
    S.replacing = null;
    S.from = ACCOUNT_JUMPS.includes(id) ? "account" : "intro";
    if (S.scenario === "none" && !["intro", "detect", "none"].includes(id)) S.scenario = "many";
    if (S.scenario === "eight" && id !== "eight") S.scenario = "many";
    JUMPS.find((x) => x[0] === id)[2]();
    seedConnected();
    S.stateId = id;
    render();
  }

  // ---------- render pieces ----------
  const icon = (w, size) => {
    const st = size ? ` style="width:${size}px;height:${size}px"` : "";
    return w && w.tint
      ? `<span class="wicon ph"${st.replace('style="', `style="background:${w.tint};`) || ` style="background:${w.tint}"`}>${I.ph}</span>`
      : `<span class="wicon generic"${st}>${I.wallet(size ? Math.round(size * 0.5) : 22)}</span>`;
  };
  const btn = (cls, act, label) => `<button class="${cls}" data-act="${act}">${label}</button>`;
  const i = (n) => `style="--i:${n}"`;

  function vDetect() {
    if (S.layout === "grid") {
      const tile = (a, b) => `<div class="gtile skel"><span class="wicon"></span><span class="sk" style="height:9px;width:${a}px"></span><span class="sk" style="height:9px;width:${b}px"></span></div>`;
      return `<p class="sub" ${i(0)}>Looking for wallet apps on this phone…</p>
        <div class="grid" ${i(1)} aria-busy="true">${tile(56, 36)}${tile(48, 30)}${tile(60, 40)}</div>`;
    }
    const row = (w) => `<div class="wrow skel"><span class="wicon"></span><span class="sk" style="height:14px;width:${w}px"></span></div>`;
    return `<p class="sub" ${i(0)}>Looking for wallet apps on this phone…</p>
      <div class="group" ${i(1)} aria-busy="true">${row(120)}${row(92)}${row(140)}</div>`;
  }
  // Grid variant (prototype switch List / Grid): 3 columns, icon above a name of up to 2 lines.
  function gridHTML() {
    return `<div class="grid" ${i(1)}>${detected()
      .map((w) => {
        const t = tagFor(w);
        return `<button class="gtile" data-act="pick:${w.id}" aria-label="${w.label}${t ? ", " + t.toLowerCase() : ""}">${t ? `<span class="gbadge">${t}</span>` : ""}${icon(w, 48)}<span class="gname">${w.label}</span></button>`;
      })
      .join("")}</div>`;
  }
  function vList() {
    if (S.layout === "grid") {
      return `<p class="sub" ${i(0)}>Pick your wallet. You'll approve in that app.</p>${gridHTML()}
        <div class="alt" ${i(2)}><button class="wrow" data-act="fallback">
          <span class="wicon">${I.apps}</span><span class="two"><b>Can't see your wallet?</b><small>Open your phone's wallet list</small></span><span class="chev">${I.chev}</span></button></div>`;
    }
    const rows = detected()
      .map((w) => {
        const t = tagFor(w);
        return `<button class="wrow" data-act="pick:${w.id}" aria-label="${w.label}${t ? ", " + t.toLowerCase() : ""}">
          ${icon(w)}<span class="wname"><b>${w.label}</b>${t ? `<span class="tag">${t}</span>` : ""}</span><span class="chev">${I.chev}</span></button>`;
      })
      .join("");
    return `<p class="sub" ${i(0)}>Pick your wallet. You'll approve in that app.</p>
      <div class="group" ${i(1)}>${rows}</div>
      <div class="alt" ${i(2)}><button class="wrow" data-act="fallback">
        <span class="wicon">${I.apps}</span><span class="two"><b>Can't see your wallet?</b><small>Open your phone's wallet list</small></span><span class="chev">${I.chev}</span></button></div>`;
  }
  function hero(sh, badge) {
    const ic = sh.generic ? `<span class="wicon generic">${I.wallet(30)}</span>` : icon(W(sh.wallet));
    return `<div class="hero" ${i(0)}>${ic}${badge}</div>`;
  }
  function vWait(sh) {
    const n = name(sh);
    if (sh.phase === "waiting") {
      return `<div class="centre">${hero(sh, `<span class="badge"><span class="spin"></span></span>`)}
          <h3 ${i(1)} aria-live="polite">Waiting for ${n}</h3>
          <p ${i(2)}>Approve the connection in ${n}. You'll come back here after.</p></div>
        <div class="acts" ${i(3)}>${btn("pill", "reopen", sh.generic ? "Open your wallet again" : `Open ${n} again`)}${btn("obtn", "cancel", "Cancel")}</div>`;
    }
    // opening
    return `<div class="centre">${hero(sh, `<span class="halo"></span><span class="badge"><span class="spin"></span></span>`)}
        <h3 ${i(1)} aria-live="polite">Opening ${n}…</h3>
        <p ${i(2)}>${Name(sh)} will ask you to connect to Vanna.</p></div>
      <div class="acts" ${i(3)}>${btn("obtn", "cancel", "Cancel")}${sh.single ? btn("tbtn", "another", "Use a different wallet") : ""}</div>`;
  }
  const FAIL = {
    declined: (n) => ["Connection declined", `You declined it in ${n}. Nothing was shared.`],
    timeout: (n, N) => [`${N} didn't answer`, `Nothing was shared. Open ${n}, check it's unlocked, then tap Try again.`],
    error: (n, N) => ["Couldn't connect", `${N} didn't share an account. Check it's set to Mainnet, then try again.`],
  };
  function vFail(sh) {
    const [t, l] = FAIL[sh.fail](name(sh), Name(sh));
    return `<div class="centre">${hero(sh, `<span class="badge"><span class="bad">${I.bang}</span></span>`)}
        <h3 ${i(1)} role="alert">${t}</h3><p ${i(2)}>${l}</p></div>
      <div class="acts" ${i(3)}>${btn("pill", "retry", "Try again")}${btn("obtn", "another", "Choose another wallet")}</div>`;
  }
  function vDone(sh) {
    // Plays once when the wallet approves: the Vanna mark and the wallet's icon, a pulse travels between them,
    // the line links them, a check pops in the middle, then the title. Reduce motion shows the final frame.
    const w = W(sh.wallet);
    const wal = sh.generic ? `<span class="wicon generic">${I.wallet(24)}</span>` : icon(w, 48);
    return `<div class="centre link-wrap" style="padding-bottom:16px">
        <div class="link" role="img" aria-label="Vanna linked with ${w.label}">
          <span class="lk-end lk-l"><span class="lk-vm"><svg viewBox="11 12 232 232" width="30" height="30"><defs><linearGradient id="vmg" gradientUnits="userSpaceOnUse" x1="31.7" y1="73" x2="222.3" y2="183"><stop offset="0" stop-color="#F6535D"/><stop offset="1" stop-color="#7038E6"/></linearGradient></defs><path fill="url(#vmg)" fill-rule="evenodd" d="${window.VANNA_SHAPE || ""}"/></svg></span></span>
          <span class="lk-mid"><svg class="lk-line" viewBox="0 0 100 4" preserveAspectRatio="none"><line class="lk-base" x1="2" y1="2" x2="98" y2="2"/><line class="lk-draw" x1="2" y1="2" x2="98" y2="2" pathLength="100"/></svg><span class="lk-dot"></span><span class="lk-check">${I.check}</span></span>
          <span class="lk-end lk-r">${wal}</span>
        </div>
        <h3 class="lk-title" aria-live="polite">Connected</h3><p class="addr lk-sub">${w.label} · ${ADDR[sh.wallet]}</p></div>`;
  }
  // Account, 2 wallets kept: pick the one the new wallet replaces.
  function vReplace() {
    const rows = S.connected
      .map((c, k) => `<button class="wrow" data-act="replacePick:${c.id}" aria-label="Replace ${W(c.id).label}, ${c.addr}${k === 0 ? ", in use" : ""}">
        ${icon(W(c.id))}<span class="two"><b>${W(c.id).label}</b><small>${c.addr}</small></span>${k === 0 ? `<span class="tag">In use</span>` : ""}<span class="chev">${I.chev}</span></button>`)
      .join("");
    return `<p class="sub" ${i(0)}>You can keep 2 wallets. Which one should this replace?</p>
      <div class="group rep" ${i(1)}>${rows}</div>
      <div class="acts" ${i(2)}>${btn("obtn", "closeSheet", "Cancel")}</div>`;
  }
  function vAllConnected() {
    return `<div class="centre">
        <div class="empty-ic" ${i(0)}>${I.check.replace(/width="14" height="14"/, 'width="28" height="28"')}</div>
        <h3 ${i(1)}>Nothing new to add</h3>
        <p ${i(2)}>All your wallet apps are already connected.</p></div>
      <div class="acts" ${i(3)}>${btn("obtn", "closeSheet", "Close")}</div>`;
  }
  function vNone() {
    return `<div class="centre">
        <div class="empty-ic" ${i(0)}>${I.wallet(30)}</div>
        <h3 ${i(1)}>No wallet app found</h3>
        <p ${i(2)}>Install any Solana wallet app that supports Mobile Wallet Adapter, then come back here.</p>
      </div>
      <div class="acts" ${i(3)}>
        <button class="linkrow" data-act="list" aria-label="See wallets that work with Vanna, opens solanamobile.com">See wallets that work with Vanna ${I.ext}</button>
        ${btn("pill", "recheck", "Check again")}</div>`;
  }
  const VIEWS = { detect: vDetect, list: vList, wait: vWait, fail: vFail, done: vDone, none: vNone, replace: vReplace, allConnected: vAllConnected };
  const titleFor = (sh) => (sh.view === "replace" ? "Add a wallet" : "Connect a wallet");

  function sheetHTML(enter) {
    const sh = S.sheet;
    return `<div class="sheetwrap${S.closing ? " closing" : ""}">
      <div class="scrim" data-act="scrim"></div>
      <section class="sheet${S.opening ? " opening" : ""}" role="dialog" aria-modal="true" aria-label="${titleFor(sh)}">
        <div class="handle"></div>
        <div class="shead"><h2>${titleFor(sh)}</h2><button class="xbtn" data-act="close" aria-label="${sh.view === "wait" ? "Cancel" : "Close"}"><span>${I.close}</span></button></div>
        <div class="sbody"><div class="view${enter ? " enter" : ""}">${VIEWS[sh.view](sh)}</div></div>
      </section></div>`;
  }
  function chooserHTML() {
    const apps = detected()
      .map((w) => `<button class="sapp" data-act="chooserPick:${w.id}">${icon(w, 48)}<span>${w.label}</span></button>`)
      .join("");
    return `<div class="sys"><div class="sscrim" data-act="chooserCancel"></div>
      <div class="ssheet"><span class="sflag">Android's own screen</span><div class="sgrab"></div><h4>Open with</h4><div class="ssub">Android lists every wallet app on the phone.</div><div class="sgrid">${apps}</div></div></div>`;
  }
  function behindHTML() {
    if (S.from === "account") {
      return `<div class="acct"><div class="hd"><button aria-label="Back" data-act="back">${I.back}</button><b>Wallets</b></div>
        <div class="card">${S.connected.map((c, k) => `<div class="wrow">${icon(W(c.id))}<div><div class="nm">${W(c.id).label}</div><div class="ad">${c.addr}</div></div>${k === 0 ? `<span class="tag">In use</span>` : ""}</div>`).join("")}</div>
        <div class="add">${btn("obtn", "addFromAccount", "Add wallet")}</div></div>`;
    }
    const rings = [180, 280, 400].map((d) => `<span class="ring" style="width:${d}px;height:${d}px"></span>`).join("");
    return `<div class="intro"><span class="glow"></span>${rings}<span class="mark"><svg viewBox="11 12 232 232" width="48" height="48" aria-label="Vanna"><path fill="#FFFFFF" fill-rule="evenodd" d="${window.VANNA_SHAPE || ""}"/></svg></span>
      <div class="copy"><h1>Tokenized stocks,<br>with leverage.</h1><p>Credit across markets</p></div>
      <div class="cta">${btn("pill tall", "connect", "Connect wallet")}</div></div>`;
  }
  function phoneHTML(enter) {
    const H = S.width === 360 ? 780 : 915;
    const t = S.toast;
    const toneBg = { ok: "#1C7C83", info: "#703AE6", err: "#D23F42" };
    return `<div class="device"><div class="screen" data-theme="dark" style="width:${S.width}px;height:${H}px">
      <span class="punch"></span>
      <div class="statusbar light"><span>9:41</span><span class="icons">${I.sig}${I.bat}</span></div>
      ${behindHTML()}
      ${S.sheet ? sheetHTML(enter) : ""}
      ${S.chooser ? chooserHTML() : ""}
      ${t ? `<div class="toast" role="status"><div><i style="background:${toneBg[t.tone]}">${t.tone === "ok" ? I.check : I.info}</i>${t.text}</div></div>` : ""}
      <div class="navbar" style="--nav-fg:#fff"><button data-act="back" aria-label="Back">${I.navBack}</button><button disabled aria-label="Home">${I.navHome}</button><button disabled aria-label="Recent apps">${I.navRecent}</button></div>
    </div></div>`;
  }

  // ---------- render ----------
  const phonesEl = document.getElementById("phones");
  let lastKey = "";
  let scaleNow = 1;
  function render() {
    document.documentElement.dataset.theme = "dark";
    document.body.classList.toggle("rm", S.rm);
    const sh = S.sheet;
    const key = sh ? [sh.view, sh.phase, sh.fail, sh.wallet, sh.generic].join("|") : "";
    const enter = key !== lastKey && !S.closing;
    const before = [...phonesEl.querySelectorAll(".sheet")].map((e) => e.getBoundingClientRect().height / scaleNow);
    phonesEl.innerHTML = `<div><div class="devnote">The list shows <b>only the wallets actually found on the phone</b>. Wallet A to H are test placeholders for layout checks; on a real phone every name and icon is the installed app's own, from Android. Nothing is hardcoded.</div>
      <div class="phone-cap">Dark · ${S.width} × ${S.width === 360 ? 780 : 915}</div><div class="fitbox"><div class="fit">${phoneHTML(enter)}</div></div></div>`;
    fit();
    if (!S.opening && !S.closing && !S.rm) {
      phonesEl.querySelectorAll(".sheet").forEach((el, k) => {
        const from = before[k];
        const to = el.getBoundingClientRect().height / scaleNow;
        if (from && Math.abs(from - to) > 2) el.animate([{ height: from + "px" }, { height: to + "px" }], { duration: 300, easing: "cubic-bezier(.2,0,0,1)" });
      });
    }
    S.opening = false;
    lastKey = key;
    // no scrollbar (as in the app); a soft fade at the bottom edge says there is more below
    phonesEl.querySelectorAll(".sbody").forEach((b) => {
      const edge = () => b.classList.toggle("more", b.scrollTop + b.clientHeight < b.scrollHeight - 2);
      b.addEventListener("scroll", edge, { passive: true });
      setTimeout(edge, 450);
    });
    renderChrome();
  }
  function fit() {
    const H = (S.width === 360 ? 780 : 915) + 16;
    const Wd = S.width + 16;
    const box = phonesEl.querySelector(".fitbox");
    if (!box) return;
    const availH = Math.max(420, window.innerHeight - box.getBoundingClientRect().top + window.scrollY - 24);
    scaleNow = Math.min(1, availH / H, phonesEl.clientWidth / Wd);
    box.style.width = Wd * scaleNow + "px";
    box.style.height = H * scaleNow + "px";
    box.firstElementChild.style.transform = `scale(${scaleNow})`;
  }

  // ---------- chrome (not part of the design) ----------
  const NOTES = {
    intro: "Tap <b>Connect wallet</b> on the phone to run the flow live. Change <b>Phone has</b> to see one wallet or none, or <b>Opened from</b> to add a wallet from Account.",
    detect: "Shown only if finding the wallets takes longer than about 150 ms, and then for at least 400 ms so it never flashes.",
    list: "The wallet used before goes first with <b>Last used</b>; the rest A to Z. Names and icons are the apps' own, from Android. A long name is cut with an ellipsis; an app with no icon gets the generic wallet tile (Wallet E).",
    one: "Only one wallet: no list. It opens straight away; <b>Opening Wallet A…</b> shows for the moment Android takes to bring the wallet up. <b>Use a different wallet</b> shows the list.",
    none: "No named wallets and no store buttons. One link to the official list of wallets that support Mobile Wallet Adapter (solanamobile.com/wallets). The app also looks again by itself when the person comes back to Vanna.",
    opening: "Brief: Android is switching to the wallet app. The person sees this for well under a second.",
    waiting: "The wallet app is now in front on the real phone (the <b>side panel</b> plays it here). This sheet is what Vanna shows behind it, and what the person sees if they come back without answering. <b>Open Wallet B again</b> returns to the wallet; Cancel goes to the list. Any answer in the wallet brings the person back with the result.",
    failDeclined: "Declined in the wallet. Try again reopens the same wallet; Choose another wallet goes back to the list.",
    failTimeout: "The wallet never answered within the app's wallet wait limit.",
    failError: "The wallet answered but shared no account or is on the wrong network.",
    chooser: "Android's own <b>Open with</b> screen, opened by <b>Can't see your wallet?</b>. Vanna does not draw this; shown for context.",
    generic: "After Android's chooser Vanna does not know which wallet opened until it answers, so the copy says <b>your wallet</b>.",
    eight: "More wallets than fit: the sheet stops at its tallest size (the app's large sheet height) and the body scrolls <b>without a scrollbar</b>. A soft fade at the bottom edge shows there is more; it goes away at the end.",
    acctList: "Add wallet from Account, Wallet A already connected. One wallet app = one connected wallet, so <b>Wallet A is not listed at all</b>. There are no tags here; Last used applies only to the first connect.",
    allConnected: "Add wallet from Account, and every wallet app on the phone is already connected (here only Wallet A is installed). Close is the only action.",
    replace: "The app keeps at most 2 wallets. With 2 kept, <b>Add wallet</b> first asks which one to replace. Cancel changes nothing.",
    replaceList: "After picking Wallet A to replace: Wallet C stays connected, so it is hidden; Wallet A is listed because it is going away. <b>Wallet A is removed only after the new wallet connects</b>, and the new wallet becomes the one in use. If connecting fails or is cancelled, both wallets stay.",
    done: "Plays once when the wallet approves and the person is back in Vanna: the Vanna mark and the wallet icon, a pulse travels between them and they link, a check pops, then <b>Connected</b> (about 1.2 s). Then the sheet closes with the toast. With Reduce motion on, the final frame shows at once.",
  };
  const chips = (k, opts, cur) => `<div class="seg" data-opt="${k}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(cur) === String(v) ? "on" : ""}">${l}</button>`).join("")}</div>`;
  function renderChrome() {
    document.querySelectorAll("[data-width-set]").forEach((b) => b.classList.toggle("on", Number(b.dataset.widthSet) === S.width));
    document.querySelectorAll("[data-layout-set]").forEach((b) => b.classList.toggle("on", b.dataset.layoutSet === S.layout));
    document.getElementById("rm").checked = S.rm;
    document.getElementById("states").innerHTML = JUMPS.map(([id, l]) => `<button data-jump="${id}" class="${S.stateId === id ? "on" : ""}">${l}</button>`).join("");
    const sh = S.sheet;
    const live = sh && sh.view === "wait" && sh.phase === "waiting" && !sh.silent;
    const wl = sh && sh.wallet ? W(sh.wallet) : null;
    const dis = live ? "" : "disabled";
    document.getElementById("panel").innerHTML = `
      <div><h2>This state</h2><div class="note">${NOTES[S.stateId] || ""}</div></div>
      <div><h2>The wallet app</h2>
        <div class="mockw${live ? " live" : ""}">
          <div class="mw-h">${wl ? icon(wl, 28) : I.wallet(22)}<span>${live ? `${wl.label} asks: “Connect to Vanna?”` : sh && sh.silent ? `${wl.label} isn't answering…` : "Not open"}</span></div>
          <p>${live ? "Answer as the person would in the wallet app." : "Opens when Vanna hands over to a wallet."}</p>
          <div class="plays">
            <button class="pbtn main" data-act="approve" ${dis}>Approve</button>
            <button class="pbtn" data-act="decline" ${dis}>Decline</button>
            <button class="pbtn" data-act="never" ${dis}>Don't answer</button>
            <button class="pbtn" data-act="error" ${dis}>Fails</button>
          </div></div></div>
      <div><h2>Scenario</h2>
        <div class="opt"><span>Phone has</span>${chips("scenario", [["many", "5 wallets"], ["eight", "8 wallets"], ["one", "1 wallet (A)"], ["none", "No wallet"]], S.scenario)}</div>
        <div class="opt"><span>Already connected (Account)</span>${chips("acctN", [["1", "1: Wallet A"], ["2", "2: Wallets A, C"]], S.acctN)}</div>
        <div class="opt"><span>Used before</span>${chips("last", [["b", "Wallet B"], ["a", "Wallet A"], ["", "None"]], S.last)}</div>
        <div class="opt"><span>Opened from</span>${chips("from", [["intro", "Intro"], ["account", "Account › Add wallet"]], S.from)}</div>
        <div class="opt"><span>Finding wallets</span>${chips("slow", [["false", "Fast (normal)"], ["true", "Slow (to see it)"]], S.slow)}</div>
        <div class="plays"><button class="pbtn main" data-act="connect">Run: open the picker</button></div>
        <p style="margin-top:10px">Esc is Android Back.</p>
      </div>`;
  }

  // ---------- events ----------
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button,[data-act]");
    if (!t) return;
    if (t.dataset.widthSet) return ((S.width = Number(t.dataset.widthSet)), render());
    if (t.dataset.layoutSet) return ((S.layout = t.dataset.layoutSet), (lastKey = ""), render());
    if (t.dataset.jump) return jump(t.dataset.jump);
    const opt = t.closest("[data-opt]");
    if (opt && t.dataset.v !== undefined) {
      const k = opt.dataset.opt;
      S[k] = k === "slow" ? t.dataset.v === "true" : k === "acctN" ? Number(t.dataset.v) : t.dataset.v;
      if (k === "acctN") seedConnected();
      if (k === "from" || k === "acctN") (S.sheet = null), (S.stateId = "intro"), (S.replacing = null);
      return render();
    }
    const a = t.dataset.act;
    if (!a || t.disabled) return;
    const [fn, arg] = a.split(":");
    if (ACT[fn]) ACT[fn](arg);
  });
  document.getElementById("rm").addEventListener("change", (e) => ((S.rm = e.target.checked), render()));
  document.addEventListener("keydown", (e) => e.key === "Escape" && ACT.back());
  window.addEventListener("resize", fit);

  const start = qs.get("state");
  if (start && JUMPS.some((j) => j[0] === start)) jump(start);
  else render();
})();
