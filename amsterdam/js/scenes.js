/* Gemeente Amsterdam, IT / data: "Digitaal werken aan de stad van morgen." A recruitment spot in 150 shapes.
   One red square is the cursor. It lights a window in a row of canal houses, taps the city's online
   services and, when the tiles flip round, turns out to be the caret in the code behind them. Then the
   screen goes Amsterdam red. The same shapes become the roles on the team, a data map of the city,
   18.000 colleagues, the three values, and finally the three crosses of the city's mark.
   A ~38-second cut at 105 BPM, in Dutch.
   Every scene defines:
     pose(i, b, p)  shape i at local beat b: p.x, p.y (from G.cx/G.cy), p.w, p.h, p.r,
                    p.tip, p.rot, p.rx, p.ry, p.z, p.o, p.c (and p.sym for pills)
     blend          how shapes travel from the previous scene
     bg / field     background colour, and the opacity of the full-screen red layer
     type           the headlines, timed in beats
     music(M)       the score, timed in the same beats */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, hit = BJ.hit, clamp = BJ.clamp, lerp = BJ.lerp, C = BJ.C, mix = BJ.mix;
  const PI = Math.PI, SQ2 = Math.SQRT2;

  // ------------------------------------------------------------ drawing helpers
  const hide = (p) => { p.o = 0; p.w = p.h = 0; };
  function circle(p, x, y, d, c) { p.x = x; p.y = y; p.w = p.h = d; p.r = d / 2; p.c = c; }
  function rect(p, x, y, w, h, r, c) { p.x = x; p.y = y; p.w = w; p.h = h; p.r = r; p.c = c; }
  function pill(p, x, y, len, th, rot, c) { p.x = x; p.y = y; p.w = th; p.h = Math.max(th, len); p.r = th / 2; p.rot = rot; p.c = c; p.sym = PI; }
  function seg(p, x0, y0, x1, y1, th, c) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-6;
    pill(p, (x0 + x1) / 2, (y0 + y1) / 2, L + th, th, Math.atan2(-dx / L, dy / L), c);
  }
  // a left-aligned bar with square ends: a line of text, or of code
  const bar = (p, x0, y, len, th, c) => rect(p, x0 + Math.max(0, len) / 2, y, Math.max(0, len), th, 0, c);
  const scaleAbout = (p, x, y, s) => { p.x = x + (p.x - x) * s; p.y = y + (p.y - y) * s; p.w *= s; p.h *= s; p.r *= s; };
  const maxHit = (b, times, decay) => { let e = 0; for (const t of times) e = Math.max(e, hit(b, t, decay)); return e; };
  function perLayout(fn) {
    let v = -1, val;
    return () => { if (v !== G.version) { v = G.version; val = fn(); } return val; };
  }
  const PENTA = ['C', 'D', 'E', 'G', 'A'];
  const penta = (k, base = 4) => PENTA[((k % 5) + 5) % 5] + (base + Math.floor(k / 5));
  const rnd = (function () { const r = BJ.rng(1275), a = []; for (let k = 0; k < 600; k++) a.push(r()); return a; })();
  const gw = () => Math.min(G.W * 0.86, G.R * 3.3);
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // 18000 → 18.000

  // ------------------------------------------------------------ harmony and groove
  const CH = { C: 'C3 G3 C4 E4', G: 'G2 D3 G3 B3', Am: 'A2 E3 A3 C4', F: 'F2 C3 F3 A3', Em: 'E3 B3 E4 G4' };
  const RT = { C: 'C2', G: 'G1', Am: 'A1', F: 'F1', Em: 'E2' };
  function chords(M, seq, v = 0.26) { // [[beat, chord, beats], ...]
    for (const [b, ch, len] of seq) { M.pad(b, CH[ch], len, v); M.sub(b, RT[ch], len, v * 0.8); }
  }
  // Kick on every beat, claps on the backbeat, off-beat hats and an eighth-note bass following
  // `roots` ([[beat, note], ...]). `half` drops to a half-time feel.
  function groove(M, b0, b1, roots, v = 1, half = false) {
    for (let b = b0; b < b1 - 0.01; b += 1) {
      const n = Math.round(b - b0);
      if (!half || n % 2 === 0) M.kick(b, 0.34 * v);
      if (half ? n % 4 === 2 : n % 2 === 1) M.clap(b, 0.15 * v, 0.1);
      M.tick(b + 0.5, 0.04 * v, 0.25);
      if (!half) M.tick(b + 0.25, 0.014 * v, -0.3), M.tick(b + 0.75, 0.018 * v, -0.3);
    }
    if (!roots) return;
    for (let b = b0; b < b1 - 0.01; b += 0.5) {
      let r = roots[0][1];
      for (const [t, nt] of roots) if (b >= t - 0.01) r = nt;
      const off = Math.round((b - b0) * 2) % 2 === 1;
      M.bass(b, off && !half ? r.replace(/\d/, (o) => +o + 1) : r, 0.32, (off ? 0.2 : 0.3) * v);
    }
  }
  // The carillon: church bells over the canals, played as quick runs.
  const carillon = (M, b0, notes, step = 0.25, v = 0.12) => notes.forEach((n, k) => { if (n) M.bell(b0 + k * step, n, v * (k % 2 ? 0.8 : 1), (k % 3 - 1) * 0.3); });

  // =========================================================== 1 · Amsterdam
  // A red cursor blinks on a white page. A row of canal houses rises around it, the cursor
  // drops into a window and the city's lights come on.
  const HW = [0.9, 1.1, 0.8, 1.2, 1.0, 0.85, 1.15, 0.95, 1.05], HH = [1.0, 1.25, 0.92, 1.35, 1.12, 0.95, 1.3, 1.05, 1.18];
  const GT = [0, 2, 1, 0, 2, 1, 0, 2, 1]; // gables: 0 stepped (trapgevel), 1 neck (halsgevel), 2 pointed (puntgevel)
  const NH = 9, PER1 = 9, WATER = NH * PER1 + 1, HERO_WIN = [4, 2]; // house 4, window 2
  const sky = perLayout(() => {
    const Wt = Math.min(G.W * 0.9, G.R * 3.2), u = Wt / HW.reduce((a, b) => a + b, 0), Hu = G.R * 0.78, yb = G.R * 0.62;
    let x = -Wt / 2;
    const H = [];
    for (let k = 0; k < NH; k++) { const w = HW[k] * u, h = HH[k] * Hu; H.push({ cx: x + w / 2, w, h, top: yb - h }); x += w; }
    return { Wt, yb, H };
  });
  const rise1 = (b, k) => E.outCubic(clamp((b - 0.15 - Math.abs(k - 4) * 0.1) / 0.6));
  const gable1 = (b, k) => E.outBack(clamp((b - 0.5 - Math.abs(k - 4) * 0.1) / 0.35));
  const win1 = (H, m) => { // window m (2 columns × 3 rows) of house H
    const ww = H.w * 0.2, wh = Math.min(H.h * 0.12, ww * 1.6);
    return { x: H.cx + (m % 2 ? 1 : -1) * H.w * 0.2, y: H.top + H.h * (0.2 + Math.floor(m / 2) * 0.25), w: ww, h: wh };
  };
  const lightT1 = (k, m) => { const j = k * 6 + m; return rnd[j + 100] > 0.25 ? 1.7 + rnd[j] * 3.6 : Infinity; };
  const HOUSEC = [C.ink, C.soot, C.ink, C.soot, C.ink, C.soot, C.ink, C.soot, C.ink];
  const LAND1 = 1.5;
  const S1 = {
    name: 'stad',
    beats: 6,
    introBeat: 0,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const { Wt, yb, H } = sky();
      if (i === 0) {
        const Hh = H[HERO_WIN[0]], w = win1(Hh, HERO_WIN[1]), m = E.inOutCubic(clamp((b - 0.95) / 0.55)), pk = hit(b, LAND1, 5);
        rect(p, lerp(0, w.x, m), lerp(0, w.y, m), lerp(G.R * 0.075, w.w, m) * (1 + 0.3 * pk), lerp(G.R * 0.15, w.h, m) * (1 + 0.3 * pk), 0, C.red);
        return;
      }
      if (i >= WATER) {
        const j = i - WATER;
        if (j > 2) return hide(p);
        const g = E.outCubic(clamp((b - 0.1 - j * 0.15) / 0.8));
        if (g <= 0) return hide(p);
        if (j === 0) rect(p, 0, yb + G.R * 0.07, Wt * 1.04 * g, G.R * 0.03, 0, C.blue);
        else rect(p, (j === 1 ? -0.22 : 0.2) * Wt + Math.sin(b * 0.9 + j) * G.R * 0.04, yb + G.R * (0.14 + j * 0.03), Wt * 0.2 * g, G.R * 0.02, 0, C.azure);
        return;
      }
      const k = Math.floor((i - 1) / PER1), part = (i - 1) % PER1, Hk = H[k], col = HOUSEC[k], g = rise1(b, k);
      if (g <= 0) return hide(p);
      const top = yb - Hk.h * g;
      if (part === 0) return rect(p, Hk.cx, yb - Hk.h * g / 2, Hk.w + 0.6, Hk.h * g, 0, col);
      if (part <= 2) {
        const gg = gable1(b, k), w = Hk.w;
        if (gg <= 0) return hide(p);
        if (GT[k] === 0) {
          const s1 = w * 0.3, s2 = w * 0.28;
          if (part === 1) rect(p, Hk.cx, top - s1 * gg / 2, w * 0.72, s1 * gg, 0, col);
          else rect(p, Hk.cx, top - s1 * gg - s2 * gg / 2 + 0.5, w * 0.42, s2 * gg, 0, col);
        } else if (GT[k] === 1) {
          const s1 = w * 0.5, s2 = w * 0.14;
          if (part === 1) rect(p, Hk.cx, top - s1 * gg / 2, w * 0.56, s1 * gg, 0, col);
          else rect(p, Hk.cx, top - s1 * gg - s2 * gg / 2 + 0.5, w * 0.24, s2 * gg, 0, col);
        } else {
          if (part === 2) return hide(p);
          rect(p, Hk.cx, top, (w / SQ2) * gg, (w / SQ2) * gg, 0, col);
          p.rot = PI / 4;
        }
        return;
      }
      const m = part - 3;
      if (k === HERO_WIN[0] && m === HERO_WIN[1]) return hide(p); // the cursor lives here
      const w = win1(Hk, m), f = (yb - w.y) / Hk.h, v = clamp((g - f) / 0.12);
      if (v <= 0) return hide(p);
      const lit = clamp((b - lightT1(k, m)) / 0.12);
      rect(p, w.x, w.y, w.w, w.h, 0, mix(C.dark, C.white, lit));
      p.o = v;
    },
    type: [
      { at: 0.3, to: 2.9, text: 'Amsterdam.', size: 1.3 },
      { at: 3.1, to: 5.8, text: 'Een stad die | nooit stilstaat.', stagger: 0.1 },
    ],
    music(M) {
      chords(M, [[0, 'C', 3], [3, 'F', 3]], 0.24);
      carillon(M, 0.15, ['G5', 'E5', 'C6', 'G5', 'A5', 'E5']);
      for (let k = 0; k < NH; k++) M.marimba(0.2 + Math.abs(k - 4) * 0.1, penta(9 - Math.abs(k - 4), 3), 0.07, (k / 8 - 0.5) * 1.2);
      M.bell(LAND1, 'E6', 0.16); M.marimba(LAND1, 'C6', 0.14); M.click(LAND1, 0.25);
      const lights = [];
      for (let k = 0; k < NH; k++) for (let m = 0; m < 6; m++) { const t = lightT1(k, m); if (t < 6 && !(k === HERO_WIN[0] && m === HERO_WIN[1])) lights.push([t, sky().H[k].cx]); }
      lights.sort((a, b) => a[0] - b[0]).forEach(([t, x], n) => { if (n % 3 === 0) M.beep(t, penta(10 + (n / 3) % 7, 4), 0.03, clamp(x / (G.R * 1.6 || 1), -1, 1) * 0.7); });
      carillon(M, 3.1, ['C6', 'A5', 'G5', 'E5', 'D5', 'E5', 'G5', null, 'A5', 'G5'], 0.25, 0.1);
      M.kick(3, 0.2); M.kick(4, 0.26); M.kick(5, 0.3);
      for (let b = 4.5; b < 6; b += 0.5) M.tick(b, 0.03, 0.3);
      M.whoosh(5, 1, 0.05, 400, 3000);
    },
  };

  // =========================================================== 2 · de stad draait op IT
  // The houses fold into a grid of the city's online services. The cursor taps three of them.
  const tiles = perLayout(() => {
    const cols = G.portrait ? 3 : 4, rows = G.portrait ? 4 : 3;
    const T = Math.min(gw() / (cols + (cols - 1) * 0.16), (G.R * 2.0) / (rows + (rows - 1) * 0.16)), gap = T * 0.16, P = [];
    for (let t = 0; t < 12; t++) { const c = t % cols, r = Math.floor(t / cols); P.push({ x: (c - (cols - 1) / 2) * (T + gap), y: (r - (rows - 1) / 2) * (T + gap), c, r }); }
    return { cols, rows, T, P };
  });
  const ICON = [C.blue, C.azure, C.green, C.orange, C.purple, C.magenta];
  const TL2 = [0.62, 0.48, 0.56, 0.4, 0.66, 0.52, 0.44, 0.6, 0.5, 0.58, 0.42, 0.64];
  const iconOf = (L, t) => { const s = L.T * 0.26, P = L.P[t]; return { x: P.x - L.T / 2 + L.T * 0.13 + s / 2, y: P.y - L.T / 2 + L.T * 0.13 + s / 2, s }; };
  function tileFront(p, t, part) {
    const L = tiles(), T = L.T, P = L.P[t], x0 = P.x - T / 2 + T * 0.13;
    if (part === 0) rect(p, P.x, P.y, T, T, 0, C.grey1);
    else if (part === 1) { const ic = iconOf(L, t); rect(p, ic.x, ic.y, ic.s, ic.s, 0, ICON[t % 6]); }
    else if (part === 2) bar(p, x0, P.y + T * 0.14, T * TL2[t], T * 0.085, C.ink);
    else bar(p, x0, P.y + T * 0.29, T * TL2[t] * 0.6, T * 0.055, C.grey3);
  }
  const TAP2 = [0.3, 1.3, 2.3], TGT2 = [5, 2, 9], B2 = 6;
  const S2 = {
    name: 'diensten',
    beats: B2,
    blend: { start: (i) => (i === 0 ? 0 : 0.02 + (i % 30) * 0.006), dur: (i) => (i === 0 ? 0.3 : 0.65), arc: 0.1 },
    pose(i, b, p) {
      const L = tiles();
      if (i === 0) {
        let n = 0;
        for (let k = 1; k < 3; k++) if (b >= TAP2[k] - 0.35) n = k;
        const a = iconOf(L, TGT2[Math.max(0, n - 1)]), z = iconOf(L, TGT2[n]), m = n === 0 ? 1 : E.inOutCubic(clamp((b - TAP2[n] + 0.35) / 0.3));
        const pk = hit(b, TAP2[n], 5), s = z.s * (1 + 0.3 * pk);
        rect(p, lerp(a.x, z.x, m), lerp(a.y, z.y, m) - Math.sin(PI * m) * L.T * 0.25, s, s, 0, C.red);
        return;
      }
      if (i > 48) return hide(p);
      const t = Math.floor((i - 1) / 4), part = (i - 1) % 4;
      tileFront(p, t, part);
      const k = TGT2.indexOf(t);
      if (k >= 0) { const P = L.P[t], pk = hit(b, TAP2[k], 5); scaleAbout(p, P.x, P.y, 1 + 0.07 * pk); if (part === 0) p.c = mix(C.grey1, C.grey2, pk); }
    },
    type: [
      { at: 0.3, to: 1.25, text: 'Paspoort.', size: 1.2, stagger: 0 },
      { at: 1.3, to: 2.25, text: 'Parkeren.', size: 1.2, stagger: 0 },
      { at: 2.3, to: 3.25, text: 'Melding.', size: 1.2, stagger: 0 },
      { at: 3.45, to: 5.8, text: 'De stad draait op IT.' },
    ],
    music(M) {
      chords(M, [[0, 'Am', 3], [3, 'G', 3]], 0.26);
      M.whoosh(0, 0.7, 0.05, 2400, 500);
      TAP2.forEach((t, k) => { M.click(t, 0.3); M.marimba(t, penta(12 + k * 2, 3), 0.15, (k - 1) * 0.4); M.beep(t + 0.05, penta(17 + k * 2, 3), 0.04); });
      M.ep(3.45, 'E5', 0.12); M.ep(3.45, 'B5', 0.08, 0.3); M.ep(4.5, 'D5', 0.1);
      groove(M, 0, B2, [[0, 'A1'], [3, 'G1']], 0.75);
    },
  };

  // =========================================================== 3 · achter elke klik
  // The tiles flip round, one diagonal at a time. Behind each is dark glass and a few lines of
  // code being typed; the cursor comes round with its tile and turns out to be the caret.
  const IND3 = [0, 1, 2, 1, 0, 1, 1, 2, 0], CL3 = [0.5, 0.42, 0.3, 0.58, 0.36, 0.46, 0.4, 0.28, 0.52];
  const CODE = [C.azure, C.white, C.yellow, C.green, C.grey3, C.orange];
  const flipT3 = (P) => 0.1 + (P.c + P.r) * 0.09;
  const type3 = (lb, k) => Math.floor(clamp((lb - 0.1 - k * 0.3) / 0.55) * 7) / 7; // chunky typing
  function codeLine(L, t, k, lb) {
    const T = L.T, P = L.P[t], x0 = P.x - T / 2 + T * 0.13 + IND3[(t + k * 4) % 9] * T * 0.1;
    return { x0, y: P.y - T * 0.2 + k * T * 0.2, len: T * CL3[(t * 3 + k) % 9] * type3(lb, k), th: T * 0.07 };
  }
  function tileBack(p, t, part, lb) {
    const L = tiles(), P = L.P[t];
    if (part === 0) return rect(p, P.x, P.y, L.T, L.T, 0, C.soot);
    const k = part - 1, cl = codeLine(L, t, k, lb);
    if (cl.len <= 0.5) return hide(p);
    bar(p, cl.x0, cl.y, cl.len, cl.th, CODE[(t + k) % 6]);
  }
  function flip(p, P, T, a) { // turn a shape about its tile's vertical axis
    const aa = a < PI / 2 ? a : a - PI, dx = p.x - P.x;
    p.x = P.x + dx * Math.cos(aa); p.z = -dx * Math.sin(aa) + Math.sin(a) * T * 0.3; p.ry = aa;
  }
  const B3 = 5, HERO3 = TGT2[2];
  const S3 = {
    name: 'achter',
    beats: B3,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const L = tiles();
      if (i === 0) {
        const P = L.P[HERO3], ft = flipT3(P), a = PI * E.inOutCubic(clamp((b - ft) / 0.5)), lb = b - ft - 0.5;
        if (a < PI / 2) S2.pose(0, B2 + b, p);
        else {
          const cl = codeLine(L, HERO3, 2, lb), typing = type3(lb, 2) < 1;
          rect(p, cl.x0 + Math.max(0, cl.len) + L.T * 0.05, cl.y, L.T * 0.045, L.T * 0.14, 0, C.red);
          if (!typing && Math.floor(b * 2) % 2 === 1) p.o = 0.12;
        }
        flip(p, P, L.T, a);
        return;
      }
      if (i > 48) return hide(p);
      const t = Math.floor((i - 1) / 4), part = (i - 1) % 4, P = L.P[t], ft = flipT3(P), a = PI * E.inOutCubic(clamp((b - ft) / 0.5));
      if (a < PI / 2) S2.pose(i, B2 + b, p);
      else tileBack(p, t, part, b - ft - 0.5);
      flip(p, P, L.T, a);
    },
    type: [{ at: 0.6, to: 4.8, text: 'Achter elke klik | zit een team.', stagger: 0.1 }],
    music(M) {
      chords(M, [[0, 'F', 2.5], [2.5, 'G', 2.5]], 0.26);
      const L = tiles();
      for (let d = 0; d <= L.cols + L.rows - 2; d++) { const t = 0.1 + d * 0.09; M.whoosh(t, 0.5, 0.02, 800, 3000); M.marimba(t + 0.25, penta(14 - d, 3), 0.08, (d / 5 - 0.5)); }
      for (let b = 0.9; b < 4.6; b += 0.125) if (rnd[Math.round(b * 8) + 300] > 0.35) M.tick(b, 0.02 + rnd[Math.round(b * 8) + 350] * 0.025, (rnd[Math.round(b * 8) + 400] - 0.5) * 1.4);
      M.ep(0.6, 'A5', 0.1); M.ep(2.5, 'B5', 0.1); M.ep(2.5, 'D6', 0.07, 0.3);
      groove(M, 0, B3, [[0, 'F1'], [2.5, 'G1']], 0.8);
    },
  };

  // =========================================================== 4 · dat team zijn wij
  // The code tiles pull into the caret. The caret squares up, then fills the screen: Amsterdam red.
  // On the drop a white grid rolls towards us, pulsing with the kick.
  const COVER4 = [1.35, 1.95], DROP4 = 2, B4 = 10;
  const coverD = () => 2.4 * Math.max(G.W, G.H);
  const TILT4 = 1.0;
  const plane4 = perLayout(() => {
    const cols = G.portrait ? 8 : 12, rows = 7, sp = Math.min((G.W * 1.15) / (cols - 1), G.R * 0.5);
    return { cols, rows, sp, yc: -G.R * 0.3 };
  });
  const S4 = {
    name: 'wij',
    beats: B4,
    blend: { dur: 0.01 },
    field: (b) => clamp((b - COVER4[1] + 0.03) / 0.06),
    dark: (b) => b >= COVER4[1],
    pose(i, b, p) {
      if (i === 0) {
        S3.pose(0, B3 + b, p);
        p.o = 1;
        const m = E.inOutCubic(clamp((b - 0.1) / 0.8)), d0 = G.R * 0.16, pk = b < COVER4[0] ? hit(b, 1, 6) : 0;
        p.x = lerp(p.x, 0, m); p.y = lerp(p.y, 0, m); p.z = lerp(p.z, 0, m);
        p.w = lerp(p.w, d0, m) * (1 + 0.15 * pk); p.h = lerp(p.h, d0, m) * (1 + 0.15 * pk);
        if (b > COVER4[0]) { const D = lerp(d0, coverD(), E.inCubic(clamp((b - COVER4[0]) / (COVER4[1] - COVER4[0])))); p.w = p.h = D; }
        if (b > COVER4[1] + 0.05) hide(p);
        return;
      }
      if (b < DROP4) {
        if (i > 48) return hide(p);
        const f = E.inCubic(clamp((b - 0.1) / 1.1));
        if (f >= 1) return hide(p);
        S3.pose(i, B3 + b, p);
        scaleAbout(p, 0, 0, 1 - f);
        p.z *= 1 - f;
        return;
      }
      const L = plane4(), n = i - 1;
      if (n >= L.cols * L.rows) return hide(p);
      const c = n % L.cols, r = Math.floor(n / L.cols), dc = c - (L.cols - 1) / 2;
      const u = (((r + (b - DROP4) * 0.5) % L.rows) + L.rows) % L.rows, v = (u - L.rows / 2) * L.sp, dist = Math.hypot(dc, u - L.rows / 2);
      const g = E.outBack(clamp((b - DROP4 - 0.02 - dist * 0.04) / 0.4)), pk = hit(b, Math.floor(b), 6) * hit(b, Math.floor(b) + dist * 0.04, 3);
      if (g <= 0) return hide(p);
      const q = L.sp * 0.34 * g * (1 + 0.45 * pk);
      rect(p, dc * L.sp, L.yc + v * Math.cos(TILT4), q, q, 0, C.white);
      p.z = v * Math.sin(TILT4); p.rx = TILT4;
      p.o = Math.pow(Math.sin((PI * u) / L.rows), 0.7) * (0.5 + 0.5 * ((c + r) % 3 === 0 ? 1 : 0.4 + 0.6 * pk));
    },
    type: [
      { at: 2.05, to: 4.4, text: 'Dat team | zijn wij.', size: 1.3, color: '#fff', stagger: 0.12 },
      { at: 4.6, to: 7.2, text: 'Digitaal werken aan | de stad van morgen.', color: '#fff', stagger: 0.1 },
      { at: 7.4, to: 9.8, text: 'Voor ruim 900.000 | Amsterdammers.', color: '#fff', stagger: 0.1 },
    ],
    music(M) {
      chords(M, [[0, 'Am', 1], [1, 'G', 1]], 0.24);
      M.ep(0.2, 'C5', 0.12); M.ep(0.2, 'E5', 0.09, 0.3); M.ep(1, 'D5', 0.1); M.ep(1, 'B4', 0.08, -0.3);
      M.kick(0, 0.3); M.kick(1, 0.3);
      [1.0, 1.25, 1.5, 1.625, 1.75, 1.8125, 1.875, 1.9375].forEach((t, k) => M.clap(t, 0.05 + k * 0.016, (k % 2 ? 0.3 : -0.3)));
      M.whoosh(COVER4[0] - 0.4, 1.0, 0.08, 300, 3400);
      M.boom(DROP4, 0.42); M.splash(DROP4, 0.12); M.kick(DROP4, 0.5);
      carillon(M, DROP4, ['C6', 'G5', 'E5', 'G5', 'C6', 'E6', 'D6', 'C6'], 0.25, 0.13);
      chords(M, [[2, 'C', 2], [4, 'G', 2], [6, 'Am', 2], [8, 'F', 2]], 0.3);
      groove(M, DROP4, B4, [[2, 'C2'], [4, 'G1'], [6, 'A1'], [8, 'F1']]);
      const HOOK = { 4: ['D5', 'G5', 'B5', 'A5', 'G5'], 6: ['C5', 'E5', 'A5', 'G5', 'E5'], 8: ['C5', 'F5', 'A5', 'G5', 'F5'] };
      for (const s in HOOK) HOOK[s].forEach((n, k) => M.marimba(+s + [0, 0.5, 0.75, 1.25, 1.5][k], n, 0.11, (k % 2 ? 0.3 : -0.3)));
    },
  };

  // =========================================================== 5 · de rollen
  // The team, role by role. One set of shapes redraws itself: a neural net, a padlock, a chart,
  // a phone, a row of sliders. The red one is always the part that matters.
  const U5 = () => Math.min(G.R * 1.45, G.W * 0.62), FY5 = () => -G.R * 0.06;
  const T5 = [0.3, 1.5, 2.7, 3.9, 5.1], MOR5 = 0.42, B5 = 8;
  const blank = (q) => { q.x = q.y = q.z = q.w = q.h = q.r = q.tip = q.rot = q.rx = q.ry = q.sym = 0; q.o = 1; q.c = C.ink; return q; };
  const TK = ['x', 'y', 'z', 'w', 'h', 'r', 'tip', 'rot', 'rx', 'ry', 'o'];
  const qa = {}, qz = {};
  function tween(p, a, z, t) { // in-scene morph; a shape that appears or leaves grows or shrinks in place
    const va = a.o > 0 && a.w > 0, vz = z.o > 0 && z.w > 0;
    if (!va && !vz) return hide(p);
    if (!va) { for (const k of TK) a[k] = z[k]; a.c = z.c; a.w *= 0.4; a.h *= 0.4; a.r *= 0.4; a.o = 0; }
    if (!vz) { for (const k of TK) z[k] = a[k]; z.c = a.c; z.w *= 0.4; z.h *= 0.4; z.r *= 0.4; z.o = 0; }
    for (const k of TK) p[k] = lerp(a[k], z[k], t);
    p.w = Math.max(0, p.w); p.h = Math.max(0, p.h); p.r = Math.max(0, p.r); p.o = clamp(p.o);
    p.c = mix(a.c, z.c, clamp(t));
  }
  const NET = [3, 4, 3];
  const node5 = (j) => { let l = 0; while (j >= NET[l]) j -= NET[l++]; return { l, x: (l - 1) * 0.5 * U5(), y: FY5() + (j - (NET[l] - 1) / 2) * 0.28 * U5() }; };
  const HB5 = [0.28, 0.42, 0.34, 0.55, 0.47, 0.64, 0.82];
  function form5(k, i, b, q) {
    const U = U5(), fy = FY5(), lt = b - T5[k];
    if (i > 34) return hide(q);
    if (k === 0) { // neural net: a signal runs through it, layer by layer
      const fire = (l) => maxHit(lt, [0.1 + l * 0.25, 0.7 + l * 0.25], 6);
      if (i === 0) { const n = node5(8); return circle(q, n.x, n.y, U * 0.13 * (1 + 0.35 * fire(2)), C.red); }
      if (i <= 24) {
        const e = i - 1, a = e < 12 ? node5(Math.floor(e / 4)) : node5(3 + Math.floor((e - 12) / 3)), z = e < 12 ? node5(3 + (e % 4)) : node5(7 + ((e - 12) % 3));
        seg(q, a.x, a.y, z.x, z.y, U * 0.014, mix(C.grey3, C.ink, fire(a.l) * 0.8));
        q.sym = 0;
        return;
      }
      const j = i - 25;
      if (j === 8) return hide(q);
      const n = node5(j);
      return circle(q, n.x, n.y, U * 0.1 * (1 + 0.25 * fire(n.l)), C.ink);
    }
    if (k === 1) { // padlock: the shackle snaps shut
      const bw = U * 0.56, bh = U * 0.46, by = fy + U * 0.14, top = by - bh / 2, rr = U * 0.16, th = U * 0.07;
      const lift = U * 0.09 * (1 - E.outBack(clamp((lt - 0.35) / 0.2))), ac = top - U * 0.1 - lift;
      if (i === 0) return circle(q, 0, by - U * 0.04, U * 0.11, C.red);
      if (i <= 12) {
        const a0 = PI + (PI * (i - 1)) / 12, a1 = PI + (PI * i) / 12;
        seg(q, rr * Math.cos(a0), ac + rr * Math.sin(a0), rr * Math.cos(a1), ac + rr * Math.sin(a1), th, C.grey4);
        q.r = 0; q.sym = 0;
        return;
      }
      if (i <= 14) { const x = i === 13 ? -rr : rr; rect(q, x, (ac + top + U * 0.04) / 2, th, top + U * 0.04 - ac, 0, C.grey4); return; }
      if (i === 25) return rect(q, 0, by, bw, bh, 0, C.ink);
      if (i === 26) return rect(q, 0, by + U * 0.05, U * 0.045, U * 0.13, 0, C.red);
      return hide(q);
    }
    if (k === 2) { // bar chart: the last bar is ours
      const base = fy + U * 0.32, x = (j) => (j - 3) * 0.13 * U;
      const hb = (j) => HB5[j] * U * 0.72 * (0.3 + 0.7 * E.outCubic(clamp((lt + 0.25 - j * 0.04) / 0.45))) * (1 + 0.04 * Math.sin(b * 3 + j));
      if (i === 0) { const h = hb(6); return rect(q, x(6), base - h / 2, U * 0.09, h, 0, C.red); }
      if (i === 1) return rect(q, 0, base + U * 0.012, U * 0.96, U * 0.018, 0, C.ink);
      if (i >= 25 && i <= 30) { const j = i - 25, h = hb(j); return rect(q, x(j), base - h / 2, U * 0.09, h, 0, C.blue); }
      return hide(q);
    }
    if (k === 3) { // phone: the red one is the button
      const pk = hit(lt, 0.55, 5), sw = U * 0.42;
      if (i === 0) return rect(q, 0, fy + U * 0.28, sw * 0.8 * (1 - 0.08 * pk), U * 0.08 * (1 - 0.08 * pk), 0, C.red);
      if (i === 25) return rect(q, 0, fy, U * 0.5, U * 0.92, U * 0.05, C.ink);
      if (i === 26) return rect(q, 0, fy, sw, U * 0.8, U * 0.015, C.grey1);
      if (i === 27) return rect(q, 0, fy - U * 0.35, sw, U * 0.1, 0, C.blue);
      if (i === 28) return rect(q, 0, fy - U * 0.15, sw * 0.82, U * 0.2, 0, mix(C.grey2, C.azure, pk * 0.6));
      if (i >= 29 && i <= 31) { const j = i - 29; return bar(q, -sw * 0.41, fy + U * (0.02 + j * 0.06), sw * [0.6, 0.45, 0.55][j], U * (j ? 0.025 : 0.035), j ? C.grey3 : C.ink); }
      return hide(q);
    }
    // sliders: tuning until it fits
    const val = (j) => 0.5 + 0.28 * Math.sin(b * (0.9 + j * 0.25) + j * 2.1) * (1 - 0.6 * clamp((b - 6.8) / 0.8)), y = (j) => fy + (j - 1) * 0.26 * U, L = U * 0.84;
    if (i === 0) return rect(q, -L / 2 + val(1) * L, y(1), U * 0.1, U * 0.1, 0, C.red);
    if (i >= 1 && i <= 3) return rect(q, 0, y(i - 1), L, U * 0.02, 0, C.grey3);
    if (i >= 4 && i <= 6) { const j = i - 4; return bar(q, -L / 2, y(j), val(j) * L, U * 0.02, j === 1 ? C.red : C.ink); }
    if (i === 25 || i === 26) { const j = i === 25 ? 0 : 2; return rect(q, -L / 2 + val(j) * L, y(j), U * 0.1, U * 0.1, 0, C.ink); }
    return hide(q);
  }
  const ROLES = ['AI-engineer.', 'Security officer.', 'Data engineer.', 'UX-designer.', 'Functioneel | beheerder.'];
  const S5 = {
    name: 'rollen',
    beats: B5,
    blend: { start: (i) => (i === 0 ? 0 : (i % 24) * 0.004), dur: (i) => (i === 0 ? 0.3 : 0.4), ease: E.glide },
    field: (b) => 1 - E.inOutSine(clamp(b / 0.35)),
    dark: (b) => b < 0.18,
    pose(i, b, p) {
      let k = 0;
      for (let j = 1; j < 5; j++) if (b >= T5[j] - MOR5) k = j;
      if (k === 0 || b >= T5[k]) return form5(k, i, b, p);
      form5(k - 1, i, b, blank(qa)); form5(k, i, b, blank(qz));
      tween(p, qa, qz, E.glide(clamp((b - T5[k] + MOR5) / MOR5)));
    },
    type: [
      ...ROLES.map((t, k) => ({ at: T5[k] - 0.1, to: k < 4 ? T5[k + 1] - 0.3 : 6.05, text: t, stagger: 0.06 })),
      { at: 6.25, to: 7.9, text: 'Welke rol | past bij jou?', stagger: 0.1 },
    ],
    music(M) {
      chords(M, [[0, 'C', 2.4], [2.4, 'Am', 2.4], [4.8, 'F', 1.45], [6.25, 'G', 1.75]], 0.28);
      groove(M, 0, 6, [[0, 'C2'], [2.4, 'A1'], [4.8, 'F1']], 0.85);
      groove(M, 6, B5, [[6, 'G1']], 0.7, true);
      T5.forEach((t, k) => { M.bell(t, penta(12 + k, 3), 0.1, (k - 2) * 0.3); M.whoosh(t - MOR5, MOR5 + 0.1, 0.035, 600, 2600); });
      [0.1, 0.35, 0.6].forEach((t, l) => M.beep(T5[0] + t, penta(13 + l * 2, 3), 0.045, (l - 1) * 0.5));
      [0.7, 0.95, 1.2].forEach((t, l) => M.beep(T5[0] + t, penta(15 + l * 2, 3), 0.035, (l - 1) * 0.5));
      M.click(T5[1] + 0.45, 0.4); M.thump(T5[1] + 0.45, 0.2);
      for (let j = 0; j < 7; j++) M.marimba(T5[2] + j * 0.06, penta(8 + j, 3), 0.07, (j / 6 - 0.5));
      M.click(T5[3] + 0.55, 0.35); M.beep(T5[3] + 0.58, 'G6', 0.04);
      for (let t = T5[4] + 0.1; t < 7.6; t += 0.25) M.tick(t, 0.02, Math.sin(t * 3) * 0.6);
      M.ep(6.25, 'B4', 0.1); M.ep(6.25, 'D5', 0.08, 0.3); M.ep(7, 'G5', 0.09, -0.3);
      M.whoosh(7.2, 0.8, 0.05, 400, 3000);
    },
  };

  // =========================================================== 6 · data voor de stad
  // The shapes lie down into a map of the city. Three ripples run across it from three
  // points, and the districts light up: cleaner air, less traffic, more homes.
  const TILT6 = 0.95, RT6 = [0.3, 1.8, 3.3], B6 = 7;
  const COL6 = [C.green, C.orange, C.blue];
  const map6 = perLayout(() => {
    const cols = G.portrait ? 8 : 12, rows = G.portrait ? 10 : 7;
    const sp = Math.min((gw() * (G.portrait ? 0.8 : 1)) / cols, (G.R * 2.3) / (rows * Math.cos(TILT6)));
    const O = [[0.2, 0.25], [0.78, 0.3], [0.45, 0.8]].map(([a, b]) => [Math.round(a * (cols - 1)), Math.round(b * (rows - 1))]);
    const cells = [];
    for (let n = 0; n < cols * rows; n++) {
      const c = n % cols, r = Math.floor(n / cols), d = O.map(([oc, or]) => Math.hypot(c - oc, r - or));
      cells.push({ c, r, d, own: d.indexOf(Math.min(...d)) });
    }
    return { cols, rows, sp, O, cells, yc: -G.R * 0.04 };
  });
  function mapPt(L, c, r, lift) { // a point on the tilted map, `lift` off its surface
    const x = (c - (L.cols - 1) / 2) * L.sp, v = (r - (L.rows - 1) / 2) * L.sp;
    return { x, y: L.yc + v * Math.cos(TILT6) - lift * Math.sin(TILT6), z: v * Math.sin(TILT6) + lift * Math.cos(TILT6) };
  }
  const arrive6 = (cell, k) => RT6[k] + 0.08 + cell.d[k] * 0.075;
  const S6 = {
    name: 'data',
    beats: B6,
    blend: { start: (i) => (i === 0 ? 0 : (i % 40) * 0.006), dur: (i) => (i === 0 ? 0.4 : 0.6), ease: E.glide, arc: 0.1 },
    pose(i, b, p) {
      const L = map6();
      if (i === 0) {
        let n = 0;
        for (let k = 1; k < 3; k++) if (b >= RT6[k] - 0.45) n = k;
        const d = Math.max(L.sp * 0.95, G.R * 0.16), P = (k) => { const q = mapPt(L, L.O[k][0], L.O[k][1], 0); q.y -= d * 0.707; return q; };
        const a = P(Math.max(0, n - 1)), z = P(n), m = n === 0 ? 1 : E.inOutCubic(clamp((b - RT6[n] + 0.45) / 0.4)), pk = hit(b, RT6[n], 6);
        circle(p, lerp(a.x, z.x, m), lerp(a.y, z.y, m) - Math.sin(PI * m) * L.sp * 1.6 + d * 0.12 * pk, d, C.red);
        p.z = lerp(a.z, z.z, m); p.tip = 1; p.rot = (5 * PI) / 4;
        p.w *= 1 + 0.15 * pk; p.h *= 1 - 0.15 * pk;
        return;
      }
      const cell = L.cells[i - 1];
      if (!cell) return hide(p);
      let lift = 0;
      for (let k = 0; k < 3; k++) lift += hit(b, arrive6(cell, k), 5) * Math.exp(-cell.d[k] * 0.18);
      const q = mapPt(L, cell.c, cell.r, lift * L.sp * 0.55), tint = clamp((b - arrive6(cell, cell.own)) / 0.15);
      rect(p, q.x, q.y, L.sp * 0.86, L.sp * 0.86, 0, mix(C.grey2, COL6[cell.own], tint * (0.55 + 0.45 * Math.exp(-cell.d[cell.own] * 0.25))));
      p.z = q.z; p.rx = TILT6;
    },
    type: [
      { at: RT6[0], to: RT6[1] - 0.2, text: 'Voor schonere lucht.' },
      { at: RT6[1], to: RT6[2] - 0.2, text: 'Voor minder drukte.' },
      { at: RT6[2], to: 4.7, text: 'Voor meer woningen.' },
      { at: 4.9, to: 6.85, text: 'Zo helpt data | de stad vooruit.', stagger: 0.1 },
    ],
    music(M) {
      chords(M, [[0, 'Am', 1.5], [1.5, 'F', 1.5], [3, 'C', 1.8], [4.8, 'G', 2.2]], 0.28);
      groove(M, 0, B6, [[0, 'A1'], [1.5, 'F1'], [3, 'C2'], [4.8, 'G1']], 0.85);
      RT6.forEach((t, k) => {
        M.drop(t, ['E5', 'G5', 'C6'][k], 0.2, (k - 1) * 0.5);
        for (let d = 0; d < 6; d++) M.marimba(t + 0.1 + d * 0.15, penta(14 + k * 2 - d, 3), 0.07 - d * 0.008, (k - 1) * 0.5 + (d % 2 ? 0.2 : -0.2));
        if (k) M.whoosh(t - 0.45, 0.45, 0.03, 900, 2400);
      });
      M.ep(4.9, 'B4', 0.1); M.ep(4.9, 'D5', 0.08, 0.3); M.ep(5.9, 'G5', 0.09, -0.3);
    },
  };

  // =========================================================== 7 · 18.000 collega's
  // The map gathers into a crowd of dots around a counter. When the count reaches 18.000
  // one more dot pops in, in red: the next colleague.
  const N7 = 110, B7 = 7, NEW7 = 4.3;
  const crowd7 = perLayout(() => {
    const r0 = Math.max(G.R * 0.42, G.F * 1.9), ro = Math.max(r0 * 1.5, Math.min(G.R * 1.0, G.W * 0.46)), n = N7 + 1;
    const d = Math.sqrt((PI * (ro * ro - r0 * r0)) / n) * 0.72, P = [];
    for (let k = 0; k < n; k++) { const rr = Math.sqrt(r0 * r0 + ((ro * ro - r0 * r0) * (k + 0.5)) / n), a = k * BJ.GA - PI / 2; P.push({ rr, a }); }
    return { d, P };
  });
  const DOT7 = [C.ink, C.blue, C.grey4, C.azure, C.ink, C.green, C.dark, C.purple, C.orange, C.ink, C.magenta];
  const count7 = (b) => E.outCubic(clamp((b - 0.25) / 3.3));
  const S7 = {
    name: 'collegas',
    beats: B7,
    blend: { start: (i) => (i === 0 ? 0 : rnd[i] * 0.3), dur: (i) => (i === 0 ? 0.3 : 0.6), ease: E.glide, arc: 0.15 },
    pose(i, b, p) {
      const L = crowd7(), spin = b * 0.04;
      if (i === 0) {
        const g = E.outBack(clamp((b - NEW7) / 0.35));
        if (g <= 0) return hide(p);
        const P = L.P[N7], pk = maxHit(b, [5, 6], 5);
        return circle(p, P.rr * Math.cos(P.a + spin), P.rr * Math.sin(P.a + spin), L.d * 1.35 * g * (1 + 0.2 * pk), C.red);
      }
      if (i > N7) return hide(p);
      const k = i - 1, s = clamp((count7(b) * N7 - k) / 3);
      if (s <= 0) return hide(p);
      const P = L.P[k], pk = hit(b, NEW7, 4) * Math.exp(-(N7 - k) * 0.03);
      circle(p, P.rr * Math.cos(P.a + spin), P.rr * Math.sin(P.a + spin), L.d * E.outBack(s) * (1 + 0.3 * pk), DOT7[Math.floor(rnd[k + 200] * DOT7.length)]);
    },
    type: [
      { at: 0.2, to: 4.2, fn: (b) => fmt(Math.round(18000 * count7(b))), cls: 'num', y: () => G.cy / G.H, size: 0.95 },
      { at: NEW7, to: 6.85, text: '18.001', cls: 'num', color: '#ec0000', y: () => G.cy / G.H, size: 0.95, stagger: 0 },
      { at: 0.5, to: 4.1, text: 'Eén digitale werkplek | voor ruim 18.000 collega\'s.', size: 0.82, stagger: 0.08 },
      { at: 4.5, to: 6.85, text: 'Word jij | nummer 18.001?', stagger: 0.1 },
    ],
    music(M) {
      chords(M, [[0, 'F', 2], [2, 'G', 2.3], [NEW7, 'C', B7 - NEW7]], 0.28);
      groove(M, 0, 4, [[0, 'F1'], [2, 'G1']], 0.8);
      groove(M, 4, B7, [[4, 'C2']], 0.75, true);
      for (let t = 0.3; t < 3.4; t += 0.125) { const c = count7(t); M.tick(t, 0.012 + c * 0.02, Math.sin(t * 5) * 0.5); }
      for (let t = 0.5; t < 3.6; t += 0.5) M.beep(t, penta(10 + Math.round(count7(t) * 7), 4), 0.03, 0);
      M.click(NEW7, 0.4); M.bell(NEW7, 'C6', 0.2); M.bell(NEW7 + 0.25, 'E6', 0.14, 0.3); M.marimba(NEW7, 'G5', 0.14, -0.3);
      M.ep(4.5, 'E5', 0.1); M.ep(4.5, 'G5', 0.08, 0.3); M.ep(5.5, 'A5', 0.09);
      M.whoosh(6.2, 0.8, 0.04, 500, 2600);
    },
  };

  // =========================================================== 8 · Actief · Open · Integer
  // Three squares. The red dot bounces across them and each one it lands on turns red.
  const L8 = [0.5, 1.5, 2.5], B8 = 5, VAL8 = ['Actief', 'Open', 'Integer'];
  const blk8 = () => Math.min(G.R * 0.5, G.W * 0.17), bx8 = (j) => (j - 1) * blk8() * 1.85;
  const S8 = {
    name: 'waarden',
    beats: B8,
    blend: { start: (i) => (i === 0 ? 0 : i <= 6 ? 0.04 * i : rnd[i] * 0.15), dur: (i) => (i === 0 ? 0.3 : i <= 6 ? 0.55 : 0.35), ease: E.glide },
    pose(i, b, p) {
      const q = blk8(), dd = q * 0.3;
      if (i === 0) {
        let j = -1;
        for (let k = 0; k < 3; k++) if (b >= L8[k]) j = k;
        const land = (k) => ({ x: bx8(k), y: -q / 2 - dd / 2 });
        const a = j < 0 ? { x: bx8(0) - q * 1.1, y: -q * 1.3 } : land(j), z = j < 2 ? land(j + 1) : { x: bx8(2) + q * 0.6, y: -q * 1.5 };
        const t0 = j < 0 ? 0 : L8[j], t1 = j < 2 ? L8[j + 1] : L8[2] + 0.5, m = clamp((b - t0) / (t1 - t0));
        const pk = j < 0 ? 0 : hit(b, L8[j], 7), sq = 0.3 * pk;
        circle(p, lerp(a.x, z.x, m), lerp(a.y, z.y, m) - Math.sin(PI * m) * q * 0.9 + dd * sq * 0.5, dd, C.red);
        p.w *= 1 + sq; p.h *= 1 - sq;
        if (j === 2) { const f = clamp((b - L8[2] - 0.2) / 0.3); p.w *= 1 - f; p.h *= 1 - f; p.r = p.w / 2; if (f >= 1) hide(p); }
        return;
      }
      if (i > 6) return hide(p);
      const j = Math.floor((i - 1) / 2), part = (i - 1) % 2, pk = hit(b, L8[j], 6), on = clamp((b - L8[j]) / 0.08);
      if (part === 0) {
        rect(p, bx8(j), q * 0.06 * pk, q * (1 + 0.12 * pk), q * (1 - 0.12 * pk), 0, mix(C.ink, C.red, on));
      } else rect(p, bx8(j), q * 0.62, q * 0.8 * (1 + 0.15 * pk), q * 0.05, 0, C.grey2);
    },
    type: [
      ...VAL8.map((t, j) => ({ at: L8[j] - 0.05, to: 4.8, text: t, cls: 'tag', size: 0.5, stagger: 0, x: () => 0.5 + bx8(j) / G.W, y: () => (G.cy + blk8() * 0.64 + G.F * 0.55) / G.H })),
      { at: 3.0, to: 4.8, text: 'Zo werken wij.', stagger: 0.08 },
    ],
    music(M) {
      chords(M, [[0, 'Am', 1.5], [1.5, 'F', 1.5], [3, 'G', 2]], 0.28);
      groove(M, 0, 4, [[0, 'A1'], [1.5, 'F1'], [3, 'G1']], 0.75, true);
      L8.forEach((t, j) => { M.marimba(t, ['C5', 'E5', 'G5'][j], 0.16, (j - 1) * 0.5); M.bell(t, ['C6', 'E6', 'G6'][j], 0.09, (j - 1) * 0.5); M.clap(t, 0.08, (j - 1) * 0.4); });
      M.ep(3.0, 'B4', 0.1); M.ep(3.0, 'D5', 0.08, 0.3);
      [4.0, 4.25, 4.5, 4.625, 4.75, 4.875].forEach((t, k) => M.clap(t, 0.04 + k * 0.015, (k % 2 ? 0.3 : -0.3)));
      M.whoosh(4.1, 0.9, 0.06, 300, 3200);
    },
  };

  // =========================================================== 9 · finale
  // The squares become the three crosses of Amsterdam. They slide into the wordmark,
  // and the red dot comes back as the button.
  const LOGO = { W: 469.871, H: 340.19 };
  const logoH = () => Math.min(G.R * 1.2, (G.W * 0.56 * LOGO.H) / LOGO.W), logoY = () => -G.R * 0.1;
  const CTA_Y = () => (G.portrait ? 0.66 : 0.72);
  const SLIDE9 = [4.2, 5.0], LOGO9 = 4.3, BTN9 = [6.0, 6.8], SHOW9 = 6.8, B9 = 12;
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
  const S9 = {
    name: 'finale',
    beats: B9,
    blend: { start: (i) => (i === 0 ? 0 : 0.04 * i), dur: (i) => (i === 0 ? 0.4 : 0.8), ease: E.glide },
    pose(i, b, p) {
      if (i === 0) {
        const est = { x: 0, y: G.H * CTA_Y() - G.cy - G.F * 0.35, w: Math.max(260, G.F * 3.8), h: 52 };
        const bt = button() || est, g = E.outBack(clamp((b - BTN9[0] + 0.5) / 0.5));
        if (g <= 0) return hide(p);
        const st = E.inOutCubic(clamp((b - BTN9[0]) / (BTN9[1] - BTN9[0]))), d = bt.h * 0.8 * g;
        rect(p, bt.x, bt.y, lerp(d, bt.w, st), lerp(d, bt.h, st), 0, C.red);
        if (b > SHOW9 + 1.2) hide(p);
        return;
      }
      if (i > 6) return hide(p);
      const k = Math.floor((i - 1) / 2), arm = (i - 1) % 2, h = logoH(), s = h / LOGO.H, w = LOGO.W * s;
      const slide = E.inOutCubic(clamp((b - SLIDE9[0] - k * 0.06) / (SLIDE9[1] - SLIDE9[0])));
      const pk = b < SLIDE9[0] ? maxHit(b, [1, 2, 3], 6) * (k === Math.round(b) - 1 ? 1 : 0.3) : hit(b, SLIDE9[1], 5);
      rect(p, lerp(0, -w / 2 + 50 * s, slide), logoY() - h / 2 + (50 + 120.1 * k) * s, 28.284 * s, 113.137 * s * (1 + 0.1 * pk), 0, C.red);
      p.rot = arm ? -PI / 4 : PI / 4;
    },
    type: [
      { at: 0.3, to: 3.9, text: 'Wij doen het allemaal | voor Amsterdam.', stagger: 0.1 },
      { at: LOGO9, to: Infinity, html: '<img src="img/wordmark.svg" alt="Gemeente Amsterdam">', cls: 'logo', y: () => (G.cy + logoY()) / G.H, size: logoH, fade: 1.0 },
      {
        at: BTN9[0] - 0.2, show: SHOW9, to: Infinity, cls: 'link', y: CTA_Y, fade: 0.8,
        html: '<a href="https://werkenbij.amsterdam.nl/vakgebieden/it-data-2174" target="_blank" rel="noopener">Bekijk vacatures in IT / data</a>' +
          '<small>werkenbij.amsterdam.nl &middot; Actief &middot; Open &middot; Integer</small>',
      },
    ],
    music(M) {
      chords(M, [[0, 'F', 2], [2, 'G', 2], [4, 'Em', 1]], 0.28);
      groove(M, 0, 4, [[0, 'F1'], [2, 'G1']], 0.85);
      [1, 2, 3].forEach((t, k) => M.bell(t, ['G5', 'A5', 'C6'][k], 0.09, (k - 1) * 0.3));
      M.whoosh(SLIDE9[0] - 0.2, 1.0, 0.06, 400, 3000);
      M.kick(SLIDE9[1], 0.5); M.boom(SLIDE9[1], 0.38); M.splash(SLIDE9[1], 0.12);
      chords(M, [[SLIDE9[1], 'C', B9 - SLIDE9[1]]], 0.32);
      carillon(M, SLIDE9[1], ['C6', 'G5', 'E5', 'G5', 'C6', 'D6', 'E6', null, 'G6', 'E6', 'C6'], 0.25, 0.13);
      M.whoosh(BTN9[0], 1.2, 0.04, 400, 1800);
      M.marimba(SHOW9, 'G5', 0.14); M.marimba(SHOW9 + 0.2, 'C6', 0.12);
      carillon(M, 9, ['E5', 'G5', 'C6'], 0.5, 0.07);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8, S9];
})();
