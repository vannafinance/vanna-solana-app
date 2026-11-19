/* Multi-leg transaction sheet (prototype). One wallet approval, several transactions ("legs"): Close all, Perps open in two parts,
   margin steps, the Phoenix first-time flow. Under the header and the Sent / Processed / Confirmed bar, one row per leg follows the
   leg's real phases (Waiting to sign, Checking, Sending, Confirming, Done, Failed). Interactive: a mock wallet answers, and the chain
   advances only when you press a control (or turn on Auto-play). Mirrors src/chain/solana/submit.ts sendSolanaBatch: independent
   parts (Close all) are checked, sent and confirmed together; dependent parts run in order. */
(function () {
  const Ch = window.Chameleon;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const qs = new URLSearchParams(location.search);
  const store = {
    get(k, d) { try { const v = localStorage.getItem("mlg." + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("mlg." + k, v); } catch (e) {} },
  };
  const prefs = { theme: qs.get("theme") || store.get("theme", "light"), device: qs.get("device") || store.get("device", "k50i"), rm: (qs.get("rm") || store.get("rm", "0")) === "1" };
  const SPEED = { v: [0.5, 1, 2].includes(+store.get("speed", "1")) ? +store.get("speed", "1") : 1 };
  let uidN = 0;
  const uid = (p) => p + "x" + ++uidN;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const restart = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  /* ---------------- icons, loader, mascot (as design/tx-motion concept A) ---------------- */
  const svg = (d, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  const IC = {
    close: (s) => svg("M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6z", s),
    check: (s) => svg("M9.55 18 3.85 12.3l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z", s),
    open: (s) => svg("M5 21q-.825 0-1.413-.587Q3 19.825 3 19V5q0-.825.587-1.413Q4.175 3 5 3h7v2H5v14h14v-7h2v7q0 .825-.587 1.413Q19.825 21 19 21Zm4.7-5.3-1.4-1.4L17.6 5H14V3h7v7h-2V6.4Z", s),
    clock: (s) => svg("M15.3 16.7l1.4-1.4-3.7-3.7V7h-2v5.4ZM12 22q-2.075 0-3.9-.788-1.825-.787-3.175-2.137-1.35-1.35-2.137-3.175Q2 14.075 2 12t.788-3.9q.787-1.825 2.137-3.175 1.35-1.35 3.175-2.138Q9.925 2 12 2t3.9.787q1.825.788 3.175 2.138 1.35 1.35 2.137 3.175Q22 9.925 22 12t-.788 3.9q-.787 1.825-2.137 3.175-1.35 1.35-3.175 2.137Q14.075 22 12 22Z", s),
    down: (s) => svg("M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z", s),
  };
  const drawCheck = (s, w = 3) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path class="checkpath" d="M6 12.5l4 4 8-9" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const COIL = Ch.tailCoil();
  function loaderHTML(size) {
    const id = uid("tl");
    const stops = ["#FC5457", "#B6479E", "#703AE6"].map((c, i) => `<stop offset="${(i / 2).toFixed(2)}" stop-color="${c}"/>`).join("");
    return `<div class="tl" style="width:${size}px;height:${size}px" role="progressbar" aria-label="Working"><div class="spin"><svg width="${size}" height="${size}" viewBox="-2 34 56 56"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="4" y1="86" x2="48" y2="40">${stops}</linearGradient></defs>` +
      `<path d="${COIL.d}" stroke="#703AE6" stroke-opacity=".14" stroke-width="11" stroke-linecap="round" fill="none"/><path class="draw" d="${COIL.d}" stroke="url(#${id})" stroke-width="11" stroke-linecap="round" fill="none" style="--len:${COIL.len.toFixed(2)}"/></svg></div></div>`;
  }
  // the small row spinner: a brand-gradient arc that turns (one rotate transform)
  function spinHTML() {
    const id = uid("sp");
    return `<svg class="lspin" width="18" height="18" viewBox="0 0 18 18"><defs><linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FC5457"/><stop offset="1" stop-color="#703AE6"/></linearGradient></defs><circle cx="9" cy="9" r="7" fill="none" stroke="#703AE6" stroke-opacity=".14" stroke-width="2.5"/><path d="M9 2a7 7 0 0 1 7 7" fill="none" stroke="url(#${id})" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  }
  const DARK_TILE = "#2E2C35";
  class Mascot {
    constructor(el, size) { this.el = el; this.size = size; this.timers = []; this.reset(); }
    reset() { this.o = {}; this.baseLid = 0; this.blink = 0; this.happy = false; this.tongue = 0; this.near = [0.6, 0.2]; this.far = [0.1, 0.4]; this.clear(); this.render(); }
    clear() { this.timers.forEach(clearTimeout); this.timers = []; }
    later(ms, fn) { this.timers.push(setTimeout(fn, ms / SPEED.v)); }
    set(o) { Object.assign(this.o, o); this.render(); }
    render() {
      const lid = this.happy ? "happy" : Math.max(this.baseLid, this.blink);
      const r = Ch.face({ pal: "ds", ...this.o, lookNear: this.near, lookFar: this.far, lidNear: this.o.lidNear ?? lid, lidFar: this.o.lidFar ?? lid, tongue: this.tongue || undefined, tile: prefs.theme === "dark" ? DARK_TILE : undefined });
      this.el.innerHTML = `<svg viewBox="${r.vb}" width="${this.size}" height="${this.size}">${r.svg}</svg>`;
    }
    mode(m) {
      this.clear(); this.render();
      if (prefs.rm || m === "off") return;
      const blink = () => { [0.5, 0.99, 0.5, 0].forEach((v, i) => this.later(i * 30 + 30, () => { this.blink = v; this.render(); })); this.later(rnd(4000, 7000), blink); };
      this.later(rnd(1500, 3000), blink);
      if (m === "idle") {
        const glance = (w) => { this.glide(w, [rnd(-0.8, 0.9), rnd(-0.6, 0.5)]); this.later(rnd(1500, 3000), () => glance(w)); };
        this.later(rnd(600, 1500), () => glance("near")); this.later(rnd(900, 2000), () => glance("far"));
      }
    }
    glide(w, to, ms = 300) {
      const from = this[w].slice();
      if (prefs.rm) { this[w] = to; this.render(); return; }
      for (let i = 1; i <= 6; i++) this.later((i * ms) / 6, () => { const t = easeIO(i / 6); this[w] = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]; this.render(); });
    }
    look(n, f) { this.glide("near", n); this.glide("far", f); }
    strike(d = 220) {
      if (prefs.rm) { this.happy = true; this.render(); return; }
      [3, 6, 9, 12].forEach((v, i) => this.later(d + i * 40, () => { this.tongue = v; this.happy = v > 7.2; this.render(); }));
      [9, 6, 3, 0].forEach((v, i) => this.later(d + 160 + i * 45, () => { this.tongue = v; this.happy = v > 7.2; this.render(); }));
    }
  }

  /* ---------------- scenarios: every action in the app that is (or can be) more than one transaction ----------------
     A leg: { id, label (plain words), st (stage: legs of one stage run together, a stage waits for the previous one), ap (which
     wallet approval signs it), noun (for the summary), why (the reason shown if you make it fail) }. Labels follow the batch parts
     in src/chain/solana/actions.ts, said the way a user would. */
  const L = (id, label, st, o = {}) => ({ id, label, st, ap: o.ap || 1, noun: o.noun || label, why: o.why || "" });
  const names = (ls) => { const a = ls.map((l) => l.noun); return a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`; };
  const isAre = (ls) => (ls.length === 1 ? "is" : "are");
  const SC = {
    earnSupply: { cat: "Earn", name: "Supply 100 USDC (one transaction)", title: "Review supply", cta: "Supply", doing: "Supplying 100.00 USDC", review: [["You supply", "100.00 USDC"], ["APY", "6.40%"]],
      legs: [L("sup", "Supply 100.00 USDC to the USDC pool", 0, { why: "The pool is paused right now." })], done: ["Supplied 100.00 USDC", "Earning 6.40% in the USDC pool"] },
    earnWithdraw: { cat: "Earn", name: "Withdraw 50 USDC (one transaction)", title: "Review withdrawal", cta: "Withdraw", doing: "Withdrawing 50.00 USDC", review: [["You withdraw", "50.00 USDC"], ["To", "Your wallet"]],
      legs: [L("wd", "Withdraw 50.00 USDC from the USDC pool", 0, { why: "Not enough liquidity in the pool right now." })], done: ["Withdrew 50.00 USDC", "Back in your wallet"] },

    mFirst: { cat: "Margin", name: "First time: open account, deposit, borrow", title: "Review deposit and borrow", cta: "Deposit and borrow", doing: "Setting up your margin account", stage: "margin", stageOpts: { addr: "7xKX…3fQa", chain: "Solana", openLeg: "open", nodes: [{ leg: "dsol", role: "dep", sym: "SOL", amt: 1.5 }, { leg: "dusdc", role: "dep", sym: "USDC", amt: 100 }, { leg: "bor", role: "bor", sym: "USDC", amt: 50 }] }, review: [["You deposit", "1.50 SOL · 100.00 USDC"], ["You borrow", "50.00 USDC"], ["Health factor", "2.41"]],
      legs: [L("open", "Open your margin account", 0, { noun: "the account", why: "The account could not be created." }), L("dsol", "Deposit 1.50 SOL", 1, { noun: "1.50 SOL" }), L("dusdc", "Deposit 100.00 USDC", 2, { noun: "100.00 USDC" }), L("bor", "Borrow 50.00 USDC", 3, { noun: "50.00 USDC", why: "Your health factor would drop below 1.15." })],
      done: ["Margin account opened", "1.50 SOL and 100.00 USDC deposited, 50.00 USDC borrowed"],
      stopped: (ok, left) => (ok.length === 1 && ok[0].id === "open" ? ["Account opened, nothing deposited yet", "Your margin account is open. The deposits and the borrow were not sent."]
        : !ok.length ? ["Stopped", "Nothing was created."] : [`Stopped: ${ok.length} of 4 done`, `Account open, ${names(ok.filter((l) => l.id !== "open"))} deposited. ${names(left)} ${left.length === 1 ? "was" : "were"} not sent.`]),
      part: (ok, left) => (!ok.length ? ["Not confirmed", "Opening your margin account didn't go through. Nothing moved."]
        : left.length === 1 && left[0].id === "bor" ? ["Account open, not borrowed", "1.50 SOL and 100.00 USDC are in your margin account. Borrowing 50.00 USDC didn't go through."]
        : ["Account open", `${names(ok.filter((l) => l.id !== "open"))} deposited${ok.length > 1 ? "" : " (nothing yet)"}. ${names(left)} didn't go through.`]) },
    mDeposit: { cat: "Margin", name: "Deposit 100 USDC (one transaction)", title: "Review deposit", cta: "Deposit", doing: "Depositing 100.00 USDC", review: [["You deposit", "100.00 USDC"], ["Health factor", "2.41 → 2.88"]],
      legs: [L("d", "Deposit 100.00 USDC", 0)], done: ["Deposited 100.00 USDC", "In your margin account as collateral"] },
    mBorrow: { cat: "Margin", name: "Borrow 50 USDC (one transaction)", title: "Review borrow", cta: "Borrow", doing: "Borrowing 50.00 USDC", review: [["You borrow", "50.00 USDC"], ["Health factor", "2.88 → 2.10"]],
      legs: [L("b", "Borrow 50.00 USDC", 0, { why: "Your health factor would drop below 1.15." })], done: ["Borrowed 50.00 USDC", "In your margin account"] },
    mDepBor: { cat: "Margin", name: "Deposit and borrow (existing account)", title: "Review deposit and borrow", cta: "Deposit and borrow", doing: "Depositing and borrowing", review: [["You deposit", "100.00 USDC"], ["You borrow", "0.50 SOL"]],
      legs: [L("d", "Deposit 100.00 USDC", 0, { noun: "100.00 USDC" }), L("b", "Borrow 0.50 SOL", 1, { noun: "0.50 SOL", why: "Your health factor would drop below 1.15." })],
      done: ["Deposited and borrowed", "100.00 USDC deposited, 0.50 SOL borrowed"],
      part: (ok) => (ok.length ? ["Deposited, not borrowed", "100.00 USDC is in your margin account. Borrowing 0.50 SOL didn't go through."] : ["Not confirmed", "Nothing moved."]) },
    mRepay: { cat: "Margin", name: "Repay 50 USDC (one transaction)", title: "Review repay", cta: "Repay", doing: "Repaying 50.00 USDC", review: [["You repay", "50.00 USDC"]], legs: [L("r", "Repay 50.00 USDC", 0)], done: ["Repaid 50.00 USDC", "Your USDC loan is closed"] },
    mWithdraw: { cat: "Margin", name: "Withdraw collateral (one transaction)", title: "Review withdrawal", cta: "Withdraw", doing: "Withdrawing 1.00 SOL", review: [["You withdraw", "1.00 SOL"], ["To", "Your wallet"]], legs: [L("w", "Withdraw 1.00 SOL to your wallet", 0, { why: "Your health factor would drop below 1.15." })], done: ["Withdrew 1.00 SOL", "Back in your wallet"] },
    mTransfer: { cat: "Margin", name: "Transfer 20 USDC (one transaction)", title: "Review transfer", cta: "Send", doing: "Sending 20.00 USDC", review: [["You send", "20.00 USDC"], ["To", "9wQp…T4ra"]], legs: [L("t", "Send 20.00 USDC to 9wQp…T4ra", 0)], done: ["Sent 20.00 USDC", "To 9wQp…T4ra"] },

    flash: { cat: "Flash repay", name: "Flash repay: 2 perps, 1 farm, 1 spot, 2 loans, send home", title: "Review flash repay", cta: "Flash repay $431.20", doing: "Repaying your account", apToggle: true, review: [["Closes", "2 perps · 1 farm · 1 spot"], ["Repays", "120.00 USDC · 0.50 SOL"], ["You keep at least", "$85.40"]],
      // the website's plan (flash-repay.ts): perps (closes, then one withdraw from Phoenix) → Kamino exits → spot swaps → repays → send home
      legs: [
        L("p1", "Close ETH long on Phoenix", 0, { noun: "ETH long", why: "No liquidity near the mark. Try again shortly." }),
        L("p2", "Close META short on Phoenix", 0, { noun: "META short", why: "No liquidity near the mark. Try again shortly." }),
        L("pw", "Withdraw 84.20 USDC from Phoenix", 1, { noun: "84.20 USDC" }),
        L("k1", "Exit USDC on Kamino", 2, { noun: "Kamino USDC", why: "Kamino's reserve has no free liquidity right now." }),
        L("s1", "Swap 1.20 SOL to USDC", 3, { noun: "1.20 SOL", why: "The price moved past your 0.5% slippage." }),
        L("r1", "Repay 120.00 USDC", 4, { noun: "120.00 USDC" }),
        L("r2", "Repay 0.50 SOL", 4, { noun: "0.50 SOL", why: "Not enough SOL in the account after the closes." }),
        L("t1", "Send 85.40 USDC to your wallet", 5, { noun: "85.40 USDC" }),
      ],
      done: ["Account repaid", "2 positions closed on Phoenix, Kamino USDC exited, 1.20 SOL swapped to USDC, 120.00 USDC and 0.50 SOL repaid. 85.40 USDC sent to your wallet."],
      stopped: (ok, left) => {
        const has = (id) => ok.some((l) => l.id === id), owed = left.filter((l) => /^r\d/.test(l.id));
        if (!ok.length) return ["Stopped", "Nothing was closed or repaid."];
        if (owed.length === 2) return ["Stopped", `${has("k1") || has("s1") ? "Positions closed and turned into cash" : has("pw") ? "Positions closed and USDC moved out of Phoenix" : "Positions closed"}. Loans not repaid yet.`];
        if (owed.length === 1) return ["Stopped", `Loans partly repaid: ${names(owed)} still owed.`];
        return ["Account repaid", "Stopped before sending anything to your wallet. It stays in your margin account."];
      },
      continueLabel: (left) => (left.some((l) => /^r\d/.test(l.id)) ? "Continue repaying" : "Continue"),
      part: (ok, left) => {
        const f = left[0].id, lp = left.filter((l) => /^p\d/.test(l.id) && l.phase === "failed"), lr = left.filter((l) => /^r\d/.test(l.id));
        const later = "so the loans were not repaid yet.";
        if (lp.length) return [`Closed ${2 - lp.length} of 2`, `${names(lp)} ${isAre(lp)} still open on Phoenix, ${later}`];
        if (f === "pw") return ["Not repaid yet", `Positions closed. Moving 84.20 USDC out of Phoenix didn't go through, ${later}`];
        if (f === "k1") return ["Not repaid yet", `Phoenix is done. Exiting Kamino didn't go through, ${later}`];
        if (f === "s1") return ["Not repaid yet", `Everything is closed. Swapping 1.20 SOL to USDC didn't go through, ${later}`];
        if (lr.some((l) => l.phase === "failed")) { const owed = lr.filter((l) => l.phase !== "done"); return [`Repaid ${2 - owed.length} of 2 loans`, `Everything is closed. ${names(owed)} ${owed.length === 1 ? "is" : "are"} still owed.`]; }
        return ["Account repaid", "All loans repaid. Sending 85.40 USDC to your wallet didn't go through; it stays in your margin account."];
      } },
    flashOne: { cat: "Flash repay", name: "Flash repay: no positions, one USDC loan (your account now)", title: "Review flash repay", cta: "Flash repay $52.27", doing: "Repaying 52.27 USDC", review: [["Closes", "Nothing open"], ["Repays", "52.27 USDC"]],
      legs: [L("r", "Repay 52.27 USDC", 0)], done: ["Account repaid", "52.27 USDC loan repaid. Nothing else was open."] },

    farmKDep: { cat: "Farm", name: "Kamino deposit (one transaction)", title: "Review farm", cta: "Farm", doing: "Supplying 150.00 USDC to Kamino", review: [["You supply", "150.00 USDC"], ["From", "Idle USDC in your margin account"], ["APY", "9.10%"]],
      legs: [L("k", "Supply 150.00 USDC to Kamino", 0, { why: "Kamino's reserve is at its deposit limit." })], done: ["Farming 150.00 USDC on Kamino", "Supplied from the idle USDC in your margin account"] },    farmKWd: { cat: "Farm", name: "Kamino withdraw (one transaction)", title: "Review withdrawal", cta: "Withdraw", doing: "Withdrawing from Kamino", review: [["You withdraw", "152.10 USDC"]], legs: [L("k", "Exit USDC on Kamino", 0)], done: ["Withdrew 152.10 USDC from Kamino", "Back in your margin account"] },
    farmPDep: { cat: "Farm", name: "Perena deposit (one transaction)", title: "Review farm", cta: "Farm", doing: "Depositing to Perena USD*", review: [["You deposit", "100.00 USDC"]], legs: [L("p", "Deposit 100.00 USDC to Perena USD*", 0)], done: ["Deposited 100.00 USDC to USD*", "Earning in Perena USD*"] },
    farmPWd: { cat: "Farm", name: "Perena withdraw (one transaction)", title: "Review withdrawal", cta: "Withdraw", doing: "Withdrawing from Perena USD*", review: [["You withdraw", "101.30 USDC"]], legs: [L("p", "Withdraw 101.30 USDC from Perena USD*", 0)], done: ["Withdrew 101.30 USDC from USD*", "Back in your margin account"] },

    swapJup: { cat: "Spot", name: "Jupiter swap with account setup", title: "Review swap", cta: "Swap", doing: "Swapping 10.00 USDC for BONK", review: [["You pay", "10.00 USDC"], ["You get", "~1.21M BONK"]],
      legs: [L("acct", "Create your BONK account", 0, { noun: "the BONK account" }), L("sw", "Swap 10.00 USDC for BONK", 1, { why: "The price moved past your 0.5% slippage." })],
      done: ["Swapped 10.00 USDC for 1.21M BONK", "BONK is in your margin account"],
      part: (ok) => (ok.length ? ["Not swapped", "Only the empty BONK account was created. Nothing was swapped."] : ["Not confirmed", "Nothing moved."]) },
    swapBorrow: { cat: "Spot", name: "Borrow and swap (borrow, then swap)", title: "Review swap", cta: "Borrow and swap", doing: "Borrowing and swapping", apToggle: true, review: [["You pay", "50.00 USDC"], ["Borrowed for it", "50.00 USDC"], ["You get", "~0.27 SOL"]],
      legs: [L("bor", "Borrow 50.00 USDC", 0, { noun: "50.00 USDC", why: "Your health factor would drop below 1.15." }), L("sw", "Swap USDC to SOL", 1, { why: "The price moved past your 0.5% slippage." })],
      done: ["Swapped 50.00 USDC to 0.27 SOL", "50.00 USDC borrowed, then swapped to 0.27 SOL. It's in your margin account."],
      stopped: (ok) => (ok.length ? ["Borrowed 50.00 USDC, swap not done", "50.00 USDC is borrowed and sits in your margin account."] : ["Stopped", "Nothing was sent."]), stopExtra: "Repay 50.00 USDC",
      part: (ok) => (ok.length ? ["Borrowed, not swapped", "50.00 USDC is borrowed and sits in your margin account. The swap didn't go through."] : ["Not confirmed", "Nothing moved."]) },    perpsFirst: { cat: "Perps", name: "Open, first time on Phoenix (3 parts)", title: "Review long SOLUSDC", cta: "Open long", doing: "Opening long SOL 2x", stage: "phoenix", review: [["You add", "10.00 USDC"], ["You open", "Long SOL 2x · 0.1067 SOL"]],
      legs: [L("setup", "Set up your Phoenix account", 0, { noun: "the Phoenix account" }), L("add", "Add 10.00 USDC to Phoenix", 1, { noun: "10.00 USDC" }), L("ord", "Open SOL long", 2, { why: "The price moved past your 1% limit." })],
      done: ["Long SOL 2x opened", "Phoenix account set up, 10.00 USDC moved there as collateral, 0.1067 SOL long"], stuck: "ord",
      part: (ok, left) => (left[0].id === "ord" ? ["Order not placed", "Your 10.00 USDC is in Phoenix. The order did not go through."] : left[0].id === "add" ? ["Not confirmed", "Your Phoenix account is ready. Adding USDC didn't go through, so nothing moved."] : ["Not confirmed", "Setting up your Phoenix account didn't go through. Nothing moved."]) },
    perps2: { cat: "Perps", name: "Open in two parts (convert, then open)", title: "Review long ETHUSDC", cta: "Open long", doing: "Opening long ETH 2x", review: [["You add", "10.00 USDC"], ["You open", "Long ETH 2x · 0.0062 ETH"]],
      legs: [L("conv", "Convert 10.00 USDC for Phoenix", 0, { noun: "10.00 USDC" }), L("open", "Add it to Phoenix and open ETH long", 1, { why: "The price moved past your 1% limit." })],
      done: ["Long ETH 2x opened", "10.00 USDC moved to Phoenix as collateral, 0.0062 ETH long on Phoenix"],
      stopped: (ok) => (ok.length ? ["USDC converted, order not placed", "10.00 USDC is converted and waits in your margin account."] : ["Stopped", "Nothing was sent."]), stopExtra: "Return USDC to margin",
      part: (ok) => (ok.length ? ["Order not placed", "10.00 USDC is converted and waits in your margin account. Opening ETH long didn't go through."] : ["Not confirmed", "Nothing moved."]) },
    perpsClose: { cat: "Perps", name: "Close the last position (close, then return USDC)", title: "Close position", cta: "Close", doing: "Closing META short", apToggle: true, noStop: true, review: [["You close", "META-PERP short 2x"], ["Profit", "+3.10 USDC"]],
      legs: [L("c", "Close META short", 0, { noun: "META short", why: "No liquidity near the mark. Try again shortly." }), L("ret", "Return 52.10 USDC to margin", 1, { noun: "52.10 USDC" })],
      done: ["Closed META short", "+3.10 USDC profit. 52.10 USDC is back in your margin account"],
      part: (ok) => (ok.length ? ["Closed META short", "+3.10 USDC profit. Your 52.10 USDC stays in Phoenix for now."] : ["Not closed", "META short is still open."]) },
    close2: { cat: "Perps", name: "Close all: 2 positions", title: "Close all positions", cta: "Close all", doing: "Closing 2 positions", apToggle: true, noStop: true, review: [["META-PERP short", "+3.10 USDC"], ["ETH-PERP long", "−1.42 USDC"]],
      legs: [L("meta", "Close META short", 0, { noun: "META", why: "No liquidity near the mark. Try again shortly." }), L("eth", "Close ETH long", 0, { noun: "ETH", why: "No liquidity near the mark. Try again shortly." }), L("ret", "Return 61.30 USDC to margin", 1, { noun: "61.30 USDC" })],
      done: ["Closed 2 positions", "META and ETH closed. 61.30 USDC is back in your margin account"], closeAll: true },
    close4: { cat: "Perps", name: "Close all: 4 positions", title: "Close all positions", cta: "Close all", doing: "Closing 4 positions", apToggle: true, noStop: true, review: [["META-PERP short", "+3.10 USDC"], ["ETH-PERP long", "−1.42 USDC"], ["SOL-PERP long", "+0.88 USDC"], ["BTC-PERP short", "+2.05 USDC"]],
      legs: [
        L("meta", "Close META short", 0, { noun: "META", why: "No liquidity near the mark. Try again shortly." }), L("eth", "Close ETH long", 0, { noun: "ETH", why: "No liquidity near the mark. Try again shortly." }),
        L("sol", "Close SOL long", 0, { noun: "SOL", why: "No liquidity near the mark. Try again shortly." }), L("btc", "Close BTC short", 0, { noun: "BTC", why: "No liquidity near the mark. Try again shortly." }),
        L("ret", "Return 139.19 USDC to margin", 1, { noun: "139.19 USDC" }),
      ],
      done: ["Closed 4 positions", "META, ETH, SOL and BTC closed. 139.19 USDC is back in your margin account"], closeAll: true },
    perpsWithdraw: { cat: "Perps", name: "Withdraw from Phoenix (out, then unwrap)", title: "Withdraw from Phoenix", cta: "Withdraw to margin", doing: "Moving USDC out of Phoenix", review: [["You move", "52.10 USDC"], ["To", "Your margin account"]],
      legs: [L("wd", "Move 52.10 USDC out of Phoenix", 0, { noun: "52.10 USDC" }), L("unw", "Turn it back into USDC", 1, { why: "The conversion was paused for a moment." })],
      done: ["Back in your margin account", "52.10 USDC moved from Phoenix to your margin account"],
      part: (ok) => (ok.length ? ["Moved, not converted", "52.10 USDC left Phoenix and sits in your margin account in Phoenix's own form. Retry to turn it into USDC."] : ["Not confirmed", "Nothing moved."]) },
  };
  // Close all: the USDC only comes home when nothing is left open
  function closeAllPart(S, ok, left) {
    const lc = left.filter((l) => l.id !== "ret"), n = S.legs.length - 1;
    if (!lc.length) return [`Closed ${n} positions`, "All closed. Your USDC stays in Phoenix for now."];
    if (lc.length === n) return ["Nothing was closed", `${names(lc)} ${isAre(lc)} still open.`];
    return [`Closed ${n - lc.length} of ${n}`, `${names(lc)} ${isAre(lc)} still open`];
  }

  function closeAllStopped(S, ok, left) {
    const lc = left.filter((l) => l.id !== "ret"), okc = ok.filter((l) => l.id !== "ret"), n = S.legs.length - 1;
    if (!lc.length) return [`Closed ${n} positions`, "Stopped before returning the USDC. It stays in Phoenix."];
    if (!okc.length) return ["Stopped", `Nothing was closed. ${names(lc)} ${isAre(lc)} still open.`];
    return [`Stopped: ${okc.length} of ${n} closed`, `${names(okc)} closed. ${names(lc)} ${lc.length === 1 ? "was" : "were"} not sent and ${isAre(lc)} still open.`];
  }
  const WORD = { wait: "Waiting to sign", queued: "Waiting", approve: "Needs approval", check: "Checking", send: "Sending", confirm: "Confirming", unsure: "Still confirming", done: "Done", failed: "Failed", skipped: "Not sent" };
  const ACTIVE = ["check", "send", "confirm", "unsure"];
  const END = ["done", "failed", "skipped"];

  /* ---------------- model ---------------- */
  let key = SC[store.get("scen", "close4")] ? store.get("scen", "close4") : "close4";
  let failPick = "none"; // "fail:<id>" or "timeout:<id>"
  // "one": every leg signed once, sent stage by stage. "per": one approval per stage (what the app does today for close + return and borrow + swap)
  let apMode = store.get("apMode", "one") === "per" ? "per" : "one";
  let M;
  const sig = () => { const a = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"; let s = ""; for (let i = 0; i < 8; i++) s += a[(Math.random() * a.length) | 0]; return `${s.slice(0, 4)}…${s.slice(4)}`; };
  function fresh() {
    const S = SC[key];
    const stages = [...new Set(S.legs.map((l) => l.st))].sort((a, b) => a - b);
    const apOf = (l) => (S.apToggle ? (apMode === "one" ? 1 : stages.indexOf(l.st) + 1) : l.ap);
    M = { S, sheet: "review", wallet: "idle", signedAp: 0, askAp: 0, closed: false, rr: 0, finish: null, legs: S.legs.map((l) => ({ ...l, ap: apOf(l), phase: "wait", reason: "", sig: "", tries: 0 })) };
  }
  const multi = () => M.legs.length > 1;
  const doneN = () => M.legs.filter((l) => l.phase === "done").length;
  const awaiting = () => M.wallet === "ask";
  const curStage = () => { const open = M.legs.filter((l) => !END.includes(l.phase)); return open.length ? Math.min(...open.map((l) => l.st)) : null; };

  // the wallet is asked for approval `ap`: those legs read "Waiting to sign"; later approvals read "Waiting"
  function ask(ap) {
    M.askAp = ap; M.wallet = "ask";
    M.legs.forEach((l) => { if (END.includes(l.phase)) return; if (l.ap === ap) l.phase = M.signedAp > 0 ? "approve" : "wait"; else if (l.ap > ap) l.phase = "queued"; });
  }
  function approve() {
    if (!awaiting()) return;
    M.signedAp = M.askAp; M.wallet = "signed"; M.sheet = "run";
    M.legs.forEach((l) => { if (l.ap === M.signedAp && !END.includes(l.phase)) l.phase = "queued"; });
    startStage();
    render();
  }
  const NOT_SENT = ["wait", "queued", "approve", "check"], IN_FLIGHT = ["send", "confirm", "unsure"];
  const notSent = () => M.legs.filter((l) => NOT_SENT.includes(l.phase));
  // Stop exists only at a stage boundary: legs held back by an earlier stage, not sent yet. A sent transaction cannot be recalled,
  // so when everything left is already in flight (Close all, the last stage) there is nothing to stop and no button.
  const heldBack = () => { const st = curStage(); return st === null ? [] : M.legs.filter((l) => l.st > st && ["wait", "queued", "approve"].includes(l.phase)); };
  // Close all / close + return: every close is sent at once and the USDC return follows on its own, so no Stop there
  const canStop = () => M.sheet === "run" && !awaiting() && multi() && !M.stopping && !M.S.noStop && heldBack().length > 0;
  // Cancel before the wallet answered: the app ends the wallet session (terminateSession) so Phantom drops the request
  function cancel() {
    if (!awaiting()) return;
    M.cancelledN = M.legs.filter((l) => l.ap === M.askAp && !END.includes(l.phase)).length;
    M.wallet = "cancelled"; M.stopAsk = false;
    M.legs.forEach((l) => { if (!END.includes(l.phase)) { l.phase = "skipped"; l.reason = ""; } });
    if (doneN() === 0) { M.sheet = "finish"; M.finish = { kind: "cancelled" }; if (M.closed) showToastFinal(); render(); }
    else { M.stopping = true; finish(); }
  }
  function askStop() { if (canStop()) { M.stopAsk = true; render(); } }
  // Stop after approval: the current stage finishes; the held-back legs are dropped at once (their signed copies discarded)
  function confirmStop() {
    if (!canStop()) { M.stopAsk = false; return render(); }
    const held = heldBack();
    M.stopAsk = false; M.stopping = true;
    held.forEach((l) => { l.phase = "skipped"; l.reason = ""; });
    if (!M.legs.some((l) => IN_FLIGHT.includes(l.phase))) finish(); else render();
  }
  function rejectOrTimeout(kind) {
    if (!awaiting()) return;
    const why = kind === "rejected" ? "You declined it in Phantom." : "Your wallet did not answer.";
    M.wallet = kind;
    const first = M.signedAp === 0 && doneN() === 0 && !M.legs.some((l) => l.tries > 1);
    M.legs.forEach((l) => { if (!END.includes(l.phase)) { if (l.ap === M.askAp && l.st === curStage()) { l.phase = first ? "skipped" : "failed"; l.reason = first ? "" : why; } else l.phase = "skipped"; } });
    M.sheet = "finish"; M.finish = first ? { kind: "nothing", why } : null;
    if (!first) finish(); else render();
  }
  // move the current stage on: signed legs start Checking together; a stage that needs a new approval asks the wallet
  function startStage() {
    const st = curStage();
    if (st === null) return finish();
    const legs = M.legs.filter((l) => l.st === st && !END.includes(l.phase));
    if (legs.some((l) => l.ap > M.signedAp)) { ask(Math.min(...legs.map((l) => l.ap))); render(); return; }
    legs.forEach((l) => { if (l.phase === "queued" || l.phase === "wait" || l.phase === "approve") l.phase = "check"; });
  }
  function pick(l) { const [k, id] = failPick.split(":"); return id === l.id && l.tries === 0 ? k : null; }
  function advance(l) {
    if (l.phase === "check") { if (pick(l) === "fail") return failLeg(l); l.phase = "send"; }
    else if (l.phase === "send") l.phase = "confirm";
    else if (l.phase === "confirm") { if (pick(l) === "timeout" && !l.timed) { l.timed = true; l.phase = "unsure"; l.reason = "Confirmation timed out. Reading the chain…"; } else land(l); }
    else if (l.phase === "unsure") land(l);
    after();
  }
  function land(l) { l.phase = "done"; l.reason = ""; l.sig = sig(); }
  function failLeg(l, reason) { const r = reason || l.why || (l.phase === "unsure" || l.phase === "confirm" ? "It did not land on Solana." : "The check before sending failed."); l.phase = "failed"; l.reason = r; after(); }
  function timeoutLeg(l) { l.timed = true; l.phase = "unsure"; l.reason = "Confirmation timed out. Reading the chain…"; after(); }
  function after() {
    if (M.stopping) { if (!M.legs.some((l) => ACTIVE.includes(l.phase))) return finish(); return render(); }
    const st = curStage();
    const stageLegs = M.legs.filter((l) => l.st === st);
    if (stageLegs.some((l) => ACTIVE.includes(l.phase))) return render();
    if (M.legs.some((l) => l.phase === "failed")) {
      // a failure stops the later stages: their legs are not sent (Close all: no USDC home while a position is still open)
      M.legs.forEach((l) => { if (!END.includes(l.phase)) { l.phase = "skipped"; l.reason = l.id === "ret" && M.S.closeAll ? "Not needed while a position is open" : ""; } });
      return finish();
    }
    startStage(); render();
  }
  function finish() {
    M.sheet = "finish";
    const ok = M.legs.filter((l) => l.phase === "done"), left = M.legs.filter((l) => l.phase !== "done");
    if (!left.length) M.finish = { kind: "done" };
    else if (M.stopping) M.finish = { kind: "stopped", ok, left };
    else if (!M.finish || M.finish.kind !== "nothing") M.finish = { kind: "part", ok, left, failed: M.legs.filter((l) => l.phase === "failed") };
    if (M.closed) showToastFinal();
    render();
  }
  // retry: only the legs that did not land (failed + not sent); done legs stay ticked and are never sent again; one new approval
  function retry(onlyId) {
    let set = M.legs.filter((l) => l.phase === "failed" || l.phase === "skipped");
    if (onlyId) { const f = M.legs.find((l) => l.id === onlyId); set = [f, ...M.legs.filter((l) => l.phase === "skipped" && l.st > f.st)]; }
    set.forEach((l) => { l.phase = "wait"; l.reason = ""; l.tries++; l.timed = false; l.ap = 1; });
    M.signedAp = 0; M.finish = null; M.sheet = "run"; M.retrying = set.length; M.stopping = false; M.stopAsk = false;
    ask(1); render();
  }
  function playNext() {
    if (awaiting() || M.sheet !== "run") return false;
    const act = M.legs.filter((l) => ACTIVE.includes(l.phase));
    if (!act.length) return false;
    advance(act[M.rr++ % act.length]);
    return true;
  }

  /* ---------------- copy: the whole operation, not the last leg ---------------- */
  function summary() {
    const S = M.S, f = M.finish;
    if (f.kind === "nothing") return ["Not confirmed", `${f.why} Nothing was sent.`];
    if (f.kind === "cancelled") return ["Cancelled", "Nothing was sent."];
    if (f.kind === "stopped") { if (S.closeAll) return closeAllStopped(S, f.ok, f.left); if (S.stopped) return S.stopped(f.ok, f.left); return [`Stopped: ${f.ok.length} of ${M.legs.length} done`, `${names(f.left)} ${f.left.length === 1 ? "was" : "were"} not sent.`]; }
    if (f.kind === "done") return S.done;
    if (S.closeAll) return closeAllPart(S, f.ok, f.left);
    if (S.part) return S.part(f.ok, f.left);
    return ["Not confirmed", `${names(f.left)} didn't go through.`];
  }
  function head() {
    const n = M.legs.length, d = doneN();
    if (M.sheet === "finish") return summary();
    if (awaiting()) {
      const ls = M.legs.filter((l) => l.ap === M.askAp && !END.includes(l.phase));
      if (M.signedAp === 0 && !M.retrying) return ["Waiting for your wallet", `Approve in Phantom${ls.length > 1 ? ` (${ls.length} transactions, one approval)` : ""}. If it shows a warning, tap Confirm (unsafe).`];
      if (M.retrying && M.signedAp === 0) return ["Waiting for your wallet", `Approve the retry in Phantom: ${ls.length === 1 ? ls[0].label.toLowerCase() : `${ls.length} transactions`}. Done steps are not sent again.`];
      return ["Approve once more", `Phantom asks again for: ${ls.map((l) => l.label.toLowerCase()).join(", ")}.`];
    }
    if (M.stopping) return ["Stopping after this step…", "Steps already sent will finish. Nothing else will be sent."];
    const one = { check: "Checking before sending", send: "Sent to Solana", confirm: "Confirming on Solana", unsure: "Confirmation is taking long. Reading the chain…" };
    return [M.S.doing, n > 1 ? `${d} of ${n} done` : one[M.legs[0].phase] || "Sent to Solana"];
  }
  function acts() {
    if (M.sheet !== "finish") return canStop() && !M.stopAsk ? [["Stop", "askStop", "tbtn quiet"]] : [];
    const f = M.finish;
    if (f.kind === "nothing" || f.kind === "cancelled") return [["Try again", "again", "btn"], ["Close", "close", "tbtn"]];
    if (f.kind === "stopped") return [[M.S.continueLabel ? M.S.continueLabel(f.left) : "Continue", "retryAll", "btn"], ...(M.S.stopExtra ? [[M.S.stopExtra, "noop", "obtn"]] : []), ["Done", "close", "tbtn"]];
    if (f.kind === "done") return [["Done", "close", "btn"]];
    const n = f.left.length, out = [[`Retry failed (${n})`, "retryAll", "btn"]];
    if (M.S.stuck && f.left.some((l) => l.id === M.S.stuck)) out.push(["Return USDC to margin", "noop", "obtn"]);
    out.push(["Done", "close", "tbtn"]);
    return n === 1 && !multi() ? [["Try again", "retryAll", "btn"], ["Close", "close", "tbtn"]] : out;
  }

  /* ---------------- views ---------------- */
  function reviewHTML() {
    const S = M.S, aps = [...new Set(S.legs.map((l) => l.ap))].length;
    const note = S.legs.length > 1 ? `${S.legs.length} transactions${aps > 1 ? `, ${aps} approvals in Phantom` : ", one approval"}. Each step shows its own progress.` : "";
    return `<div class="view v-review"><div class="legs-r">${S.review.map(([k, v]) => `<div class="row2"><span>${esc(k)}</span><b class="tnum ${/^\+/.test(v) ? "pos" : /^−/.test(v) ? "neg" : ""}">${esc(v)}</b></div>`).join("")}</div>` +
      (note ? `<div class="notice">${IC.clock(18)}<span>${note}</span></div>` : "") + `<button class="btn" data-ev="start">${esc(S.cta)}</button></div>`;
  }
  function runShellHTML() {
    return `<div class="view v-run ml">${M.S.stage ? `<div id="stageHost" class="stage-host"></div>` : ""}<div class="hd" id="hd"><div class="slot"><div class="a-wrap" id="aw"><div class="a-breath"><div class="face" id="mf" style="width:56px;height:56px"></div></div><div class="ripple" id="rip"></div>` +
      `<div class="a-badge"><div class="ab ab-load">${loaderHTML(22)}</div><div class="ab ab-ok">${drawCheck(16)}</div><div class="ab ab-bad">${IC.close(16)}</div></div></div></div>` +
      `<div class="tt"><div class="h" id="h"></div><div class="cap" id="cap"></div></div><button class="ia explorer" id="expl" aria-label="View on Solana Explorer">${IC.open(22)}</button></div><div class="cxl" id="cxl"></div>` +
      `<div class="prog" id="prog"><div class="segbar" id="segbar"></div><div class="steps">${["Sent", "Processed", "Confirmed"].map((l, i) => `<div class="step">${i ? '<span class="em"></span>' : ""}<span class="dot"></span><span>${l}</span></div>`).join("")}</div></div>` +
      `<div class="lgs" id="lgs"></div><div class="acts" id="acts"></div></div>`;
  }
  function legRowHTML(l) {
    return `<div class="lg" data-leg="${l.id}"><span class="lg-ic"><span class="i-wait"></span><span class="i-spin">${spinHTML()}</span><span class="i-ok">${IC.check(14)}</span><span class="i-bad">${IC.close(12)}</span><span class="i-unsure">${IC.clock(14)}</span></span>` +
      `<span class="lg-t"><span class="lg-l">${esc(l.label)}</span><span class="lg-r"></span><span class="lg-sig tnum"></span></span><span class="lg-w"></span>` +
      `<button class="lg-x" data-ev="explorer" aria-label="View this transaction on Solana Explorer">${IC.open(16)}</button><button class="lg-retry" data-retry="${l.id}">Retry</button></div>`;
  }

  /* ---------------- the approved first-time stages, driven by the legs (the rows stay below them) ---------------- */
  let stageD = null;
  function makeStage() {
    stageD = null;
    const host = $("#stageHost"); if (!host) return;
    if (M.S.stage === "margin" && window.MarginStage) stageD = window.MarginStage(host, M.S.stageOpts);
    if (M.S.stage === "phoenix" && window.PhoenixStage) stageD = phoenixDriver(host);
  }
  // design/perps-flow/first-time.html's Stage, fed from the three legs: set up → add USDC → order
  function phoenixDriver(host) {
    const PS = window.PhoenixStage, st = new PS.Stage(host);
    const SENT = ["send", "confirm", "unsure"], ACT = ["check", ...SENT];
    let ordDoneAt = 0, clock = 0, first = true;
    const cfg = () => {
      const g = (id) => M.legs.find((l) => l.id === id) || { phase: "wait" };
      const s = g("setup"), a = g("add"), o = g("ord");
      const addStarted = !["wait", "queued", "approve", "skipped"].includes(a.phase);
      const ph = s.phase === "done" ? (addStarted || a.phase === "skipped" ? "docked" : "filled") : SENT.includes(s.phase) ? "forming" : "outline";
      const c = PS.base({ ph, phBad: s.phase === "failed", m: a.phase === "done" ? 32.5 : 42.5, p: a.phase === "done" ? 10 : 0 });
      if (ACT.includes(a.phase)) { c.ms = true; c.path = SENT.includes(a.phase) ? "flow" : "idle"; }
      else if (a.phase === "failed") c.path = "bad";
      if (ACT.includes(o.phase)) c.mk = SENT.includes(o.phase) ? "ping" : "idle";
      else if (o.phase === "failed") { c.mk = "bad"; c.mkv = "Not placed"; c.l2 = "No position"; }
      else if (o.phase === "done") {
        if (!ordDoneAt) ordDoneAt = clock;
        const t = clock - ordDoneAt;
        c.mk = "hit"; c.mkv = "Filled"; c.chip = t < 120 ? "off" : t < 900 ? "pop" : "dock"; c.l2 = t < 900 ? "No position yet" : "Long SOL 2x · 0.1067 SOL";
      }
      if (o.phase !== "done") ordDoneAt = 0;
      return c;
    };
    return {
      update() { st.apply(cfg(), first); first = false; },
      frame(dt) { clock += dt; st.apply(cfg(), false); st.frame(dt); },
    };
  }

  /* ---------------- render ---------------- */  let mascot = null, lastView = null, lastFace = null;
  function render() {
    syncWallet(); syncSteps();
    if (!$("#screen")) return;
    if (M.closed) { syncToast(); return; }
    setTitle(M.S.title);
    if (M.sheet === "review") { stageD = null; if (lastView !== "review") { lastView = "review"; swapView(reviewHTML()); } return; }
    if (lastView !== "run") { lastView = "run"; swapView(runShellHTML(), () => { mascot = new Mascot($("#mf"), 56); lastFace = null; makeStage(); render(); }); return; }
    if (!$("#lgs")) return;
    withHeight(() => {
      const box = $("#lgs");
      box.classList.toggle("single", !multi());
      M.legs.forEach((l) => { if (!$(`[data-leg="${l.id}"]`, box)) box.insertAdjacentHTML("beforeend", legRowHTML(l)); });
      const canRetryRow = M.sheet === "finish" && M.finish.kind === "part";
      M.legs.forEach((l) => {
        const row = $(`[data-leg="${l.id}"]`, box);
        if (row.dataset.p !== l.phase) {
          const was = row.dataset.p; row.dataset.p = l.phase;
          const w = $(".lg-w", row); w.textContent = WORD[l.phase]; if (was) restart(w, "swapin");
          if (l.phase === "done" && was) restart(row, "popdone");
          if (l.phase === "failed" && was) restart(row, "shake");
          if (l.phase === "check" && (was === "failed" || was === "skipped" || was === "wait")) restart(row, "rewind");
        }
        $(".lg-r", row).textContent = l.reason;
        $(".lg-sig", row).textContent = l.phase === "done" && multi() ? l.sig : "";
        row.classList.toggle("can-retry", canRetryRow && l.phase === "failed");
      });
      const [h, c] = head(); setHead(h, c);
      segbar();
      if (stageD) stageD.update(M.legs, M.sheet === "finish");
      $("#cxl").innerHTML = awaiting() ? `<button class="tbtn quiet" data-ev="cancel">Cancel</button>` : "";
      if (M.stopAsk && canStop()) {
        const n = heldBack().length;
        $("#acts").innerHTML = `<div class="stopask"><div class="sa-t">Stop here?</div><div class="sa-d">Steps already sent will finish. The remaining ${n} step${n === 1 ? "" : "s"} will not be sent.</div>` +
          `<div class="sa-b"><button class="obtn sm2" data-ev="confirmStop">Stop</button><button class="btn sm2" data-ev="keepGoing">Keep going</button></div></div>`;
      } else $("#acts").innerHTML = acts().map(([lb, ev, cls]) => `<button class="${cls}" data-ev="${ev}">${esc(lb)}</button>`).join("");
      // explorer: one header link only for a single transaction; with 2+ legs each confirmed row has its own
      $("#expl").style.display = !multi() && M.legs[0].phase === "done" ? "" : "none";
    });
    face();
  }
  function segbar() {
    const bar = $("#segbar");
    if (bar.children.length !== M.legs.length) bar.innerHTML = M.legs.map(() => `<span class="sg"><i></i><span class="gl"><span class="glint"></span></span></span>`).join("");
    M.legs.forEach((l, i) => (bar.children[i].dataset.p = l.phase));
    const any = (ps) => M.legs.some((l) => ps.includes(l.phase));
    const lit = [any(["send", "confirm", "unsure", "done"]), any(["done"]), M.legs.every((l) => l.phase === "done")];
    $$(".step", $("#prog")).forEach((el, i) => { if (lit[i] && !el.classList.contains("lit")) restart(el, "pop"); el.classList.toggle("lit", lit[i]); });
  }
  function face() {
    const aw = $("#aw"); if (!aw || !mascot) return;
    const f = M.sheet === "finish" ? M.finish.kind : null;
    const s = awaiting() ? "wallet" : !f ? "sent" : f === "done" ? "done" : f === "cancelled" || f === "stopped" ? "pause" : "fail";
    if (s === lastFace) return; lastFace = s;
    aw.dataset.s = s; aw.classList.remove("drawn"); mascot.reset();
    if (s === "wallet") mascot.mode("idle");
    else if (s === "sent") { mascot.mode("track"); mascot.look([0.3, 0.8], [0.2, 0.8]); }
    else if (s === "pause") { mascot.set({ mouth: "line" }); mascot.mode("track"); }
    else if (s === "done") { mascot.mode("track"); mascot.near = [0.6, 0.1]; mascot.far = [0.4, 0.2]; mascot.render(); mascot.strike(); void aw.offsetWidth; aw.classList.add("drawn"); restart($("#rip"), "go"); }
    else { mascot.set(f === "part" && M.finish.ok.length ? { eyeNear: "sad", mouth: "wavy" } : { eyes: "sad", mouth: "line" }); mascot.mode("off"); restart($("#hd"), "shake"); }
  }

  let hT;
  function withHeight(fn) {
    const sh = $("#sheet");
    clearTimeout(hT); sh.style.height = ""; sh.classList.remove("anim-h");
    const open = !$("#screen").classList.contains("closed");
    const h0 = sh.offsetHeight; fn();
    if (prefs.rm || !open) return;
    const h1 = sh.offsetHeight;
    if (Math.abs(h1 - h0) < 2) return;
    sh.style.height = h0 + "px"; void sh.offsetHeight;
    sh.classList.add("anim-h"); sh.style.height = h1 + "px";
    hT = setTimeout(() => { sh.style.height = ""; sh.classList.remove("anim-h"); }, 480 / SPEED.v);
  }
  let swapT;
  function setHead(h, c) {
    const tt = $(".tt");
    if ($("#h").textContent === h && $("#cap").textContent === c) return;
    clearTimeout(swapT);
    if (!$("#h").textContent || prefs.rm || $("#h").textContent === h) { $("#h").textContent = h; $("#cap").textContent = c; return; }
    tt.classList.add("swapout");
    swapT = setTimeout(() => { $("#h").textContent = h; $("#cap").textContent = c; tt.classList.remove("swapout"); restart(tt, "swapin"); }, 170 / SPEED.v);
  }
  function setTitle(t) {
    const el = $("#stitle"); if (el.textContent === t) return;
    if (prefs.rm || $("#screen").classList.contains("closed")) { el.textContent = t; return; }
    el.classList.add("swapout"); setTimeout(() => { el.textContent = t; el.classList.remove("swapout"); restart(el, "swapin"); }, 170 / SPEED.v);
  }
  function swapView(html, then) {
    const views = $("#views"), old = views.firstElementChild;
    const put = () => withHeight(() => {
      views.innerHTML = html;
      const v = views.firstElementChild;
      [...v.children].forEach((c, i) => c.style.setProperty("--i", i));
      if (!prefs.rm) v.classList.add("enter");
      then && then();
    });
    if (old && !prefs.rm && !$("#screen").classList.contains("closed")) { old.classList.add("leave"); setTimeout(put, 170 / SPEED.v); } else put();
  }

  /* ---------------- toast after X while legs still run ---------------- */
  let toastT;
  function syncToast() {
    const t = $("#toast"); if (!t) return;
    if (!M.closed || M.sheet === "review") { t.classList.remove("on"); return; }
    if (M.sheet === "finish") return;
    const msg = awaiting() ? "Waiting for your wallet" : `${M.S.doing} · ${doneN()} of ${M.legs.length} done`;
    t.innerHTML = `<span class="t-dot">${spinHTML()}</span><span class="t-m">${esc(msg)}</span><button class="t-a" data-ev="view">View</button>`;
    t.classList.add("on");
  }
  function showToastFinal() {
    const t = $("#toast"); if (!t) return;
    const [h, c] = summary(), ok = M.finish.kind === "done";
    const msg = ok ? h : `${h} · ${c.replace(/\.$/, "")}`;
    t.innerHTML = `<span class="t-dot ${ok ? "ok" : "bad"}">${ok ? IC.check(14) : IC.close(12)}</span><span class="t-m">${esc(msg)}</span><button class="t-a" data-ev="view">View</button>`;
    t.classList.add("on"); restart(t, "toastin");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 9000 / SPEED.v);
  }

  /* ---------------- page ---------------- */
  const TITLE = "Multi-leg transaction sheet";
  document.title = `${TITLE} · Vanna`;
  const statusHTML = () => `<div class="statusbar"><span class="tnum">10:24</span><span class="icons"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 22 22 2v20Z"/></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21 0 6.6Q2.5 4.45 5.6 3.225 8.7 2 12 2t6.4 1.225Q21.5 4.45 24 6.6Z"/></svg><svg width="24" height="14" viewBox="0 0 26 14"><rect x=".75" y=".75" width="21" height="12.5" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".6"/><rect x="3" y="3" width="14" height="8" rx="1.8" fill="currentColor"/><rect x="23.2" y="4.5" width="2" height="5" rx="1" fill="currentColor" opacity=".6"/></svg></span></div>`;
  const appHTML = () => `<div class="app"><div class="hero"><div class="hrow"><span class="t">Vanna</span><span style="font-size:13px;font-weight:600;background:rgba(255,255,255,.16);padding:6px 10px;border-radius:999px">Solana</span></div>` +
    `<div class="px tnum" style="margin-top:30px">$1,284.20</div><div class="chg tnum">Portfolio value</div></div>` +
    `<div class="body"><div class="card"><div class="row"><span>Margin account</span><b class="tnum">$812.40</b></div><div class="row"><span>Phoenix</span><b class="tnum">$212.40</b></div><div class="row"><span>Kamino</span><b class="tnum">$152.10</b></div><button class="cta" id="appCta">Open the sheet again</button></div></div>` +
    `<div class="toast" id="toast" role="status"></div>` +
    `<div class="tabbar"><div class="on"><i></i>Portfolio</div><div><i></i>Earn</div><div class="mid"><i></i></div><div><i></i>Trade</div><div><i></i>Farm</div></div></div>`;
  const cats = [...new Set(Object.values(SC).map((s) => s.cat))];
  document.body.insertAdjacentHTML("beforeend",
    `<header class="top" id="top"><a class="brand" href="index.html"><span class="dot"></span><span>Multi-leg transaction sheet<small>Vanna · interactive prototype, not wired to the app</small></span></a><span class="grow"></span>` +
    `<div class="sizer" role="group" aria-label="Phone size"><span class="sz-l">Size</span><input type="range" id="scR" min="40" max="150" step="1" aria-label="Phone size in percent"><span class="sz-v tnum" id="scV">100%</span><div class="seg">${[50, 75, 100, 125].map((v) => `<button data-scale="${v}">${v}</button>`).join("")}<button data-scale="fit">Fit to window</button></div></div></header>` +
    `<main class="stage"><div class="phone-col"><div class="fitbox" id="fitbox"><div class="fit" id="fit"></div></div></div>` +
    `<aside class="panel"><div><h1>${TITLE}</h1><p class="lede">Every action that is, or can be, more than one transaction. Pick one, tap its button on the phone, answer in the mock wallet, then move the chain on step by step. A failed leg can be retried on its own: done legs are never sent again.</p></div>` +
    `<div class="wbox"><div class="lbl">Simulate</div><label class="w-sim"><select id="scen">${cats.map((c) => `<optgroup label="${c}">${Object.entries(SC).filter(([, s]) => s.cat === c).map(([k, s]) => `<option value="${k}" ${k === key ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</optgroup>`).join("")}</select></label>` +
    `<label class="w-sim" style="margin-top:8px"><span>On chain</span><select id="failSel"></select></label>` +
    `<div class="w-sim" style="margin-top:8px"><span>Approvals (Flash repay, Close all, Close + return, Borrow and swap)</span><div class="seg wide2" role="group" aria-label="Approvals"><button data-apmode="one">One approval for everything</button><button data-apmode="per">One approval per stage</button></div></div></div>` +
    `<div class="wallet" id="wallet"></div><div class="chainp" id="chainp"></div><div id="devHost"></div></aside></main>`);

  function failOptions() {
    const S = SC[key];
    return [["none", "Everything lands"], ...S.legs.map((l) => [`fail:${l.id}`, `${l.label} fails`]), ...S.legs.map((l) => [`timeout:${l.id}`, `${l.label}: confirmation times out`])];
  }
  function syncApMode() { $$("[data-apmode]").forEach((b) => b.classList.toggle("on", b.dataset.apmode === apMode)); }
  function syncFail() { $("#failSel").innerHTML = failOptions().map(([v, l]) => `<option value="${v}" ${v === failPick ? "selected" : ""}>${esc(l)}</option>`).join(""); }
  function syncWallet() {
    const w = $("#wallet"); if (!w || !M) return;
    const ask = awaiting();
    const n = ask ? M.legs.filter((l) => l.ap === M.askAp && !END.includes(l.phase)).length : 0;
    if (M.wallet === "cancelled") {
      const k = M.cancelledN || 1;
      w.innerHTML = `<div class="w-hd"><span class="w-logo">${IC.check(14)}</span><b>Phantom</b><span class="w-mock">mock wallet</span></div><div class="w-req cancelled"><s>Vanna asks you to approve ${k === 1 ? "1 transaction" : `${k} transactions`}</s><span>Request cancelled by the app</span></div>` +
        `<div class="w-btns"><button class="pbtn main" disabled>Approve</button><button class="pbtn" disabled>Reject</button><button class="pbtn" disabled>Time out</button></div>`;
      return;
    }
    const status = ask ? `<b>Vanna</b> asks you to approve ${n === 1 ? "1 transaction" : `${n} transactions`}${M.retrying && M.signedAp === 0 ? " (retry: only what did not land)" : M.askAp > 1 ? " (second approval)" : ""}` : M.wallet === "rejected" ? "You rejected the request" : M.wallet === "timeout" ? "The request timed out" : M.wallet === "signed" ? "Signed. The app sends the transactions now." : "No request yet. Tap the button on the phone.";
    w.innerHTML = `<div class="w-hd"><span class="w-logo">${IC.check(14)}</span><b>Phantom</b><span class="w-mock">mock wallet</span></div><div class="w-req ${ask ? "on" : ""}">${status}</div>` +
      `<div class="w-btns"><button class="pbtn main" data-w="approve" ${ask ? "" : "disabled"}>Approve</button><button class="pbtn" data-w="reject" ${ask ? "" : "disabled"}>Reject</button><button class="pbtn" data-w="timeout" ${ask ? "" : "disabled"}>Time out</button></div>`;
  }
  let auto = false, autoT = 0;
  function syncSteps() {
    const c = $("#chainp"); if (!c || !M) return;
    const live = M.sheet === "run" && !awaiting();
    const rows = M.legs.filter((l) => ACTIVE.includes(l.phase)).map((l) => {
      const b = l.phase === "unsure"
        ? `<button class="pbtn sm" data-leg-ev="land" data-id="${l.id}">It landed</button><button class="pbtn sm" data-leg-ev="fail" data-id="${l.id}">It did not land</button>`
        : `<button class="pbtn sm" data-leg-ev="next" data-id="${l.id}">${l.phase === "check" ? "Checked → send" : l.phase === "send" ? "Sent → confirm" : "Confirms"}</button><button class="pbtn sm" data-leg-ev="fail" data-id="${l.id}">Fails</button>${l.phase === "confirm" ? `<button class="pbtn sm" data-leg-ev="timeout" data-id="${l.id}">Times out</button>` : ""}`;
      return `<div class="cp-row"><span>${esc(l.label)} <i>${WORD[l.phase]}</i></span><span class="cp-b">${b}</span></div>`;
    }).join("");
    c.innerHTML = `<div class="lbl">Chain</div><div class="w-btns"><button class="pbtn main" id="next" ${live ? "" : "disabled"}>Play next step</button><label class="toggle"><input type="checkbox" id="auto" ${auto ? "checked" : ""}> Auto-play</label><button class="pbtn" id="reset">Reset</button></div>` +
      `<div class="w-btns"><button class="pbtn sm" data-ev="cancel" ${awaiting() ? "" : "disabled"}>Press Cancel</button><button class="pbtn sm" data-ev="askStop" ${canStop() ? "" : "disabled"}>Press Stop</button></div>` +
      `<div class="cp-hint">${M.sheet !== "run" || awaiting() ? "" : canStop() ? `Stop is available: ${heldBack().length} step${heldBack().length === 1 ? " is" : "s are"} held back until this stage lands.` : M.stopping ? "Stopping after this step." : M.S.noStop ? "No Stop here: every close is sent at once and the USDC return follows on its own (a sent transaction cannot be recalled)." : "No Stop: everything left is already being sent (a sent transaction cannot be recalled)."}</div>` +
      `<div class="cp-hint">${awaiting() ? "Waiting for the wallet: answer in the Phantom panel." : M.sheet === "review" ? "Tap the button on the phone to start." : M.sheet === "finish" ? "Finished. Use the sheet's buttons (Retry failed, Retry on a row), or Reset." : ""}</div>${rows}`;
  }
  const devHTML = () => `<details class="dev" id="dev" ${store.get("devOpen", "0") === "1" ? "open" : ""}><summary>Dev controls</summary><div class="dev-in">` +
    `<div class="drow"><span>Speed</span><div class="seg">${[0.5, 1, 2].map((v) => `<button data-speed="${v}">${v}x</button>`).join("")}</div></div>` +
    `<div class="drow"><span>Look</span><div class="seg"><button data-theme-set="light">Light</button><button data-theme-set="dark">Dark</button></div><label class="toggle"><input type="checkbox" class="rmT"> Reduce motion</label></div>` +
    `<div class="drow"><span>Device</span><div class="seg"><button data-device-set="k50i">Redmi K50i</button><button data-device-set="ultra">Galaxy S Ultra</button></div></div>` +
    `<div class="drow"><span>Phone width</span><div class="seg">${[320, 360, 380, 412].map((v) => `<button data-sw="${v}">${v}</button>`).join("")}</div></div>` +
    `<div class="dbg tnum" id="dbg"></div></div></details>`;

  function buildDevice() {
    const sw = +store.get("sw", "412");
    $("#fit").innerHTML = `<div class="device ${prefs.device === "ultra" ? "ultra" : ""}" id="device"><i class="key k1"></i><i class="key k2"></i><div class="screen closed" id="screen" style="--sw:${sw}px">${appHTML()}<div class="scrim" id="scrim"></div>` +
      `<div class="sheet" id="sheet"><div class="handle"></div><div class="shead"><div class="title" id="stitle"></div><button class="xbtn" id="xbtn" aria-label="Close">${IC.close(22)}</button></div><div class="sbody" id="views"></div></div>` +
      `${statusHTML()}<div class="punch"></div><div class="gesture"></div></div></div>`;
    lastView = null; fit();
  }
  function fit() {
    const d = $("#device"); if (!d) return;
    const w = d.offsetWidth, h = d.offsetHeight, mode = store.get("scale", "fit");
    const col = $(".phone-col"), wide = window.innerWidth > 900;
    const a = Math.max(0.4, Math.min(1.5, ((wide ? col.clientHeight : window.innerHeight - $("#top").offsetHeight - 32) - 16) / h, (col.clientWidth - 8) / w));
    const s = mode === "fit" ? a : Math.max(0.4, Math.min(1.5, (+mode || 100) / 100));
    $("#fit").style.cssText = `width:${w}px;transform:scale(${s})`;
    $("#fitbox").style.cssText = `width:${w * s}px;height:${h * s}px`;
    $("#scR").value = Math.round(s * 100); $("#scV").textContent = Math.round(s * 100) + "%";
    $$("[data-scale]").forEach((b) => b.classList.toggle("on", b.dataset.scale === mode));
  }
  function syncChrome() {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.classList.toggle("rm", prefs.rm);
    $$("[data-theme-set]").forEach((b) => b.classList.toggle("on", b.dataset.themeSet === prefs.theme));
    $$("[data-device-set]").forEach((b) => b.classList.toggle("on", b.dataset.deviceSet === prefs.device));
    $$("[data-speed]").forEach((b) => b.classList.toggle("on", +b.dataset.speed === SPEED.v));
    $$("[data-sw]").forEach((b) => b.classList.toggle("on", b.dataset.sw === store.get("sw", "412")));
    $$(".rmT").forEach((r) => (r.checked = prefs.rm));
    store.set("theme", prefs.theme); store.set("device", prefs.device); store.set("rm", prefs.rm ? "1" : "0");
  }

  /* ---------------- events ---------------- */
  function openSheet() {
    const sc = $("#screen");
    M.closed = false; $("#toast").classList.remove("on");
    lastView = null; $("#views").innerHTML = "";
    render();
    requestAnimationFrame(() => requestAnimationFrame(() => sc.classList.remove("closed")));
  }
  function closeSheet() {
    // while the wallet has not answered, X is Cancel: a request left in Phantom could be approved later
    if (M && awaiting()) { cancel(); return; }
    $("#screen").classList.add("closed");
    if (M.sheet === "run") { M.closed = true; syncToast(); } else reset(false);
  }
  function reset(reopen = true) {
    fresh(); lastView = null; syncFail();
    if (reopen) { $("#screen").classList.add("closed"); setTimeout(openSheet, 300 / SPEED.v); } else render();
  }
  function onEv(ev) {
    if (ev === "start") { M.sheet = "run"; ask(1); render(); }
    else if (ev === "again") { fresh(); M.sheet = "run"; ask(1); lastView = null; render(); }
    else if (ev === "retryAll") retry();
    else if (ev === "cancel") cancel();
    else if (ev === "askStop") askStop();
    else if (ev === "confirmStop") confirmStop();
    else if (ev === "keepGoing") { M.stopAsk = false; render(); }
    else if (ev === "close") reset(true);
    else if (ev === "view") openSheet();
    else if (ev === "noop") { /* Return USDC to margin: its own sheet, see the Phoenix flow prototype */ }
  }
  document.addEventListener("click", (e) => {
    const rb = e.target.closest("[data-retry]"); if (rb) { retry(rb.dataset.retry); return; }
    const evb = e.target.closest("[data-ev]"); if (evb) { onEv(evb.dataset.ev); return; }
    if (e.target.closest("#xbtn") || e.target.closest("#scrim")) { closeSheet(); return; }
    if (e.target.closest("#appCta")) { if ($("#screen").classList.contains("closed")) openSheet(); return; }
    const w = e.target.closest("[data-w]"); if (w && !w.disabled) { if (w.dataset.w === "approve") approve(); else rejectOrTimeout(w.dataset.w === "reject" ? "rejected" : "timeout"); return; }
    if (e.target.closest("#next")) { playNext(); render(); return; }
    if (e.target.closest("#reset")) { reset(true); return; }
    const lb = e.target.closest("[data-leg-ev]");
    if (lb) {
      const l = M.legs.find((x) => x.id === lb.dataset.id); if (!l) return;
      const k = lb.dataset.legEv;
      if (k === "next" || k === "land") advance(l); else if (k === "fail") failLeg(l, l.phase === "unsure" ? "It did not land on Solana." : undefined); else if (k === "timeout") timeoutLeg(l);
      return;
    }
    const am = e.target.closest("[data-apmode]"); if (am) { apMode = am.dataset.apmode; store.set("apMode", apMode); syncApMode(); reset(true); return; }
    const scb = e.target.closest("[data-scale]"); if (scb) { store.set("scale", scb.dataset.scale); fit(); return; }
    const sp = e.target.closest("[data-speed]"); if (sp) { SPEED.v = +sp.dataset.speed; store.set("speed", sp.dataset.speed); if (window.PhoenixStageEnv) window.PhoenixStageEnv.v = SPEED.v; syncChrome(); return; }
    const th = e.target.closest("[data-theme-set]"); if (th) { prefs.theme = th.dataset.themeSet; syncChrome(); if (mascot) mascot.render(); return; }
    const dv = e.target.closest("[data-device-set]"); if (dv) { prefs.device = dv.dataset.deviceSet; syncChrome(); buildDevice(); openSheet(); return; }
    const swb = e.target.closest("[data-sw]"); if (swb) { store.set("sw", swb.dataset.sw); $("#screen").style.setProperty("--sw", swb.dataset.sw + "px"); fit(); syncChrome(); return; }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "scen") { key = e.target.value; store.set("scen", key); failPick = "none"; reset(true); }
    if (e.target.id === "failSel") failPick = e.target.value;
    if (e.target.id === "auto") auto = e.target.checked;
    if (e.target.classList.contains("rmT")) { prefs.rm = e.target.checked; syncChrome(); }
  });
  document.addEventListener("input", (e) => { if (e.target.id === "scR") { store.set("scale", e.target.value); fit(); } });
  document.addEventListener("toggle", (e) => { if (e.target.id === "dev") store.set("devOpen", e.target.open ? "1" : "0"); }, true);

  let frameN = 0, last = 0;
  function tick(ts) {
    const dt = last ? Math.min(64, ts - last) : 16; last = ts; frameN++;
    if (stageD && !M.closed) stageD.frame(dt * SPEED.v);
    if (auto && M.sheet === "run" && !awaiting()) { autoT += dt * SPEED.v; if (autoT > 900) { autoT = 0; if (playNext()) render(); } } else autoT = 0;
    if (document.getAnimations) document.getAnimations().forEach((a) => { if (a.playbackRate !== SPEED.v) a.playbackRate = SPEED.v; });
    if (frameN % 10 === 0) { const d = $("#dbg"); if (d) d.textContent = `frame ${frameN} · ${SPEED.v}x · ${M.sheet}${M.closed ? " (background)" : ""} · wallet ${M.wallet} (approval ${M.askAp || "-"}) · ${M.legs.map((l) => `${l.id}:${l.phase}`).join(" ")}`; }
    requestAnimationFrame(tick);
  }

  fresh();
  $("#devHost").innerHTML = devHTML();
  if (window.PhoenixStageEnv) window.PhoenixStageEnv.v = SPEED.v;
  syncFail(); syncApMode(); syncChrome(); buildDevice(); window.addEventListener("resize", fit);
  openSheet();
  requestAnimationFrame(tick);
  if (document.fonts) document.fonts.ready.then(fit);
})();
