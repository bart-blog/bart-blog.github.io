/* Clember — "From fragments to the full circle." A commercial in 150 shapes.
   A new client means a wreath of scattered documents. They shatter into a spreadsheet that fills
   cell by cell, week after week, and the spreadsheet folds into a donut chart: up to 60% of a
   consultant's time goes to busywork. Then a blue spark runs once around that ring and ignites it
   into Clember's rainbow ring. The ring becomes the engine: documents and tools flow in, risks,
   roadmaps and compliance flow out, every framework is mapped, the risk posture goes live,
   reporting time drops by 90% and one consultant serves 2–3× more clients. Finally the ring
   settles into the logo and the spark stretches into the "Book a demo" button.
   The hero (shape 0) is the consultant's attention: a cursor, then the spark, the AI core,
   the "now" on the chart, the consultant, and the button.
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
  const PENTA = ['A', 'B', 'C#', 'E', 'F#'];
  const penta = (k, base = 4) => PENTA[((k % 5) + 5) % 5] + (base + Math.floor(k / 5));
  function groove(M, a, z, v = 0.24, hat = 0.03) { for (let b = a; b < z - 0.01; b += 1) { M.kick(b, v); M.tick(b + 0.5, hat, 0.25); } }
  const gw = () => Math.min(G.W * 0.88, G.R * (G.short ? 4.2 : 3.3));
  const invSine = (u) => Math.acos(1 - 2 * clamp(u)) / PI; // inverse of ease.inOutSine
  function tumble(p, f, s) { // things that break loose: they fall, spin and fade (f from 0 to 1)
    if (f <= 0) return;
    p.y += f * f * G.H * 0.8; p.x += s * f * G.R * 0.5;
    p.rot += f * s * 1.6; p.rx += f * 1.8 * (s > 0 ? 1 : -1);
    p.o *= 1 - clamp((f - 0.4) / 0.5);
  }

  // ------------------------------------------------------------ the ring (Clember's logo)
  // 100 shapes, slot s at angle s/100 of a turn, clockwise from 12 o'clock, each with its rainbow colour.
  const NR = 100;
  const RING = [C.r1, C.r2, C.r3, C.r4, C.r5, C.r6, C.r7, C.r8];
  function rainbow(u) {
    const k = (((u % 1) + 1) % 1) * RING.length, a = Math.floor(k);
    return mix(RING[a], RING[(a + 1) % RING.length], k - a);
  }
  // each dot overlaps ~3 neighbours on each side, and the last one lies on top of the first few, so the
  // colour holds still around 12 o'clock (dots 96–3) and that seam can't show
  const ringC = (s) => rainbow(clamp((s - 3) / (NR - 7)));
  const ringXY = (s, r, spin = 0) => { const a = (s / NR) * TAU + spin; return [Math.sin(a) * r, -Math.cos(a) * r]; };
  // the ring as a logo: thickness / mid radius of the mark in the logo file
  const THICK = 88 / 192;
  const bigR = () => G.R * 0.78;
  // the donut chart (scene 3): two alternating rows of small dots
  const donutR = (s) => G.R * (s % 2 ? 0.86 : 0.72);
  const donutD = () => G.R * 0.075;

  // ------------------------------------------------------------ the spreadsheet (scene 2)
  // 10 × 10 cells plus a header row and column. Which shape takes which cell is solved once per
  // layout (Hungarian), so the sheet folds into the donut with the least travel.
  const sheet = perLayout(() => {
    const W = gw();
    const cw = G.portrait ? Math.min(W / 11, G.R * 0.2) : Math.min((W * 0.86) / 11, G.R * 0.3);
    const ch = Math.min(cw * (G.portrait ? 0.62 : 0.55), (G.H * (G.portrait ? 0.3 : 0.48)) / 11);
    const pos = [];
    for (let j = 0; j < 100; j++) pos.push([((j % 10) - 4) * cw, (Math.floor(j / 10) - 4) * ch]);
    const ring = [];
    for (let s = 0; s < NR; s++) ring.push(ringXY(s, donutR(s)));
    const a = BJ.assign(100, (s, j) => { const dx = ring[s][0] - pos[j][0], dy = ring[s][1] - pos[j][1]; return dx * dx + dy * dy; });
    const at = new Int32Array(100);
    for (let s = 0; s < 100; s++) at[a[s]] = s + 1; // cell → shape
    return { cw, ch, pos, cell: a, at, top: -5 * ch };
  });

  // =========================================================== 1 · a new client, a pile of paper
  // Ten documents land in a loose wreath around the consultant (the hero dot), faster and faster.
  // Document k is drawn by shapes 1 + 10k … 6 + 10k: a page, a title and four lines of text.
  const TL1 = [0.5, 1.5, 2.5, 3.0, 3.5, 4.0, 4.5, 4.75, 5.0, 5.25], FALL1 = 0.32;
  const R1 = rnd(11, 60);
  const docs = perLayout(() => {
    const dw = Math.min(G.R * 0.5, gw() * 0.28), dh = dw * 1.28, out = [];
    const sx = G.portrait ? 1.0 : 1.35;
    for (let k = 0; k < 10; k++) {
      const a = ((10 * k + 3) / NR) * TAU + (R1[k] - 0.5) * 0.3, rho = G.R * (0.52 + 0.14 * R1[10 + k]);
      out.push({ x: Math.sin(a) * rho * sx, y: -Math.cos(a) * rho * 0.9, rot: (R1[20 + k] - 0.5) * 0.55 });
    }
    return { dw, dh, d: out };
  });
  const DOCC = R1.slice(30, 40).map((v) => mix(C.soft, C.line, 0.15 + 0.7 * v));
  const TXT = () => mix(C.mute, C.soft, 0.35);
  function docPart(p, k, part, b) {
    const D = docs(), d = D.d[k], dw = D.dw, dh = D.dh, t = TL1[k];
    const f = clamp((b - t + FALL1) / FALL1);
    if (f <= 0) return hide(p);
    const fall = 1 - f * f, rot = d.rot + fall * (R1[40 + k] - 0.5) * 1.2;
    const cx = d.x, cy = d.y - fall * G.H * 0.65, cs = Math.cos(rot), sn = Math.sin(rot);
    const sq = hit(b, t, 7, 0.02), sw = 1 + 0.08 * sq, shh = 1 - 0.08 * sq;
    const P = (lx, ly) => [cx + (lx * cs - ly * sn) * sw, cy + (lx * sn + ly * cs) * shh];
    if (part === 0) { rect(p, cx, cy, dw * sw, dh * shh, dw * 0.07, DOCC[k]); p.rot = rot; return; }
    let x0, y0, len, th, c;
    if (part === 1) { x0 = -dw * 0.36; y0 = -dh * 0.33; len = dw * 0.44; th = dw * 0.075; c = C.busy; }
    else { const m = part - 2; x0 = -dw * 0.36; y0 = -dh * 0.12 + m * dh * 0.13; len = dw * (0.72 - (m === 3 ? 0.3 : 0.18 * R1[50 + m])); th = dw * 0.04; c = TXT(); }
    const a = P(x0 + th / 2, y0), z = P(x0 + len - th / 2, y0);
    seg(p, a[0], a[1], z[0], z[1], th, c);
  }
  const heroDoc = (k) => (k < 0 ? [0, 0] : [docs().d[k].x, docs().d[k].y]);
  const S1 = {
    name: 'pile',
    title: 'A pile of paper',
    beats: 7,
    introBeat: 0,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      if (i === 0) {
        let k = -1;
        for (let n = 0; n < TL1.length; n++) if (b >= TL1[n]) k = n;
        const [x0, y0] = heroDoc(k - 1), [x1, y1] = heroDoc(k), e = k < 0 ? 1 : E.inOutCubic(clamp((b - TL1[k]) / 0.3));
        const land = k < 0 ? 0 : hit(b, TL1[k] + 0.3, 6), d = G.R * 0.1;
        circle(p, lerp(x0, x1, e), lerp(y0, y1, e) - Math.sin(PI * e) * G.R * 0.18, d, C.ink);
        p.w *= 1 + 0.25 * land; p.h *= 1 - 0.2 * land;
        return;
      }
      if (i > NR) return hide(p);
      const k = Math.floor((i - 1) / 10), part = (i - 1) % 10;
      if (part > 5) return hide(p);
      docPart(p, k, part, b);
    },
    type: [
      { id: 'pile.a', at: 0.3, to: 3.3, text: 'New client. | New security assessment.' },
      { id: 'pile.b', at: 3.5, to: 6.85, text: 'Documents. Spreadsheets. | Scattered reports.' },
    ],
    music(M) {
      M.pad(0, 'F#2 C#3 A3 E4', 7, 0.24); M.sub(0, 'F#1', 7, 0.16);
      TL1.forEach((t, k) => {
        const x = docs().d[k].x / (G.W || 1);
        M.thump(t, 0.22 + 0.02 * k); M.tick(t, 0.03, x); M.snip(t);
        M.marimba(t + 0.3, penta(9 - (k % 6), 4), 0.1, x);
      });
      M.ep(0.5, 'C#5', 0.1); M.ep(2.5, 'A4', 0.1); M.ep(4.5, 'E5', 0.1);
      for (let b = 3; b < 7; b += 1) M.kick(b, 0.14);
      M.whoosh(6.2, 0.8, 0.05, 500, 2400);
    },
  };

  // =========================================================== 2 · weeks of manual work
  // The pages shatter into a spreadsheet. A cursor fills it cell by cell, week after week.
  const tc2 = (n) => 0.9 + 6.2 * Math.pow(n / 99, 0.6);
  const filled2 = (b) => (b < 0.9 ? 0 : Math.min(100, Math.floor(99 * Math.pow(clamp((b - 0.9) / 6.2), 1 / 0.6)) + 1));
  const week2 = (b) => 1 + Math.min(5, Math.floor((filled2(b) / 100) * 6));
  const S2 = {
    name: 'grind',
    title: 'Weeks of manual work',
    beats: 8,
    blend: { start: (i) => (i > 0 && i <= NR ? ((i - 1) % 10) * 0.035 : 0), dur: (i) => (i === 0 ? 0.6 : 0.9), ease: E.glide, arc: 0.12 },
    pose(i, b, p) {
      const S = sheet(), cw = S.cw, ch = S.ch;
      if (i === 0) {
        const n = Math.max(0, filled2(b) - 1), q = S.pos[n], q0 = S.pos[Math.max(0, n - 1)];
        const e = E.outCubic(clamp((b - tc2(n)) / 0.12)), tk = hit(b, tc2(n), 8);
        pill(p, lerp(q0[0], q[0], e) - cw * 0.3, lerp(q0[1], q[1], e), ch * 0.62 * (1 + 0.15 * tk), Math.max(2, ch * 0.13), 0, C.ink);
        return;
      }
      if (i <= NR) {
        const j = S.cell[i - 1], q = S.pos[j], e = E.outBack(clamp((b - 0.2 - (Math.floor(j / 10) + (j % 10)) * 0.025) / 0.4));
        const t = tc2(j), f = clamp((b - t) / 0.12), pk = hit(b, t, 7);
        rect(p, q[0], q[1], cw * 0.92 * e * (1 + 0.1 * pk), ch * 0.84 * e * (1 + 0.2 * pk), ch * 0.16, mix(C.soft, C.mute, f));
        return;
      }
      if (i <= NR + 20) { // header row and column
        const k = i - NR - 1, col = k < 10, x = col ? (k - 4) * cw : -5 * cw, y = col ? -5 * ch : (k - 10 - 4) * ch;
        const e = E.outBack(clamp((b - 0.1 - (k % 10) * 0.03) / 0.4));
        rect(p, x, y, cw * 0.92 * e, ch * 0.84 * e, ch * 0.16, C.line);
        return;
      }
      hide(p);
    },
    type: [
      { id: 'grind.week', at: 0.4, to: 7.85, fn: (b) => 'Week ' + week2(b), cls: 'num', size: 0.55, y: yF(() => sheet().top - sheet().ch * 0.5 - G.F * 0.55) },
      { id: 'grind.a', at: 0.5, to: 3.8, text: 'Weeks of | manual analysis.' },
      { id: 'grind.b', at: 4.0, to: 7.85, text: 'Rewriting the same | findings. Again.' },
    ],
    music(M) {
      M.pad(0, 'D3 A3 C#4 F#4', 4, 0.24); M.sub(0, 'D2', 4, 0.18);
      M.pad(4, 'B2 F#3 A3 D4', 4, 0.24); M.sub(4, 'B1', 4, 0.18);
      for (let n = 0; n < 100; n++) M.key(tc2(n), 0.05 + 0.08 * (1 - n / 99), ((n % 10) / 9 - 0.5) * 0.7);
      for (let n = 0; n < 100; n += 10) M.marimba(tc2(n), penta(3 + n / 10, 4), 0.07, 0);
      let w = 1;
      for (let b = 0.9; b < 8; b += 0.05) { const ww = week2(b); if (ww !== w) { w = ww; M.beep(b, penta(w + 4, 4), 0.07); } }
      groove(M, 0, 8, 0.16, 0.02);
      for (let b = 0; b < 8; b += 0.5) M.bass(b, b < 4 ? 'D2' : 'B1', 0.3, 0.18);
      M.whoosh(7.2, 0.8, 0.05, 2400, 500);
    },
  };

  // =========================================================== 3 · 60% busywork
  // The sheet folds into a donut chart. A dark sweep eats 60% of it.
  const SW3 = [1.0, 3.0];
  const sweep3 = (b) => clamp((b - SW3[0]) / (SW3[1] - SW3[0]));
  const ts3 = (s) => SW3[0] + (SW3[1] - SW3[0]) * (s / 60);
  function donutDot(p, s, b, pulse = 0) {
    const [x, y] = ringXY(s, donutR(s)), busy = s < 60 ? clamp((b - ts3(s)) / 0.15) : 0, pk = s < 60 ? hit(b, ts3(s), 6) : 0;
    circle(p, x, y, donutD() * (1 + 0.45 * pk) * (1 + pulse), mix(C.line, C.busy, busy));
  }
  const S3 = {
    name: 'sixty',
    title: '60% busywork',
    beats: 6,
    blend: { start: (i) => (i > 0 && i <= NR ? ((i - 1) / NR) * 0.5 : 0), dur: 0.95, ease: E.glide, arc: 0.18 },
    pose(i, b, p) {
      if (i === 0) {
        const a = 0.6 * sweep3(b), [x, y] = ringXY(a * NR, G.R * 0.79), pk = hit(b, SW3[1], 4);
        circle(p, x, y, G.R * 0.14 * (1 + 0.3 * pk), C.ink);
        return;
      }
      if (i > NR) return hide(p);
      donutDot(p, i - 1, b);
    },
    type: [
      { id: 'sixty.num', at: 0.6, to: 5.85, fn: (b) => Math.round(60 * sweep3(b)) + '%', cls: 'num', size: 1.45, y: () => G.cy / G.H },
      { id: 'sixty.a', at: 0.8, to: 5.85, text: 'Up to *60%* of your time. | Spent on busywork.' },
    ],
    music(M) {
      M.pad(0, 'G2 D3 F#3 B3', 3, 0.24); M.sub(0, 'G1', 3, 0.18);
      M.riser(SW3[0], SW3[1] - SW3[0], 0.1);
      for (let s = 0; s < 60; s += 4) M.tick(ts3(s), 0.03 + s * 0.0006, Math.sin((s / NR) * TAU) * 0.7);
      for (let s = 0; s < 60; s += 12) M.marimba(ts3(s), penta(8 - s / 12, 3), 0.08, Math.sin((s / NR) * TAU) * 0.7);
      M.boom(SW3[1], 0.34); M.thump(SW3[1], 0.4); M.womp(SW3[1], 'F#2', 1.2, 0.14);
      M.pad(3, 'E2 B2 D3 G#3', 3, 0.22); M.sub(3, 'E1', 3, 0.2);
      M.ep(3.8, 'D5', 0.08); M.ep(4.8, 'B4', 0.08);
    },
  };

  // =========================================================== 4 · meet Clember
  // The dot moves into the middle, beats twice, and runs once around the ring. Every dot it
  // passes swells into its rainbow colour, until the ring is Clember's logo.
  const RUN4 = [2.4, 3.8], HEART4 = [1.0, 1.5];
  const ti4 = (s) => RUN4[0] + (RUN4[1] - RUN4[0]) * invSine(s / NR);
  function logoDot(p, s, b0, cx = 0, cy = 0, r = bigR(), spin = 0) { // one dot of the ignited ring
    const e = b0 === null ? 1 : E.outBack(clamp(b0 / 0.35)), [x, y] = ringXY(s, r, spin);
    circle(p, cx + x, cy + y, r * THICK * e, ringC(s));
  }
  const S4 = {
    name: 'meet',
    title: 'Meet Clember',
    beats: 7,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const heart = maxHit(b, HEART4, 5);
      if (i === 0) {
        const pk = hit(b, 0, 4), [sx, sy] = ringXY(0.6 * NR, G.R * 0.79), g = E.glide(clamp((b - 0.2) / 0.7));
        if (b < RUN4[0] - 0.4) {
          circle(p, lerp(sx, 0, g), lerp(sy, 0, g), G.R * lerp(0.14 * (1 + 0.3 * pk), 0.18, g) * (1 + 0.3 * heart), mix(C.ink, C.blue, g));
          return;
        }
        const up = E.inOutCubic(clamp((b - (RUN4[0] - 0.4)) / 0.4)), run = E.inOutSine(clamp((b - RUN4[0]) / (RUN4[1] - RUN4[0])));
        const [rx, ry] = ringXY(run * NR, bigR()), out = E.inCubic(clamp((b - RUN4[1]) / 0.4));
        const d = G.R * lerp(0.18, 0.28, up) * (1 - out);
        if (d <= 0.5) return hide(p);
        circle(p, lerp(0, rx, up), lerp(0, ry, up), d, b < RUN4[0] ? C.blue : mix(rainbow(run), C.white, 0.35));
        return;
      }
      if (i > NR) return hide(p);
      const s = i - 1, t = ti4(s);
      if (b < t) {
        donutDot(p, s, b + 6, heart * 0.25); // the donut exactly as scene 3 left it
        return;
      }
      const e = E.outBack(clamp((b - t) / 0.35)), [x0, y0] = ringXY(s, donutR(s)), [x1, y1] = ringXY(s, bigR());
      const br = 1 + 0.012 * Math.sin((b - RUN4[1]) * PI * 0.5) * clamp(b - RUN4[1]);
      circle(p, lerp(x0, x1, e) * br, lerp(y0, y1, e) * br, lerp(donutD(), bigR() * THICK, e), mix(s < 60 ? C.busy : C.line, ringC(s), clamp((b - t) / 0.15)));
    },
    type: [
      { id: 'meet.q', at: 0.3, to: 2.2, text: 'Time to take it | off your hands.' },
      { id: 'meet.name', at: 3.9, to: 6.85, text: 'Meet *Clember.*', size: 1.2, stagger: 0.12 },
      { id: 'meet.sub', at: 4.5, to: 6.85, text: 'The AI platform for cyber security consulting.', cls: 'sub', size: 0.42, y: () => (G.textY + G.F * 1.05) / G.H },
    ],
    music(M) {
      M.pad(0, 'E2 B2 D3 G#3', RUN4[0], 0.2); M.sub(0, 'E1', RUN4[0], 0.2);
      M.thump(0.3, 0.3); HEART4.forEach((t, k) => M.thump(t, k ? 0.34 : 0.5));
      M.ep(0.9, 'G#4', 0.08);
      M.whoosh(RUN4[0] - 0.5, 0.6, 0.06, 400, 2600);
      const ARP = ['A4', 'C#5', 'E5', 'G#5', 'B5', 'C#6', 'E6', 'G#6', 'A6', 'B6', 'C#7', 'E7'];
      ARP.forEach((n, k) => M.pluck(ti4((k / ARP.length) * NR), n, 0.12, Math.sin((k / ARP.length) * TAU) * 0.8, 0.2));
      M.whoosh(RUN4[0], RUN4[1] - RUN4[0], 0.035, 800, 4000);
      M.kick(RUN4[1], 0.5); M.boom(RUN4[1], 0.3); M.splash(RUN4[1], 0.2);
      M.bell(RUN4[1], 'A5', 0.2); M.bell(RUN4[1] + 0.25, 'C#6', 0.15, 0.3); M.bell(RUN4[1] + 0.5, 'E6', 0.13, -0.3);
      M.pad(RUN4[1], 'A2 E3 B3 C#4 G#4', 7 - RUN4[1], 0.3); M.sub(RUN4[1], 'A1', 7 - RUN4[1], 0.24);
      groove(M, 5, 7, 0.2, 0.025);
      M.ep(5.0, 'E5', 0.1); M.ep(5.5, 'B5', 0.08); M.ep(6.0, 'C#6', 0.08);
    },
  };

  // =========================================================== 5 · in: documents & tools · out: a full posture
  // The ring becomes the engine. Five sources feed it (as on clember.ai), then it moves across and
  // answers with risks & threats, a roadmap and compliance.
  const SW5 = [3.9, 4.8];
  const IN5 = 101, OUT5 = 126; // inputs: 5 × (card, colour dot, dot hole) + 5 lines + 5 packets; outputs: 3 × (card, badge, 2 tick strokes) + 3 lines
  const INC5 = () => [C.r1, C.r6, C.r4, C.r5, C.r2];
  const conn = perLayout(() => {
    const W = gw(), rowH = G.portrait ? Math.min(G.H * 0.07, G.R * 0.34) : Math.min(G.H * 0.085, G.R * 0.28);
    const h = rowH * 0.72, cw = G.portrait ? W * 0.47 : W * 0.25;
    const om = G.portrait ? W * 0.14 : Math.min(W * 0.1, rowH * 1.25), outer = om * (1 + THICK / 2);
    const ox = G.portrait ? W / 2 - outer - W * 0.03 : W * 0.2;
    return { W, rowH, h, cw, om, outer, xA: ox, xB: -ox, inX: -W / 2 + cw / 2, outX: W / 2 - cw / 2, y: (k, n) => (k - (n - 1) / 2) * rowH };
  });
  const sw5 = (b) => E.inOutCubic(clamp((b - SW5[0]) / (SW5[1] - SW5[0])));
  const orbX5 = (b) => lerp(conn().xA, conn().xB, sw5(b));
  const ARR5 = [];
  for (let k = 0; k < 5; k++) for (let n = 0; n < 3; n++) { const t = 1.6 + k * 0.2 + n + 0.6; if (t < SW5[0]) ARR5.push(t); }
  const OUTT5 = [4.7, 5.2, 5.7];
  const S5 = {
    name: 'connect',
    title: 'Documents in, posture out',
    beats: 8,
    blend: { start: (i) => (i > 0 && i <= NR ? ((i - 1) / NR) * 0.3 : 0), dur: (i) => (i === 0 ? 0.8 : 0.9), ease: E.glide, arc: 0.1 },
    pose(i, b, p) {
      const K = conn(), ox = orbX5(b), pulse = maxHit(b, ARR5, 6) + maxHit(b, OUTT5, 5);
      if (i === 0) {
        circle(p, ox, 0, K.om * 0.42 * (1 + 0.35 * pulse) * E.outBack(clamp((b - 0.3) / 0.5)), C.blue);
        return;
      }
      if (i <= NR) {
        const s = i - 1, [x, y] = ringXY(s, K.om * (1 + 0.04 * pulse), b * 0.35);
        circle(p, ox + x, y, K.om * THICK, ringC(s));
        return;
      }
      const out = E.inCubic(clamp((b - SW5[0]) / 0.6)), gone = out >= 1;
      if (i >= IN5 && i < IN5 + 25) {
        if (gone) return hide(p);
        const j = i - IN5, k = j % 5, kind = Math.floor(j / 5), y = K.y(k, 5);
        const e = E.outBack(clamp((b - 0.4 - k * 0.15) / 0.4)), dx = -out * G.W * 0.5, fade = 1 - out;
        const rx = K.inX + K.cw / 2 + dx, dotX = rx - K.h * 0.45;
        if (kind === 0) rect(p, K.inX + dx, y, K.cw * e, K.h * e, K.h * 0.24, C.soft);
        else if (kind === 1) circle(p, dotX, y, K.h * 0.42 * e, INC5()[k]);
        else if (kind === 2) circle(p, dotX, y, K.h * 0.22 * e, C.soft);
        else {
          const a = Math.atan2(-y, ox - rx), ex = ox - Math.cos(a) * K.outer * 1.08, ey = -Math.sin(a) * K.outer * 1.08;
          const g = E.inOutCubic(clamp((b - 1.0 - k * 0.12) / 0.45)), x0 = rx + K.h * 0.2;
          if (g <= 0) return hide(p);
          if (kind === 3) { seg(p, x0, y, lerp(x0, ex, g), lerp(y, ey, g), Math.max(1.5, K.rowH * 0.035), mix(INC5()[k], C.white, 0.25)); }
          else {
            const ph = b - 1.6 - k * 0.2;
            if (ph < 0 || b > SW5[0]) return hide(p);
            const u = (ph % 1) / 0.6;
            if (u > 1) return hide(p);
            const uu = E.inOutSine(u);
            circle(p, lerp(x0, ex, uu), lerp(y, ey, uu), K.rowH * 0.12 * Math.sin(PI * Math.min(1, u * 1.2 + 0.1)), INC5()[k]);
          }
        }
        p.o *= fade;
        return;
      }
      if (i >= OUT5 && i < OUT5 + 15) {
        const j = i - OUT5, k = j % 3, kind = Math.floor(j / 3), y = K.y(k, 3) * 1.25, t = OUTT5[k];
        const lx = K.outX - K.cw / 2, bx = lx + K.h * 0.5;
        if (kind === 4) {
          const a = Math.atan2(y, lx - ox), sx = ox + Math.cos(a) * K.outer * 1.08, sy = Math.sin(a) * K.outer * 1.08;
          const g = E.inOutCubic(clamp((b - t + 0.45) / 0.45));
          if (g <= 0) return hide(p);
          seg(p, sx, sy, lerp(sx, lx - K.h * 0.15, g), lerp(sy, y, g), Math.max(1.5, K.rowH * 0.035), C.line);
          return;
        }
        const e = E.outBack(clamp((b - t) / 0.4));
        if (e <= 1e-3) return hide(p);
        if (kind === 0) { rect(p, K.outX, y, K.cw * e, K.h * e, K.h * 0.24, C.soft); return; }
        const ok = E.outBack(clamp((b - t - 0.15) / 0.35)), d = K.h * 0.46;
        if (kind === 1) { circle(p, bx, y, d * ok, C.green); return; }
        const g = clamp((b - t - 0.3) / 0.25), u = d * 0.5, th = Math.max(1.5, d * 0.13);
        if (g <= 0) return hide(p);
        if (kind === 2) seg(p, bx - u * 0.42, y + u * 0.02, bx - u * 0.1, y + u * 0.32, th, C.white);
        else seg(p, bx - u * 0.1, y + u * 0.32, lerp(bx - u * 0.1, bx + u * 0.46, g), lerp(y + u * 0.32, y - u * 0.3, g), th, C.white);
        return;
      }
      hide(p);
    },
    type: [
      { id: 'connect.people', at: 0.5, to: 4.1, text: 'People', ...inLab(0) },
      { id: 'connect.documents', at: 0.65, to: 4.1, text: 'Documents', ...inLab(1) },
      { id: 'connect.processes', at: 0.8, to: 4.1, text: 'Processes', ...inLab(2) },
      { id: 'connect.infrastructure', at: 0.95, to: 4.1, text: 'Infrastructure', ...inLab(3) },
      { id: 'connect.assets', at: 1.1, to: 4.1, text: 'Assets', ...inLab(4) },
      { id: 'connect.risks', at: OUTT5[0] + 0.1, to: 7.85, text: 'Risks & threats', ...outLab(0) },
      { id: 'connect.roadmaps', at: OUTT5[1] + 0.1, to: 7.85, text: 'Roadmaps', ...outLab(1) },
      { id: 'connect.compliance', at: OUTT5[2] + 0.1, to: 7.85, text: 'Compliance', ...outLab(2) },
      { id: 'connect.a', at: 0.3, to: 3.8, text: 'Upload documents. | Connect your tools.' },
      { id: 'connect.b', at: 4.1, to: 7.85, text: 'Your full security posture. | In *minutes,* not weeks.' },
    ],
    music(M) {
      M.pad(0, 'A2 E3 B3 C#4', 2, 0.26); M.sub(0, 'A1', 2, 0.2);
      M.pad(2, 'F#2 C#3 A3 E4', 2, 0.26); M.sub(2, 'F#1', 2, 0.2);
      M.pad(4, 'D3 A3 C#4 F#4', 2, 0.26); M.sub(4, 'D2', 2, 0.2);
      M.pad(6, 'E3 B3 D4 G#4', 2, 0.26); M.sub(6, 'E2', 2, 0.2);
      groove(M, 0, 8, 0.26, 0.03);
      for (let b = 0; b < 8; b += 0.5) M.bass(b, ['A1', 'F#1', 'D2', 'E2'][Math.floor(b / 2)], 0.3, 0.2);
      for (let b = 1; b < 8; b += 2) M.clap(b, 0.1);
      for (let k = 0; k < 5; k++) M.marimba(0.4 + k * 0.15, penta(5 + k, 4), 0.09, -0.6);
      ARR5.forEach((t, n) => M.blip(t, penta(8 + (n % 5), 4), 0.06, 0.3));
      M.whoosh(SW5[0] - 0.2, 0.9, 0.05, 600, 2600);
      OUTT5.forEach((t, k) => { M.coin(t + 0.15, ['C#6', 'E6', 'A6'][k], 0.1, 0.5); M.marimba(t, ['A5', 'C#6', 'E6'][k], 0.1, 0.5); });
      M.ep(7.0, 'B5', 0.08);
    },
  };
  function inLab(k) {
    return {
      cls: 'lab', ax: 0, size: () => Math.max(13, Math.min(G.F * 0.3, conn().h * 0.36)),
      x: xF(() => conn().inX - conn().cw / 2 + conn().h * 0.32), y: yF(() => conn().y(k, 5)),
    };
  }
  function outLab(k) {
    return {
      cls: 'lab', ax: 0, size: () => Math.max(13, Math.min(G.F * 0.3, conn().h * 0.36)),
      x: xF(() => conn().outX - conn().cw / 2 + conn().h * 0.9), y: yF(() => conn().y(k, 3) * 1.25),
    };
  }

  // =========================================================== 6 · every framework, mapped
  // The engine moves to the middle; six frameworks gather around it. One by one it fires a
  // finding at each, and each one ticks green.
  const TILE6 = 101; // 6 × (tile, badge, tick a, tick b, beam, packet)
  const FIRE6 = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5], FLY6 = 0.35;
  const fw = perLayout(() => {
    const W = gw();
    if (!G.portrait) {
      const tw = Math.min(G.R * 0.78, W * 0.24), th = tw * 0.36, rx = Math.min(W / 2 - tw / 2, G.R * 1.45), ry = G.R * 0.82;
      return { tw, th, om: G.R * 0.3, pos: [0, 1, 2, 3, 4, 5].map((k) => { const a = ((-60 + k * 60) * PI) / 180; return [Math.cos(a) * rx, Math.sin(a) * ry, a]; }) };
    }
    const tw = W * 0.44, th = tw * 0.36, rx = (W / 2 - tw / 2) / Math.cos(PI / 6), ry = G.R;
    return { tw, th, om: G.R * 0.2, pos: [0, 1, 2, 3, 4, 5].map((k) => { const a = ((-90 + k * 60) * PI) / 180; return [Math.cos(a) * rx, Math.sin(a) * ry, a]; }) };
  });
  const tileCol6 = (k) => rainbow(((fw().pos[k][2] / TAU + 0.25) % 1 + 1) % 1);
  function beam6(k) { // from the ring's edge to the tile's edge
    const F = fw(), [tx, ty] = F.pos[k], L = Math.hypot(tx, ty), ux = tx / L, uy = ty / L;
    const r0 = F.om * (1 + THICK / 2) * 1.12, cut = Math.min(F.tw / 2 / Math.max(1e-3, Math.abs(ux)), F.th / 2 / Math.max(1e-3, Math.abs(uy)));
    return [ux * r0, uy * r0, tx - ux * (cut + F.th * 0.12), ty - uy * (cut + F.th * 0.12)];
  }
  const S6 = {
    name: 'frameworks',
    title: 'Every framework',
    beats: 6,
    blend: { start: (i) => (i > 0 && i <= NR ? ((i - 1) / NR) * 0.2 : 0), dur: 0.8, ease: E.glide },
    pose(i, b, p) {
      const F = fw(), pulse = maxHit(b, FIRE6, 5);
      if (i === 0) { circle(p, 0, 0, F.om * 0.42 * (1 + 0.4 * pulse), C.blue); return; }
      if (i <= NR) {
        const s = i - 1, [x, y] = ringXY(s, F.om * (1 + 0.05 * pulse), (8 + b) * 0.35);
        circle(p, x, y, F.om * THICK, ringC(s));
        return;
      }
      if (i < TILE6 || i >= TILE6 + 36) return hide(p);
      const j = i - TILE6, k = j % 6, kind = Math.floor(j / 6), [tx, ty] = F.pos[k], t = FIRE6[k];
      const e = E.outBack(clamp((b - 0.25 - k * 0.08) / 0.4));
      if (e <= 1e-3) return hide(p);
      const bx = tx + F.tw / 2 - F.th * 0.45, d = F.th * 0.44, ok = clamp((b - t - FLY6) / 0.12), pk = hit(b, t + FLY6, 5);
      if (kind === 0) { rect(p, tx, ty, F.tw * e * (1 + 0.05 * pk), F.th * e * (1 + 0.05 * pk), F.th * 0.26, C.soft); return; }
      if (kind === 1) { circle(p, bx, ty, d * e * (1 + 0.3 * pk), mix(C.line, C.green, ok)); return; }
      if (kind === 2 || kind === 3) {
        const g = clamp((b - t - FLY6 - 0.05) / 0.2), u = d * 0.5, th = Math.max(1.5, d * 0.13);
        if (g <= 0) return hide(p);
        if (kind === 2) seg(p, bx - u * 0.42, ty + u * 0.02, bx - u * 0.1, ty + u * 0.32, th, C.white);
        else seg(p, bx - u * 0.1, ty + u * 0.32, lerp(bx - u * 0.1, bx + u * 0.46, g), lerp(ty + u * 0.32, ty - u * 0.3, g), th, C.white);
        return;
      }
      const [x0, y0, x1, y1] = beam6(k), col = tileCol6(k);
      if (kind === 4) {
        const g = E.outCubic(clamp((b - t) / FLY6));
        if (g <= 0) return hide(p);
        seg(p, x0, y0, lerp(x0, x1, g), lerp(y0, y1, g), Math.max(1.5, F.th * 0.05), mix(col, C.white, 0.2));
        return;
      }
      const u = clamp((b - t) / FLY6);
      if (u <= 0 || u >= 1) return hide(p);
      circle(p, lerp(x0, x1, E.inOutSine(u)), lerp(y0, y1, E.inOutSine(u)), F.th * 0.22, col);
    },
    type: [
      { id: 'fw.iso', at: 0.35, to: 5.85, text: 'ISO 27001', ...tileLab(0) },
      { id: 'fw.nis2', at: 0.43, to: 5.85, text: 'NIS2', ...tileLab(1) },
      { id: 'fw.gdpr', at: 0.51, to: 5.85, text: 'GDPR', ...tileLab(2) },
      { id: 'fw.nist', at: 0.59, to: 5.85, text: 'NIST CSF', ...tileLab(3) },
      { id: 'fw.cis', at: 0.67, to: 5.85, text: 'CIS', ...tileLab(4) },
      { id: 'fw.dora', at: 0.75, to: 5.85, text: 'DORA', ...tileLab(5) },
      { id: 'fw.a', at: 0.3, to: 5.85, text: 'Mapped to every framework. | *Instantly.*' },
    ],
    music(M) {
      M.pad(0, 'D3 A3 C#4 F#4', 3, 0.26); M.sub(0, 'D2', 3, 0.2);
      M.pad(3, 'E3 B3 D4 G#4', 3, 0.26); M.sub(3, 'E2', 3, 0.2);
      groove(M, 0, 6, 0.26, 0.03);
      for (let b = 0; b < 6; b += 0.5) M.bass(b, b < 3 ? 'D2' : 'E2', 0.3, 0.2);
      for (let b = 1; b < 6; b += 2) M.clap(b, 0.1);
      const NOTE = ['A5', 'B5', 'C#6', 'E6', 'F#6', 'A6'];
      FIRE6.forEach((t, k) => {
        const pan = Math.cos(fw().pos[k][2]) * 0.7;
        M.zap(t, 0.05, pan); M.coin(t + FLY6, NOTE[k], 0.09, pan); M.marimba(t + FLY6, NOTE[k], 0.08, pan);
      });
      M.ep(4.5, 'G#5', 0.09); M.ep(5.2, 'B5', 0.08);
    },
  };
  function tileLab(k) {
    return {
      cls: 'lab', size: () => Math.max(13, Math.min(G.F * 0.34, fw().th * 0.36)),
      x: xF(() => fw().pos[k][0] - fw().th * 0.35), y: yF(() => fw().pos[k][1]),
    };
  }

  // =========================================================== 7 · a living risk posture
  // The ring unrolls into a score chart that keeps moving: the security score climbs, live.
  // Shape 1 is the card, 2–4 the grid lines, 5–100 three lines of 32 segments (the blue one on top).
  const chart7 = perLayout(() => {
    const W = gw(), cw = G.portrait ? W * 0.9 : Math.min(W * 0.78, G.R * 2.9);
    const ch = G.portrait ? Math.min(G.R * 1.2, G.H * 0.28) : Math.min(G.R * 1.15, G.H * 0.38), pad = Math.min(cw, ch) * 0.13;
    return { cw, ch, pad };
  });
  const REV7 = 0.5;
  const rev7 = (L, b) => E.inOutCubic(clamp((b - REV7 - (2 - L) * 0.15) / 1.1));
  function v7(L, u, b) {
    if (L === 0) return 0.18 + 0.52 * u + 0.08 * Math.sin(TAU * (u * 1.7 - b * 0.16) + 1.0) + 0.035 * Math.sin(TAU * (u * 3.3 - b * 0.28) + 2);
    if (L === 1) return 0.64 + 0.12 * Math.sin(TAU * (u * 1.2 - b * 0.13) + 2.2) + 0.04 * Math.sin(TAU * (u * 2.7 - b * 0.2));
    return 0.38 + 0.13 * Math.sin(TAU * (u * 0.9 - b * 0.11) + 4.0) + 0.05 * Math.sin(TAU * (u * 2.2 - b * 0.24) + 1);
  }
  const pt7 = (L, u, b) => { const K = chart7(); return [-K.cw / 2 + u * K.cw, K.ch / 2 - v7(L, u, b) * K.ch]; };
  const LINE7 = () => [C.r1, mix(C.r6, C.r5, 0.45), mix(C.r7, C.r8, 0.35)];
  const BEAT7 = [2, 3, 4, 5];
  const S7 = {
    name: 'live',
    title: 'Live risk posture',
    beats: 6,
    blend: { start: (i) => (i > 0 && i <= NR ? ((i - 1) / NR) * 0.25 : 0), dur: 0.7, ease: E.glide },
    pose(i, b, p) {
      const K = chart7(), th = Math.max(2.5, G.R * 0.022);
      if (i === 0) {
        const f = clamp((b - REV7 - 1.1) / 0.3);
        if (f <= 0) return hide(p);
        const [x, y] = pt7(0, 1, b), pk = maxHit(b, BEAT7, 5);
        circle(p, x, y, G.R * 0.075 * E.outBack(f) * (1 + 0.45 * pk), C.blue);
        return;
      }
      if (i === 1) {
        const e = E.outBack(clamp((b - 0.1) / 0.5));
        rect(p, 0, -K.pad * 0.45, (K.cw + K.pad * 2) * e, (K.ch + K.pad * 2.9) * e, K.pad * 0.6, C.paper);
        return;
      }
      if (i <= 4) {
        const y = K.ch / 2 - ((i - 1) / 3) * K.ch, e = E.outCubic(clamp((b - 0.3 - i * 0.06) / 0.5));
        if (e <= 0) return hide(p);
        bar(p, -K.cw / 2, y, K.cw * e, Math.max(1, th * 0.4), C.line);
        return;
      }
      if (i > NR) return hide(p);
      const g = i - 5, L = 2 - Math.floor(g / 32), j = g % 32, rv = rev7(L, b), u0 = j / 32;
      if (u0 >= rv) return hide(p);
      const u1 = Math.min((j + 1) / 32, rv), [x0, y0] = pt7(L, u0, b), [x1, y1] = pt7(L, u1, b);
      seg(p, x0, y0, x1, y1, th * (L === 0 ? 1.25 : 1), LINE7()[L]);
    },
    type: [
      { id: 'live.title', at: 0.4, to: 5.85, text: 'Security score', cls: 'lab', ax: 0, size: () => Math.max(13, G.F * 0.28), x: xF(() => -chart7().cw / 2), y: yF(() => -chart7().ch / 2 - chart7().pad * 1.05) },
      { id: 'live.a', at: 0.3, to: 2.9, text: 'Your risk posture. | *Live.*' },
      { id: 'live.b', at: 3.1, to: 5.85, text: 'Not a once-a-year | exercise.' },
    ],
    music(M) {
      M.pad(0, 'F#2 C#3 A3 E4', 1.5, 0.26); M.sub(0, 'F#1', 1.5, 0.2);
      M.pad(1.5, 'D3 A3 C#4 F#4', 1.5, 0.26); M.sub(1.5, 'D2', 1.5, 0.2);
      M.pad(3, 'A2 E3 B3 C#4', 1.5, 0.26); M.sub(3, 'A1', 1.5, 0.2);
      M.pad(4.5, 'E3 B3 D4 G#4', 1.5, 0.26); M.sub(4.5, 'E2', 1.5, 0.2);
      groove(M, 0, 6, 0.28, 0.035);
      for (let b = 0; b < 6; b += 0.5) M.bass(b, ['F#1', 'D2', 'A1', 'E2'][Math.floor(b / 1.5)], 0.3, 0.22);
      for (let b = 1; b < 6; b += 2) M.clap(b, 0.12);
      for (let b = 0.25; b < 6; b += 0.5) M.shaker(b, 0.03);
      M.whoosh(REV7, 1.2, 0.035, 500, 2600);
      ['C#5', 'E5', 'F#5', 'A5', 'B5', 'C#6', 'E6'].forEach((n, k) => M.marimba(REV7 + k * 0.18, n, 0.08, -0.6 + k * 0.2));
      BEAT7.forEach((t, k) => M.bell(t, ['E6', 'C#6', 'E6', 'A6'][k], 0.08, 0.6));
    },
  };

  // =========================================================== 8 · 90% less reporting
  // Fifty grey blocks are the hours spent on reports. Nine columns of them break loose and
  // fall away; the one column left turns blue.
  // Block (c, r) → shape: c·5 + r, except (0, 4), which is the hero, and ids 0–3 → shapes 1–4.
  const COLS8 = 10, ROWS8 = 5, FALL8 = [1.2, 2.5];
  const blk8 = perLayout(() => {
    const w = G.portrait ? gw() * 0.96 : Math.min(gw() * 0.7, G.R * 2.5), q = w / COLS8;
    return { w, q, d: q * 0.8, top: -q * ROWS8 / 2 - q * 0.2 };
  });
  const id8 = (i) => (i === 0 ? 4 : i <= 4 ? i - 1 : i);
  const fall8 = (c) => FALL8[0] + ((COLS8 - 1 - c) / (COLS8 - 2)) * (FALL8[1] - FALL8[0]);
  const S8 = {
    name: 'reporting',
    title: '90% less reporting',
    beats: 5,
    blend: { start: (i) => (i < 50 ? (id8(i) % 50) * 0.006 : 0), dur: 0.7, ease: E.glide },
    pose(i, b, p) {
      if (i >= 50) return hide(p);
      const K = blk8(), id = id8(i), c = Math.floor(id / ROWS8), r = id % ROWS8;
      const slide = E.inOutCubic(clamp((b - FALL8[1] - 0.3) / 0.7)), keep = c === 0;
      const x = -K.w / 2 + (c + 0.5) * K.q + (keep ? slide * (K.w / 2 - K.q / 2) : 0), y = K.top + (r + 0.5) * K.q;
      const blue = keep ? clamp((b - FALL8[1] - 0.1) / 0.4) : 0, pk = keep ? hit(b, FALL8[1] + 1.0, 5) : 0;
      rect(p, x, y, K.d * (1 + 0.15 * pk), K.d * (1 + 0.15 * pk), K.d * 0.24, mix(C.busy, C.blue, blue));
      if (!keep) tumble(p, clamp((b - fall8(c) - r * 0.03) / 1.3), ((c * 7 + r * 3) % 5) / 2 - 1);
    },
    type: [
      { id: 'rep.title', at: 0.3, to: 2.6, text: 'Hours spent on reporting', cls: 'lab', ax: 0, size: () => Math.max(13, G.F * 0.28), x: xF(() => -blk8().w / 2 + blk8().q * 0.1), y: yF(() => blk8().top - blk8().q * 0.35) },
      { id: 'rep.a', at: 0.3, to: 4.85, text: '*90%* less time | spent on reporting.' },
    ],
    music(M) {
      M.pad(0, 'B2 F#3 A3 D4', 2.5, 0.24); M.sub(0, 'B1', 2.5, 0.2);
      groove(M, 0, 1, 0.24, 0.03);
      for (let c = COLS8 - 1; c >= 1; c--) { const t = fall8(c); M.snip(t, 0.12); M.drop(t + 0.05, penta(18 - (COLS8 - c) * 1, 3), 0.1, (c / COLS8) * 1.2 - 0.6); }
      M.whoosh(FALL8[0], FALL8[1] - FALL8[0] + 0.6, 0.05, 2400, 300);
      M.kick(FALL8[1] + 0.5, 0.45); M.boom(FALL8[1] + 0.5, 0.2);
      M.pad(FALL8[1] + 0.5, 'A2 E3 B3 C#4 G#4', 5 - FALL8[1] - 0.5, 0.28); M.sub(FALL8[1] + 0.5, 'A1', 5 - FALL8[1] - 0.5, 0.22);
      M.bell(FALL8[1] + 1.0, 'E6', 0.14); M.bell(FALL8[1] + 1.25, 'A6', 0.1, 0.3);
      groove(M, FALL8[1] + 0.5, 5, 0.22, 0.03);
    },
  };

  // =========================================================== 9 · 2–3× more clients
  // The consultant in the middle. One client, three clients, then nine little rainbow rings.
  const CL9 = [0, 3, 6, 1, 4, 7, 2, 5, 8]; // order in which positions light up (k·40°)
  const ARR9 = [0.4, 0.8, 1.2, 2.2, 2.38, 2.56, 2.74, 2.92, 3.1];
  const cl9 = perLayout(() => {
    const rc = G.portrait ? Math.min(G.R * 0.78, G.W * 0.34) : G.R * 0.8, rr = rc * 0.2;
    return { rc, rr, d: rr * THICK * 0.9, hero: G.R * 0.2 };
  });
  const at9 = (k) => ARR9[CL9.indexOf(k)];
  const S9 = {
    name: 'clients',
    title: '2–3× more clients',
    beats: 5,
    blend: { start: (i) => (i > 0 && i <= 90 ? (i % 10) * 0.02 : 0), dur: 0.7, ease: E.glide },
    pose(i, b, p) {
      const K = cl9(), pulse = maxHit(b, ARR9, 5);
      if (i === 0) { circle(p, 0, 0, K.hero * (1 + 0.2 * pulse), C.blue); return; }
      if (i <= 90) {
        const k = Math.floor((i - 1) / 10), s = (i - 1) % 10, t = at9(k), a = (k / 9) * TAU;
        const cx = Math.sin(a) * K.rc, cy = -Math.cos(a) * K.rc, e = E.outBack(clamp((b - t - s * 0.02) / 0.4));
        const [x, y] = ringXY(s * 10, K.rr * e, b * 0.6 + k);
        circle(p, lerp(0, cx, E.outCubic(clamp((b - t) / 0.35))) + x, lerp(0, cy, E.outCubic(clamp((b - t) / 0.35))) + y, K.d * e, rainbow(s / 10));
        if (e <= 1e-3) hide(p);
        return;
      }
      if (i >= 101 && i < 110) {
        const k = i - 101, t = at9(k), a = (k / 9) * TAU, g = E.outCubic(clamp((b - t) / 0.35));
        if (g <= 0) return hide(p);
        const ux = Math.sin(a), uy = -Math.cos(a), r0 = K.hero * 0.75, r1 = lerp(r0, K.rc - K.rr - K.d * 0.9, g);
        seg(p, ux * r0, uy * r0, ux * r1, uy * r1, Math.max(1.5, K.d * 0.25), C.line);
        return;
      }
      hide(p);
    },
    type: [
      { id: 'clients.a', at: 0.3, to: 1.95, text: 'One consultant.' },
      { id: 'clients.b', at: 2.1, to: 4.85, text: '*2–3×* more clients.' },
    ],
    music(M) {
      M.pad(0, 'D3 A3 C#4 F#4', 2, 0.26); M.sub(0, 'D2', 2, 0.2);
      M.pad(2, 'E3 B3 D4 G#4', 3, 0.28); M.sub(2, 'E2', 3, 0.22);
      groove(M, 0, 5, 0.26, 0.035);
      for (let b = 0; b < 5; b += 0.5) M.bass(b, b < 2 ? 'D2' : 'E2', 0.3, 0.2);
      for (let b = 1; b < 5; b += 2) M.clap(b, 0.12);
      ARR9.forEach((t, n) => M.pluck(t, penta(8 + n, 4), 0.1, Math.sin((CL9[n] / 9) * TAU) * 0.8, 0.25));
      M.riser(3.2, 1.8, 0.12);
    },
  };

  // =========================================================== 10 · stop the busywork
  // Every dot comes home to the ring. The ring glides into Clember's logo; the blue core
  // stretches into the button.
  const logoW = () => Math.min(G.W * (G.portrait ? 0.78 : 0.56), G.R * 2.6, 640);
  const LH = () => logoW() / 3.968;
  const CTA_Y = () => (G.portrait ? 0.64 : 0.67);
  const TXT10 = [0.3, 3.2], MOVE10 = [3.3, 4.8], LOGO10 = 4.5, FADE10 = [4.9, 5.4], BTN10 = [5.0, 5.8], SHOW10 = 5.8;
  const BEAT10 = [1.5, 2.0, 2.5, 3.0];
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
  const S10 = {
    name: 'finale',
    title: 'Book a demo',
    beats: 10,
    blend: { start: (i) => (i > 0 && i <= NR ? ((i - 1) / NR) * 0.5 : 0), dur: (i) => (i === 0 ? 0.8 : 0.9), ease: E.glide, arc: 0.12 },
    pose(i, b, p) {
      const mv = E.inOutCubic(clamp((b - MOVE10[0]) / (MOVE10[1] - MOVE10[0]))), beat = maxHit(b, BEAT10, 5);
      const r = lerp(bigR() * (1 + 0.02 * beat), 0.406 * LH(), mv), cx = lerp(0, -0.3743 * logoW(), mv);
      if (i === 0) {
        const d0 = G.R * 0.16 * (1 + 0.3 * beat), est = { x: 0, y: G.H * CTA_Y() - G.cy, w: Math.max(220, G.F * 3.6), h: 52 };
        const bt = button() || est, st = E.inOutCubic(clamp((b - BTN10[0]) / (BTN10[1] - BTN10[0])));
        const dm = lerp(d0, 0.16 * LH(), mv);
        const x = lerp(cx, bt.x, st), y = lerp(0, bt.y, E.inOutSine(st));
        rect(p, x, y, lerp(dm, bt.w, st), lerp(dm, bt.h, st), lerp(dm / 2, 6, st), C.blue);
        if (b > SHOW10 + 1.0) hide(p);
        return;
      }
      if (i > NR) return hide(p);
      const s = i - 1, [x, y] = ringXY(s, r, (1 - mv) * b * 0.12);
      circle(p, cx + x, y, r * THICK, ringC(s));
      p.o *= 1 - clamp((b - FADE10[0]) / (FADE10[1] - FADE10[0]));
    },
    type: [
      { id: 'fin.a', at: TXT10[0], to: TXT10[1], text: 'Stop the busywork. | Start *advising.*', size: 1.05, stagger: 0.1 },
      { id: 'fin.logo', at: LOGO10, to: Infinity, html: '<img src="img/logo.webp" alt="Clember">', cls: 'logo', y: () => G.cy / G.H, size: () => LH(), fade: 0.6 },
      {
        id: 'fin.cta', at: BTN10[0] - 0.2, show: SHOW10, to: Infinity, cls: 'link', y: CTA_Y, fade: 0.8,
        html: '<a href="https://clember.ai/book-a-demo/" target="_blank" rel="noopener">Book a demo</a>' +
          '<small>clember.ai &middot; Built &amp; hosted in the EU</small>',
      },
    ],
    music(M) {
      M.pad(0, 'F#2 C#3 A3 E4', 1.5, 0.28); M.sub(0, 'F#1', 1.5, 0.2);
      M.pad(1.5, 'D3 A3 C#4 F#4', 1.5, 0.28); M.sub(1.5, 'D2', 1.5, 0.22);
      M.pad(3.0, 'E3 B3 D4 G#4', MOVE10[1] - 3.0, 0.28); M.sub(3.0, 'E2', MOVE10[1] - 3.0, 0.22);
      groove(M, 0, 3, 0.24, 0.03);
      M.ep(0.4, 'C#6', 0.12); M.ep(0.8, 'E6', 0.1); M.ep(1.2, 'B5', 0.1);
      BEAT10.forEach((t, k) => M.thump(t, k % 2 ? 0.26 : 0.42));
      M.whoosh(MOVE10[0], MOVE10[1] - MOVE10[0], 0.05, 300, 2200);
      M.kick(MOVE10[1], 0.5); M.boom(MOVE10[1], 0.32); M.splash(MOVE10[1], 0.18);
      M.bell(MOVE10[1], 'A5', 0.22); M.bell(MOVE10[1] + 0.25, 'C#6', 0.16, 0.3); M.bell(MOVE10[1] + 0.5, 'E6', 0.14, -0.3);
      M.pad(MOVE10[1], 'A2 E3 B3 C#4 G#4', 10 - MOVE10[1], 0.32); M.sub(MOVE10[1], 'A1', 10 - MOVE10[1], 0.24);
      M.whoosh(BTN10[0], 0.8, 0.04, 400, 1800);
      M.marimba(SHOW10, 'E6', 0.14); M.marimba(SHOW10 + 0.2, 'A6', 0.12);
      M.ep(8.0, 'A5', 0.1); M.ep(8.02, 'E5', 0.08);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10];
})();
