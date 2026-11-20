/* Lend pool detail prototype. Pool figures, rate curves and addresses come from window.POOLS_READ (a read-only snapshot of the fork,
   see NOTES.md). The position and the activity rows are SAMPLE data (marked in the side panel). Maths and formats are the website's
   (apps/solana/components/earn/v3/earn-pool-tabs.tsx, earn-format.ts, lib/solana/math.ts). */
(function () {
  "use strict";
  const R = window.POOLS_READ, LOGOS = window.LOGOS || {};
  const ORDER = ["SOL", "USDC", "USDT", "SKR"].filter((s) => R.pools[s]);
  const P = (s) => R.pools[s];

  /* ---------- sample data (not on chain) ---------- */
  const SAMPLE_POS = { SOL: { shares: 1, earned: 0 }, USDC: { shares: 1996.0, earned: 2.35 }, USDT: { shares: 119.9, earned: 0.12 }, SKR: { shares: 5000, earned: 0.00002 } };
  const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  function fakeSig(seed, start, end) {
    let x = seed * 9301 + 49297, s = "";
    for (let i = 0; i < 88; i++) { x = (x * 1103515245 + 12345) % 2147483648; s += B58[x % 58]; }
    return (start || "") + s.slice((start || "").length, 88 - (end || "").length) + (end || "");
  }
  const D = (y, mo, d, h, mi, se) => new Date(y, mo - 1, d, h, mi, se).getTime();
  const SAMPLE_ACT = {
    SOL: [
      { ms: D(2026, 11, 18, 9, 14, 2), type: "Withdraw", amt: 0.5, ok: false, sig: fakeSig(11) },
      { ms: D(2026, 10, 30, 20, 30, 53), type: "Supply", amt: 1, ok: true, sig: fakeSig(12, "2wUnjSjD", "G7bt") },
    ],
    USDC: [
      { ms: D(2026, 11, 12, 18, 2, 9), type: "Withdraw", amt: 250, ok: false, sig: fakeSig(21) },
      { ms: D(2026, 10, 7, 9, 12, 40), type: "Supply", amt: 500, ok: true, sig: fakeSig(22) },
      { ms: D(2026, 8, 20, 8, 30, 12), type: "Supply", amt: 1500, ok: true, sig: fakeSig(23) },
    ],
    USDT: [{ ms: D(2026, 11, 3, 14, 22, 31), type: "Supply", amt: 120, ok: true, sig: fakeSig(31) }],
    SKR: [
      { ms: D(2026, 11, 17, 11, 5, 44), type: "Supply", amt: 5000, ok: true, sig: fakeSig(41) },
      { ms: D(2026, 11, 17, 11, 3, 10), type: "Supply", amt: 5000, ok: false, sig: fakeSig(42) },
    ],
  };

  /* ---------- formats (website earn-format.ts, app format.ts) ---------- */
  const nf = (n, d) => (+n || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const usd = (n) => "$" + nf(n, 2);
  const pct = (n, d = 2) => nf(n, d) + "%";
  const cNum = (n) => { const a = Math.abs(n); return a >= 1e6 ? nf(n / 1e6, 2) + "M" : a >= 1e3 ? nf(n / 1e3, 1) + "K" : nf(n, 2); };
  const cUsd = (n) => "$" + cNum(n);
  const fT = (n) => (!(n > 0) ? "0" : n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(2) + "K" : n < 0.01 ? n.toFixed(6).replace(/\.?0+$/, "") : n.toFixed(2));
  const fQ = (n, d = 4) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(2) + "K" : n.toFixed(d));
  const fL = (n) => fQ(n, 2);
  const fP = (n) => (+n || 0).toFixed(2) + "%";
  const fLoc = (n, d = 6) => (+n || 0).toLocaleString("en-US", { maximumFractionDigits: d });
  const fXr = (x) => x.toFixed(9).replace(/\.?0+$/, "");
  const shortAddr = (a) => (a.length > 14 ? a.slice(0, 6) + "…" + a.slice(-6) : a);
  const wadStr = (n) => n.toLocaleString("en-US", { maximumFractionDigits: 6 });
  const pxStr = (px) => (px > 0 ? "$" + px.toFixed(px < 1 ? 4 : 2) : "$0.00");
  const tsStr = (ms) => new Date(ms).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const explorer = (kind, v) => `https://explorer.solana.com/${kind}/${v}?cluster=custom&customUrl=${encodeURIComponent(R.rpc)}`;

  /* ---------- rate maths (lib/solana/math.ts, bigint, exact) ---------- */
  const WAD = 10n ** 18n, HALF = WAD / 2n, SPY = 31556952n;
  function wadPow(b, e) { const m = (a, c) => (a * c + HALF) / WAD; if (b === 0n) return e === 0 ? WAD : 0n; let r = e % 2 === 1 ? b : WAD, k = Math.floor(e / 2), x = b; while (k > 0) { x = m(x, x); if (k % 2 === 1) r = m(r, x); k = Math.floor(k / 2); } return r; }
  const curveOf = (s) => { const c = P(s).rateCurveWad; return { linear: BigInt(c.linear), jump: BigInt(c.jump), mult: BigInt(c.mult) }; };
  const perSec = (c, u) => (c.mult * ((u * c.linear) / WAD + (wadPow(u, 32) * c.linear) / WAD + (wadPow(u, 64) * c.jump) / WAD)) / (SPY * WAD);
  const uWad = (u) => BigInt(Math.round(Math.max(0, Math.min(1, u)) * 1e9)) * 10n ** 9n;
  const borrowAt = (c, u) => Number((perSec(c, uWad(u)) * SPY * 1000000000n) / WAD) / 1e9;
  const supplyAt = (c, u, rfBps) => { const w = uWad(u); return borrowAt(c, u) * (Number((w * 1000000000n) / WAD) / 1e9) * (1 - rfBps / 10000); };
  const rateFn = (s, kind) => { const c = curveOf(s), rf = P(s).reserveFactorBps; return kind === "bor" ? (u) => borrowAt(c, u) : (u) => supplyAt(c, u, rf); };

  /* ---------- icons (Material Symbols outlines) ---------- */
  const I = {
    back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
    share: "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z",
    chev: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
    more: "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z",
    copy: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
    open: "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
    info: "M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    full: "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    checkc: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
    clock: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
    drag: "M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z",
    pie: "M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z",
    piggy: "M19.83 7.5l-2.27-2.27c.07-.42.18-.81.32-1.15A1.498 1.498 0 0 0 16.5 2c-1.64 0-3.09.79-4 2h-5C4.46 4 2 6.46 2 9.5S4.5 21 4.5 21H10v-2h2v2h5.5l1.68-5.59 2.82-.94V7.5h-2.17zM13 9H8V7h5v2zm3 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z",
    candle: "M9 4H7v2H5v12h2v2h2v-2h2V6H9zm10 4h-2V4h-2v4h-2v7h2v5h2v-5h2z",
    leaf: "M6.05 8.05a7.007 7.007 0 0 0-.02 9.88c1.47-3.4 4.09-6.24 7.36-7.93A15.952 15.952 0 0 0 8.67 19.4c2.61 1.23 5.8.79 7.96-1.38C20.12 14.53 20 4 20 4S9.53 3.88 6.05 8.05z",
    bolt: "M7 2v11h3v9l7-12h-4l4-8z",
  };
  const ic = (k, size = 24, fill = "currentColor") => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path fill="${fill}" d="${I[k]}"/></svg>`;
  const logo = (s, size = 40, cls = "logo") => `<img class="${cls}" src="${LOGOS[s] || ""}" width="${size}" height="${size}" alt="">`;

  /* ---------- state ---------- */
  const TABS = [["position", "Position"], ["details", "Details"], ["activity", "Activity"], ["collateral", "Collateral"], ["analytics", "Analytics"]];
  const S = { pool: "SOL", width: 360, has: true, tab: "position", kind: "dep", menu: false, full: false, tip: null, marks: true };
  let toastTimer = 0, tabScroll = 0;

  /* ---------- derived per pool ---------- */
  function model(s) {
    const p = P(s), px = p.oraclePrice || 0;
    const pos = S.has ? SAMPLE_POS[s] : null;
    const supplied = pos ? pos.shares * p.exchangeRate : 0;
    return { p, px, s, v: "v" + s, pos, supplied, util: p.utilization * 100, free: Math.max(0, p.totalSupplied - p.totalBorrowed) };
  }

  /* ---------- tooltips (website copy, earn-pool-tabs.tsx) ---------- */
  function tipText(key, m) {
    const s = m.s;
    return {
      avail: [`Available liquidity`, `${s} in the pool that is not lent out, so borrowers can take it and suppliers can withdraw it.`],
      sapy: ["Supply APY", "Yearly interest suppliers earn now: borrow rate × utilization × (1 − reserve factor), from the on-chain rate curve."],
      bapy: ["Borrow APY", "Yearly interest borrowers pay now; it moves with utilization."],
      util: ["Utilization rate", "Share of the supplied assets that is currently borrowed."],
      bonus: ["Liquidation bonus", "Extra paid to a liquidator who takes this asset from a margin account at health factor 1.10 or below."],
      oracle: ["Oracle price", "Price the program uses to value this asset."],
      xr: ["Share token exchange rate", `How much ${s} one ${m.v} share is worth; it rises as interest accrues.`],
      rf: ["Reserve factor", "Part of the interest borrowers pay that the protocol keeps instead of passing to suppliers."],
      scap: ["Supply cap", "Most this pool accepts in total; Uncapped means no limit."],
      bcap: ["Borrow cap", "Most that can be borrowed from this pool in total; Uncapped means no limit."],
      status: ["Status", "Active: all actions. Supply only: no new borrows. Repay only: no supply or borrow. Frozen: repay only."],
      curve: ["Rate curve", "Yearly borrow rate = multiplier × (linear × (u + u³²) + jump × u⁶⁴): slow at first, then steep at high utilization."],
      tsup: ["Total supplied", `All ${s} supplied to this pool; the ring shows the part not borrowed.`],
      tbor: ["Total borrowed", `${s} borrowed from this pool by margin accounts; the ring shows utilization.`],
    }[key];
  }

  /* ---------- phone ---------- */
  function phoneH() { return S.width === 360 ? 780 : 892; }
  function renderPhone() {
    const host = document.getElementById("phone");
    const oldScroll = host.querySelector(".scroll");
    const keep = oldScroll ? oldScroll.scrollTop : 0;
    const oldRow = host.querySelector(".ptw .sc");
    if (oldRow) tabScroll = oldRow.scrollLeft;
    const m = model(S.pool);
    host.innerHTML = `
      <div class="device"><div class="screen ${S.marks ? "" : "hide-marks"}" id="screen" style="width:${S.width}px;height:${phoneH()}px">
        <div class="punch"></div>
        <div class="statusbar"><span>3:40</span><span class="icons">
          <svg width="16" height="12" viewBox="0 0 16 12"><path fill="currentColor" d="M1 9h2v3H1zM5 6h2v6H5zM9 3h2v9H9zM13 0h2v12h-2z" opacity=".9"/></svg>
          <svg width="16" height="12" viewBox="0 0 24 18"><path fill="currentColor" d="M12 18l4-5c-1.1-.8-2.5-1.3-4-1.3s-2.9.5-4 1.3zm-9-12l2 2.5C7 6.6 9.4 5.5 12 5.5s5 1.1 7 3L21 6C18.6 3.6 15.5 2.2 12 2.2S5.4 3.6 3 6zm4 5l2 2.5c.8-.6 1.9-1 3-1s2.2.4 3 1l2-2.5c-1.4-1.1-3.1-1.8-5-1.8s-3.6.7-5 1.8z"/></svg>
          <svg width="24" height="12" viewBox="0 0 24 12"><rect x=".5" y=".5" width="20" height="11" rx="3" fill="none" stroke="currentColor" opacity=".6"/><rect x="2" y="2" width="15" height="8" rx="1.5" fill="currentColor"/><rect x="21.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".6"/></svg>
        </span></div>
        <div class="hdr"><button class="hbtn" data-act="back" aria-label="Back">${ic("back")}</button></div>
        <div class="scroll" id="scroll"><div class="body" id="body">${headerCard(m)}${tabRow()}<div class="swap" id="tabc">${tabBody(m)}</div></div></div>
        <div class="foot">${m.pos ? `<button class="btn outline" data-act="toast" data-msg="Opens Withdraw (unchanged)">Withdraw</button>` : ""}<button class="btn primary" data-act="toast" data-msg="Opens Supply (unchanged)">Supply</button></div>
        <div class="tabbar" aria-hidden="true">
          <div class="tb"><span class="pill">${ic("pie", 22)}</span>Portfolio</div>
          <div class="tb on"><span class="pill">${ic("piggy", 22)}</span>Lend</div>
          <div class="tb mid"><span class="fab">${ic("bolt", 24, "#fff")}</span>Margin</div>
          <div class="tb"><span class="pill">${ic("candle", 22)}</span>Trade</div>
          <div class="tb"><span class="pill">${ic("leaf", 22)}</span>Farm</div>
        </div>
        ${S.full ? fullView(m) : ""}
        <div class="navbar">
          <button data-act="back" aria-label="Back (Android)"><svg width="18" height="18" viewBox="0 0 18 18"><path d="M13 2 L4 9 L13 16 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>
          <button aria-label="Home" disabled><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>
          <button aria-label="Recent apps" disabled><svg width="18" height="18" viewBox="0 0 18 18"><rect x="3" y="3" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>
        </div>
        <div class="toast" id="toast" hidden></div>
      </div></div>`;
    // Restore the scroll AFTER the charts are drawn: before that the chart has no height, the content is shorter and the
    // browser clamps scrollTop (this sent the page back to the top when the dropdown or full screen re-rendered it).
    afterRender();
    host.querySelector(".scroll").scrollTop = keep;
  }

  function headerCard(m) {
    const p = m.p;
    return `<div class="card">
      <div class="vh">${logo(m.s)}<div class="sym">${m.s}</div><div class="apy"><b class="num">${pct(p.supplyApr * 100)}</b><span class="cap">Supply APY</span></div></div>
      <div class="pairs">
        <div class="pair"><span class="l">Total supply</span><span class="v num">${cNum(p.totalSupplied)}</span><span class="s num">${cUsd(p.totalSupplied * m.px)}</span></div>
        <div class="pair"><span class="l">Available</span><span class="v num">${cNum(m.free)}</span><span class="s num">${cUsd(m.free * m.px)}</span></div>
        <div class="pair"><span class="l">Utilization</span><span class="v num changed">${pct(m.util, 2)}</span></div>
      </div></div>`;
  }

  function tabRow() {
    return `<div class="ptw" id="ptw"><div class="sc" id="tabsc"><div class="row" role="tablist">${TABS.map(([k, l]) => `<button class="chip ${k === S.tab ? "on" : ""}" role="tab" aria-selected="${k === S.tab}" data-tab="${k}"><span class="${k === "analytics" ? "changed" : ""}">${l}</span></button>`).join("")}</div></div>
      <div class="mask l" hidden></div><div class="mask r" hidden></div>
      <button class="arr l" data-act="nudge" data-dir="-1" aria-label="Scroll tabs left" hidden><span>${ic("chev", 18)}</span></button>
      <button class="arr r" data-act="nudge" data-dir="1" aria-label="Scroll tabs right" hidden><span>${ic("chev", 18)}</span></button></div>`;
  }

  function tabBody(m) {
    if (S.tab === "position") return position(m);
    if (S.tab === "details") return details(m);
    if (S.tab === "activity") return activity(m);
    if (S.tab === "collateral") return collateral(m);
    return analytics(m);
  }

  function mascot(awake) {
    const C = window.Chameleon;
    if (!C) return "";
    const a = C.markA(awake ? { colours: C.MODULE_SKIN.earn } : { colours: C.MODULE_SKIN.earn, eyes: "closed", mouth: "line" });
    return `<svg class="mascot" viewBox="${a.vb}" aria-hidden="true">${a.svg}</svg>`;
  }

  // One line from the pool's real supply APY. Zero (nothing borrowed, SKR today) and tiny rates get honest wording.
  function emptyLine(m) {
    const v = m.p.supplyApr * 100;
    if (!(v > 0)) return `Supply ${m.s} to earn interest once margin accounts borrow it. Today's rate is <b class="num">0.00%</b>.`;
    const t = v < 0.01 ? "under 0.01%" : pct(v);
    return `Supply ${m.s} to earn <b class="num">${t}</b> a year, added every second.`;
  }

  /* ---------- Position ---------- */
  function position(m) {
    if (!m.pos)
      return `<div class="card empty pempty changed">${mascot(true)}<h3>No position yet</h3>
        <p>${emptyLine(m)}</p>
        <button class="btn primary sm" data-act="toast" data-msg="Opens Supply (unchanged)">Supply ${m.s}</button></div>`;
    const e = Math.max(0, m.pos.earned);
    return `<div class="card">
      <div class="pv"><b class="big num">${usd(m.supplied * m.px)}</b><button class="iact" data-act="toast" data-msg="Opens the share card (unchanged)" aria-label="Share ${m.s} position"><span>${ic("share", 22)}</span></button></div>
      <div class="strip changed">
        <div class="cell"><span class="lb">Supplied</span><span class="v num">${fT(m.supplied)} ${m.s}</span></div><span class="dv"></span>
        <div class="cell"><span class="lb">Shares</span><span class="v num">${fT(m.pos.shares)} ${m.v}</span></div><span class="dv"></span>
        <div class="cell"><span class="lb">Interest earned</span><span class="v num">${fT(e)} ${m.s}</span><span class="s num">${usd(e * m.px)}</span></div>
      </div></div>`;
  }

  /* ---------- Details ---------- */
  function details(m) {
    const p = m.p, s = m.s, u = (n) => "$" + fL(n * m.px);
    const util = Math.max(0, Math.min(100, m.util)), supPct = p.totalSupplied > 0 ? 100 - util : 0;
    const a = p.asset, o = p.oracle, c = p.rateCurve;
    const cap = (v, used) => (v === null ? ["Uncapped"] : [`${fL(v)} ${s}`, `${Math.min(100, (used / v) * 100).toFixed(2)}% used`]);
    // Oracle source in the app's own wording (risk.ts oracleLabel): "Kamino Scope, Pyth fallback" / "Pyth"
    const src = o ? o.source.replace(" → Pyth fallback", ", Pyth fallback") : "—";
    const stats = [
      ["Available liquidity", `${fL(p.availableLiquidity)} ${s}`, u(p.availableLiquidity)],
      ["Supply APY", fP(p.supplyApr * 100), `${fL(p.totalSupplied)} ${s}`],
      ["Borrow APY", fP(p.borrowApr * 100)],
      ["Utilization", fP(p.utilization * 100)],
      ["Liquidation bonus", a ? fP(a.liqBonusBps / 100) : "—", "Liquidatable at HF 1.10 or below"],
      ["Reserve factor", fP(p.reserveFactorBps / 100)],
      ["Status", p.status],
      ["Rate curve", `×${wadStr(c.mult)}`, `linear ${wadStr(c.linear)} · jump ${wadStr(c.jump)}`],
    ];
    const oracle = [["Price", pxStr(m.px)], ["Source", src], ["Max price age", o && o.maxAgeSecs > 0 ? `${o.maxAgeSecs}s` : "—"]];
    const limits = [["Exchange rate", fXr(p.exchangeRate), `${s} per ${m.v}`], ["Supply cap", ...cap(p.supplyCap, p.totalSupplied)], ["Borrow cap", ...cap(p.borrowCap, p.totalBorrowed)]];
    const rowsHtml = (rows) => rows.map(([l, v, sub]) => `<div class="srow"><span class="sl">${esc(l)}</span><span class="sv"><b class="num">${esc(v)}</b>${sub ? `<small class="num">${esc(sub)}</small>` : ""}</span></div>`).join("");
    const ring = (pc, col, label, main, sub, legend) => {
      const r = 30, C = 2 * Math.PI * r, len = Math.max(0, Math.min(100, pc)) / 100 * C;
      return `<div class="ring">
        <span class="gauge"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="${r}" fill="none" stroke="#2C2C2C" stroke-width="6"/>${len > 0.01 ? `<circle cx="36" cy="36" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}"/>` : ""}</svg><b class="num">${fP(pc)}</b></span>
        <span class="rt"><span class="rl">${label}</span><span class="rv num">${main}</span><span class="rs num">${sub}</span><span class="rk"><i style="background:${col}"></i>${legend}</span></span></div>`;
    };
    const pyth = p.addresses.scopePrices ? "Pyth Fallback Feed" : "Pyth Feed"; // SKR: Pyth is its only feed
    const addrs = [
      [`${m.v} Share Mint`, p.addresses.shareMint], [`${s} Reserve`, p.addresses.reserve], ["Liquidity Vault", p.addresses.liquidityVault],
      ["Asset Config", p.addresses.assetConfig], ["Scope Prices", p.addresses.scopePrices], [pyth, p.addresses.pythFallback],
      [`${s} Mint`, p.addresses.mint], ["Vanna Lending Program", p.addresses.program],
    ].filter(([, a]) => a); // an address the pool does not use (SKR has no Scope Prices) is hidden
    return `<h2 class="st">Statistics</h2>
      <div class="card stats changed">
        <div class="rings">
          ${ring(supPct, "#32EEE2", "Total supplied", `${fL(p.totalSupplied)} ${s}`, u(p.totalSupplied), `${fP(supPct)} available`)}
          ${ring(util, "#CBB6FA", "Total borrowed", `${fL(p.totalBorrowed)} ${s}`, u(p.totalBorrowed), `${fP(util)} borrowed`)}
        </div>
        <div class="rows">${rowsHtml(stats)}</div>
      </div>
      <h2 class="st">Oracle</h2>
      <div class="card list">${rowsHtml(oracle)}</div>
      <h2 class="st">Limits</h2>
      <div class="card list changed">${rowsHtml(limits)}</div>
      <h2 class="st" id="addresses">Contracts</h2>
      <div class="card list changed">${addrs.map(([l, a]) => `<div class="addr"><div class="al"><span>${esc(l)}</span><code>${shortAddr(a)}</code></div><button class="ib" data-act="copy" data-v="${a}" aria-label="Copy ${esc(l)} address">${ic("copy", 20)}</button><button class="ib" data-act="open" data-v="${explorer("address", a)}" aria-label="Open ${esc(l)} in explorer">${ic("open", 20)}</button></div>`).join("")}</div>`;
  }

  /* ---------- Activity ---------- */
  function activity(m) {
    const rows = m.pos ? SAMPLE_ACT[m.s] || [] : [];
    if (!rows.length) return `<div class="card empty">${mascot()}<h3>No transactions yet</h3></div>`;
    const n = rows.length;
    return `<div class="acth"><h2 class="st">Your transactions</h2><span>${n} transaction${n === 1 ? "" : "s"}</span></div>
      <div class="card actl changed">${rows.map((r) => {
        const d = new Date(r.ms);
        return `<div class="tx ${r.ok ? "" : "failed"}">
          <div class="txtop"><div class="tl"><div class="badges"><span class="bdg ${r.type === "Supply" ? "teal" : "grey"}">${r.type}</span><span class="bdg ${r.ok ? "ok" : "bad"}">${r.ok ? "Success" : "Failed"}</span></div>
            <span class="t num">${d.toLocaleDateString("en-US")} · ${d.toLocaleTimeString("en-US")}</span></div>
            <div class="tr"><span class="amt num">${logo(m.s, 18, "")}${fLoc(r.amt, 6)} ${m.s}</span><span class="t num">${m.px > 0 ? usd(r.amt * m.px) : ""}</span></div></div>
          <button class="txh" data-act="open" data-v="${explorer("tx", r.sig)}" aria-label="Open transaction ${r.sig.slice(0, 8)} in explorer"><span class="k">Tx hash</span><span class="h">${r.sig.slice(0, 8)}…${r.sig.slice(-4)}</span>${ic("open", 16)}</button>
        </div>`;
      }).join("")}</div>
      <button class="lnk" data-act="toast" data-msg="Opens your wallet on Solana Explorer">View all on Solana Explorer ${ic("open", 16)}</button>`;
  }

  /* ---------- Collateral (unchanged) ---------- */
  function collateral() {
    return `<h2 class="st">Assets on a margin account</h2><div class="card ctab">
      <div class="ch"><span class="cap">Asset</span><span class="cap">Max LTV</span><span class="cap">Borrow</span><span class="cap">Liq. bonus</span></div>
      ${ORDER.map((s) => { const a = P(s).asset; return `<div class="cr"><div>${logo(s, 28, "")}${s}</div><span class="num">${a && a.collateral ? pct(a.ltvBps / 100, 0) : "—"}</span><div style="display:grid;place-items:center;color:var(--positive)">${a && a.borrow ? ic("checkc", 18) : "—"}</div><span class="num">${a ? pct(a.liqBonusBps / 100, a.liqBonusBps % 100 ? 1 : 0) : "—"}</span></div>`; }).join("")}
    </div>`;
  }

  /* ---------- Analytics ---------- */
  const KIND = { dep: "Deposit APY", bor: "Borrow APY" };
  function chartHead(m, isFull) {
    const p = m.p, cur = (S.kind === "bor" ? p.borrowApr : p.supplyApr) * 100;
    return `<div class="${isFull ? "fh" : "ach"}">
        <button class="dd" data-act="menu" aria-haspopup="listbox" aria-expanded="${S.menu}">${KIND[S.kind]}${ic("more", 20)}</button>
        ${S.menu ? `<div class="menu" role="listbox">${["dep", "bor"].map((k) => `<button role="option" aria-selected="${k === S.kind}" class="${k === S.kind ? "on" : ""}" data-act="kind" data-k="${k}">${KIND[k]}${k === S.kind ? ic("check", 18) : ""}</button>`).join("")}</div>` : ""}
        ${isFull ? `<button class="xbtn" data-act="closefull" aria-label="Close full screen chart"><span>${ic("close", 22)}</span></button>` : `<button class="xp" data-act="full" aria-label="Expand chart"><span>${ic("full", 20)}</span></button>`}
      </div>
      <div class="av num">${fP(cur)}</div>
      <div class="ats num">At ${fP(p.utilization * 100)} utilization</div>`;
  }
  function analytics(m) {
    return `<div class="card ac changed">${chartHead(m, false)}<div class="chart" data-chart="card" aria-label="${KIND[S.kind]} rate curve, drag to read"></div>
      <div class="hint">${ic("drag", 16)}Drag to read any utilization</div></div>`;
  }
  function fullView(m) {
    return `<div class="full" id="full" role="dialog" aria-label="${KIND[S.kind]} chart, full screen">${chartHead(m, true)}<div class="fbody"><div class="chart" data-chart="full"></div>
      <div class="lg"><span><i style="border-color:${S.kind === "bor" ? "#CBB6FA" : "#32EEE2"}"></i>${KIND[S.kind]}</span><span><i style="border-color:#FC5457;border-top-style:dashed"></i>Now</span></div></div></div>`;
  }

  function niceTop(maxPct) {
    if (!(maxPct > 0)) return { step: 1, top: 4 };
    const raw = maxPct / 4, p = 10 ** Math.floor(Math.log10(raw));
    const mlt = [1, 1.5, 2, 2.5, 3, 5, 7.5, 10].find((k) => k * p >= raw - 1e-9);
    return { step: mlt * p, top: mlt * p * 4 };
  }

  function drawChart(host) {
    const m = model(S.pool), p = m.p, f = rateFn(S.pool, S.kind);
    const W = Math.floor(host.clientWidth), isFull = host.dataset.chart === "full";
    const H = isFull ? Math.max(240, Math.floor(host.clientHeight)) : S.width === 360 ? 210 : 230;
    host.style.height = H + "px";
    const pl = 2, pr = 42, pt = 30, pb = 24, pw = W - pl - pr, ph = H - pt - pb;
    const N = 200, pts = Array.from({ length: N + 1 }, (_, i) => [i / N, f(i / N) * 100]);
    const { step, top } = niceTop(pts[N][1]);
    const X = (u) => pl + u * pw, Y = (v) => pt + ph - (Math.min(v, top) / top) * ph;
    const col = S.kind === "bor" ? "#CBB6FA" : "#32EEE2";
    const line = pts.map(([u, v], i) => `${i ? "L" : "M"}${X(u).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
    const area = `${line}L${X(1).toFixed(1)} ${Y(0).toFixed(1)}L${X(0).toFixed(1)} ${Y(0).toFixed(1)}Z`;
    const ticks = [0, 1, 2, 3, 4].map((i) => i * step);
    const lbl = (t) => +t.toFixed(2) + "%";
    const uNow = Math.max(0, Math.min(1, p.utilization)), vNow = (S.kind === "bor" ? p.borrowApr : p.supplyApr) * 100;
    const gid = "g" + host.dataset.chart;
    host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".28"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map((t) => `<line x1="${pl}" x2="${pl + pw}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="#2C2C2C"/><text x="${W - 2}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#E2E2E2" class="num">${lbl(t)}</text>`).join("")}
      ${[[0, "0%", "start"], [1 / 3, "33%", "middle"], [2 / 3, "67%", "middle"], [1, "100%", "end"]].map(([u, t, a]) => `<text x="${X(u).toFixed(1)}" y="${H - 6}" text-anchor="${a}" font-size="11" fill="#E2E2E2">${t}</text>`).join("")}
      <path d="${area}" fill="url(#${gid})"/>
      <path d="${line}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="${X(uNow).toFixed(1)}" x2="${X(uNow).toFixed(1)}" y1="${pt}" y2="${pt + ph}" stroke="#FC5457" stroke-width="1.5" stroke-dasharray="4 4"/>
      <circle cx="${X(uNow).toFixed(1)}" cy="${Y(vNow).toFixed(1)}" r="5" fill="#FC5457" stroke="#111" stroke-width="2"/>
      <text x="${X(uNow).toFixed(1)}" y="${pt - 8}" text-anchor="${uNow < 0.08 ? "start" : uNow > 0.92 ? "end" : "middle"}" font-size="11" font-weight="600" fill="#FF8A8C">Now</text>
      <g class="cross" style="display:none"><line class="cl" y1="${pt}" y2="${pt + ph}" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="1"/><circle class="cd" r="6" fill="${col}" stroke="#111" stroke-width="2"/></g>
    </svg><div class="ro now"></div>`;
    const cross = host.querySelector(".cross"), cl = host.querySelector(".cl"), cd = host.querySelector(".cd"), ro = host.querySelector(".ro");
    const place = (x) => { const w = ro.offsetWidth; ro.style.left = Math.max(w / 2, Math.min(W - w / 2, x)) + "px"; };
    // at rest: no readout chip (the big value and the line above say it); the marker carries a small "Now" label
    const showNow = () => {
      cross.style.display = "none";
      ro.hidden = true;
    };
    const show = (u) => {
      const v = f(u) * 100, x = X(u);
      cross.style.display = "";
      cl.setAttribute("x1", x); cl.setAttribute("x2", x);
      cd.setAttribute("cx", x); cd.setAttribute("cy", Y(v));
      ro.hidden = false;
      ro.className = "ro";
      ro.innerHTML = `<b class="num">${fP(v)}</b>at ${(u * 100).toFixed(1)}% utilization`;
      place(x);
      host.dataset.readU = u.toFixed(4);
      host.dataset.readV = v.toFixed(4);
    };
    const uAt = (e) => { const r = host.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left - pl) / pw)); };
    let down = false;
    host.onpointerdown = (e) => { down = true; try { host.setPointerCapture(e.pointerId); } catch (_) {} show(uAt(e)); };
    host.onpointermove = (e) => { if (down || e.pointerType === "mouse") show(uAt(e)); };
    const end = () => { down = false; showNow(); };
    host.onpointerup = end; host.onpointercancel = end; host.onpointerleave = (e) => { if (!down) showNow(); };
    showNow();
  }

  /* ---------- after render: tab row, charts, tooltip ---------- */
  function afterRender() {
    const sc = document.getElementById("tabsc");
    if (sc) {
      sc.style.scrollBehavior = "auto";
      sc.scrollLeft = tabScroll;
      sc.onscroll = () => { tabScroll = sc.scrollLeft; edges(); };
      bringTabIntoView(false);
      sc.style.scrollBehavior = "";
      edges();
    }
    document.querySelectorAll(".chart[data-chart]").forEach(drawChart);
    fitStrip();
    drawTip();
    panel();
  }
  // Shrink the three values together until the row fits (min 11.5 px, i.e. RN minimumFontScale 0.82).
  function fitStrip() {
    const st = document.querySelector(".strip");
    if (!st) return;
    const vs = st.querySelectorAll(".v");
    for (let f = 14; f >= 11.5; f -= 0.5) {
      vs.forEach((v) => (v.style.fontSize = f + "px"));
      if (st.scrollWidth <= st.clientWidth + 0.5) break;
    }
  }
  function edges() {
    const sc = document.getElementById("tabsc"), w = document.getElementById("ptw");
    if (!sc || !w) return;
    const l = sc.scrollLeft > 4, r = sc.scrollWidth > sc.clientWidth + 4 && sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 4;
    w.querySelector(".mask.l").hidden = !l; w.querySelector(".arr.l").hidden = !l;
    w.querySelector(".mask.r").hidden = !r; w.querySelector(".arr.r").hidden = !r;
  }
  function bringTabIntoView(animated) {
    const sc = document.getElementById("tabsc"), b = sc && sc.querySelector(".chip.on");
    if (!b) return;
    const max = sc.scrollWidth - sc.clientWidth, x = b.offsetLeft, w = b.offsetWidth, sx = sc.scrollLeft;
    let next = sx;
    // leave room for the arrow (52 px) when more tabs remain on that side; the row ends need only the 16 px padding
    if (x < sx + 52) next = x - 16 <= 0 ? 0 : Math.max(0, x - 52);
    else if (x + w > sx + sc.clientWidth - 52) next = x + w - sc.clientWidth + 16 >= max ? max : Math.min(max, x + w - sc.clientWidth + 52);
    if (next !== sx) { sc.style.scrollBehavior = animated ? "smooth" : "auto"; sc.scrollLeft = next; tabScroll = next; }
  }
  function drawTip() {
    const body = document.getElementById("body");
    if (!body) return;
    const old = body.querySelector(".tip");
    if (old) old.remove();
    if (!S.tip) return;
    const row = body.querySelector(`[data-tip="${S.tip}"]`);
    if (!row) return;
    const [t, txt] = tipText(S.tip, model(S.pool));
    const br = body.getBoundingClientRect(), rr = row.getBoundingClientRect(), ii = row.querySelector(".ii").getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "tip";
    el.setAttribute("role", "tooltip");
    el.innerHTML = `<b>${esc(t)}</b>${esc(txt)}`;
    el.style.top = rr.bottom - br.top - 6 + "px";
    el.style.setProperty("--cx", ii.left + ii.width / 2 - br.left - 16 + "px");
    body.appendChild(el);
    // keep the bubble inside the visible scroll area
    const sc = document.getElementById("scroll"), er = el.getBoundingClientRect(), sr = sc.getBoundingClientRect();
    if (er.bottom > sr.bottom - 8) sc.scrollTop += er.bottom - sr.bottom + 12;
  }

  /* ---------- toast ---------- */
  function toast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.hidden = false;
    t.innerHTML = `<div><i>${ic("check", 16, "#fff")}</i>${esc(msg)}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 1800);
  }

  /* ---------- events ---------- */
  function closeFull() {
    const f = document.getElementById("full");
    S.menu = false;
    if (!f) { S.full = false; renderPhone(); return; }
    f.classList.add("closing");
    setTimeout(() => { S.full = false; renderPhone(); }, 170);
  }
  function back() {
    if (S.menu) { S.menu = false; renderPhone(); return; }
    if (S.tip) { S.tip = null; drawTip(); return; }
    if (S.full) { closeFull(); return; }
    toast("Back goes to the Lend list");
  }
  function setTab(k) {
    S.tab = k; S.tip = null; S.menu = false;
    renderPhone();
    bringTabIntoView(true);
    edges();
  }
  document.addEventListener("click", (e) => {
    const scr = e.target.closest("#screen");
    if (!scr) return;
    const a = e.target.closest("[data-act],[data-tab],[data-tip]");
    if (S.menu && !(a && (a.dataset.act === "menu" || a.dataset.act === "kind"))) { S.menu = false; renderPhone(); if (!a) return; }
    if (S.tip && !(a && a.dataset.tip)) { S.tip = null; drawTip(); if (!a || e.target.closest(".tip")) return; }
    if (!a) return;
    if (a.dataset.tab) return setTab(a.dataset.tab);
    if (a.dataset.tip) { S.tip = S.tip === a.dataset.tip ? null : a.dataset.tip; drawTip(); return; }
    const act = a.dataset.act;
    if (act === "back") return back();
    if (act === "toast") return toast(a.dataset.msg);
    if (act === "nudge") {
      const sc = document.getElementById("tabsc"), max = sc.scrollWidth - sc.clientWidth;
      let n = Math.max(0, Math.min(max, sc.scrollLeft + +a.dataset.dir * 160));
      if (n < 8) n = 0; else if (max - n < 8) n = max;
      sc.style.scrollBehavior = "smooth"; sc.scrollLeft = n; tabScroll = n;
      return;
    }
    if (act === "copy") {
      const v = a.dataset.v;
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast("Address copied"), () => toast("Address copied"));
      return;
    }
    if (act === "open") { toast("Opening Solana Explorer"); window.open(a.dataset.v, "_blank", "noopener"); return; }
    if (act === "menu") { S.menu = !S.menu; renderPhone(); return; }
    if (act === "kind") { S.kind = a.dataset.k; S.menu = false; renderPhone(); return; }
    if (act === "full") { S.full = true; S.menu = false; renderPhone(); return; }
    if (act === "closefull") return closeFull();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") back(); });
  window.addEventListener("resize", () => document.querySelectorAll(".chart[data-chart]").forEach(drawChart));

  /* ---------- prototype chrome ---------- */
  const STATES = [
    ["Position", { tab: "position", has: true }], ["Position, empty", { tab: "position", has: false }],
    ["Details", { tab: "details" }], ["Contracts", { tab: "details", to: "addresses" }],
    ["Activity", { tab: "activity", has: true }], ["Activity, empty", { tab: "activity", has: false }], ["Collateral", { tab: "collateral" }],
    ["Analytics", { tab: "analytics", kind: "dep" }], ["Analytics: Borrow APY", { tab: "analytics", kind: "bor" }], ["Analytics: menu open", { tab: "analytics", menu: true }],
    ["Full screen chart", { tab: "analytics", full: true }],
  ];
  function chrome() {
    document.getElementById("pools").innerHTML = ORDER.map((s) => `<button data-pool="${s}" class="${s === S.pool ? "on" : ""}">${s}</button>`).join("");
    document.querySelectorAll("#width button").forEach((b) => b.classList.toggle("on", +b.dataset.width === S.width));
    document.querySelectorAll("#pos button").forEach((b) => b.classList.toggle("on", (b.dataset.has === "1") === S.has));
    document.getElementById("states").innerHTML = STATES.map(([l], i) => `<button data-state="${i}">${l}</button>`).join("") + `<button data-marks class="${S.marks ? "on" : ""}">Mark changes</button>`;
  }
  document.querySelector(".top").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.pool) { S.pool = b.dataset.pool; S.tip = null; S.menu = false; }
    if (b.dataset.width) S.width = +b.dataset.width;
    if (b.dataset.has) S.has = b.dataset.has === "1";
    chrome(); renderPhone();
  });
  document.getElementById("states").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-marks")) { S.marks = !S.marks; chrome(); renderPhone(); return; }
    const st = STATES[+b.dataset.state][1];
    Object.assign(S, { tip: null, menu: false, full: false }, st);
    delete S.to;
    chrome();
    const sc0 = document.getElementById("scroll");
    if (sc0) sc0.scrollTop = 0;
    const row0 = document.getElementById("tabsc");
    if (row0) { row0.style.scrollBehavior = "auto"; row0.scrollLeft = 0; }
    tabScroll = 0;
    renderPhone();
    bringTabIntoView(false); edges();
    const sc = document.getElementById("scroll");
    if (st.to) { const t = document.getElementById(st.to); if (t) sc.scrollTop = t.offsetTop - 8; }
    else if (st.tip || st.menu || st.tab === "analytics") { const t = document.getElementById("tabc"); sc.scrollTop = t.offsetTop - 60; }
    else sc.scrollTop = 0;
    if (st.tip) drawTip();
  });

  /* ---------- side panel: what changed on this tab ---------- */
  const CHANGES = {
    position: [["Before", "Supplied / Shares / Earned with the unit on a second line; Earned as +0.0000. Empty: a sleeping mascot and one line."], ["After", "One row: Supplied, Shares, Interest earned (number and unit on one line, the interest's dollars under it). Empty: the chameleon, No position yet, one line with the pool's real supply APY, and a Supply button."]],
    details: [["Before", "Card (with Max LTV, Liquidation threshold), Oracle, Limits (1 vSOL is worth 1.000001 SOL, No cap), Contracts (5 rows, copy only)."], ["After", "Statistics (two rings + 8 figures), then the app's Oracle, Limits (Exchange rate to 9 decimals, Uncapped) and Contracts (the website's 8 addresses, copy + explorer). No info icons, no tooltips."]],
    activity: [["Before", "Shared history rows: badge, time, amount; Transaction hash only after expanding."], ["After", "Date, Type, Amount (and dollars), Status (Success / Failed badge), Tx hash link to the explorer, all visible without expanding."]],
    collateral: [["Change", "None. Shown so the tab row is complete."]],
    analytics: [["Before", "Tab named Rates: both curves on one static chart."], ["After", "Tab named Analytics: Deposit / Borrow APY switch, the current APY, one line (At x% utilization), drag to read, Now marker, full screen with X and Back."]],  };
  function panel() {
    const m = model(S.pool), p = m.p;
    const ch = CHANGES[S.tab];
    document.getElementById("panel").innerHTML = `
      <div><h2>${TABS.find(([k]) => k === S.tab)[1]}: what changed</h2><div class="ba">${ch.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join("")}</div>
      <p style="margin-top:8px">Also: Utilization in the header card now shows two decimals (${fP(m.util)}).</p></div>
      <div><h2>Data</h2><ul>
        <li><b>Read from the fork</b> (read only) at ${new Date(R.readAt).toLocaleString("en-US")}: pool totals, APYs, rate curve, reserve factor, caps, status, share rate, oracle price and source, addresses.</li>
        <li><b>Sample</b> (not on chain): the position${S.tab === "activity" ? " and the activity rows (dates, amounts, hashes)" : " and activity rows"}.</li>
        <li>${m.s}: utilization ${fP(m.util)}, supply ${fP(p.supplyApr * 100)}, borrow ${fP(p.borrowApr * 100)}, curve ×${wadStr(p.rateCurve.mult)} (linear ${wadStr(p.rateCurve.linear)}, jump ${wadStr(p.rateCurve.jump)}), reserve factor ${fP(p.reserveFactorBps / 100)}.</li>
      </ul></div>
      <p class="note">Outlined in lilac: what changed (toggle "Mark changes"). Tap the info rows, the copy and explorer icons, the tabs and the chart. The phone's Back button closes the menu, the tip and the full screen chart.</p>`;
  }

  // test hook for the headless check
  window.__lend = { S, renderPhone, chrome, model, rateFn };
  chrome();
  renderPhone();
})();
