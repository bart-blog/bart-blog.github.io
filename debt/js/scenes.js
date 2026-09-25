/* Full Circle IT — "Stop wasting Azure budget." A commercial in 150 shapes.
   Each shape is one div whose size, corner radius, colour and matrix3d are set every frame.
   One tile becomes a sprawling cloud; a quarter of it turns out to be waste. The cyan shape is
   DEBT: it closes the ring, scans the estate, draws the line between signal and noise, holds
   the balance, hops along the bill to close the waste, and in the end falls like a drop into
   water, where the ripples become the Full Circle IT logo.
   Every scene defines:
     pose(i, b, p)  shape i at local beat b: p.x, p.y (from G.cx/G.cy), p.w, p.h, p.r, p.tip,
                    p.rot, p.rx, p.ry, p.tl (tilt after rotation), p.z, p.bw (outline), p.o, p.c
     blend          how shapes travel in from the previous scene
     type           the headlines, timed in beats
     music(M)       the score, timed in the same beats */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, hit = BJ.hit, clamp = BJ.clamp, lerp = BJ.lerp, C = BJ.C, mix = BJ.mix;
  const TAU = BJ.TAU, PI = Math.PI, N = BJ.N;

  // ------------------------------------------------------------ drawing helpers
  const hide = (p) => { p.o = 0; p.w = p.h = 0; };
  function circle(p, x, y, d, c) { p.x = x; p.y = y; p.w = p.h = d; p.r = d / 2; p.c = c; }
  function rect(p, x, y, w, h, r, c) { p.x = x; p.y = y; p.w = w; p.h = h; p.r = r; p.c = c; }
  // a pill of length `len` whose long axis points along angle `rot` + 90°
  function pill(p, x, y, len, th, rot, c) { p.x = x; p.y = y; p.w = th; p.h = Math.max(th, len); p.r = th / 2; p.rot = rot; p.c = c; p.sym = PI; }
  function seg(p, x0, y0, x1, y1, th, c) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-6;
    pill(p, (x0 + x1) / 2, (y0 + y1) / 2, L + th, th, Math.atan2(-dx / L, dy / L), c);
  }
  const maxHit = (b, times, decay) => { let e = 0; for (const t of times) e = Math.max(e, hit(b, t, decay)); return e; };
  function perLayout(fn) {
    let v = -1, val;
    return () => { if (v !== G.version) { v = G.version; val = fn(); } return val; };
  }
  const yF = (px) => () => (G.cy + px()) / G.H;
  const EYE = () => (G.portrait ? 0.09 : 0.075);
  const range = (a, b) => { const o = []; for (let k = a; k < b; k++) o.push(k); return o; };
  const PENTA = ['D', 'E', 'F#', 'A', 'B'];
  const penta = (k, base = 4) => PENTA[((k % 5) + 5) % 5] + (base + Math.floor(k / 5));
  // the site's text gradient (#60a5fa → #0078d4 → #06b6d4), for shapes
  const grad = (t) => (t < 0.5 ? mix(C.glow, C.azure, t * 2) : mix(C.azure, C.teal, (t - 0.5) * 2));
  const rnd = (function () { const r = BJ.rng(11), a = []; for (let k = 0; k < 400; k++) a.push(r()); return a; })();
  const eyebrow = (at, to, label) => ({ at, to, html: '<span class="pill"><i></i>' + label + '</span>', cls: 'eyebrow', y: EYE, fade: 0.6 });

  // Where each shape ends up in the previous scene, so the next one can pick the nearest shapes
  // (Hungarian assignment: minimum total travel, nothing crosses the screen).
  function blank() { return { x: 0, y: 0, z: 0, w: 0, h: 0, r: 0, tip: 0, rot: 0, rx: 0, ry: 0, tl: 0, bw: 0, o: 1, c: C.azure, sym: 0 }; }
  function endPose(sc, i) { const p = blank(); sc.pose(i, sc.beats - 1e-3, p); return { x: p.x, y: p.y, vis: p.o > 0.02 && p.w > 0.5 && p.h > 0.5 }; }
  function matchTo(prev, cand, targets) {
    const src = cand.map((i) => endPose(prev, i)), HC = (G.R * 0.8) ** 2, nT = targets.length;
    const a = BJ.assign(cand.length, (r, k) => (k >= nT ? 0 : src[r].vis ? (src[r].x - targets[k][0]) ** 2 + (src[r].y - targets[k][1]) ** 2 : HC));
    const slot = new Int16Array(N).fill(-1), who = new Int16Array(nT).fill(-1);
    cand.forEach((i, r) => { if (a[r] < nT) { slot[i] = a[r]; who[a[r]] = i; } });
    return { slot, who };
  }

  // ------------------------------------------------------------ the ring (the DEBT cycle, the results, the logo)
  const NT = 48;
  const ringR = () => G.R * 0.86, tickL = () => G.R * 0.16, tickT = () => G.R * 0.046;
  const tickAng = (k) => -PI / 2 + (k / NT) * TAU;
  const tickPos = perLayout(() => range(0, NT).map((k) => [Math.cos(tickAng(k)) * ringR(), Math.sin(tickAng(k)) * ringR()]));
  function tick(p, k, fill, grow, pulse) {
    const a = tickAng(k), R = ringR() + pulse * G.R * 0.05, L = tickL() * grow * (1 + pulse * 0.35);
    const f = clamp(fill * NT - k);
    pill(p, Math.cos(a) * R, Math.sin(a) * R, L, tickT() * (0.6 + 0.4 * grow), a - PI / 2, mix(C.dim, grad(k / (NT - 1)), f));
    p.o = clamp(grow * 1.6);
  }
  function rider(p, fill, d) {
    const a = -PI / 2 + fill * TAU, R = ringR();
    circle(p, Math.cos(a) * R, Math.sin(a) * R, d, C.teal);
  }

  // ------------------------------------------------------------ the estate: 96 resource tiles
  const NG = 96;
  const grid = perLayout(() => {
    const cols = G.portrait ? 8 : 12, rows = NG / cols;
    const cell = Math.min((G.W * 0.84) / cols, (G.H * 0.5) / rows, G.R * 0.3), sl = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) sl.push({ x: (c - (cols - 1) / 2) * cell, y: (r - (rows - 1) / 2) * cell, c, r });
    const key = sl.map((s, k) => Math.hypot(s.x, s.y) / cell + rnd[k] * 0.45);
    const order = range(0, NG).sort((a, b) => key[a] - key[b]);
    const pos = [], col = [], row = [], gen = [], parent = [];
    order.forEach((k, n) => { pos.push([sl[k].x, sl[k].y]); col.push(sl[k].c); row.push(sl[k].r); gen.push(n ? 32 - Math.clz32(n) : 0); });
    for (let n = 0; n < NG; n++) { // every tile is cloned from the nearest tile of an earlier generation
      if (!n) { parent.push(0); continue; }
      const lim = 2 ** (gen[n] - 1);
      let best = 0, bd = Infinity;
      for (let m = 0; m < lim; m++) { const d = Math.hypot(pos[m][0] - pos[n][0], pos[m][1] - pos[n][1]); if (d < bd) { bd = d; best = m; } }
      parent.push(best);
    }
    return { cols, rows, cell, pos, col, row, gen, parent, gw: cols * cell, gh: rows * cell };
  });
  const TCOL = range(0, NG).map((n) => mix(C.azure, C.bright, rnd[100 + n] * 0.7));
  // a quarter of the estate is waste: 1 idle, 2 oversized, 3 orphaned (orphans sit on the edge)
  const CAT = new Uint8Array(NG);
  (function () {
    const r = BJ.rng(24);
    const pick = (lo, hi, n, cat) => { for (let c = 0; c < n;) { const k = lo + Math.floor(r() * (hi - lo)); if (!CAT[k]) { CAT[k] = cat; c++; } } };
    pick(64, 96, 8, 3); pick(8, 60, 8, 2); pick(4, 96, 8, 1);
  })();
  const WASTE = range(0, NG).filter((n) => CAT[n]);

  // =========================================================== 1 · sprawl
  // One resource. Then two, four, eight… while the camera pulls back.
  const GEN1 = (g) => 0.7 + (g - 1) * 0.6;
  function sprawl(p, n, b) {
    const gd = grid(), ts = gd.cell * 0.8, [x, y] = gd.pos[n];
    if (n === 0) return rect(p, x, y, ts, ts, ts * 0.22, TCOL[0]);
    const t = clamp((b - GEN1(gd.gen[n]) - rnd[n] * 0.14) / 0.6);
    if (t <= 0) return hide(p);
    const e = E.outBack(t), q = gd.pos[gd.parent[n]], s = ts * lerp(0.55, 1, E.outCubic(t));
    rect(p, lerp(q[0], x, e), lerp(q[1], y, e), s, s, s * 0.22, TCOL[n]);
    p.o = clamp(t * 4);
  }
  const S1 = {
    name: 'sprawl',
    beats: 8,
    introBeat: 0.3,
    introPulse: 1,
    blend: { dur: 0.01 },
    camera(b) {
      const e = E.inOutCubic(clamp((b - 0.5) / 4.7)), z = lerp(3, 1, e), [x, y] = grid().pos[0];
      return { zoom: z, x: -x * z * (1 - e), y: -y * z * (1 - e) };
    },
    pose(i, b, p) {
      if (i < 1 || i > NG) return hide(p);
      sprawl(p, i - 1, b);
    },
    type: [{ at: 1.4, to: 7.6, text: 'Your Azure keeps *growing.' }],
    music(M) {
      M.pad(0, 'B2 F#3 D4 A4', 8, 0.3); M.sub(0, 'B1', 8, 0.2);
      M.thump(0, 0.4);
      for (let g = 1; g <= 7; g++) {
        const t = GEN1(g);
        M.marimba(t + 0.05, penta(g + 1, 4), 0.12 + g * 0.012, 0); M.thump(t + 0.05, 0.18 + g * 0.03);
        const n = Math.min(2 ** (g - 1), 8);
        for (let k = 1; k < n; k++) M.tick(t + 0.05 + k * 0.06, 0.02 + g * 0.003, (rnd[g * 9 + k] - 0.5) * 1.4);
      }
      M.ep(5.4, 'F#5', 0.14); M.ep(6.4, 'D5', 0.12); M.whoosh(7.0, 1.0, 0.03, 400, 1600);
    },
  };

  // =========================================================== 2 · waste
  // Idle ones go grey, oversized ones swell, orphans drift off; then the waste lights up orange.
  const IDLE2 = 0.5, OVER2 = 1.6, ORPH2 = 2.7, FLAG2 = 4.0;
  const WI = perLayout(() => { const gd = grid(), o = new Int16Array(NG); WASTE.slice().sort((a, b) => gd.pos[a][0] - gd.pos[b][0]).forEach((n, k) => (o[n] = k)); return o; });
  const flagAt = (n) => FLAG2 + WI()[n] * 0.045;
  function wasteTile(p, n, b) {
    const gd = grid(), ts = gd.cell * 0.8, [x, y] = gd.pos[n], cat = CAT[n], q = rnd[200 + n];
    let s = ts, X = x, Y = y, rot = 0, c = TCOL[n];
    if (cat === 1) { const e = E.inOutCubic(clamp((b - IDLE2 - q * 0.2) / 0.7)); c = mix(c, C.dim, e); s *= 1 - 0.16 * e; }
    else if (cat === 2) { const e = E.outBack(clamp((b - OVER2 - q * 0.2) / 0.7)); s *= 1 + 0.5 * e; }
    else if (cat === 3) {
      const e = E.outCubic(clamp((b - ORPH2 - q * 0.2) / 1.4)), L = Math.hypot(x, y) || 1;
      const d = gd.cell * ((0.45 + q * 0.5) * e + 0.05 * Math.max(0, b - ORPH2 - 1.4));
      X += (x / L) * d; Y += (y / L) * d; rot = (q - 0.5) * 1.1 * e;
    }
    if (cat) { const t = flagAt(n); c = mix(c, C.orange, clamp((b - t) / 0.3)); s *= 1 + 0.2 * hit(b, t, 5); }
    else c = mix(c, C.deep, 0.75 * E.inOutSine(clamp((b - FLAG2 - 0.5) / 1.4)));
    rect(p, X, Y, s, s, s * 0.22, c);
    p.rot = rot;
  }
  const S2 = {
    name: 'waste',
    beats: 9,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      if (i < 1 || i > NG) return hide(p);
      wasteTile(p, i - 1, b);
    },
    type: [
      { at: 0.5, to: 3.9, text: 'Idle. Oversized. Orphaned.', stagger: 1.1 },
      { at: 4.3, to: 8.6, text: 'Every enterprise carries | *Azure *debt.' },
    ],
    music(M) {
      M.pad(0, 'G2 D3 B3 F#4', 4, 0.28); M.sub(0, 'G1', 4, 0.2);
      M.ep(IDLE2, 'D4', 0.16); M.ep(IDLE2 + 0.35, 'A3', 0.12, -0.3);
      M.thump(OVER2, 0.5); M.boom(OVER2, 0.2); M.ep(OVER2, 'B4', 0.14);
      M.whoosh(ORPH2, 1.4, 0.05, 1400, 300); M.ep(ORPH2, 'F#4', 0.14, 0.4);
      M.pad(4, 'E2 B2 G3 D4', 5, 0.3); M.sub(4, 'E1', 5, 0.22);
      M.kick(FLAG2, 0.35); M.boom(FLAG2, 0.25);
      for (let k = 0; k < WASTE.length; k++) M.beep(FLAG2 + k * 0.045, k % 2 ? 'A5' : 'F#5', 0.035, (k / 23 - 0.5) * 1.4);
      for (let b = 6; b < 9; b += 2) M.kick(b, 0.2);
      M.ep(5.2, 'B4', 0.12); M.ep(6.6, 'D5', 0.12);
    },
  };

  // =========================================================== 3 · meet DEBT
  // The tiles nearest the circle snap into a ring of 48; DEBT runs it full circle.
  const M3 = perLayout(() => matchTo(S2, range(1, NG + 1), tickPos()));
  const FILL3 = (b) => E.inOutSine(clamp((b - 1.8) / 3.9)), DONE3 = 5.7;
  const S3 = {
    name: 'debt',
    beats: 8,
    blend: {
      start: (i) => { const k = M3().slot[i]; return i === 0 ? 0 : k >= 0 ? 0.05 + k * 0.01 : rnd[i] * 0.45; },
      dur: (i) => (M3().slot[i] >= 0 ? 1.2 : 0.6),
      arc: 0.06,
    },
    pose(i, b, p) {
      const done = hit(b, DONE3, 3);
      if (i === 0) {
        const g = E.outBack(clamp((b - 1.3) / 0.5));
        if (g <= 0) return hide(p);
        return rider(p, FILL3(b), tickT() * 2.4 * g * (1 + 0.5 * done));
      }
      const k = M3().slot[i];
      if (k < 0) return hide(p);
      tick(p, k, FILL3(b), 1, done);
    },
    type: [
      { at: 1.5, to: 7.6, text: '*DEBT', y: () => G.cy / G.H, size: 1.45, cls: 'brand', stagger: 0 },
      { at: 2.6, to: 7.6, text: 'Find, fix and prove | Azure savings. Automatically.' },
    ],
    music(M) {
      M.pad(0, 'D3 A3 F#4 C#5', 8, 0.3); M.sub(0, 'D2', 8, 0.22);
      M.whoosh(0, 1.3, 0.05, 2400, 500);
      M.kick(1.5, 0.4); M.boom(1.5, 0.3); M.bell(1.5, 'A5', 0.2); M.bell(1.75, 'D6', 0.14, 0.3);
      for (let k = 0; k < NT; k++) {
        const tb = 1.8 + (3.9 * Math.acos(1 - (2 * (k + 0.5)) / NT)) / PI;
        M.tick(tb, 0.03, Math.sin((k / NT) * TAU) * 0.7);
        if (k % 6 === 5) M.marimba(tb, penta(Math.floor(k / 6) + 2, 4), 0.1, Math.sin((k / NT) * TAU) * 0.7);
      }
      M.bell(DONE3, 'F#5', 0.22); M.bell(DONE3, 'D6', 0.14, -0.3); M.kick(DONE3, 0.35);
      M.ep(6.6, 'A5', 0.12); M.ep(7.3, 'E5', 0.1);
    },
  };

  // =========================================================== 4 · discover
  // The ring unrolls back into the estate, now unknown and dark. DEBT scans it like a beam of
  // light; then it's regrouped into the applications the business actually runs on.
  const SCAN4 = [1.0, 3.6], LAND4 = 4.8;
  const QT = [C.azure, C.teal, C.glow, C.violet];
  const beamX = (b) => { const gd = grid(), x0 = -gd.gw / 2 - gd.cell * 0.9; return lerp(x0, -x0, E.inOutSine(clamp((b - SCAN4[0]) / (SCAN4[1] - SCAN4[0])))); };
  const quad = (n) => { const gd = grid(); return [gd.col[n] < gd.cols / 2 ? -1 : 1, gd.row[n] < gd.rows / 2 ? -1 : 1]; };
  function scanTile(p, n, b) {
    const gd = grid(), ts = gd.cell * 0.8, [x, y] = gd.pos[n], cat = CAT[n];
    const dx = beamX(b) - x + gd.cell * 0.4, t = E.inOutSine(clamp(dx / (gd.cell * 1.8)));
    const flash = E.inOutSine(clamp(dx / (gd.cell * 1.2))) * Math.exp(-Math.max(0, dx) / (gd.cell * 1.6)) * (1 - clamp((b - SCAN4[1]) / 0.6));
    const [qx, qy] = quad(n), e = E.inOutCubic(clamp((b - LAND4 - (qx + 1) * 0.08 - (qy + 1) * 0.04) / 1.0));
    const fin = cat ? C.orange : mix(TCOL[n], QT[(qy > 0 ? 2 : 0) + (qx > 0 ? 1 : 0)], 0.85 * e);
    const s = ts * (1 + 0.2 * flash);
    rect(p, x + qx * gd.cell * 0.45 * e, y + qy * gd.cell * 0.45 * e, s, s, s * 0.22, mix(mix(C.tdim, fin, t), C.white, flash * 0.45));
  }
  const TAGS = ['SAP', 'E-commerce', 'Data platform', 'Customer portal'];
  const tagPos = (k) => { const gd = grid(), qx = k % 2 ? 1 : -1, qy = k > 1 ? 1 : -1; return [qx * (gd.gw / 4 + gd.cell * 0.22), qy * (gd.gh / 4 + gd.cell * 0.22)]; };
  const S4 = {
    name: 'discover',
    beats: 9,
    blend: {
      start: (i) => { const k = M3().slot[i]; return i === 0 || i === 149 ? 0 : k >= 0 ? 0.05 + k * 0.01 : 0.25 + rnd[i] * 0.5; },
      dur: (i) => (i === 0 ? 1.0 : M3().slot[i] >= 0 ? 1.1 : 0.6),
      arc: 0.06,
    },
    pose(i, b, p) {
      const gd = grid();
      if (i === 0 || i === 149) { // the beam and its glow
        const shrink = 1 - E.inOutCubic(clamp((b - SCAN4[1] - 0.1) / 0.8));
        if (shrink <= 0) return hide(p);
        const len = (gd.gh + gd.cell * 0.8) * shrink;
        if (i === 0) return pill(p, beamX(b), 0, len, gd.cell * 0.12, 0, C.teal);
        pill(p, beamX(b), 0, len, gd.cell * 1.1, 0, C.teal);
        p.r = gd.cell * 0.4; p.o = 0.13 * clamp((b - 0.6) / 0.4) * shrink;
        return;
      }
      if (i < 1 || i > NG) return hide(p);
      scanTile(p, i - 1, b);
    },
    type: [
      eyebrow(0.3, 8.6, '01 &middot; Discover'),
      { at: 0.8, to: 4.4, text: 'Before you can fix waste, | you have to *see *it.' },
      { at: 4.9, to: 8.6, text: 'Mapped to the apps | your business runs on.' },
    ].concat(TAGS.map((t, k) => ({
      at: 5.3 + k * 0.1, to: 8.6, fade: 0.6, html: '<span class="tag">' + t + '</span>',
      x: () => tagPos(k)[0], y: () => (G.cy + tagPos(k)[1]) / G.H, size: () => Math.max(11, G.F * 0.26),
    }))),
    music(M) {
      M.pad(0, 'B2 F#3 D4 A4', 4.8, 0.28); M.sub(0, 'B1', 4.8, 0.2);
      M.whoosh(0, 1.1, 0.05, 500, 2200);
      M.whoosh(SCAN4[0], SCAN4[1] - SCAN4[0], 0.05, 300, 3200);
      for (let c = 0; c < 12; c++) {
        const u = (c + 0.5) / 12, tb = SCAN4[0] + ((SCAN4[1] - SCAN4[0]) * Math.acos(1 - 2 * u)) / PI + 0.05;
        M.tick(tb, 0.03, (u - 0.5) * 1.4);
        if (c % 2) M.marimba(tb, penta(c % 5 === 0 ? 6 : 4 + (c % 3), 4), 0.1, (u - 0.5) * 1.4);
      }
      M.pad(LAND4, 'G2 D3 B3 F#4', 9 - LAND4, 0.3); M.sub(LAND4, 'G1', 9 - LAND4, 0.22);
      [0, 1, 2, 3].forEach((k) => M.ep(LAND4 + 0.3 + k * 0.12, ['D5', 'F#5', 'A5', 'B5'][k], 0.12, (k - 1.5) * 0.4));
      for (let b = 2; b < 9; b += 2) M.kick(b, 0.18);
    },
  };

  // =========================================================== 5 · evaluate
  // The waste lines up as bars sized by potential savings, sorts itself, and DEBT draws the line.
  const VAL = [1, 0.8, 0.64, 0.56, 0.5, 0.34, 0.24, 0.15], LBL = [0.16, 0.11, 0.19, 0.13, 0.17, 0.12, 0.15, 0.1];
  const UNS = [3, 6, 0, 5, 1, 7, 2, 4], SORT5 = 2.4, CUT5 = 4.3, KEEP = 5;
  const L5 = perLayout(() => {
    const listW = Math.min(G.W * 0.84, G.R * 3.2), rg = Math.min(G.R * 0.2, G.H * 0.058);
    return { listW, rg, xl0: -listW / 2, xb0: -listW / 2 + listW * 0.26, bl: listW * 0.72 };
  });
  const rowY = (s) => (s - 3.5) * L5().rg;
  const M5 = perLayout(() => {
    const L = L5(), t = [];
    for (let r = 0; r < 8; r++) t.push([L.xb0 + (VAL[r] * L.bl) / 2, rowY(UNS[r])]);
    for (let r = 0; r < 8; r++) t.push([L.xl0 + (LBL[r] * L.listW) / 2, rowY(UNS[r])]);
    return matchTo(S4, WASTE.map((n) => n + 1), t);
  });
  function row5(r, b) { // where row r sits at beat b of scene 5
    const e = E.inOutCubic(clamp((b - SORT5 - Math.abs(UNS[r] - r) * 0.03) / 1.1));
    return { y: lerp(rowY(UNS[r]), rowY(r), e), dx: Math.sin(PI * e) * (UNS[r] - r) * L5().rg * 0.18 };
  }
  const S5 = {
    name: 'evaluate',
    beats: 8,
    blend: {
      start: (i) => { const t = M5().slot[i]; return t >= 0 ? 0.05 + (t % 8) * 0.05 : rnd[i + 50] * 0.4; },
      dur: (i) => (M5().slot[i] >= 0 ? 1.2 : 0.6),
      arc: 0.1,
    },
    pose(i, b, p) {
      const L = L5();
      if (i === 0) {
        const g = E.inOutCubic(clamp((b - CUT5) / 1.0));
        if (g <= 0) return hide(p);
        const y = (rowY(KEEP - 1) + rowY(KEEP)) / 2, w = L.listW * 0.54 * g;
        return seg(p, -w, y, w, y, L.rg * 0.09, C.teal);
      }
      const t = M5().slot[i];
      if (t < 0) return hide(p);
      const r = t % 8, { y, dx } = row5(r, b);
      const nz = r >= KEEP ? E.inOutCubic(clamp((b - CUT5 - 0.5 - (r - KEEP) * 0.12) / 0.6)) : 0;
      const pk = r < KEEP ? hit(b, CUT5 + 0.4 + r * 0.08, 5) : 0;
      if (t < 8) {
        const th = L.rg * 0.46 * (1 + 0.25 * pk);
        seg(p, L.xb0 + dx, y, L.xb0 + dx + VAL[r] * L.bl, y, th, mix(mix(C.orange, C.amber, pk), C.dim, nz));
      } else seg(p, L.xl0 + dx, y, L.xl0 + dx + LBL[r] * L.listW, y, L.rg * 0.22, mix(C.steel, C.dim, nz));
      p.o = 1 - 0.45 * nz;
    },
    type: [
      eyebrow(0.3, 7.6, '02 &middot; Evaluate'),
      { at: 0.8, to: 4.2, text: 'Every finding, | sized by impact.' },
      { at: 4.7, to: 7.6, text: '*Signal. Not noise.' },
    ],
    music(M) {
      M.pad(0, 'D3 A3 F#4 C#5', 4.3, 0.28); M.sub(0, 'D2', 4.3, 0.2);
      M.whoosh(0, 1.2, 0.05, 1800, 500);
      for (let r = 0; r < 8; r++) M.marimba(1.1 + r * 0.05, penta(9 - r, 4), 0.1, (r / 7 - 0.5) * 0.8);
      M.whoosh(SORT5, 1.1, 0.05, 600, 2400);
      for (let k = 0; k < 8; k++) M.tick(SORT5 + 0.2 + k * 0.1, 0.03, (k / 7 - 0.5) * 0.8);
      M.thump(SORT5 + 1.1, 0.4);
      M.pad(CUT5, 'A2 E3 C#4 F#4', 8 - CUT5, 0.3); M.sub(CUT5, 'A1', 8 - CUT5, 0.22);
      M.bell(CUT5, 'E6', 0.16); M.snip(CUT5 + 0.3);
      for (let r = 0; r < KEEP; r++) M.marimba(CUT5 + 0.4 + r * 0.08, penta(5 + r, 4), 0.12, (r / 4 - 0.5) * 0.6);
      M.ep(CUT5 + 0.6, 'F#4', 0.1, 0.3); M.ep(CUT5 + 0.8, 'E4', 0.08, 0.4);
      M.kick(6, 0.2);
    },
  };

  // =========================================================== 6 · balance
  // The ranking becomes a seesaw: cost on one side; risk, continuity and business priorities
  // drop onto the other until it levels out.
  const R6 = perLayout(() => { const w = M5().who, r = new Int8Array(N).fill(-1); for (let k = 0; k < 16; k++) if (w[k] >= 0) r[w[k]] = k; return r; });
  const L6 = perLayout(() => {
    const Lb = Math.min(G.W * 0.84, G.R * 2.6), th = G.R * 0.055, bs = Math.min(G.R * 0.24, Lb / 2 / 5.2);
    return { Lb, th, bs, yb: G.R * 0.02, fs: G.R * 0.3 };
  });
  const TR6 = [2.1, 2.55, 3.0, 3.45], FALL6 = 0.42, LEVEL6 = TR6[3] + FALL6;
  const RC6 = [C.teal, C.azure, C.glow, C.violet];
  const lw6 = (b) => E.spring(clamp((b - 0.5) / 1.1));
  const rw6 = (b, k) => E.spring(clamp((b - TR6[k] - FALL6) / 0.9));
  const theta6 = (b) => { let r = 0; for (let k = 0; k < 4; k++) r += rw6(b, k); return (-0.21 * (4 * lw6(b) - r)) / 4; };
  const uL6 = (k) => -L6().Lb / 2 + L6().bs * (0.75 + k * 1.15), uR6 = (k) => -uL6(k);
  function onBeam(p, u, lift, b, c) {
    const L = L6(), a = theta6(b), cs = Math.cos(a), sn = Math.sin(a), off = L.th / 2 + L.bs / 2 + lift;
    rect(p, u * cs + sn * off, L.yb + u * sn - cs * off, L.bs, L.bs, L.bs * 0.2, c);
    p.rot = a - PI / 2; p.sym = PI / 2;
  }
  const fulY6 = () => L6().yb + L6().th / 2 + 0.707 * L6().fs;
  const S6 = {
    name: 'balance',
    beats: 8,
    blend: {
      start: (i) => { const r = R6()[i]; return i === 0 ? 0.1 : r >= 0 && r < 8 ? 0.05 + r * 0.06 : 0; },
      dur: (i) => (i === 0 ? 1.0 : R6()[i] >= 0 && R6()[i] < 8 ? 1.2 : 0.6),
      arc: 0.08,
      fresh: (i) => i >= 97 && i <= 100,
    },
    pose(i, b, p) {
      const L = L6(), a = theta6(b), lv = E.inOutSine(clamp((b - LEVEL6 - 0.3) / 0.8));
      if (i === 0) {
        circle(p, 0, L.yb, L.th * 1.7 * (1 + 0.5 * maxHit(b, TR6.map((t) => t + FALL6).concat([LEVEL6 + 0.6]), 5)), C.teal);
        return;
      }
      if (i >= 97 && i <= 100) {
        const k = i - 97, t = clamp((b - TR6[k]) / FALL6);
        if (t <= 0) return hide(p);
        onBeam(p, uR6(k), (1 - t * t) * G.R * 1.3, b, RC6[k]);
        p.o = clamp(t * 5);
        return;
      }
      const r = R6()[i];
      if (r < 0 || r >= 7) return hide(p);
      if (r < 4) return onBeam(p, uL6(r), 0, b, mix(C.orange, C.amber, 0.25 * hit(b, 0.5 + 1.1, 3)));
      if (r === 4) {
        const h = L.Lb / 2, cs = Math.cos(a), sn = Math.sin(a);
        return seg(p, -h * cs, L.yb - h * sn, h * cs, L.yb + h * sn, L.th, mix(C.silver, C.teal, lv));
      }
      if (r === 5) { circle(p, 0, fulY6(), L.fs, C.azure); p.tip = 1; p.rot = PI / 4; return; }
      const fy = fulY6() + L.fs / 2 + L.th * 0.3;
      seg(p, -L.Lb * 0.28, fy, L.Lb * 0.28, fy, L.th * 0.6, C.slate);
    },
    type: [
      eyebrow(0.3, 7.6, '03 &middot; Balance'),
      { at: 0.8, to: 4.4, text: 'Cost, risk and continuity, | in *balance.' },
      { at: 4.8, to: 7.6, text: 'A plan every team | can execute.' },
    ],
    music(M) {
      M.pad(0, 'G2 D3 B3 F#4', 4, 0.28); M.sub(0, 'G1', 4, 0.2);
      M.whoosh(0, 1.2, 0.04, 1600, 500);
      M.thump(1.0, 0.4); M.ep(1.0, 'D4', 0.14, -0.4); M.ep(1.25, 'B3', 0.1, -0.5);
      TR6.forEach((t, k) => { M.whoosh(t, FALL6, 0.02, 2600, 900); M.thump(t + FALL6, 0.34); M.marimba(t + FALL6, penta(5 + k, 4), 0.14, 0.5); });
      M.pad(4, 'D3 A3 F#4 E5', 4, 0.3); M.sub(4, 'D2', 4, 0.22);
      M.bell(LEVEL6 + 0.6, 'A5', 0.18); M.bell(LEVEL6 + 0.85, 'D6', 0.12, 0.3);
      M.kick(6, 0.2);
    },
  };

  // =========================================================== 7 · transform
  // The beam becomes the axis of the monthly bill. DEBT hops across it, squashing each orange
  // cap of waste; a ghost line keeps the old height as proof.
  const L7 = perLayout(() => { const Wc = Math.min(G.W * 0.84, G.R * 3.1), sp = Wc / 12; return { Wc, sp, bw: sp * 0.56, Y0: G.R * 0.72, Hm: G.R * 1.3, ath: Math.max(2, G.R * 0.018) }; });
  const HB = range(0, 12).map((m) => 0.5 + 0.38 * (m / 11) + 0.12 * rnd[300 + m]);
  const WF = 0.26, TH7 = (m) => 2.6 + 0.3 * m, HOP7 = 0.18;
  const xm = (m) => (m - 5.5) * L7().sp;
  const grow7 = (m, b) => E.outCubic(clamp((b - 0.6 - m * 0.06) / 0.8));
  const pop7 = (m, b) => E.inOutCubic(clamp((b - TH7(m)) / 0.14));
  const hk7 = (m, b) => L7().Hm * HB[m] * (1 - WF) * grow7(m, b);
  const hc7 = (m, b) => L7().Hm * HB[m] * WF * lerp(0.4, 1, grow7(m, b)) * (1 - pop7(m, b));
  const top7 = (m, b) => L7().Y0 - hk7(m, b) - hc7(m, b) - (hc7(m, b) > 0.5 ? 2 : 0);
  const M7 = perLayout(() => {
    const w = M5().who, cand = [w[0], w[1], w[2], w[3]].concat(range(113, 125));
    return matchTo(S6, cand, range(0, 12).map((m) => [xm(m), L7().Y0 - L7().Hm * HB[m] * (1 - WF / 2)]));
  });
  function hopper(b, T, hd, P, hh) { // lands on P(k) at T[k]; P(-1) is where it waits
    let m = -1;
    for (let k = 0; k < T.length; k++) if (b >= T[k] - hd) m = k;
    if (m < 0) return [P(-1)[0], P(-1)[1], 0];
    const t = clamp((b - T[m] + hd) / hd), a = P(m - 1), c = P(m);
    if (t >= 1) return [c[0], c[1], hit(b, T[m], 8)];
    const e = E.inOutSine(t);
    return [lerp(a[0], c[0], e), lerp(a[1], c[1], e) - hh * Math.sin(PI * t), 0];
  }
  const T7 = range(0, 13).map(TH7);
  const S7 = {
    name: 'transform',
    beats: 9,
    blend: {
      start: (i) => (M7().slot[i] >= 0 ? 0.1 + M7().slot[i] * 0.03 : 0),
      dur: (i) => (i === 0 ? 1.2 : M7().slot[i] >= 0 ? 1.3 : 0.7),
      arc: 0.1,
      fresh: (i) => i >= 101 && i <= 136,
    },
    pose(i, b, p) {
      const L = L7();
      if (i === 0) {
        const d = L.bw * 0.62;
        const P = (k) => (k < 0 ? [xm(0) - L.sp, L.Y0 - L.ath / 2 - d / 2] : k >= 12 ? [xm(11) + L.sp, L.Y0 - L.ath / 2 - d / 2] : [xm(k), top7(k, b) - d / 2]);
        const [x, y, h] = hopper(b, T7, HOP7, P, G.R * 0.18);
        circle(p, x, y + (d * 0.12 * h), d, C.teal);
        p.w = d * (1 + 0.3 * h); p.h = d * (1 - 0.24 * h);
        return;
      }
      if (R6()[i] === 4) return seg(p, -L.Wc / 2 - L.sp * 0.2, L.Y0 + L.ath / 2, L.Wc / 2 + L.sp * 0.2, L.Y0 + L.ath / 2, L.ath, C.slate);
      const cm = M7().slot[i];
      if (cm >= 0) {
        const hc = hc7(cm, b), pp = pop7(cm, b), w = L.bw * (1 + 0.35 * pp);
        return rect(p, xm(cm), L.Y0 - hk7(cm, b) - 2 - hc / 2, w, hc, Math.min(L.bw * 0.14, hc / 2), mix(C.orange, C.amber, pp));
      }
      if (i >= 101 && i <= 112) {
        const m = i - 101, hk = hk7(m, b);
        return rect(p, xm(m), L.Y0 - hk / 2, L.bw, hk, L.bw * 0.12, mix(TCOL[m * 7], C.teal, 0.6 * pop7(m, b)));
      }
      if (i >= 125 && i <= 136) {
        const m = i - 125, pp = pop7(m, b);
        if (pp <= 0) return hide(p);
        rect(p, xm(m), L.Y0 - L.Hm * HB[m] * grow7(m, b), L.bw * lerp(0.6, 1.3, pp), Math.max(1.5, G.R * 0.01), 1, C.steel);
        p.o = 0.7 * pp;
        return;
      }
      hide(p);
    },
    type: [
      eyebrow(0.3, 8.6, '04 &middot; Transform'),
      { at: 0.8, to: 4.6, text: 'Close waste | at the source.' },
      { at: 5.0, to: 8.6, text: 'And prove every | *euro *saved.' },
    ],
    music(M) {
      M.pad(0, 'B2 F#3 D4 A4', 5, 0.28); M.sub(0, 'B1', 5, 0.2);
      M.whoosh(0, 1.2, 0.04, 400, 1400);
      for (let m = 0; m < 12; m++) M.tick(0.65 + m * 0.06, 0.025, (m / 11 - 0.5) * 1.2);
      M.thump(1.4, 0.3);
      for (let m = 0; m < 12; m++) {
        const pan = (m / 11 - 0.5) * 1.2;
        M.marimba(TH7(m), penta(3 + m, 3), 0.12 + m * 0.004, pan); M.snip(TH7(m) + 0.04);
        if (m % 4 === 3) M.thump(TH7(m), 0.3);
      }
      M.pad(5, 'G2 D3 B3 F#4', 4, 0.3); M.sub(5, 'G1', 4, 0.22);
      M.bell(TH7(12), 'B5', 0.16, 0.5); M.bell(TH7(12) + 0.25, 'F#5', 0.12, 0.3);
      M.kick(7, 0.2); M.ep(7.5, 'D5', 0.1);
    },
  };

  // =========================================================== 8 · results
  // Bars, caps and ghost lines close back into the ring; it fills to the real numbers.
  const M8 = perLayout(() => matchTo(S7, range(101, 149), tickPos()));
  const E81 = (b) => E.inOutSine(clamp((b - 1.4) / 2.2)), E82 = (b) => E.inOutSine(clamp((b - 4.8) / 2.0));
  const fill8 = (b) => (b < 4.2 ? 0.248 * E81(b) : b < 4.8 ? 0.248 * (1 - E.inOutCubic(clamp((b - 4.2) / 0.5))) : 0.96 * E82(b));
  const S8 = {
    name: 'results',
    beats: 9,
    blend: {
      start: (i) => (i === 0 ? 0 : M8().slot[i] >= 0 ? 0.05 + M8().slot[i] * 0.012 : 0),
      dur: (i) => (i === 0 ? 1.3 : M8().slot[i] >= 0 ? 1.2 : 0.7),
      arc: 0.08,
    },
    pose(i, b, p) {
      const done = hit(b, 3.6, 4) + hit(b, 6.8, 4);
      if (i === 0) return rider(p, fill8(b), tickT() * 2.4 * (1 + 0.5 * done));
      const k = M8().slot[i];
      if (k < 0) return hide(p);
      tick(p, k, fill8(b), 1, done * 0.6);
    },
    type: [
      { at: 1.2, to: 4.3, fn: (b) => (24.8 * E81(b)).toFixed(1) + '%', y: () => G.cy / G.H, size: 1.2, cls: 'num' },
      { at: 1.6, to: 4.3, text: 'Average savings on Azure.' },
      { at: 4.8, to: 8.6, fn: (b) => Math.round(96 * E82(b)) + '%', y: () => G.cy / G.H, size: 1.2, cls: 'num' },
      { at: 5.1, to: 8.6, text: 'Of recommendations | *closed.' },
    ],
    music(M) {
      M.pad(0, 'D3 A3 F#4 C#5', 4.5, 0.3); M.sub(0, 'D2', 4.5, 0.22);
      M.whoosh(0, 1.2, 0.05, 2200, 500);
      for (let k = 0; k < 12; k++) M.tick(1.4 + (2.2 * Math.acos(1 - (2 * (k + 0.5)) / 12)) / PI, 0.03, (k / 11 - 0.5) * 0.6);
      M.marimba(1.6, 'D5', 0.12); M.marimba(2.4, 'F#5', 0.12); M.marimba(3.1, 'A5', 0.12);
      M.bell(3.6, 'D6', 0.18); M.kick(3.6, 0.3);
      M.whoosh(4.2, 0.6, 0.03, 2000, 400);
      M.pad(4.5, 'B2 F#3 D4 A4', 4.5, 0.3); M.sub(4.5, 'B1', 4.5, 0.22);
      for (let k = 0; k < 40; k++) M.tick(4.8 + (2.0 * Math.acos(1 - (2 * (k + 0.5)) / 40)) / PI, 0.025, Math.sin((k / 40) * TAU) * 0.7);
      [0, 1, 2, 3, 4].forEach((k) => M.marimba(4.9 + k * 0.4, penta(5 + k, 4), 0.12, (k - 2) * 0.3));
      M.bell(6.8, 'F#5', 0.2); M.bell(6.8, 'B5', 0.14, 0.3); M.kick(6.8, 0.35); M.boom(6.8, 0.2);
    },
  };

  // =========================================================== 9 · secure by design
  // The ring straightens into the boundary of your own Azure tenant; DEBT works inside it,
  // your resources circle around it, and the boundary seals.
  const T9 = perLayout(() => {
    const BW = Math.min(G.W * 0.8, G.R * 2.9), BH = G.R * 1.5, rr = G.R * 0.3, sx = BW - 2 * rr, sy = BH - 2 * rr, arc = (PI * rr) / 2;
    return { BW, BH, rr, sx, sy, arc, P: 2 * sx + 2 * sy + 4 * arc };
  });
  function perim(s) { // point and tangent on the rounded rectangle, from the top centre, clockwise
    const T = T9(), { sx, sy, rr, arc } = T;
    const lines = [[0, -T.BH / 2, 0, sx / 2], [sx / 2, -sy / 2, -PI / 2, arc, 1], [T.BW / 2, -sy / 2, PI / 2, sy], [sx / 2, sy / 2, 0, arc, 1],
      [sx / 2, T.BH / 2, PI, sx], [-sx / 2, sy / 2, PI / 2, arc, 1], [-T.BW / 2, sy / 2, -PI / 2, sy], [-sx / 2, -sy / 2, PI, arc, 1], [-sx / 2, -T.BH / 2, 0, sx / 2]];
    s = ((s % T.P) + T.P) % T.P;
    for (let n = 0; n < lines.length; n++) {
      const [x, y, a, len, corner] = lines[n];
      if (s <= len || n === lines.length - 1) {
        if (corner) { const t = a + (s / len) * (PI / 2); return [x + Math.cos(t) * rr, y + Math.sin(t) * rr, t + PI / 2]; }
        return [x + Math.cos(a) * s, y + Math.sin(a) * s, a];
      }
      s -= len;
    }
    return [0, -T.BH / 2, 0];
  }
  const SEAL9 = 4.8;
  const S9 = {
    name: 'secure',
    beats: 9,
    blend: {
      start: (i) => (M8().slot[i] >= 0 ? 0.05 + M8().slot[i] * 0.01 : 0.3 + rnd[i] * 0.4),
      dur: (i) => (M8().slot[i] >= 0 ? 1.3 : 0.8),
      arc: 0.04,
    },
    pose(i, b, p) {
      const T = T9(), seal = E.inOutCubic(clamp((b - SEAL9) / 0.6)), sp = hit(b, SEAL9 + 0.6, 3);
      if (i === 0) {
        circle(p, 0, 0, G.R * 0.26 * (1 + 0.04 * Math.sin(b * PI) + 0.15 * sp), C.teal);
        return;
      }
      const k = M8().slot[i];
      if (k >= 0) {
        const [x, y, ta] = perim(((k + 0.5) / NT) * T.P), gap = T.P / NT;
        pill(p, x, y, gap * lerp(0.42, 1.04, seal), tickT() * (1 + 0.3 * sp), ta - PI / 2, mix(mix(C.steel, C.azure, seal), C.glow, sp * 0.6));
        p.o = lerp(0.8, 1, seal);
        return;
      }
      if (i >= 1 && i <= 12) {
        const j = i - 1, q = j % 3, ax = T.BW * (0.17 + 0.09 * q), ay = T.BH * (0.16 + 0.08 * q) * (1 - 0.1 * seal);
        const a = (j / 12) * TAU + b * (0.55 - q * 0.12) + q * 0.5, s = G.R * 0.1;
        rect(p, Math.cos(a) * ax, Math.sin(a) * ay, s, s, s * 0.22, mix(TCOL[j * 5], C.glow, 0.35 * sp));
        p.rot = a * 0.5;
        return;
      }
      hide(p);
    },
    type: [
      eyebrow(0.3, 8.6, 'Secure by design'),
      { at: 1.3, to: 8.6, fade: 0.8, html: '<span class="tag">Your Azure tenant</span>', y: () => (G.cy - T9().BH / 2) / G.H, size: () => Math.max(11, G.F * 0.26) },
      { at: 0.8, to: 4.4, text: 'DEBT runs inside | your own *Azure *tenant.' },
      { at: 5.0, to: 8.6, text: 'Your data | never *leaves.' },
    ],
    music(M) {
      M.pad(0, 'E2 B2 G3 D4', 4.8, 0.28); M.sub(0, 'E1', 4.8, 0.2);
      M.whoosh(0, 1.3, 0.04, 1800, 600);
      for (let k = 0; k < 12; k++) M.marimba(1.4 + k * 0.25, penta([0, 2, 4, 3][k % 4] + 5 + Math.floor(k / 4), 3), 0.08, Math.sin(k) * 0.6);
      M.pad(SEAL9, 'G2 D3 B3 F#4', 9 - SEAL9, 0.3); M.sub(SEAL9, 'G1', 9 - SEAL9, 0.22);
      M.whoosh(SEAL9, 0.6, 0.04, 600, 2200);
      M.kick(SEAL9 + 0.6, 0.4); M.boom(SEAL9 + 0.6, 0.3); M.bell(SEAL9 + 0.6, 'B5', 0.18); M.bell(SEAL9 + 0.85, 'F#5', 0.12, -0.3);
      M.ep(6.6, 'D5', 0.12); M.ep(7.4, 'A4', 0.1); M.kick(7.4, 0.2);
    },
  };

  // =========================================================== 10 · the team
  // Four people light up one by one; around each, fifteen years of Azure.
  const A10 = perLayout(() => { // a row of four; two by two on portrait screens
    if (G.portrait) {
      const sp = Math.min(G.W * 0.42, G.R * 1.1), d = Math.min(G.R * 0.46, sp * 0.6);
      return { sp, d, y: -G.R * 0.05, pos: range(0, 4).map((j) => [((j % 2) - 0.5) * sp, -G.R * 0.05 + (Math.floor(j / 2) - 0.5) * d * 2.1]) };
    }
    const sp = Math.min((G.W * 0.84) / 4, G.R), d = Math.min(G.R * 0.46, sp * 0.6);
    return { sp, d, y: -G.R * 0.12, pos: range(0, 4).map((j) => [(j - 1.5) * sp, -G.R * 0.12]) };
  });
  const ax10 = (j) => A10().pos[j][0], ay10 = (j) => A10().pos[j][1];
  const yt10 = (j, k) => { const A = A10(), a = -PI / 2 + (k / 15) * TAU, R = A.d * 0.7; return [ax10(j) + Math.cos(a) * R, ay10(j) + Math.sin(a) * R, a]; };
  const M10 = perLayout(() => {
    const t = [];
    for (let j = 0; j < 4; j++) for (let k = 0; k < 15; k++) t.push(yt10(j, k));
    return matchTo(S9, range(101, 149).concat(range(89, 101)), t);
  });
  const TJ10 = [1.1, 1.5, 1.9, 2.3, 3.2], YF10 = (j, k) => 4.2 + k * 0.14 + j * 0.03;
  const lit10 = (j, b) => E.outCubic(clamp((b - TJ10[j]) / 0.35));
  const NAMES = ['Dennis', 'Ton', 'Erik', 'Bram'];
  const S10 = {
    name: 'team',
    beats: 8,
    blend: {
      start: (i) => (M10().slot[i] >= 0 ? 0.05 + (M10().slot[i] % 15) * 0.02 : i <= 12 ? 0.1 + i * 0.02 : 0),
      dur: (i) => (M10().slot[i] >= 0 || i <= 12 ? 1.2 : 0.7),
      arc: 0.1,
    },
    pose(i, b, p) {
      const A = A10(), d = A.d;
      if (i === 0) {
        const s = G.R * 0.075;
        const P = (k) => (k < 0 ? [0, 0] : k > 3 ? [0, Math.min(ay10(0), ay10(3)) - d * 0.95] : [ax10(k), ay10(k) - d * 0.5 - s * 0.5]);
        const [x, y, h] = hopper(b, TJ10, 0.3, P, G.R * 0.22);
        circle(p, x, y, s * (1 + 0.3 * h), C.teal);
        return;
      }
      const k = M10().slot[i];
      if (k >= 0) {
        const j = Math.floor(k / 15), t = k % 15, [x, y, a] = yt10(j, t), f = clamp((b - YF10(j, t)) / 0.25);
        pill(p, x, y, d * 0.13 * (1 + 0.5 * hit(b, YF10(j, t), 6)), Math.max(2, d * 0.045), a - PI / 2, mix(C.dim, grad(t / 14), f));
        return;
      }
      if (i >= 1 && i <= 12) {
        const j = Math.floor((i - 1) / 3), part = (i - 1) % 3, x = ax10(j), l = lit10(j, b);
        if (part === 0) return circle(p, x, ay10(j), d * (1 + 0.08 * hit(b, TJ10[j], 5)), mix(C.tdim, C.card, l));
        const c = mix(C.slate, C.silver, l);
        if (part === 1) return circle(p, x, ay10(j) - d * 0.13, d * 0.34, c);
        rect(p, x, ay10(j) + d * 0.3, d * 0.62, d * 0.3, d * 0.15, c);
        return;
      }
      hide(p);
    },
    type: [
      { at: 0.6, to: 4.0, text: 'Built by 4 | *ex-Microsofties.' },
      { at: 4.4, to: 7.6, text: '*60+ *years of Azure.' },
    ].concat(NAMES.map((n, j) => ({
      at: TJ10[j] + 0.1, to: 7.6, text: n, cls: 'name', stagger: 0,
      x: () => ax10(j), y: () => (G.cy + ay10(j) + A10().d * 0.98 + Math.max(11, G.F * 0.24)) / G.H, size: () => Math.max(11, G.F * 0.26),
    }))),
    music(M) {
      M.pad(0, 'B2 F#3 D4 A4', 4, 0.28); M.sub(0, 'B1', 4, 0.2);
      M.whoosh(0, 1.2, 0.04, 2000, 600);
      TJ10.slice(0, 4).forEach((t, j) => { M.marimba(t, ['F#5', 'A5', 'B5', 'D6'][j], 0.16, (j - 1.5) * 0.4); M.thump(t, 0.3); });
      M.pad(4, 'D3 A3 F#4 C#5', 4, 0.3); M.sub(4, 'D2', 4, 0.22);
      for (let k = 0; k < 15; k++) { M.tick(YF10(0, k), 0.03, Math.sin((k / 15) * TAU) * 0.6); if (k % 3 === 2) M.marimba(YF10(0, k), penta(2 + Math.floor(k / 3), 4), 0.09); }
      M.bell(6.4, 'A5', 0.16); M.kick(6.4, 0.3);
    },
  };

  // =========================================================== 11 · finale
  // The message, one last full circle, and then DEBT falls like a drop into water: the ripples
  // become the Full Circle IT logo. Then the button.
  const TILT = 1.35, TXT11 = [0.6, 4.4], RING11 = 4.4, FILL11 = [5.0, 7.2], MORPH11 = [7.4, 8.4], SPLASH11 = 8.8, WM11 = 9.4, EYE11 = 10.1;
  const BTN11 = [10.6, 11.5], SHOW11 = 11.5;
  const fs11 = () => Math.min(G.W * 0.07, G.R * 0.2, 60);
  const CTA_Y = () => (G.portrait ? 0.66 : 0.68);
  const RW = () => fs11() * 2.2, BWO = () => fs11() * 0.12;
  function measure(sel, cache) {
    const el = document.querySelector(sel);
    if (!el) return null;
    const now = performance.now();
    if (cache.v !== G.version || now - cache.at > 250 || !cache.r) {
      const r = el.getBoundingClientRect();
      cache.v = G.version; cache.at = now;
      cache.r = r.width ? { x: r.left + r.width / 2 - G.cx, y: r.top + r.height / 2 - G.cy, w: r.width, h: r.height } : null;
    }
    return cache.r;
  }
  const gapC = { v: -1, at: 0, r: null }, btnC = { v: -1, at: 0, r: null };
  const gap = () => measure('#type .wm .gap', gapC) || { x: -fs11() * 1.45, y: 0 };
  const button = () => measure('#type .line.link a', btnC);
  const fill11 = (b) => E.inOutSine(clamp((b - FILL11[0]) / (FILL11[1] - FILL11[0])));
  const mo11 = (b) => E.inOutCubic(clamp((b - MORPH11[0]) / (MORPH11[1] - MORPH11[0])));
  const tilted = (p, cx, cy, x, y, tl) => { p.x = cx + x; p.y = cy + y * Math.cos(tl); p.z = y * Math.sin(tl); p.tl = tl; };
  const ripple = (b, dl) => E.outCubic(clamp((b - SPLASH11 - dl) / 0.9));
  const S11 = {
    name: 'finale',
    beats: 15,
    blend: { start: (i) => (i === 0 ? 0 : rnd[i] * 0.3), dur: (i) => (i === 0 ? 1.2 : 0.7) },
    pose(i, b, p) {
      const fs = fs11(), g = gap(), e = mo11(b), cx = lerp(0, g.x, e), cy = lerp(0, g.y, e), tl = TILT * e, rw = RW();
      const white = C.white;
      if (i === 0) {
        const d = tickT() * 2.4 * (1 + 0.5 * hit(b, FILL11[1], 4));
        if (b < MORPH11[0]) {
          const a = E.inOutCubic(clamp((b - RING11) / 0.75));
          const s = lerp(G.R * 0.07, d, a) * (1 + 0.25 * maxHit(b, [1, 2, 3, 4], 5) * (1 - a));
          const top = [Math.cos(-PI / 2 + fill11(b) * TAU) * ringR(), Math.sin(-PI / 2 + fill11(b) * TAU) * ringR()];
          return circle(p, lerp(0, top[0], a), lerp(G.R * 0.95, top[1], a) - Math.sin(PI * a) * G.R * 0.2, s, C.teal);
        }
        if (b < SPLASH11) { // drift up above the logo as a drop, then fall
          const u = E.inOutCubic(clamp((b - MORPH11[0]) / (MORPH11[1] - MORPH11[0]))), f = clamp((b - MORPH11[1]) / (SPLASH11 - MORPH11[1]));
          const hy = g.y - fs * 2.6, sz = lerp(d, fs * 0.44, u);
          const x = lerp(0, g.x, u), y = lerp(-ringR(), hy, u) + (g.y - hy) * f * f;
          circle(p, x, y + 0.707 * sz * u, sz * (1 - 0.35 * f * f), C.teal);
          p.h = sz * (1 + 0.25 * f * f); p.tip = u; p.rot = PI / 4;
          return;
        }
        const r = E.outBack(clamp((b - SPLASH11 - 0.25) / 0.6));
        if (r <= 0) return hide(p);
        return circle(p, g.x, g.y - fs * 0.5 * r, fs * 0.37 * r, mix(C.teal, white, clamp((b - SPLASH11 - 0.3) / 0.6)));
      }
      if (i >= 101 && i <= 148) {
        const k = i - 101, grow = E.outBack(clamp((b - RING11 - k * 0.008) / 0.5));
        if (grow <= 0) return hide(p);
        const a = tickAng(k), R = lerp(ringR(), rw / 2, e), done = hit(b, FILL11[1], 3);
        tick(p, k, fill11(b), grow, done * (1 - e));
        tilted(p, cx, cy, Math.cos(a) * R * (1 + done * 0.05 * (1 - e)), Math.sin(a) * R * (1 + done * 0.05 * (1 - e)), tl);
        p.h = lerp(p.h, (TAU * R) / NT * 1.1, e); p.w = lerp(p.w, BWO(), e); p.r = p.w / 2;
        p.rot = a - PI / 2 + (e * PI) / 2;
        p.c = mix(p.c, white, e);
        p.o *= 1 - clamp((b - MORPH11[1] + 0.2) / 0.4);
        return;
      }
      const on = clamp((b - MORPH11[1] + 0.2) / 0.4);
      if (i === 149) { // the outer ring
        if (on <= 0) return hide(p);
        const s = rw + BWO(), pu = 1 + 0.06 * hit(b, SPLASH11, 3);
        circle(p, 0, 0, s * pu, white); p.bw = BWO(); tilted(p, g.x, g.y, 0, 0, TILT);
        return;
      }
      if (i >= 97 && i <= 99) { // the ripples and the centre
        const f = [0.2, 0.44, 0.72][i - 97], rp = ripple(b, (i - 97) * 0.08);
        if (rp <= 0) return hide(p);
        const s = rw * f * rp + (i > 97 ? fs * 0.1 : 0);
        circle(p, 0, 0, s, white); if (i > 97) p.bw = fs * (i === 99 ? 0.1 : 0.09);
        tilted(p, g.x, g.y, 0, 0, TILT);
        return;
      }
      if (i === 96 || i === 94) { // the stems
        const up = i === 96, t = E.outCubic(clamp((b - SPLASH11 - (up ? 0.3 : 0.4)) / 0.5));
        if (t <= 0) return hide(p);
        const y1 = (up ? -0.5 : 0.52) * fs * t;
        return seg(p, g.x, g.y, g.x, g.y + y1, fs * 0.075, white);
      }
      if (i === 95) { // the reflection
        const t = E.outBack(clamp((b - SPLASH11 - 0.4) / 0.6));
        if (t <= 0) return hide(p);
        return circle(p, g.x, g.y + fs * 0.52 * t, fs * 0.36 * t, white);
      }
      if (i === 93) { // the button
        if (b < BTN11[0] - 0.4 || b > SHOW11 + 1.2) return hide(p);
        const est = { x: 0, y: G.H * CTA_Y() - G.cy - G.F * 0.3, w: Math.max(260, G.F * 4), h: 52 }, bt = button() || est;
        const a = E.outBack(clamp((b - BTN11[0] + 0.4) / 0.4)), st = E.inOutCubic(clamp((b - BTN11[0]) / (BTN11[1] - BTN11[0])));
        const d = bt.h * 0.5 * a;
        return rect(p, bt.x, bt.y, lerp(d, bt.w, st), lerp(d, bt.h, st), lerp(d / 2, 8, st), C.azure);
      }
      hide(p);
    },
    type: [
      { at: TXT11[0], to: TXT11[1], text: 'Stop *wasting | Azure *budget.', y: () => G.cy / G.H, size: 1.2, cls: 'heavy', stagger: 0.16 },
      { at: FILL11[0], to: FILL11[1] + 0.2, text: 'From waste to savings.' },
      {
        at: MORPH11[0], show: WM11, to: Infinity, fade: 1.1, cls: 'wmline', y: () => G.cy / G.H, size: fs11,
        html: '<span class="wm" aria-label="Full Circle IT"><span>FULL</span><i class="gap"></i><span>CIRCLE IT</span></span>',
      },
      { at: EYE11, to: Infinity, fade: 0.9, html: '<span class="pill"><i></i>The Azure Cloud Waste Company</span>', cls: 'eyebrow', y: () => (G.cy + fs11() * 1.9) / G.H },
      {
        at: BTN11[0] - 0.4, show: SHOW11, to: Infinity, cls: 'link', y: CTA_Y, fade: 0.8,
        html: '<a href="https://fullcircleit.nl" target="_blank" rel="noopener">Explore DEBT at fullcircleit.nl&nbsp;&rarr;</a>' +
          '<small>Free on Azure Marketplace &middot; Up and running in 30 minutes &middot; Your data stays in your tenant</small>',
      },
    ],
    music(M) {
      M.pad(0, 'B2 F#3 D4 A4', 4.4, 0.3); M.sub(0, 'B1', 4.4, 0.24);
      [1, 2, 3, 4].forEach((t, k) => M.thump(t, k % 2 ? 0.3 : 0.44));
      M.kick(TXT11[0], 0.35); M.ep(TXT11[0], 'F#5', 0.16); M.ep(TXT11[0] + 0.9, 'D5', 0.14); M.ep(2.5, 'B4', 0.14); M.ep(3.4, 'A4', 0.12);
      M.pad(RING11, 'G2 D3 B3 F#4', 3, 0.3); M.sub(RING11, 'G1', 3, 0.22);
      M.whoosh(RING11, 0.6, 0.04, 500, 2200);
      for (let k = 0; k < 24; k++) {
        const tb = FILL11[0] + ((FILL11[1] - FILL11[0]) * Math.acos(1 - (2 * (k + 0.5)) / 24)) / PI;
        M.tick(tb, 0.028, Math.sin((k / 24) * TAU) * 0.7);
        if (k % 3 === 1) M.marimba(tb, penta(Math.floor(k / 3) + 3, 4), 0.1, Math.sin((k / 24) * TAU) * 0.7);
      }
      M.bell(FILL11[1], 'D6', 0.18); M.kick(FILL11[1], 0.3);
      M.pad(FILL11[1] + 0.2, 'A2 E3 C#4 F#4', SPLASH11 - FILL11[1] - 0.2, 0.26);
      M.whoosh(MORPH11[0], 1.0, 0.04, 2400, 700);
      M.whoosh(MORPH11[1], SPLASH11 - MORPH11[1], 0.03, 900, 3000);
      M.drop(SPLASH11, 'B5', 0.28); M.splash(SPLASH11, 0.3); M.boom(SPLASH11, 0.35); M.kick(SPLASH11, 0.4);
      M.pad(SPLASH11, 'D3 A3 F#4 C#5', 15 - SPLASH11, 0.32); M.sub(SPLASH11, 'D2', 15 - SPLASH11, 0.24);
      M.bell(SPLASH11 + 0.3, 'F#5', 0.2); M.bell(SPLASH11 + 0.55, 'A5', 0.15, 0.3); M.bell(SPLASH11 + 0.8, 'D6', 0.13, -0.3);
      M.drop(SPLASH11 + 0.4, 'F#5', 0.1, -0.4);
      M.whoosh(BTN11[0], 1.0, 0.03, 400, 1800);
      M.marimba(SHOW11, 'A5', 0.14); M.marimba(SHOW11 + 0.2, 'D6', 0.12);
      M.ep(13, 'F#5', 0.1); M.ep(13.02, 'D5', 0.08);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11];
})();
