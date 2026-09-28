/* Mainblades — "Aircraft inspection, automated." A commercial in 150 shapes.
   The aircraft is built from leaf-shaped tiles (the corner style of mainblades.com).
   One lime shape is the drone. An inspector with a torch takes all day; the drone lifts off,
   flies the aircraft row by row and every tile it passes becomes a photo. The narrowbody grows
   into a widebody, the photos race a manual inspection, AI finds the damage, an inspector
   signs it off, and the drone folds itself into the Mainblades mark and then the button.
   Every scene defines:
     pose(i, b, p)  shape i at local beat b: p.x, p.y (from G.cx/G.cy), p.w, p.h, p.r,
                    p.tip, p.lf, p.rot, p.rx, p.ry, p.z, p.o, p.c (and p.sym for pills)
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
  // the Mainblades leaf: top-left and bottom-right rounded, the other two corners square
  function leaf(p, x, y, w, h, r, c) { rect(p, x, y, w, h, r, c); p.lf = 1; }
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
  const PENTA = ['E', 'G', 'A', 'B', 'D'];
  const penta = (k, base = 4) => PENTA[((k % 5) + 5) % 5] + (base + Math.floor(k / 5));
  const FS = '\u2007'; // figure space: keeps counters from jumping when a digit is added

  // ------------------------------------------------------------ cast
  // 1..132 tiles · 134 scan line · 135 torch / camera footprint · 136 inspector · 137 drone shadow
  // 138..141 drone arms · 142..145 rotor discs · 146..149 blades · 0 the drone itself (always on top)
  const LINE = 134, SPOT = 135, WALKER = 136, SHADOW = 137, DR = 138;

  // ------------------------------------------------------------ the aircraft
  // Top-down silhouettes (nose up) in units of the narrowbody's length, filled with a square grid.
  function inside(P, x, y) {
    const ax = Math.abs(x);
    let hw = 0;
    if (y >= P.n0 && y <= P.t1) {
      if (y < P.n1) hw = P.fw * Math.sqrt(Math.max(0, 1 - Math.pow((y - P.n1) / (P.n1 - P.n0), 2)));
      else if (y > P.t0) hw = lerp(P.fw, P.fw * 0.3, (y - P.t0) / (P.t1 - P.t0));
      else hw = P.fw;
    }
    if (hw > 0 && ax <= hw) return true;
    const w = P.wing;
    if (ax >= P.fw * 0.5 && ax <= w.tx) {
      const t = clamp((ax - P.fw) / (w.tx - P.fw));
      if (y >= lerp(w.le0, w.le1, t) && y <= lerp(w.te0, w.te1, t)) return true;
    }
    const s = P.stab;
    if (ax <= s.tx) {
      const t = ax / s.tx;
      if (y >= lerp(s.le0, s.le1, t) && y <= lerp(s.te0, s.te1, t)) return true;
    }
    for (const e of P.eng) if (ax >= e[0] && ax <= e[1] && y >= e[2] && y <= e[3]) return true;
    return false;
  }
  function fill(P, s) {
    const out = [];
    for (let r = -30; r <= 30; r++) for (let c = -30; c <= 30; c++) { const x = c * s, y = (r + 0.5) * s; if (inside(P, x, y)) out.push([x, y]); }
    return out.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }
  const NARROW = { n0: -0.5, n1: -0.4, t0: 0.3, t1: 0.5, fw: 0.058,
    wing: { tx: 0.48, le0: -0.07, te0: 0.13, le1: 0.18, te1: 0.27 }, stab: { tx: 0.17, le0: 0.34, te0: 0.47, le1: 0.44, te1: 0.5 }, eng: [[0.14, 0.21, -0.13, 0.02]] };
  const WIDE = { n0: -0.68, n1: -0.55, t0: 0.4, t1: 0.68, fw: 0.082,
    wing: { tx: 0.66, le0: -0.12, te0: 0.2, le1: 0.26, te1: 0.37 }, stab: { tx: 0.24, le0: 0.47, te0: 0.63, le1: 0.6, te1: 0.68 }, eng: [[0.18, 0.28, -0.2, 0.02]] };
  const SN = 0.045, SW = 0.0625, NP = fill(NARROW, SN), WP0 = fill(WIDE, SW), nN = NP.length, nW = WP0.length;
  const ZW = 1 / 1.12; // the widebody is drawn a little smaller, so it still fits
  // every narrowbody tile takes the nearest widebody slot; the extra tiles pop in where they're needed
  const WP = (function () {
    const perm = BJ.assign(nW, (i, j) => (i < nN ? Math.pow(NP[i][0] - WP0[j][0] * ZW, 2) + Math.pow(NP[i][1] - WP0[j][1] * ZW, 2) : 0));
    return Array.from(perm, (j) => WP0[j]);
  })();

  const Lp = perLayout(() => Math.min(G.R * 2.0, (G.W * 0.8) / 0.96, G.H * 0.58));
  const zW = perLayout(() => Math.min(ZW, (G.W * 0.88) / (1.36 * Lp())));
  const TILT = 0.5;
  // a point on the (tilted) hangar floor, h px above it, in stage coordinates
  function floor(u, v, zoom, tilt, h) {
    const L = Lp() * zoom, Y = v * L, c = Math.cos(tilt), s = Math.sin(tilt);
    return [u * L, Y * c - h * s, Y * s + h * c];
  }
  function tile(p, u, v, zoom, tilt, sp, c) {
    const f = floor(u, v, zoom, tilt, 0), d = sp * Lp() * zoom * 0.8;
    leaf(p, f[0], f[1], d, d, d * 0.32, c);
    p.z = f[2]; p.rx = tilt;
  }
  function onFloor(p, u, v, zoom, tilt, w, h, r, c, o) {
    const f = floor(u, v, zoom, tilt, 0);
    leaf(p, f[0], f[1], w, h, r, c);
    p.z = f[2]; p.rx = tilt; p.o = o;
  }

  // The drone, seen from above. d = { x, y, z, S (size), u (unfold), spin, rot, o }
  const ARMC = mix(C.lime, C.bg, 0.5), CORN = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  function drone(i, p, d) {
    const S = d.S, u = clamp(d.u), rot = d.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot);
    if (i === 0) { leaf(p, d.x, d.y, S * 0.34, S * 0.34, S * 0.1, C.lime); p.rot = rot; p.z = d.z || 0; return true; }
    const k = i - DR;
    if (k < 0 || k > 11) return false;
    if (u < 0.02) { hide(p); return true; }
    const c = CORN[k % 4], a = S * 0.4 * u, ox = (c[0] * cr - c[1] * sr) * a, oy = (c[0] * sr + c[1] * cr) * a;
    if (k < 4) seg(p, d.x, d.y, d.x + ox, d.y + oy, S * 0.07 * u, ARMC);
    else if (k < 8) { circle(p, d.x + ox, d.y + oy, S * 0.5 * u, C.lime); p.o = 0.16; }
    else pill(p, d.x + ox, d.y + oy, S * 0.46 * u, S * 0.05, (k % 2 ? -1 : 1) * d.spin + k * 1.1, C.lime);
    p.z = d.z || 0; p.o *= d.o === undefined ? 1 : d.o;
    return true;
  }
  const spinUp = (b, t0, ramp = 1.2, w = 9) => { const x = b - t0; return x <= 0 ? 0 : x < ramp ? (w * x * x) / (2 * ramp) : w * (x - ramp / 2); };
  function shadow(p, x, y, z, S, o, tilt) { leaf(p, x + S * 0.14, y + S * 0.2, S * 0.86, S * 0.86, S * 0.28, C.deep); p.z = z; p.rx = tilt; p.o = o; }

  // A lawnmower flight over the tiles: K bands, alternating direction, each band only as wide as
  // its tiles. T[k] is the fraction of the flight at which the drone passes over tile k.
  function scanPath(pts, sp, K) {
    const v0 = Math.min(...pts.map((q) => q[1])) - sp / 2, v1 = Math.max(...pts.map((q) => q[1])) + sp / 2, bh = (v1 - v0) / K;
    const band = pts.map((q) => Math.min(K - 1, Math.floor((q[1] - v0) / bh)));
    const wp = [];
    for (let k = 0; k < K; k++) {
      const us = pts.filter((_, j) => band[j] === k).map((q) => q[0]), a = Math.min(...us) - sp * 0.6, b = Math.max(...us) + sp * 0.6, yc = v0 + (k + 0.5) * bh;
      if (k % 2) wp.push([b, yc], [a, yc]); else wp.push([a, yc], [b, yc]);
    }
    const cum = [0];
    for (let k = 1; k < wp.length; k++) cum.push(cum[k - 1] + Math.hypot(wp[k][0] - wp[k - 1][0], wp[k][1] - wp[k - 1][1]));
    const L = cum[cum.length - 1];
    const T = pts.map((q, j) => { const k = band[j], s = wp[2 * k]; return (cum[2 * k] + Math.abs(q[0] - s[0])) / L; });
    const raw = (f) => {
      const s = clamp(f) * L;
      let k = 1;
      while (k < cum.length - 1 && cum[k] < s) k++;
      const t = clamp((s - cum[k - 1]) / (cum[k] - cum[k - 1] || 1));
      return [lerp(wp[k - 1][0], wp[k][0], t), lerp(wp[k - 1][1], wp[k][1], t)];
    };
    const at = (f) => { // a little averaging rounds the corners
      let x = 0, y = 0;
      for (let j = -2; j <= 2; j++) { const q = raw(f + j * 0.006); x += q[0] / 5; y += q[1] / 5; }
      return [x, y];
    };
    const turns = [];
    for (let k = 1; k < K; k++) turns.push(cum[2 * k - 1] / L);
    return { T, at, bh, turns };
  }
  const PATH4 = scanPath(NP, SN, 7), PATH5 = scanPath(WP, SW, 6);

  // tiles flip over and flash lime the moment they're photographed
  function captured(p, b, T, tilt) {
    const e = clamp((b - T) / 0.5);
    if (b < T) return;
    p.c = mix(mix(p.c, C.mist, E.outCubic(e)), C.lime, hit(b, T, 3.2) * 0.9);
    p.rx = tilt + PI * 2 * E.outCubic(e);
  }

  // A driving pulse under the drone scenes: kick on the beat, hats on the off-beat,
  // a clap on every other beat and an eighth-note bass on the chord root.
  function groove(M, b0, b1, root, o = {}) {
    for (let b = b0, n = 0; b < b1 - 0.01; b += 0.5, n++) {
      if (n % 2 === 0) { M.kick(b, (o.k || 0.3) * (n % 4 === 0 ? 1.15 : 0.9)); if (n % 4 === 2) M.clap(b, o.c || 0.14, 0.1); }
      else M.tick(b, 0.045, n % 4 === 1 ? 0.35 : -0.35);
      if (o.bass !== false) M.bass(b, n % 4 === 3 && o.hi ? o.hi : root, 0.35, n % 2 ? 0.14 : 0.2);
    }
  }
  const tag = (s) => '<span class="tag">' + s + '</span>';

  // =========================================================== 1 · every aircraft
  const DOCK = [0.36, 0.4], ledD = () => SN * Lp() * 0.62;
  const tilt1 = (b) => lerp(1.05, TILT, E.inOutCubic(clamp(b / 2.6)));
  function led(p, b, tilt) { // the parked drone: one lime light, blinking on the beat
    const f = floor(DOCK[0], DOCK[1], 1, tilt, 0), d = ledD();
    leaf(p, f[0], f[1], d, d, d * 0.3, C.lime);
    p.z = f[2]; p.rx = tilt; p.o = 0.55 + 0.45 * hit(b % 1, 0, 3);
  }
  const S1 = {
    name: 'aircraft',
    beats: 4,
    introBeat: 0,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const t = tilt1(b);
      if (i === 0) {
        const m = E.inOutCubic(clamp((b - 0.1) / 0.8)), d0 = G.F * 0.55;
        led(p, b, t);
        const x = p.x, y = p.y, z = p.z, d = p.w;
        leaf(p, lerp(0, x, m), lerp(0, y, m), lerp(d0, d, m), lerp(d0, d, m), lerp(d0 * 0.3, d * 0.3, m), C.lime);
        p.z = z * m; p.rx = t * m; p.o = b < 0.9 ? 1 : 0.55 + 0.45 * hit(b % 1, 0, 3);
        return;
      }
      const k = i - 1;
      if (k >= nN) return hide(p);
      const [u, v] = NP[k], at = 0.25 + (v + 0.5) * 1.3 + Math.abs(u) * 0.5, g = E.outBack(clamp((b - at) / 0.4));
      if (g <= 0) return hide(p);
      tile(p, u, v, 1, t, SN, mix(C.slate, C.steel, hit(b, at + 0.2, 3) * 0.7));
      p.w *= g; p.h *= g; p.r *= g; p.o = clamp(g * 2);
    },
    type: [{ at: 0.8, to: 3.85, text: 'every aircraft | needs a close look.', pop: 0.85 }],
    music(M) {
      M.pad(0, 'E3 B3 D4 F#4', 4, 0.3); M.sub(0, 'E2', 4, 0.2);
      M.blip(0.05, 'B5', 0.2); M.whoosh(0.1, 0.8, 0.04, 2400, 500);
      for (let k = 0; k < 12; k++) M.marimba(0.3 + k * 0.14, penta(k + 3, 4), 0.07 + k * 0.005, ((k % 5) / 4 - 0.5) * 0.8);
      for (let b = 1; b < 4; b++) { M.kick(b, 0.16); M.tick(b + 0.5, 0.035, 0.3); M.blip(b, 'B5', 0.06, 0.5); }
      M.ep(0.8, 'G5', 0.16); M.ep(1.1, 'B5', 0.14); M.ep(2.6, 'A5', 0.12);
    },
  };

  // =========================================================== 2 · by hand: all day
  // An inspector with a torch creeps down the nose while the clock races through the shift.
  const WALK = [0.2, 1.2, 2.2];
  const walkV = (b) => -0.52 + WALK.reduce((s, t) => s + 0.06 * E.inOutSine(clamp((b - t) / 0.7)), 0);
  const torch = (b) => [-0.03 + Math.sin(b * 3.4) * 0.045, walkV(b) + 0.03 + Math.cos(b * 2.5) * 0.035];
  const clock2 = (b) => { const m = Math.round(480 + E.inOutSine(clamp((b - 0.3) / 3.3)) * 510); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const S2 = {
    name: 'by hand',
    beats: 4,
    blend: { dur: 0.4 },
    pose(i, b, p) {
      if (i === 0) return led(p, b, TILT);
      const L = Lp();
      if (i === WALKER) { const d = SN * L * 0.8; onFloor(p, -0.105, walkV(b), 1, TILT, d, d, d / 2, C.white, E.outCubic(clamp((b - 0.05) / 0.4))); p.lf = 0; return; }
      if (i === SPOT) { const [u, v] = torch(b), d = 0.15 * L; onFloor(p, u, v, 1, TILT, d, d, d / 2, C.white, 0.14 * E.outCubic(clamp((b - 0.15) / 0.4))); p.lf = 0; return; }
      const k = i - 1;
      if (k >= nN) return hide(p);
      const [u, v] = NP[k], [tu, tv] = torch(b), lit = clamp(1 - Math.hypot(u - tu, v - tv) / 0.075) * clamp((b - 0.15) / 0.4);
      const done = clamp((walkV(b) - v) / 0.03) * (Math.abs(u) < 0.1 ? 1 : 0);
      tile(p, u, v, 1, TILT, SN, mix(mix(C.slate, C.grey, done * 0.6), C.mist, lit * 0.85));
    },
    type: [
      { at: 0.15, to: 3.85, fn: (b) => tag('by hand') + clock2(b), rich: true, cls: 'tab', size: 1.15 },
    ],
    music(M) {
      M.pad(0, 'C3 G3 B3 E4', 4, 0.24); M.sub(0, 'C2', 4, 0.18);
      for (let b = 0.25; b < 3.6; b += 0.25) M.tick(b, b % 1 ? 0.03 : 0.06, b % 0.5 ? -0.3 : 0.3);
      WALK.forEach((t) => { M.thump(t + 0.1, 0.22); M.thump(t + 0.45, 0.16); });
      M.ep(0.4, 'E5', 0.14); M.ep(1.4, 'D5', 0.12); M.ep(2.4, 'B4', 0.12);
      M.whoosh(2.7, 1.3, 0.07, 300, 3200);
    },
  };

  // =========================================================== 3 · meet the drone that flies itself
  // The light lifts off the floor, unfolds its arms and spins up its rotors — and the beat drops.
  const HOVER = [0, 0.04], SB = () => Math.min(G.R * 0.64, Lp() * 0.32);
  const LIFT3 = [0.1, 1.4], UNF3 = 0.3, SPIN3 = 0.4;
  function drone3(b) {
    const e = E.inOutCubic(clamp((b - LIFT3[0]) / (LIFT3[1] - LIFT3[0]))), S0 = ledD() / 0.34;
    const f = floor(lerp(DOCK[0], HOVER[0], e), lerp(DOCK[1], HOVER[1], e), 1, TILT, Lp() * 0.26 * e);
    const S = lerp(S0, SB(), e);
    return { x: f[0], y: f[1] + Math.sin(b * 2) * S * 0.03 * e, z: f[2], S, u: E.outBack(clamp((b - UNF3) / 0.6)), spin: spinUp(b, SPIN3, 0.8), e };
  }
  const S3 = {
    name: 'lift off',
    beats: 4,
    blend: { dur: (i) => (i === 0 ? 0.2 : 0.5) },
    pose(i, b, p) {
      const d = drone3(b);
      if (drone(i, p, d)) { if (i === 0) p.rot = 0; return; }
      if (i === SHADOW) {
        const f = floor(lerp(DOCK[0], HOVER[0], d.e), lerp(DOCK[1], HOVER[1], d.e), 1, TILT, 0);
        return shadow(p, f[0], f[1], f[2], d.S * lerp(0.4, 1, d.e), 0.4 * clamp(d.u), TILT);
      }
      const k = i - 1;
      if (k < 0 || k >= nN) return hide(p);
      const [u, v] = NP[k], r = Math.hypot(u - HOVER[0], v - HOVER[1]), rw = (b - 0.8) * 0.5;
      const ripple = b > 0.8 ? Math.exp(-Math.pow((r - rw) / 0.05, 2)) * clamp(1 - (b - 0.8) / 2.5) : 0;
      tile(p, u, v, 1, TILT, SN, mix(C.slate, C.steel, ripple * 0.6));
      p.z += ripple * Lp() * 0.02;
    },
    type: [{ at: 0.9, to: 3.85, text: 'meet the drone | that flies itself.', pop: 0.85 }],
    music(M) {
      M.pad(0, 'G2 D3 B3 F#4', 4, 0.3); M.sub(0, 'G1', 4, 0.22);
      M.boom(0, 0.36); M.kick(0, 0.46); M.splash(0, 0.14);
      M.rotor(SPIN3 - 0.1, 4 - SPIN3 + 0.1 + 7 + 5 + 0.9, 0.22, 1.0, 1.0);
      M.bell(UNF3 + 0.2, 'B5', 0.2); M.bell(UNF3 + 0.2, 'F#6', 0.12, 0.3);
      M.ep(UNF3 + 0.2, 'D5', 0.14, -0.3); M.ep(UNF3 + 0.45, 'G5', 0.14); M.ep(UNF3 + 0.7, 'B5', 0.14, 0.3);
      groove(M, 1, 4, 'G2', { hi: 'D3' });
      M.ep(2.0, 'A5', 0.12); M.ep(3.0, 'F#5', 0.1);
    },
  };

  // =========================================================== 4 · a narrowbody in 45 minutes
  const SCAN4 = [0.5, 5.0], DONE4 = 5.3, HS = () => Lp() * 0.12;
  function scanDrone(path, zoom, b, win, sp) {
    const f = clamp((b - win[0]) / (win[1] - win[0])), q = path.at(f), after = E.inOutCubic(clamp((b - win[1] - 0.1) / 0.7));
    const u = lerp(q[0], HOVER[0], after), v = lerp(q[1], HOVER[1], after), S = path.bh * Lp() * zoom * lerp(0.95, 1.2, after);
    const fl = floor(u, v, zoom, TILT, HS()), gr = floor(u, v, zoom, TILT, 0);
    return { u, v, S, fl, gr, f, after, sp };
  }
  function scanScene(i, b, p, path, zoom, win, spin, pts, sp, done, count) {
    const s = scanDrone(path, zoom, b, win, sp), d = { x: s.fl[0], y: s.fl[1] + Math.sin(b * 2.2) * s.S * 0.03, z: s.fl[2], S: s.S, u: 1, spin };
    if (drone(i, p, d)) return;
    if (i === SHADOW) return shadow(p, s.gr[0], s.gr[1], s.gr[2], s.S, 0.4, TILT);
    if (i === SPOT) {
      const w = path.bh * Lp() * zoom * 0.92, on = clamp((b - win[0] + 0.3) / 0.3) * (1 - clamp((b - win[1]) / 0.3));
      if (on <= 0) return hide(p);
      return onFloor(p, s.u, s.v, zoom, TILT, w, w, w * 0.2, C.lime, 0.13 * on);
    }
    const k = i - 1;
    if (k < 0 || k >= count) return hide(p);
    const [u, v] = pts[k], T = win[0] + path.T[k] * (win[1] - win[0]);
    tile(p, u, v, zoom, TILT, sp, C.slate);
    captured(p, b, T, TILT);
    const w = hit(b, done + (v + 0.7) * 0.5, 3.5);
    p.c = mix(p.c, C.lime, w * 0.55); p.w *= 1 + 0.18 * w; p.h *= 1 + 0.18 * w;
  }
  const count4 = (b) => { const m = Math.round(clamp((b - SCAN4[0]) / (SCAN4[1] - SCAN4[0])) * 45); return (m < 10 ? FS + m : m) + ' min'; };
  const S4 = {
    name: 'narrowbody',
    beats: 7,
    blend: { dur: (i) => (i === 0 || i >= DR ? 0.9 : 0.5) },
    pose(i, b, p) { scanScene(i, b, p, PATH4, 1, SCAN4, 2 + b * 9, NP, SN, DONE4, nN); },
    type: [
      { at: 0.2, to: 6.85, fn: (b) => tag('narrowbody') + count4(b), rich: true, cls: 'tab', size: 1.15 },
    ],
    music(M) {
      M.pad(0, 'E3 B3 D4 F#4', 4, 0.28); M.sub(0, 'E2', 4, 0.2);
      M.pad(4, 'C3 G3 B3 E4', 3, 0.28); M.sub(4, 'C2', 3, 0.2);
      groove(M, 0, 4, 'E2', { hi: 'B2' }); groove(M, 4, 7, 'C2', { hi: 'G2' });
      const ts = PATH4.T.map((t) => SCAN4[0] + t * (SCAN4[1] - SCAN4[0])).sort((a, b) => a - b);
      ts.forEach((t, n) => { if (n % 5 === 0) M.shutter(t, 0.08, ((n % 7) / 6 - 0.5) * 0.8); });
      PATH4.turns.forEach((f, n) => M.marimba(SCAN4[0] + f * (SCAN4[1] - SCAN4[0]), penta(n + 5, 4), 0.14, (n % 2 ? -0.5 : 0.5)));
      M.bell(DONE4, 'B5', 0.24); M.bell(DONE4, 'E6', 0.16, 0.3); M.boom(DONE4, 0.2); M.splash(DONE4, 0.1);
      M.ep(DONE4 + 0.1, 'G5', 0.14, -0.3);
    },
  };

  // =========================================================== 5 · a widebody in 3 hours
  const SCAN5 = [0.9, 3.9], DONE5 = 4.15;
  const count5 = (b) => {
    if (b >= DONE5) return '3 hours';
    const m = Math.round(clamp((b - SCAN5[0]) / (SCAN5[1] - SCAN5[0])) * 180);
    return (m < 10 ? FS + FS + m : m < 100 ? FS + m : m) + ' min';
  };
  const S5 = {
    name: 'widebody',
    beats: 5,
    blend: {
      start: (i) => (i >= 1 && i <= nW ? (WP[i - 1][1] + 0.7) * 0.2 : 0),
      dur: (i) => (i >= 1 && i <= nW ? 0.8 : 0.8),
      ease: E.glide,
      fresh: (i) => i > nN && i <= nW,
    },
    pose(i, b, p) { scanScene(i, b, p, PATH5, zW(), SCAN5, 2 + (7 + b) * 9, WP, SW, DONE5, nW); },
    type: [
      { at: 0.1, to: 4.85, fn: (b) => tag('widebody') + count5(b), rich: true, cls: 'tab', size: 1.15 },
    ],
    music(M) {
      M.pad(0, 'G2 D3 B3 F#4', 3, 0.28); M.sub(0, 'G1', 3, 0.2);
      M.pad(3, 'D3 A3 E4 F#4', 2, 0.28); M.sub(3, 'D2', 2, 0.2);
      M.whoosh(0, 0.9, 0.05, 400, 2000);
      groove(M, 0, 3, 'G2', { hi: 'D3' }); groove(M, 3, 5, 'D2', { hi: 'A2' });
      const ts = PATH5.T.map((t) => SCAN5[0] + t * (SCAN5[1] - SCAN5[0])).sort((a, b) => a - b);
      ts.forEach((t, n) => { if (n % 6 === 0) M.shutter(t, 0.08, ((n % 7) / 6 - 0.5) * 0.8); });
      PATH5.turns.forEach((f, n) => M.marimba(SCAN5[0] + f * (SCAN5[1] - SCAN5[0]), penta(n + 7, 4), 0.14, (n % 2 ? -0.5 : 0.5)));
      M.bell(DONE5, 'D6', 0.24); M.bell(DONE5, 'A5', 0.16, -0.3); M.boom(DONE5, 0.24); M.splash(DONE5, 0.1);
      M.ep(DONE5 + 0.1, 'F#5', 0.14, 0.3);
    },
  };

  // =========================================================== 6 · 10x faster
  // The photos clear. By hand: ten blocks of time, one after another. Mainblades: one.
  // The drone folds up and lands as that one lime block.
  const rows6 = perLayout(() => {
    const bs = Math.min((G.W * 0.8) / 11.2, G.R * 0.26), st = bs * 1.12;
    return { bs, st, x0: -4.5 * st, ya: -bs * 0.85, yb: bs * 1.15 };
  });
  const LAND6 = 0.9, TA6 = (k) => 1.0 + k * 0.14, TEN6 = 2.6;
  const labelY6 = (y) => () => (G.cy + y() - rows6().bs * 0.5 - G.F * 0.38) / G.H;
  const S6 = {
    name: '10x',
    beats: 5,
    blend: { start: (i) => (i >= 1 && i <= nW ? (1 - (WP[i - 1][1] + 0.7) / 1.4) * 0.3 : 0), dur: (i) => (i === 0 || i >= DR ? 0.9 : 0.4) },
    pose(i, b, p) {
      const R = rows6(), bs = R.bs;
      if (i === 0 || i >= DR) {
        const fl = floor(HOVER[0], HOVER[1], zW(), TILT, HS()), S0 = PATH5.bh * Lp() * zW() * 1.2;
        const m = E.inOutCubic(clamp(b / LAND6)), sq = BJ.wobble(b, LAND6, 2.2, 5) * 0.14;
        const d = { x: lerp(fl[0], R.x0, m), y: lerp(fl[1], R.yb, m), z: fl[2] * (1 - m), S: lerp(S0, bs / 0.34, m), u: 1 - E.inOutCubic(clamp((b - 0.1) / 0.7)), spin: 2 + (12 + b) * 9 * (1 - m * 0.7) };
        drone(i, p, d);
        if (i === 0) { p.w *= 1 + sq; p.h *= 1 - sq; p.r = lerp(p.r, bs * 0.26, m); }
        return;
      }
      const k = i - 1;
      if (k < 0 || k > 9) return hide(p);
      const g = E.outBack(clamp((b - TA6(k)) / 0.3));
      if (g <= 0) return hide(p);
      leaf(p, R.x0 + k * R.st, R.ya, bs * g, bs * g, bs * 0.26 * g, C.grey);
      p.o = clamp(g * 2);
      const w = hit(b, TEN6 + k * 0.03, 3);
      p.c = mix(p.c, C.steel, w * 0.5);
    },
    type: [
      { at: 0.3, to: 4.85, text: 'by hand', cls: 'label', size: 0.52, align: 'left', x: () => rows6().x0 - rows6().bs / 2, y: labelY6(() => rows6().ya) },
      { at: 0.5, to: 4.85, text: 'mainblades', cls: 'label', size: 0.52, align: 'left', color: '#beee66', x: () => rows6().x0 - rows6().bs / 2, y: labelY6(() => rows6().yb) },
      { at: TEN6 - 0.1, to: 4.85, text: '10x faster.', size: 1.4, pop: 0.6 },
    ],
    music(M) {
      M.pad(0, 'A2 E3 G3 C4', TEN6, 0.26); M.sub(0, 'A1', TEN6, 0.2);
      M.whoosh(0, 0.8, 0.05, 2200, 400);
      M.drop(LAND6 - 0.05, 'B5', 0.22); M.bell(LAND6, 'E6', 0.2); M.kick(LAND6, 0.34);
      for (let k = 0; k < 10; k++) { M.tick(TA6(k), 0.06, (k / 9 - 0.5) * 0.8); M.marimba(TA6(k), k % 2 ? 'E4' : 'D4', 0.1, (k / 9 - 0.5) * 0.8); }
      M.whoosh(TA6(9), TEN6 - TA6(9), 0.05, 500, 3000);
      M.boom(TEN6, 0.36); M.kick(TEN6, 0.46); M.splash(TEN6 - 0.03, 0.16); M.clap(TEN6, 0.2);
      M.pad(TEN6, 'E3 B3 D4 G4 B4', 5 - TEN6 + 0.5, 0.32); M.sub(TEN6, 'E2', 5 - TEN6 + 0.5, 0.24);
      M.bell(TEN6, 'B5', 0.2); M.bell(TEN6 + 0.2, 'E6', 0.14, 0.3); M.ep(TEN6, 'G5', 0.18, -0.3);
      groove(M, TEN6 + 0.4, 5, 'E2', { k: 0.26, hi: 'B2' });
    },
  };

  // =========================================================== 7 · AI spots the damage; your inspector signs it off
  // Every photo on one sheet. A lime scan line reads them; three light up. They come forward as
  // cards, and one by one they're signed off.
  const NG = 48;
  const grid7 = perLayout(() => {
    const cols = G.portrait ? 6 : 12, rows = NG / cols, cell = Math.min((G.W * 0.86) / cols, (G.H * 0.44) / rows, G.R * 0.32), pos = [], diag = [];
    for (let j = 0; j < NG; j++) { const r = Math.floor(j / cols), c = j % cols; pos.push([(c - (cols - 1) / 2) * cell, (r - (rows - 1) / 2) * cell]); diag.push(r + c); }
    const flags = G.portrait ? [2 * cols + 1, 4 * cols + 4, 6 * cols + 2] : [cols + 2, 2 * cols + 7, 10];
    return { cols, rows, cell, pos, diag, flags, h: rows * cell, w: cols * cell };
  });
  const rnd7 = (function () { const r = BJ.rng(7), a = []; for (let k = 0; k < NG; k++) a.push(r()); return a; })();
  const SCAN7 = [0.7, 2.6], OUT7 = 2.9, CARD7 = 3.1, CHECK7 = (n) => 4.3 + n * 0.35;
  const cs7 = () => Math.min(G.W * 0.25, G.R * 0.75);
  const card7 = (n) => [(n - 1) * cs7() * 1.2, -cs7() * 0.12];
  const lineY7 = (b) => { const g = grid7(); return lerp(-g.h / 2 - g.cell * 0.3, g.h / 2 + g.cell * 0.3, E.inOutSine(clamp((b - SCAN7[0]) / (SCAN7[1] - SCAN7[0])))); };
  const found7 = (n) => { const g = grid7(), y = g.pos[g.flags[n]][1]; return SCAN7[0] + (SCAN7[1] - SCAN7[0]) * (Math.acos(1 - 2 * clamp((y + g.h / 2 + g.cell * 0.3) / (g.h + g.cell * 0.6))) / PI); };
  const LABELS7 = ['lightning strike', 'dent', 'paint damage'];
  const grow7 = (k, b) => E.outBack(clamp((b - 0.05 - grid7().diag[k] * 0.025) / 0.4));
  function photo7(n, b, p) { // flagged photo n: in the grid, then as a card
    const g = grid7(), j = g.flags[n], e = E.inOutCubic(clamp((b - CARD7 - n * 0.1) / 0.8)), c = card7(n), cs = cs7(), fd = found7(n);
    const d = lerp(g.cell * 0.86, cs, e), f = hit(b, fd, 2.5);
    leaf(p, lerp(g.pos[j][0], c[0], e), lerp(g.pos[j][1], c[1], e), d * (1 + 0.12 * f), d * (1 + 0.12 * f), d * 0.2, C.panel);
    const on = clamp((b - fd) / 0.2);
    p.c = mix(mix(C.panel, C.slate, rnd7[j] * 0.8), mix(C.lime, C.panel, lerp(0.15, 0.72, e)), on);
    return { x: p.x, y: p.y, d: p.w, on, e };
  }
  const S7 = {
    name: 'review',
    beats: 7,
    blend: { start: (i) => (i >= 1 && i <= 10 ? (i - 1) * 0.03 : 0), dur: (i) => (i === 0 ? 0.7 : 0.6) },
    pose(i, b, p) {
      const g = grid7();
      if (i === 0) { // the lime block becomes the scan line
        const s = E.inOutCubic(clamp((b - 0.1) / 0.6)), end = E.inOutCubic(clamp((b - SCAN7[1]) / 0.4));
        rect(p, 0, lineY7(b), lerp(g.cell * 0.9, g.w + g.cell * 0.4, s) * (1 - end), lerp(g.cell * 0.9, g.cell * 0.06, s), g.cell * 0.2, C.lime);
        p.lf = 1 - s;
        if (end >= 1) hide(p);
        return;
      }
      const k = i - 1, fl = g.flags.indexOf(k);
      if (i >= 146 && i <= 148) { // the damage, on each flagged photo
        const n = i - 146, q = photo7(n, b, {}), gg = E.outBack(clamp((b - found7(n)) / 0.3));
        if (gg <= 0) return hide(p);
        const d = q.d;
        if (n === 0) circle(p, q.x + d * 0.12, q.y - d * 0.08, d * 0.22 * gg, C.deep);
        else if (n === 1) { rect(p, q.x - d * 0.06, q.y + d * 0.04, d * 0.4 * gg, d * 0.24 * gg, d * 0.12, C.deep); p.rot = -0.3; }
        else { leaf(p, q.x, q.y + d * 0.1, d * 0.46 * gg, d * 0.16 * gg, d * 0.08, C.deep); p.rot = 0.12; }
        return;
      }
      if (i >= DR && i < DR + 6) { // lime check marks as each card is signed off
        const n = Math.floor((i - DR) / 2), part = (i - DR) % 2, c = card7(n), cs = cs7(), t = b - CHECK7(n);
        const cx = c[0] + cs * 0.3, cy = c[1] - cs * 0.3, s = cs * 0.14;
        const P = [[-0.5, 0], [-0.1, 0.42], [0.62, -0.46]].map(([x, y]) => [cx + x * s, cy + y * s]);
        const gg = part === 0 ? E.outCubic(clamp(t / 0.12)) : E.outCubic(clamp((t - 0.1) / 0.18));
        if (gg <= 0) return hide(p);
        const a = part === 0 ? P[0] : P[1], e = part === 0 ? P[1] : P[2];
        seg(p, a[0], a[1], lerp(a[0], e[0], gg), lerp(a[1], e[1], gg), cs * 0.045, C.lime);
        return;
      }
      if (k < 0 || k >= NG) return hide(p);
      const gp = grow7(k, b);
      if (fl >= 0) { photo7(fl, b, p); p.w *= gp; p.h *= gp; p.o = clamp(gp * 2); return; }
      if (gp <= 0) return hide(p);
      const out = E.inOutCubic(clamp((b - OUT7 - rnd7[k] * 0.4) / 0.6)), d = g.cell * 0.86 * gp * (1 - out * 0.5);
      const glow = b < SCAN7[1] + 0.3 ? Math.exp(-Math.pow((g.pos[k][1] - lineY7(b)) / (g.cell * 0.7), 2)) : 0;
      leaf(p, g.pos[k][0], g.pos[k][1], d, d, d * 0.2, mix(mix(C.panel, C.slate, rnd7[k] * 0.8), C.steel, glow * 0.45));
      p.o = clamp(gp * 2) * (1 - out);
    },
    type: [
      { at: 0.5, to: 2.9, text: 'AI spots the damage.', pop: 0.85 },
      { at: 3.4, to: 6.85, text: 'your inspector | signs it off.', pop: 0.85 },
      ...LABELS7.map((text, n) => ({ at: 3.7 + n * 0.1, to: 6.85, text, cls: 'label', size: 0.46, x: () => card7(n)[0], y: () => (G.cy + card7(n)[1] + cs7() / 2 + G.F * 0.42) / G.H })),
    ],
    music(M) {
      M.pad(0, 'C3 G3 B3 E4', 3, 0.28); M.sub(0, 'C2', 3, 0.2);
      for (let d = 0; d < 10; d++) M.marimba(0.1 + d * 0.035, penta(d + 4, 4), 0.07, (d / 9 - 0.5) * 0.9);
      M.whoosh(SCAN7[0], SCAN7[1] - SCAN7[0], 0.05, 600, 3000);
      groove(M, 0, 3, 'C2', { hi: 'G2', k: 0.26 });
      [0, 1, 2].forEach((n) => { const t = found7(n); M.blip(t, penta(n * 2 + 11, 4), 0.2, (n - 1) * 0.6); M.beep(t + 0.08, penta(n * 2 + 11, 4), 0.06); });
      M.pad(3, 'G2 D3 B3 F#4', 4, 0.28); M.sub(3, 'G1', 4, 0.2);
      M.whoosh(CARD7 - 0.2, 0.8, 0.05, 500, 2400);
      groove(M, 3, 7, 'G2', { hi: 'D3', k: 0.26 });
      M.ep(CARD7 + 0.6, 'D5', 0.14); M.ep(CARD7 + 0.6, 'G5', 0.12, 0.3);
      [0, 1, 2].forEach((n) => { M.marimba(CHECK7(n) + 0.05, penta(n + 8, 4), 0.16, (n - 1) * 0.6); M.beep(CHECK7(n) + 0.1, penta(n + 8, 4), 0.05, (n - 1) * 0.6); });
      M.bell(CHECK7(2) + 0.4, 'B5', 0.14);
      M.whoosh(6.0, 1.0, 0.05, 300, 2600);
    },
  };

  // =========================================================== 8 · aircraft inspection, automated
  // The drone reassembles, its blades stop in a cross, and it becomes the Mainblades mark.
  // Then the centre of the mark slides down and stretches into the button.
  const logoW = () => Math.min(G.W * 0.74, G.R * 3.3, 820), LOGO_AR = 561.09 / 150.74;
  const mk = (vx, vy) => { const k = logoW() / 561.09; return [(vx - 280.545) * k, (vy - 75.37) * k]; };
  const CTA_Y = () => (G.portrait ? 0.6 : 0.64);
  const MARK8 = [2.6, 3.8], LOGO8 = 3.7, MOVE8 = [5.0, 6.1], BTN8 = [6.1, 6.9], SHOW8 = 6.9, BEAT8 = [1, 1.5, 2, 2.5];
  const W8 = 9;
  const spin8 = (b) => { const a = MARK8[0], c = MARK8[1]; if (b < a) return W8 * b; if (b < c) { const x = b - a; return W8 * a + W8 * (x - (x * x) / (2 * (c - a))); } return W8 * (a + (c - a) / 2); };
  // the four blades end up as the four arms of the mark (top, right, bottom, left), 28.76 x 61 in logo units
  const BLADE = [[75.37, 31.5, 0], [119.2, 75.37, PI / 2], [75.37, 119.2, 0], [31.5, 75.37, PI / 2]];
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
  const S8 = {
    name: 'finale',
    beats: 9,
    blend: { dur: (i) => (i === 0 || i >= DR ? 0.8 : 0.5) },
    pose(i, b, p) {
      if (i !== 0 && i < DR) return hide(p);
      const k = logoW() / 561.09, core = mk(75.37, 75.37), cw = 28.76 * k;
      const m = E.inOutCubic(clamp((b - MARK8[0]) / (MARK8[1] - MARK8[0])));
      const S = lerp(Math.min(G.R * 0.78, G.W * 0.5), cw / 0.34, m), beat = maxHit(b, BEAT8, 5);
      const d = { x: lerp(0, core[0], m), y: lerp(-G.R * 0.05 + Math.sin(b * 2) * S * 0.025, core[1], m), z: 0, S, u: E.outBack(clamp((b - 0.1) / 0.7)), spin: spin8(b) };
      if (i === 0) {
        drone(0, p, d);
        const s = 1 + 0.12 * beat * (1 - m);
        p.w *= s; p.h *= s; p.r = lerp(p.r * s, 11.89 * k * 0.55, m);
        const est = { x: 0, y: G.H * CTA_Y() - G.cy, w: Math.max(260, G.F * 4), h: 52 }, bt = button() || est;
        const mv = E.inOutCubic(clamp((b - MOVE8[0]) / (MOVE8[1] - MOVE8[0]))), st = E.inOutCubic(clamp((b - BTN8[0]) / (BTN8[1] - BTN8[0])));
        if (mv > 0) {
          const hop = Math.sin(PI * mv) * G.R * 0.12;
          p.x = lerp(core[0], bt.x, mv); p.y = lerp(core[1], bt.y, mv) - hop;
          p.w = lerp(cw, bt.w, st); p.h = lerp(cw, bt.h, st); p.r = lerp(11.89 * k * 0.55, 16, st);
        }
        if (b > SHOW8 + 1.2) hide(p);
        return;
      }
      const j = i - DR;
      if (j >= 8) { // blades → the arms of the mark
        const n = j - 8, B = BLADE[(n + 0) % 4], t = mk(B[0], B[1]);
        drone(i, p, d);
        if (m > 0) {
          const bw = cw, bl = 61 * k * 0.97, rot0 = p.rot, rt = B[2] + Math.round((rot0 - B[2]) / PI) * PI;
          p.x = lerp(p.x, t[0], m); p.y = lerp(p.y, t[1], m);
          p.w = lerp(p.w, bw, m); p.h = lerp(p.h, bl, m); p.r = lerp(p.r, 6 * k, m); p.rot = lerp(rot0, rt, m); p.lf = m;
          p.o = lerp(1, 0.5, m);
        }
        p.o *= 1 - E.inOutSine(clamp((b - LOGO8 - 0.4) / 0.6));
        if (b > LOGO8 + 1.1) hide(p);
        return;
      }
      drone(i, p, d); // arms and rotor discs fold into the centre
      p.o *= 1 - m;
      if (m >= 1) hide(p);
    },
    type: [
      { at: 0.4, to: 2.6, text: 'aircraft inspection, | automated.', stagger: 0.12, pop: 0.85 },
      { at: LOGO8, to: Infinity, html: '<img src="img/logo.svg" alt="Mainblades">', cls: 'logo', y: () => G.cy / G.H, size: () => logoW() / LOGO_AR, fade: 0.9 },
      {
        at: BTN8[0] - 0.2, show: SHOW8, to: Infinity, cls: 'link', y: CTA_Y, fade: 0.8,
        html: '<a href="https://www.mainblades.com" target="_blank" rel="noopener">see it fly at mainblades.com</a>' +
          '<small>45 minutes per narrowbody &middot; AI damage detection &middot; trusted by the world’s largest MROs</small>',
      },
    ],
    music(M) {
      M.pad(0, 'C3 G3 B3 E4', 1, 0.28); M.sub(0, 'C2', 1, 0.2);
      M.kick(0, 0.4); M.splash(0, 0.1);
      M.rotor(0.1, MARK8[1] - 0.1, 0.13, 0.6, 1.0);
      M.ep(0.4, 'B5', 0.16); M.ep(0.7, 'E6', 0.12); M.ep(1.1, 'D6', 0.12);
      M.pad(1, 'D3 A3 E4 F#4', LOGO8 - 1, 0.28); M.sub(1, 'D2', LOGO8 - 1, 0.22);
      groove(M, 0.5, 2.5, 'D2', { hi: 'A2', k: 0.28 });
      BEAT8.forEach((at, n) => M.thump(at, n % 2 ? 0.26 : 0.4));
      M.whoosh(MARK8[0] - 0.4, MARK8[1] - MARK8[0] + 0.3, 0.06, 2400, 500);
      M.kick(LOGO8, 0.46); M.boom(LOGO8, 0.32); M.splash(LOGO8 - 0.03, 0.12);
      M.bell(LOGO8, 'E5', 0.22); M.bell(LOGO8 + 0.25, 'B5', 0.16, 0.3); M.bell(LOGO8 + 0.5, 'E6', 0.14, -0.3);
      M.pad(LOGO8, 'E3 B3 D4 F#4 G4', 9 - LOGO8 + 1, 0.32); M.sub(LOGO8, 'E2', 9 - LOGO8 + 1, 0.24);
      M.whoosh(MOVE8[0], 1.1, 0.04, 400, 1800);
      M.drop(MOVE8[1] - 0.05, 'B5', 0.16);
      M.marimba(SHOW8, 'B5', 0.14); M.marimba(SHOW8 + 0.2, 'E6', 0.12);
      M.ep(8.2, 'G5', 0.1); M.ep(8.22, 'D5', 0.08);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8];
  BJ.plane = { nN, nW };
})();
