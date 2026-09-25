/* Audio: a tiny Web Audio studio. Every sound is synthesized — no samples.
   The audio clock is the master clock; the animation reads its time from here,
   so a pulse on screen and the note that caused it can never drift apart. */
(function () {
  'use strict';
  const BJ = window.BJ;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const A = (BJ.Audio = {
    ctx: null,
    master: null,
    run: null,
    muted: false,
    events: [],
    ptr: 0,
    ok: false,
  });

  A.init = function () {
    if (A.ctx) return A.ctx.resume();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return Promise.resolve();
    // iOS: play through the ringer/silent switch like a video would
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    let raw;
    try { raw = new AC({ latencyHint: 'interactive' }); } catch (e) { try { raw = new AC(); } catch (e2) { return Promise.resolve(); } }
    const ctx = A.setup(raw);

    // unlock iOS
    const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(ctx.destination);
    s.start(0);
    return ctx.resume ? ctx.resume() : Promise.resolve();
  };

  A.setup = function (ctx) {
    A.ctx = ctx;
    A.ok = true;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    A.master = ctx.createGain();
    A.master.gain.value = A.muted ? 0 : 0.9;
    A.master.connect(comp);
    comp.connect(ctx.destination);

    A.reverb = ctx.createConvolver();
    A.reverb.buffer = impulse(ctx, 3.6, 2.6);
    A.wet = ctx.createGain();
    A.wet.gain.value = 0.42;
    A.reverb.connect(A.wet);
    A.wet.connect(A.master);

    const len = ctx.sampleRate;
    A.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = A.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  };

  function impulse(ctx, seconds, decay) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4; // slightly darker tail
        d[i] = lp * Math.pow(1 - t, decay) * (i < rate * 0.004 ? i / (rate * 0.004) : 1);
      }
    }
    return buf;
  }

  // A run owns its own bus so "replay" can instantly silence everything already queued.
  A.newRun = function () {
    const ctx = A.ctx;
    if (A.run) {
      const old = A.run;
      old.dry.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      old.send.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      setTimeout(() => { old.dry.disconnect(); old.send.disconnect(); }, 400);
    }
    const dry = ctx.createGain(), send = ctx.createGain();
    dry.connect(A.master);
    send.connect(A.reverb);
    A.run = { dry, send, t0: ctx.currentTime + 0.15 };
    A.clock.reset(-0.15);
    return A.run;
  };

  A.setMuted = function (m) {
    A.muted = m;
    if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 0.9, A.ctx.currentTime, 0.05);
  };

  // ------------------------------------------------------------ clock
  // ctx.currentTime advances in audio-callback sized steps; we low-pass it against
  // performance.now() to get a smooth, monotonic, latency-compensated song time.
  // While the context isn't running (e.g. audio still locked on a phone) the film
  // free-runs on performance.now(), and re-anchors the audio once it starts.
  A.clock = {
    off: 0, last: 0, paused: true, has: false, pt: 0, base: 0,
    reset(start) { this.has = false; this.last = start || 0; this.base = start || 0; this.pt = performance.now() / 1000; },
    time() {
      const perf = performance.now() / 1000;
      if (this.paused) return this.last;
      let t;
      if (A.ok && A.run && A.ctx.state === 'running') {
        const lat = (A.ctx.outputLatency || 0) + (A.ctx.baseLatency || 0);
        if (!this.has) { A.run.t0 = A.ctx.currentTime - lat - this.last; this.has = true; this.off = this.last - perf; }
        const ct = A.ctx.currentTime - lat - A.run.t0;
        const err = ct - (perf + this.off);
        if (Math.abs(err) > 0.08) this.off = ct - perf;
        else this.off += err * 0.04;
        t = perf + this.off;
      } else {
        if (this.has) { this.has = false; this.base = this.last; this.pt = perf; }
        t = this.base + (perf - this.pt);
      }
      if (t < this.last) t = this.last;
      this.last = t;
      return t;
    },
    pause() { this.last = this.time(); this.paused = true; },
    resume() { this.paused = false; this.has = false; this.base = this.last; this.pt = performance.now() / 1000; },
  };

  // ------------------------------------------------------------ scheduler
  A.load = function (events) {
    A.events = events.sort((a, b) => a.t - b.t);
    A.ptr = 0;
  };
  A.pump = function (songTime) {
    if (!A.ok || !A.run || A.clock.paused || A.ctx.state !== 'running') return;
    const ahead = songTime + 0.25;
    while (A.ptr < A.events.length && A.events[A.ptr].t < ahead) {
      const e = A.events[A.ptr++];
      if (e.t < songTime - 0.1) continue; // stale (e.g. after a hiccup)
      try { e.fn(A.run.t0 + e.t); } catch (err) { console.warn(err); }
    }
  };
  A.songNow = () => (A.ok && A.run ? A.ctx.currentTime - A.run.t0 : 0);

  // ------------------------------------------------------------ voices
  function out(time, pan, sendAmt) {
    const ctx = A.ctx;
    let node;
    if (ctx.createStereoPanner) {
      node = ctx.createStereoPanner();
      node.pan.value = Math.max(-1, Math.min(1, pan || 0));
    } else node = ctx.createGain();
    node.connect(A.run.dry);
    if (sendAmt) {
      const s = ctx.createGain();
      s.gain.value = sendAmt;
      node.connect(s);
      s.connect(A.run.send);
    }
    return node;
  }
  function osc(type, f, t0, t1, dest) {
    const o = A.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.connect(dest);
    o.start(t0);
    o.stop(t1);
    return o;
  }
  function env(t, peak, attack, decay, dest) {
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(dest);
    return g;
  }

  // Electric piano: 1:1 FM with a decaying index gives the bright bark of a tine,
  // a quiet 7th partial adds the bell "ping".
  A.ep = function (t, midi, vel = 0.4, pan = 0) {
    const f = mtof(midi), ctx = A.ctx;
    const dur = Math.max(0.9, Math.min(3.6, 3.0 - (midi - 60) * 0.06));
    const o = out(t, pan, 0.4);
    const g = env(t, vel * 0.32, 0.006, dur, o);
    const car = osc('sine', f, t, t + dur + 0.1, g);
    const mod = ctx.createOscillator();
    mod.frequency.value = f;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * (1.2 + vel * 2.2), t);
    mg.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.5);
    mod.connect(mg);
    mg.connect(car.frequency);
    mod.start(t);
    mod.stop(t + dur + 0.1);
    const g2 = env(t, vel * 0.06, 0.004, 0.25, o);
    osc('sine', f * 7.02, t, t + 0.4, g2);
    const g3 = env(t, vel * 0.07, 0.01, dur * 0.7, o);
    osc('sine', f * 2.003, t, t + dur, g3);
  };

  A.marimba = function (t, midi, vel = 0.3, pan = 0) {
    const f = mtof(midi);
    const o = out(t, pan, 0.28);
    osc('sine', f, t, t + 0.9, env(t, vel * 0.42, 0.003, 0.7, o));
    osc('sine', f * 3.93, t, t + 0.2, env(t, vel * 0.12, 0.002, 0.09, o));
    if (f * 9.8 < 18000) osc('sine', f * 9.8, t, t + 0.08, env(t, vel * 0.04, 0.001, 0.03, o));
  };

  A.bell = function (t, midi, vel = 0.35, pan = 0) {
    const f = mtof(midi);
    const o = out(t, pan, 0.55);
    const parts = [[1, 1, 4], [2.0, 0.45, 2.6], [2.76, 0.32, 1.8], [5.4, 0.18, 0.9], [8.93, 0.1, 0.45]];
    for (const [r, a, d] of parts) osc('sine', f * r, t, t + d + 0.1, env(t, vel * 0.22 * a, 0.002, d, o));
  };

  A.pad = function (t, midis, dur, vel = 0.4) {
    const ctx = A.ctx;
    const att = Math.min(1.6, dur * 0.4), rel = 2.2;
    midis.forEach((midi, k) => {
      const f = mtof(midi);
      const o = out(t, (k / Math.max(1, midis.length - 1) - 0.5) * 0.7, 0.7);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0.4;
      lp.frequency.setValueAtTime(500, t);
      lp.frequency.linearRampToValueAtTime(1500, t + att);
      lp.frequency.linearRampToValueAtTime(700, t + dur + rel);
      const g = ctx.createGain();
      const peak = vel * 0.045;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + att);
      g.gain.setValueAtTime(peak, t + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
      lp.connect(g);
      g.connect(o);
      for (const det of [-7, 7]) {
        const s = osc('sawtooth', f, t, t + dur + rel + 0.1, lp);
        s.detune.value = det;
      }
    });
  };

  A.bass = function (t, midi, dur, vel = 0.4) {
    const ctx = A.ctx, f = mtof(midi);
    const o = out(t, 0, 0.08);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.5, t + 0.02);
    g.gain.setValueAtTime(vel * 0.42, t + Math.max(0.03, dur - 0.05));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
    lp.connect(g);
    g.connect(o);
    osc('sine', f, t, t + dur + 0.4, lp);
    const tri = ctx.createGain();
    tri.gain.value = 0.35;
    tri.connect(lp);
    osc('triangle', f * 2, t, t + dur + 0.4, tri);
  };

  A.sub = function (t, midi, dur, vel = 0.3) {
    const ctx = A.ctx, o = out(t, 0, 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.5, t + Math.min(1.2, dur * 0.3));
    g.gain.setValueAtTime(vel * 0.5, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 2);
    g.connect(o);
    osc('sine', mtof(midi), t, t + dur + 2.1, g);
  };

  A.kick = function (t, vel = 0.5) {
    const ctx = A.ctx, o = out(t, 0, 0.04);
    const g = env(t, vel * 0.8, 0.002, 0.32, o);
    const k = osc('sine', 120, t, t + 0.4, g);
    k.frequency.setValueAtTime(130, t);
    k.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  };

  function noiseSrc(t, dur) {
    const s = A.ctx.createBufferSource();
    s.buffer = A.noise;
    s.loop = true;
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur);
    return s;
  }

  A.tick = function (t, vel = 0.06, pan = 0) {
    const ctx = A.ctx, o = out(t, pan, 0.15);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6500;
    const g = env(t, vel, 0.001, 0.035, o);
    hp.connect(g);
    noiseSrc(t, 0.06).connect(hp);
  };

  A.whoosh = function (t, dur, vel = 0.2, f0 = 300, f1 = 3000) {
    const ctx = A.ctx, o = out(t, 0, 0.6);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.5, t + dur * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
    bp.connect(g);
    g.connect(o);
    noiseSrc(t, dur + 0.2).connect(bp);
  };

  A.snip = function (t) {
    const ctx = A.ctx, o = out(t, 0, 0.3);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3200;
    bp.Q.value = 3;
    bp.connect(env(t, 0.35, 0.001, 0.05, o));
    noiseSrc(t, 0.08).connect(bp);
    A.tick(t + 0.035, 0.12);
  };

  A.boom = function (t, vel = 0.6) {
    const ctx = A.ctx, o = out(t, 0, 0.5);
    const g = env(t, vel * 0.9, 0.004, 2.8, o);
    const s = osc('sine', 80, t, t + 3, g);
    s.frequency.setValueAtTime(90, t);
    s.frequency.exponentialRampToValueAtTime(36, t + 1.4);
  };

  // A water drop: a sine that bends upward — the "bloop" of something surfacing.
  A.drop = function (t, midi, vel = 0.3, pan = 0) {
    const f = mtof(midi), o = out(t, pan, 0.45);
    const s = osc('sine', f * 0.6, t, t + 0.3, env(t, vel * 0.5, 0.004, 0.2, o));
    s.frequency.setValueAtTime(f * 0.6, t);
    s.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.12);
  };

  A.splash = function (t, vel = 0.3) {
    const ctx = A.ctx, o = out(t, 0, 0.6);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(2600, t);
    bp.frequency.exponentialRampToValueAtTime(700, t + 0.5);
    bp.connect(env(t, vel * 0.5, 0.006, 0.55, o));
    noiseSrc(t, 0.7).connect(bp);
  };

  // A heartbeat: a soft, low double-bend sine, felt more than heard.
  A.thump = function (t, vel = 0.5) {
    const ctx = A.ctx, o = out(t, 0, 0.12);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    lp.connect(env(t, vel * 0.9, 0.006, 0.26, o));
    const s = osc('sine', 70, t, t + 0.4, lp);
    s.frequency.setValueAtTime(78, t);
    s.frequency.exponentialRampToValueAtTime(38, t + 0.18);
  };

  // A patient-monitor beep: a pure sine with a short, clean envelope.
  A.beep = function (t, midi, vel = 0.2, pan = 0) {
    const ctx = A.ctx, o = out(t, pan, 0.35), g = ctx.createGain(), f = mtof(midi);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.3, t + 0.008);
    g.gain.setValueAtTime(vel * 0.3, t + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    g.connect(o);
    osc('sine', f, t, t + 0.25, g);
  };

  // Physics collisions are sonified live: pitch follows horizontal position
  // on a G-major pentatonic, loudness follows impact speed.
  const PENTA = BJ.ms('G4 A4 B4 D5 E5 G5 A5 B5 D6 E6 G6 A6 B6 D7 E7');
  const recent = [];
  A.impact = function (xn, strength) {
    if (!A.ok || !A.run || A.clock.paused || A.ctx.state !== 'running') return;
    const now = A.ctx.currentTime;
    while (recent.length && recent[0] < now - 0.07) recent.shift();
    if (recent.length >= 4 && strength < 0.85) return;
    if (recent.length >= 7) return;
    recent.push(now);
    const idx = Math.max(0, Math.min(PENTA.length - 1, Math.round(((xn + 1) / 2) * (PENTA.length - 1))));
    A.marimba(now + 0.005, PENTA[idx], 0.06 + 0.4 * Math.pow(Math.min(1, strength), 1.3), xn * 0.8);
  };
})();
