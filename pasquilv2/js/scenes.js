/* Pasquil — "Informatiebeveiliging is niet gewoon." The long version: a one-minute film cut to HELEMAAL.
   Every shape is one div whose size, corner radius, colour and matrix3d are set every frame;
   the line illustrations and the logo come straight from pasquil.nl.
   The track (120.05 BPM) sets the cuts: a "supergeheim" password over the intro, a tour of the
   Pasquil office on the groove (every cut on a kick), a firewall with one hole while the hats
   drop out, the services landing on the second groove, the PDCA approach step by step over the
   half-time section, the risk matrix going from red to green on the riser, a crowd of identical
   dots over the breakdown, and the shouted "PASQUIL" slams the logo in.
   Every scene defines:
     pose(i, b, p)  shape i at local beat b: p.x, p.y (from G.cx/G.cy), p.w, p.h, p.r,
                    p.tip, p.rot, p.rx, p.ry, p.z, p.o, p.c (and p.sym for pills)
     blend          how shapes travel from the previous scene
     type           the headlines, timed in beats
     art            the illustrations, timed in beats
     fx(b)          camera shake and flash */
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

  // ------------------------------------------------------------ the track
  // HELEMAAL.wav, 120.05 BPM. The music starts 0.255 s in: musical beat m = 0 there, which is
  // film beat PH. Scene 1 lasts 8 + PH beats, so in every later scene local beat = m − m0.
  const PH = BJ.sec(0.255);
  // Kick drum onsets, measured from the WAV, in musical beats.
  const KM = [0.5, 1.5, 2, 2.25, 2.5, 3, 3.25, 4, 6, 6.25];
  for (const m0 of [8, 16, 24, 48]) for (const o of [0, 0.5, 1.25, 2.5, 3.75, 6, 6.25]) KM.push(m0 + o);
  KM.push(32, 32.5, 33.25, 34.5, 35, 35.5, 38, 38.25, 41.25, 43.25, 43.75, 46, 46.25, // the firewall (hats drop out)
    56, 56.5, 57.25, 58.5, 58.75, 59.75, 62, 62.25, 64.5, 64.75, 65.25, 65.5, 66.25, 66.5, 66.75, 67.25, 70, 82.75, 83.25,
    96.25, 96.75, 97.25, 98, 98.5, 99, 99.5);
  for (let m = 72; m <= 94; m += 2) KM.push(m); // the half-time melodic section
  KM.sort((a, b) => a - b);
  const KICKS = KM.map((m) => m + PH);
  const kick = (B, decay = 7) => { // B: absolute film beat
    let v = 0;
    for (const k of KICKS) { if (k > B) break; v = Math.max(v, hit(B, k, decay)); }
    return v;
  };
  const kickAt = (m0) => (b, decay) => kick(b + m0 + PH, decay); // for a scene that starts on musical beat m0
  const SHOUT = BJ.sec(52.729), SHOUT2 = BJ.sec(53.059), END = BJ.sec(60) + 0.1; // "PA" … "QUIL"
  const img = (n) => 'img/art/' + n + '.png';
  const cover = () => 2.3 * Math.hypot(G.W / 2, G.H * 0.6);
  const heat = (s) => (s < 0.5 ? mix(C.green, C.yellow, s / 0.5) : mix(C.yellow, C.red, (s - 0.5) / 0.5));

  // =========================================================== 1 · the supergeheime password (intro, 0–4 s)
  // Eleven bullets are typed into a field on the hi-hats, the yellow caret racing ahead.
  // On the big kick the bullets flip away and reveal what everyone already guessed.
  const PW = 'Paswoord123', NPW = PW.length;
  const field = perLayout(() => {
    const FW = Math.min(G.W * 0.84, G.R * 3.1), FH = G.R * 0.46;
    return { FW, FH, bw: Math.max(2, G.R * 0.024), ds: FH * 0.3, d: FH * 0.2 };
  });
  const JIT1 = (function () { const r = BJ.rng(11), a = []; for (let k = 0; k < NPW; k++) a.push(r()); return a; })();
  const TK = (k) => PH + 0.5 + k * 0.25 + (JIT1[k] - 0.5) * 0.05, REV1 = PH + 4, NO1 = PH + 6;
  const dotX = (k) => (k - (NPW - 1) / 2) * field().ds;
  const pwBox = measurer('#type .line.pw');
  const blink = (b) => clamp(0.5 + 3 * Math.cos(TAU * b * 0.6));
  function caret(p, b) {
    const F = field();
    let u = 0;
    for (let k = 0; k < NPW; k++) u += E.outCubic(clamp((b - TK(k)) / 0.1));
    let x = dotX(0) - F.ds * 0.62 + u * F.ds;
    const bx = pwBox(), e = E.inOutCubic(clamp((b - REV1 - 0.1) / 0.4));
    if (bx && e > 0) x = lerp(x, bx.w / 2 + F.ds * 0.3, e);
    const typing = b > TK(0) - 0.25 && b < TK(NPW - 1) + 0.5;
    pill(p, x, 0, F.FH * 0.56, F.FH * 0.08, 0, C.yellow);
    p.o = typing ? 1 : blink(b);
  }
  const S1 = {
    name: 'password',
    beats: 8 + PH,
    introBeat: 0,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const F = field(), red = E.inOutSine(clamp((b - REV1 + 0.02) / 0.15));
      const bump = hit(b, REV1, 5) * 0.06 + hit(b, NO1, 6) * 0.03;
      if (i === 0) return caret(p, b);
      if (i === 1) return rect(p, 0, 0, (F.FW + 2 * F.bw) * (1 + bump), (F.FH + 2 * F.bw) * (1 + bump), F.FH * 0.3 + F.bw, mix(C.navy, C.red, red));
      if (i === 2) return rect(p, 0, 0, F.FW * (1 + bump), F.FH * (1 + bump), F.FH * 0.3, C.white);
      const k = i - 3;
      if (k < 0 || k >= NPW) return hide(p);
      const g = E.snap(clamp((b - TK(k)) / 0.3));
      if (g <= 0) return hide(p);
      circle(p, dotX(k), 0, F.d * g * (1 + 0.25 * kick(b, 8) * (b < REV1 ? 1 : 0)), C.navy);
      const e = E.inOutCubic(clamp((b - REV1 + 0.02 - k * 0.025) / 0.25));
      if (e >= 1) return hide(p);
      p.rx = e * PI / 2; p.o = 1 - e;
    },
    // the field shakes its head: no, no
    fx: (b) => ({ x: (BJ.wobble(b, NO1, 3.2, 3.5) * 0.09 + BJ.wobble(b, REV1, 4, 6) * 0.025) * G.R }),
    type: [
      { at: 0.3, to: REV1 - 0.12, text: 'Ons wachtwoord? | Supergeheim.' },
      { at: REV1 + 0.02, to: 8 + PH, cut: true, text: PW, cls: 'pw', y: () => G.cy / G.H, size: () => field().FH * 0.46, stagger: 0 },
      { at: PH + 5, to: 8 + PH, cut: true, text: 'Oeps.', size: 1.25 },
    ],
  };

  // =========================================================== 2 · the office (first drop, 4–16 s)
  // The isometric office from the pasquil.nl homepage. Hard cuts on the kicks to everything
  // that's wrong with it, then the camera pulls back to show the whole thing.
  const OFFICE_AR = 2160 / 3840;
  const SHOTS2 = [ // [local beat, focus x, focus y (fractions of the picture), share of the picture in view, caption]
    [0, 0.272, 0.43, 0.3, 'Staat ook op de flip-over.'],
    [2.5, 0.29, 0.215, 0.3, 'Wie kijkt er mee?'], // "They're watching" and the router in the hole in the wall
    [3.75, 0.605, 0.5, 0.32, 'De kat is sysadmin.'],
    [6, 0.165, 0.63, 0.27, 'Het aquarium is online.'], // with a phone in it
    [8, 0.385, 0.37, 0.24, 'De sleutel zit er gewoon op.'], // the key cabinet
    [10.5, 0.305, 0.695, 0.2, 'Gratis software!'], // FREE.EXE
    [11.75, 0.515, 0.6, 0.2, 'Gevonden USB-stick? | Even proberen.'],
    [14, 0.52, 0.48, 0.2, 'Virus? | Hij doet het nog.'], // the skull on the monitor
    [16, 0.235, 0.79, 0.25, 'Vertrouwelijk? | Bij het oud papier.'], // the bin
    [18.5, 0.4, 0.84, 0.24, 'Oude schijven? | Bij het grof vuil.'], // hard disk, floppy and bag on the floor
  ];
  const PULL2 = [19.75, 21.0], kick2 = kickAt(8);
  const shotW = (k, b) => (Math.sqrt(G.W * G.H) * 1.25) / SHOTS2[k][3] * (1 + 0.025 * (b - SHOTS2[k][0]));
  const fullShot = () => (G.portrait ? { w: G.H * 1.12, x: 0.38, y: 0.5 } : { w: Math.min(G.W * 0.97, (G.H * 0.9) / OFFICE_AR), x: 0.5, y: 0.5 });
  function officeView(b) {
    let k = 0;
    for (let j = 0; j < SHOTS2.length; j++) if (b >= SHOTS2[j][0]) k = j;
    const e = E.inOutCubic(clamp((b - PULL2[0]) / (PULL2[1] - PULL2[0])));
    const bump = (1 + 0.07 * hit(b, SHOTS2[k][0], 6)) * (1 + 0.025 * kick2(b, 7));
    let w = shotW(k, e > 0 ? PULL2[0] : b), x = SHOTS2[k][1], y = SHOTS2[k][2];
    if (e > 0) {
      const F = fullShot();
      w = Math.exp(lerp(Math.log(w), Math.log(F.w), e)) * (1 + 0.012 * Math.max(0, b - PULL2[1]));
      x = lerp(x, F.x, e); y = lerp(y, F.y, e);
    }
    return { w: w * bump, x, y, sy: lerp(0.44, 0.47, e) };
  }
  const tagSize = () => G.F * (G.portrait ? 0.7 : 0.52);
  const tagY = () => (G.portrait ? 0.84 : 0.86);
  const tag = (at, to, text, extra) => Object.assign({ at, to, text, cls: 'tag', y: tagY, size: tagSize, stagger: 0.07, cut: true }, extra);
  const S2 = {
    name: 'office',
    beats: 24,
    blend: { dur: 0.01 },
    bg: () => C.office,
    dark: () => true,
    pose(i, b, p) { hide(p); },
    art: [{
      at: 0, to: 24, src: 'img/art/office.jpg', layer: 'back', cls: 'office',
      label: 'Het kantoor van Pasquil: Paswoord123 op de flip-over, een kat als sysadmin, een sleutel in het slot, een gevonden USB-stick en een prullenbak vol vertrouwelijke papieren',
      place(b) {
        const v = officeView(b), h = v.w * OFFICE_AR;
        return { x: (0.5 - v.x) * v.w, y: (0.5 - v.y) * h + G.H * v.sy - G.cy, w: v.w, h };
      },
    }],
    type: [
      ...SHOTS2.map((s, k) => (k < SHOTS2.length - 1 ? tag(s[0] + 0.06, SHOTS2[k + 1][0] - 0.06, s[4]) : tag(s[0] + 0.06, 21.3, s[4], { cut: false }))),
      tag(22, 24, 'Herkenbaar?', { size: () => G.F * (G.portrait ? 1.0 : 0.8) }),
    ],
  };

  // =========================================================== 3 · the firewall (16–24 s, the hats drop out)
  // A wall of bricks slams down row by row, on the kicks. One brick is missing. A hacker peeks
  // over the top, looks around, and finds the hole. The magnifier finds it too; he ducks.
  // Something yellow fills the hole… and on the kick it bursts through, wall, hacker and all.
  const B0 = 20, EYE3 = 3, BACK3 = 5, ROWS3 = [0.02, 0.5, 1.25, 2.5, 3.0, 3.5], kick3 = kickAt(32);
  const wall = perLayout(() => {
    const cols = 7, rows = 6, WW = Math.min(G.W * 0.88, G.R * 3.4), BW = WW / cols, BH = BW * 0.46, gp = BW * 0.075;
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
        bricks.push({ x, y, w: w - gp, h: BH - gp, lt: ROWS3[r] + (x / WW) * 0.1, tint: rr(), spin: rr() - 0.5 });
      }
    }
    return { WW, BW, BH, gp, bricks, hx: 0, hy: 0.5 * BH, top: -3 * BH, floorY: 3 * BH + gp * 0.5, HW: BW * 1.3 };
  });
  const PEEK3 = 6.0, DUCK3 = 9.0, SLIDE3 = 9.25, LENS3 = 11.25, SPOT3 = 11.5, BALL3 = 11.75, BURST3 = 14.0, COVER3 = 15.75;
  const EYES3 = [[-0.078, -0.212], [0.069, -0.212]]; // in hacker.png, as fractions of its width, from the centre
  // where the hacker's eyes are (behind the wall, visible over the top or through the hole)
  function hacker3(b) {
    const W = wall();
    if (b < PEEK3 - 0.02 || b > BURST3) return null;
    const peekY = W.top - W.BW * 0.13, lowY = W.top + W.HW * 0.55;
    if (b < SLIDE3) {
      const up = E.outBack(clamp((b - PEEK3) / 0.35)), down = E.inCubic(clamp((b - DUCK3) / 0.2));
      const look = Math.sin((b - PEEK3 - 0.5) * PI * 0.5) * clamp((b - PEEK3 - 0.4) / 0.4);
      return { x: W.BW * 1.8 + look * W.BW * 0.05, y: lerp(lerp(lowY, peekY, up), lowY, down), look, tilt: look * 0.1 };
    }
    const e = E.outCubic(clamp((b - SLIDE3) / 0.35)), dn = E.inCubic(clamp((b - SPOT3 - 0.05) / 0.2)); // spotted: gone
    const scared = clamp((b - LENS3 - 0.05) / 0.15);
    const look = lerp(Math.sin((b - SLIDE3 - 0.4) * PI * 0.5) * 0.5 * clamp((b - SLIDE3 - 0.3) / 0.3), 0.8, scared);
    return { x: lerp(W.BW * 0.95, W.hx, e) - dn * W.BW * 1.1, y: W.hy + dn * W.BH * 0.3, look, tilt: 0, scared };
  }
  const eyeVisible = (W, x, y, d) => y < W.top - d / 2 || (Math.abs(x - W.hx) < (W.BW - W.gp) / 2 - d / 2 && Math.abs(y - W.hy) < (W.BH - W.gp) / 2 - d / 2);
  function lens3(b) { // the centre of the magnifier's lens
    const W = wall();
    if (b < LENS3 - 0.5 || b > BURST3 + 0.3) return null;
    const inE = E.outBack(clamp((b - (LENS3 - 0.5)) / 0.5)), aside = E.inOutCubic(clamp((b - BALL3) / 0.35));
    const out = E.inCubic(clamp((b - BURST3 + 0.3) / 0.45));
    const hx = W.hx + aside * W.BW * 1.25, hy = W.hy - aside * W.BW * 0.95;
    return { x: lerp(G.W * 0.6, hx, inE) + out * G.W * 0.6, y: lerp(G.H * 0.5, hy, inE) - out * G.H * 0.4, rot: (1 - inE) * 0.5 + aside * 0.35 + Math.sin(b * 2.5) * 0.04 };
  }
  const S3 = {
    name: 'firewall',
    beats: 16,
    blend: { dur: 0.01 },
    bg: (b) => (b < COVER3 ? C.white : C.yellow),
    dark: (b) => b >= COVER3,
    fx: (b) => {
      const a = G.R * (0.07 * hit(b, BURST3, 3.2, 0.01) + 0.012 * kick3(b, 9) * (b < BURST3 ? 1 : 0));
      return { x: a * Math.sin(b * TAU * 7.3), y: a * 0.8 * Math.cos(b * TAU * 5.9), flash: 0.35 * hit(b, BURST3, 8, 0.01) };
    },
    pose(i, b, p) {
      const W = wall();
      if (b >= COVER3) return hide(p);
      if (i === 0) { // the yellow thing in the hole
        const g = E.outBack(clamp((b - BALL3) / 0.35));
        if (g <= 0) return hide(p);
        const d0 = W.BH * 0.62 * g * (1 + 0.18 * hit(b, 12, 6) + 0.18 * hit(b, 13, 6));
        const pop = E.outBack(clamp((b - BURST3) / 0.3)), t = E.inQuart(clamp((b - BURST3) / (COVER3 - BURST3)));
        const d1 = lerp(d0, W.BW * 1.8, pop);
        circle(p, W.hx, lerp(W.hy, W.hy * 0.5, t), lerp(d1, cover(), t), C.yellow);
        return;
      }
      if (i === 1) { // the floor
        const th = G.R * 0.022, g = E.outCubic(clamp(b / 0.4)), o = 1 - clamp((b - BURST3) / 0.4);
        rect(p, 0, W.floorY, W.WW * 1.24 * g, th, th / 2, C.mist); p.o = o;
        return;
      }
      if (i === EYE3 || i === EYE3 + 1) {
        const h = hacker3(b);
        if (!h) return hide(p);
        const [ex, ey] = EYES3[i - EYE3], d = W.HW * 0.055 * (1 + 0.35 * (h.scared || 0));
        const x = h.x + ex * W.HW + h.look * W.HW * 0.03, y = h.y + (ey + 0.212) * W.HW - (h.scared || 0) * W.HW * 0.01;
        if (!eyeVisible(W, x, y, d)) return hide(p);
        return circle(p, x, y, d, C.navy);
      }
      if (i >= BACK3 && i < BACK3 + 4) { // white behind the bricks, so the hacker only shows through the hole
        if (b < PEEK3 - 0.1 || b >= BURST3) return hide(p);
        const L = -3.5 * W.BW, R = 3.5 * W.BW, T = W.top, Bm = 3 * W.BH, hw = (W.BW - W.gp) / 2, hh = (W.BH - W.gp) / 2;
        const box = [[L, T, R, W.hy - hh], [L, W.hy + hh, R, Bm], [L, W.hy - hh, W.hx - hw, W.hy + hh], [W.hx + hw, W.hy - hh, R, W.hy + hh]][i - BACK3];
        return rect(p, (box[0] + box[2]) / 2, (box[1] + box[3]) / 2, box[2] - box[0], box[3] - box[1], 0, C.white);
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
      const e = E.outCubic(clamp((b - BURST3 - dist * 0.06) / 1.0));
      if (e > 0) {
        const push = e * G.R * 1.4 / (0.6 + dist * 0.5), n = Math.hypot(dx, dy) || 1;
        p.x += (dx / n) * push; p.y += (dy / n) * push + e * e * G.R * 0.5;
        p.z += e * G.R * 2.2 / (0.8 + dist * 0.4);
        p.rot += e * k.spin * 2.4; p.rx += e * k.spin * 3;
      }
    },
    art: [
      { // the hacker, behind the wall
        at: PEEK3 - 0.05, to: BURST3, src: img('hacker'), layer: 'back', label: 'Een hacker in een hoodie',
        place(b) {
          const h = hacker3(b), W = wall();
          if (!h) return null;
          return { x: h.x + W.HW * 0.005, y: h.y + 0.212 * W.HW, w: W.HW, h: W.HW * (215 / 218), rot: h.tilt };
        },
      },
      { // … and blown away with it
        at: BURST3, to: COVER3, src: img('hacker'),
        place(b) {
          const W = wall(), t = b - BURST3, e = E.outCubic(clamp(t / 1.6));
          return { x: W.hx - W.BW * 1.1 - e * G.W * 0.3, y: W.hy + 0.212 * W.HW - Math.sin(PI * 0.8 * e) * G.H * 0.3 + t * t * G.R * 0.08,
            w: W.HW, h: W.HW * (215 / 218), s: 1 + e * 1.4, rot: -e * 4.5 };
        },
      },
      {
        at: LENS3 - 0.5, to: BURST3 + 0.3, src: img('magnifier'), label: 'Een vergrootglas',
        place(b) {
          const L = lens3(b), W = wall();
          if (!L) return null;
          const w = W.BW * 1.75, c = Math.cos(L.rot), s = Math.sin(L.rot), ox = -0.023 * w, oy = -0.397 * w;
          return { x: L.x - (ox * c - oy * s), y: L.y - (ox * s + oy * c), w, h: w * (264 / 151), rot: L.rot };
        },
      },
    ],
    type: [
      { at: 1.0, to: 5.9, text: 'Een stevige firewall. | Veilig, toch?' },
      { at: SLIDE3, to: 13.9, text: 'Eén gat is genoeg.' },
    ],
  };

  // =========================================================== 4 · what Pasquil does (24–34 s)
  // On the yellow field, six cards drop onto the kicks, each with its illustration from the
  // site. The FG auditor drives in. Every card gets its tick. On the fill the cards fly off,
  // one per hit, until only the PDCA ball is left: it rolls to the middle and takes over.
  const TILES = [
    { n: 'magnifier', label: 'Audits', L: 0.02, box: 0.72 },
    { n: 'folder', label: 'ISO 27001 | NEN 7510', L: 2.5, box: 1.7 },
    { n: 'devices', label: 'Risico­management', L: 3.75, box: 1.25 },
    { n: 'eye', label: 'Privacy & AVG', L: 6.0, box: 1.75 },
    { n: 'fg-auditor', label: 'FG-as-a-service', L: 8.0, box: 0.86 },
    { n: 'pdca-ball', label: 'Plan · Do | Check · Act', L: 10.5, box: 0.72 },
  ];
  const CHK4 = [11.75, 13, 14, 14.25, 15, 15.5], FO4 = [16.5, 17.25, 17.5, 18.25, 18.5], MID4 = [18.5, 20];
  const SH4 = 20, CD4 = 30, BD4 = 40, TK4 = 50, CAR4 = 4, PD4 = 5;
  const grid4 = perLayout(() => {
    const P = G.portrait, cols = P ? 2 : 3, rows = 6 / cols;
    const T = P ? Math.min(G.W * 0.31, G.H * 0.13) : Math.min(G.W * 0.19, G.H * 0.235);
    const sx = T * (P ? 1.42 : 1.45), sy = T * (P ? 1.62 : 1.55), y0 = -G.R * (P ? 0.02 : 0.1);
    const pos = TILES.map((_, k) => [((k % cols) - (cols - 1) / 2) * sx, (Math.floor(k / cols) - (rows - 1) / 2) * sy + y0]);
    return { T, pos, y0 };
  });
  function tile4(k, b) {
    const t = TILES[k], Gd = grid4(), [x, y] = Gd.pos[k];
    let s;
    if (k === CAR4) { // its card pops up as the car arrives
      s = { x, y, g: E.outBack(clamp((b - t.L + 0.05) / 0.4)), sq: hit(b, t.L + 0.1, 6), rot: 0 };
    } else {
      const f = clamp((b - (t.L - 0.3)) / 0.3);
      s = { x, y: y - (1 - f * f) * G.H * 0.75, g: f > 0 ? 1 : 0, sq: hit(b, t.L, 6), rot: (1 - f) * (k % 2 ? 0.3 : -0.3) };
    }
    if (k < PD4) { // off it goes, away from the middle
      const e = E.inCubic(clamp((b - FO4[k]) / 0.45)), dx = x, dy = y - Gd.y0 - Gd.T * 0.6, n = Math.hypot(dx, dy) || 1;
      if (e >= 1) s.g = 0;
      s.x += (dx / n) * e * G.H * 1.3; s.y += (dy / n) * e * G.H * 1.3; s.rot += e * (k % 2 ? 1.2 : -1.2);
    } else {
      const m = E.glide(clamp((b - MID4[0]) / (MID4[1] - MID4[0]))), W = wheel5();
      s.x = lerp(x, W.x, m); s.y = lerp(y, W.y, m); s.m = m;
    }
    return s;
  }
  const S4 = {
    name: 'services',
    beats: 20,
    blend: { dur: 0.01 },
    bg: () => C.yellow,
    dark: () => true,
    pose(i, b, p) {
      const T = grid4().T;
      if ((i >= SH4 && i < SH4 + 6) || (i >= CD4 && i < CD4 + 6)) {
        const sh = i < CD4, k = i - (sh ? SH4 : CD4), s = tile4(k, b);
        if (s.g <= 0) return hide(p);
        let w = T * (1 + 0.12 * s.sq) * s.g, h = T * (1 - 0.1 * s.sq) * s.g, r = T * 0.14, off = sh ? T * 0.06 : 0;
        if (k === PD4) { // the PDCA card grows until it fills the screen
          const gr = E.inCubic(clamp((b - MID4[0] - 0.3) / (MID4[1] - MID4[0] - 0.35))), S = Math.exp(lerp(Math.log(T), Math.log(cover()), gr));
          w = lerp(w, S, gr); h = lerp(h, S, gr); r = lerp(r, 0, gr); off *= 1 - gr;
          if (sh) p.o = 1 - gr;
        }
        rect(p, s.x + off, s.y + off + T * 0.05 * s.sq, w, h, r, sh ? C.navy : C.white);
        p.rot = s.rot * (k === PD4 ? 1 - (s.m || 0) : 1);
        return;
      }
      if (i >= BD4 && i < BD4 + 6) { // the tick badge
        const k = i - BD4, s = tile4(k, b), g = E.outBack(clamp((b - CHK4[k]) / 0.3)) * (k === PD4 ? 1 - clamp((b - MID4[0]) / 0.3) : 1);
        if (g <= 0 || s.g <= 0) return hide(p);
        return circle(p, s.x + T * 0.44, s.y - T * 0.44, T * 0.34 * g * (1 + 0.15 * hit(b, CHK4[k] + 0.3, 6)), C.green);
      }
      if (i >= TK4 && i < TK4 + 12) {
        const k = (i - TK4) >> 1, part = (i - TK4) & 1, s = tile4(k, b), t = b - CHK4[k] - 0.08, cs = T * 0.3;
        if (s.g <= 0 || (k === PD4 && b > MID4[0])) return hide(p);
        const cx = s.x + T * 0.44, cy = s.y - T * 0.44;
        const P = [[-0.25, 0.02], [-0.07, 0.2], [0.27, -0.18]].map(([x, y]) => [cx + x * cs, cy + y * cs]);
        const g = part === 0 ? E.outCubic(clamp(t / 0.1)) : E.outCubic(clamp((t - 0.08) / 0.16));
        if (g <= 0) return hide(p);
        const a = P[part], c = P[part + 1];
        return seg(p, a[0], a[1], lerp(a[0], c[0], g), lerp(a[1], c[1], g), cs * 0.16, C.white);
      }
      hide(p);
    },
    art: TILES.map((t, k) => ({
      at: 0, to: 20, src: img(t.n), label: t.label.replace(/ \| /g, ' '),
      place(b) {
        const s = tile4(k, b), T = grid4().T, box = T * t.box;
        if (k === CAR4 && b < t.L) { // the FG auditor drives in from the left, siren on
          const e = E.outCubic(clamp((b - (t.L - 1.3)) / 1.3));
          if (e <= 0) return null;
          const x = lerp(-G.W / 2 - box, s.x, e), bob = Math.abs(Math.sin(b * PI * 4)) * T * 0.03 * (1 - e);
          return { x, y: s.y - T * 0.03 - bob, w: box, rot: (1 - e) * 0.08 };
        }
        if (s.g <= 0) return null;
        if (k === PD4) { // exactly where scene 5 picks it up
          const m = s.m || 0;
          return { x: s.x, y: s.y + lerp(-T * 0.02 + T * 0.05 * s.sq, 0, m), w: lerp(box, wheel5().d, m), s: 1 + 0.06 * s.sq * (1 - m), rot: s.rot * (1 - m) };
        }
        return { x: s.x, y: s.y - T * (k === CAR4 ? 0.03 : 0.02) + T * 0.05 * s.sq, w: box, s: 1 + 0.06 * s.sq, rot: s.rot - (k === CAR4 ? hit(b, t.L, 7) * 0.06 : 0) };
      },
    })),
    type: [
      ...TILES.map((t, k) => ({
        at: t.L + 0.08, to: k < PD4 ? FO4[k] : MID4[0], cut: true, text: t.label, cls: 'label', stagger: 0.05,
        x: () => grid4().pos[k][0], y: () => (G.cy + grid4().pos[k][1] + grid4().T * (G.portrait ? 0.74 : 0.7)) / G.H,
        size: () => grid4().T * (G.portrait ? 0.14 : 0.12),
      })),
      { at: 0.3, to: 8.8, text: 'Wij vinden de gaten.' },
      { at: 9.0, to: 16, cut: true, text: 'En dichten ze.' },
      { at: 16.3, to: 19.6, text: 'Hoe? Met een plan.' },
    ],
  };

  // =========================================================== 5 · onze aanpak (34–42 s, half time)
  // The PDCA ball in the middle of a ring. On every kick a yellow runner takes the next step
  // (beleid, processen, risicoanalyse, maatregelen, controle, verbeteren) and the ball turns
  // along. Then it runs a full lap: and again.
  const STEPS5 = ['Beleid', 'Processen', 'Risicoanalyse', 'Maatregelen', 'Controle', 'Verbeteren'];
  const STEP5 = [2, 4, 6, 8, 10, 12], LAP5 = [14, 15.75], RING5 = 20, NR5 = 48, NODE5 = 70, kick5 = kickAt(68);
  const wheel5 = perLayout(() => {
    const P = G.portrait, d = G.R * (P ? 0.95 : 0.9);
    return { x: 0, y: -G.R * (P ? 0.12 : 0.1), d, rr: d * 0.86 };
  });
  const ang5 = (k) => -PI / 2 + k * (TAU / 6);
  function run5(b) { // how far round the runner is (radians from the top)
    let a = 0;
    for (let k = 1; k < 6; k++) a += E.glide(clamp((b - STEP5[k] + 0.6) / 0.6)) * (TAU / 6);
    return a + E.inOutCubic(clamp((b - LAP5[0]) / (LAP5[1] - LAP5[0]))) * (TAU / 6 + TAU);
  }
  const spin5 = (b) => run5(b) * 0.35 + E.outBack(clamp((b - STEP5[0]) / 0.5)) * 0.2;
  const nodeXY = (k) => { const W = wheel5(); return [W.x + Math.cos(ang5(k)) * W.rr, W.y + Math.sin(ang5(k)) * W.rr]; };
  const S5 = {
    name: 'aanpak',
    beats: 16,
    blend: { dur: 0.01 },
    bg: () => C.white,
    pose(i, b, p) {
      const W = wheel5(), A = run5(b), out = 1 - E.inCubic(clamp((b - 15.55) / 0.45));
      if (i === 0) { // the runner
        const g = E.outBack(clamp((b - STEP5[0]) / 0.4));
        if (g <= 0) return hide(p);
        const a = -PI / 2 + A, pk = 0.35 * (kick5(b, 6) + hit(b, LAP5[1], 5));
        return circle(p, W.x + Math.cos(a) * W.rr, W.y + Math.sin(a) * W.rr, G.R * 0.11 * g * (1 + pk) * out, C.yellow);
      }
      if (i === 1) { // the ball's shadow
        const s = (1 + 0.03 * kick5(b, 7)) * out;
        return rect(p, W.x, W.y + W.d * 0.56, W.d * 0.7 * s, W.d * 0.09 * s, W.d * 0.045, C.mist);
      }
      if (i >= RING5 && i < RING5 + NR5) {
        const j = i - RING5, aj = (j / NR5) * TAU, a = -PI / 2 + aj, g = E.outBack(clamp((b - 0.2 - j * 0.02) / 0.4));
        if (g <= 0) return hide(p);
        const d1 = A - aj + 0.02, d2 = A - aj - TAU + 0.02, on = clamp(d1 / 0.12);
        const pop = (d1 > 0 ? Math.exp(-d1 * 5) : 0) + (d2 > 0 ? Math.exp(-d2 * 5) : 0);
        const col = mix(mix(C.mist, C.navy, on), C.yellow, d2 > 0 ? Math.exp(-d2 * 2.5) : 0);
        return circle(p, W.x + Math.cos(a) * W.rr, W.y + Math.sin(a) * W.rr, G.R * 0.035 * g * (1 + 0.8 * pop) * out, col);
      }
      if (i >= NODE5 && i < NODE5 + 6) {
        const k = i - NODE5, g = E.outBack(clamp((b - STEP5[k] + 0.05) / 0.4));
        if (g <= 0) return hide(p);
        const [x, y] = nodeXY(k), d = A - k * (TAU / 6) - TAU, lap = d > 0 ? Math.exp(-d * 4) : 0; // the runner passes again
        const pk = hit(b, STEP5[k], 5) * 0.4 + lap * 0.5;
        circle(p, x, y, G.R * 0.085 * g * (1 + pk) * out, C.navy);
        return;
      }
      hide(p);
    },
    art: [{
      at: 0, to: 16, src: img('pdca-ball'), label: 'De Plan-Do-Check-Act-bal van Pasquil',
      place(b) {
        const W = wheel5(), s = (1 + 0.03 * kick5(b, 7)) * (1 - E.inCubic(clamp((b - 15.55) / 0.45)));
        if (s <= 0.01) return null;
        return { x: W.x, y: W.y - W.d * 0.02 * kick5(b, 7), w: W.d, s, rot: spin5(b) };
      },
    }],
    type: [
      ...STEPS5.map((t, k) => { // landscape: every step labelled round the ring
        const c = () => Math.cos(ang5(k)), side = Math.abs(Math.cos(ang5(k))) < 0.3 ? 'center' : Math.cos(ang5(k)) > 0 ? 'left' : 'right';
        return {
          at: STEP5[k] + 0.05, to: 16, cut: true, text: t, cls: 'label', align: side, stagger: 0,
          x: () => c() * (wheel5().rr + G.R * 0.13), y: () => (G.cy + wheel5().y + Math.sin(ang5(k)) * (wheel5().rr + G.R * 0.13)) / G.H,
          size: () => (G.portrait ? 0.01 : G.R * 0.1),
        };
      }),
      ...STEPS5.map((t, k) => ({ // portrait: one caption under the wheel
        at: STEP5[k] + 0.05, to: k < 5 ? STEP5[k + 1] - 0.03 : LAP5[0] - 0.1, cut: true, text: (k + 1) + '. ' + t, cls: 'tag', stagger: 0,
        y: () => (G.cy + wheel5().y + wheel5().rr + G.R * 0.42) / G.H, size: () => (G.portrait ? G.F * 0.62 : 0.01),
      })),
      { at: 0.3, to: 13.9, text: 'Onze aanpak: | stap voor stap.' },
      { at: LAP5[0] + 0.1, to: 16, cut: true, text: 'En dan? | Opnieuw.' },
    ],
  };

  // =========================================================== 6 · the risk matrix (42–50 s, the riser)
  // The ring's dots spread into a 5 × 5 matrix that heats up from green to red. Five risks land
  // on the hot corner; one by one they are treated and hop down to green. Then a green wave.
  const T0 = 20, NT = 25, AX = 60, RK = 70, kick6 = kickAt(84);
  const mat6 = perLayout(() => {
    const c = Math.min(G.R * 0.34, (G.W * 0.8) / 5.6, (G.H * 0.48) / 5.6);
    return { c, pos: (col, row) => [(col - 2) * c + c * 0.12, (2 - row) * c - c * 0.12 - G.R * 0.05] };
  });
  const RISKS = [[[4, 4], [0, 1]], [[3, 4], [1, 0]], [[4, 3], [0, 0]], [[2, 4], [1, 1]], [[3, 3], [2, 0]]];
  const RIN6 = (k) => 2.0 + k * 0.5, FIX6 = [6, 8, 10, 12.25, 12.75], HOP6 = 0.6, WAVE6 = 14;
  const S6 = {
    name: 'risks',
    beats: 16,
    blend: { start: (i) => (i >= T0 && i < T0 + NT ? (i - T0) * 0.02 : 0), dur: 0.8, ease: E.glide, arc: 0.1 },
    bg: () => C.white,
    camera: (b) => ({ zoom: 1 + 0.06 * E.inOutSine(clamp((b - 13) / 3)) + 0.015 * kick6(b, 6) }),
    pose(i, b, p) {
      const M = mat6(), c = M.c, pulse = hit(b, 15, 6) + 0.7 * hit(b, 15.5, 6);
      if (i >= T0 && i < T0 + NT) {
        const j = i - T0, col = j % 5, row = Math.floor(j / 5), [x, y] = M.pos(col, row);
        const h = E.inOutSine(clamp((b - 1.0 - (col + row) * 0.07) / 0.5)), s = (col + row) / 8;
        const gw = E.inOutSine(clamp((b - WAVE6 - (col + row) * 0.1) / 0.3));
        const pk = hit(b, 1.0 + (col + row) * 0.07 + 0.3, 5) * h + hit(b, WAVE6 + (col + row) * 0.1 + 0.2, 6) * 0.8 + pulse * 0.6;
        rect(p, x, y, c * 0.86 * (1 + 0.08 * pk), c * 0.86 * (1 + 0.08 * pk), c * 0.18, mix(mix(C.mist, heat(s), h), C.green, gw));
        return;
      }
      if (i === AX || i === AX + 1) { // the axes: impact up, likelihood across
        const g = E.outCubic(clamp((b - 0.6 - (i - AX) * 0.15) / 0.7)), [x0, y0] = M.pos(-0.5, -0.5);
        if (g <= 0) return hide(p);
        const X = x0 - c * 0.06, Y = y0 + c * 0.06;
        if (i === AX) seg(p, X, Y, X, lerp(Y, Y - 5.1 * c, g), c * 0.05, C.navy);
        else seg(p, X, Y, lerp(X, X + 5.1 * c, g), Y, c * 0.05, C.navy);
        return;
      }
      const k = i - RK;
      if (k >= 0 && k < RISKS.length) {
        const g = E.outBack(clamp((b - RIN6(k)) / 0.45));
        if (g <= 0) return hide(p);
        const [[c0, r0], [c1, r1]] = RISKS[k], a = M.pos(c0, r0), z = M.pos(c1, r1), t0 = FIX6[k] - HOP6;
        const e = E.glide(clamp((b - t0) / HOP6)), land = hit(b, FIX6[k], 6) + pulse * 0.6;
        const hop = Math.sin(PI * clamp((b - t0) / HOP6)) * c * 1.1, fear = b < t0 ? Math.sin(b * 40 + k) * c * 0.012 * clamp((b - 4) / 2) : 0;
        circle(p, lerp(a[0], z[0], e) + fear, lerp(a[1], z[1], e) - hop, c * 0.34 * g * (1 + 0.25 * land), C.navy);
        p.h *= 1 - 0.2 * hit(b, FIX6[k], 6);
        return;
      }
      hide(p);
    },
    type: [
      { at: 0.5, to: 7.6, text: 'Risico’s? | In kaart.' },
      { at: 8.1, to: 12.1, text: 'Met Risqui: | van rood naar groen.' },
      { at: 13.25, to: 16, cut: true, text: 'Onder controle.' },
    ],
  };

  // =========================================================== 7 · niet gewoon (breakdown, 50–52.7 s)
  // The drums drop out. A crowd of identical navy dots hops along with the melody. The one in
  // the middle turns yellow, jumps out of line and trembles… until the shout.
  const D0 = 20, NOTES4 = [0.53, 1.03, 1.49, 1.97, 2.31, 2.79, 3.53, 4.01, 4.49], POP4 = 3.53, LEN4 = SHOUT - (100 + PH);
  const crowd4 = perLayout(() => {
    const cols = G.portrait ? 7 : 11, rows = G.portrait ? 9 : 5;
    const sp = Math.min((G.W * 0.86) / cols, (G.H * 0.5) / rows, G.R * 0.34), mc = (cols - 1) / 2, mr = (rows - 1) / 2, pos = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (r === mr && c === mc) continue;
      pos.push([(c - mc) * sp, (r - mr) * sp - G.R * 0.04, Math.hypot(c - mc, r - mr)]);
    }
    return { sp, pos, d: sp * 0.36, y0: -G.R * 0.04 };
  });
  const hop4 = (b, amp) => { // everybody hops on the melody, until the yellow one breaks rank
    let y = 0, sq = 0;
    for (const n of NOTES4) {
      if (n > POP4 - 0.01) break;
      y = Math.max(y, Math.sin(PI * clamp((b - n) / 0.4)));
      sq = Math.max(sq, hit(b, n + 0.4, 9));
    }
    const on = 1 - clamp((b - POP4) / 0.6);
    return { y: -y * amp * on, sq: sq * on };
  };
  function hero4(p, b) {
    const Cw = crowd4(), d = Cw.d, sp = Cw.sp, h = hop4(b, sp * 0.2);
    const yel = E.inOutSine(clamp((b - POP4) / 0.15));
    const jump = clamp((b - POP4 - 0.05) / 0.45), jy = -Math.sin(PI * jump) * sp * 1.3;
    const land = hit(b, POP4 + 0.5, 6) + hit(b, NOTES4[7] + 0.22, 7) * 0.8 + hit(b, NOTES4[8] + 0.22, 7) * 0.6;
    const hops = -(Math.max(0, Math.sin(PI * clamp((b - NOTES4[7]) / 0.22))) + 0.7 * Math.max(0, Math.sin(PI * clamp((b - NOTES4[8]) / 0.22)))) * sp * 0.4;
    const grow = 1 + 1.6 * E.outBack(clamp((b - POP4) / 0.6));
    const sq = clamp(h.sq * 0.25 + land * 0.35, 0, 0.6), stretch = jump > 0 && jump < 1 ? Math.cos(PI * jump) * 0.18 : 0;
    const an = BJ.antic(b, LEN4, 0.5), D = d * grow * (1 + 0.15 * an), tall = lerp(1.3, 1, yel); // a pill like everyone else, until it isn't
    rect(p, 0, Cw.y0 + h.y + jy + hops, D * (1 + sq - stretch + 0.3 * an), D * tall * (1 - sq + stretch - 0.3 * an), lerp(D / 2, D * 0.2, E.inOutCubic(clamp((b - POP4 - 0.1) / 0.5))), mix(C.navy, C.yellow, yel));
    p.rot = E.inOutCubic(clamp((b - POP4 - 0.05) / 0.6)) * (PI * 1.25);
    p.y += (D * tall - p.h) / 2;
    const tr = clamp((b - NOTES4[8]) / 0.5) * sp * 0.05; // trembling with excitement
    p.x += Math.sin(b * 97) * tr; p.y += Math.cos(b * 83) * tr * 0.6;
  }
  const S7 = {
    name: 'anders',
    beats: LEN4,
    blend: { start: (i) => (i === 0 ? 0 : ((i * 37) % 23) * 0.012), dur: (i) => (i === 0 ? 0.3 : 0.8), ease: E.glide, arc: 0.12 },
    bg: () => C.white,
    camera(b) {
      const z = 1 + 0.45 * E.inCubic(clamp((b - 3.8) / (LEN4 - 3.8)));
      return { zoom: z, y: crowd4().y0 * (1 - z) };
    },
    pose(i, b, p) {
      if (i === 0) return hero4(p, b);
      const Cw = crowd4(), q = Cw.pos[i - D0];
      if (!q) return hide(p);
      const [x0, y0, dist] = q, d = Cw.d, h = hop4(b - dist * 0.03, Cw.sp * 0.2);
      // the crowd takes a step back to make room
      const bk = E.outCubic(clamp((b - POP4 - 0.1 - dist * 0.03) / 0.5)) * Cw.sp * 0.32 / dist;
      const x = x0 * (1 + bk / Cw.sp), y = Cw.y0 + (y0 - Cw.y0) * (1 + bk / Cw.sp);
      // everyone turns to look at the odd one out
      const lk = E.outBack(clamp((b - POP4 - 0.25 - dist * 0.04) / 0.4));
      const hy = Cw.y0 - Cw.sp * 0.6, a = Math.atan2(hy - y, 0 - x);
      pill(p, x, y + h.y + d * 0.2 * h.sq * 0.5, d * 1.3 * (1 - 0.25 * h.sq) * lerp(1, 1.15, lk), d * (1 + 0.2 * h.sq), 0, C.navy);
      const r = a - PI / 2, rr = r - Math.round(r / PI) * PI; // a pill looks the same turned 180°: take the short way
      p.rot = lk * rr;
    },
    type: [
      { at: 0.15, to: 3.5, text: 'Informatiebeveiliging | is niet gewoon.', size: 0.74 },
      { at: 3.72, to: LEN4, cut: true, text: 'Daarom is er…', size: 1.05 },
    ],
  };

  // =========================================================== 8 · PASQUIL! (the shout, 52.7 s → end)
  // "PAS" slams in, "QUIL" follows, the screen flashes and shakes and everything bursts.
  // Then the logo settles, the tagline arrives, the illustrations float in, the winged laptop
  // flies by and a navy dot stretches into the button.
  const Q5 = SHOUT2 - SHOUT, SET5 = [2.3, 3.7], TAG5 = 3.9, DOT5 = 5.3, BTN5 = [6.1, 7.1], SHOW5 = 7.1;
  const SPLIT = 445 / 908, LOGO_AR = 908 / 264;
  const logoW = () => Math.min(G.W * 0.74, G.R * 3.3, 880);
  const CTA_Y = () => (G.portrait ? 0.7 : 0.71);
  const btnBox = measurer('#type .line.link a');
  const quilX = () => (G.portrait ? 0 : Math.min(G.W * 0.9, G.H * 2.3) * (0.5 - (1 - SPLIT) / 2) * 1);
  function half5(k, b) { // 0 = "pas", 1 = "quil"
    const at = k ? Q5 : 0;
    if (b < at) return null;
    const P = G.portrait, fr = k ? 1 - SPLIT : SPLIT, cx = k ? 1 - fr / 2 : fr / 2, yc = G.H * 0.5 - G.cy;
    const L0 = P ? Math.min((G.W * 0.88) / (1 - SPLIT), G.H * 0.9) : Math.min(G.W * 0.9, G.H * 2.3), Lf = logoW();
    const m = E.glide(clamp((b - SET5[0]) / (SET5[1] - SET5[0])));
    const L = Math.exp(lerp(Math.log(L0), Math.log(Lf), m));
    let x, y;
    if (P) {
      const hh = L0 / LOGO_AR;
      x = lerp(0, (cx - 0.5) * Lf, m); y = lerp(yc + (k ? 0.56 : -0.56) * hh, -G.R * 0.1, m);
    } else { x = (cx - 0.5) * L; y = lerp(yc, -G.R * 0.1, m); }
    const sl = clamp((b - at) / 0.14);
    let s = lerp(2.4, 1, E.outCubic(sl)) * (1 + 0.07 * BJ.wobble(b, at + 0.14, 2.6, 5));
    if (!k) s *= 1 + 0.05 * hit(b, Q5, 8);
    return { x, y, w: fr * L, h: L / LOGO_AR, s, o: clamp(sl * 5), rot: (k ? 0.06 : -0.06) * (1 - E.outCubic(sl)) };
  }
  const CONF5 = (function () {
    const r = BJ.rng(55), cols = [C.navy, C.white, C.deep, C.red, C.green, C.navy, C.white], a = [];
    for (let i = 0; i < N; i++) {
      a.push({ a: r() * TAU, v: 0.6 + r() * r() * 3 + r() * 0.4, z: (r() - 0.3) * 2.2, s: 0.035 + r() * 0.07, kind: Math.floor(r() * 3),
        spin: (r() - 0.5) * 9, c: cols[Math.floor(r() * cols.length)], late: r() < 0.35, life: 1.4 + r() * 1.3 });
    }
    return a;
  })();
  function confetti(p, i, b) {
    const c = CONF5[i], t = b - (c.late ? Q5 : 0);
    if (t < 0 || t > c.life + 0.5) return hide(p);
    const R = G.R, e = 1 - Math.exp(-3.2 * t), d = c.v * R * 1.5 * e, yc = G.H * 0.5 - G.cy;
    const ox = c.late ? quilX() : 0, s = c.s * R * (1 + 0.6 * (1 - e));
    const x = ox + Math.cos(c.a) * d * (G.portrait ? 0.9 : 1.5), y = yc + Math.sin(c.a) * d + 0.45 * R * t * t;
    if (c.kind === 0) circle(p, x, y, s, c.c);
    else if (c.kind === 1) pill(p, x, y, s * 2.4, s * 0.8, 0, c.c);
    else rect(p, x, y, s, s, s * 0.22, c.c);
    p.rot = c.a + c.spin * t; p.rx = c.spin * 0.5 * t; p.z = c.z * R * e;
    p.o = 1 - clamp((t - c.life) / 0.5);
  }
  // the isometric things from pasquil.nl, floating around the end card
  const FLOAT5 = [ // name, landscape [x, y, size] (fractions of W, H, min(W, H)), portrait (or null)
    ['camera', [0.11, 0.2, 0.2], [0.17, 0.1, 0.3]],
    ['floppy', [0.09, 0.6, 0.13], null],
    ['monitor', [0.13, 0.86, 0.17], [0.17, 0.91, 0.27]],
    ['cd', [0.91, 0.6, 0.14], null],
    ['raspberry', [0.88, 0.87, 0.17], [0.81, 0.915, 0.29]],
  ];
  const slot5 = (s) => ({ x: s[0] * G.W - G.cx, y: s[1] * G.H - G.cy, w: s[2] * Math.min(G.W, G.H) });
  const LAPTOP5 = { l: [0.87, 0.14, 0.26], p: [0.79, 0.1, 0.36] }, FLY5 = [4.2, 5.9];
  const S8 = {
    name: 'pasquil',
    beats: END - SHOUT,
    blend: { dur: 0.01 },
    bg: () => C.yellow,
    dark: () => true,
    fx(b) {
      const a = G.R * (0.1 * hit(b, 0, 3.2, 0.01) + 0.075 * hit(b, Q5, 3.6, 0.01));
      return {
        x: a * Math.sin(b * TAU * 7.3), y: a * 0.8 * Math.cos(b * TAU * 5.9), rot: (a / G.R) * 0.12 * Math.sin(b * TAU * 4.1),
        flash: 0.75 * hit(b, 0, 9, 0.01) + 0.45 * hit(b, Q5, 10, 0.01),
      };
    },
    pose(i, b, p) {
      if (i === 0) { // the navy dot that becomes the button
        const g = E.outBack(clamp((b - DOT5) / 0.5));
        if (g <= 0 || b > SHOW5 + 1.2) return hide(p);
        const est = { x: 0, y: G.H * CTA_Y() - G.cy - G.F * 0.35, w: Math.max(260, G.F * 4), h: 52 };
        const bt = btnBox() || est, d = G.F * 0.32 * g;
        const beat = hit(b, DOT5 + 0.5, 5) + hit(b, DOT5 + 0.8, 6) * 0.6;
        const st = E.inOutCubic(clamp((b - BTN5[0]) / (BTN5[1] - BTN5[0])));
        const dd = d * (1 + 0.3 * beat) * lerp(1, bt.h / (G.F * 0.32) * 0.75, st);
        return rect(p, bt.x, bt.y, lerp(dd, bt.w, st), lerp(dd, bt.h, st), lerp(dd / 2, 14, st), C.navy);
      }
      confetti(p, i, b);
    },
    art: [
      { at: 0, to: Infinity, html: '', cls: 'half pas', label: 'Pasquil', place: (b) => half5(0, b) },
      { at: 0, to: Infinity, html: '', cls: 'half quil', place: (b) => half5(1, b) },
      ...FLOAT5.map(([n, ls, ps], k) => ({
        at: 0, to: Infinity, src: img(n),
        place(b) {
          const s = G.portrait ? ps : ls;
          if (!s) return null;
          const t0 = TAG5 + 0.5 + k * 0.28, g = E.outBack(clamp((b - t0) / 0.5));
          if (g <= 0) return null;
          const S = slot5(s);
          return { x: S.x, y: S.y + Math.sin((b + k * 1.7) * 1.25) * S.w * 0.05, w: S.w, s: g, rot: Math.sin((b + k * 2.3) * 0.8) * 0.05 };
        },
      })),
      {
        at: 0, to: Infinity, src: img('flying-laptop'), label: 'Een laptop met vleugels',
        place(b) {
          const e = E.inOutCubic(clamp((b - FLY5[0]) / (FLY5[1] - FLY5[0])));
          if (e <= 0) return null;
          const S = slot5(G.portrait ? LAPTOP5.p : LAPTOP5.l);
          const x = lerp(-G.W * 0.5 - S.w, S.x, e), y = S.y + Math.sin(PI * e) * -G.H * 0.1 + (1 - e) * G.H * 0.18;
          return { x, y: y + Math.sin(b * 2.4) * S.w * 0.05, w: S.w, h: S.w * (246 / 390), rot: (1 - e) * 0.2 + Math.sin(b * 1.9) * 0.05 };
        },
      },
    ],
    type: [
      { at: TAG5, to: Infinity, text: 'Informatiebeveiliging en privacy. | Met humor en durf.', cls: 'soft', size: 0.46, y: () => (G.cy - G.R * 0.1 + logoW() / LOGO_AR / 2 + G.F * 0.85) / G.H, stagger: 0.08 },
      {
        at: DOT5 - 0.3, show: SHOW5, to: Infinity, cls: 'link', y: CTA_Y, fade: 0.8,
        html: '<a href="https://pasquil.nl" target="_blank" rel="noopener">Maak kennis op pasquil.nl</a>' +
          '<small>Advies&nbsp;&middot; Audits&nbsp;&middot; Risicomanagement&nbsp;&middot; FG&#8209;as&#8209;a&#8209;service</small>',
      },
    ],
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8];
})();
