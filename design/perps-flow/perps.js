/* Phoenix perps first-time flow prototype. A stage in the style of MarginFlowSheet's Stage (src/ui/first-time-flow.tsx): the margin
   account as a small source on the left; a Phoenix trading account card in the centre that draws in, shimmers while the chain creates it and fills;
   USDC particles that travel from the margin account into it; the order firing at the market on the right and the position docking onto the card.
   Everything is driven by a virtual clock (play / pause / speed) and by plain flags, so each piece maps to a Reanimated shared value. */
(function () {
  const Ch = window.Chameleon;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const qs = new URLSearchParams(location.search);
  const store = {
    get(k, d) { try { const v = localStorage.getItem("pfx." + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("pfx." + k, v); } catch (e) {} },
  };
  const prefs = { theme: qs.get("theme") || store.get("theme", "light"), device: qs.get("device") || store.get("device", "k50i"), rm: (qs.get("rm") || store.get("rm", "0")) === "1" };
  const page = document.body.dataset.page || "flow";
  const VAR = document.body.dataset.variant; // first | returning
  const SPEED = { v: [0.5, 1, 2].includes(+store.get("speed", "1")) ? +store.get("speed", "1") : 1 };
  let uidN = 0;
  const uid = (p) => p + "x" + ++uidN;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const easeIO3 = (c) => (c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2);
  const outCubic = (t) => 1 - Math.pow(1 - t, 3);
  const restart = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const usdc = (n) => `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;

  /* ---------------- icons (Material Symbols paths) ---------------- */
  const svg = (d, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  const IC = {
    close: (s) => svg("M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6z", s),
    open: (s) => svg("M5 21q-.825 0-1.413-.587Q3 19.825 3 19V5q0-.825.587-1.413Q4.175 3 5 3h7v2H5v14h14v-7h2v7q0 .825-.587 1.413Q19.825 21 19 21Zm4.7-5.3-1.4-1.4L17.6 5H14V3h7v7h-2V6.4Z", s),
    check: (s) => svg("M9.55 18 3.85 12.3l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z", s),
    down: (s) => svg("M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z", s),
    bank: (s) => svg("M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z", s),
    candles: (s) => svg("M7 3h2v3h1.5v10H9v5H7v-5H5.5V6H7zm8 3h2v4h1.5v8H17v3h-2v-3h-1.5v-8H15z", s),
  };
  const drawCheck = (s, w = 3) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path class="checkpath" d="M6 12.5l4 4 8-9" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  /* ---------------- loader (tail-loader.tsx) and mascot (mascot.tsx), as in design/tx-motion ---------------- */
  const COIL = Ch.tailCoil();
  function loaderHTML(size) {
    const id = uid("tl");
    const stops = ["#FC5457", "#B6479E", "#703AE6"].map((c, i) => `<stop offset="${(i / 2).toFixed(2)}" stop-color="${c}"/>`).join("");
    return `<div class="tl" style="width:${size}px;height:${size}px" role="progressbar" aria-label="Working"><div class="spin"><svg width="${size}" height="${size}" viewBox="-2 34 56 56"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="4" y1="86" x2="48" y2="40">${stops}</linearGradient></defs>` +
      `<path d="${COIL.d}" stroke="#703AE6" stroke-opacity=".14" stroke-width="11" stroke-linecap="round" fill="none"/><path class="draw" d="${COIL.d}" stroke="url(#${id})" stroke-width="11" stroke-linecap="round" fill="none" style="--len:${COIL.len.toFixed(2)}"/></svg></div></div>`;
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
      this.clear(); this.baseLid = m === "patient" ? 0.42 : 0; this.render();
      if (prefs.rm || m === "off") return;
      const gap = m === "patient" ? [5000, 8000] : [4000, 7000];
      const blink = () => { [0.5, 0.99, 0.5, 0].forEach((v, i) => this.later(i * 30 + 30, () => { this.blink = v; this.render(); })); this.later(rnd(...gap), blink); };
      this.later(rnd(1500, 3000), blink);
      if (m === "idle" || m === "patient") {
        const hold = m === "patient" ? [3000, 5000] : [1500, 3000];
        const glance = (w) => { this.glide(w, [rnd(-0.8, 0.9), rnd(-0.6, 0.5)], m === "patient" ? 500 : 300); this.later(rnd(...hold), () => glance(w)); };
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

  /* ---------------- paths and states (copy, stage flags, buttons) ----------------
     A path is one situation: first (no Phoenix account yet), r1 (Phoenix already holds enough USDC: order only), r2 (holds a
     little: add USDC, then the order). Each state says what the sheet shows; running states play once and hand over to `next`. */
  const LAND = 0.72; // a part confirms here
  const sub = (f) => (f < 0.4 ? 1 : f < LAND ? 2 : 3);
  // ms: "plan" = the margin source dimmed, true = active while USDC moves. mk "idle" = the market dimmed.
  const base = (o) => ({ ph: "docked", path: "off", ms: "plan", mk: "idle", chip: "off", phBad: false, m: 42.5, p: 0, l2: "No position yet", mkv: "$187.42", ...o });
  const orderStage = (f, m, p) => base({ m, p, mk: f < LAND ? "ping" : "hit", chip: f < LAND + 0.02 ? "off" : f < 0.88 ? "pop" : "dock", l2: f < 0.88 ? "No position yet" : "Long SOL 2x · 0.1067 SOL", mkv: f < LAND ? "$187.42" : "Filled" });
  const addStage = (f, m0, p0, a) => base({ ms: true, path: f < LAND ? "flow" : "done", m: f < LAND ? m0 : m0 - a, p: f < LAND ? p0 : p0 + a });
  const retStage = (f, m0, p0, a) => base({ ms: true, path: f < LAND ? "back" : "backdone", m: f < LAND ? m0 : m0 + a, p: f < LAND ? p0 : p0 - a, l2: "No position" });
  const WAIT = "Approve in Phantom. If it shows a warning, tap Confirm (unsafe).";
  const PATHS = {
    first: { kind: "first", held0: 0, add: 10, setup: true, txs: 3 },
    r1: { kind: "none", held0: 25, add: 0, setup: false, txs: 1 },
    r2: { kind: "none", held0: 4.2, add: 10, setup: false, txs: 2 },
  };
  const SCEN = {
    first: [["ok", "Everything lands"], ["setupFail", "Setting up the account fails"], ["addFail", "Adding USDC fails"], ["orderFail", "The order fails after the deposit"], ["noFill", "No fill at the price"]],
    r1: [["ok", "Everything lands"], ["orderFail", "The order fails"], ["noFill", "No fill at the price"]],
    r2: [["ok", "Everything lands"], ["addFail", "Adding USDC fails"], ["orderFail", "The order fails after the deposit"], ["noFill", "No fill at the price"]],
  };
  // where each chain failure interrupts the running animation: [running state, fraction, failure state]
  const FAIL_AT = {
    first: { setupFail: ["setup", 0.55, "setupFail"], addFail: ["add", 0.55, "addFail"], orderFail: ["order", 0.62, "orderFail"], noFill: ["order", 0.8, "noFill"] },
    r1: { orderFail: ["run", 0.7, "orderFail"], noFill: ["run", 0.85, "noFill"] },
    r2: { addFail: ["run", 0.45, "addFail"], orderFail: ["run", 0.7, "orderFail"], noFill: ["run", 0.85, "noFill"] },
  };
  function buildStates(P) {
    const c = PATHS[P], first = c.kind === "first", held = c.held0 + c.add, m0 = 42.5, m1 = 42.5 - c.add;
    const T = "Review long SOLUSDC", O = "Opening long SOL 2x";
    const posLine = P === "r1" ? "0.2668 SOL on Phoenix" : `0.1067 SOL on Phoenix · ${usdc(held)} collateral`;
    const start = () => (first ? base({ ph: "outline" }) : base({ p: c.held0 }));
    const again = [["Try again", "again", "btn"], ["Close", "close", "tbtn"]];
    const S = {
      review: { v: "review", title: T, group: "Open long", label: "Review" },
      wait: { v: "run", title: T, wait: true, h: "Waiting for your wallet", cap: WAIT, stage: start, long: "wait60", group: "Open long", label: "Waiting for wallet", needs: ["externalWalletName(chain)", `Transactions in the one approval (${c.txs})`, "Nothing moves until the wallet signs (onSigned)"] },
      wait60: { v: "run", title: T, wait: true, longWait: true, h: "Waiting for your wallet", cap: WAIT, stage: start, group: "Open long", label: "Waiting 60 s+", needs: ["Elapsed > 60 s (visual only: heavier lids, slower breathing)"] },
    };
    if (first) {
      S.setup = { v: "run", title: T, h: O, cap: "Creating your Phoenix trading account (one time)", sb: () => 1, d: 3800, stage: (f) => base({ ph: f < LAND ? "forming" : "filled" }), next: "add", group: "Open long", label: "Account created", needs: ["Which part is running (new per-part callback)", "Bar: Sent once the wallet signed and the first part is out"] };
      S.add = { v: "run", title: T, h: O, cap: "Moving 10.00 USDC from your margin account", sb: () => 2, d: 3600, stage: (f) => addStage(f, m0, 0, 10), next: "order", group: "Open long", label: "USDC flows in", needs: ["Margin USDC and Phoenix collateral before / after (count-ups)"] };
      S.order = { v: "run", title: T, h: O, cap: "Placing the order on Phoenix", sb: (f) => (f < LAND ? 2 : 3), d: 3800, stage: (f) => orderStage(f, m1, held), next: "done", group: "Open long", label: "Order fires", needs: ["Order part confirmed; fill check (loadPerps)"] };
    } else {
      S.run = { v: "run", title: T, h: O, cap: c.add ? "Adds 10.00 USDC to Phoenix, then places the order" : "Uses the USDC already in Phoenix", sb: sub, d: 3400, stage: start, next: "done", group: "Open long", label: "Sent / processed / confirmed", needs: ["Overall status of the action (one bar across all its transactions)"] };
    }
    Object.assign(S, {
      done: { v: "run", title: T, end: "done", h: "Long SOL 2x opened", cap: posLine, stage: () => orderStage(1, m1, held), acts: [["Done", "reset", "btn"]], group: "Open long", label: "Position opened", needs: ["Filled size, Phoenix collateral after, last signature (explorer)"] },
      rejected: { v: "run", title: T, end: "fail", h: "Not confirmed", cap: "You declined it in Phantom. Nothing was sent.", stage: start, acts: again, group: "Wallet", label: "Rejected in wallet", needs: ["The wallet's rejection (no transaction sent)"] },
      timeout: { v: "run", title: T, end: "fail", h: "Not confirmed", cap: "Your wallet did not answer. Nothing was sent.", stage: start, acts: again, group: "Wallet", label: "Wallet timed out", needs: ["isWalletTimeout(e)"] },
      orderFail: { v: "run", title: T, end: "fail", kind2: "order", h: "Order not placed", cap: c.add ? "Your USDC is in Phoenix. The order did not go through: the price moved past your limit." : `The order did not go through: the price moved past your limit. Your ${usdc(held)} stays in Phoenix.`, stage: () => base({ m: m1, p: held, mk: "bad", l2: "No position", mkv: "Not placed" }), acts: [["Retry order", "retry", "btn"], ["Return USDC to margin", "return", "obtn"]], group: "Chain failures", label: "Order fails", needs: ["The order part failed after the deposit landed", "Phoenix free collateral now"] },
      noFill: { v: "run", title: T, end: "fail", kind2: "nofill", h: "No fill at your price", cap: `The price moved more than 1% before the order filled. Your ${usdc(held)} is in Phoenix.`, stage: () => base({ m: m1, p: held, mk: "bad", l2: "No position", mkv: "No fill" }), acts: [["Retry order", "retry", "btn"], ["Return USDC to margin", "return", "obtn"]], group: "Chain failures", label: "No fill", needs: ["Batch confirmed but the position did not change"] },
      retryWait: { v: "run", title: "Retry order", wait: true, h: "Waiting for your wallet", cap: WAIT, stage: () => base({ m: m1, p: held, l2: "No position" }), group: "Retry order", label: "Retry: waiting", needs: ["solanaPerpsOpen with collateralUsdc 0 (uses the USDC in Phoenix)"] },
      retryRun: { v: "run", title: "Retry order", h: "Placing your order", cap: `Uses the ${usdc(held)} in Phoenix`, sb: sub, d: 3400, stage: (f) => orderStage(f, m1, held), next: "retryDone", group: "Retry order", label: "Retry: order fires", needs: ["Order status"] },
      retryDone: { v: "run", title: "Retry order", end: "done", h: "Long SOL 2x opened", cap: posLine, stage: () => orderStage(1, m1, held), acts: [["Done", "reset", "btn"]], group: "Retry order", label: "Retry: opened", needs: ["Filled size, signature"] },
      retWait: { v: "run", title: "Withdraw from Phoenix", wait: true, h: "Waiting for your wallet", cap: WAIT, stage: () => base({ ms: true, path: "idle", m: m1, p: held, l2: "No position" }), group: "Return USDC", label: "Return: waiting", needs: [`Free collateral in Phoenix (${usdc(held)})`] },
      retRun: { v: "run", title: "Withdraw from Phoenix", h: `Returning ${usdc(held)}`, cap: "To your margin account", sb: sub, d: 3400, stage: (f) => retStage(f, m1, held, held), next: "retDone", group: "Return USDC", label: "Return: USDC flows back", needs: ["Withdraw parts, one approval"] },
      retDone: { v: "run", title: "Withdraw from Phoenix", end: "done", h: "Back in your margin account", cap: `${usdc(held)} from Phoenix`, stage: () => retStage(1, m1, held, held), acts: [["Done", "reset", "btn"]], group: "Return USDC", label: "Return: done", needs: ["Amount returned, signature"] },
    });
    if (first) S.setupFail = { v: "run", title: T, end: "fail", h: "Not confirmed", cap: "Setting up your Phoenix account didn't go through. Nothing moved and no order was placed.", stage: () => base({ ph: "outline", phBad: true }), acts: again, group: "Chain failures", label: "Setup fails", needs: ["Error from the first part (nothing landed)"] };
    if (c.add) S.addFail = { v: "run", title: T, end: "fail", h: "Not confirmed", cap: first ? "Your Phoenix account is ready. Adding USDC didn't go through, so nothing moved and no order was placed." : "Adding USDC didn't go through, so nothing moved and no order was placed.", stage: () => base({ path: "bad", m: m0, p: c.held0 }), acts: again, group: "Chain failures", label: "Add USDC fails", needs: ["The deposit part failed (setup landed, if it ran)"] };
    Object.entries(S).forEach(([k, s]) => { s.key = k; s.kind = c.kind; s.path = P; });
    return S;
  }
  /* ---------------- the stage: one tight row  [margin source] -> [Phoenix account card] -> [SOL-PERP market] ----------------
     The geometry is computed from the sheet body width B (phone width - 32), so it fits from a 320 px phone up: the side zones
     shrink first, then the card (196 px max, 150 px min); the paths run between the circle edges and the card edges, never across. */
  const H = 132; // card 116 px + 8 px above and below
  const num = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function geo(B) {
    const side = B >= 370 ? 72 : B >= 340 ? 68 : B >= 320 ? 64 : 56;
    const r = B >= 320 ? 22 : 20;
    const cw = Math.max(150, Math.min(196, B - 2 * side - 12));
    const gap = Math.max(0, (B - 2 * side - cw) / 2);
    const cl = side + gap, ct = 8, ch = 116, cr = cl + cw;
    const cy = 14 + r, sx = side / 2, nx = B - side / 2, ay = ct + 52;
    const a0 = sx + r + 3, a1 = cl - 3, o0 = cr + 3, o1 = nx - r - 3;
    const dep = `M${a0} ${cy}C${(a0 + a1) / 2} ${cy} ${(a0 + a1) / 2} ${ay} ${a1} ${ay}`;
    const ord = `M${o0} ${ay}C${(o0 + o1) / 2} ${ay} ${(o0 + o1) / 2} ${cy} ${o1} ${cy}`;
    return { B, side, r, cw, cl, ct, ch, cr, cy, sx, nx, ay, dep, ord, tight: cw < 180 };
  }
  const bez = (p, a, b, c, d) => { const u = 1 - p; return u * u * u * a + 3 * u * u * p * b + 3 * u * p * p * c + p * p * p * d; };
  const pts = (d) => d.replace(/[MC]/g, " ").trim().split(/[\s,]+/).map(Number); // x0 y0 x1 y1 x2 y2 x3 y3
  class Stage {
    constructor(host) {
      const g = (this.g = geo(Math.round(host.clientWidth || 380))), B = g.B;
      this.cfg = null; this.shown = { m: null, p: null }; this.counts = {}; this.pclock = 0; this.oclock = 0;
      const parts = [...Array(7).keys()].map(() => `<circle class="pt-h" r="7"/><circle class="pt-c" r="3"/>`).join("");
      const zone = (cls, x, inner) => `<div class="${cls}" style="left:${x - g.side / 2}px;top:14px;width:${g.side}px;--r:${g.r * 2}px">${inner}</div>`;
      host.innerHTML = `<div class="stg ${g.tight ? "tight" : ""}" style="height:${H}px;width:${B}px">` +
        `<svg class="stg-svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}"><path class="dep-base" d="${g.dep}"/><path class="dep-line" d="${g.dep}"/><path class="ord-base" d="${g.ord}"/><path class="ord-line" d="${g.ord}"/><g class="pts">${parts}</g></svg>` +
        zone("ms", g.sx, `<div class="ms-c">${IC.bank(g.r - 2)}</div><div class="ms-l">Margin</div><div class="ms-v tnum"><span id="amtM"></span> <span class="u">USDC</span></div>`) +
        `<div class="pc" style="left:${g.cl}px;top:${g.ct}px;width:${g.cw}px;height:${g.ch}px"><div class="pc-out"></div><div class="pc-fill"></div><div class="pc-shim"></div><span class="sheen"></span>` +
        `<div class="pc-in"><div class="b-top"><span class="b-k">Phoenix</span><span class="b-chip">Perps</span></div>` +
        `<div class="b-mid"><div class="b-skel"><i></i><i></i></div><div class="b-name">Trading account</div><div class="b-amt tnum"><span id="amtP"></span><span class="u">USDC</span></div></div>` +
        `<div class="b-meta"><i class="b-dot"></i><span id="bMeta">Waiting to sign</span></div></div></div>` +
        zone("mk", g.nx, `<div class="mk-c"><span class="mk-halo"></span>${IC.candles(g.r - 2)}<span class="mk-ok">${IC.check(12)}</span><span class="mk-bad">${IC.close(12)}</span></div><div class="mk-l">SOL-PERP</div><div class="mk-v tnum" id="mkV">$187.42</div>`) +
        `<div class="chip" id="chip">Long SOL 2x</div></div>`;
      this.root = $(".stg", host);
      this.dep = pts(g.dep); this.ord = pts(g.ord);
      this.ph = $$(".pt-h", host); this.pcs = $$(".pt-c", host);
      // the chip pops over the market (kept inside the stage) and docks onto the card's last line
      const chip = $("#chip", host), w = chip.offsetWidth || 104;
      const l = Math.max(0, Math.min(B - w, g.nx - w / 2)), tp = g.cy - 14;
      chip.style.cssText = `left:${l}px;top:${tp}px;--dx:${g.cl + 14 - l}px;--dy:${g.ct + g.ch - 30 - tp}px`;
    }
    apply(c, instant) {
      const r = this.root, prev = this.cfg || {};
      if (instant) { r.classList.add("noanim"); requestAnimationFrame(() => requestAnimationFrame(() => r.classList.remove("noanim"))); }
      r.dataset.ph = c.ph; r.dataset.path = c.path; r.dataset.mk = c.mk; r.dataset.chip = c.chip;
      r.classList.toggle("ph-bad", !!c.phBad); r.classList.toggle("ms-on", c.ms === true); r.classList.toggle("ms-plan", c.ms === "plan");
      // the card's last line: its status while it is being made, then what it holds
      const meta = c.ph === "outline" ? (c.phBad ? "Not created" : "Waiting to sign") : c.ph === "forming" ? "Creating on Solana" : c.ph === "filled" ? "Ready just now" : c.l2;
      const mEl = $("#bMeta", r);
      if (mEl.textContent !== meta) { mEl.textContent = meta; if (!instant && prev.ph) restart(mEl, "swapin"); }
      if (prev.mkv !== c.mkv) $("#mkV", r).textContent = c.mkv;
      const big = LONG.on ? 1192.06 : 0; // "Longest strings" check: 1,234.56 USDC
      this.count("m", "#amtM", c.m + big, instant); this.count("p", "#amtP", c.p > 0 && LONG.on ? c.p + 1224.56 : c.p, instant);
      this.cfg = c;
    }
    // CountText: 900 ms ease-out cubic, cyan flash (the number only; the unit is a fixed smaller span)
    count(k, sel, to, instant) {
      const el = $(sel, this.root);
      if (this.shown[k] == null || instant || prefs.rm) { this.shown[k] = to; this.counts[k] = null; el.textContent = num(to); return; }
      const cur = this.counts[k];
      if ((cur && cur.to === to) || (!cur && this.shown[k] === to)) return;
      this.counts[k] = { from: this.shown[k], to, t: 0 };
      el.parentElement.classList.add("flash");
    }
    frame(dt) {
      ["m", "p"].forEach((k) => {
        const c = this.counts[k]; if (!c) return;
        const el = $(k === "m" ? "#amtM" : "#amtP", this.root);
        c.t += dt / 900; const v = c.from + (c.to - c.from) * outCubic(Math.min(1, c.t));
        this.shown[k] = v; el.textContent = num(v);
        if (c.t >= 1) { this.shown[k] = c.to; this.counts[k] = null; setTimeout(() => el.parentElement.classList.remove("flash"), 650 / SPEED.v); }
      });
      const c = this.cfg || {};
      const flow = !prefs.rm && (c.path === "flow" || c.path === "back");
      const shots = !prefs.rm && c.mk === "ping";
      if (flow) this.pclock += dt; else this.pclock = 0;
      if (shots) this.oclock += dt; else this.oclock = 0;
      for (let i = 0; i < 7; i++) {
        let x = 0, y = 0, o = 0;
        if (flow && i < 5) {
          const DURP = 620, loop = 5 * 150 + DURP + 260, e = ((((this.pclock - i * 150) % loop) + loop) % loop) / DURP;
          if (e > 0 && e < 1) { const q = easeIO3(e), P = this.dep, t = c.path === "back" ? 1 - q : q; x = bez(t, P[0], P[2], P[4], P[6]); y = bez(t, P[1], P[3], P[5], P[7]); o = Math.min(1, e / 0.15, (1 - e) / 0.15); }
        } else if (shots && i < 3) {
          const loop = 1100, e = ((((this.oclock - i * 120) % loop) + loop) % loop) / 520;
          if (e > 0 && e < 1) { const P = this.ord, q = easeIO3(e); x = bez(q, P[0], P[2], P[4], P[6]); y = bez(q, P[1], P[3], P[5], P[7]); o = Math.min(1, e / 0.2, (1 - e) / 0.2); }
        }
        this.ph[i].setAttribute("cx", x); this.ph[i].setAttribute("cy", y); this.ph[i].style.opacity = o * 0.22;
        this.pcs[i].setAttribute("cx", x); this.pcs[i].setAttribute("cy", y); this.pcs[i].style.opacity = o;
      }
    }
  }
  const LONG = { on: false };

  /* layout check (debug): every element of the stage must sit inside the stage and no text may be cut */
  function layoutCheck() {
    const stg = $(".stg"); if (!stg) return [];
    const s = stg.getBoundingClientRect(), out = [];
    $$(".stg *").forEach((el) => el.classList.remove("ovf"));
    $$(".stg > div, .stg .pc-in *, .stg .ms > *, .stg .mk > *").forEach((el) => {
      if (el.closest("svg") || el.classList.contains("chip") || el.classList.contains("sheen") || el.classList.contains("pc-shim") || el.classList.contains("mk-halo")) return;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const name = el.id || el.className || el.tagName;
      if (r.left < s.left - 0.5 || r.right > s.right + 0.5) { out.push(`${name}: outside the stage`); el.classList.add("ovf"); }
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") { out.push(`${name}: text cut (${el.scrollWidth} > ${el.clientWidth})`); el.classList.add("ovf"); }
      const pc = el.closest(".pc");
      if (pc && el !== pc) { const p = pc.getBoundingClientRect(); if (r.right > p.right - 1 || r.left < p.left + 1) { if (!el.classList.contains("pc-out") && !el.classList.contains("pc-fill") && !el.classList.contains("pc-in")) { out.push(`${name}: outside the card`); el.classList.add("ovf"); } } }
    });
    return out;
  }
  /* ---------------- page chrome ---------------- */
  function linkWith(href) { return `${href}?theme=${prefs.theme}&device=${prefs.device}&rm=${prefs.rm ? 1 : 0}`; }
  function topHTML() {
    const tabs = [["first", "First time", "first-time.html"], ["returning", "Returning", "returning.html"]].map(([k, l, h]) => `<a href="${h}" class="${VAR === k ? "on" : ""}" data-link>${l}</a>`).join("");
    const look = `<div class="seg" role="group" aria-label="Theme"><button data-theme-set="light">Light</button><button data-theme-set="dark">Dark</button></div>`;
    return `<a class="brand" href="index.html" data-link><span class="dot"></span><span>Phoenix perps flow<small>Vanna · interactive prototype, not wired to the app</small></span></a>` +
      `<nav class="seg" aria-label="Variant">${tabs}</nav><span class="grow"></span>` +
      (page === "flow"
        ? `<div class="sizer" role="group" aria-label="Phone size"><span class="sz-l">Size</span><input type="range" id="scR" min="40" max="150" step="1" aria-label="Phone size in percent"><span class="sz-v tnum" id="scV">100%</span><div class="seg">${[50, 75, 100, 125].map((v) => `<button data-scale="${v}">${v}</button>`).join("")}<button data-scale="fit">Fit to window</button></div></div>`
        : look);
  }
  function syncChrome() {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.classList.toggle("rm", prefs.rm);
    $$("[data-theme-set]").forEach((b) => b.classList.toggle("on", b.dataset.themeSet === prefs.theme));
    $$("[data-device-set]").forEach((b) => b.classList.toggle("on", b.dataset.deviceSet === prefs.device));
    $$(".rmT").forEach((r) => (r.checked = prefs.rm));
    $$("[data-link]").forEach((a) => { a.href = linkWith(a.getAttribute("href").split("?")[0]); });
    store.set("theme", prefs.theme); store.set("device", prefs.device); store.set("rm", prefs.rm ? "1" : "0");
    history.replaceState(null, "", linkWith(location.pathname.split("/").pop() || "index.html"));
  }
  function wireChrome(onChange) {
    $("#top").innerHTML = topHTML();
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-theme-set],[data-device-set]"); if (!t) return;
      if (t.dataset.themeSet) prefs.theme = t.dataset.themeSet; else prefs.device = t.dataset.deviceSet;
      syncChrome(); onChange && onChange(t.dataset.themeSet ? "theme" : "device");
    });
    document.addEventListener("change", (e) => { if (!e.target.classList.contains("rmT")) return; prefs.rm = e.target.checked; syncChrome(); onChange && onChange("rm"); });
    syncChrome();
  }
  if (page === "index") { wireChrome(); return; }

  /* ---------------- flow page: the phone sheet + a mock wallet, driven by taps ---------------- */
  let P = VAR === "first" ? "first" : store.get("rpath", "r2") === "r1" ? "r1" : "r2";
  let STATES = buildStates(P);
  let scen = "ok", action = "open", lastRun = null;
  const TITLE = VAR === "first" ? "First-time Phoenix flow" : "Returning trader flow";
  document.title = `${TITLE} · Phoenix perps`;

  const statusHTML = () => `<div class="statusbar"><span class="tnum">10:24</span><span class="icons"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 22 22 2v20Z"/></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21 0 6.6Q2.5 4.45 5.6 3.225 8.7 2 12 2t6.4 1.225Q21.5 4.45 24 6.6Z"/></svg><svg width="24" height="14" viewBox="0 0 26 14"><rect x=".75" y=".75" width="21" height="12.5" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".6"/><rect x="3" y="3" width="14" height="8" rx="1.8" fill="currentColor"/><rect x="23.2" y="4.5" width="2" height="5" rx="1" fill="currentColor" opacity=".6"/></svg></span></div>`;
  const chart = (() => { let y = 60, d = "M0 60"; [8, -6, 10, -4, -12, 6, -8, 14, -10, 4, -14, 8, -6, -10, 12, -8, -4, -12, 6, -10].forEach((v, i) => { y = Math.max(10, Math.min(90, y + v)); d += ` L${(i + 1) * 19} ${y}`; }); return d; })();
  const appHTML = () => `<div class="app"><div class="hero"><div class="hrow"><span class="t">Perps</span><span style="font-size:13px;font-weight:600;background:rgba(255,255,255,.16);padding:6px 10px;border-radius:999px">Phoenix</span></div>` +
    `<div class="tabs"><span class="on">Markets</span><span>Positions</span><span>History</span><span>Account</span></div><div class="mk0"><i></i>SOLUSDC <span style="opacity:.7;font-weight:400">Solana</span></div><div class="px tnum">$187.42</div><div class="chg tnum">+2.31% today</div>` +
    `<svg class="chart" width="380" height="100" viewBox="0 0 380 100"><path d="${chart}" stroke="#32EEE2" stroke-width="2" fill="none"/></svg></div>` +
    `<div class="body"><div class="card"><div class="ls"><span class="on">Long</span><span>Short</span></div><div class="row" style="margin-top:8px"><span>Collateral</span><b class="tnum">10.00 USDC</b></div><div class="row"><span>Leverage</span><b>2x</b></div><button class="cta" id="appCta">Review long</button></div></div>` +
    `<div class="tabbar"><div><i></i>Portfolio</div><div><i></i>Earn</div><div class="mid"><i></i></div><div class="on"><i></i>Trade</div><div><i></i>Farm</div></div></div>`;

  const pathSeg = VAR === "returning"
    ? `<div class="wbox"><div class="lbl">Situation</div><div class="seg wide" role="group" aria-label="Situation"><button data-rpath="r1">Order only · Phoenix holds 25.00 USDC</button><button data-rpath="r2">Add USDC + order · holds 4.20 USDC</button></div></div>` : "";
  const devHTML = () => {
    const groups = [...new Set(Object.values(STATES).map((s) => s.group))];
    return `<details class="dev" id="dev" ${store.get("devOpen", "0") === "1" ? "open" : ""}><summary>Dev controls</summary><div class="dev-in">` +
      `<div class="drow"><span>Speed</span><div class="seg">${[0.5, 1, 2].map((v) => `<button data-speed="${v}">${v}x</button>`).join("")}</div></div>` +
      `<div class="drow"><span>Animation</span><button class="pbtn sm" id="replay">Replay last animation</button><button class="pbtn sm" id="pause">Pause</button></div>` +
      `<div class="drow"><span>Scrub</span><input type="range" id="scrub" min="0" max="1000" value="0" aria-label="Scrub the current animation"><span class="tnum sm" id="scrubV">–</span></div>` +
      `<div class="drow"><span>Look</span><div class="seg"><button data-theme-set="light">Light</button><button data-theme-set="dark">Dark</button></div><label class="toggle"><input type="checkbox" class="rmT"> Reduce motion</label></div>` +
      `<div class="drow"><span>Device</span><div class="seg"><button data-device-set="k50i">Redmi K50i</button><button data-device-set="ultra">Galaxy S Ultra</button></div></div>` +
      `<div class="drow"><span>Phone width</span><div class="seg">${[320, 360, 380, 412].map((v) => `<button data-sw="${v}">${v}</button>`).join("")}</div></div>` +
      `<div class="drow"><span>Layout check</span><label class="toggle"><input type="checkbox" id="bboxT"> Outline boxes</label><label class="toggle"><input type="checkbox" id="longT"> Longest strings</label></div>` +
      `<div class="lcheck tnum" id="lcheck">Layout: checking…</div>` +
      `<div class="dbg tnum" id="dbg">frame 0</div>` +
      `<div class="lbl" style="margin-top:12px">Jump to a state</div>${groups.map((g) => `<div class="cgroup"><div class="cg-l">${g}</div><div class="chips">${Object.entries(STATES).filter(([, s]) => s.group === g).map(([k, s]) => `<button data-jump="${k}">${s.label}</button>`).join("")}</div></div>`).join("")}` +
      `<div class="lbl" id="needsLbl" style="margin-top:12px">Data this state needs</div><ul class="moves" id="needs"></ul></div></details>`;
  };
  document.body.insertAdjacentHTML("beforeend",
    `<header class="top" id="top"></header><main class="stage"><div class="phone-col"><div class="fitbox" id="fitbox"><div class="fit" id="fit"></div></div></div>` +
    `<aside class="panel"><div><h1>${TITLE}</h1><p class="lede">Use the sheet like the app: tap <b>Open long</b>, then answer in the mock Phantom wallet. Nothing moves before you approve. Pick what happens on chain before approving to see each failure.</p></div>` +
    `${pathSeg}<div class="wallet" id="wallet"></div><div id="devHost"></div></aside></main>`);

  function walletHTML() {
    const st = STATES[cur] || {};
    const txs = action === "open" ? PATHS[P].txs : 1;
    const what = action === "open" ? "Open long SOL 2x" : action === "retry" ? "Retry the order" : "Return USDC to your margin account";
    const status = st.wait ? `<b>Vanna</b> asks you to approve ${txs === 1 ? "1 transaction" : `${txs} transactions`}: ${what}` : st.end === "done" ? "Approved · confirmed on Solana" : st.end === "fail" ? (st.key === "rejected" ? "You rejected the request" : st.key === "timeout" ? "The request timed out" : "Approved · sent to Solana") : st.v === "run" ? "Approved · sending" : "No request yet. Tap Open long on the phone.";
    return `<div class="w-hd"><span class="w-logo">${IC.check(14)}</span><b>Phantom</b><span class="w-mock">mock wallet</span></div>` +
      `<div class="w-req ${st.wait ? "on" : ""}">${status}</div>` +
      `<div class="w-btns"><button class="pbtn main" data-w="approve" ${st.wait ? "" : "disabled"}>Approve</button><button class="pbtn" data-w="reject" ${st.wait ? "" : "disabled"}>Reject</button><button class="pbtn" data-w="timeout" ${st.wait ? "" : "disabled"}>Time out</button></div>` +
      `<label class="w-sim"><span>On chain after approval</span><select id="scen" ${action === "open" ? "" : "disabled"}>${SCEN[P].map(([k, l]) => `<option value="${k}" ${k === scen ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
  }
  const syncWallet = () => { $("#wallet").innerHTML = walletHTML(); };

  let cur = null, viewPath = null, stage = null, mascot = null, stateT = 0, lastSub = -1, paused = false;
  function buildDevice() {
    const sw = +store.get("sw", "412");
    $("#fit").innerHTML = `<div class="device ${prefs.device === "ultra" ? "ultra" : ""}" id="device"><i class="key k1"></i><i class="key k2"></i><div class="screen closed" id="screen" style="--sw:${sw}px">${appHTML()}<div class="scrim" id="scrim"></div>` +
      `<div class="sheet" id="sheet"><div class="handle"></div><div class="shead"><div class="title" id="stitle">Review long SOLUSDC</div><button class="xbtn" id="xbtn" aria-label="Close">${IC.close(22)}</button></div><div class="sbody" id="views"></div></div>` +
      `${statusHTML()}<div class="punch"></div><div class="gesture"></div></div></div>`;
    fit();
  }
  function fit() {
    const d = $("#device"); if (!d) return;
    const w = d.offsetWidth, h = d.offsetHeight, mode = store.get("scale", "fit");
    const col = $(".phone-col"), wide = window.innerWidth > 900;
    const auto = Math.max(0.4, Math.min(1.5, ((wide ? col.clientHeight : window.innerHeight - $("#top").offsetHeight - 32) - 16) / h, (col.clientWidth - 8) / w));
    const s = mode === "fit" ? auto : Math.max(0.4, Math.min(1.5, (+mode || 100) / 100));
    $("#fit").style.cssText = `width:${w}px;transform:scale(${s})`;
    $("#fitbox").style.cssText = `width:${w * s}px;height:${h * s}px`;
    $("#scR").value = Math.round(s * 100); $("#scV").textContent = Math.round(s * 100) + "%";
    $$("[data-scale]").forEach((b) => b.classList.toggle("on", b.dataset.scale === mode));
  }

  /* ---------------- views ---------------- */
  function reviewHTML() {
    const legs = P === "r1"
      ? `<div><div class="legL">You open</div><div class="legV">Long SOL 2x</div><div class="legS tnum">0.2668 SOL · about $50.00</div></div>`
      : `<div><div class="legL">You add</div><div class="legV tnum">10.00 USDC</div><div class="legS">From your margin account</div></div><div class="arrow">${IC.down(22)}</div><div><div class="legL">You open</div><div class="legV">Long SOL 2x</div><div class="legS tnum">0.1067 SOL · about $20.00</div></div>`;
    const line = {
      first: "Phoenix is the exchange that runs perps. Your USDC moves there as collateral and comes back when you close.",
      r1: "Phoenix already holds <b class=\"tnum\">25.00 USDC</b> of yours. This order uses it, so nothing new moves.",
      r2: "Phoenix already holds <b class=\"tnum\">4.20 USDC</b> of yours. It will hold <b class=\"tnum\">14.20 USDC</b> after this.",
    }[P];
    const fee = { first: "~0.000015 SOL", r1: "~0.000005 SOL", r2: "~0.00001 SOL" }[P];
    const rows = [["Entry price", "~$187.42"], ["Liquidation price", "~$103.08"], ["Fee", fee], ["Account", "Phantom 7xKX…3fQa"]];
    return `<div class="view v-review"><div class="legs">${legs}</div><div class="notice">${IC.candles(18)}<span>${line}</span></div>` +
      `<div class="rows">${rows.map(([l, v]) => `<div class="row2"><span>${l}</span><b class="tnum">${v}</b></div>`).join("")}</div>` +
      `<button class="btn" data-ev="open">Open long</button>${P === "first" ? `<div class="note">First trade on Phoenix: your trading account is set up in the same approval</div>` : ""}</div>`;
  }
  function runHTML(st) {
    return `<div class="view v-run">${st.kind === "none" ? "" : `<div id="stageHost"></div>`}` +
      `<div class="hd" id="hd"><div class="slot"><div class="a-wrap" id="aw"><div class="a-breath"><div class="face" id="mf" style="width:56px;height:56px"></div></div><div class="ripple" id="rip"></div>` +
      `<div class="a-badge"><div class="ab ab-load">${loaderHTML(22)}</div><div class="ab ab-ok">${drawCheck(16)}</div><div class="ab ab-bad">${IC.close(16)}</div></div></div></div>` +
      `<div class="tt"><div class="h" id="h"></div><div class="cap" id="cap"></div></div><button class="ia explorer" aria-label="View on Solana Explorer">${IC.open(22)}</button></div>` +
      `<div class="prog" id="prog"><div class="bar"><div class="fill" id="fill"><span class="gl"><span class="glint"></span></span></div></div><div class="steps">${["Sent", "Processed", "Confirmed"].map((l, i) => `<div class="step">${i ? '<span class="em"></span>' : ""}<span class="dot"></span><span>${l}</span></div>`).join("")}</div></div>` +
      `<div class="acts" id="acts"></div></div>`;
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
  function setHead(h, c, animate) {
    const tt = $(".tt");
    if ($("#h").textContent === h && $("#cap").textContent === c) return;
    clearTimeout(swapT);
    if (!animate || prefs.rm) { $("#h").textContent = h; $("#cap").textContent = c; return; }
    tt.classList.add("swapout");
    swapT = setTimeout(() => withHeight(() => { $("#h").textContent = h; $("#cap").textContent = c; tt.classList.remove("swapout"); restart(tt, "swapin"); }), 170 / SPEED.v);
  }
  function setTitle(t) {
    const el = $("#stitle"); if (el.textContent === t) return;
    if (prefs.rm || $("#screen").classList.contains("closed")) { el.textContent = t; return; }
    el.classList.add("swapout"); setTimeout(() => { el.textContent = t; el.classList.remove("swapout"); restart(el, "swapin"); }, 170 / SPEED.v);
  }
  function swapView(html, after) {
    const views = $("#views"), old = views.firstElementChild;
    const put = () => withHeight(() => {
      views.innerHTML = html;
      const v = views.firstElementChild;
      [...v.children].forEach((c, i) => c.style.setProperty("--i", i));
      if (!prefs.rm) v.classList.add("enter");
      after && after();
    });
    if (old && !prefs.rm && !$("#screen").classList.contains("closed")) { old.classList.add("leave"); setTimeout(put, 170 / SPEED.v); } else put();
  }

  // fresh: rebuild the view (the stage starts at this state without transitions)
  function go(key, o = {}) {
    const st = STATES[key]; if (!st) return;
    cur = key; stateT = 0; lastSub = -1;
    setTitle(st.title);
    if (st.v === "review") {
      swapView(reviewHTML()); viewPath = null; stage = null;
    } else if (!o.fresh && viewPath === P && $(".v-run")) {
      enterRun(st, false);
    } else {
      swapView(runHTML(st), () => {
        viewPath = P;
        stage = st.kind === "none" ? null : new Stage($("#stageHost"));
        mascot = new Mascot($("#mf"), 56);
        enterRun(st, true);
      });
    }
    syncWallet();
    $$("[data-jump]").forEach((b) => b.classList.toggle("on", b.dataset.jump === key));
    const nl = $("#needsLbl"); if (nl) nl.textContent = `Data this state needs · ${st.label}`;
    const nd = $("#needs"); if (nd) nd.innerHTML = (st.needs || ["Path, amounts and the user's Phoenix balance (see NOTES.md)"]).map((m) => `<li>${m}</li>`).join("");
  }
  function enterRun(st, fresh) {
    const aw = $("#aw"); if (!aw) return;
    aw.classList.remove("drawn");
    aw.dataset.s = st.wait ? (st.longWait ? "long" : "wallet") : st.end === "done" ? "done" : st.end === "fail" ? "fail" : "sent";
    mascot.reset();
    if (st.wait) mascot.mode(st.longWait ? "patient" : "idle");
    else if (st.end === "done") { mascot.mode("track"); mascot.near = [0.6, 0.1]; mascot.far = [0.4, 0.2]; mascot.render(); mascot.strike(); void aw.offsetWidth; aw.classList.add("drawn"); restart($("#rip"), "go"); }
    else if (st.end === "fail") { mascot.set(st.kind2 ? { eyeNear: "sad", mouth: "wavy" } : { eyes: "sad", mouth: "line" }); mascot.mode("off"); restart($("#hd"), "shake"); }
    else { mascot.mode("track"); mascot.look([0.3, 0.8], [0.2, 0.8]); }
    $(".v-run").dataset.s = st.wait ? "wait" : st.end || "run";
    withHeight(() => {
      $("#acts").innerHTML = (st.acts || []).map(([l, ev, cls]) => `<button class="${cls}" data-ev="${ev}">${l}</button>`).join("");
      if (!prefs.rm && st.end && !fresh) restart($("#acts"), "rise");
      $(".explorer").style.display = st.end === "done" ? "" : "none";
    });
    update(0, true, fresh);
  }
  function update(dt, force, instant) {
    const st = STATES[cur]; if (!st || st.v !== "run" || !$("#hd")) return;
    const d = st.d || 1;
    const f = st.d ? Math.min(1, stateT / d) : 1;
    const sb = st.wait ? 0 : st.end === "done" ? 3 : st.end === "fail" ? -1 : st.sb(f);
    if (stage) stage.apply(st.stage(f), !!instant);
    if (sb !== lastSub || force) {
      lastSub = sb;
      setHead(st.h, st.cap, !instant);
      $("#fill").style.width = sb < 0 ? "0%" : [8, 33, 66, 100][sb] + "%";
      $$(".step", $("#prog")).forEach((el, i) => { const on = sb > i; if (on && !el.classList.contains("lit")) restart(el, "pop"); el.classList.toggle("lit", on); el.classList.toggle("next", sb >= 0 && sb < 3 && i === sb); });
    }
    if (stage) stage.frame(dt * SPEED.v);
  }

  /* ---------------- events: sheet buttons, the mock wallet, the app screen ---------------- */
  function openReview() {
    const sc = $("#screen");
    cur = null; viewPath = null; stage = null; $("#views").innerHTML = ""; action = "open";
    go("review");
    requestAnimationFrame(() => requestAnimationFrame(() => sc.classList.remove("closed")));
  }
  function closeSheet(then) { $("#screen").classList.add("closed"); cur = null; syncWallet(); if (then) setTimeout(then, 520 / SPEED.v); }
  function onEv(ev) {
    if (ev === "open") { action = "open"; go("wait"); }
    else if (ev === "again") go(action === "open" ? "wait" : action === "retry" ? "retryWait" : "retWait");
    else if (ev === "retry") { action = "retry"; go("retryWait"); }
    else if (ev === "return") { action = "return"; go("retWait"); }
    else if (ev === "reset") closeSheet(openReview);
    else if (ev === "close") closeSheet();
  }
  function approve() {
    const st = STATES[cur]; if (!st || !st.wait) return;
    const startKey = action === "open" ? (P === "first" ? "setup" : "run") : action === "retry" ? "retryRun" : "retRun";
    lastRun = startKey; go(startKey);
  }
  document.addEventListener("click", (e) => {
    const evb = e.target.closest("[data-ev]"); if (evb && evb.closest("#views")) { onEv(evb.dataset.ev); return; }
    if (e.target.closest("#xbtn") || e.target.closest("#scrim")) { closeSheet(); return; }
    if (e.target.closest("#appCta")) { if ($("#screen").classList.contains("closed")) openReview(); return; }
    const w = e.target.closest("[data-w]");
    if (w && !w.disabled) { if (w.dataset.w === "approve") approve(); else go(w.dataset.w === "reject" ? "rejected" : "timeout"); return; }
    const rp = e.target.closest("[data-rpath]");
    if (rp) { P = rp.dataset.rpath; store.set("rpath", P); STATES = buildStates(P); scen = "ok"; mountDev(); syncPath(); closeSheet(openReview); return; }
    const scb = e.target.closest("[data-scale]"); if (scb) { store.set("scale", scb.dataset.scale); fit(); return; }
    const sp = e.target.closest("[data-speed]"); if (sp) { SPEED.v = +sp.dataset.speed; store.set("speed", sp.dataset.speed); syncDev(); return; }
    const swb = e.target.closest("[data-sw]"); if (swb) { store.set("sw", swb.dataset.sw); $("#screen").style.setProperty("--sw", swb.dataset.sw + "px"); fit(); syncDev(); const k = cur; if (k && STATES[k].v === "run") go(k, { fresh: true }); return; }
    const sc = e.target.closest("[data-jump]"); if (sc) { const k = sc.dataset.jump, s = STATES[k]; if (s.v === "run" && !s.wait && !s.end) lastRun = k; if (/^ret(Wait|Run|Done)/.test(k)) action = "return"; else if (/^retry/.test(k)) action = "retry"; else action = "open"; $("#screen").classList.remove("closed"); go(k, { fresh: true }); return; }
    if (e.target.closest("#replay")) { if (lastRun) { $("#screen").classList.remove("closed"); paused = false; syncDev(); go(lastRun, { fresh: true }); } return; }
    if (e.target.closest("#pause")) { paused = !paused; document.documentElement.classList.toggle("paused", paused); syncDev(); return; }
  });
  document.addEventListener("change", (e) => { if (e.target.id === "scen") scen = e.target.value; });
  document.addEventListener("input", (e) => {
    if (e.target.id === "scR") { store.set("scale", e.target.value); fit(); }
    if (e.target.id === "scrub") {
      const st = STATES[cur]; if (!st || !st.d) return;
      paused = true; document.documentElement.classList.add("paused"); syncDev();
      stateT = (+e.target.value / 1000) * st.d; lastSub = -1; update(0, true, false);
    }
    if (e.target.id === "bboxT") document.documentElement.classList.toggle("bbox", e.target.checked);
    if (e.target.id === "longT") { LONG.on = e.target.checked; const st = STATES[cur]; if (stage && st && st.v === "run") stage.apply(st.stage(st.d ? Math.min(1, stateT / st.d) : 1), true); }
  });
  document.addEventListener("toggle", (e) => { if (e.target.id === "dev") store.set("devOpen", e.target.open ? "1" : "0"); }, true);

  function syncPath() { $$("[data-rpath]").forEach((b) => b.classList.toggle("on", b.dataset.rpath === P)); }
  function syncDev() {
    $$("[data-speed]").forEach((b) => b.classList.toggle("on", +b.dataset.speed === SPEED.v));
    $$("[data-sw]").forEach((b) => b.classList.toggle("on", b.dataset.sw === store.get("sw", "412")));
    const pb = $("#pause"); if (pb) pb.textContent = paused ? "Resume" : "Pause";
  }
  function mountDev() { $("#devHost").innerHTML = devHTML(); syncChrome(); syncDev(); }

  /* ---------------- the clock: running states play once, then hand over (or stop at the chosen failure) ---------------- */
  let frameN = 0, last = 0, lastCheck = 0;
  function tick(ts) {
    const dt = last ? Math.min(64, ts - last) : 16; last = ts; frameN++;
    const st = STATES[cur];
    if (st && !paused && !$("#screen").classList.contains("closed")) {
      stateT += dt * SPEED.v;
      const f = st.d ? stateT / st.d : 0;
      const fa = action === "open" && scen !== "ok" ? (FAIL_AT[P] || {})[scen] : null;
      if (st.wait && st.long && stateT > 60000) go(st.long);
      else if (fa && cur === fa[0] && f >= fa[1]) go(fa[2]);
      else if (st.d && st.next && stateT >= st.d) go(st.next);
    }
    update(paused ? 0 : dt, false, false);
    if (document.getAnimations) document.getAnimations().forEach((a) => { if (a.playbackRate !== SPEED.v) a.playbackRate = SPEED.v; });
    if (frameN % 4 === 0) {
      const s2 = STATES[cur];
      const sv = $("#scrubV"), sr = $("#scrub");
      if (sv && sr) { if (s2 && s2.d) { if (!paused) sr.value = Math.round(Math.min(1, stateT / s2.d) * 1000); sv.textContent = `${(Math.min(stateT, s2.d) / 1000).toFixed(1)} / ${(s2.d / 1000).toFixed(1)} s`; } else sv.textContent = "–"; }
      const dbg = $("#dbg"); if (dbg) dbg.textContent = `frame ${frameN} · ${SPEED.v}x · ${s2 ? s2.label : "sheet closed"}${paused ? " · paused" : ""}`;
    }
    if (ts - lastCheck > 500) {
      lastCheck = ts;
      const lc = $("#lcheck");
      if (lc) { const issues = stage ? layoutCheck() : []; const w = +store.get("sw", "412"); lc.innerHTML = issues.length ? `<b class="bad">Layout: ${issues.length} issue(s) at ${w} px</b><br>${issues.slice(0, 6).join("<br>")}` : `Layout: nothing outside the stage or the card at ${w} px${stage ? "" : " (no stage in this state)"}`; }
    }
    requestAnimationFrame(tick);
  }

  wireChrome((what) => {
    if (what === "device") { buildDevice(); openReview(); }
    else if (what === "theme") { if (mascot) mascot.render(); }
    else { const k = cur; if (k) go(k, { fresh: true }); }
  });
  buildDevice(); mountDev(); syncPath(); syncWallet();
  window.addEventListener("resize", fit);
  const startKey = qs.get("state");
  if (startKey && STATES[startKey]) { go(startKey, { fresh: true }); $("#screen").classList.remove("closed"); } else openReview();
  requestAnimationFrame(tick);
  if (document.fonts) document.fonts.ready.then(fit);
})();