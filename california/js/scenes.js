/* The film. Eleven scenes, each a Fibonacci number of bars long.
   Every scene defines:
     pose(i, t, b, o)  where dot i should be at local time t (s) / b (beats)
     blend            how dots travel from the previous formation
     captions          copy, timed in beats
     music(M)          the score, timed in the same beats as the choreography */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, hit = BJ.hit, clamp = BJ.clamp, lerp = BJ.lerp;
  const wob = BJ.wobble, antic = BJ.antic;
  const N = BJ.N, GA = BJ.GA, TAU = BJ.TAU, frac = BJ.frac, ms = BJ.ms;

  const hide = (o) => { o.sx = o.sy = 0; o.o = 0; };
  const maxHit = (b, times, decay) => { let e = 0; for (const t of times) e = Math.max(e, hit(b, t, decay)); return e; };

  // =========================================================== 1 · a point
  const HERO = 1.6;
  const S1 = {
    name: 'point',
    beats: 12,
    blend: { dur: 0.01 },
    pose(i, t, b, o) {
      if (i) return hide(o);
      const BIG = [1, 5, 9], SMALL = [3, 7, 11];
      let big = 0, small = 0, pre = 0, jel = 0;
      for (const at of BIG) { big += hit(b, at, 3.2, 0.02); pre += antic(b, at, 0.35); jel += wob(b, at, 2.2, 4.5); }
      for (const at of SMALL) { small += hit(b, at, 6, 0.02); jel += 0.4 * wob(b, at, 3, 7); }
      const s = HERO * (1 + 0.5 * big + 0.16 * small - 0.14 * pre);
      o.sx = s * (1 + 0.16 * jel + 0.06 * pre); o.sy = s * (1 - 0.16 * jel - 0.08 * pre);
      o.y = -G.R * 0.04 * big + G.R * 0.012 * pre;
    },
    captions: [{ at: 1.6, to: 11.4, text: 'It starts with a single point.' }],
    music(M) {
      M.pad(1, 'D3 A3 F#4', 11, 0.45);
      M.sub(1, 'D2', 10, 0.3);
      M.ep(1, 'D5', 0.55); M.ep(3, 'A5', 0.16);
      M.ep(5, 'A4', 0.5); M.ep(7, 'E5', 0.16);
      M.ep(9, 'F#5', 0.5); M.ep(11, 'D6', 0.16);
    },
  };

  // =========================================================== 2 · a line of code
  // One dot divides on every beat (1→2→4…→150) into a single line, which then
  // "types" itself out into rows of code.
  const LV = (function () {
    const cnt = [], rank = [], slot = [[0]];
    for (let m = 0; m <= 8; m++) cnt.push(Math.min(1 << m, N));
    for (let m = 1; m <= 8; m++) {
      const half = 1 << (m - 1), arr = [];
      for (let j = 0; j < cnt[m]; j++) arr[j] = j < half ? 2 * slot[m - 1][j] : 2 * slot[m - 1][j - half] + 1;
      slot.push(arr);
    }
    for (let m = 0; m <= 8; m++) {
      const r = [];
      slot[m].map((s, j) => j).sort((a, c) => slot[m][a] - slot[m][c]).forEach((j, k) => (r[j] = k));
      rank.push(r);
    }
    return { cnt, rank };
  })();
  const parentOf = (j) => { let p = 1; while (p * 2 <= j) p *= 2; return j - p; };
  const anc = (j, m) => { while (j >= LV.cnt[m]) j = parentOf(j); return j; };
  const lineL = () => Math.min(G.W * 0.84, G.R * 3.2);
  const lvlScale = (m) => HERO * Math.pow(0.5 / HERO, m / 8);
  function linePos(m, j) {
    const n = LV.cnt[m];
    const sp = n > 1 ? Math.min(G.dot * lvlScale(m) * 2.4, lineL() / (n - 1)) : 0;
    return (LV.rank[m][j] - (n - 1) / 2) * sp;
  }
  const CODE_ROWS = [[0, 10], [1, 14], [2, 12], [2, 16], [1, 6], [1, 13], [2, 15], [3, 11], [2, 8], [1, 4], [1, 15], [2, 14], [0, 12]];
  const CODE = (function () {
    const r = BJ.rng(2007), slots = [];
    let W = 0;
    CODE_ROWS.forEach(([ind, len], row) => {
      let xc = ind * 2, tok = 0, tokLen = 2 + Math.floor(r() * 5);
      for (let c = 0; c < len; c++) {
        slots.push({ row, xc, col: c });
        xc++; tok++;
        if (tok >= tokLen && c < len - 1) { xc++; tok = 0; tokLen = 2 + Math.floor(r() * 5); }
      }
      W = Math.max(W, xc);
    });
    return { slots, W, H: CODE_ROWS.length };
  })();
  const rowStart = (row) => 9 + row * 0.75;
  const charStart = (sl) => rowStart(sl.row) + sl.col * 0.05;
  const KEY = 0.22; // beats a character spends in flight
  function codePos(sl) {
    const cw = Math.min(lineL() / CODE.W, (G.R * 2.2) / (CODE.H * 1.75));
    return { x: (sl.xc - (CODE.W - 1) / 2) * cw, y: (sl.row - (CODE.H - 1) / 2) * cw * 1.75, s: (cw * 0.62) / G.dot };
  }
  const S2 = {
    name: 'code',
    beats: 20,
    blend: { dur: 0.3 },
    pose(i, t, b, o) {
      const mm = Math.max(0, Math.min(8, Math.floor(b)));
      let x = 0, s = 0;
      if (mm === 0) { s = i === 0 ? lvlScale(0) : 0; }
      else {
        const p = E.snap(clamp((b - mm) / 0.7));
        const cur = LV.cnt[mm], pc = LV.cnt[mm - 1];
        if (i < cur) {
          const from = i < pc ? linePos(mm - 1, i) : linePos(mm - 1, parentOf(i));
          x = lerp(from, linePos(mm, i), p);
          s = lerp(i < pc ? lvlScale(mm - 1) : 0, lvlScale(mm), clamp(p));
        } else { x = linePos(mm, anc(i, mm)); s = 0; }
      }
      o.x = x; o.y = 0; o.sx = o.sy = Math.max(0, s); o.o = s > 0 ? 1 : 0;
      if (mm >= 1) {
        const sq = wob(b, mm + 0.08, 2.6, 6);
        o.sx *= 1 + 0.25 * sq; o.sy *= 1 - 0.25 * sq;
      }
      if (b > 8.6) {
        const sl = CODE.slots[LV.rank[8][i]], c0 = charStart(sl);
        const lift = antic(b, c0, 0.2);
        o.y += G.R * 0.03 * lift;
        const q = E.inOutCubic(clamp((b - c0) / KEY));
        if (q > 0) {
          const cp = codePos(sl), land = wob(b, c0 + KEY, 3, 7);
          o.x = lerp(linePos(8, i), cp.x, q);
          o.y = cp.y * q - Math.sin(Math.PI * q) * G.R * 0.2;
          const s = lerp(lvlScale(8), cp.s, q);
          o.sx = s * (1 + 0.45 * land); o.sy = s * (1 - 0.45 * land);
          o.y += cp.s * G.dot * 0.25 * Math.max(0, land);
        }
      }
    },
    captions: [
      { at: 0.6, to: 8.8, text: '2005. One line of code.' },
      { at: 9.4, to: 19.4, words: [['Then another.', 9.4], ['And another.', 12]] },
    ],
    music(M) {
      M.pad(0, 'D3 A3 E4', 9, 0.38);
      ms('D4 F#4 A4 B4 D5 E5 F#5 A5').forEach((n, k) => M.ep(k + 1, n, 0.3 + k * 0.025));
      M.bass(8, 'D2', 1, 0.45);
      const mel = ms('F#5 E5 D5 B4 D5 B4 A4 G4 A4 B4 C#5 E5 D5');
      CODE_ROWS.forEach((r, row) => M.ep(rowStart(row), mel[row], 0.34, 0));
      CODE.slots.forEach((sl) => M.tick(charStart(sl) + KEY, 0.035, (sl.xc / CODE.W - 0.5) * 0.8));
      M.bass(9, 'B1', 3, 0.42); M.bass(12, 'G1', 3, 0.42); M.bass(15, 'A1', 3, 0.42); M.bass(18, 'D2', 2, 0.42);
      M.pad(9, 'B2 F#3 D4', 3, 0.32); M.pad(12, 'G2 D3 B3', 3, 0.32); M.pad(15, 'A2 E3 C#4', 3, 0.32); M.pad(18, 'D3 A3 F#4', 2.5, 0.32);
    },
  };

  // =========================================================== 3 · a signal
  // A travelling sine wave (the arpeggio literally reads its height at the centre),
  // a rotating double helix, then a digital signal spelling "BJ" in ASCII.
  const BITS = [0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0]; // 'B' 0x42, 'J' 0x4A
  const S3 = {
    name: 'signal',
    beats: 20,
    blend: { dur: 1.1, stagger: 0.6, ease: E.snap, arc: 0.12 },
    camera: (b) => ({ zoom: 1 + 0.05 * (hit(b, 10, 5) + hit(b, 12, 5) + hit(b, 14.6, 5)) }),
    pose(i, t, b, o) {
      const u = i / 149 - 0.5, Lw = Math.min(G.W * 0.88, G.R * 3.4);
      const A = G.R * 0.32 * E.inOutCubic(clamp(b / 3));
      const ph = (TAU * b) / 4, kx = TAU * 1.25 * u;
      const h = E.inOutCubic(clamp((b - 10) / 1.5)), strand = i & 1;
      const th = ph - kx + strand * Math.PI * h;
      let y = -A * Math.sin(th), z = A * Math.cos(th) * h, s = 0.85, op = 1;
      if (h > 0) op = lerp(1, 0.4 + 0.6 * (Math.cos(th) + 1) / 2, h);
      if (b < 14) s *= 1 + 1.1 * hit(b, Math.floor(b * 2) / 2, 5) * Math.exp(-Math.pow(u / 0.045, 2));
      const q = Math.min(15, Math.floor((i / N) * 16));
      const d = E.snap(clamp((b - 13.8 - q * 0.05) / 1));
      if (d > 0) {
        const bit = BITS[q], lvl = bit ? 1 : -1;
        const e = hit(b, 15 + q * 0.25, 4, 0.02), w = wob(b, 15 + q * 0.25, 3, 6);
        const yd = -lvl * G.R * 0.17 - e * G.R * 0.07;
        y = lerp(y, yd, d); z = lerp(z, 0, d);
        s = lerp(s, (bit ? 1.05 : 0.5) * (1 + 0.8 * e), d);
        op = lerp(op, bit ? 1 : 0.3 + 0.7 * e, d);
        o.sx = s * (1 - 0.3 * w * d); o.sy = s * (1 + 0.3 * w * d);
      } else o.sx = o.sy = s;
      o.x = u * Lw; o.y = y; o.z = z; o.o = op;
    },
    captions: [
      { at: 0.6, to: 9.5, text: 'In Delft, I learned that everything is a signal.' },
      { at: 10, to: 19.5, words: [['Light.', 10], ['Sound.', 12], ['Data.', 14.6]] },
    ],
    music(M) {
      const CH = { Bm: ms('B3 D4 F#4 B4 D5'), G: ms('G3 B3 D4 G4 B4'), D: ms('A3 D4 F#4 A4 D5'), A: ms('A3 C#4 E4 A4 C#5') };
      for (let j = 0; j < 28; j++) {
        const bt = j / 2, ph = (TAU * bt) / 4;
        const ch = bt < 4 ? CH.Bm : bt < 8 ? CH.G : bt < 12 ? CH.D : CH.A;
        const helix = bt >= 10;
        const hv = helix && j % 2 ? -Math.sin(ph) : Math.sin(ph);
        M.ep(bt, ch[Math.round(((hv + 1) / 2) * 4)], 0.26, helix ? (j % 2 ? 0.45 : -0.45) : 0);
      }
      let ones = 0;
      BITS.forEach((bit, q) => {
        const bt = 15 + q * 0.25;
        if (bit) M.marimba(bt, ['E5', 'A5', 'C#6'][ones++ % 3], 0.42, (q / 15 - 0.5) * 1.2);
        else M.marimba(bt, q % 2 ? 'A4' : 'E4', 0.22, (q / 15 - 0.5) * 1.2);
        M.tick(bt, 0.04);
      });
      M.bass(0, 'B1', 4, 0.4); M.bass(4, 'G1', 4, 0.4); M.bass(8, 'D2', 4, 0.4); M.bass(12, 'A1', 3, 0.4);
      for (let k = 0; k < 10; k++) M.bass(15 + k * 0.5, 'A1', 0.35, 0.36);
      M.pad(0, 'B2 F#3 D4', 4, 0.3); M.pad(4, 'G2 D3 B3', 4, 0.3); M.pad(8, 'D3 A3 F#4', 4, 0.3); M.pad(12, 'A2 E3 D4', 8, 0.3);
    },
  };

  // =========================================================== 4 · the world
  // A Fibonacci sphere, tilted 23.4°, and one dot travelling Amsterdam → Pennsylvania → Sydney.
  const SPH = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y), th = i * GA;
    SPH.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }
  const ll = (lat, lon) => {
    lat *= Math.PI / 180; lon *= Math.PI / 180;
    return [Math.cos(lat) * Math.sin(lon), -Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
  };
  const AMS = ll(52.37, 4.9), PA = ll(40.43, -78.4), SYD = ll(-33.87, 151.2);
  function slerp(a, c, t) {
    const d = clamp(a[0] * c[0] + a[1] * c[1] + a[2] * c[2], -1, 1), w = Math.acos(d);
    if (w < 1e-4) return a.slice();
    const s = Math.sin(w), k1 = Math.sin((1 - t) * w) / s, k2 = Math.sin(t * w) / s;
    return [a[0] * k1 + c[0] * k2, a[1] * k1 + c[1] * k2, a[2] * k1 + c[2] * k2];
  }
  function travel(b) {
    let v, lift = 1.08;
    const hop = (b0, b1) => E.inOutQuint(clamp((b - b0) / (b1 - b0)));
    if (b < 3) { v = AMS; lift -= 0.05 * antic(b, 3.6, 0.6); }
    else if (b < 5.5) { const p = hop(3, 5.5); v = slerp(AMS, PA, p); lift += 0.3 * Math.sin(Math.PI * p); }
    else if (b < 7) { v = PA; lift -= 0.05 * antic(b, 7.5, 0.5); }
    else if (b < 10) { const p = hop(7, 10); v = slerp(PA, SYD, p); lift += 0.35 * Math.sin(Math.PI * p); }
    else v = SYD;
    let lon = Math.atan2(v[0], v[2]);
    if (b > 7 && lon > 0) lon -= TAU; // unwrap across the date line
    return { v, lift, lon, lat: Math.asin(-v[1]) };
  }
  function globe(p, b, T) {
    const yaw = -T.lon - 0.3 + b * 0.03, al = -T.lat * 0.55 + 0.12;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), ca = Math.cos(al), sa = Math.sin(al);
    const x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy, y = p[1];
    return [x, y * ca - z * sa, y * sa + z * ca];
  }
  const angTo = (a, c) => Math.acos(clamp(a[0] * c[0] + a[1] * c[1] + a[2] * c[2], -1, 1));
  const RIPS = [[AMS, 3, 0.5], [PA, 5.5, 1], [PA, 7, 0.5], [SYD, 10, 1]];
  const S4 = {
    name: 'world',
    beats: 12,
    blend: { dur: 1.2, stagger: 0.9, ease: E.snap, arc: 0.2 },
    camera: (b) => ({ zoom: 1 + 0.06 * hit(b, 5.5, 3) + 0.06 * hit(b, 10, 3) }),
    pose(i, t, b, o) {
      const T = travel(b), Rs = G.R * 0.8;
      let p, s;
      if (i === 0) {
        p = T.v.map((c) => c * T.lift);
        const w = wob(b, 5.5, 2.5, 4) + wob(b, 10, 2.5, 4);
        s = 1.5 * (1 + 0.6 * hit(b, 5.5, 3) + 0.6 * hit(b, 10, 3));
        const q = globe(p, b, T);
        o.x = q[0] * Rs; o.y = q[1] * Rs; o.z = q[2] * Rs; o.sx = s * (1 + 0.3 * w); o.sy = s * (1 - 0.3 * w);
        return;
      } else {
        // a ring travels over the surface from every take-off and landing
        let lift = 1, glow = 0;
        for (const [c, at, amp] of RIPS) {
          const x = b - at;
          if (x <= 0 || x > 4) continue;
          const f = (angTo(SPH[i], c) - x * 0.9) / 0.22;
          const w = amp * Math.exp(-f * f) * Math.exp(-x * 0.8);
          lift += 0.12 * w; glow += w;
        }
        if ((b > 3 && b < 5.5) || (b > 7 && b < 10)) {
          const d = angTo(SPH[i], T.v);
          if (d < 0.35) { const w = 1 - d / 0.35; lift += 0.1 * w * w; glow += 0.8 * w * w; }
        }
        p = SPH[i].map((c) => c * lift); s = 0.72 * (1 + 0.9 * glow);
      }
      const q = globe(p, b, T);
      o.x = q[0] * Rs; o.y = q[1] * Rs; o.z = q[2] * Rs; o.sx = o.sy = s;
      o.o = i === 0 ? 1 : 0.16 + 0.84 * clamp((q[2] + 1) / 2);
    },
    captions: [
      { at: 0.6, to: 5.2, text: 'Curiosity took me further.' },
      { at: 5.6, to: 11.5, words: [['Pennsylvania.', 5.6], ['Sydney.', 10]] },
    ],
    music(M) {
      M.pad(0, 'G2 D3 F#3 B3', 6, 0.38); M.pad(6, 'A2 E3 A3 C#4', 6, 0.38);
      M.bass(0, 'G1', 5.8, 0.35); M.bass(6, 'A1', 5.8, 0.35);
      ms('B5 A5 F#5 D5 B4').forEach((n, k) => M.ep(k * 0.5, n, 0.22 - k * 0.02));
      M.whoosh(3, 2.5, 0.16, 250, 2500); M.bell(5.5, 'B5', 0.4, -0.2); M.ep(5.5, 'D5', 0.2);
      M.whoosh(7, 3, 0.18, 250, 3200); M.bell(10, 'F#6', 0.4, 0.2); M.ep(10, 'A4', 0.2); M.ep(10, 'E5', 0.18);
    },
  };

  // =========================================================== 5 · motion
  // famo.us: a 5×6×5 lattice spinning in real 3D, then a 15×10 membrane with
  // ripples that start on every chord stab.
  const RIPPLES = [8, 10, 12, 14, 16, 18];
  function rotYX(X, Y, Z, yaw, pit) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x = X * cy + Z * sy, z = -X * sy + Z * cy;
    const cp = Math.cos(pit), sp = Math.sin(pit);
    return [x, Y * cp - z * sp, Y * sp + z * cp];
  }
  // Minimum-total-travel pairing (Hungarian algorithm): every dot takes the nearest free slot,
  // so one formation morphs into the next without dots crossing the screen.
  function assign(n, cost) {
    const INF = 1e18, u = new Float64Array(n + 1), v = new Float64Array(n + 1);
    const p = new Int32Array(n + 1), way = new Int32Array(n + 1);
    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const minv = new Float64Array(n + 1).fill(INF), used = new Uint8Array(n + 1);
      do {
        used[j0] = 1;
        const i0 = p[j0];
        let delta = INF, j1 = 0;
        for (let j = 1; j <= n; j++) {
          if (used[j]) continue;
          const cur = cost(i0 - 1, j - 1) - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= n; j++) {
          if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
        }
        j0 = j1;
      } while (p[j0] !== 0);
      do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
    }
    const out = new Int32Array(n);
    for (let j = 1; j <= n; j++) out[p[j] - 1] = j - 1;
    return out;
  }
  const CELL = new Int32Array(N).map((_, i) => i), MEM = new Int32Array(N).map((_, i) => i);
  const latSpacing = () => G.R * 0.24;
  const memSpacing = () => Math.min((G.R * 2.9) / 14, (G.W * 0.84) / 14);
  const MEM_TILT = 0.95;
  // The cube holds still while it forms, then turns a sixth of a revolution on every kick:
  // fast on the beat, gliding to rest before the next one.
  function latYaw(b) {
    if (b < 2) return 0.4;
    const n = Math.floor(b);
    return 0.4 + (Math.PI / 6) * (n - 2 + E.outCubic(clamp((b - n) / 0.9)));
  }
  const latPitch = (b) => 0.5 + 0.16 * Math.sin(b * 0.45);
  function latticeAt(j, b, sp) {
    const a = (j % 5) - 2, c = (Math.floor(j / 5) % 6) - 2.5, d = Math.floor(j / 30) - 2;
    return rotYX(a * sp, c * sp, d * sp, latYaw(b), latPitch(b));
  }
  function membraneRest(m) {
    const gs = memSpacing(), u = ((m % 15) - 7) * gs, v = (Math.floor(m / 15) - 4.5) * gs;
    return [u, v * Math.cos(MEM_TILT), v * Math.sin(MEM_TILT)];
  }
  const S5 = {
    name: 'motion',
    beats: 20,
    blend: { dur: 1.9, ease: E.inOutCubic, start: (i) => frac(i * 0.618034) * 0.35 },
    camera: (b) => ({ zoom: 1 + (b >= 2 && b < 8 ? 0.02 * hit(b, Math.floor(b), 6) : 0) }),
    enter(prev) {
      const sp = latSpacing(), T = [];
      for (let j = 0; j < N; j++) T.push(latticeAt(j, 1, sp));
      const d2 = (ax, ay, az, q) => (ax - q[0]) ** 2 + (ay - q[1]) ** 2 + (az - q[2]) ** 2;
      CELL.set(assign(N, (i, j) => d2(prev.x[i], prev.y[i], prev.z[i], T[j])));
      // and pair each cube slot with the membrane slot nearest to where it will be when the cube unfolds
      const L = [], M = [];
      for (let j = 0; j < N; j++) { L.push(latticeAt(j, 7.6, sp)); M.push(membraneRest(j)); }
      MEM.set(assign(N, (j, m) => d2(L[j][0], L[j][1], L[j][2], M[m])));
    },
    pose(i, t, b, o) {
      const j = CELL[i];
      const kick = b >= 2 && b < 8 ? hit(b, Math.floor(b), 5) : 0;
      const sp = latSpacing() * (1 + 0.08 * kick);
      const L = latticeAt(j, b, sp);
      let x = L[0], y = L[1], z = L[2], s = 0.8, op = clamp(0.55 + (z / (G.R * 1.2)) * 0.45, 0.2, 1);
      if (b > 7.4) {
        const m = MEM[j], gi = m % 15, gj = Math.floor(m / 15);
        const gs = memSpacing();
        let u = (gi - 7) * gs, v = (gj - 4.5) * gs;
        const dist = Math.sqrt(u * u + v * v);
        const psi = (b - 8) * 0.05, cps = Math.cos(psi), sps = Math.sin(psi);
        [u, v] = [u * cps - v * sps, u * sps + v * cps];
        let hh = G.R * 0.03 * hit(b, Math.floor(b), 6), amp = 0;
        for (const rb of RIPPLES) {
          const dt = b - rb;
          if (dt <= 0) continue;
          const lam = gs * 2.2, f = dist - gs * 4.2 * dt;
          const w = Math.exp(-dt * 0.55) * Math.exp(-(f / lam) * (f / lam));
          hh += G.R * 0.22 * w * Math.cos((f / lam) * 2.2);
          amp += w;
        }
        const ta = MEM_TILT, gx = u, gy = v * Math.cos(ta) - hh * Math.sin(ta), gz = v * Math.sin(ta) + hh * Math.cos(ta);
        const g = E.inOutCubic(clamp((b - 7.6 - ((gi + gj) / 23) * 0.9) / 1.4));
        x = lerp(x, gx, g); y = lerp(y, gy, g); z = lerp(z, gz, g);
        s = lerp(s, 0.8 * (1 + 0.35 * amp), g);
        op = lerp(op, clamp(0.6 + (gz / (G.R * 1.5)) * 0.6, 0.25, 1), g);
      }
      o.x = x; o.y = y; o.z = z; o.sx = o.sy = s; o.o = op;
    },
    captions: [
      { at: 0.6, to: 7.4, text: 'San Francisco. Famo.us.' },
      { at: 8, to: 14, text: 'We made the web move at sixty frames a second.' },
      { at: 14.5, to: 19.5, text: 'Web animations everywhere.' },
    ],
    music(M) {
      const bars = [['D2', 'F#4 A4 D5 E5'], ['A1', 'E4 A4 C#5 E5'], ['B1', 'F#4 B4 D5 F#5'], ['G1', 'G4 B4 D5 F#5'], ['D2', 'F#4 A4 D5 E5']];
      const pads = ['D3 A3 F#4', 'A2 E3 C#4', 'B2 F#3 D4', 'G2 D3 B3', 'D3 A3 F#4'];
      bars.forEach(([root, chord], bar) => {
        for (let k = 0; k < 8; k++) M.bass(bar * 4 + k * 0.5, root, 0.36, k % 2 ? 0.28 : 0.38);
        M.pad(bar * 4, pads[bar], 4, 0.26);
      });
      for (let bt = 0; bt < 20; bt++) M.kick(bt, 0.5);
      for (let bt = 4; bt < 20; bt++) M.tick(bt + 0.5, 0.07, 0.2);
      const chordAt = (bt) => ms(bars[Math.min(4, Math.floor(bt / 4))][1]);
      [0, 2.5, 4, 6.5].forEach((bt) => chordAt(bt).forEach((n) => M.ep(bt, n, 0.2)));
      RIPPLES.forEach((bt) => chordAt(bt).forEach((n, k) => M.ep(bt + k * 0.03, n, 0.24)));
    },
  };

  // =========================================================== 6 · connection
  // WebRTC: two peers that take turns speaking, packets flowing between them.
  const SPEAK_L = [0, 0.5, 4, 4.5, 8, 8.5], SPEAK_R = [2, 2.5, 6, 6.5, 10, 10.5];
  const S6 = {
    name: 'connect',
    beats: 12,
    blend: { dur: 1.1, stagger: 0.7, ease: E.snap, arc: 0.2, order: (i) => (i < 120 ? (i % 60) / 59 : 1) },
    pose(i, t, b, o) {
      const Rx = Math.min(G.R * 1.1, G.W * 0.27), rr = Math.min(G.R * 0.46, G.W * 0.15);
      if (i < 120) {
        const side = i < 60 ? -1 : 1, k = i % 60, spk = side < 0 ? SPEAK_L : SPEAK_R, oth = side < 0 ? SPEAK_R : SPEAK_L;
        let e = 0, er = 0, voice = 0, lean = 0;
        for (const at of spk) {
          er = Math.max(er, hit(b, at, 3, 0.02));
          e = Math.max(e, hit(b, at + (k / 60) * 0.45, 4.5));
          voice = Math.max(voice, hit(b, at, 1.6, 0.03));
        }
        for (const at of oth) lean = Math.max(lean, hit(b, at, 2.2) * 0.6 + antic(b, at, 0.3) * 0.4);
        const ang = (TAU * k) / 60 + side * b * 0.12 - Math.PI / 2;
        // the speaker's ring becomes a voice: a waveform wrapped around a circle
        const vf = Math.sin(5 * ang + b * 9) * 0.6 + Math.sin(3 * ang - b * 6 + side) * 0.4;
        const r = rr * (1 + 0.12 * er + 0.2 * voice * vf);
        // the listener leans in
        o.x = side * Rx * (1 - 0.07 * lean) + Math.cos(ang) * r; o.y = Math.sin(ang) * r;
        o.sx = o.sy = 0.75 * (1 + 0.8 * e);
      } else {
        const k = i - 120, lr = k < 15, u = frac(b / 2 + (k % 15) / 15);
        const x0 = -Rx + rr * 1.2, x1 = Rx - rr * 1.2, a = lr ? x0 : x1, c = lr ? x1 : x0;
        o.x = (1 - u) * (1 - u) * a + u * u * c;
        o.y = 2 * u * (1 - u) * (lr ? -1 : 1) * G.R * 0.55;
        const w = Math.sqrt(Math.sin(Math.PI * u));
        o.sx = o.sy = 0.55 * w; o.o = w;
      }
    },
    captions: [
      { at: 0.6, to: 5.6, text: 'Then video, peer to peer.' },
      { at: 6, to: 11.5, words: [['No plugins.', 6], ['Just people.', 8]] },
    ],
    music(M) {
      M.pad(0, 'E3 B3 D4 G4', 6, 0.32); M.pad(6, 'A2 E3 G3 D4', 6, 0.32);
      M.bass(0, 'E2', 5.8, 0.36); M.bass(6, 'A1', 5.8, 0.36);
      const calls = [['E5', 'G5', 'B4', 'D5'], ['F#5', 'A5', 'D5', 'E5'], ['G5', 'B5', 'E5', 'C#5']];
      calls.forEach((c, bar) => {
        M.ep(bar * 4, c[0], 0.36, -0.7); M.ep(bar * 4 + 0.5, c[1], 0.3, -0.7);
        M.ep(bar * 4 + 2, c[2], 0.36, 0.7); M.ep(bar * 4 + 2.5, c[3], 0.3, 0.7);
      });
    },
  };

  // =========================================================== 7 · scale
  // Hadoop: ten small machines light up in sequence (map), then collapse into one (reduce).
  const SNAKE = [0, 1, 2, 3, 4, 9, 8, 7, 6, 5];
  const ACTS = [];
  SNAKE.forEach((c, k) => (ACTS[c] = [1 + k * 0.5, 6 + (9 - k) * 0.25]));
  const clusterX = (c) => ((c % 5) - 2) * Math.min(G.W * 0.18, G.R * 0.66);
  const S7 = {
    name: 'scale',
    beats: 12,
    blend: { dur: 1.5, stagger: 0.8, ease: E.inOutCubic, arc: 0.15, order: (i) => Math.floor(i / 15) / 9 },
    pose(i, t, b, o) {
      const c = Math.floor(i / 15), m = i % 15;
      const spX = Math.min(G.W * 0.18, G.R * 0.66), spY = G.R * 0.75, rc = Math.min(spX * 0.32, G.R * 0.19);
      const e = Math.max(hit(b, ACTS[c][0], 3.5), hit(b, ACTS[c][1], 4));
      // each machine spins up like a drive when it's given work, then coasts
      let boost = 0;
      for (const at of ACTS[c]) if (b > at) boost += 1.4 * (1 - Math.exp(-(b - at) * 1.8));
      const th = m * GA + (b * 0.3 + boost) * (c % 2 ? 1 : -1), r = rc * Math.sqrt((m + 0.5) / 15) * (1 + 0.35 * e);
      let x = clusterX(c) + Math.cos(th) * r, y = (Math.floor(c / 5) - 0.5) * spY + Math.sin(th) * r, s = 0.7 * (1 + 0.5 * e);
      const g = E.inOutCubic(clamp((b - 8.5 - (c / 9) * 0.3) / 1.5));
      if (g > 0) {
        const land = hit(b, 10, 3);
        const r2 = G.R * 0.36 * Math.sqrt((i + 0.5) / N) * (1 + 0.1 * land), th2 = i * GA + b * 0.1;
        x = lerp(x, Math.cos(th2) * r2, g); y = lerp(y, Math.sin(th2) * r2, g); s = lerp(s, 0.62 * (1 + 0.4 * land), g);
      }
      o.x = x; o.y = y; o.sx = o.sy = s;
    },
    captions: [
      { at: 0.6, to: 8, text: 'Big data. Small machines.' },
      { at: 8.6, to: 11.5, text: 'One answer.' },
    ],
    music(M) {
      const P = ms('F#4 A4 B4 C#5 E5 F#5 A5 B5 C#6 E6');
      SNAKE.forEach((c, k) => {
        const pan = ((c % 5) - 2) * 0.35;
        M.marimba(ACTS[c][0], P[k], 0.4, pan);
        M.marimba(ACTS[c][1], P[k], 0.28, pan);
      });
      M.pad(0, 'F#3 C#4 E4 A4', 4, 0.3); M.pad(4, 'B2 F#3 D4 A4', 4.5, 0.3);
      M.bass(0, 'F#1', 3.8, 0.38); M.bass(4, 'B1', 4.3, 0.38);
      M.whoosh(8.5, 1.5, 0.2, 3000, 300);
      M.bass(10, 'G1', 2, 0.45); M.pad(10, 'G2 D3 B3 F#4', 2, 0.35);
      ms('G3 B3 D4 F#4 A4').forEach((n, k) => M.ep(10 + k * 0.04, n, 0.28));
    },
  };

  // =========================================================== 8 · share
  // Microsoft: one voice at the centre, rings carrying each idea outward,
  // then the rings unfold into a dotted map of the world, lighting up city by city.
  const RINGS = [1, 7, 14, 21, 28, 35, 44];
  const RING = [], RIDX = [];
  (function () { let i = 0; RINGS.forEach((n, k) => { for (let j = 0; j < n; j++) { RING[i] = k; RIDX[i] = j; i++; } }); })();
  const EMIT = [0, 2, 4, 6];
  const ringAng = (i, b) => (TAU * RIDX[i]) / RINGS[RING[i]] + RING[i] * 0.4 + (RING[i] % 2 ? 1 : -1) * b * 0.07;
  // 150 land cells on a staggered 9.5° grid (Natural Earth 1:110m, public domain)
  const MAP = (function () {
    const rows = ['00000010000001110000000000011111101', '00111111000000000001011111111111111', '000000111101000000110111111111111',
      '00000111111000000010100011111111', '0000001111110000001000010111111001', '0000000100000000011110111111111',
      '000000000000000001111111100101', '000000000000000001111110001', '000000000001100000011111000001',
      '0000000000111100000011', '00000000000111100000011', '0000000000011100000011000000000111',
      '00000000000010000000010000000001111', '00000000000100000000000000000000001', '000000000001'];
    const d = 9.5, dy = 8.227, lat0 = 74, latC = lat0 - (rows.length * dy) / 2, cells = [];
    rows.forEach((row, r) => [...row].forEach((v, c) => {
      if (v === '1') cells.push({ lon: -180 + (c + 0.5 + (r % 2) * 0.5) * d, lat: lat0 - (r + 0.5) * dy });
    }));
    const near = (lat, lon) => cells.reduce((bi, x, k) => {
      const dd = Math.hypot((x.lon - lon) * Math.cos((lat * Math.PI) / 180), x.lat - lat);
      return dd < bi[0] ? [dd, k] : bi;
    }, [1e9, -1])[1];
    const home = near(52.4, 4.9);
    // hand the other 149 cells to the ring dots by angle, so the unfolding doesn't tangle
    const ang = (x) => Math.atan2(-(x.lat - latC) * 1.6, x.lon);
    const others = cells.map((x, k) => k).filter((k) => k !== home).sort((a, b) => ang(cells[a]) - ang(cells[b]));
    const dots = [];
    for (let i = 1; i < N; i++) dots.push(i);
    dots.sort((a, b) => Math.atan2(Math.sin(ringAng(a, 8)), Math.cos(ringAng(a, 8))) - Math.atan2(Math.sin(ringAng(b, 8)), Math.cos(ringAng(b, 8))));
    const of = [home];
    dots.forEach((i, j) => (of[i] = others[j]));
    // west to east, a city every sixteenth
    const CITIES = [[47.6, -122.3], [40.7, -74], [-23.5, -46.6], [6.5, 3.4], [13, 77.6], [1.35, 103.8], [35.7, 139.7], [-33.9, 151.2]];
    const lit = CITIES.map(([la, lo], j) => ({ cell: near(la, lo), at: 9.5 + j * 0.25 }));
    return { cells, of, lit, d, latC, home };
  })();
  const S8 = {
    name: 'share',
    beats: 12,
    blend: { dur: 1.1, ease: E.snap, arc: 0.25, start: (i) => RING[i] * 0.25 },
    pose(i, t, b, o) {
      const k = RING[i], gap = G.R * 0.155;
      const e = maxHit(b, EMIT.map((em) => em + k * 0.25), 3.5);
      const ang = ringAng(i, b), r = k * gap * (1 + 0.12 * e);
      let x = Math.cos(ang) * r, y = Math.sin(ang) * r, z = 0, s = k === 0 ? 1.7 * (1 + 0.5 * e) : 0.7 * (1 + 0.8 * e);
      const cell = MAP.cells[MAP.of[i]];
      const st = i === 0 ? 8 : 8 + ((cell.lon + 180) / 360) * 0.9;
      const g = E.snap(clamp((b - st) / (i === 0 ? 1 : 1.1)));
      if (g > 0) {
        const Wm = Math.min(G.W * 0.92, G.R * 3.6), kp = Wm / 360, sp = MAP.d * kp;
        const mx = cell.lon * kp, my = -(cell.lat - MAP.latC) * kp;
        // each city sends a ripple across the map
        let wave = 0, glow = 0;
        for (const c of MAP.lit) {
          const cc = MAP.cells[c.cell], dist = Math.hypot(cc.lon - cell.lon, cc.lat - cell.lat) / MAP.d;
          if (c.cell === MAP.of[i]) glow = Math.max(glow, hit(b, c.at, 5));
          else if (dist < 4) wave += hit(b, c.at + dist * 0.12, 3) * (1 - dist / 4) * 0.5;
        }
        const home = i === 0 ? hit(b, 9, 4) : 0;
        const ms = (sp * 0.6) / G.dot * (1 + 0.3 * wave + 1.3 * glow) * (i === 0 ? 1.25 + 0.6 * home : 1);
        x = lerp(x, mx, g); y = lerp(y, my, g); z = lerp(0, G.R * 0.12 * (wave + glow), g); s = lerp(s, ms, g);
        o.o = lerp(1, i === 0 || glow > 0.05 ? 1 : 0.7 + 0.3 * Math.min(1, wave * 2), g);
      }
      o.x = x; o.y = y; o.z = z; o.sx = o.sy = s;
    },
    captions: [
      { at: 0.6, to: 7.6, text: 'At Microsoft, I help others build theirs.' },
      { at: 8, to: 11.5, words: [['Startups.', 8], ['Developers.', 9], ['Companies.', 10]] },
    ],
    music(M) {
      const G_ = ms('G3 D4 G4 B4 D5 F#5 A5'), A_ = ms('A3 E4 A4 C#5 E5 A5 B5');
      EMIT.forEach((em) => (em < 4 ? G_ : A_).forEach((n, k) => M.ep(em + k * 0.25, n, 0.38 - k * 0.035, (k % 2 ? 1 : -1) * k * 0.08)));
      M.whoosh(8, 2, 0.12, 300, 4000);
      M.ep(9, 'D5', 0.26); M.bell(9, 'A5', 0.2, 0.05);
      const HI = ms('D6 E6 F#6 A6 B6 A6 F#6 E6');
      MAP.lit.forEach((c, j) => M.marimba(c.at, HI[j], 0.3, clamp(MAP.cells[c.cell].lon / 150, -1, 1) * 0.8));
      M.bass(0, 'G1', 3.8, 0.38); M.bass(4, 'A1', 3.8, 0.38); M.bass(8, 'B1', 3.8, 0.38);
      M.pad(0, 'G2 D3 B3', 4, 0.3); M.pad(4, 'A2 E3 C#4', 4, 0.3); M.pad(8, 'B2 F#3 D4 A4', 4, 0.3);
    },
  };

  // =========================================================== 9 · gravity
  // His name hangs from strings, exactly like the letters on me.bartj.blog.
  // Then the strings are cut and the physics — and the music — take over.
  const FONT = {
    B: ['11110', '10001', '11110', '10001', '11110'],
    A: ['01110', '10001', '11111', '10001', '10001'],
    R: ['11110', '10001', '11110', '10010', '10001'],
    T: ['11111', '00100', '00100', '00100', '00100'],
    J: ['00111', '00010', '00010', '10010', '01100'],
    N: ['10001', '11001', '10101', '10011', '10001'],
    S: ['01111', '10000', '01110', '00001', '11110'],
    E: ['11111', '10000', '11110', '10000', '11111'],
  };
  const WORD = (function () {
    const lines = ['BART', 'JANSEN'], cells = [], letters = [];
    lines.forEach((word, li) => {
      const w = word.length * 6 - 1;
      [...word].forEach((ch, k) => {
        const L = letters.length, col0 = k * 6 - (w - 1) / 2, row0 = li * 7.2;
        letters.push({ cx: col0 + 2, top: row0 });
        FONT[ch].forEach((row, r) => [...row].forEach((v, c) => { if (v === '1') cells.push({ L, c: col0 + c, r: row0 + r, s: 0.74 }); }));
      });
    });
    let L = 0;
    while (cells.length < N) {
      const lt = letters[L % letters.length], up = L < letters.length ? 1.1 : 2.2;
      cells.push({ L: L % letters.length, c: lt.cx, r: lt.top - up, s: 0.34 });
      L++;
    }
    return { cells, letters };
  })();
  const CUT = 6;
  const dropAt = (L) => 0.5 + L * 0.25; // one letter every eighth: B A R T  J A N S E N
  const DROP_NOTES = ['D5', 'E5', 'F#5', 'A5', 'B4', 'D5', 'E5', 'F#5', 'A5', 'D6'];
  const cellSize = () => Math.min((G.W * 0.86) / 35, (G.R * 2.9) / 35);
  const floorY = () => Math.min(G.R * 1.15, G.textY - G.cy - G.H * 0.06);
  const wallX = () => Math.min(G.W / 2 - G.dot, G.R * 2.4);
  function letterPos(i, b) {
    const cs = cellSize(), cl = WORD.cells[i], lt = WORD.letters[cl.L];
    const px = lt.cx * cs, py = (lt.top - 5.6 - 2.6) * cs - G.R * 0.2;
    let x = cl.c * cs, y = (cl.r - 5.6) * cs - G.R * 0.2;
    const dq = clamp((b - dropAt(cl.L)) / 1.4);
    const fall = (1 - E.spring(dq)) * G.R * 0.55;
    // the drop kicks the letter into a swing that then settles into the idle sway
    const th = 0.05 * Math.sin((TAU * b) / 4 + cl.L * 0.9) + 0.12 * wob(b, dropAt(cl.L) + 0.2, 0.9, 1.6) * (cl.L % 2 ? 1 : -1);
    const dx = x - px, dy = y - py, c = Math.cos(th), s = Math.sin(th);
    return { x: px + dx * c - dy * s, y: py + dx * s + dy * c - fall, rot: th, s: (cs * cl.s) / G.dot };
  }
  const world = new BJ.World(N);
  const S9 = {
    name: 'gravity',
    beats: 20,
    // each letter's dots zip up into place just as that letter is let go
    blend: { dur: 0.5, ease: E.inOutCubic, arc: 0.3, start: (i) => dropAt(WORD.cells[i].L) - 0.5 },
    enter() { world.active = false; },
    update(t, b, dt) {
      if (b < CUT) return;
      if (!world.active) {
        const r = BJ.rng(42), h = 0.02;
        for (let i = 0; i < N; i++) {
          const p = letterPos(i, b), q = letterPos(i, b - h);
          world.x[i] = p.x; world.y[i] = p.y;
          world.vx[i] = (p.x - q.x) / (h * BJ.BEAT) + (r() - 0.5) * G.R * 0.35;
          world.vy[i] = (p.y - q.y) / (h * BJ.BEAT) - r() * G.R * 0.25;
          world.r[i] = (G.dot * p.s) / 2;
          world.cool[i] = 0;
        }
        world.active = true;
        return;
      }
      const wx = wallX();
      world.step(dt, {
        g: G.R * 8, floor: floorY(), left: -wx, right: wx, thr: G.R * 0.6,
        onImpact: (x, v) => BJ.Audio.impact(clamp(x / wx, -1, 1), clamp(v / (G.R * 4.5))),
      });
    },
    pose(i, t, b, o) {
      if (b >= CUT && world.active) {
        o.x = world.x[i]; o.y = world.y[i];
        const p = letterPos(i, CUT);
        o.sx = o.sy = p.s;
        return;
      }
      const p = letterPos(i, b);
      o.x = p.x; o.y = p.y; o.rot = p.rot; o.sx = o.sy = p.s;
    },
    captions: [
      { at: 0.6, to: 5.7, text: 'These days, even my résumé runs on physics.' },
      { at: 6.2, to: 11.8, text: 'Cut the strings.' },
      { at: 12.4, to: 19.5, text: 'Let everything fall into place.' },
    ],
    music(M) {
      M.pad(0, 'D3 G3 A3 D4', 4.5, 0.32);
      DROP_NOTES.forEach((n, L) => { M.marimba(dropAt(L) + 0.2, n, 0.34, ((WORD.letters[L].cx) / 17) * 0.8); M.tick(dropAt(L) + 0.2, 0.04); });
      M.ep(4, 'E5', 0.2);
      M.whoosh(4, 2, 0.16, 400, 5000);
      M.snip(CUT);
      M.sub(8.5, 'D2', 10, 0.3);
      M.pad(10, 'D3 A3 C#4 F#4', 10, 0.26);
      M.ep(14, 'F#5', 0.14); M.ep(16, 'A5', 0.12); M.ep(18, 'E5', 0.12);
    },
  };

  // =========================================================== 10 · intention
  // The pile rises into a sunflower: 150 seeds on the golden angle.
  // Then its Fibonacci spirals (21 one way, 13 the other) are played like strings.
  const ctxShared = { kOf: new Int16Array(N) };
  const landAt = (k) => 2.3 + Math.floor((k / N) * 28) / 4;
  const armRank = (fam) => {
    const js = [...Array(fam).keys()].sort((a, c) => frac((a * GA) / TAU) - frac((c * GA) / TAU));
    const r = []; js.forEach((j, k) => (r[j] = k)); return r;
  };
  const R21 = armRank(21), R13 = armRank(13);
  function spiral(k, b10) {
    const c = (G.R * 0.95) / Math.sqrt(N), breathe = 1 + 0.025 * Math.sin((TAU * b10) / 8);
    const e = hit(b10, 10 + R21[k % 21] * 0.25, 3) + hit(b10, 15.5 + R13[k % 13] * 0.25, 3);
    const r = c * Math.sqrt(k + 0.5) * breathe * (1 + 0.06 * e), th = k * GA + b10 * 0.05;
    return { x: Math.cos(th) * r, y: Math.sin(th) * r, r, th, s: (0.55 + 0.75 * Math.sqrt(k / 149)) * (1 + 0.7 * e) };
  }
  const S10 = {
    name: 'intention',
    beats: 20,
    blend: { dur: 1, ease: E.inOutQuint, arc: 0.4, start: (i) => landAt(ctxShared.kOf[i]) - 1 },
    camera: (b) => ({ zoom: 1 + 0.035 * (hit(b, 10, 4) + hit(b, 15.5, 4) + hit(b, 19, 3)), rot: 0.03 * (wob(b, 10, 1, 2.5) - wob(b, 15.5, 1, 2.5)) }),
    enter(prev) {
      const idx = [...Array(N).keys()].sort((a, c) => Math.abs(prev.x[a]) - Math.abs(prev.x[c]) || prev.y[c] - prev.y[a]);
      idx.forEach((i, k) => (ctxShared.kOf[i] = k));
    },
    pose(i, t, b, o) {
      const k = ctxShared.kOf[i], p = spiral(k, b), la = landAt(k), w = wob(b, la, 3, 6);
      const s = p.s * (1 + 0.5 * hit(b, la, 4, 0.02));
      // squash along the radius as each seed lands
      o.x = p.x; o.y = p.y; o.rot = p.th; o.sx = s * (1 - 0.35 * w); o.sy = s * (1 + 0.35 * w);
    },
    captions: [
      { at: 0.6, to: 9.5, text: 'Twenty years of shipping software.' },
      { at: 10, to: 19.5, text: 'Every detail, intentional.' },
    ],
    music(M) {
      M.pad(0, 'D3 A3 E4 F#4', 10, 0.38); M.bass(0, 'D2', 9.8, 0.32);
      const fountain = ms('D4 E4 F#4 A4 B4 D5 E5 F#5 A5 B5 D6 E6 F#6 A6 B6 A6 F#6 E6 D6 B5 A5 F#5 E5 D5 B4 A4 F#4 D4');
      fountain.forEach((n, j) => M.ep(2.3 + j * 0.25, n, 0.2 + 0.1 * Math.sin((Math.PI * j) / 27)));
      const arp21 = ms('G4 B4 D5 F#5 A5 F#5 D5 B4');
      for (let j = 0; j < 21; j++) M.ep(10 + j * 0.25, arp21[j % 8], 0.26, ((j % 7) / 6 - 0.5) * 0.8);
      M.pad(10, 'G2 D3 B3 F#4', 5.5, 0.34); M.bass(10, 'G1', 5.4, 0.35);
      const arp13 = ms('A4 D5 E5 A5 E5 D5');
      for (let j = 0; j < 13; j++) M.ep(15.5 + j * 0.25, arp13[j % 6], 0.26, (0.5 - (j % 7) / 6) * 0.8);
      M.pad(15.5, 'A2 E3 D4 E4', 3.5, 0.34); M.bass(15.5, 'A1', 3.4, 0.35);
      ms('D4 F#4 A4 D5').forEach((n) => M.ep(19, n, 0.28)); M.bell(19, 'D6', 0.18); M.bass(19, 'D2', 1, 0.35);
    },
  };

  // =========================================================== 11 · signature
  // Everything folds back into one point — which then becomes the full stop.
  const SWAP = { strike: 13, out: 14.6, in: 15.2, end: 16.2 };
  const swapP = (b) => E.inOutCubic(clamp((b - SWAP.out - 0.15) / 1.05));
  const S11 = {
    name: 'signature',
    beats: 20,
    blend: { dur: 0.01 },
    pose(i, t, b, o) {
      const k = ctxShared.kOf[i];
      if (b < 4.2) {
        const p0 = spiral(k, 20 + b), st = (1 - k / 149) * 1.2;
        const e = E.inCubic(clamp((b - st) / (4 - st)));
        const r = p0.r * (1 - e), th = p0.th + e * e * TAU * 1.2;
        o.x = Math.cos(th) * r; o.y = Math.sin(th) * r;
        o.sx = o.sy = k === 0 ? lerp(p0.s, HERO, e) : p0.s * (1 - e);
        return;
      }
      if (k !== 0) return hide(o);
      const P = G.period, q = E.inOutCubic(clamp((b - 8) / 1)), sw = swapP(b);
      const c1x = P.x * 0.35, c1y = Math.min(0, P.y) - G.R * 0.6;
      o.x = 2 * q * (1 - q) * c1x + q * q * P.x + G.periodShift[0] * sw;
      o.y = 2 * q * (1 - q) * c1y + q * q * P.y + G.periodShift[1] * sw;
      const s = lerp(HERO * (1 + 0.4 * hit(b, 4, 2)), P.d / G.dot, q), e = hit(b, 9, 5);
      const e2 = hit(b, SWAP.end, 4), pre = antic(b, 8, 0.5), w = wob(b, 9, 2.5, 5);
      o.y += G.dot * s * 0.2 * pre;
      o.sx = s * (1 + 0.45 * e + 0.18 * e2 + 0.25 * pre + 0.2 * w); o.sy = s * (1 - 0.35 * e - 0.12 * e2 - 0.3 * pre - 0.2 * w);
    },
    captions: [
      {
        at: 6, to: Infinity, cls: 'sig',
        html: '<span class="swap"><span class="old">Engineered<i class="strike"></i></span><span class="new">Prompted</span></span> by Bart Jansen in Amsterdam',
        update(el, b, cache) {
          const st = E.inOutCubic(clamp((b - SWAP.strike) / 0.6));
          const out = E.inOutCubic(clamp((b - SWAP.out) / 0.75));
          const inn = E.outCubic(clamp((b - SWAP.in) / 1));
          const w = swapP(b);
          const key = [st, out, inn, w].map((v) => Math.round(v * 500)).join();
          if (cache.key === key) return;
          cache.key = key;
          const sw = el.querySelector('.swap'), o = sw.firstChild, n = sw.lastChild;
          if (G.swapW) sw.style.width = lerp(G.swapW[0], G.swapW[1], w).toFixed(2) + 'px';
          o.firstElementChild.style.transform = 'scaleX(' + st.toFixed(3) + ')';
          o.style.opacity = (1 - out).toFixed(3);
          o.style.transform = 'translate3d(0,' + (-0.35 * out).toFixed(3) + 'em,0)';
          n.style.opacity = inn.toFixed(3);
          n.style.transform = 'translate3d(0,' + (0.35 * (1 - inn)).toFixed(3) + 'em,0)';
        },
      },
      { at: 11, to: Infinity, html: '<a href="https://me.bartj.blog" target="_blank" rel="noopener">me.bartj.blog</a>', cls: 'link' },
    ],
    music(M) {
      M.whoosh(0, 4, 0.24, 200, 6000);
      M.pad(0, 'D3 A3 D4 E4', 4, 0.34);
      M.boom(4, 0.6); M.ep(4, 'D3', 0.45); M.ep(4, 'D2', 0.4); M.bell(4, 'D6', 0.1);
      M.bell(9, 'D6', 0.42); M.ep(9, 'D5', 0.24); M.ep(9.03, 'A5', 0.16);
      M.pad(9, 'D3 A3 E4 F#4 C#5', 8, 0.22);
      // the correction: a pen stroke, then a new word
      M.whoosh(SWAP.strike, 0.6, 0.07, 3000, 9000);
      M.tick(SWAP.strike, 0.1);
      M.ep(SWAP.in, 'B4', 0.16); M.ep(SWAP.in + 0.5, 'E5', 0.18);
      M.ep(SWAP.end, 'A5', 0.2); M.bell(SWAP.end, 'E6', 0.1);
      M.pad(SWAP.end, 'D3 A3 E4 B4', 5, 0.18);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11];
  BJ.introPose = S1.pose;
})();
