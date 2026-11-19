/* The approved Phoenix first-time stage (design/perps-flow/first-time.html), shared so other prototypes reuse it unchanged.
   The Stage class below is copied verbatim from perps.js; only the small helpers it needs are defined here.
   window.PhoenixStage = { Stage, base }  (base: the stage flags, as in perps.js). */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const svg = (d, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  const IC = {
    close: (s) => svg("M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6z", s),
    check: (s) => svg("M9.55 18 3.85 12.3l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z", s),
    bank: (s) => svg("M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z", s),
    candles: (s) => svg("M7 3h2v3h1.5v10H9v5H7v-5H5.5V6H7zm8 3h2v4h1.5v8H17v3h-2v-3h-1.5v-8H15z", s),
  };
  const easeIO3 = (c) => (c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2);
  const outCubic = (t) => 1 - Math.pow(1 - t, 3);
  const restart = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  // the host page sets these (speed and reduce motion)
  const SPEED = (window.PhoenixStageEnv = window.PhoenixStageEnv || { v: 1 });
  const prefs = { get rm() { return document.documentElement.classList.contains("rm"); } };
  const LONG = { on: false };
  const base = (o) => ({ ph: "docked", path: "off", ms: "plan", mk: "idle", chip: "off", phBad: false, m: 42.5, p: 0, l2: "No position yet", mkv: "$187.42", ...o });
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

  window.PhoenixStage = { Stage, base };
})();