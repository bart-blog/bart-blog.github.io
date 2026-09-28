/* Conductor: runs the timeline, blends each scene into the next, renders captions, wires up UI. */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, A = BJ.Audio, E = BJ.ease, clamp = BJ.clamp;
  const BEAT = BJ.BEAT, scenes = BJ.scenes, F = BJ.FIELDS, GROUP = BJ.GROUP;

  let total = 0;
  scenes.forEach((s) => { s.start = total; total += s.beats; });

  const body = document.body;
  const stageEl = document.getElementById('stage');
  const capRoot = document.getElementById('captions');
  const hint = document.getElementById('hint');
  const sea = document.getElementById('sea');
  const dark = document.getElementById('dark');
  const bar = document.getElementById('bar');
  const stage = new BJ.Stage(stageEl, BJ.ELEMENTS);
  const NEL = stage.n;

  // ------------------------------------------------------------ captions
  const caps = [];
  scenes.forEach((sc) => (sc.captions || []).forEach((c) => {
    const el = document.createElement('div');
    el.className = 'caption' + (c.cls ? ' ' + c.cls : '');
    const cap = { el, start: sc.start + c.at, end: sc.start + c.to, cls: c.cls, snap: !!c.snap, slam: c.cls === 'slam', words: [], last: -1, s0: sc.start, update: c.update, place: c.place, uc: {} };
    if (c.words) {
      c.words.forEach(([txt, at, hl], k) => {
        if (k) el.appendChild(document.createTextNode(' '));
        const w = document.createElement('span');
        w.className = 'w' + (hl ? ' hl' : '');
        w.textContent = txt;
        el.appendChild(w);
        cap.words.push({ el: w, start: sc.start + at, last: -1, hl: !!hl, hk: -1 });
      });
    } else if (c.html) el.innerHTML = c.html;
    else el.textContent = c.text;
    capRoot.appendChild(el);
    caps.push(cap);
  }));

  function fade(bt, start, end) {
    const i = E.outQuint(clamp((bt - start) / 0.55));
    const o = end === Infinity ? 1 : E.inOutSine(clamp((end - bt) / 0.35));
    return { a: i * o, y: (1 - i) * 0.5 };
  }
  function setCap(el, a, y, cache) {
    const key = Math.round(a * 200) + Math.round(y * 100) * 1000;
    if (cache.last === key) return;
    cache.last = key;
    el.style.opacity = a;
    el.style.transform = 'translate3d(0,calc(-50% + ' + y.toFixed(2) + 'em),0)';
    el.style.visibility = a > 0.001 ? 'visible' : 'hidden';
  }
  function renderCaptions(bt) {
    for (const c of caps) {
      const f = fade(bt, c.start, c.end);
      if (c.update && f.a > 0.001) c.update(c.el, bt - c.s0, c.uc);
      if (!c.words.length) { setCap(c.el, f.a, f.y, c); continue; }
      // snap captions are cut on their end beat (a hard cut on a hit), the rest fade out
      const out = c.end === Infinity ? 1 : c.snap ? (bt < c.end ? 1 : 0) : E.inOutSine(clamp((c.end - bt) / 0.4));
      const on = bt >= c.start - 0.01 && out > 0 ? out : 0;
      setCap(c.el, on, 0, c);
      for (const w of c.words) {
        if (c.slam) {
          // slammed titles land hard: in on the beat, from 2.2× down to size in a fifth of a beat
          const x = bt - w.start, a = clamp(x / 0.03), k = 1 + 1.2 * (1 - E.outExpo(clamp(x / 0.22)));
          const key = Math.round(a * 50) * 10000 + Math.round(k * 1000);
          if (w.last !== key) { w.last = key; w.el.style.opacity = a; w.el.style.transform = 'scale(' + k.toFixed(3) + ')'; }
          continue;
        }
        const fw = fade(bt, w.start, Infinity);
        const key = Math.round(fw.a * 200);
        if (w.last !== key) {
          w.last = key;
          // words pop up into place: a small rise and a scale that settles with a hint of overshoot
          const sc = 0.86 + 0.14 * E.outBack(clamp((bt - w.start) / 0.5));
          w.el.style.opacity = fw.a;
          w.el.style.transform = 'translate3d(0,' + (fw.y * 1.2).toFixed(3) + 'em,0) scale(' + sc.toFixed(3) + ')';
        }
        if (w.hl) {
          const h = E.inOutCubic(clamp((bt - w.start - 0.25) / 0.45)), hk = Math.round(h * 200);
          if (w.hk !== hk) { w.hk = hk; w.el.style.backgroundSize = (h * 100).toFixed(1) + '% 0.36em'; }
        }
      }
    }
  }

  // ------------------------------------------------------------ layout
  let seaKey = '', camKey = '';
  function layout() {
    BJ.layout();
    BJ.filmLayout();
    stageEl.style.perspective = G.P + 'px';
    stageEl.style.perspectiveOrigin = G.cx + 'px ' + G.cy + 'px';
    for (const c of caps) {
      c.el.style.top = G.textY + 'px';
      if (c.place) Object.assign(c.el.style, c.place());
      c.last = -1;
      c.uc = {};
    }
    hint.style.top = G.textY + 'px';
    seaKey = '';
    camKey = '';
    stage.lastT.fill('');
  }
  window.addEventListener('resize', layout);
  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  // ------------------------------------------------------------ backdrop + camera
  // A scene may move the whole camera (a punch-in on a hit, a jolt): stage and sea move together,
  // captions stay put so they remain easy to read.
  const cam = { s: 1, x: 0, y: 0, r: 0 };
  function cameraAt(sc, b) {
    const c = sc && sc.camera ? sc.camera(b) : null;
    cam.s = c && c.s !== undefined ? c.s : 1; cam.x = (c && c.x) || 0; cam.y = (c && c.y) || 0; cam.r = (c && c.r) || 0;
    const key = cam.s.toFixed(4) + ':' + cam.x.toFixed(1) + ':' + cam.y.toFixed(1) + ':' + cam.r.toFixed(4);
    if (key === camKey) return;
    camKey = key;
    const id = Math.abs(cam.s - 1) < 1e-4 && Math.abs(cam.x) < 0.05 && Math.abs(cam.y) < 0.05 && Math.abs(cam.r) < 1e-4;
    stageEl.style.transformOrigin = G.cx + 'px ' + G.cy + 'px';
    stageEl.style.transform = id ? '' : 'translate3d(' + cam.x.toFixed(1) + 'px,' + cam.y.toFixed(1) + 'px,0) rotate(' + cam.r.toFixed(4) + 'rad) scale(' + cam.s.toFixed(4) + ')';
    seaKey = '';
  }
  function renderSea(sc, b) {
    const s = sc && sc.backdrop ? sc.backdrop(b) : null;
    const a = s ? clamp(s.sea) : 0, y = s ? G.cy + s.y : G.H;
    const d = s && s.dark ? clamp(s.dark) : 0;
    const key = Math.round(a * 300) + ':' + Math.round(y) + ':' + Math.round(d * 300);
    if (key === seaKey) return;
    seaKey = key;
    sea.style.opacity = a.toFixed(3);
    dark.style.opacity = d.toFixed(3);
    dark.style.visibility = d > 0.002 ? 'visible' : 'hidden';
    // same camera as the stage, about the same origin (the sea's own origin is the viewport's top-left):
    // the sea's top-left (0, y) goes to C + T + s·R·((0, y) − C)
    const cr = Math.cos(cam.r), sr = Math.sin(cam.r), vx = -G.cx, vy = y - G.cy;
    const left = G.cx + cam.x + cam.s * (cr * vx - sr * vy), top = G.cy + cam.y + cam.s * (sr * vx + cr * vy);
    sea.style.transform = 'translate3d(' + left.toFixed(1) + 'px,' + top.toFixed(1) + 'px,0)' + (cam.r ? ' rotate(' + cam.r.toFixed(4) + 'rad)' : '') + (cam.s !== 1 ? ' scale(' + cam.s.toFixed(4) + ')' : '');
  }

  // ------------------------------------------------------------ timeline
  // Transitions blend in parameter space: the old scene keeps running while each
  // element eases, field by field, into the new one. Group fields (how a whole
  // formation is turned) may use their own ease, so a plane can stand up while
  // its rows rearrange.
  const q = {}, s = {}, t = {};
  const LOT = BJ.ELEMENTS.map((e) => !!e.lottie); // for Lottie actors clip drives a sub-layer, not visibility
  const vis = (p, i) => p.o > 0.004 && p.w > 0.3 && p.h > 0.3 && (LOT[i] || p.clip > 0.002);
  function evalPose(sc, i, b, p) { BJ.resetPose(p); sc.pose(i, b, p); return p; }
  function sceneAt(bt) {
    for (let k = 0; k < scenes.length; k++) if (bt < scenes[k].start + scenes[k].beats) return k;
    return scenes.length - 1;
  }
  function sceneFrame(bt) {
    const idx = sceneAt(bt), sc = scenes[idx], b = bt - sc.start;
    const prev = idx > 0 ? scenes[idx - 1] : null, bl = sc.blend, pb = prev ? b + prev.beats : 0;
    if (prev && bl && prev.frame) prev.frame(pb);
    if (sc.frame) sc.frame(b);
    for (let i = 0; i < NEL; i++) {
      evalPose(sc, i, b, t);
      let out = t;
      if (prev && bl) {
        const st = bl.start ? bl.start(i) : 0, du = bl.dur ? bl.dur(i) : 1, raw = (b - st) / du;
        if (raw < 1) {
          evalPose(prev, i, pb, s);
          const sv = vis(s, i), tv = vis(t, i);
          if (sv || tv) {
            if (!sv) { for (const f of F) s[f] = t[f]; s.o = 0; s.w *= 0.4; s.h *= 0.4; }
            else if (!tv) { for (const f of F) t[f] = s[f]; t.o = 0; t.w *= 0.4; t.h *= 0.4; }
            const r = clamp(raw), p = (bl.ease || E.inOutCubic)(r), gp = (bl.gease || bl.ease || E.inOutCubic)(r);
            for (const f of F) q[f] = s[f] + (t[f] - s[f]) * (GROUP[f] ? gp : p);
            q.o = s.o + (t.o - s.o) * r;
            q.r = s.r + (t.r - s.r) * r; q.g = s.g + (t.g - s.g) * r; q.b = s.b + (t.b - s.b) * r;
            q.w = Math.max(0, q.w); q.h = Math.max(0, q.h); q.clip = clamp(q.clip);
            if (bl.mid) bl.mid(i, r, q);
            out = q;
          }
        }
      }
      stage.set(i, out);
    }
    cameraAt(sc, b);
    renderSea(sc, b);
  }
  function introFrame() { sceneFrame(0); }

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
        cello: (b, n, beats, v, p) => at(b, (T) => A.cello(T, BJ.m(n), beats * BEAT, v, p)),
        swish: (b, beats, v, p) => at(b, (T) => A.swish(T, beats * BEAT, v, p)),
        kick: (b, v) => at(b, (T) => A.kick(T, v)),
        tick: (b, v, p) => at(b, (T) => A.tick(T, v, p)),
        whoosh: (b, beats, v, f0, f1) => at(b, (T) => A.whoosh(T, beats * BEAT, v, f0, f1)),
        drop: (b, n, v, p) => at(b, (T) => A.drop(T, BJ.m(n), v, p)),
        splash: (b, v) => at(b, (T) => A.splash(T, v)),
        snip: (b) => at(b, (T) => A.snip(T)),
        boom: (b, v) => at(b, (T) => A.boom(T, v)),
        hit: (b, v) => at(b, (T) => A.hit(T, v)),
        drone: (b, beats, v) => at(b, (T) => A.drone(T, beats * BEAT, v)),
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
  let lastSong = 0;
  function frame() {
    if (mode === 'debug') {
      // driven by BJ.debug.to()
    } else if (mode === 'intro') {
      introFrame();
      stage.render();
    } else {
      const T = A.clock.time();
      A.pump(T);
      lastSong = T;
      const bt = Math.max(0, T / BEAT);
      sceneFrame(bt);
      stage.render();
      renderCaptions(bt);
      bar.style.transform = 'scaleX(' + clamp(bt / total).toFixed(4) + ')';
      if (bt >= total && !body.classList.contains('ended')) body.classList.add('ended');
    }
    requestAnimationFrame(frame);
  }
  setMode('intro');
  requestAnimationFrame(frame);

  // Review hook: jump (silently, deterministically) to a given time in seconds.
  let simT = 0;
  BJ.debug = {
    total: total * BEAT,
    stage,
    buildEvents,
    scenes: scenes.map((sc) => ({ name: sc.name, start: sc.start, beats: sc.beats })),
    to(sec) {
      if (mode !== 'debug') { setMode('debug'); body.classList.add('debug'); }
      simT = sec;
      sceneFrame(sec / BEAT);
      stage.render();
      renderCaptions(sec / BEAT);
      return simT;
    },
    // projected screen centre and visibility of every element
    centers() {
      const out = [], p = stage.p, m = stage.m;
      for (let i = 0; i < NEL; i++) {
        const el = stage.els[i];
        if (!stage.vis[i]) { out.push(null); continue; }
        const r = el.getBoundingClientRect();
        out.push([r.left + r.width / 2, r.top + r.height / 2, p.o[i], r.width, r.height]);
      }
      return out;
    },
  };
})();
