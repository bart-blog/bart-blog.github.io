/* Conductor: runs the timeline, blends formations, renders captions, wires up UI. */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, A = BJ.Audio, E = BJ.ease, clamp = BJ.clamp, lerp = BJ.lerp;
  const N = BJ.N, BEAT = BJ.BEAT, scenes = BJ.scenes;

  let total = 0;
  scenes.forEach((s) => { s.start = total; total += s.beats; });

  const body = document.body;
  const stage = document.getElementById('stage');
  const capRoot = document.getElementById('captions');
  const hint = document.getElementById('hint');
  const bar = document.getElementById('bar');
  const dots = new BJ.Dots(stage);

  // ------------------------------------------------------------ captions
  const caps = [];
  scenes.forEach((sc) => (sc.captions || []).forEach((c) => {
    const el = document.createElement('div');
    el.className = 'caption' + (c.cls ? ' ' + c.cls : '');
    const cap = { el, start: sc.start + c.at, end: sc.start + c.to, cls: c.cls, words: [], last: -1, s0: sc.start, update: c.update, uc: {} };
    if (c.words) {
      c.words.forEach(([txt, at], k) => {
        if (k) el.appendChild(document.createTextNode(' '));
        const w = document.createElement('span');
        w.className = 'w';
        w.textContent = txt;
        el.appendChild(w);
        cap.words.push({ el: w, start: sc.start + at, last: -1 });
      });
    } else if (c.html) el.innerHTML = c.html;
    else el.textContent = c.text;
    if (c.cls === 'sig') {
      cap.probe = document.createElement('span');
      cap.probe.className = 'probe';
      el.appendChild(cap.probe);
    }
    capRoot.appendChild(el);
    caps.push(cap);
  }));
  const sigCap = caps.find((c) => c.cls === 'sig');

  function fade(bt, start, end) {
    const i = E.outCubic(clamp((bt - start) / 0.9));
    const o = end === Infinity ? 1 : E.inOutSine(clamp((end - bt) / 0.6));
    return { a: i * o, y: (1 - i) * 12 };
  }
  function setCap(el, a, y, cache) {
    const key = Math.round(a * 200) + Math.round(y * 10) * 1000;
    if (cache.last === key) return;
    cache.last = key;
    el.style.opacity = a;
    el.style.transform = 'translate3d(0,calc(-50% + ' + y.toFixed(1) + 'px),0)';
    el.style.visibility = a > 0.001 ? 'visible' : 'hidden';
  }
  function renderCaptions(bt) {
    for (const c of caps) {
      const f = fade(bt, c.start, c.end);
      if (c.update && f.a > 0.001) c.update(c.el, bt - c.s0, c.uc);
      if (!c.words.length) { setCap(c.el, f.a, f.y, c); continue; }
      const out = c.end === Infinity ? 1 : E.inOutSine(clamp((c.end - bt) / 0.6));
      const on = bt >= c.start - 0.01 && out > 0 ? out : 0;
      setCap(c.el, on, 0, c);
      for (const w of c.words) {
        const fw = fade(bt, w.start, Infinity);
        const key = Math.round(fw.a * 200);
        if (w.last !== key) { w.last = key; w.el.style.opacity = fw.a; w.el.style.transform = 'translate3d(0,' + fw.y.toFixed(1) + 'px,0)'; }
      }
    }
  }

  // ------------------------------------------------------------ layout
  function layout() {
    BJ.layout();
    stage.style.perspective = Math.max(900, G.R * 4.5) + 'px';
    stage.style.perspectiveOrigin = G.cx + 'px ' + G.cy + 'px';
    for (const c of caps) {
      c.el.style.top = (c.cls === 'sig' ? G.sigY : c.cls === 'link' ? G.sigY + Math.max(40, G.H * 0.06) : G.textY) + 'px';
      c.last = -1;
      c.uc = {};
    }
    hint.style.top = G.textY + 'px';
    // where does the full stop of the signature go?
    const el = sigCap.el, prevT = el.style.transform;
    el.style.transform = 'translate3d(0,-50%,0)';
    const sw = el.querySelector('.swap');
    G.periodShift = [0, 0];
    if (sw) {
      sw.style.width = '';
      const wo = sw.firstChild.getBoundingClientRect().width, wn = sw.lastChild.getBoundingClientRect().width;
      G.swapW = [wo, wn];
      sw.style.width = wn + 'px';
      const pn = sigCap.probe.getBoundingClientRect();
      sw.style.width = wo + 'px';
      const po = sigCap.probe.getBoundingClientRect();
      G.periodShift = [pn.left - po.left, pn.top - po.top];
    }
    const pr = sigCap.probe.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(el).fontSize);
    el.style.transform = prevT;
    const d = fs * 0.2;
    G.period = { x: pr.left + fs * 0.03 + d / 2 - G.cx, y: pr.top - d / 2 - fs * 0.005 - G.cy, d };
  }
  window.addEventListener('resize', layout);
  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  // ------------------------------------------------------------ timeline
  const o = { x: 0, y: 0, z: 0, sx: 1, sy: 1, rot: 0, o: 1 };
  const prev = {};
  for (const k of ['x', 'y', 'z', 'sx', 'sy', 'rot', 'o']) prev[k] = new Float32Array(N);
  let cur = -1;

  function resetO() { o.x = o.y = o.z = o.rot = 0; o.sx = o.sy = 1; o.o = 1; }
  function write(i) {
    dots.x[i] = o.x; dots.y[i] = o.y; dots.z[i] = o.z;
    dots.sx[i] = o.sx; dots.sy[i] = o.sy; dots.rot[i] = o.rot; dots.o[i] = o.o;
  }

  function sceneFrame(bt, dtSong) {
    let idx = scenes.length - 1;
    for (let k = 0; k < scenes.length; k++) if (bt < scenes[k].start + scenes[k].beats) { idx = k; break; }
    const sc = scenes[idx];
    if (idx !== cur) {
      for (const k in prev) prev[k].set(dots[k]);
      cur = idx;
      if (sc.enter) sc.enter(prev);
    }
    const b = bt - sc.start, t = b * BEAT;
    if (sc.update) sc.update(t, b, dtSong);
    const bl = sc.blend || {}, dur = bl.dur || 0.01, ease = bl.ease || E.inOutCubic, arc = bl.arc || 0;
    for (let i = 0; i < N; i++) {
      resetO();
      sc.pose(i, t, b, o);
      const st = bl.start ? bl.start(i) : (bl.delay || 0) + (bl.order ? bl.order(i) : i / (N - 1)) * (bl.stagger || 0);
      const raw = clamp((b - st) / dur);
      if (raw < 1) {
        const p = ease(raw);
        const dx = o.x - prev.x[i], dy = o.y - prev.y[i], off = Math.sin(Math.PI * raw) * arc;
        o.x = lerp(prev.x[i], o.x, p) - dy * off;
        o.y = lerp(prev.y[i], o.y, p) + dx * off;
        o.z = lerp(prev.z[i], o.z, p);
        o.sx = Math.max(0, lerp(prev.sx[i], o.sx, p));
        o.sy = Math.max(0, lerp(prev.sy[i], o.sy, p));
        o.rot = lerp(prev.rot[i], o.rot, p);
        o.o = clamp(lerp(prev.o[i], o.o, clamp(p)));
      }
      write(i);
    }
  }

  function introFrame(now) {
    for (let i = 0; i < N; i++) {
      resetO();
      BJ.introPose(i, 0, -10, o);
      if (i === 0) { const s = 1 + 0.06 * Math.sin(now * 2.2); o.sx *= s; o.sy *= s; }
      write(i);
    }
  }

  // ------------------------------------------------------------ score
  function buildEvents() {
    const ev = [];
    scenes.forEach((sc) => {
      const S = sc.start;
      const at = (b, fn) => ev.push({ t: (S + b) * BEAT, fn });
      const M = {
        ep: (b, n, v, p) => at(b, (T) => A.ep(T, BJ.m(n), v, p)),
        marimba: (b, n, v, p) => at(b, (T) => A.marimba(T, BJ.m(n), v, p)),
        bell: (b, n, v, p) => at(b, (T) => A.bell(T, BJ.m(n), v, p)),
        pad: (b, ns, beats, v) => at(b, (T) => A.pad(T, BJ.ms(ns), beats * BEAT, v)),
        bass: (b, n, beats, v) => at(b, (T) => A.bass(T, BJ.m(n), beats * BEAT, v)),
        sub: (b, n, beats, v) => at(b, (T) => A.sub(T, BJ.m(n), beats * BEAT, v)),
        kick: (b, v) => at(b, (T) => A.kick(T, v)),
        tick: (b, v, p) => at(b, (T) => A.tick(T, v, p)),
        whoosh: (b, beats, v, f0, f1) => at(b, (T) => A.whoosh(T, beats * BEAT, v, f0, f1)),
        snip: (b) => at(b, (T) => A.snip(T)),
        boom: (b, v) => at(b, (T) => A.boom(T, v)),
      };
      sc.music(M);
    });
    return ev;
  }

  // ------------------------------------------------------------ transport
  let mode = 'intro';
  function setMode(m) {
    mode = m;
    body.classList.toggle('intro', m === 'intro');
    body.classList.toggle('paused', m === 'paused');
  }

  function start() {
    const p = A.init();
    const go = () => {
      if (A.ok) A.newRun(); else A.clock.reset(-0.15);
      A.load(buildEvents());
      cur = -1;
      body.classList.remove('ended');
      A.clock.resume();
      setMode('play');
      poke();
    };
    // never let a stuck audio unlock block the film
    if (A.ok && A.ctx.state !== 'running') once(p, go, 400);
    else go();
  }
  function once(p, fn, ms) {
    let done = false;
    const f = () => { if (!done) { done = true; fn(); } };
    Promise.resolve(p).then(f, f);
    setTimeout(f, ms);
  }
  function pause() {
    if (mode !== 'play') return;
    A.clock.pause();
    if (A.ok) A.ctx.suspend();
    setMode('paused');
  }
  function resume() {
    if (mode !== 'paused') return;
    const go = () => { A.clock.resume(); setMode('play'); };
    if (A.ok) once(A.ctx.resume(), go, 400); else go();
  }
  function toggle() { if (mode === 'intro') start(); else if (mode === 'play') pause(); else resume(); }
  function replay() {
    if (mode === 'intro') return start();
    if (A.ok && A.ctx.state !== 'running') once(A.ctx.resume(), start, 400);
    else start();
  }
  function toggleMute() {
    A.setMuted(!A.muted);
    body.classList.toggle('muted', A.muted);
  }

  document.getElementById('btn-play').addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  document.getElementById('btn-replay').addEventListener('click', (e) => { e.stopPropagation(); replay(); });
  document.getElementById('btn-mute').addEventListener('click', (e) => { e.stopPropagation(); toggleMute(); });
  // pointerup rather than click: iOS doesn't fire click on non-interactive elements
  window.addEventListener('pointerup', (e) => {
    if (e.button > 0 || e.target.closest('a, button')) return;
    toggle();
  });
  // keep trying to unlock audio on any gesture, in case the first one didn't take
  const unlock = () => { if (A.ok && A.ctx.state !== 'running' && mode === 'play') A.ctx.resume(); };
  window.addEventListener('touchend', unlock, { passive: true });
  // no pinch / double-tap zoom (iOS ignores user-scalable=no)
  ['gesturestart', 'gesturechange', 'dblclick'].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || e.scale !== undefined && e.scale !== 1) e.preventDefault(); }, { passive: false });
  if (window.matchMedia && matchMedia('(hover: none)').matches) {
    const sub = document.querySelector('.hint-sub');
    if (sub) sub.innerHTML = 'Tap to play &middot; sound on';
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.key === 'm' || e.key === 'M') toggleMute();
    else if (e.key === 'r' || e.key === 'R') replay();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  let idleTimer = 0;
  function poke() {
    body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (mode === 'play') body.classList.add('idle'); }, 2200);
  }
  window.addEventListener('mousemove', poke);
  window.addEventListener('touchstart', poke, { passive: true });

  // ------------------------------------------------------------ loop
  let lastSong = 0, lastPerf = performance.now();
  function frame() {
    const perf = performance.now(), dtReal = Math.min(0.1, (perf - lastPerf) / 1000);
    lastPerf = perf;
    if (mode === 'debug') {
      // driven by BJ.debug.to()
    } else if (mode === 'intro') {
      introFrame(perf / 1000);
      dots.render(dtReal);
    } else {
      const T = A.clock.time();
      A.pump(T);
      const dt = Math.max(0, Math.min(0.1, T - lastSong));
      lastSong = T;
      const bt = Math.max(0, T / BEAT);
      sceneFrame(bt, dt);
      dots.render(dt);
      renderCaptions(bt);
      bar.style.transform = 'scaleX(' + clamp(bt / total).toFixed(4) + ')';
      if (bt >= total && !body.classList.contains('ended')) body.classList.add('ended');
    }
    requestAnimationFrame(frame);
  }
  setMode('intro');
  requestAnimationFrame(frame);

  // Review hook: deterministically simulate (silently) up to a given time.
  let simT = 0;
  BJ.debug = {
    total: total * BEAT,
    dots,
    buildEvents,
    to(sec, step = 1 / 60) {
      if (mode !== 'debug') { setMode('debug'); body.classList.add('debug'); cur = -1; simT = 0; }
      while (sec - simT > 1e-6) {
        const dt = Math.min(step, sec - simT);
        simT += dt;
        sceneFrame(simT / BEAT, dt);
        dots.render(dt);
      }
      renderCaptions(simT / BEAT);
      return simT;
    },
  };
})();
