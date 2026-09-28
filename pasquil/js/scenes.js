/* Pasquil — "Informatiebeveiliging is niet gewoon." A 30-second film in 150 shapes.
   Every shape is one div whose size, corner radius, colour and matrix3d are set every frame.
   One yellow shape is the troublemaker: first the blinking caret of a "supergeheim"
   password, then the little ball that finds the one missing brick in the firewall and
   floods the screen. Pasquil ticks off ISO 27001, NEN 7510, NIS2 and AVG, maps the risks
   and moves them to green. In a crowd of identical dots the yellow one refuses to be
   ordinary, and fills the frame for the logo.
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
  function circle(p, x, y, d, c) { p.x = x; p.y = y; p.w = p.h = d; p.r = d / 2; p.c = c; }
  function rect(p, x, y, w, h, r, c) { p.x = x; p.y = y; p.w = w; p.h = h; p.r = r; p.c = c; }
  // a pill of length `len` whose long axis points along angle `rot` + 90°
  function pill(p, x, y, len, th, rot, c) { p.x = x; p.y = y; p.w = th; p.h = Math.max(th, len); p.r = th / 2; p.rot = rot; p.c = c; p.sym = PI; }
  // a pill drawn from (x0, y0) to (x1, y1), round caps included
  function seg(p, x0, y0, x1, y1, th, c) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-6;
    pill(p, (x0 + x1) / 2, (y0 + y1) / 2, L + th, th, Math.atan2(-dx / L, dy / L), c);
  }
  function perLayout(fn) {
    let v = -1, val;
    return () => { if (v !== G.version) { v = G.version; val = fn(); } return val; };
  }
  // where a DOM line really sits (relative to the stage centre), so shapes can line up with it
  function measurer(sel) {
    let c = { v: -1, at: 0, r: null };
    return () => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const now = performance.now();
      if (c.v !== G.version || now - c.at > 250 || !c.r) {
        const r = el.getBoundingClientRect();
        c = { v: G.version, at: now, r: r.width ? { x: r.left + r.width / 2 - G.cx, y: r.top + r.height / 2 - G.cy, w: r.width, h: r.height } : null };
      }
      return c.r;
    };
  }
  const PENTA = ['G', 'A', 'B', 'D', 'E'];
  const penta = (k, base = 4) => PENTA[((k % 5) + 5) % 5] + (base + Math.floor(k / 5));
  const cover = () => 2.3 * Math.hypot(G.W / 2, G.H * 0.6);
  const heat = (s) => (s < 0.5 ? mix(C.green, C.yellow, s / 0.5) : mix(C.yellow, C.red, (s - 0.5) / 0.5));

  // =========================================================== 1 · the supergeheime password
  // Eleven bullets are typed into a field, the yellow caret racing ahead. Then the bullets
  // flip away and reveal what everyone already guessed.
  const PW = 'Paswoord123', NPW = PW.length;
  const field = perLayout(() => {
    const FW = Math.min(G.W * 0.84, G.R * 3.1), FH = G.R * 0.46;
    return { FW, FH, bw: Math.max(2, G.R * 0.024), ds: FH * 0.3, d: FH * 0.2 };
  });
  const JIT1 = (function () { const r = BJ.rng(11), a = []; for (let k = 0; k < NPW; k++) a.push(r()); return a; })();
  const TK = (k) => 0.75 + k * 0.17 + JIT1[k] * 0.06, REV1 = 3.6;
  const dotX = (k) => (k - (NPW - 1) / 2) * field().ds;
  const pwBox = measurer('#type .line.pw');
  const blink = (b) => clamp(0.5 + 3 * Math.cos(TAU * b * 0.6));
  function caret(p, b) {
    const F = field();
    let u = 0;
    for (let k = 0; k < NPW; k++) u += E.outCubic(clamp((b - TK(k)) / 0.1));
    let x = dotX(0) - F.ds * 0.62 + u * F.ds;
    const bx = pwBox(), e = E.inOutCubic(clamp((b - REV1 - 0.15) / 0.5));
    if (bx && e > 0) x = lerp(x, bx.w / 2 + F.ds * 0.3, e);
    const typing = b > TK(0) - 0.25 && b < TK(NPW - 1) + 0.5;
    pill(p, x, 0, F.FH * 0.56, F.FH * 0.08, 0, C.yellow);
    p.o = typing ? 1 : blink(b);
  }
  const S1 = {
    name: 'password',
    beats: 7,
    introBeat: 0,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const F = field(), red = E.inOutSine(clamp((b - REV1 - 0.1) / 0.3)) * (1 - E.inOutSine(clamp((b - 5.8) / 0.8)));
      const bump = hit(b, REV1 + 0.1, 5) * 0.05;
      if (i === 0) return caret(p, b);
      if (i === 1) return rect(p, 0, 0, (F.FW + 2 * F.bw) * (1 + bump), (F.FH + 2 * F.bw) * (1 + bump), F.FH * 0.3 + F.bw, mix(C.navy, C.red, red));
      if (i === 2) return rect(p, 0, 0, F.FW * (1 + bump), F.FH * (1 + bump), F.FH * 0.3, C.white);
      const k = i - 3;
      if (k < 0 || k >= NPW) return hide(p);
      const g = E.snap(clamp((b - TK(k)) / 0.3));
      if (g <= 0) return hide(p);
      circle(p, dotX(k), 0, F.d * g, C.navy);
      const e = E.inOutCubic(clamp((b - REV1 + 0.05 - k * 0.03) / 0.3));
      if (e >= 1) return hide(p);
      p.rx = e * PI / 2; p.o = 1 - e;
    },
    type: [
      { at: 0.9, to: 3.4, text: 'Ons wachtwoord? | Supergeheim.' },
      { at: REV1 + 0.1, to: 6.75, text: PW, cls: 'pw', y: () => G.cy / G.H, size: () => field().FH * 0.46, stagger: 0 },
      { at: 4.3, to: 6.75, text: 'Oeps.', size: 1.2 },
    ],
    music(M) {
      M.pad(0, 'G3 D4 B4', REV1, 0.26); M.sub(0, 'G2', REV1, 0.18);
      for (let k = 0; k < NPW; k++) {
        M.key(TK(k), 0.22 + JIT1[k] * 0.08, (k / (NPW - 1) - 0.5) * 0.6);
        if (k % 2 === 0) M.marimba(TK(k), penta(k / 2 + 5, 4), 0.07, (k / (NPW - 1) - 0.5) * 0.6);
      }
      M.ep(0.9, 'D5', 0.12); M.ep(2.4, 'B4', 0.1);
      M.buzz(REV1 + 0.05, 0.32);
      // the sad trombone
      M.womp(REV1 + 0.5, 'C4', 0.45, 0.3); M.womp(REV1 + 1.0, 'B3', 0.45, 0.3);
      M.womp(REV1 + 1.5, 'Bb3', 0.45, 0.3); M.womp(REV1 + 2.0, 'A3', 1.3, 0.32, 1);
    },
  };

  // =========================================================== 2 · the firewall
  // The field lies down as the floor and a wall of bricks drops onto it, row by row.
  // One brick is missing. Something yellow peeks through the hole, looks around, and comes through.
  const B0 = 20; // first brick
  const wall = perLayout(() => {
    const cols = 7, rows = 6, WW = Math.min(G.W * 0.84, G.R * 2.9), BW = WW / cols, BH = BW * 0.46, gp = BW * 0.075;
    const rr = BJ.rng(27), bricks = [];
    for (let r = 0; r < rows; r++) {
      const y = (2.5 - r) * BH, xs = [];
      if (r % 2 === 0) for (let c = 0; c < cols; c++) xs.push([(c - 3) * BW, BW, c]);
      else {
        xs.push([-3.5 * BW + BW / 4, BW / 2, -1]);
        for (let c = 0; c < cols - 1; c++) xs.push([(c - 2.5) * BW, BW, c]);
        xs.push([3.5 * BW - BW / 4, BW / 2, -1]);
      }
      for (const [x, w, c] of xs) {
        if (r === 2 && c === 3) continue; // the hole
        bricks.push({ x, y, w: w - gp, h: BH - gp, lt: 0.4 + r * 0.26 + (x / WW + 0.5) * 0.18 + rr() * 0.06, tint: rr(), spin: rr() - 0.5 });
      }
    }
    return { WW, BW, BH, gp, bricks, hx: 0, hy: 0.5 * BH, floorY: 3 * BH + gp * 0.5 };
  });
  const PEEK2 = 3.9, BURST2 = [5.3, 7.0];
  const S2 = {
    name: 'firewall',
    beats: 8,
    blend: { dur: (i) => (i === 1 || i === 2 ? 1.1 : i === 0 ? 0.4 : 0.01), ease: E.inOutCubic },
    bg: (b) => (b < BURST2[1] ? C.white : C.yellow),
    dark: (b) => b >= BURST2[1],
    pose(i, b, p) {
      const W = wall();
      if (b >= BURST2[1]) return hide(p);
      if (i === 0) {
        const g = E.spring(clamp((b - PEEK2) / 0.6));
        if (g <= 0) return hide(p);
        const look = Math.sin((b - PEEK2 - 0.4) * 2.6) * clamp((b - PEEK2 - 0.4) / 0.3) * (1 - clamp((b - BURST2[0] + 0.3) / 0.3));
        const t = clamp((b - BURST2[0]) / (BURST2[1] - BURST2[0]));
        const d0 = W.BH * 0.52 * g;
        circle(p, W.hx + look * W.BW * 0.24, W.hy, lerp(d0, cover(), E.inCubic(t)), C.yellow);
        p.y = lerp(p.y, W.hy * 0.5, t);
        return;
      }
      if (i === 1 || i === 2) { // the field becomes the floor
        const th = G.R * 0.022;
        rect(p, 0, W.floorY, W.WW * 1.24, th, th / 2, C.mist);
        return;
      }
      const j = i - B0, k = W.bricks[j];
      if (!k) return hide(p);
      const f = clamp((b - (k.lt - 0.32)) / 0.32);
      if (f <= 0) return hide(p);
      const land = hit(b, k.lt, 7);
      rect(p, k.x, k.y - (1 - f * f) * G.H * 0.55, k.w * (1 + 0.08 * land), k.h * (1 - 0.14 * land), W.BH * 0.12, mix(C.navy, C.deep, k.tint * 0.6));
      p.y += k.h * 0.07 * land;
      p.o = clamp(f * 3);
      // the ball bursts through: bricks around the hole are blown towards the camera
      const dx = k.x - W.hx, dy = k.y - W.hy, dist = Math.hypot(dx, dy) / W.BW;
      const e = E.outCubic(clamp((b - BURST2[0] - 0.55 - dist * 0.08) / 1.0)); // once the ball is wider than the hole
      if (e > 0) {
        const push = e * G.R * 1.4 / (0.6 + dist * 0.5), n = Math.hypot(dx, dy) || 1;
        p.x += (dx / n) * push; p.y += (dy / n) * push + e * e * G.R * 0.5;
        p.z += e * G.R * 2.2 / (0.8 + dist * 0.4);
        p.rot += e * k.spin * 2.4; p.rx += e * k.spin * 3;
      }
    },
    type: [
      { at: 2.2, to: 4.6, text: 'Een stevige firewall. | Veilig, toch?' },
      { at: 5.1, to: 7.8, text: 'Eén gat is genoeg.' },
    ],
    music(M) {
      M.pad(0, 'E3 B3 D4 G4', 5.3, 0.26); M.sub(0, 'E2', 5.3, 0.2);
      M.whoosh(0, 0.9, 0.04, 1800, 500);
      // every brick knocks as it lands, lower rows lower
      const rows = [0.4, 0.66, 0.92, 1.18, 1.44, 1.7];
      rows.forEach((t0, r) => {
        for (let c = 0; c < 7; c++) M.marimba(t0 + (c / 6) * 0.18 + 0.03, penta(r + (c % 2) * 2, 3), 0.055 + r * 0.006, (c / 6 - 0.5) * 0.9);
        M.thump(t0 + 0.09, 0.22 - r * 0.02);
      });
      M.kick(2.0, 0.28); M.ep(2.2, 'B4', 0.14); M.ep(2.7, 'D5', 0.12);
      M.drop(PEEK2 + 0.05, 'D5', 0.24);
      M.marimba(PEEK2 + 0.7, 'A5', 0.07, -0.5); M.marimba(PEEK2 + 1.3, 'A5', 0.07, 0.5);
      M.pad(5.3, 'C3 G3 E4 A4', 2.7, 0.24); M.sub(5.3, 'C2', 2.7, 0.22);
      M.whoosh(BURST2[0], BURST2[1] - BURST2[0], 0.09, 250, 4000);
      M.snip(BURST2[0] + 0.55); M.boom(BURST2[0] + 0.6, 0.3); M.kick(BURST2[0] + 0.6, 0.3);
      M.splash(BURST2[1] - 0.1, 0.32); M.boom(BURST2[1], 0.4); M.kick(BURST2[1], 0.45);
      M.bell(BURST2[1], 'G5', 0.2); M.bell(BURST2[1], 'D6', 0.14, 0.3);
    },
  };

  // =========================================================== 3 · the checklist
  // On the yellow field: ISO 27001, NEN 7510, NIS2, AVG. Four boxes, four ticks, on the beat.
  const NORMS = ['ISO 27001', 'NEN 7510', 'NIS2', 'AVG'], X0 = 20, K0 = 30;
  const list3 = perLayout(() => {
    const fs = G.F * 0.8, BX = Math.min(G.R * 0.28, fs * 1.2), RH = BX * 1.5, lw = fs * 4.9;
    const x0 = -(BX * 1.55 + lw) / 2;
    return { fs, BX, bx: x0 + BX / 2, lx: x0 + BX * 1.55, ys: NORMS.map((_, k) => (k - 1.5) * RH - G.R * 0.04) };
  });
  const CHK3 = [2.0, 2.5, 3.0, 3.5], IN3 = (k) => 0.35 + k * 0.14;
  const S3 = {
    name: 'norms',
    beats: 7,
    blend: { dur: 0.01 },
    bg: () => C.yellow,
    dark: () => true,
    pose(i, b, p) {
      const L = list3();
      if (i >= X0 && i < X0 + 4) {
        const k = i - X0, g = E.outBack(clamp((b - IN3(k)) / 0.5)), pk = hit(b, CHK3[k] + 0.1, 5);
        if (g <= 0) return hide(p);
        const s = L.BX * g * (1 + 0.14 * pk);
        rect(p, L.bx, L.ys[k], s, s, s * 0.24, C.white);
        p.rot = (1 - g) * 0.6 - pk * 0.08;
        return;
      }
      if (i >= K0 && i < K0 + 8) {
        const k = (i - K0) >> 1, part = (i - K0) & 1, t = b - CHK3[k], cs = L.BX;
        const P = [[-0.27, 0.02], [-0.07, 0.22], [0.29, -0.2]].map(([x, y]) => [L.bx + x * cs, L.ys[k] + y * cs]);
        const g = part === 0 ? E.outCubic(clamp(t / 0.12)) : E.outCubic(clamp((t - 0.1) / 0.2));
        if (g <= 0) return hide(p);
        const a = P[part], c = P[part + 1];
        seg(p, a[0], a[1], lerp(a[0], c[0], g), lerp(a[1], c[1], g), cs * 0.13, C.navy);
        return;
      }
      hide(p);
    },
    type: [
      ...NORMS.map((t, k) => ({
        at: IN3(k) + 0.1, to: 6.7, text: t, cls: 'label', align: 'left', stagger: 0.08,
        x: () => list3().lx, y: () => (G.cy + list3().ys[k]) / G.H, size: () => list3().fs,
      })),
      { at: 1.0, to: 6.7, text: 'Wij vinden de gaten. | En dichten ze.' },
    ],
    music(M) {
      M.pad(0, 'G3 B3 D4 A4', 7, 0.28); M.sub(0, 'G2', 7, 0.22);
      NORMS.forEach((_, k) => M.marimba(IN3(k), penta(k + 3, 4), 0.08, (k / 3 - 0.5) * 0.6));
      CHK3.forEach((t, k) => {
        M.kick(t, 0.3); M.tick(t + 0.1, 0.06, 0.3);
        M.marimba(t + 0.1, penta(k * 2 + 5, 4), 0.16, (k / 3 - 0.5) * 0.6);
        M.ep(t + 0.1, penta(k * 2 + 7, 4), 0.1);
      });
      for (let b = 4.5; b < 7; b += 1) M.kick(b, 0.2);
      for (let b = 4; b < 7; b += 0.5) M.tick(b, 0.03, -0.3);
      M.bell(4.0, 'D6', 0.18); M.bell(4.0, 'G5', 0.14, -0.3);
    },
  };

  // =========================================================== 4 · the risk matrix
  // The boxes spread into a 5 × 5 matrix that heats up from green to red. Five risks land on
  // the hot corner; one by one they are treated and hop down to green.
  const T0 = 20, NT = 25, AX = 60, RK = 70;
  const mat4 = perLayout(() => {
    const c = Math.min(G.R * 0.34, (G.W * 0.8) / 5.6, (G.H * 0.48) / 5.6);
    return { c, pos: (col, row) => [(col - 2) * c + c * 0.12, (2 - row) * c - c * 0.12] };
  });
  const RISKS = [[[4, 4], [0, 1]], [[3, 4], [1, 0]], [[4, 3], [0, 0]], [[2, 4], [1, 1]], [[3, 3], [2, 0]]];
  const RIN4 = (k) => 2.0 + k * 0.14, TREAT4 = (k) => 3.7 + k * 0.32;
  const S4 = {
    name: 'risks',
    beats: 7,
    blend: { start: (i) => (i >= T0 && i < T0 + NT ? (i - T0) * 0.02 : 0), dur: 0.8, ease: E.glide, arc: 0.1 },
    bg: (b) => mix(C.yellow, C.white, E.inOutSine(clamp(b / 1.1))),
    dark: (b) => b < 0.6,
    pose(i, b, p) {
      const M4 = mat4(), c = M4.c;
      if (i >= T0 && i < T0 + NT) {
        const j = i - T0, col = j % 5, row = Math.floor(j / 5), [x, y] = M4.pos(col, row);
        const h = E.inOutSine(clamp((b - 1.1 - (col + row) * 0.07) / 0.5)), s = (col + row) / 8;
        const pk = hit(b, 1.1 + (col + row) * 0.07 + 0.3, 5) * h;
        rect(p, x, y, c * 0.86 * (1 + 0.08 * pk), c * 0.86 * (1 + 0.08 * pk), c * 0.18, mix(C.mist, heat(s), h));
        return;
      }
      if (i === AX || i === AX + 1) { // the axes: impact up, likelihood across
        const g = E.outCubic(clamp((b - 0.6 - (i - AX) * 0.15) / 0.7)), x0 = -2.5 * c - c * 0.06, y0 = 2.5 * c - c * 0.02 + c * 0.06;
        if (g <= 0) return hide(p);
        if (i === AX) seg(p, x0, y0, x0, lerp(y0, y0 - 5.1 * c, g), c * 0.05, C.navy);
        else seg(p, x0, y0, lerp(x0, x0 + 5.1 * c, g), y0, c * 0.05, C.navy);
        return;
      }
      const k = i - RK;
      if (k >= 0 && k < RISKS.length) {
        const g = E.outBack(clamp((b - RIN4(k)) / 0.45));
        if (g <= 0) return hide(p);
        const [[c0, r0], [c1, r1]] = RISKS[k], a = M4.pos(c0, r0), z = M4.pos(c1, r1);
        const e = E.glide(clamp((b - TREAT4(k)) / 0.7)), land = hit(b, TREAT4(k) + 0.7, 6);
        const hop = Math.sin(PI * clamp((b - TREAT4(k)) / 0.7)) * c * 1.1;
        circle(p, lerp(a[0], z[0], e), lerp(a[1], z[1], e) - hop, c * 0.34 * g * (1 + 0.25 * land), C.navy);
        p.h *= 1 - 0.2 * land;
        return;
      }
      hide(p);
    },
    type: [
      { at: 0.9, to: 3.5, text: 'Risico’s? | In kaart.' },
      { at: 3.9, to: 6.7, text: 'En onder controle.' },
    ],
    music(M) {
      M.pad(0, 'E3 B3 D4 G4', 3.5, 0.28); M.sub(0, 'E2', 3.5, 0.2);
      M.whoosh(0, 1.0, 0.05, 600, 2400);
      for (let d = 0; d < 9; d++) M.marimba(1.1 + d * 0.07 + 0.3, penta(d + 2, 4), 0.08, (d / 8 - 0.5) * 0.9);
      RISKS.forEach((_, k) => M.drop(RIN4(k) + 0.05, penta(9 - k, 4), 0.14, (k / 4 - 0.5) * 0.6));
      M.pad(3.5, 'C3 G3 E4 B4', 3.5, 0.28); M.sub(3.5, 'C2', 3.5, 0.22);
      RISKS.forEach((_, k) => { M.marimba(TREAT4(k) + 0.7, penta(k + 5, 4), 0.14, (k / 4 - 0.5) * 0.6); M.tick(TREAT4(k) + 0.7, 0.04); });
      for (let b = 1; b < 7; b += 1) M.kick(b, b % 2 ? 0.2 : 0.14);
      M.ep(5.6, 'D6', 0.12); M.ep(5.6, 'G5', 0.1);
    },
  };

  // =========================================================== 5 · niet gewoon
  // A crowd of identical navy dots hops in perfect sync. The one in the middle turns yellow,
  // jumps out of line and becomes a different shape; everyone turns to look. Then it fills the frame.
  const D0 = 20, POP5 = 3.9, COVER5 = [6.5, 7.8];
  const crowd5 = perLayout(() => {
    const cols = G.portrait ? 7 : 11, rows = G.portrait ? 9 : 5;
    const sp = Math.min((G.W * 0.86) / cols, (G.H * 0.5) / rows, G.R * 0.34), mc = (cols - 1) / 2, mr = (rows - 1) / 2, pos = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (r === mr && c === mc) continue;
      pos.push([(c - mc) * sp, (r - mr) * sp - G.R * 0.04, Math.hypot(c - mc, r - mr)]);
    }
    return { sp, pos, d: sp * 0.36, y0: -G.R * 0.04 };
  });
  const syncHop = (b, amp) => { // everybody's hop, one per beat until the yellow one breaks rank
    const on = clamp((b - 0.9) / 0.3) * (1 - clamp((b - POP5) / 0.8));
    return { y: -Math.sin(PI * BJ.frac(b)) * amp * on, sq: hit(b, Math.floor(b), 9) * on };
  };
  function hero5(p, b) {
    const Cw = crowd5(), d = Cw.d, sp = Cw.sp, h = syncHop(b, sp * 0.2);
    const yel = E.inOutSine(clamp((b - POP5) / 0.2));
    const jump = clamp((b - POP5 - 0.1) / 1.1), jy = -Math.sin(PI * jump) * sp * 1.5;
    const land = hit(b, POP5 + 1.2, 6) + hit(b, 5.7, 7) * 0.8 + hit(b, 6.2, 7) * 0.6;
    const hops = -(Math.max(0, Math.sin(PI * clamp((b - 5.2) / 0.5))) + 0.7 * Math.max(0, Math.sin(PI * clamp((b - 5.7) / 0.5)))) * sp * 0.45;
    const grow = 1 + 1.6 * E.outBack(clamp((b - POP5) / 0.8));
    const sq = clamp(h.sq * 0.25 + land * 0.35, 0, 0.6), stretch = jump > 0 && jump < 1 ? Math.cos(PI * jump) * 0.18 : 0;
    const D = d * grow, tall = lerp(1.3, 1, yel); // a pill like everyone else, until it isn't
    rect(p, 0, Cw.y0 + h.y + jy + hops, D * (1 + sq - stretch), D * tall * (1 - sq + stretch), lerp(D / 2, D * 0.2, E.inOutCubic(clamp((b - POP5 - 0.2) / 0.8))), mix(C.navy, C.yellow, yel));
    p.rot = E.inOutCubic(clamp((b - POP5 - 0.1) / 1.1)) * (PI * 1.25) + Math.sin(b * 2.2) * 0.12 * clamp(b - 5.2);
    p.y += (D * tall - p.h) / 2;
    const t = clamp((b - COVER5[0]) / (COVER5[1] - COVER5[0]));
    if (t > 0) {
      const S = lerp(p.w, cover() * 1.2, E.inQuart(t));
      p.w = p.h = S; p.r = lerp(p.r, S / 2, t); p.y = lerp(p.y, 0, t);
    }
  }
  const S5 = {
    name: 'anders',
    beats: 8,
    blend: { start: (i) => (i === 0 ? 0 : ((i * 37) % 23) * 0.012), dur: (i) => (i === 0 ? 0.5 : 0.9), ease: E.glide, arc: 0.12 },
    bg: (b) => (b < COVER5[1] ? C.white : C.yellow),
    dark: (b) => b >= COVER5[1] - 0.3,
    pose(i, b, p) {
      if (b >= COVER5[1]) return hide(p);
      if (i === 0) return hero5(p, b);
      const Cw = crowd5(), q = Cw.pos[i - D0];
      if (!q) return hide(p);
      const [x0, y0, dist] = q, d = Cw.d, h = syncHop(b, Cw.sp * 0.2);
      // the crowd takes a step back to make room
      const bk = E.outCubic(clamp((b - POP5 - 0.15 - dist * 0.03) / 0.6)) * Cw.sp * 0.32 / dist;
      const x = x0 * (1 + bk / Cw.sp), y = Cw.y0 + (y0 - Cw.y0) * (1 + bk / Cw.sp);
      // everyone turns to look at the odd one out
      const lk = E.outBack(clamp((b - POP5 - 0.35 - dist * 0.05) / 0.5));
      const hy = Cw.y0 - Cw.sp * 0.6, a = Math.atan2(hy - y, 0 - x);
      pill(p, x, y + h.y + d * 0.2 * h.sq * 0.5, d * 1.3 * (1 - 0.25 * h.sq) * lerp(1, 1.15, lk), d * (1 + 0.2 * h.sq), 0, C.navy);
      const r = a - PI / 2, rr = r - Math.round(r / PI) * PI; // a pill looks the same turned 180°: take the short way
      p.rot = lk * rr;
    },
    type: [
      { at: 0.7, to: 3.8, text: 'Informatiebeveiliging | is niet gewoon.', size: 0.74 },
      { at: 4.4, to: 7.8, text: 'Daarom is Pasquil | anders.', size: 1.05 },
    ],
    music(M) {
      M.pad(0, 'A2 E3 C4 G4', POP5, 0.26); M.sub(0, 'A1', POP5, 0.2);
      for (let b = 1; b < POP5; b += 1) { M.thump(b, 0.3); M.marimba(b, 'E5', 0.06, 0); M.tick(b + 0.5, 0.03, 0.3); }
      M.snip(POP5); M.drop(POP5 + 0.05, 'G5', 0.26); M.whoosh(POP5, 1.1, 0.06, 400, 2600);
      M.bell(POP5 + 1.2, 'B5', 0.18); M.kick(POP5 + 1.2, 0.35);
      M.pad(POP5, 'D3 A3 F#4 B4', 8 - POP5, 0.3); M.sub(POP5, 'D2', 8 - POP5, 0.24);
      M.marimba(5.7, 'D6', 0.14, 0.3); M.marimba(6.2, 'G6', 0.12, -0.3);
      M.ep(4.4, 'A5', 0.14); M.ep(4.9, 'F#5', 0.12);
      M.whoosh(COVER5[0], COVER5[1] - COVER5[0], 0.09, 250, 3800);
      M.splash(COVER5[1] - 0.1, 0.3); M.boom(COVER5[1], 0.35); M.kick(COVER5[1], 0.45);
    },
  };

  // =========================================================== 6 · finale
  // Yellow field, navy logo (its keyhole shows the yellow through), a line about the tone of
  // voice, and a navy dot that stretches into the button.
  const logoW = () => Math.min(G.W * 0.74, G.R * 3.3, 880);
  const CTA_Y = () => (G.portrait ? 0.7 : 0.71);
  const LOGO6 = 0.5, TAG6 = 2.0, DOT6 = 3.4, BTN6 = [4.4, 5.5], SHOW6 = 5.5;
  const btnBox = measurer('#type .line.link a');
  const S6 = {
    name: 'finale',
    beats: 12,
    blend: { dur: 0.01 },
    bg: () => C.yellow,
    dark: () => true,
    pose(i, b, p) {
      if (i !== 1) return hide(p);
      const g = E.outBack(clamp((b - DOT6) / 0.5));
      if (g <= 0) return hide(p);
      const est = { x: 0, y: G.H * CTA_Y() - G.cy - G.F * 0.35, w: Math.max(260, G.F * 4), h: 52 };
      const bt = btnBox() || est, d = G.F * 0.32 * g;
      const beat = hit(b, DOT6 + 0.5, 5) + hit(b, DOT6 + 0.8, 6) * 0.6;
      const st = E.inOutCubic(clamp((b - BTN6[0]) / (BTN6[1] - BTN6[0])));
      const dd = d * (1 + 0.3 * beat) * lerp(1, bt.h / (G.F * 0.32) * 0.75, st);
      rect(p, bt.x, bt.y, lerp(dd, bt.w, st), lerp(dd, bt.h, st), lerp(dd / 2, 14, st), C.navy);
      if (b > SHOW6 + 1.2) hide(p);
    },
    type: [
      { at: LOGO6, to: Infinity, html: '<i class="mark" role="img" aria-label="Pasquil"></i>', cls: 'logo', y: () => (G.cy - G.R * 0.1) / G.H, size: () => logoW() / 3.439, fade: 1.1, pop: 0.9 },
      { at: TAG6, to: Infinity, text: 'Informatiebeveiliging en privacy. | Met humor en durf.', cls: 'soft', size: 0.46, y: () => (G.cy - G.R * 0.1 + logoW() / 3.439 / 2 + G.F * 0.85) / G.H, stagger: 0.08 },
      {
        at: DOT6 - 0.3, show: SHOW6, to: Infinity, cls: 'link', y: CTA_Y, fade: 0.8,
        html: '<a href="https://pasquil.nl" target="_blank" rel="noopener">Maak kennis op pasquil.nl</a>' +
          '<small>Advies &middot; Audits &middot; Risicomanagement &middot; FG-as-a-service</small>',
      },
    ],
    music(M) {
      M.kick(LOGO6, 0.4); M.snip(LOGO6 + 0.02);
      M.bell(LOGO6, 'G5', 0.22); M.bell(LOGO6 + 0.25, 'B5', 0.16, 0.3); M.bell(LOGO6 + 0.5, 'D6', 0.14, -0.3);
      M.pad(0, 'G3 B3 D4 A4', 12, 0.32); M.sub(0, 'G2', 12, 0.24);
      M.ep(TAG6, 'D5', 0.14); M.ep(TAG6 + 0.5, 'E5', 0.12); M.ep(TAG6 + 1.0, 'G5', 0.12);
      M.drop(DOT6, 'G5', 0.2); M.thump(DOT6 + 0.5, 0.36); M.thump(DOT6 + 0.8, 0.22);
      M.whoosh(BTN6[0], 1.1, 0.04, 400, 1800);
      M.marimba(SHOW6, 'D6', 0.14); M.marimba(SHOW6 + 0.2, 'G6', 0.12);
      for (let b = 2; b < 8; b += 2) M.kick(b, 0.16);
      M.ep(9, 'G5', 0.1); M.ep(9.02, 'D5', 0.08);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6];
})();
