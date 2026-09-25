/* LiveLong — a short film in 150 dots.
   One orange dot is you: a heartbeat. The other 149 play everything around it:
   the ECG, the bloodstream, the queue at the GP, the map of the Netherlands,
   the tube, the centrifuge, the 48-hour clock, the results, the trend line,
   and finally the LiveLong logo, with the orange dot landing as the dot on the i.
   Every scene defines:
     pose(r, t, b, o)  where role r should be at local time t (s) / b (beats)
     blend            how dots travel from the previous formation
     captions         copy, timed in beats
     music(M)         the score, timed in the same beats as the choreography
   The heart beats on every odd beat of the film, and every scene starts on an
   even beat, so a local odd beat is always a heartbeat. */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, hit = BJ.hit, clamp = BJ.clamp, lerp = BJ.lerp;
  const wob = BJ.wobble, antic = BJ.antic;
  const N = BJ.N, GA = BJ.GA, TAU = BJ.TAU, frac = BJ.frac, SH = BJ.SHAPES;

  const hide = (o) => { o.sx = o.sy = 0; o.o = 0; };
  const half = () => Math.min(G.W * 0.46, G.R * 2.6);
  const maxHit = (b, times, decay) => { let e = 0; for (const t of times) e = Math.max(e, hit(b, t, decay)); return e; };
  const odd = (from, to) => { const a = []; for (let b = from; b < to; b += 2) a.push(b); return a; };
  function perLayout(fn) {
    let v = -1, val;
    return () => { if (v !== G.version) { v = G.version; val = fn(); } return val; };
  }
  // memoise a function of b for the current frame (poses are evaluated 150× per frame)
  function perBeat(fn) {
    let last = NaN, v = -1, val;
    return (b) => { if (b !== last || v !== G.version) { last = b; v = G.version; val = fn(b); } return val; };
  }
  // an evenly spaced polyline: returns point at arc length s (clamped), plus total length
  function polyline(pts) {
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = acc[acc.length - 1];
    return {
      L,
      at(s) {
        s = clamp(s, 0, L);
        let i = 1;
        while (i < pts.length - 1 && acc[i] < s) i++;
        const f = (s - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
        return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
      },
    };
  }
  const HERO = 2;

  // =========================================================== 1 · a heartbeat
  const LUB1 = odd(1, 6);
  const S1 = {
    name: 'heart',
    beats: 6,
    blend: { dur: 0.01 },
    pose(r, t, b, o) {
      if (r) return hide(o);
      let lub = 0, dub = 0, pre = 0, jel = 0;
      for (const at of LUB1) {
        lub += hit(b, at, 5, 0.02); dub += hit(b, at + 0.3, 6, 0.02);
        pre += antic(b, at, 0.3); jel += wob(b, at, 2.4, 5) + 0.5 * wob(b, at + 0.3, 3, 6);
      }
      const s = HERO * (1 + 0.34 * lub + 0.2 * dub - 0.1 * pre);
      o.sx = s * (1 + 0.12 * jel + 0.05 * pre); o.sy = s * (1 - 0.12 * jel - 0.07 * pre);
      o.y = -G.R * 0.02 * lub;
      o.c = 1;
    },
    captions: [{ at: 0.8, to: 5.6, text: 'Your heart beats a hundred thousand times a day.' }],
    music(M) {
      M.pad(1, 'G3 D4 B4', 5, 0.4);
      M.sub(1, 'G2', 5, 0.26);
      LUB1.forEach((at, k) => { M.thump(at, 0.5 + k * 0.03); M.thump(at + 0.3, 0.3 + k * 0.02); });
      M.ep(1, 'B5', 0.45); M.ep(3, 'D6', 0.14);
      M.ep(5, 'A5', 0.4); M.ep(5.5, 'B5', 0.14);
    },
  };

  // =========================================================== 2 · the monitor
  // The orange dot becomes the pen of a heart monitor. The trace is sampled at equal
  // arc length, so the sharp QRS spike gets as many dots as the flat stretches.
  const ECG_P = 2, ECG_V = 0.55, ECG_AMP = 0.36, ECG_S = 0.036, NT = 129;
  function ecg(T) {
    const u = frac((T - 1) / ECG_P + 0.5) - 0.5; // phase around the R peak (on odd beats)
    const g = (c, w) => Math.exp(-(((u - c) / w) ** 2));
    return 0.12 * g(-0.2, 0.035) - 0.12 * g(-0.032, 0.012) + g(0, 0.02) - 0.26 * g(0.036, 0.014) + 0.24 * g(0.22, 0.05);
  }
  const ECGQ = (function () {
    const M = 4000, L = [0];
    let prev = [0, ECG_AMP * ecg(0)], acc = 0;
    for (let i = 1; i <= M; i++) {
      const T = (i / M) * ECG_P, p = [ECG_V * T, ECG_AMP * ecg(T)];
      acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      prev = p; L.push(acc);
    }
    const n = Math.round(acc / ECG_S), tq = [];
    let i = 0;
    for (let q = 0; q < n; q++) {
      const target = (q * acc) / n;
      while (L[i + 1] < target) i++;
      tq.push(((i + (target - L[i]) / (L[i + 1] - L[i])) / M) * ECG_P);
    }
    return { n, tq, vis: (NT * ECG_P * ECG_V) / n };
  })();
  const sampleT = (j) => Math.floor(j / ECGQ.n) * ECG_P + ECGQ.tq[j % ECGQ.n];
  function lastSample(b) {
    const p = Math.floor(b / ECG_P), f = b - p * ECG_P;
    let lo = 0, hi = ECGQ.n - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ECGQ.tq[m] <= f) lo = m; else hi = m - 1; }
    return p * ECGQ.n + lo;
  }
  const u2 = () => Math.min(G.R, (G.W * 0.92) / ECGQ.vis);
  const W2 = 0.8, R2 = odd(1, 8);
  const S2 = {
    name: 'monitor',
    beats: 8,
    blend: { dur: (r) => (r === 0 ? 0.8 : 0.01), ease: E.inOutCubic },
    pose(r, t, b, o) {
      const U = u2(), xh = (ECGQ.vis * U) / 2, yb = ECG_AMP * U * 0.3, A = ECG_AMP * U;
      if (r === 0) {
        o.x = xh; o.y = yb - A * ecg(Math.max(b, W2));
        const p = maxHit(b, R2, 4);
        o.sx = o.sy = 0.95 * (1 + 0.45 * p); o.c = 1;
        return;
      }
      if (r > NT) return hide(o);
      const k = r - 1, J = lastSample(b), j = J - ((((J - k) % NT) + NT) % NT);
      const T = j >= 0 ? sampleT(j) : -1;
      if (T < W2) { o.x = xh; o.y = yb; return hide(o); }
      const d = J - j;
      o.x = xh - (b - T) * ECG_V * U;
      o.y = yb - A * ecg(T);
      o.sx = o.sy = 0.62 * E.outBack(clamp((b - T) / 0.12));
      o.o = 0.92 * clamp((NT - 1 - d) / 12);
      o.c = 0.85 * clamp(1 - d / 7);
    },
    captions: [
      { at: 0.6, to: 3.8, text: 'Most days, you feel perfectly fine.' },
      { at: 4.2, to: 7.6, text: 'But feeling fine is only half the story.' },
    ],
    music(M) {
      M.pad(0, 'G3 B3 D4', 4, 0.3); M.sub(0, 'G2', 4, 0.2);
      M.pad(4, 'E3 G3 B3 D4', 4, 0.3); M.sub(4, 'E2', 4, 0.2);
      R2.forEach((at) => { M.beep(at, 'B5', 0.16, 0.35); M.thump(at, 0.32); M.thump(at + 0.3, 0.18); });
      M.ep(2, 'D5', 0.16); M.ep(3, 'G5', 0.14);
      M.ep(4.2, 'E5', 0.16); M.ep(6, 'G5', 0.12); M.ep(7, 'F#5', 0.12);
    },
  };

  // =========================================================== 3 · the bloodstream
  // Inside a vessel: cells stream past, surging on each heartbeat. The words light
  // up the markers that ride along; then plaque builds up on the wall, quietly.
  const WALLN = 44, CELLN = 50, PLAQN = 11, WORD3 = [0.9, 2.1, 3.3], PL3 = 5, H3 = odd(1, 10);
  const CELL0 = 1 + 2 * WALLN, PLAQ0 = CELL0 + CELLN;
  const hv3 = () => Math.min(G.R * 0.5, (G.textY - G.cy) * 0.5);
  const span3 = () => G.W * 1.14;
  const xp3 = () => 0.14 * half();
  const pulse3 = (b) => maxHit(b, H3, 4);
  const plaqueAt = (k) => PL3 + k * 0.28;
  // plaque: a little mound of dots on the upper wall, [column, layer], in order of growth
  const PLQ = [[0, 0], [-1, 0], [1, 0], [-0.5, 1], [0.5, 1], [-2, 0], [2, 0], [0, 2], [-1.5, 1], [1.5, 1], [-3, 0]];
  const pd3 = () => G.dot * 1.35;
  function mound(x, b) {
    const s = pd3() * 0.9;
    let h = 0;
    for (let k = 0; k < PLAQN; k++) {
      const g = E.outCubic(clamp((b - plaqueAt(k)) / 1.2));
      if (g <= 0) continue;
      const dx = (x - xp3() - PLQ[k][0] * s) / s;
      h = Math.max(h, g * (PLQ[k][1] + 1) * s * 0.87 * Math.exp(-dx * dx));
    }
    return h;
  }
  const wallY = (x, b, side) => side * hv3() * (1 + 0.05 * pulse3(b)) + G.R * 0.01 * Math.sin((x / G.R) * 2.1 - b * 0.6 + side);
  const CELLS3 = (function () {
    const a = [], rr = BJ.rng(31);
    for (let k = 0; k < CELLN; k++) {
      const lane = frac(k * 0.618034 + 0.3) * 1.64 - 0.82;
      a.push({ lane, x0: (k + 0.7 * rr()) / CELLN, sp: 0.55 + 0.45 * (1 - lane * lane), g: k % 3, ph: k * 1.7 });
    }
    for (let k = CELLN - 1; k > 0; k--) { const j = Math.floor(rr() * (k + 1)); [a[k].lane, a[j].lane] = [a[j].lane, a[k].lane]; }
    return a;
  })();
  const flow3 = perBeat((b) => {
    let F = 0;
    const h = 1 / 60;
    for (let x = 0; x < b; x += h) {
      const P = E.inOutSine(clamp((x - PL3) / 4));
      F += (0.5 + 1.1 * maxHit(x, H3, 3.5)) * (1 - 0.45 * P) * Math.min(h, b - x);
    }
    return F;
  });
  const S3 = {
    name: 'bloodstream',
    beats: 10,
    blend: {
      arc: 0.15, ease: E.inOutCubic,
      start: (r) => (r >= CELL0 && r < PLAQ0 ? 0.05 + ((r - CELL0) / CELLN) * 0.35 : 0),
      dur: (r) => (r >= PLAQ0 ? 0.01 : 0.9),
    },
    backdrop: (b) => {
      const hv = hv3() * (1 + 0.05 * pulse3(b));
      return { a: E.inOutSine(clamp(b / 1)) * (1 - E.inOutSine(clamp((b - 9) / 1))), top: -hv, h: 2 * hv };
    },
    pose(r, t, b, o) {
      const S = span3();
      if (r === 0) {
        o.x = -0.3 * half() + G.R * 0.05 * Math.sin(b * 0.7);
        o.y = G.R * 0.05 * Math.sin(b * 0.9 + 1);
        const p = pulse3(b);
        o.sx = o.sy = 1.15 * (1 + 0.25 * p); o.c = 1;
        return;
      }
      if (r < CELL0) {
        const side = r <= WALLN ? -1 : 1, k = (r - 1) % WALLN, x = -S / 2 + ((k + 0.5) * S) / WALLN;
        o.x = x; o.y = wallY(x, b, side) + side * G.dot * 0.35;
        o.sx = o.sy = 0.85; o.o = 0.9;
        return;
      }
      if (r < PLAQ0) {
        const c = CELLS3[r - CELL0], F = flow3(b);
        let x = c.x0 * S + F * c.sp * G.R * 0.42;
        x = (((x % S) + S) % S) - S / 2;
        const top = wallY(x, b, -1) + mound(x, b) + G.dot * 0.8, bot = wallY(x, b, 1) - G.dot * 0.8;
        o.x = x;
        o.y = (top + bot) / 2 + (c.lane * (bot - top)) / 2 + G.R * 0.012 * Math.sin(b * 1.3 + c.ph);
        o.sx = o.sy = 0.85; o.o = 0.78;
        const f = clamp(2.2 * hit(b, WORD3[c.g] + 0.15 + (r - CELL0) * 0.003, 2));
        o.c = f; o.o = lerp(o.o, 1, f); o.sx = o.sy = 0.85 * (1 + 0.3 * f);
        return;
      }
      const k = r - PLAQ0, T = plaqueAt(k), s = pd3() * 0.9, x = xp3() + PLQ[k][0] * s;
      const g = E.outBack(clamp((b - T) / 1.2));
      o.x = x; o.y = wallY(x, b, -1) + (0.45 + PLQ[k][1] * 0.87) * s * E.outCubic(clamp((b - T) / 1.2));
      o.sx = o.sy = (pd3() / G.dot) * g * (1 + 0.15 * pulse3(b));
      o.c = 1; o.o = 0.95;
      if (b < T) { o.o = 0; o.sx = o.sy = 0; }
    },
    captions: [
      { at: 0.9, to: 4.5, words: [['Cholesterol.', 0.9], ['Blood sugar.', 2.1], ['Inflammation.', 3.3]] },
      { at: 4.9, to: 9.6, text: 'They can change silently, for years.' },
    ],
    music(M) {
      M.pad(0, 'C3 G3 E4', 5, 0.28); M.sub(0, 'C2', 5, 0.2);
      WORD3.forEach((at, k) => { M.bell(at + 0.2, ['B5', 'D6', 'E6'][k], 0.14, (k - 1) * 0.5); M.ep(at + 0.2, ['E5', 'G5', 'B5'][k], 0.2); });
      H3.forEach((at) => { M.thump(at, 0.26); M.thump(at + 0.3, 0.14); });
      M.whoosh(0, 1, 0.05, 300, 1400);
      M.pad(5, 'A2 E3 C4', 2, 0.26); M.sub(5, 'A1', 2, 0.2);
      M.pad(7, 'F2 C3 A3', 1.6, 0.24); M.sub(7, 'F1', 1.6, 0.2);
      M.pad(8.6, 'B2 F#3 D#4', 1.4, 0.24); M.sub(8.6, 'B1', 1.4, 0.2);
      const PL = ['B4', 'A4', 'G4', 'F#4', 'E4', 'D4', 'E4', 'F#4', 'D#4', 'B3', 'B3'];
      for (let k = 0; k < PLAQN; k += 2) M.marimba(plaqueAt(k) + 0.1, PL[k], 0.12, 0.3);
    },
  };

  // =========================================================== 4 · the waiting room
  // A long serpentine queue in front of a closed door. Now and then the door opens,
  // one dot is let in, and the whole line shuffles forward. The orange dot is last.
  const QN = 104, FR0 = 1 + QN, LF0 = FR0 + 24, ADM4 = [1.2, 3.2, 5.2], END4 = 8;
  const Q4 = perLayout(() => {
    const P = G.W / G.H < 0.9, rows = P ? 4 : 3;
    const Hd = G.R * 0.8, fs = Hd / 9, Wd = 5 * fs, gapD = G.R * 0.2;
    const rowLen = Math.min(2 * half() * 0.95 - Wd - gapD, G.R * 2.6);
    const rg = Math.max(G.dot * 2.2, G.R * 0.2);
    const total = rowLen + gapD + Wd, x0 = -total / 2, xF = x0 + rowLen, xD = xF + gapD;
    const yF = G.R * 0.36;
    const pts = [];
    for (let k = 0; k < rows; k++) {
      const y = yF - k * rg, left = k % 2 === 0;
      pts.push([left ? xF : x0, y], [left ? x0 : xF, y]);
      if (k < rows - 1) {
        const cx = left ? x0 : xF, cy = y - rg / 2;
        for (let j = 1; j < 12; j++) {
          const a = Math.PI / 2 + (left ? 1 : -1) * (j / 12) * Math.PI;
          pts.push([cx + (Math.cos(a) * rg) / 2, cy + (Math.sin(a) * rg) / 2]);
        }
      }
    }
    const path = polyline(pts);
    return { rows, Hd, fs, Wd, xF, xD, yF, rg, path, sp: path.L / QN, dc: [xD + Wd / 2, yF - 3.6 * fs] };
  });
  const adv4 = (b, s0) => {
    let a = 0, hop = 0;
    for (let k = 0; k < ADM4.length; k++) {
      const u = clamp((b - ADM4[k] - 0.008 * Math.max(0, s0 - k)) / 0.7);
      a += E.inOutCubic(u); hop += Math.sin(Math.PI * u);
    }
    return [a, hop];
  };
  const door4 = (b) => {
    let th = 0;
    for (const at of ADM4) th = Math.max(th, 1.05 * E.outCubic(clamp((b - at + 0.2) / 0.5)) * (1 - E.inOutCubic(clamp((b - at - 0.8) / 0.7))));
    return th;
  };
  function framePose(f, o) {
    const L = Q4();
    if (f < 10) { o.x = L.xD; o.y = L.yF - f * L.fs; }
    else if (f < 20) { o.x = L.xD + L.Wd; o.y = L.yF - (f - 10) * L.fs; }
    else { o.x = L.xD + (f - 19) * L.fs; o.y = L.yF - 9 * L.fs; }
    o.sx = o.sy = 0.8;
  }
  function leafPose(l, th, o) {
    const L = Q4(), col = l % 3, row = Math.floor(l / 3), xH = L.xD + L.Wd, d = xH - (L.xD + (1.5 + col) * L.fs);
    o.x = xH - d * Math.cos(th); o.z = d * Math.sin(th);
    o.y = L.yF - (0.9 + row * 1.15) * L.fs;
    o.sx = o.sy = 0.72; o.o = 0.5;
  }
  function queuePose(r, b, o) {
    const L = Q4();
    if (r >= LF0) return leafPose(r - LF0, door4(b), o);
    if (r >= FR0) return framePose(r - FR0, o);
    const s0 = r === 0 ? QN : r - 1, [a, hop] = adv4(b, s0), s = s0 - a;
    o.sx = o.sy = r ? 0.8 : 1.15;
    o.c = r ? 0 : 1;
    if (s >= 0) {
      const p = L.path.at(s * L.sp);
      o.x = p[0]; o.y = p[1] - hop * G.dot * 0.35;
      if (r === 0) { const w = maxHit(b, [6.3, 6.75], 5); o.y -= w * G.dot * 0.9; }
      return;
    }
    const u = clamp(-s);
    o.x = lerp(L.xF, L.dc[0], u); o.y = lerp(L.yF, L.dc[1] + L.fs * 3, u);
    o.z = -u * G.R * 0.2;
    o.o = 1 - clamp((u - 0.55) / 0.4);
    if (u >= 1) hide(o);
  }
  const S4 = {
    name: 'queue',
    beats: END4,
    blend: {
      ease: E.inOutCubic, arc: 0.12,
      start: (r) => (r === 0 ? 0.3 : r < FR0 ? 0.05 + (r / QN) * 0.5 : 0.1 + ((r - FR0) / 45) * 0.4),
      dur: (r) => (r === 0 ? 1 : 0.9),
    },
    pose(r, t, b, o) { queuePose(r, b, o); },
    captions: [
      { at: 0.8, to: 4.2, text: 'Normally, you’d need a referral from your GP first.' },
      { at: 4.6, to: 7.6, text: 'And then, you wait.' },
    ],
    music(M) {
      M.pad(0, 'E3 B3 D4 G4', 4, 0.24); M.sub(0, 'E2', 4, 0.18);
      M.pad(4, 'C3 G3 B3 E4', 4, 0.22); M.sub(4, 'C2', 4, 0.16);
      for (let b = 1; b < END4; b++) M.tick(b, b % 2 ? 0.05 : 0.03, 0.5);
      ADM4.forEach((at, k) => { M.snip(at - 0.1); M.marimba(at + 0.3, ['E4', 'D4', 'C4'][k], 0.16, 0.6); });
      M.ep(2.5, 'G5', 0.1); M.ep(4.5, 'E5', 0.1); M.ep(6.5, 'C5', 0.1);
      [6.3, 6.75].forEach((at) => M.drop(at, 'B5', 0.08, -0.5));
    },
  };

  // =========================================================== 5 · the door opens
  // Same cast. The door swings wide open, and the orange dot, last in line,
  // hops right over the queue and through the door. Nobody waits.
  const OPEN5 = 0.2, HOP5 = [1.6, 2.15, 2.7], HOPD = 0.55, DASH5 = HOP5[2] + HOPD;
  const line5 = perLayout(() => {
    const q = {}; q.x = q.y = q.z = 0;
    queuePose(0, END4, q);
    const L = Q4();
    return { hx: q.x, hy: q.y, ex: L.dc[0], ey: L.dc[1] + L.fs * 2 };
  });
  function hop5(b) {
    const ln = line5();
    let n = 0;
    while (n < 2 && b >= HOP5[n + 1]) n++;
    const u = clamp((b - HOP5[n]) / HOPD), f = (n + u) / 3, air = b >= HOP5[0] && u < 1 ? Math.sin(Math.PI * u) : 0;
    const x = b < HOP5[0] ? ln.hx : lerp(ln.hx, ln.ex, f), y = b < HOP5[0] ? ln.hy : lerp(ln.hy, ln.ey, f);
    return { x, y: y - air * G.R * 0.28 * (n === 2 ? 0.7 : 1), air };
  }
  const S5 = {
    name: 'open',
    beats: 6,
    remap: 'keep',
    blend: { dur: 0.01 },
    pose(r, t, b, o) {
      const L = Q4();
      queuePose(r, END4, o);
      if (r >= LF0) {
        const th = 1.45 * E.spring(clamp((b - OPEN5) / 1.1));
        leafPose(r - LF0, th, o);
        o.c = 0.9 * E.outCubic(clamp((b - OPEN5) / 0.8));
        o.o = lerp(0.5, 0.85, o.c) * (1 - E.inOutSine(clamp((b - 4.6 - (r - LF0) * 0.02) / 0.8)));
        return;
      }
      if (r >= FR0) {
        o.o = 1 - E.inOutSine(clamp((b - 4.4 - (r - FR0) * 0.02) / 0.8));
        return;
      }
      const h = hop5(b);
      if (r === 0) {
        let pre = 0, land = 0;
        for (const at of HOP5) { pre = Math.max(pre, antic(b, at, 0.3)); land = Math.max(land, hit(b, at, 5)); }
        land = Math.max(land, hit(b, DASH5, 3));
        o.x = h.x; o.y = h.y + pre * G.dot * 0.3;
        const s = lerp(1.15, 1.5, E.outCubic(clamp((b - DASH5) / 0.8)));
        o.sx = s * (1 + 0.25 * pre + 0.2 * land); o.sy = s * (1 - 0.25 * pre - 0.15 * land);
        return;
      }
      if (o.o <= 0) return;
      // the line ducks as the orange dot sails over it
      const k = (r - 1) / QN, duck = Math.exp(-(((o.x - h.x) / (G.dot * 2.6)) ** 2)) * h.air * clamp(1 - Math.abs(o.y - h.y) / (G.R * 0.6));
      o.sy *= 1 - 0.4 * duck; o.sx *= 1 + 0.15 * duck; o.y += duck * G.dot * 0.25;
      // then the rest follow through the door, and fade
      const f = E.inOutCubic(clamp((b - 3.7 - k * 1.1) / 0.9));
      o.x = lerp(o.x, L.dc[0], f * 0.35); o.y = lerp(o.y, L.dc[1] + L.fs * 3, f * 0.35);
      o.o *= 1 - f;
    },
    captions: [
      { at: 0.3, to: 3, text: 'With LiveLong, you don’t need one.' },
      { at: DASH5, to: 5.8, words: [['No referral.', DASH5], ['No waiting list.', 4]] },
    ],
    music(M) {
      M.pad(0, 'G3 B3 D4 A4', DASH5, 0.26); M.sub(0, 'G2', DASH5, 0.2);
      M.whoosh(OPEN5, 1, 0.08, 400, 2200);
      M.ep(OPEN5 + 0.2, 'D5', 0.2); M.ep(OPEN5 + 0.45, 'G5', 0.2); M.ep(OPEN5 + 0.7, 'B5', 0.2);
      HOP5.forEach((at, k) => { M.whoosh(at, HOPD, 0.05, 500 + k * 400, 1600 + k * 800); M.marimba(at + HOPD, ['D5', 'G5', 'B5'][k], 0.2, (k - 1) * 0.5); });
      M.kick(DASH5, 0.4); M.bell(DASH5, 'D6', 0.24); M.boom(DASH5, 0.25);
      M.pad(DASH5, 'C4 E4 G4 B4 D5', 6 - DASH5, 0.3); M.sub(DASH5, 'C2', 6 - DASH5, 0.26);
      M.ep(4, 'E6', 0.18); M.ep(4.02, 'G5', 0.14);
      M.ep(5, 'D6', 0.12);
    },
  };

  // =========================================================== 6 · the Netherlands
  // The dots settle into a map, west to east. The orange dot lands on Amsterdam,
  // and a wave of light spreads out to the locations all over the country.
  const NLP = SH.nl.pts, AMS = SH.nl.ams, LAND6 = 2;
  const mapW = () => Math.min((G.H * 0.644) / SH.nl.h, 2 * half() * 0.62);
  const LIT6 = (function () {
    const rr = BJ.rng(108), idx = NLP.map((_, i) => i), lit = new Float32Array(NLP.length).fill(-1);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const dmax = Math.max(...NLP.map((p) => Math.hypot(p[0] - AMS[0], p[1] - AMS[1])));
    for (let k = 0; k < 108; k++) { const i = idx[k], p = NLP[i]; lit[i] = 2.4 + (Math.hypot(p[0] - AMS[0], p[1] - AMS[1]) / dmax) * 2.8; }
    return lit;
  })();
  const H6 = odd(5, 8);
  const S6 = {
    name: 'map',
    beats: 8,
    blend: {
      arc: 0.1,
      start: (r) => (r === 0 ? 0.3 : 0.05 + (NLP[r - 1][0] + 0.5) * 1),
      dur: (r) => (r === 0 ? LAND6 - 0.3 : 0.9),
      ease: E.glide,
    },
    pose(r, t, b, o) {
      const Wm = mapW();
      if (r === 0) {
        o.x = AMS[0] * Wm; o.y = AMS[1] * Wm;
        const l = hit(b, LAND6, 3), p = maxHit(b, H6, 4);
        o.sx = o.sy = 1.3 * (1 + 0.35 * l + 0.25 * p);
        o.c = 1;
        return;
      }
      const i = r - 1, p = NLP[i], T = LIT6[i];
      o.x = p[0] * Wm; o.y = p[1] * Wm;
      const s = (SH.nl.sp * Wm * 0.62) / G.dot;
      const ring = hit(b, LAND6 + Math.hypot(p[0] - AMS[0], p[1] - AMS[1]) * 5, 3) * 0.35;
      if (T < 0) { o.sx = o.sy = s * (0.8 + ring); o.o = 0.35; return; }
      const f = hit(b, T, 2.2), on = clamp((b - T) / 0.15);
      o.c = on; o.o = lerp(0.45, 1, on);
      o.sx = o.sy = s * (1 + ring + 0.45 * f + 0.1 * on);
    },
    captions: [
      { at: 2, to: 4.6, text: 'Walk in at one of 108 locations.' },
      { at: 5, to: 7.6, text: 'All across the Netherlands.' },
    ],
    music(M) {
      M.pad(0, 'G3 D4 B4', 2, 0.26); M.sub(0, 'G2', 2, 0.2);
      M.whoosh(0.3, 1.7, 0.08, 300, 1800);
      M.drop(LAND6, 'G5', 0.24); M.bell(LAND6, 'D6', 0.2); M.kick(LAND6, 0.3);
      M.pad(2, 'E3 B3 D4 G4', 2, 0.26); M.sub(2, 'E2', 2, 0.2);
      M.pad(4, 'C3 G3 B3 E4', 2, 0.26); M.sub(4, 'C2', 2, 0.2);
      M.pad(6, 'D3 A3 C4 F#4', 2, 0.26); M.sub(6, 'D2', 2, 0.2);
      const AR = ['G5', 'A5', 'B5', 'D6', 'E6', 'G6', 'E6', 'D6', 'B5', 'A5', 'B5', 'D6', 'E6', 'D6', 'B5', 'G5', 'A5', 'B5'];
      AR.forEach((n, k) => M.marimba(2.4 + k * 0.16, n, 0.14 - k * 0.003, ((k % 5) / 4 - 0.5) * 0.9));
      H6.forEach((at) => { M.thump(at, 0.28); M.thump(at + 0.3, 0.16); });
      M.ep(5, 'B5', 0.16); M.ep(6, 'A5', 0.12); M.ep(7, 'G5', 0.12);
    },
  };

  // =========================================================== 7 · one tube
  // The map drains into a needle, drop by drop, and fills a test tube for real:
  // every dot is a little rigid body. A cap springs on, and the tube is rocked.
  const FILL = 80, OUT0 = 1 + FILL, CAP0 = OUT0 + 56, SPAWN7 = 0.6, DT7 = 0.03, CAP7 = 3.9;
  const spawn7 = (r) => SPAWN7 + (r === 0 ? FILL : r - 1) * DT7;
  const T7 = perLayout(() => {
    const d = G.dot * 0.8, dw = G.dot * 0.7, Wi = d * 5.2, yT = -G.R * 0.45, yB = G.R * 0.55;
    const xl = -Wi / 2 - dw / 2, xr = Wi / 2 + dw / 2, yb = yB + dw / 2, rc = Wi * 0.3, pts = [[xl, yT]];
    for (let j = 0; j <= 8; j++) { const a = Math.PI - (j / 8) * (Math.PI / 2); pts.push([xl + rc + Math.cos(a) * rc, yb - rc + Math.sin(a) * rc]); }
    for (let j = 0; j <= 8; j++) { const a = Math.PI / 2 - (j / 8) * (Math.PI / 2); pts.push([xr - rc + Math.cos(a) * rc, yb - rc + Math.sin(a) * rc]); }
    pts.push([xr, yT]);
    const pl = polyline(pts), out = [];
    for (let k = 0; k < 56; k++) out.push(pl.at((k / 55) * pl.L));
    return { d, dw, Wi, yT, yB, out, spout: [0, yT - G.R * 0.38] };
  });
  const world7 = new BJ.World(FILL + 1);
  const wi7 = (r) => (r === 0 ? FILL : r - 1);
  const S7 = {
    name: 'tube',
    beats: 6,
    blend: {
      ease: E.inOutCubic, arc: 0.15,
      start: (r) => (r <= FILL ? Math.max(0, spawn7(r) - 0.6) : 0.05 + ((r - OUT0) / 66) * 0.4),
      dur: (r) => (r <= FILL ? 0.55 : 0.8),
    },
    camera: (b) => {
      const u = clamp((b - 4.5) / 1.4);
      return { zoom: 1, rot: 0.32 * Math.sin(TAU * u) * Math.sin(Math.PI * u) };
    },
    enter() { world7.active = false; },
    update(t, b, dt) {
      if (b < SPAWN7) return;
      const w = world7, L = T7();
      if (!w.active) {
        w.live.fill(0);
        for (let i = 0; i < w.n; i++) { w.r[i] = (i === FILL ? L.d * 1.3 : L.d) / 2; w.cool[i] = 0; }
        w.active = true;
      }
      for (let r = 0; r <= FILL; r++) {
        const i = wi7(r);
        if (w.live[i] || b < spawn7(r)) continue;
        w.live[i] = 1;
        w.x[i] = Math.sin(i * 12.9898) * L.d * 0.12; w.y[i] = L.spout[1];
        w.vx[i] = Math.sin(i * 78.233) * G.R * 0.05; w.vy[i] = G.R * 1.8;
      }
      w.step(dt, {
        g: G.R * 8, floor: L.yB, left: -L.Wi / 2, right: L.Wi / 2, thr: G.R * 0.6,
        onImpact: (x, v) => BJ.Audio.impact(clamp(x / L.Wi, -1, 1) * 0.6, clamp(v / (G.R * 6)) * 0.7),
      });
    },
    pose(r, t, b, o) {
      const L = T7();
      if (r <= FILL) {
        const i = wi7(r), live = world7.active && world7.live[i];
        o.x = live ? world7.x[i] : L.spout[0]; o.y = live ? world7.y[i] : L.spout[1];
        o.sx = o.sy = (r ? L.d : L.d * 1.3) / G.dot;
        o.c = r ? 0 : 1; o.o = r ? 0.85 : 1;
        return;
      }
      if (r < CAP0) {
        const p = L.out[r - OUT0];
        o.x = p[0]; o.y = p[1]; o.sx = o.sy = L.dw / G.dot; o.o = 0.95;
        return;
      }
      if (r < CAP0 + 10) {
        const k = r - CAP0, row = Math.floor(k / 5), col = k % 5, q = E.spring(clamp((b - CAP7) / 0.8));
        o.x = (col - 2) * ((L.Wi + L.dw * 2) / 4.4);
        o.y = L.yT - (0.2 + row * 0.9) * G.dot - (1 - q) * G.R * 0.5;
        o.sx = o.sy = 0.95; o.c = 1;
        o.o = E.outCubic(clamp((b - CAP7 + 0.8) / 0.6));
        return;
      }
      hide(o);
    },
    captions: [{ at: 0.7, to: 5.7, text: 'One quick blood draw.' }],
    music(M) {
      M.pad(0, 'G3 B3 D4 F#4', 2, 0.24); M.sub(0, 'G2', 2, 0.18);
      M.pad(2, 'E3 G3 B3 D4', 2, 0.24); M.sub(2, 'E2', 2, 0.18);
      M.pad(4, 'C3 G3 B3 E4', 2, 0.26); M.sub(4, 'C2', 2, 0.2);
      const D = ['D6', 'B5', 'A5', 'G5', 'E5', 'D5', 'B4', 'A4', 'G4', 'A4', 'B4'];
      for (let k = 0; k < 11; k++) M.drop(SPAWN7 + k * 8 * DT7, D[k], 0.12 - k * 0.004, (k % 2 ? 0.3 : -0.3));
      M.drop(spawn7(0) + 0.3, 'G5', 0.2);
      M.whoosh(CAP7 - 0.6, 0.6, 0.06, 2400, 400); M.kick(CAP7 + 0.15, 0.3); M.snip(CAP7 + 0.15); M.bell(CAP7 + 0.2, 'B5', 0.16);
      M.whoosh(4.5, 0.7, 0.04, 400, 900); M.whoosh(5.2, 0.7, 0.04, 900, 400);
    },
  };

  // =========================================================== 8 · the centrifuge
  // Six tubes on a tilted rotor. It spins up, the samples separate (heavy cells
  // outward, pale plasma inward) and it winds down to exactly where it started.
  // spin up 0.6–2.4, hold to 3.6, spin down to 5.4: exactly five turns, so it stops where it started
  const HUB0 = 1, TUB0 = 30, WM8 = (30 * (TAU / 6)) / 3, STOP8 = 5.4;
  function phi8(b) {
    if (b < 0.6) return 0;
    if (b < 2.4) { const u = (b - 0.6) / 1.8; return WM8 * 1.8 * (u ** 3 - u ** 4 / 2); }
    if (b < 3.6) return WM8 * (0.9 + (b - 2.4));
    if (b < STOP8) { const v = (b - 3.6) / 1.8; return WM8 * (2.1 + 1.8 * (v - (v ** 3 - v ** 4 / 2))); }
    return WM8 * 3;
  }
  const tilt8 = (b) => 0.95 * E.inOutSine(clamp((b - 0.1) / 0.8)) * (1 - E.inOutSine(clamp((b - 4.9) / 1)));
  const S8 = {
    name: 'centrifuge',
    beats: 6,
    blend: { ease: E.inOutCubic, arc: 0.1, start: (r) => (r === 0 ? 0 : (r / N) * 0.3), dur: () => 0.8 },
    pose(r, t, b, o) {
      const Rr = G.R * 0.95, ph = phi8(b), tau = tilt8(b);
      let x, y;
      if (r === 0) {
        x = y = 0;
        o.sx = o.sy = 1.4 * (1 + 0.2 * hit(b, STOP8, 3));
        o.c = 1;
      } else if (r < TUB0) {
        const a = ph + ((r - HUB0) / 29) * TAU;
        x = Math.cos(a) * Rr * 0.2; y = Math.sin(a) * Rr * 0.2;
        o.sx = o.sy = 0.62; o.o = 0.6;
      } else {
        const k = r - TUB0, tb = Math.floor(k / 20), j = k % 20, row = Math.floor(j / 2), col = j % 2;
        const a = ph + (tb / 6) * TAU - Math.PI / 2, rr = lerp(0.34, 0.95, row / 9) * Rr, off = (col - 0.5) * 0.09 * Rr;
        x = Math.cos(a) * rr - Math.sin(a) * off; y = Math.sin(a) * rr + Math.cos(a) * off;
        const sep = E.inOutCubic(clamp((b - 2.2 - (9 - row) * 0.08) / 0.9));
        if (row < 4) { o.o = lerp(0.9, 0.28, sep); o.sx = o.sy = 0.78 * (1 - 0.25 * sep); }
        else { o.o = 0.9; o.sx = o.sy = 0.78 * (1 + 0.12 * sep); }
      }
      o.x = x; o.y = y * Math.cos(tau); o.z = -y * Math.sin(tau);
    },
    captions: [
      { at: 0.4, to: 5.7, text: 'Analysed in an ISO 15189 accredited lab.' },
    ],
    music(M) {
      M.pad(0, 'A2 E3 G3 C4', 2, 0.24); M.sub(0, 'A1', 2, 0.2);
      M.pad(2, 'D3 A3 C4 F#4', 2, 0.26); M.sub(2, 'D2', 2, 0.22);
      M.pad(4, 'G3 B3 D4 A4', 2, 0.28); M.sub(4, 'G2', 2, 0.22);
      M.whoosh(0.6, 1.8, 0.1, 150, 1800); M.whoosh(2.4, 1.2, 0.05, 1800, 1800); M.whoosh(3.6, 1.8, 0.08, 1800, 150);
      let last = 0;
      for (let b = 0.6; b < STOP8 + 0.1; b += 0.01) { const rev = Math.floor(phi8(b) / TAU); if (rev > last) { last = rev; M.tick(b, 0.05, 0); } }
      [2.3, 2.5, 2.7, 2.9].forEach((at, k) => M.marimba(at, ['B5', 'G5', 'E5', 'D5'][k], 0.12, 0));
      M.bell(2.4, 'G6', 0.12); M.ep(2.4, 'D5', 0.18); M.ep(2.7, 'G5', 0.14);
      M.drop(STOP8, 'G5', 0.14);
    },
  };

  // =========================================================== 9 · 48 hours
  // A clock of 48 dots, one for every hour. The orange dot runs once around it.
  const RUN9 = [0.7, 4.7], DONE9 = 4.8, TXT0 = 49;
  const LIT9 = Array.from({ length: 48 }, (_, k) => RUN9[0] + ((RUN9[1] - RUN9[0]) * Math.acos(1 - (2 * k) / 48)) / Math.PI);
  const run9 = (b) => E.inOutSine(clamp((b - RUN9[0]) / (RUN9[1] - RUN9[0])));
  const Rg9 = () => G.R * 0.92;
  const S9 = {
    name: 'hours',
    beats: 6,
    blend: {
      ease: E.inOutCubic, arc: 0.12,
      start: (r) => (r === 0 ? 0 : r < TXT0 ? 0.05 + (r / 48) * 0.3 : 0.15 + (SH.h48.pts[r - TXT0][0] + 0.5) * 0.5),
      dur: () => 0.8,
    },
    pose(r, t, b, o) {
      const Rg = Rg9(), done = hit(b, DONE9, 2.5);
      if (r === 0) {
        const a = -Math.PI / 2 + TAU * run9(b);
        o.x = Math.cos(a) * Rg; o.y = Math.sin(a) * Rg;
        o.sx = o.sy = 1.3 * (1 + 0.35 * done); o.c = 1;
        return;
      }
      if (r < TXT0) {
        const k = r - 1, a = -Math.PI / 2 + (k / 48) * TAU, T = LIT9[k], on = clamp((b - T) / 0.1);
        const f = hit(b, T, 3), wave = hit(b, DONE9 + k * 0.01, 3);
        o.x = Math.cos(a) * Rg; o.y = Math.sin(a) * Rg;
        o.sx = o.sy = (k % 12 === 0 ? 0.95 : 0.72) * (1 + 0.5 * f + 0.4 * wave);
        o.c = on; o.o = lerp(0.35, 1, on);
        return;
      }
      const p = SH.h48.pts[r - TXT0], Tw = Rg * 1.2;
      o.x = p[0] * Tw; o.y = p[1] * Tw;
      o.sx = o.sy = ((SH.h48.sp * Tw * 0.9) / G.dot) * (1 + 0.25 * done);
      o.c = 0.8 * done;
    },
    captions: [{ at: 0.6, to: 5.7, text: 'Results within 48 hours.' }],
    music(M) {
      M.pad(0, 'C3 G3 B3 E4', 2, 0.24); M.sub(0, 'C2', 2, 0.18);
      M.pad(2, 'A2 E3 G3 C4', 1.5, 0.24); M.sub(2, 'A1', 1.5, 0.18);
      M.pad(3.5, 'D3 A3 C4 F#4', 1.3, 0.26); M.sub(3.5, 'D2', 1.3, 0.2);
      LIT9.forEach((at, k) => M.tick(at, k % 12 === 0 ? 0.09 : 0.03, Math.sin((k / 48) * TAU) * 0.7));
      [0, 12, 24, 36].forEach((k, j) => M.marimba(LIT9[k], ['G5', 'B5', 'D6', 'E6'][j], 0.16, 0));
      M.bell(DONE9, 'G6', 0.3); M.boom(DONE9, 0.25); M.kick(DONE9, 0.34);
      M.ep(DONE9, 'G5', 0.26); M.ep(DONE9 + 0.03, 'B5', 0.2); M.ep(DONE9 + 0.06, 'D6', 0.18);
      M.pad(DONE9, 'G3 D4 B4 F#5', 6 - DONE9, 0.3); M.sub(DONE9, 'G2', 6 - DONE9, 0.26);
    },
  };

  // =========================================================== 10 · your results
  // Seven biomarkers, each a track with an optimal zone. The markers spring to
  // their values; then the orange dot, the doctor's pen, checks every row.
  const VALS = [0.46, 0.55, 0.78, 0.4, 0.62, 0.84, 0.5], ZONE = [0.25, 0.7], MK10 = (i) => 1.1 + i * 0.15, RV10 = (i) => 3.4 + i * 0.3;
  const L10 = perLayout(() => {
    const rs = Math.min(G.R * 0.22, G.H * 0.1), Wt = Math.min(2 * half() * 0.6, G.R * 3), ls = G.dot * 1.1, gap = G.dot * 2.4, chk = G.dot * 2.8;
    const total = 2 * ls + gap + Wt + chk, x0 = -total / 2;
    return { rs, Wt, ls, x0, xT: x0 + 2 * ls + gap, xC: x0 + 2 * ls + gap + Wt + chk };
  });
  const rowY10 = (i) => (i - 3) * L10().rs;
  const S10 = {
    name: 'results',
    beats: 8,
    blend: { ease: E.glide, arc: 0.1, start: (r) => (r === 0 ? 0 : 0.05 + (Math.floor((r - 1) / 21) / 7) * 0.6 + (((r - 1) % 21) / 21) * 0.2), dur: (r) => (r === 0 ? 1.1 : 0.8) },
    pose(r, t, b, o) {
      const L = L10();
      if (r === 0) {
        let y = rowY10(0) - L.rs * 0.9, sq = 0;
        for (let i = 0; i < 7; i++) {
          const T = RV10(i), p = E.inOutCubic(clamp((b - T + 0.25) / 0.22));
          y = lerp(y, rowY10(i), p); sq = Math.max(sq, hit(b, T, 5));
        }
        o.x = L.xC + G.dot * 0.2 * Math.sin(b * 1.3) * (b < RV10(0) - 0.5 ? 1 : 0);
        o.y = y;
        o.sx = 1.2 * (1 + 0.3 * sq); o.sy = 1.2 * (1 - 0.2 * sq); o.c = 1;
        return;
      }
      if (r > 147) return hide(o);
      const k = r - 1, i = Math.floor(k / 21), j = k % 21, y = rowY10(i), chk = hit(b, RV10(i), 2);
      const warn = VALS[i] > ZONE[1];
      if (j < 3) {
        o.x = L.x0 + j * L.ls; o.y = y; o.sx = o.sy = 0.55;
        o.o = 0.5 + 0.5 * chk; o.c = warn ? E.outCubic(clamp((b - 5.9) / 0.4)) : 0;
        return;
      }
      if (j < 20) {
        const v = (j - 3) / 16, inZ = v >= ZONE[0] && v <= ZONE[1];
        o.x = L.xT + v * L.Wt; o.y = y;
        o.sx = o.sy = (inZ ? 0.62 : 0.5) * (1 + 0.35 * hit(b, RV10(i) + v * 0.3, 3));
        o.o = inZ ? 0.75 : 0.22; o.c = v > ZONE[1] ? 0.6 : 0;
        return;
      }
      const T = MK10(i), p = E.spring(clamp((b - T) / 0.8)), land = hit(b, T + 0.2, 4);
      o.x = L.xT + VALS[i] * p * L.Wt; o.y = y;
      o.sx = o.sy = 1.15 * (1 + 0.3 * land + (warn ? 0.2 * maxHit(b, [5.9, 6.9], 3) : 0));
      o.o = clamp((b - T + 0.3) / 0.3); o.c = warn ? clamp((b - T - 0.5) / 0.5) : 0;
    },
    captions: [
      { at: 0.6, to: 3.1, text: '43 biomarkers across 10 health areas.' },
      { at: 3.4, to: 7.7, text: 'Reviewed by a doctor, with clear advice.' },
    ],
    music(M) {
      M.pad(0, 'G3 B3 D4 A4', 2, 0.24); M.sub(0, 'G2', 2, 0.18);
      M.pad(2, 'E3 G3 B3 D4', 2, 0.24); M.sub(2, 'E2', 2, 0.18);
      M.pad(4, 'C3 G3 B3 E4', 2, 0.24); M.sub(4, 'C2', 2, 0.18);
      M.pad(6, 'D3 A3 C4 F#4', 2, 0.26); M.sub(6, 'D2', 2, 0.2);
      VALS.forEach((v, i) => M.marimba(MK10(i) + 0.2, ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5'][Math.min(6, Math.floor(v * 8))], 0.16, v - 0.5));
      for (let i = 0; i < 7; i++) { M.tick(RV10(i), 0.08, 0.6); M.ep(RV10(i), ['D6', 'B5', 'G5', 'A5', 'B5', 'D6', 'G6'][i], 0.1, 0.5); }
      [5.9, 6.9].forEach((at) => { M.bell(at, 'E6', 0.1, -0.2); M.ep(at, 'B5', 0.12); });
    },
  };

  // =========================================================== 11 · over time
  // A trend line, drawn by the orange dot from one test to the next.
  const VAL11 = [0.28, 0.46, 0.4, 0.64, 0.82], T11 = (i) => 0.8 + i * 1.4, LN0 = 6, AX0 = LN0 + 114;
  const L11 = perLayout(() => {
    const Wc = Math.min(2 * half() * 0.8, G.R * 3.4), Hc = Math.min(G.R * 1.2, G.H * 0.36), x0 = -Wc / 2;
    const cx = VAL11.map((_, i) => x0 + (0.08 + i * 0.21) * Wc), cy = VAL11.map((v) => Hc / 2 - v * Hc);
    const yAt = (x) => {
      let i = 0;
      while (i < 3 && x > cx[i + 1]) i++;
      return lerp(cy[i], cy[i + 1], E.inOutSine(clamp((x - cx[i]) / (cx[i + 1] - cx[i]))));
    };
    const pts = [];
    for (let s = 0; s <= 600; s++) { const x = lerp(cx[0], cx[4], s / 600); pts.push([x, yAt(x)]); }
    const pl = polyline(pts), line = [];
    for (let k = 0; k < 114; k++) line.push(pl.at(((k + 0.5) / 114) * pl.L));
    return { Wc, Hc, x0, cx, cy, yAt, line };
  });
  const penX11 = (b) => {
    const L = L11();
    if (b <= T11(0)) return L.cx[0];
    for (let i = 0; i < 4; i++) if (b < T11(i + 1)) return lerp(L.cx[i], L.cx[i + 1], E.inOutSine((b - T11(i)) / 1.4));
    return L.cx[4];
  };
  const S11 = {
    name: 'trend',
    beats: 8,
    blend: { ease: E.glide, arc: 0.12, start: (r) => (r === 0 ? 0 : r < AX0 ? 0.15 + (r / AX0) * 0.25 : 0.1 + ((r - AX0) / 30) * 0.4), dur: (r) => (r === 0 ? 1.3 : 0.75) },
    pose(r, t, b, o) {
      const L = L11(), px = penX11(b);
      if (r === 0) {
        o.x = px; o.y = L.yAt(px);
        const p = maxHit(b, [0, 1, 2, 3, 4].map(T11), 4) + hit(b, 7, 4) * 0.8;
        o.sx = o.sy = 1.2 * (1 + 0.3 * p); o.c = 1;
        return;
      }
      if (r < LN0) {
        const i = r - 1, T = T11(i), f = hit(b, T, 3);
        o.x = L.cx[i]; o.y = L.cy[i];
        o.sx = o.sy = 1.05 * E.outBack(clamp((b - T + 0.1) / 0.5)) * (1 + 0.3 * f);
        o.c = 0.6 * f;
        if (b < T - 0.1) { o.o = 0; o.sx = o.sy = 0; }
        return;
      }
      if (r < AX0) {
        const p = L.line[r - LN0], d = px - p[0];
        o.x = p[0]; o.y = p[1];
        o.sx = o.sy = 0.52 * E.outBack(clamp(d / (G.dot * 2.5)));
        o.c = clamp(1 - d / (L.Wc * 0.1)); o.o = 0.85;
        if (d < 0) { o.o = 0; o.sx = o.sy = 0; }
        return;
      }
      const k = r - AX0;
      if (k < 20) { o.x = L.x0 + (k / 19) * L.Wc; o.y = L.Hc / 2 + G.dot * 1.6; }
      else { o.x = L.x0 - G.dot * 1.6; o.y = L.Hc / 2 + G.dot * 1.6 - ((k - 19) / 10) * (L.Hc + G.dot * 1.6); }
      o.sx = o.sy = 0.42; o.o = 0.3;
    },
    captions: [
      { at: 0.6, to: 3.8, text: 'Retest every 6 to 12 months.' },
      { at: 4.1, to: 7.6, text: 'And see your progress over time.' },
    ],
    music(M) {
      const CH = [['G3 B3 D4', 'G2'], ['E3 G3 B3', 'E2'], ['C3 E3 G3 B3', 'C2'], ['D3 F#3 A3', 'D2'], ['G3 B3 D4 F#4', 'G2']];
      CH.forEach(([p, s], i) => { const at = i ? T11(i) : 0; const nx = i < 4 ? T11(i + 1) : 8; M.pad(at, p, nx - at, 0.26); M.sub(at, s, nx - at, 0.2); });
      ['D5', 'G5', 'E5', 'B5', 'D6'].forEach((n, i) => { M.bell(T11(i), n, 0.18, (i / 4 - 0.5) * 0.8); M.ep(T11(i), n, 0.18); });
      for (let i = 0; i < 4; i++) M.whoosh(T11(i) + 0.15, 1.1, 0.03, 600, 1200 + i * 300);
      M.thump(7, 0.26); M.thump(7.3, 0.15);
      M.ep(7, 'B5', 0.12); M.ep(7.5, 'A5', 0.1);
    },
  };

  // =========================================================== 12 · LiveLong
  // The mark draws itself, the letters land one by one, and the orange dot,
  // the heartbeat from the very first frame, drops in as the dot on the i.
  const LG = SH.logo, MC = [-0.379, 0.004], LGAP = [-0.151, -0.103, -0.005, 0.093, 0.172, 0.277, 0.388];
  const MK0 = 1, BR0 = MK0 + LG.mark.length, WD0 = BR0 + LG.bars.length;
  const letter12 = (x) => { let L = 0; while (L < LGAP.length && x >= LGAP[L]) L++; return L; };
  const LAND12 = (L) => 1.1 + L * 0.28, DROP12 = 3.6, BARS12 = 1.8, BEAT12 = odd(5, 12);
  const markAt = LG.mark.map(([x, y]) => 0.2 + frac((Math.atan2(y - MC[1], x - MC[0]) + Math.PI / 2) / TAU + 1) * 1.2);
  const LL12 = perLayout(() => {
    if (G.W / G.H >= 0.9) {
      const s = Math.min(2 * half() * 0.92, G.R * 3.4);
      return { mark: (x, y) => [x * s, y * s], word: (x, y) => [x * s, y * s], sM: s, sW: s, k: 0.9 };
    }
    const sW = (G.W * 0.8) / 0.691, sM = sW * 1.35, wx = 0.1365;
    const total = 0.152 * sM + 0.08 * sW + 0.177 * sW, dyM = -total / 2 + 0.076 * sM, dyW = dyM + 0.076 * sM + 0.08 * sW + 0.086 * sW;
    return { mark: (x, y) => [(x - MC[0]) * sM, (y - MC[1]) * sM + dyM], word: (x, y) => [(x - wx) * sW, y * sW + dyW], sM, sW, k: 0.78 };
  });
  const beat12 = (b) => { let e = 0; for (const at of BEAT12) e += hit(b, at, 5) + 0.6 * hit(b, at + 0.3, 6); return e; };
  const S12 = {
    name: 'signature',
    beats: 12,
    blend: {
      arc: 0.1, ease: E.glide,
      start: (r) => (r === 0 ? 0 : r < BR0 ? Math.max(0, markAt[r - MK0] - 0.45) : r < WD0 ? BARS12 - 0.6 : LAND12(letter12(LG.word[r - WD0][0])) - 0.7),
      dur: (r) => (r === 0 ? 1.3 : r < BR0 ? 0.45 : r < WD0 ? 0.6 : 0.7),
    },
    pose(r, t, b, o) {
      const L = LL12(), pb = beat12(b);
      if (r === 0) {
        const [ix, iy] = L.word(LG.idot[0], LG.idot[1]), dS = (LG.idot[2] * L.sW) / G.dot;
        const q = E.spring(clamp((b - DROP12) / 1)), pre = antic(b, DROP12, 0.4), land = hit(b, DROP12 + 0.2, 4);
        o.x = ix; o.y = iy - (1 - q) * G.R * 0.55 + Math.sin(b * 1.8) * G.dot * 0.4 * (1 - clamp((b - DROP12 + 0.6) / 0.6)) - pre * G.dot * 0.6;
        const s = lerp(1.3, dS, clamp(q)) * (1 + 0.28 * pb);
        o.sx = s * (1 + 0.25 * land - 0.1 * pre); o.sy = s * (1 - 0.25 * land + 0.15 * pre);
        o.c = 1;
        return;
      }
      if (r < WD0) {
        const mark = r < BR0, p = mark ? LG.mark[r - MK0] : LG.bars[r - BR0];
        const [x, y] = L.mark(p[0], p[1]), [cx, cy] = L.mark(MC[0], MC[1]), g = 1 + 0.035 * pb;
        o.x = cx + (x - cx) * g; o.y = cy + (y - cy) * g;
        const T = mark ? markAt[r - MK0] : BARS12;
        o.sx = o.sy = (((mark ? LG.spO : LG.barW * 1.4) * L.sM * L.k) / G.dot) * (1 + 0.35 * hit(b, T, 4) + 0.15 * pb);
        o.c = mark ? 1 : 0;
        return;
      }
      const p = LG.word[r - WD0], [x, y] = L.word(p[0], p[1]);
      o.x = x; o.y = y;
      o.sx = o.sy = ((LG.spW * L.sW * L.k) / G.dot) * (1 + 0.3 * hit(b, LAND12(letter12(p[0])), 4));
    },
    captions: [
      { at: 5.6, to: Infinity, text: 'Take charge of your health.' },
      {
        at: 6.8, to: Infinity, cls: 'link',
        html: '<a href="https://www.livelong.nl" target="_blank" rel="noopener">Start now at livelong.nl</a><small>No GP referral · Results within 48 hours · Reviewed by a doctor</small>',
      },
    ],
    music(M) {
      M.pad(0, 'C3 G3 B3 E4', 1.8, 0.24); M.sub(0, 'C2', 1.8, 0.18);
      M.whoosh(0.2, 1.2, 0.07, 300, 2600);
      for (let k = 0; k < 8; k++) M.tick(0.2 + k * 0.15, 0.04, (k / 7 - 0.5) * 0.8);
      M.snip(BARS12); M.snip(BARS12 + 0.1);
      ['G5', 'A5', 'B5', 'D6', 'E6', 'G6', 'A6', 'B6'].forEach((n, L) => M.marimba(LAND12(L), n, 0.2 - L * 0.01, (L / 7 - 0.5) * 0.9));
      M.pad(1.8, 'D3 A3 C4 F#4', 3.2, 0.24); M.sub(1.8, 'D2', 3.2, 0.2);
      M.drop(DROP12 + 0.2, 'D6', 0.28); M.bell(DROP12 + 0.2, 'G6', 0.22);
      BEAT12.forEach((at, k) => { M.thump(at, 0.5 - k * 0.03); M.thump(at + 0.3, 0.3 - k * 0.02); });
      M.boom(5, 0.45); M.kick(5, 0.36); M.bell(5, 'D7', 0.14);
      M.ep(5, 'G3', 0.36); M.ep(5, 'G2', 0.3); M.ep(5.03, 'B5', 0.2); M.ep(5.06, 'D6', 0.18);
      M.pad(5, 'G3 D4 F#4 A4 B4', 3.5, 0.3); M.sub(5, 'G1', 3.5, 0.28);
      M.ep(5.6, 'B5', 0.18); M.ep(6.1, 'D6', 0.14);
      M.ep(6.8, 'G5', 0.2); M.bell(6.8, 'G6', 0.1);
      M.pad(8.5, 'C3 G3 B3 E4', 1.8, 0.22); M.sub(8.5, 'C2', 1.8, 0.18);
      M.pad(10.3, 'G3 D4 B4', 1.7, 0.22); M.sub(10.3, 'G1', 1.7, 0.2);
      M.ep(10.3, 'G5', 0.14); M.ep(11, 'B5', 0.1);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12];
  BJ.introPose = S1.pose;
})();
