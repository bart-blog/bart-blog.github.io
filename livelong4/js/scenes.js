/* LiveLong — "And you?" A 30-second social cut in 150 shapes, at 120 BPM.
   It opens on a branded hook: the logo, a question and a heartbeat.
   Your car gets checked every year. Your boiler gets serviced every year.
   Your phone updates every week. And you? Then the drop: one blood draw,
   44 biomarkers, no referral, results in 48 hours, reviewed by a doctor.
   Every scene defines pose(i, b, p), blend, type and music(M), all timed in beats. */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, hit = BJ.hit, clamp = BJ.clamp, lerp = BJ.lerp, C = BJ.C, mix = BJ.mix;
  const TAU = BJ.TAU, PI = Math.PI, SH = BJ.SHAPES;
  const AZURE = [79, 143, 214], LIGHT = [168, 199, 236], FLAME = [120, 196, 255];

  // ------------------------------------------------------------ drawing helpers
  const hide = (p) => { p.o = 0; p.w = p.h = 0; return true; };
  function circle(p, x, y, d, c) { p.x = x; p.y = y; p.w = p.h = d; p.r = d / 2; p.c = c; return true; }
  function rect(p, x, y, w, h, r, c) { p.x = x; p.y = y; p.w = w; p.h = h; p.r = r; p.c = c; return true; }
  function pill(p, x, y, len, th, rot, c) { p.x = x; p.y = y; p.w = th; p.h = Math.max(th, len); p.r = th / 2; p.rot = rot; p.c = c; p.sym = PI; return true; }
  function seg(p, x0, y0, x1, y1, th, c) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-6;
    return pill(p, (x0 + x1) / 2, (y0 + y1) / 2, L + th, th, Math.atan2(-dx / L, dy / L), c);
  }
  // local units → stage: scale by s px per unit, then move to (ox, oy)
  function place(p, ox, oy, s) { p.x = ox + p.x * s; p.y = oy + p.y * s; p.w *= s; p.h *= s; p.r *= s; p.z *= s; }
  function turn(p, cx, cy, a) {
    if (!a) return;
    const c = Math.cos(a), s = Math.sin(a), dx = p.x - cx, dy = p.y - cy;
    p.x = cx + dx * c - dy * s; p.y = cy + dx * s + dy * c; p.rot += a;
  }
  const maxHit = (b, times, decay) => { let e = 0; for (const t of times) e = Math.max(e, hit(b, t, decay)); return e; };
  const onBeat = (b, from, to, decay = 6) => { const f = Math.floor(b); return f >= from && f <= to ? hit(b, f, decay) : 0; };
  function perLayout(fn) { let v = -1, val; return () => { if (v !== G.version) { v = G.version; val = fn(); } return val; }; }
  const U = () => G.R;
  const yF = (px) => () => (G.cy + px()) / G.H;
  const TY = (k) => () => (G.textY + k * G.F) / G.H;
  // a two-line headline whose words land on the eighth notes
  function two(a1, a2, to, l1, l2, o = {}) {
    const sz = o.size || 0.84, st = o.stagger === undefined ? 0.5 : o.stagger;
    return [
      { at: a1, to, text: l1, y: TY(-0.5 * sz), size: sz, color: o.color, stagger: st, cls: o.cls1 },
      { at: a2, to, text: l2, y: TY(0.55 * sz), size: sz, color: o.color2 || o.color, stagger: st, cls: o.cls2 },
    ];
  }

  // ------------------------------------------------------------ the check badge
  // k 0: disc, 1–2: the tick, 3: spare. It lands like a rubber stamp.
  // pending: a grey disc with three dots that hop, like someone typing.
  const CK = [[-0.24, 0.02], [-0.07, 0.19], [0.27, -0.18]];
  function badge(p, k, t, bx, by, d, pending) {
    if (t < 0) return hide(p);
    const g = E.snap(clamp(t / 0.3)), sc = lerp(1.9, 1, g), D = d * sc, tilt = (1 - g) * -0.45;
    if (k === 0) { circle(p, bx, by, D, pending ? C.mist : C.navy); p.o = clamp(t / 0.1); return true; }
    if (pending) {
      const ph = BJ.frac(t * 0.9 - k * 0.16), hop = ph < 0.35 ? Math.sin((ph / 0.35) * PI) * D * 0.1 : 0;
      circle(p, bx + (k - 2) * D * 0.24, by - hop, D * 0.13 * clamp(t / 0.2), C.white);
      return true;
    }
    if (k === 3) return hide(p);
    const dr = k === 1 ? E.outCubic(clamp((t - 0.1) / 0.12)) : E.outCubic(clamp((t - 0.2) / 0.2));
    if (dr <= 0) return hide(p);
    const a = CK[k - 1], c = CK[k];
    seg(p, bx + a[0] * D, by + a[1] * D, bx + lerp(a[0], c[0], dr) * D, by + lerp(a[1], c[1], dr) * D, D * 0.12, C.white);
    turn(p, bx, by, tilt);
    return true;
  }

  // ------------------------------------------------------------ the car (side view, 2 units long)
  const CAR = 1, CARN = 22, BOIL = 23, BOILN = 14, PHN = 41, PHNN = 20, BADGE = 63; // 4 badges × 4 shapes
  function carPart(p, k, st) {
    const B = C.blue, dk = mix(C.blue, C.navy, 0.45), by = st.bob;
    let body = true;
    switch (k) {
      case 0: rect(p, 0, 0.12 + by, 2.0, 0.42, 0.17, B); break;
      case 1: rect(p, -0.08, -0.2 + by, 1.12, 0.5, 0.22, B); break;
      case 2: rect(p, -0.36, -0.2 + by, 0.44, 0.3, 0.09, LIGHT); break;
      case 3: rect(p, 0.2, -0.2 + by, 0.44, 0.3, 0.09, LIGHT); break;
      case 4: { const f = st.flash; rect(p, 0.955, 0.04 + by, 0.09 * (1 + f * 0.6), 0.11 * (1 + f * 0.6), 0.04, mix(C.peach, C.white, f)); break; }
      case 5: rect(p, -0.965, 0.04 + by, 0.07, 0.13, 0.03, C.peach); break;
      case 6: seg(p, -0.07, -0.02 + by, -0.07, 0.3 + by, 0.022, dk); break;
      case 7: seg(p, 0.03, 0.08 + by, 0.13, 0.08 + by, 0.035, dk); break;
      case 8: case 9: body = false; circle(p, k === 8 ? -0.58 : 0.58, 0.34, 0.42, C.ink); break;
      case 10: case 11: body = false; circle(p, k === 10 ? -0.58 : 0.58, 0.34, 0.2, C.mist); break;
      case 12: case 13: case 14: case 15: {
        body = false;
        const w = (k - 12) >> 1, x = w ? 0.58 : -0.58;
        pill(p, x, 0.34, 0.3, 0.05, st.dist / 0.21 + ((k - 12) & 1) * (PI / 2), C.steel);
        break;
      }
      case 17: case 18: case 19: {
        const j = k - 17, L = st.speed * (0.5 + j * 0.15), y = -0.22 + j * 0.24 + by;
        if (st.speed < 0.02) return false;
        seg(p, -1.12 - L, y, -1.12, y, 0.03, C.mist); p.o = clamp(st.speed * 2);
        break;
      }
      case 20: case 21: {
        if (st.smoke < 0.01) return false;
        const ph = BJ.frac(st.t * 1.6 + (k - 20) * 0.5);
        circle(p, -1.06 - ph * 0.45, 0.3 - ph * 0.12 + by, 0.07 + ph * 0.16, C.mist); p.o = (1 - ph) * st.smoke;
        break;
      }
      default: return false;
    }
    if (body && st.pitch) turn(p, 0, 0.34, st.pitch);
    return true;
  }

  // ------------------------------------------------------------ the boiler (1 unit wide, pipes below)
  function boilPart(p, k, st) {
    switch (k) {
      case 0: return rect(p, 0, 0, 0.97, 1.32, 0.13, C.steel);
      case 1: return rect(p, 0, 0, 0.91, 1.26, 0.1, C.white);
      case 2: return rect(p, 0, -0.4, 0.6, 0.2, 0.05, C.navy);
      case 3: return seg(p, -0.2, -0.4, lerp(-0.2, 0.06, st.flame), -0.4, 0.05, LIGHT);
      case 4: return circle(p, 0.19, -0.4, 0.06, mix(C.steel, FLAME, clamp(st.flame)));
      case 5: return rect(p, 0, 0.12, 0.44, 0.44, 0.1, C.ink);
      case 6: case 7: case 8: {
        const j = k - 6, base = [0.13, 0.2, 0.13][j];
        const fl = st.flame * (1 + 0.14 * Math.sin(st.t * 19 + j * 2.1) + 0.12 * st.pulse), d = base * fl;
        if (d < 0.01) return false;
        circle(p, (j - 1) * 0.11, 0.3 - d * 0.55, d, j === 1 ? LIGHT : FLAME);
        p.tip = 1; p.rot = PI / 4 + 0.08 * Math.sin(st.t * 13 + j);
        return true;
      }
      case 9: case 10: return circle(p, k === 9 ? -0.2 : 0.2, 0.5, 0.08, C.steel);
      case 11: case 12: case 13: { const x = (k - 12) * 0.25; return seg(p, x, 0.67, x, 1.0, 0.05, C.steel); }
    }
    return false;
  }

  // ------------------------------------------------------------ the phone (1.5 units tall)
  const PH = 1.5, PW = 0.74, PM = 0.035, ICONC = [LIGHT, AZURE, C.mist, C.blue, C.steel];
  function phonePart(p, k, st) {
    switch (k) {
      case 0: return rect(p, 0, 0, PW, PH, PW * 0.17, C.ink);
      case 1: return rect(p, 0, 0, PW - 2 * PM, PH - 2 * PM, PW * 0.13, C.white);
      case 2: return seg(p, -0.09, -PH / 2 + PM + 0.05, 0.09, -PH / 2 + PM + 0.05, 0.05, C.ink);
      case 15: if (st.ui <= 0.01) return false; seg(p, -0.22, 0.38, 0.22, 0.38, 0.05 * st.ui, C.mist); return true;
      case 16: if (st.ui <= 0.01) return false; seg(p, -0.22, 0.38, lerp(-0.22, 0.22, st.prog), 0.38, 0.05 * st.ui, C.blue); return true;
      case 17: case 18: case 19: {
        if (st.ui <= 0.01) return false;
        const s = st.ui, y = st.hop;
        if (k === 17) seg(p, 0, (-0.04 + y) * 1, 0, 0.18 + y, 0.055, C.blue);
        else seg(p, 0, 0.18 + y, (k === 18 ? -1 : 1) * 0.09, 0.09 + y, 0.055, C.blue);
        p.x *= s; p.y = lerp(0.07, p.y, s); p.w *= s; p.h *= s; p.r *= s;
        return true;
      }
    }
    if (k >= 3 && k <= 14) {
      const j = k - 3, r = Math.floor(j / 3), c = j % 3, v = st.icons[j];
      if (v <= 0.01) return false;
      const s = 0.14 * v;
      rect(p, (c - 1) * 0.2, -0.46 + r * 0.2, s, s, s * 0.28, ICONC[(j * 2 + r) % 5]);
      p.rot = 0.09 * Math.sin(st.t * 28 + j * 1.7) * st.jig;
      return true;
    }
    return false;
  }

  // positions of the three objects when they're the hero
  const CAR_Y = () => U() * 0.02, BOIL_Y = () => -U() * 0.17, PHN_Y = () => 0;
  const CAR_B = [0.8, -0.66], BOIL_B = [0.56, -0.72], PHN_B = [0.43, -0.72];

  // ------------------------------------------------------------ the groove
  const CH = {
    D: { bass: 'D2', saw: 'D4 F#4 A4 D5', pad: 'D3 A3 F#4 A4', hook: ['F#5', 'A5', 'D6', 'C#6', 'A5', 'F#5'], arp: ['D5', 'F#5', 'A5', 'F#5'] },
    A: { bass: 'A1', saw: 'C#4 E4 A4 C#5', pad: 'A2 E3 C#4 E4', hook: ['E5', 'A5', 'C#6', 'B5', 'A5', 'E5'], arp: ['C#5', 'E5', 'A5', 'E5'] },
    Bm: { bass: 'B1', saw: 'D4 F#4 B4 D5', pad: 'B2 F#3 D4 F#4', hook: ['F#5', 'B5', 'D6', 'C#6', 'B5', 'F#5'], arp: ['B4', 'D5', 'F#5', 'D5'] },
    G: { bass: 'G1', saw: 'D4 G4 B4 D5', pad: 'G2 D3 B3 D4', hook: ['G5', 'B5', 'D6', 'E6', 'D6', 'B5'], arp: ['B4', 'D5', 'G5', 'D5'] },
  };
  const HOOKT = [0, 0.75, 1.5, 2, 2.75, 3.5];
  function hook(M, at, ch, v = 0.3, n = 6) { CH[ch].hook.slice(0, n).forEach((note, k) => M.pluck(at + HOOKT[k], note, v * (k ? 1 : 1.12), (k % 2 ? 0.25 : -0.25))); }
  function arp(M, at, ch, v = 0.18) { for (let s = 0; s < 8; s++) M.pluck(at + s * 0.5, CH[ch].arp[s % 4], v * (s % 2 ? 0.8 : 1), s % 2 ? 0.4 : -0.4, 0.4); }
  function drums(M, from, to, o) {
    for (let b = from; b < to; b++) {
      if (o.kick) M.kick2(b, o.kv || 0.72);
      if (o.clap && b % 2 === 1) M.clap(b, o.cv || 0.42);
      if (o.hat) M.hat(b + 0.5, o.hv || 0.1, !!o.open, 0.25);
      if (o.hat16) { M.hat(b + 0.25, 0.035, false, -0.3); M.hat(b + 0.75, 0.045, false, -0.3); }
    }
  }
  function bassline(M, from, chords, v = 0.5) {
    chords.forEach((ch, k) => {
      for (let s = 0; s < 4; s++) M.pbass(from + k * 4 + s + 0.5, CH[ch].bass, v);
      M.pbass(from + k * 4 + 3.75, BJ.m(CH[ch].bass) + 12, v * 0.6);
    });
  }
  function saws(M, from, chords, v = 0.5, cut = 2600) { chords.forEach((ch, k) => M.saws(from + k * 4, CH[ch].saw, 3.85, v, cut)); }

  // =========================================================== 0 · the hook
  // The logo up top, the question below, and in between the orange dot draws a heartbeat.
  // Three beats of the heart land on beats 1, 3 and 5; then it all slides off to the right.
  const ECGK = [[0, 0], [0.14, 0], [0.19, -0.12], [0.24, 0], [0.32, 0], [0.35, 0.1], [0.39, -1], [0.43, 0.35], [0.47, 0], [0.58, 0], [0.66, -0.25], [0.74, 0], [1, 0]];
  const ECG0 = 1, ECGN = 36, PEAK0 = [1, 3, 5], OUT0 = [7.1, 8];
  const ecg0 = perLayout(() => {
    const Wl = Math.min(G.W * 0.84, U() * 4.4), A = U() * 0.5, pts = [];
    for (let j = 0; j < 3; j++) ECGK.forEach(([f, y], k) => { if (!j || k) pts.push([-Wl / 2 + ((j + f) / 3) * Wl, y * A]); });
    return { Wl, pts, th: U() * 0.035 };
  });
  const pen0 = (b) => clamp((b - 1) / 6 + 0.13);
  function penAt(L, x) {
    for (let k = 1; k < L.pts.length; k++) {
      const a = L.pts[k - 1], c = L.pts[k];
      if (x <= c[0]) return [x, lerp(a[1], c[1], c[0] > a[0] ? clamp((x - a[0]) / (c[0] - a[0])) : 1)];
    }
    return L.pts[L.pts.length - 1];
  }
  const out0 = (b) => E.inCubic(clamp((b - OUT0[0]) / (OUT0[1] - OUT0[0]))) * (G.W / 2 + ecg0().Wl * 0.6);
  const hookLogoW = () => Math.min(G.W * 0.62, U() * 2.3);
  const S0 = {
    name: 'hook',
    beats: 8,
    introBeat: 6.4,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const L = ecg0(), dx = out0(b), px = -L.Wl / 2 + pen0(b) * L.Wl;
      if (i === 0) {
        const [x, y] = penAt(L, px), beat = maxHit(b, PEAK0, 5), g = E.outBack(clamp(b / 0.4));
        return circle(p, x + dx, y, U() * 0.1 * g * (1 + 0.45 * beat), C.orange);
      }
      const k = i - ECG0;
      if (k < 0 || k >= ECGN) return hide(p);
      const a = L.pts[k], c = L.pts[k + 1], f = c[0] > a[0] ? clamp((px - a[0]) / (c[0] - a[0])) : px >= a[0] ? 1 : 0;
      if (f <= 0) return hide(p);
      seg(p, a[0] + dx, a[1], lerp(a[0], c[0], f) + dx, lerp(a[1], c[1], f), L.th, C.blue);
    },
    type: [
      { at: 0.1, to: 7.3, html: '<img src="img/logo.png" alt="LiveLong">', cls: 'logo', y: () => Math.max(G.cy - U(), G.H * 0.12) / G.H, size: () => hookLogoW() / 3.087, fade: 0.8 },
      ...two(0.9, 1.9, 7.4, 'When was your last', 'health check?', { size: 0.9, stagger: 0.4, color2: '#0053a2' }),
    ],
    music(M) {
      M.pad(0, CH.Bm.pad, 4, 0.3); M.sub(0, 'B1', 4, 0.18);
      M.pad(4, CH.G.pad, 4, 0.3); M.sub(4, 'G1', 4, 0.18);
      PEAK0.forEach((t, k) => { M.thump(t, 0.6); M.thump(t + 0.3, 0.36); M.beep(t, 'F#6', 0.05 + k * 0.005, 0.3); });
      M.pluck(1.9, 'D5', 0.16, -0.25); M.pluck(2.4, 'F#5', 0.14, 0.25);
      hook(M, 4, 'G', 0.2, 3);
      M.kick2(6, 0.45); M.kick2(7, 0.55); M.hat(6.5, 0.07, false, 0.25); M.hat(7.5, 0.09, true, 0.25);
      M.riser(5.5, 2.5, 0.3); M.whoosh(OUT0[0], 0.9, 0.1, 500, 3000);
    },
  };

  // =========================================================== 1 · your car
  const ARR1 = 1.1, STAMP1 = 2, HORN1 = [3, 3.25];
  const x0car = () => -(G.W / 2 + 1.25 * U());
  function carS1(b) {
    const e = E.outCubic(clamp(b / ARR1)), X = lerp(x0car(), 0, e);
    return {
      X,
      st: {
        dist: (X - x0car()) / U(), speed: b < ARR1 ? Math.pow(1 - clamp(b / ARR1), 1.6) : 0,
        bob: -0.03 * onBeat(b, 1, 3, 6) - 0.06 * maxHit(b, HORN1, 6), pitch: 0.07 * BJ.wobble(b, ARR1 * 0.75, 1.2, 3.2),
        flash: maxHit(b, HORN1, 4), smoke: 1 - clamp((b - 1.2) / 1), t: b * BJ.BEAT,
      },
    };
  }
  function road(p, g) { seg(p, -G.W * 0.6 * g, 0, G.W * 0.6 * g, 0, 0.028 * U(), C.mist); p.y = CAR_Y() + 0.56 * U(); p.o = clamp(g * 2); }
  const S1 = {
    name: 'car',
    beats: 4,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const u = U(), { X, st } = carS1(b);
      if (i === CAR + 16) return road(p, E.outCubic(clamp(b / 0.4)));
      if (i >= CAR && i < CAR + CARN) { if (!carPart(p, i - CAR, st)) return hide(p); return place(p, X, CAR_Y(), u); }
      if (i >= BADGE && i < BADGE + 4) { badge(p, i - BADGE, b - STAMP1, CAR_B[0], CAR_B[1] + st.bob, 0.42); return place(p, X, CAR_Y(), u); }
      hide(p);
    },
    type: two(0.25, 0.75, 3.8, 'Your car?', 'Checked every year.', { stagger: 0.25 }),
    music(M) {
      M.engine(0, 1.6, 0.55);
      drums(M, 0, 4, { kick: 1, hat: 1, kv: 0.66 });
      bassline(M, 0, ['D']);
      hook(M, 0, 'D');
      M.stamp(STAMP1, 0.6); M.bell(STAMP1 + 0.02, 'D6', 0.2, 0.3);
      M.horn(HORN1[0], 0.2, 'A4', 0.45); M.horn(HORN1[1], 0.5, 'A4', 0.45);
    },
  };

  // =========================================================== 2 · your boiler
  const IGN2 = 1.0, STAMP2 = 2;
  function boilS2(b) {
    return { flame: E.outBack(clamp((b - IGN2) / 0.35)), t: b * BJ.BEAT, pulse: onBeat(b, 1, 3, 5) };
  }
  const S2 = {
    name: 'boiler',
    beats: 4,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const u = U();
      if (i === CAR + 16) return road(p, 1 - E.inCubic(clamp(b / 0.7)));
      const X1 = -x0car(), ex = E.inCubic(clamp(b / 0.8)), X = ex * (G.W / 2 + 1.3 * u);
      const cst = { dist: X1 / u + X / u, speed: b < 0.8 ? 0.3 + ex * 0.7 : 0, bob: 0, pitch: -0.05 * E.outCubic(clamp(b / 0.25)), flash: 0, smoke: 0.6, t: b * BJ.BEAT };
      if (i >= CAR && i < CAR + CARN) { if (b > 0.85 || !carPart(p, i - CAR, cst)) return hide(p); return place(p, X, CAR_Y(), u); }
      if (i >= BADGE && i < BADGE + 4) { if (b > 0.85) return hide(p); badge(p, i - BADGE, 10, CAR_B[0], CAR_B[1], 0.42); return place(p, X, CAR_Y(), u); }
      const dy = (1 - E.spring(clamp((b - 0.25) / 0.7))) * G.H * 0.75, s = u * (1 + 0.025 * onBeat(b, 1, 3, 5));
      if (b < 0.25) return hide(p);
      if (i >= BOIL && i < BOIL + BOILN) { if (!boilPart(p, i - BOIL, boilS2(b))) return hide(p); return place(p, 0, BOIL_Y() + dy, s); }
      if (i >= BADGE + 4 && i < BADGE + 8) { badge(p, i - BADGE - 4, b - STAMP2, BOIL_B[0], BOIL_B[1], 0.42); return place(p, 0, BOIL_Y() + dy, s); }
      hide(p);
    },
    type: two(0.25, 0.75, 3.8, 'Your boiler?', 'Serviced every year.', { stagger: 0.25 }),
    music(M) {
      M.engine(0, 0.9, 0.3); M.whoosh(0, 0.8, 0.1, 500, 3000);
      drums(M, 0, 4, { kick: 1, clap: 1, hat: 1 });
      bassline(M, 0, ['A']);
      hook(M, 0, 'A');
      M.tick(IGN2 - 0.3, 0.25, 0.2); M.tick(IGN2 - 0.15, 0.25, 0.2); M.ignite(IGN2, 0.55);
      M.stamp(STAMP2, 0.6); M.bell(STAMP2 + 0.02, 'C#6', 0.2, 0.3);
    },
  };

  // =========================================================== 3 · your phone
  const STAMP3 = 2, PROG3 = [1.0, 1.85];
  function phoneS3(b) {
    const icons = [];
    for (let j = 0; j < 12; j++) {
      const out = 1 - E.inCubic(clamp((b - 0.7 - (j % 3) * 0.03) / 0.25));
      const back = E.outBack(clamp((b - 2.3 - j * 0.03) / 0.35));
      icons.push(b < 2.2 ? out : back);
    }
    return {
      icons, t: b * BJ.BEAT, jig: b > 0.45 && b < 0.95 ? 1 : 0,
      ui: E.outBack(clamp((b - 0.85) / 0.3)) * (1 - E.inCubic(clamp((b - 2.05) / 0.3))),
      prog: E.inOutSine(clamp((b - PROG3[0]) / (PROG3[1] - PROG3[0]))), hop: 0.03 * maxHit(b, [1, 1.5], 6),
    };
  }
  const S3 = {
    name: 'phone',
    beats: 4,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const u = U();
      const dyB = E.inCubic(clamp(b / 0.5)) * G.H * 0.8;
      if (i >= BOIL && i < BOIL + BOILN) { if (b > 0.55 || !boilPart(p, i - BOIL, boilS2(4 + b))) return hide(p); return place(p, 0, BOIL_Y() + dyB, u); }
      if (i >= BADGE + 4 && i < BADGE + 8) { if (b > 0.55) return hide(p); badge(p, i - BADGE - 4, 10, BOIL_B[0], BOIL_B[1], 0.42); return place(p, 0, BOIL_Y() + dyB, u); }
      if (b < 0.2) return hide(p);
      const dy = -(1 - E.spring(clamp((b - 0.2) / 0.7))) * G.H * 0.8, s = u * (1 + 0.02 * onBeat(b, 1, 3, 5));
      if (i >= PHN && i < PHN + PHNN) { if (!phonePart(p, i - PHN, phoneS3(b))) return hide(p); return place(p, 0, PHN_Y() + dy, s); }
      if (i >= BADGE + 8 && i < BADGE + 12) { badge(p, i - BADGE - 8, b - STAMP3, PHN_B[0], PHN_B[1], 0.42); return place(p, 0, PHN_Y() + dy, s); }
      hide(p);
    },
    type: [
      ...two(0.25, 0.75, 3.8, 'Your phone?', 'Updated every week.', { stagger: 0.25 }),
      { at: 0.9, to: 2.2, fn: (b) => Math.round(phoneS3(b).prog * 100) + '%', y: yF(() => U() * 0.56), size: 0.34, color: '#0053a2', cls: 'num', stagger: 0 },
    ],
    music(M) {
      M.whoosh(0, 0.5, 0.1, 3000, 400); M.whoosh(0.2, 0.5, 0.08, 400, 2500);
      drums(M, 0, 4, { kick: 1, clap: 1, hat: 1, open: 1, hat16: 1 });
      bassline(M, 0, ['Bm']);
      hook(M, 0, 'Bm', 0.26);
      const up = BJ.ms('D5 E5 F#5 A5 B5 D6 E6 F#6 A6 B6 D7');
      up.forEach((n, k) => M.marimba(PROG3[0] + (k / (up.length - 1)) * (PROG3[1] - PROG3[0]), n, 0.12 + k * 0.006, (k / 10 - 0.5) * 0.8));
      M.stamp(STAMP3, 0.6); M.bell(STAMP3 + 0.02, 'B5', 0.22, 0.3); M.bell(STAMP3 + 0.2, 'F#6', 0.16, -0.3);
    },
  };

  // =========================================================== 4 · and you?
  // The three line up with their ticks. You drop into the fourth slot: no tick, just dots.
  // Then everything else leaves, and you start to tremble into a drop.
  const SX = () => (G.portrait ? [-0.92, -0.31, 0.31, 0.92] : [-1.5, -0.5, 0.5, 1.5]), ROWY = () => -U() * 0.3;
  const MINI = [0.3, 0.38, 0.42], LAND4 = 1.0, BEAT4 = [1.5, 1.8, 2.5, 2.8], OUT4 = 3, GO4 = [3, 4.2], END4 = 6;
  const youD4 = (b) => {
    const land = 0.34, big = lerp(0.55, 0.72, clamp((b - GO4[1]) / 1.6)), sq = 1 - 0.16 * E.inCubic(clamp((b - END4 + 0.5) / 0.5));
    return U() * lerp(land, big, E.inOutCubic(clamp((b - GO4[0]) / (GO4[1] - GO4[0])))) * sq;
  };
  function youS4(p, b) {
    const u = U(), sx = SX()[3] * u, ry = ROWY();
    if (b < LAND4 - 0.11) return hide(p);
    const land = E.spring(clamp((b - (LAND4 - 0.11)) / 0.55)), go = E.inOutCubic(clamp((b - GO4[0]) / (GO4[1] - GO4[0])));
    const beat = maxHit(b, BEAT4, 6), shake = E.inCubic(clamp((b - GO4[1]) / 1.7));
    const d = youD4(b) * (1 + 0.2 * beat * (1 - go));
    circle(p, lerp(sx, 0, go) + Math.sin(b * 57) * shake * u * 0.022, lerp(lerp(-G.H * 0.6, ry, land), 0, go) + Math.cos(b * 71) * shake * u * 0.012, d, C.orange);
    p.tip = E.inOutSine(clamp((b - 3.8) / 1.2)); p.rot = PI / 4;
  }
  const S4 = {
    name: 'andyou',
    beats: END4,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const u = U(), sx = SX(), ry = ROWY();
      if (i === 0) return youS4(p, b);
      const out = (k) => 1 - E.inCubic(clamp((b - OUT4 - k * 0.12) / 0.5));
      const fly = (k) => E.inOutCubic(clamp((b - k * 0.08) / 0.75));
      // car from the left, boiler from below, phone shrinks from centre stage
      if (i >= CAR && i < CAR + CARN) {
        const e = fly(0), s = MINI[0] * out(0), cs = { dist: e * 6, speed: 0, bob: -0.04 * onBeat(b, 1, 2, 6), pitch: 0, flash: 0, smoke: 0, t: 0 };
        if (s < 0.01 || !carPart(p, i - CAR, cs)) return hide(p);
        return place(p, lerp(-G.W / 2 - u, sx[0] * u, e), ry - 0.05 * MINI[0] * u, s * u);
      }
      if (i >= BOIL && i < BOIL + BOILN) {
        const e = fly(1), s = MINI[1] * out(1);
        if (s < 0.01 || !boilPart(p, i - BOIL, { flame: 1, t: (b + 8) * BJ.BEAT, pulse: onBeat(b, 1, 2, 5) })) return hide(p);
        return place(p, sx[1] * u, lerp(G.H * 0.7, ry - 0.17 * MINI[1] * u, e), s * u);
      }
      if (i >= PHN && i < PHN + PHNN) {
        const e = fly(2), s = lerp(1, MINI[2], e) * out(2), st = phoneS3(4);
        if (s < 0.01 || !phonePart(p, i - PHN, st)) return hide(p);
        return place(p, lerp(0, sx[2] * u, e), lerp(0, ry, e), s * u);
      }
      if (i >= BADGE && i < BADGE + 12) {
        const k = Math.floor((i - BADGE) / 4), part = (i - BADGE) % 4, e = fly(k), m = MINI[k], s = out(k);
        if (s < 0.01) return hide(p);
        const d = (k === 2 ? lerp(0.42, 0.2 / m, e) : 0.2 / m) * s, pos = [CAR_B, BOIL_B, PHN_B][k];
        badge(p, part, 10, pos[0], pos[1], d);
        if (k === 0) place(p, lerp(-G.W / 2 - u, sx[0] * u, e), ry - 0.05 * m * u, m * u);
        else if (k === 1) place(p, sx[1] * u, lerp(G.H * 0.7, ry - 0.17 * m * u, e), m * u);
        else place(p, lerp(0, sx[2] * u, e), lerp(0, ry, e), lerp(1, m, e) * u);
        return;
      }
      if (i >= BADGE + 12 && i < BADGE + 16) {
        const s = out(3);
        if (s < 0.01) return hide(p);
        return badge(p, i - BADGE - 12, b - 1.4, sx[3] * u + 0.2 * u, ry - 0.22 * u, 0.2 * u * s, true);
      }
      hide(p);
    },
    type: [
      { at: 1.1, to: 5.6, text: 'And you?', size: 1.5, stagger: 0.5 },
    ],
    music(M) {
      M.kick2(0, 0.6); M.crash(0, 0.18); M.whoosh(0, 0.8, 0.1, 2400, 500);
      M.pad(0, CH.G.pad, 3, 0.34); M.sub(0, 'G1', 3, 0.2);
      M.pad(3, CH.A.pad, 2.5, 0.34); M.sub(3, 'A1', 2.5, 0.2);
      hook(M, 0, 'G', 0.24, 3);
      M.drop(LAND4, 'D6', 0.34); M.drop(LAND4 + 0.2, 'A5', 0.12, 0.3);
      M.beep(1.4, 'F#6', 0.06, 0.4); M.beep(1.6, 'F#6', 0.05, 0.4); M.beep(1.8, 'F#6', 0.04, 0.4);
      BEAT4.forEach((t, k) => M.thump(t, k % 2 ? 0.42 : 0.7));
      M.riser(3, 2.5, 0.42);
      // snare roll: eighths, sixteenths, thirty-seconds, then a half beat of silence before the drop
      const roll = [];
      for (let t = 3; t < 4; t += 0.5) roll.push(t);
      for (let t = 4; t < 5; t += 0.25) roll.push(t);
      for (let t = 5; t < 5.5; t += 0.125) roll.push(t);
      roll.forEach((t) => M.clap(t, 0.1 + 0.35 * ((t - 3) / 2.5) ** 1.5, 0));
      M.kick2(3, 0.4); M.kick2(4, 0.45);
    },
  };

  // =========================================================== 5 · now it's your turn
  // You burst into an orange field. One white drop, one blood draw. It splits into 44 tiles,
  // and the tiles ripple to the beat.
  const T0 = 101, NB = 44, GROUPS = [2, 4, 1, 5, 7, 2, 6, 2, 5, 10]; // electrolytes … hormones, as on livelong.nl
  const GOF = [], SOF = [];
  GROUPS.forEach((n, g) => { for (let s = 0; s < n; s++) { GOF.push(g); SOF.push(s); } });
  const grid5 = perLayout(() => {
    const cols = G.portrait ? 5 : 11, rows = Math.ceil(NB / cols);
    const cell = Math.min((G.W * 0.8) / cols, (G.H * 0.46) / rows, G.R * 0.3), pos = [], diag = [];
    for (let j = 0; j < NB; j++) {
      const r = Math.floor(j / cols), c = j % cols, n = Math.min(cols, NB - r * cols);
      pos.push([(c - (n - 1) / 2) * cell, (r - (rows - 1) / 2) * cell]);
      diag.push(Math.hypot(c - (n - 1) / 2, r - (rows - 1) / 2));
    }
    return { cell, pos, diag };
  });
  const bars5 = perLayout(() => {
    const colW = Math.min((G.W * 0.86) / 10, G.R * 0.42), cell = Math.min(colW * 0.84, (G.H * 0.5) / 10), pos = [];
    for (let j = 0; j < NB; j++) pos.push([(GOF[j] - 4.5) * colW, 5 * cell - (SOF[j] + 0.5) * cell]);
    return { cell, pos, bottom: 5 * cell };
  });
  const cover = () => 2.3 * Math.hypot(G.W / 2, G.H * 0.62);
  const BURST5 = 0.4, DRAW5 = 4, SPLIT5 = 7.7, BARS5 = 12;
  const EQ = [[0.5, 1, 0.3, 0.8, 0.2, 1, 0.6, 0.4, 0.9, 0.3], [1, 0.3, 0.9, 0.2, 1, 0.5, 0.2, 1, 0.4, 0.7], [0.3, 0.8, 0.5, 1, 0.6, 0.2, 1, 0.5, 0.3, 1]];
  function tile5(p, j, b) {
    const gd = grid5(), br = bars5(), g = GOF[j];
    const t = b - SPLIT5 - gd.diag[j] * 0.1, pop = E.outBack(clamp(t / 0.5)), mv = E.outCubic(clamp(t / 0.45));
    if (pop <= 0) return false;
    const e = E.inOutCubic(clamp((b - BARS5 - g * 0.05) / 0.9));
    const ripple = maxHit(b - gd.diag[j] * 0.06, [9, 10, 11], 5) * (1 - e);
    let eq = 0;
    for (let k = 0; k < 3; k++) eq = Math.max(eq, hit(b, 13 + k, 4.5) * EQ[k][g]);
    eq *= e;
    let x = lerp(gd.pos[j][0], br.pos[j][0], e), y = lerp(gd.pos[j][1], br.pos[j][1], e);
    y = br.bottom * e + (y - br.bottom * e) * (1 + 0.35 * eq * e);
    const size = lerp(gd.cell, br.cell, e) * 0.8 * pop * (1 + 0.12 * ripple);
    rect(p, x * mv, y * mv, size, size, size * 0.26, mix(C.white, C.peach, Math.max(ripple, eq) * 0.9));
    p.rx = e * TAU;
    return true;
  }
  const S5 = {
    name: 'drop',
    beats: 12,
    blend: { dur: 0.01 },
    bg: (b) => (b < BURST5 - 0.02 ? C.white : C.orange),
    dark: (b) => b >= BURST5,
    pose(i, b, p) {
      const u = U();
      if (i === 0) {
        if (b >= BURST5) return hide(p);
        const t = E.outCubic(clamp(b / BURST5)), D = lerp(youD4(END4), cover(), t);
        circle(p, 0, 0, D, C.orange); p.tip = 1 - clamp(t * 3); p.rot = PI / 4;
        return;
      }
      if (i === T0) { // one white drop: one blood draw
        const g = E.outBack(clamp((b - DRAW5) / 0.45)) * (1 - E.inCubic(clamp((b - SPLIT5) / 0.35)));
        if (g <= 0.01) return hide(p);
        const d = u * 0.55 * g * (1 + 0.1 * onBeat(b, 5, 7, 5));
        circle(p, 0, Math.sin(b * 1.6) * u * 0.02 + d * 0.08, d, C.white); p.tip = 1; p.rot = PI / 4;
        return;
      }
      const j = i - T0 - 1;
      if (j < 0 || j >= NB || !tile5(p, j, b)) return hide(p);
    },
    type: [
      { at: BURST5 + 0.1, to: 3.8, text: 'Now it’s | your turn.', y: yF(() => 0), size: 1.3, color: '#fff', stagger: 0.5 },
      { at: DRAW5 + 0.3, to: 7.6, text: 'One blood draw.', color: '#fff', size: 0.9, stagger: 0.5 },
      { at: 8.1, to: 11.8, fn: (b) => Math.round(NB * E.outCubic(clamp((b - SPLIT5) / 1.8))) + ' biomarkers.', color: '#fff', size: 0.9, cls: 'num' },
    ],
    music(M) {
      M.crash(0, 0.5); M.boom(0, 0.55); M.splash(0.05, 0.25);
      drums(M, 0, 12, { kick: 1, clap: 1, hat: 1, open: 1 });
      for (let b = 8; b < 12; b++) { M.hat(b + 0.25, 0.035, false, -0.3); M.hat(b + 0.75, 0.045, false, -0.3); }
      bassline(M, 0, ['D', 'A', 'Bm'], 0.55);
      saws(M, 0, ['D', 'A', 'Bm'], 0.55);
      M.sub(0, 'D2', 12, 0.12);
      ['D', 'A', 'Bm'].forEach((ch, k) => hook(M, k * 4, ch, 0.3));
      M.drop(DRAW5, 'A5', 0.34); M.bell(DRAW5 + 0.02, 'D6', 0.14);
      const up = BJ.ms('D5 F#5 A5 B5 D6 E6 F#6 A6 B6 D7 E7 F#7');
      up.forEach((n, k) => M.marimba(SPLIT5 + 0.1 + k * 0.125, n, 0.16, (k / 11 - 0.5) * 1.2));
    },
  };

  // =========================================================== 6 · three reasons, one per bar
  // A: the referral letter tears in half. B: 48 hours go round the clock.
  // D: 108 walk-in locations light up (timed in its original bar, 12–16; the scene plays it at 8–12).
  // --- A · the referral
  const DOC = []; // [side, fn(p)] in doc units (1 wide), side -1 left, +1 right
  DOC.push([-1, (p) => rect(p, -0.2375, -0.05, 0.485, 1.25, 0.05, C.white)]);
  DOC.push([1, (p) => rect(p, 0.2375, -0.05, 0.485, 1.25, 0.05, C.white)]);
  DOC.push([-1, (p) => seg(p, -0.33, -0.5, -0.1, -0.5, 0.08, C.blue)]);
  const LY = [-0.3, -0.17, -0.04, 0.09, 0.22], LR = [0.28, 0.22, 0.3, 0.18, 0.25];
  LY.forEach((y) => DOC.push([-1, (p) => seg(p, -0.33, y, -0.03, y, 0.035, C.mist)]));
  LY.forEach((y, k) => DOC.push([1, (p) => seg(p, 0.03, y, 0.03 + LR[k], y, 0.035, C.mist)]));
  DOC.push([1, (p) => seg(p, 0.1, 0.44, 0.22, 0.38, 0.03, C.steel)]);
  DOC.push([1, (p) => seg(p, 0.2, 0.38, 0.32, 0.43, 0.03, C.steel)]);
  const RIP6 = 2;
  function docPart(p, k, b) {
    const [s, fn] = DOC[k], u = U() * 1.05;
    fn(p);
    const pop = E.snap(clamp(b / 0.45)), shake = b > 1.4 && b < RIP6 ? Math.sin(b * 90) * 0.012 * (b - 1.4) / 0.6 : 0;
    const f = clamp((b - RIP6) / 1.5), open = E.outCubic(clamp((b - RIP6) / 0.35));
    turn(p, 0, 0.575, s * (0.22 * open + f * 0.7));
    p.x += s * (0.06 * open + f * f * 0.5) + shake;
    place(p, 0, -U() * 0.05 + f * f * G.H * 0.9, u * lerp(0.7, 1, pop));
    p.o = clamp(b / 0.15) * (1 - clamp((f - 0.5) / 0.5));
  }
  // --- B · the clock
  const NT = 48, RB = 31;
  const ringR = () => G.R * 0.86, tickL = () => G.R * 0.16, tickT = () => G.R * 0.046;
  const FILL6 = (b) => E.inOutSine(clamp((b - 4.4) / 2.4)), DONE6 = 6.8;
  function tick(p, k, fill, grow, pulse) {
    const a = -PI / 2 + (k / NT) * TAU, R = ringR() + pulse * G.R * 0.05, L = tickL() * grow * (1 + pulse * 0.35);
    pill(p, Math.cos(a) * R, Math.sin(a) * R, L, tickT() * (0.6 + 0.4 * grow), a - PI / 2, mix(C.mist, C.orange, clamp(fill * NT - k)));
    p.o = clamp(grow * 1.6);
  }
  const DSH6 = 4; // bar D plays 4 beats early
  // --- D · the map
  const NLP = SH.nl.pts, AMS = SH.nl.ams;
  const mapW = () => Math.min((G.H * 0.5) / SH.nl.h, G.W * 0.72);
  const AMSI = NLP.reduce((best, pt, k) => (Math.hypot(pt[0] - AMS[0], pt[1] - AMS[1]) < Math.hypot(NLP[best][0] - AMS[0], NLP[best][1] - AMS[1]) ? k : best), 0);
  const DMAX = Math.max(...NLP.map((pt) => Math.hypot(pt[0] - AMS[0], pt[1] - AMS[1])));
  const PIN6 = (function () {
    const rr = BJ.rng(108), idx = NLP.map((_, k) => k).filter((k) => k !== AMSI && k < 149), T = new Float32Array(NLP.length).fill(-1);
    for (let k = idx.length - 1; k > 0; k--) { const j = Math.floor(rr() * (k + 1)); [idx[k], idx[j]] = [idx[j], idx[k]]; }
    for (let k = 0; k < 108; k++) { const n = idx[k], pt = NLP[n]; T[n] = 12.7 + (Math.hypot(pt[0] - AMS[0], pt[1] - AMS[1]) / DMAX) * 1.7 + rr() * 0.12; }
    return T;
  })();
  const LAND6 = 12.4;
  function pin(p, x, y, s, c) { circle(p, x, y - 0.707 * s, s, c); p.tip = 1; p.rot = (5 * PI) / 4; }
  function mapDot(p, k, b) { // map point k at scene-6 beat b
    const Wm = mapW(), sp = SH.nl.sp * Wm, pt = NLP[k], x = pt[0] * Wm, y = pt[1] * Wm, T = PIN6[k];
    const g = E.outBack(clamp((b - 12 - (pt[0] + 0.5) * 0.7) / 0.4));
    if (g <= 0 || k === AMSI) return false;
    const d = sp * 0.34 * g;
    if (T < 0 || b < T) { circle(p, x, y, d, C.mist); p.rot = (5 * PI) / 4; return true; }
    const e = clamp((b - T) / 0.5), s = lerp(d, sp * 0.8, E.outCubic(clamp(e * 2)));
    const tp = E.inOutSine(clamp(e * 2)), sq = hit(b, T + 0.5, 7) * 0.18;
    pin(p, x, y, s, mix(C.mist, C.blue, tp));
    p.tip = tp; p.w = p.h = s * (1 + sq); p.r = p.w / 2;
    p.y = y - 4 * e * (1 - e) * G.R * 0.1 - 0.707 * s * tp;
    return true;
  }
  function amsPin(p, b) {
    const Wm = mapW(), sp = SH.nl.sp * Wm, t = clamp((b - LAND6 + 0.35) / 0.35);
    pin(p, AMS[0] * Wm, lerp(-G.H * 0.6, AMS[1] * Wm, E.inCubic(t)), sp * 1.9 * (1 + 0.25 * hit(b, LAND6, 3)), C.orange);
  }
  const S6 = {
    name: 'reasons',
    beats: 12,
    blend: { dur: 0.01 },
    bg: (b) => (b < 4 ? C.navy : C.white),
    dark: (b) => b < 4,
    pose(i, b, p) {
      const u = U();
      if (b < 4) { // A
        if (i >= 1 && i <= DOC.length) return docPart(p, i - 1, b);
        return hide(p);
      }
      if (b < 8) { // B
        const out = 1 - E.inCubic(clamp((b - 7.5) / 0.45)), done = hit(b, DONE6, 3);
        if (i === 0) {
          const a = -PI / 2 + FILL6(b) * TAU, d = tickT() * 2.2 * (1 + 0.5 * done) * E.outBack(clamp((b - 4.2) / 0.4)) * out;
          if (d <= 0.5) return hide(p);
          return circle(p, Math.cos(a) * ringR(), Math.sin(a) * ringR(), d, C.orange);
        }
        const k = i - RB;
        if (k < 0 || k >= NT) return hide(p);
        const g = E.outBack(clamp((b - 4 - k * 0.006) / 0.45)) * out;
        if (g <= 0) return hide(p);
        return tick(p, k, FILL6(b), g, done);
      }
      // D
      const bd = b + DSH6;
      if (i === 0) return bd < LAND6 - 0.35 ? hide(p) : amsPin(p, bd);
      if (i >= 1 && i <= 149 && mapDot(p, i - 1, bd)) return;
      hide(p);
    },
    type: [
      ...two(0.4, 1.4, 3.7, 'No GP', 'referral needed.', { color: '#fff' }),
      { at: 4.2, to: 7.8, fn: (b) => Math.round(FILL6(b) * 48) + 'h', y: () => G.cy / G.H, size: 1.2, cls: 'num' },
      ...two(4.4, 5.4, 7.7, 'Results', 'within 48 hours.'),
      ...two(8.4, 9.4, 11.8, 'Walk in at', '108 locations.'),
    ],
    music(M) {
      drums(M, 0, 12, { kick: 1, clap: 1, hat: 1, open: 1, hat16: 1 });
      bassline(M, 0, ['D', 'A', 'G'], 0.55);
      saws(M, 0, ['D', 'A', 'G'], 0.4, 2000);
      ['D', 'A', 'G'].forEach((ch, k) => { arp(M, k * 4, ch); M.crash(k * 4, k ? 0.2 : 0.35); M.whoosh(k * 4 - 0.6, 0.6, 0.08, 500, 3500); });
      // A: the tear
      M.rip(RIP6 - 0.05, 0.7, 0.5); M.whoosh(RIP6 + 0.3, 1.3, 0.1, 2600, 200);
      // B: every hour a tick, a note every six
      for (let k = 0; k < NT; k++) {
        const tb = 4.4 + (2.4 * Math.acos(1 - (2 * (k + 0.5)) / NT)) / PI;
        M.tick(tb, 0.05, Math.sin((k / NT) * TAU) * 0.7);
        if (k % 6 === 5) M.marimba(tb, ['E5', 'F#5', 'A5', 'B5', 'C#6', 'E6', 'F#6', 'A6'][Math.floor(k / 6)], 0.13, Math.sin((k / NT) * TAU) * 0.7);
      }
      M.bell(DONE6, 'A5', 0.24); M.bell(DONE6, 'E6', 0.16, 0.3);
      // D: the pins
      M.drop(LAND6 - DSH6, 'D6', 0.3);
      const order = [];
      PIN6.forEach((T, k) => { if (T >= 0) order.push([T, NLP[k][0]]); });
      order.sort((a, b) => a[0] - b[0]);
      const PEN = BJ.ms('G4 A4 B4 D5 E5 G5 A5 B5 D6 E6 G6 A6');
      order.forEach(([T, x], n) => { if (n % 4 === 0) M.marimba(T - DSH6 + 0.25, PEN[Math.floor(n / 4) % 12], 0.08, x * 1.6); });
    },
  };

  // =========================================================== 7 · take control
  // The map folds back into Amsterdam, the pin becomes you again, and you stretch into the button.
  const logoW = () => Math.min(G.W * 0.78, G.R * 3.6, 1000);
  const CTA_Y = () => (G.portrait ? 0.64 : 0.67);
  const LOGO7 = 2.7, MOVE7 = [2.2, 3.2], BTN7 = [3.2, 4], SHOW7 = 4, FINAL7 = 4;
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
  const S7 = {
    name: 'finale',
    beats: 10,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const u = U();
      if (i === 0) {
        const Wm = mapW(), sp = SH.nl.sp * Wm, e = E.inOutCubic(clamp(b / 1.0));
        const d0 = sp * 1.9, d = u * 0.3 * (1 + 0.22 * onBeat(b, 1, 2, 6));
        const px = AMS[0] * Wm, py = AMS[1] * Wm - 0.707 * d0;
        const est = { x: 0, y: G.H * CTA_Y() - G.cy - G.F * 0.35, w: Math.max(240, G.F * 3.6), h: 50 };
        const bt = button() || est;
        const mv = E.inOutCubic(clamp((b - MOVE7[0]) / (MOVE7[1] - MOVE7[0]))), st = E.inOutCubic(clamp((b - BTN7[0]) / (BTN7[1] - BTN7[0])));
        const dd = lerp(lerp(d0, d, e), bt.h * 0.8, mv);
        rect(p, lerp(lerp(px, 0, e), bt.x, mv), lerp(lerp(py, -u * 0.12, e), bt.y, mv), lerp(dd, bt.w, st), lerp(dd, bt.h, st), lerp(dd / 2, 14, st), C.orange);
        p.tip = 1 - e; p.rot = lerp((5 * PI) / 4, 2 * PI, e);
        if (b > SHOW7 + 1.2) hide(p);
        return;
      }
      if (i < 1 || i > 149) return hide(p);
      const k = i - 1;
      if (!mapDot(p, k, 16)) return hide(p);
      const Wm = mapW(), pt = NLP[k], dist = Math.hypot(pt[0] - AMS[0], pt[1] - AMS[1]) / DMAX;
      const e = E.inCubic(clamp((b - (1 - dist) * 0.35) / 0.55)), ax = AMS[0] * Wm, ay = AMS[1] * Wm;
      p.x = lerp(p.x, ax, e); p.y = lerp(p.y, ay, e); p.w *= 1 - e; p.h *= 1 - e; p.r *= 1 - e;
      if (e >= 1) hide(p);
    },
    type: [
      { at: 0.5, to: 2.6, text: 'Take control.', size: 1.35, stagger: 0.6 },
      { at: LOGO7, to: Infinity, html: '<img src="img/logo.png" alt="LiveLong">', cls: 'logo', y: () => G.cy / G.H, size: () => logoW() / 3.087, fade: 1.0 },
      {
        at: BTN7[0] - 0.2, show: SHOW7, to: Infinity, cls: 'link', y: CTA_Y, fade: 0.8,
        html: '<a href="https://www.livelong.nl/en" target="_blank" rel="noopener">Start now at livelong.nl</a>' +
          '<small>15% launch discount with code LIVE15</small>',
      },
    ],
    music(M) {
      M.crash(0, 0.4); M.boom(0, 0.45);
      drums(M, 0, FINAL7, { kick: 1, clap: 1, hat: 1, open: 1 });
      for (let s = 0; s < 4; s++) M.pbass(s + 0.5, s < 2 ? 'G1' : 'A1', 0.55);
      M.saws(0, CH.G.saw, 1.9, 0.5, 2600); M.saws(2, CH.A.saw, 1.9, 0.5, 2600);
      hook(M, 0, 'G', 0.28, 3); hook(M, 2, 'A', 0.28, 3);
      M.whoosh(MOVE7[0], 1.0, 0.08, 400, 2000);
      M.bell(LOGO7, 'A5', 0.18); M.bell(LOGO7 + 0.25, 'C#6', 0.14, 0.3); M.bell(LOGO7 + 0.5, 'E6', 0.12, -0.3);
      // the last chord: everything resolves home to D
      M.kick2(FINAL7, 0.75); M.crash(FINAL7, 0.45); M.boom(FINAL7, 0.5);
      M.saws(FINAL7, CH.D.saw, 5, 0.5, 2200); M.pad(FINAL7, CH.D.pad, 6.5, 0.36); M.sub(FINAL7, 'D2', 6, 0.22);
      hook(M, FINAL7, 'D', 0.26, 3);
      M.bell(FINAL7, 'D6', 0.2); M.bell(FINAL7 + 0.5, 'A5', 0.14, 0.3); M.bell(FINAL7 + 1, 'F#6', 0.1, -0.3);
      M.marimba(SHOW7 + 0.5, 'D6', 0.14); M.marimba(SHOW7 + 0.75, 'A6', 0.12);
    },
  };

  BJ.scenes = [S0, S1, S2, S3, S4, S5, S6, S7];
})();
