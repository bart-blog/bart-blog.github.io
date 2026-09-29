/* Pasquil — "Informatiebeveiliging is niet gewoon." A 29-second film cut to the soundtrack.
   Every shape is one div whose size, corner radius, colour and matrix3d are set every frame;
   the line illustrations and the logo come straight from pasquil.nl.
   The track (120.64 BPM) sets the cuts: a "supergeheim" password over the intro, a tour of the
   Pasquil office on the first drop (every cut on a kick), the services landing on the second,
   a crowd of identical dots over the breakdown, and the shouted "PASQUIL" slams the logo in.
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
  // Kick drum onsets, measured from the WAV and expressed in film beats (absolute).
  const KICKS = [0.48, 1.49, 2.98, 3.97, 6.34, 8.01, 8.52, 9.34, 10.52, 11.81, 14.03, 16.0, 17.31, 18.69, 19.06, 19.77,
    22.02, 23.99, 25.32, 26.51, 30.01, 32.01, 32.51, 33.34, 35.06, 35.61, 35.93];
  const kick = (B, decay = 7) => {
    let v = 0;
    for (const k of KICKS) { if (k > B) break; v = Math.max(v, hit(B, k, decay)); }
    return v;
  };
  const SHOUT = BJ.sec(20.47), SHOUT2 = BJ.sec(20.8), END = BJ.sec(28.66) + 0.15; // "PAS" … "QUIL"
  const img = (n) => 'img/art/' + n + '.png';
  const textY = () => G.textY / G.H;

  // =========================================================== 1 · the supergeheime password (intro, 0–4 s)
  // Eleven bullets are typed into a field on the hi-hats, the yellow caret racing ahead.
  // On the big kick the bullets flip away and reveal what everyone already guessed.
  const PW = 'Paswoord123', NPW = PW.length;
  const field = perLayout(() => {
    const FW = Math.min(G.W * 0.84, G.R * 3.1), FH = G.R * 0.46;
    return { FW, FH, bw: Math.max(2, G.R * 0.024), ds: FH * 0.3, d: FH * 0.2 };
  });
  const JIT1 = (function () { const r = BJ.rng(11), a = []; for (let k = 0; k < NPW; k++) a.push(r()); return a; })();
  const TK = (k) => 0.42 + k * 0.215 + JIT1[k] * 0.05, REV1 = 3.97, NO1 = 6.34;
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
    beats: 8,
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
      { at: 0.45, to: 3.85, text: 'Ons wachtwoord? | Supergeheim.' },
      { at: REV1 + 0.02, to: 8, cut: true, text: PW, cls: 'pw', y: () => G.cy / G.H, size: () => field().FH * 0.46, stagger: 0 },
      { at: 4.95, to: 8, cut: true, text: 'Oeps.', size: 1.25 },
    ],
  };

  // =========================================================== 2 · the office (first drop, 4–11 s)
  // The isometric office from the pasquil.nl homepage. Hard cuts on the kicks to everything
  // that's wrong with it, then the camera pulls back to show the whole thing.
  const OFFICE_AR = 2160 / 3840;
  const SHOTS2 = [ // [local beat, focus x, focus y (fractions of the picture), share of the picture in view]
    [0, 0.272, 0.43, 0.3], // the flip-over with Paswoord123
    [2.52, 0.29, 0.215, 0.3], // "They're watching" and the router in the hole in the wall
    [3.81, 0.605, 0.5, 0.32], // the cat on the keyboard, "I'm the sysadmin"
    [6.03, 0.165, 0.63, 0.27], // the aquarium, with a phone in it
    [8.0, 0.235, 0.79, 0.25], // the bin full of confidential papers
  ];
  const PULL2 = [10.69, 11.77];
  const shotW = (k, b) => (Math.sqrt(G.W * G.H) * 1.25) / SHOTS2[k][3] * (1 + 0.025 * (b - SHOTS2[k][0]));
  const fullShot = () => (G.portrait ? { w: G.H * 1.12, x: 0.38, y: 0.5 } : { w: Math.min(G.W * 0.97, (G.H * 0.9) / OFFICE_AR), x: 0.5, y: 0.5 });
  function officeView(b) {
    let k = 0;
    for (let j = 0; j < SHOTS2.length; j++) if (b >= SHOTS2[j][0]) k = j;
    const e = E.inOutCubic(clamp((b - PULL2[0]) / (PULL2[1] - PULL2[0])));
    const bump = (1 + 0.07 * hit(b, SHOTS2[k][0], 6)) * (1 + 0.025 * kick(b + 8, 7));
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
    beats: 14,
    blend: { dur: 0.01 },
    bg: () => C.office,
    dark: () => true,
    pose(i, b, p) { hide(p); },
    art: [{
      at: 0, to: 14, src: 'img/art/office.jpg', layer: 'back', cls: 'office',
      label: 'Het kantoor van Pasquil: Paswoord123 op de flip-over, een kat als sysadmin, een aquarium en een prullenbak vol vertrouwelijke papieren',
      place(b) {
        const v = officeView(b), h = v.w * OFFICE_AR;
        return { x: (0.5 - v.x) * v.w, y: (0.5 - v.y) * h + G.H * v.sy - G.cy, w: v.w, h };
      },
    }],
    type: [
      tag(0.1, 2.46, 'Staat ook op de flip-over.'),
      tag(2.58, 3.75, 'Wie kijkt er mee?'),
      tag(3.88, 5.97, 'De kat is sysadmin.'),
      tag(6.1, 7.95, 'Het aquarium is online.'),
      tag(8.07, 10.6, 'Vertrouwelijk? | Bij het oud papier.', { cut: false }),
      tag(11.35, 14, 'Herkenbaar?', { size: () => G.F * (G.portrait ? 1.0 : 0.8) }),
    ],
  };

  // =========================================================== 3 · what Pasquil does (second drop, 11–18 s)
  // On the yellow field, six cards drop onto the kicks, each with its illustration from the
  // site. The FG auditor drives in. Then every card gets its tick, one per kick.
  const TILES = [
    { n: 'magnifier', label: 'Audits', L: 0.02, box: 0.72 },
    { n: 'folder', label: 'ISO 27001 | NEN 7510', L: 1.99, box: 1.7 },
    { n: 'devices', label: 'Risico­management', L: 3.32, box: 1.25 },
    { n: 'eye', label: 'Privacy & AVG', L: 4.51, box: 1.75 },
    { n: 'fg-auditor', label: 'FG-as-a-service', L: 8.01, box: 0.86 },
    { n: 'pdca', label: 'Plan · Do | Check · Act', L: 10.01, box: 0.7 },
  ];
  const CHK3 = [10.51, 11.34, 12.0, 13.06, 13.61, 13.93], SH3 = 20, CD3 = 30, BD3 = 40, TK3 = 50, CAR3 = 4;
  const grid3 = perLayout(() => {
    const P = G.portrait, cols = P ? 2 : 3, rows = 6 / cols;
    const T = P ? Math.min(G.W * 0.31, G.H * 0.13) : Math.min(G.W * 0.19, G.H * 0.235);
    const sx = T * (P ? 1.42 : 1.45), sy = T * (P ? 1.62 : 1.55);
    const pos = TILES.map((_, k) => [((k % cols) - (cols - 1) / 2) * sx, (Math.floor(k / cols) - (rows - 1) / 2) * sy - G.R * (P ? 0.02 : 0.1)]);
    return { T, pos };
  });
  function tile3(k, b) {
    const t = TILES[k], [x, y] = grid3().pos[k];
    if (k === CAR3) { // its card pops up as the car arrives
      const g = E.outBack(clamp((b - t.L + 0.05) / 0.4));
      return { x, y, g, sq: hit(b, t.L + 0.1, 6), rot: 0 };
    }
    const f = clamp((b - (t.L - 0.3)) / 0.3);
    return { x, y: y - (1 - f * f) * G.H * 0.75, g: f > 0 ? 1 : 0, sq: hit(b, t.L, 6), rot: (1 - f) * (k % 2 ? 0.3 : -0.3) };
  }
  const S3 = {
    name: 'services',
    beats: 14,
    blend: { dur: 0.01 },
    bg: () => C.yellow,
    dark: () => true,
    pose(i, b, p) {
      const T = grid3().T;
      if ((i >= SH3 && i < SH3 + 6) || (i >= CD3 && i < CD3 + 6)) {
        const sh = i < CD3, k = i - (sh ? SH3 : CD3), s = tile3(k, b);
        if (s.g <= 0) return hide(p);
        const w = T * (1 + 0.12 * s.sq) * s.g, h = T * (1 - 0.1 * s.sq) * s.g, off = sh ? T * 0.06 : 0;
        rect(p, s.x + off, s.y + off + T * 0.05 * s.sq, w, h, T * 0.14, sh ? C.navy : C.white);
        p.rot = s.rot;
        return;
      }
      if (i >= BD3 && i < BD3 + 6) { // the tick badge
        const k = i - BD3, s = tile3(k, b), g = E.outBack(clamp((b - CHK3[k]) / 0.3));
        if (g <= 0) return hide(p);
        return circle(p, s.x + T * 0.44, s.y - T * 0.44, T * 0.34 * g * (1 + 0.15 * hit(b, CHK3[k] + 0.3, 6)), C.green);
      }
      if (i >= TK3 && i < TK3 + 12) {
        const k = (i - TK3) >> 1, part = (i - TK3) & 1, s = tile3(k, b), t = b - CHK3[k] - 0.08, cs = T * 0.3;
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
      at: 0, to: 14, src: img(t.n), label: t.label.replace(/ \| /g, ' '),
      place(b) {
        const s = tile3(k, b), T = grid3().T, box = T * t.box;
        if (k === CAR3) { // the FG auditor drives in from the left, siren on
          const e = E.outCubic(clamp((b - (t.L - 1.3)) / 1.3));
          if (e <= 0) return null;
          const x = lerp(-G.W / 2 - box, s.x, e), bob = Math.abs(Math.sin(b * PI * 4)) * T * 0.03 * (1 - e);
          return { x, y: s.y - T * 0.03 - bob, w: box, s: 1 + 0.06 * s.sq, rot: (1 - e) * 0.08 - hit(b, t.L, 7) * 0.06 };
        }
        if (s.g <= 0) return null;
        return { x: s.x, y: s.y - T * 0.02 + T * 0.05 * s.sq, w: box, s: 1 + 0.06 * s.sq, rot: s.rot };
      },
    })),
    type: [
      ...TILES.map((t, k) => ({
        at: t.L + 0.08, to: 14, cut: true, text: t.label, cls: 'label', stagger: 0.05,
        x: () => grid3().pos[k][0], y: () => (G.cy + grid3().pos[k][1] + grid3().T * (G.portrait ? 0.74 : 0.7)) / G.H,
        size: () => grid3().T * (G.portrait ? 0.14 : 0.12),
      })),
      { at: 0.3, to: 6.9, text: 'Wij vinden de gaten.' },
      { at: 7.05, to: 14, cut: true, text: 'En dichten ze.' },
    ],
  };

  // =========================================================== 4 · niet gewoon (breakdown, 18–20.5 s)
  // The drums drop out. A crowd of identical navy dots hops along with the melody. The one in
  // the middle turns yellow, jumps out of line and trembles… until the shout.
  const D0 = 20, NOTES4 = [0.63, 1.12, 1.58, 2.08, 2.4, 2.88, 3.63, 4.11, 4.59], POP4 = 3.63, LEN4 = SHOUT - 36;
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
  const S4 = {
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

  // =========================================================== 5 · PASQUIL! (the shout, 20.5 s → end)
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
  const S5 = {
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

  BJ.scenes = [S1, S2, S3, S4, S5];
})();
