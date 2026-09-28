/* Film, part 2: A · the sea, B · the spreadsheet. */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, clamp = BJ.clamp, lerp = BJ.lerp, hit = BJ.hit, K = BJ.K;
  const BEAT = BJ.BEAT, PI = Math.PI, frac = BJ.frac, seg = K.seg, paint = K.paint, tint = K.tint, off = K.off;
  const { NB, HOR, RING, FIN, CARET, CK1, CK2, NAVY, YEL, WHITE, MUTE } = K;
  BJ.scenes = [];

  // =========================================================== A · the sea
  // A real 3D sea plane below the horizon. A swim ring drops in; far away a fin
  // surfaces and closes in on the low strings, faster every stroke, then dives.
  const FS = {};
  function finAt(b) {
    let s = 0, lean = 0;
    for (const p of K.PULSE) { s += E.outCubic(seg(b, p, 0.5)); lean = Math.max(lean, hit(b, p, 3)); }
    s /= K.PULSE.length;
    const ys = lerp(0.2, 0.62, s), k = 1 / ys;
    FS.s = s; FS.ys = ys; FS.k = k; FS.Z = G.P * (1 - k); FS.lean = lean;
    FS.fx = lerp(0.36, 0.06, s) * G.W + 0.06 * G.W * Math.sin(PI * s);
    FS.X = FS.fx * k;
    FS.rise = 0.5 * E.outCubic(seg(b, K.FIN_UP, 0.8)) + 0.5 * s;
    FS.dive = E.inCubic(seg(b, K.DIVE, 0.55));
    FS.c = FS.rise * (1 - FS.dive);
    return FS;
  }
  K.finPan = (b) => { finAt(b); return clamp(FS.fx / (0.5 * G.W), -1, 1) * 0.8; };

  BJ.scenes.push({
    name: 'sea',
    beats: K.SEA_BEATS,
    frame(b) { finAt(b); },
    camera(b) {
      // a slow creep toward the float while the fin closes in, released with a jolt on the dive
      const creep = E.inOutSine(seg(b, K.FIN_UP, K.DIVE - K.FIN_UP)) * (1 - E.outCubic(seg(b, K.DIVE, K.SEA_BEATS - K.DIVE)));
      const j = BJ.wobble(b, K.DIVE + 0.05, 5, 7);
      return { s: 1 + 0.05 * creep, x: j * 0.012 * G.W, y: j * 0.008 * G.H };
    },
    pose(i, b, q) {
      const bt = b * BEAT, hc = G.hc;
      if (i < NB) {
        const d = K.SEA[i];
        const app = E.outCubic(seg(b, (19 - d.r) * 0.02, 0.6));
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
          X += Math.sign(dx) * e * wr * 0.4; lift += e * 6; grow += e * 0.3;
        }
        q.gy = hc; q.grx = PI / 2;
        q.x = X; q.y = d.Z; q.z = lift * d.k;
        q.w = d.len * d.k * app * (1 + grow); q.h = (d.ts * d.k * d.k * G.P) / hc;
        q.o = app; paint(q, WHITE);
        return;
      }
      if (i === HOR) { q.w = G.W * 1.2; q.h = 2; paint(q, NAVY); return; }
      if (i === RING) {
        // the site's float (ring + laptop) drops in, splashes, then bobs on its own loop
        if (b < K.DROP) return off(q);
        const R = K.RA, FL = K.FLOAT, p = seg(b, K.DROP, K.A_LAND - K.DROP), h = (R.S * R.k) / FL.ring;
        let z = lerp(R.zTop, 0, p * p);
        if (b > K.A_LAND) z = -R.S * R.k * 0.16 * BJ.wobble(b, K.A_LAND, 0.9, 1.8);
        const sq = hit(b, K.A_LAND, 4) * 0.12, landed = b >= K.A_LAND;
        q.gy = hc; q.grx = PI / 2;
        q.x = R.X; q.y = R.Z; q.z = z + (FL.water - 0.5) * h; q.rx = -PI / 2; q.ry = 0.05 * Math.sin(bt * 1.1);
        q.w = h * (1 + sq); q.h = h * (1 - sq);
        q.f = landed ? ((b - K.A_LAND) * BEAT * FL.fps) % FL.loop : 0;
        q.clip = landed ? 0.01 + 0.99 * E.outCubic(seg(b, K.A_LAND, 0.4)) : 0.01;
        return;
      }
      if (i === FIN) {
        // the site's shark: its own rise/sink frames, placed on the 3D sea and swimming in
        if (b < K.FIN_UP || (FS.rise < 0.002 && !FS.dive) || FS.dive >= 1) return off(q);
        const SK = K.SHARK, h = K.FINW.h / SK.fin;
        q.gy = hc; q.grx = PI / 2;
        q.x = FS.X; q.y = FS.Z; q.z = (SK.water - 0.5) * h;
        q.rx = -PI / 2; q.ry = 0.14 * FS.lean;
        q.h = h; q.w = h * SK.aspect;
        q.f = FS.dive > 0 ? SK.hold + (SK.down - 1 - SK.hold) * FS.dive : 1 + (SK.up - 1) * clamp(FS.rise);
        return;
      }
      off(q);
    },
    backdrop: (b) => ({ sea: E.inOutSine(seg(b, 0, 0.7)), y: 0 }),
    captions: [K.cap('Everything looks *calm.*', 0.35, K.FIN_UP - 0.1), K.cap('Until it *isn’t.*', K.FIN_UP + 1.0, K.DIVE + 0.2, { gap: 0.3 })],
    music(M) {
      const U = K.FIN_UP, L = K.A_LAND;
      M.pad(0, 'F3 C4 A4', U + 0.1, 0.36); M.sub(0, 'F2', U - 0.3, 0.2);
      M.ep(0.05, 'C5', 0.2); M.ep(0.7, 'A5', 0.13, 0.2);
      M.whoosh(K.DROP, 1.1, 0.05, 2600, 500);
      M.drop(L, 'C6', 0.3, -0.35); M.splash(L, 0.22); M.ep(L, 'F5', 0.26, -0.3);
      M.ep(L + 0.7, 'A5', 0.15, 0.25); M.ep(L + 1.4, 'G5', 0.13, -0.2); M.ep(L + 2.1, 'E5', 0.12, 0.2);
      M.drop(U, 'F4', 0.1, 0.7);
      M.pad(U + 0.2, 'D3 A3 D4', K.DIVE - U + 0.3, 0.2); M.sub(U + 0.4, 'D1', K.DIVE - U - 0.2, 0.28);
      K.PULSE.forEach((at, k) => {
        const gap = (K.PULSE[k + 1] || at + 0.4) - at, pan = K.finPan(at + 0.3);
        M.cello(at, k % 2 ? 'D2' : 'C#2', gap * 0.95, 0.3 + k * 0.035, pan);
        M.swish(at, 0.5, 0.04 + k * 0.012, pan);
      });
      M.swish(K.DIVE, 0.9, 0.16, 0); M.drop(K.DIVE + 0.05, 'D4', 0.16); M.boom(K.DIVE + 0.05, 0.22);
      M.whoosh(K.DIVE + 0.1, 1.2, 0.06, 300, 2600);
    },
  });

  // =========================================================== B · the spreadsheet
  // The sea plane stands up and becomes a sheet: rows become rows. The ring becomes the caret,
  // four risks get typed in. Then the colour drains out, and the file drifts out of sight.
  const REC = 7.0;
  const recede = (b) => E.inOutCubic(seg(b, REC, 3.5));
  function sheetG(q, b) {
    const r = recede(b);
    q.gy = 0.03 * G.H - 0.04 * G.H * r;
    q.gz = -1.15 * G.P * r;
    q.grx = 0.04 + 0.62 * r;
    q.gry = lerp(-0.16, -0.03, E.inOutSine(clamp(b / 7))) + 0.1 * r;
    q.grz = -0.05 * r;
  }
  function cellW(c, b) {
    const e = c.edit;
    if (!e || b < e.at - 0.1) return c.w;
    if (b < e.at + 0.12) return c.w * (1 - E.inCubic(seg(b, e.at - 0.1, 0.2)));
    return e.w2 * (Math.ceil(seg(b, e.at + 0.12, 0.48) * 7) / 7);
  }
  const mute = (b, r) => E.inOutSine(seg(b, 6.5 + (r + 1) * 0.035, 0.9));
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
  const selOn = (b) => seg(b, 2.0, 0.25) * (1 - seg(b, 6.3, 0.4));

  BJ.scenes.push({
    name: 'sheet',
    beats: 10.5,
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
      if (i === RING) {
        // the float drifts onto the first cell to edit and shrinks into the caret
        const c = cellOf(0);
        const s = (K.RA.S / K.FLOAT.ring) * (1 - E.inCubic(seg(b, 1.7, 0.5)));
        if (s < 0.5) return off(q);
        sheetG(q, b);
        q.x = c.left + c.w + 3; q.y = c.y; q.z = 3; q.w = q.h = s * 0.9;
        q.f = ((b + K.SEA_BEATS - K.A_LAND) * BEAT * K.FLOAT.fps) % K.FLOAT.loop;
        q.clip = 1 - seg(b, 0.2, 0.8);
        return;
      }
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
    backdrop: (b) => ({ sea: 1 - E.inOutSine(seg(b, 0, 1.6)), y: G.H * 0.5 * E.inCubic(seg(b, 0, 1.6)) }),
    captions: [
      {
        at: 1.2, to: 8.0, cls: 'meta',
        html: '<span class="fn">risk-register_FINAL_v7 (2).xlsx</span><span class="ed">Last edited 14 months ago</span>',
        place: () => ({ top: Math.max(22, G.cy + 0.03 * G.H - K.SH.cardH / 2 - 22) + 'px' }),
        update(el, b, uc) {
          if (!uc.e) uc.e = el.querySelector('.ed');
          const t = seg(b, 6.7, 0.6), key = Math.round(t * 100);
          if (uc.k !== key) { uc.k = key; uc.e.style.opacity = t; uc.e.style.transform = 'translate(-50%,' + ((1 - E.outCubic(t)) * 0.4).toFixed(3) + 'em)'; }
        },
      },
      K.cap('Most risks live in a *spreadsheet.*', 2.2, 6.6),
      K.cap('Out of date. Out of *sight.*', 6.9, 10.2, { gap: 0.2 }),
    ],
    music(M) {
      M.pad(0.2, 'D3 F3 A3 D4', 6.4, 0.26); M.sub(0.2, 'D2', 6.4, 0.2);
      for (let r = 0; r < 20; r += 2) M.tick(0.4 + r * 0.07, 0.03, (r / 19 - 0.5) * 0.6);
      M.marimba(1.9, 'D5', 0.2, -0.2); M.marimba(2.25, 'A5', 0.12, 0.2);
      K.EDITS.forEach(([, j, at], k) => {
        const pan = (j / 4 - 0.5) * 0.8;
        M.tick(at - 0.3, 0.05, pan);
        for (let n = 0; n < 4; n++) M.tick(at + 0.15 + n * 0.11, 0.07, pan);
        M.ep(at + 0.6, ['A5', 'C6', 'G5', 'F5'][k], 0.18, pan);
      });
      M.pad(6.6, 'Bb2 F3 A3 D4', 1.8, 0.22);
      M.pad(7.8, 'G2 D3 Bb3 D4', 2.9, 0.2); M.sub(7.8, 'G1', 2.7, 0.2);
      ['D5', 'C5', 'Bb4', 'A4', 'G4'].forEach((n, k) => M.ep(7.8 + k * 0.45, n, 0.13 - k * 0.01, (k - 2) * 0.3));
      M.whoosh(REC + 0.2, 2.8, 0.05, 1400, 200);
    },
  });
})();
