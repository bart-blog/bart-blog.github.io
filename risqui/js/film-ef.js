/* Film, part 4: E · the audit trail, F · the finale (the risqui.nl hero). */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, clamp = BJ.clamp, lerp = BJ.lerp, hit = BJ.hit, K = BJ.K;
  const BEAT = BJ.BEAT, PI = Math.PI, seg = K.seg, paint = K.paint, tint = K.tint, off = K.off;
  const { NB, HOR, RING, FIN, LENS, LOGO, SUN, CK1, CK2, NAVY, YEL, WHITE, MID } = K;

  // =========================================================== E · the audit trail
  // Every line becomes a log entry. Then all 95 fly into a seal around the sun.
  const logG = (q, b) => { q.grx = 0.2 - 0.1 * E.inOutSine(clamp(b / 5)); q.gry = 0.14 - 0.2 * E.inOutSine(clamp(b / 6)); };
  const sealG = (q, b, spin) => { q.gy = -0.01 * G.H; q.grz = spin ? (b - K.SEAL_AT) * 0.05 : 0; q.gs = 1 + 0.06 * hit(b, K.SEAL_HIT, 3); };
  let scroll = 0;
  const a = {}, s = {};
  function logPose(p, b, q) {
    const LG = K.LG, f = LG.f[p], y = (f.m - 4 - scroll) * LG.rp;
    logG(q, b);
    q.x = f.x; q.y = y; q.w = f.w; q.h = f.h; q.z = 0.6;
    q.o = f.o * clamp(1 - (Math.abs(y / LG.rp) - 3.4) / 1.4);
    if (f.j === 0) {
      const t = f.m >= 9 ? K.STEPS[f.m - 9] : -9;
      tint(q, MID, YEL, f.m >= 9 ? hit(b, t, 0.9) : f.m === 8 ? 1 : 0);
      q.w = q.h = f.w * (1 + 0.5 * hit(b, t, 4));
    } else paint(q, f.c);
  }
  function sealPose(j, b, q) {
    const r = K.SL.rays[j];
    sealG(q, b, true);
    q.x = r.x; q.y = r.y; q.w = r.w; q.h = r.h; q.rz = r.rz;
    paint(q, YEL);
  }
  function check(c, e, b, q) {
    if (e <= 0) return off(q);
    sealG(q, b, false);
    const len = c.len * e;
    q.x = c.sx + (c.ux * len) / 2; q.y = c.sy + (c.uy * len) / 2; q.z = 1;
    q.w = len; q.h = c.t; q.rz = c.rz;
    paint(q, NAVY);
  }

  BJ.scenes.push({
    name: 'audit',
    beats: 10,
    blend: {
      start: (i) => (i < 25 ? 0.05 : i < NB ? 0.1 + Math.floor((i - 25) / 5) * 0.02 : 0),
      dur: (i) => (i < 25 ? 1.1 : 1.0),
      ease: E.inOutCubic,
      gease: E.inOutCubic,
    },
    frame(b) { scroll = 0; for (const t of K.STEPS) scroll += E.outCubic(seg(b, t, 0.28)); },
    pose(i, b, q) {
      const LG = K.LG;
      if (i < 25) {
        // the page's 25 slices re-tile into the log card, then fall away behind the seal
        const g = seg(b, K.SEAL_AT + 0.1, 0.7), I = Math.floor(i / 5), L = i % 5, cw = LG.LW / 5, ch = (10 * LG.rp) / 5;
        logG(q, b);
        q.gs = 1 - 0.25 * g; q.z = -0.2 * G.S * g;
        q.x = (L - 2) * cw; q.y = (2 - I) * ch; q.w = cw + 1.5; q.h = ch + 1.5; q.o = 1 - g;
        paint(q, WHITE);
        return;
      }
      if (i < NB) {
        const p = i - 25, e = E.outQuint(seg(b, K.SEAL_AT + (p / 95) * 0.7, 1.0));
        logPose(p, b, q);
        if (e <= 0) return;
        K.copy(a, q);
        BJ.resetPose(s); sealPose(p, b, s);
        if (a.o < 0.02) { K.copy(a, s); a.w = 0; a.o = 0; }
        K.mix(q, a, s, e);
        q.z += Math.sin(PI * e) * 0.08 * G.S;
        return;
      }
      if (i === SUN) {
        const g = E.outBack(seg(b, K.SEAL_AT, 0.8));
        if (g <= 0) return off(q);
        sealG(q, b, false);
        q.w = q.h = 2 * K.SL.dr * g; q.z = -1;
        paint(q, YEL);
        return;
      }
      if (i === CK1) return check(K.SL.c1, E.outCubic(seg(b, 5.8, 0.25)), b, q);
      if (i === CK2) return check(K.SL.c2, E.outCubic(seg(b, 6.02, 0.3)), b, q);
      off(q);
    },
    camera: (b) => ({ s: 1 + 0.02 * hit(b, K.SEAL_HIT, 2.5, 0.1) * (1 - seg(b, 9.2, 0.8)) }),
    captions: [K.cap('Every change, *recorded.*', 1.0, 4.9), K.cap('Always *audit-ready.*', 6.2, 9.7)],
    music(M) {
      M.pad(0.2, 'D3 F3 A3 C4', 5, 0.22); M.sub(0.2, 'D2', 4.8, 0.18);
      const N = ['A4', 'C5', 'D5', 'F5', 'E5', 'D5', 'C5', 'A4', 'C5'];
      K.STEPS.forEach((t, k) => { M.tick(t, 0.09, ((k % 3) - 1) * 0.4); M.marimba(t, N[k], 0.1, 0.2); });
      M.whoosh(4.9, 1.2, 0.08, 300, 3500);
      M.pad(5.2, 'Bb2 F3 A3 D4', 1.0, 0.22);
      M.tick(5.8, 0.1); M.tick(6.02, 0.12);
      M.pad(K.SEAL_HIT, 'C3 G3 C4 E4', 3.8, 0.28); M.sub(K.SEAL_HIT, 'C2', 3.8, 0.24);
      M.kick(K.SEAL_HIT, 0.4); M.bell(K.SEAL_HIT, 'C6', 0.18); M.bell(K.SEAL_HIT + 0.05, 'G6', 0.1); M.ep(K.SEAL_HIT, 'E5', 0.2);
    },
  });

  // =========================================================== F · finale
  // The seal becomes the sun of risqui.nl, the sea returns, and the lens
  // settles into its place in the logo: the q.
  BJ.scenes.push({
    name: 'finale',
    beats: 13,
    camera: (b) => ({ s: 1 + 0.018 * hit(b, K.DOCK, 2.5, 0.1) }),
    blend: {
      start: (i) => (i >= 25 && i < NB ? 0.1 + ((i - 25) % 10) * 0.04 : 0.1),
      dur: () => 1.7,
      ease: E.inOutCubic,
      gease: E.inOutCubic,
    },
    pose(i, b, q) {
      const HR = K.HR, bt = b * BEAT;
      if (i >= 25 && i < NB) {
        const k = K.TM[i - 25], t = HR.T[k];
        if (k < 0) return off(q);
        q.x = t.x + (t.ph !== undefined ? Math.sin(bt * 0.4 + t.ph) * 0.006 * G.W : 0);
        q.y = t.y; q.z = t.z; q.w = t.w; q.h = t.h;
        paint(q, t.c);
        return;
      }
      if (i === SUN) { q.y = HR.sunY; q.w = q.h = HR.sunD; paint(q, YEL); return; }
      if (i === HOR) {
        const g = E.outCubic(seg(b, 0.6, 1.4));
        if (g <= 0) return off(q);
        q.y = HR.waterY; q.w = G.W * 1.2 * g; q.h = 2; paint(q, NAVY);
        return;
      }
      if (i === RING) {
        const g = E.outBack(seg(b, 1.4, 0.7));
        if (g <= 0) return off(q);
        const FL = K.FLOAT, h = HR.ringS / FL.ring;
        q.x = -0.3 * G.W; q.y = HR.waterY - (FL.water - 0.5) * h;
        q.w = q.h = h * g;
        q.f = (Math.max(0, b - 1.4) * BEAT * FL.fps) % FL.loop;
        q.clip = E.outCubic(seg(b, 1.7, 0.6));
        return;
      }
      if (i === FIN) {
        // rises like on the site, then keeps circling on its held frames
        if (b < 1.8) return off(q);
        const SK = K.SHARK, h = HR.finH / SK.fin, rise = seg(b, 1.8, 1.4);
        q.x = (G.W < 1.1 * G.H ? 0.34 : 0.3) * G.W + 0.03 * G.W * Math.sin(bt * 0.35); q.y = HR.waterY - (SK.water - 0.5) * h;
        q.h = h; q.w = h * SK.aspect;
        q.f = rise < 1 ? 1 + (SK.up - 1) * rise : SK.up + ((b - 3.2) * BEAT * 30) % (SK.hold - SK.up);
        return;
      }
      if (i === LOGO) {
        const o = E.outCubic(seg(b, 2.6, 1.0));
        if (o <= 0) return off(q);
        const sq = 1 + 0.025 * BJ.wobble(b, K.DOCK, 1.5, 4);
        q.y = HR.logoY + 14 * (1 - o); q.w = HR.Lw * sq; q.h = HR.Lh / sq; q.o = o;
        return;
      }
      if (i === LENS) {
        if (b < 2.6) return off(q);
        const e = E.inOutCubic(seg(b, 2.6, K.DOCK - 2.6)), u = 1 - e, sq = 1 + 0.04 * BJ.wobble(b, K.DOCK, 1.5, 4);
        q.x = HR.qx + u * 0.35 * G.W; q.y = HR.qy - u * 0.4 * G.H + Math.sin(PI * e) * -0.06 * G.H; q.z = u * 0.5 * G.S;
        q.rz = u * 0.9; q.ry = u * -0.7;
        const sc = 1 + 0.8 * u;
        q.w = HR.qw * sc * sq; q.h = HR.qh * sc / sq;
        return;
      }
      off(q);
    },
    backdrop: (b) => ({ sea: 1, y: lerp(G.H - G.cy, K.HR.waterY, E.outCubic(seg(b, 0.5, 1.6))) }),
    captions: [
      K.cap('See risk *coming.*', 5.4, Infinity, { gap: 0.2, place: () => ({ top: 0.585 * G.H + 'px' }) }),
      {
        at: 8.0, to: Infinity, cls: 'link',
        html: '<a href="https://www.risqui.nl" target="_blank" rel="noopener">Start your free trial</a><small><b>risqui.nl</b> · 30 days free · No credit card</small>',
        place: () => ({ top: 0.69 * G.H + 'px' }),
      },
    ],
    music(M) {
      M.whoosh(0, 1.8, 0.06, 300, 2000);
      M.pad(0.1, 'F3 A3 C4 F4', 4.4, 0.26); M.sub(0.1, 'F2', 4.4, 0.2);
      M.ep(0.8, 'C5', 0.16, -0.2); M.ep(1.6, 'F5', 0.14, 0.2); M.ep(2.4, 'A5', 0.14);
      M.drop(1.4, 'C6', 0.12, -0.5); M.drop(1.9, 'A5', 0.08, 0.5);
      M.whoosh(2.8, 1.7, 0.08, 500, 3500);
      const D = K.DOCK;
      M.boom(D, 0.3); M.kick(D, 0.4); M.bell(D, 'F6', 0.2); M.ep(D, 'F5', 0.24); M.ep(D, 'A5', 0.16);
      M.pad(D, 'F2 C3 A3 C4 F4', 6, 0.3); M.sub(D, 'F1', 6, 0.26);
      M.ep(5.5, 'C6', 0.14, 0.2); M.ep(6.5, 'A5', 0.12, -0.2);
      M.bell(8.0, 'C6', 0.1);
      M.pad(10.5, 'Bb2 F3 A3 D4', 1.2, 0.2); M.pad(11.7, 'F3 A3 C4 F4', 2.3, 0.22); M.ep(11.7, 'F5', 0.12); M.sub(11.7, 'F1', 2.3, 0.16);
    },
  });
})();
