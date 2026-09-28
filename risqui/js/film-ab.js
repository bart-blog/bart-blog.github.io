/* Film, part 2: A · the sea, B · the spreadsheet. */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, clamp = BJ.clamp, lerp = BJ.lerp, hit = BJ.hit, K = BJ.K;
  const BEAT = BJ.BEAT, PI = Math.PI, frac = BJ.frac, seg = K.seg, paint = K.paint, tint = K.tint, off = K.off;
  const { NB, HOR, RING, FIN, CARET, CK1, CK2, NAVY, YEL, WHITE, MUTE } = K;
  BJ.scenes = [];

  // =========================================================== A · the sea
  // A real 3D sea plane below the horizon. A swim ring drops in; far away a fin surfaces and
  // charges straight at it on a pulse that keeps speeding up. It slips under. One held breath.
  // Then it takes the float, the water explodes, and the lights go out.
  const FS = {};
  function finAt(b) {
    let s = 0, lean = 0;
    for (const p of K.PULSE) { s += E.outCubic(seg(b, p, 0.45)); lean = Math.max(lean, hit(b, p, 3)); }
    s /= K.PULSE.length;
    const FE = K.FIN_END, ys = lerp(0.2, FE.ys, s), k = 1 / ys;
    FS.s = s; FS.ys = ys; FS.k = k; FS.Z = G.P * (1 - k); FS.lean = lean;
    FS.fx = lerp(0.38 * G.W, FE.fx, s) + 0.02 * G.W * Math.sin(3 * PI * s);
    FS.X = FS.fx * k;
    FS.rise = 0.6 * E.outCubic(seg(b, K.FIN_UP, 0.6)) + 0.4 * Math.min(1, s * 1.6);
    FS.dive = E.inCubic(seg(b, K.DIVE, 0.4));
    FS.c = FS.rise * (1 - FS.dive);
    return FS;
  }
  K.finPan = (b) => { finAt(b); return clamp(FS.fx / (0.5 * G.W), -1, 1) * 0.8; };
  const darkAt = (b) => E.outCubic(seg(b, K.DARK, 0.06));
  const GRAV = 3.4; // spray gravity, in screen heights per second²

  BJ.scenes.push({
    name: 'sea',
    beats: K.SEA_BEATS,
    frame(b) { finAt(b); },
    camera(b) {
      // creep in on the float while the fin closes, a violent jolt on the hit, a thud on the title,
      // then settle back to rest before the sheet takes over
      const A = K.ATTACK, rel = 1 - E.inOutCubic(seg(b, K.DARK + 0.4, K.SEA_BEATS - K.DARK - 0.7));
      const creep = E.inOutSine(seg(b, K.FIN_UP, A - K.FIN_UP));
      let tr = 0;
      K.PULSE.forEach((p, k) => { tr += BJ.wobble(b, p, 7, 9) * (k / K.PULSE.length); });
      const jx = BJ.wobble(b, A, 6.5, 3.2), jy = BJ.wobble(b, A + 0.03, 5.1, 3.2), jr = BJ.wobble(b, A + 0.02, 3.3, 2.8);
      const punch = 0.1 * hit(b, A, 2.5) + 0.05 * hit(b, K.DARK + 0.6, 4);
      return {
        s: 1 + (0.16 * creep + punch) * rel,
        x: (0.13 * G.W * creep + 0.004 * G.W * tr) * rel + 0.04 * G.W * jx,
        y: 0.035 * G.H * jy + 0.002 * G.H * tr,
        r: 0.03 * jr,
      };
    },
    pose(i, b, q) {
      const bt = b * BEAT, hc = G.hc, A = K.ATTACK;
      if (i < NB) {
        const d = K.SEA[i], sp = K.SPRAY[i];
        let app = 0.4 + 0.6 * E.outCubic(seg(b, (19 - d.r) * 0.012, 0.35));
        if (sp && b >= A) {
          // thrown up out of the water, tumbling, falling back
          const t = Math.max(0, (b - A - sp.delay) * BEAT), R = K.RA, k = R.k;
          const up = sp.vz * t - 0.5 * GRAV * G.H * t * t;
          if (up >= 0) {
            q.gy = hc; q.grx = PI / 2;
            q.x = R.X + (sp.ox + sp.vx * t) * k; q.y = R.Z + sp.oz + sp.vy * t; q.z = up * k;
            q.rx = -PI / 2; q.rz = sp.spin * t;
            q.w = q.h = sp.size * k * (0.5 + Math.min(1, t * 8));
            paint(q, K.mixc(sp.c, WHITE, darkAt(b) * 0.8));
            return;
          }
          app *= E.outCubic(seg(b, K.DARK + 0.8, 1.2));
        }
        if (app <= 0) return off(q);
        let X = (d.xs + Math.sin(bt * 0.45 + d.ph) * 0.008 * G.W) * d.k;
        let lift = (1.2 + (3 * d.ys) / 2.1) * Math.sin(bt * 1.25 + d.xs * 0.012 + d.r * 0.8), grow = 0;
        for (const rp of K.RIPPLES) {
          const x = b - rp.at;
          if (x <= 0) continue;
          const dist = Math.hypot(X - rp.X, d.Z - rp.Z), wv = Math.exp(-Math.pow((dist - x * rp.v) / rp.w, 2)) * Math.exp(-x * 0.8);
          lift += rp.amp * wv; grow += 0.6 * wv;
        }
        if (FS.c > 0.01) {
          const dx = X - FS.X, dz = d.Z - FS.Z, wr = 0.13 * G.W * FS.k;
          const e = Math.exp(-(dx * dx + dz * dz * 0.5) / (wr * wr)) * Math.min(1, FS.c * 2);
          X += Math.sign(dx) * e * wr * 0.5; lift += e * 9; grow += e * 0.45;
        }
        q.gy = hc; q.grx = PI / 2;
        q.x = X; q.y = d.Z; q.z = lift * d.k;
        q.w = d.len * d.k * app * (1 + grow); q.h = (d.ts * d.k * d.k * G.P) / hc;
        q.o = app; paint(q, WHITE);
        return;
      }
      if (i === HOR) { q.w = G.W * 1.2; q.h = 2; paint(q, NAVY); q.o = 1 - darkAt(b); return; }
      if (i === RING) {
        // the site's float (ring + laptop) drops in, splashes, bobs, shivers as the fin closes in,
        // gives one nervous jerk and is pulled under
        const R = K.RA, FL = K.FLOAT, p = seg(b, K.DROP, K.A_LAND - K.DROP), h = (R.S * R.k) / FL.ring;
        const sink = Math.pow(seg(b, A, 0.2), 2);
        if (b < K.DROP || sink >= 1) return off(q);
        let z = lerp(R.zTop, 0, p * p);
        if (b > K.A_LAND) z = -R.S * R.k * 0.16 * BJ.wobble(b, K.A_LAND, 0.9, 1.8);
        let jx = 0;
        K.PULSE.forEach((pt, k) => { jx += BJ.wobble(b, pt + 0.05, 6, 6) * (0.3 + 0.1 * k); });
        z += 0.1 * h * BJ.antic(b, A, 0.14) - 1.05 * h * sink;
        const sq = hit(b, K.A_LAND, 4) * 0.12, landed = b >= K.A_LAND;
        q.gy = hc; q.grx = PI / 2;
        q.x = R.X + jx * 0.006 * G.W * R.k; q.y = R.Z; q.z = z + (FL.water - 0.5) * h; q.rx = -PI / 2; q.ry = 0.05 * Math.sin(bt * 1.1);
        q.rz = 0.1 * BJ.wobble(b, K.DIVE + 0.25, 1.4, 1.6) - 0.45 * sink;
        q.w = h * (1 + sq) * (1 - 0.12 * sink); q.h = h * (1 - sq) * (1 + 0.2 * sink);
        q.f = landed ? ((b - K.A_LAND) * BEAT * FL.fps) % FL.loop : 0;
        q.clip = landed ? (0.01 + 0.99 * E.outCubic(seg(b, K.A_LAND, 0.4))) * (b < A ? 1 : 0) : 0.01;
        q.cut = b < A ? 1 : clamp(FL.water - 1.05 * sink / (1 + 0.2 * sink));
        return;
      }
      if (i === FIN) {
        // the site's shark: its own rise/sink frames, placed on the 3D sea and charging in
        if (b < K.FIN_UP || (FS.rise < 0.002 && !FS.dive) || FS.dive >= 1) return off(q);
        const SK = K.SHARK, h = K.FINW.h / SK.fin;
        q.gy = hc; q.grx = PI / 2;
        q.x = FS.X; q.y = FS.Z; q.z = (SK.water - 0.5) * h;
        q.rx = -PI / 2; q.ry = 0.16 * FS.lean;
        q.h = h; q.w = h * SK.aspect;
        q.f = FS.dive > 0 ? SK.hold + (SK.down - 1 - SK.hold) * FS.dive : 1 + (SK.up - 1) * clamp(FS.rise);
        return;
      }
      off(q);
    },
    backdrop: (b) => ({ sea: 1, y: 0, dark: darkAt(b) }),
    captions: [
      K.cap('Everything looks *calm.*', 0.1, K.ATTACK, { snap: true }),
      K.cap('Until it *isn’t.*', K.DARK + 0.04, K.SEA_BEATS + 0.1, { gap: 0.28, cls: 'slam', place: () => ({ top: G.slamY + 'px' }) }),
    ],
    music(M) {
      const U = K.FIN_UP, L = K.A_LAND, D = K.DIVE, A = K.ATTACK, N = K.DARK, END = K.SEA_BEATS;
      // calm: an open major chord and the float's splash
      M.pad(0, 'F3 C4 A4', U + 0.4, 0.34); M.sub(0, 'F2', U - 0.2, 0.18);
      M.whoosh(0, L, 0.07, 2800, 500);
      M.drop(L, 'C6', 0.3, -0.35); M.splash(L, 0.28); M.ep(L, 'F5', 0.26, -0.3); M.ep(L + 0.35, 'A5', 0.15, 0.25);
      // the fin: the chord darkens and the low strings start, faster and louder every stroke
      M.drop(U, 'F4', 0.12, 0.7);
      M.pad(U + 0.1, 'D3 A3 D4', D - U, 0.2); M.sub(U + 0.2, 'D1', D - U - 0.5, 0.32);
      K.PULSE.forEach((at, k) => {
        const gap = (K.PULSE[k + 1] || D) - at, pan = K.finPan(at + 0.3);
        M.cello(at, k % 2 ? 'D2' : 'C#2', gap * 0.95, 0.34 + k * 0.05, pan);
        M.swish(at, 0.45, 0.05 + k * 0.016, pan);
        if (k >= 4) M.kick(at, 0.16 + (k - 4) * 0.06);
      });
      // it slips under: everything drops out but a heartbeat and a sharp intake of breath
      M.swish(D, 0.6, 0.18, K.finPan(D)); M.drop(D + 0.05, 'D4', 0.16);
      M.kick(D + 0.28, 0.3); M.kick(D + 0.46, 0.22);
      M.whoosh(A - 0.55, 0.5, 0.16, 300, 4500);
      // the hit
      M.hit(A, 0.62); M.boom(A, 0.35); M.kick(A, 0.6); M.splash(A, 0.8); M.splash(A + 0.15, 0.45);
      M.cello(A, 'D1', 1.4, 0.6, -0.2); M.cello(A, 'D#1', 1.4, 0.45, 0.2);
      // lights out, the title lands word by word, a low drone underneath
      M.drone(N, END - N + 0.4, 0.45);
      [0, 1, 2].forEach((k) => { const t = N + 0.04 + k * 0.28; M.kick(t, 0.4 + 0.1 * k); M.hit(t, k < 2 ? 0.26 : 0.5); });
      M.boom(N + 0.6, 0.3); M.cello(N + 0.6, 'D1', 2.2, 0.4, 0);
      M.whoosh(END - 0.7, 0.8, 0.12, 200, 2600);
    },
  });

  // =========================================================== B · the spreadsheet
  // The sea plane stands up and becomes a sheet: rows become rows. The ring becomes the caret,
  // four risks get typed in. Then the colour drains out, and the file drifts out of sight.
  const REC = 6.2;
  const recede = (b) => E.inOutCubic(seg(b, REC, 3.5));
  function sheetG(q, b) {
    const r = recede(b);
    q.gy = 0.03 * G.H - 0.04 * G.H * r;
    q.gz = -1.15 * G.P * r;
    q.grx = 0.04 + 0.62 * r;
    q.gry = lerp(-0.16, -0.03, E.inOutSine(clamp(b / 6.2))) + 0.1 * r;
    q.grz = -0.05 * r;
  }
  function cellW(c, b) {
    const e = c.edit;
    if (!e || b < e.at - 0.1) return c.w;
    if (b < e.at + 0.12) return c.w * (1 - E.inCubic(seg(b, e.at - 0.1, 0.2)));
    return e.w2 * (Math.ceil(seg(b, e.at + 0.12, 0.48) * 7) / 7);
  }
  const mute = (b, r) => E.inOutSine(seg(b, 5.8 + (r + 1) * 0.035, 0.9));
  const GREYS = { text: K.GREY, chip: [205, 211, 224], glyph: K.GREY, name: K.GREY, fx: K.GREY, band: [238, 240, 245], tab: [248, 249, 251], line: [220, 224, 233] };
  // which edit is live: the caret, the selection and the formula bar all follow it
  function active(b) {
    let k = 0;
    for (let n = 0; n < K.EDITS.length; n++) if (b >= K.EDITS[n][2] - 0.35) k = n;
    return k;
  }
  function cellOf(n) { const [r, j] = K.EDITS[n]; return K.SH.cells[r * 5 + j]; }
  function selAt(b) {
    const k = active(b), a = cellOf(Math.max(0, k - 1)), c = cellOf(k), SH = K.SH;
    const e = k === 0 ? 1 : E.snap(seg(b, K.EDITS[k][2] - 0.35, 0.3));
    const ax = SH.colL[a.col] + SH.colW[a.col] / 2, cx = SH.colL[c.col] + SH.colW[c.col] / 2;
    return {
      k, e, c,
      x: lerp(ax, cx, e), y: lerp(a.y, c.y, e), w: lerp(SH.colW[a.col], SH.colW[c.col], e),
      cx: lerp(a.left + cellW(a, b), c.left + cellW(c, b), e) + 3,
      typing: b < K.EDITS[k][2] + 0.62 && b > K.EDITS[k][2] - 0.1,
    };
  }
  const selOn = (b) => seg(b, 1.8, 0.25) * (1 - seg(b, 5.6, 0.4));

  BJ.scenes.push({
    name: 'sheet',
    beats: 9.7,
    blend: {
      start: (i) => (i < NB ? K.SEA[i].r * 0.012 : i === CK1 || i === CK2 ? 0.55 : 0),
      dur: (i) => (i === RING ? 1.7 : i === CK1 || i === CK2 ? 1.4 : 1.9),
      ease: E.outQuint,
      gease: E.inOutCubic,
    },
    pose(i, b, q) {
      const SH = K.SH, rec = recede(b);
      if (i < NB) {
        const s = SH.slot[i];
        if (!s) return off(q);
        sheetG(q, b);
        q.x = s.x; q.y = s.y; q.z = s.z; q.w = s.w; q.h = s.h; q.o = s.o;
        let c = s.c;
        const on = selOn(b);
        if (s.kind === 'text') {
          const w = cellW(s, b), e = s.edit;
          q.w = w; q.x = s.left + w / 2;
          const fl = e && b >= e.at - 0.1 ? (b < e.at + 0.6 ? 1 : Math.exp(-(b - e.at - 0.6) * 1.1)) : 0;
          q.o = lerp(q.o, 1, fl);
        } else if (s.kind === 'fx') {
          const sel = selAt(b), w = Math.min(0.8 * SH.SW, cellW(sel.c, b) * 1.35 + 0.02 * SH.SW);
          q.w = w; q.x = s.left + w / 2; q.o *= on;
        } else if (s.kind === 'name') {
          const k = active(b);
          q.w *= 1 + 0.25 * hit(b, K.EDITS[k][2] - 0.35, 6) * on;
        } else if (s.kind === 'glyph' && (s.hj !== undefined || s.hk !== undefined)) {
          const sel = selAt(b), hl = s.hj !== undefined ? s.hj === sel.c.col : s.hk === sel.c.row;
          if (hl) { c = K.mixc(c, NAVY, on); q.o = lerp(q.o, 1, on); }
        }
        tint(q, c, GREYS[s.kind] || K.GREY, mute(b, s.row));
        q.o *= 1 - 0.15 * rec;
        return;
      }
      if (i === CK1 || i === CK2) {
        sheetG(q, b);
        const sh = i === CK2;
        q.x = sh ? 0.012 * SH.cardW : 0; q.y = sh ? 0.03 * SH.cardH : 0; q.z = sh ? -7 : -3.5;
        q.w = SH.cardW; q.h = SH.cardH;
        if (sh) { paint(q, NAVY); q.o = 0.08 * (1 - 0.5 * rec); } else { tint(q, WHITE, [247, 248, 251], mute(b, 5)); q.o = 1; }
        return;
      }
      if (i === HOR) {
        // the selected cell: a soft yellow wash that snaps from edit to edit
        const on = selOn(b);
        if (on <= 0) return off(q);
        const sel = selAt(b);
        sheetG(q, b);
        q.x = sel.x; q.y = sel.y; q.z = -0.5; q.w = sel.w * (1 + 0.04 * hit(b, K.EDITS[sel.k][2] - 0.05, 6)); q.h = SH.rp;
        paint(q, YEL); q.o = 0.24 * on;
        return;
      }
      if (i === RING) return off(q); // the float was taken
      if (i === CARET) {
        const o = selOn(b);
        if (o <= 0) return off(q);
        const sel = selAt(b);
        sheetG(q, b);
        q.x = sel.cx; q.y = sel.y; q.w = Math.max(2, SH.rp * 0.08); q.h = SH.rp * 0.62; q.z = 2.5;
        q.o = o * (sel.typing || frac(b * 1.3) < 0.6 ? 1 : 0.12);
        paint(q, NAVY);
        return;
      }
      off(q);
    },
    backdrop: (b) => ({ sea: 1 - E.inOutSine(seg(b, 0, 1.6)), y: G.H * 0.5 * E.inCubic(seg(b, 0, 1.6)), dark: 1 - E.inOutSine(seg(b, 0.15, 0.9)) }),
    captions: [
      {
        at: 1.2, to: 7.2, cls: 'meta',
        html: '<span class="fn">risk-register_FINAL_v7 (2).xlsx</span><span class="ed">Last edited 14 months ago</span>',
        place: () => ({ top: Math.max(22, G.cy + 0.03 * G.H - K.SH.cardH / 2 - 22) + 'px' }),
        update(el, b, uc) {
          if (!uc.e) uc.e = el.querySelector('.ed');
          const t = seg(b, 5.95, 0.6), key = Math.round(t * 100);
          if (uc.k !== key) { uc.k = key; uc.e.style.opacity = t; uc.e.style.transform = 'translate(-50%,' + ((1 - E.outCubic(t)) * 0.4).toFixed(3) + 'em)'; }
        },
      },
      K.cap('Most risks live in a *spreadsheet.*', 2.0, 5.8),
      K.cap('Out of date. Out of *sight.*', 6.1, 9.4, { gap: 0.2 }),
    ],
    music(M) {
      M.pad(0.2, 'D3 F3 A3 D4', 5.6, 0.26); M.sub(0.2, 'D2', 5.6, 0.2);
      for (let r = 0; r < 20; r += 2) M.tick(0.4 + r * 0.07, 0.03, (r / 19 - 0.5) * 0.6);
      M.marimba(1.75, 'D5', 0.2, -0.2); M.marimba(2.05, 'A5', 0.12, 0.2);
      K.EDITS.forEach(([, j, at], k) => {
        const pan = (j / 4 - 0.5) * 0.8;
        M.tick(at - 0.3, 0.05, pan);
        for (let n = 0; n < 4; n++) M.tick(at + 0.15 + n * 0.11, 0.07, pan);
        M.ep(at + 0.6, ['A5', 'C6', 'G5', 'F5'][k], 0.18, pan);
      });
      M.pad(5.8, 'Bb2 F3 A3 D4', 1.8, 0.22);
      M.pad(7.0, 'G2 D3 Bb3 D4', 2.7, 0.2); M.sub(7.0, 'G1', 2.5, 0.2);
      ['D5', 'C5', 'Bb4', 'A4', 'G4'].forEach((n, k) => M.ep(7.0 + k * 0.42, n, 0.13 - k * 0.01, (k - 2) * 0.3));
      M.whoosh(REC + 0.2, 2.8, 0.05, 1400, 200);
    },
  });
})();
