/* Core: namespace, note names and easing shared by the film and the synth. */
(function () {
  'use strict';
  const BJ = (window.BJ = window.BJ || {});
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  BJ.m = function (name) {
    if (typeof name === 'number') return name;
    const r = /^([A-G])(#|b)?(-?\d)$/.exec(name);
    return NOTE[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0) + (parseInt(r[3], 10) + 1) * 12;
  };
  BJ.ms = (s) => (Array.isArray(s) ? s.map(BJ.m) : s.trim().split(/\s+/).map(BJ.m));

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  BJ.clamp = clamp;
  BJ.lerp = (a, b, t) => a + (b - a) * t;
  BJ.ease = {
    linear: (t) => t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      if (t <= 0) return 0;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    snap: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-8 * t) * Math.cos(t * Math.PI * 2.2)),
    spring: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * Math.cos(t * Math.PI * 2.5)),
    glide: (t) => {
      const c = 0.6 * 1.525;
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
    },
  };
  // percussive envelope in beats: locks a visual pulse to the note scheduled at `at`
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
})();
