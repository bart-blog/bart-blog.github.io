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
  const DOT_PX = 64;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const r2 = (v) => Math.round(v * 100) / 100;

  function Dots(stage) {
    const N = BJ.N;
    this.els = [];
    for (const k of ['x', 'y', 'z', 'sx', 'sy', 'rot', 'o', 'lx', 'ly', 'k', 'ux', 'uy', 'lo']) this[k] = new Float32Array(N);
    this.k.fill(1);
    this.ux.fill(1);
    this.lo.fill(-1);
    for (let i = 0; i < N; i++) {
      const el = document.createElement('div');
      el.className = 'dot';
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
    const N = BJ.N, base = G.dot / DOT_PX;
    for (let i = 0; i < N; i++) {
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
    }
    this.fresh = false;
  };

  BJ.Dots = Dots;
})();
