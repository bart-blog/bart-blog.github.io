/* Conductor: renders the shapes (one matrix3d per element), sets the kinetic type,
   blends one scene into the next, schedules the score and wires up the controls. */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, A = BJ.Audio, E = BJ.ease, clamp = BJ.clamp, lerp = BJ.lerp, C = BJ.C;
  const N = BJ.N, BEAT = BJ.BEAT, scenes = BJ.scenes;

  let total = 0;
  scenes.forEach((s) => { s.start = total; total += s.beats; });

  const body = document.body;
  const stage = document.getElementById('stage');
  const typeRoot = document.getElementById('type');
  const hint = document.getElementById('hint');
  const bar = document.getElementById('bar');

  // ------------------------------------------------------------ shapes
  // Every shape is a plain div: a rounded rectangle whose size and corner radius are set
  // directly (so edges stay crisp at any scale) and whose position and 3D rotation are one
  // matrix3d. `tip` sharpens the top-left corner: a circle with tip 1 is a drop or a pin.
  const K = ['x', 'y', 'z', 'w', 'h', 'r', 'tip', 'rot', 'rx', 'ry', 'o', 'cr', 'cg', 'cb'];
  const mk = () => { const o = {}; for (const k of K) o[k] = new Float32Array(N); return o; };
  const S = mk(), PREV = mk(), LAST = mk();
  const els = new Array(N);
  const lw = new Float32Array(N).fill(-1), lh = new Float32Array(N).fill(-1), lo = new Float32Array(N).fill(-1);
  const lr = new Array(N).fill(''), lc = new Array(N).fill(''), lm = new Array(N).fill('');
  for (let k = 1; k <= N; k++) {
    const i = k % N; // dot 0 — the orange one — is added last, so it's always on top
    const el = document.createElement('div');
    el.className = 'sh';
    stage.appendChild(el);
    els[i] = el;
  }
  const r3 = (v) => Math.round(v * 1000) / 1000, r2 = (v) => Math.round(v * 100) / 100;

  function render() {
    for (let i = 0; i < N; i++) {
      const el = els[i], w = S.w[i], h = S.h[i], o = S.o[i] < 0.004 ? 0 : Math.min(1, S.o[i]);
      if (o === 0 || w < 0.3 || h < 0.3) {
        if (lo[i] !== 0) { el.style.opacity = 0; lo[i] = 0; }
        continue;
      }
      const wq = Math.round(w * 4) / 4, hq = Math.round(h * 4) / 4;
      if (wq !== lw[i]) { el.style.width = wq + 'px'; lw[i] = wq; }
      if (hq !== lh[i]) { el.style.height = hq + 'px'; lh[i] = hq; }
      const rr = Math.max(0, Math.min(S.r[i], wq / 2, hq / 2)), tl = rr * (1 - clamp(S.tip[i]));
      const rk = tl.toFixed(1) + 'px ' + rr.toFixed(1) + 'px';
      if (rk !== lr[i]) { el.style.borderRadius = tl.toFixed(1) + 'px ' + rr.toFixed(1) + 'px ' + rr.toFixed(1) + 'px'; lr[i] = rk; }
      const ck = 'rgb(' + Math.round(S.cr[i]) + ',' + Math.round(S.cg[i]) + ',' + Math.round(S.cb[i]) + ')';
      if (ck !== lc[i]) { el.style.backgroundColor = ck; lc[i] = ck; }
      // R = Rz(rot) · Ry(ry) · Rx(rx), rotating about the centre of the shape
      const cz = Math.cos(S.rot[i]), sz = Math.sin(S.rot[i]), cy = Math.cos(S.ry[i]), sy = Math.sin(S.ry[i]);
      const cx = Math.cos(S.rx[i]), sx = Math.sin(S.rx[i]);
      const a00 = cz * cy, a01 = cz * sy * sx - sz * cx, a02 = cz * sy * cx + sz * sx;
      const a10 = sz * cy, a11 = sz * sy * sx + cz * cx, a12 = sz * sy * cx - cz * sx;
      const a20 = -sy, a21 = cy * sx, a22 = cy * cx;
      const hw = wq / 2, hh = hq / 2;
      const tx = G.cx + S.x[i] - a00 * hw - a01 * hh, ty = G.cy + S.y[i] - a10 * hw - a11 * hh, tz = S.z[i] - a20 * hw - a21 * hh;
      const m = 'matrix3d(' + r3(a00) + ',' + r3(a10) + ',' + r3(a20) + ',0,' + r3(a01) + ',' + r3(a11) + ',' + r3(a21) + ',0,' +
        r3(a02) + ',' + r3(a12) + ',' + r3(a22) + ',0,' + r2(tx) + ',' + r2(ty) + ',' + r2(tz) + ',1)';
      if (m !== lm[i]) { el.style.transform = m; lm[i] = m; }
      if (Math.abs(o - lo[i]) > 0.003) { el.style.opacity = o; lo[i] = o; }
    }
  }

  // ------------------------------------------------------------ poses and blending
  const q = {}, fq = {};
  function reset(p) {
    p.x = p.y = p.z = p.w = p.h = p.r = p.tip = p.rot = p.rx = p.ry = p.sym = 0;
    p.o = 1; p.c = C.blue;
  }
  function evalInto(p, sc, i, b) {
    reset(p);
    sc.pose(i, b, p);
    p.cr = p.c[0]; p.cg = p.c[1]; p.cb = p.c[2];
    const cam = sc.camera ? sc.camera(b) : null;
    if (cam) {
      const z = cam.zoom || 1, cr = cam.rot || 0, c = Math.cos(cr), s = Math.sin(cr), x = p.x, y = p.y;
      p.x = (x * c - y * s) * z + (cam.x || 0); p.y = (x * s + y * c) * z + (cam.y || 0);
      p.w *= z; p.h *= z; p.r *= z; p.z *= z; p.rot += cr;
    }
    return p;
  }
  const vis = (p) => p.o > 0.02 && p.w > 0.5 && p.h > 0.5;
  const store = (T, i, p) => { for (const k of K) T[k][i] = p[k]; };
  const load = (p, T, i) => { for (const k of K) p[k] = T[k][i]; };
  const durOf = (bl, i) => Math.max(0.01, typeof bl.dur === 'function' ? bl.dur(i) : bl.dur === undefined ? 0.9 : bl.dur);
  const startOf = (bl, i) => (typeof bl.start === 'function' ? bl.start(i) : bl.start || 0);

  let cur = -1, src = null;
  const frozen = new Uint8Array(N);
  function sceneFrame(bt) {
    let idx = scenes.length - 1;
    for (let k = 0; k < scenes.length; k++) if (bt < scenes[k].start + scenes[k].beats) { idx = k; break; }
    const sc = scenes[idx];
    if (idx !== cur) {
      for (const k of K) { PREV[k].set(S[k]); LAST[k].set(S[k]); }
      src = cur >= 0 && cur === idx - 1 ? scenes[cur] : null;
      cur = idx;
      frozen.fill(0);
      if (sc.enter) sc.enter();
    }
    const b = bt - sc.start, bl = sc.blend || {}, ease = bl.ease || E.inOutCubic, arc = bl.arc || 0;
    const sb = src ? bt - src.start : 0;
    for (let i = 0; i < N; i++) {
      evalInto(q, sc, i, b);
      const raw = clamp((b - startOf(bl, i)) / durOf(bl, i));
      if (raw < 1) {
        // where the shape would be if the previous scene had kept going
        if (src && !frozen[i]) {
          evalInto(fq, src, i, sb);
          if (Math.hypot(fq.x - LAST.x[i], fq.y - LAST.y[i]) > G.R * 0.5) { frozen[i] = 1; load(fq, LAST, i); }
          else store(LAST, i, fq);
        } else load(fq, src ? LAST : PREV, i);
        const fv = vis(fq) && !(bl.fresh && bl.fresh(i)), tv = vis(q); // fresh: grow in place, don't travel
        if (!fv && tv) { const o = q.o; Object.assign(fq, q); fq.o = 0; fq.w *= 0.5; fq.h *= 0.5; fq.r *= 0.5; q.o = o; }
        else if (fv && !tv) { Object.assign(q, fq); q.o = 0; q.w *= 0.6; q.h *= 0.6; q.r *= 0.6; }
        if (fv || tv) {
          if (q.sym) q.rot += Math.round((fq.rot - q.rot) / q.sym) * q.sym; // a pill looks the same turned 180°
          const p = ease(raw), pc = clamp(p), dx = q.x - fq.x, dy = q.y - fq.y, off = Math.sin(Math.PI * pc) * arc;
          q.x = lerp(fq.x, q.x, p) - dy * off;
          q.y = lerp(fq.y, q.y, p) + dx * off;
          for (const k of ['z', 'rot', 'rx', 'ry']) q[k] = lerp(fq[k], q[k], p);
          for (const k of ['w', 'h', 'r']) q[k] = Math.max(0, lerp(fq[k], q[k], p));
          for (const k of ['tip', 'o', 'cr', 'cg', 'cb']) q[k] = lerp(fq[k], q[k], pc);
        }
      }
      store(S, i, q);
    }
    setBg(sc.bg ? sc.bg(b) : C.white);
  }
  let lastBg = '';
  function setBg(c) {
    const s = BJ.css(c);
    if (s !== lastBg) { body.style.backgroundColor = s; lastBg = s; }
  }

  // ------------------------------------------------------------ kinetic type
  // scene.type: [{ at, to, text | fn(b) | html, y (fraction of H), size, color, weight, stagger }]
  // Words rise into place one after another, sharpening as they land.
  const items = [];
  scenes.forEach((sc) => (sc.type || []).forEach((t) => items.push(Object.assign({ s0: sc.start, el: null, words: [], cur: '' }, t))));
  const pool = [];
  const sizeOf = (s) => (typeof s === 'function' ? s() : G.F * (typeof s === 'number' ? s : { xl: 1.6, l: 1, m: 0.62, s: 0.36 }[s || 'l']));
  function acquire(it) {
    const el = pool.pop() || typeRoot.appendChild(document.createElement('div'));
    el.className = 'line' + (it.cls ? ' ' + it.cls : '');
    el.style.cssText = '';
    it.el = el; it.words = []; it.cur = ''; it.key = ''; it.hk = ''; it.placed = 0;
    if (it.html) el.innerHTML = it.html;
    else {
      el.textContent = '';
      const parts = it.fn ? [''] : it.text.split(' ');
      parts.forEach((w, k) => {
        if (w === '|') { el.appendChild(document.createElement('br')); return; }
        if (k && parts[k - 1] !== '|') el.appendChild(document.createTextNode(' '));
        const s = document.createElement('span');
        s.className = 'w';
        s.textContent = w;
        el.appendChild(s);
        it.words.push({ el: s, key: '' });
      });
    }
    styleLine(it);
  }
  function styleLine(it) {
    const st = it.el.style, fs = sizeOf(it.size);
    st.fontSize = fs.toFixed(1) + 'px';
    const y = typeof it.y === 'function' ? it.y() : it.y === undefined ? G.textY / G.H : it.y;
    st.top = (y * G.H).toFixed(1) + 'px';
    st.color = it.color || '';
    if (it.weight) st.fontWeight = it.weight;
    if (it.ls !== undefined) st.letterSpacing = it.ls + 'em';
  }
  function release(it) {
    it.el.style.opacity = 0;
    it.el.innerHTML = '';
    pool.push(it.el);
    it.el = null;
  }
  function renderType(bt) {
    for (const it of items) {
      const start = it.s0 + it.at, end = it.s0 + it.to;
      const on = bt >= start - 0.02 && bt <= end + 0.02;
      if (on && !it.el) acquire(it);
      else if (!on && it.el) release(it);
      if (!it.el) continue;
      const b = bt - it.s0, fs = sizeOf(it.size);
      if (it.fn) {
        const s = it.fn(b);
        if (s !== it.cur) { it.words[0].el.textContent = s; it.cur = s; }
      }
      if (it.html) {
        // html lines (logo, link) fade in place, so shapes can line up with them exactly
        if (!it.placed) { it.placed = 1; it.el.style.transform = 'translate3d(-50%,-50%,0)'; }
        const f = E.inOutSine(clamp((bt - it.s0 - (it.show === undefined ? it.at : it.show)) / (it.fade || 0.9)));
        const k = Math.round(f * 300) + '';
        if (k !== it.hk) { it.hk = k; it.el.style.opacity = f; }
        continue;
      }
      const out = end === Infinity ? 1 : E.inOutSine(clamp((end - bt) / 0.45));
      const k0 = Math.round(out * 300) + ':' + Math.round(fs);
      if (k0 !== it.key) {
        it.key = k0;
        it.el.style.opacity = out;
        it.el.style.transform = 'translate3d(-50%,calc(-50% - ' + ((1 - out) * fs * 0.22).toFixed(1) + 'px),0)';
      }
      const stg = it.stagger === undefined ? 0.13 : it.stagger;
      it.words.forEach((w, k) => {
        const f = E.outQuint(clamp((bt - start - k * stg) / 0.8));
        const key = Math.round(f * 400) + '';
        if (key === w.key) return;
        w.key = key;
        const s = w.el.style;
        s.opacity = f;
        s.transform = 'translate3d(0,' + ((1 - f) * 0.42).toFixed(3) + 'em,0)';
        s.filter = f < 0.995 ? 'blur(' + ((1 - f) * 0.14 * fs).toFixed(1) + 'px)' : 'none';
      });
    }
  }

  // ------------------------------------------------------------ layout
  function layout() {
    BJ.layout();
    stage.style.perspective = Math.max(1000, G.R * 5) + 'px';
    stage.style.perspectiveOrigin = G.cx + 'px ' + G.cy + 'px';
    for (const it of items) if (it.el) { styleLine(it); it.key = ''; it.placed = 0; }
    hint.style.top = G.textY + 'px';
    lm.fill('');
  }
  window.addEventListener('resize', layout);
  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  // ------------------------------------------------------------ intro (before play)
  function introFrame(now) {
    const sc = scenes[0];
    for (let i = 0; i < N; i++) {
      evalInto(q, sc, i, sc.introBeat || 0);
      if (i === 0) { const s = 1 + 0.05 * Math.sin(now * 2.2); q.w *= s; q.h *= s; q.r *= s; }
      store(S, i, q);
    }
    setBg(C.white);
  }

  // ------------------------------------------------------------ score
  function buildEvents() {
    const ev = [];
    scenes.forEach((sc) => {
      const S0 = sc.start;
      const at = (b, fn) => ev.push({ t: (S0 + b) * BEAT, fn });
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
  const unlock = () => { if (A.ok && A.ctx.state !== 'running' && mode === 'play') A.ctx.resume(); };
  window.addEventListener('touchend', unlock, { passive: true });
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
  function frame() {
    if (mode === 'intro') {
      introFrame(performance.now() / 1000);
      render();
    } else if (mode !== 'debug') {
      const T = A.clock.time();
      A.pump(T);
      const bt = Math.max(0, T / BEAT);
      sceneFrame(bt);
      render();
      renderType(bt);
      bar.style.transform = 'scaleX(' + clamp(bt / total).toFixed(4) + ')';
      body.classList.toggle('dark', !!(scenes[cur] && scenes[cur].dark && scenes[cur].dark(bt - scenes[cur].start)));
      if (bt >= total && !body.classList.contains('ended')) body.classList.add('ended');
    }
    requestAnimationFrame(frame);
  }
  setMode('intro');
  requestAnimationFrame(frame);

  // Review hook: jump (silently) to any time. The film is a pure function of time.
  BJ.debug = {
    total: total * BEAT,
    S,
    buildEvents,
    to(sec) {
      if (mode !== 'debug') { setMode('debug'); body.classList.add('debug'); cur = -1; }
      const bt = sec / BEAT;
      // enter the scene cleanly: run its first frames so blends start from the previous scene's end
      let idx = scenes.length - 1;
      for (let k = 0; k < scenes.length; k++) if (bt < scenes[k].start + scenes[k].beats) { idx = k; break; }
      if (idx !== cur) {
        if (idx > 0) { cur = -1; sceneFrame(scenes[idx].start - 1e-4); }
        else cur = -1;
      }
      sceneFrame(bt);
      render();
      renderType(bt);
      return sec;
    },
  };
})();
