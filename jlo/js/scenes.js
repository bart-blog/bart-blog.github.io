/* Jannie — "Papa is weer op reis." A short film in 150 shapes.
   The coral dot is Jannie. The four below her are the kids (🩷💙💙🩷), the navy one is papa.
   Papa grabs his suitcase and flies off, again. The plane's contrail becomes his calendar,
   the calendar becomes the chaos, the chaos becomes a bakfiets with four heads in the box,
   and Jannie runs anyway: all the way from Amsterdam to Zaandam, into a medal and a heart.
   Every scene defines:
     pose(i, b, p)  shape i at local beat b: p.x, p.y (from G.cx/G.cy), p.w, p.h, p.r,
                    p.rot, p.rx, p.ry, p.z, p.o, p.c (and p.sym for pills)
     blend          how shapes travel from the previous scene
     type           the headlines, timed in beats
     music(M)       the score, timed in the same beats */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, hit = BJ.hit, clamp = BJ.clamp, lerp = BJ.lerp, C = BJ.C, mix = BJ.mix;
  const TAU = BJ.TAU, PI = Math.PI, wob = BJ.wobble;

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
  const yF = (px) => () => (G.cy + px()) / G.H;
  const gw = () => Math.min(G.W * 0.86, G.R * 3.3);
  const topY = (f) => -G.cy + G.H * f; // an absolute height on screen, as an offset from the stage centre
  const PENTA = ['G', 'A', 'B', 'D', 'E'];
  const penta = (k, base = 4) => PENTA[((k % 5) + 5) % 5] + (base + Math.floor(k / 5));

  // ------------------------------------------------------------ the family
  const KC = () => [C.pink, C.blue, C.blue, C.pink];
  const KD = [0.3, 0.26, 0.26, 0.22]; // eldest to youngest; the twins are the same size
  const famJ = () => [-G.R * 0.42, -G.R * 0.14];
  const famK = (k) => [-G.R * 0.42 + (k - 1.5) * G.R * 0.3, G.R * 0.34];
  const famD = () => [G.R * 0.5, -G.R * 0.12];
  function squash(p, w, amt = 0.22) { p.w *= 1 + amt * w; p.h *= 1 - amt * w; p.y += p.h * amt * w * 0.5; }

  function suitcase(p, k, x, y, s) {
    const w = s * 0.26, h = s * 0.34;
    if (k === 0) rect(p, x, y, w, h, s * 0.05, C.slate);
    else if (k === 1) pill(p, x, y - h / 2 - s * 0.03, s * 0.12, s * 0.04, PI / 2, C.ink);
    else circle(p, x + (k === 2 ? -1 : 1) * w * 0.3, y + h / 2 + s * 0.03, s * 0.06, C.ink);
  }
  // a plane seen from above: fuselage, two swept wings, tailplane
  function plane(p, k, x, y, th, L, c) {
    const ux = Math.cos(th), uy = Math.sin(th), nx = -uy, ny = ux;
    if (k === 0) seg(p, x - ux * L * 0.5, y - uy * L * 0.5, x + ux * L * 0.5, y + uy * L * 0.5, L * 0.15, c);
    else if (k === 1 || k === 2) {
      const s = k === 1 ? 1 : -1;
      seg(p, x + ux * L * 0.1, y + uy * L * 0.1, x - ux * L * 0.14 + s * nx * L * 0.48, y - uy * L * 0.14 + s * ny * L * 0.48, L * 0.11, c);
    } else seg(p, x - ux * L * 0.38 - nx * L * 0.17, y - uy * L * 0.38 - ny * L * 0.17, x - ux * L * 0.44 + nx * L * 0.17, y - uy * L * 0.44 + ny * L * 0.17, L * 0.08, c);
  }
  // plane shapes i0..i0+3, contrail i0+4..i0+4+nTrail-1, flying A → B between beats b0 and b1
  function flight(i, i0, nTrail, b, b0, b1, A, B, L, p) {
    const u = (b - b0) / (b1 - b0);
    const k = i - i0, th = Math.atan2(B[1] - A[1], B[0] - A[0]);
    const at = (v) => [lerp(A[0], B[0], v), lerp(A[1], B[1], v)];
    if (k < 4) {
      if (u <= 0 || u >= 1) return hide(p);
      const [x, y] = at(u);
      plane(p, k, x, y, th, L, k === 0 ? C.navy : C.slate);
      return;
    }
    const j = k - 4;
    if (j >= nTrail) return hide(p);
    const v = u - (j + 1.2) * 0.02, fade = 1 - clamp((u - v - 0.02) / 0.5);
    if (v <= 0 || v >= 1 || u <= 0) return hide(p);
    const [x, y] = at(v);
    circle(p, x, y, L * 0.09 * (1 + j * 0.05), C.steel);
    p.o = 0.75 * fade * (1 - j / nTrail);
  }

  // =========================================================== 1 · vier onder de vijf
  const KAT = [1.0, 2.0, 2.0, 3.0];
  const S1 = {
    name: 'four',
    beats: 8,
    introBeat: 0,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      if (i === 0) {
        const up = E.inOutCubic(clamp((b - 0.2) / 0.8)), beat = maxHit(b, [0, 0.5], 5);
        circle(p, 0, lerp(0, -G.R * 0.42, up), G.R * lerp(0.3, 0.34, up) * (1 + 0.1 * beat), C.coral);
        squash(p, 0.5 * maxHit(b, KAT, 5) * Math.sin(b * 12), 0.1);
        return;
      }
      if (i <= 4) {
        const k = i - 1, at = KAT[k], t = clamp((b - (at - 0.45)) / 0.45);
        if (b < at - 0.45) return hide(p);
        const d = G.R * KD[k], y0 = G.R * 0.32 - (1 - t * t) * G.R * 1.8;
        const hop = Math.sin(PI * clamp((b - (4.6 + k * 0.22)) / 0.42)) * G.R * 0.12;
        circle(p, (k - 1.5) * G.R * 0.42, y0 - hop, d, KC()[k]);
        squash(p, wob(b, at, 2.2, 4.5) + 0.6 * wob(b, 5.02 + k * 0.22, 2.4, 6));
        return;
      }
      hide(p);
    },
    type: [
      { at: 1.0, to: 4.0, text: 'Vier kinderen.' },
      { at: 4.4, to: 7.7, text: 'Allemaal onder de vijf.' },
    ],
    music(M) {
      M.pad(0, 'G3 D4 B4', 8, 0.3); M.sub(0, 'G2', 8, 0.18);
      M.thump(0, 0.45); M.thump(0.5, 0.3);
      M.marimba(1.0, 'D5', 0.22, -0.4); M.thump(1.0, 0.3);
      M.marimba(2.0, 'G5', 0.2, 0); M.marimba(2.0, 'B5', 0.18, 0.1); M.thump(2.0, 0.35);
      M.marimba(3.0, 'D6', 0.2, 0.4); M.thump(3.0, 0.3);
      for (let k = 0; k < 4; k++) M.marimba(5.02 + k * 0.22, penta(5 + k, 4), 0.14, (k / 3 - 0.5) * 0.8);
      M.ep(6.2, 'B5', 0.12); M.ep(6.9, 'A5', 0.1);
    },
  };

  // =========================================================== 2 · en papa?
  const IN2 = 0.6, CASE2 = 3.0, AWAY2 = [4.4, 6.4];
  const S2 = {
    name: 'papa',
    beats: 9,
    blend: { start: (i) => (i <= 4 ? i * 0.06 : 0), dur: 1.0, arc: 0.1 },
    pose(i, b, p) {
      const mv = E.inCubic(clamp((b - AWAY2[0]) / (AWAY2[1] - AWAY2[0]))), away = mv * (G.W / 2 + G.R * 1.3);
      const roll = mv > 0 && mv < 1 ? Math.abs(Math.sin((b - AWAY2[0]) * PI * 3)) * G.R * 0.03 : 0;
      const sad = E.inOutCubic(clamp((b - 6.6) / 1.0));
      if (i === 0) {
        const [x, y] = famJ();
        circle(p, x, y + sad * G.R * 0.03, G.R * 0.34, C.coral);
        squash(p, wob(b, IN2 + 1.0, 2, 4) * 0.5 - sad * 0.3, 0.12);
        return;
      }
      if (i <= 4) {
        const [x, y] = famK(i - 1);
        circle(p, x, y + sad * G.R * 0.04, G.R * KD[i - 1] * 0.8, KC()[i - 1]);
        squash(p, -sad * 0.4 + 0.6 * wob(b, AWAY2[0] + 0.2 + i * 0.1, 2.4, 5), 0.15);
        return;
      }
      const [dx, dy] = famD(), e = E.spring(clamp((b - IN2) / 1.2));
      if (i === 5) {
        circle(p, dx + (1 - e) * (G.W / 2 + G.R) + away, dy - roll, G.R * 0.36, C.navy);
        squash(p, wob(b, IN2 + 0.35, 2.2, 4.5), 0.2);
        return;
      }
      if (i <= 9) {
        const g = E.outBack(clamp((b - CASE2) / 0.55));
        if (g <= 0) return hide(p);
        suitcase(p, i - 6, dx + G.R * 0.4 + away, dy + G.R * 0.04 - roll, G.R * g);
        return;
      }
      hide(p);
    },
    type: [
      { at: 0.8, to: 3.9, text: 'En papa?' },
      { at: 4.3, to: 8.7, text: 'Papa is weer | op reis.' },
    ],
    music(M) {
      M.pad(0, 'C3 G3 E4 A4', 4.4, 0.28); M.sub(0, 'C2', 4.4, 0.18);
      M.whoosh(IN2 - 0.2, 0.8, 0.05, 1600, 400); M.thump(IN2 + 0.35, 0.45); M.ep(IN2 + 0.4, 'G4', 0.16);
      M.snip(CASE2); M.marimba(CASE2 + 0.05, 'E6', 0.16); M.marimba(CASE2 + 0.3, 'C6', 0.12);
      for (let k = 0; k < 10; k++) M.tick(AWAY2[0] + k * 0.18, 0.05, 0.2 + k * 0.08);
      M.pad(AWAY2[0], 'A2 E3 C4 G4', 4.6, 0.26); M.sub(AWAY2[0], 'A1', 4.6, 0.2);
      M.ep(6.6, 'E5', 0.14); M.ep(7.1, 'D#5', 0.13); M.ep(7.6, 'D5', 0.14);
    },
  };

  // =========================================================== 3 · alweer
  const FLY3 = [0.2, 4.4];
  const fly3A = () => [-(G.W / 2 + G.R * 0.8), G.R * 0.6], fly3B = () => [G.W / 2 + G.R * 0.8, -G.R * 1.15];
  const S3 = {
    name: 'again',
    beats: 6,
    blend: { dur: 0.8 },
    pose(i, b, p) {
      if (i === 0) {
        const [x, y] = famJ();
        circle(p, x, y + G.R * 0.03, G.R * 0.34, C.coral);
        squash(p, -0.3 + 0.8 * wob(b, 2.6, 2.2, 5), 0.12);
        return;
      }
      if (i <= 4) {
        const [x, y] = famK(i - 1);
        circle(p, x, y + G.R * 0.04, G.R * KD[i - 1] * 0.8, KC()[i - 1]);
        squash(p, -0.4 + wob(b, 2.6 + i * 0.07, 2.4, 5), 0.15);
        return;
      }
      if (i >= 60 && i < 84) return flight(i, 60, 20, b, FLY3[0], FLY3[1], fly3A(), fly3B(), G.R * 0.75, p);
      hide(p);
    },
    type: [{ at: 2.4, to: 5.7, text: 'Alweer.', cls: 'it', size: 1.35, stagger: 0 }],
    music(M) {
      M.pad(0, 'F3 C4 A4 E5', 6, 0.26); M.sub(0, 'F2', 6, 0.2);
      M.whoosh(FLY3[0], 4.2, 0.09, 180, 1400); M.boom(FLY3[0] + 0.6, 0.18);
      M.ep(2.6, 'C5', 0.18); M.ep(2.6, 'A4', 0.12); M.bell(2.62, 'E6', 0.1);
      M.ep(4.4, 'G4', 0.1); M.ep(5.0, 'F4', 0.1);
    },
  };

  // =========================================================== 4 · papa's agenda
  // Thirty days. Papa's away on all but three of them; Jannie ticks them off, one night at a time.
  const HOME4 = [5, 6, 19], AWAY4 = [];
  for (let d = 0; d < 30; d++) if (!HOME4.includes(d)) AWAY4.push(d);
  const TF4 = (n) => 1.5 + n * 0.19, POP4 = 7.0;
  const cell4 = () => Math.min(gw() / 7, G.R * 0.3);
  const tile4 = (d) => { const c = cell4(); return [(d % 7 - 3) * c, (Math.floor(d / 7) - 2) * c - G.R * 0.08]; };
  const filled4 = (b) => { let n = 0; for (let k = 0; k < AWAY4.length; k++) if (b >= TF4(k)) n = k + 1; return n; };
  const S4 = {
    name: 'calendar',
    beats: 9,
    blend: { start: (i) => (i >= 20 && i < 50 ? (i - 20) * 0.012 : 0), dur: 1.0, arc: 0.15 },
    pose(i, b, p) {
      const c = cell4(), t = c * 0.8;
      if (i === 0) {
        const u = clamp((b - TF4(0) + 0.19) / 0.19, 0, AWAY4.length - 1 + 0.999), k = Math.floor(u);
        const a = tile4(AWAY4[k]), n = tile4(AWAY4[Math.min(AWAY4.length - 1, k + 1)]), f = E.inOutSine(clamp((u - k) * 1.6 - 0.6));
        const end = E.inOutCubic(clamp((b - 6.9) / 0.7)), home = tile4(HOME4[2]);
        const x = lerp(lerp(a[0], n[0], f), home[0], end), y = lerp(lerp(a[1], n[1], f), home[1], end);
        circle(p, x, y, t * lerp(0.46, 0.62, end) * (1 + 0.2 * hit(b, POP4 + 0.3, 5)), C.coral);
        return;
      }
      if (i >= 20 && i < 50) {
        const d = i - 20, [x, y] = tile4(d), g = E.outBack(clamp((b - 0.2 - d * 0.018) / 0.5));
        if (g <= 0) return hide(p);
        const ak = AWAY4.indexOf(d);
        let col = C.blush, pk = 0;
        if (ak >= 0) { const tf = TF4(ak); col = mix(C.blush, C.navy, clamp((b - tf) / 0.2)); pk = hit(b, tf, 6); }
        else { col = mix(C.blush, C.pink, clamp((b - POP4) / 0.3)); pk = hit(b, POP4 + HOME4.indexOf(d) * 0.12, 5); }
        const s = t * g * (1 + 0.14 * pk);
        rect(p, x, y, s, s, s * 0.24, col);
        return;
      }
      hide(p);
    },
    type: [
      { at: 0.4, to: 2.8, text: 'Papa’s agenda.' },
      { at: 3.0, to: 8.7, fn: (b) => filled4(b) + ' nachten weg.', cls: 'num' },
    ],
    music(M) {
      M.pad(0, 'E3 B3 D4 G4', 9, 0.26); M.sub(0, 'E2', 9, 0.18);
      M.whoosh(0, 0.8, 0.04, 2200, 600);
      AWAY4.forEach((d, k) => M.tick(TF4(k), 0.04 + k * 0.0015, ((d % 7) / 6 - 0.5) * 0.8));
      M.ep(TF4(0), 'B4', 0.12); M.ep(TF4(12), 'A4', 0.1); M.ep(TF4(26), 'G4', 0.12);
      HOME4.forEach((d, k) => M.marimba(POP4 + k * 0.12, ['G5', 'B5', 'D6'][k], 0.16));
      M.bell(POP4 + 0.3, 'G6', 0.08);
    },
  };

  // =========================================================== 5 · chaos
  const TOY = [];
  { const rr = BJ.rng(11); for (let j = 0; j < 90; j++) TOY.push({ a: rr() * TAU, rad: 0.82 + rr() * 0.4, t: j % 3, s: 0.06 + rr() * 0.07, c: j % 5, ph: rr() * TAU, w1: 0.6 + rr() * 0.9, w2: 0.5 + rr() * 0.9, sp: (rr() - 0.5) * 5, at: 0.3 + j * 0.068 }); }
  const TOYC = () => [C.pink, C.blue, C.sand, C.rose, C.baby];
  const BURST5 = 7.2, DROP5 = 8.8;
  const S5 = {
    name: 'chaos',
    beats: 10,
    blend: { start: (i) => (i >= 20 ? (i % 30) * 0.01 : 0), dur: 0.9, arc: 0.2 },
    pose(i, b, p) {
      const lv = clamp((b - 0.5) / 6.7), burst = hit(b, BURST5, 2.5), fall = E.inCubic(clamp((b - DROP5) / 1.2));
      if (i === 0) {
        circle(p, 0, -G.R * 0.05, G.R * 0.34 * (1 + 0.12 * burst), C.coral);
        squash(p, Math.sin(b * PI * (1 + 2 * lv)) * 0.3 * lv, 0.15);
        return;
      }
      if (i <= 4) {
        const k = i - 1, a = (b - 0.5) * PI * (0.7 + 0.9 * lv) + k * TAU / 4, g = E.outBack(clamp((b - 0.2 - k * 0.1) / 0.6));
        if (g <= 0) return hide(p);
        const rx = G.R * 0.6 * (1 + 0.15 * burst), ry = G.R * 0.42 * (1 + 0.15 * burst);
        circle(p, Math.cos(a) * rx, -G.R * 0.05 + Math.sin(a) * ry + fall * G.H, G.R * KD[k] * 0.62 * g, KC()[k]);
        return;
      }
      if (i >= 20 && i < 110) {
        const T = TOY[i - 20], g = E.outBack(clamp((b - T.at) / 0.4));
        if (g <= 0) return hide(p);
        const ex = Math.min(G.R * 1.2, G.W * 0.46), ey = G.R * 0.95, amp = G.R * (0.03 + 0.1 * lv);
        let x = Math.cos(T.a) * T.rad / 1.22 * ex + Math.sin(b * T.w1 + T.ph) * amp;
        let y = Math.sin(T.a) * T.rad / 1.22 * ey - G.R * 0.05 + Math.cos(b * T.w2 + T.ph) * amp;
        x *= 1 + 0.25 * burst; y *= 1 + 0.25 * burst;
        y += fall * G.H * (0.8 + 0.3 * Math.sin(T.ph));
        const s = G.R * T.s * g, col = TOYC()[T.c];
        if (T.t === 0) rect(p, x, y, s, s, s * 0.2, col);
        else if (T.t === 1) circle(p, x, y, s, col);
        else pill(p, x, y, s * 1.7, s * 0.62, 0, col);
        p.rot += T.ph + b * T.sp * (0.25 + lv);
        p.rx = b * T.sp * 0.4 * lv; p.ry = b * T.sp * 0.3 * lv;
        return;
      }
      hide(p);
    },
    type: [
      { at: 0.6, to: 3.2, text: 'Dus: solo.' },
      { at: 3.6, to: 6.8, text: 'Vier kinderen. | Twee handen.' },
      { at: BURST5, to: 9.7, text: 'Chaos.', size: 1.5, stagger: 0 },
    ],
    music(M) {
      M.pad(0, 'D3 A3 F#4 C5', 10, 0.24); M.sub(0, 'D2', 10, 0.2);
      for (let b = 3.6; b < BURST5; b += 1) M.kick(b, 0.2);
      const rr = BJ.rng(5);
      for (let k = 0; k < 44; k++) { const t = 0.4 + Math.pow(k / 44, 0.7) * 6.6; M.marimba(t, penta(Math.floor(rr() * 12), 4), 0.06 + 0.06 * (k / 44), rr() * 1.6 - 0.8); }
      for (let k = 0; k < 8; k++) M.tick(4 + k * 0.4, 0.06, (k % 2 ? 0.5 : -0.5));
      M.boom(BURST5, 0.45); M.splash(BURST5, 0.2); M.bell(BURST5, 'D6', 0.14);
      M.whoosh(DROP5, 1.2, 0.07, 2400, 200);
    },
  };

  // =========================================================== 6 · bakfiets
  // Four heads in the box, one mama on the saddle. Papa? That's him up there.
  const U6 = () => Math.min(G.R * 0.9, gw() / 2.3);
  const FLY6 = [5.0, 9.2];
  const S6 = {
    name: 'bakfiets',
    beats: 10,
    blend: { start: (i) => (i >= 6 ? ((i * 7) % 24) * 0.03 : 0.1), dur: 1.2, arc: 0.15 },
    pose(i, b, p) {
      const U = U6(), oy = U * 0.15, P = (x, y) => [x * U, oy + y * U];
      const bump = Math.abs(Math.sin(b * PI * 1.25)) * U * 0.012;
      const wa = b * 1.9, pa = b * TAU * 0.55;
      if (i === 0) { const [x, y] = P(-0.3, -1.12); circle(p, x, y - bump, U * 0.28, C.coral); return; }
      if (i <= 4) {
        const k = i - 1, [x, y] = P(0.15 + k * 0.19, -0.27);
        circle(p, x, y - bump * 2 - Math.max(0, Math.sin(b * PI * 1.6 + k * 1.3)) * U * 0.04, U * KD[k] * 0.62, KC()[k]);
        return;
      }
      if (i >= 6 && i <= 15) {
        const front = i >= 11, k = (i - 6) % 5, [cx, cy] = front ? P(0.86, 0.49) : P(-0.78, 0.42), d = U * (front ? 0.46 : 0.62), a = wa * (front ? 1.35 : 1);
        if (k === 0) circle(p, cx, cy, d, C.ink);
        else if (k === 1) circle(p, cx, cy, d * 0.8, C.bg);
        else if (k <= 3) pill(p, cx, cy, d * 0.78, U * 0.022, a + (k - 2) * PI / 2, C.steel);
        else circle(p, cx, cy, U * 0.07, C.ink);
        return;
      }
      const th = U * 0.045, rear = P(-0.78, 0.42), bb = P(-0.3, 0.4), seat = P(-0.46, -0.32), frontA = P(0.86, 0.49);
      const hip = P(-0.44, -0.36), sh = P(-0.34, -0.9), grip = P(-0.16, -0.47);
      switch (i) {
        case 16: return seg(p, rear[0], rear[1], bb[0], bb[1], th, C.navy);
        case 17: return seg(p, bb[0], bb[1], seat[0], seat[1], th, C.navy);
        case 18: return seg(p, rear[0], rear[1], seat[0], seat[1], th * 0.8, C.navy);
        case 19: return seg(p, bb[0], bb[1], frontA[0], frontA[1], th, C.navy);
        case 20: { const [x, y] = P(0.43, 0.08); return rect(p, x, y - bump, U * 0.76, U * 0.46, U * 0.07, C.rose); }
        case 21: { const a = P(0.0, 0.1), c = P(-0.1, -0.45); return seg(p, a[0], a[1], c[0], c[1], th, C.navy); }
        case 22: { const c = P(-0.1, -0.45); return seg(p, c[0], c[1], grip[0], grip[1], U * 0.055, C.ink); }
        case 23: return seg(p, hip[0], hip[1] - bump, sh[0], sh[1] - bump, U * 0.2, C.coral);
        case 24: return seg(p, sh[0], sh[1] + U * 0.06 - bump, grip[0], grip[1], U * 0.08, C.coral);
        case 25: case 26: {
          const a = pa + (i - 25) * PI, ft = [bb[0] + Math.cos(a) * U * 0.14, bb[1] + Math.sin(a) * U * 0.14];
          return seg(p, hip[0], hip[1] - bump, ft[0], ft[1], U * 0.1, i === 25 ? C.ink : mix(C.ink, C.bg, 0.35));
        }
        case 27: { const [x, y] = P(-0.47, -0.36); return pill(p, x, y, U * 0.2, U * 0.055, PI / 2, C.ink); }
      }
      if (i >= 30 && i < 42) {
        const span = G.W + U * 2, j = i - 30, x = ((((j / 12) * span - b * U * 1.2) % span) + span) % span - span / 2;
        return pill(p, x, oy + U * 0.78, U * 0.22, U * 0.025, PI / 2, mix(C.bg, C.ink, 0.18));
      }
      if (i >= 100 && i < 116) return flight(i, 100, 12, b, FLY6[0], FLY6[1], [-(G.W / 2 + G.R * 0.5), topY(0.15)], [G.W / 2 + G.R * 0.5, topY(0.12)], G.R * 0.32, p);
      hide(p);
    },
    type: [
      { at: 1.0, to: 4.6, text: 'Bakfiets: | vier kids.' },
      { at: 5.0, to: 9.6, text: 'Papa: | vliegtuig.' },
    ],
    music(M) {
      M.pad(0, 'G3 D4 B4', 5, 0.26); M.sub(0, 'G2', 5, 0.2);
      M.bell(1.0, 'A6', 0.16); M.bell(1.35, 'A6', 0.14);
      for (let b = 1; b < 10; b += 1) { M.kick(b, 0.16); M.bass(b + 0.5, ['G2', 'D3', 'E3', 'C3'][Math.floor(b) % 4], 0.4, 0.18); }
      for (let k = 0; k < 8; k++) M.marimba(1.6 + k * 0.4, penta(k * 2 % 7, 5), 0.08, (k % 2 ? 0.4 : -0.4));
      M.pad(5, 'C3 G3 E4 A4', 5, 0.26); M.sub(5, 'C2', 5, 0.2);
      M.whoosh(FLY6[0], 4.2, 0.06, 200, 1200);
      M.ep(5.2, 'E5', 0.14); M.ep(5.6, 'C5', 0.12);
    },
  };

  // =========================================================== 7 · en toch rent ze
  const SL7 = [];
  { const rr = BJ.rng(3); for (let j = 0; j < 24; j++) SL7.push({ y: -0.75 + 1.25 * rr(), len: 0.15 + rr() * 0.45, sp: 2.4 + rr() * 2.2, off: rr() }); }
  const ORANGE7 = [7.0, 8.0];
  const S7 = {
    name: 'run',
    beats: 8,
    blend: { start: (i) => (i ? 0.05 + (i % 20) * 0.015 : 0), dur: 1.0, arc: 0.1 },
    bg: (b) => mix(C.bg, C.nn, E.inOutSine(clamp((b - ORANGE7[0]) / (ORANGE7[1] - ORANGE7[0])))),
    dark: (b) => b > 7.5,
    pose(i, b, p) {
      const toO = E.inOutSine(clamp((b - ORANGE7[0]) / (ORANGE7[1] - ORANGE7[0])));
      if (i === 0) {
        const ph = ((b * 2) % 1 + 1) % 1, sq = Math.pow(1 - Math.sin(PI * ph), 6);
        circle(p, 0, -G.R * 0.02 - Math.sin(PI * ph) * G.R * 0.2 * clamp(b / 0.6), G.R * 0.3, mix(C.coral, C.white, toO));
        squash(p, sq * clamp(b / 0.6), 0.18);
        return;
      }
      if (i >= 30 && i < 54) {
        const L = SL7[i - 30], span = G.W + G.R * 2;
        const x = span / 2 - ((((L.off * span + b * L.sp * G.R) % span) + span) % span);
        pill(p, x, L.y * G.R, L.len * G.R, G.R * 0.022, PI / 2, mix(mix(C.bg, C.ink, 0.14), C.white, toO));
        p.o = clamp(b / 0.8) * lerp(1, 0.5, toO);
        return;
      }
      if (i >= 54 && i < 66) {
        const s = Math.floor(b * 2) - (i - 54), age = b - s / 2;
        if (s < 1) return hide(p);
        pill(p, -age * G.R * 1.6, G.R * (0.2 + (s % 2 ? 0.04 : -0.04)), G.R * 0.1, G.R * 0.045, PI / 2, mix(C.pink, C.white, toO));
        p.o = clamp(1 - age / 3) * (1 - toO);
        return;
      }
      hide(p);
    },
    type: [
      { at: 0.6, to: 3.9, text: 'En tóch rent ze.' },
      { at: 4.3, to: 7.7, text: 'Tussen de luiers door.' },
    ],
    music(M) {
      M.pad(0, 'E3 B3 G4 D5', 8, 0.24); M.sub(0, 'E2', 8, 0.18);
      for (let s = 1; s < 16; s++) M.thump(s * 0.5, s % 2 ? 0.16 : 0.24);
      for (let b = 1; b < 8; b++) { M.kick(b, 0.18); M.tick(b + 0.5, 0.05, 0.3); }
      for (let k = 0; k < 12; k++) M.marimba(0.5 + k * 0.5, penta([0, 2, 4, 2, 5, 4, 2, 4, 7, 5, 4, 2][k], 4), 0.1, (k % 2 ? 0.3 : -0.3));
      M.whoosh(ORANGE7[0] - 0.2, 1.4, 0.07, 400, 2600);
    },
  };

  // =========================================================== 8 · dam tot dam
  const P8 = (b) => E.inOutSine(clamp((b - 1.0) / 8.6)), FIN8 = 9.6;
  const rx8 = (s) => lerp(-gw() / 2, gw() / 2, s), ry8 = (s) => G.R * (0.3 + 0.14 * Math.sin(s * TAU * 1.2 + 0.4));
  const CR8 = [];
  { const rr = BJ.rng(8); for (let j = 0; j < 24; j++) CR8.push({ o: (rr() - 0.5) * 0.24, l: (rr() - 0.5) * 0.2, ph: rr() * TAU }); }
  const S8 = {
    name: 'damtotdam',
    beats: 11,
    bg: () => C.nn,
    dark: () => true,
    blend: { start: (i) => (i >= 20 ? ((i - 20) % 44) * 0.012 : 0), dur: 1.0, arc: 0.12 },
    pose(i, b, p) {
      const P = P8(b), fin = hit(b, FIN8, 3);
      if (i === 0) {
        const bo = Math.abs(Math.sin(b * PI * 2)) * G.R * 0.03 * (P < 1 ? 1 : 0);
        circle(p, rx8(P), ry8(P) - bo, G.R * 0.2 * (1 + 0.3 * fin), C.white);
        return;
      }
      if (i >= 20 && i < 64) {
        const s = (i - 20) / 43, done = s <= P;
        circle(p, rx8(s), ry8(s), G.R * (done ? 0.065 : 0.05), C.white);
        p.o = (done ? 1 : 0.38) * (s > 0.1 && s < 0.18 ? 0.55 : 1);
        return;
      }
      if (i === 64) { pill(p, rx8(0.14), ry8(0.14), G.R * 0.9, G.R * 0.2, 0, C.white); p.o = 0.16; return; }
      if (i >= 70 && i < 94) {
        const c = CR8[i - 70], s = P + c.o * (1 - 0.5 * P) + 0.006 * Math.sin(b * 3 + c.ph);
        if (s < 0 || s > 1.01 || b < 0.6) return hide(p);
        const e = 0.0005, ang = Math.atan2(ry8(s + e) - ry8(s), rx8(s + e) - rx8(s));
        circle(p, rx8(s) - Math.sin(ang) * c.l * G.R, ry8(s) + Math.cos(ang) * c.l * G.R, G.R * 0.075, mix(C.nn, C.white, 0.5));
        return;
      }
      if (i === 96) return pill(p, rx8(1), ry8(1) - G.R * 0.22, G.R * 0.44, G.R * 0.03, 0, C.white);
      if (i === 97) { rect(p, rx8(1) + G.R * 0.085, ry8(1) - G.R * 0.37, G.R * 0.16, G.R * 0.11, G.R * 0.015, C.white); p.rot = 0.12 * wob(b, FIN8, 2, 3); return; }
      if (i === 98) { circle(p, rx8(0), ry8(0), G.R * 0.12, C.white); p.o = 0.8; return; }
      hide(p);
    },
    type: [
      { at: 0.9, to: 10.7, fn: (b) => (P8(b) * 16.1).toFixed(1).replace('.', ',') + ' km', y: yF(() => -G.R * 0.5), size: 1.3, cls: 'num', color: '#fff' },
      { at: 0.4, to: 5.0, text: 'Dam tot Dam.', color: '#fff' },
      { at: 5.4, to: 10.7, text: 'Van Amsterdam | naar Zaandam.', color: '#fff' },
    ],
    music(M) {
      const ch = [['C3 G3 E4', 'C2'], ['A2 E3 C4', 'A1'], ['F2 C3 A3', 'F1'], ['G2 D3 B3', 'G1']];
      for (let k = 0; k < 4; k++) { M.pad(k * 2.4, ch[k][0], 2.4, 0.26); M.sub(k * 2.4, ch[k][1], 2.4, 0.2); }
      for (let b = 1; b < FIN8; b += 1) { M.kick(b, 0.24); M.tick(b + 0.5, 0.05, 0.4); }
      for (let k = 0; k < 24; k++) M.marimba(1 + k * 0.35, penta(k % 8 + Math.floor(k / 8), 4), 0.07 + k * 0.003, ((k % 5) / 4 - 0.5) * 0.8);
      M.boom(FIN8, 0.5); M.splash(FIN8, 0.3); M.bell(FIN8, 'G5', 0.2); M.bell(FIN8 + 0.2, 'B5', 0.16); M.bell(FIN8 + 0.4, 'D6', 0.14);
      M.pad(FIN8, 'G3 B3 D4 G4', 11 - FIN8, 0.3); M.sub(FIN8, 'G2', 11 - FIN8, 0.2);
    },
  };

  // =========================================================== 9 · gehaald (en papa?)
  const CF = [];
  { const rr = BJ.rng(21); for (let j = 0; j < 44; j++) CF.push({ a: -PI / 2 + (rr() - 0.5) * PI * 1.4, v: 1.2 + rr() * 1.6, ph: rr() * TAU, sp: (rr() - 0.5) * 9, c: j % 5 }); }
  const CFC = () => [C.pink, C.blue, C.coral, C.gold, C.rose];
  const BURST9 = 1.7, FLY9 = [5.2, 9.4];
  const S9 = {
    name: 'medal',
    beats: 10,
    bg: (b) => mix(C.nn, C.bg, E.inOutSine(clamp(b / 1.2))),
    dark: (b) => b < 0.6,
    blend: { start: (i) => (i >= 20 && i < 64 ? 0.4 : 0), dur: 0.8 },
    pose(i, b, p) {
      const e = E.spring(clamp((b - 0.2) / 1.4)), cy = G.R * 0.02 - (1 - e) * G.R * 1.5, spin = (1 - E.outCubic(clamp((b - 0.2) / 1.8))) * TAU * 1.5;
      const glow = hit(b, BURST9, 3);
      if (i === 120 || i === 121) {
        const s = i === 120 ? -1 : 1;
        return seg(p, s * G.R * 0.12, cy - G.R * 0.28, s * G.R * 0.42, cy - G.R * 1.05, G.R * 0.2, i === 120 ? C.nn : mix(C.nn, C.ink, 0.15));
      }
      if (i >= 122 && i <= 124) {
        const d = G.R * [0.8, 0.64, 0.52][i - 122] * (1 + 0.06 * glow);
        circle(p, 0, cy, d, [C.gold, C.amber, C.gold][i - 122]);
        p.ry = spin;
        return;
      }
      if (i >= 20 && i < 64) {
        const F = CF[i - 20], t = b - BURST9;
        if (t <= 0) return hide(p);
        const dr = (1 - Math.exp(-1.8 * t)) / 1.8;
        const x = Math.cos(F.a) * F.v * G.R * dr + Math.sin(t * 2.4 + F.ph) * G.R * 0.05;
        const y = G.R * 0.02 + Math.sin(F.a) * F.v * G.R * dr + G.R * 0.28 * t * clamp(t / 1.2);
        pill(p, x, y, G.R * 0.1, G.R * 0.035, F.ph + t * F.sp, CFC()[F.c]);
        p.rx = t * F.sp * 0.6;
        p.o = clamp((5.0 - t) / 1.4);
        return;
      }
      if (i >= 100 && i < 116) return flight(i, 100, 12, b, FLY9[0], FLY9[1], [G.W / 2 + G.R * 0.5, topY(0.13)], [-(G.W / 2 + G.R * 0.5), topY(0.16)], G.R * 0.34, p);
      hide(p);
    },
    type: [
      { at: BURST9 + 0.1, to: 4.6, text: 'Gehaald.', size: 1.3, stagger: 0 },
      { at: 5.0, to: 6.8, text: 'En papa?' },
      { at: 7.0, to: 9.8, text: 'Die zat | in het vliegtuig.', cls: 'it' },
    ],
    music(M) {
      M.pad(0, 'G3 B3 D4 G4', 5, 0.3); M.sub(0, 'G2', 5, 0.22);
      M.whoosh(0, 1.2, 0.06, 2400, 500); M.thump(1.25, 0.4);
      M.bell(BURST9, 'D6', 0.24); M.bell(BURST9, 'G6', 0.16, 0.3); M.bell(BURST9 + 0.25, 'B6', 0.12, -0.3);
      M.splash(BURST9, 0.26); M.boom(BURST9, 0.35); M.kick(BURST9, 0.3);
      for (let k = 0; k < 10; k++) M.marimba(BURST9 + 0.2 + k * 0.14, penta(14 - k, 4), 0.07, (k / 9 - 0.5) * 1.2);
      M.pad(5, 'F3 A3 C4 E4', 5, 0.24); M.sub(5, 'F2', 5, 0.18);
      M.ep(5.1, 'A4', 0.12);
      M.whoosh(FLY9[0], 4.2, 0.07, 1600, 200);
      M.ep(7.1, 'E5', 0.14); M.ep(7.6, 'D#5', 0.13); M.ep(8.1, 'D5', 0.12); M.ep(8.7, 'C#5', 0.14);
    },
  };

  // =========================================================== 10 · dit is jannie
  const HEART = [];
  for (let j = 0; j < 36; j++) {
    const t = (j / 36) * TAU, x = 16 * Math.pow(Math.sin(t), 3), y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    HEART.push([x, y - 2.5]);
  }
  const CTA_Y = () => (G.portrait ? 0.64 : 0.67);
  const BEAT10 = [2, 3, 4, 4.5, 6.8, 7.8, 8.8, 9.3, 10.6, 11.6];
  const DAD10 = [4.8, 6.4], BTN10 = 8.8;
  const S10 = {
    name: 'finale',
    beats: 13,
    blend: { start: (i) => (i >= 20 && i < 56 ? (i - 20) * 0.02 : i <= 4 ? 0.2 + i * 0.08 : 0), dur: (i) => (i === 0 ? 1.4 : 1.1), arc: 0.2 },
    pose(i, b, p) {
      const beat = maxHit(b, BEAT10, 5), hs = G.R * 0.041 * (1 + 0.05 * beat), hcy = -G.R * 0.06;
      if (i === 0) { circle(p, 0, -G.R * 0.16, G.R * 0.26 * (1 + 0.06 * beat), C.coral); return; }
      if (i <= 4) {
        const k = i - 1;
        circle(p, (k - 1.5) * G.R * 0.17, G.R * 0.14, G.R * KD[k] * 0.5, KC()[k]);
        squash(p, maxHit(b, BEAT10.map((t) => t + k * 0.06), 7), 0.18);
        return;
      }
      if (i >= 20 && i < 56) {
        const [x, y] = HEART[i - 20];
        circle(p, x * hs, hcy + y * hs, G.R * 0.066, (i % 3 === 0 ? C.rose : C.pink));
        return;
      }
      // papa rolls in, a little late, suitcase first
      const mv = E.outCubic(clamp((b - DAD10[0]) / (DAD10[1] - DAD10[0]))), off = (1 - mv) * (G.W / 2 + G.R);
      const roll = mv > 0 && mv < 0.98 ? Math.abs(Math.sin((b - DAD10[0]) * PI * 3)) * G.R * 0.025 : 0;
      const dx = G.R * 0.84 + off, dy = G.R * 0.36;
      if (b < DAD10[0]) return hide(p);
      if (i === 5) { circle(p, dx, dy - G.R * 0.02 - roll, G.R * 0.24, C.navy); squash(p, wob(b, DAD10[1] - 0.3, 2.2, 4), 0.2); return; }
      if (i >= 6 && i <= 9) return suitcase(p, i - 6, dx + G.R * 0.25, dy + G.R * 0.02 - roll, G.R * 0.7);
      hide(p);
    },
    type: [
      { at: 1.0, to: 4.6, text: 'Dit is Jannie.', size: 1.15, stagger: 0.14 },
      { at: 5.4, to: 8.6, text: 'Oh, hoi papa. | Ook weer thuis?', cls: 'it' },
      {
        at: BTN10 - 0.2, show: BTN10, to: Infinity, cls: 'link', y: CTA_Y, fade: 0.9,
        html: '<a href="https://www.instagram.com/janniefromtheblog/" target="_blank" rel="noopener">@janniefromtheblog</a>' +
          '<small>🏠 Amsterdam &middot; 🩷💙💙🩷 &middot; 🏃🏻‍♀️ Dam tot Dam</small>',
      },
    ],
    music(M) {
      M.pad(0, 'C3 G3 E4 B4', 4.8, 0.28); M.sub(0, 'C2', 4.8, 0.2);
      BEAT10.forEach((t, k) => M.thump(t, k % 2 ? 0.26 : 0.4));
      M.ep(1.0, 'B5', 0.16); M.ep(1.5, 'D6', 0.12); M.ep(2.2, 'G5', 0.12);
      for (let k = 0; k < 10; k++) M.tick(DAD10[0] + k * 0.16, 0.05, 0.6 - k * 0.05);
      M.beep(DAD10[1], 'G5', 0.12); M.beep(DAD10[1] + 0.18, 'C6', 0.1);
      M.pad(4.8, 'A2 E3 C4 G4', 4, 0.26); M.sub(4.8, 'A1', 4, 0.2);
      M.ep(5.6, 'C5', 0.14); M.ep(6.2, 'E5', 0.12);
      M.kick(BTN10, 0.35); M.boom(BTN10, 0.25);
      M.bell(BTN10, 'G5', 0.2); M.bell(BTN10 + 0.25, 'B5', 0.15, 0.3); M.bell(BTN10 + 0.5, 'D6', 0.13, -0.3);
      M.pad(BTN10, 'G3 B3 D4 A4', 13 - BTN10, 0.3); M.sub(BTN10, 'G2', 13 - BTN10, 0.22);
      M.marimba(BTN10 + 1.2, 'D6', 0.12); M.marimba(BTN10 + 1.4, 'G6', 0.1);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10];
})();
