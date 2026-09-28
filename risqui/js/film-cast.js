/* Film, part 1: palette, cast and the geometry every scene is laid out on.
   Scenes are pure functions of time: pose(i, b, q) says where element i is at
   beat b of that scene. The conductor blends one scene into the next per field. */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, clamp = BJ.clamp, lerp = BJ.lerp;
  const TAU = BJ.TAU, PI = Math.PI;
  const K = (BJ.K = {});

  K.seg = (b, a, d) => clamp((b - a) / d);
  K.smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  K.NAVY = [0, 23, 82]; K.YEL = [252, 186, 4]; K.LIGHT = [240, 245, 255]; K.PALE = [210, 224, 255];
  K.WHITE = [255, 255, 255]; K.BAND = [232, 239, 252]; K.GRID = [206, 216, 240]; K.GREY = [184, 193, 214]; K.MUTE = [150, 163, 194]; K.MID = [58, 88, 168];
  K.paint = (q, c) => { q.r = c[0]; q.g = c[1]; q.b = c[2]; };
  K.tint = (q, a, c, t) => { q.r = a[0] + (c[0] - a[0]) * t; q.g = a[1] + (c[1] - a[1]) * t; q.b = a[2] + (c[2] - a[2]) * t; };
  K.mixc = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];
  K.heat = (s) => (s >= 10 ? K.YEL : s >= 5 ? K.MID : K.NAVY);
  K.off = (q) => { q.o = 0; };
  K.mix = function (q, a, c, t) {
    for (const f of BJ.FIELDS) q[f] = a[f] + (c[f] - a[f]) * t;
    q.o = clamp(q.o);
  };
  K.copy = (q, a) => { for (const f of BJ.FIELDS) q[f] = a[f]; };
  K.shuffle = function (a, rnd) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  K.cap = function (text, at, to, extra) {
    const gap = (extra && extra.gap) || 0.14;
    // *word* gets a yellow marker swipe once it has landed
    const words = text.split(' ').map((w, k) => {
      const hl = /^\*.+\*$/.test(w);
      return [hl ? w.slice(1, -1) : w, at + k * gap, hl];
    });
    return Object.assign({ at, to, words }, extra || {});
  };
  // Piecewise track through keys [t, x, y, z], eased between neighbours.
  K.track = function (keys, b, out) {
    let k = 0;
    while (k < keys.length - 1 && b >= keys[k + 1][0]) k++;
    const a = keys[k], c = keys[Math.min(k + 1, keys.length - 1)];
    const e = c === a || c[0] <= a[0] ? 1 : E.inOutCubic(clamp((b - a[0]) / (c[0] - a[0])));
    out.x = lerp(a[1], c[1], e); out.y = lerp(a[2], c[2], e); out.z = lerp(a[3], c[3], e);
    return out;
  };

  // ------------------------------------------------------------ cast (129 divs)
  const NB = (K.NB = 120);
  K.HOR = 120; K.RING = 121; K.FIN = 122; K.LENS = 123; K.LOGO = 124; K.SUN = 125; K.CK1 = 126; K.CK2 = 127; K.CARET = 128;
  // The shark and the float are the actual Lottie animations from risqui.nl, scrubbed by the film clock.
  // Shark (372 × 126 comp): fin rises over frames 1–61, holds to 122, sinks by 182; waterline at 97.6% height.
  // Float (520 × 520 comp): the ring is 45% of the width, centred at 55% height; 50-frame bob loop.
  K.SHARK = { aspect: 372 / 126, fin: 0.94, water: 0.976, up: 61, hold: 122, down: 182 };
  K.FLOAT = { ring: 0.454, water: 0.62, loop: 50, fps: 25 };
  const bar = () => ({ cls: 'bar', w: 100, h: 100, paint: 'bg' });
  const EL = [];
  for (let i = 0; i < NB; i++) EL.push(bar());
  EL.push(bar()); // HOR
  EL.push({ cls: 'lot', w: 520, h: 520, lottie: 'float', sub: '.ripple', cut: true }); // RING
  EL.push({ cls: 'lot', w: 744, h: 252, lottie: 'shark' }); // FIN
  EL.push({ cls: 'img', w: 400, h: 450.4, html: '<img src="img/q.svg" alt="" draggable="false">' });
  EL.push({ cls: 'img', w: 880, h: 358.8, html: '<img src="img/ris-ui.svg" alt="" draggable="false">' });
  EL.push({ cls: 'bar disc', w: 400, h: 400, paint: 'bg' });
  EL.push(bar(), bar(), bar()); // CK1, CK2, CARET
  BJ.ELEMENTS = EL;

  // ------------------------------------------------------------ static story data
  // Cold open: the sea is there from the first frame and the float lands inside a second.
  // The fin is up at ~0.9 s and charges on a Jaws pulse that keeps speeding up; it slips under,
  // one held breath, then it takes the float (~3.7 s) and the lights go out.
  K.DROP = 0; K.A_LAND = 0.75; K.FIN_UP = 1.4; K.PULSE = [2.1, 2.9, 3.5, 4.0, 4.4, 4.7, 4.95, 5.15]; K.DIVE = 5.3;
  K.ATTACK = 6.0; K.DARK = 6.6; K.SEA_BEATS = 9.2;
  K.EDITS = [[4, 1, 2.5], [7, 2, 3.2], [3, 3, 3.9], [9, 1, 4.6]]; // [row, column, beat]

  // Risk board: INIT/FINAL[I][L], I = impact 0..4, L = likelihood 0..4. 95 plates.
  const INIT = [[0, 1, 2, 2, 1], [1, 2, 4, 4, 4], [1, 3, 6, 7, 5], [2, 3, 6, 9, 8], [1, 2, 5, 8, 8]];
  const FINAL = [[8, 8, 8, 6, 3], [8, 8, 7, 4, 1], [5, 6, 6, 3, 1], [3, 3, 3, 1, 0], [1, 1, 1, 0, 0]];
  K.MSTART = 5.6; K.FLY = 0.8; K.LAUNCH = 0.05;
  const PL = (K.PL = []);
  for (let I = 0; I < 5; I++) for (let L = 0; L < 5; L++) for (let k = 0; k < INIT[I][L]; k++) PL.push({ I, L, k, s: (I + 1) * (L + 1), mv: false });
  const movers = PL.filter((p) => p.k >= FINAL[p.I][p.L]).sort((a, c) => c.s - a.s || c.k - a.k || c.L - a.L);
  const need = [], fill = [];
  for (let I = 0; I < 5; I++) for (let L = 0; L < 5; L++) { need.push(Math.max(0, FINAL[I][L] - INIT[I][L])); fill.push(INIT[I][L]); }
  movers.forEach((p, n) => {
    let best = -1, bd = 1e9;
    for (let t = 0; t < 25; t++) {
      if (!need[t]) continue;
      const I = Math.floor(t / 5), L = t % 5, s = (I + 1) * (L + 1);
      const d = Math.hypot(I - p.I, L - p.L) + (s < p.s ? 0 : 100);
      if (d < bd) { bd = d; best = t; }
    }
    need[best]--;
    p.mv = true; p.dI = Math.floor(best / 5); p.dL = best % 5; p.ds = (p.dI + 1) * (p.dL + 1); p.kd = fill[best]++;
    p.launch = K.MSTART + n * K.LAUNCH;
    p.dir = n % 2 ? 1 : -1;
  });
  K.S0 = PL.reduce((a, p) => a + p.s, 0);
  K.S1 = PL.reduce((a, p) => a + (p.mv ? p.ds : p.s), 0);
  K.LAST_LAND = K.MSTART + (movers.length - 1) * K.LAUNCH + K.FLY;
  K.PILL = K.LAST_LAND + 0.3;

  K.FOUND = [{ l: 3, j: 2, at: 3.1 }, { l: 7, j: 1, at: 4.0 }, { l: 12, j: 3, at: 4.9 }, { l: 15, j: 0, at: 5.8 }];
  K.FL = [7.2, 8.8, 10.4];
  K.MATCH = [[[2, 1], [9, 3], [14, 2]], [[4, 0], [10, 2], [16, 3]], [[1, 3], [8, 1], [13, 4]]];
  K.STEPS = [];
  for (let s = 0; s < 9; s++) K.STEPS.push(1.3 + s * 0.42);
  K.SEAL_AT = 5.0; K.SEAL_HIT = 6.2; K.DOCK = 4.5;

  // ------------------------------------------------------------ layout
  K.SEA = []; K.RA = {}; K.FINW = {}; K.SH = {}; K.PG = {}; K.LG = {}; K.SL = {}; K.HR = {};
  BJ.filmLayout = function () {
    const W = G.W, H = G.H;
    G.S = Math.min(0.9 * W, 0.62 * H);
    G.P = Math.max(900, 1.25 * Math.max(W, H));
    G.hc = (0.93 * H - G.cy) / 2.1;
    const S = G.S, P = G.P;
    G.slamY = 0.25 * H;

    // A · the sea: 20 rows × 6 dashes on a real 3D plane, spaced like a flat pattern
    let rnd = BJ.rng(7);
    K.SEA.length = 0;
    for (let r = 0; r < 20; r++) {
      const ys = 2.1 * Math.pow(0.07 / 2.1, r / 19), k = 1 / ys, Z = P * (1 - k);
      const f = 0.3 + 0.7 * (ys / 2.1);
      const ts = Math.max(1.1, 0.0052 * H * (0.3 + 0.7 * (ys / 2.1)));
      const kinds = K.shuffle(['L', 'L', 'M', 'M', 'D', 'M'], rnd);
      const shift = (r % 2 ? 0.5 : 0) + rnd() * 0.3;
      for (let j = 0; j < 6; j++) {
        const kd = kinds[j];
        const len = kd === 'L' ? (0.09 + 0.07 * rnd()) * W : kd === 'M' ? (0.035 + 0.03 * rnd()) * W : 0;
        const xs = ((((j + shift) / 6) % 1) - 0.5) * W * 1.1 + (rnd() - 0.5) * 0.05 * W;
        K.SEA.push({ r, j, ys, k, Z, xs, len: kd === 'D' ? ts * 2.2 : len * f, ts, ph: rnd() * TAU });
      }
    }
    const RA = K.RA;
    RA.ys = 0.667; RA.k = 1 / RA.ys; RA.Z = P * (1 - RA.k); RA.fx = -0.2 * W; RA.X = RA.fx * RA.k;
    RA.S = Math.min(0.2 * W, 0.13 * H); RA.T = 0.75;
    RA.zRest = RA.S * RA.k * 0.5 * Math.cos(RA.T) * 0.8;
    RA.zTop = G.hc + (G.cy + RA.S * 2) / RA.ys;
    K.FINW.h = (0.17 * H) / 0.62; K.FINW.w = K.FINW.h * 1.2;
    // where the fin slips under: just behind the float, a little to its right
    K.FIN_END = { ys: 0.64, fx: RA.fx + 0.13 * W };
    const fk = 1 / K.FIN_END.ys;
    K.RIPPLES = [
      { at: K.A_LAND, X: RA.X, Z: RA.Z, v: 0.45 * W * RA.k, w: 0.06 * W * RA.k, amp: 7 },
      { at: K.DIVE + 0.1, X: K.FIN_END.fx * fk, Z: P * (1 - fk), v: 0.4 * W * fk, w: 0.05 * W * fk, amp: 6 },
      { at: K.ATTACK, X: RA.X, Z: RA.Z, v: 0.75 * W * RA.k, w: 0.09 * W * RA.k, amp: 20 },
    ];
    // the attack: the sea dashes nearest the float are thrown up as spray and debris
    rnd = BJ.rng(31);
    const near = K.SEA.map((d, i) => ({ i, dd: Math.hypot(d.xs * d.k - RA.X, (d.Z - RA.Z) * 0.6) })).sort((a, c) => a.dd - c.dd);
    K.SPRAY = {};
    near.slice(0, 44).forEach(({ i }, n) => {
      const col = n < 12, a = (rnd() - 0.5) * (col ? 0.7 : 2.6);
      K.SPRAY[i] = {
        ox: (rnd() - 0.5) * 0.06 * W, oz: (rnd() - 0.5) * 0.04 * P,
        vx: Math.sin(a) * (0.3 + 0.55 * rnd()) * W, vz: (col ? 1.5 + 0.6 * rnd() : 0.7 + 0.8 * rnd()) * H, vy: (rnd() - 0.5) * 0.3 * P,
        size: (0.009 + 0.02 * rnd()) * Math.min(W, H), spin: (rnd() - 0.5) * 18, delay: rnd() * 0.07,
        c: n % 7 === 3 ? K.YEL : n % 3 === 1 ? K.NAVY : K.MID,
      };
    });

    // B · the spreadsheet, drawn like the real thing: formula bar, column letters, row numbers,
    //   gridlines, a title row, nine risks with heat-coloured scores, and sheet tabs.
    //   97 of the sea's 120 bars become its parts; the sea's far rows become its top rows.
    const SH = K.SH, portrait = W < H;
    SH.SW = Math.min(0.86 * W, 0.46 * H * 1.75);
    SH.SH = Math.min(0.46 * H, SH.SW / (portrait ? 1.05 : 1.75));
    SH.rows = 11; SH.rp = SH.SH / SH.rows;
    const rp = SH.rp, x0 = -SH.SW / 2, y0 = -SH.SH / 2 + 0.15 * rp, gut = Math.max(22, 0.055 * SH.SW);
    SH.cardW = SH.SW + 0.6 * rp; SH.cardH = SH.SH + 2.4 * rp;
    const COLS = [0.1, 0.4, 0.17, 0.15, 0.18], inner = SH.SW - gut;
    const colL = []; let cx = x0 + gut;
    COLS.forEach((c) => { colL.push(cx); cx += c * inner; });
    const colW = COLS.map((c) => c * inner), pad = Math.max(5, 0.018 * SH.SW);
    const rowY = (k) => y0 + (k + 0.5) * rp;
    const slots = [];
    const put = (o) => { o.z = o.z || 0; slots.push(o); return o; };
    const TH = Math.max(1, 0.0012 * Math.min(W, H) + 0.3);
    // formula bar: name box · fx · contents
    const fy = y0 - 0.72 * rp, fh = 0.7 * rp;
    put({ kind: 'band', x: 0, y: fy, w: SH.SW, h: fh, c: K.BAND, o: 1, row: -1, z: -1.5 });
    put({ kind: 'name', x: x0 + 0.045 * SH.SW, y: fy, w: 0.04 * SH.SW, h: rp * 0.24, c: K.MUTE, o: 1, row: -1, z: 1.5 });
    put({ kind: 'line', x: x0 + 0.1 * SH.SW, y: fy, w: TH, h: fh * 0.6, c: K.GRID, o: 1, row: -1 });
    SH.FX = put({ kind: 'fx', left: x0 + 0.12 * SH.SW, x: x0 + 0.2 * SH.SW, y: fy, w: 0.1 * SH.SW, h: rp * 0.24, c: K.NAVY, o: 0.75, row: -1, z: 1.5 });
    // grid
    put({ kind: 'band', x: 0, y: y0 + rp / 2, w: SH.SW, h: rp, c: K.BAND, o: 1, row: 0, z: -1.5 });
    put({ kind: 'band', x: x0 + gut / 2, y: y0 + SH.SH / 2, w: gut, h: SH.SH, c: K.BAND, o: 1, row: 0, z: -1.5 });
    for (let k = 0; k <= SH.rows; k++) put({ kind: 'line', x: 0, y: y0 + k * rp, w: SH.SW, h: TH, c: K.GRID, o: 1, row: k });
    [x0, x0 + gut, ...colL.slice(1), -x0].forEach((x) => put({ kind: 'line', x, y: y0 + SH.SH / 2, w: TH, h: SH.SH, c: K.GRID, o: 1, row: 0 }));
    colL.forEach((l, j) => put({ kind: 'glyph', hj: j, x: l + colW[j] / 2, y: rowY(0), w: rp * 0.2, h: rp * 0.26, c: K.MUTE, o: 1, row: 0, z: 1.5 }));
    for (let k = 1; k < SH.rows; k++) put({ kind: 'glyph', hk: k, x: x0 + gut / 2, y: rowY(k), w: Math.min(gut * 0.36, rp * (k === 10 ? 0.36 : 0.2)), h: rp * 0.24, c: K.MUTE, o: 1, row: k, z: 1.5 });
    rnd = BJ.rng(21);
    const SCORES = [16, 6, 20, 3, 12, 9, 25, 4, 10];
    SH.cells = {};
    for (let k = 1; k < SH.rows; k++) for (let j = 0; j < 5; j++) {
      const title = k === 1, cw = colW[j] - 2 * pad;
      let w, h = rp * (title ? 0.28 : 0.22), c = K.NAVY, o = title ? 1 : 0.62, kind = 'text';
      if (title) w = cw * (0.4 + 0.25 * rnd());
      else if (j === 0) { w = Math.min(cw, rp * 0.9); o = 0.4; }
      else if (j === 1) w = cw * (0.4 + 0.55 * rnd());
      else if (j === 2) { w = cw * (0.35 + 0.4 * rnd()); o = 0.5; }
      else if (j === 3) { w = cw * 0.7; o = 0.4; }
      else { kind = 'chip'; w = Math.min(cw, rp * 1.3); h = rp * 0.46; c = K.heat(SCORES[k - 2]); o = 1; }
      const left = colL[j] + pad;
      SH.cells[k * 5 + j] = put({ kind, x: left + w / 2, left, y: rowY(k), w, h, c, o, row: k, col: j, cw, z: 1.5, edit: null });
    }
    // sheet tabs
    const ty = y0 + SH.SH + 0.5 * rp, tbw = Math.min(0.2 * SH.SW, 5.2 * rp);
    put({ kind: 'band', x: 0, y: ty, w: SH.SW, h: 0.8 * rp, c: K.BAND, o: 1, row: 11, z: -1.5 });
    put({ kind: 'tab', x: x0 + gut + tbw / 2, y: ty, w: tbw, h: 0.8 * rp, c: K.WHITE, o: 1, row: 11, z: -0.8 });
    put({ kind: 'line', x: x0 + gut + tbw / 2, y: ty + 0.38 * rp, w: tbw, h: TH * 2.2, c: K.YEL, o: 1, row: 11, z: 0.6 });
    [0.5, 0.36, 0.44].forEach((f, n) => put({ kind: 'glyph', x: x0 + gut + tbw * (n + 0.5), y: ty, w: tbw * f, h: rp * 0.22, c: n ? K.MUTE : K.NAVY, o: n ? 1 : 0.75, row: 11, z: 1.5 }));
    put({ kind: 'line', x: x0 + gut + tbw * 2, y: ty, w: TH, h: 0.4 * rp, c: K.GRID, o: 1, row: 11 });
    SH.colL = colL; SH.colW = colW; SH.rowY = rowY; SH.n = slots.length;
    K.EDITS.forEach(([k, j, at]) => { const c = SH.cells[k * 5 + j]; c.edit = { at, w2: c.cw * (0.5 + 0.4 * rnd()) }; });
    // pair sheet parts with sea bars in reading order (far → near, left → right)
    const seaOrder = K.SEA.map((d, i) => i).sort((a, c) => K.SEA[a].ys - K.SEA[c].ys || K.SEA[a].xs - K.SEA[c].xs);
    const slotOrder = slots.map((o, k) => k).sort((a, c) => slots[a].y - slots[c].y || slots[a].x - slots[c].x);
    SH.slot = new Array(NB).fill(null);
    slotOrder.forEach((k, n) => { SH.slot[seaOrder[Math.round((n * (NB - 1)) / (slots.length - 1))]] = slots[k]; });

    // C · the risk board
    K.Tp = Math.min(0.165 * S, 0.125 * W); K.gap = 0.15 * K.Tp;

    // D · the page: 19 lines × 5 words, in four layouts (one per framework)
    const PG = K.PG;
    PG.PW = Math.min(0.6 * W, 0.78 * S); PG.PH = PG.PW * 1.25;
    PG.lp = (0.78 * PG.PH) / 19;
    const tx0 = -0.38 * PG.PW, tw = 0.76 * PG.PW, ty0 = -0.39 * PG.PH, gw = 0.025 * PG.PW;
    PG.WL = [];
    for (let v = 0; v < 4; v++) {
      const rr = BJ.rng(11 + v * 97), L = [];
      for (let l = 0; l < 19; l++) {
        const short = l === 5 || l === 11 || l === 18;
        const lf = l === 0 ? 0.55 : short ? 0.3 + 0.25 * rr() : 0.84 + 0.16 * rr();
        const ws = [0, 1, 2, 3, 4].map(() => 0.45 + rr());
        const sum = ws.reduce((a, c) => a + c, 0), avail = lf * tw - 4 * gw;
        let x = tx0;
        for (let j = 0; j < 5; j++) {
          const w = (ws[j] / sum) * avail;
          L.push({ x: x + w / 2, y: ty0 + l * PG.lp, w, h: PG.lp * (l === 0 ? 0.55 : 0.36), o: l === 0 ? 0.85 : 0.3 });
          x += w + gw;
        }
      }
      PG.WL.push(L);
    }
    if (!K.CM) {
      // which plate plays which word: pair each word with the plate that lands nearest to it
      const pairs = [];
      K.PL.forEach((p, n) => {
        const I = p.mv ? p.dI : p.I, L = p.mv ? p.dL : p.L, px = ((L - 2) * PG.PW) / 5, py = ((2 - I) * PG.PH) / 5;
        PG.WL[0].forEach((w, k) => pairs.push([Math.hypot(w.x - px, w.y - py), n, k]));
      });
      pairs.sort((a, c) => a[0] - c[0]);
      K.CM = new Array(95);
      const usedP = new Uint8Array(95), usedW = new Uint8Array(95);
      for (const [, n, k] of pairs) if (!usedP[n] && !usedW[k]) { usedP[n] = usedW[k] = 1; K.CM[k] = n; }
    }
    PG.LW = 0.42 * PG.PW; PG.LH = PG.LW * 1.1267;
    const u = PG.LW / 734;
    PG.gox = -84 * u; PG.goy = -135.5 * u; PG.gr = 154 * u;
    const wc = (l, j) => { const w = PG.WL[0][l * 5 + j]; return [w.x, w.y]; };
    const hz = 0.11 * S, keys = [[0, 0.75 * W, -0.62 * H, 0.5 * S], [0.8, 0.75 * W, -0.62 * H, 0.5 * S], [2.3, ...wc(1, 3), hz]];
    let last = wc(1, 3);
    K.FOUND.forEach((f) => { keys.push([f.at - 0.6, ...last, hz]); last = wc(f.l, f.j); keys.push([f.at - 0.05, ...last, hz]); });
    const park = [0.4 * PG.PW, -0.36 * PG.PH];
    keys.push([6.5, ...last, hz], [7.3, ...park, 0.05 * S], [11.0, ...park, 0.05 * S], [11.9, 0.2 * W, -0.95 * H, 0.45 * S]);
    PG.keys = keys;

    // E · the audit log (19 rows × 5 fields) and the seal (95 rays)
    const LG = K.LG;
    LG.LW = Math.min(0.8 * W, 1.2 * S); LG.rp = Math.min(0.085 * S, 44);
    LG.f = [];
    rnd = BJ.rng(33);
    for (let p = 0; p < 95; p++) {
      const m = Math.floor(p / 5), j = p % 5, L = LG.LW, rp = LG.rp;
      let x, w, h = rp * 0.24, o = 0.8, c = K.NAVY;
      if (j === 0) { w = h = rp * 0.26; x = -0.44 * L; c = K.MID; o = 1; }
      else if (j === 1) { w = 0.1 * L; x = -0.4 * L + w / 2; o = 0.4; }
      else if (j === 2) { w = (0.1 + 0.08 * rnd()) * L; x = -0.26 * L + w / 2; o = 0.85; }
      else if (j === 3) { w = (0.2 + 0.18 * rnd()) * L; x = -0.06 * L + w / 2; o = 0.32; }
      else { w = 0.09 * L; x = 0.4 * L; h = rp * 0.4; c = rnd() < 0.5 ? K.YEL : K.PALE; o = 1; }
      LG.f.push({ m, j, x, w, h, o, c });
    }
    const SL = K.SL;
    SL.dr = 0.2 * S;
    SL.rays = [];
    for (let j = 0; j < 95; j++) {
      const a = (j / 95) * TAU - PI / 2, len = (j % 2 ? 0.2 : 0.34) * SL.dr, rm = SL.dr * 1.14 + len / 2;
      SL.rays.push({ x: Math.cos(a) * rm, y: Math.sin(a) * rm, w: len, h: Math.max(1.5, ((TAU * SL.dr * 1.2) / 95) * 0.5), rz: a - PI * Math.round(a / PI) });
    }
    // checkmark: two square-ended strokes meeting at 90° on one shared vertex; each runs t/2 past
    //   the vertex, so both cover the same t × t corner square and the joint is seamless
    const d = SL.dr, ck = (ax, ay, bx, by, t) => {
      const dx = (bx - ax) * d, dy = (by - ay) * d, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
      return { sx: ax * d - (ux * t) / 2, sy: ay * d - (uy * t) / 2, ux, uy, len: l + t, rz: Math.atan2(dy, dx), t };
    };
    SL.t = 0.13 * d;
    const V = [-0.12, 0.28];
    SL.c1 = ck(V[0] - 0.28, V[1] - 0.28, V[0], V[1], SL.t);
    SL.c2 = ck(V[0], V[1], V[0] + 0.56, V[1] - 0.56, SL.t);

    // F · the site hero
    const HR = K.HR;
    HR.sunD = Math.min(0.2 * W, 0.15 * H); HR.sunY = 0.2 * H - G.cy;
    HR.waterY = 0.8 * H - G.cy; HR.logoY = 0.43 * H - G.cy;
    HR.Lw = Math.min(0.62 * W, 0.95 * S); HR.Lh = (HR.Lw * 358.8) / 880;
    HR.qx = (278.5 * HR.Lw) / 2519; HR.qy = HR.logoY + (100 * HR.Lw) / 2519;
    HR.qw = (HR.Lw * 734) / 2519; HR.qh = HR.qw * 1.1267;
    HR.ringS = Math.min(0.13 * W, 0.1 * H); HR.finH = Math.min(0.13 * H, 0.2 * W);
    const sr = HR.sunD / 2, T = (HR.T = []);
    rnd = BJ.rng(55);
    for (let k = 0; k < 5; k++) T.push({ x: 0, y: HR.sunY + sr * (0.12 + 0.19 * k), w: HR.sunD * 1.15, h: sr * (0.045 + 0.03 * k), z: 1, c: K.LIGHT });
    for (let k = 0; k < 10; k++) {
      const side = k < 5 ? -1 : 1, r = k % 5, len = sr * (0.3 + 0.7 * rnd());
      T.push({ x: side * (sr * 1.3 + len / 2 + sr * 0.5 * rnd()), y: HR.sunY + sr * (-0.55 + 0.27 * r), w: len, h: Math.max(2, sr * 0.07), z: 0, c: K.YEL });
    }
    const bh = H - 0.8 * H;
    for (let r = 0; r < 5; r++) {
      const kinds = K.shuffle(['L', 'L', 'L', 'M', 'M', 'M', 'M', 'D', 'D', 'D'], rnd);
      for (let c = 0; c < 10; c++) {
        const kd = kinds[c], len = kd === 'L' ? (0.07 + 0.05 * rnd()) * W : kd === 'M' ? (0.025 + 0.02 * rnd()) * W : 5;
        T.push({ x: ((((c + (r % 2) * 0.5 + rnd() * 0.3) / 10) % 1) - 0.5) * W * 1.08, y: HR.waterY + bh * (0.14 + 0.18 * r), w: len, h: 2.5, z: 0, c: K.WHITE, ph: rnd() * TAU });
      }
    }
    // each seal ray flies to the nearest free piece of the hero; the rest fade where they are
    const pairs = [];
    const sa = (10.3 - K.SEAL_AT) * 0.05, sc = Math.cos(sa), ss = Math.sin(sa);
    SL.rays.forEach((ry, j) => {
      const rx = ry.x * sc - ry.y * ss, rY = ry.x * ss + ry.y * sc - 0.01 * H;
      T.forEach((t, k) => pairs.push([Math.hypot(t.x - rx, t.y - rY), j, k]));
    });
    pairs.sort((a, c) => a[0] - c[0]);
    K.TM = new Int16Array(95).fill(-1);
    const uT = new Uint8Array(T.length);
    for (const [, j, k] of pairs) if (K.TM[j] < 0 && !uT[k]) { K.TM[j] = k; uT[k] = 1; }
  };
})();
