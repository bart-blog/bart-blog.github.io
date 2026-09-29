/* Schuberg Philis — "Some systems never sleep." A commercial in 150 shapes.
   It's 3 a.m. and a pulse beats on a monitor. It is the beacon of a plane taking off, the check on a payment, and the
   current that lights up a city. Everything has to work, yet only 35% of IT projects succeed and the grid of
   projects sags and goes grey. Then the hero becomes the Schuberg Philis backslash: it cuts through the grid, the
   cut opens into brand blue and every dot relights (99%+ project success). The grid becomes an uptime status page
   (100%), a plan → build → run turbine circled by one team, four expertise icons led by experts, and finally
   everything lines up as one slanted band that collapses into the backslash of the logo.
   Shape 0 is the hero; shape 1 is a background layer (halo glow, and the full-screen wipes). */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, hit = BJ.hit, clamp = BJ.clamp, lerp = BJ.lerp, C = BJ.C, mix = BJ.mix;
  const TAU = BJ.TAU, PI = Math.PI, N = BJ.N;

  // ------------------------------------------------------------ drawing helpers
  const hide = (p) => { p.o = 0; p.w = p.h = 0; };
  function circle(p, x, y, d, c) { d = Math.max(0, d); p.x = x; p.y = y; p.w = p.h = d; p.r = d / 2; p.c = c; }
  function rect(p, x, y, w, h, r, c) { p.x = x; p.y = y; p.w = Math.max(0, w); p.h = Math.max(0, h); p.r = r; p.c = c; }
  function pill(p, x, y, len, th, rot, c) { p.x = x; p.y = y; p.w = th; p.h = Math.max(th, len); p.r = th / 2; p.rot = rot; p.c = c; p.sym = PI; }
  function seg(p, x0, y0, x1, y1, th, c) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-6;
    pill(p, (x0 + x1) / 2, (y0 + y1) / 2, L + th, th, Math.atan2(-dx / L, dy / L), c);
  }
  const maxHit = (b, times, decay) => { let e = 0; for (const t of times) e = Math.max(e, hit(b, t, decay)); return e; };
  function perLayout(fn) { let v = -1, val; return () => { if (v !== G.version) { v = G.version; val = fn(); } return val; }; }
  const hash = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
  const gau = (x, s) => Math.exp(-0.5 * (x / s) * (x / s));
  const invSine = (u) => Math.acos(1 - 2 * clamp(u)) / PI; // inverse of ease.inOutSine
  const hw = () => Math.min(G.W * 0.44, G.R * 2.3); // half the width the visuals may use

  // The backslash of the logo leans 17° off vertical. DX, DY: down its length; PX, PY: across it.
  const ANG = (17 * PI) / 180, DX = Math.sin(ANG), DY = Math.cos(ANG), PX = Math.cos(ANG), PY = -Math.sin(ANG);
  function slashBar(p, x, y, len, th, c) { p.x = x; p.y = y; p.w = Math.max(0, th); p.h = Math.max(0, len, th); p.r = th * 0.22; p.rot = -ANG; p.c = c; p.sym = PI; }

  // Evaluate another scene's pose (used to plan morphs with least travel).
  const tmp = {};
  function poseAt(sc, i, b) {
    tmp.x = tmp.y = tmp.z = tmp.w = tmp.h = tmp.r = tmp.tip = tmp.rot = tmp.rx = tmp.ry = tmp.sym = 0; tmp.o = 1; tmp.c = C.ink;
    sc.pose(i, b, tmp);
    return tmp;
  }
  const visible = (q) => q.o > 0.02 && q.w > 0.5 && q.h > 0.5;

  // On the blue scenes *highlights* turn navy (css: body.onblue).
  let blueNow = null;
  function setBlue(v) { if (v !== blueNow) { blueNow = v; document.body.classList.toggle('onblue', v); } }
  const subY = () => (G.textY + G.F * 1.5) / G.H; // a small source line under a two-line headline

  // A soft halo that swells and fades after each beat in `beats`.
  function glow(p, x, y, b, beats, base, c) {
    let last = -99;
    for (const t of beats) if (b >= t) last = t;
    if (last < -50) { circle(p, x, y, base * 2, c); p.o = 0.12; return; }
    const u = clamp((b - last) / 1.4);
    circle(p, x, y, base * (1.6 + 4 * E.outCubic(u)), c);
    p.o = 0.3 * (1 - u) + 0.04;
  }

  // ------------------------------------------------------------ music helpers
  function groove(M, a, z, o = {}) {
    for (let b = a; b < z - 0.01; b += 1) {
      M.kick(b, o.k === undefined ? 0.26 : o.k);
      M.hat(b + 0.5, o.h === undefined ? 0.05 : o.h);
      if (o.clap && Math.round(b - a) % 2 === 1) M.clap(b, o.clap);
      if (o.tick) { M.tick(b + 0.25, o.tick, 0.3); M.tick(b + 0.75, o.tick, -0.3); }
    }
  }
  function bassLine(M, a, z, note, v = 0.2) { for (let b = a; b < z - 0.01; b += 0.5) M.bass(b, note, 0.4, (b - a) % 1 ? v * 0.7 : v); }

  // =========================================================== 1 · 3 a.m.
  // One blue dot beats in the dark; a heart-monitor line writes itself behind it, a beep under every beat.
  const HB = [1, 3, 5, 7];
  function ecg(t) {
    let y = 0;
    for (const T of HB) {
      const d = t - T;
      if (d < -0.3 || d > 0.8) continue;
      y += -0.14 * gau(d + 0.08, 0.035) + gau(d, 0.045) - 0.4 * gau(d - 0.08, 0.035) + 0.22 * gau(d - 0.4, 0.08);
    }
    return y;
  }
  const NT = 110, DTB = 3.2 / NT, TS = 0.45;
  const penX = (b) => hw() * 0.45 * E.inOutCubic(clamp((b - 0.1) / 1.1));
  const amp1 = () => G.R * 0.5, sp1 = () => (hw() * 1.9) / NT;
  function tpt(k, b) { // sample k of the trace (0 = the pen); samples sit on a fixed time grid so peaks never flicker
    if (k === 0) return [penX(b), -amp1() * ecg(b), b];
    const n0 = Math.floor(b / DTB), fr = b / DTB - n0, t = (n0 - (k - 1)) * DTB;
    return [penX(b) - (k - 1 + fr) * sp1(), -amp1() * ecg(t), t];
  }
  const S1 = {
    name: 'pulse',
    title: 'It\'s 3 a.m.',
    beats: 8,
    introBeat: 0,
    blend: { dur: 0.01 },
    bg: () => { setBlue(false); return C.bg; },
    dark: () => true,
    pose(i, b, p) {
      const pulse = maxHit(b, HB, 5) + 0.5 * maxHit(b, HB.map((t) => t + 0.3), 6);
      if (i === 0) { const [x, y] = tpt(0, b); return circle(p, x, y, G.R * 0.08 * (1 + 0.4 * pulse), C.blue); }
      if (i === 1) { const [x, y] = tpt(0, b); return glow(p, x, y, b, HB, G.R * 0.08, C.blue); }
      if (i >= 2 && i < 2 + NT) {
        const j = i - 2, a = tpt(j, b), c = tpt(j + 1, b);
        if (c[2] < TS) return hide(p);
        const f = j / NT;
        seg(p, a[0], a[1], c[0], c[1], G.R * 0.022, mix(C.blue, C.slate, Math.min(1, f * 1.3)));
        p.o = Math.pow(1 - f, 1.3);
        return;
      }
      hide(p);
    },
    type: [
      { id: 'pulse.time', at: 0.4, to: 3.6, text: 'It\'s 3 a.m.' },
      { id: 'pulse.never', at: 4.0, to: 7.75, text: 'Some systems | *never* sleep.' },
    ],
    music(M) {
      M.pad(0, 'A2 E3 G3 C4', 8, 0.2); M.sub(0, 'A1', 8, 0.12);
      for (let b = 0; b < 8; b++) M.tick(b, 0.025, b % 2 ? 0.3 : -0.3);
      HB.forEach((T) => { M.thump(T, 0.45); M.thump(T + 0.3, 0.25); M.beep(T, 'E6', 0.045); });
      M.ep(0.4, 'E5', 0.07); M.ep(4, 'C5', 0.07); M.ep(4.5, 'G5', 0.06); M.ep(5, 'B5', 0.05);
      M.whoosh(7.2, 0.8, 0.05, 300, 2600);
    },
  };

  // =========================================================== 2 · every flight, every payment, every light
  // The trace becomes a runway and a plane (2–6) lifts off; its beacon is the hero. The runway lights (7–22) turn
  // into the numbers on a card (23, chip 24) that taps a reader (146) and gets a check (147 + the hero).
  // A skyline rises (buildings 45–53, windows 54–141, grid line 142, live line 143); the pulse runs along the
  // grid and lights every window.
  const s2 = () => Math.min(G.R * 1.05, hw() * 0.95);
  const PY2 = () => -G.R * 0.02;
  function planeT(b) {
    const lift = E.inCubic(clamp((b - 1.9) / 2.0)), pitch = -0.26 * E.outCubic(clamp((b - 1.6) / 0.8));
    return {
      x: -hw() * 0.2 + hw() * 0.12 * E.inOutSine(clamp(b / 1.9)) + lift * hw() * 1.6,
      y: PY2() - lift * G.R * 2.1 + Math.sin(b * 41) * G.R * 0.004 * (1 - clamp((b - 1.9) / 0.3)),
      a: pitch, k: s2() * (1 - 0.3 * lift),
    };
  }
  const tp = (T, lx, ly) => { const c = Math.cos(T.a), s = Math.sin(T.a); return [T.x + (lx * c - ly * s) * T.k, T.y + (lx * s + ly * c) * T.k]; };
  const PSEG = { 3: [0.1, -0.02, -0.2, 0.24, 0.08], 4: [-0.37, -0.03, -0.47, -0.27, 0.08], 5: [-0.36, 0.0, -0.5, 0.06, 0.05] };
  function planePart(p, i, T) {
    const k = T.k;
    if (i === 2) { const [x, y] = tp(T, 0, 0); rect(p, x, y, k, 0.13 * k, 0.065 * k, C.white); p.rot = T.a; return; }
    if (i === 6) { const [x, y] = tp(T, -0.03, 0.15); rect(p, x, y, 0.17 * k, 0.07 * k, 0.035 * k, C.mist); p.rot = T.a; return; }
    const S = PSEG[i], a = tp(T, S[0], S[1]), c = tp(T, S[2], S[3]);
    seg(p, a[0], a[1], c[0], c[1], S[4] * k, C.white);
  }
  const GY2 = () => PY2() + s2() * 0.36;
  const span2 = () => hw() * 2.3;
  function dashAt(k, b) {
    const sp = span2(), d = hw() * (0.25 * b + 0.55 * b * b);
    let x = ((k / 16) * sp - d) % sp;
    if (x < 0) x += sp;
    return [x - sp / 2, GY2(), (sp / 16) * (0.3 + 0.35 * clamp(b / 2.2))];
  }
  const BLINK2 = [0.5, 1.5, 2.5, 3.5];

  const cw2 = () => Math.min(G.R * 1.25, hw() * 1.0);
  function cardT(b) {
    const w = cw2(), e = E.glide(clamp((b - 4.0) / 0.8)), tin = E.inOutCubic(clamp((b - 5.0) / 1.0));
    const tout = E.outCubic(clamp((b - 6.1) / 0.6)), ex = E.inCubic(clamp((b - 7.6) / 0.7));
    return {
      x: lerp(-hw() * 1.8, -w * 0.34, e) + w * 0.38 * tin - w * 0.2 * tout - hw() * 2.4 * ex,
      y: -G.R * 0.05 - w * 0.03 * tin, a: lerp(-0.4, -0.1, e) + 0.1 * tin - 0.05 * tout, k: w,
    };
  }
  const TAP = 6.0, WAVES2 = [4.6, 5.1, 5.6, TAP];
  function readerT(b) {
    const w = cw2(), sc = E.outBack(clamp((b - 4.3) / 0.4)) * (1 - E.inCubic(clamp((b - 7.6) / 0.35))) * (1 + 0.2 * hit(b, TAP, 4));
    return { x: w * 0.64, y: -G.R * 0.05, d: w * 0.36, sc };
  }
  const CHK = [[-0.2, 0.0], [-0.06, 0.14], [0.22, -0.14]];
  const rp = (Rd, pt) => [Rd.x + pt[0] * Rd.d * Rd.sc, Rd.y + pt[1] * Rd.d * Rd.sc];

  const ROWS = [3, 5, 4, 8, 5, 7, 3, 5, 4];
  const WIN = [];
  ROWS.forEach((n, k) => { for (let r = 0; r < n; r++) for (let c = 0; c < 2; c++) WIN.push({ k, c, r }); }); // 88 windows
  const city = perLayout(() => {
    const span = hw() * 1.9, bwp = span / 9, bw = bwp * 0.8;
    return { span, bwp, bw, py: Math.min(G.R * 0.125, bw * 0.62), gy: G.R * 0.6 };
  });
  const bx = (k) => { const L = city(); return -L.span / 2 + (k + 0.5) * L.bwp; };
  const RUN2 = [8.8, 11.0];
  const runX = (b) => { const L = city(); return -L.span / 2 + L.span * E.inOutSine(clamp((b - RUN2[0]) / (RUN2[1] - RUN2[0]))); };
  const passK = (k) => RUN2[0] + (RUN2[1] - RUN2[0]) * invSine((k + 0.5) / 9); // when the pulse reaches building k
  const rise2 = (k, b) => E.snap(clamp((b - 8.15 - k * 0.06) / 0.5));
  const WIN_OFF = () => mix(C.navy, C.slate, 0.25), WIN_ON = () => mix(C.white, C.cyan, 0.3);

  const S2 = {
    name: 'moments',
    title: 'Flights, payments, power',
    beats: 12,
    blend: { dur: (i) => (i < 23 ? 0.55 + (i % 7) * 0.05 : 0.4), ease: E.glide, arc: 0.12 },
    bg: () => { setBlue(false); return C.bg; },
    dark: () => true,
    pose(i, b, p) {
      const L = city();
      // ---- the hero: beacon → contactless signal → check → the pulse on the grid
      if (i === 0) {
        if (b < 3.4) {
          const T = planeT(b), [x, y] = tp(T, -0.48, -0.3), bl = maxHit(b, BLINK2, 6);
          return circle(p, x, y, T.k * 0.06 * (1 + 0.6 * bl), mix(C.blue, C.cyan, bl));
        }
        const Rd = readerT(b);
        if (b < TAP) {
          const T = planeT(3.4), [x0, y0] = tp(T, -0.48, -0.3), e = E.glide(clamp((b - 3.4) / 0.9));
          const [x1, y1] = rp(Rd, [0, 0]), sig = maxHit(b, WAVES2, 5);
          return circle(p, lerp(x0, x1, e), lerp(y0, y1, e), lerp(T.k * 0.06, Rd.d * 0.14 * (1 + 0.4 * sig), e), mix(C.blue, C.white, e));
        }
        if (b < 7.95) {
          const [ax, ay] = rp(Rd, CHK[1]), g = E.outCubic(clamp((b - 6.2) / 0.3)), [cx, cy] = rp(Rd, CHK[2]);
          const [sx, sy] = rp(Rd, [0, 0]), m = E.inOutCubic(clamp((b - TAP) / 0.2)), th = Rd.d * Rd.sc * 0.09;
          if (b < 6.2) return circle(p, lerp(sx, ax, m), lerp(sy, ay, m), lerp(Rd.d * 0.14, th, m), C.white);
          return seg(p, ax, ay, lerp(ax, cx, g), lerp(ay, cy, g), th, C.white);
        }
        const e = E.glide(clamp((b - 7.95) / 0.8)), x0 = readerT(7.9).x, y0 = readerT(7.9).y;
        if (b < RUN2[0]) return circle(p, lerp(x0, -L.span / 2, e), lerp(y0, L.gy + G.R * 0.05, e), G.R * 0.07 * clamp(e * 2), C.blue);
        return circle(p, runX(b), L.gy + G.R * 0.05, G.R * 0.07 * (1 + 0.25 * maxHit(b, [9, 10, 11], 5)), C.blue);
      }
      if (i === 1) { // glow: contactless waves around the reader, then around the pulse
        if (b < 4.4) return hide(p);
        if (b < 7.6) { const Rd = readerT(b); return glow(p, Rd.x, Rd.y, b, WAVES2, Rd.d * 0.3 * Rd.sc, C.blue); }
        if (b < RUN2[0]) return hide(p);
        return glow(p, runX(b), L.gy + G.R * 0.05, b, [9, 10, 11], G.R * 0.07, C.blue);
      }
      // ---- flight
      if (i >= 2 && i <= 6) { if (b > 4.2) return hide(p); return planePart(p, i, planeT(b)); }
      if (i >= 7 && i <= 22) { // runway lights → card numbers
        const k = i - 7, sp = span2();
        if (b < 4.0) {
          const [x, y, len] = dashAt(k, b);
          seg(p, x - len / 2, y, x + len / 2, y, G.R * 0.022, C.mist);
          p.o = 0.9 * clamp((sp / 2 - Math.abs(x)) / (sp * 0.1)) * (1 - clamp((b - 3.3) / 0.5) * 0.3);
          return;
        }
        const T = cardT(b), dl = [-0.38 + Math.floor(k / 4) * 0.215 + (k % 4) * 0.043, 0.15], [tx, ty] = tp(T, dl[0], dl[1]);
        const [x0, y0, len0] = dashAt(k, 4.0), e = E.glide(clamp((b - 4.0) / 0.8)), len = lerp(len0, 0, e), th = lerp(G.R * 0.022, T.k * 0.03, e);
        const x = lerp(x0, tx, e), y = lerp(y0, ty, e);
        return seg(p, x - len / 2, y, x + len / 2, y, th, mix(C.mist, C.white, e));
      }
      // ---- payment
      if (i === 23 || i === 24) {
        if (b < 3.9 || b > 8.4) return hide(p);
        const T = cardT(b);
        if (i === 23) rect(p, T.x, T.y, T.k, 0.63 * T.k, 0.06 * T.k, mix(C.slate, C.blue, 0.35));
        else { const [x, y] = tp(T, -0.3, -0.1); rect(p, x, y, 0.15 * T.k, 0.115 * T.k, 0.025 * T.k, C.mist); }
        p.rot = T.a;
        return;
      }
      if (i === 146 || i === 147) {
        if (b < 4.3 || b > 7.95) return hide(p);
        const Rd = readerT(b);
        if (i === 146) return circle(p, Rd.x, Rd.y, Rd.d * Rd.sc, mix(C.blue, C.cyan, 0.5 * hit(b, TAP, 3)));
        if (b < TAP) return hide(p);
        const g = E.outCubic(clamp((b - TAP) / 0.2)), [x0, y0] = rp(Rd, CHK[0]), [x1, y1] = rp(Rd, CHK[1]);
        return seg(p, x0, y0, lerp(x0, x1, g), lerp(y0, y1, g), Rd.d * Rd.sc * 0.09, C.white);
      }
      // ---- the city
      if (i >= 45 && i <= 53) {
        const k = i - 45, h = (ROWS[k] + 1.1) * L.py * rise2(k, b);
        if (h < 0.5) return hide(p);
        return rect(p, bx(k), L.gy - h / 2, L.bw, h, L.bw * 0.05, mix(C.navy, C.slate, 0.55));
      }
      if (i >= 54 && i <= 141) {
        const w = WIN[i - 54], a = clamp((b - (8.3 + w.k * 0.06 + w.r * 0.05)) / 0.2);
        if (a <= 0) return hide(p);
        const tOn = passK(w.k) + w.r * 0.05, on = clamp((b - tOn) / 0.12), fl = hit(b, tOn, 5);
        rect(p, bx(w.k) + (w.c - 0.5) * L.bw * 0.42, L.gy - (w.r + 0.85) * L.py, L.bw * 0.26 * (1 + 0.3 * fl), L.py * 0.5 * (1 + 0.3 * fl), L.bw * 0.03, mix(WIN_OFF(), WIN_ON(), on));
        p.o = a;
        return;
      }
      if (i === 142) {
        const e = E.outCubic(clamp((b - 8.05) / 0.5));
        if (e <= 0.01) return hide(p);
        return seg(p, (-L.span / 2) * e, L.gy + G.R * 0.05, (L.span / 2) * e, L.gy + G.R * 0.05, G.R * 0.018, C.slate);
      }
      if (i === 143) {
        if (b < RUN2[0] + 0.02) return hide(p);
        return seg(p, -L.span / 2, L.gy + G.R * 0.05, runX(b), L.gy + G.R * 0.05, G.R * 0.022, C.blue);
      }
      hide(p);
    },
    type: [
      { id: 'moments.flight', at: 0.3, to: 3.7, text: 'Every flight.' },
      { id: 'moments.payment', at: 4.2, to: 7.7, text: 'Every payment.' },
      { id: 'moments.light', at: 8.3, to: 11.75, text: 'Every light | in the city.' },
    ],
    music(M) {
      M.pad(0, 'F2 C3 A3 E4', 4, 0.22); M.sub(0, 'F1', 4, 0.14);
      M.pad(4, 'A2 E3 G3 C4', 4, 0.22); M.sub(4, 'A1', 4, 0.14);
      M.pad(8, 'C3 G3 D4 E4', 4, 0.24); M.sub(8, 'C2', 4, 0.15);
      // flight: engines spool up, the plane lifts off
      for (let b = 0; b < 4; b++) { M.kick(b, 0.2); M.tick(b + 0.5, 0.03, 0.3); }
      M.riser(0.2, 1.8, 0.1); M.whoosh(1.9, 2.0, 0.09, 200, 2400);
      BLINK2.forEach((t) => M.blip(t, 'E6', 0.03, 0.4));
      M.pluck(0.3, 'A4', 0.08, -0.3); M.pluck(1.3, 'C5', 0.08, 0.3); M.pluck(2.3, 'E5', 0.08, -0.3); M.pluck(2.8, 'G5', 0.07, 0.3);
      // payment: the card slides in, the reader calls, a chime on the tap
      M.whoosh(4.0, 0.8, 0.06, 2600, 500);
      [4.6, 5.1, 5.6].forEach((t) => M.blip(t, 'E6', 0.05, 0.3));
      M.coin(TAP, 'E6', 0.12, 0.3); M.marimba(TAP + 0.1, 'A5', 0.14); M.marimba(TAP + 0.3, 'E6', 0.12);
      for (let b = 4; b < 8; b++) { M.kick(b, 0.22); M.hat(b + 0.5, 0.04); }
      M.clap(5, 0.1); M.clap(7, 0.12);
      M.whoosh(7.6, 0.7, 0.05, 2400, 400);
      // the city: buildings snap up, every window lights as the pulse passes
      for (let k = 0; k < 9; k++) M.snap(8.15 + k * 0.06, 0.06, (k - 4) / 5);
      const PEN = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6'];
      for (let k = 0; k < 9; k++) M.pluck(passK(k), PEN[k], 0.1, (k - 4) / 5, 0.2);
      groove(M, 8, 12, { k: 0.26, h: 0.05, clap: 0.12 });
      bassLine(M, 8, 12, 'C2', 0.18);
      M.whoosh(11.3, 0.7, 0.05, 400, 2600);
    },
  };

  // =========================================================== 3 · the odds
  // The city folds into a 10 × 10 field of projects, one of them the blue hero (slot 0). It pulses like the heart
  // monitor while everything simply has to work, then 65 of them flicker, sag and go grey: 35% succeed.
  const GRID = [0];
  for (let i = 45; i <= 143; i++) GRID.push(i); // 100 shapes: hero + 99
  const grid = perLayout(() => {
    const gs = Math.min(G.R * 1.5, hw() * 1.7), pitch = gs / 9, gy = -G.R * 0.12;
    return { gs, pitch, gy, d: pitch * 0.42 };
  });
  const slotXY = (s) => { const L = grid(); return [-L.gs / 2 + (s % 10) * L.pitch, L.gy - L.gs / 2 + Math.floor(s / 10) * L.pitch]; };
  const slotOf3 = perLayout(() => { // least-travel from the skyline into the grid
    const ids = GRID.slice(1), from = ids.map((i) => { const q = poseAt(S2, i, 12); return [q.x, q.y]; });
    const m = BJ.assign(99, (a, s) => { const [x, y] = slotXY(s + 1); return Math.hypot(from[a][0] - x, from[a][1] - y); });
    const out = new Int16Array(N).fill(-1);
    out[0] = 0;
    ids.forEach((i, a) => { out[i] = m[a] + 1; });
    return out;
  });
  const FAILT = new Float32Array(100).fill(-1); // when each failing slot sags (-1: it succeeds)
  Array.from({ length: 99 }, (_, k) => k + 1).sort((a, b) => hash(a * 7.13) - hash(b * 7.13)).slice(0, 65)
    .forEach((s, k) => { FAILT[s] = 4.0 + (k % 3) * 0.5; });
  const RIP3 = [1, 3]; // heartbeats ripple out from the hero
  function failState(s, b) { // 0 = healthy, 1 = sagged
    const t = FAILT[s];
    if (t < 0) return 0;
    return E.spring(clamp((b - t) / 0.7));
  }
  function gridDot(p, s, b, c, extra) {
    const L = grid(), [x, y] = slotXY(s), f = failState(s, b);
    circle(p, x, y + f * L.pitch * 0.34, L.d * (1 - 0.38 * clamp(f)) * (extra || 1), mix(c, C.slate, clamp(f)));
  }
  const S3 = {
    name: 'odds',
    title: 'Only 35% succeed',
    beats: 8,
    blend: { dur: 0.8, start: (i) => (i === 0 ? 0 : 0.05 + hash(i * 3.3) * 0.35), ease: E.glide, arc: 0.18 },
    bg: () => { setBlue(false); return C.bg; },
    dark: () => true,
    pose(i, b, p) {
      const s = slotOf3()[i];
      if (s < 0) return hide(p);
      const [x, y] = slotXY(s), dist = Math.hypot(x - slotXY(0)[0], y - slotXY(0)[1]) / grid().gs;
      const rip = RIP3.reduce((a, t) => a + hit(b, t + dist * 0.5, 6), 0);
      if (i === 0) return circle(p, x, y, grid().d * 1.25 * (1 + 0.35 * maxHit(b, RIP3, 5)), C.blue);
      gridDot(p, s, b, C.white, 1 + 0.35 * rip);
      const t = FAILT[s];
      if (t > 0 && b > 3.5 && b < t) p.o = 0.35 + 0.65 * (hash(Math.floor(b * 14) + s * 1.7) > 0.4 ? 1 : 0);
    },
    type: [
      { id: 'odds.work', at: 0.9, to: 3.7, text: 'It all | just has to work.' },
      { id: 'odds.35', at: 4.1, to: 7.75, text: 'Yet only *35%* of | IT projects succeed.' },
      { id: 'odds.src', at: 4.8, to: 7.75, text: 'Industry average', cls: 'sub', size: 0.42, y: subY },
    ],
    music(M) {
      M.pad(0, 'A2 E3 G3 C4', 4, 0.22); M.sub(0, 'A1', 4, 0.14);
      M.pad(4, 'D3 F3 A3 C4', 4, 0.2); M.sub(4, 'D2', 4, 0.13);
      RIP3.forEach((t) => { M.thump(t, 0.4); M.thump(t + 0.3, 0.22); M.beep(t, 'E6', 0.04); });
      for (let b = 0; b < 4; b++) { M.hat(b + 0.5, 0.04); M.tick(b, 0.03); }
      M.marimba(0.2, 'C5', 0.12); M.marimba(0.7, 'E5', 0.1); M.marimba(1.2, 'G5', 0.1);
      // the flicker, then three sags that fall down the scale
      for (let k = 0; k < 10; k++) M.tick(3.5 + k * 0.05, 0.03 + 0.03 * hash(k), (hash(k + 9) - 0.5));
      M.womp(4.0, 'A2', 0.8, 0.22); M.drop(4.0, 'E5', 0.1); M.drop(4.5, 'C5', 0.1); M.drop(5.0, 'A4', 0.1);
      M.buzz(3.55, 0.05);
      M.riser(6.2, 1.8, 0.16);
    },
  };

  // =========================================================== 4 · the backslash
  // The hero leaves the grid, becomes the Schuberg Philis backslash and cuts the screen open. The cut widens into
  // brand blue; as its edge reaches each grey project, the project springs back up, white again. 99%+ succeed.
  const slash = perLayout(() => {
    const L = grid(), len = (G.H * 1.35) / DY, th = Math.max(10, G.R * 0.11);
    return { x: 0, y: L.gy, len, th, top: [-DX * len / 2, L.gy - DY * len / 2], D: Math.hypot(G.W, G.H) * 1.05 };
  });
  const CUT4 = [0.7, 1.2], WIPE4 = [1.2, 2.1], BLUE4 = 2.1, HOME4 = [2.3, 3.1];
  const perp = (x, y) => { const Sl = slash(); return Math.abs((x - Sl.x) * PX + (y - Sl.y) * PY); };
  const wipeAt = (b) => slash().D * E.outCubic(clamp((b - WIPE4[0]) / (WIPE4[1] - WIPE4[0])));
  const reach4 = (s) => { // when the wipe edge passes slot s
    const [x, y] = slotXY(s), u = clamp(perp(x, y) / slash().D);
    return WIPE4[0] + (WIPE4[1] - WIPE4[0]) * (1 - Math.cbrt(1 - u));
  };
  const SHIM4 = [4, 5, 6, 7, 8, 9];
  function shimmer(x, y, b, beats) {
    const L = grid(), sp = x * PX + (y - L.gy) * PY;
    let e = 0;
    for (const t of beats) {
      const u = (b - t) / 0.9;
      if (u < 0 || u > 1) continue;
      e = Math.max(e, gau(sp - lerp(-L.gs * 0.85, L.gs * 0.85, u), L.pitch * 0.9));
    }
    return e;
  }
  const S4 = {
    name: 'slash',
    title: 'The backslash',
    beats: 10,
    blend: { dur: 0.01 },
    bg: (b) => { setBlue(b >= BLUE4); return b >= BLUE4 ? C.blue : C.bg; },
    dark: () => true,
    pose(i, b, p) {
      const Sl = slash(), L = grid();
      if (i === 0) {
        const [hx, hy] = slotXY(0), d0 = L.d * 1.25;
        if (b < CUT4[0]) { // anticipation dip, then up and away
          const dip = Math.sin(PI * clamp(b / 0.2)) * L.pitch * 0.15 * (b < 0.2 ? 1 : 0), u = E.inCubic(clamp((b - 0.15) / 0.55));
          return circle(p, lerp(hx, Sl.top[0], u), lerp(hy, Sl.top[1], u) + dip, d0 * (1 - 0.2 * u), C.blue);
        }
        if (b < HOME4[0]) { // the cut: the top stays, the bar grows down through the screen, then opens into the wipe
          const g = E.outQuint(clamp((b - CUT4[0]) / (CUT4[1] - CUT4[0]))), len = lerp(Sl.th, Sl.len, g);
          const open = 1 - E.outCubic(clamp((b - WIPE4[0]) / 0.45)), th = Sl.th * (1 + 0.3 * hit(b, CUT4[1], 5)) * open;
          if (th < 0.6) return hide(p);
          return slashBar(p, Sl.top[0] + DX * len / 2, Sl.top[1] + DY * len / 2, len, th, mix(C.white, C.blue, g));
        }
        // back home: a navy dot pops into slot 0, the one that always made it
        const u = E.outBack(clamp((b - HOME4[0]) / 0.5));
        circle(p, hx, hy, d0 * u * (1 + 0.3 * shimmer(hx, hy, b, SHIM4)), C.navy);
        return;
      }
      if (i === 1) {
        if (b < WIPE4[0] || b > BLUE4 + 0.1) return hide(p);
        const w = Sl.th + 2 * wipeAt(b);
        rect(p, Sl.x, Sl.y, w, Sl.len * 1.3, 0, C.blue);
        p.rot = -ANG;
        return;
      }
      const s = slotOf3()[i];
      if (s < 0) return hide(p);
      const [x, y] = slotXY(s), tr = reach4(s), f = FAILT[s] > 0 ? 1 - E.spring(clamp((b - tr) / 0.8)) : 0;
      const pop = hit(b, tr, 5), sh = shimmer(x, y, b, SHIM4);
      circle(p, x, y + f * L.pitch * 0.34, L.d * (1 - 0.38 * clamp(f)) * (1 + 0.45 * pop + 0.35 * sh), mix(C.white, C.slate, clamp(f)));
    },
    type: [
      { id: 'slash.sp', at: 2.4, to: 5.6, text: 'At *Schuberg\u00a0Philis,* | they succeed.', stagger: 0.12 },
      { id: 'slash.99', at: 6.0, to: 9.75, text: '*99%+* project | success rate.' },
      { id: 'slash.vs', at: 6.6, to: 9.75, text: 'vs. 35% industry average', cls: 'sub', size: 0.42, y: subY },
    ],
    music(M) {
      M.whoosh(0.1, 0.6, 0.08, 400, 3200);
      M.rip(CUT4[0], 0.5, 0.35);
      M.kick(CUT4[1], 0.6); M.boom(CUT4[1], 0.5); M.crash(CUT4[1], 0.22); M.sub(CUT4[1], 'C2', 3, 0.28);
      M.whoosh(WIPE4[0], 0.9, 0.08, 3000, 300);
      M.pad(CUT4[1], 'C3 G3 C4 E4', 2.8, 0.3);
      for (let k = 0; k < 12; k++) M.pluck(1.3 + k * 0.07, ['C5', 'E5', 'G5', 'C6'][k % 4], 0.06, ((k % 5) - 2) / 3, 0.15);
      M.bell(HOME4[1], 'G6', 0.1);
      M.pad(4, 'G2 D3 B3 D4', 2, 0.24); M.pad(6, 'A2 E3 C4 E4', 2, 0.24); M.pad(8, 'F2 C3 A3 E4', 2, 0.24);
      bassLine(M, 4, 6, 'G1', 0.2); bassLine(M, 6, 8, 'A1', 0.2); bassLine(M, 8, 10, 'F1', 0.2);
      groove(M, 4, 10, { k: 0.34, h: 0.06, clap: 0.16 });
      SHIM4.forEach((t, k) => M.marimba(t, ['E5', 'G5', 'A5', 'C6', 'D6', 'E6'][k], 0.1, k % 2 ? 0.35 : -0.35));
      M.whoosh(9.3, 0.7, 0.05, 400, 2400);
    },
  };

  // =========================================================== 5 · uptime
  // The projects become a status page: three services, 33 days each, every bar up. The hero hops along the top
  // row, landing on the beat.
  const up = perLayout(() => {
    const span = Math.min(hw() * 2, G.R * 3.3), pitch = span / 33, bh = Math.min(G.R * 0.26, pitch * 3.4), gap = bh * 0.55;
    return { span, pitch, bw: pitch * 0.58, bh, gap, y0: -G.R * 0.12 - (bh + gap) };
  });
  const barXY = (k) => { const U = up(); return [-U.span / 2 + ((k % 33) + 0.5) * U.pitch, U.y0 + Math.floor(k / 33) * (U.bh + U.gap)]; };
  const barOf5 = perLayout(() => {
    const ids = GRID.slice(1), m = BJ.assign(99, (a, k) => { const [x, y] = slotXY(slotOf3()[ids[a]]), [bx2, by] = barXY(k); return Math.hypot(x - bx2, (y - by) * 0.6); });
    const out = new Int16Array(N).fill(-1);
    ids.forEach((i, a) => { out[i] = m[a]; });
    return out;
  });
  const HOP5 = [1, 2, 3, 4, 5, 6, 7];
  const hopX = (b) => { const U = up(); return -U.span * 0.42 + U.span * 0.84 * clamp((b - 1) / 6); };
  function heroUp(b) {
    const U = up(), d = G.R * 0.075, top = U.y0 - U.bh / 2;
    const ph = clamp(b - 1, 0, 6), jump = Math.sin(PI * (ph % 1)) * U.bh * 1.1 * (b < 7 ? 1 : 0);
    const land = maxHit(b, HOP5, 7);
    return { x: hopX(b), y: top - d / 2 * (1 - 0.3 * land) - jump - U.bh * 0.08 * (1 - land), d, land };
  }
  const S5 = {
    name: 'uptime',
    title: '100% uptime',
    beats: 8,
    blend: { dur: (i) => (i === 0 ? 1.0 : 0.7), start: (i) => { if (i === 0) return 0; const k = barOf5()[i]; return k < 0 ? 0 : 0.05 + 0.5 * ((k % 33) / 33); }, ease: E.glide, arc: 0.1 },
    bg: () => { setBlue(true); return C.blue; },
    dark: () => true,
    pose(i, b, p) {
      const U = up();
      if (i === 0) { const H0 = heroUp(b); return rect(p, H0.x, H0.y, H0.d * (1 + 0.3 * H0.land), H0.d * (1 - 0.25 * H0.land), H0.d / 2, C.navy); }
      const k = barOf5()[i];
      if (k < 0) return hide(p);
      const [x, y] = barXY(k), near = Math.floor(k / 33) === 0 ? gau(x - hopX(b), U.pitch * 1.2) : 0;
      const sq = near * maxHit(b, HOP5, 6) * 0.22, wave = 0.12 * maxHit(b, [4.0 + (k % 33) * 0.012, 6.0 + (k % 33) * 0.012], 5);
      const h = U.bh * (1 - sq + wave);
      rect(p, x, y + U.bh / 2 - h / 2, U.bw, h, U.bw * 0.3, C.white);
    },
    type: [
      { id: 'uptime.100', at: 0.5, to: 3.7, text: '*100%* uptime.' },
      { id: 'uptime.never', at: 4.0, to: 7.75, text: 'For the systems | that *never* sleep.' },
    ],
    music(M) {
      M.pad(0, 'C3 G3 C4 E4', 2, 0.24); M.pad(2, 'G2 D3 B3 D4', 2, 0.24); M.pad(4, 'A2 E3 C4 E4', 2, 0.24); M.pad(6, 'F2 C3 A3 E4', 2, 0.24);
      bassLine(M, 0, 2, 'C2'); bassLine(M, 2, 4, 'G1'); bassLine(M, 4, 6, 'A1'); bassLine(M, 6, 8, 'F1');
      groove(M, 0, 8, { k: 0.34, h: 0.06, clap: 0.16, tick: 0.02 });
      const UP = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'E6'];
      HOP5.forEach((t, k) => { M.marimba(t, UP[k], 0.13, -0.6 + k * 0.2); M.blip(t - 0.5, 'G5', 0.03); });
      M.coin(0.5, 'C6', 0.08);
      M.whoosh(7.3, 0.7, 0.05, 400, 2400);
    },
  };

  // =========================================================== 6 · plan, build, run
  // A quarter of the status bars become a blueprint (plan), stamp in as solid blocks row by row (build) and then
  // swing out into a spinning turbine (run). The hero and six teammates circle it the whole time: one team.
  const TEAM_BARS = [2, 30, 50, 70, 90, 98];
  const crew = perLayout(() => {
    const m = barOf5(), st = [], team = [0];
    for (let i = 1; i < N; i++) {
      const k = m[i];
      if (k < 0) continue;
      if (k % 4 === 0) st.push(i);
      else if (TEAM_BARS.includes(k)) team.push(i);
    }
    // the blueprint slot for each structure shape: least travel from its bar
    const sz = st6(), slots = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) slots.push([(c - 2) * sz.pitch, sz.y + (r - 2) * sz.pitch, r, c]);
    const a = BJ.assign(25, (u, v) => { const [x, y] = barXY(m[st[u]]); return Math.hypot(x - slots[v][0], y - slots[v][1]); });
    const slot = new Int16Array(N).fill(-1), ring = new Int16Array(N).fill(-1);
    st.forEach((i, u) => { slot[i] = a[u]; });
    // ring order: by angle around the centre, so blocks swing out to their nearest spoke
    st.slice().sort((p, q) => {
      const A = slots[slot[p]], B = slots[slot[q]];
      return Math.atan2(A[1] - sz.y, A[0]) - Math.atan2(B[1] - sz.y, B[0]);
    }).forEach((i, k) => { ring[i] = k; });
    const tm = new Int16Array(N).fill(-1);
    team.forEach((i, j) => { tm[i] = j; });
    return { st, team, slots, slot, ring, tm };
  });
  const st6 = perLayout(() => { const S = Math.min(G.R * 0.6, hw() * 0.68); return { S, pitch: S / 2, y: -G.R * 0.12, Ro: S * 1.5 }; });
  const BUILD6 = 3.0, ROW6 = 0.36, RUN6 = 6.0;
  const spin6 = (b) => { const t = b - RUN6; return t < 0 ? 0 : t < 1.2 ? 0.9 * t * t : 0.9 * 1.44 + 2.16 * (t - 1.2); };
  const orbitA = (j, b) => (TAU * j) / 7 - PI / 2 + 0.55 * b + 0.25 * Math.max(0, b - RUN6);
  function orbitXY(j, b) {
    const Z = st6(), a = orbitA(j, b), R0 = Z.Ro * (1 + 0.05 * maxHit(b, [3, 3.36, 3.72, 4.08, 4.44], 6));
    return [Math.cos(a) * R0, Z.y + Math.sin(a) * R0 * 0.92];
  }
  function structPose(p, i, b) {
    const Z = st6(), cr = crew(), sl = cr.slots[cr.slot[i]], row = 4 - sl[2];
    const tb = BUILD6 + row * ROW6 + sl[3] * 0.03, stamp = clamp((b - tb) / 0.18), k = cr.ring[i];
    const blk = Z.pitch * 0.84, dot = Z.pitch * 0.2;
    // plan: faint dots; build: blocks drop in from above and stamp
    const drop = (1 - E.outCubic(stamp)) * Z.pitch * 0.6 * (stamp > 0 ? 1 : 0);
    let x = sl[0], y = sl[1] - drop, w = stamp > 0 ? lerp(dot, blk, E.outBack(stamp)) : dot * (1 + 0.4 * hit(b, 0.3 + (sl[2] + sl[3]) * 0.08, 5));
    let h = w, r = stamp > 0 ? blk * 0.16 : w / 2, rot = 0;
    const c = stamp > 0 ? C.white : mix(C.blue, C.white, 0.55);
    // run: every block swings out to a spoke of a spinning ring
    const u = E.inOutCubic(clamp((b - RUN6 - k * 0.025) / 0.7));
    if (u > 0) {
      const a = (TAU * k) / 25 + spin6(b), rr = Z.S * 0.78, len = Z.pitch * 0.62, th = Z.pitch * 0.2;
      x = lerp(x, Math.cos(a) * rr, u); y = lerp(y, Z.y + Math.sin(a) * rr, u);
      w = lerp(w, th, u); h = lerp(h, len, u); r = lerp(r, th / 2, u); rot = lerp(0, a - PI / 2, u);
    }
    rect(p, x, y, w, h, r, c);
    p.rot = rot;
  }
  const S6 = {
    name: 'team',
    title: 'Plan, build, run',
    beats: 12,
    blend: { dur: 0.9, start: (i) => hash(i * 1.9) * 0.3, ease: E.glide, arc: 0.2 },
    bg: () => { setBlue(true); return C.blue; },
    dark: () => true,
    pose(i, b, p) {
      const cr = crew(), j = cr.tm[i];
      if (j >= 0) {
        const [x, y] = orbitXY(j, b), d = G.R * (j === 0 ? 0.075 : 0.06);
        return circle(p, x, y, d * (1 + 0.3 * maxHit(b, [RUN6, 9, 10, 11], 5)), C.navy);
      }
      if (cr.slot[i] >= 0) return structPose(p, i, b);
      hide(p);
    },
    type: [
      { id: 'team.pbr', at: 0.3, to: 8.6, text: 'Plan. Build. Run.', stagger: 2.9 },
      { id: 'team.one', at: 8.9, to: 11.75, text: '*One* team, | start to finish.' },
    ],
    music(M) {
      M.pad(0, 'F2 C3 A3 E4', 3, 0.22); M.sub(0, 'F1', 3, 0.14);
      // plan: sparse bells over a soft tick
      for (let b = 0; b < 3; b++) { M.tick(b, 0.03); M.hat(b + 0.5, 0.04); }
      M.bell(0.3, 'C6', 0.07); M.bell(0.8, 'G5', 0.05, 0.3); M.bell(1.3, 'E6', 0.06, -0.3); M.bell(2.3, 'D6', 0.05);
      // build: one stamp per row, rising
      M.pad(3, 'G2 D3 B3 D4', 3, 0.24); M.sub(3, 'G1', 3, 0.16);
      for (let r = 0; r < 5; r++) { M.stamp(BUILD6 + r * ROW6 + 0.06, 0.3); M.marimba(BUILD6 + r * ROW6 + 0.06, ['G4', 'B4', 'D5', 'G5', 'B5'][r], 0.1); }
      M.kick(5, 0.3); M.clap(5.5, 0.1);
      // run: the turbine spins up
      M.riser(RUN6 - 0.4, 1.4, 0.14); M.kick(RUN6, 0.5); M.crash(RUN6, 0.14);
      M.pad(6, 'A2 E3 C4 E4', 3, 0.26); M.pad(9, 'F2 C3 A3 C4', 1.5, 0.26); M.pad(10.5, 'G2 D3 B3 D4', 1.5, 0.26);
      bassLine(M, 6, 9, 'A1'); bassLine(M, 9, 10.5, 'F1'); bassLine(M, 10.5, 12, 'G1');
      groove(M, 6, 12, { k: 0.36, h: 0.07, clap: 0.18, tick: 0.025 });
      for (let k = 0; k < 16; k++) M.shaker(6 + k * 0.375, 0.03, k % 2 ? 0.4 : -0.4);
      M.whoosh(11.3, 0.7, 0.05, 400, 2600);
    },
  };

  // =========================================================== 7 · craft
  // The turbine bursts into four icons, one per beat: cloud, data & AI, software, security. The hero hops from
  // icon to icon with the team in tow: experts in the lead.
  const icons = perLayout(() => {
    const y = -G.R * 0.12;
    if (G.portrait) { const cell = Math.min(hw() * 0.95, G.R * 0.95); return { c: cell * 0.56, at: [[-cell / 2, y - cell / 2], [cell / 2, y - cell / 2], [-cell / 2, y + cell / 2], [cell / 2, y + cell / 2]] }; }
    const cell = Math.min((hw() * 2) / 4, G.R * 0.95);
    return { c: cell * 0.56, at: [0, 1, 2, 3].map((k) => [(k - 1.5) * cell, y]) };
  });
  const POP7 = [0.5, 1.5, 2.5, 3.5];
  // Icon parts in units of the icon size, centred on the icon. [kind, icon, ...]
  //   c: circle x y d · r: rect x y w h radius · s: segment x0 y0 x1 y1 thickness · sh: shield x y size
  const PARTS = [
    ['c', 0, -0.2, -0.08, 0.5], ['c', 0, 0.16, -0.17, 0.62], ['c', 0, 0.4, 0.04, 0.34], ['r', 0, 0.03, 0.14, 0.94, 0.34, 0.17],
    ['r', 1, -0.36, 0.23, 0.14, 0.3, 0.05], ['r', 1, -0.14, 0.12, 0.14, 0.52, 0.05], ['r', 1, 0.08, 0.02, 0.14, 0.72, 0.05],
    ['s', 1, 0.32, -0.42, 0.32, -0.18, 0.1], ['s', 1, 0.2, -0.3, 0.44, -0.3, 0.1], ['c', 1, -0.36, -0.33, 0.12],
    ['r', 2, 0, 0, 1.0, 0.78, 0.1], ['s', 2, -0.14, 0.02, -0.28, 0.14, 0.08], ['s', 2, -0.28, 0.14, -0.14, 0.26, 0.08],
    ['s', 2, 0.14, 0.02, 0.28, 0.14, 0.08], ['s', 2, 0.28, 0.14, 0.14, 0.26, 0.08], ['s', 2, 0.06, -0.02, -0.06, 0.3, 0.07],
    ['sh', 3, 0, -0.1, 0.62], ['s', 3, -0.17, -0.04, -0.05, 0.08, 0.1], ['s', 3, -0.05, 0.08, 0.2, -0.17, 0.1],
  ];
  const BLUEPART = { 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 17: 1, 18: 1 }; // drawn on a white base: in brand blue
  const partAt = (k) => { const P = PARTS[k], I = icons(), [ox, oy] = I.at[P[1]]; return [ox + P[2] * I.c, oy + P[3] * I.c]; };
  function drawPart(p, k, sc) {
    const P = PARTS[k], I = icons(), c = I.c * sc, [ox, oy] = I.at[P[1]], col = BLUEPART[k] ? C.blue : C.white;
    if (P[0] === 'c') return circle(p, ox + P[2] * c, oy + P[3] * c, P[4] * c, col);
    if (P[0] === 'r') return rect(p, ox + P[2] * c, oy + P[3] * c, P[4] * c, P[5] * c, P[6] * c, col);
    if (P[0] === 's') return seg(p, ox + P[2] * c, oy + P[3] * c, ox + P[4] * c, oy + P[5] * c, P[6] * c, col);
    rect(p, ox + P[2] * c, oy + P[3] * c, P[4] * c, P[4] * c, P[4] * c * 0.18, col); p.tip = 1; p.rot = (-3 * PI) / 4;
  }
  const craft = perLayout(() => { // structure shapes → icon parts (19) + 6 that burst into sparks
    const st = crew().st, from = st.map((i) => { const q = poseAt(S6, i, 12); return [q.x, q.y]; });
    const m = BJ.assign(25, (u, v) => { if (v >= PARTS.length) return G.R * 0.4; const [x, y] = partAt(v); return Math.hypot(from[u][0] - x, from[u][1] - y); });
    const part = new Int16Array(N).fill(-1);
    st.forEach((i, u) => { part[i] = m[u]; });
    // within an icon, later parts (the blue details) must draw on top: give them the higher shape indices
    for (let k = 0; k < 4; k++) {
      const shapes = st.filter((i) => part[i] < PARTS.length && PARTS[part[i]][1] === k).sort((a, b) => a - b);
      const parts = shapes.map((i) => part[i]).sort((a, b) => a - b);
      shapes.forEach((i, n) => { part[i] = parts[n]; });
    }
    return { part, from };
  });
  // 16 sparks from spare shapes (anything not in the structure or the team)
  const sparkIds = perLayout(() => { const cr = crew(), ids = []; for (let i = 144; ids.length < 16 && i < N; i++) ids.push(i); for (let i = 2; ids.length < 16; i++) if (cr.slot[i] < 0 && cr.tm[i] < 0) ids.push(i); const o = new Int16Array(N).fill(-1); ids.forEach((i, k) => { o[i] = k; }); return o; });
  const HOPS7 = [0, 1, 2, 3, 2, 1, 0, 1];
  const perch = (k, j) => { const I = icons(), [x, y] = I.at[k], d = G.R * 0.06, side = j === 0 ? 0 : (j % 2 ? 1 : -1) * Math.ceil(j / 2); return [x + side * d * 1.25, y - I.c * 0.62 - d * 0.5 + Math.abs(side) * d * 0.12]; };
  function crewPath(j, t) { // t: beats into the scene for this member (lagged)
    const hop = 0.45;
    if (t < POP7[0] - hop) return orbitXY(j, 12 + t);
    let k = 0;
    while (k + 1 < HOPS7.length && t >= POP7[0] + k + 1 - hop) k++;
    const t0 = POP7[0] + k - hop, u = clamp((t - t0) / hop), from = k === 0 ? orbitXY(j, 12 + t0) : perch(HOPS7[k - 1], j), to = perch(HOPS7[k], j);
    const e = E.inOutSine(u), lift = Math.sin(PI * u) * icons().c * 0.55;
    return [lerp(from[0], to[0], e), lerp(from[1], to[1], e) - lift, u];
  }
  const S7 = {
    name: 'craft',
    title: 'Cloud, data & AI, software, security',
    beats: 8,
    blend: { dur: 0.01 },
    bg: () => { setBlue(true); return C.blue; },
    dark: () => true,
    pose(i, b, p) {
      const cr = crew(), j = cr.tm[i];
      if (j >= 0) {
        const [x, y] = crewPath(j, b - j * 0.07), d = G.R * (j === 0 ? 0.075 : 0.06);
        const land = maxHit(b - j * 0.07, HOPS7.map((_, k) => POP7[0] + k), 7);
        return rect(p, x, y, d * (1 + 0.25 * land), d * (1 - 0.2 * land), d / 2, C.navy);
      }
      const k = craft().part[i];
      if (k >= 0) {
        const q = poseAt(S6, i, 12 + b), f = { x: q.x, y: q.y, w: q.w, h: q.h, r: q.r, rot: q.rot, c: q.c };
        const icon = k < PARTS.length ? PARTS[k][1] : k % 4, tp0 = POP7[icon] - 0.4, u = E.outCubic(clamp((b - tp0) / 0.4));
        if (k >= PARTS.length) { // spare spokes burst outward and vanish
          const [ox, oy] = icons().at[icon];
          circle(p, lerp(f.x, ox, u), lerp(f.y, oy, u), lerp(f.w, 0, u), C.white);
          if (u <= 0) { rect(p, f.x, f.y, f.w, f.h, f.r, f.c); p.rot = f.rot; }
          if (u >= 1) hide(p);
          return;
        }
        drawPart(p, k, 1 + 0.12 * hit(b, POP7[icon], 5) + 0.06 * maxHit(b, [4.5, 5.5, 6.5, 7.5].filter((t, n) => HOPS7[n + 4] === icon), 6));
        if (u < 1) {
          const T = { x: p.x, y: p.y, w: p.w, h: p.h, r: p.r, rot: p.rot, c: p.c, tip: p.tip };
          p.x = lerp(f.x, T.x, u); p.y = lerp(f.y, T.y, u); p.w = lerp(f.w, T.w, u); p.h = lerp(f.h, T.h, u); p.r = lerp(f.r, T.r, u);
          p.rot = lerp(f.rot, T.rot + Math.round((f.rot - T.rot) / TAU) * TAU, u); p.tip = T.tip * u; p.c = mix(f.c, T.c, u);
        }
        return;
      }
      const s = sparkIds()[i];
      if (s >= 0) {
        const icon = s % 4, n = Math.floor(s / 4), u = clamp((b - POP7[icon]) / 0.6);
        if (u <= 0 || u >= 1) return hide(p);
        const I = icons(), [ox, oy] = I.at[icon], a = (TAU * n) / 4 + PI / 4 + icon * 0.3, rr = I.c * (0.45 + 0.4 * E.outCubic(u));
        pill(p, ox + Math.cos(a) * rr, oy + Math.sin(a) * rr, I.c * 0.16 * (1 - u), I.c * 0.05, a - PI / 2, C.white);
        p.o = 1 - u;
        return;
      }
      hide(p);
    },
    type: [
      { id: 'craft.four', at: 0.45, to: 4.1, text: 'Cloud. Data\u00a0&\u00a0AI. | Software. Security.', stagger: 1 },
      { id: 'craft.lead', at: 4.35, to: 7.75, text: 'With *experts* | in the lead.' },
    ],
    music(M) {
      M.pad(0, 'C3 G3 C4 E4', 4, 0.26); M.sub(0, 'C2', 4, 0.18);
      M.pad(4, 'A2 E3 C4 E4', 2, 0.26); M.pad(6, 'F2 C3 A3 E4', 2, 0.26);
      bassLine(M, 0, 4, 'C2'); bassLine(M, 4, 6, 'A1'); bassLine(M, 6, 8, 'F1');
      groove(M, 0, 8, { k: 0.36, h: 0.07, clap: 0.18, tick: 0.02 });
      POP7.forEach((t, k) => { M.coin(t, ['C6', 'E6', 'G6', 'E6'][k], 0.08, -0.45 + k * 0.3); M.pluck(t, ['C5', 'E5', 'G5', 'C6'][k], 0.1, 0, 0.2); M.snap(t, 0.12); });
      HOPS7.forEach((h, k) => { if (k >= 4) M.marimba(POP7[0] + k, ['C5', 'E5', 'G5', 'A5'][h], 0.1, -0.45 + h * 0.3); });
      M.riser(6.2, 1.8, 0.18);
    },
  };

  // =========================================================== 8 · the backslash, signed
  // Everything lines up in one slanted band: #1 in customer satisfaction. Night falls again (a navy wipe from the
  // band) and every dot turns brand blue. The hero draws one stroke down the band, the dots collapse into it,
  // and the stroke flies into the logo as its backslash.
  const band = perLayout(() => {
    const BL = Math.min(G.R * 1.9, G.H * 0.62), BW = BL * 0.16, y = -G.R * 0.1;
    return { BL, BW, y, d: Math.min(BL / 27, BW / 4) * 0.56, D: Math.hypot(G.W, G.H) * 1.05 };
  });
  const bandXY = (j) => { const B = band(), a = j % 28, c = Math.floor(j / 28), u = (a / 27 - 0.5) * B.BL, v = (c / 4 - 0.5) * B.BW; return [u * DX + v * PX, B.y + u * DY + v * PY, a / 27, v]; };
  const band8 = perLayout(() => {
    const ids = [];
    for (let i = 2; i <= 141; i++) ids.push(i);
    const from = ids.map((i) => { const q = poseAt(S7, i, 8); return visible(q) ? [q.x, q.y] : null; });
    const m = BJ.assign(140, (a, j) => { if (!from[a]) return 0; const [x, y] = bandXY(j); return Math.hypot(from[a][0] - x, from[a][1] - y); });
    const out = new Int16Array(N).fill(-1);
    ids.forEach((i, a) => { out[i] = m[a]; });
    return out;
  });
  const WIPE8 = [2.0, 2.9], DRAW8 = [4.6, 5.2], MOVE8 = [5.6, 6.6], LOGO8 = 6.3, HIDE8 = [7.0, 7.3], TAG8 = 7.0, CTA8 = 7.8;
  const logo8 = () => { const LW = Math.min(G.W * (G.portrait ? 0.74 : 0.42), G.R * 2.4, 580); return { LW, LH: LW / 3.625, y: -G.R * 0.18 }; };
  const reach8 = (v) => WIPE8[0] + (WIPE8[1] - WIPE8[0]) * (1 - Math.cbrt(1 - clamp(Math.abs(v) / band().D)));
  const drawLen = (b) => band().BL * 1.12 * E.inOutSine(clamp((b - DRAW8[0]) / (DRAW8[1] - DRAW8[0])));
  const collapse8 = (fa) => DRAW8[0] + (DRAW8[1] - DRAW8[0]) * invSine((fa + 0.06) / 1.12);
  const bandTop = () => { const B = band(), h = B.BL * 0.56; return [-DX * h, B.y - DY * h]; };
  const tagY = () => { const L = logo8(); return (G.cy + L.y + L.LH * 0.5 + G.F * 0.8) / G.H; };
  const ctaY = () => tagY() + (G.F * 1.9) / G.H;
  const S8 = {
    name: 'finale',
    title: 'Schuberg Philis',
    beats: 14,
    blend: { dur: (i) => (i === 0 ? 0.8 : 0.9), start: (i) => { const j = band8()[i]; return j < 0 ? 0 : 0.05 + 0.5 * ((j % 28) / 27); }, ease: E.glide, arc: 0.15 },
    bg: (b) => { const nv = b >= WIPE8[1]; setBlue(!nv); return nv ? C.navy : C.blue; },
    dark: () => true,
    pose(i, b, p) {
      const B = band();
      if (i === 0) {
        const [tx, ty] = bandTop(), d0 = G.R * 0.075, th = B.BL * 0.1;
        if (b < DRAW8[0]) {
          const c = b < WIPE8[0] + 0.1 ? C.navy : C.blue;
          return circle(p, tx, ty, d0 * (1 + 0.3 * maxHit(b, [1, 2, 3, 4], 5) + 0.4 * hit(b, WIPE8[0], 4)), c);
        }
        const len = Math.max(d0, drawLen(b)), L = logo8();
        let cx = tx + DX * len / 2, cy = ty + DY * len / 2, ln = len, t = lerp(d0, th, E.outCubic(clamp((b - DRAW8[0]) / 0.3)));
        const m = E.inOutCubic(clamp((b - MOVE8[0]) / (MOVE8[1] - MOVE8[0])));
        if (m > 0) {
          const lx = -L.LW / 2 + (6.5 / 116) * L.LW, ly = L.y + (15.8 / 32 - 0.5) * L.LH;
          cx = lerp(cx, lx, m); cy = lerp(cy, ly, m) - Math.sin(PI * m) * G.R * 0.12; ln = lerp(ln, L.LH * 1.03, m); t = lerp(t, L.LH * 0.098, m);
        }
        const land = hit(b, MOVE8[1], 6);
        slashBar(p, cx, cy, ln * (1 + 0.04 * land), t * (1 + 0.2 * land), C.blue);
        p.o = 1 - clamp((b - HIDE8[0]) / (HIDE8[1] - HIDE8[0]));
        if (p.o <= 0) hide(p);
        return;
      }
      if (i === 1) {
        if (b < WIPE8[0] || b > WIPE8[1] + 0.1) return hide(p);
        rect(p, 0, B.y, 2 * B.D * E.outCubic(clamp((b - WIPE8[0]) / (WIPE8[1] - WIPE8[0]))), B.D * 2.4, 0, C.navy);
        p.rot = -ANG;
        return;
      }
      const j = band8()[i];
      if (j < 0) return hide(p);
      const [x, y, fa, v] = bandXY(j), tr = reach8(v), tc = collapse8(fa);
      const wave = [1, 2, 3, 4].reduce((a, t) => Math.max(a, gau(fa - (b - t) * 1.6, 0.08) * (b > t ? 1 : 0)), 0);
      const blue = clamp((b - tr) / 0.25), pop = hit(b, tr, 5);
      const k = E.inCubic(clamp((b - tc) / 0.28));
      if (k >= 1) return hide(p);
      const ax = x - v * PX, ay = y - v * PY;
      circle(p, lerp(x, ax, k), lerp(y, ay, k), B.d * (1 + 0.5 * wave + 0.5 * pop) * (1 - k), mix(C.white, C.blue, blue));
    },
    type: [
      { id: 'finale.one', at: 0.5, to: 4.3, text: '*#1* in customer | satisfaction.' },
      { id: 'finale.best', at: 1.1, to: 4.3, text: 'Ranked Best IT company in the Netherlands', cls: 'sub', size: 0.42, y: subY },
      { id: 'finale.logo', at: LOGO8, to: Infinity, html: '<img src="img/logo.svg" alt="Schuberg Philis">', cls: 'logo', y: () => (G.cy + logo8().y) / G.H, size: () => logo8().LH, fade: 0.6 },
      { id: 'finale.tag', at: TAG8, to: Infinity, text: 'Engineering business progress.', size: 0.56, y: tagY, stagger: 0.08 },
      {
        id: 'finale.cta', at: CTA8, to: Infinity, cls: 'link', y: ctaY, fade: 0.8,
        html: '<a href="https://schubergphilis.com" target="_blank" rel="noopener">Visit schubergphilis.com</a>' +
          '<small>Mission-critical IT, built to last.</small>',
      },
    ],
    music(M) {
      M.pad(0, 'A2 E3 C4 G4', 2, 0.26); M.pad(2, 'F2 C3 A3 E4', 2.6, 0.26);
      bassLine(M, 0, 2, 'A1'); bassLine(M, 2, 4, 'F1');
      groove(M, 0, 4, { k: 0.36, h: 0.07, clap: 0.16 });
      M.kick(0, 0.5); M.crash(0, 0.14);
      [1, 2, 3, 4].forEach((t, k) => M.pluck(t, ['E5', 'G5', 'A5', 'C6'][k], 0.09, k % 2 ? 0.4 : -0.4, 0.2));
      M.whoosh(WIPE8[0], 0.9, 0.07, 2800, 300);
      M.pad(4, 'G2 D3 B3 F4', DRAW8[1] - 4, 0.26); M.sub(4, 'G1', DRAW8[1] - 4, 0.2);
      M.riser(3.4, DRAW8[0] - 3.4, 0.2);
      M.rip(DRAW8[0], 0.6, 0.3);
      M.kick(DRAW8[1], 0.6); M.boom(DRAW8[1], 0.5); M.splash(DRAW8[1], 0.16);
      M.pad(DRAW8[1], 'C3 G3 C4 E4', 14 - DRAW8[1], 0.3); M.sub(DRAW8[1], 'C2', 14 - DRAW8[1], 0.24);
      M.whoosh(MOVE8[0], MOVE8[1] - MOVE8[0], 0.05, 300, 2200);
      M.thump(MOVE8[1], 0.4);
      M.bell(MOVE8[1], 'C6', 0.18); M.bell(MOVE8[1] + 0.25, 'E6', 0.14, 0.3); M.bell(MOVE8[1] + 0.5, 'G6', 0.12, -0.3);
      M.ep(TAG8, 'E5', 0.08); M.ep(TAG8 + 0.5, 'G5', 0.07);
      M.whoosh(CTA8, 0.8, 0.04, 400, 1800); M.blip(CTA8 + 0.4, 'C6', 0.05);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8];
})();
