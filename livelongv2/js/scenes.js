/* LiveLong — "Know what's in your blood." A commercial in 150 shapes.
   No dots this time: pills, tiles, drops and pins, each one a single div whose size,
   corner radius, colour and matrix3d are set every frame. One orange shape is you.
   The same 48 pills are your steps, your sleep and your heartbeat, until everything
   collapses into one drop of blood; that drop becomes the test, the 43 biomarkers,
   the calendar you no longer wait on, the door, the pin on the map, the 48-hour
   clock, the doctor's advice, and finally the button.
   Every scene defines:
     pose(i, b, p)  shape i at local beat b: p.x, p.y (from G.cx/G.cy), p.w, p.h, p.r,
                    p.tip, p.rot, p.rx, p.ry, p.z, p.o, p.c (and p.sym for pills)
     blend          how shapes travel from the previous scene
     type           the headlines, timed in beats
     music(M)       the score, timed in the same beats */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, hit = BJ.hit, clamp = BJ.clamp, lerp = BJ.lerp, C = BJ.C, mix = BJ.mix;
  const TAU = BJ.TAU, PI = Math.PI, SH = BJ.SHAPES;
  const AZURE = [79, 143, 214], LIGHT = [168, 199, 236];

  // ------------------------------------------------------------ drawing helpers
  const hide = (p) => { p.o = 0; p.w = p.h = 0; };
  function circle(p, x, y, d, c) { p.x = x; p.y = y; p.w = p.h = d; p.r = d / 2; p.c = c; }
  function rect(p, x, y, w, h, r, c) { p.x = x; p.y = y; p.w = w; p.h = h; p.r = r; p.c = c; }
  // a pill of length `len` whose long axis points along angle `rot` + 90°
  function pill(p, x, y, len, th, rot, c) { p.x = x; p.y = y; p.w = th; p.h = Math.max(th, len); p.r = th / 2; p.rot = rot; p.c = c; p.sym = PI; }
  // a pill drawn from (x0, y0) to (x1, y1), round caps included
  function seg(p, x0, y0, x1, y1, th, c) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-6;
    pill(p, (x0 + x1) / 2, (y0 + y1) / 2, L + th, th, Math.atan2(-dx / L, dy / L), c);
  }
  const maxHit = (b, times, decay) => { let e = 0; for (const t of times) e = Math.max(e, hit(b, t, decay)); return e; };
  function perLayout(fn) {
    let v = -1, val;
    return () => { if (v !== G.version) { v = G.version; val = fn(); } return val; };
  }
  const yF = (px) => () => (G.cy + px()) / G.H; // type centred at an offset from the visual centre
  const PENTA = ['G', 'A', 'B', 'D', 'E'];
  const penta = (k, base = 4) => PENTA[((k % 5) + 5) % 5] + (base + Math.floor(k / 5));

  // ------------------------------------------------------------ the ring (steps, and later the clock)
  const NT = 48;
  const ringR = () => G.R * 0.86, tickL = () => G.R * 0.16, tickT = () => G.R * 0.046;
  // tick k of the ring, filled up to fraction `fill`; `grow` 0..1, `pulse` bumps outward
  function tick(p, k, fill, grow, pulse, base) {
    const a = -PI / 2 + (k / NT) * TAU, R = ringR() + pulse * G.R * 0.05, L = tickL() * grow * (1 + pulse * 0.35);
    const f = clamp(fill * NT - k);
    pill(p, Math.cos(a) * R, Math.sin(a) * R, L, tickT() * (0.6 + 0.4 * grow), a - PI / 2, mix(base, C.orange, f));
    p.o = clamp(grow * 1.6);
  }
  function rider(p, fill, d) {
    const a = -PI / 2 + fill * TAU, R = ringR();
    circle(p, Math.cos(a) * R, Math.sin(a) * R, d, C.orange);
  }

  // =========================================================== 1 · every step
  const FILL1 = (b) => E.inOutSine(clamp((b - 1.4) / 4.2)), DONE1 = 5.6;
  const S1 = {
    name: 'steps',
    beats: 8,
    introBeat: 0,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const done = hit(b, DONE1, 3);
      if (i === 0) {
        const beat = maxHit(b, [0, 1], 5) + 0.6 * maxHit(b, [0.3, 1.3], 6);
        const go = E.inOutCubic(clamp((b - 0.9) / 0.6));
        const d0 = G.R * 0.2 * (1 + 0.18 * beat), d1 = tickT() * 2.1 * (1 + 0.5 * done);
        rider(p, FILL1(b), lerp(d0, d1, go));
        p.x *= go; p.y *= go;
        return;
      }
      if (i > NT) return hide(p);
      const k = i - 1, g = E.outBack(clamp((b - 0.45 - k * 0.014) / 0.55));
      if (g <= 0) return hide(p);
      tick(p, k, FILL1(b), g, done, C.mist);
    },
    type: [
      { at: 1.3, to: 7.6, fn: (b) => Math.round(FILL1(b) * 10000).toLocaleString('en-US'), y: () => G.cy / G.H, size: 1.25, cls: 'num' },
      { at: 1.6, to: 7.6, text: 'You track every step.' },
    ],
    music(M) {
      M.pad(0, 'G3 D4 B4', 8, 0.32); M.sub(0, 'G2', 8, 0.2);
      [0, 1].forEach((at) => { M.thump(at, 0.5); M.thump(at + 0.3, 0.3); });
      for (let k = 0; k < 16; k++) M.marimba(1.4 + k * 0.26, penta(Math.round(k * 0.7), 4), 0.1 + k * 0.004, (k / 15 - 0.5) * 0.8);
      M.bell(DONE1, 'D6', 0.24); M.ep(DONE1, 'G5', 0.22); M.kick(DONE1, 0.3);
      M.ep(6.5, 'B5', 0.12); M.ep(7.2, 'A5', 0.1);
    },
  };

  // =========================================================== 2 · every hour of sleep
  // The ring unrolls into a hypnogram: awake, REM, light and deep sleep.
  const HYP = '012233332221122233322211122222211221112211112100'.split('').map(Number);
  const HYPC = [C.steel, LIGHT, AZURE, C.navy];
  const HYPX = []; // thin risers where the stage changes, like a real hypnogram
  for (let k = 1; k < NT; k++) if (HYP[k] !== HYP[k - 1]) HYPX.push([k, HYP[k - 1], HYP[k]]);
  const gw = () => Math.min(G.W * 0.86, G.R * 3.3);
  const hypY = (l) => (l - 1.5) * G.R * 0.24;
  const hypTh = () => Math.min(G.R * 0.085, (gw() / NT) * 1.1);
  const ecgTh = () => (gw() / NT) * 0.65;
  const S2 = {
    name: 'sleep',
    beats: 6,
    blend: { start: (i) => (i === 0 ? 0 : 0.05 + (i - 1) * 0.016), dur: (i) => (i === 0 ? 1.1 : 1.0), arc: 0.12 },
    pose(i, b, p) {
      const W = gw(), sw = W / NT, th = hypTh();
      if (i === 0) {
        const u = clamp((b - 0.9) / 4.6) * (NT - 1), k = Math.floor(u), f = E.inOutSine(u - k);
        const y = lerp(hypY(HYP[k]), hypY(HYP[Math.min(NT - 1, k + 1)]), f);
        circle(p, -W / 2 + (u + 0.5) * sw, y, Math.max(th * 1.5, G.R * 0.09) * (1 - E.inOutCubic(clamp((b - 5.4) / 0.5))), C.orange);
        if (b >= 5.9) hide(p);
        return;
      }
      const br = (l) => Math.sin(b * 1.4 - l * 0.9) * th * 0.1;
      if (i > NT) {
        const x = HYPX[i - NT - 1];
        if (!x) return hide(p);
        const [k, la, lb] = x, g = E.outCubic(clamp((b - 0.9 - k * 0.016) / 0.6));
        if (g <= 0) return hide(p);
        const X = -W / 2 + k * sw, dir = Math.sign(lb - la), ya = hypY(la) + br(la) + dir * th * 0.55, yb = hypY(lb) + br(lb) - dir * th * 0.55;
        seg(p, X, ya, X, lerp(ya, yb, g), th * 0.16, C.mist);
        return;
      }
      const k = i - 1, l = HYP[k], breathe = br(l);
      pill(p, -W / 2 + (k + 0.5) * sw, hypY(l) + breathe, sw + th, th, -PI / 2, HYPC[l]);
    },
    type: [{ at: 0.8, to: 5.5, text: 'Every hour of sleep.' }],
    music(M) {
      M.pad(0, 'E3 B3 D4 G4', 6, 0.28); M.sub(0, 'E2', 6, 0.18);
      M.whoosh(0, 1.2, 0.05, 300, 1200);
      for (let k = 0; k < 8; k++) M.marimba(0.1 + k * 0.1, penta(12 - k, 4), 0.07, (k / 7 - 0.5) * 0.9);
      M.ep(1, 'B4', 0.16); M.ep(2.5, 'D5', 0.12); M.ep(4, 'A4', 0.12);
    },
  };

  // =========================================================== 3 · every heartbeat
  // The same line becomes an ECG; the orange pulse runs along it.
  const CYC = [[0, 0], [0.12, 0], [0.16, -0.1], [0.2, 0], [0.3, 0], [0.33, 0.12], [0.37, -1], [0.41, 0.32], [0.44, 0], [0.56, 0], [0.63, -0.24], [0.7, 0], [1, 0]];
  const ECGN = [].concat(CYC.map(([x, y]) => [x / 2, y]), CYC.slice(1).map(([x, y]) => [(1 + x) / 2, y]));
  const ecgA = () => G.R * 0.5, ecgY0 = () => G.R * 0.12;
  const ecgAt = (u) => { // y (in units of A) at x fraction u
    let k = 1;
    while (k < ECGN.length - 1 && ECGN[k][0] < u) k++;
    const [x0, y0] = ECGN[k - 1], [x1, y1] = ECGN[k];
    return lerp(y0, y1, clamp((u - x0) / (x1 - x0 || 1)));
  };
  // 49 vertices spaced evenly along the trace, so every pill has the same length
  const ECGV = perLayout(() => {
    const W = gw(), A = ecgA(), pts = ECGN.map(([x, y]) => [(x - 0.5) * W, ecgY0() + y * A]);
    const acc = [0];
    for (let k = 1; k < pts.length; k++) acc.push(acc[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    const L = acc[acc.length - 1], out = [];
    for (let j = 0, k = 1; j <= NT; j++) {
      const s = (j / NT) * L;
      while (k < pts.length - 1 && acc[k] < s) k++;
      const f = (s - acc[k - 1]) / (acc[k] - acc[k - 1] || 1);
      out.push([lerp(pts[k - 1][0], pts[k][0], f), lerp(pts[k - 1][1], pts[k][1], f)]);
    }
    return out;
  });
  const RUN3 = [0.5, 5.3], SPIKE3 = [0.37 / 2, (1 + 0.37) / 2].map((u) => RUN3[0] + u * (RUN3[1] - RUN3[0]));
  const pulseX = (b) => clamp((b - RUN3[0]) / (RUN3[1] - RUN3[0]));
  const S3 = {
    name: 'heart',
    beats: 6,
    blend: { start: (i) => (i === 0 ? 0.1 : (i - 1) * 0.012), dur: (i) => (i === 0 ? 0.4 : 0.9), ease: E.inOutCubic },
    pose(i, b, p) {
      const W = gw(), th = ecgTh(), u = pulseX(b), beat = maxHit(b, SPIKE3, 3.5);
      if (i === 0) {
        circle(p, (u - 0.5) * W, ecgY0() + ecgAt(u) * ecgA(), th * 2.2 * (1 + 0.45 * beat), C.orange);
        return;
      }
      if (i > NT) return hide(p);
      const V = ECGV(), k = i - 1, a = V[k], c = V[k + 1];
      const behind = u * W - ((a[0] + c[0]) / 2 + W / 2);
      const glow = (behind > 0 && b > RUN3[0] ? Math.exp(-behind / (W * 0.06)) * clamp(behind / (W * 0.04)) : 0) * (1 - E.inOutSine(clamp((b - RUN3[1]) / 0.6)));
      seg(p, a[0], a[1], c[0], c[1], th * (1 + 0.5 * glow), mix(C.blue, C.orange, glow));
    },
    type: [{ at: 0.8, to: 5.5, text: 'Every heartbeat.' }],
    music(M) {
      M.pad(0, 'C3 G3 E4 B4', 6, 0.28); M.sub(0, 'C2', 6, 0.2);
      SPIKE3.forEach((at, k) => { M.beep(at, 'B5', 0.14, (k - 0.5) * 0.6); M.thump(at, 0.42); M.thump(at + 0.3, 0.24); });
      M.ep(0.8, 'E5', 0.14); M.ep(2.8, 'G5', 0.12); M.ep(4.6, 'D5', 0.12);
    },
  };

  // =========================================================== 4 · but what's in your blood?
  // Everything drains into you, and you become a single drop.
  const dropD = () => G.R * 0.92;
  function dropPose(p, b) { // b: beats since the drop formed (≥ 0), also used by scene 5
    const D = dropD() * (1 + 0.012 * Math.sin(b * 2.1));
    circle(p, 0, D * 0.1 + Math.sin(b * 1.1) * G.R * 0.025, D, C.orange);
    p.tip = 1; p.rot = PI / 4 + Math.sin(b * 0.8) * 0.04;
  }
  const FORM4 = 2.4;
  const S4 = {
    name: 'drop',
    beats: 8,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const th = ecgTh();
      if (i === 0) {
        const W = gw(), m = E.inOutCubic(clamp(b / 1.3)), g = E.outBack(clamp((b - 1.0) / 1.4)), tp = E.inOutSine(clamp((b - 1.3) / 1.1));
        circle(p, lerp(W / 2, 0, m), lerp(ecgY0(), 0, m), lerp(th * 2.2, dropD(), g), C.orange);
        p.tip = tp; p.rot = PI / 4;
        if (b >= FORM4) dropPose(p, b - FORM4);
        else { p.y = lerp(p.y, dropD() * 0.1, clamp(g)); }
        return;
      }
      if (i > NT) return hide(p);
      const V = ECGV(), k = i - 1, a = V[k], c = V[k + 1];
      const e = E.inCubic(clamp((b - 0.15 - Math.abs(k - NT / 2) * 0.022) / 0.9));
      if (e >= 1) return hide(p);
      const s = 1 - e;
      seg(p, lerp(a[0], 0, e), lerp(a[1], 0, e), lerp(c[0], 0, e), lerp(c[1], 0, e), th * s, C.blue);
      p.h = Math.max(p.w, p.h * s);
    },
    type: [{ at: 3.0, to: 7.6, text: 'But do you know | what’s in your blood?', stagger: 0.12 }],
    music(M) {
      M.pad(0, 'A2 E3 C4 G4', 4, 0.28); M.sub(0, 'A1', 4, 0.2);
      M.whoosh(0.1, 1.2, 0.06, 1800, 300);
      M.drop(FORM4 - 0.2, 'G5', 0.26); M.drop(FORM4 + 0.15, 'D5', 0.12, 0.3);
      M.pad(4, 'D3 A3 C4 F#4', 4, 0.28); M.sub(4, 'D2', 4, 0.22);
      M.ep(3, 'E5', 0.16); M.ep(3.5, 'G5', 0.14); M.ep(5, 'F#5', 0.14); M.ep(5.5, 'A5', 0.14);
      M.whoosh(6.2, 1.8, 0.07, 250, 3200);
    },
  };

  // =========================================================== 5 · one test, 43 biomarkers, 10 areas
  // The drop bursts into an orange field; out of it come 43 white tiles.
  const T0 = 101, NB = 43, GROUPS = [5, 5, 5, 4, 4, 4, 4, 4, 4, 4];
  const GOF = [], SOF = [];
  GROUPS.forEach((n, g) => { for (let s = 0; s < n; s++) { GOF.push(g); SOF.push(s); } });
  const grid5 = perLayout(() => {
    const cols = G.portrait ? 5 : 11, rows = Math.ceil(NB / cols);
    const cell = Math.min((G.W * 0.84) / cols, (G.H * 0.5) / rows, G.R * 0.33), pos = [], diag = [];
    for (let j = 0; j < NB; j++) {
      const r = Math.floor(j / cols), c = j % cols, n = Math.min(cols, NB - r * cols);
      pos.push([(c - (n - 1) / 2) * cell, (r - (rows - 1) / 2) * cell]);
      diag.push(r + c);
    }
    return { cell, pos, diag };
  });
  const groups5 = perLayout(() => {
    const bands = G.portrait ? 2 : 1, per = 10 / bands, gc = grid5().cell;
    const colW = Math.min((G.W * 0.86) / per, G.R * 0.4), cell = Math.min(colW * 0.62, gc), pos = [];
    for (let j = 0; j < NB; j++) {
      const g = GOF[j], band = Math.floor(g / per), col = g % per, n = GROUPS[g];
      pos.push([(col - (per - 1) / 2) * colW, (band - (bands - 1) / 2) * cell * 6 + (SOF[j] - (n - 1) / 2) * cell]);
    }
    return { cell, pos };
  });
  const POP5 = 3.9, REG5 = 8.6, PULSE5 = GROUPS.map((_, g) => 10.1 + g * 0.3), BURST5 = [0.3, 1.5];
  const cover = () => 2.3 * Math.hypot(G.W / 2, G.H * 0.6);
  function tile5(p, j, b) { // a biomarker tile at scene-5 beat b
    const gd = grid5(), gp = groups5(), g = GOF[j];
    const e = E.inOutCubic(clamp((b - REG5 - g * 0.06) / 1.1)), pu = hit(b, PULSE5[g], 4);
    const size = lerp(gd.cell, gp.cell, e) * 0.78 * (1 + 0.2 * pu);
    rect(p, lerp(gd.pos[j][0], gp.pos[j][0], e), lerp(gd.pos[j][1], gp.pos[j][1], e) - pu * gp.cell * 0.14, size, size, size * 0.26, mix(C.white, C.peach, pu * 0.8));
    p.rx = e * TAU;
  }
  const S5 = {
    name: 'test',
    beats: 14,
    blend: { dur: 0.01 },
    bg: (b) => (b < BURST5[1] ? C.white : C.orange),
    dark: (b) => b >= BURST5[1],
    pose(i, b, p) {
      if (i === 0) {
        dropPose(p, 8 - FORM4 + b);
        if (b > BURST5[0]) {
          const t = clamp((b - BURST5[0]) / (BURST5[1] - BURST5[0])), D = lerp(p.w, cover(), E.inCubic(t));
          p.tip = 1 - E.outCubic(clamp(t * 2.5));
          p.w = p.h = D; p.r = D / 2; p.y *= 1 - t;
          if (t >= 1) hide(p);
        }
        return;
      }
      const j = i - T0;
      if (j < 0 || j >= NB) return hide(p);
      const g = E.outBack(clamp((b - POP5 - grid5().diag[j] * 0.06) / 0.55));
      if (g <= 0) return hide(p);
      tile5(p, j, b);
      p.w *= g; p.h *= g; p.r *= g; p.o = clamp(g * 2);
    },
    type: [
      { at: 1.4, to: 4.0, text: 'One blood test.', y: yF(() => 0), size: 1.3, color: '#fff' },
      { at: 4.6, to: 8.4, text: '43 biomarkers.', color: '#fff' },
      { at: 9.2, to: 13.6, text: '10 health areas.', color: '#fff' },
    ],
    music(M) {
      M.splash(1.3, 0.3); M.boom(1.4, 0.4); M.kick(1.5, 0.45);
      M.bell(1.5, 'G5', 0.22); M.bell(1.5, 'D6', 0.16, 0.3); M.ep(1.5, 'B5', 0.2, -0.3);
      M.pad(1.5, 'G3 B3 D4 A4', 6.5, 0.3); M.sub(1.5, 'G2', 6.5, 0.24);
      for (let b = 3.5; b < 14; b += 2) M.kick(b, 0.2);
      for (let b = 4.5; b < 14; b += 1) M.tick(b, 0.03, 0.4);
      for (let d = 0; d < 13; d++) M.marimba(POP5 + d * 0.06 + 0.05, penta(Math.floor(d * 0.75) + 2, 4), 0.1, (d / 12 - 0.5) * 0.9);
      M.pad(8, 'C3 G3 E4 B4', 6, 0.28); M.sub(8, 'C2', 6, 0.22);
      M.whoosh(REG5 - 0.1, 1.3, 0.06, 500, 2600);
      PULSE5.forEach((at, g) => M.marimba(at, penta(g + 2, 4), 0.14, (g / 9 - 0.5) * 0.9));
      M.bell(PULSE5[9] + 0.3, 'D6', 0.16);
    },
  };

  // =========================================================== 6 · no referral, no waiting list
  // The tiles flip into a calendar. The weeks you'd normally wait fill up, then fall away.
  // Only today is left: it opens like a door.
  const TODAY = 2, NCAL = 35;
  const cal6 = perLayout(() => {
    const c = Math.min(G.R * 0.3, (G.W * 0.84) / 7, (G.H * 0.5) / 6), pos = [], rc = [];
    for (let m = 0; m < NCAL; m++) { const r = Math.floor(m / 7), k = m % 7; pos.push([(k - 3) * c, (r - 2) * c + c * 0.45]); rc.push(r + k); }
    return { c, pos, rc };
  });
  const door = () => ({ w: G.R * 0.5, h: G.R * 0.92, r: G.R * 0.035 });
  const FALL6 = 5.3, GROW6 = [5.8, 7.2], OPEN6 = [7.6, 9.2];
  const rnd6 = (function () { const r = BJ.rng(6), a = []; for (let k = 0; k < 60; k++) a.push(r()); return a; })();
  function fall(p, b, j) {
    const f = clamp((b - FALL6 - rnd6[j] * 0.55) / 1.3);
    if (f <= 0) return;
    const s = rnd6[j + 1] - 0.5;
    p.y += f * f * G.H * 0.85; p.x += s * f * G.R * 0.4;
    p.rx += f * 2.4 * (s > 0 ? 1 : -1); p.rot += f * s * 1.2; p.z += f * G.R * 0.6;
    p.o *= 1 - clamp((f - 0.45) / 0.45);
  }
  const S6 = {
    name: 'referral',
    beats: 12,
    blend: { dur: 0.01 },
    bg: (b) => mix(C.orange, C.white, E.inOutSine(clamp(b / 1.2))),
    dark: (b) => b < 0.6,
    pose(i, b, p) {
      const cal = cal6(), c = cal.c, D = door();
      if (i === 0) {
        const pos = cal.pos[TODAY], g = E.outBack(clamp((b - 0.9) / 0.6));
        if (g <= 0) return hide(p);
        const e = E.inOutCubic(clamp((b - GROW6[0]) / (GROW6[1] - GROW6[0])));
        rect(p, lerp(pos[0], 0, e), lerp(pos[1], 0, e), lerp(c * 0.8 * g, D.w, e), lerp(c * 0.8 * g, D.h, e), lerp(c * 0.8 * 0.22 * g, D.r, e), C.orange);
        const ry = -1.2 * E.inOutCubic(clamp((b - OPEN6[0]) / (OPEN6[1] - OPEN6[0])));
        if (ry) { p.ry = ry; p.x = -D.w / 2 + (D.w / 2) * Math.cos(ry); p.z = -(D.w / 2) * Math.sin(ry); }
        return;
      }
      const j = i - T0;
      if (j === 36 || j === 37) { // the doorway and the floor
        const e = E.outCubic(clamp((b - GROW6[1] + 0.5 + (j - 36) * 0.2) / 0.8));
        if (b < 2) { tile5(p, j, 14 + b); p.o = 1 - E.inOutCubic(clamp(b / 0.8)); return; }
        if (e <= 0) return hide(p);
        if (j === 36) rect(p, 0, -G.R * 0.012, (D.w + G.R * 0.06) * lerp(0.7, 1, e), D.h + G.R * 0.03, D.r * 1.4, C.blue);
        else seg(p, -G.R * 0.65 * e, D.h / 2 + G.R * 0.03, G.R * 0.65 * e, D.h / 2 + G.R * 0.03, G.R * 0.022, C.mist);
        p.o = e;
        return;
      }
      if (j < 0 || j >= NB) return hide(p);
      tile5(p, j, 14 + b);
      const fx = [p.x, p.y, p.w];
      const isCal = j < NCAL - 1, isHead = j === 35;
      if (!isCal && !isHead) { const e = E.inOutCubic(clamp(b / 0.8)); p.o = 1 - e; p.w *= 1 - e * 0.5; p.h = p.w; return; }
      const m = isHead ? 0 : j < TODAY ? j : j + 1;
      const e = E.inOutCubic(clamp((b - 0.1 - (isHead ? 0 : cal.rc[m]) * 0.045) / 1.0));
      let tx, ty, tw, th;
      if (isHead) { tx = 0; ty = cal.pos[0][1] - c * 0.95; tw = c * 6.8; th = c * 0.55; }
      else { tx = cal.pos[m][0]; ty = cal.pos[m][1]; tw = th = c * 0.8; }
      rect(p, lerp(fx[0], tx, e), lerp(fx[1], ty, e), lerp(fx[2], tw, e), lerp(fx[2], th, e), lerp(fx[2] * 0.26, isHead ? th / 2 : c * 0.8 * 0.22, e), mix(C.white, isHead ? C.blue : C.mist, e));
      p.rx = 0; p.ry = e * PI;
      if (!isHead && m > TODAY) {
        const tf = 2.0 + (m - TODAY - 1) * 0.085, f = clamp((b - tf) / 0.25), pk = hit(b, tf, 6);
        p.c = mix(p.c, C.blue, f); p.w *= 1 + 0.12 * pk; p.h *= 1 + 0.12 * pk;
      }
      fall(p, b, j);
    },
    type: [
      { at: 1.8, to: 5.5, text: 'No GP referral. | No waiting list.' },
      { at: 7.6, to: 11.6, text: 'Just walk in.' },
    ],
    music(M) {
      M.pad(0, 'E3 B3 D4 G4', 5.3, 0.28); M.sub(0, 'E2', 5.3, 0.2);
      M.whoosh(0, 1, 0.05, 2200, 600);
      M.marimba(0.95, 'B5', 0.16);
      for (let k = 0; k < 32; k++) M.tick(2.0 + k * 0.085, 0.035 + k * 0.001, ((k % 7) / 6 - 0.5) * 0.8);
      M.ep(2.2, 'D5', 0.12); M.ep(3.4, 'B4', 0.12);
      M.whoosh(FALL6, 1.4, 0.07, 2600, 180); M.boom(FALL6 + 0.4, 0.2);
      M.pad(FALL6, 'C3 G3 E4 A4', OPEN6[0] - FALL6, 0.26); M.sub(FALL6, 'C2', OPEN6[0] - FALL6, 0.2);
      M.ep(GROW6[0] + 0.3, 'G5', 0.14); M.ep(GROW6[0] + 0.8, 'A5', 0.12);
      M.pad(OPEN6[0], 'D3 A3 F#4 B4', 12 - OPEN6[0], 0.3); M.sub(OPEN6[0], 'D2', 12 - OPEN6[0], 0.22);
      M.whoosh(OPEN6[0], 1.3, 0.06, 400, 2200); M.kick(OPEN6[0], 0.3);
      M.bell(OPEN6[0] + 0.2, 'A5', 0.2); M.ep(OPEN6[0] + 0.6, 'D6', 0.14); M.ep(OPEN6[0] + 1.1, 'F#6', 0.1);
      for (let b = 9.6; b < 12; b += 2) M.kick(b, 0.18);
    },
  };

  // =========================================================== 7 · 108 locations
  // Today lands on Amsterdam as an orange pin; 108 blue pins drop in around it.
  const NLP = SH.nl.pts, AMS = SH.nl.ams;
  const mapW = () => Math.min((G.H * 0.6) / SH.nl.h, G.W * 0.8);
  const AMSI = NLP.reduce((best, pt, k) => (Math.hypot(pt[0] - AMS[0], pt[1] - AMS[1]) < Math.hypot(NLP[best][0] - AMS[0], NLP[best][1] - AMS[1]) ? k : best), 0);
  const PIN7 = (function () {
    const rr = BJ.rng(108), idx = NLP.map((_, k) => k).filter((k) => k !== AMSI), T = new Float32Array(NLP.length).fill(-1);
    for (let k = idx.length - 1; k > 0; k--) { const j = Math.floor(rr() * (k + 1)); [idx[k], idx[j]] = [idx[j], idx[k]]; }
    const dmax = Math.max(...NLP.map((pt) => Math.hypot(pt[0] - AMS[0], pt[1] - AMS[1])));
    for (let k = 0; k < 108; k++) { const n = idx[k], pt = NLP[n]; T[n] = 2.3 + (Math.hypot(pt[0] - AMS[0], pt[1] - AMS[1]) / dmax) * 3.0 + rr() * 0.15; }
    return T;
  })();
  const LAND7 = 1.6;
  function pin(p, x, y, s, c) { circle(p, x, y - 0.707 * s, s, c); p.tip = 1; p.rot = (5 * PI) / 4; }
  const S7 = {
    name: 'map',
    beats: 12,
    blend: { start: 0, dur: (i) => (i === 0 ? LAND7 : 0.8), ease: E.inOutCubic },
    pose(i, b, p) {
      const Wm = mapW(), sp = SH.nl.sp * Wm;
      if (i === 0) {
        const pk = hit(b, LAND7, 3);
        pin(p, AMS[0] * Wm, AMS[1] * Wm, sp * 1.9 * (1 + 0.25 * pk), C.orange);
        return;
      }
      if (i > NLP.length) return hide(p);
      const k = i - 1, pt = NLP[k], x = pt[0] * Wm, y = pt[1] * Wm, T = PIN7[k];
      const g = E.outBack(clamp((b - 0.3 - (pt[0] + 0.5) * 1.3) / 0.5));
      if (g <= 0 || k === AMSI) return hide(p);
      const d = sp * 0.34 * g;
      if (T < 0 || b < T) { circle(p, x, y, d, C.mist); p.rot = (5 * PI) / 4; return; }
      // the dot hops up as it becomes a pin, and lands with a little bounce
      const e = clamp((b - T) / 0.6), s = lerp(d, sp * 0.8, E.outCubic(clamp(e * 2)));
      const tp = E.inOutSine(clamp(e * 2)), sq = hit(b, T + 0.6, 7) * 0.18;
      pin(p, x, y, s, mix(C.mist, C.blue, tp));
      p.tip = tp; p.w = p.h = s * (1 + sq); p.r = p.w / 2;
      p.y = y - 4 * e * (1 - e) * G.R * 0.12 - 0.707 * s * tp;
    },
    type: [
      { at: 2.6, to: 6.6, text: 'Walk in at 108 locations.' },
      { at: 7.0, to: 11.6, text: 'All across the Netherlands.' },
    ],
    music(M) {
      M.pad(0, 'G3 B3 D4 A4', 6, 0.28); M.sub(0, 'G2', 6, 0.22);
      M.whoosh(0, LAND7, 0.05, 300, 1500);
      M.drop(LAND7, 'G5', 0.24); M.bell(LAND7, 'D6', 0.18); M.kick(LAND7, 0.3);
      const order = [];
      PIN7.forEach((T, k) => { if (T >= 0) order.push([T, NLP[k][0]]); });
      order.sort((a, b) => a[0] - b[0]);
      order.forEach(([T, x], n) => { if (n % 4 === 0) M.marimba(T + 0.35, penta(Math.floor(n / 4) % 10 + 3, 4), 0.07, x * 1.6); });
      M.pad(6, 'C3 G3 E4 B4', 6, 0.28); M.sub(6, 'C2', 6, 0.22);
      for (let b = 3.6; b < 12; b += 2) M.kick(b, 0.18);
      for (let b = 4.6; b < 12; b += 1) M.tick(b, 0.028, -0.3);
      M.ep(7.2, 'E5', 0.12); M.ep(8.6, 'G5', 0.12); M.ep(10, 'B5', 0.1);
    },
  };

  // =========================================================== 8 · results within 48 hours
  // The pins lift into a clock face: the same ring as your steps, now counting hours.
  const R0 = 101, FILL8 = (b) => E.inOutSine(clamp((b - 1.6) / 4.2)), DONE8 = 5.8;
  const S8 = {
    name: 'clock',
    beats: 10,
    blend: {
      start: (i) => (i >= R0 && i < R0 + NT ? 0.05 + (i - R0) * 0.014 : 0),
      dur: (i) => (i === 0 ? 1.3 : i >= R0 && i < R0 + NT ? 1.1 : 0.7),
      arc: 0.1,
    },
    pose(i, b, p) {
      const done = hit(b, DONE8, 3);
      if (i === 0) return rider(p, FILL8(b), tickT() * 2.1 * (1 + 0.5 * done));
      const k = i - R0;
      if (k < 0 || k >= NT) return hide(p);
      tick(p, k, FILL8(b), 1, done, C.mist);
    },
    type: [
      { at: 1.2, to: 9.6, fn: (b) => Math.round(FILL8(b) * 48) + 'h', y: () => G.cy / G.H, size: 1.25, cls: 'num' },
      { at: 2.2, to: 9.5, text: 'Results within 48 hours.' },
    ],
    music(M) {
      M.pad(0, 'A2 E3 C4 G4', DONE8, 0.28); M.sub(0, 'A1', DONE8, 0.2);
      M.whoosh(0, 1.2, 0.05, 600, 2400);
      for (let k = 0; k < NT; k++) {
        const tb = 1.6 + (4.2 * Math.acos(1 - (2 * (k + 0.5)) / NT)) / PI;
        M.tick(tb, 0.035, Math.sin((k / NT) * TAU) * 0.7);
        if (k % 6 === 5) M.marimba(tb, penta(Math.floor(k / 6) + 2, 4), 0.1, Math.sin((k / NT) * TAU) * 0.7);
      }
      M.bell(DONE8, 'G5', 0.24); M.bell(DONE8, 'D6', 0.16, 0.3); M.kick(DONE8, 0.4); M.boom(DONE8, 0.22);
      M.pad(DONE8, 'D3 A3 F#4 C5', 10 - DONE8, 0.3); M.sub(DONE8, 'D2', 10 - DONE8, 0.22);
      for (let b = DONE8 + 2; b < 10; b += 2) M.kick(b, 0.18);
      M.ep(7, 'F#5', 0.12); M.ep(8.2, 'A5', 0.1);
    },
  };

  // =========================================================== 9 · checked by a doctor
  // The clock ticks turn into a phone: every result on its scale, checked one by one,
  // then a note from the doctor slides up. You're the orange avatar.
  const phone = () => { const PH = Math.min(G.R * 1.95, G.H * 0.56); return { PH, PW: PH * 0.49, m: PH * 0.49 * 0.04 }; };
  const ROWS = 6, LABEL = [0.22, 0.16, 0.27, 0.18, 0.24, 0.2], ZONE = [[0.3, 0.7], [0.2, 0.55], [0.4, 0.8], [0.25, 0.65], [0.35, 0.75], [0.3, 0.6]];
  const VAL = [0.52, 0.4, 0.6, 0.47, 0.55, 0.44], CHECK9 = (k) => 3.3 + k * 0.42, CARD9 = 6.4;
  const gry = (b) => 0.75 * (1 - E.outCubic(clamp((b - 0.1) / 2.6))) + Math.sin((b - 2.7) * 0.8) * 0.035 * clamp(b - 2.7);
  function phonePart(i, b, p) { // unrotated phone, centred on (0, 0); false = not part of it
    const { PH, PW, m } = phone(), xl = -PW * 0.36;
    if (i === R0) { rect(p, 0, 0, PW, PH, PW * 0.17, C.ink); return true; }
    if (i === R0 + 1) { rect(p, 0, 0, PW - 2 * m, PH - 2 * m, PW * 0.13, C.white); return true; }
    if (i === R0 + 41) { seg(p, -PW * 0.12, -PH / 2 + m + PW * 0.075, PW * 0.12, -PH / 2 + m + PW * 0.075, PW * 0.075, C.ink); return true; }
    const j = i - (R0 + 2);
    if (j >= 0 && j < ROWS * 6) {
      const k = Math.floor(j / 6), part = j % 6, yk = -PH / 2 + PH * (0.16 + k * 0.083), tr = PW * 0.18;
      const arrive = 0.9 + k * 0.12, th = PW * 0.03;
      if (part === 0) seg(p, xl, yk - PH * 0.017, xl + PW * LABEL[k], yk - PH * 0.017, th * 1.05, C.steel);
      else if (part === 1) seg(p, xl, yk + PH * 0.016, tr, yk + PH * 0.016, th, C.mist);
      else if (part === 2) seg(p, lerp(xl, tr, ZONE[k][0]), yk + PH * 0.016, lerp(xl, tr, ZONE[k][1]), yk + PH * 0.016, th, LIGHT);
      else if (part === 3) {
        const v = E.inOutCubic(clamp((b - arrive - 0.5) / 0.9)) * VAL[k];
        circle(p, lerp(xl, tr, v), yk + PH * 0.016, PW * 0.062, C.blue);
      } else {
        const cs = PW * 0.062, cx = PW * 0.315, cy = yk, t = b - CHECK9(k);
        const P = [[-0.5, 0], [-0.1, 0.42], [0.62, -0.46]].map(([x, y]) => [cx + x * cs, cy + y * cs]);
        const g = part === 4 ? E.outCubic(clamp(t / 0.14)) : E.outCubic(clamp((t - 0.12) / 0.22));
        if (g <= 0) { hide(p); return true; }
        const a = part === 4 ? P[0] : P[1], c = part === 4 ? P[1] : P[2];
        seg(p, a[0], a[1], lerp(a[0], c[0], g), lerp(a[1], c[1], g), PW * 0.034, C.orange);
      }
      return true;
    }
    const cw = PW - 2 * m - PW * 0.1, ch = PH * 0.19, e = E.outQuint(clamp((b - CARD9) / 0.9));
    const cy = PH * 0.285 + (1 - e) * PH * 0.1;
    if (i === R0 + 38) { if (e <= 0) hide(p); else { rect(p, 0, cy, cw, ch, PW * 0.07, C.blue); p.o = e; } return true; }
    if (i === R0 + 39 || i === R0 + 40) {
      const n = i - (R0 + 39), g = E.outCubic(clamp((b - CARD9 - 0.45 - n * 0.15) / 0.6));
      if (g <= 0) { hide(p); return true; }
      const x0 = -cw / 2 + PW * 0.25, yy = cy + (n ? ch * 0.16 : -ch * 0.12), len = (n ? cw * 0.38 : cw * 0.56) * g;
      seg(p, x0, yy, x0 + len, yy, PW * (n ? 0.03 : 0.036), n ? LIGHT : C.white);
      return true;
    }
    if (i === 0) {
      const g = E.outBack(clamp((b - CARD9 - 0.3) / 0.6));
      if (g <= 0) { hide(p); return true; }
      circle(p, -cw / 2 + PW * 0.12, cy, PW * 0.12 * g, C.orange);
      return true;
    }
    return false;
  }
  const S9 = {
    name: 'doctor',
    beats: 12,
    blend: {
      start: (i) => (i >= R0 && i < R0 + NT ? 0.05 + (i - R0) * 0.018 : 0),
      dur: (i) => (i === R0 || i === R0 + 1 ? 1.2 : i >= R0 && i < R0 + NT ? 1.1 : 0.6),
      fresh: (i) => i === R0 || i === R0 + 1 || i === R0 + 41,
      arc: 0.08,
    },
    pose(i, b, p) {
      if (!phonePart(i, b, p)) return hide(p);
      const r = gry(b), x = p.x;
      p.x = x * Math.cos(r); p.z = -x * Math.sin(r); p.ry += r;
      p.y += Math.sin(b * 0.9) * phone().PH * 0.006;
    },
    type: [
      { at: 1.6, to: 5.9, text: 'Checked by a doctor.' },
      { at: 6.4, to: 11.6, text: 'With clear advice for every result.' },
    ],
    music(M) {
      M.pad(0, 'G3 B3 D4 F#4', 6, 0.28); M.sub(0, 'G2', 6, 0.22);
      M.whoosh(0, 1.4, 0.05, 300, 1800);
      for (let k = 0; k < ROWS; k++) {
        M.tick(0.9 + k * 0.12 + 0.5, 0.03, 0.2);
        M.marimba(CHECK9(k) + 0.05, penta(k + 7, 4), 0.14, (k / 5 - 0.5) * 0.6);
        M.beep(CHECK9(k) + 0.12, penta(k + 7, 4), 0.05, (k / 5 - 0.5) * 0.6);
      }
      for (let b = 2; b < 12; b += 2) M.kick(b, 0.18);
      M.pad(6, 'E3 B3 D4 G4', 6, 0.28); M.sub(6, 'E2', 6, 0.2);
      M.whoosh(CARD9 - 0.2, 0.9, 0.05, 500, 2400);
      M.ep(CARD9 + 0.3, 'G5', 0.18); M.ep(CARD9 + 0.3, 'B5', 0.14, 0.3); M.ep(CARD9 + 0.3, 'D6', 0.12, -0.3);
      M.ep(8.4, 'A5', 0.12); M.ep(9.6, 'B5', 0.1);
    },
  };

  // =========================================================== 10 · take charge
  // The phone dissolves; you're left beating under the line, then you stretch into the button.
  const logoW = () => Math.min(G.W * 0.78, G.R * 3.6, 1000);
  const CTA_Y = () => (G.portrait ? 0.64 : 0.67);
  const TXT10 = [1.0, 5.6], LOGO10 = 6.0, MOVE10 = [5.6, 8.0], BTN10 = [8.2, 9.4], SHOW10 = 9.4;
  let btnCache = { v: -1, at: 0, r: null };
  function button() { // where the real link sits, so the shape can become it exactly
    const a = document.querySelector('#type .line.link a');
    if (!a) return null;
    const now = performance.now();
    if (btnCache.v !== G.version || now - btnCache.at > 250 || !btnCache.r) {
      const r = a.getBoundingClientRect();
      btnCache = { v: G.version, at: now, r: r.width ? { x: r.left + r.width / 2 - G.cx, y: r.top + r.height / 2 - G.cy, w: r.width, h: r.height } : null };
    }
    return btnCache.r;
  }
  const BEAT10 = [3, 3.3, 4, 4.3];
  const S10 = {
    name: 'finale',
    beats: 16,
    blend: { start: (i) => (i === 0 ? 0 : Math.max(0, i - R0) * 0.012), dur: (i) => (i === 0 ? 1.5 : 0.7) },
    pose(i, b, p) {
      if (i) return hide(p);
      const d = G.F * 0.3, rest = G.F * 1.75;
      const est = { x: 0, y: G.H * CTA_Y() - G.cy - G.F * 0.35, w: Math.max(240, G.F * 3.6), h: 50 };
      const bt = button() || est;
      const mv = E.inOutCubic(clamp((b - MOVE10[0]) / (MOVE10[1] - MOVE10[0])));
      const st = E.inOutCubic(clamp((b - BTN10[0]) / (BTN10[1] - BTN10[0])));
      const beat = maxHit(b, BEAT10, 5);
      const dd = d * (1 + 0.35 * beat) * lerp(1, bt.h / d * 0.8, mv);
      rect(p, lerp(0, bt.x, mv), lerp(rest, bt.y, mv), lerp(dd, bt.w, st), lerp(dd, bt.h, st), lerp(dd / 2, 14, st), C.orange);
      if (b > SHOW10 + 1.2) hide(p);
    },
    type: [
      { at: TXT10[0], to: TXT10[1], text: 'Take charge | of your health.', y: yF(() => 0), size: 1.15, stagger: 0.14 },
      { at: LOGO10, to: Infinity, html: '<img src="img/logo.png" alt="LiveLong">', cls: 'logo', y: () => G.cy / G.H, size: () => logoW() / 3.087, fade: 1.2 },
      {
        at: BTN10[0] - 0.2, show: SHOW10, to: Infinity, cls: 'link', y: CTA_Y, fade: 0.8,
        html: '<a href="https://www.livelong.nl" target="_blank" rel="noopener">Start now at livelong.nl</a>' +
          '<small>No GP referral &middot; Results within 48 hours &middot; Reviewed by a doctor</small>',
      },
    ],
    music(M) {
      M.pad(0, 'C3 G3 E4 B4', 3, 0.28); M.sub(0, 'C2', 3, 0.2);
      M.ep(1.0, 'B5', 0.16); M.ep(1.5, 'D6', 0.12); M.ep(2.2, 'A5', 0.12);
      M.pad(3, 'D3 A3 F#4 C5', 3, 0.28); M.sub(3, 'D2', 3, 0.22);
      BEAT10.forEach((at, k) => M.thump(at, k % 2 ? 0.26 : 0.44));
      M.kick(LOGO10, 0.4); M.boom(LOGO10, 0.3);
      M.bell(LOGO10, 'G5', 0.22); M.bell(LOGO10 + 0.25, 'B5', 0.16, 0.3); M.bell(LOGO10 + 0.5, 'D6', 0.14, -0.3);
      M.pad(LOGO10, 'G3 B3 D4 A4', 16 - LOGO10, 0.32); M.sub(LOGO10, 'G2', 16 - LOGO10, 0.24);
      M.whoosh(BTN10[0], 1.2, 0.04, 400, 1800);
      M.marimba(SHOW10, 'D6', 0.14); M.marimba(SHOW10 + 0.2, 'G6', 0.12);
      M.ep(12, 'G5', 0.1); M.ep(12.02, 'D5', 0.08);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10];
})();
