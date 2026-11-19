/* The approved margin first-time stage (design/margin-account-open-flow.html renderProgress / stepOpen / stepFlow / stream,
   wired as Stage in src/ui/first-time-flow.tsx): the account card draws in (outline), shimmers while it is created, fills, ripples
   and docks into a strip; each asset node streams particles up into the strip, which counts. Same geometry (216 px stage, nodes at
   128 px, strip 64 px), same timings. Here it is driven by the legs' phases instead of a fixed script.
   window.MarginStage(host, { addr, chain, nodes: [{ leg, role: "dep" | "bor", sym, amt }] }) -> { update(legs, finished), frame(dt) } */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const $ = (s, r = document) => r.querySelector(s);
  const svgI = (d, s, c = "currentColor") => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${c}" aria-hidden="true"><path d="${d}"/></svg>`;
  const MI = {
    wallet: "M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
    bank: "M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z",
    acct: "M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-9-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-6v11c0 1.1-.9 2-2 2H4v-2h17V7h2z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  };
  const fmt = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ease3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rm = () => document.documentElement.classList.contains("rm");
  const ACT = ["check", "send", "confirm", "unsure"], SENT = ["send", "confirm", "unsure"];
  let gid = 0;

  window.MarginStage = function (host, o) {
    const W = Math.round(host.clientWidth || 380), H = 216, top = 128, sy = 64;
    const nodes = o.nodes, n = nodes.length, slot = W / Math.max(n, 1), nodeW = Math.min(104, Math.floor(slot) - 4);
    const spread = n > 1 ? Math.min(26, W / (n * 2 + 1)) : 0, few = n === 1 || (n === 2 && nodes[0].role !== nodes[1].role);
    const og = "mog" + ++gid;
    let paths = "", nodeHTML = "";
    nodes.forEach((nd, j) => {
      const x = Math.round(slot * (j + 0.5)), t = W / 2 + (j - (n - 1) / 2) * spread;
      const d = `M${x} ${top - 2}C${x} ${top - 34} ${t} ${sy + 34} ${t} ${sy + 2}`;
      paths += `<path class="m-base" d="${d}"/><path class="m-pa" data-j="${j}" d="${d}" pathLength="1"/>`;
      const amt = `${fmt(nd.amt)} ${nd.sym}`;
      const l1 = few ? (nd.role === "dep" ? "Your wallet" : "Lending pool") : nd.sym, l2 = few ? amt : fmt(nd.amt);
      nodeHTML += `<div class="m-node" data-j="${j}" style="left:${x - nodeW / 2}px;width:${nodeW}px;--d:${j * 0.06}s"><div class="m-nc">${svgI(nd.role === "dep" ? MI.wallet : MI.bank, 20)}<span class="m-nok">${svgI(MI.check, 12, "#fff")}</span></div><div class="m-nl">${l1}</div><div class="m-nv">${l2}</div></div>`;
    });
    host.innerHTML = `<div class="mst instant">` +
      `<svg class="m-flow" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${paths}<g class="m-pts"></g></svg>${nodeHTML}` +
      `<div class="m-acct draw"><div class="m-aglow"></div><div class="m-rip"></div><div class="m-rip r2"></div>` +
      `<div class="m-card"><div class="m-fill"></div><div class="m-shim"></div><div class="m-sheen"></div>` +
      `<div class="m-big"><div class="m-btop"><span class="m-bk">Margin account</span><span class="m-bchain">${o.chain || "Solana"}</span></div>` +
      `<div><div class="m-baddr"><span class="m-skel"></span><span class="m-skel s2"></span><div class="m-a">${o.addr}</div></div><div class="m-bmeta"><i></i><span class="m-meta">Waiting to sign</span></div></div></div>` +
      `<div class="m-strip"><div class="m-sl"><div class="m-sic">${svgI(MI.acct, 18, "#fff")}</div><div><div class="m-sk">Margin account</div><div class="m-sa">${o.addr}</div></div></div>` +
      `<div class="m-sr"><div class="m-sv">No collateral yet</div><div class="m-sv2"></div></div></div></div>` +
      `<svg class="m-outline"><defs><linearGradient id="${og}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FC5457"/><stop offset=".5" stop-color="#B6479E"/><stop offset="1" stop-color="#703AE6"/></linearGradient></defs>` +
      `<rect class="m-obase" x="0" y="0" width="100%" height="100%" pathLength="1"/><rect class="m-ograd" x="0" y="0" width="100%" height="100%" stroke="url(#${og})"/></svg></div></div>`;
    const root = $(".mst", host), acct = $(".m-acct", root), meta = $(".m-meta", root), sv = $(".m-sv", root), sv2 = $(".m-sv2", root);
    const pa = [...root.querySelectorAll(".m-pa")], nd = [...root.querySelectorAll(".m-node")], ptsG = $(".m-pts", root);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("instant")));
    // particles: 7 per stream (5 when several run), 140 / 170 ms apart, 860 ms each, cubic ease (stream() in the design)
    const streams = nodes.map(() => ({ on: false, t: 0, els: [] }));
    const lineOf = (side) => { const k = Object.keys(side); return !k.length ? null : k.length === 1 ? `${fmt(side[k[0]])} ${k[0]}` : `${k.length} assets`; };
    let shownCol = null, shownDebt = null;
    const tween = (el, sym, from, to, suf) => {
      if (rm()) { el.textContent = `${fmt(to)} ${sym}${suf}`; return; }
      const t0 = performance.now();
      const fr = (now) => { const t = Math.min(1, (now - t0) / 950), e = 1 - Math.pow(1 - t, 3); el.textContent = `${fmt(from + (to - from) * e)} ${sym}${suf}`; if (t < 1) requestAnimationFrame(fr); };
      requestAnimationFrame(fr);
    };
    const flash = (el) => { el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 650); };

    function update(legs, finished) {
      const by = (id) => legs.find((l) => l.id === id) || { phase: "done" };
      const open = o.openLeg ? by(o.openLeg) : { phase: "done" };
      const nodeLegs = nodes.map((x) => by(x.leg));
      const opened = open.phase === "done";
      const forming = SENT.includes(open.phase) || opened;
      acct.classList.toggle("forming", forming);
      acct.classList.toggle("settled", opened);
      acct.classList.toggle("bad", open.phase === "failed");
      // dock once the account exists and an asset leg starts (or the run ended)
      const docked = opened && (nodeLegs.some((l) => !["wait", "queued", "approve", "skipped"].includes(l.phase)) || finished);
      root.classList.toggle("docked", docked);
      const m = open.phase === "failed" ? "Not created" : opened ? "Opened just now" : forming ? "Creating on Solana" : open.phase === "check" ? "Checking" : "Waiting to sign";
      if (meta.textContent !== m) meta.textContent = m;
      let recv = false;
      const col = {}, debt = {};
      nodeLegs.forEach((l, j) => {
        const on = ACT.includes(l.phase), done = l.phase === "done", bad = l.phase === "failed";
        nd[j].classList.toggle("on", on); nd[j].classList.toggle("done", done); nd[j].classList.toggle("bad", bad);
        pa[j].classList.toggle("draw", on || done || bad); pa[j].classList.toggle("done", done); pa[j].classList.toggle("bad", bad);
        streams[j].on = docked && SENT.includes(l.phase) && !rm();
        if (streams[j].on) recv = true;
        if (done) { const x = nodes[j], side = x.role === "dep" ? col : debt; side[x.sym] = (side[x.sym] || 0) + x.amt; }
      });
      acct.classList.toggle("recv", recv);
      const c = lineOf(col) || "No collateral yet", d = lineOf(debt);
      if (c !== shownCol) {
        const k = Object.keys(col);
        if (shownCol !== null && k.length === 1) tween(sv, k[0], 0, col[k[0]], ""); else sv.textContent = c;
        if (shownCol !== null) flash(sv);
        shownCol = c;
      }
      if (d !== shownDebt) {
        sv2.classList.toggle("show", !!d);
        const k = Object.keys(debt);
        if (d && k.length === 1) tween(sv2, k[0], 0, debt[k[0]], " borrowed"); else sv2.textContent = d ? `${d} borrowed` : "";
        if (d) flash(sv2);
        shownDebt = d;
      }
    }
    function frame(dt) {
      const many = streams.filter((s) => s.on).length > 1;
      streams.forEach((s, j) => {
        if (!s.on) { if (s.els.length) { s.els.forEach((e) => e.remove()); s.els = []; } s.t = 0; return; }
        const count = many ? 5 : 7, gap = many ? 170 : 140, dur = 860, loop = count * gap + dur + 300;
        if (!s.els.length) for (let i = 0; i < count; i++) { const g = document.createElementNS(NS, "g"); g.innerHTML = `<circle class="m-pt-h" r="6.5"/><circle class="m-pt-c" r="2.6"/>`; g.setAttribute("opacity", "0"); ptsG.appendChild(g); s.els.push(g); }
        s.t += dt;
        const path = pa[j], L = path.getTotalLength();
        s.els.forEach((g, i) => {
          const e = ((((s.t - i * gap) % loop) + loop) % loop) / dur;
          if (e <= 0 || e >= 1) { g.setAttribute("opacity", "0"); return; }
          const p = path.getPointAtLength(L * ease3(e));
          g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
          g.setAttribute("opacity", Math.min(1, e / 0.15, (1 - e) / 0.14).toFixed(3));
        });
      });
    }
    return { update, frame };
  };
})();
