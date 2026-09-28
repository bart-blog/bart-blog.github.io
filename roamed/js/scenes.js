/* Roamed — "Every guest call answered, instantly." A commercial in 150 shapes.
   One iris-blue dot is the guest's call. It rings, it waits on hold with everyone else,
   it gets missed; then Roamed picks up. The same pills become the AI voice speaking in
   every language, the checklist of requests, the night-shift clock, the room calendar —
   and finally the voice bars settle into the Roamed mark: a bed drawn out of a waveform.
   A ~33-second cut at 120 BPM.
   Every scene defines:
     pose(i, b, p)  shape i at local beat b: p.x, p.y (from G.cx/G.cy), p.w, p.h, p.r,
                    p.tip, p.rot, p.rx, p.ry, p.z, p.o, p.c (and p.sym for pills)
     blend          how shapes travel from the previous scene
     bg / field     background colour, and the opacity of the roamed.ai gradient
     type           the headlines, timed in beats
     music(M)       the score, timed in the same beats */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, hit = BJ.hit, clamp = BJ.clamp, lerp = BJ.lerp, C = BJ.C, mix = BJ.mix;
  const TAU = BJ.TAU, PI = Math.PI;
  const MIDGRAD = mix(C.peri, C.blush, 0.45);

  // ------------------------------------------------------------ drawing helpers
  const hide = (p) => { p.o = 0; p.w = p.h = 0; };
  function circle(p, x, y, d, c) { p.x = x; p.y = y; p.w = p.h = d; p.r = d / 2; p.c = c; }
  function rect(p, x, y, w, h, r, c) { p.x = x; p.y = y; p.w = w; p.h = h; p.r = r; p.c = c; }
  // a pill of length `len` whose long axis points along angle `rot` + 90°
  function pill(p, x, y, len, th, rot, c) { p.x = x; p.y = y; p.w = th; p.h = Math.max(th, len); p.r = th / 2; p.rot = rot; p.c = c; p.sym = PI; }
  // a pill drawn from (x0, y0) to (x1, y1), round caps included
  function seg(p, x0, y0, x1, y1, th, c) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-6;
    pill(p, (x0 + x1) / 2, (y0 + y1) / 2, L + th, th, Math.atan2(-dx / L, dy / L), c);
  }
  const hbar = (p, x0, y, len, th, c) => seg(p, x0, y, x0 + Math.max(0, len), y, th, c); // left-aligned text line
  const maxHit = (b, times, decay) => { let e = 0; for (const t of times) e = Math.max(e, hit(b, t, decay)); return e; };
  function perLayout(fn) {
    let v = -1, val;
    return () => { if (v !== G.version) { v = G.version; val = fn(); } return val; };
  }
  const yF = (px) => () => (G.cy + px()) / G.H; // type centred at an offset from the visual centre
  const PENTA = ['D', 'E', 'F#', 'A', 'B'];
  const penta = (k, base = 4) => PENTA[((k % 5) + 5) % 5] + (base + Math.floor(k / 5));
  const rnd = (function () { const r = BJ.rng(2026), a = []; for (let k = 0; k < 400; k++) a.push(r()); return a; })();
  const NT = 48;
  const gw = () => Math.min(G.W * 0.86, G.R * 3.3);

  // ------------------------------------------------------------ the phone ringing
  // A ring is two short pulses (brr-brr). `ringing` is 1 while a pulse sounds.
  const PULSE = [[0, 0.42], [0.58, 1.0]];
  function ringing(b, t0) {
    const x = b - t0;
    for (const [a, z] of PULSE) if (x >= a && x < z) return Math.min(1, (x - a) / 0.05, (z - x) / 0.05);
    return 0;
  }
  const ringAll = (b, bursts) => { let e = 0; for (const t of bursts) e = Math.max(e, ringing(b, t)); return e; };
  const shake = (b, amt) => Math.sin(b * BJ.BEAT * TAU * 11) * amt; // the handset rattling
  // Sound waves: 16 dashes per ring, spreading out from the caller and fading.
  function waves(p, i, b, bursts, x0, y0, d0) {
    const w = Math.floor((i - 1) / 16), j = (i - 1) % 16, tb = bursts[w];
    if (tb === undefined || b < tb) return hide(p);
    const e = (b - tb) / 1.9;
    if (e >= 1) return hide(p);
    const a = (j / 16) * TAU + w * 0.2, R = lerp(d0 * 0.8, G.R * 1.25, E.outCubic(e));
    pill(p, x0 + Math.cos(a) * R, y0 + Math.sin(a) * R, G.R * 0.1 * (1 - e * 0.55), G.R * 0.026, a - PI / 2, mix(C.iris, C.peri, e));
    p.o = Math.pow(1 - e, 1.4) * clamp(e * 10);
  }

  // ------------------------------------------------------------ the voice
  // A 48-bar waveform. Amplitude follows the syllables the agent is speaking.
  function speak(b, syl) {
    let e = 0;
    for (const [t, d] of syl) {
      if (b < t - 0.05 || b > t + d + 0.5) continue;
      const on = clamp((b - t) / 0.08), off = 1 - E.inOutSine(clamp((b - t - d) / 0.35));
      e = Math.max(e, on * off * (0.8 + 0.2 * Math.sin((b - t) * 9)));
    }
    return e;
  }
  function voiceAmp(k, n, b, amp, seed) {
    const u = (k + 0.5) / n, win = Math.pow(Math.sin(PI * u), 0.9);
    const v = 0.5 + 0.5 * Math.sin(b * 4.3 + k * 1.9 + seed) * Math.cos(b * 2.9 - k * 0.8 + seed * 2);
    const w2 = 0.35 + 0.65 * Math.abs(Math.sin(b * 6.1 + k * 0.53 + seed * 3));
    return amp * win * (0.22 + 0.78 * v * w2);
  }
  const barTh = () => Math.min((gw() / NT) * 0.5, G.R * 0.05);
  function voiceBar(p, k, b, amp, seed, grow) {
    const W = gw(), sw = W / NT, th = barTh();
    const idle = 0.05 + 0.03 * Math.sin(b * 1.7 + k * 0.4);
    const h = th + (voiceAmp(k, NT, b, amp, seed) + idle * Math.pow(Math.sin(PI * (k + 0.5) / NT), 2)) * G.R * 0.95;
    pill(p, -W / 2 + (k + 0.5) * sw, 0, h * grow, th * (0.4 + 0.6 * grow), 0, C.ink);
    p.o = clamp(grow * 3);
  }
  // Turn a list of syllables into vox notes (and an echo on the marimba at phrase ends).
  function sing(M, syl, notes, vowels, vel = 0.12) {
    syl.forEach(([t, d], k) => M.vox(t, notes[k % notes.length], d + 0.1, vel, vowels[k % vowels.length], (k % 3 - 1) * 0.15));
  }
  // Re-time a syllable list. spans: [[from, at, k], ...], latest first — everything from `from`
  // on moves to start at `at`, played `k` times as long.
  const retime = (syl, spans) => syl.map(([t, d]) => { const [a, at, k] = spans.find(([a0]) => t >= a0); return [at + (t - a) * k, d * k]; });
  // The groove: kick on every beat, claps on the backbeat, off-beat hats, an eighth-note bass
  // following `roots` ([[beat, note], ...]). `half` drops to a half-time feel.
  function groove(M, b0, b1, roots, v = 1, half = false) {
    for (let b = b0; b < b1 - 0.01; b += 1) {
      const n = Math.round(b - b0);
      if (!half || n % 2 === 0) M.kick(b, 0.34 * v);
      if (half ? n % 4 === 2 : n % 2 === 1) M.clap(b, 0.15 * v, 0.1);
      M.tick(b + 0.5, 0.04 * v, 0.25);
      if (!half) M.tick(b + 0.25, 0.014 * v, -0.3), M.tick(b + 0.75, 0.018 * v, -0.3);
    }
    if (!roots) return;
    for (let b = b0; b < b1 - 0.01; b += 0.5) {
      let r = roots[0][1];
      for (const [t, nt] of roots) if (b >= t - 0.01) r = nt;
      const off = Math.round((b - b0) * 2) % 2 === 1;
      M.bass(b, off && !half ? r.replace(/\d/, (o) => +o + 1) : r, 0.32, (off ? 0.2 : 0.3) * v);
    }
  }

  // =========================================================== 1 · a guest is calling
  const RING1 = [0.15, 2.15];
  const S1 = {
    name: 'ring',
    beats: 4,
    introBeat: 0,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const d0 = G.R * 0.2;
      if (i === 0) {
        const r = ringAll(b, RING1);
        circle(p, shake(b, G.R * 0.018 * r), 0, d0 * (1 + 0.1 * r), C.iris);
        return;
      }
      if (i > 48) return hide(p);
      waves(p, i, b, RING1, 0, 0, d0);
    },
    type: [{ at: 0.4, to: 3.7, text: 'A guest is calling.' }],
    music(M) {
      M.pad(0, 'D3 A3 C#4 F#4', 4, 0.26); M.sub(0, 'D2', 4, 0.18);
      RING1.forEach((t) => PULSE.forEach(([a, z]) => M.ring(t + a, 'A5', z - a, 0.28)));
      M.ep(0.5, 'F#5', 0.14); M.ep(1.0, 'A5', 0.12); M.ep(2.5, 'E5', 0.12); M.ep(3.0, 'C#6', 0.1);
      M.kick(2, 0.16); for (let b = 2.5; b < 4; b += 0.5) M.tick(b, 0.02, 0.3);
    },
  };

  // =========================================================== 2 · the front desk is busy
  // The call joins a queue: six lines on hold, each one ringing, three dots waiting.
  const ROWS2 = 6, PER2 = 7;
  const listW = () => Math.min(G.W * 0.84, G.R * 2.5), rowH = () => Math.min(G.R * 0.27, G.H * 0.09);
  const B2 = 6, ARR2 = [0, 0.4, 0.75, 1.05, 1.3, 1.5], LEN2 = [0.42, 0.3, 0.37, 0.26, 0.4, 0.33];
  const RING2 = ARR2.map((a, k) => { const out = []; for (let t = a + 0.1 + k * 0.12; t < 12; t += 1.3 - k * 0.05) out.push(t); return out; });
  const rowY = (k) => (k - (ROWS2 - 1) / 2) * rowH();
  const dotX = () => -listW() / 2 + rowH() * 0.45;
  function row(p, k, part, b, arrive, ringAmt, grey, dim) {
    const W = listW(), H = rowH(), y = rowY(k), g = E.outBack(clamp((b - arrive) / 0.4));
    if (g <= 0) return hide(p);
    const dx = (1 - E.outCubic(clamp((b - arrive) / 0.45))) * G.R * 0.35, x0 = -W / 2 + H * 0.85;
    if (part === 0) rect(p, dx, y, W, H * 0.8, H * 0.2, mix(C.white, C.card, grey));
    else if (part === 1) circle(p, dotX() + dx + shake(b, H * 0.05 * ringAmt), y, H * 0.36 * (1 + 0.16 * ringAmt), mix(C.iris, C.line, grey));
    else if (part === 2) hbar(p, x0 + dx, y - H * 0.1, W * LEN2[k], H * 0.12, mix(C.ink, C.steel, grey));
    else if (part === 3) hbar(p, x0 + dx, y + H * 0.13, W * LEN2[k] * 0.55, H * 0.09, C.line);
    else {
      const j = part - 4, ph = (b * 2 - j * 0.33) % 1, jump = Math.max(0, Math.sin(ph * PI * 2)) * (1 - grey);
      circle(p, W / 2 - H * (0.9 - j * 0.24) + dx, y - jump * H * 0.1, H * 0.1, mix(C.steel, C.line, grey));
    }
    p.w *= g; p.h *= g; p.r *= g; p.o = clamp(g * 2) * (1 - dim);
  }
  const S2 = {
    name: 'busy',
    beats: B2,
    blend: { dur: (i) => (i === 0 ? 0.8 : 0.5), ease: E.inOutCubic },
    pose(i, b, p) {
      if (i === 0) {
        const r = ringAll(b, RING2[0]), H = rowH();
        circle(p, dotX() + shake(b, H * 0.05 * r), rowY(0), H * 0.36 * (1 + 0.16 * r), C.iris);
        return;
      }
      const k = Math.floor((i - 1) / PER2), part = (i - 1) % PER2;
      if (k >= ROWS2) return hide(p);
      if (k === 0 && part === 1) return hide(p); // the hero sits here
      row(p, k, part, b, ARR2[k], ringAll(b, RING2[k]), 0, 0);
    },
    type: [
      { at: 0.3, to: 2.8, text: 'Your front desk is busy.' },
      { at: 3.0, to: 5.8, text: 'The phone keeps ringing.' },
    ],
    music(M) {
      M.pad(0, 'B2 F#3 A3 D4', 3, 0.26); M.sub(0, 'B1', 3, 0.2);
      M.pad(3, 'G2 D3 F#3 B3', 3, 0.28); M.sub(3, 'G1', 3, 0.22);
      const P = ['A5', 'C#6', 'F#5', 'E6', 'B5', 'G#5'];
      RING2.forEach((ts, k) => ts.forEach((t) => { if (t < B2) PULSE.forEach(([a, z]) => M.ring(t + a, P[k], z - a, 0.15 - k * 0.012, (k / 5 - 0.5) * 1.2)); }));
      ARR2.forEach((a, k) => M.marimba(a + 0.05, penta(k + 3, 4), 0.1, (k / 5 - 0.5) * 0.8));
      for (let b = 0; b < B2; b += 1) M.kick(b, 0.14 + b * 0.03);
      for (let b = 0.5; b < B2; b += 0.5) M.tick(b, 0.02 + b * 0.004, ((b * 2) % 3 - 1) * 0.5);
      for (let b = 4.25; b < B2; b += 0.5) M.tick(b, 0.03, 0.4);
      M.whoosh(4, 2, 0.05, 400, 3200);
    },
  };

  // =========================================================== 3 · missed
  // The lines go quiet, one by one, then drop away. The call is left, grey and small.
  const MISS3 = (k) => 0.15 + k * 0.1, FALL3 = 1.3;
  function fall(p, b, j, t0) {
    const f = clamp((b - t0 - rnd[j] * 0.4) / 1.2);
    if (f <= 0) return;
    const s = rnd[j + 50] - 0.5;
    p.y += f * f * G.H * 0.9; p.x += s * f * G.R * 0.4;
    p.rx += f * 2.2 * (s > 0 ? 1 : -1); p.rot += f * s * 1.1; p.z += f * G.R * 0.5;
    p.o *= 1 - clamp((f - 0.45) / 0.45);
  }
  const S3 = {
    name: 'missed',
    beats: 5,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const H = rowH();
      if (i === 0) {
        const grey = E.inOutSine(clamp((b - MISS3(0)) / 0.35)), m = E.inOutCubic(clamp((b - 1.4) / 1.0));
        const r = b < MISS3(0) ? ringAll(b + B2, RING2[0]) : 0;
        circle(p, lerp(dotX(), 0, m) + shake(b, H * 0.05 * r), lerp(rowY(0), 0, m), lerp(H * 0.36, G.R * 0.12, m), mix(C.iris, C.steel, grey));
        return;
      }
      const k = Math.floor((i - 1) / PER2), part = (i - 1) % PER2;
      if (k >= ROWS2 || (k === 0 && part === 1)) return hide(p);
      const grey = E.inOutSine(clamp((b - MISS3(k)) / 0.35)), r = b < MISS3(k) ? ringAll(b + B2, RING2[k]) : 0;
      row(p, k, part, B2 + b, ARR2[k], r, grey, 0);
      fall(p, b, i, FALL3 + k * 0.1);
    },
    type: [{ at: 0.5, to: 4.7, text: 'Every missed call | is a missed booking.', stagger: 0.1 }],
    music(M) {
      M.pad(0, 'E3 G3 B3 D4', 5, 0.24); M.sub(0, 'E2', 5, 0.2);
      for (let k = 0; k < 3; k++) M.tone(0.1 + k * 1, [480, 620], 0.5, 0.5);
      for (let k = 0; k < ROWS2; k++) M.marimba(MISS3(k) + 0.02, penta(9 - k, 4), 0.08, (k / 5 - 0.5) * 0.6);
      M.whoosh(FALL3, 1.2, 0.06, 2400, 200); M.boom(FALL3 + 0.4, 0.26);
      M.ep(2.5, 'B4', 0.12); M.ep(3.5, 'D5', 0.1);
      M.whoosh(3.6, 1.4, 0.05, 300, 2800);
    },
  };

  // =========================================================== 4 · answered, instantly
  // It rings once more; Roamed picks up. The call blooms into the roamed.ai gradient,
  // and out of it comes a voice.
  const RING4 = [0.2], ANS4 = 1.0, COVER4 = [1.2, 2.0], WAVE4 = 1.95;
  const SYL4 = retime([[4.3, 0.28], [4.65, 0.24], [4.95, 0.42], [5.8, 0.2], [6.05, 0.2], [6.3, 0.2], [6.55, 0.55],
    [8.1, 0.26], [8.45, 0.26], [8.8, 0.22], [9.1, 0.5], [9.9, 0.24], [10.2, 0.24], [10.5, 0.6]], [[8.1, 5.5, 0.8], [4.3, 2.2, 0.8]]);
  const cover = () => 2.3 * Math.hypot(G.W / 2, G.H * 0.6);
  const growBar = (b, k, t0) => E.outBack(clamp((b - t0 - Math.abs(k - (NT - 1) / 2) * 0.015) / 0.45));
  const S4 = {
    name: 'answer',
    beats: 9,
    blend: { dur: 0.01 },
    field: (b) => clamp((b - COVER4[1] + 0.25) / 0.25),
    pose(i, b, p) {
      const d0 = G.R * 0.2;
      if (i === 0) {
        const up = E.inOutCubic(clamp(b / 0.4)), r = ringAll(b, RING4), pk = hit(b, ANS4, 5);
        circle(p, shake(b, G.R * 0.018 * r), 0, lerp(G.R * 0.12, d0, up) * (1 + 0.1 * r - 0.12 * pk), mix(C.steel, C.iris, up));
        if (b > COVER4[0]) {
          const t = clamp((b - COVER4[0]) / (COVER4[1] - COVER4[0])), D = lerp(p.w, cover(), E.inCubic(t));
          p.w = p.h = D; p.r = D / 2; p.c = mix(C.iris, MIDGRAD, E.inOutSine(t));
          p.o = 1 - clamp((b - COVER4[1]) / 0.4);
          if (p.o <= 0) hide(p);
        }
        return;
      }
      if (b < WAVE4) {
        if (i > 32) return hide(p);
        return waves(p, i, b, RING4, 0, 0, d0);
      }
      if (i > NT) return hide(p);
      voiceBar(p, i - 1, b, speak(b, SYL4), 0, growBar(b, i - 1, WAVE4));
    },
    type: [
      { at: 0.15, to: 1.9, text: 'Until now.', size: 1.3 },
      { at: 2.1, to: 5.2, text: 'Every guest call, | answered instantly.', stagger: 0.1 },
      { at: 5.4, to: 8.8, text: 'The AI phone agent | built for hotels.', stagger: 0.1 },
    ],
    music(M) {
      M.pad(0, 'E3 G3 B3 D4', ANS4, 0.2); M.sub(0, 'E2', ANS4, 0.16);
      RING4.forEach((t) => PULSE.forEach(([a, z]) => M.ring(t + a, 'A5', z - a, 0.26)));
      M.click(ANS4, 0.5);
      M.whoosh(COVER4[0] - 0.2, 1.0, 0.08, 300, 3000);
      M.bell(COVER4[1], 'A5', 0.22); M.bell(COVER4[1], 'D6', 0.16, 0.3); M.ep(COVER4[1], 'F#5', 0.2, -0.3);
      M.boom(COVER4[1], 0.4); M.splash(COVER4[1], 0.12);
      M.pad(COVER4[1], 'D3 A3 C#4 F#4', 3.5, 0.3); M.sub(COVER4[1], 'D2', 3.5, 0.24);
      M.pad(5.5, 'B2 F#3 A3 D4', 3.5, 0.28); M.sub(5.5, 'B1', 3.5, 0.22);
      for (let d = 0; d < 12; d++) M.marimba(WAVE4 + 0.05 + d * 0.03, penta(d + 3, 4), 0.06, (d / 11 - 0.5) * 1.2);
      sing(M, SYL4, ['A4', 'F#4', 'A4', 'D5', 'C#5', 'B4', 'A4', 'F#4', 'A4', 'B4', 'D5', 'B4', 'A4', 'F#4'], ['u', 'i', 'i', 'a', 'a', 'a', 'e', 'o', 'e', 'a', 'o', 'e', 'a', 'o']);
      groove(M, COVER4[1], 9, [[0, 'D2'], [5.5, 'B1']]);
    },
  };

  // =========================================================== 5 · every language
  const GREET5 = [['Buenas noches.', 0.2], ['Bonsoir.', 1.3], ['Guten Abend.', 2.4], ['Goedenavond.', 3.5]], ALL5 = 4.6;
  const SYL5 = retime([[0.45, 0.2], [0.7, 0.24], [1.0, 0.2], [1.25, 0.35], [2.0, 0.24], [2.3, 0.5], [3.5, 0.2], [3.75, 0.22], [4.05, 0.2], [4.3, 0.4],
    [5.0, 0.2], [5.25, 0.2], [5.5, 0.2], [5.75, 0.45], [7.0, 0.24], [7.3, 0.24], [7.6, 0.5], [8.4, 0.22], [8.7, 0.22], [9.0, 0.5]],
  [[7.0, 4.8, 0.8], [0.45, 0.3, 1.1 / 1.5]]);
  const S5 = {
    name: 'languages',
    beats: 8,
    blend: { dur: 0.3 },
    field: () => 1,
    pose(i, b, p) {
      if (i === 0 || i > NT) return hide(p);
      const lang = b < ALL5 ? Math.min(3, Math.floor(clamp((b - 0.2) / 1.1, 0, 3.99))) : 4;
      voiceBar(p, i - 1, b + 12, speak(b, SYL5), lang * 1.7, 1);
    },
    type: GREET5.map(([text, at], k) => ({ at, to: at + 1.0, text, size: 1.2, stagger: 0.06 })).concat([
      { at: ALL5 + 0.1, to: 7.8, text: 'Sounds like your hotel. | In every language.', stagger: 0.1 },
    ]),
    music(M) {
      M.pad(0, 'G2 D3 F#3 B3', 2.4, 0.28); M.sub(0, 'G1', 2.4, 0.22);
      M.pad(2.4, 'A2 E3 G3 C#4', 2.2, 0.28); M.sub(2.4, 'A1', 2.2, 0.22);
      M.pad(ALL5, 'D3 A3 C#4 F#4', 8 - ALL5, 0.3); M.sub(ALL5, 'D2', 8 - ALL5, 0.24);
      groove(M, 0, 8, [[0, 'G1'], [2.5, 'A1'], [4.5, 'D2']]);
      sing(M, SYL5, ['B4', 'A4', 'F#4', 'A4', 'D5', 'A4', 'E4', 'F#4', 'A4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'A4', 'B4', 'F#4', 'A4', 'B4', 'D5'],
        ['e', 'a', 'o', 'e', 'o', 'a', 'u', 'e', 'a', 'e', 'u', 'e', 'a', 'o', 'a', 'e', 'o', 'i', 'e', 'a']);
      GREET5.forEach(([, at], k) => { M.marimba(at, penta(k * 2 + 5, 4), 0.12, (k / 3 - 0.5)); M.beep(at, penta(k * 2 + 10, 4), 0.04); });
      M.bell(ALL5, 'F#5', 0.16); M.ep(ALL5, 'A5', 0.14, 0.3);
    },
  };

  // =========================================================== 6 · every request resolved
  // The voice folds into a card of guest requests. The call works down the list; each one ticks off.
  const card6 = perLayout(() => {
    const rh = Math.min(G.R * 0.34, G.H * 0.105), CW = Math.min(G.W * 0.84, G.R * 2.6);
    return { rh, CW, CH: rh * 4.5 };
  });
  const LEN6 = [0.46, 0.34, 0.52, 0.4], CHECK6 = (k) => 1.3 + k * 0.5;
  const row6Y = (k) => (k - 1.5) * card6().rh;
  function checkMark(p, part, cx, cy, cs, t, th, c) { // part 0/1: the two strokes of a tick
    const P = [[-0.5, 0], [-0.1, 0.42], [0.62, -0.46]].map(([x, y]) => [cx + x * cs, cy + y * cs]);
    const g = part === 0 ? E.outCubic(clamp(t / 0.14)) : E.outCubic(clamp((t - 0.12) / 0.22));
    if (g <= 0) return hide(p);
    const a = part === 0 ? P[0] : P[1], z = part === 0 ? P[1] : P[2];
    seg(p, a[0], a[1], lerp(a[0], z[0], g), lerp(a[1], z[1], g), th, c);
  }
  function card6Part(i, b, p) { // shapes 1..21 are the card; false = not part of it
    const { rh, CW, CH } = card6();
    if (i === 1) { rect(p, 0, 0, CW, CH, rh * 0.28, C.card); return true; }
    const j = i - 2;
    if (j < 0 || j >= 20) return false;
    const k = Math.floor(j / 5), part = j % 5, y = row6Y(k), x0 = -CW / 2 + rh * 1.0, t = b - CHECK6(k);
    const done = E.inOutSine(clamp(t / 0.4));
    if (part === 0) circle(p, -CW / 2 + rh * 0.5, y, rh * 0.36, mix(C.mist, C.peri, done));
    else if (part === 1) hbar(p, x0, y - rh * 0.1, CW * LEN6[k], rh * 0.12, C.ink);
    else if (part === 2) hbar(p, x0, y + rh * 0.14, CW * LEN6[k] * 0.6, rh * 0.09, C.line);
    else checkMark(p, part - 3, CW / 2 - rh * 0.55, y, rh * 0.26, t, rh * 0.075, C.iris);
    return true;
  }
  const cursor6 = (b) => { // which row the call is working on (fractional)
    let k = 0;
    for (let n = 1; n < 4; n++) k += E.inOutCubic(clamp((b - CHECK6(n - 1) - 0.18) / 0.3));
    return k;
  };
  const S6 = {
    name: 'requests',
    beats: 7,
    blend: { start: (i) => (i === 0 ? 0 : 0.02 + (i % 24) * 0.008), dur: (i) => (i === 1 ? 0.8 : 0.6), arc: 0.08, fresh: (i) => i <= 1 },
    field: (b) => 1 - E.inOutSine(clamp(b / 0.8)),
    pose(i, b, p) {
      const { rh, CW } = card6();
      if (i === 0) {
        const g = E.outBack(clamp((b - 0.8) / 0.4)), k = cursor6(b);
        if (g <= 0) return hide(p);
        const pk = [0, 1, 2, 3].reduce((e, n) => Math.max(e, hit(b, CHECK6(n), 5)), 0);
        const out = E.inOutCubic(clamp((b - CHECK6(3) - 0.5) / 0.6));
        circle(p, -CW / 2 + rh * 0.5, row6Y(0) + k * rh, rh * 0.36 * g * (1 + 0.18 * pk) * (1 - out * 0.35), C.iris);
        return;
      }
      if (!card6Part(i, b, p)) return hide(p);
      p.y += Math.sin(b * 0.9) * rh * 0.03;
    },
    type: [
      { at: 0.4, to: 3.3, text: 'Every request, resolved.' },
      { at: 3.5, to: 6.8, text: 'Tasks for your team, | created automatically.', stagger: 0.1 },
    ],
    music(M) {
      M.pad(0, 'G2 D3 F#3 B3', 3.5, 0.28); M.sub(0, 'G2', 3.5, 0.2);
      M.whoosh(0, 0.8, 0.05, 2400, 500);
      M.marimba(0.8, 'A5', 0.12);
      for (let k = 0; k < 4; k++) { M.marimba(CHECK6(k) + 0.02, penta(k + 7, 4), 0.14, (k / 3 - 0.5) * 0.6); M.beep(CHECK6(k) + 0.1, penta(k + 7, 4), 0.05); }
      M.pad(3.5, 'E3 B3 D4 G4', 3.5, 0.28); M.sub(3.5, 'E2', 3.5, 0.2);
      M.ep(3.6, 'B5', 0.14); M.ep(3.6, 'G5', 0.12, 0.3); M.ep(5, 'A5', 0.1);
      groove(M, 0, 7, [[0, 'G1'], [3.5, 'E2']]);
      M.whoosh(6, 1, 0.04, 2000, 400);
    },
  };

  // =========================================================== 7 · after hours
  // Night falls. The card breaks into a 24-hour dial; the call rides it from 10 pm to 6 am,
  // and every call that comes in along the way lights up.
  const ringR = () => G.R * 0.86, tickL = () => G.R * 0.15, tickT = () => G.R * 0.042;
  const K7 = 44, SPAN7 = 16, F7 = [0.8, 4.4], FILL7 = (b) => E.inOutSine(clamp((b - F7[0]) / F7[1]));
  const CALLT7 = (c) => F7[0] + (F7[1] * Math.acos(1 - 2 * (c / SPAN7))) / PI; // when the dial passes call c
  const CALLS7 = [1, 3, 4, 6, 9, 10, 12, 15];
  const STARS = 40;
  const S7 = {
    name: 'night',
    beats: 8,
    blend: { start: (i) => (i >= 1 && i <= NT ? 0.05 + (i - 1) * 0.006 : 0), dur: (i) => (i === 0 ? 0.9 : 0.8), arc: 0.08 },
    bg: (b) => mix(C.cream, C.night, E.inOutSine(clamp(b / 0.8))),
    dark: (b) => b > 0.4,
    pose(i, b, p) {
      const u = FILL7(b) * SPAN7;
      if (i === 0) {
        const a = -PI / 2 + ((K7 + u) / NT) * TAU, pk = CALLS7.reduce((e, c) => Math.max(e, hit(b, CALLT7(c), 4)), 0);
        circle(p, Math.cos(a) * ringR(), Math.sin(a) * ringR(), tickT() * 2.4 * (1 + 0.4 * pk), C.iris);
        return;
      }
      if (i <= NT) {
        const k = i - 1, kk = (k - K7 + NT) % NT, g = E.outBack(clamp((b - 0.2 - k * 0.008) / 0.5));
        if (g <= 0) return hide(p);
        const lit = kk < SPAN7 ? clamp(u - kk) : 0, call = CALLS7.indexOf(kk) >= 0 && u >= kk;
        const pk = call ? hit(u, kk, 2.2) : 0;
        const a = -PI / 2 + (k / NT) * TAU, R = ringR() + pk * G.R * 0.05, L = tickL() * g * (k % 4 === 0 ? 1.25 : 1) * (1 + pk * 0.5);
        pill(p, Math.cos(a) * R, Math.sin(a) * R, L, tickT() * (0.6 + 0.4 * g), a - PI / 2, mix(C.dusk, call ? C.iris : C.peri, lit * (call ? 1 : 0.55)));
        p.o = clamp(g * 1.6);
        return;
      }
      const s = i - NT - 1;
      if (s >= STARS) return hide(p);
      const g = clamp((b - 0.4 - rnd[s] * 1.0) / 0.6);
      if (g <= 0) return hide(p);
      let x = (rnd[s + 100] - 0.5) * G.W * 0.96, y = (rnd[s + 200] - 0.4) * G.H * 0.9;
      const d = Math.hypot(x, y), min = G.R * 1.25;
      if (d < min) { x *= min / Math.max(1, d); y *= min / Math.max(1, d); }
      if (y > G.textY - G.cy - G.F * 1.2 && y < G.textY - G.cy + G.F * 1.2 && Math.abs(x) < G.W * 0.35) y -= G.F * 2.6;
      circle(p, x, y, G.R * (0.012 + rnd[s + 300] * 0.016), C.white);
      p.o = g * (0.35 + 0.45 * (0.5 + 0.5 * Math.sin(b * (1.2 + rnd[s + 50]) + s)));
    },
    type: [
      {
        at: 0.6, to: 7.8, y: () => G.cy / G.H, size: 0.95, cls: 'num', color: '#fff',
        fn: (b) => { const m = Math.round((22 * 60 + FILL7(b) * 8 * 60) / 10) * 10 % 1440, h = Math.floor(m / 60), mm = m % 60; return ((h + 11) % 12 + 1) + ':' + (mm < 10 ? '0' : '') + mm + (h < 12 ? ' am' : ' pm'); },
      },
      { at: 0.8, to: 3.8, text: 'Nights. Peaks. Overflow.', color: '#fff' },
      { at: 4.0, to: 7.8, text: 'Every call, still answered.', color: '#fff' },
    ],
    music(M) {
      M.pad(0, 'B2 F#3 A3 D4', 4, 0.26); M.sub(0, 'B1', 4, 0.2);
      for (let k = 0; k < NT; k += 2) M.tick(0.2 + k * 0.008, 0.018, Math.sin((k / NT) * TAU) * 0.7);
      CALLS7.forEach((c, n) => {
        const tb = CALLT7(c), a = ((K7 + c) / NT) * TAU;
        M.marimba(tb, penta(n + 5, 4), 0.14, Math.sin(a) * 0.7); M.bell(tb, penta(n + 5, 5), 0.05, Math.sin(a) * 0.7);
      });
      M.pad(4, 'G2 D3 F#3 B3', 4, 0.26); M.sub(4, 'G1', 4, 0.2);
      groove(M, 0, 8, [[0, 'B1'], [4, 'G1']], 0.8, true);
      M.ep(4, 'A5', 0.12); M.ep(4, 'D6', 0.1, 0.3);
      M.whoosh(6.6, 1.4, 0.05, 400, 2400);
    },
  };

  // =========================================================== 8 · calls into bookings
  // The dial becomes a room calendar. The call lands on a free night and books it; more follow.
  const NCAL = 35;
  const cal8 = perLayout(() => {
    const c = Math.min(G.R * 0.3, (G.W * 0.84) / 7, (G.H * 0.5) / 6.2), pos = [];
    for (let m = 0; m < NCAL; m++) { const r = Math.floor(m / 7), k = m % 7; pos.push([(k - 3) * c, (r - 2) * c + c * 0.45]); }
    return { c, pos };
  });
  const BOOKED8 = new Set([0, 1, 4, 5, 6, 9, 12, 13, 14, 19, 20, 22, 26, 27, 33, 34]);
  const NEW8 = [16, 8, 23, 2, 29, 17, 10, 30, 24, 3], LAND8 = 1.5, NEWT8 = (n) => LAND8 + 0.4 + n * 0.22;
  const S8 = {
    name: 'bookings',
    beats: 7,
    blend: { start: (i) => (i >= 1 && i <= NT ? (i - 1) * 0.008 : 0), dur: (i) => (i === 0 ? LAND8 : 0.7), arc: 0.1 },
    bg: (b) => mix(C.night, C.cream, E.inOutSine(clamp(b / 0.8))),
    dark: (b) => b < 0.4,
    pose(i, b, p) {
      const { c, pos } = cal8(), s = c * 0.8;
      if (i === 0) {
        const pk = hit(b, LAND8, 4), sq = E.inOutCubic(clamp((b - LAND8 + 0.4) / 0.4));
        const P = pos[NEW8[0]];
        rect(p, P[0], P[1], s * (1 + 0.14 * pk), s * (1 + 0.14 * pk), lerp(s / 2, s * 0.24, sq), C.iris);
        return;
      }
      const j = i - 1;
      if (j === NCAL) { const y = pos[0][1] - c * 0.95; seg(p, -c * 3.125, y, c * 3.125, y, c * 0.55, C.ink); return; }
      if (j > NCAL) return hide(p);
      const P = pos[j], n = NEW8.indexOf(j), t = n > 0 ? NEWT8(n) : Infinity, f = clamp((b - t) / 0.2), pk = n > 0 ? hit(b, t, 5) : 0;
      if (n === 0) return hide(p); // the hero is this one
      rect(p, P[0], P[1], s * (1 + 0.14 * pk), s * (1 + 0.14 * pk), s * 0.24, mix(BOOKED8.has(j) ? C.line : C.white, C.iris, f));
    },
    type: [
      { at: 0.5, to: 3.4, text: 'Turn calls into bookings.' },
      { at: 3.6, to: 6.8, text: 'Booked straight | into your PMS.', stagger: 0.1 },
    ],
    music(M) {
      M.pad(0, 'D3 A3 C#4 F#4', 3.5, 0.28); M.sub(0, 'D2', 3.5, 0.22);
      M.drop(LAND8, 'D6', 0.22); M.bell(LAND8, 'A5', 0.18); M.kick(LAND8, 0.32);
      for (let n = 1; n < NEW8.length; n++) M.marimba(NEWT8(n), penta(n + 4, 4), 0.12, (cal8().pos[NEW8[n]][0] / (G.R || 1)) * 0.4);
      M.pad(3.5, 'B2 F#3 A3 D4', 3.5, 0.28); M.sub(3.5, 'B1', 3.5, 0.22);
      groove(M, 0, 7, [[0, 'D2'], [3.5, 'B1']]);
      M.ep(3.6, 'F#5', 0.12); M.ep(4.6, 'A5', 0.1); M.ep(5.6, 'B5', 0.1);
      M.whoosh(5.8, 1.2, 0.06, 300, 3000);
    },
  };

  // =========================================================== 9 · finale
  // The calendar becomes nine voice bars; they speak one last line, then settle into the Roamed
  // mark — a bed, drawn with a waveform. The call reappears as the button.
  const MARK = { // from the roamed.ai icon, 326 units wide; bar centres, tops, bottoms
    x: [-153.5, -115.5, -77, -38.5, 0, 38.5, 76.5, 115, 153.5], t: [102, 128, 192, 192, 192, 192, 192, 192, 179],
    b: [370, 357, 319, 319, 319, 319, 319, 357, 357], w: 20, cy: 236, W: 326,
  };
  const markW = () => Math.min(G.R * 1.0, G.W * 0.46), markCy = () => -G.R * 0.3 - (G.portrait ? G.R * 0.05 : 0);
  const logoW = () => Math.min(G.W * 0.52, G.R * 1.3);
  const CTA_Y = () => (G.portrait ? 0.66 : 0.71);
  const SYL9 = retime([[1.2, 0.26], [1.55, 0.22], [1.85, 0.22], [2.15, 0.5], [3.0, 0.24], [3.3, 0.24], [3.6, 0.22], [3.9, 0.6]], [[1.2, 0.5, 0.85]]);
  const SETTLE9 = [4.0, 5.0], LOGO9 = 5.2, BTN9 = [6.2, 7.0], SHOW9 = 7.0;
  let btnCache = { v: -1, at: 0, r: null };
  function button() { // where the real link sits, so the shape can become it exactly
    const a = document.querySelector('#type .line.link a');
    if (!a) return null;
    const now = performance.now();
    if (btnCache.v !== G.version || now - btnCache.at > 250 || !btnCache.r) {
      const r = a.getBoundingClientRect();
      btnCache = { v: G.version, at: now, r: r.width ? { x: r.left + r.width / 2 - G.cx, y: r.top + r.height / 2 - G.cy, w: r.width, h: r.height } : null };
    }
    return btnCache.r;
  }
  // which calendar shape becomes which bar: the bottom week, plus two that grow in at the ends
  const BAR9 = [NCAL + 2, 29, 30, 31, 32, 33, 34, 35, NCAL + 3];
  const S9 = {
    name: 'finale',
    beats: 12,
    blend: { start: (i) => (i === 0 ? 0 : Math.max(0, i - 1) * 0.006), dur: (i) => (i === 0 ? 0.5 : 0.8), ease: E.glide, fresh: (i) => i === NCAL + 2 || i === NCAL + 3 },
    pose(i, b, p) {
      const s = markW() / MARK.W, cy = markCy();
      if (i === 0) {
        const est = { x: 0, y: G.H * CTA_Y() - G.cy - G.F * 0.35, w: Math.max(240, G.F * 3.6), h: 50 };
        const bt = button() || est, g = E.outBack(clamp((b - BTN9[0] + 0.5) / 0.5));
        if (g <= 0) return hide(p);
        const st = E.inOutCubic(clamp((b - BTN9[0]) / (BTN9[1] - BTN9[0]))), d = bt.h * 0.8 * g;
        rect(p, bt.x, bt.y, lerp(d, bt.w, st), lerp(d, bt.h, st), lerp(d / 2, 8, st), mix(C.iris, C.black, st));
        if (b > SHOW9 + 1.2) hide(p);
        return;
      }
      let k = BAR9.indexOf(i);
      if (k < 0 && i >= 1 && i <= NCAL) { // the other nights melt into their weekday's bar
        k = ((i - 1) % 7) + 1;
        const f = E.inOutCubic(clamp(b / 1.0));
        if (f >= 1) return hide(p);
        barPose(p, k, b, s, cy);
        p.o = 1 - f;
        return;
      }
      if (k < 0) return hide(p);
      barPose(p, k, b, s, cy);
    },
    type: [
      { at: 0.3, to: 3.9, text: 'Free your front desk | for real guest moments.', stagger: 0.1 },
      { at: LOGO9, to: Infinity, html: '<img src="img/logo.png" alt="roamed">', cls: 'logo', y: () => (G.cy + G.R * 0.42) / G.H, size: () => (logoW() * 89) / 436, fade: 1.2 },
      {
        at: BTN9[0] - 0.2, show: SHOW9, to: Infinity, cls: 'link', y: CTA_Y, fade: 0.8,
        html: '<a href="https://www.roamed.ai" target="_blank" rel="noopener">Schedule a demo at roamed.ai</a>' +
          '<small>Every guest call answered &middot; In every language &middot; Live within days</small>',
      },
    ],
    music(M) {
      M.pad(0, 'B2 F#3 A3 D4', 2, 0.26); M.sub(0, 'B1', 2, 0.2);
      M.pad(2, 'G2 D3 F#3 B3', 2, 0.26); M.sub(2, 'G1', 2, 0.2);
      groove(M, 0, SETTLE9[0], [[0, 'B1'], [2, 'G1']], 0.9);
      sing(M, SYL9, ['F#4', 'A4', 'B4', 'A4', 'B4', 'D5', 'C#5', 'A4'], ['e', 'o', 'a', 'e', 'o', 'e', 'a', 'o'], 0.11);
      M.whoosh(SETTLE9[0] - 0.2, 1.2, 0.07, 400, 3200);
      M.kick(SETTLE9[1], 0.5); M.boom(SETTLE9[1], 0.4); M.splash(SETTLE9[1], 0.14);
      M.bell(SETTLE9[1], 'D5', 0.22); M.bell(SETTLE9[1] + 0.25, 'F#5', 0.16, 0.3); M.bell(SETTLE9[1] + 0.5, 'A5', 0.14, -0.3);
      M.pad(SETTLE9[0], 'A2 E3 G3 C#4', 1, 0.24); M.sub(SETTLE9[0], 'A1', 1, 0.2);
      M.pad(SETTLE9[1], 'D3 A3 C#4 F#4', 12 - SETTLE9[1], 0.32); M.sub(SETTLE9[1], 'D2', 12 - SETTLE9[1], 0.24);
      M.whoosh(BTN9[0], 1.2, 0.04, 400, 1800);
      M.marimba(SHOW9, 'A5', 0.14); M.marimba(SHOW9 + 0.2, 'D6', 0.12);
      M.ep(9, 'D5', 0.1); M.ep(9.02, 'A5', 0.08);
    },
  };
  function barPose(p, k, b, s, cy) { // bar k of 9: speaking, then settling into the mark
    const th = MARK.w * s, x = MARK.x[k] * s;
    const amp = speak(b, SYL9) * (0.55 + 0.45 * Math.abs(Math.sin(b * 5.3 + k * 1.3))) + 0.12 + 0.04 * Math.sin(b * 2 + k);
    const win = 0.45 + 0.55 * Math.sin(PI * (k + 0.5) / 9);
    const hs = th + amp * win * MARK.W * s * 0.72;
    const e = E.glide(clamp((b - SETTLE9[0] - Math.abs(k - 4) * 0.05) / (SETTLE9[1] - SETTLE9[0])));
    const top = (MARK.t[k] - MARK.cy) * s + cy, bot = (MARK.b[k] - MARK.cy) * s + cy;
    const h = lerp(hs, bot - top, e), y = lerp(cy, (top + bot) / 2, e);
    pill(p, x, y, h, th, 0, mix(C.ink, C.black, e));
  }

  BJ.scenes = [S1, S2, S3, S4, S5, S6, S7, S8, S9];
})();
