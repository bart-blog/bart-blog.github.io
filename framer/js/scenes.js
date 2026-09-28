/* Framer — "From idea to launch." A commercial in 150 shapes.
   Every shape is one div whose size, corner radius, colour, clip polygon and matrix3d are set
   every frame. One blue shape is the agent: first the caret that types the prompt, then the
   cursor that builds the site on the canvas, picks a variation, taps through the platform and
   hits publish. The site goes live around a globe of visitors, the globe folds into the Framer
   mark, and the cursor finally stretches into the button.
   Every scene defines:
     pose(i, b, p)  shape i at local beat b: p.x, p.y (from G.cx/G.cy), p.w, p.h, p.r,
                    p.tip, p.rot, p.rx, p.ry, p.z, p.o, p.c, p.q0x..p.q3y (and p.sym for pills)
     blend          how shapes travel from the previous scene
     type           the headlines, timed in beats
     music(M)       the score, timed in the same beats */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G, E = BJ.ease, hit = BJ.hit, clamp = BJ.clamp, lerp = BJ.lerp, C = BJ.C, mix = BJ.mix;
  const TAU = BJ.TAU, PI = Math.PI;
  const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const CARD = [hx('#0f3a5f'), hx('#33215c'), hx('#0f4034')]; // the "images" in the wireframes

  // ------------------------------------------------------------ drawing helpers
  const hide = (p) => { p.o = 0; p.w = p.h = 0; };
  function circle(p, x, y, d, c) { p.x = x; p.y = y; p.w = p.h = d; p.r = d / 2; p.c = c; }
  function rect(p, x, y, w, h, r, c) { p.x = x; p.y = y; p.w = w; p.h = h; p.r = r; p.c = c; }
  // a pill of length `len` whose long axis points along angle `rot` + 90°
  function pill(p, x, y, len, th, rot, c) { p.x = x; p.y = y; p.w = th; p.h = Math.max(th, len); p.r = th / 2; p.rot = rot; p.c = c; p.sym = PI; }
  function seg(p, x0, y0, x1, y1, th, c) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-6;
    pill(p, (x0 + x1) / 2, (y0 + y1) / 2, L + th, th, Math.atan2(-dx / L, dy / L), c);
  }
  const maxHit = (b, times, decay) => { let e = 0; for (const t of times) e = Math.max(e, hit(b, t, decay)); return e; };
  function perLayout(fn) {
    let v = -1, val;
    return () => { if (v !== G.version) { v = G.version; val = fn(); } return val; };
  }
  function measurer(sel) {
    let c = { v: -1, at: 0, r: null };
    return () => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const now = performance.now();
      if (c.v !== G.version || now - c.at > 250 || !c.r) {
        const r = el.getBoundingClientRect();
        c = { v: G.version, at: now, r: r.width ? { x: r.left + r.width / 2 - G.cx, y: r.top + r.height / 2 - G.cy, w: r.width, h: r.height } : null };
      }
      return c.r;
    };
  }
  const mctx = document.createElement('canvas').getContext('2d');
  function textW(str, px, weight, ls) {
    mctx.font = weight + ' ' + px.toFixed(1) + 'px Inter, sans-serif';
    return mctx.measureText(str).width + (ls || 0) * px * str.length;
  }
  const PENTA = ['D', 'E', 'F#', 'A', 'B'];
  const penta = (k, base = 4) => { k = Math.round(k); return PENTA[((k % 5) + 5) % 5] + (base + Math.floor(k / 5)); };
  const blink = (b) => clamp(0.5 + 3 * Math.cos(TAU * b * 0.6));
  const yAt = (px) => () => (G.cy + px()) / G.H;
  const rnd = (seed, n) => { const r = BJ.rng(seed), a = []; for (let k = 0; k < n; k++) a.push(r()); return a; };

  // ------------------------------------------------------------ the agent's cursor
  // A drop with its sharp corner up-left is a pointer: (x, y) is where its tip is.
  const curD = () => Math.max(16, G.R * 0.1);
  function cursor(p, x, y, press) {
    const d = curD() * (1 - 0.2 * clamp(press));
    circle(p, x + d / 2, y + d / 2, d, C.blue);
    p.tip = 1;
  }
  // glide between waypoints [t, x, y]; repeat a point to hold still
  function path(wp, b) {
    if (b <= wp[0][0]) return [wp[0][1], wp[0][2]];
    for (let k = 1; k < wp.length; k++) {
      if (b < wp[k][0]) {
        const a = wp[k - 1], z = wp[k], e = E.inOutCubic(clamp((b - a[0]) / (z[0] - a[0])));
        return [lerp(a[1], z[1], e), lerp(a[2], z[2], e)];
      }
    }
    const l = wp[wp.length - 1];
    return [l[1], l[2]];
  }

  // =========================================================== 1 · an idea
  // A blue dot beats, becomes a caret in a prompt field and types the idea.
  // Then it turns into the cursor and hits send.
  const PROMPT = 'Build a landing page for my startup', NP = PROMPT.length;
  const F1 = perLayout(() => {
    const FW = Math.min(G.W * 0.86, G.R * 3.3), FH = Math.max(46, G.R * 0.36);
    const pad = FH * 0.42, fit = (FW - pad - FH * 1.15) / (textW(PROMPT, 100, 400) / 100);
    return { FW, FH, bw: Math.max(1.2, G.R * 0.005), pad, fs: Math.min(FH * 0.3, fit), sd: FH * 0.6, sx: FW / 2 - FH * 0.5 };
  });
  const JIT1 = rnd(35, NP);
  const TK = (k) => 1.9 + k * 0.072 + JIT1[k] * 0.035;
  const GROW1 = 0.95, END1 = TK(NP - 1), CUR1 = [END1 + 0.3, END1 + 0.75], SEND1 = 5.0, THINK1 = 5.45;
  const typed = (b) => { let n = 0; while (n < NP && b >= TK(n)) n++; return n; };
  function promptRight() {
    const el = document.querySelector('#type .line.prompt');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width ? r.right - G.cx : null;
  }
  function hero1(p, b) {
    const F = F1(), beat = maxHit(b, [0, 1], 5) + 0.6 * maxHit(b, [0.3, 1.3], 6);
    const m = E.inOutCubic(clamp((b - GROW1) / 0.6));
    let x = -F.FW / 2 + F.pad;
    if (typed(b) > 0) { const r = promptRight(); if (r !== null) x = r + F.FH * 0.05; }
    const d0 = G.R * 0.2 * (1 + 0.18 * beat), cw = F.FH * 0.075, ch = F.FH * 0.46;
    rect(p, lerp(0, x, m), 0, lerp(d0, cw, m), lerp(d0, ch, m), lerp(d0, cw, m) / 2, C.blue);
    const cm = E.inOutCubic(clamp((b - CUR1[0]) / (CUR1[1] - CUR1[0])));
    const typing = b > TK(0) - 0.2 && b < END1 + 0.25;
    if (m >= 1 && !typing && cm <= 0) p.o = blink(b - END1);
    if (cm > 0) {
      const d = curD() * (1 - 0.2 * hit(b, SEND1, 6)), bob = Math.sin((b - SEND1) * 1.8) * F.FH * 0.05 * clamp(b - SEND1 - 0.4);
      const tx = F.sx + F.sd * 0.06, ty = F.sd * 0.06 + bob;
      p.x = lerp(p.x, tx + d / 2, cm); p.y = lerp(p.y, ty + d / 2, cm);
      p.w = lerp(p.w, d, cm); p.h = lerp(p.h, d, cm); p.r = lerp(p.r, d / 2, cm); p.tip = cm;
    }
  }
  const S1 = {
    name: 'idea',
    beats: 8,
    introBeat: 0,
    blend: { dur: 0.01 },
    pose(i, b, p) {
      const F = F1();
      if (i === 0) return hero1(p, b);
      const on = clamp((b - END1) / 0.3) * (1 - clamp((b - SEND1 - 0.2) / 0.4));
      const press = hit(b, SEND1, 6);
      if (i === 1 || i === 2) {
        const g = E.outBack(clamp((b - GROW1) / 0.7));
        if (g <= 0) return hide(p);
        const bw = i === 1 ? F.bw : 0;
        rect(p, 0, 0, (F.FW + 2 * bw) * g, (F.FH + 2 * bw) * g, (F.FH * 0.34 + bw) * g, i === 1 ? mix(C.s4, C.s5, on) : C.s2);
        return;
      }
      if (i >= 3 && i <= 6) {
        const g = E.outBack(clamp((b - GROW1 - 0.35) / 0.5)) * (1 - 0.1 * press);
        if (g <= 0) return hide(p);
        const d = F.sd * g, x = F.sx;
        if (i === 3) return circle(p, x, 0, d, mix(C.s4, C.white, on));
        const t = d * 0.085, c = mix(C.mute, C.black, on), top = -d * 0.2;
        if (i === 4) return seg(p, x, d * 0.2, x, top, t, c);
        return seg(p, x, top, x + (i === 5 ? -1 : 1) * d * 0.17, top + d * 0.17, t, c);
      }
      if (i >= 7 && i <= 9) { // the "thinking" dots
        const k = i - 7, g = E.outBack(clamp((b - THINK1 - 0.1 - k * 0.08) / 0.4)) * (1 - E.inOutCubic(clamp((b - 7.5) / 0.4)));
        if (g <= 0) return hide(p);
        const fs = F.fs * 0.8, x0 = -F.FW / 2 + F.pad * 0.4 + textW('Thinking', fs, 500) + fs * 0.45;
        circle(p, x0 + k * fs * 0.42, F.FH * 1.05 - Math.max(0, Math.sin((b - THINK1) * PI * 1.6 - k * 0.8)) * fs * 0.25, fs * 0.2 * g, C.mute);
        return;
      }
      hide(p);
    },
    type: [
      { at: 0.5, to: 3.9, text: 'Every site starts | with an idea.' },
      { at: 4.3, to: 7.7, text: 'Just describe it.' },
      {
        at: GROW1 + 0.5, to: TK(0), text: 'Ask Framer to design anything…', cls: 'ui', align: 'left', color: '#555', stagger: 0.04,
        x: () => -F1().FW / 2 + F1().pad, y: () => G.cy / G.H, size: () => F1().fs,
      },
      {
        at: TK(0) - 0.01, to: 8.35, fn: (b) => PROMPT.slice(0, typed(b)), cls: 'prompt', align: 'left', still: true,
        x: () => -F1().FW / 2 + F1().pad, y: () => G.cy / G.H, size: () => F1().fs,
      },
      {
        at: THINK1, to: 7.9, text: 'Thinking', cls: 'ui', align: 'left', stagger: 0,
        x: () => -F1().FW / 2 + F1().pad * 0.4, y: () => (G.cy + F1().FH * 1.05) / G.H, size: () => F1().fs * 0.8,
      },
    ],
    music(M) {
      M.pad(0, 'D3 A3 E4 F#4', 4.5, 0.28); M.sub(0, 'D2', 4.5, 0.2);
      [0, 1].forEach((at) => { M.thump(at, 0.45); M.thump(at + 0.3, 0.26); });
      M.whoosh(GROW1 - 0.3, 0.8, 0.04, 400, 1800); M.marimba(GROW1 + 0.15, 'A5', 0.12);
      for (let k = 0; k < NP; k++) {
        const pan = (k / (NP - 1) - 0.5) * 0.7;
        M.key(TK(k), 0.17 + JIT1[k] * 0.08, pan);
        if (k % 4 === 0) M.marimba(TK(k), penta(k / 4 + 5, 4), 0.06, pan);
      }
      M.ep(1.9, 'F#5', 0.1); M.ep(3.1, 'A5', 0.09);
      M.pad(4.5, 'B2 F#3 D4 A4', 3.5, 0.28); M.sub(4.5, 'B1', 3.5, 0.2);
      M.snip(SEND1); M.drop(SEND1 + 0.03, 'A5', 0.24); M.kick(SEND1, 0.3);
      M.ep(THINK1 + 0.2, 'F#5', 0.1); M.ep(THINK1 + 0.9, 'A5', 0.09); M.ep(THINK1 + 1.6, 'E5', 0.09);
      M.whoosh(7.0, 1.2, 0.05, 300, 2600);
    },
  };

  // =========================================================== the wireframes
  // A site in the units of its frame width (the frame is 0.6 high): [x, y, w, h, r (-1 = pill), colour].
  // 0 logo · 1–3 links · 4 nav button · 5–6 headline · 7 subline · 8–9 buttons · 10–12 images · 13–15 captions
  const NAV = [
    [-0.44, -0.255, 0.032, 0.032, 0.009, C.white],
    [0.13, -0.255, 0.05, 0.012, -1, C.g6], [0.21, -0.255, 0.05, 0.012, -1, C.g6], [0.29, -0.255, 0.05, 0.012, -1, C.g6],
    [0.41, -0.255, 0.085, 0.032, -1, C.white],
  ];
  const VB = NAV.concat([
    [0, -0.15, 0.56, 0.052, -1, C.white], [0, -0.085, 0.4, 0.052, -1, C.white], [0, -0.03, 0.32, 0.014, -1, C.g6],
    [-0.06, 0.02, 0.1, 0.036, -1, C.white], [0.06, 0.02, 0.1, 0.036, -1, C.s4],
    [-0.3, 0.165, 0.28, 0.17, 0.014, CARD[0]], [0, 0.165, 0.28, 0.17, 0.014, CARD[1]], [0.3, 0.165, 0.28, 0.17, 0.014, CARD[2]],
    [-0.385, 0.225, 0.07, 0.012, -1, C.mute], [-0.085, 0.225, 0.07, 0.012, -1, C.mute], [0.215, 0.225, 0.07, 0.012, -1, C.mute],
  ]);
  const VA = NAV.concat([
    [-0.21, -0.13, 0.42, 0.05, -1, C.white], [-0.26, -0.07, 0.32, 0.05, -1, C.white], [-0.28, -0.017, 0.28, 0.014, -1, C.g6],
    [-0.37, 0.035, 0.1, 0.036, -1, C.white], [-0.26, 0.035, 0.1, 0.036, -1, C.s4],
    [0.23, -0.03, 0.42, 0.3, 0.014, CARD[0]], [-0.31, 0.2, 0.22, 0.1, 0.012, CARD[1]], [-0.07, 0.2, 0.22, 0.1, 0.012, CARD[2]],
    [0.07, 0.09, 0.07, 0.012, -1, C.mute], [-0.37, 0.23, 0.07, 0.012, -1, C.mute], [-0.13, 0.23, 0.07, 0.012, -1, C.mute],
  ]);
  const VC = NAV.concat([
    [0, 0.055, 0.5, 0.046, -1, C.white], [0, 0.11, 0.36, 0.046, -1, C.white], [0, 0.16, 0.3, 0.014, -1, C.g6],
    [-0.06, 0.215, 0.1, 0.036, -1, C.white], [0.06, 0.215, 0.1, 0.036, -1, C.s4],
    [0, -0.1, 0.88, 0.2, 0.014, CARD[1]], [-0.33, -0.06, 0.18, 0.028, -1, C.white], [-0.36, -0.025, 0.12, 0.012, -1, C.light],
    [0.37, -0.17, 0.08, 0.024, -1, C.s4], [0, 0, 0, 0, 0, C.s4], [0, 0, 0, 0, 0, C.s4],
  ]);
  // which shapes draw which frame: border, fill and the 16 elements
  const FR = { A: { o: 40, el: 42, v: VA }, B: { o: 1, el: 10, v: VB }, C: { o: 60, el: 62, v: VC } };
  const F2 = perLayout(() => ({ fw: Math.min(G.W * 0.82, G.R * 3.3, (G.H * 0.5) / 0.6), y0: G.R * 0.02, bw: Math.max(1.2, G.R * 0.005) }));
  function frameBox(p, fill, L) {
    const bw = fill ? 0 : F2().bw, w = L.w, h = L.w * 0.6, r = L.w * 0.022;
    rect(p, L.x, L.y, w + 2 * bw, h + 2 * bw, r + bw, fill ? C.s2 : C.s4);
  }
  const HEADC = -0.1; // the headline block's centre, about which it scales
  function drawEl(p, el, e, L, g, flash, hs) {
    if (!el || el[2] === 0 || g <= 0) return hide(p);
    let [x, y, w, h, r, c] = el;
    if (hs && e >= 5 && e <= 7) { x *= hs; y = HEADC + (y - HEADC) * hs; w *= hs; h *= hs; }
    const W = w * L.w * g, H = h * L.w * g;
    rect(p, L.x + x * L.w, L.y + y * L.w, W, H, r < 0 ? Math.min(W, H) / 2 : r * L.w * g, mix(c, C.blue, clamp(flash)));
  }
  // returns false if shape i is not part of frame fr
  function framePart(p, i, fr, L, grow, hs, fade) {
    if (i === fr.o || i === fr.o + 1) {
      const g = grow(-1)[0];
      if (g <= 0) { hide(p); return true; }
      frameBox(p, i === fr.o + 1, { x: L.x, y: L.y, w: L.w * g });
    } else {
      const e = i - fr.el;
      if (e < 0 || e >= 16) return false;
      const [g, fl] = grow(e);
      drawEl(p, fr.v[e], e, L, g, fl, hs);
    }
    if (fade) p.o *= 1 - fade;
    return true;
  }

  // =========================================================== 2 · on the canvas
  // The prompt field grows into a desktop frame; the cursor places every element of the site,
  // then selects the headline and drags it bigger.
  const L2 = () => ({ x: 0, y: F2().y0, w: F2().fw });
  const T2 = [1.2, 1.32, 1.44, 1.56, 1.72, 2.05, 2.3, 2.55, 2.8, 2.95, 3.3, 3.55, 3.8, 4.05, 4.15, 4.25];
  const SEL2 = 5.4, DRAG2 = [7.1, 8.1], HS = 1.16;
  const hs2 = (b) => 1 + (HS - 1) * E.inOutCubic(clamp((b - DRAG2[0]) / (DRAG2[1] - DRAG2[0])));
  const grow2 = (b) => (e) => (e < 0 ? [1, 0] : [E.outBack(clamp((b - T2[e]) / 0.45)), 1 - E.outCubic(clamp((b - T2[e]) / 0.7))]);
  function headBox(L, hs) { // the headline block, in px, around which the selection sits
    const pad = 0.016, x = 0.28 * hs + pad, y0 = HEADC + (-0.176 - HEADC) * hs - pad, y1 = HEADC + (-0.023 - HEADC) * hs + pad;
    return { x0: L.x - x * L.w, x1: L.x + x * L.w, y0: L.y + y0 * L.w, y1: L.y + y1 * L.w };
  }
  const SEL0 = 26; // 26–29 edges, 30–33 handles, 34–37 handle fills
  function selection(p, i, box, e) {
    const k = i - SEL0;
    if (k < 0 || k >= 12) return false;
    if (e <= 0) { hide(p); return true; }
    const th = Math.max(1.5, G.R * 0.006), hsz = Math.max(7, G.R * 0.028), s = lerp(0.94, 1, e);
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2, hw = ((box.x1 - box.x0) / 2) * s, hh = ((box.y1 - box.y0) / 2) * s;
    if (k < 4) {
      if (k < 2) rect(p, cx, k ? cy + hh : cy - hh, 2 * hw, th, 0, C.blue);
      else rect(p, k === 2 ? cx - hw : cx + hw, cy, th, 2 * hh, 0, C.blue);
    } else {
      const c = (k - 4) % 4, x = c === 0 || c === 3 ? cx - hw : cx + hw, y = c < 2 ? cy - hh : cy + hh, inner = k >= 8;
      const z = inner ? hsz - 2 * th : hsz;
      rect(p, x, y, z, z, z * 0.18, inner ? C.white : C.blue);
    }
    p.o = e;
    return true;
  }
  function hero2(p, b) {
    const L = L2(), v = VB;
    const at = (e) => [L.x + v[e][0] * L.w, L.y + v[e][1] * L.w];
    const wp = [];
    T2.forEach((t, e) => { const [x, y] = at(e); wp.push([t - (e ? 0.1 : 0.3), x, y]); });
    const last = wp[wp.length - 1], hb = headBox(L, 1), hc = [(hb.x0 + hb.x1) / 2 + L.w * 0.08, (hb.y0 + hb.y1) / 2];
    wp.push([5.0, last[1], last[2]], [SEL2 - 0.05, hc[0], hc[1]], [6.4, hc[0], hc[1]], [DRAG2[0] - 0.1, hb.x1, hb.y1]);
    let [x, y] = path(wp, b);
    if (b >= DRAG2[0] - 0.1) {
      const box = headBox(L, hs2(b));
      x = box.x1; y = box.y1;
      const aw = E.inOutCubic(clamp((b - DRAG2[1] - 0.4) / 0.8));
      x += aw * G.R * 0.28; y += aw * G.R * 0.2;
    }
    const drag = b > DRAG2[0] && b < DRAG2[1] + 0.1 ? 0.55 : 0;
    cursor(p, x, y, Math.max(hit(b, SEL2, 6), drag + hit(b, DRAG2[0], 6) * 0.4));
  }
  const S2 = {
    name: 'canvas',
    beats: 10,
    blend: { dur: (i) => (i === 1 || i === 2 ? 1.1 : i === 0 ? 0.7 : 0.6), ease: E.glide },
    pose(i, b, p) {
      if (i === 0) return hero2(p, b);
      const L = L2(), hs = hs2(b);
      if (framePart(p, i, FR.B, L, grow2(b), hs)) return;
      if (selection(p, i, headBox(L, hs), E.outCubic(clamp((b - SEL2) / 0.35)))) return;
      hide(p);
    },
    type: [
      { at: 1.0, to: 5.2, text: 'Framer designs it, | right on the canvas.' },
      { at: 5.7, to: 9.6, text: 'Every change | stays editable.' },
      {
        at: 0.9, to: 9.7, text: 'Desktop', cls: 'ui', align: 'left', color: '#777', stagger: 0,
        x: () => -F2().fw / 2, y: () => (G.cy + F2().y0 - F2().fw * 0.3 - Math.max(11, F2().fw * 0.018) * 1.1) / G.H, size: () => Math.max(11, F2().fw * 0.018),
      },
      {
        at: 1.0, to: 9.7, text: '1200', cls: 'ui', align: 'right', color: '#555', stagger: 0,
        x: () => F2().fw / 2, y: () => (G.cy + F2().y0 - F2().fw * 0.3 - Math.max(11, F2().fw * 0.018) * 1.1) / G.H, size: () => Math.max(11, F2().fw * 0.018),
      },
    ],
    music(M) {
      M.pad(0, 'G2 D3 B3 F#4', 5, 0.28); M.sub(0, 'G1', 5, 0.2);
      M.whoosh(0, 1.1, 0.05, 500, 2200);
      T2.forEach((t, e) => {
        const pan = VB[e][0] * 1.4;
        M.marimba(t + 0.02, penta([0, 1, 2, 3, 4, 5, 6, 7, 6, 7, 8, 9, 10, 9, 10, 11][e] + 3, 4), 0.085, pan);
        M.tick(t, 0.025, pan);
      });
      M.ep(1.1, 'B4', 0.12); M.ep(2.05, 'D5', 0.12); M.ep(3.3, 'F#5', 0.1);
      M.pad(5, 'E3 B3 D4 G4', 5, 0.28); M.sub(5, 'E2', 5, 0.2);
      M.snip(SEL2); M.bell(SEL2 + 0.05, 'A5', 0.14);
      M.tick(DRAG2[0], 0.05);
      M.whoosh(DRAG2[0], 1.0, 0.04, 400, 1600);
      ['D5', 'E5', 'F#5', 'A5'].forEach((n, k) => M.marimba(DRAG2[0] + k * 0.25, n, 0.08, 0.3));
      M.drop(DRAG2[1], 'D6', 0.14);
      for (let b = 6; b < 10; b += 2) M.kick(b, 0.16);
      M.ep(8.6, 'B5', 0.1);
    },
  };

  // =========================================================== 3 · variations
  // The frame steps back; two variations are built beside it. The cursor hovers each and
  // picks one, which is pulled back to the centre at full size.
  const L3 = perLayout(() => {
    const y0 = F2().y0;
    if (G.portrait) {
      const w = Math.min(G.W * 0.62, (G.H * 0.54) / (3 * 0.6 + 0.16)), gp = w * 0.08;
      return { w, pos: [[0, y0 - w * 0.6 - gp], [0, y0], [0, y0 + w * 0.6 + gp]] };
    }
    const w = Math.min((G.W * 0.92) / 3.16, G.R * 1.2), gp = w * 0.08;
    return { w, pos: [[-(w + gp), y0], [0, y0], [w + gp, y0]] };
  });
  const IN3 = [1.0, 1.35], HOV3 = [[0, 1], [2.6, 0], [3.4, 2]], PICK3 = 4.3, MOVE3 = [5.0, 6.4];
  const slot3 = { A: 0, B: 1, C: 2 };
  function frame3(name, b) {
    const S = L3(), [x, y] = S.pos[slot3[name]];
    if (name !== 'C') return { x, y, w: S.w };
    const m = E.glide(clamp((b - MOVE3[0]) / (MOVE3[1] - MOVE3[0])));
    return { x: lerp(x, 0, m), y: lerp(y, F2().y0, m), w: lerp(S.w, F2().fw, m) };
  }
  function box3(b) { // the selection hops from frame to frame
    let k = 0;
    while (k + 1 < HOV3.length && b >= HOV3[k + 1][0]) k++;
    const names = ['A', 'B', 'C'], box = (n) => {
      const L = frame3(n, b), pd = L.w * 0.035;
      return { x0: L.x - L.w / 2 - pd, x1: L.x + L.w / 2 + pd, y0: L.y - L.w * 0.3 - pd, y1: L.y + L.w * 0.3 + pd };
    };
    const to = box(names[HOV3[k][1]]);
    if (!k) return to;
    const from = box(names[HOV3[k - 1][1]]), e = E.glide(clamp((b - HOV3[k][0]) / 0.45));
    return { x0: lerp(from.x0, to.x0, e), x1: lerp(from.x1, to.x1, e), y0: lerp(from.y0, to.y0, e), y1: lerp(from.y1, to.y1, e) };
  }
  const S3 = {
    name: 'variations',
    beats: 8,
    blend: {
      start: (i) => (i >= 10 && i < 26 ? (i - 10) * 0.012 : 0),
      dur: (i) => (i >= 40 && i < 78 ? 0.01 : i === 0 ? 0.6 : 1.0), ease: E.glide,
    },
    pose(i, b, p) {
      if (i === 0) {
        const bx = box3(b), L = frame3('C', b);
        let x = bx.x1 - (bx.x1 - bx.x0) * 0.2, y = bx.y1 - (bx.y1 - bx.y0) * 0.25;
        if (b > PICK3) { const e = E.inOutCubic(clamp((b - PICK3) / 0.5)); x = lerp(x, L.x + L.w * 0.3, e); y = lerp(y, L.y + L.w * 0.2, e); }
        const aw = E.inOutCubic(clamp((b - MOVE3[1]) / 0.8));
        return cursor(p, x + aw * G.R * 0.3, y + aw * G.R * 0.25, Math.max(hit(b, PICK3, 6), b > PICK3 && b < MOVE3[1] ? 0.5 : 0));
      }
      const fo = E.inOutCubic(clamp((b - MOVE3[0]) / 0.8));
      const shrink = (L) => ({ x: L.x, y: L.y, w: L.w * lerp(1, 0.86, fo) });
      if (framePart(p, i, FR.B, shrink(frame3('B', b)), () => [1, 0], HS, fo)) return;
      for (const n of ['A', 'C']) {
        const t0 = IN3[n === 'A' ? 0 : 1];
        const grow = (e) => {
          if (e < 0) return [E.outBack(clamp((b - t0) / 0.6)), 0];
          const t = t0 + 0.4 + e * 0.05;
          return [E.outBack(clamp((b - t) / 0.4)), 1 - E.outCubic(clamp((b - t) / 0.6))];
        };
        const L = n === 'A' ? shrink(frame3('A', b)) : frame3('C', b);
        if (framePart(p, i, FR[n], L, grow, 0, n === 'A' ? fo : 0)) return;
      }
      const se = E.outCubic(clamp(b / 0.3)) * (1 - E.inOutCubic(clamp((b - MOVE3[0] - 0.8) / 0.5)));
      if (selection(p, i, box3(b), se)) return;
      hide(p);
    },
    type: [
      { at: 0.8, to: 4.3, text: 'Explore every direction.' },
      { at: 4.7, to: 7.7, text: 'Keep the one you love.' },
    ],
    music(M) {
      M.pad(0, 'D3 A3 E4 F#4', 4.3, 0.28); M.sub(0, 'D2', 4.3, 0.2);
      M.whoosh(0, 1.0, 0.05, 2000, 500);
      IN3.forEach((t0, n) => {
        M.drop(t0 + 0.05, n ? 'B5' : 'A5', 0.16, n ? 0.5 : -0.5);
        for (let e = 0; e < 16; e += 2) M.marimba(t0 + 0.4 + e * 0.05, penta(e / 2 + 4 + n * 2, 4), 0.06, n ? 0.5 : -0.5);
      });
      M.tick(HOV3[1][0] + 0.4, 0.05, -0.5); M.marimba(HOV3[1][0] + 0.4, 'F#5', 0.08, -0.5);
      M.tick(HOV3[2][0] + 0.4, 0.05, 0.5); M.marimba(HOV3[2][0] + 0.4, 'A5', 0.08, 0.5);
      M.snip(PICK3); M.kick(PICK3, 0.32); M.bell(PICK3 + 0.03, 'D6', 0.16); M.ep(PICK3 + 0.03, 'A5', 0.12);
      M.pad(4.3, 'A2 E3 C#4 F#4', 3.7, 0.28); M.sub(4.3, 'A1', 3.7, 0.2);
      M.whoosh(MOVE3[0], 1.4, 0.05, 400, 2400);
      M.ep(6.4, 'E5', 0.12); M.ep(6.9, 'C#6', 0.1);
      M.whoosh(7.0, 1.0, 0.05, 300, 2800);
    },
  };

  // =========================================================== 4 · a full platform
  // The chosen site breaks up into a bento of the platform: performance, CMS, hosting,
  // analytics, SEO and localization. The cursor taps each one to life.
  const BT0 = 62;
  const BL = perLayout(() => {
    const cols = G.portrait ? 2 : 3, rows = G.portrait ? 3 : 2, BW = Math.min(G.W * 0.88, G.R * 3.6), gap = BW * 0.018;
    const tw = (BW - gap * (cols - 1)) / cols;
    const th = Math.min(tw * (G.portrait ? 0.72 : 0.64), (G.H * 0.5 - gap * (rows - 1)) / rows);
    const tiles = [];
    for (let k = 0; k < 6; k++) {
      const c = k % cols, r = Math.floor(k / cols);
      tiles.push({ x: (c - (cols - 1) / 2) * (tw + gap), y: (r - (rows - 1) / 2) * (th + gap) + F2().y0 });
    }
    const pad = Math.min(tw, th * 1.6) * 0.07;
    return { tw, th, tiles, pad, fs: Math.max(10, Math.min(tw, th * 1.6) * 0.052) };
  });
  const TAP4 = [2.0, 2.55, 3.1, 3.65, 4.2, 4.75];
  const LABELS = ['Performance', 'CMS', 'Hosting', 'Analytics', 'SEO', 'Localization'];
  const FILLP = (b) => E.inOutSine(clamp((b - TAP4[0] - 0.3) / 2.2));
  const BARS = [0.3, 0.45, 0.38, 0.55, 0.5, 0.68, 0.62, 0.8, 0.74, 0.95];
  const LOC = [['NL', 0.35], ['IT', 1], ['CN', 0.9]];
  const tileAt = (k) => { const B = BL(), t = B.tiles[k]; return { x: t.x, y: t.y, w: B.tw, h: B.th, pad: B.pad }; };
  const labelX = (k) => () => tileAt(k).x - BL().tw / 2 + BL().pad;
  const labelY = (k) => () => (G.cy + tileAt(k).y - BL().th / 2 + BL().pad + BL().fs * 0.55) / G.H;
  function viz(p, i, b) {
    const B = BL(), pad = B.pad;
    if (i >= 68 && i < 88) { // performance: a ring of 20 ticks that fills green
      const T = tileAt(0), k = i - 68, a = -PI / 2 + (k / 20) * TAU, R = T.h * 0.27, cy = T.y + T.h * 0.1;
      const g = E.outBack(clamp((b - TAP4[0] - 0.1 - k * 0.015) / 0.4));
      if (g <= 0) return hide(p);
      const f = clamp(FILLP(b) * 0.95 * 20 - k);
      pill(p, T.x + Math.cos(a) * R, cy + Math.sin(a) * R, T.h * 0.08 * g, Math.max(2, T.h * 0.022), a - PI / 2, mix(C.s5, C.green, f));
      p.o = clamp(g * 1.5);
      return;
    }
    if (i >= 88 && i < 104) { // CMS: four entries, published one by one
      const T = tileAt(1), k = i - 88, r = k >> 2, q = k & 3;
      const top = T.y - T.h / 2 + pad * 2.5, rowH = (T.h / 2 - pad * 0.8 - (top - T.y)) / 4, yy = top + (r + 0.5) * rowH;
      const s = E.outCubic(clamp((b - TAP4[1] - 0.1 - r * 0.15) / 0.5));
      if (s <= 0) return hide(p);
      const x0 = T.x - T.w / 2 + pad + (1 - s) * T.w * 0.12, ts = rowH * 0.62, live = clamp((b - TAP4[1] - 0.8 - r * 0.2) / 0.2);
      const sw = T.w * 0.13, sh = rowH * 0.36, xr = T.x + T.w / 2 - pad - sw / 2 + (1 - s) * T.w * 0.12;
      if (q === 0) rect(p, x0 + ts / 2, yy, ts, ts, ts * 0.22, CARD[r % 3]);
      else if (q === 1) { const w = T.w * [0.36, 0.28, 0.42, 0.32][r], h = Math.max(3, rowH * 0.16); rect(p, x0 + ts + pad * 0.6 + w / 2, yy, w, h, h / 2, C.light); }
      else if (q === 2) rect(p, xr, yy, sw, sh, sh / 2, mix(mix(C.s4, C.green, live), C.s2, 0.7 * live));
      else circle(p, xr - sw / 2 + sh * 0.55, yy, sh * 0.38 * (1 + 0.4 * hit(b, TAP4[1] + 0.8 + r * 0.2, 5)), mix(C.g6, C.green, live));
      p.o = s;
      return;
    }
    if (i >= 104 && i < 124) { // hosting: twenty days of uptime
      const T = tileAt(2), k = i - 104, iw = T.w - 2 * pad, bw = iw / 20, bh = T.h * 0.16, base = T.y + T.h / 2 - pad;
      const g = E.outCubic(clamp((b - TAP4[2] - 0.1 - k * 0.03) / 0.35));
      if (g <= 0) return hide(p);
      const h = bh * g * (1 + 0.1 * hit(b, Math.floor(b), 4) * clamp(b - 6));
      rect(p, T.x - iw / 2 + (k + 0.5) * bw, base - h / 2, bw * 0.55, h, bw * 0.16, C.green);
      return;
    }
    if (i >= 124 && i < 134) { // analytics: the bars climb
      const T = tileAt(3), k = i - 124, iw = T.w - 2 * pad, bw = iw / 10, base = T.y + T.h / 2 - pad;
      const g = E.outCubic(clamp((b - TAP4[3] - 0.1 - k * 0.05) / 0.5));
      if (g <= 0) return hide(p);
      const h = Math.max(2, BARS[k] * T.h * 0.42 * g * (1 + 0.05 * hit(b, Math.floor(b), 4) * clamp(b - 6)));
      rect(p, T.x - iw / 2 + (k + 0.5) * bw, base - h / 2, bw * 0.62, h, bw * 0.12, k === 9 ? C.blue : mix(C.s5, C.g6, k / 9));
      return;
    }
    if (i >= 134 && i < 142) { // SEO: a search bar and two results
      const T = tileAt(4), k = i - 134, iw = T.w - 2 * pad, x0 = T.x - iw / 2;
      const sh = T.h * 0.15, sy = T.y - T.h / 2 + pad * 2.5 + sh / 2;
      const g = E.outCubic(clamp((b - TAP4[4] - 0.1 - k * 0.06) / 0.4));
      if (g <= 0) return hide(p);
      if (k === 0) rect(p, T.x, sy, iw * lerp(0.6, 1, g), sh, sh / 2, C.s4);
      else if (k === 1) circle(p, x0 + sh * 0.55, sy, sh * 0.36, C.g6);
      else {
        const r = Math.floor((k - 2) / 3), q = (k - 2) % 3, ry = sy + sh / 2 + pad * 0.9 + r * T.h * 0.22;
        const w = iw * [[0.58, 0.3, 0.86], [0.5, 0.26, 0.78]][r][q], h = T.h * [0.05, 0.034, 0.034][q];
        rect(p, x0 + (w * g) / 2, ry + q * T.h * 0.062, w * g, h, h / 2, [C.light, C.green, C.s5][q]);
      }
      return;
    }
    if (i >= 142 && i < 148) { // localization: three languages
      const T = tileAt(5), k = i - 142, r = k >> 1, fill = k & 1, iw = T.w - 2 * pad;
      const top = T.y - T.h / 2 + pad * 2.6, rowH = (T.y + T.h / 2 - pad * 0.6 - top) / 3, yy = top + (r + 0.5) * rowH;
      const cw = T.w * 0.14, tw = iw - cw, h = Math.max(3, T.h * 0.05);
      const g = E.outCubic(clamp((b - TAP4[5] - 0.1 - r * 0.1) / 0.4));
      if (g <= 0) return hide(p);
      const x0 = T.x - iw / 2 + cw;
      if (!fill) return rect(p, x0 + (tw * g) / 2, yy, tw * g, h, h / 2, C.s4);
      const f = LOC[r][1] * E.inOutCubic(clamp((b - TAP4[5] - 0.3 - r * 0.15) / 1.2));
      if (f <= 0) return hide(p);
      rect(p, x0 + (tw * f) / 2, yy, Math.max(h, tw * f), h, h / 2, LOC[r][1] === 1 ? C.green : C.white);
      return;
    }
    hide(p);
  }
  const S4 = {
    name: 'platform',
    beats: 12,
    blend: {
      start: (i) => (i >= BT0 && i < BT0 + 6 ? (i - BT0) * 0.06 : 0),
      dur: (i) => (i >= BT0 && i < BT0 + 6 ? 1.0 : i === 0 ? 0.8 : 0.7), ease: E.glide, arc: 0.1,
    },
    pose(i, b, p) {
      const B = BL();
      if (i === 0) {
        const wp = [[0.9, B.tiles[0].x + B.tw * 0.3, B.tiles[0].y + B.th * 0.25]];
        TAP4.forEach((t, k) => { const T = B.tiles[k], x = T.x + B.tw * 0.3, y = T.y + B.th * 0.25; wp.push([t - 0.42, wp[wp.length - 1][1], wp[wp.length - 1][2]], [t - 0.04, x, y]); });
        const [x, y] = path(wp, b);
        return cursor(p, x, y, maxHit(b, TAP4, 6));
      }
      const k = i - BT0;
      if (k >= 0 && k < 6) {
        const T = B.tiles[k], fl = hit(b, TAP4[k], 4), s = 1 + 0.025 * fl;
        return rect(p, T.x, T.y, B.tw * s, B.th * s, Math.min(B.tw, B.th) * 0.08, mix(C.s2, C.s4, fl * 0.8));
      }
      viz(p, i, b);
    },
    type: [
      { at: 0.6, to: 5.4, text: 'Not just vibes. | A full platform.' },
      { at: 5.9, to: 11.6, text: 'Hosting, CMS, SEO | and analytics, built in.' },
      ...LABELS.map((t, k) => ({ at: 0.9 + k * 0.1, to: 11.7, text: t, cls: 'ui', align: 'left', stagger: 0, x: labelX(k), y: labelY(k), size: () => BL().fs })),
      {
        at: TAP4[0] + 0.2, to: 11.7, fn: (b) => lerp(3.8, 1.1, FILLP(b)).toFixed(1) + 's', cls: 'stat', still: false,
        x: () => tileAt(0).x, y: () => (G.cy + tileAt(0).y + BL().th * 0.1) / G.H, size: () => BL().th * 0.13,
      },
      {
        at: TAP4[2] + 0.1, to: 11.7, text: '99.99%', cls: 'stat', align: 'left', stagger: 0,
        x: labelX(2), y: () => (G.cy + tileAt(2).y - BL().th * 0.04) / G.H, size: () => BL().th * 0.2,
      },
      {
        at: TAP4[3] + 0.1, to: 11.7, fn: (b) => Math.round(135535 * E.outCubic(clamp((b - TAP4[3] - 0.1) / 2.2))).toLocaleString('en-US'), cls: 'stat', align: 'left',
        x: labelX(3), y: () => (G.cy + tileAt(3).y - BL().th / 2 + BL().pad * 2.6) / G.H, size: () => BL().th * 0.13,
      },
      ...LOC.map(([t], r) => ({
        at: TAP4[5] + 0.15 + r * 0.1, to: 11.7, text: t, cls: 'ui', align: 'left', stagger: 0, x: labelX(5), size: () => BL().fs * 0.9,
        y: () => { const T = tileAt(5), pad = BL().pad, top = T.y - T.h / 2 + pad * 2.6, rowH = (T.y + T.h / 2 - pad * 0.6 - top) / 3; return (G.cy + top + (r + 0.5) * rowH) / G.H; },
      })),
    ],
    music(M) {
      M.pad(0, 'G2 D3 B3 F#4', 6, 0.28); M.sub(0, 'G1', 6, 0.22);
      M.whoosh(0, 1.1, 0.06, 2400, 400);
      for (let k = 0; k < 6; k++) M.marimba(0.3 + k * 0.06 + 0.5, penta(k + 5, 4), 0.07, (k % 3 - 1) * 0.6);
      TAP4.forEach((t, k) => { M.tick(t, 0.05, (k % 3 - 1) * 0.6); M.marimba(t + 0.05, penta(k * 2 + 5, 4), 0.14, (k % 3 - 1) * 0.6); });
      for (let k = 0; k < 20; k += 4) M.marimba(TAP4[0] + 0.3 + (2.2 * k) / 20, penta(k / 4 + 8, 4), 0.05, -0.6);
      for (let r = 0; r < 4; r++) M.drop(TAP4[1] + 0.8 + r * 0.2, penta(r + 8, 4), 0.07, 0);
      for (let b = 2; b < 12; b += 1) M.kick(b, b % 2 ? 0.14 : 0.22);
      for (let b = 2.5; b < 12; b += 1) M.tick(b, 0.03, 0.3);
      M.pad(6, 'E3 B3 D4 G4', 6, 0.28); M.sub(6, 'E2', 6, 0.22);
      M.ep(6, 'B5', 0.12); M.ep(6.5, 'D6', 0.1); M.ep(8, 'A5', 0.1); M.ep(9.5, 'F#5', 0.1);
      M.whoosh(11, 1.1, 0.06, 300, 2600);
    },
  };

  // =========================================================== 5 · publish
  // Everything gathers under one button. One click, and the site goes out to a globe of visitors.
  const G0 = 68, NG = 80, UBTN = 149, UDOT = 148;
  const URL = 'yoursite.framer.website';
  const BTN5 = perLayout(() => {
    const fs = Math.max(15, G.F * 0.34), fu = fs * 0.9;
    return { fs, w: fs * 5.4, h: fs * 2.4, fu, uw: textW(URL, fu, 500) + fu * 3.4 };
  });
  const IN5 = 0.6, CLICK5 = 2.0, BURST5 = 2.1, URL5 = [2.3, 3.0];
  const RG = () => Math.min(G.R * 0.95, G.W * 0.4);
  const VIS5 = rnd(5, NG).map((r) => 3.0 + r * 4.8);
  function globe(p, k, b) {
    const y = 1 - (2 * (k + 0.5)) / NG, rr = Math.sqrt(1 - y * y), th = k * BJ.GA + b * 0.28, t = 0.35;
    const x = Math.cos(th) * rr, z = Math.sin(th) * rr, y2 = y * Math.cos(t) - z * Math.sin(t), z2 = y * Math.sin(t) + z * Math.cos(t);
    const R = RG(), fl = hit(b, VIS5[k], 1.6);
    circle(p, x * R, y2 * R, R * 0.05 * (1 + 0.5 * fl), mix(mix(C.s5, C.white, (z2 + 1) / 2), C.blue, fl));
    p.z = z2 * R * 0.6;
  }
  const S5 = {
    name: 'publish',
    beats: 8,
    blend: { start: (i) => (i >= BT0 && i < 148 ? ((i * 7) % 17) * 0.02 : 0), dur: (i) => (i === 0 ? 0.9 : 0.8), ease: E.inOutCubic, arc: 0.18 },
    pose(i, b, p) {
      const B = BTN5();
      if (i === 0) {
        const tip = [B.w * 0.16, B.h * 0.12];
        const [x, y] = path([[0.6, tip[0] + G.R * 0.5, tip[1] + G.R * 0.4], [1.8, tip[0], tip[1]], [2.5, tip[0], tip[1]], [3.5, RG() * 0.72, RG() * 0.55]], b);
        return cursor(p, x, y, hit(b, CLICK5, 6));
      }
      if (i === UBTN) {
        const g = E.outBack(clamp((b - IN5) / 0.5)), press = hit(b, CLICK5, 6), m = E.inOutCubic(clamp((b - URL5[0]) / (URL5[1] - URL5[0])));
        if (g <= 0) return hide(p);
        const s = g * (1 - 0.07 * press);
        const c = mix(mix(C.white, C.blue, clamp((b - CLICK5) / 0.1)), C.s3, m);
        return rect(p, 0, 0, lerp(B.w, B.uw, m) * s, B.h * s, (B.h * s) / 2, c);
      }
      if (i === UDOT) {
        const g = E.outBack(clamp((b - URL5[1] + 0.2) / 0.4));
        if (g <= 0) return hide(p);
        return circle(p, -B.uw / 2 + B.fu * 1.35, 0, B.fu * 0.5 * g * (1 + 0.3 * hit(b, Math.floor(b), 3)), C.green);
      }
      if (i >= BT0 && i < G0 + NG) { // gathered under the button, then out into the globe
        const k = i - G0;
        if (k < 0) { if (b < 1.5) return rect(p, 0, 0, G.R * 0.05, G.R * 0.05, G.R * 0.01, C.s4); return hide(p); }
        const e = E.outBack(clamp((b - BURST5 - (k % 10) * 0.025) / 0.9));
        if (e <= 0) return circle(p, 0, 0, Math.max(2, G.R * 0.02), C.white);
        globe(p, k, b);
        p.x *= e; p.y *= e; p.z *= e;
        return;
      }
      hide(p);
    },
    type: [
      { at: 0.3, to: 2.5, text: 'Then hit publish.' },
      { at: 3.1, to: 7.7, text: 'Live worldwide, | in seconds.' },
      { at: IN5 + 0.15, to: CLICK5 + 0.3, text: 'Publish', cls: 'btn', color: '#000', stagger: 0, y: () => G.cy / G.H, size: () => BTN5().fs },
      { at: URL5[1] - 0.15, to: 8.3, text: URL, cls: 'ui', color: '#fff', stagger: 0, x: () => BTN5().fu * 0.6, y: () => G.cy / G.H, size: () => BTN5().fu },
    ],
    music(M) {
      M.pad(0, 'A2 E3 G3 D4', 2.1, 0.28); M.sub(0, 'A1', 2.1, 0.22);
      M.whoosh(0.1, 1.9, 0.07, 250, 3600);
      M.drop(IN5 + 0.05, 'A5', 0.18);
      for (let k = 0; k < 8; k++) M.tick(1.0 + k * 0.12, 0.02 + k * 0.006, 0);
      M.snip(CLICK5); M.kick(CLICK5, 0.5); M.boom(CLICK5, 0.45); M.splash(CLICK5 + 0.05, 0.3);
      M.bell(CLICK5 + 0.05, 'D6', 0.2); M.bell(CLICK5 + 0.05, 'A5', 0.16, -0.3); M.ep(CLICK5 + 0.05, 'F#5', 0.16, 0.3);
      M.pad(CLICK5, 'D3 A3 F#4 C#5', 8 - CLICK5, 0.3); M.sub(CLICK5, 'D2', 8 - CLICK5, 0.24);
      for (let d = 0; d < 10; d++) M.marimba(BURST5 + d * 0.025 + 0.35, penta(d + 5, 4), 0.07, (d / 9 - 0.5) * 0.9);
      for (let b = 3; b < 8; b += 1) M.kick(b, 0.2);
      for (let b = 3.5; b < 8; b += 1) M.tick(b, 0.03, -0.3);
      VIS5.map((t, k) => [t, k]).sort((a, z) => a[0] - z[0]).forEach(([t, k], n) => { if (n % 5 === 0) M.marimba(t, penta((n / 5) % 8 + 7, 4), 0.06, ((k * 37) % 17) / 8 - 1); });
      M.ep(4.5, 'A5', 0.1); M.ep(6, 'C#6', 0.09);
      M.whoosh(7.0, 1.1, 0.06, 2800, 300);
    },
  };

  // =========================================================== 6 · finale
  // The globe folds into the Framer mark: three pieces cut from tiles with clip polygons.
  // The cursor drags it into the lockup, then stretches into the button.
  const PIECES = [ // box centre and size in mark units (14 × 21), plus the clip polygon
    { cx: 7, cy: 3.5, w: 14, h: 7, q: [0, 0, 1, 0, 1, 1, 0.5, 1] },
    { cx: 7, cy: 10.5, w: 14, h: 7, q: [0, 0, 0.5, 0, 1, 1, 0, 1] },
    { cx: 3.5, cy: 17.375, w: 7, h: 7.25, q: [0, 0, 1, 0, 1, 1, 0, 0.25 / 7.25] }, // tucks under the middle: no seam
  ];
  const inMark = (x, y) => (y <= 7 ? x >= y && x <= 14 : y <= 14 ? x >= 0 && x <= y : x <= 7 && x >= y - 14);
  const MARKPTS = (function () {
    const pts = [];
    for (let y = 0.7; y < 21; y += 1.42) for (let x = 0.7; x < 14; x += 1.42) if (inMark(x, y)) pts.push([x - 7, y - 10.5]);
    return pts;
  })();
  const LOGO = perLayout(() => {
    const mh = Math.min(G.R * 1.05, G.H * 0.36), fsW = Math.min(G.F * 1.45, G.W * 0.13), lh = fsW * 0.98;
    const tw = textW('Framer', fsW, 600, -0.05), mw2 = (14 * lh) / 21, gap = fsW * 0.3, total = mw2 + gap + tw;
    return { u: mh / 21, u2: lh / 21, mx2: -total / 2 + mw2 / 2, tx: -total / 2 + mw2 + gap, ly: -G.R * 0.16, fsW };
  });
  const FORM6 = 1.35, LOCK6 = [2.6, 3.6], TAG6 = 4.2, BTN6 = [6.0, 7.0], SHOW6 = 7.0;
  const CTA_Y = () => (G.portrait ? 0.68 : 0.7);
  const btnBox = measurer('#type .line.link a');
  function markAt(b) {
    const L = LOGO(), m = E.inOutCubic(clamp((b - LOCK6[0]) / (LOCK6[1] - LOCK6[0])));
    return { x: lerp(0, L.mx2, m), y: lerp(0, L.ly, m), u: lerp(L.u, L.u2, m) };
  }
  function hero6(p, b) {
    const M = markAt(b), grab = [M.x - 2 * M.u, M.y + 2.5 * M.u];
    const est = { x: 0, y: G.H * CTA_Y() - G.cy - G.F * 0.35, w: Math.max(220, G.F * 3.4), h: 50 };
    const bt = btnBox() || est, d = curD();
    const [x, y] = path([
      [0.6, RG() * 0.62, RG() * 0.5], [2.45, grab[0], grab[1]],
      [LOCK6[1] + 0.2, grab[0], grab[1]], [5.2, bt.x - d / 2, bt.y - d / 2],
    ], b);
    const dragging = b > LOCK6[0] - 0.05 && b < LOCK6[1] + 0.1;
    if (b < LOCK6[1] + 0.2 && b >= 2.45) cursor(p, grab[0], grab[1], dragging ? 0.55 : 0);
    else cursor(p, x, y, hit(b, LOCK6[0], 6));
    const beat = maxHit(b, [5.4, 5.7], 5);
    p.w *= 1 + 0.25 * beat; p.h *= 1 + 0.25 * beat;
    const st = E.inOutCubic(clamp((b - BTN6[0]) / (BTN6[1] - BTN6[0])));
    if (st > 0) {
      p.x = lerp(p.x, bt.x, st); p.y = lerp(p.y, bt.y, st);
      p.w = lerp(p.w, bt.w, st); p.h = lerp(p.h, bt.h, st); p.r = lerp(p.r, bt.h / 2, st); p.tip = 1 - st;
    }
    if (b > SHOW6 + 1.2) hide(p);
  }
  const S6 = {
    name: 'finale',
    beats: 13,
    blend: { start: (i) => (i >= G0 && i < G0 + NG ? ((i * 5) % 16) * 0.025 : 0), dur: (i) => (i >= G0 && i < G0 + NG ? 1.1 : 0.8), ease: E.inOutCubic, arc: 0.15 },
    pose(i, b, p) {
      if (i === 0) return hero6(p, b);
      const M = markAt(b);
      if (i >= 1 && i <= 3) {
        const pc = PIECES[i - 1], g = E.outBack(clamp((b - FORM6 - (i - 1) * 0.1) / 0.5));
        if (g <= 0) return hide(p);
        const s = lerp(0.92, 1, g);
        rect(p, M.x + (pc.cx - 7) * M.u, M.y + (pc.cy - 10.5) * M.u, pc.w * M.u * s, pc.h * M.u * s, 0, C.white);
        [p.q0x, p.q0y, p.q1x, p.q1y, p.q2x, p.q2y, p.q3x, p.q3y] = pc.q;
        p.o = clamp(g * 2);
        return;
      }
      if (i >= G0 && i < G0 + NG) {
        const k = i - G0, pt = MARKPTS[k % MARKPTS.length], f = E.inOutCubic(clamp((b - FORM6 - 0.15) / 0.5));
        if (f >= 1) return hide(p);
        circle(p, M.x + pt[0] * M.u, M.y + pt[1] * M.u, M.u * 1.3 * (1 - 0.5 * f), C.white);
        p.o = 1 - f;
        return;
      }
      hide(p);
    },
    type: [
      { at: LOCK6[0] + 0.55, to: Infinity, text: 'Framer', cls: 'word', align: 'left', stagger: 0, x: () => LOGO().tx, y: () => (G.cy + LOGO().ly) / G.H, size: () => LOGO().fsW },
      { at: TAG6, to: Infinity, text: 'The design agent for every step, | from idea to launch.', cls: 'soft', size: 0.44, stagger: 0.06, y: () => (G.cy + LOGO().ly + LOGO().fsW * 1.3) / G.H },
      {
        at: BTN6[0] - 0.4, show: SHOW6, to: Infinity, cls: 'link', y: CTA_Y, fade: 0.8,
        html: '<a href="https://www.framer.com" target="_blank" rel="noopener">Get started for free</a>' +
          '<small>Design &middot; CMS &middot; Hosting &middot; SEO &middot; Analytics</small>',
      },
    ],
    music(M) {
      M.pad(0, 'B2 F#3 D4 A4', FORM6, 0.28); M.sub(0, 'B1', FORM6, 0.2);
      M.whoosh(0, 1.3, 0.06, 3000, 400);
      for (let k = 0; k < 8; k++) M.marimba(0.25 + k * 0.1, penta(14 - k, 4), 0.06, (k / 7 - 0.5) * 0.8);
      M.kick(FORM6, 0.45); M.boom(FORM6, 0.35); M.snip(FORM6 - 0.02);
      M.bell(FORM6, 'D6', 0.2); M.bell(FORM6 + 0.1, 'A5', 0.16, -0.3); M.bell(FORM6 + 0.2, 'F#6', 0.12, 0.3);
      M.pad(FORM6, 'G2 D3 B3 F#4 A4', TAG6 - FORM6, 0.3); M.sub(FORM6, 'G1', TAG6 - FORM6, 0.22);
      M.tick(LOCK6[0], 0.05); M.whoosh(LOCK6[0], 1.0, 0.04, 500, 1800);
      M.ep(LOCK6[0] + 0.6, 'B5', 0.14); M.ep(LOCK6[0] + 0.9, 'D6', 0.1);
      M.pad(TAG6, 'D3 A3 E4 F#4 C#5', 13 - TAG6, 0.32); M.sub(TAG6, 'D2', 13 - TAG6, 0.24);
      M.ep(TAG6, 'F#5', 0.12); M.ep(TAG6 + 0.5, 'A5', 0.1); M.ep(TAG6 + 1.0, 'E5', 0.1);
      M.thump(5.4, 0.36); M.thump(5.7, 0.22);
      M.whoosh(BTN6[0], 1.1, 0.04, 400, 1800);
      M.marimba(SHOW6, 'A5', 0.14); M.marimba(SHOW6 + 0.2, 'D6', 0.12);
      for (let b = 2; b < 9; b += 2) M.kick(b, 0.15);
      M.ep(10, 'D5', 0.1); M.ep(10.02, 'A5', 0.08);
    },
  };

  BJ.scenes = [S1, S2, S3, S4, S5, S6];
})();
