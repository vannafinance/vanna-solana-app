/* Vanna chameleon generator, a line-for-line plain-JS port of src/mascot/chameleon.ts (same geometry and colours).
   markA() = full body, face() = head only. Each returns { vb, svg, g } where svg is the inner markup of an <svg> and g the gradient id.
   tailCoil() = the exact coil used by src/mascot/tail-loader.tsx (and the "orig" tail of the body). Nothing here is redrawn. */
(function () {
  const INK = "#111111", W = "#FFFFFF";
  const BRAND = ["#FC5457", "#B6479E", "#703AE6"];
  const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const tri = (a, b) => [a, toHex(hx(a).map((v, i) => (v + hx(b)[i]) / 2)), b];
  const SKINS = { ds: BRAND };
  const MODULE_SKIN = { earn: tri("#2FC9C1", "#11838B"), margin: tri("#8D61EB", "#5029A3"), trade: tri("#8D61EB", "#5029A3"), farm: tri("#FF3395", "#E2087A") };

  let n = 0;
  const uid = (p) => p + "_" + ++n;
  const f = (v) => (Math.round(v * 100) / 100).toString();

  function grad(id, c, x1, y1, x2, y2) {
    return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
      c.map((col, i) => `<stop offset="${(i / (c.length - 1)).toFixed(2)}" stop-color="${col}"/>`).join("") + `</linearGradient>`;
  }
  function sp(cx, cy, r0, r1, a0, sweep, k) {
    const p = [];
    for (let i = 0; i <= k; i++) {
      const t = i / k, a = ((a0 + sweep * t) * Math.PI) / 180, r = r0 + (r1 - r0) * t;
      p.push([cx + r * Math.cos(a), cy - r * Math.sin(a)]);
    }
    return p;
  }

  function eye(cx, cy, R, look, o, skinRef) {
    const dial = R * 0.84, rr = R * 0.6, sw = R * 0.2;
    let s = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(dial)}" fill="${INK}"/>`;
    if (o.lid === "happy")
      return s + `<path d="M${f(cx - rr)} ${f(cy + rr * 0.35)} Q${f(cx)} ${f(cy - rr * 0.95)} ${f(cx + rr)} ${f(cy + rr * 0.35)}" stroke="${W}" stroke-width="${f(sw * 0.85)}" stroke-linecap="round" fill="none"/>`;
    if ((typeof o.lid === "number" && o.lid >= 0.98) || o.kind === "closed")
      return s + `<path d="M${f(cx - rr)} ${f(cy)} Q${f(cx)} ${f(cy + rr * 0.55)} ${f(cx + rr)} ${f(cy)}" stroke="${W}" stroke-width="${f(sw * 0.8)}" stroke-linecap="round" fill="none"/>`;
    if (o.kind === "stars") {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? rr * 0.42 : rr * 1.02;
        pts.push(f(cx + r * Math.cos(a)) + "," + f(cy + r * Math.sin(a)));
      }
      return s + `<polygon points="${pts.join(" ")}" fill="#FFD25A" stroke="#FFD25A" stroke-width="${f(sw * 0.35)}" stroke-linejoin="round"/>`;
    }
    s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rr)}" stroke="${W}" stroke-width="${f(sw)}" fill="none"/>`;
    const lk = o.kind === "sad" ? [look[0] * 0.4, 0.8] : look;
    s += `<circle cx="${f(cx + lk[0] * R * 0.3)}" cy="${f(cy + lk[1] * R * 0.3)}" r="${f(R * 0.22)}" fill="${W}"/>`;
    const lid = o.kind === "sad" ? Math.max(typeof o.lid === "number" ? o.lid : 0, 0.5) : typeof o.lid === "number" ? o.lid : 0;
    if (lid > 0) {
      const h = dial * 2 * lid, cid = uid("lid");
      s += `<clipPath id="${cid}"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(dial + 0.2)}"/></clipPath><rect x="${f(cx - dial - 1)}" y="${f(cy - dial - 1)}" width="${f(dial * 2 + 2)}" height="${f(h + 1)}" fill="url(#${skinRef})" clip-path="url(#${cid})"/>`;
      s += `<path d="M${f(cx - dial * 0.92)} ${f(cy - dial + h)} L${f(cx + dial * 0.92)} ${f(cy - dial + h)}" stroke="${INK}" stroke-width="${f(sw * 0.5)}" stroke-linecap="round"/>`;
    }
    return s;
  }

  const MOUTH = {
    smile: `<path d="M125.5 41 Q115 50 103.5 46" stroke="${INK}" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    line: `<path d="M125.5 41 Q115 48.5 104 48.5" stroke="${INK}" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    frown: `<path d="M125 43.5 Q115 42 104 49" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`,
    wavy: `<path d="M125 43 Q122 40 119 43 T113 43 T107 44 T103 46" stroke="${INK}" stroke-width="2" stroke-linecap="round" fill="none"/>`,
  };
  const NEAR = [103, 30, 11.5], FAR = [116.5, 17.5, 7.5];
  const TAIL = sp(26, 62, 21, 7, 80, 330, 60);
  const pathOf = (pts) => "M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join(" L");

  function parts(o, g) {
    const P = `url(#${g})`;
    let b = "";
    if (o.tail !== false) b += `<path d="${pathOf(TAIL)}" stroke="${P}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    b += `<path d="M30 42 C 38 22 66 16 92 25" stroke="${P}" stroke-width="21" stroke-linecap="round" fill="none"/>`;
    if (o.legs !== false) b += `<path d="M48 36 L51 64" stroke="${P}" stroke-width="8" stroke-linecap="round"/><path d="M84 36 L87 64" stroke="${P}" stroke-width="8" stroke-linecap="round"/>`;
    b += `<path d="M86 12 L124 36 L118 46 L100 50 L88 40 Z" fill="${P}" stroke="${P}" stroke-width="8" stroke-linejoin="round"/>`;
    const m = o.mouth === undefined ? "smile" : o.mouth;
    if (m && MOUTH[m]) b += MOUTH[m];
    if (o.tongue) {
      const L = typeof o.tongue === "number" ? o.tongue : 13;
      b += `<path d="M121 43 L${f(121 + L)} 43" stroke="#FF3395" stroke-width="3.2" stroke-linecap="round"/><circle cx="${f(122 + L)}" cy="43" r="3.6" fill="#FF3395"/>`;
    }
    const kN = o.eyeNear || o.eyes, kF = o.eyeFar || o.eyes;
    b += `<circle cx="${FAR[0]}" cy="${FAR[1]}" r="${f(FAR[2] * 1.18)}" fill="${P}"/>` + eye(FAR[0], FAR[1], FAR[2], o.lookFar || [0.7, -0.4], { lid: o.lidFar || 0, kind: kF }, g);
    b += `<circle cx="${NEAR[0]}" cy="${NEAR[1]}" r="${f(NEAR[2] * 1.12)}" fill="${P}"/>` + eye(NEAR[0], NEAR[1], NEAR[2], o.lookNear || [-0.7, -0.1], { lid: o.lidNear || 0, kind: kN }, g);
    return b;
  }
  function skinOf(o) {
    const c = o.colours || SKINS[o.pal || "ds"] || BRAND;
    return o.pale ? c.map((x) => mix(x, "#FFFFFF", typeof o.pale === "number" ? o.pale : 0.42)) : c;
  }
  function markA(o = {}) {
    const g = uid("a"), c = skinOf(o);
    const L = o.tongue ? (typeof o.tongue === "number" ? o.tongue : 13) : 0;
    const right = Math.max(140, 122 + L + 6);
    return { vb: o.vb || `0 2 ${right} 90`, svg: `<defs>${grad(g, c, 10, 84, 128, 8)}</defs>${parts(o, g)}`, g };
  }
  function face(o = {}) {
    const g = uid("f"), cp = uid("fc"), c = skinOf(o);
    let s = `<defs>${grad(g, c, 10, 84, 128, 8)}<clipPath id="${cp}"><circle cx="103" cy="30" r="35"/></clipPath></defs><g clip-path="url(#${cp})">`;
    if (o.tile !== null) s += `<rect x="60" y="-10" width="90" height="90" fill="${o.tile || "#1E1E1E"}"/>`;
    s += parts({ legs: false, tail: false, lookNear: [0.6, 0.2], lookFar: [0.1, 0.4], ...o }, g) + `</g>`;
    return { vb: "68 -5 70 70", svg: s, g };
  }
  /* The tail coil alone, as tail-loader.tsx and the body's "orig" tail use it. */
  function tailCoil() {
    let len = 0;
    for (let i = 1; i < TAIL.length; i++) len += Math.hypot(TAIL[i][0] - TAIL[i - 1][0], TAIL[i][1] - TAIL[i - 1][1]);
    return { d: pathOf(TAIL), len };
  }

  window.Chameleon = { markA, face, tailCoil, skinOf, mix, BRAND, MODULE_SKIN };
})();
