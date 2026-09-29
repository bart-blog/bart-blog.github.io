/* Medendo — "Meer tijd voor je cliënt." A commercial in 150 shapes.
   A client tells their story; the care professional wants to really listen. Then a laptop slides
   between them: words get typed, lines scroll, the client's words fall on the table. The typed words
   become a clock that races on — time for reporting, at the cost of the client. The clock collapses
   into one record button; one press and the dots burst into Medendo's mark. Back face to face, a live
   waveform shows who says what, the waveform folds into a finished report within 20 seconds that
   slides into the EPD, the report locks (ISO 27001, NEN 7510, AVG), 7.500+ care professionals gather,
   and everything resolves into the logo and the "Probeer 14 dagen gratis" button.
   The hero (shape 0) is the care professional: the listening head, the hub of the clock, the record
   button, the head again, the check on the report, the keyhole, the newcomer in the crowd, the button.
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

  // ------------------------------------------------------------ drawing helpers
  const hide = (p) => { p.o = 0; p.w = p.h = 0; };
  function circle(p, x, y, d, c) { p.x = x; p.y = y; p.w = p.h = Math.max(0, d); p.r = Math.max(0, d) / 2; p.c = c; }
  function rect(p, x, y, w, h, r, c) { p.x = x; p.y = y; p.w = Math.max(0, w); p.h = Math.max(0, h); p.r = r; p.c = c; }
  // a pill of length `len` whose long axis points along angle `rot` + 90°
  function pill(p, x, y, len, th, rot, c) { p.x = x; p.y = y; p.w = th; p.h = Math.max(th, len); p.r = th / 2; p.rot = rot; p.c = c; p.sym = PI; }
  // a pill drawn from (x0, y0) to (x1, y1), round caps included
  function seg(p, x0, y0, x1, y1, th, c) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-6;
    pill(p, (x0 + x1) / 2, (y0 + y1) / 2, L + th, th, Math.atan2(-dx / L, dy / L), c);
  }
  const bar = (p, x0, y, len, th, c) => seg(p, x0 + th / 2, y, x0 + Math.max(th / 2, len - th / 2), y, th, c);
  const maxHit = (b, times, decay) => { let e = 0; for (const t of times) e = Math.max(e, hit(b, t, decay)); return e; };
  function perLayout(fn) {
    let v = -1, val;
    return () => { if (v !== G.version) { v = G.version; val = fn(); } return val; };
  }
  const yF = (px) => () => (G.cy + px()) / G.H; // type centred at an offset from the visual centre
  const xF = (px) => () => (G.cx + px()) / G.W;
  const rnd = (seed, n) => { const r = BJ.rng(seed), a = []; for (let k = 0; k < n; k++) a.push(r()); return a; };
  const PENTA = ['D', 'E', 'F#', 'A', 'B'];
  const penta = (k, base = 4) => PENTA[((k % 5) + 5) % 5] + (base + Math.floor(k / 5));
  const MINOR = ['B', 'D', 'E', 'F#', 'A'];
  const minor = (k, base = 4) => MINOR[((k % 5) + 5) % 5] + (base + Math.floor((k + 1) / 5));
  function groove(M, a, z, v = 0.24, hat = 0.03) { for (let b = a; b < z - 0.01; b += 1) { M.kick(b, v); M.tick(b + 0.5, hat, 0.25); } }
  const gw = () => Math.min(G.W * 0.88, G.R * (G.short ? 4.2 : 3.3));
  const invSine = (u) => Math.acos(1 - 2 * clamp(u)) / PI; // inverse of ease.inOutSine
  const hash = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
  const soft = () => mix(C.ink, C.white, 0.58); // grey text lines

  // ------------------------------------------------------------ the two people
  // A head and a rounded torso each: the care professional on the left (the hero's head, clay),
  // the client on the right (navy). They sit at a table.
  const ppl = perLayout(() => {
    const hd = G.R * (G.portrait ? 0.3 : 0.28);
    const x = G.portrait ? Math.min(G.R * 0.72, G.W * 0.5 - hd * 1.15) : G.R * 1.12;
    const hy = -G.R * 0.3, bw = hd * 1.9, bh = hd * 1.5, by = hy + hd * 0.64 + bh / 2;
    return { hd, x, hy, bw, bh, by, table: by + bh / 2 + hd * 0.16 };
  });
  const careBody = () => mix(C.clay, C.bg, 0.42), cliBody = () => mix(C.navy, C.bg, 0.42);
  function head(p, side, s, ox, oy, c) { const P = ppl(); circle(p, side * P.x + ox, P.hy + oy, P.hd * s, c || (side < 0 ? C.clay : C.navy)); }
  function torso(p, side, s, ox, c) {
    const P = ppl();
    rect(p, side * P.x + ox, P.by + (1 - s) * P.bh * 0.5, P.bw * s, P.bh * s, P.bw * 0.46 * s, c || (side < 0 ? careBody() : cliBody()));
  }
  function table(p, e) { const P = ppl(), L = (2 * P.x + P.bw * 1.2) * e; if (L <= 0) return hide(p); bar(p, -L / 2, P.table, L, P.hd * 0.1, C.line); }

  // words fly in an arc from the speaker's mouth to the listener's ear (dir 1: client → you)
  function wordPath(dir, u) {
    const P = ppl(), sx = dir * (P.x - P.hd * 0.62), sy = P.hy + P.hd * 0.08, ex = -dir * (P.x - P.hd * 0.62), ey = P.hy - P.hd * 0.05;
    const cy = P.hy - G.R * 0.62, a = (1 - u) * (1 - u), m = 2 * u * (1 - u), c = u * u;
    return [a * sx + c * ex, a * sy + m * cy + c * ey];
  }
  const FLY = 1.3;
  function word(p, w, b, c, drop) {
    const f = (b - w.t) / FLY;
    if (f <= 0 || f >= 1) return hide(p);
    const P = ppl(), [x, y0] = wordPath(w.dir, E.inOutSine(f)), s = Math.min(1, f * 7, (1 - f) * 6);
    let y = y0;
    const L = P.hd * w.len * s, th = P.hd * 0.16 * s;
    seg(p, x - L / 2 + th / 2, y, x + L / 2 - th / 2, y, th, c || (w.dir > 0 ? C.navy : C.clay));
    if (drop) { // unheard: the word gives up halfway and falls onto the table
      const g = clamp((f - 0.38) / 0.62);
      p.y += g * g * G.R * 0.9; p.rot += g * (w.len - 0.6) * 3;
      p.o *= 1 - clamp((f - 0.62) / 0.3);
    }
  }
  const phrases = (list, seed) => {
    const R = rnd(seed, 40), out = [];
    list.forEach(([t0, n, dir]) => { for (let k = 0; k < n; k++) out.push({ t: t0 + k * 0.22, dir, len: 0.34 + 0.5 * R[out.length] }); });
    return out;
  };

  // ------------------------------------------------------------ Medendo's mark
  // Two open strokes, mirrored: each one starts inside, U-turns at the bottom, runs up the outside,
  // round its top lobe and crosses the other at the top. Traced from the logo on a 600 px grid.
  const MK = [[95, 372], [170, 452], [240, 510], [262, 538], [238, 562], [150, 572], [75, 545], [38, 480], [30, 390], [38, 300],
    [30, 215], [35, 130], [70, 58], [135, 28], [215, 35], [300, 75], [395, 140], [485, 215], [560, 300]];
  const NM = 60; // dots per stroke
  const MARK = (() => {
    const P = MK.map(([x, y]) => [(x - 300) / 600, (y - 300) / 600]), pts = [P[0], ...P, P[P.length - 1]], dense = [];
    for (let k = 1; k < pts.length - 2; k++) {
      const [p0, p1, p2, p3] = [pts[k - 1], pts[k], pts[k + 1], pts[k + 2]];
      for (let s = 0; s < 24; s++) {
        const t = s / 24, t2 = t * t, t3 = t2 * t;
        dense.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    dense.push(P[P.length - 1]);
    const acc = [0];
    for (let k = 1; k < dense.length; k++) acc.push(acc[k - 1] + Math.hypot(dense[k][0] - dense[k - 1][0], dense[k][1] - dense[k - 1][1]));
    const total = acc[acc.length - 1], half = [];
    for (let n = 0, k = 1; n < NM; n++) {
      const L = (n / (NM - 1)) * total;
      while (k < acc.length - 1 && acc[k] < L) k++;
      const t = (L - acc[k - 1]) / (acc[k] - acc[k - 1] || 1);
      half.push({ x: lerp(dense[k - 1][0], dense[k][0], t), y: lerp(dense[k - 1][1], dense[k][1], t), u: n / (NM - 1) });
    }
    return [...half, ...half.map((q) => ({ x: -q.x, y: q.y, u: q.u }))];
  })();
  const MDOT = 0.086; // dot size / mark size (the stroke of the logo)

  // =========================================================== 1 · a conversation
  const W1 = phrases([[0.4, 5, 1], [2.3, 4, 1], [3.55, 2, -1], [4.3, 6, 1]], 3);
  const IN1 = W1.filter((w) => w.dir > 0), OUT1 = W1.filter((w) => w.dir < 0);
  const ARR1 = IN1.map((w) => w.t + FLY), ARR1K = OUT1.map((w) => w.t + FLY);
  const TALK1 = IN1.map((w) => w.t), TALK1C = OUT1.map((w) => w.t);
  const S1 = {
    name: 'gesprek',
    title: 'Een gesprek',
    beats: 7,
    introBeat: 1.5,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const P = ppl(), e0 = E.outBack(clamp(b / 0.45)), e1 = E.outBack(clamp((b - 0.15) / 0.45));
      if (i === 0) return head(p, -1, e0 * (1 + 0.05 * maxHit(b, TALK1C, 7)), 0, P.hd * 0.1 * maxHit(b, ARR1, 5));
      if (i === 1) return torso(p, -1, e0, 0);
      if (i === 2) return head(p, 1, e1 * (1 + 0.06 * maxHit(b, TALK1, 7)), 0, P.hd * 0.1 * maxHit(b, ARR1K, 5));
      if (i === 3) return torso(p, 1, e1, 0);
      if (i === 4) return table(p, E.outCubic(clamp((b - 0.1) / 0.6)));
      if (i >= 10 && i < 10 + W1.length) return word(p, W1[i - 10], b);
      hide(p);
    },
    type: [
      { id: 'gesprek.a', at: 0.3, to: 3.3, text: 'Je cliënt vertelt | zijn verhaal.' },
      { id: 'gesprek.b', at: 3.5, to: 6.85, text: 'Jij wilt *echt* luisteren.' },
    ],
    music(M) {
      M.pad(0, 'B2 F#3 A3 D4', 4, 0.24); M.sub(0, 'B1', 4, 0.16);
      M.pad(4, 'G2 D3 F#3 B3', 3, 0.24); M.sub(4, 'G1', 3, 0.16);
      IN1.forEach((w, k) => M.pluck(w.t, minor(7 - (k % 5), 4), 0.07, 0.45, 0.18));
      OUT1.forEach((w, k) => M.pluck(w.t, minor(10 + k, 4), 0.07, -0.45, 0.18));
      ARR1.forEach((t) => M.tick(t, 0.025, -0.5));
      M.ep(0.4, 'F#5', 0.08); M.ep(2.3, 'D5', 0.08); M.ep(4.3, 'A5', 0.08);
      for (let b = 4; b < 7; b += 1) M.kick(b, 0.12);
      M.whoosh(6.3, 0.7, 0.04, 500, 2200);
    },
  };

  // =========================================================== 2 · the screen
  // A laptop slides up between them. You bend over it and type word after word while the lines
  // scroll away; the client's words drop on the table and the client fades.
  const lap = perLayout(() => {
    const P = ppl(), w = G.portrait ? G.R * 0.9 : G.R * 1.3, h = w * 0.64, bz = w * 0.035;
    const y = P.table - P.hd * 0.12 - h / 2, iw = w - 2 * bz, ih = h - 2 * bz, pad = iw * 0.08, rowH = (ih - 2 * pad) / 6;
    return { w, h, bz, y, iw, ih, pad, rowH, left: -iw / 2 + pad, top: y - ih / 2 + pad, bottom: y + ih / 2 - pad, tw: iw - 2 * pad };
  });
  const TW2 = (() => {
    const r = BJ.rng(7), out = [];
    let row = 0, x = 0;
    for (let n = 0; n < 36; n++) {
      const w = 0.1 + 0.2 * r();
      if (x + w > 1.001) { row++; x = 0; }
      out.push({ row, x0: x, x1: x + w });
      x += w + 0.04;
    }
    return out;
  })();
  const tw2 = (n) => 0.8 + n * 0.18;
  const ROW2 = [];
  TW2.forEach((w, n) => { if (ROW2[w.row] === undefined) ROW2[w.row] = tw2(n); });
  const scroll2 = (b) => { let s = 0; for (let r = 6; r < ROW2.length; r++) s += E.inOutCubic(clamp((b - ROW2[r] + 0.12) / 0.3)); return s; };
  const TYPE2 = TW2.map((w, n) => tw2(n));
  const W2 = phrases([[0.9, 5, 1], [4.1, 5, 1]], 5);
  const lean2 = (b) => E.inOutCubic(clamp((b - 0.4) / 0.9));
  const fade2 = (b) => clamp((b - 1.2) / 4.5);
  function screenWord(p, n, b) {
    const W = TW2[n], K = lap(), g = clamp((b - tw2(n)) / 0.14);
    if (g <= 0) return hide(p);
    const y = K.top + (W.row - scroll2(b) + 0.5) * K.rowH;
    const vis = Math.min(clamp((y - K.top + K.rowH * 0.1) / (K.rowH * 0.6)), clamp((K.bottom + K.rowH * 0.1 - y) / (K.rowH * 0.6)));
    if (vis <= 0) return hide(p);
    const th = K.rowH * 0.36, x0 = K.left + W.x0 * K.tw, x1 = K.left + lerp(W.x0, W.x1, g) * K.tw;
    seg(p, x0 + th / 2, y, Math.max(x0 + th / 2, x1 - th / 2), y, th, W.x0 === 0 && W.row % 3 === 0 ? mix(C.ink, C.white, 0.25) : soft());
    p.o *= vis;
  }
  function laptop(p, part, e) {
    const K = lap(), P = ppl();
    if (e <= 0) return hide(p);
    const h = K.h * e, y = K.y + (K.h - h) / 2;
    if (part === 0) return rect(p, 0, y, K.w * Math.min(1, 0.6 + 0.4 * e), h, K.w * 0.045, C.ink);
    if (part === 1) return rect(p, 0, y, K.iw * Math.min(1, 0.6 + 0.4 * e), Math.max(0, h - 2 * K.bz), K.w * 0.03, C.white);
    const L = K.w * 1.16 * Math.min(1, e);
    bar(p, -L / 2, P.table - P.hd * 0.08, L, P.hd * 0.16, mix(C.ink, C.bg, 0.3));
  }
  const S2 = {
    name: 'scherm',
    title: 'Het scherm',
    beats: 8,
    blend: { dur: 0.6, ease: E.glide },
    pose(i, b, p) {
      const P = ppl(), ln = lean2(b) * (G.portrait ? 0.2 : 1), fd = fade2(b), e = E.outBack(clamp((b - 0.1) / 0.55));
      const tap = maxHit(b, TYPE2, 9);
      if (i === 0) return head(p, -1, 1, ln * P.hd * 0.38, ln * P.hd * 0.24 + tap * P.hd * 0.05);
      if (i === 1) return torso(p, -1, 1, ln * P.hd * 0.2);
      if (i === 2) return head(p, 1, 1 - 0.12 * fd, fd * P.hd * 0.3, P.hd * 0.1 * fd, mix(C.navy, C.line, fd * 0.85));
      if (i === 3) return torso(p, 1, 1 - 0.12 * fd, fd * P.hd * 0.3, mix(cliBody(), C.line, fd * 0.85));
      if (i === 4) return table(p, 1);
      if (i >= 5 && i <= 7) return laptop(p, i - 5, e);
      if (i === 8) { // the cursor
        const K = lap();
        let n = -1;
        for (let k = 0; k < TW2.length; k++) if (b >= tw2(k)) n = k;
        const W = n < 0 ? { row: 0, x1: 0 } : TW2[n], g = n < 0 ? 0 : clamp((b - tw2(n)) / 0.14);
        const x = K.left + (n < 0 ? 0 : lerp(W.x0, W.x1, g)) * K.tw + K.rowH * 0.25, y = K.top + (W.row - scroll2(b) + 0.5) * K.rowH;
        const on = E.outCubic(clamp((b - 0.6) / 0.2)), blink = b < 0.8 ? (Math.floor(b * 4) % 2 ? 0.2 : 1) : 1;
        rect(p, x, y, K.rowH * 0.1 * on, K.rowH * 0.7 * on, K.rowH * 0.05, C.clay);
        p.o = blink;
        return;
      }
      if (i >= 10 && i < 10 + TW2.length) return screenWord(p, i - 10, b);
      if (i >= 46 && i < 46 + W2.length) return word(p, W2[i - 46], b, mix(C.navy, C.line, 0.25), true);
      hide(p);
    },
    type: [
      { id: 'scherm.a', at: 0.3, to: 3.8, text: 'Maar je ogen | zitten op je scherm.' },
      { id: 'scherm.b', at: 4.0, to: 7.85, text: 'Typen. Scrollen. | Nog meer typen.' },
    ],
    music(M) {
      M.pad(0, 'E2 B2 D3 G3', 4, 0.22); M.sub(0, 'E1', 4, 0.16);
      M.pad(4, 'F#2 C#3 E3 A3', 4, 0.22); M.sub(4, 'F#1', 4, 0.16);
      M.whoosh(0, 0.6, 0.04, 400, 1800); M.thump(0.5, 0.28);
      TYPE2.forEach((t, n) => M.key(t, 0.05 + 0.04 * hash(n), -0.25 + 0.2 * hash(n + 9)));
      ROW2.forEach((t, r) => { if (r >= 6) M.snip(t, 0.06); });
      W2.forEach((w, k) => { M.pluck(w.t, minor(6 - (k % 5), 4), 0.05, 0.45, 0.1); M.drop(w.t + FLY * 0.7, minor(3 - (k % 5), 4), 0.04, 0.3); });
      groove(M, 2, 8, 0.16, 0.02);
      for (let b = 2; b < 8; b += 0.5) M.bass(b, b < 4 ? 'E2' : 'F#2', 0.3, 0.16);
      M.whoosh(7.2, 0.8, 0.05, 2400, 500);
    },
  };

  // =========================================================== 3 · time
  // The typed words become the 60 ticks of a clock; you are its hub. The hand races one and a half
  // turns and every tick it passes turns dark: all that time goes to reporting.
  const clk = perLayout(() => ({ rc: G.R * (G.portrait ? 0.8 : 0.82) }));
  const SW3 = [0.5, 5.4];
  const turns3 = (b) => 1.5 * E.inOutSine(clamp((b - SW3[0]) / (SW3[1] - SW3[0])));
  const pass3 = (k, lap) => SW3[0] + (SW3[1] - SW3[0]) * invSine((lap + k / 60) / 1.5);
  const PASS3 = [];
  for (let k = 0; k < 60; k += 5) { PASS3.push(pass3(k, 0)); if (k < 30) PASS3.push(pass3(k, 1)); }
  function tick3(p, k, b, pulse = 0) {
    const K = clk(), a = (k / 60) * TAU, r = K.rc * 0.93, x = Math.sin(a) * r, y = -Math.cos(a) * r;
    const t1 = pass3(k, 0), dark = clamp((b - t1) / 0.1), pk = Math.max(hit(b, t1, 6), k < 30 ? hit(b, pass3(k, 1), 6) : 0) + pulse;
    const c = mix(C.line, C.ink, dark);
    if (k % 5 === 0) pill(p, x, y, K.rc * 0.15 * (1 + 0.3 * pk), K.rc * 0.05, a, c);
    else circle(p, x, y, K.rc * 0.05 * (1 + 0.5 * pk), c);
  }
  const hand3 = (p, b, part, len = 1) => {
    const K = clk(), a = part === 0 ? turns3(b) * TAU : TAU * (0.3 + turns3(b) / 12), L = K.rc * (part === 0 ? 0.74 : 0.46) * len;
    if (L <= 1) return hide(p);
    seg(p, 0, 0, Math.sin(a) * L, -Math.cos(a) * L, K.rc * (part === 0 ? 0.05 : 0.075), C.ink);
  };
  const S3 = {
    name: 'tijd',
    title: 'Tijd voor verslaglegging',
    beats: 6,
    blend: { start: (i) => (i >= 10 && i < 70 ? ((i - 10) / 60) * 0.35 : 0), dur: (i) => (i === 0 ? 0.7 : 0.8), ease: E.glide, arc: 0.12 },
    pose(i, b, p) {
      const K = clk(), P = ppl();
      if (i === 0) return circle(p, 0, 0, K.rc * 0.17 * (1 + 0.2 * maxHit(b, PASS3, 5)), C.clay);
      if (i === 5 || i === 6) return hand3(p, b, i - 5, E.outBack(clamp((b - 0.2) / 0.5)));
      if (i === 2 || i === 3) {
        if (G.portrait) return hide(p);
        const fd = clamp(0.75 + (b / 6) * 0.25), x = Math.max(P.x, K.rc + P.bw * 0.75) - P.x;
        if (i === 2) head(p, 1, 0.88 - 0.12 * clamp((b - 3) / 2), x, P.hd * 0.1, mix(C.navy, C.line, fd));
        else torso(p, 1, 0.88 - 0.12 * clamp((b - 3) / 2), x, mix(cliBody(), C.line, fd));
        p.o *= 1 - 0.65 * E.inOutCubic(clamp((b - 3.1) / 1.5));
        return;
      }
      if (i >= 10 && i < 70) return tick3(p, i - 10, b);
      hide(p);
    },
    type: [
      { id: 'tijd.a', at: 0.3, to: 2.9, text: 'Zoveel tijd | voor verslaglegging.' },
      { id: 'tijd.b', at: 3.1, to: 5.85, text: 'Ten koste van | je *cliënt.*' },
    ],
    music(M) {
      M.pad(0, 'G2 D3 F#3 B3', 3, 0.22); M.sub(0, 'G1', 3, 0.16);
      M.pad(3, 'F#2 C#3 E3 A#3', 3, 0.22); M.sub(3, 'F#1', 3, 0.18);
      for (let b = 0; b < 6; b += 0.5) M.tick(b, 0.035, b % 1 ? 0.35 : -0.35);
      PASS3.forEach((t, n) => M.marimba(t, minor(9 - (n % 7), 4), 0.06, Math.sin((n / PASS3.length) * TAU) * 0.6));
      for (let b = 0; b < 6; b += 1) M.kick(b, 0.14);
      M.riser(3.2, 2.8, 0.1);
      M.womp(3.1, 'F#2', 1.4, 0.08);
    },
  };

  // =========================================================== 4 · one press
  // The clock falls into its hub, which grows into a record button. One press: the dots burst out
  // and draw Medendo's mark around the button; the site's gradient rises behind it.
  const PRESS4 = 2.0;
  const mk4 = () => G.R * (G.portrait ? 1.45 : 1.5);
  const btn4 = (b) => {
    const grow = E.outBack(clamp((b - 0.4) / 0.6)), after = E.inOutCubic(clamp((b - PRESS4 - 0.4) / 0.8));
    const sq = 1 + 0.08 * BJ.antic(b, PRESS4, 0.35) - 0.16 * hit(b, PRESS4, 5) + 0.05 * BJ.wobble(b, PRESS4 + 0.1);
    return lerp(clk().rc * 0.17, G.R * 0.42, grow) * lerp(1, 0.72, after) * sq;
  };
  const BURST4 = (u) => PRESS4 + 0.05 + u * 0.4;
  function markDot(p, s, S, cx, cy, e = 1, c = C.ink) {
    const q = MARK[s];
    circle(p, cx + q.x * S * e, cy + q.y * S * e, S * MDOT * Math.min(1, e * 4), c);
  }
  const S4 = {
    name: 'start',
    title: 'Eén druk op de knop',
    beats: 7,
    blend: { dur: 0.01 },
    field: (b) => E.inOutSine(clamp((b - PRESS4) / 1.0)),
    pose(i, b, p) {
      const D = btn4(b), ring = E.outBack(clamp((b - 0.6) / 0.5));
      if (i === 0) return circle(p, 0, 0, D, C.clay);
      if (i === 6) return circle(p, 0, 0, D * 1.38 * ring, C.clay);
      if (i === 7) return circle(p, 0, 0, D * 1.2 * ring, C.white);
      if (i === 5 || i === 8) {
        if (i === 8) return hide(p);
        const r = 1 - E.inCubic(clamp(b / 0.5));
        return hand3(p, 6 + b, 0, r);
      }
      if (i < 10 || i >= 10 + 2 * NM) return hide(p);
      const j = i - 10;
      if (b < PRESS4) { // the ticks fall into the hub
        if (j >= 60) return hide(p);
        const f = E.inCubic(clamp((b - (j / 60) * 0.5) / 0.75));
        if (f >= 1) return hide(p);
        tick3(p, j, 6);
        p.x *= 1 - f; p.y *= 1 - f; p.w *= 1 - f; p.h *= 1 - f; p.r *= 1 - f;
        return;
      }
      const f = clamp((b - BURST4(MARK[j].u)) / 0.9);
      if (f <= 0) return hide(p);
      const S = mk4(), breathe = 1 + 0.012 * Math.sin((b - 4) * PI * 0.5) * clamp(b - 4);
      markDot(p, j, S, 0, -0.05 * S, E.spring(f) * breathe);
    },
    type: [
      { id: 'start.a', at: 0.3, to: 1.95, text: 'Eén druk op de knop.' },
      { id: 'start.name', at: 3.0, to: 6.85, text: 'Maak kennis met *Medendo.*', stagger: 0.12 },
      { id: 'start.sub', at: 3.6, to: 6.85, text: 'Dé digitale assistent voor de zorg.', cls: 'sub', size: 0.42, y: () => (G.textY + G.F * 1.05) / G.H },
    ],
    music(M) {
      M.whoosh(0, 0.8, 0.05, 2400, 300);
      for (let k = 0; k < 6; k++) M.tick(k * 0.12, 0.03, 0.4 - k * 0.15);
      M.pad(0, 'F#2 C#3 E3 A#3', PRESS4, 0.18); M.sub(0, 'F#1', PRESS4, 0.18);
      M.thump(0.9, 0.34); M.ep(1.0, 'C#5', 0.08); M.ep(1.5, 'F#5', 0.07);
      M.riser(0.9, PRESS4 - 0.9, 0.12);
      M.click(PRESS4, 0.5); M.kick(PRESS4, 0.55); M.boom(PRESS4, 0.34); M.splash(PRESS4, 0.2);
      const ARP = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6', 'B6'];
      ARP.forEach((n, k) => M.pluck(BURST4(k / (ARP.length - 1)) + 0.1, n, 0.11, k % 2 ? 0.5 : -0.5, 0.22));
      M.bell(PRESS4 + 0.6, 'A5', 0.14); M.bell(PRESS4 + 0.85, 'D6', 0.12, 0.3);
      M.pad(PRESS4, 'D3 A3 C#4 F#4', 7 - PRESS4, 0.3); M.sub(PRESS4, 'D2', 7 - PRESS4, 0.24);
      groove(M, 4, 7, 0.22, 0.03);
      M.ep(4.0, 'F#5', 0.1); M.ep(4.5, 'A5', 0.08); M.ep(5.0, 'C#6', 0.08);
      M.whoosh(6.3, 0.7, 0.04, 500, 2400);
    },
  };

  // =========================================================== 5 · Medendo listens
  // Face to face again. Between them a live waveform: navy while the client talks, clay while you
  // talk (speaker recognition). A small "Opnemen" chip blinks.
  const NB = 48, DT5 = 0.07;
  const wv = perLayout(() => {
    const P = ppl();
    if (!G.portrait) { const x0 = -P.x + P.bw * 0.72; return { x0, x1: -x0, y: P.hy + P.hd * 0.35, hmax: G.R * 0.46 }; }
    const W = gw();
    return { x0: -W / 2, x1: W / 2, y: P.table + G.R * 0.42, hmax: G.R * 0.36 };
  });
  const SEG5 = [[0.4, 3.2, 1], [3.4, 4.7, -1], [4.9, 7.7, 1]];
  function speech5(t) {
    for (const [a, z, who] of SEG5) {
      if (t < a || t > z) continue;
      const edge = Math.min(clamp((t - a) / 0.15), clamp((z - t) / 0.15));
      const syl = Math.pow(Math.abs(Math.sin(PI * (t - a) * 2)), 0.7), wrd = 0.55 + 0.45 * Math.sin(t * 3.1 + a * 5);
      return [edge * (0.12 + 0.88 * syl * wrd), who];
    }
    return [0, 0];
  }
  const SYL5 = [];
  SEG5.forEach(([a, z, who]) => { for (let t = a + 0.25; t < z - 0.1; t += 0.5) SYL5.push([t, who]); });
  const chip5 = perLayout(() => {
    const P = ppl(), K = wv(), h = Math.max(26, G.R * 0.15), fs = Math.max(13, h * 0.42), w = h * 0.95 + fs * 4.6;
    const y = G.portrait ? P.hy - P.hd * 0.5 - G.R * 0.26 : K.y - K.hmax / 2 - h * 1.05;
    return { h, fs, w, y, dotX: -w / 2 + h * 0.5 };
  });
  const S5 = {
    name: 'luisteren',
    title: 'Medendo luistert mee',
    beats: 8,
    blend: { start: (i) => (i >= 10 && i < 10 + NB ? ((i - 10) / NB) * 0.3 : 0), dur: (i) => (i === 0 ? 0.8 : 0.7), ease: E.glide, arc: 0.1 },
    field: () => 1,
    pose(i, b, p) {
      const P = ppl(), K = wv(), [now, who] = speech5(b);
      const e0 = E.outBack(clamp((b - 0.05) / 0.5)), e1 = E.outBack(clamp((b - 0.2) / 0.5));
      if (i === 0) return head(p, -1, 1 + 0.07 * (who < 0 ? now : 0), 0, 0);
      if (i === 1) return torso(p, -1, e0, 0);
      if (i === 2) return head(p, 1, e1 * (1 + 0.07 * (who > 0 ? now : 0)), 0, 0);
      if (i === 3) return torso(p, 1, e1, 0);
      if (i === 6 || i === 7) {
        const H = chip5(), e = E.outBack(clamp((b - 0.3) / 0.45));
        if (i === 7) return rect(p, 0, H.y, H.w * e, H.h * e, H.h * 0.5 * e, C.white);
        return circle(p, H.dotX * e, H.y, H.h * 0.36 * e * (1 + 0.15 * hit(b, Math.floor(b), 3)), mix(C.clay, C.white, 0.55 * (1 - hit(b, Math.floor(b), 2))));
      }
      if (i >= 10 && i < 10 + NB) {
        const k = i - 10, t = b - (NB - 1 - k) * DT5, tq = Math.round(t / DT5), [env, sp] = speech5(tq * DT5);
        const pitch = (K.x1 - K.x0) / NB, bw = pitch * 0.56, jit = 0.7 + 0.3 * hash(tq);
        const h = Math.max(bw, env * jit * K.hmax), on = E.outBack(clamp((b - 0.2 - k * 0.006) / 0.4));
        const col = sp > 0 ? C.navy : sp < 0 ? C.clay : mix(C.ink, C.white, 0.45);
        rect(p, K.x0 + (k + 0.5) * pitch, K.y, bw * on, h * on, bw / 2, col);
        return;
      }
      hide(p);
    },
    type: [
      { id: 'luisteren.rec', at: 0.45, to: 7.85, text: 'Opnemen', cls: 'lab', ax: 0, size: () => chip5().fs, x: xF(() => chip5().dotX + chip5().h * 0.36), y: yF(() => chip5().y) },
      { id: 'luisteren.a', at: 0.3, to: 3.6, text: 'Jij kijkt je *cliënt* aan.' },
      { id: 'luisteren.b', at: 3.8, to: 7.85, text: 'Medendo luistert mee.' },
      { id: 'luisteren.sub', at: 4.4, to: 7.85, text: 'Herkent wie wat zegt, in 36 talen.', cls: 'sub', size: 0.42, y: () => (G.textY + G.F * 0.95) / G.H },
    ],
    music(M) {
      const CH = [['D3 A3 C#4 F#4', 'D2'], ['B2 F#3 A3 D4', 'B1'], ['G2 D3 F#3 B3', 'G1'], ['A2 E3 G3 C#4', 'A1']];
      CH.forEach(([c, s], k) => { M.pad(k * 2, c, 2, 0.26); M.sub(k * 2, s, 2, 0.2); });
      groove(M, 0, 8, 0.24, 0.03);
      for (let b = 0; b < 8; b += 0.5) M.bass(b, ['D2', 'B1', 'G1', 'A1'][Math.floor(b / 2)], 0.3, 0.18);
      for (let b = 1; b < 8; b += 2) M.clap(b, 0.1);
      SYL5.forEach(([t, w], n) => M.marimba(t, w > 0 ? minor(3 + (n % 4), 4) : penta(7 + (n % 3), 4), 0.07, w > 0 ? 0.45 : -0.45));
      for (let b = 1; b < 8; b += 1) M.beep(b, 'A6', 0.012, 0);
      M.whoosh(7.2, 0.8, 0.05, 600, 2800);
    },
  };

  // =========================================================== 6 · the report
  // The waveform folds into a report that fills row by row while a timer runs to 0:20. A check,
  // then the report slides into a folder: EPD · ECD.
  const pg = perLayout(() => { const w = G.portrait ? Math.min(G.R * 1.1, gw() * 0.62) : G.R * 1.0, h = w * 1.3; return { w, h, px: w * 0.12, py: h * 0.08 }; });
  const WD6 = (() => {
    const r = BJ.rng(21), rows = [{ kind: 0, ws: [0.34, 0.22] }, { kind: 3, ws: [0.2, 0.14, 0.18] }];
    for (let s = 0; s < 3; s++) {
      rows.push({ kind: 1, ws: [0.26 + 0.12 * r()] });
      for (let l = 0; l < 3; l++) {
        const ws = [], lim = l === 2 ? 0.62 : 0.98;
        let x = 0;
        for (;;) { const w = 0.12 + 0.2 * r(); if (x + w > lim) break; ws.push(w); x += w + 0.04; }
        rows.push({ kind: 2, ws });
      }
    }
    const Y = [0.04, 0.12], out = [];
    for (let s = 0; s < 3; s++) for (let l = 0; l < 4; l++) Y.push(0.27 + s * 0.26 + l * 0.068 + (l ? 0.012 : 0));
    rows.forEach((row, ri) => { let x = 0; row.ws.forEach((w) => { out.push({ row: ri, kind: row.kind, x0: x, x1: x + w, y: Y[ri] }); x += w + 0.04; }); });
    return out;
  })();
  const NR6 = 14, tr6 = (r) => 0.8 + r * 0.19, CHK6 = 3.55, MV6 = [4.3, 5.0], DROP6 = [5.2, 5.7];
  const fold6 = perLayout(() => { const Q = pg(); return { fw: Q.w * 0.84, fh: Q.w * 0.58, fy: G.R * 0.36, up: -G.R * 0.3 }; });
  const tf6 = (b) => { // page scale and centre
    const Q = pg(), F = fold6(), mv = E.inOutCubic(clamp((b - MV6[0]) / (MV6[1] - MV6[0]))), dr = E.inCubic(clamp((b - DROP6[0]) / (DROP6[1] - DROP6[0])));
    const k = lerp(1, 0.52, mv), land = F.fy - F.fh * 0.15, bounce = -0.04 * Q.w * BJ.wobble(b, DROP6[1], 2.2, 6);
    return { k, y: lerp(lerp(0, F.up, mv), land, dr) + (b > DROP6[1] ? bounce : 0) };
  };
  const secs6 = (b) => Math.round(20 * clamp((b - tr6(0)) / (tr6(NR6 - 1) + 0.25 - tr6(0))));
  function pageWord(p, n, b) {
    const W = WD6[n], Q = pg(), T = tf6(b), g = E.outCubic(clamp((b - tr6(W.row) - W.x0 * 0.2) / 0.18));
    if (g <= 0) return hide(p);
    const iw = Q.w - 2 * Q.px, ih = Q.h - 2 * Q.py, th = Q.h * [0.042, 0.03, 0.022, 0.02][W.kind] * T.k;
    const x0 = (-iw / 2 + W.x0 * iw) * T.k, x1 = (-iw / 2 + lerp(W.x0, W.x1, g) * iw) * T.k, y = T.y + (-ih / 2 + W.y * ih) * T.k;
    const c = [C.ink, C.clay, soft(), mix(C.ink, C.white, 0.7)][W.kind];
    seg(p, x0 + th / 2, y, Math.max(x0 + th / 2, x1 - th / 2), y, th, c);
  }
  const chk6 = (b) => { const Q = pg(), T = tf6(b); return { x: (Q.w / 2 - Q.w * 0.13) * T.k, y: T.y + (-Q.h / 2 + Q.w * 0.13) * T.k, d: Q.w * 0.17 * T.k }; };
  const S6 = {
    name: 'verslag',
    title: 'Je verslag, klaar',
    beats: 7,
    blend: { start: (i) => (i >= 10 && i < 10 + NB ? (1 - (i - 10) / NB) * 0.25 : 0), dur: 0.8, ease: E.glide, arc: 0.1 },
    field: () => 1,
    pose(i, b, p) {
      const Q = pg(), T = tf6(b), F = fold6();
      if (i === 5) { const e = E.outBack(clamp((b - 0.1) / 0.5)); return rect(p, 0, T.y, Q.w * T.k * e, Q.h * T.k * e, Q.w * 0.06 * T.k, C.white); }
      if (i === 0 || i === 8 || i === 9) {
        const K = chk6(b), e = E.outBack(clamp((b - CHK6) / 0.4)), pk = hit(b, DROP6[1], 5);
        if (e <= 1e-3) return hide(p);
        if (i === 0) return circle(p, K.x, K.y, K.d * e * (1 + 0.25 * pk), C.navy);
        const g = clamp((b - CHK6 - 0.2 - (i === 9 ? 0.1 : 0)) / 0.12), u = K.d * 0.5, th = Math.max(1.5, K.d * 0.13);
        if (g <= 0) return hide(p);
        if (i === 8) return seg(p, K.x - u * 0.42, K.y + u * 0.02, K.x - u * 0.1, K.y + u * 0.32, th, C.white);
        return seg(p, K.x - u * 0.1, K.y + u * 0.32, lerp(K.x - u * 0.1, K.x + u * 0.46, g), lerp(K.y + u * 0.32, K.y - u * 0.3, g), th, C.white);
      }
      if (i === 1 || i === 2 || i === 70) { // the folder: tab, back, front
        const e = E.outBack(clamp((b - 4.75) / 0.5)), pk = hit(b, DROP6[1], 4);
        if (e <= 1e-3) return hide(p);
        const dy = (1 - e) * G.R * 0.3, col = mix(C.sand, C.clay, 0.28);
        if (i === 1) return rect(p, -F.fw * 0.26, F.fy - F.fh * 0.52 + dy, F.fw * 0.36 * e, F.fh * 0.22 * e, F.fh * 0.07, col);
        if (i === 2) return rect(p, 0, F.fy - F.fh * 0.04 + dy, F.fw * e, F.fh * e, F.fh * 0.1, col);
        return rect(p, 0, F.fy + F.fh * 0.12 + dy + pk * F.fh * 0.03, F.fw * 1.03 * e, F.fh * 0.78 * e, F.fh * 0.1, C.sand);
      }
      if (i >= 10 && i < 10 + WD6.length) return pageWord(p, i - 10, b);
      hide(p);
    },
    type: [
      { id: 'verslag.timer', at: 0.6, to: 4.3, fn: (b) => '0:' + String(secs6(b)).padStart(2, '0'), cls: 'num', size: 0.46, y: yF(() => -pg().h / 2 - G.R * 0.13) },
      { id: 'verslag.epd', at: 5.0, to: 6.85, text: 'EPD · ECD', cls: 'lab', size: () => Math.max(13, fold6().fh * 0.16), y: yF(() => fold6().fy + fold6().fh * 0.24) },
      { id: 'verslag.a', at: 0.3, to: 3.5, text: 'Binnen *20* *seconden* | je verslag klaar.' },
      { id: 'verslag.b', at: 3.7, to: 6.85, text: 'Controleren. Opslaan | in je *EPD.*' },
    ],
    music(M) {
      M.pad(0, 'G2 D3 F#3 B3', 2, 0.26); M.sub(0, 'G1', 2, 0.2);
      M.pad(2, 'A2 E3 G3 C#4', 2, 0.26); M.sub(2, 'A1', 2, 0.2);
      M.pad(4, 'D3 A3 C#4 F#4', 3, 0.28); M.sub(4, 'D2', 3, 0.22);
      groove(M, 0, 7, 0.24, 0.03);
      for (let b = 0; b < 7; b += 0.5) M.bass(b, ['G1', 'A1', 'D2', 'D2'][Math.min(3, Math.floor(b / 2))], 0.3, 0.18);
      for (let r = 0; r < NR6; r++) M.blip(tr6(r), penta(5 + r, 4), 0.05, -0.3 + (r % 3) * 0.3);
      M.coin(CHK6 + 0.1, 'D6', 0.12); M.marimba(CHK6 + 0.1, 'A5', 0.1);
      M.whoosh(MV6[0], MV6[1] - MV6[0], 0.04, 500, 2000);
      M.whoosh(DROP6[0], DROP6[1] - DROP6[0], 0.04, 2400, 400);
      M.thump(DROP6[1], 0.42); M.snap(DROP6[1], 0.14); M.coin(DROP6[1] + 0.1, 'A6', 0.1);
      M.ep(6.0, 'F#5', 0.08); M.ep(6.4, 'A5', 0.07);
    },
  };

  // =========================================================== 7 · safe
  // The report becomes a lock whose shackle clicks shut. Three badges: ISO 27001, NEN 7510, AVG.
  const lk = perLayout(() => {
    const lw = G.R * (G.portrait ? 0.8 : 0.72), lh = lw * 0.78, y = G.R * 0.12;
    return { lw, lh, y, top: y - lh / 2, rs: lw * 0.3, ts: lw * 0.12, lg: lw * 0.16, lift: lw * 0.2 };
  });
  const NS7 = 36, CLOSE7 = 2.9;
  function shackle7(k, b) {
    const L = lk(), legs = L.lg + L.ts * 0.6, arc = PI * L.rs, tot = 2 * legs + arc, s = (k / (NS7 - 1)) * tot;
    let x, y;
    if (s < legs) { x = -L.rs; y = L.top + L.ts * 0.6 - s; }
    else if (s < legs + arc) { const a = PI - ((s - legs) / arc) * PI; x = Math.cos(a) * L.rs; y = L.top - L.lg - Math.sin(a) * L.rs; }
    else { x = L.rs; y = L.top - L.lg + (s - legs - arc); }
    const open = 1 - E.inCubic(clamp((b - CLOSE7 + 0.3) / 0.3)), rot = -0.35 * open, px = -L.rs, py = L.top;
    const cs = Math.cos(rot), sn = Math.sin(rot), dx = x - px, dy = y - py - L.lift * open;
    return [px + dx * cs - dy * sn, py + dx * sn + dy * cs];
  }
  const BADGE7 = [0.5, 0.65, 0.8], TICK7 = [1.0, 1.25, 1.5];
  const bdg = perLayout(() => {
    const L = lk(), gap = G.R * 0.08, w = Math.min(G.R * 0.66, (gw() - 2 * gap) / 3), h = Math.max(30, G.R * 0.19);
    return { w, h, gap, y: L.y + L.lh / 2 + G.R * 0.28, x: (k) => (k - 1) * (w + gap) };
  });
  const S7 = {
    name: 'veilig',
    title: 'Veilig',
    beats: 6,
    blend: { start: (i) => (i >= 10 && i < 10 + NS7 ? ((i - 10) / NS7) * 0.3 : 0), dur: 0.8, ease: E.glide, arc: 0.14 },
    field: (b) => 1 - E.inOutSine(clamp(b / 1.2)),
    pose(i, b, p) {
      const L = lk(), clunk = hit(b, CLOSE7, 5);
      if (i === 5) return rect(p, 0, L.y + clunk * L.lh * 0.03, L.lw * (1 + 0.04 * clunk), L.lh * (1 - 0.04 * clunk), L.lw * 0.14, C.navy);
      if (i === 0) return circle(p, 0, L.y - L.lh * 0.1 + clunk * L.lh * 0.03, L.lw * 0.17, C.bg);
      if (i === 8) { const y = L.y + clunk * L.lh * 0.03; return seg(p, 0, y - L.lh * 0.06, 0, y + L.lh * 0.17, L.lw * 0.075, C.bg); }
      if (i >= 10 && i < 10 + NS7) { const [x, y] = shackle7(i - 10, b); return circle(p, x, y, L.ts, mix(C.ink, C.navy, 0.35)); }
      if (i >= 70 && i < 76) {
        const B = bdg(), k = (i - 70) % 3, e = E.outBack(clamp((b - BADGE7[k]) / 0.4)), x = B.x(k);
        if (e <= 1e-3) return hide(p);
        if (i < 73) return rect(p, x, B.y, B.w * e, B.h * e, B.h * 0.5 * e, C.white);
        const ok = clamp((b - TICK7[k]) / 0.12), pk = hit(b, TICK7[k], 5);
        return circle(p, x - B.w / 2 + B.h * 0.5, B.y, B.h * 0.42 * e * (1 + 0.3 * pk), mix(C.line, C.navy, ok));
      }
      hide(p);
    },
    type: [
      { id: 'veilig.iso', at: 0.6, to: 5.85, text: 'ISO 27001', ...badgeLab(0) },
      { id: 'veilig.nen', at: 0.75, to: 5.85, text: 'NEN 7510', ...badgeLab(1) },
      { id: 'veilig.avg', at: 0.9, to: 5.85, text: 'AVG', ...badgeLab(2) },
      { id: 'veilig.a', at: 0.3, to: 2.9, text: 'ISO- en NEN-gecertificeerd. | Volledig *AVG-proof.*' },
      { id: 'veilig.b', at: 3.1, to: 5.85, text: 'Geen audio-opslag. | Nooit training op *jouw* *data.*' },
    ],
    music(M) {
      M.pad(0, 'B2 F#3 A3 D4', 3, 0.26); M.sub(0, 'B1', 3, 0.2);
      M.pad(3, 'G2 D3 F#3 B3', 3, 0.26); M.sub(3, 'G1', 3, 0.2);
      groove(M, 0, 6, 0.24, 0.03);
      for (let b = 0; b < 6; b += 0.5) M.bass(b, b < 3 ? 'B1' : 'G1', 0.3, 0.18);
      BADGE7.forEach((t, k) => M.marimba(t, ['F#5', 'A5', 'B5'][k], 0.08, (k - 1) * 0.5));
      TICK7.forEach((t, k) => M.coin(t, ['D6', 'F#6', 'A6'][k], 0.08, (k - 1) * 0.5));
      M.whoosh(CLOSE7 - 0.4, 0.4, 0.04, 2000, 500);
      M.stamp(CLOSE7, 0.5); M.thump(CLOSE7, 0.4); M.click(CLOSE7 + 0.05, 0.3);
      for (let b = 3; b < 6; b += 2) M.clap(b, 0.1);
      M.ep(4.0, 'D6', 0.08); M.ep(4.5, 'B5', 0.07);
      M.riser(4.2, 1.8, 0.08);
    },
  };
  function badgeLab(k) {
    return {
      cls: 'lab', ax: 0, size: () => Math.max(13, Math.min(G.F * 0.32, bdg().h * 0.42)),
      x: xF(() => bdg().x(k) - bdg().w / 2 + bdg().h * 0.95), y: yF(() => bdg().y),
    };
  }

  // =========================================================== 8 · trusted
  // The lock bursts into a crowd of care professionals; the counter runs to 7.500+. You join them.
  const NC = 140;
  const crowd = perLayout(() => {
    const r1 = Math.min(G.R * 0.95, G.W * 0.46), r0 = r1 * 0.46, d = r1 * 0.075, pts = [];
    for (let k = 0; k < NC; k++) {
      const r = Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * ((k + 0.5) / NC)), a = k * BJ.GA;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return { r0, r1, d, pts };
  });
  const CROWDC = () => [C.navy, C.clay, C.peach, C.ink, mix(C.navy, C.sky, 0.45)];
  const t8 = (k) => (k < NS7 ? 0 : 0.3 + 2.6 * Math.pow((k - NS7) / (NC - NS7 - 1), 0.85));
  const spin8 = (b) => b * 0.04;
  const crowdXY = (k, b) => { const K = crowd(), [x, y] = K.pts[k], a = spin8(b), c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
  const JOIN8 = 3.6;
  const join8 = () => { const K = crowd(), a = -PI * 0.22, r = K.r1 + K.d * 1.4; return [Math.cos(a) * r, Math.sin(a) * r]; };
  const count8 = (b) => 7500 * E.outCubic(clamp((b - 0.3) / 2.8));
  const S8 = {
    name: 'vertrouwd',
    title: '7.500+ zorgprofessionals',
    beats: 6,
    blend: { start: (i) => (i >= 10 && i < 10 + NS7 ? ((i - 10) / NS7) * 0.2 : 0), dur: 0.7, ease: E.glide, arc: 0.1 },
    pose(i, b, p) {
      const K = crowd();
      if (i === 0) {
        const f = clamp((b - JOIN8) / 0.6);
        if (f <= 0) return hide(p);
        const [jx, jy] = join8(), sx = G.W * 0.55, sy = jy - G.R * 0.4, u = E.outCubic(f);
        circle(p, lerp(sx, jx, u), lerp(sy, jy, u) - Math.sin(PI * u) * G.R * 0.15, K.d * 1.7 * (1 + 0.3 * hit(b, JOIN8 + 0.6, 4)), C.clay);
        return;
      }
      if (i >= 10 && i < 10 + NC) {
        const k = i - 10, e = E.outBack(clamp((b - t8(k)) / 0.35));
        if (e <= 1e-3) return hide(p);
        const [x, y] = crowdXY(k, b), pk = hit(b, JOIN8 + 0.6, 4) * Math.max(0, 1 - Math.hypot(x - join8()[0], y - join8()[1]) / (K.r1 * 0.9));
        return circle(p, x, y, K.d * e * (1 + 0.5 * pk), CROWDC()[Math.floor(hash(k + 3) * 5)]);
      }
      hide(p);
    },
    type: [
      { id: 'vertrouwd.num', at: 0.2, to: 5.85, fn: (b) => Math.round(count8(b) / 10) * 10 === 7500 ? '7.500+' : (Math.round(count8(b) / 10) * 10).toLocaleString('nl-NL'), cls: 'num', size: () => Math.min(G.F * 1.0, crowd().r0 * 0.5), y: () => G.cy / G.H },
      { id: 'vertrouwd.a', at: 0.3, to: 2.9, text: 'De nummer één in | spraakgestuurd rapporteren.' },
      { id: 'vertrouwd.b', at: 3.1, to: 5.85, text: 'Al in gebruik bij | *7.500+* zorgprofessionals.' },
    ],
    music(M) {
      M.pad(0, 'D3 A3 C#4 F#4', 2, 0.26); M.sub(0, 'D2', 2, 0.2);
      M.pad(2, 'B2 F#3 A3 D4', 2, 0.26); M.sub(2, 'B1', 2, 0.2);
      M.pad(4, 'G2 D3 F#3 B3', 2, 0.26); M.sub(4, 'G1', 2, 0.2);
      M.splash(0, 0.1); M.whoosh(0, 0.5, 0.04, 400, 2400);
      groove(M, 0, 6, 0.26, 0.035);
      for (let b = 0; b < 6; b += 0.5) M.bass(b, ['D2', 'B1', 'G1'][Math.floor(b / 2)], 0.3, 0.2);
      for (let b = 1; b < 6; b += 2) M.clap(b, 0.12);
      for (let b = 0.25; b < 6; b += 0.5) M.shaker(b, 0.03);
      for (let k = NS7; k < NC; k += 8) M.blip(t8(k), penta(5 + Math.floor((k - NS7) / 8), 4), 0.05, Math.cos(k * BJ.GA) * 0.6);
      M.coin(3.1, 'D6', 0.1); M.bell(3.1, 'A5', 0.1);
      M.whoosh(JOIN8, 0.6, 0.04, 600, 2400); M.pluck(JOIN8 + 0.6, 'F#6', 0.12, 0.5, 0.25); M.thump(JOIN8 + 0.6, 0.3);
      M.riser(4.4, 1.6, 0.1);
    },
  };

  // =========================================================== 9 · more time for your client
  // Every dot comes home to Medendo's mark; the mark glides into the logo and the hero stretches
  // into the "Probeer 14 dagen gratis" button.
  const logoW = () => Math.min(G.W * (G.portrait ? 0.78 : 0.5), G.R * 2.4, 600);
  const LOGO = { mx: (174.5 - 750) / 1500, ms: 335 / 1500, ar: 1500 / 350 };
  const CTA_Y = () => (G.portrait ? 0.64 : 0.67);
  const mkF = () => G.R * (G.portrait ? 1.3 : 1.4);
  const TXT9 = [0.3, 3.4], MOVE9 = [3.5, 4.9], LOGO9 = 4.6, FADE9 = [4.9, 5.4], BTN9 = [5.0, 5.8], SHOW9 = 5.8;
  const BEAT9 = [1.5, 2.0, 2.5, 3.0];
  const home9 = perLayout(() => { // which crowd dot takes which slot of the mark (least travel)
    const S = mkF(), end = [];
    for (let k = 0; k < 2 * NM; k++) end.push(crowdXY(k, S8.beats));
    return BJ.assign(2 * NM, (a, j) => { const dx = end[a][0] - MARK[j].x * S, dy = end[a][1] - MARK[j].y * S; return dx * dx + dy * dy; });
  });
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
    title: 'Probeer 14 dagen gratis',
    beats: 10,
    blend: { start: (i) => (i >= 10 && i < 10 + 2 * NM ? MARK[home9()[i - 10]].u * 0.5 : 0), dur: (i) => (i === 0 ? 0.8 : 0.9), ease: E.glide, arc: 0.12 },
    field: (b) => E.inOutSine(clamp((b - 3.2) / 1.6)),
    pose(i, b, p) {
      const mv = E.inOutCubic(clamp((b - MOVE9[0]) / (MOVE9[1] - MOVE9[0]))), beat = maxHit(b, BEAT9, 5), LW = logoW();
      const S = lerp(mkF() * (1 + 0.02 * beat), LOGO.ms * LW, mv), cx = lerp(0, LOGO.mx * LW, mv);
      if (i === 0) {
        const d0 = G.R * 0.13 * (1 + 0.35 * beat), est = { x: 0, y: G.H * CTA_Y() - G.cy, w: Math.max(240, G.F * 4), h: 56 };
        const bt = button() || est, st = E.inOutCubic(clamp((b - BTN9[0]) / (BTN9[1] - BTN9[0])));
        const dm = lerp(d0, 0.2 * S, mv), hx = cx, hy = 0.06 * S;
        rect(p, lerp(hx, bt.x, st), lerp(hy, bt.y, E.inOutSine(st)), lerp(dm, bt.w, st), lerp(dm, bt.h, st), lerp(dm / 2, bt.h / 2, st), mix(C.clay, C.black || C.ink, st));
        if (b > SHOW9 + 1.0) hide(p);
        return;
      }
      if (i >= 10 && i < 10 + 2 * NM) {
        markDot(p, home9()[i - 10], S, cx, 0);
        p.o *= 1 - clamp((b - FADE9[0]) / (FADE9[1] - FADE9[0]));
        return;
      }
      hide(p);
    },
    type: [
      { id: 'fin.a', at: TXT9[0], to: TXT9[1], text: 'Meer tijd voor je cliënt. | Minder *schermtijd.*', stagger: 0.1 },
      { id: 'fin.logo', at: LOGO9, to: Infinity, html: '<img src="img/logo.webp" alt="Medendo">', cls: 'logo', y: () => G.cy / G.H, size: () => logoW() / LOGO.ar, fade: 0.6 },
      {
        id: 'fin.cta', at: BTN9[0] - 0.2, show: SHOW9, to: Infinity, cls: 'link', y: CTA_Y, fade: 0.8,
        html: '<a href="https://www.medendo.com/pricing" target="_blank" rel="noopener">Probeer 14 dagen gratis</a>' +
          '<small>medendo.com &middot; maandelijks opzegbaar</small>',
      },
    ],
    music(M) {
      M.pad(0, 'B2 F#3 A3 D4', 1.5, 0.28); M.sub(0, 'B1', 1.5, 0.2);
      M.pad(1.5, 'G2 D3 F#3 B3', 1.5, 0.28); M.sub(1.5, 'G1', 1.5, 0.22);
      M.pad(3.0, 'A2 E3 G3 C#4', MOVE9[1] - 3.0, 0.28); M.sub(3.0, 'A1', MOVE9[1] - 3.0, 0.22);
      M.kick(0, 0.4); M.splash(0, 0.12);
      groove(M, 0, 3, 0.24, 0.03);
      const ARP = ['D5', 'F#5', 'A5', 'B5', 'D6', 'E6'];
      ARP.forEach((n, k) => M.pluck(0.1 + k * 0.1, n, 0.08, k % 2 ? 0.4 : -0.4, 0.18));
      BEAT9.forEach((t, k) => M.thump(t, k % 2 ? 0.26 : 0.4));
      M.whoosh(MOVE9[0], MOVE9[1] - MOVE9[0], 0.05, 300, 2200);
      M.kick(MOVE9[1], 0.5); M.boom(MOVE9[1], 0.32); M.splash(MOVE9[1], 0.18);
      M.bell(MOVE9[1], 'D6', 0.2); M.bell(MOVE9[1] + 0.25, 'F#6', 0.15, 0.3); M.bell(MOVE9[1] + 0.5, 'A6', 0.12, -0.3);
      M.pad(MOVE9[1], 'D3 A3 C#4 F#4', 10 - MOVE9[1], 0.32); M.sub(MOVE9[1], 'D2', 10 - MOVE9[1], 0.24);
      M.whoosh(BTN9[0], 0.8, 0.04, 400, 1800);
      M.marimba(SHOW9, 'A5', 0.14); M.marimba(SHOW9 + 0.2, 'D6', 0.12);
      M.ep(8.0, 'F#5', 0.1); M.ep(8.02, 'D5', 0.08);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8, S9];
})();
