/* Veridue — "Make your M&A team Veri fast." A commercial in 150 shapes.
   Every shape is a single div whose size, corner radius, colour and matrix3d are set
   every frame. One bright green shape is your best deal. It lands on your desk among
   59 others, and you only have time to look at one in five, so it slips by. The deals
   you do look at crawl through weeks of manual review until the red flags surface.
   Then the green shape bursts open: Veridue. Thousands of risk factors are scanned in
   one sweep, every red flag is traced back to its source, a month becomes a day, the
   deal moves from Day 1 to Week 6, and the whole pipeline is screened, until your best
   deal is found again and stretches into the button.
   Every scene defines:
     pose(i, b, p)  shape i at local beat b: p.x, p.y (from G.cx/G.cy), p.w, p.h, p.r,
                    p.tip, p.rot, p.rx, p.ry, p.z, p.o, p.c (and p.sym for pills)
     blend          how shapes travel from the previous scene
     type           the headlines, timed in beats
     music(M)       the score, timed in the same beats */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, hit = BJ.hit, clamp = BJ.clamp, lerp = BJ.lerp, C = BJ.C, mix = BJ.mix;
  const TAU = BJ.TAU, PI = Math.PI;
  const CARD = [13, 64, 39], CARD_ON = [20, 92, 57], GRASS = [18, 150, 88], TITLE = [150, 172, 160];

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
  // a horizontal bar of visual length `len` starting at x0
  const bar = (p, x0, y, len, th, c) => seg(p, x0 + th / 2, y, x0 + Math.max(th / 2, len - th / 2), y, th, c);
  const maxHit = (b, times, decay) => { let e = 0; for (const t of times) e = Math.max(e, hit(b, t, decay)); return e; };
  function perLayout(fn) {
    let v = -1, val;
    return () => { if (v !== G.version) { v = G.version; val = fn(); } return val; };
  }
  const yF = (px) => () => (G.cy + px()) / G.H; // type centred at an offset from the visual centre
  const xF = (px) => () => (G.cx + px()) / G.W;
  const PENTA = ['G', 'A', 'B', 'D', 'E'];
  const penta = (k, base = 4) => PENTA[((k % 5) + 5) % 5] + (base + Math.floor(k / 5));
  const rnd = (seed, n) => { const r = BJ.rng(seed), a = []; for (let k = 0; k < n; k++) a.push(r()); return a; };
  function shuffle(a, seed) { const r = BJ.rng(seed); for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; }
  function groove(M, a, z, v = 0.22, hat = 0.025) { for (let b = a; b < z - 0.01; b += 1) { M.kick(b, v); M.tick(b + 0.5, hat, 0.25); } }
  const gw = () => Math.min(G.W * 0.86, G.R * 3.3);
  const cover = () => 2.3 * Math.hypot(G.W / 2, G.H * 0.6);
  const invSine = (u) => Math.acos(1 - 2 * clamp(u)) / PI; // inverse of ease.inOutSine
  // things that break loose: they tumble, fall and fade (f from 0 to 1)
  function tumble(p, f, s) {
    if (f <= 0) return;
    p.y += f * f * G.H * 0.85; p.x += s * f * G.R * 0.4;
    p.rx += f * 2.4 * (s > 0 ? 1 : -1); p.rot += f * s * 1.2; p.z += f * G.R * 0.6;
    p.o *= 1 - clamp((f - 0.45) / 0.45);
  }

  // ------------------------------------------------------------ the deal grid (scenes 1, 2 and 9)
  // 60 slots; the green shape (0) takes slot `hs`, the other 59 deals fill the rest.
  const ND = 60;
  const deals = perLayout(() => {
    const cols = G.portrait ? 6 : 12, rows = ND / cols;
    const cell = Math.min((G.W * 0.84) / cols, (G.H * 0.5) / rows, G.R * 0.3), pos = [], diag = [];
    for (let s = 0; s < ND; s++) {
      const r = Math.floor(s / cols), c = s % cols;
      pos.push([(c - (cols - 1) / 2) * cell, (r - (rows - 1) / 2) * cell]);
      diag.push(r + c);
    }
    return { cols, rows, cell, pos, diag, hs: G.portrait ? 6 * cols + 4 : cols + 8, maxDiag: rows + cols - 2 };
  });
  const slotOf = (i) => { const d = deals(); return i === 0 ? d.hs : i - 1 < d.hs ? i - 1 : i; };
  const RD = rnd(7, ND);
  const DC = RD.map((v) => mix(C.deep, C.line, v * 0.55)); // every deal a slightly different green
  function dealTile(p, i, c) {
    const d = deals(), s = d.pos[slotOf(i)], z = d.cell * 0.76;
    rect(p, s[0], s[1], z, z, z * 0.24, c || DC[i]);
  }

  // =========================================================== 1 · deals land on your desk
  const ORDER1 = shuffle(Array.from({ length: ND - 1 }, (_, k) => k + 1), 21);
  const TL1 = new Float32Array(ND);
  ORDER1.forEach((i, k) => { TL1[i] = 0.45 + 2.3 * Math.sqrt(k / (ND - 2)); }); // faster and faster
  const FALL1 = 0.4, GLOW1 = [3.3, 5.3];
  const glow1 = (b) => E.inOutSine(clamp((b - GLOW1[0]) / 0.5)) * (1 - E.inOutSine(clamp((b - GLOW1[1]) / 0.6)));
  const S1 = {
    name: 'desk',
    beats: 6,
    introBeat: 0,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      if (i === 0) {
        const d = deals(), s = d.pos[d.hs], z = d.cell * 0.76;
        const beat = hit(b, 0, 5) + 0.6 * hit(b, 0.25, 6);
        const go = E.inOutCubic(clamp((b - 0.3) / 0.6)), d0 = G.R * 0.16 * (1 + 0.18 * beat);
        const hideIn = E.inOutSine(clamp((b - 1.1) / 0.9)), gl = glow1(b), sz = lerp(d0, z, go) * (1 + 0.14 * gl);
        rect(p, lerp(0, s[0], go), lerp(0, s[1], go), sz, sz, lerp(d0 / 2, z * 0.24, go), mix(mix(C.green, DC[0], hideIn), C.green, gl));
        return;
      }
      if (i >= ND) return hide(p);
      const t = TL1[i], f = (b - t) / FALL1;
      if (f < 0) return hide(p);
      dealTile(p, i);
      if (f < 1) { const e = f * f; p.y = lerp(p.y - G.H * 0.75, p.y, e); p.rot = (1 - e) * (RD[i] - 0.5) * 1.4; }
      const sq = hit(b, t + FALL1, 7, 0.02);
      p.w *= 1 + 0.14 * sq; p.h *= 1 - 0.16 * sq;
    },
    type: [
      { at: 0.5, to: 3.0, text: 'New deals. | Every day.' },
      { at: 3.2, to: 5.8, text: 'Your best one | is in there.' },
    ],
    music(M) {
      M.pad(0, 'E3 B3 D4 G4', GLOW1[0], 0.3); M.sub(0, 'E2', GLOW1[0], 0.2);
      M.thump(0, 0.5); M.thump(0.25, 0.3);
      ORDER1.forEach((i, k) => {
        const at = TL1[i] + FALL1, x = (i % 12) / 11 - 0.5;
        M.tick(at, 0.02 + 0.012 * (k / 58), x);
        if (k % 3 === 0) M.marimba(at, penta(14 - Math.floor(k / 3) % 10, 4), 0.07 + k * 0.0012, x * 0.9);
      });
      M.pad(GLOW1[0], 'C3 G3 B3 E4', 6 - GLOW1[0], 0.3); M.sub(GLOW1[0], 'C2', 6 - GLOW1[0], 0.2);
      M.kick(GLOW1[0], 0.3); M.kick(GLOW1[0] + 1, 0.2); M.kick(GLOW1[0] + 2, 0.24);
      M.bell(GLOW1[0] + 0.2, 'B5', 0.2); M.ep(GLOW1[0] + 0.2, 'E5', 0.16); M.ep(GLOW1[0] + 0.6, 'G5', 0.12);
    },
  };

  // =========================================================== 2 · time for one in five
  // Twelve deals light up, one after another. The green one isn't among them.
  const CH2 = shuffle(Array.from({ length: ND - 1 }, (_, k) => k + 1), 5).slice(0, 12).sort((a, b) => a - b);
  const CHI = new Int8Array(ND).fill(-1);
  CH2.forEach((i, k) => { CHI[i] = k; });
  const PICK2 = shuffle(CH2.map((_, k) => k), 9), TC2 = new Float32Array(12), pickT2 = (n) => 0.35 + n * 0.16;
  PICK2.forEach((k, n) => { TC2[k] = pickT2(n); });
  const S2 = {
    name: 'one in five',
    beats: 4,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      if (i >= ND) return hide(p);
      dealTile(p, i);
      const dim = E.inOutSine(clamp((b - 0.1) / 0.6)), k = CHI[i];
      if (k >= 0) {
        const t = TC2[k], f = E.outCubic(clamp((b - t) / 0.18)), pk = hit(b, t, 5);
        p.c = mix(mix(DC[i], C.moss, dim * (1 - f)), C.mint, f);
        p.w *= 1 + 0.2 * pk; p.h *= 1 + 0.2 * pk;
      } else { p.c = mix(DC[i], C.moss, dim); p.o = 1 - 0.3 * dim; }
    },
    type: [
      { at: 0.2, to: 3.8, text: 'Time to check | one in five.' },
    ],
    music(M) {
      M.pad(0, 'A2 E3 C4 G4', 4, 0.3); M.sub(0, 'A1', 4, 0.2);
      M.whoosh(0, 0.6, 0.04, 1800, 500);
      PICK2.forEach((k, n) => { M.marimba(pickT2(n), penta(n + 5, 4), 0.12, ((CH2[k] % 12) / 11 - 0.5) * 0.8); M.tick(pickT2(n), 0.03); });
      groove(M, 0, 4, 0.2, 0.02);
      M.ep(0.4, 'E5', 0.12); M.ep(2.4, 'C5', 0.12);
    },
  };

  // =========================================================== 3 · weeks of manual review
  // The twelve become a Gantt chart that crawls from week 1 to week 10. Red flags surface
  // at the far end, and those deals fall away, fees and all.
  const NW = 10, TK3 = 130, FL3 = 140, RF3 = [2, 5, 8, 10], FLAG3 = [2.75, 2.95, 3.15, 3.35], DROP3 = 4.5;
  const RFI = new Int8Array(12).fill(-1);
  RF3.forEach((k, n) => { RFI[k] = n; });
  const R3 = rnd(33, 40);
  const TGT3 = R3.slice(0, 12).map((v, k) => (RFI[k] >= 0 ? 0.84 + v * 0.14 : 0.5 + v * 0.42));
  const gant = perLayout(() => {
    const W = gw(), rh = Math.min(G.R * 0.13, (G.H * 0.44) / 13), th = rh * 0.5;
    return { W, rh, th, x0: -W / 2, y0: -5.5 * rh + rh * 0.4, top: -6 * rh + rh * 0.4 };
  });
  const rowY3 = (k) => gant().y0 + k * gant().rh;
  const WEEK3 = [0.45, 2.8];
  const week3 = (b) => clamp((b - WEEK3[0]) / (WEEK3[1] - WEEK3[0]));
  function len3(k, b) {
    const g = gant(), n = RFI[k], bb = n >= 0 ? Math.min(b, FLAG3[n]) : b;
    return Math.max(g.th, Math.min(TGT3[k], (bb - WEEK3[0] - k * 0.04) / (WEEK3[1] - WEEK3[0])) * g.W);
  }
  function bar3(p, k, b) {
    const g = gant(), n = RFI[k], red = n >= 0 ? E.outCubic(clamp((b - FLAG3[n]) / 0.25)) : 0;
    bar(p, g.x0, rowY3(k), len3(k, b), g.th, mix(mix(C.mint, C.pale, 0.35), C.red, red));
  }
  function flag3(p, n, part, b) { // part 0 = pole, 1 = flag
    const g = gant(), k = RF3[n], y = rowY3(k), x = g.x0 + len3(k, b) + g.rh * 0.35;
    const e = E.outBack(clamp((b - FLAG3[n] - (part ? 0.08 : 0)) / 0.35));
    if (e <= 1e-3) return hide(p);
    if (!part) seg(p, x, y + g.rh * 0.3, x, y + g.rh * 0.3 - g.rh * 0.95 * e, g.th * 0.24, C.mint);
    else { const fw = g.rh * 0.62 * e, fh = g.rh * 0.42 * e; rect(p, x + fw / 2, y - g.rh * 0.43, fw, fh, fh * 0.2, C.red); }
  }
  const S3 = {
    name: 'weeks',
    beats: 7,
    blend: { start: (i) => (CHI[i] >= 0 ? CHI[i] * 0.025 : 0), dur: (i) => (CHI[i] >= 0 ? 0.6 : 0.4), arc: 0.1 },
    pose(i, b, p) {
      const g = gant(), k = i < ND ? CHI[i] : -1;
      if (k >= 0) {
        bar3(p, k, b);
        const n = RFI[k];
        if (n >= 0) tumble(p, clamp((b - DROP3 - R3[20 + n] * 0.3) / 1.0), R3[30 + n] - 0.5);
        return;
      }
      if (i >= TK3 && i < TK3 + NW) { // week ticks along the top
        const w = i - TK3, x = g.x0 + ((w + 1) / NW) * g.W, e = E.outBack(clamp((b - 0.2 - w * 0.03) / 0.35));
        if (e <= 1e-3) return hide(p);
        const on = clamp((week3(b) * NW - w) * 1.5);
        seg(p, x, g.top - g.rh * 0.62 - g.rh * 0.16 * e, x, g.top - g.rh * 0.62 + g.rh * 0.16 * e, g.th * 0.3, mix(C.line, C.pale, on));
        return;
      }
      if (i >= FL3 && i < FL3 + 8) {
        const n = (i - FL3) >> 1;
        flag3(p, n, (i - FL3) & 1, b);
        tumble(p, clamp((b - DROP3 - R3[20 + n] * 0.3) / 1.0), R3[30 + n] - 0.5);
        return;
      }
      hide(p);
    },
    type: [
      { at: 0.3, to: 6.8, fn: (b) => 'Week ' + (1 + Math.round(week3(b) * (NW - 1))), y: yF(() => gant().top - gant().rh * 1.75), size: 0.6, cls: 'num' },
      { at: 0.4, to: 2.6, text: 'Weeks of | manual review.' },
      { at: 2.8, to: 4.4, text: 'Red flags surface | too late.' },
      { at: 4.6, to: 6.8, text: 'Fees spent. | Deal lost.' },
    ],
    music(M) {
      M.pad(0, 'D3 A3 C4 F4', FLAG3[0], 0.28); M.sub(0, 'D2', FLAG3[0], 0.2);
      M.whoosh(0, 0.6, 0.04, 400, 1600);
      for (let b = WEEK3[0]; b < WEEK3[1]; b += 0.25) M.tick(b, (b - WEEK3[0]) % 0.5 ? 0.02 : 0.04, 0.3);
      for (let b = 0; b < DROP3; b += 1) M.kick(b, 0.18);
      for (let w = 0; w < NW; w++) M.marimba(WEEK3[0] + (w / (NW - 1)) * (WEEK3[1] - WEEK3[0]), penta(w + 3, 3), 0.07, (w / 9 - 0.5) * 0.8);
      M.pad(FLAG3[0], 'Bb2 F3 A3 D4', DROP3 - FLAG3[0], 0.28); M.sub(FLAG3[0], 'Bb1', DROP3 - FLAG3[0], 0.22);
      FLAG3.forEach((t, n) => { M.beep(t, n % 2 ? 'F5' : 'E5', 0.16, (n / 3 - 0.5) * 0.7); M.thump(t, 0.3); });
      M.whoosh(DROP3, 1.0, 0.07, 2400, 160); M.boom(DROP3 + 0.3, 0.26);
      M.pad(DROP3, 'A2 E3 G3 C4', 7 - DROP3, 0.26); M.sub(DROP3, 'A1', 7 - DROP3, 0.2);
      M.ep(5.0, 'C5', 0.1); M.ep(5.8, 'A4', 0.1);
    },
  };

  // =========================================================== 4 · what if you knew on day one?
  // The surviving bars drain into one point, and the green deal is back. It beats, then bursts open.
  const BURST4 = [2.3, 3.0];
  const S4 = {
    name: 'meet',
    beats: 7,
    blend: { start: (i) => (i < ND && CHI[i] >= 0 ? CHI[i] * 0.02 : 0), dur: (i) => (i === 0 ? 0.01 : 0.7) },
    bg: (b) => (b < BURST4[1] ? C.bg : C.green),
    light: (b) => b > BURST4[1] - 0.15,
    pose(i, b, p) {
      if (i === 0) {
        const g = E.outBack(clamp((b - 0.35) / 0.5)), beat = maxHit(b, [1.1, 1.5], 5);
        const pre = 1 - 0.18 * E.inOutSine(clamp((b - 1.8) / 0.45));
        const d0 = G.R * 0.3 * g * (1 + 0.2 * beat) * pre, bu = E.inCubic(clamp((b - BURST4[0]) / (BURST4[1] - BURST4[0])));
        if (g <= 1e-3) return hide(p);
        const d = lerp(d0, cover(), bu);
        circle(p, 0, 0, d, C.green);
        return;
      }
      const k = i < ND ? CHI[i] : -1;
      if (k >= 0 && RFI[k] < 0) {
        const s = 1 - clamp((b - 0.45 - k * 0.02) / 0.3);
        if (s <= 0) return hide(p);
        const d = gant().th * s;
        pill(p, 0, 0, d, d, -PI / 2, mix(C.pale, C.green, 1 - s)); // keep the bars' orientation while they drain
        return;
      }
      hide(p);
    },
    type: [
      { at: 0.2, to: 2.25, text: 'What if you knew | on day one?' },
      { at: 3.1, to: 6.8, text: 'Meet Veridue.', y: yF(() => 0), size: 1.45, color: '#03180a', stagger: 0.12 },
      { at: 3.6, to: 6.8, text: 'AI-native due diligence for | renewable energy & data centers.', size: 'm', color: '#03180a', stagger: 0.05 },
    ],
    music(M) {
      M.pad(0, 'F3 A3 C4 E4', BURST4[1], 0.26); M.sub(0, 'F2', BURST4[1], 0.2);
      M.ep(0.3, 'A4', 0.12); M.ep(0.7, 'C5', 0.12); M.ep(1.1, 'E5', 0.14);
      M.thump(0.35, 0.36); [1.1, 1.5].forEach((at, k) => M.thump(at, k ? 0.3 : 0.46));
      M.whoosh(BURST4[0] - 0.4, 1.1, 0.08, 300, 3200);
      M.splash(BURST4[1], 0.3); M.kick(BURST4[1], 0.5); M.boom(BURST4[1], 0.3);
      M.pad(BURST4[1], 'G3 B3 D4 A4', 7 - BURST4[1], 0.32); M.sub(BURST4[1], 'G2', 7 - BURST4[1], 0.24);
      M.bell(BURST4[1] + 0.15, 'G5', 0.22); M.bell(BURST4[1] + 0.35, 'B5', 0.16, 0.3); M.bell(BURST4[1] + 0.55, 'D6', 0.14, -0.3);
      groove(M, BURST4[1] + 1, 7, 0.24);
      M.ep(4.6, 'A5', 0.12); M.ep(5.6, 'B5', 0.1);
    },
  };

  // =========================================================== 5 · thousands of risk factors, in 24 hours
  // The green fills the screen, then shrinks back into a scan beam. It sweeps once across a
  // hundred risk factors, and every red flag is found on the first pass.
  const NR = 100, R5 = 20, RED5 = [7, 23, 38, 52, 71, 94], SCAN5 = [1.0, 3.3], GATH5 = 3.9;
  const RI5 = new Int8Array(NR).fill(-1);
  RED5.forEach((j, n) => { RI5[j] = n; });
  const RR5 = rnd(55, NR);
  const risk = perLayout(() => {
    const cols = G.portrait ? 10 : 20, rows = NR / cols;
    const cell = Math.min((G.W * 0.86) / cols, (G.H * 0.42) / rows, G.R * 0.26), pos = [];
    for (let j = 0; j < NR; j++) pos.push([((j % cols) - (cols - 1) / 2) * cell, (Math.floor(j / cols) - (rows - 1) / 2) * cell]);
    const x1 = (cols / 2 + 0.5) * cell, x0 = -x1;
    const ts = pos.map((q) => SCAN5[0] + (SCAN5[1] - SCAN5[0]) * invSine((q[0] - x0) / (x1 - x0)));
    const PW = Math.min(gw() * 0.46, G.W * 0.7), PH = cell * 0.4;
    return { cols, rows, cell, pos, x0, x1, ts, PW, PH, gap: Math.max(cell * 0.8, PH * 1.8) };
  });
  const beamX = (b) => { const r = risk(); return lerp(r.x0, r.x1, E.inOutSine(clamp((b - SCAN5[0]) / (SCAN5[1] - SCAN5[0])))); };
  const pillY5 = (n) => (n - 2.5) * risk().gap;
  const CHECKED = mix(CARD, GRASS, 0.5);
  const S5 = {
    name: 'scan',
    beats: 7,
    blend: { dur: 0.01 },
    light: (b) => b < 0.35,
    pose(i, b, p) {
      const r = risk();
      if (i === 0 || i === 121) {
        const s = E.inOutCubic(clamp(b / 0.9)), H = r.rows * r.cell + r.cell * 0.9, bw = i ? r.cell * 0.9 : r.cell * 0.14;
        const out = 1 - clamp((b - SCAN5[1] - 0.1) / 0.35);
        if (out <= 0 || (i && b < 0.7)) return hide(p);
        if (i) { rect(p, beamX(b), 0, bw, H, bw * 0.3, C.green); p.o = 0.16 * clamp((b - 0.7) / 0.3) * out; return; }
        rect(p, lerp(0, beamX(b), s), 0, lerp(cover(), bw, s), lerp(cover(), H, s), lerp(cover() / 2, bw / 2, s), C.green);
        p.o = out;
        return;
      }
      if (i < R5 || i >= R5 + NR) return hide(p);
      const j = i - R5, q = r.pos[j], n = RI5[j], row = Math.floor(j / r.cols), col = j % r.cols;
      const e = E.outBack(clamp((b - 0.15 - (row + col) * 0.02) / 0.35));
      if (e <= 1e-3) return hide(p);
      const z = r.cell * 0.7 * e, ts = r.ts[j], fl = hit(b, ts, 4), on = b >= ts ? 1 : 0;
      rect(p, q[0], q[1], z * (1 + 0.28 * fl), z * (1 + 0.28 * fl), z * 0.22, mix(mix(CARD, n >= 0 ? C.red : CHECKED, on), C.mint, fl * (n >= 0 ? 0.3 : 0.75)));
      if (n < 0) {
        const f = clamp((b - 3.6 - RR5[j] * 0.35) / 0.35);
        p.o = 1 - f; p.w *= 1 - 0.5 * f; p.h *= 1 - 0.5 * f;
        if (f >= 1) hide(p);
        return;
      }
      const g = E.inOutCubic(clamp((b - GATH5 - n * 0.05) / 0.8));
      p.x = lerp(q[0], 0, g); p.y = lerp(q[1], pillY5(n), g);
      p.w = lerp(p.w, r.PW, g); p.h = lerp(p.h, r.PH, g); p.r = lerp(p.r, r.PH / 2, g);
    },
    type: [
      { at: 0.7, to: 3.8, fn: (b) => 'Hour ' + Math.round(24 * E.inOutSine(clamp((b - SCAN5[0]) / (SCAN5[1] - SCAN5[0])))), y: yF(() => -(risk().rows / 2) * risk().cell - G.F * 0.75), size: 0.6, cls: 'num' },
      { at: 0.5, to: 3.7, text: '1000s of risk factors. | Checked in 24 hours.' },
      { at: 4.0, to: 6.8, text: 'Every red flag. | Day one.' },
    ],
    music(M) {
      M.pad(0, 'G3 B3 D4 A4', SCAN5[0], 0.28); M.sub(0, 'G2', SCAN5[0], 0.22);
      M.whoosh(0, 0.9, 0.06, 3200, 500);
      M.pad(SCAN5[0], 'E3 B3 D4 G4', SCAN5[1] - SCAN5[0], 0.26); M.sub(SCAN5[0], 'E2', SCAN5[1] - SCAN5[0], 0.2);
      M.pad(SCAN5[1], 'C3 G3 B3 E4', 7 - SCAN5[1], 0.28); M.sub(SCAN5[1], 'C2', 7 - SCAN5[1], 0.22);
      M.whoosh(SCAN5[0], SCAN5[1] - SCAN5[0], 0.035, 500, 2600);
      const cols = 20, scanAt = (u) => SCAN5[0] + (SCAN5[1] - SCAN5[0]) * invSine(u);
      for (let c = 0; c < cols; c++) M.tick(scanAt((c + 0.5) / cols), 0.03, (c + 0.5) / cols - 0.5);
      // approximate the landscape positions so the beeps land on the red tiles
      RED5.forEach((j, n) => { const u = ((j % cols) + 1) / (cols + 1); M.beep(scanAt(u), n % 2 ? 'E6' : 'D6', 0.1, (u - 0.5) * 0.8); });
      for (let k = 0; k < 5; k++) M.marimba(SCAN5[0] + k * 0.5, penta(k + 5, 4), 0.07, 0);
      M.whoosh(GATH5 - 0.2, 0.9, 0.05, 1400, 400);
      RED5.forEach((_, n) => M.marimba(GATH5 + 0.6 + n * 0.06, penta(10 - n, 4), 0.1, (n / 5 - 0.5) * 0.6));
      groove(M, 0, 7, 0.22);
      M.ep(4.4, 'B5', 0.12); M.ep(5.4, 'G5', 0.1);
    },
  };

  // =========================================================== 6 · traced to its source
  // Four of the red flags become a key-risks list. Each finding links back to the exact line
  // in the source document, and the green dot runs along every link.
  const NL6 = 9, DOC6 = 140, CON6 = 130, SEL6 = [1.1, 2.1, 3.1], SROW6 = [0, 1, 3], DLINE6 = [2, 5, 7];
  const BADGE6 = [C.red, C.red, C.amber, C.red];
  const RT6 = rnd(66, 30);
  const trace = perLayout(() => {
    const Wt = gw();
    if (!G.portrait) {
      const Lw = Wt * 0.52, Dw = Wt * 0.34, Dh = Math.min(Dw * 1.3, G.H * 0.5), rh = Dh / 4.4;
      return { Lw, rh, lx: -Wt / 2 + Lw / 2, top: -2 * rh, Dw, Dh, dx: Wt / 2 - Dw / 2, dy: 0 };
    }
    const Lw = Wt, rh = Math.min(G.H * 0.062, Lw * 0.17), Dw = Wt * 0.66, Dh = Math.min(Dw * 1.2, G.H * 0.25);
    const top = -G.H * 0.29 + rh * 0.6;
    return { Lw, rh, lx: 0, top, Dw, Dh, dx: 0, dy: top + 4 * rh + rh * 0.55 + Dh / 2 };
  });
  const rowY6 = (k) => trace().top + (k + 0.5) * trace().rh;
  const docLine6 = (m) => {
    const T = trace(), x0 = T.dx - T.Dw / 2 + T.Dw * 0.1, len = T.Dw * 0.8 * (m === 0 ? 0.55 : 0.55 + 0.45 * RT6[m]);
    return { x0, len, y: T.dy - T.Dh / 2 + T.Dh * (0.13 + m * 0.093), th: T.Dh * (m === 0 ? 0.045 : 0.026) };
  };
  function link6(k) {
    const T = trace(), y0 = rowY6(SROW6[k]), L = docLine6(DLINE6[k]);
    if (!G.portrait) return [T.lx + T.Lw / 2 - T.rh * 0.22, y0, L.x0 - T.Dw * 0.05, L.y];
    return [T.lx + T.Lw / 2 - T.rh * 0.3, y0, L.x0 + L.len + T.Dw * 0.03, L.y];
  }
  const selK6 = (b) => { let k = -1; for (let n = 0; n < SEL6.length; n++) if (b >= SEL6[n]) k = n; return k; };
  const grow6 = (b, k) => E.inOutCubic(clamp((b - SEL6[k]) / 0.55));
  const S6 = {
    name: 'trace',
    beats: 6,
    blend: {
      start: (i) => (i >= R5 && RI5[i - R5] >= 0 ? RI5[i - R5] * 0.05 : 0),
      dur: (i) => (i >= R5 && i < R5 + NR && RI5[i - R5] >= 0 ? 0.7 : 0.01),
    },
    pose(i, b, p) {
      const T = trace(), rh = T.rh, cur = selK6(b);
      if (i >= R5 && i < R5 + NR) { // the red pills become badges
        const n = RI5[i - R5];
        if (n < 0 || n > 3) return hide(p);
        const bw = Math.min(rh * 1.0, T.Lw * 0.2), bh = rh * 0.26;
        const x = T.lx - T.Lw / 2 + rh * 0.3 + bw / 2;
        rect(p, x, rowY6(n), bw, bh, bh / 2, mix(C.red, BADGE6[n], clamp((b - 0.5) / 0.3)));
        return;
      }
      if (i >= 1 && i <= 12) {
        const k = Math.floor((i - 1) / 3), part = (i - 1) % 3, y = rowY6(k);
        const e = E.outBack(clamp((b - 0.05 - k * 0.07 - part * 0.06) / 0.4));
        if (e <= 1e-3) return hide(p);
        const on = SROW6.indexOf(k), act = on >= 0 && on === cur ? E.inOutSine(clamp((b - SEL6[on]) / 0.3)) * (1 - (on + 1 < SEL6.length ? clamp((b - SEL6[on + 1]) / 0.3) : 0)) : 0;
        const bw = Math.min(rh * 1.0, T.Lw * 0.2), lx0 = T.lx - T.Lw / 2 + rh * 0.3 + bw + rh * 0.3;
        if (part === 0) rect(p, T.lx, y, T.Lw * lerp(0.9, 1, e), rh * 0.82 * e, rh * 0.14, mix(CARD, CARD_ON, act));
        else if (part === 1) bar(p, lx0, y - rh * 0.1, T.Lw * (0.38 + 0.2 * RT6[10 + k]) * e, rh * 0.11, mix(TITLE, C.mint, act));
        else bar(p, lx0, y + rh * 0.14, T.Lw * (0.28 + 0.22 * RT6[15 + k]) * e, rh * 0.07, mix(CARD, TITLE, 0.45));
        return;
      }
      if (i === DOC6) {
        const e = E.outBack(clamp((b - 0.25) / 0.45)), pk = maxHit(b, SEL6.map((t) => t + 0.55), 5);
        if (e <= 1e-3) return hide(p);
        rect(p, T.dx, T.dy, T.Dw * e * (1 + 0.015 * pk), T.Dh * e * (1 + 0.015 * pk), T.Dw * 0.035, C.paper);
        return;
      }
      if (i > DOC6 && i <= DOC6 + NL6) {
        const m = i - DOC6 - 1, L = docLine6(m), e = E.outCubic(clamp((b - 0.45 - m * 0.04) / 0.4));
        if (e <= 1e-3) return hide(p);
        const k = DLINE6.indexOf(m), f = k >= 0 ? E.outCubic(clamp((b - SEL6[k] - 0.5) / 0.3)) : 0;
        bar(p, L.x0, L.y, L.len * e, L.th * (1 + 0.8 * f), m === 0 ? mix(C.ink, C.green2, f) : mix(C.grey, C.green, f));
        p.z = 1;
        return;
      }
      if (i >= CON6 && i < CON6 + 6) { // links, then their start dots
        const k = (i - CON6) % 3, g = grow6(b, k);
        if (b < SEL6[k]) return hide(p);
        const [x0, y0, x1, y1] = link6(k), past = k < cur ? 1 : 0, col = mix(C.green, C.sage, past * 0.6);
        if (i < CON6 + 3) seg(p, x0, y0, lerp(x0, x1, g), lerp(y0, y1, g), rh * 0.045, col);
        else circle(p, x0, y0, rh * 0.13 * E.outBack(clamp((b - SEL6[k]) / 0.3)), col);
        p.z = 2;
        return;
      }
      if (i === 0) {
        if (cur < 0) return hide(p);
        const [x0, y0, x1, y1] = link6(cur), g = grow6(b, cur), pk = hit(b, SEL6[cur] + 0.55, 5);
        const d = rh * 0.22 * E.outBack(clamp((b - SEL6[0]) / 0.3)) * (1 + 0.5 * pk);
        circle(p, lerp(x0, x1, g), lerp(y0, y1, g), d, C.green);
        p.z = 3;
        return;
      }
      hide(p);
    },
    type: [
      { at: 0.2, to: 5.8, text: 'Key risks', cls: 'lab', size: 0.4, ax: 0, x: xF(() => trace().lx - trace().Lw / 2), y: yF(() => trace().top - trace().rh * 0.35) },
      { at: 0.35, to: 5.8, text: 'Source document', cls: 'lab', size: 0.4, ax: 0, x: xF(() => trace().dx - trace().Dw / 2), y: yF(() => trace().dy - trace().Dh / 2 - trace().rh * 0.35) },
      { at: 0.5, to: 5.8, text: 'Every finding, | traced to its source.' },
    ],
    music(M) {
      M.pad(0, 'A2 E3 G3 C4', 3, 0.26); M.sub(0, 'A1', 3, 0.2);
      for (let k = 0; k < 4; k++) M.marimba(0.05 + k * 0.07, penta(k + 7, 4), 0.09, -0.4);
      M.marimba(0.4, 'D6', 0.08, 0.4);
      M.pad(3, 'G3 B3 D4 A4', 3, 0.28); M.sub(3, 'G2', 3, 0.22);
      SEL6.forEach((t, k) => {
        M.tick(t, 0.05, -0.4); M.whoosh(t, 0.55, 0.03, 600, 2000);
        M.bell(t + 0.55, ['G5', 'B5', 'D6'][k], 0.16, 0.4); M.ep(t + 0.55, ['D5', 'G5', 'B5'][k], 0.1);
      });
      groove(M, 0, 6, 0.2);
      M.ep(4.4, 'A5', 0.1);
    },
  };

  // =========================================================== 7 · one day, not one month
  // A calendar. Day 1 lights up green; the rest of the month fills in the old way, then falls off.
  const cal7 = perLayout(() => {
    const cell = Math.min(gw() / 7, (G.H * 0.5) / 5.6, G.R * 0.36), top = -2.5 * cell + 0.3 * cell;
    return { cell, top, pos: Array.from({ length: 30 }, (_, d) => [((d % 7) - 3) * cell, top + (Math.floor(d / 7) + 0.5) * cell]) };
  });
  const FILL7 = [0.8, 0.045], FALL7 = 2.4, R7 = rnd(77, 60);
  const fill7 = (d) => FILL7[0] + (d - 1) * FILL7[1];
  const S7 = {
    name: 'one day',
    beats: 5,
    blend: { dur: (i) => (i === 0 ? 0.7 : 0.45) },
    pose(i, b, p) {
      const K = cal7(), z = K.cell * 0.84;
      if (i === 0) {
        const q = K.pos[0], gl = hit(b, 0.5, 3), pk = hit(b, FALL7 + 1.1, 4), mv = E.inOutCubic(clamp((b - FALL7 - 0.3) / 0.8));
        const zz = z * lerp(1, 1.5, mv) * (1 + 0.12 * gl + 0.12 * pk);
        rect(p, lerp(q[0], 0, mv), lerp(q[1], 0, mv), zz, zz, zz * 0.2, C.green);
        return;
      }
      if (i === 30) {
        const e = E.outCubic(clamp((b - 0.1) / 0.4));
        if (e <= 1e-3) return hide(p);
        rect(p, 0, K.top - K.cell * 0.3, (7 * K.cell - K.cell * 0.16) * e, K.cell * 0.28, K.cell * 0.1, C.line);
        tumble(p, clamp((b - FALL7 - 0.1) / 1.0), 0.3);
        return;
      }
      if (i > 29) return hide(p);
      const q = K.pos[i], e = E.outBack(clamp((b - 0.15 - i * 0.012) / 0.35));
      if (e <= 1e-3) return hide(p);
      const f = E.outCubic(clamp((b - fill7(i)) / 0.2)), pk = hit(b, fill7(i), 6);
      rect(p, q[0], q[1], z * e * (1 + 0.15 * pk), z * e * (1 + 0.15 * pk), z * 0.2, mix(CARD, C.sage, f));
      tumble(p, clamp((b - FALL7 - R7[i] * 0.35) / 1.0), R7[30 + i] - 0.5);
    },
    type: [
      { at: 0.3, to: 4.8, fn: (b) => 'Day ' + (b < FILL7[0] || b > FALL7 + 0.6 ? 1 : Math.min(30, 1 + Math.floor((b - FILL7[0]) / FILL7[1]) + 1)), y: yF(() => cal7().top - cal7().cell * 1.05), size: 0.6, cls: 'num' },
      { at: 0.4, to: 4.8, text: 'Red flags in *1\u00a0day,* | not 1 month.' },
    ],
    music(M) {
      M.pad(0, 'C3 G3 B3 E4', FALL7, 0.26); M.sub(0, 'C2', FALL7, 0.2);
      M.bell(0.5, 'G5', 0.2); M.ep(0.5, 'D5', 0.12);
      for (let d = 1; d < 30; d++) M.tick(fill7(d), 0.02 + d * 0.0008, ((d % 7) / 6 - 0.5) * 0.8);
      for (let d = 1; d < 30; d += 4) M.marimba(fill7(d), penta(Math.floor(d / 4), 3), 0.06);
      groove(M, 0, FALL7, 0.18);
      M.whoosh(FALL7, 1.0, 0.06, 2400, 200); M.boom(FALL7 + 0.3, 0.2);
      M.pad(FALL7, 'D3 A3 C4 F#4', 5 - FALL7, 0.28); M.sub(FALL7, 'D2', 5 - FALL7, 0.22);
      M.kick(FALL7 + 1.1, 0.3); M.bell(FALL7 + 1.1, 'A5', 0.18); M.ep(FALL7 + 1.3, 'F#5', 0.12);
    },
  };

  // =========================================================== 8 · bid sharper, close faster
  // Day 1 runs down the deal timeline: red flag diligence, NBO, binding offer, signed.
  const AT8 = [0.45, 1.35, 2.25, 3.4], U8 = [0, 0.33, 0.66, 1];
  const LAB8 = [['Day 1', 'Red flag diligence'], ['Day 3', 'NBO submitted'], ['Week 2', 'Binding offer'], ['Week 6', 'Deal signed']];
  const tl8 = perLayout(() => {
    if (!G.portrait) { const L = gw() * 0.84; return { L, d: Math.min(G.R * 0.12, L * 0.04), at: (u) => [-L / 2 + u * L, 0] }; }
    const L = G.H * 0.44, x = -G.W * 0.2, y0 = -G.H * 0.27;
    return { L, d: G.R * 0.12, at: (u) => [x, y0 + u * L] };
  });
  function u8(b) {
    if (b <= AT8[0]) return 0;
    for (let k = 0; k < 3; k++) if (b < AT8[k + 1]) return lerp(U8[k], U8[k + 1], E.inOutCubic(clamp((b - AT8[k] - 0.15) / (AT8[k + 1] - AT8[k] - 0.15))));
    return 1;
  }
  const S8 = {
    name: 'timeline',
    beats: 6,
    blend: { dur: (i) => (i === 0 ? 0.7 : 0.45) },
    pose(i, b, p) {
      const T = tl8(), th = T.d * 0.28;
      if (i === 0) {
        const [x, y] = T.at(u8(b)), pk = maxHit(b, AT8, 4), sig = hit(b, AT8[3], 2.5);
        circle(p, x, y, T.d * 1.25 * (1 + 0.3 * pk + 0.2 * sig), C.green);
        return;
      }
      if (i === 1 || i === 2) {
        const e = i === 1 ? E.inOutCubic(clamp((b - 0.05) / 0.5)) : u8(b);
        if (i === 2 && b < AT8[0]) return hide(p);
        const [x0, y0] = T.at(0), [x1, y1] = T.at(e);
        if (G.portrait) seg(p, x0, y0, x1, Math.max(y0 + 0.01, y1), th, i === 1 ? C.line : C.green);
        else seg(p, x0, y0, Math.max(x0 + 0.01, x1), y1, th, i === 1 ? C.line : C.green);
        return;
      }
      if (i >= 3 && i <= 6) {
        const k = i - 3, [x, y] = T.at(U8[k]), e = E.outBack(clamp((b - 0.05 - U8[k] * 0.35) / 0.35));
        if (e <= 1e-3) return hide(p);
        const on = E.outCubic(clamp((b - AT8[k]) / 0.25)), pk = hit(b, AT8[k], 5);
        circle(p, x, y, T.d * e * (1 + 0.35 * pk), mix(CARD, C.pale, on));
        return;
      }
      hide(p);
    },
    type: [].concat(
      ...LAB8.map((l, k) => {
        const pt = () => tl8().at(U8[k]), d = () => tl8().d, ax = () => (G.portrait ? 0 : 0.5);
        return [
          { at: AT8[k] - 0.15, to: 5.8, text: l[0], cls: 'lab', size: () => G.F * (G.portrait ? 0.66 : 0.5), color: '#24c777', ax,
            x: () => (G.cx + pt()[0] + (G.portrait ? d() * 1.4 : 0)) / G.W, y: () => (G.cy + pt()[1] - (G.portrait ? G.F * 0.3 : d() * 1.7)) / G.H },
          { at: AT8[k] + 0.1, to: 5.8, text: l[1], cls: 'sub', size: () => G.F * (G.portrait ? 0.48 : 0.34), ax,
            x: () => (G.cx + pt()[0] + (G.portrait ? d() * 1.4 : 0)) / G.W, y: () => (G.cy + pt()[1] + (G.portrait ? G.F * 0.33 : d() * 1.7)) / G.H },
        ];
      }),
      [
        { at: 0.3, to: 2.8, text: 'Bid sharper.', size: 1.15 },
        { at: 3.0, to: 5.8, text: 'Close faster.', size: 1.15 },
      ],
    ),
    music(M) {
      M.pad(0, 'G3 B3 D4 A4', AT8[3], 0.28); M.sub(0, 'G2', AT8[3], 0.22);
      M.pad(AT8[3], 'C3 G3 B3 E4', 6 - AT8[3], 0.28); M.sub(AT8[3], 'C2', 6 - AT8[3], 0.22);
      groove(M, 0, 6, 0.26, 0.03);
      AT8.forEach((t, k) => { M.bell(t, ['D5', 'G5', 'B5', 'D6'][k], 0.2, (k / 3 - 0.5) * 0.7); M.ep(t, ['B4', 'D5', 'G5', 'B5'][k], 0.12); if (k) M.whoosh(t - 0.8, 0.8, 0.025, 500, 1800); });
      M.splash(AT8[3], 0.18);
      M.ep(4.4, 'A5', 0.1); M.ep(5.2, 'G5', 0.1);
    },
  };

  // =========================================================== 9 · every deal screened
  // The pipeline returns. A wave flips every deal to its priority, and they stack into a chart.
  // This time the green one comes out on top.
  const TIER9 = [4, 8, 16, 32], TNAME9 = ['Priority 1', 'Priority 2', 'Watch', 'Drop'];
  const TCOL9 = [C.mint, C.pale, C.sage, C.line];
  const RANK9 = [0].concat(shuffle(Array.from({ length: ND - 1 }, (_, k) => k + 1), 99));
  const TI9 = new Int8Array(ND), TN9 = new Int8Array(ND);
  RANK9.forEach((i, r) => { let t = 0, s = 0; while (r >= s + TIER9[t]) { s += TIER9[t]; t++; } TI9[i] = t; TN9[i] = r - s; });
  const FLIP9 = [0.7, 1.1], FLY9 = 2.5, GLOW9 = 4.3;
  const chart9 = perLayout(() => {
    const W = gw();
    if (!G.portrait) {
      const LW = W * 0.2, cell = Math.min((W - LW) / 16, (G.H * 0.46) / 11);
      return { cell, x0: -W / 2 + LW, lx: -W / 2, yk: (k) => (k - 1.5) * 3 * cell, ly: (k) => (k - 1.5) * 3 * cell };
    }
    const cell = Math.min(W / 16, (G.H * 0.5) / 16.5), top = -8.2 * cell;
    return { cell, x0: -W / 2, lx: -W / 2, yk: (k) => top + k * 4 * cell + 2.4 * cell, ly: (k) => top + k * 4 * cell + 0.7 * cell };
  });
  const S9 = {
    name: 'screened',
    beats: 7,
    blend: { start: (i) => (i === 0 ? 0 : i < ND ? RD[i] * 0.25 : 0), dur: (i) => (i === 0 ? 0.8 : 0.5) },
    pose(i, b, p) {
      if (i >= ND) return hide(p);
      const d = deals(), s = slotOf(i), e = i === 0 ? 1 : E.outBack(clamp((b - 0.05 - d.diag[s] * 0.02) / 0.35));
      if (e <= 1e-3) return hide(p);
      dealTile(p, i);
      p.w *= e; p.h *= e;
      const tf = FLIP9[0] + FLIP9[1] * (d.diag[s] / d.maxDiag), f = clamp((b - tf) / 0.35), t = TI9[i];
      const col = i === 0 ? C.green : TCOL9[t];
      p.c = f < 0.5 ? (i === 0 ? mix(C.green, DC[0], 0.5) : DC[i]) : col;
      p.ry = f < 0.5 ? PI * f : PI * (f - 1);
      const g = E.inOutCubic(clamp((b - FLY9 - t * 0.15 - TN9[i] * 0.008) / 0.9));
      if (g > 0) {
        const K = chart9(), n = TN9[i], z = K.cell * 0.82;
        const x = K.x0 + (Math.floor(n / 2) + 0.5) * K.cell, y = K.yk(t) + ((n % 2) - 0.5) * K.cell;
        p.x = lerp(p.x, x, g); p.y = lerp(p.y, y, g); p.w = lerp(p.w, z, g); p.h = lerp(p.h, z, g); p.r = lerp(p.r, z * 0.22, g);
        p.rot = Math.sin(PI * g) * (RD[i] - 0.5) * 0.8;
      }
      if (i === 0) { const gl = hit(b, GLOW9, 2.2) + 0.25 * hit(b, 0.1, 3); p.w *= 1 + 0.25 * gl; p.h *= 1 + 0.25 * gl; }
    },
    type: [].concat(
      TNAME9.map((n, k) => ({
        at: FLY9 + 0.5 + k * 0.15, to: 6.8, text: n, cls: 'lab', size: 0.4, ax: 0, color: k === 0 ? '#24c777' : '',
        x: xF(() => chart9().lx), y: yF(() => chart9().ly(k)),
      })),
      [
        { at: 0.3, to: 2.6, text: 'Screen *100x* | more deals.' },
        { at: 3.0, to: 6.8, text: 'Your best deal. | Found first.' },
      ],
    ),
    music(M) {
      M.pad(0, 'G3 B3 D4 A4', FLY9, 0.28); M.sub(0, 'G2', FLY9, 0.22);
      M.whoosh(0, 0.6, 0.04, 600, 2000);
      for (let k = 0; k < 16; k++) { const at = FLIP9[0] + (k / 15) * FLIP9[1] + 0.15; M.tick(at, 0.03, (k / 15 - 0.5) * 0.8); if (k % 2 === 0) M.marimba(at, penta(k / 2 + 6, 4), 0.08, (k / 15 - 0.5) * 0.8); }
      M.pad(FLY9, 'C3 G3 B3 E4', GLOW9 - FLY9, 0.28); M.sub(FLY9, 'C2', GLOW9 - FLY9, 0.22);
      M.whoosh(FLY9, 1.0, 0.05, 500, 2400);
      TIER9.forEach((_, t) => M.marimba(FLY9 + 0.9 + t * 0.15, ['D6', 'B5', 'G5', 'D5'][t], 0.12, (t / 3 - 0.5) * 0.6));
      M.pad(GLOW9, 'D3 A3 C4 F#4', 7 - GLOW9, 0.28); M.sub(GLOW9, 'D2', 7 - GLOW9, 0.22);
      M.bell(GLOW9, 'G5', 0.22); M.bell(GLOW9 + 0.25, 'D6', 0.16, 0.3);
      groove(M, 0, 7, 0.24);
      M.ep(5.4, 'A5', 0.1);
    },
  };

  // =========================================================== 10 · Veri fast
  // The chart dissolves; the green deal beats under the line, then stretches into the button.
  const logoW = () => Math.min(G.W * 0.62, G.R * 3, 820);
  const CTA_Y = () => (G.portrait ? 0.64 : 0.67);
  const TXT10 = [0.4, 3.3], LOGO10 = 3.6, MOVE10 = [3.3, 5.0], BTN10 = [5.1, 5.9], SHOW10 = 5.9;
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
  const BEAT10 = [1.6, 1.9, 2.5, 2.8];
  const S10 = {
    name: 'finale',
    beats: 11,
    blend: { start: (i) => (i === 0 ? 0 : i * 0.004), dur: (i) => (i === 0 ? 1.0 : 0.5) },
    pose(i, b, p) {
      if (i) return hide(p);
      const d = G.F * 0.3, rest = G.F * 1.75;
      const est = { x: 0, y: G.H * CTA_Y() - G.cy - G.F * 0.35, w: Math.max(240, G.F * 3.6), h: 50 };
      const bt = button() || est;
      const mv = E.inOutCubic(clamp((b - MOVE10[0]) / (MOVE10[1] - MOVE10[0])));
      const st = E.inOutCubic(clamp((b - BTN10[0]) / (BTN10[1] - BTN10[0])));
      const beat = maxHit(b, BEAT10, 5);
      const dd = d * (1 + 0.35 * beat) * lerp(1, (bt.h / d) * 0.8, mv);
      rect(p, lerp(0, bt.x, mv), lerp(rest, bt.y, mv), lerp(dd, bt.w, st), lerp(dd, bt.h, st), lerp(dd / 2, 10, st), C.green);
      if (b > SHOW10 + 1.2) hide(p);
    },
    type: [
      { at: TXT10[0], to: TXT10[1], text: 'Make your M&A team | *Veri\u00a0fast.*', y: yF(() => 0), size: 1.15, stagger: 0.1 },
      { at: LOGO10, to: Infinity, html: '<img src="img/logo.svg" alt="Veridue">', cls: 'logo', y: () => G.cy / G.H, size: () => logoW() / 3.57, fade: 1.2 },
      {
        at: BTN10[0] - 0.2, show: SHOW10, to: Infinity, cls: 'link', y: CTA_Y, fade: 0.8,
        html: '<a href="https://veridue.ai" target="_blank" rel="noopener">Book a demo at veridue.ai</a>' +
          '<small>SOC 2 Type II &middot; ISO 27001 &middot; EU data residency</small>',
      },
    ],
    music(M) {
      M.pad(0, 'C3 G3 E4 B4', BEAT10[0], 0.28); M.sub(0, 'C2', BEAT10[0], 0.2);
      groove(M, 0, BEAT10[0] - 0.5, 0.22);
      M.ep(0.4, 'B5', 0.16); M.ep(0.8, 'D6', 0.12); M.ep(1.2, 'A5', 0.12);
      M.pad(BEAT10[0], 'D3 A3 F#4 C5', LOGO10 - BEAT10[0], 0.28); M.sub(BEAT10[0], 'D2', LOGO10 - BEAT10[0], 0.22);
      BEAT10.forEach((at, k) => M.thump(at, k % 2 ? 0.26 : 0.44));
      M.kick(LOGO10, 0.45); M.boom(LOGO10, 0.3); M.splash(LOGO10, 0.16);
      M.bell(LOGO10, 'G5', 0.22); M.bell(LOGO10 + 0.25, 'B5', 0.16, 0.3); M.bell(LOGO10 + 0.5, 'D6', 0.14, -0.3);
      M.pad(LOGO10, 'G3 B3 D4 A4', 11 - LOGO10, 0.32); M.sub(LOGO10, 'G2', 11 - LOGO10, 0.24);
      M.whoosh(BTN10[0], 0.8, 0.04, 400, 1800);
      M.marimba(SHOW10, 'D6', 0.14); M.marimba(SHOW10 + 0.2, 'G6', 0.12);
      M.ep(8.5, 'G5', 0.1); M.ep(8.52, 'D5', 0.08);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10];
})();
