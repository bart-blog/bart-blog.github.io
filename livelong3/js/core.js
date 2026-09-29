/* Core: constants, easing, geometry, colour and helpers. */
(function () {
  'use strict';
  const BJ = (window.BJ = window.BJ || {});

  // Everything is tuned to the golden ratio: one beat lasts 1/φ seconds (≈ 97 BPM),
  // scenes last a Fibonacci number of bars, and the stage sits on the golden section.
  const PHI = (1 + Math.sqrt(5)) / 2;
  BJ.PHI = PHI;
  BJ.GA = Math.PI * (3 - Math.sqrt(5)); // golden angle, 137.5°
  BJ.BEAT = 1 / PHI;
  BJ.N = 150; // shapes on stage
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
  const G = (BJ.G = { W: 0, H: 0, cx: 0, cy: 0, R: 0, F: 0, textY: 0, portrait: false, version: 0 });

  BJ.layout = function () {
    G.W = window.innerWidth;
    G.H = window.innerHeight;
    G.cx = G.W / 2;
    G.cy = G.H * 0.4;
    G.R = Math.min(G.W * 0.42, G.H * 0.3);
    G.F = Math.min(G.W * 0.085, G.H * 0.075); // headline size
    G.portrait = G.W / G.H < 0.9;
    G.textY = G.H * (G.portrait ? 0.76 : 0.8);
    G.version++;
  };

  // ---------------------------------------------------------------- colour (LiveLong palette)
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  BJ.C = {
    white: hex('#ffffff'), bg: hex('#ffffff'), ink: hex('#0b1220'), blue: hex('#0053a2'), navy: hex('#001c3b'),
    sky: hex('#eaf2fb'), mist: hex('#d7e3f1'), steel: hex('#9fb4cc'), orange: hex('#f18700'), peach: hex('#fde7cc'),
  };
  BJ.mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  BJ.css = (c) => 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';

  // Minimum-total-travel pairing (Hungarian algorithm): every shape takes the nearest free slot,
  // so one formation morphs into the next without shapes crossing the screen.
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
