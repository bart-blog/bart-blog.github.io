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
  const band = document.getElementById('band');
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
    capRoot.appendChild(el);
    caps.push(cap);
  }));

  function fade(bt, start, end) {
    const i = E.outQuint(clamp((bt - start) / 0.6));
    const o = end === Infinity ? 1 : E.inOutSine(clamp((end - bt) / 0.4));
    return { a: i * o, y: (1 - i) * 10 };
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
  let bandKey = '';
  function layout() {
    BJ.layout();
    stage.style.perspective = Math.max(900, G.R * 4.5) + 'px';
    stage.style.perspectiveOrigin = G.cx + 'px ' + G.cy + 'px';
    for (const c of caps) {
      c.el.style.top = (c.cls === 'link' ? G.textY + Math.max(70, G.H * 0.085) : G.textY) + 'px';
      c.last = -1;
      c.uc = {};
    }
    hint.style.top = G.textY + 'px';
    bandKey = '';
  }
  window.addEventListener('resize', layout);
  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  // ------------------------------------------------------------ backdrop
  // A pale horizontal band (the inside of a blood vessel): { a, top, h } relative to the stage centre.
  function renderBand(sc, b) {
    const s = sc && sc.backdrop ? sc.backdrop(b) : null;
    const a = s ? clamp(s.a) : 0, top = s ? G.cy + s.top : G.H, h = s ? Math.max(0, s.h) : 0;
    const key = Math.round(a * 300) + ':' + Math.round(top) + ':' + Math.round(h);
    if (key === bandKey) return;
    bandKey = key;
    band.style.opacity = a.toFixed(3);
    band.style.transform = 'translate3d(0,' + top.toFixed(1) + 'px,0) scaleY(' + (h / 100).toFixed(4) + ')';
  }

  // ------------------------------------------------------------ timeline
  const o = { x: 0, y: 0, z: 0, sx: 1, sy: 1, rot: 0, o: 1, c: 0 };
  const prev = {};
  for (const k of ['x', 'y', 'z', 'sx', 'sy', 'rot', 'o', 'c']) prev[k] = new Float32Array(N);
  let cur = -1;
  // role[i]: which of the scene's "parts" dot i plays. Re-paired at every scene change.
  let role = new Int16Array(N).map((_, i) => i);
  let src = null; // the previous scene, kept alive so dots peel off a moving formation
  const so = { x: 0, y: 0, z: 0, sx: 1, sy: 1, rot: 0, o: 1, c: 0 };
  // last source state per dot; if the old scene teleports a dot (a loop wrapping), it leaves from here
  const SK = ['x', 'y', 'z', 'sx', 'sy', 'rot', 'o', 'c'], last = {}, frozen = new Uint8Array(N);
  for (const k of SK) last[k] = new Float32Array(N);

  function resetO() { o.x = o.y = o.z = o.rot = o.c = 0; o.sx = o.sy = 1; o.o = 1; }
  function evalInto(q, sc, r, b, cam) {
    q.x = q.y = q.z = q.rot = q.c = 0; q.sx = q.sy = 1; q.o = 1;
    sc.pose(r, b * BEAT, b, q);
    if (cam) {
      const cz = cam.zoom || 1, cr = cam.rot || 0, c = Math.cos(cr), s = Math.sin(cr), x = q.x, y = q.y;
      q.x = (x * c - y * s) * cz; q.y = (x * s + y * c) * cz; q.z *= cz;
      q.sx *= cz; q.sy *= cz; q.rot += cr;
    }
    return q;
  }
  const durOf = (bl, r) => (typeof bl.dur === 'function' ? bl.dur(r) : bl.dur || 0.01);
  const moves = (bl) => typeof bl.dur === 'function' || (bl.dur || 0) > 0.05;
  function blendStart(bl, r) {
    return bl.start ? bl.start(r) : (bl.delay || 0) + (bl.order ? bl.order(r) : r / (N - 1)) * (bl.stagger || 0);
  }
  // Pair every dot with the part of the new formation nearest to it (minimum total travel),
  // measured where that part will be when the dot arrives. Visible dots stay visible.
  const vis = (q) => q.o > 0.05 && Math.max(q.sx, q.sy) > 0.03;
  function remap(sc) {
    const bl = sc.blend || {};
    if (sc.remap === 'keep') return; // same cast as the previous scene
    if (sc.remap === false || !moves(bl)) { role = role.map((_, i) => i); return; }
    const tx = new Float32Array(N), ty = new Float32Array(N), tz = new Float32Array(N), tv = new Uint8Array(N);
    const q = {};
    for (let r = 0; r < N; r++) {
      const ba = blendStart(bl, r) + durOf(bl, r);
      evalInto(q, sc, r, ba, sc.camera ? sc.camera(ba) : null);
      tx[r] = q.x; ty[r] = q.y; tz[r] = q.z; tv[r] = vis(q) ? 1 : 0;
    }
    const pv = new Uint8Array(N);
    for (let i = 0; i < N; i++) pv[i] = prev.o[i] > 0.05 && Math.max(prev.sx[i], prev.sy[i]) > 0.03 ? 1 : 0;
    const pen = (G.R * 4) * (G.R * 4);
    const cost = new Float64Array(N * N);
    for (let i = 0; i < N; i++) for (let r = 0; r < N; r++) {
      const dx = prev.x[i] - tx[r], dy = prev.y[i] - ty[r], dz = (prev.z[i] - tz[r]) * 0.5;
      cost[i * N + r] = (pv[i] ? dx * dx + dy * dy + dz * dz : 0) + (pv[i] !== tv[r] ? pen : 0) +
        ((i === 0) !== (r === 0) ? 1e15 : 0); // the hero is always the hero
    }
    const a = BJ.assign(N, (i, r) => cost[i * N + r]);
    role = Int16Array.from(a);
  }
  function write(i) {
    dots.x[i] = o.x; dots.y[i] = o.y; dots.z[i] = o.z + (i === 0 ? 1 : 0); // the hero stays on top
    dots.sx[i] = o.sx; dots.sy[i] = o.sy; dots.rot[i] = o.rot; dots.o[i] = o.o; dots.c[i] = o.c;
  }

  function sceneFrame(bt, dtSong) {
    let idx = scenes.length - 1;
    for (let k = 0; k < scenes.length; k++) if (bt < scenes[k].start + scenes[k].beats) { idx = k; break; }
    const sc = scenes[idx];
    if (idx !== cur) {
      for (const k in prev) prev[k].set(dots[k]);
      const from = cur >= 0 && cur === idx - 1 ? scenes[cur] : null, fromRole = role;
      cur = idx;
      if (sc.enter) sc.enter(prev);
      remap(sc);
      src = from && sc.remap !== false && sc.remap !== 'keep' && moves(sc.blend || {}) ? { sc: from, role: fromRole } : null;
      for (const k of SK) last[k].set(prev[k]);
      frozen.fill(0);
    }
    const b = bt - sc.start, t = b * BEAT;
    if (sc.update) sc.update(t, b, dtSong);
    const bl = sc.blend || {}, ease = bl.ease || E.glide, arc = bl.arc || 0;
    const cam = sc.camera ? sc.camera(b) : null;
    const sb = src ? bt - src.sc.start : 0, scam = src && src.sc.camera ? src.sc.camera(sb) : null;
    for (let i = 0; i < N; i++) {
      const r = role[i];
      evalInto(o, sc, r, b, cam);
      const raw = clamp((b - blendStart(bl, r)) / durOf(bl, r));
      if (raw < 1) {
        // where the dot would be if the old scene had kept going
        let px, py, pz, psx, psy, prot, po, pc;
        if (src) {
          if (!frozen[i]) {
            evalInto(so, src.sc, src.role[i], sb, scam);
            if (Math.hypot(so.x - last.x[i], so.y - last.y[i]) > G.R * 0.35) frozen[i] = 1;
            else for (const k of SK) last[k][i] = so[k];
          }
          px = last.x[i]; py = last.y[i]; pz = last.z[i]; psx = last.sx[i]; psy = last.sy[i]; prot = last.rot[i]; po = last.o[i]; pc = last.c[i];
        } else {
          px = prev.x[i]; py = prev.y[i]; pz = prev.z[i]; psx = prev.sx[i]; psy = prev.sy[i]; prot = prev.rot[i]; po = prev.o[i]; pc = prev.c[i];
        }
        // a dot that was hidden appears where it is needed instead of flying in from nowhere
        if (po < 0.02 || Math.max(psx, psy) < 0.02) { px = o.x; py = o.y; pz = o.z; prot = o.rot; pc = o.c; psx = psy = 0; po = 0; }
        const p = ease(raw);
        const dx = o.x - px, dy = o.y - py, off = Math.sin(Math.PI * clamp(p)) * arc;
        o.x = lerp(px, o.x, p) - dy * off;
        o.y = lerp(py, o.y, p) + dx * off;
        o.z = lerp(pz, o.z, p);
        o.sx = Math.max(0, lerp(psx, o.sx, p));
        o.sy = Math.max(0, lerp(psy, o.sy, p));
        o.rot = lerp(prot, o.rot, p);
        o.o = clamp(lerp(po, o.o, clamp(p)));
        o.c = lerp(pc, o.c, clamp(p));
      }
      write(i);
    }
    renderBand(sc, b);
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
        drop: (b, n, v, p) => at(b, (T) => A.drop(T, BJ.m(n), v, p)),
        splash: (b, v) => at(b, (T) => A.splash(T, v)),
        snip: (b) => at(b, (T) => A.snip(T)),
        boom: (b, v) => at(b, (T) => A.boom(T, v)),
        thump: (b, v) => at(b, (T) => A.thump(T, v)),
        beep: (b, n, v, p) => at(b, (T) => A.beep(T, BJ.m(n), v, p)),
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
