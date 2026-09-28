/* Film, part 3: C · the risk board, D · the lens. */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, clamp = BJ.clamp, lerp = BJ.lerp, hit = BJ.hit, K = BJ.K;
  const BEAT = BJ.BEAT, PI = Math.PI, seg = K.seg, paint = K.paint, tint = K.tint, off = K.off;
  const { NB, LENS, CK1, CK2, NAVY, YEL, WHITE, PALE } = K;

  // =========================================================== C · the risk board
  // A 5 × 5 likelihood/impact landscape. Every risk is a plate stacked on its cell.
  // Then every measure lifts a plate off a hot stack and sets it down somewhere cooler.
  const boardG = (q, b) => { q.gy = 0.07 * G.H; q.grx = 0.98; q.grz = -PI / 4 + 0.12 * Math.sin(b * BEAT * 0.35); };
  const cStart = (i) => {
    if (i < 25) return 0.3 + (Math.floor(i / 5) + (i % 5)) * 0.07;
    if (i < NB) { const p = K.PL[K.CM[i - 25]]; return 1.1 + p.k * 0.4 + (p.I + p.L) * 0.018; }
    return 0;
  };
  const cDur = (i) => (i < 25 ? 1.0 : 0.85);
  const count = new Float32Array(25);
  function scoreAt(b) {
    let s = 0;
    count.fill(0);
    K.PL.forEach((p, n) => {
      if (b < cStart(25 + n) + cDur(25 + n) * 0.4) return;
      const moved = p.mv && b >= p.launch + K.FLY * 0.8;
      s += moved ? p.ds : p.s;
      count[moved ? p.dI * 5 + p.dL : p.I * 5 + p.L]++;
    });
    return s;
  }
  K.scoreAt = scoreAt;

  BJ.scenes.push({
    name: 'board',
    beats: 12.5,
    camera: (b) => ({ s: 1 + 0.03 * hit(b, K.PILL, 2.5, 0.1) }),
    blend: { start: cStart, dur: cDur, ease: E.outBack, gease: E.outCubic },
    frame(b) { scoreAt(b); },
    pose(i, b, q) {
      const Tp = K.Tp;
      if (i < 25) {
        const I = Math.floor(i / 5), L = i % 5;
        boardG(q, b);
        q.x = (L - 2) * Tp; q.y = (2 - I) * Tp; q.w = q.h = 0.94 * Tp;
        q.o = 0.13 + 0.17 * Math.min(1, count[i] / 3);
        paint(q, K.heat((I + 1) * (L + 1)));
        return;
      }
      if (i < NB) {
        const p = K.PL[K.CM[i - 25]];
        boardG(q, b);
        let x = (p.L - 2) * Tp, y = (2 - p.I) * Tp, z = K.gap * (p.k + 1), rz = 0;
        if (p.mv && b > p.launch) {
          const f = seg(b, p.launch, K.FLY), e = E.inOutCubic(f);
          x = lerp(x, (p.dL - 2) * Tp, e); y = lerp(y, (2 - p.dI) * Tp, e);
          z = lerp(z, K.gap * (p.kd + 1), e) + Math.sin(PI * f) * Tp * 1.4;
          rz = e * (PI / 2) * p.dir;
          tint(q, K.heat(p.s), K.heat(p.ds), e);
        } else paint(q, K.heat(p.s));
        const lv = p.mv && b > p.launch + K.FLY * 0.5 ? p.kd : p.k;
        if (lv % 2) tint(q, [q.r, q.g, q.b], WHITE, 0.18);
        const pop = p.mv ? hit(b, p.launch + K.FLY, 5) * 0.25 : 0;
        q.x = x; q.y = y; q.z = z; q.rz = rz; q.w = q.h = 0.6 * Tp * (1 + pop);
        return;
      }
      off(q);
    },
    captions: [
      K.cap('*Risqui* maps every risk.', 1.2, 5.4),
      {
        at: 1.0, to: 12.1, cls: 'score',
        html: '<span class="lab">Risk score</span><span class="num">0</span><span class="pill">−' + Math.round((1 - K.S1 / K.S0) * 100) + '%</span>',
        place: () => ({ top: Math.max(56, G.H * 0.09) + 'px' }),
        update(el, b, uc) {
          if (!uc.n) { uc.n = el.querySelector('.num'); uc.p = el.querySelector('.pill'); }
          const v = scoreAt(b);
          if (uc.v !== v) { uc.v = v; uc.n.textContent = v.toLocaleString('en-US'); }
          const pp = seg(b, K.PILL, 0.5), key = Math.round(pp * 100);
          if (uc.pk !== key) { uc.pk = key; uc.p.style.opacity = E.outCubic(pp); uc.p.style.transform = 'scale(' + (0.6 + 0.4 * E.outBack(pp)).toFixed(3) + ')'; }
        },
      },
      K.cap('Every measure brings it *down.*', 5.9, 12.1),
    ],
    music(M) {
      M.pad(0.2, 'F3 A3 C4 F4', 6, 0.24); M.sub(0.2, 'F1', 6, 0.22);
      M.whoosh(0, 1.2, 0.07, 200, 1800);
      const UP = ['F4', 'A4', 'C5', 'F5', 'A5', 'C6', 'D6', 'F6', 'A6', 'C7'];
      const maxK = Math.max(...K.PL.map((p) => p.k));
      for (let k = 0; k <= maxK; k++) { const t = 1.1 + k * 0.4 + 0.2; M.marimba(t, UP[k], 0.16 - k * 0.008, ((k % 3) - 1) * 0.4); M.kick(t, 0.14 + k * 0.012); }
      M.pad(K.MSTART - 0.2, 'D3 F3 A3 C4', 3, 0.22); M.sub(K.MSTART - 0.2, 'D2', 3, 0.18);
      const DOWN = ['C6', 'A5', 'G5', 'F5', 'D5', 'C5', 'A4', 'G4', 'F4', 'D4', 'C4', 'A3'];
      K.PL.filter((p) => p.mv).forEach((p, n) => {
        const t = p.launch + K.FLY, pan = ((p.dL - p.dI) / 4) * 0.7;
        M.tick(t, 0.045, pan);
        if (n % 5 === 0) M.ep(t, DOWN[Math.min(DOWN.length - 1, n / 5)], 0.13, pan);
      });
      M.pad(K.MSTART + 2.8, 'Bb2 F3 A3 D4', K.PILL - K.MSTART - 2.8, 0.22);
      M.bell(K.PILL, 'F6', 0.16); M.ep(K.PILL, 'F5', 0.2); M.kick(K.PILL, 0.3);
      M.pad(K.PILL, 'F3 A3 C4 E4', 12.5 - K.PILL, 0.26); M.sub(K.PILL, 'F1', 12.5 - K.PILL, 0.22);
    },
  });

  // =========================================================== D · the lens
  // The board folds into a page. The lens from the logo reads it and finds what
  // was missed; then the same page reflows for each framework.
  const pageG = (q, b) => { q.gy = 0.01 * G.H; q.grx = 0.34; q.gry = -0.26 + 0.36 * E.inOutSine(clamp(b / 12)); q.grz = 0.03; };
  const LS = { x: 0, y: 0, z: 0 };
  function lensAt(b) {
    const PG = K.PG;
    K.track(PG.keys, b, LS);
    const ent = 1 - E.outCubic(seg(b, 0.8, 1.5));
    LS.rz = -0.08 + 0.5 * ent + 0.03 * Math.sin(b * BEAT * 1.3);
    LS.ry = -0.6 * ent;
    const c = Math.cos(LS.rz), s = Math.sin(LS.rz);
    LS.gcx = LS.x; LS.gcy = LS.y;
    LS.ex = LS.x - (PG.gox * c - PG.goy * s); LS.ey = LS.y - (PG.gox * s + PG.goy * c);
    LS.on = seg(b, 2.0, 0.5) * (1 - seg(b, 6.3, 0.5));
    LS.o = b < 0.8 || b > 11.95 ? 0 : 1;
    LS.z += 0.008 * G.S * Math.sin(b * BEAT * 2);
    return LS;
  }
  function wordAt(p, b, q) {
    const PG = K.PG, l = Math.floor(p / 5), j = p % 5, a = PG.WL[0][p];
    let x = a.x, w = a.w;
    for (let k = 0; k < 3; k++) {
      const e = E.inOutCubic(seg(b, K.FL[k] + l * 0.022, 0.55)), c = PG.WL[k + 1][p];
      x = lerp(x, c.x, e); w = lerp(w, c.w, e);
    }
    let y = a.y, h = a.h, o = a.o, yel = 0;
    for (const f of K.FOUND) if (f.l === l && f.j === j) yel = E.snap(seg(b, f.at, 0.3)) * (1 - seg(b, 6.6, 0.4));
    K.MATCH.forEach((set, k) => {
      for (const [ml, mj] of set) if (ml === l && mj === j) yel = Math.max(yel, seg(b, K.FL[k] + 0.6, 0.2) * (1 - seg(b, K.FL[k] + 1.45, 0.3)));
    });
    h = lerp(h, PG.lp * 0.62, yel); o = lerp(o, 1, yel);
    let z = 0.6;
    if (LS.on > 0) {
      const dx = x - LS.gcx, dy = y - LS.gcy, m = (1 - K.smooth(PG.gr * 0.45, PG.gr * 1.25, Math.hypot(dx, dy))) * LS.on;
      if (m > 0) { const s = 1 + 0.4 * m; x = LS.gcx + dx * s; y = LS.gcy + dy * s; w *= s; h *= s; o = lerp(o, Math.max(o, 0.95), m); z += 1.5 * m; }
    }
    q.x = x; q.y = y; q.z = z; q.w = w; q.h = h; q.o = o;
    tint(q, NAVY, YEL, yel);
  }
  K.wordAt = wordAt;

  BJ.scenes.push({
    name: 'lens',
    beats: 12,
    blend: {
      start: (i) => (i < 25 ? 0.25 : i < NB ? 0.05 + ((i - 25) % 5) * 0.03 + Math.floor((i - 25) / 5) * 0.02 : 0),
      dur: (i) => (i < 25 ? 1.3 : 1.25),
      ease: E.inOutCubic,
      gease: E.inOutCubic,
    },
    frame(b) { lensAt(b); },
    pose(i, b, q) {
      const PG = K.PG;
      if (i < 25) {
        // the board's 5 × 5 tiles close ranks into one sheet of paper
        const I = Math.floor(i / 5), L = i % 5, cw = PG.PW / 5, ch = PG.PH / 5;
        pageG(q, b);
        q.x = (L - 2) * cw; q.y = (2 - I) * ch; q.w = cw + 1.5; q.h = ch + 1.5;
        paint(q, WHITE);
        return;
      }
      if (i === CK1) { pageG(q, b); q.x = 0.035 * PG.PW; q.y = -0.03 * PG.PH; q.z = -5; q.w = PG.PW; q.h = PG.PH; paint(q, PALE); q.o = seg(b, 1.0, 0.8); return; }
      if (i === CK2) { pageG(q, b); q.x = 0.012 * PG.PW; q.y = 0.02 * PG.PH; q.z = -9; q.w = PG.PW; q.h = PG.PH; q.o = 0.07 * seg(b, 1.0, 0.8); paint(q, NAVY); return; }
      if (i < NB) { pageG(q, b); wordAt(i - 25, b, q); return; }
      if (i === LENS) {
        if (!LS.o) return off(q);
        pageG(q, b);
        q.x = LS.ex; q.y = LS.ey; q.z = LS.z; q.rz = LS.rz; q.ry = LS.ry;
        q.w = PG.LW; q.h = PG.LH;
        return;
      }
      off(q);
    },
    captions: [
      K.cap('A.I. that spots what you *missed.*', 1.8, 6.7),
      {
        at: 7.0, to: 11.8, cls: 'flipcap',
        html: '<span class="pre">Ready for</span> <span class="flip"><span>ISO 27001</span><span>NEN 7510</span><span>ISO 42001</span></span>',
        update(el, b, uc) {
          if (!uc.s) uc.s = el.querySelectorAll('.flip > span');
          uc.s.forEach((s, k) => {
            const inn = E.outCubic(seg(b, K.FL[k] - 0.05, 0.4)), out = k < 2 ? E.inCubic(seg(b, K.FL[k + 1] - 0.05, 0.3)) : 0;
            const key = Math.round(inn * 100) * 1000 + Math.round(out * 100);
            if (s._k === key) return;
            s._k = key;
            s.style.opacity = inn * (1 - out);
            s.style.transform = 'rotateX(' + ((1 - inn) * -90 + out * 90).toFixed(1) + 'deg)';
          });
        },
      },
    ],
    music(M) {
      M.whoosh(0, 1.3, 0.06, 400, 4000);
      M.pad(0.3, 'F3 A3 C4 E4', 6.8, 0.26); M.sub(0.3, 'F2', 6.6, 0.18);
      M.whoosh(0.8, 1.4, 0.05, 3000, 600);
      M.ep(1.8, 'C5', 0.14); M.ep(2.6, 'E5', 0.12, 0.2);
      K.FOUND.forEach((f, k) => M.bell(f.at, ['C6', 'E6', 'G6', 'A6'][k], 0.18, (f.j / 4 - 0.5) * 0.8));
      const CH = [['F3 A3 C4 F4', 'F2', 'F5 A5 C6'], ['A2 E3 A3 C4', 'A1', 'E5 A5 C6'], ['Bb2 F3 Bb3 D4', 'Bb1', 'F5 Bb5 D6']];
      CH.forEach(([pad, bass, arp], k) => {
        const at = K.FL[k], len = k < 2 ? K.FL[k + 1] - at : 1.6;
        M.pad(at, pad, len, 0.26); M.sub(at, bass, len, 0.2); M.kick(at, 0.26);
        arp.split(' ').forEach((n, q) => M.ep(at + 0.1 + q * 0.2, n, 0.14, (q - 1) * 0.4));
        K.MATCH[k].forEach(([, mj], q) => M.marimba(at + 0.6 + q * 0.08, ['C6', 'D6', 'F6'][q], 0.1, (mj / 4 - 0.5) * 0.8));
      });
    },
  });
})();
