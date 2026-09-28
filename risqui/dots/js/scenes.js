/* Risqui — a short film in 150 dots.
   One yellow dot is the thing worth protecting. It falls into the sea, and
   the other 149 play everything else: the water, the fin, the spreadsheet,
   the calendar, the risk matrix, the lens, the standards, the flag, the log,
   and finally the Risqui wordmark, with the yellow dot rising as its sun.
   Every scene defines:
     pose(r, t, b, o)  where role r should be at local time t (s) / b (beats)
     blend            how dots travel from the previous formation
     captions         copy, timed in beats
     music(M)         the score, timed in the same beats as the choreography */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, hit = BJ.hit, clamp = BJ.clamp, lerp = BJ.lerp;
  const wob = BJ.wobble, antic = BJ.antic;
  const N = BJ.N, GA = BJ.GA, TAU = BJ.TAU, frac = BJ.frac, SH = BJ.SHAPES;

  const hide = (o) => { o.sx = o.sy = 0; o.o = 0; };
  const half = () => Math.min(G.W * 0.46, G.R * 2.6);
  const maxHit = (b, times, decay) => { let e = 0; for (const t of times) e = Math.max(e, hit(b, t, decay)); return e; };
  function perLayout(fn) {
    let v = -1, val;
    return () => { if (v !== G.version) { v = G.version; val = fn(); } return val; };
  }
  // sunflower offset for seed k of n inside radius rad (seed 0 at the centre)
  function seed(k, n, rad, turn = 0) {
    const r = n > 1 ? rad * Math.sqrt(k / (n - 0.5)) : 0, th = k * GA + turn;
    return [Math.cos(th) * r, Math.sin(th) * r];
  }
  const HERO = 1.6, BUOY = 1.35;

  // =========================================================== the sea
  // A waterline of dots (plus a few deeper rows), the fin, the buoy. Shared by
  // the opening, the return, and the signature.
  const seaY = () => Math.min(G.R * 0.42, (G.textY - G.cy) * 0.36);
  const waterRows = {};
  function water(n) {
    const key = n + ':' + G.version;
    if (waterRows[n] && waterRows[n].key === key) return waterRows[n].pts;
    const sp = G.dot * 1.25, span = G.W * 1.08, per = Math.max(20, Math.ceil(span / sp)), pts = [];
    let left = n, row = 0;
    while (left > 0) {
      const c = Math.min(left, per);
      for (let k = 0; k < c; k++) pts.push({ x: -span / 2 + ((k + (row % 2 ? 0.75 : 0.25)) * span) / c, row });
      left -= c; row++;
    }
    waterRows[n] = { key, pts };
    return pts;
  }
  const swell = (x, b, row = 0) =>
    G.R * 0.022 * (1 - 0.25 * row) * Math.sin((x * TAU) / (G.R * 1.7) - b * 0.95 + row * 0.8) +
    G.R * 0.008 * Math.sin((x * TAU) / (G.R * 0.6) + b * 1.7);
  const waterY = (x, b) => seaY() + swell(x, b);

  const FIN_ROWS = [5, 4, 4, 3, 2, 1];
  const FIN = (function () {
    const pts = [];
    FIN_ROWS.forEach((n, k) => {
      const v = k / (FIN_ROWS.length - 1);
      const xl = -0.5 + 0.72 * Math.pow(v, 1.4), xt = 0.34 - 0.12 * v;
      for (let j = 0; j < n; j++) pts.push({ u: lerp(xl, xt, n === 1 ? 0.5 : j / (n - 1)), v });
    });
    return pts;
  })();
  const finB = () => Math.min(G.R * 0.55, half() * 0.42);
  // fin dot j at base x fx, surfaced by `rise` (0 under water, 1 fully up)
  // face: 1 swims left, −1 swims right, 0 edge-on; sc: depth scale; lean: tip offset (× width)
  function finPose(j, fx, rise, b, o, face = 1, sc = 1, lean = 0) {
    const B = finB() * sc, h = B * 0.95, p = FIN[j], d = B * 0.17;
    const base = waterY(fx, b) - d * 0.45 + (1 - rise) * h * 1.2;
    o.x = fx + (p.u * face + lean * p.v) * B;
    o.y = base - p.v * h;
    const k = clamp((waterY(o.x, b) - o.y) / (d * 0.6) + 0.35);
    o.sx = o.sy = (d / G.dot) * E.outCubic(k);
    if (k <= 0) o.o = 0;
  }
  function waterPose(k, n, b, o, born = 1) {
    const p = water(n)[k];
    o.x = p.x;
    o.y = seaY() + swell(p.x, b, p.row) + p.row * G.dot * 1.3;
    o.sx = o.sy = 0.55 * (1 - 0.13 * p.row) * born;
    o.o = Math.max(0.28, 1 - 0.3 * p.row);
    return p;
  }
  function buoy(b, x) {
    return { x, y: waterY(x, b) - G.dot * BUOY * 0.28 + G.R * 0.006 * Math.sin(b * 1.9) };
  }
  // what the lens does to a point: magnify around its centre
  function magnify(o, lx, ly, rl) {
    const dx = o.x - lx, dy = o.y - ly, d2 = dx * dx + dy * dy;
    if (rl <= 0 || d2 >= rl * rl) return 1;
    const f = 1 + 0.45 * (1 - d2 / (rl * rl));
    o.x = lx + dx * f; o.y = ly + dy * f;
    o.sx *= f; o.sy *= f;
    return f;
  }

  // =========================================================== 1 · something to protect
  const S1 = {
    name: 'core',
    beats: 12,
    blend: { dur: 0.01 },
    pose(r, t, b, o) {
      if (r) return hide(o);
      const BIG = [1, 5, 9], SMALL = [3, 7, 11];
      let big = 0, small = 0, pre = 0, jel = 0;
      for (const at of BIG) { big += hit(b, at, 3.2, 0.02); pre += antic(b, at, 0.35); jel += wob(b, at, 2.2, 4.5); }
      for (const at of SMALL) { small += hit(b, at, 6, 0.02); jel += 0.4 * wob(b, at, 3, 7); }
      const s = HERO * (1 + 0.5 * big + 0.16 * small - 0.14 * pre);
      o.sx = s * (1 + 0.16 * jel + 0.06 * pre); o.sy = s * (1 - 0.16 * jel - 0.08 * pre);
      o.y = -G.R * 0.04 * big + G.R * 0.012 * pre;
      o.c = 1;
    },
    captions: [{ at: 1.6, to: 11.4, text: 'Every organisation has something to protect.' }],
    music(M) {
      M.pad(1, 'F3 C4 A4', 11, 0.45);
      M.sub(1, 'F2', 10, 0.3);
      M.ep(1, 'F5', 0.55); M.ep(3, 'C6', 0.16);
      M.ep(5, 'C5', 0.5); M.ep(7, 'G5', 0.16);
      M.ep(9, 'A5', 0.5); M.ep(11, 'F6', 0.16);
    },
  };

  // =========================================================== 2 · calm water
  // The yellow dot drops into the sea and becomes a buoy. The ripple of its
  // splash draws the waterline. Then a fin surfaces — the risk nobody saw.
  // It moves only on the bass: every note is one stroke of the tail. The
  // strokes come faster, the fin closes in, circles the buoy, and dives.
  const SPLASH = 1.75, W2 = 130, FIN2 = 10.3, DIVE2 = 19.15;
  const PULSE2 = [11, 12.4, 13.6, 14.6, 15.4, 16.05, 16.6, 17.05, 17.45, 17.8, 18.1, 18.38, 18.62, 18.84, 19.04];
  const APPROACH2 = 5;
  function stroke2(b) {
    let s = 0, push = 0;
    for (let k = 0; k < PULSE2.length; k++) {
      const p = PULSE2[k], gap = (PULSE2[k + 1] || p + 0.35) - p;
      s += 0.55 * E.outCubic(clamp((b - p) / Math.min(0.6, gap))) + 0.45 * clamp((b - p) / gap);
      push = Math.max(push, hit(b, p, 5));
    }
    return { s, push };
  }
  // path position → place on the water: a long approach, then a tightening circle round the buoy
  function fin2At(s) {
    const H = half();
    if (s <= APPROACH2) {
      const u = s / APPROACH2;
      return { x: lerp(1.02, 0, u) * H, d: lerp(-0.6, 1, E.inOutSine(u)), face: 1 };
    }
    const n = PULSE2.length - APPROACH2, k = Math.min(s - APPROACH2, n), th = Math.PI / 2 + (k / n) * TAU;
    return { x: lerp(0.5, 0.24, k / n) * H * Math.cos(th), d: Math.sin(th), face: Math.sin(th) };
  }
  const fin2Rise = (b) => E.outCubic(clamp((b - FIN2) / 1.6)) * (1 - E.inCubic(clamp((b - DIVE2) / 0.45)));
  function fin2(b) {
    const st = stroke2(b), f = fin2At(st.s);
    f.push = st.push; f.rise = fin2Rise(b); f.sc = 1 + 0.2 * f.d;
    return f;
  }
  // the bow wave the fin pushes ahead of it
  function bow2(x, b, f) {
    if (b < FIN2) return 0;
    const dx = (x - f.x) / (finB() * 0.9);
    return G.R * 0.035 * f.rise * (0.6 + 0.4 * f.sc) * (1 + 1.4 * f.push) * Math.exp(-dx * dx);
  }
  const S2 = {
    name: 'sea',
    beats: 20,
    blend: { dur: 0.01 },
    backdrop: (b) => ({ sea: E.inOutSine(clamp((b - SPLASH) / 2.2)), y: seaY() + G.dot * 0.3 }),
    pose(r, t, b, o) {
      const rip = b - SPLASH, f = fin2(b);
      if (r === 0) {
        const fall = E.inCubic(clamp((b - 1) / (SPLASH - 1)));
        const bu = buoy(b, 0), jel = wob(b, SPLASH, 2.2, 3.5), pre = antic(b, 1, 0.4);
        // the buoy feels every stroke, and is tugged under when the fin dives
        const fear = b > FIN2 ? f.push * clamp((b - 13) / 4) : 0, tug = hit(b, DIVE2 + 0.3, 2.6, 0.12);
        o.y = lerp(-G.R * 0.03 * pre, bu.y, fall) + (rip > 0 ? G.R * 0.05 * hit(b, SPLASH, 2.5) : 0) - bow2(0, b, f) + G.R * 0.09 * tug;
        const s = lerp(HERO, BUOY, fall) * (1 + 0.14 * fear) * (1 - 0.2 * tug);
        o.sx = s * (1 + 0.28 * jel + 0.1 * pre); o.sy = s * (1 - 0.28 * jel - 0.12 * pre + 0.2 * fall * (1 - clamp(rip * 4)));
        o.c = 1;
        return;
      }
      if (r >= 20) {
        if (rip <= 0) return hide(o);
        const p = water(W2)[r - 20], d = Math.abs(p.x), front = G.R * 1.5 * rip, w = G.R * 0.28;
        const born = E.outBack(clamp((front - d) / (G.R * 0.35) + 0.2));
        waterPose(r - 20, W2, b, o, born);
        const q = (d - front) / w;
        o.y -= G.R * 0.11 * Math.exp(-rip * 0.7) * Math.exp(-q * q) * Math.cos(q * 2.4) * (1 - p.row * 0.3);
        o.y -= bow2(p.x, b, f) * (1 - p.row * 0.4);
        // the dive leaves a ring on the water
        const dr = b - (DIVE2 + 0.2);
        if (dr > 0) { const qq = (d - G.R * 1.1 * dr) / (G.R * 0.22); o.y -= G.R * 0.05 * Math.exp(-dr * 1.2) * Math.exp(-qq * qq) * Math.cos(qq * 2.4) * (1 - p.row * 0.3); }
        return;
      }
      finPose(r - 1, f.x, f.rise, b, o, f.face, f.sc, -f.face * 0.16 * f.push);
      o.z = f.d * G.R * 0.12;
      o.o *= lerp(0.5, 1, (f.d + 1) / 2);
      o.sm = 0.3;
    },
    captions: [
      { at: 2.2, to: 9.6, text: 'Most days, the water looks calm.' },
      { at: 10.2, to: 19.5, text: 'But risks rarely announce themselves.' },
    ],
    music(M) {
      M.drop(SPLASH, 'C6', 0.3);
      M.splash(SPLASH, 0.22);
      M.sub(SPLASH, 'F2', 8, 0.24);
      M.pad(SPLASH, 'F3 A3 C4 E4', 8.5, 0.34);
      M.ep(3, 'A5', 0.2, -0.3); M.ep(4.5, 'C6', 0.14, 0.3); M.ep(6, 'G5', 0.18, -0.2);
      M.ep(7.5, 'E5', 0.14, 0.2); M.ep(9, 'F5', 0.14);
      // the fin surfaces in silence, then low strings take over: C♯ pulling into D, a half step
      M.drop(FIN2 + 0.2, 'F4', 0.12, 0.8);
      M.pad(10.6, 'D3 A3 D4', 8.6, 0.22);
      M.sub(11, 'D1', 8.2, 0.26);
      PULSE2.forEach((at, k) => {
        const gap = (PULSE2[k + 1] || at + 0.35) - at, s = k + 1, f = fin2At(s), pan = clamp(f.x / half(), -1, 1) * 0.85;
        const vel = 0.3 + 0.45 * (k / (PULSE2.length - 1));
        if (gap > 0.5) M.cello(at - 0.3, 'C#2', 0.26, vel * 0.7, pan);
        M.cello(at, 'D2', Math.min(0.9, gap * 0.85), vel, pan);
        M.swish(at, Math.min(0.5, gap), 0.05 + 0.1 * (k / PULSE2.length), pan);
      });
      M.pad(15.4, 'Bb2 F3 D4', 3.8, 0.2);
      M.whoosh(17.6, 1.55, 0.12, 250, 2200);
      M.boom(DIVE2 + 0.3, 0.42); M.splash(DIVE2 + 0.25, 0.3); M.drop(DIVE2 + 0.3, 'D4', 0.2);
    },
  };

  // =========================================================== 3 · the spreadsheet
  // The waterline lifts to the top of the frame and becomes a list: each cell
  // drops out of it as it is typed. A yellow caret makes a
  // few edits… and then nobody comes back. The cells go stale, the sheet sags,
  // and it falls apart.
  const COLW = [0.5, 2.4, 0.8, 0.8, 0.8, 1.5, 1.1, 1.1], NCOL = 8, NROW = 18, CUT3 = 14.2;
  const EDITS = [[3, 5, 7.7], [9, 1, 8.3], [13, 6, 8.9], [6, 2, 9.5]];
  const CELLS = (function () {
    const rr = BJ.rng(7510), a = [];
    for (let row = 0; row < NROW; row++) for (let col = 0; col < NCOL; col++) {
      a.push({
        row, col, t: 1.8 + row * 0.3 + col * 0.04,
        fill: row === 0 ? 0.92 : col >= 2 && col <= 4 ? 0.4 + 0.35 * rr() : 0.35 + 0.6 * rr(),
        stale: 10.2 + rr() * 3.6, jr: rr(), jt: rr() - 0.5, edit: -1, fill2: 0.3 + 0.6 * rr(),
      });
    }
    EDITS.forEach(([row, col, at]) => (a[row * NCOL + col].edit = at));
    return a;
  })();
  const SHEET = perLayout(() => {
    const sw = Math.min(G.W * 0.86, G.R * 3), sh = Math.min(G.R * 1.95, sw * 1.1), unit = sw / 9;
    const left = [], cw = [];
    let x = -sw / 2;
    for (const w of COLW) { left.push(x); cw.push(w * unit); x += w * unit; }
    return { sw, sh, rh: sh / NROW, top: -sh / 2 + (sh / NROW) * 0.5, left, cw };
  });
  function cellBox(k, b) {
    const L = SHEET(), c = CELLS[k], cw = L.cw[c.col], pad = cw * 0.1;
    const fill = c.edit > 0 ? lerp(c.fill, c.fill2, E.outCubic(clamp((b - c.edit) / 0.3))) : c.fill;
    const h = L.rh * (c.row === 0 ? 0.62 : 0.5), typed = E.outCubic(clamp((b - c.t) / 0.22));
    const w = c.col === 0 ? h : lerp(h, Math.max(h, (cw - 2 * pad) * fill), typed);
    const x = c.col === 0 ? L.left[0] + cw / 2 : L.left[c.col] + pad + w / 2;
    return { x, y: L.top + (c.row + 0.5) * L.rh, w, h };
  }
  // before a cell is typed it waits in the dotted line above the sheet: the waterline, lifted
  function lineXY(k) {
    const L = SHEET(), c = CELLS[k], idx = c.col * NROW + c.row, n = CELLS.length;
    const even = -L.sw / 2 + ((idx + 0.5) / n) * L.sw, colx = L.left[c.col] + (L.cw[c.col] * (c.row + 0.5)) / NROW;
    return [lerp(even, colx, 0.6), L.top - L.rh * 0.9 + (idx % 2 ? L.rh * 0.3 : 0)];
  }
  const caretEdge = (k, b) => { const q = cellBox(k, b); return [q.x + q.w / 2 + G.dot * 0.35, q.y]; };
  function sheetPose(r, b, o) {
    const L = SHEET();
    if (r === 0) {
      // the caret: rides the typing, hops to a few edits, then idles
      const n = CELLS.length;
      let k = 0;
      while (k < n - 1 && CELLS[k + 1].t <= b) k++;
      const e0 = k ? caretEdge(k - 1, b) : [L.left[0], L.top + L.rh / 2];
      const e1 = caretEdge(k, b), p = E.outCubic(clamp((b - CELLS[k].t) / 0.12));
      let x = lerp(e0[0], e1[0], p), y = lerp(e0[1], e1[1], p);
      for (const [row, col, at] of EDITS) {
        const q = E.inOutCubic(clamp((b - (at - 0.35)) / 0.35)), ed = caretEdge(row * NCOL + col, b);
        x = lerp(x, ed[0], q); y = lerp(y, ed[1], q);
      }
      o.x = x; o.y = y;
      o.sx = 0.26; o.sy = (L.rh * 0.8) / G.dot;
      const idle = b > 9.6 ? 1 : 0, slow = clamp((b - 10.5) / 3);
      o.o = idle ? lerp(1, 0.35, slow) * (0.2 + 0.8 * (Math.cos(TAU * (b - 9.6) * lerp(1, 0.5, slow)) > -0.2 ? 1 : 0)) : 1;
      o.c = 1;
      return;
    }
    if (r > CELLS.length) return hide(o);
    const k = r - 1, c = CELLS[k], q = cellBox(k, b);
    const dp = E.outCubic(clamp((b - (c.t - 0.3)) / 0.3));
    if (dp < 1) {
      const ln = lineXY(k), sz = (0.5 * (1 - dp)) + (dp * q.h) / G.dot;
      o.x = lerp(ln[0], q.x, dp); o.y = lerp(ln[1], q.y, dp);
      o.sx = o.sy = sz;
      o.o = lerp(ln[1] > lineXY(0)[1] ? 0.45 : 0.9, c.row === 0 ? 0.95 : c.col === 0 ? 0.35 : 0.62, dp);
      return;
    }
    o.x = q.x; o.y = q.y;
    o.sx = q.w / G.dot; o.sy = (q.h / G.dot) * (1 + 0.35 * hit(b, c.t, 6));
    o.o = c.row === 0 ? 0.95 : c.col === 0 ? 0.35 : 0.62;
    if (c.edit > 0) { const f = hit(b, c.edit, 1.1); o.c = f; o.o = lerp(o.o, 1, f); }
    const st = E.inOutCubic(clamp((b - c.stale) / 1.4));
    const sag = E.inOutSine(clamp((b - 11) / 3)) * L.rh * 1.3, xn = q.x / (L.sw / 2);
    o.o *= 1 - 0.55 * st;
    o.rot = st * c.jt * 0.55;
    o.y += st * L.rh * (0.2 + 0.5 * c.jr) + sag * (1 - xn * xn);
    const sh = clamp((b - 13.4) / 0.8);
    o.x += Math.sin(b * 43 + k * 1.7) * G.dot * 0.14 * sh;
  }
  const world3 = new BJ.World(CELLS.length + 1);
  const floor3 = () => Math.min(G.R * 1.12, G.textY - G.cy - G.H * 0.07);
  const wall3 = () => Math.min(G.W / 2 - G.dot, SHEET().sw / 2 + G.dot);
  const S3 = {
    name: 'spreadsheet',
    beats: 20,
    // the whole sea lifts at once, like a rising water level
    blend: {
      ease: E.inOutCubic, arc: 0.06,
      start: (r) => (r === 0 ? 0.25 : r <= CELLS.length ? 0.05 + (lineXY(r - 1)[0] / SHEET().sw + 0.5) * 0.03 : 0),
      dur: () => 1.05,
    },
    backdrop: (b) => {
      const L = SHEET(), p = E.inOutCubic(clamp((b - 0.07) / 1.05));
      return { sea: 1 - E.inOutSine(clamp((b - 0.35) / 1.1)), y: lerp(seaY() + G.dot * 0.3, L.top - L.rh * 0.9 + G.dot * 0.3, p) };
    },
    enter() { world3.active = false; },
    update(t, b, dt) {
      if (b < CUT3) return;
      const w = world3;
      if (!w.active) {
        const rr = BJ.rng(9001), q = {};
        for (let r = 0; r < w.n; r++) {
          q.x = q.y = q.rot = 0; q.sx = q.sy = q.o = 1;
          sheetPose(r, CUT3, q);
          w.x[r] = q.x; w.y[r] = q.y;
          w.vx[r] = (rr() - 0.5) * G.R * 0.5;
          w.vy[r] = -rr() * G.R * 0.3;
          w.r[r] = (G.dot * (r ? 0.8 : 1)) / 2;
          w.cool[r] = 0;
        }
        w.active = true;
        return;
      }
      const wx = wall3();
      w.step(dt, {
        g: G.R * 8, floor: floor3(), left: -wx, right: wx, thr: G.R * 0.6,
        onImpact: (x, v) => BJ.Audio.impact(clamp(x / wx, -1, 1) * 0.8 - 0.2, clamp(v / (G.R * 5))),
      });
    },
    pose(r, t, b, o) {
      if (b >= CUT3 && world3.active && r < world3.n) {
        const q = {};
        q.x = q.y = q.rot = q.c = 0; q.sx = q.sy = q.o = 1;
        sheetPose(r, CUT3, q);
        const p = E.outCubic(clamp((b - CUT3) / 0.6)), d = r ? 0.8 : 1;
        o.x = world3.x[r]; o.y = world3.y[r];
        o.sx = lerp(q.sx, d, p); o.sy = lerp(q.sy, d, p); o.rot = lerp(q.rot, 0, p);
        o.o = r ? lerp(q.o, 0.7, p) : 1; o.c = r ? 0 : 1;
        return;
      }
      sheetPose(r, b, o);
    },
    captions: [
      { at: 1.2, to: 9.8, text: 'So we list them in a spreadsheet.' },
      { at: 10.4, to: 13.9, text: 'Until nobody keeps it up to date.' },
      { at: 14.4, to: 19.5, text: 'And it quietly falls apart.' },
    ],
    music(M) {
      M.pad(0, 'D3 F3 A3 D4', 7, 0.3);
      M.sub(0, 'D2', 7, 0.22);
      const ROW = ['D5', 'F5', 'A5', 'G5', 'F5', 'E5', 'D5', 'A4', 'C5', 'D5', 'F5', 'E5', 'D5', 'C5', 'A4', 'G4', 'A4', 'D5'];
      CELLS.forEach((c) => M.tick(c.t, c.col ? 0.035 : 0.07, (c.col / 7 - 0.5) * 0.8));
      for (let row = 0; row < NROW; row++) M.marimba(1.8 + row * 0.3, ROW[row], row ? 0.14 : 0.24, -0.3);
      M.whoosh(0, 1.1, 0.1, 300, 2400); M.drop(1.05, 'A5', 0.14);
      M.pad(7, 'Bb2 F3 A3 D4', 3.2, 0.26);
      EDITS.forEach(([, col, at], k) => { M.ep(at, ['A5', 'C6', 'G5', 'F5'][k], 0.2, (col / 7 - 0.5) * 0.8); M.tick(at, 0.08); });
      M.pad(10.2, 'G2 D3 Bb3 D4', 4, 0.22);
      M.ep(10.6, 'D5', 0.12); M.ep(11.6, 'C5', 0.1); M.ep(12.6, 'Bb4', 0.1); M.ep(13.4, 'A4', 0.1);
      M.whoosh(13.4, 0.8, 0.05, 1200, 300);
      M.snip(CUT3);
      M.boom(CUT3 + 0.9, 0.3);
      M.pad(CUT3 + 0.5, 'A2 E3 G3 C#4', 5.3, 0.2);
      M.sub(CUT3 + 0.5, 'A1', 5, 0.2);
    },
  };

  // =========================================================== 4 · once a year
  // Twelve months around a clock. January is one busy, yellow project.
  // The hand then ticks through eleven months where nobody looks.
  const TICK = (m) => 5 + (m - 1) * 0.5;
  const clockR = () => Math.min(G.R * 0.92, half() * 0.8);
  const handA = (b) => {
    let s = 0;
    for (let m = 1; m <= 12; m++) s += E.snap(clamp((b - TICK(m)) / 0.4));
    return -Math.PI / 2 + (s * TAU) / 12;
  };
  const busy4 = (b) => E.outCubic(clamp((b - 0.8) / 0.5)) * (1 - E.inOutCubic(clamp((b - 3.6) / 0.9)));
  const S4 = {
    name: 'year',
    beats: 12,
    blend: { dur: 1.1, stagger: 0.8, arc: 0.25, order: (r) => (r < 6 ? 0 : (r - 6) / 144) },
    pose(r, t, b, o) {
      const cr = clockR(), ha = handA(b), tickHit = maxHit(b, [1, 2, 3, 4, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5].slice(4), 6);
      if (r === 0) { o.sx = o.sy = 1.3 * (1 + 0.15 * tickHit); o.c = 1; return; }
      if (r < 6) {
        const d = cr * (0.12 + 0.13 * (r - 1));
        o.x = Math.cos(ha) * d; o.y = Math.sin(ha) * d;
        o.sx = o.sy = 0.95 - 0.07 * r;
        return;
      }
      const m = Math.floor((r - 6) / 12), k = (r - 6) % 12, a = -Math.PI / 2 + (m * TAU) / 12;
      let rad = cr * 0.17, turn = 0, op = 0.28, col = 0, sc = 0.62;
      if (m === 0) {
        const bz = busy4(b), fl = hit(b, TICK(12) + 0.1, 1.2);
        const bounce = maxHit(b, [1, 2, 3], 5);
        rad *= 1 + 0.3 * bz + 0.1 * bounce;
        turn = TAU * 0.8 * E.inOutSine(clamp((b - 0.8) / 3.4));
        op = Math.max(lerp(op, 1, bz), 0.28 + 0.72 * fl);
        col = Math.max(bz, fl);
        sc *= 1 + 0.25 * bz + 0.3 * bounce * bz;
      } else {
        const v = hit(b, TICK(m) + 0.1, 2.5);
        op += 0.35 * v; sc *= 1 + 0.3 * v;
      }
      const s = seed(k, 12, rad, turn);
      o.x = Math.cos(a) * cr + s[0]; o.y = Math.sin(a) * cr + s[1];
      o.sx = o.sy = sc; o.o = op; o.c = col;
    },
    captions: [
      { at: 0.6, to: 4.8, text: 'Once a year, someone takes a look.' },
      { at: 5.2, to: 11.5, text: 'The other eleven months, nobody does.' },
    ],
    music(M) {
      M.pad(0.5, 'D3 A3 F4', 4.5, 0.3);
      ['D5', 'F5', 'A5', 'G5', 'F5', 'A5', 'C6', 'A5'].forEach((n, k) => M.marimba(1 + k * 0.33, n, 0.2, 0.5));
      M.sub(1, 'D2', 3.5, 0.24);
      for (let m = 1; m <= 12; m++) M.tick(TICK(m), m === 12 ? 0.16 : 0.11, Math.sin((m * TAU) / 12) * 0.7);
      M.pad(5, 'Bb2 F3 D4', 3, 0.22);
      M.pad(8, 'G2 D3 Bb3', 2.5, 0.2);
      M.pad(10.5, 'C3 G3 Bb3 E4', 1.5, 0.26);
      M.bell(TICK(12) + 0.1, 'D6', 0.16);
      M.whoosh(10.8, 1.2, 0.1, 300, 4000);
    },
  };

  // =========================================================== 5 · the matrix
  // Twenty-five faint tiles: likelihood × impact. A ready-made risk set drops
  // in, batch by batch, on the kick.
  const RISK = (function () {
    const rr = BJ.rng(42001), a = [];
    for (let q = 0; q < 125; q++) {
      if (q === 0) { a.push({ L0: 4, I0: 4, L1: 1, I1: 1 }); continue; }
      const L0 = Math.min(4, Math.floor(Math.pow(rr(), 0.6) * 5)), I0 = Math.min(4, Math.floor(Math.pow(rr(), 0.6) * 5));
      a.push({ L0, I0, L1: Math.max(0, L0 - 1 - Math.floor(rr() * 2.2)), I1: Math.max(0, I0 - Math.floor(rr() * 2)) });
    }
    const n0 = {}, n1 = {};
    for (const p of a) {
      const c0 = p.L0 + p.I0 * 5, c1 = p.L1 + p.I1 * 5;
      p.k0 = n0[c0] = (n0[c0] || 0) + 1; p.k0--;
      p.k1 = n1[c1] = (n1[c1] || 0) + 1; p.k1--;
      p.c0 = c0; p.c1 = c1;
    }
    const cells = Object.keys(n0).map(Number).sort((x, y) => {
      const sx = (x % 5) + Math.floor(x / 5), sy = (y % 5) + Math.floor(y / 5);
      return sy - sx || (y % 5) - (x % 5);
    });
    for (const p of a) { p.n0 = n0[p.c0]; p.n1 = n1[p.c1]; p.g = cells.indexOf(p.c0); }
    return a;
  })();
  const hot = (L, I) => (L + I >= 6 ? 1 : 0);
  const tileP = () => Math.min(G.R * 0.4, half() * 0.39);
  const tileXY = (L, I) => [(L - 2) * tileP(), (2 - I) * tileP() - G.R * 0.02];
  const riskOf = (r) => (r === 0 ? 0 : r >= 26 ? r - 25 : -1);
  function slotXY(L, I, k, n) {
    const c = tileXY(L, I), s = seed(k, n, tileP() * 0.36);
    return [c[0] + s[0], c[1] + s[1]];
  }
  const tileArrive = (t) => 0.2 + ((t % 5) + 4 - Math.floor(t / 5)) * 0.14;
  // a risk's score: likelihood × impact, 1…25
  const score = (L, I) => (L + 1) * (I + 1);
  const land5 = (q) => 0.9 + (q % 5) * 0.55 + 1;
  // where every risk is right now, as a tile index (S5: once it has landed; S6: halfway through its move)
  const move6 = (p, b) => E.inOutCubic(clamp((b - launch6(p)) / 0.9));
  function riskState(phase, b) {
    let total = 0;
    const occ = new Array(25).fill(0);
    RISK.forEach((p, q) => {
      if (phase === 5) {
        const a = E.outCubic(clamp((b - (land5(q) - 1)) / 1));
        total += score(p.L0, p.I0) * a;
        if (a > 0.7) occ[p.c0]++;
      } else {
        const e = move6(p, b);
        total += lerp(score(p.L0, p.I0), score(p.L1, p.I1), e);
        occ[e < 0.5 ? p.c0 : p.c1]++;
      }
    });
    return { total, occ };
  }
  let rsKey = '', rsVal = null;
  const riskNow = (phase, b) => { const k = phase + ':' + b; if (k !== rsKey) { rsKey = k; rsVal = riskState(phase, b); } return rsVal; };
  const TOTAL0 = RISK.reduce((a, p) => a + score(p.L0, p.I0), 0), TOTAL1 = RISK.reduce((a, p) => a + score(p.L1, p.I1), 0);
  // the red zone only glows while risks sit in it
  function tilePose(t, b, o, pop, phase) {
    const L = t % 5, I = Math.floor(t / 5), sc = L + I, xy = tileXY(L, I);
    o.x = xy[0]; o.y = xy[1]; o.z = -4;
    o.sx = o.sy = ((tileP() * 0.9) / G.dot) * (1 + 0.08 * pop);
    const lit = sc >= 6 ? Math.min(1, riskNow(phase, b).occ[t] / 3) : 0;
    o.c = lit;
    o.o = sc >= 6 ? lerp(0.1, 0.34, lit) : sc >= 4 ? 0.12 : 0.07;
  }
  const riskSize = (q) => (q === 0 ? 1 : 0.6);
  // the live risk score, beside the matrix (or above it on narrow screens)
  const fmt = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
  const scoreCap = {
    at: 1.2, to: 8 + 9.6, cls: 'score',
    html: '<span class="lab">Risk score</span><span class="num">0</span><span class="pill">\u2212' + Math.round(100 * (1 - TOTAL1 / TOTAL0)) + '%</span>',
    place() {
      const P = tileP(), wide = G.W > G.H * 1.15;
      if (wide) return { left: G.cx + 2.5 * P + G.R * 0.3 + 'px', right: 'auto', top: G.cy - G.R * 0.02 + 'px', textAlign: 'left' };
      return { left: '0', right: '0', top: G.cy - 2.45 * P - G.R * 0.02 - Math.max(34, P * 0.55) + 'px', textAlign: 'center' };
    },
    update(el, b, uc) {
      const st = b < 8 ? riskNow(5, b) : riskNow(6, b - 8), v = Math.round(st.total);
      if (!uc.num) { uc.num = el.querySelector('.num'); uc.pill = el.querySelector('.pill'); }
      if (uc.v !== v) { uc.v = v; uc.num.textContent = fmt(v); }
      const pl = b < 8 ? 0 : E.outBack(clamp((b - 8 - LAST6) / 0.5)), key = Math.round(pl * 100);
      if (uc.pl !== key) { uc.pl = key; uc.pill.style.opacity = clamp(pl); uc.pill.style.transform = 'scale(' + (0.6 + 0.4 * pl) + ')'; }
    },
  };
  const S5 = {
    name: 'matrix',
    beats: 8,
    blend: {
      arc: 0.3,
      start: (r) => (r >= 1 && r <= 25 ? tileArrive(r - 1) : land5(riskOf(r)) - 1),
      dur: (r) => 1,
    },
    pose(r, t, b, o) {
      if (r >= 1 && r <= 25) return tilePose(r - 1, b, o, hit(b, tileArrive(r - 1) + 1, 4), 5);
      const q = riskOf(r), p = RISK[q], xy = slotXY(p.L0, p.I0, p.k0, p.n0);
      o.x = xy[0]; o.y = xy[1];
      o.sx = o.sy = riskSize(q) * (1 + 0.4 * hit(b, land5(q), 4));
      o.c = q === 0 ? 1 : hot(p.L0, p.I0);
    },
    captions: [
      { at: 0.6, to: 4, text: 'Risqui maps every risk.' },
      { at: 4.4, to: 7.6, text: 'Scored on likelihood and impact.' },
      scoreCap,
    ],
    music(M) {
      M.pad(0, 'F2 C3 A3 C4 F4', 4.4, 0.34);
      M.sub(0, 'F1', 4.4, 0.3);
      M.whoosh(0, 1.2, 0.1, 400, 3000);
      for (let k = 0; k < 5; k++) {
        M.kick(land5(k), 0.4 + k * 0.04);
        M.bell(land5(k), ['F5', 'A5', 'C6', 'D6', 'F6'][k], 0.1, (k - 2) * 0.3);
      }
      M.kick(6, 0.22); M.kick(7, 0.22);
      M.ep(0.9, 'C5', 0.16);
      M.pad(4.4, 'D3 A3 C4 F4', 3.6, 0.26);
      M.ep(5, 'A5', 0.16); M.ep(6, 'G5', 0.14); M.ep(7, 'C6', 0.12);
    },
  };

  // =========================================================== 6 · measures
  // Same cast. Hottest cells first, every risk gets its measure and moves down
  // and left in the matrix, cooling from yellow to navy.
  const launch6 = (p) => 1 + p.g * 0.25 + (p.k0 % 3) * 0.05;
  const LAST6 = Math.max(...RISK.map((p) => launch6(p) + 0.9));
  const S6 = {
    name: 'measures',
    beats: 10,
    remap: 'keep',
    blend: { dur: 0.01 },
    pose(r, t, b, o) {
      if (r >= 1 && r <= 25) return tilePose(r - 1, b, o, 0, 6);
      const q = riskOf(r), p = RISK[q], T = launch6(p);
      const a = slotXY(p.L0, p.I0, p.k0, p.n0), z = slotXY(p.L1, p.I1, p.k1, p.n1);
      const pr = clamp((b - T) / 0.9), e = E.inOutCubic(pr), dx = z[0] - a[0], dy = z[1] - a[1], off = Math.sin(Math.PI * e) * 0.22;
      o.x = lerp(a[0], z[0], e) - dy * off; o.y = lerp(a[1], z[1], e) + dx * off;
      const land = hit(b, T + 0.9, 5), pre = antic(b, T, 0.25);
      o.sx = o.sy = riskSize(q) * (1 + 0.45 * land - 0.2 * pre);
      o.c = q === 0 ? 1 : lerp(hot(p.L0, p.I0), hot(p.L1, p.I1), e);
    },
    captions: [
      { at: 0.4, to: 4.8, text: 'Every measure gets an owner and a deadline.' },
      { at: 5.2, to: 9.6, text: 'And the risk comes down.' },
    ],
    music(M) {
      const DOWN = ['F6', 'D6', 'C6', 'A5', 'G5', 'F5', 'D5', 'C5', 'A4', 'G4', 'F4', 'D4'];
      const gs = Math.max(...RISK.map((p) => p.g)) + 1;
      for (let g = 0; g < gs; g++) M.ep(1 + g * 0.25, DOWN[Math.min(DOWN.length - 1, Math.floor((g * DOWN.length) / gs))], 0.13 - g * 0.002, ((g % 5) - 2) * 0.25);
      M.pad(0, 'F3 A3 C4 F4', 4, 0.26);
      M.pad(4, 'D3 F3 A3 C4', LAST6 - 4, 0.24);
      M.pad(LAST6, 'Bb2 F3 A3 D4', 10 - LAST6, 0.26);
      M.sub(0, 'F1', 4, 0.22); M.sub(4, 'D2', LAST6 - 4, 0.2); M.sub(LAST6, 'Bb1', 10 - LAST6, 0.22);
      for (let b = 0; b < 10; b += 2) M.kick(b, 0.2);
      M.bell(LAST6, 'F6', 0.14); M.ep(LAST6, 'F5', 0.2); M.kick(LAST6, 0.3);
    },
  };

  // =========================================================== 7 · the lens
  // A field of everything you track. Risqui's magnifying glass — the tail of
  // the Q in its logo — glides over it and lights up what was missed.
  const FOUND_T = [6.4, 7.2, 8, 8.8, 9.6, 10.4];
  const lensR = () => Math.min(G.R * 0.36, half() * 0.34);
  const FIELD7 = perLayout(() => {
    const a = Math.min(half() * 0.95, G.R * 1.5), bb = G.R * 0.85;
    const s = Math.sqrt((Math.PI * a * bb) / (124 * 0.866)), pts = [];
    for (let j = -24; j <= 24; j++) for (let i = -40; i <= 40; i++) {
      const x = (i + (j & 1) * 0.5) * s, y = j * s * 0.866;
      pts.push({ x, y, d: (x / a) * (x / a) + (y / bb) * (y / bb) });
    }
    pts.sort((p, q) => p.d - q.d);
    const f = { a, bb, pts: pts.slice(0, 124), found: new Float32Array(124).fill(-1) };
    for (const T of FOUND_T) {
      const L = lens7(T, f);
      let best = -1, bd = Infinity;
      f.pts.forEach((p, k) => { const d = (p.x - L[0]) ** 2 + (p.y - L[1]) ** 2; if (f.found[k] < 0 && d < bd) { bd = d; best = k; } });
      f.found[best] = T;
    }
    return f;
  });
  function lens7(b, f) {
    f = f || FIELD7();
    return [f.a * 0.55 * Math.sin(0.62 * b - 0.9), f.bb * 0.45 * Math.sin(1.05 * b + 0.3) - G.R * 0.03];
  }
  const QDIR = [Math.SQRT1_2, Math.SQRT1_2];
  // ring roles 0..18, handle roles 19..24 relative to `base`
  function lensPart(j, lx, ly, rl, o) {
    if (j < 19) {
      const a = (j / 19) * TAU - Math.PI / 4;
      o.x = lx + Math.cos(a) * rl; o.y = ly + Math.sin(a) * rl; o.sx = o.sy = 1;
    } else {
      const d = rl * (1.14 + (j - 19) * 0.19);
      o.x = lx + QDIR[0] * d; o.y = ly + QDIR[1] * d; o.sx = o.sy = 1.2;
    }
  }
  const S7 = {
    name: 'lens',
    beats: 12,
    blend: { dur: 1.1, stagger: 0.6, arc: 0.25, order: (r) => (r < 26 ? 0 : (r - 26) / 124) },
    pose(r, t, b, o) {
      const L = lens7(b), rl = lensR();
      if (r === 0) {
        o.x = L[0] - rl * 0.42; o.y = L[1] - rl * 0.42;
        o.sx = o.sy = 0.75 * (1 + 0.6 * maxHit(b, FOUND_T, 3)); o.c = 1;
        return;
      }
      if (r < 26) return lensPart(r - 1, L[0], L[1], rl, o);
      const f = FIELD7(), k = r - 26, p = f.pts[k], T = f.found[k];
      o.x = p.x; o.y = p.y; o.sx = o.sy = 0.7; o.o = 0.45;
      if (T > 0) {
        const on = E.outCubic(clamp((b - T) / 0.35));
        o.c = on; o.o = lerp(0.45, 1, on);
        o.sx = o.sy = 0.7 * (1 + 0.45 * on + 0.8 * hit(b, T, 3));
      }
      const m = magnify(o, L[0], L[1], rl);
      if (m > 1) o.o = Math.max(o.o, lerp(0.45, 0.95, (m - 1) / 0.45));
    },
    captions: [
      { at: 0.8, to: 5.6, text: 'Its A.I. CoPilot does the heavy lifting.' },
      { at: 6, to: 11.6, text: 'And spots what you missed.' },
    ],
    music(M) {
      M.pad(0, 'F3 A3 C4 E4', 6, 0.3);
      M.pad(6, 'D3 F3 A3 C4 E4', 6, 0.28);
      M.sub(0, 'F2', 6, 0.2); M.sub(6, 'D2', 6, 0.2);
      M.whoosh(0, 1.4, 0.08, 500, 5000);
      M.ep(1.5, 'C5', 0.16); M.ep(2.5, 'E5', 0.14); M.ep(3.5, 'G5', 0.14); M.ep(4.5, 'A5', 0.12);
      ['C6', 'D6', 'F6', 'G6', 'A6', 'C7'].forEach((n, k) => M.bell(FOUND_T[k], n, 0.2, Math.sin(k * 1.3) * 0.5));
      for (let b = 6; b < 12; b += 1) M.tick(b + 0.5, 0.03);
    },
  };

  // =========================================================== 8 · the standards
  // Three orbits drawn one by one — ISO 27001, NEN 7510, ISO 42001 — around
  // the yellow nucleus.
  const ringStart = (r) => { const k = Math.floor((r - 1) / 49), j = (r - 1) % 49; return k * 3.5 + (j / 49) * 0.8; };
  const S8 = {
    name: 'standards',
    beats: 12,
    blend: {
      ease: E.outCubic, arc: 0.15,
      start: (r) => (r === 0 || r > 147 ? 0 : ringStart(r)),
      dur: (r) => (r === 0 ? 1 : r > 147 ? 0.6 : 0.6),
    },
    pose(r, t, b, o) {
      const pulse = maxHit(b, [0.6, 4.1, 7.6, 10.5], 2.5);
      if (r === 0) { o.sx = o.sy = HERO * (1 + 0.35 * pulse); o.c = 1; return; }
      if (r > 147) return hide(o);
      const k = Math.floor((r - 1) / 49), j = (r - 1) % 49, rho = Math.min(G.R * 0.95, half() * 0.85);
      const th = (j / 49) * TAU + b * 0.3 * (k === 1 ? -1 : 1);
      let x = Math.cos(th) * rho, y = Math.sin(th) * rho, z = 0;
      const ca = Math.cos(1.2), sa = Math.sin(1.2);
      [y, z] = [y * ca - z * sa, y * sa + z * ca];
      const cz = Math.cos((k * Math.PI) / 3), sz = Math.sin((k * Math.PI) / 3);
      [x, y] = [x * cz - y * sz, x * sz + y * cz];
      const be = 0.35 + b * 0.09, cb = Math.cos(be), sb = Math.sin(be);
      [x, z] = [x * cb + z * sb, -x * sb + z * cb];
      const tl = 0.3, ct = Math.cos(tl), st = Math.sin(tl);
      [y, z] = [y * ct - z * st, y * st + z * ct];
      o.x = x; o.y = y; o.z = z;
      const fl = hit(b, ringStart(r) + 0.6, 1.3);
      o.c = fl;
      o.sx = o.sy = 0.6 * (1 + 0.5 * fl + 0.2 * hit(b, 10.5, 2));
      o.o = 0.5 + 0.5 * clamp((z / rho + 1) / 2);
    },
    captions: [{ at: 0.9, to: 11.6, words: [['ISO 27001.', 1.2], ['NEN 7510.', 4.7], ['ISO 42001.', 8.2]] }],
    music(M) {
      const CH = [['F3 A3 C4 F4', 'F2', 'F5 A5 C6'], ['A2 E3 A3 C4', 'A1', 'E5 A5 C6'], ['Bb2 F3 Bb3 D4', 'Bb1', 'F5 Bb5 D6']];
      CH.forEach(([pad, bass, arp], k) => {
        const at = k * 3.5;
        M.pad(at, pad, 3.5, 0.28); M.sub(at, bass, 3.5, 0.24);
        arp.split(' ').forEach((n, q) => M.ep(at + 0.1 + q * 0.27, n, 0.15, (q - 1) * 0.4));
        M.bell(at + 1.2, ['C6', 'E6', 'D6'][k], 0.14);
        M.kick(at + 1.2, 0.3);
      });
      M.pad(10.5, 'C3 G3 Bb3 E4', 1.5, 0.26); M.sub(10.5, 'C2', 1.5, 0.24);
      M.bell(10.5, 'G6', 0.08);
    },
  };

  // =========================================================== 9 · Europe
  // The rings unravel into a navy flag; twelve yellow stars arrive clockwise.
  const FLAG = perLayout(() => {
    const fh = Math.min(G.R * 1.7, (Math.min(G.W * 0.9, G.R * 2.9) * 2) / 3), fw = fh * 1.5;
    const sx = fw / 14, sy = fh / 9, cy = -G.R * 0.05, stars = [], field = [];
    for (let k = 0; k < 12; k++) { const a = -Math.PI / 2 + (k * TAU) / 12; stars.push([Math.cos(a) * fh / 3, Math.sin(a) * fh / 3 + cy]); }
    for (let j = 0; j < 9; j++) for (let i = 0; i < 14; i++) {
      const x = -fw / 2 + (i + 0.5) * sx, y = -fh / 2 + (j + 0.5) * sy + cy;
      if (stars.some((s) => Math.hypot(s[0] - x, s[1] - y) < 0.62 * Math.min(sx, sy))) continue;
      field.push([x, y, i]);
    }
    return { fw, fh, sx, sy, cy, stars, field, d: (Math.min(sx, sy) * 0.62) / G.dot };
  });
  const starArrive = (k) => 1.4 + k * 0.3 + 0.8;
  function wave9(o, b, F) {
    const ph = (o.x + F.fw / 2) / F.fw, A = F.fw * 0.07, w = TAU * ((o.x / F.fw) * 1.3) - b * 1.5;
    o.z = A * ph * Math.sin(w);
    o.y += A * 0.22 * ph * Math.cos(w);
    const ry = -0.28, c = Math.cos(ry), s = Math.sin(ry), x = o.x;
    o.x = x * c + o.z * s; o.z = -x * s + o.z * c;
  }
  const S9 = {
    name: 'flag',
    beats: 12,
    blend: {
      arc: 0.2,
      start: (r) => { const F = FLAG(); if (r < 12) return 1.4 + r * 0.3; const f = F.field[r - 12]; return f ? 0.1 + (f[2] / 13) * 1.2 : 0; },
      dur: (r) => (r < 12 ? 0.8 : 0.9),
    },
    pose(r, t, b, o) {
      const F = FLAG();
      if (r < 12) {
        o.x = F.stars[r][0]; o.y = F.stars[r][1];
        o.sx = o.sy = F.d * (0.95 + 0.5 * hit(b, starArrive(r), 3) + 0.08 * Math.sin(b * 2 + r));
        o.c = 1;
        return wave9(o, b, F);
      }
      const f = F.field[r - 12];
      if (!f) return hide(o);
      o.x = f[0]; o.y = f[1]; o.sx = o.sy = F.d;
      wave9(o, b, F);
    },
    captions: [
      { at: 0.8, to: 5.8, text: 'Your data stays in Europe.' },
      { at: 6.2, to: 11.6, text: 'Dutch company. Dutch support.' },
    ],
    music(M) {
      M.pad(0, 'F3 A3 C4 F4', 6, 0.3); M.sub(0, 'F2', 6, 0.24);
      const ST = ['C6', 'D6', 'F6', 'G6', 'A6', 'C7', 'A6', 'G6', 'F6', 'D6', 'C6', 'F6'];
      for (let k = 0; k < 12; k++) M.bell(starArrive(k), ST[k], 0.12 + (k === 11 ? 0.06 : 0), Math.sin((k * TAU) / 12) * 0.6);
      M.pad(6, 'Bb2 F3 D4 F4', 3, 0.26); M.sub(6, 'Bb1', 3, 0.22);
      M.pad(9, 'C3 G3 C4 E4', 3, 0.26); M.sub(9, 'C2', 3, 0.22);
      M.ep(6.5, 'D5', 0.14); M.ep(7.5, 'F5', 0.14); M.ep(9.5, 'E5', 0.14); M.ep(10.5, 'G5', 0.14);
      M.whoosh(0, 1.5, 0.08, 300, 2500);
    },
  };

  // =========================================================== 10 · audit-ready
  // The yellow dot becomes a pen: it writes a change log, then draws a ring
  // and a check — Risqui's own check icon.
  const LOGN = 10;
  const LOG = (function () {
    const rr = BJ.rng(27001), rows = [];
    let wmax = 0;
    for (let i = 0; i < LOGN; i++) {
      const n = i < LOGN - 1 ? 15 : 14, xs = [0, 1.6, 2.6, 3.6];
      let x = 5.4;
      while (xs.length < n) {
        const len = 2 + Math.floor(rr() * 3);
        for (let q = 0; q < len && xs.length < n; q++) { xs.push(x); x += 1; }
        x += 0.8;
      }
      wmax = Math.max(wmax, xs[xs.length - 1]);
      rows.push({ xs, n, spawn: 1.4 + i * 0.42 });
    }
    return { rows, wmax };
  })();
  const logSp = () => G.dot * 0.95, logRowH = () => G.R * 0.13, logY0 = () => G.R * 0.58;
  const logScroll = (b) => { let s = 0; for (let i = 1; i < LOGN; i++) s += E.outCubic(clamp((b - LOG.rows[i].spawn) / 0.35)); return s; };
  const typeAt10 = (i, j) => LOG.rows[i].spawn + j * 0.022;
  function logXY(i, x, b) {
    return [(x - LOG.wmax / 2) * logSp(), logY0() - (logScroll(b) - i) * logRowH()];
  }
  function pen10(b) {
    let i = 0;
    while (i < LOGN - 1 && LOG.rows[i + 1].spawn <= b) i++;
    const row = LOG.rows[i], j = Math.max(0, Math.min(row.n - 1, Math.floor((b - row.spawn) / 0.022)));
    const cur = logXY(i, (b < row.spawn ? 0 : row.xs[j]) + 1.2, b);
    if (i === 0 || b - row.spawn > 0.16) return cur;
    // carriage return: glide back from the end of the previous line
    const pr = LOG.rows[i - 1], prev = logXY(i - 1, pr.xs[pr.n - 1] + 1.2, b), q = E.outCubic(clamp((b - row.spawn) / 0.16));
    return [lerp(prev[0], cur[0], q), lerp(prev[1], cur[1], q)];
  }
  const RINGN = 50, rb10 = () => Math.min(G.R * 0.62, half() * 0.5), bc10 = () => -G.R * 0.02;
  const CHECK = (function () {
    const pts = SH.check.pts;
    let e = 0, xmin = Infinity, xmax = -Infinity;
    pts.forEach((p, k) => { if (p[1] > pts[e][1]) e = k; xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]); });
    const ex = pts[e][0], lpt = pts.reduce((a, p) => (p[0] < a[0] ? p : a)), rpt = pts.reduce((a, p) => (p[0] > a[0] ? p : a));
    const u = pts.map((p) => (p[0] <= ex ? 0.3 * (1 - (ex - p[0]) / (ex - xmin)) : 0.3 + (0.7 * (p[0] - ex)) / (xmax - ex)));
    return { pts, u, elbow: pts[e], left: lpt, right: rpt };
  })();
  const checkW = () => rb10() * 1.05;
  const checkXY = (p) => [p[0] * checkW(), p[1] * checkW() + bc10() + rb10() * 0.04];
  function checkPen(u) {
    const a = u < 0.3 ? CHECK.left : CHECK.elbow, z = u < 0.3 ? CHECK.elbow : CHECK.right, q = u < 0.3 ? u / 0.3 : (u - 0.3) / 0.7;
    return checkXY([lerp(a[0], z[0], q), lerp(a[1], z[1], q)]);
  }
  const ringXY = (j) => { const a = -Math.PI / 2 + ((j + 0.5) / RINGN) * TAU; return [Math.cos(a) * rb10(), Math.sin(a) * rb10() + bc10()]; };
  // slot s: 0..49 ring, 50..148 check → [x, y, arrival, flight]
  function badgeSlot(s) {
    if (s < RINGN) { const xy = ringXY(s); return [xy[0], xy[1], 6.4 + ((s + 0.5) / RINGN) * 1.6, 0.7]; }
    const k = s - RINGN, xy = checkXY(CHECK.pts[k]);
    return [xy[0], xy[1], 8.2 + CHECK.u[k] * 0.8, 0.8];
  }
  const SLOT10 = perLayout(() => {
    const n = 149, pos = [];
    for (let r = 1; r <= n; r++) { const i = Math.floor((r - 1) / 15), j = (r - 1) % 15; pos.push(logXY(i, LOG.rows[i].xs[j], 6)); }
    const sl = []; for (let s = 0; s < n; s++) sl.push(badgeSlot(s));
    return BJ.assign(n, (i, s) => (pos[i][0] - sl[s][0]) ** 2 + (pos[i][1] - sl[s][1]) ** 2);
  });
  const STAMP = 9.1;
  function stamp(o, b) {
    const s = 1 + 0.07 * hit(b, STAMP, 3) - 0.04 * antic(b, STAMP, 0.25), cy = bc10();
    o.x *= s; o.y = cy + (o.y - cy) * s; o.sx *= s; o.sy *= s;
  }
  const S10 = {
    name: 'audit',
    beats: 12,
    blend: {
      ease: E.outCubic, arc: 0.2,
      // the whole flag is drawn into the pen like ink…
      ease: E.inOutCubic, arc: 0.15, start: (r) => (r ? 0.05 + (r / 149) * 0.45 : 0), dur: 0.8,
    },
    pose(r, t, b, o) {
      if (r === 0) {
        let x, y;
        if (b < 5.9) {
          [x, y] = pen10(b);
        } else if (b < 8) {
          const f = clamp((b - 6.4) / 1.6), a = -Math.PI / 2 + f * TAU, rb = rb10() * 1.0;
          const ring = [Math.cos(a) * rb, Math.sin(a) * rb + bc10()];
          const last = LOG.rows[LOGN - 1], st = logXY(LOGN - 1, last.xs[last.n - 1] + 1.2, 5.9), q = E.inOutCubic(clamp((b - 5.9) / 0.5));
          x = lerp(st[0], ring[0], q); y = lerp(st[1], ring[1], q);
        } else {
          const top = ringXY(RINGN - 1), q = E.inOutCubic(clamp((b - 8) / 0.2));
          const u = clamp((b - 8.2) / 0.8), pen = checkPen(u);
          x = lerp(top[0], pen[0], q); y = lerp(top[1], pen[1], q);
        }
        o.x = x; o.y = y; o.c = 1;
        const ink = E.outCubic(clamp((b - 0.2) / 1)) * (1 - E.inOutSine(clamp((b - 1.4) / 4)));
        o.sx = o.sy = (b < 9 ? 0.85 : lerp(0.85, 1.25, E.outBack(clamp((b - 9) / 0.5)))) + 1.1 * ink;
        if (b > 6) stamp(o, b);
        return;
      }
      const i = Math.floor((r - 1) / 15), j = (r - 1) % 15, row = LOG.rows[i];
      // …and written back out, one dot at a time
      const T = typeAt10(i, j);
      if (b < T) { const pp = pen10(b); o.x = pp[0]; o.y = pp[1]; return hide(o); }
      const wq = E.outCubic(clamp((b - T) / 0.25)), pT = pen10(T), lr = logXY(i, row.xs[j], b);
      const lp = [lerp(pT[0], lr[0], wq), lerp(pT[1], lr[1], wq)], age = logScroll(b) - i;
      const s = SLOT10()[r - 1], sl = badgeSlot(s), isCheck = s >= RINGN;
      const q = clamp((b - (sl[2] - sl[3])) / sl[3]), e = E.inOutCubic(q);
      const d0 = j === 0 ? 0.75 : j < 4 ? 0.45 : 0.6, o0 = (j > 0 && j < 4 ? 0.45 : 0.9) * (1 - 0.06 * age);
      const d1 = isCheck ? (SH.check.sp * checkW() * 0.95) / G.dot : 0.8;
      const dx = sl[0] - lp[0], dy = sl[1] - lp[1], off = Math.sin(Math.PI * e) * 0.2;
      o.x = lerp(lp[0], sl[0], e) - dy * off; o.y = lerp(lp[1], sl[1], e) + dx * off;
      const land = hit(b, sl[2], 4);
      o.sx = o.sy = lerp(d0 * E.outBack(wq), d1, e) * (1 + 0.5 * land);
      o.o = lerp(o0, 1, e);
      o.c = isCheck ? e : 0;
      if (b > 6) stamp(o, b);
    },
    captions: [
      { at: 0.6, to: 5.6, text: 'Every change, recorded.' },
      { at: 6.4, to: 11.6, text: 'Always audit-ready.' },
    ],
    music(M) {
      M.pad(0, 'F3 C4 E4 A4', 6, 0.26); M.sub(0, 'F2', 6, 0.2);
      const NOTES = ['F5', 'A5', 'G5', 'C6', 'A5', 'F5', 'G5', 'D6', 'C6', 'A5'];
      LOG.rows.forEach((row, i) => {
        M.marimba(row.spawn, NOTES[i], 0.14, -0.2);
        for (let j = 1; j < row.n; j += 3) M.tick(typeAt10(i, j), 0.04, 0.3);
      });
      M.whoosh(6.2, 1.8, 0.08, 400, 3500);
      ['C5', 'F5', 'A5', 'C6', 'F6'].forEach((n, k) => M.ep(6.4 + k * 0.4, n, 0.14, Math.sin(k * 1.4) * 0.5));
      M.pad(6.4, 'D3 A3 C4 F4', 2, 0.22);
      M.ep(8.2, 'F5', 0.2); M.ep(8.5, 'A5', 0.2); M.ep(8.8, 'C6', 0.22);
      M.kick(STAMP, 0.5); M.bell(STAMP, 'F6', 0.22); M.ep(STAMP, 'F4', 0.3);
      M.pad(STAMP, 'F3 A3 C4 F4 A4', 3, 0.3); M.sub(STAMP, 'F2', 3, 0.26);
    },
  };

  // =========================================================== 11 · the sea, again
  // The fin is back. This time the lens rises from the buoy, finds it, and it
  // turns yellow — seen, named, handled. It sinks away.
  const W11 = 105, BX = () => -0.15 * half();
  const fin11X = (b) => {
    const h = half(), app = lerp(0.95 * h, BX() + 0.42 * h, E.inOutSine(clamp((b - 2.2) / 7.6)));
    return lerp(app, 1.2 * h, E.inCubic(clamp((b - 11.5) / 3.5)));
  };
  const fin11Rise = (b) => E.outCubic(clamp((b - 2.2) / 1.8)) * (1 - E.inOutCubic(clamp((b - 11.5) / 3)));
  function lens11(b) {
    const bu = buoy(b, BX()), rl = lensR(), h = finB() * 0.95;
    let x = bu.x, y = bu.y;
    const fx = fin11X(b), fy = waterY(fx, b) - h * 0.45;
    const g = E.inOutCubic(clamp((b - 8.2) / 1.6));
    x = lerp(x, fx - finB() * 0.02, g); y = lerp(y, fy, g);
    const back = E.inOutCubic(clamp((b - 11.8) / 2.4));
    x = lerp(x, bu.x + rl * 0.15, back); y = lerp(y, bu.y - rl * 1.3 + rl * 0.05 * Math.sin(b * 1.2), back);
    return { x, y, s: E.outBack(clamp((b - 7.6) / 0.6)), rl };
  }
  const S11 = {
    name: 'return',
    beats: 20,
    blend: {
      arc: 0.2,
      start: (r) => (r === 0 ? 0.2 : r >= 45 ? ((water(W11)[r - 45].x / (G.W * 1.08)) + 0.5) * 0.8 : 0),
      dur: (r) => (r === 0 ? 1.4 : 1.2),
    },
    backdrop: (b) => ({ sea: E.inOutSine(clamp((b - 0.4) / 1.6)), y: seaY() + G.dot * 0.3 }),
    pose(r, t, b, o) {
      const L = lens11(b), rl = L.rl * L.s;
      if (r === 0) {
        const bu = buoy(b, BX()), e = hit(b, 7.6, 3);
        o.x = bu.x; o.y = bu.y; o.sx = BUOY * (1 + 0.2 * e); o.sy = BUOY * (1 - 0.15 * e); o.c = 1;
        return;
      }
      if (r >= 45) {
        const p = waterPose(r - 45, W11, b, o), fx = fin11X(b), dx = (p.x - fx) / (finB() * 0.9);
        o.y -= G.R * 0.035 * fin11Rise(b) * Math.exp(-dx * dx) * (1 - p.row * 0.4);
        if (L.s > 0) magnify(o, L.x, L.y, rl);
        return;
      }
      if (r < 20) {
        finPose(r - 1, fin11X(b), fin11Rise(b), b, o);
        o.c = E.outCubic(clamp((b - 10) / 0.4));
        if (L.s > 0) magnify(o, L.x, L.y, rl);
        return;
      }
      if (L.s <= 0.001) { const bu = buoy(b, BX()); o.x = bu.x; o.y = bu.y; return hide(o); }
      lensPart(r - 20, L.x, L.y, rl, o);
      o.sx *= clamp(L.s * 1.2); o.sy = o.sx;
    },
    captions: [
      { at: 0.6, to: 7.4, text: 'Risks will always be out there.' },
      { at: 8.2, to: 13.6, text: 'Now you see them coming.' },
      { at: 14.2, to: 19.5, text: 'And deal with them, before they bite.' },
    ],
    music(M) {
      M.pad(0, 'D3 A3 C4 F4', 7.6, 0.26); M.sub(0.5, 'D2', 7, 0.2);
      M.splash(1.2, 0.1);
      [3, 4.5, 5.5, 6.25, 6.9, 7.3].forEach((at, k) => M.bass(at, k % 2 ? 'F2' : 'E2', 0.5, 0.22 + k * 0.03));
      M.drop(7.6, 'F5', 0.26); M.bell(7.6, 'C6', 0.14);
      M.whoosh(8.2, 1.6, 0.08, 600, 3000);
      M.ep(8.4, 'A5', 0.14); M.ep(9, 'C6', 0.14);
      M.bell(10, 'F6', 0.3); M.ep(10, 'F5', 0.26); M.ep(10.03, 'A5', 0.2); M.ep(10.06, 'C6', 0.18);
      M.pad(10, 'F3 A3 C4 E4 A4', 5, 0.3); M.sub(10, 'F2', 5, 0.28); M.kick(10, 0.36);
      M.whoosh(11.5, 3, 0.06, 1500, 200);
      M.pad(15, 'Bb2 F3 A3 D4', 2.5, 0.24); M.sub(15, 'Bb1', 2.5, 0.2);
      M.pad(17.5, 'C3 G3 Bb3 E4', 2.5, 0.24); M.sub(17.5, 'C2', 2.5, 0.22);
      M.ep(15.5, 'D5', 0.12); M.ep(16.5, 'F5', 0.12); M.ep(17.5, 'E5', 0.12); M.ep(18.5, 'G5', 0.12);
    },
  };

  // =========================================================== 12 · Risqui
  // The letters rise from the water, the i's get their dots, and the yellow
  // dot rises as the sun from Risqui's own illustration, speed lines and all.
  const LOGO = SH.logo, LTH = [-0.3, -0.22, -0.045, 0.26, 0.43];
  const letterOf = (x) => { let L = 0; while (L < LTH.length && x >= LTH[L]) L++; return L; };
  const LAND = (L) => 2.6 + L * 0.5, IDROP = [5.85, 6.35], SUN = [0.4, 2.8];
  const logoW = () => Math.min(G.W * 0.72, G.R * 2.5);
  const logoY = () => 0.175 * logoW(), sunY = () => -0.237 * logoW(), sunR = () => 0.14 * logoW();
  const DASH = [[-2.28, -1.74, -0.1, 3], [-1.6, -1.6, -0.1, 1], [-1.43, -1.0, -0.1, 3], [0.95, 1.26, -0.34, 2], [1.42, 1.42, -0.34, 1], [1.58, 2.11, -0.34, 4], [1.16, 1.16, 0.38, 1], [1.33, 1.86, 0.38, 3], [-1.95, -1.6, 0.38, 2]];
  const DASHES = (function () {
    const a = [];
    DASH.forEach(([x0, x1, y, n], s) => { for (let j = 0; j < n; j++) a.push({ x: n > 1 ? lerp(x0, x1, j / (n - 1)) : x0, y, s }); });
    return a;
  })();
  const dashIn = (s) => 2.9 + s * 0.12;
  const S12 = {
    name: 'signature',
    beats: 20,
    blend: {
      arc: 0.08,
      start: (r) => {
        if (r === 0) return 0;
        if (r <= 127) return LAND(letterOf(LOGO.pts[r - 1][0])) - 1;
        if (r <= 129) return IDROP[r - 128] - 1.2;
        return dashIn(DASHES[r - 130].s) - 0.8;
      },
      dur: (r) => (r === 0 ? 0.3 : r <= 127 ? 1 : 0.8),
    },
    backdrop: (b) => { const q = clamp((b - 3) / 4.5); return { sea: 1 - E.inOutSine(q), y: seaY() + G.dot * 0.3 + E.inCubic(q) * G.H * 0.25 }; },
    pose(r, t, b, o) {
      const Lw = logoW(), rs = sunR();
      if (r === 0) {
        const bu = buoy(b, BX()), p = E.inOutCubic(clamp((b - SUN[0]) / (SUN[1] - SUN[0])));
        const cx = lerp(bu.x, 0, p), cy = lerp(bu.y, sunY(), p) - Math.sin(Math.PI * p) * G.R * 0.12;
        const e = hit(b, SUN[1], 2.5), pre = antic(b, SUN[0], 0.4);
        o.x = cx; o.y = cy + G.dot * 0.3 * pre;
        const s = lerp(BUOY, (2 * rs) / G.dot, p) * (1 + 0.06 * e + 0.02 * Math.sin(b * 1.4) * clamp(b - SUN[1]));
        o.sx = s * (1 + 0.15 * pre); o.sy = s * (1 - 0.18 * pre);
        o.c = 1;
        return;
      }
      if (r <= 127) {
        const p = LOGO.pts[r - 1], L = letterOf(p[0]);
        o.x = p[0] * Lw; o.y = p[1] * Lw + logoY();
        o.sx = o.sy = ((LOGO.sp * Lw * 0.84) / G.dot) * (1 + 0.3 * hit(b, LAND(L), 4));
        return;
      }
      if (r <= 129) {
        const d = LOGO.idots[r - 128], T = IDROP[r - 128];
        o.x = d[0] * Lw;
        o.y = d[1] * Lw + logoY() - (1 - E.spring(clamp((b - T) / 1.1))) * G.R * 0.55;
        const sq = hit(b, T + 0.25, 4);
        o.sx = ((d[2] * Lw) / G.dot) * (1 + 0.2 * sq); o.sy = ((d[2] * Lw) / G.dot) * (1 - 0.2 * sq);
        return;
      }
      const d = DASHES[r - 130], q = E.outCubic(clamp((b - dashIn(d.s)) / 1));
      const sy = (0.11 * rs) / G.dot;
      o.x = (d.x - (1 - q) * 1.2 + 0.05 * Math.sin(b * 0.8 + d.s)) * rs;
      o.y = sunY() + d.y * rs;
      o.sy = sy; o.sx = sy * lerp(1.2, 2.2, q);
      o.c = 1;
    },
    captions: [
      { at: 9.2, to: Infinity, text: 'Risk management that keeps running.' },
      {
        at: 11, to: Infinity, cls: 'link',
        html: '<a href="https://www.risqui.nl" target="_blank" rel="noopener">Start your free trial at risqui.nl</a><small>30 days free · No credit card</small>',
      },
    ],
    music(M) {
      M.pad(0, 'Bb2 F3 D4 A4', 2.8, 0.26); M.sub(0, 'Bb1', 2.8, 0.2);
      ['F5', 'G5', 'A5', 'C6', 'D6', 'F6'].forEach((n, L) => { M.marimba(LAND(L), n, 0.26, (L / 5 - 0.5) * 0.9); M.drop(LAND(L) - 0.3, n, 0.05); });
      M.drop(IDROP[0] + 0.25, 'A5', 0.22, -0.4); M.drop(IDROP[1] + 0.25, 'C6', 0.22, 0.5);
      M.whoosh(SUN[0], 2.4, 0.14, 200, 5000);
      M.boom(SUN[1], 0.5); M.bell(SUN[1], 'F6', 0.3); M.ep(SUN[1], 'F3', 0.4); M.ep(SUN[1], 'F2', 0.34);
      M.pad(SUN[1], 'F3 C4 E4 A4 C5', 6.4, 0.3); M.sub(SUN[1], 'F1', 6.4, 0.28);
      M.pad(9.2, 'F3 A3 C4 E4 G4', 2.8, 0.26); M.sub(9.2, 'F2', 2.8, 0.22);
      for (let s = 0; s < DASH.length; s++) M.tick(dashIn(s) + 0.1, 0.05, s % 2 ? 0.5 : -0.5);
      M.ep(9.2, 'A5', 0.2); M.ep(9.7, 'C6', 0.16); M.ep(10.2, 'G5', 0.16);
      M.ep(11, 'F5', 0.22); M.bell(11, 'C7', 0.1);
      M.pad(12, 'Bb2 F3 A3 D4', 4, 0.2);
      M.pad(16, 'F3 C4 G4 A4', 4, 0.2);
      M.ep(16, 'F5', 0.14); M.ep(17, 'A5', 0.1);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12];
  BJ.introPose = S1.pose;
})();
