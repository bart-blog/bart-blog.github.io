/* Core: constants, easing, geometry and the matrix3d dot renderer. */
(function () {
  'use strict';
  const BJ = (window.BJ = window.BJ || {});

  // Everything is tuned to the golden ratio: one beat lasts 1/φ seconds (≈ 97 BPM),
  // scenes last a Fibonacci number of bars, and the stage sits on the golden section.
  const PHI = (1 + Math.sqrt(5)) / 2;
  BJ.PHI = PHI;
  BJ.GA = Math.PI * (3 - Math.sqrt(5)); // golden angle, 137.5°
  BJ.BEAT = 1 / PHI;
  BJ.N = 150;
  BJ.TAU = Math.PI * 2;

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const frac = (x) => x - Math.floor(x);
  BJ.clamp = clamp;
  BJ.lerp = lerp;
  BJ.frac = frac;

  BJ.ease = {
    linear: (t) => t,
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    inOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inQuart: (t) => t * t * t * t,
    // Snappy: most of the travel happens in the first fifth, then a ~4% overshoot settles.
    snap: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-8 * t) * Math.cos(t * Math.PI * 2.2)),
    // Formation changes: a touch of anticipation, a smooth flight, ~2% settle.
    glide: (t) => {
      const c = 0.6 * 1.525;
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
    },
    // Bouncier cousin (~9% overshoot) for things on strings and springs.
    spring: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * Math.cos(t * Math.PI * 2.5)),
  };

  // Damped oscillation after an impulse at beat `at`: squash-and-stretch jelly.
  BJ.wobble = function (b, at, freq = 2.5, decay = 5) {
    const x = b - at;
    return x < 0 ? 0 : Math.exp(-x * decay) * Math.sin(Math.PI * 2 * freq * x);
  };
  // Anticipation: 0 → 1 over `len` beats leading into `at`, then 0.
  BJ.antic = function (b, at, len = 0.3) {
    const x = (b - (at - len)) / len;
    return x <= 0 || x >= 1 ? 0 : x * x * x;
  };

  // Percussive envelope in beats: fast attack, exponential decay. Used to lock
  // visual pulses to the exact beat on which a note is scheduled.
  BJ.hit = function (b, at, decay = 4, attack = 0.04) {
    const x = b - at;
    if (x < 0) return 0;
    if (x < attack) return x / attack;
    return Math.exp(-(x - attack) * decay);
  };

  BJ.rng = function (seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  BJ.m = function (name) {
    if (typeof name === 'number') return name;
    const r = /^([A-G])(#|b)?(-?\d)$/.exec(name);
    return NOTE[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0) + (parseInt(r[3], 10) + 1) * 12;
  };
  BJ.ms = (s) => (Array.isArray(s) ? s.map(BJ.m) : s.trim().split(/\s+/).map(BJ.m));

  // ---------------------------------------------------------------- geometry
  const G = (BJ.G = { W: 0, H: 0, cx: 0, cy: 0, R: 0, dot: 0, textY: 0, sigY: 0, version: 0, period: { x: 0, y: 0, d: 4 } });

  BJ.layout = function () {
    G.W = window.innerWidth;
    G.H = window.innerHeight;
    G.cx = G.W / 2;
    G.cy = G.H / (PHI * PHI); // 0.382 H — the golden section
    G.R = Math.min(G.W * 0.42, G.H * 0.3);
    G.dot = Math.max(5, G.R * 0.055);
    G.textY = G.H * (1 / PHI + 1 / Math.pow(PHI, 4)); // 0.764 H
    G.sigY = G.H * 0.5;
    G.version++;
  };

  // ---------------------------------------------------------------- renderer
  // Dots are drawn large and scaled down so big formations stay crisp.
  // Dot 0 is the hero — the orange one — and gets an even larger canvas.
  const DOT_PX = 128, HERO_PX = 384;
  // c: 0 = LiveLong blue, 1 = LiveLong orange. Mid-way it brightens a little so a
  // change of colour reads as a flash of light rather than a muddy blend.
  const NAVY = [0, 83, 162], GOLD = [241, 135, 0];
  function colour(c) {
    const f = 1.4 * c * (1 - c), out = [];
    for (let k = 0; k < 3; k++) { const m = NAVY[k] + (GOLD[k] - NAVY[k]) * c; out.push(Math.round(m + (255 - m) * f)); }
    return 'rgb(' + out.join(',') + ')';
  }
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const r2 = (v) => Math.round(v * 100) / 100;

  function Dots(stage) {
    const N = BJ.N;
    this.els = [];
    for (const k of ['x', 'y', 'z', 'sx', 'sy', 'rot', 'o', 'c', 'lx', 'ly', 'k', 'ux', 'uy', 'lo', 'lc']) this[k] = new Float32Array(N);
    this.k.fill(1);
    this.ux.fill(1);
    this.lo.fill(-1);
    this.lc.fill(-1);
    this.px = [];
    for (let i = 0; i < N; i++) {
      const el = document.createElement('div'), px = i === 0 ? HERO_PX : DOT_PX;
      el.className = 'dot';
      el.style.width = el.style.height = px + 'px';
      el.style.left = el.style.top = -px / 2 + 'px';
      this.px.push(px);
      stage.appendChild(el);
      this.els.push(el);
    }
    this.fresh = true;
  }

  // Every dot is composed into one matrix3d per frame:
  //   translate(x,y,z) · V(velocity stretch) · R(rot) · S(sx,sy)
  // V elongates a dot along its direction of travel so fast moves read as strokes,
  // the way the dots in the original film smear into lines.
  Dots.prototype.render = function (dt) {
    const N = BJ.N;
    for (let i = 0; i < N; i++) {
      const base = G.dot / this.px[i];
      const x = this.x[i], y = this.y[i];
      if (dt > 0.004 && !this.fresh) {
        const vx = (x - this.lx[i]) / dt, vy = (y - this.ly[i]) / dt;
        const sp = Math.sqrt(vx * vx + vy * vy);
        if (sp * dt > G.R * 0.5) {
          this.k[i] = 1; // teleport, don't smear
        } else {
          const target = 1 + Math.min(Math.max(0, sp - G.R * 0.8) / (G.R * 8), 1.3);
          this.k[i] += (target - this.k[i]) * 0.45;
          if (sp > G.R * 0.05) {
            this.ux[i] = vx / sp;
            this.uy[i] = vy / sp;
          }
        }
      }
      this.lx[i] = x;
      this.ly[i] = y;

      const k = this.k[i], ux = this.ux[i], uy = this.uy[i];
      const q = 1 / Math.sqrt(k);
      const v11 = q + (k - q) * ux * ux, v12 = (k - q) * ux * uy, v22 = q + (k - q) * uy * uy;
      const rot = this.rot[i], c = Math.cos(rot), s = Math.sin(rot);
      const sx = Math.max(1e-4, this.sx[i]) * base, sy = Math.max(1e-4, this.sy[i]) * base;
      const p11 = c * sx, p12 = -s * sy, p21 = s * sx, p22 = c * sy;
      const m11 = v11 * p11 + v12 * p21, m12 = v11 * p12 + v12 * p22;
      const m21 = v12 * p11 + v22 * p21, m22 = v12 * p12 + v22 * p22;

      const el = this.els[i];
      el.style.transform =
        'matrix3d(' + r3(m11) + ',' + r3(m21) + ',0,0,' + r3(m12) + ',' + r3(m22) + ',0,0,0,0,' + r3(Math.max(sx, sy)) +
        ',0,' + r2(G.cx + x) + ',' + r2(G.cy + y) + ',' + r2(this.z[i]) + ',1)';
      const o = this.o[i] < 0.003 ? 0 : Math.min(1, this.o[i]);
      if (Math.abs(o - this.lo[i]) > 0.004 || (o === 0 && this.lo[i] !== 0)) {
        el.style.opacity = o;
        this.lo[i] = o;
      }
      const cq = Math.round(Math.min(1, Math.max(0, this.c[i])) * 60) / 60;
      if (cq !== this.lc[i]) { el.style.backgroundColor = colour(cq); this.lc[i] = cq; }
    }
    this.fresh = false;
  };

  BJ.Dots = Dots;

  // Minimum-total-travel pairing (Hungarian algorithm): every dot takes the nearest free slot,
  // so one formation morphs into the next without dots crossing the screen.
  BJ.assign = function (n, cost) {
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
  };

})();
