/* Transaction sheet motion prototype. One engine, three concepts (body[data-concept] = A | B | C), plus the landing page chrome.
   Plain JS, no build. The mascot comes from chameleon.js (a port of src/mascot/chameleon.ts); the loader is tail-loader.tsx's coil. */
(function () {
  const Ch = window.Chameleon;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const qs = new URLSearchParams(location.search);
  const store = {
    get(k, d) { try { const v = localStorage.getItem("txm." + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("txm." + k, v); } catch (e) {} },
  };
  const prefs = {
    theme: qs.get("theme") || store.get("theme", "light"),
    device: qs.get("device") || store.get("device", "k50i"),
    rm: (qs.get("rm") || store.get("rm", "0")) === "1",
  };
  const page = document.body.dataset.page || "concept";
  const SPEED = { v: [0.5, 1, 2].includes(+store.get("speed", "1")) ? +store.get("speed", "1") : 1 };
  const KEY = document.body.dataset.concept;
  let uidN = 0;
  const uid = (p) => p + "x" + ++uidN;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const restart = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  /* ---------------- icons (Material Symbols Rounded paths, 24 px grid) ---------------- */
  const svg = (d, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  const IC = {
    close: (s) => svg("M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6z", s),
    open: (s) => svg("M5 21q-.825 0-1.413-.587Q3 19.825 3 19V5q0-.825.587-1.413Q4.175 3 5 3h7v2H5v14h14v-7h2v7q0 .825-.587 1.413Q19.825 21 19 21Zm4.7-5.3-1.4-1.4L17.6 5H14V3h7v7h-2V6.4Z", s),
    check: (s) => svg("M9.55 18 3.85 12.3l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z", s),
    info: (s) => svg("M11 17h2v-6h-2Zm1-8q.425 0 .713-.288Q13 8.425 13 8t-.287-.713Q12.425 7 12 7t-.712.287Q11 7.575 11 8t.288.712Q11.575 9 12 9Zm0 13q-2.075 0-3.9-.788-1.825-.787-3.175-2.137-1.35-1.35-2.137-3.175Q2 14.075 2 12t.788-3.9q.787-1.825 2.137-3.175 1.35-1.35 3.175-2.138Q9.925 2 12 2t3.9.787q1.825.788 3.175 2.138 1.35 1.35 2.137 3.175Q22 9.925 22 12t-.788 3.9q-.787 1.825-2.137 3.175-1.35 1.35-3.175 2.137Q14.075 22 12 22Z", s),
  };
  // a check that draws itself (stroke-dashoffset), used by the success badges
  const drawCheck = (s, w = 3) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path class="checkpath" d="M6 12.5l4 4 8-9" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  /* ---------------- the loader: tail-loader.tsx, unchanged geometry and timing ---------------- */
  const COIL = Ch.tailCoil();
  const LOADER_STOPS = ["#FC5457", "#B6479E", "#703AE6"];
  function loaderHTML(size) {
    const id = uid("tl");
    const stops = LOADER_STOPS.map((c, i) => `<stop offset="${(i / 2).toFixed(2)}" stop-color="${c}"/>`).join("");
    return `<div class="tl" style="width:${size}px;height:${size}px" role="progressbar" aria-label="Working"><div class="spin">` +
      `<svg width="${size}" height="${size}" viewBox="-2 34 56 56"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="4" y1="86" x2="48" y2="40">${stops}</linearGradient></defs>` +
      `<path d="${COIL.d}" stroke="#703AE6" stroke-opacity=".14" stroke-width="11" stroke-linecap="round" fill="none"/>` +
      `<path class="draw" d="${COIL.d}" stroke="url(#${id})" stroke-width="11" stroke-linecap="round" fill="none" style="--len:${COIL.len.toFixed(2)}"/></svg></div></div>`;
  }

  /* ---------------- mascot controller (mirrors useIdle / MascotDone in src/mascot/mascot.tsx) ---------------- */
  const DARK_TILE = "#2E2C35";
  class Mascot {
    constructor(el, kind, size) {
      this.el = el; this.kind = kind; this.size = size; this.timers = [];
      this.reset();
    }
    reset() {
      this.o = {}; this.baseLid = 0; this.blink = 0; this.happy = false; this.tongue = 0;
      this.near = this.kind === "face" ? [0.6, 0.2] : [0.6, 0.1];
      this.far = this.kind === "face" ? [0.1, 0.4] : [0.7, -0.3];
      this.clear(); this.render();
    }
    clear() { this.timers.forEach(clearTimeout); this.timers = []; }
    later(ms, fn) { this.timers.push(setTimeout(fn, ms / SPEED.v)); }
    set(o) { Object.assign(this.o, o); this.render(); }
    render() {
      const lid = this.happy ? "happy" : Math.max(this.baseLid, this.blink);
      const o = { pal: "ds", ...this.o, lookNear: this.near, lookFar: this.far, lidNear: this.o.lidNear ?? lid, lidFar: this.o.lidFar ?? lid, tongue: this.tongue || undefined };
      if (this.kind === "face") {
        const r = Ch.face({ ...o, tile: prefs.theme === "dark" ? DARK_TILE : undefined });
        this.el.innerHTML = `<svg viewBox="${r.vb}" width="${this.size}" height="${this.size}">${r.svg}</svg>`;
      } else {
        const r = Ch.markA({ ...o, tail: false, vb: "0 2 140 90" });
        const h = Math.round((this.size * 90) / 140);
        this.el.innerHTML = `<svg viewBox="${r.vb}" width="${this.size}" height="${h}">${r.svg}</svg>`;
      }
    }
    /* modes: idle (blink + free glances), patient (heavy lids, slow), track (blink only, eyes held), off */
    mode(m, range) {
      this.clear();
      this.baseLid = m === "patient" ? (this.kind === "body" ? 0.55 : 0.42) : 0;
      this.render();
      if (prefs.rm || m === "off") return;
      const blinkGap = m === "patient" ? [5000, 8000] : [4000, 7000];
      const blink = () => {
        [0.5, 0.99, 0.5, 0].forEach((v, i) => this.later(i * 30 + 30, () => { this.blink = v; this.render(); }));
        this.later(rnd(...blinkGap), blink);
      };
      this.later(rnd(1800, 3500), blink);
      if (m === "idle" || m === "patient") {
        const R = range || { x: [-0.9, 0.9], y: [-0.5, 0.5] };
        const hold = m === "patient" ? [3000, 5000] : [1500, 3000];
        const glance = (which) => {
          this.glide(which, [rnd(...R.x), rnd(...R.y)], m === "patient" ? 500 : 300);
          this.later(rnd(...hold), () => glance(which));
        };
        this.later(rnd(600, 1600), () => glance("near"));
        this.later(rnd(1000, 2200), () => glance("far"));
      }
    }
    glide(which, to, ms = 300) {
      const from = this[which].slice(); const steps = 6;
      if (prefs.rm) { this[which] = to; this.render(); return; }
      for (let i = 1; i <= steps; i++) this.later((i * ms) / steps, () => { const t = easeIO(i / steps); this[which] = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]; this.render(); });
    }
    lookTo(near, far, ms) { this.glide("near", near, ms); this.glide("far", far, ms); }
    blinkOnce(delay = 0) {
      if (prefs.rm) return;
      [0.5, 0.99, 0.5, 0].forEach((v, i) => this.later(delay + i * 30 + 30, () => { this.blink = v; this.render(); }));
    }
    /* MascotDone: the tongue strikes once (160 ms out, 180 ms back) with happy eyes while it is out. */
    strike(delay = 220) {
      if (prefs.rm) { this.happy = true; this.render(); return; }
      [3, 6, 9, 12].forEach((v, i) => this.later(delay + i * 40, () => { this.tongue = v; this.happy = v > 7.2; this.render(); }));
      [9, 6, 3, 0].forEach((v, i) => this.later(delay + 160 + i * 45, () => { this.tongue = v; this.happy = v > 7.2; this.render(); }));
    }
  }

  /* the body's tail drawn on its own layer, so the eye redraws never restart the tail's draw animation */
  function tailHTML(width, pale, animated) {
    const id = uid("tt");
    const c = Ch.skinOf({ pal: "ds", pale });
    const stops = c.map((col, i) => `<stop offset="${(i / (c.length - 1)).toFixed(2)}" stop-color="${col}"/>`).join("");
    const h = Math.round((width * 90) / 140);
    return `<svg viewBox="0 2 140 90" width="${width}" height="${h}"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="10" y1="84" x2="128" y2="8">${stops}</linearGradient></defs>` +
      `<path d="${COIL.d}" stroke="${c[2]}" stroke-opacity=".16" stroke-width="11" stroke-linecap="round" fill="none"/>` +
      `<path class="${animated ? "draw" : ""}" d="${COIL.d}" stroke="url(#${id})" stroke-width="11" stroke-linecap="round" fill="none" style="--len:${COIL.len.toFixed(2)}"/></svg>`;
  }

  /* ---------------- content ---------------- */
  const STATES = ["wallet", "long", "sent", "processed", "done", "fail", "partial"];
  const SLABEL = { wallet: "Waiting for wallet", long: "Waiting 60 s+", sent: "Sent", processed: "Processed", done: "Confirmed", fail: "Failed", partial: "Partial failure" };
  const STEP = { wallet: 0, long: 0, sent: 1, processed: 2, done: 3, fail: 0, partial: 2 };
  const COPY = {
    wallet: ["Waiting for your wallet", "Approve in Phantom. If it shows a warning, tap Confirm (unsafe)."],
    long: ["Waiting for your wallet", "Approve in Phantom. If it shows a warning, tap Confirm (unsafe)."],
    sent: ["Sent to Solana", "Signed. Waiting for the network"],
    processed: ["Sent to Solana", "Processed. Confirming now"],
    done: ["Long SOL 2x opened", "0.2667 SOL on Phoenix"],
    fail: ["Not confirmed", "Your wallet did not answer. Nothing was sent."],
    partial: ["Not confirmed", "Your 10 USDC is in Phoenix now, but the order did not go through: the price moved past your limit."],
  };
  // No hint box and no Open Phantom button: opening the wallet by hand does not bring the request (MWA delivers it on its own schedule).

  /* ---------------- concepts ---------------- */
  const CONCEPTS = {
    A: {
      name: "A · Calm", title: "Concept A: Calm",
      lede: "The sheet you have today, made quieter. The mascot face takes the left slot in every state, the gradient loader rides on it as a status badge, and everything moves slowly and only once.",
      mount(slot) {
        slot.innerHTML = `<div class="a-wrap" id="aw"><div class="a-breath"><div class="face" id="mf" style="width:56px;height:56px"></div></div><div class="ripple" id="rip"></div>` +
          `<div class="a-badge"><div class="ab ab-load">${loaderHTML(22)}</div><div class="ab ab-ok">${drawCheck(16)}</div><div class="ab ab-bad">${IC.close(16)}</div></div></div>`;
        this.m = new Mascot($("#mf"), "face", 56);
      },
      enter(s, prev) {
        const m = this.m, aw = $("#aw");
        aw.dataset.s = s; aw.classList.remove("drawn");
        m.reset();
        if (s === "wallet") m.mode("idle");
        else if (s === "long") m.mode("patient", { x: [-0.3, 0.3], y: [0.1, 0.5] });
        else if (s === "sent" || s === "processed") { m.mode("track"); m.lookTo(s === "sent" ? [0.8, -0.6] : [0.9, -0.1], s === "sent" ? [0.6, -0.7] : [0.7, -0.2]); if (prev !== s) m.blinkOnce(); }
        else if (s === "done") { m.mode("track"); m.near = [0.6, 0.1]; m.far = [0.4, 0.2]; m.render(); m.strike(); void aw.offsetWidth; aw.classList.add("drawn"); restart($("#rip"), "go"); }
        else if (s === "fail") { m.set({ eyes: "sad", mouth: "line" }); m.mode("off"); restart($("#hd"), "shake"); }
        else if (s === "partial") { m.set({ eyeNear: "sad", mouth: "wavy" }); m.near = [0.2, 0.6]; m.mode("off"); restart($("#hd"), "shake"); }
      },
      refresh() { this.m.render(); },
      moves: {
        wallet: ["<b>Face</b> breathes: scale 1 to 1.035, 2.8 s ease-in-out, alternate.", "<b>Eyes</b> idle exactly as the app (blink 120 ms every 4 to 7 s, glances 300 ms).", "<b>Loader badge</b> (22 px tail loader on a surface ring) keeps its 1.8 s draw, hold, retract and spin.", "<b>Bar</b> sits at 8%, no shimmer while nothing is sent."],
        long: ["After 60 s: <b>breathing slows</b> to 4.2 s, <b>lids drop</b> to 42% (patient), glances slow to 3 to 5 s.", "<b>Loader</b> slows to 2.7 s and dims to 70%.", "Same title and caption, <b>no extra text or button</b>: the heavier lids, slower breathing and the pulsing Sent dot are the only sign that time is passing."],
        sent: ["<b>Eyes glide up-right</b> (300 ms) and blink once to acknowledge the step.", "<b>Bar</b> fills to 33% (500 ms, the app ease) and a soft <b>glint</b> travels along the fill every 1.6 s.", "<b>Sent dot</b> fills and sends one soft pulse ring (scale 1 to 2.6, 600 ms)."],
        processed: ["<b>Eyes</b> move to the right, blink once.", "<b>Bar</b> to 66%, glint continues; <b>Processed dot</b> pulses once."],
        done: ["<b>Badge</b>: loader scales to 0.6 and fades (160 ms), purple check badge springs in and its <b>check draws</b> (260 ms).", "<b>Face</b>: the MascotDone tongue strike with happy eyes (160 ms out, 180 ms back), then calm blinks.", "One <b>ring ripple</b> leaves the face (scale 1 to 1.55, opacity .45 to 0, 700 ms). Breathing stops: it is settled.", "<b>Bar</b> to 100%, glint stops; Done button rises 8 px."],
        fail: ["<b>Header shakes</b> once (6, 6, 4, 3 px, 380 ms).", "<b>Face</b> turns concerned: sad eyes and the flat mouth from the artwork; no idle motion.", "<b>Badge</b> crossfades to the pink X; its fill shifts from purple to pink (300 ms)."],
        partial: ["Same shake; <b>one sad eye</b> and the wavy mouth: half went through.", "The <b>step card</b> rows rise in with a 60 ms stagger; the confirmed row gets the purple check."],
      },
    },

    B: {
      name: "B · Playful", title: "Concept B: Playful",
      lede: "The whole chameleon sits in the left slot and acts the transaction out. Its own tail is the loader (the tail loader was cut from this tail): it curls while waiting and stays curled when it is done.",
      mount(slot) {
        slot.innerHTML = `<div class="b-wrap" id="bw"><div class="b-shadow"></div><div class="ripple b-rip" id="rip"></div><div class="b-hop" id="bhop"><div class="b-tilt"><div class="b-br"><div class="b-tail" id="btail"></div><div class="b-body" id="bbody"></div></div></div></div></div>`;
        this.m = new Mascot($("#bbody"), "body", 88);
      },
      tail(pale, animated, dur) {
        const t = $("#btail"); t.innerHTML = tailHTML(88, pale, animated); t.style.setProperty("--tl-dur", dur || "1800ms");
      },
      enter(s, prev) {
        const m = this.m, bw = $("#bw");
        bw.dataset.s = s; m.reset();
        if (s === "wallet") { this.tail(false, true); m.mode("idle", { x: [0.2, 0.95], y: [-0.3, 0.4] }); }
        else if (s === "long") { this.tail(false, true, "3000ms"); m.set({ mouth: "line" }); m.mode("patient", { x: [-0.2, 0.4], y: [0.2, 0.6] }); }
        else if (s === "sent" || s === "processed") {
          if (prev !== "sent" && prev !== "processed") this.tail(false, true);
          m.mode("track"); m.lookTo(s === "sent" ? [0.5, -0.8] : [0.9, -0.4], s === "sent" ? [0.4, -0.8] : [0.8, -0.5]);
          if (prev !== s) { m.blinkOnce(); restart($("#bhop"), "hop"); }
        } else if (s === "done") { this.tail(false, false); m.mode("track"); m.near = [0.6, 0.1]; m.far = [0.5, 0]; m.strike(140); restart($("#bhop"), "hopbig"); restart($("#rip"), "go"); }
        else if (s === "fail") { this.tail(0.42, false); m.set({ eyes: "sad", mouth: "frown", pale: 0.42 }); m.mode("off"); restart($("#hd"), "shake"); restart($("#bbody"), "fadein"); }
        else if (s === "partial") { this.tail(false, false); m.set({ eyeNear: "sad", mouth: "wavy" }); m.near = [0.3, 0.8]; m.far = [0.2, 0.7]; m.mode("off"); restart($("#hd"), "shake"); }
        // the progress head dot bounces on each new step
        if (STEP[s] !== STEP[prev]) restart($("#fill"), "bump");
      },
      refresh() { this.m.render(); },
      moves: {
        wallet: ["<b>Tail</b> = the tail loader on the body: draws out from the body to the tip, holds, retracts (1.8 s, same keyframes and ease; the spin is dropped so it stays attached).", "<b>Eyes</b> glance toward the title and caption (range x 0.2 to 0.95).", "<b>Body</b> breathes: translateY 0 to -1.5 px, 2.4 s."],
        long: ["<b>Sleepy</b>: lids at 55%, the flat mouth, slow blinks.", "<b>Tail</b> slows to 3 s. Breathing slows to 3.6 s.", "Same title and caption; no hint box, no button."],
        sent: ["<b>Hop</b>: translateY 0, -4, 0 px with a small squash (scaleY .97), 360 ms, once per step.", "<b>Eyes</b> look up-right, toward the chain, blink once.", "<b>Bar head</b>: a dot rides the end of the fill and bumps (scale 1.5 to 1, 300 ms spring) when the step lands. Sent dot pops in (scale 0, 1.25, 1)."],
        processed: ["Second <b>hop</b> and blink; eyes move right.", "Bar to 66%, head dot bumps; Processed dot pops."],
        done: ["<b>Tail stops curled</b> (fully drawn) - the loader resolves into the mascot.", "<b>Happy hop</b>: -8 px with squash and stretch (520 ms) while the tongue strikes; the ground shadow shrinks and grows with it.", "One soft <b>ripple</b> behind the head; bar to 100%; Done rises."],
        fail: ["<b>Droop</b>: the body rotates -6 deg about the tail (420 ms) and the header shakes.", "<b>Colour shift</b>: skin goes pale (the artwork's own pale skin, 42% white) with a 300 ms fade, sad eyes and the frown.", "Tail rests, pale, fully drawn."],
        partial: ["<b>One sad eye</b>, wavy mouth, both eyes look down at the step card. A smaller droop (-3 deg).", "Skin keeps its colour: part of it went through."],
      },
    },

    C: {
      name: "C · Data-led", title: "Concept C: Data-led",
      lede: "The loader stays exactly where it is today and the mascot sits on it as a small badge that watches. The sheet adds facts: an elapsed timer, per-step times on a segmented track, and a receipt line when it lands.",
      mount(slot, root) {
        slot.innerHTML = `<div class="c-wrap" id="cw"><div class="c-main"><div class="c-load">${loaderHTML(48)}</div><div class="face c-done" id="cdone" style="width:56px;height:56px"></div>` +
          `<div class="c-bad">${IC.close(24)}</div></div><div class="face c-badge" id="cbadge" style="width:26px;height:26px"></div></div>`;
        $("#aside").innerHTML = `<div class="c-timer tnum" id="ctimer">0:00</div>`;
        $("#extra").innerHTML = `<div class="c-data tnum" id="cdata"></div>`;
        $$(".step", root).forEach((st) => st.insertAdjacentHTML("beforeend", `<span class="c-t tnum"></span>`));
        this.mb = new Mascot($("#cbadge"), "face", 26);
        this.md = new Mascot($("#cdone"), "face", 56);
        this.t0 = Date.now(); this.times = [];
        setInterval(() => this.tick(), 200);
      },
      tick() {
        if (!this.running) return;
        const el = $("#ctimer"); if (!el) return;
        const s = Math.floor((Date.now() - this.t0) / 1000);
        el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      },
      enter(s, prev) {
        const cw = $("#cw"); cw.dataset.s = s;
        const now = Date.now(), el = (Date.now() - this.t0) / 1000;
        this.mb.reset(); this.md.reset();
        if (s === "wallet") { this.t0 = now; this.times = []; this.running = true; this.mb.mode("idle", { x: [0.1, 0.9], y: [-0.6, 0.2] }); }
        else if (s === "long") { if (prev !== "wallet" || el < 60) this.t0 = now - 63000; this.running = true; this.mb.mode("patient"); }
        else if (s === "sent" || s === "processed") {
          this.running = true;
          const live = prev === "wallet" || prev === "long" || prev === "sent";
          if (s === "sent" && prev !== "sent") this.times = [prev === "wallet" || prev === "long" ? Math.max(0.4, el) : 4.2];
          if (s === "processed" && this.times[1] == null) {
            if (this.times[0] == null) this.times[0] = 4.2;
            this.times[1] = prev === "sent" ? Math.max(this.times[0] + 0.3, el) : this.times[0] + 0.9;
          }
          if (!live) this.t0 = now - (this.times[1] || this.times[0]) * 1000;
          this.mb.mode("track"); this.mb.lookTo([0.9, -0.5], [0.8, -0.6]); this.mb.blinkOnce();
        } else if (s === "done") {
          this.running = false;
          if (this.times[0] == null) this.times[0] = 4.2;
          if (this.times[1] == null) this.times[1] = this.times[0] + 0.9;
          this.times[2] = prev === "processed" ? Math.max(this.times[1] + 0.4, el) : this.times[1] + 7.6;
          this.md.mode("track"); this.md.near = [0.6, 0.1]; this.md.far = [0.4, 0.2]; this.md.strike(260);
          $("#cdata").innerHTML = `<span>Confirmed in ${this.times[2].toFixed(1)} s</span><span>Fee 0.000005 SOL</span><span>5Kq2…8sWd</span>`;
        } else if (s === "fail") { this.running = false; this.mb.set({ eyes: "sad", mouth: "line" }); this.mb.mode("off"); restart($("#hd"), "shake"); }
        else if (s === "partial") { this.running = false; this.mb.set({ eyeNear: "sad", mouth: "wavy" }); this.mb.mode("off"); restart($("#hd"), "shake"); }
        this.tick();
        $("#ctimer").classList.remove("warn"); // calm: the timer never turns into a warning
        // per-step times under the labels
        $$(".step .c-t").forEach((t, i) => { t.textContent = STEP[s] > i && this.times[i] != null ? `${this.times[i].toFixed(1)} s` : s === "fail" && i === 0 ? "Not sent" : ""; });
      },
      refresh() { this.mb.render(); this.md.render(); },
      moves: {
        wallet: ["<b>Loader</b>: today's 48 px tail loader, untouched (1.8 s draw / hold / retract, linear spin).", "<b>Mascot badge</b> (26 px face, surface ring) glances toward the title; blinks as in the app.", "<b>Timer</b> counts up in tabular figures (text change every second, no animation).", "<b>Track</b>: 4 px bar with two hairline ticks at the step boundaries."],
        long: ["Timer passes 1:00 in the same quiet colour (no warning).", "Badge goes <b>patient</b> (heavy lids, slow glances). Same title and caption, no hint box or button."],
        sent: ["Fill runs to the first tick (500 ms, app ease). The <b>step time</b> fades in under Sent (\"0.6 s\").", "Badge <b>looks up-right and blinks</b>: acknowledges each step, nothing else moves."],
        processed: ["Fill to the second tick; Processed shows its time."],
        done: ["<b>Loader crossfades</b> to the 56 px MascotDone face (scale .8 to 1, 240 ms); the badge folds away (scale to 0).", "Tongue strike, as in the app.", "A <b>receipt line</b> rises in: confirmed time, fee, signature (tabular)."],
        fail: ["Loader becomes the pink X ring; <b>badge stays</b> with sad eyes. Header shakes once.", "The track stays visible: fill turns pink where it stopped and the step reads <b>Not sent</b>."],
        partial: ["X ring + sad-eyed badge, shake; the step card lists what is confirmed (with its hash) and what is not."],
      },
    },
  };

  /* ---------------- page chrome ---------------- */
  function linkWith(href) { return `${href}?theme=${prefs.theme}&device=${prefs.device}&rm=${prefs.rm ? 1 : 0}`; }
  function topHTML() {
    const tabs = ["A", "B", "C"].map((k) => `<a href="concept-${k.toLowerCase()}.html" class="${KEY === k ? "on" : ""}" data-link>${CONCEPTS[k].name}</a>`).join("");
    return `<a class="brand" href="index.html" data-link><span class="dot"></span><span>Transaction sheet motion<small>Vanna · prototype, not wired to the app</small></span></a>` +
      `<nav class="seg" aria-label="Concepts">${tabs}</nav><span class="grow"></span>` +
      `<div class="seg" role="group" aria-label="Theme"><button data-theme-set="light">Light</button><button data-theme-set="dark">Dark</button></div>` +
      `<div class="seg" role="group" aria-label="Device"><button data-device-set="k50i">Redmi K50i</button><button data-device-set="ultra">Galaxy S Ultra</button></div>` +
      `<label class="toggle"><input type="checkbox" id="rmT"> Reduce motion</label>` +
      (page === "concept"
        ? `<div class="sizer" role="group" aria-label="Phone size"><span class="sz-l">Size</span><input type="range" id="scR" min="40" max="150" step="1" aria-label="Phone size in percent">` +
          `<span class="sz-v tnum" id="scV">100%</span><div class="seg">${[50, 75, 100, 125].map((v) => `<button data-scale="${v}">${v}</button>`).join("")}<button data-scale="fit">Fit to window</button></div></div>`
        : "");
  }
  function syncChrome() {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.classList.toggle("rm", prefs.rm);
    $$("[data-theme-set]").forEach((b) => b.classList.toggle("on", b.dataset.themeSet === prefs.theme));
    $$("[data-device-set]").forEach((b) => b.classList.toggle("on", b.dataset.deviceSet === prefs.device));
    const r = $("#rmT"); if (r) r.checked = prefs.rm;
    $$("[data-link]").forEach((a) => { a.href = linkWith(a.getAttribute("href").split("?")[0]); });
    store.set("theme", prefs.theme); store.set("device", prefs.device); store.set("rm", prefs.rm ? "1" : "0");
    history.replaceState(null, "", linkWith(location.pathname.split("/").pop() || "index.html"));
  }
  function wireChrome(onChange) {
    const top = $("#top"); top.innerHTML = topHTML();
    top.addEventListener("click", (e) => {
      const t = e.target.closest("[data-theme-set],[data-device-set]"); if (!t) return;
      if (t.dataset.themeSet) prefs.theme = t.dataset.themeSet; else prefs.device = t.dataset.deviceSet;
      syncChrome(); onChange && onChange(t.dataset.themeSet ? "theme" : "device");
    });
    $("#rmT").addEventListener("change", (e) => { prefs.rm = e.target.checked; syncChrome(); onChange && onChange("rm"); });
    syncChrome();
  }

  /* ---------------- landing page ---------------- */
  if (page === "index") {
    const paint = () => {
      const tile = prefs.theme === "dark" ? DARK_TILE : undefined;
      const f = (o, s) => { const r = Ch.face({ pal: "ds", tile, ...o }); return `<div class="face" style="width:${s}px;height:${s}px"><svg viewBox="${r.vb}" width="${s}" height="${s}">${r.svg}</svg></div>`; };
      const body = (o) => { const r = Ch.markA({ pal: "ds", ...o }); return `<svg viewBox="${r.vb}" width="112" height="72">${r.svg}</svg>`; };
      $("#pa").innerHTML = `<div class="pv-a">${f({}, 56)}<span class="pv-badge">${loaderHTML(22)}</span></div>`;
      $("#pb").innerHTML = body({ lookNear: [0.5, -0.6], lookFar: [0.4, -0.6] });
      $("#pc").innerHTML = `<div class="pv-c">${loaderHTML(48)}<span class="pv-cb">${f({ lookNear: [0.9, -0.5], lookFar: [0.8, -0.6] }, 26)}</span></div>`;
    };
    wireChrome(paint); paint();
    return;
  }

  /* ---------------- concept page ---------------- */
  const concept = CONCEPTS[KEY];
  document.title = `${concept.title} · Tx sheet motion`;
  document.body.classList.add("c" + KEY);

  const statusHTML = () => `<div class="statusbar"><span class="tnum">10:24</span><span class="icons">` +
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 22 22 2v20Z" opacity=".95"/></svg>` +
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21 0 6.6Q2.5 4.45 5.6 3.225 8.7 2 12 2t6.4 1.225Q21.5 4.45 24 6.6Z"/></svg>` +
    `<svg width="24" height="14" viewBox="0 0 26 14"><rect x=".75" y=".75" width="21" height="12.5" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".6"/><rect x="3" y="3" width="14" height="8" rx="1.8" fill="currentColor"/><rect x="23.2" y="4.5" width="2" height="5" rx="1" fill="currentColor" opacity=".6"/></svg></span></div>`;
  const chart = (() => { let y = 60, d = "M0 60"; const pts = [8, -6, 10, -4, -12, 6, -8, 14, -10, 4, -14, 8, -6, -10, 12, -8, -4, -12, 6, -10]; pts.forEach((v, i) => { y = Math.max(10, Math.min(90, y + v)); d += ` L${(i + 1) * 19} ${y}`; }); return d; })();
  const appHTML = () => `<div class="app" aria-hidden="true"><div class="hero"><div class="hrow"><span class="t">Perps</span><span style="font-size:13px;font-weight:600;background:rgba(255,255,255,.16);padding:6px 10px;border-radius:999px">Phoenix</span></div>` +
    `<div class="tabs"><span class="on">Markets</span><span>Positions</span><span>History</span><span>Account</span></div>` +
    `<div class="mk"><i></i>SOLUSDC <span style="opacity:.7;font-weight:400">Solana</span></div><div class="px tnum">$187.42</div><div class="chg tnum">+2.31% today</div>` +
    `<svg class="chart" width="380" height="100" viewBox="0 0 380 100"><path d="${chart}" stroke="#32EEE2" stroke-width="2" fill="none"/></svg></div>` +
    `<div class="body"><div class="card"><div class="ls"><span class="on">Long</span><span>Short</span></div>` +
    `<div class="row" style="margin-top:8px"><span>Collateral</span><b class="tnum">10.00 USDC</b></div><div class="row"><span>Leverage</span><b>2x</b></div><div class="row"><span>Size</span><b class="tnum">0.2667 SOL</b></div>` +
    `<div class="cta">Review long</div></div></div>` +
    `<div class="tabbar"><div><i></i>Portfolio</div><div><i></i>Earn</div><div class="mid"><i></i></div><div class="on"><i></i>Trade</div><div><i></i>Farm</div></div></div>`;
  const stepsHTML = () => ["Sent", "Processed", "Confirmed"].map((l, i) => `<div class="step">${i ? '<span class="em"></span>' : ""}<span class="dot"></span><span class="sl">${l}</span></div>`).join("");
  const cardHTML = () => `<div class="card" id="card">` +
    `<div class="trow"><div class="ck ok">${IC.check(16)}</div><div style="flex:1;min-width:0"><div class="stT">Deposit to Phoenix</div><div class="stD tnum">10 USDC · 4xQm…9Lta</div></div><span class="tag teal">Confirmed</span></div>` +
    `<div class="trow"><div class="ck bad">${IC.close(14)}</div><div style="flex:1;min-width:0"><div class="stT">Open long SOL 2x</div><div class="stD tnum">0.2667 SOL · Didn't go through</div></div><span class="tag neg">Not confirmed</span></div></div>`;
  const txvHTML = () => `<div class="txv" id="txv" data-s="wallet">` +
    `<div class="hd" id="hd"><div class="slot" id="slot"></div><div class="tt"><div class="h" id="h"></div><div class="cap" id="cap"></div></div><div id="aside"></div>` +
    `<button class="ia explorer" aria-label="View on Solana Explorer">${IC.open(22)}</button></div>` +
    `${cardHTML()}<div id="extra"></div>` +

    `<div class="prog" id="prog"><div class="bar"><span class="tick" style="left:33.3%"></span><span class="tick" style="left:66.6%"></span><div class="fill" id="fill"><span class="gl"><span class="glint"></span></span></div></div><div class="steps">${stepsHTML()}</div></div>` +
    `<div class="acts" id="acts"><button class="btn" id="primary">Done</button><button class="tbtn" id="secondary">Close</button></div></div>`;

  document.body.insertAdjacentHTML("beforeend",
    `<header class="top" id="top"></header><main class="stage"><div class="phone-col"><div class="fitbox" id="fitbox"><div class="fit" id="fit"></div></div></div>` +
    `<aside class="panel"><div><h1>${concept.title}</h1><p class="lede">${concept.lede}</p></div>` +
    `<div><div class="lbl">Journey · <span id="mode">Autoplay</span></div>` +
    `<div class="transport"><button class="pbtn" id="pp"></button><div class="seg" role="group" aria-label="Speed">${[0.5, 1, 2].map((v) => `<button data-speed="${v}">${v}x</button>`).join("")}</div></div>` +
    `<div class="jbar" id="jbar" aria-label="Journey timeline"></div>` +
    `<div class="jlegend"><button data-path="Success">Success path</button><button data-path="Failure">Failure path</button><button data-path="Partial">Partial path</button><button id="restart">Restart</button></div>` +
    `<div class="dbg tnum" id="dbg">frame 0</div>` +
    `<label class="toggle" style="margin-top:8px"><input type="checkbox" id="dbgT"> Show frame counter on the phone</label></div>` +
    `<div><div class="lbl">Manual state (stops the journey, the state keeps animating)</div><div class="chips" id="chips">${STATES.map((s) => `<button data-s="${s}">${SLABEL[s]}</button>`).join("")}</div>` +
    `<input class="range" id="range" type="range" min="0" max="6" step="1" value="0" aria-label="Step through states"></div>` +
    `<div><div class="lbl" id="movesLbl">What moves</div><ul class="moves" id="moves"></ul></div></aside></main>`);

  let cur = null;
  function buildDevice() {
    $("#fit").innerHTML = `<div class="device ${prefs.device === "ultra" ? "ultra" : ""}" id="device"><i class="key k1"></i><i class="key k2"></i>` +
      `<div class="screen closed" id="screen">${appHTML()}<div class="scrim"></div><div class="sheet" id="sheet"><div class="handle"></div>` +
      `<div class="shead"><div class="title">Review long SOLUSDC</div><button class="xbtn" aria-label="Close">${IC.close(22)}</button></div><div class="sbody">${txvHTML()}</div></div>` +
      `${statusHTML()}<div class="punch"></div><div class="gesture"></div><div class="dbg-over tnum" id="dbgOver" hidden></div></div></div>`;
    $("#dbgOver").hidden = store.get("dbg", "0") !== "1";
    concept.mount($("#slot"), $("#txv"));
    fit();
  }
  /* size control: a fixed percentage (40 to 150) or "fit" (from the window height), remembered in localStorage */
  function autoScale(w, h) {
    const col = $(".phone-col");
    const wide = window.innerWidth > 900;
    const availH = (wide ? col.clientHeight : window.innerHeight - $("#top").offsetHeight - 32) - 16;
    const availW = col.clientWidth - 8;
    return Math.max(0.4, Math.min(1.5, availH / h, availW / w));
  }
  function fit() {
    const d = $("#device"); if (!d) return;
    const w = d.offsetWidth, h = d.offsetHeight;
    const mode = store.get("scale", "fit");
    const s = mode === "fit" ? autoScale(w, h) : Math.max(0.4, Math.min(1.5, (+mode || 100) / 100));
    $("#fit").style.cssText = `width:${w}px;transform:scale(${s})`;
    $("#fitbox").style.cssText = `width:${w * s}px;height:${h * s}px`;
    const pct = Math.round(s * 100);
    $("#scR").value = pct; $("#scV").textContent = pct + "%";
    $$("[data-scale]").forEach((b) => b.classList.toggle("on", b.dataset.scale === mode));
  }
  function setScale(v) { store.set("scale", String(v)); fit(); }

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
    hT = setTimeout(() => { sh.style.height = ""; sh.classList.remove("anim-h"); }, 300);
  }


  /* ---------------- state change: cross-fade the text, grow the bar, light the steps (margin-flow pacing) ---------------- */
  let swapT;
  function setText(s, animate) {
    const tt = $(".tt"), h = COPY[s][0], c = COPY[s][1];
    clearTimeout(swapT); tt.classList.remove("swapout");
    if (!animate || prefs.rm || ($("#h").textContent === h && $("#cap").textContent === c)) { $("#h").textContent = h; $("#cap").textContent = c; return; }
    tt.classList.add("swapout");
    swapT = setTimeout(() => withHeight(() => { $("#h").textContent = h; $("#cap").textContent = c; tt.classList.remove("swapout"); restart(tt, "swapin"); }), 170 / SPEED.v);
  }
  function go(s) {
    const prev = cur; cur = s;
    withHeight(() => {
      const txv = $("#txv"); txv.dataset.s = s;
      setText(s, !!prev);
      const step = STEP[s];
      if (s !== "partial") $("#fill").style.width = [8, 33, 66, 100][step] + "%";
      $$(".step", txv).forEach((el, i) => {
        el.classList.toggle("lit", step > i && s !== "fail");
        // the step being waited for breathes
        el.classList.toggle("next", i === step && ["wallet", "long", "sent", "processed"].includes(s));
        if (step > i && (prev == null || STEP[prev] <= i || prev === "fail")) restart(el, "pop");
      });
      $("#primary").textContent = s === "done" ? "Done" : s === "partial" ? "Try again from step 2" : "Try again";
      $("#secondary").style.display = s === "done" ? "none" : "";
      ["#acts", "#card", "#cdata"].forEach((q) => { const el = $(q); if (el && prev !== s) restart(el, "rise"); });
      concept.enter(s, prev);
    });
    $$("#chips button").forEach((b) => b.classList.toggle("on", b.dataset.s === s));
    $("#range").value = STATES.indexOf(s);
    $("#movesLbl").textContent = `What moves · ${SLABEL[s]}`;
    $("#moves").innerHTML = concept.moves[s].map((m) => `<li>${m}</li>`).join("");
  }

  /* ---------------- the journey timeline (requestAnimationFrame, virtual clock, loops) ---------------- */
  const JOURNEY = [
    { s: "wallet", d: 3200, path: "Success" }, { s: "long", d: 3600, path: "Success" }, { s: "sent", d: 2200, path: "Success" },
    { s: "processed", d: 2400, path: "Success" }, { s: "done", d: 4400, path: "Success" }, { s: "close", d: 900, path: "Success" },
    { s: "wallet", d: 2400, path: "Failure" }, { s: "long", d: 3200, path: "Failure" }, { s: "fail", d: 4200, path: "Failure" }, { s: "close", d: 900, path: "Failure" },
    { s: "wallet", d: 2000, path: "Partial" }, { s: "sent", d: 1800, path: "Partial" }, { s: "processed", d: 2000, path: "Partial" }, { s: "partial", d: 4600, path: "Partial" }, { s: "close", d: 900, path: "Partial" },
  ];
  const TOTAL = JOURNEY.reduce((a, x) => a + x.d, 0);
  const START = JOURNEY.map((_, i) => JOURNEY.slice(0, i).reduce((a, x) => a + x.d, 0));
  const TL = { i: 0, t: 0, auto: true, paused: false, frame: 0, last: 0 };

  function enterSeg(i) {
    TL.i = i; TL.t = 0;
    const seg = JOURNEY[i], sc = $("#screen");
    if (seg.s === "close") { sc.classList.add("closed"); return; }
    if (sc.classList.contains("closed")) {
      // a new run: reset the sheet while it is down, then let it rise (overlay.tsx: 380 ms)
      cur = null; go(seg.s);
      requestAnimationFrame(() => requestAnimationFrame(() => sc.classList.remove("closed")));
    } else go(seg.s);
  }
  function setAuto(on) {
    TL.auto = on; TL.paused = false;
    document.documentElement.classList.remove("paused");
    if (!on) $("#screen").classList.remove("closed");
    syncTransport();
  }
  function syncTransport() {
    const pb = $("#pp");
    const playing = TL.auto && !TL.paused;
    pb.innerHTML = playing ? `${PAUSE_IC} Pause` : `${PLAY_IC} ${TL.auto ? "Resume" : "Autoplay full journey"}`;
    pb.classList.toggle("main", !playing);
    $$("[data-speed]").forEach((b) => b.classList.toggle("on", +b.dataset.speed === SPEED.v));
    $("#mode").textContent = TL.auto ? (TL.paused ? "Paused" : "Autoplay") : "Manual state (still animating)";
  }
  // speed: CSS animations and transitions follow through playbackRate, the mascot timers through SPEED.v
  function applyRate() {
    if (!document.getAnimations) return;
    const r = SPEED.v;
    document.getAnimations().forEach((a) => { if (a.playbackRate !== r) a.playbackRate = r; });
  }
  function tick(ts) {
    const dt = TL.last ? Math.min(64, ts - TL.last) : 16; TL.last = ts;
    TL.frame++;
    if (TL.auto && !TL.paused) {
      TL.t += dt * SPEED.v;
      if (TL.t >= JOURNEY[TL.i].d) enterSeg((TL.i + 1) % JOURNEY.length);
    }
    applyRate();
    // journey bar, playhead and the frame counter: proof that the timeline advances on its own
    const g = TL.auto ? (START[TL.i] + Math.min(TL.t, JOURNEY[TL.i].d)) / TOTAL : null;
    const ph = $("#playhead"); if (ph) ph.style.transform = `translateX(${(g == null ? 0 : g) * 100}%)`;
    const seg = JOURNEY[TL.i];
    const dbg = `frame ${TL.frame} · ${SPEED.v}x · ${TL.auto ? `${seg.path} path · ${seg.s === "close" ? "sheet closes" : SLABEL[seg.s]} ${(TL.t / 1000).toFixed(1)} / ${(seg.d / 1000).toFixed(1)} s` : `manual · ${SLABEL[cur]}`}${TL.paused ? " · paused" : ""}`;
    if (TL.frame % 3 === 0) { $("#dbg").textContent = dbg; const o = $("#dbgOver"); if (o) o.textContent = dbg; }
    requestAnimationFrame(tick);
  }

  const PLAY_IC = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>`;
  const PAUSE_IC = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>`;

  // journey bar segments
  $("#jbar").innerHTML = JOURNEY.map((x, i) => `<button class="js js-${x.s}" style="flex:${x.d}" data-seg="${i}" title="${x.path}: ${x.s === "close" ? "sheet closes" : SLABEL[x.s]}"></button>`).join("") + `<span class="playhead" id="playhead"></span>`;
  $("#jbar").addEventListener("click", (e) => { const b = e.target.closest("[data-seg]"); if (!b) return; setAuto(true); enterSeg(+b.dataset.seg); });

  wireChrome((what) => {
    if (what === "device") { const s = cur; buildDevice(); cur = null; go(s || "wallet"); $("#screen").classList.remove("closed"); }
    else if (what === "theme") concept.refresh();
    else { const s = cur; cur = null; go(s); }
  });
  buildDevice();
  $("#pp").addEventListener("click", () => {
    if (!TL.auto) { setAuto(true); enterSeg(0); return; }
    TL.paused = !TL.paused;
    document.documentElement.classList.toggle("paused", TL.paused);
    syncTransport();
  });
  $$("[data-speed]").forEach((b) => b.addEventListener("click", () => { SPEED.v = +b.dataset.speed; store.set("speed", b.dataset.speed); syncTransport(); }));
  $$("[data-path]").forEach((b) => b.addEventListener("click", () => { setAuto(true); $("#screen").classList.add("closed"); enterSeg(JOURNEY.findIndex((x) => x.path === b.dataset.path)); }));
  $("#restart").addEventListener("click", () => { setAuto(true); $("#screen").classList.add("closed"); enterSeg(0); });
  $("#chips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { setAuto(false); go(b.dataset.s); } });
  $("#range").addEventListener("input", (e) => { setAuto(false); go(STATES[+e.target.value]); });
  $("#dbgT").addEventListener("change", (e) => { store.set("dbg", e.target.checked ? "1" : "0"); $("#dbgOver").hidden = !e.target.checked; });
  $("#dbgT").checked = store.get("dbg", "0") === "1"; $("#dbgOver").hidden = !$("#dbgT").checked;
  window.addEventListener("resize", fit);
  $("#scR").addEventListener("input", (e) => setScale(e.target.value));
  $$("[data-scale]").forEach((b) => b.addEventListener("click", () => setScale(b.dataset.scale)));
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    const i = STATES.indexOf(cur);
    if (e.key === "ArrowRight") { setAuto(false); go(STATES[Math.min(6, i + 1)]); }
    if (e.key === "ArrowLeft") { setAuto(false); go(STATES[Math.max(0, i - 1)]); }
    if (e.key === " ") { e.preventDefault(); $("#pp").click(); }
  });

  // default: autoplay the full journey as soon as the page opens; ?state=x opens that state in manual mode instead
  const start = qs.get("state");
  if (start && STATES.includes(start)) { setAuto(false); go(start); }
  else { setAuto(true); enterSeg(0); }
  requestAnimationFrame(tick);
  if (document.fonts) document.fonts.ready.then(fit);
})();