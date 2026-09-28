/* "Carlos, we need to talk." — a 30 s roast in six scenes, 60 beats at 120 BPM.

   1 meet      0–8    Carlos pops in. Great developer, great friend. But we need to talk.
   2 squad     8–20   Problem #1: he still codes with Squad. The terminal's agents run out
                      onto a football pitch — he manages them like a football squad.
   3 app       20–32  Meanwhile, the GitHub Copilot App: sessions finish in parallel,
                      features pop in on the beat. Carlos: "Nah. I like my squad." *buzz*
   4 porto     32–46  Problem #2: Ajax shirt vs Porto shirt. His head lands on the wrong one.
   5 transfer  46–54  Transfer window: Farioli, Ajax → Porto: HERE WE GO!
                      Carlos, Squad → Copilot App: still thinking… *sad trombone*
   6 end       54–60  Your move, Carlos.

   The film is a pure function of time: FILM.render(seconds). The score is built from the same
   beats: FILM.events() → [{ t: seconds, fn(T) }] for the synth in audio.js. */
(function () {
  'use strict';
  const BJ = window.BJ, E = BJ.ease, clamp = BJ.clamp, lerp = BJ.lerp, hit = BJ.hit;
  const W = 1080, H = 1920, BEAT = 0.5, BEATS = 60;
  const TAU = Math.PI * 2;
  const SANS = '"SF Pro Display", "SF Pro Text", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
  const MONO = '"SF Mono", Menlo, Monaco, monospace';
  const C = {
    bg: '#0d1117', panel: '#161b22', panel2: '#1f2630', term: '#0a0e13', border: '#30363d',
    ink: '#f0f3f6', mute: '#8b949e', dim: '#484f58',
    purple: '#a371f7', violet: '#8250df', blue: '#58a6ff', green: '#3fb950', amber: '#e3b341', red: '#f85149',
    ajax: '#d2122e', ajaxHi: '#ff5a6a', porto: '#1b4fa8', portoHi: '#6aa5ff', yellow: '#ffd33d',
    pitch: '#1d7a3c', pitch2: '#1a6e36',
  };

  const cv = document.getElementById('film');
  const ctx = cv.getContext('2d');
  cv.width = W;
  cv.height = H;

  const photo = new Image();
  photo.src = 'img/carlos.png';
  const ready = new Promise((res) => { if (photo.complete && photo.naturalWidth) res(); else { photo.onload = res; photo.onerror = res; } })
    .then(() => (document.fonts ? document.fonts.ready : null));

  // ------------------------------------------------------------ drawing helpers
  const win = (b, a, z, fin = 0.5, fout = 0.5) => clamp((b - a) / fin) * (z === Infinity ? 1 : clamp((z - b) / fout));
  const pop = (b, a, d = 0.6) => Math.max(0, E.outBack(clamp((b - a) / d)));

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function font(size, weight = 700, fam = SANS) { ctx.font = `${weight} ${size}px ${fam}`; }

  function face(x, y, r, ring = C.purple, ringW = 10) {
    if (r <= 0.5) return;
    ctx.save();
    if (ring) {
      circle(x, y, r + ringW);
      ctx.fillStyle = ring;
      ctx.fill();
    }
    circle(x, y, r);
    ctx.clip();
    ctx.drawImage(photo, x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  // Kinetic headline: words rise into place one after another. `|` breaks a line, *word* highlights.
  function text(b, s, x, y, size, a, z, o = {}) {
    if (b < a - 0.02 || b > z + 0.02) return;
    const weight = o.weight || 750, color = o.color || C.ink, hl = o.hl || C.purple, lh = o.lh || 1.14;
    const stag = o.stagger === undefined ? 0.1 : o.stagger, align = o.align || 'center';
    font(size, weight, o.fam || SANS);
    ctx.letterSpacing = (o.ls === undefined ? -0.02 * size : o.ls) + 'px';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const out = z === Infinity ? 1 : E.inOutSine(clamp((z - b) / 0.4));
    const rows = s.split('|');
    const space = ctx.measureText(' ').width;
    let k = 0;
    rows.forEach((row, r) => {
      const words = row.trim().split(' ').map((w) => ({ hl: w.includes('*'), t: w.replace(/\*/g, '') }));
      words.forEach((w) => (w.w = ctx.measureText(w.t).width));
      const tw = words.reduce((s2, w) => s2 + w.w, 0) + space * (words.length - 1);
      let xx = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
      const yy = y + (r - (rows.length - 1) / 2) * size * lh;
      words.forEach((w) => {
        const f = E.outQuint(clamp((b - a - k * stag) / 0.7));
        const al = f * out;
        if (al > 0.003) {
          ctx.globalAlpha = al * (o.alpha === undefined ? 1 : o.alpha);
          ctx.fillStyle = w.hl ? hl : color;
          ctx.fillText(w.t, xx, yy + (1 - f) * size * 0.45 - (1 - out) * size * 0.25);
        }
        xx += w.w + space;
        k++;
      });
    });
    ctx.globalAlpha = 1;
    ctx.letterSpacing = '0px';
  }

  // A rubber stamp: slams down from 2.4× with a little rotation.
  function stamp(b, label, x, y, size, a, color, rot = -0.08, alpha = 1) {
    if (b < a) return;
    const f = clamp((b - a) / 0.28), s = 1 + 1.4 * (1 - E.outCubic(f)) - 0.06 * Math.sin(clamp((b - a - 0.28) / 0.4) * Math.PI);
    ctx.save();
    ctx.globalAlpha = clamp(f * 3) * alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    font(size, 850);
    ctx.letterSpacing = size * 0.06 + 'px';
    const tw = ctx.measureText(label).width + size * 0.06, pw = size * 0.55, ph = size * 0.38;
    rr(-tw / 2 - pw, -size / 2 - ph, tw + pw * 2, size + ph * 2, size * 0.28);
    ctx.lineWidth = size * 0.1;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, size * 0.03, size * 0.04);
    ctx.restore();
    ctx.letterSpacing = '0px';
  }

  function bubble(b, s, x, y, a, z, o = {}) {
    const g = pop(b, a, 0.45) * clamp((z - b) / 0.3);
    if (g <= 0.001) return;
    const size = o.size || 42;
    font(size, 700);
    const tw = ctx.measureText(s).width, w = tw + size * 1.2, h = size * 2;
    const tx = o.tail === 'right' ? w * 0.3 : -w * 0.3;
    ctx.save();
    ctx.translate(x + tx, y + h / 2 + 22);
    ctx.scale(g, g);
    ctx.translate(-tx, -(h / 2 + 22));
    ctx.fillStyle = o.fill || '#ffffff';
    rr(-w / 2, -h / 2, w, h, h / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tx - 22, h / 2 - 4);
    ctx.lineTo(tx + (o.tail === 'right' ? 34 : -34), h / 2 + 30);
    ctx.lineTo(tx + 20, h / 2 - 4);
    ctx.fill();
    ctx.fillStyle = o.color || '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, 0, 2);
    ctx.restore();
  }

  function check(x, y, r, color = C.green) {
    circle(x, y, r);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - r * 0.45, y + r * 0.02);
    ctx.lineTo(x - r * 0.1, y + r * 0.36);
    ctx.lineTo(x + r * 0.5, y - r * 0.34);
    ctx.lineWidth = r * 0.26;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0d1117';
    ctx.stroke();
  }
  function spinner(x, y, r, b, color = C.amber) {
    ctx.beginPath();
    ctx.arc(x, y, r, b * 5, b * 5 + TAU * 0.7);
    ctx.lineWidth = r * 0.32;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  function pill(x, y, label, bg, fg = '#fff', size = 34, align = 'left') {
    font(size, 700);
    const w = ctx.measureText(label).width + size * 1.1, h = size * 1.7;
    const x0 = align === 'center' ? x - w / 2 : x;
    rr(x0, y - h / 2, w, h, h / 2);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x0 + w / 2, y + 1);
    return w;
  }
  function glow(x, y, r, color, a) {
    if (a <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // A football shirt, centred on (x, y), `s` px wide. pattern: 'ajax' | 'porto'
  function shirt(x, y, s, pattern) {
    const P = [[-0.14, -0.5], [-0.34, -0.45], [-0.54, -0.26], [-0.42, -0.1], [-0.31, -0.2], [-0.31, 0.5], [0.31, 0.5], [0.31, -0.2], [0.42, -0.1], [0.54, -0.26], [0.34, -0.45], [0.14, -0.5]];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    P.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.quadraticCurveTo(0, -0.36, -0.14, -0.5);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-0.6, -0.6, 1.2, 1.2);
    if (pattern === 'ajax') {
      ctx.fillStyle = C.ajax;
      ctx.fillRect(-0.17, -0.6, 0.34, 1.2);
    } else {
      ctx.fillStyle = C.porto;
      for (let k = -4; k <= 4; k++) if (k % 2 === 0) ctx.fillRect(k * 0.085 - 0.0425, -0.6, 0.085, 1.2);
      for (const sx of [-1, 1]) { ctx.fillRect(sx * 0.31 - (sx < 0 ? 0.25 : 0), -0.6, 0.25, 0.6); }
    }
    // collar
    ctx.beginPath();
    ctx.moveTo(-0.14, -0.5);
    ctx.quadraticCurveTo(0, -0.36, 0.14, -0.5);
    ctx.lineWidth = 0.05;
    ctx.strokeStyle = pattern === 'ajax' ? C.ajax : C.porto;
    ctx.stroke();
    // a soft fold shade
    const g = ctx.createLinearGradient(-0.5, 0, 0.5, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.18)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(-0.6, -0.6, 1.2, 1.2);
    ctx.restore();
    ctx.restore();
  }

  // ------------------------------------------------------------ 1 · meet (beats 0–8)
  function sMeet(b) {
    const a = win(b, -1, 8, 0.01, 0.5);
    glow(540, 700, 900, 'rgba(130,80,223,0.55)', a * 0.9);
    ctx.globalAlpha = a;
    const s = pop(b, 0.15, 0.9);
    let pulse = 0;
    for (let k = 2; k < 8; k++) pulse = Math.max(pulse, hit(b, k, 5));
    const shake = Math.sin(b * 46) * 14 * hit(b, 5, 2.5);
    const r = 250 * s * (1 + 0.025 * pulse) * lerp(1, 0.85, E.inOutCubic(clamp((b - 7.2) / 0.8)));
    // spinning gradient ring
    if (r > 1) {
      const cg = ctx.createConicGradient(b * 0.9, 540 + shake, 740);
      cg.addColorStop(0, C.purple); cg.addColorStop(0.33, C.blue); cg.addColorStop(0.66, C.green); cg.addColorStop(1, C.purple);
      face(540 + shake, 740, r, cg, 16);
    }
    ctx.globalAlpha = a;
    text(b, 'A short film about', 540, 330, 46, 0.4, 4.8, { weight: 500, color: C.mute, ls: 0 });
    text(b, 'Carlos.', 540, 1130, 170, 0.9, 7.8, { weight: 850 });
    text(b, 'Great developer.|Great friend.', 540, 1330, 60, 2.1, 4.8, { weight: 600, color: C.mute });
    text(b, 'But we need to talk.', 540, 1330, 70, 5, 7.8, { weight: 750, hl: C.red });
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ 2 · squad (beats 8–20)
  const AG = [
    { n: 'Lead', c: C.purple, g: [300, 850], f: [0.5, 0.2] },
    { n: 'Frontend', c: C.blue, g: [620, 850], f: [0.26, 0.47] },
    { n: 'Backend', c: C.green, g: [300, 950], f: [0.74, 0.53] },
    { n: 'Tester', c: C.amber, g: [620, 950], f: [0.5, 0.86] },
  ];
  const TX = 90, TY = 440, TW = 900, TH = 700;
  function sSquad(b) {
    const a = win(b, 8, 20, 0.01, 0.5);
    if (a <= 0) return;
    glow(540, 800, 900, 'rgba(248,81,73,0.28)', a * win(b, 8, 14.5, 0.3, 1));
    glow(540, 800, 900, 'rgba(46,160,67,0.32)', a * win(b, 14.5, 20, 1, 0.5));
    ctx.globalAlpha = a;
    stamp(b, 'PROBLEM #1', 540, 280, 64, 8.05, C.red, -0.05, a);
    ctx.globalAlpha = a;

    // terminal window
    const e = E.outBack(clamp((b - 8.5) / 0.8));
    if (e > 0) {
      const oy = (1 - e) * 500;
      ctx.save();
      ctx.globalAlpha = a * clamp((b - 8.5) / 0.3);
      ctx.translate(0, oy);
      const toPitch = E.inOutCubic(clamp((b - 14.3) / 1.1));
      rr(TX, TY, TW, TH, 30);
      ctx.fillStyle = C.term;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.border;
      ctx.stroke();
      // the pitch grows inside the window
      if (toPitch > 0) {
        ctx.save();
        rr(TX + 18, TY + 76, TW - 36, TH - 94, 18);
        ctx.clip();
        const px = TX + 18, py = TY + 76, pw = TW - 36, ph = TH - 94;
        const rev = ph * toPitch;
        ctx.beginPath();
        ctx.rect(px, py + ph / 2 - rev / 2, pw, rev);
        ctx.clip();
        for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? C.pitch : C.pitch2; ctx.fillRect(px, py + (k * ph) / 8, pw, ph / 8 + 1); }
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 4;
        ctx.strokeRect(px + 30, py + 26, pw - 60, ph - 52);
        ctx.beginPath(); ctx.moveTo(px + 30, py + ph / 2); ctx.lineTo(px + pw - 30, py + ph / 2); ctx.stroke();
        circle(px + pw / 2, py + ph / 2, 80); ctx.stroke();
        ctx.strokeRect(px + pw / 2 - 170, py + 26, 340, 110);
        ctx.strokeRect(px + pw / 2 - 170, py + ph - 136, 340, 110);
        ctx.restore();
      }
      // title bar
      ['#ff5f57', '#febc2e', '#28c840'].forEach((c, k) => { circle(TX + 42 + k * 36, TY + 38, 11); ctx.fillStyle = c; ctx.fill(); });
      font(28, 600, SANS);
      ctx.fillStyle = C.mute;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(toPitch > 0.5 ? 'carlos — squad — matchday' : 'carlos — zsh — ~/code', TX + TW / 2, TY + 38);

      // terminal text
      const ta = 1 - clamp((b - 14.2) / 0.5);
      if (ta > 0) {
        ctx.globalAlpha = a * ta;
        font(40, 500, MONO);
        ctx.textAlign = 'left';
        const X0 = TX + 50, L = (k) => TY + 140 + k * 70;
        const cmd = 'squad init', n = Math.floor(clamp((b - 9.4) / 1.4) * cmd.length);
        if (b > 9.1) {
          ctx.fillStyle = C.green; ctx.fillText('~/code $', X0, L(0));
          ctx.fillStyle = C.ink; ctx.fillText(cmd.slice(0, n), X0 + 215, L(0));
          if (b < 11 && Math.floor(b * 2) % 2 === 0) { ctx.fillStyle = C.ink; ctx.fillRect(X0 + 215 + ctx.measureText(cmd.slice(0, n)).width + 4, L(0) - 22, 20, 44); }
        }
        if (b > 11) { ctx.fillStyle = C.green; ctx.fillText('✓ created .squad/', X0, L(1)); }
        if (b > 11.5) { ctx.fillStyle = C.mute; ctx.fillText('Hiring your AI team…', X0, L(2)); }
        if (b > 13.9) {
          ctx.fillStyle = C.green; ctx.fillText('~/code $', X0, L(8));
          ctx.fillStyle = C.ink; ctx.fillText('squad', X0 + 215, L(8));
        }
      }
      ctx.globalAlpha = a;
      // the agents: listed in the terminal, then out on the pitch
      AG.forEach((g, k) => {
        const at = 12.2 + k * 0.5, s = pop(b, at, 0.45);
        if (s <= 0) return;
        const m = E.glide(clamp((b - 14.6 - k * 0.14) / 1.1));
        const fx = TX + 18 + g.f[0] * (TW - 36), fy = TY + 76 + g.f[1] * (TH - 94);
        const run = clamp((b - 15.7) / 0.5);
        const jx = run * 16 * Math.sin(b * 3.1 + k * 2), jy = run * 12 * Math.sin(b * 2.3 + k);
        const x = lerp(g.g[0], fx, m) + jx, y = lerp(g.g[1] - 40, fy, m) + jy;
        const r = lerp(24, 34, m) * s * (1 + 0.1 * m * hit(b, Math.floor(b), 6) * (b > 16 ? 1 : 0));
        circle(x, y, r + 5); ctx.fillStyle = '#0a0e13'; ctx.fill();
        circle(x, y, r); ctx.fillStyle = g.c; ctx.fill();
        font(lerp(38, 30, m), 650, m > 0.5 ? SANS : MONO);
        ctx.fillStyle = m > 0.5 ? '#fff' : C.ink;
        ctx.textAlign = m > 0.5 ? 'center' : 'left';
        ctx.fillText(g.n, m > 0.5 ? x : x + 44, m > 0.5 ? y + 56 : y);
      });
      // the bench
      const bn = win(b, 16.2, Infinity, 0.4);
      if (bn > 0) {
        ctx.globalAlpha = a * bn;
        rr(TX + 60, TY + TH - 104, 300, 62, 31);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fill();
        circle(TX + 96, TY + TH - 73, 16); ctx.fillStyle = C.dim; ctx.fill();
        font(28, 600); ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
        ctx.fillText('Bench: @copilot', TX + 124, TY + TH - 72);
      }
      ctx.restore();
    }
    ctx.globalAlpha = a;
    // Carlos, the manager, on the touchline
    const fs = pop(b, 16.8, 0.5);
    if (fs > 0) {
      const jump = Math.abs(Math.sin(clamp((b - 17.2) / 1.2) * Math.PI * 3)) * 26 * (b < 18.4 ? 1 : 0);
      face(880, 1235 - jump, 92 * fs, '#ffffff', 8);
    }
    bubble(b, 'Tester! Press higher!', 520, 1150, 17.2, 19.8, { size: 40, tail: 'right' });
    text(b, 'Carlos still codes|with *Squad*.', 540, 1400, 76, 9.6, 14.6, { hl: C.purple });
    text(b, 'He manages his agents|like a *football* *squad*.', 540, 1400, 64, 15.2, 19.8, { hl: '#56d364' });
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ 3 · the app (beats 20–32)
  const SESS = ['fix-login', 'api-v2', 'docs refresh', 'perf pass', 'release'];
  const FEAT = ['Parallel sessions', 'Worktrees', 'Canvases', 'Agent merge', 'PR stacks', 'Automations'];
  const AX = 60, AY = 520, AW = 960, AH = 720;
  function sApp(b) {
    const a = win(b, 20, 32, 0.01, 0.5);
    if (a <= 0) return;
    glow(540, 850, 1000, 'rgba(130,80,223,0.5)', a);
    glow(900, 1500, 700, 'rgba(88,166,255,0.3)', a);
    ctx.globalAlpha = a;
    text(b, 'Meanwhile…', 540, 280, 46, 20.2, 31.8, { weight: 500, color: C.mute, ls: 0 });
    text(b, 'the *GitHub* *Copilot* *App*.', 540, 385, 74, 20.6, 31.8, { hl: '#c297ff' });

    const e = E.outBack(clamp((b - 20.9) / 0.8));
    if (e > 0) {
      ctx.save();
      ctx.globalAlpha = a * clamp((b - 20.9) / 0.3);
      const s = lerp(0.8, 1, e);
      ctx.translate(540, AY + AH / 2);
      ctx.scale(s, s);
      ctx.translate(-540, -(AY + AH / 2));
      rr(AX, AY, AW, AH, 30);
      ctx.fillStyle = C.panel;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#3d444d';
      ctx.stroke();
      ['#ff5f57', '#febc2e', '#28c840'].forEach((c, k) => { circle(AX + 40 + k * 34, AY + 36, 10); ctx.fillStyle = c; ctx.fill(); });
      font(26, 600); ctx.fillStyle = C.mute; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('GitHub Copilot', AX + AW / 2, AY + 36);
      ctx.fillStyle = C.border; ctx.fillRect(AX, AY + 70, AW, 2);
      // sidebar: sessions finishing in parallel
      ctx.fillStyle = '#12171e'; ctx.fillRect(AX + 2, AY + 72, 290, AH - 74);
      ctx.fillStyle = C.border; ctx.fillRect(AX + 292, AY + 72, 2, AH - 74);
      font(22, 700); ctx.fillStyle = C.mute; ctx.textAlign = 'left'; ctx.letterSpacing = '2px';
      ctx.fillText('SESSIONS', AX + 34, AY + 115);
      ctx.letterSpacing = '0px';
      SESS.forEach((n, k) => {
        const y = AY + 175 + k * 84, s2 = pop(b, 21.2 + k * 0.15, 0.4);
        if (s2 <= 0) return;
        ctx.globalAlpha = a * clamp(s2);
        if (k === 0) { rr(AX + 16, y - 34, 262, 68, 14); ctx.fillStyle = 'rgba(130,80,223,0.22)'; ctx.fill(); }
        const done = 22.5 + k;
        if (b < done) spinner(AX + 50, y, 13, b + k, C.amber);
        else check(AX + 50, y, 16 * (1 + 0.35 * hit(b, done, 5)));
        font(28, 600); ctx.fillStyle = C.ink; ctx.textAlign = 'left';
        ctx.fillText(n, AX + 80, y + 1);
      });
      ctx.globalAlpha = a;
      // chat
      const cx0 = AX + 320, cw = 340;
      const u = pop(b, 21.6, 0.4);
      if (u > 0) {
        ctx.save(); ctx.translate(cx0 + cw, AY + 130); ctx.scale(u, u);
        font(26, 600); const tw = ctx.measureText('Ship v2. All of it.').width + 44;
        rr(-tw, -30, tw, 60, 30); ctx.fillStyle = C.violet; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText('Ship v2. All of it.', -22, 1);
        ctx.restore();
      }
      for (let k = 0; k < 6; k++) {
        const g = E.outCubic(clamp((b - 22.2 - k * 0.35) / 0.6));
        if (g <= 0) continue;
        const wl = [300, 250, 320, 180, 290, 220][k] * g;
        rr(cx0, AY + 200 + k * 46, wl, 22, 11); ctx.fillStyle = k === 0 ? C.purple : '#2d333b'; ctx.fill();
      }
      // canvas panel: a live preview
      const cp = E.outBack(clamp((b - 23.2) / 0.6));
      if (cp > 0) {
        const px = AX + 320, py = AY + 500, pw = AW - 350, ph = 190;
        ctx.save(); ctx.translate(px + pw / 2, py + ph / 2); ctx.scale(cp, cp); ctx.translate(-(px + pw / 2), -(py + ph / 2));
        rr(px, py, pw, ph, 18); ctx.fillStyle = '#0d1117'; ctx.fill(); ctx.strokeStyle = C.border; ctx.lineWidth = 2; ctx.stroke();
        rr(px + 20, py + 18, pw - 40, 30, 15); ctx.fillStyle = '#21262d'; ctx.fill();
        font(18, 600); ctx.fillStyle = C.mute; ctx.textAlign = 'left'; ctx.fillText('localhost:5173', px + 40, py + 34);
        const gr = ctx.createLinearGradient(px, py, px + pw, py + ph);
        gr.addColorStop(0, '#8250df'); gr.addColorStop(1, '#1f6feb');
        rr(px + 20, py + 64, pw - 40, 70, 12); ctx.fillStyle = gr; ctx.fill();
        for (let k = 0; k < 3; k++) { rr(px + 20 + k * ((pw - 40) / 3), py + 148, (pw - 40) / 3 - 14, 24, 8); ctx.fillStyle = '#2d333b'; ctx.fill(); }
        ctx.restore();
      }
      // toast
      const tt = E.outBack(clamp((b - 27) / 0.5));
      if (tt > 0) {
        const tx = lerp(AX + AW + 40, AX + AW - 350, tt);
        rr(tx, AY + AH - 96, 320, 66, 33); ctx.fillStyle = '#1a7f37'; ctx.fill();
        font(28, 700); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText('✓  5 PRs merged', tx + 30, AY + AH - 62);
      }
      ctx.restore();
    }
    ctx.globalAlpha = a;
    // features, one per beat
    FEAT.forEach((f, k) => {
      const at = 22 + k, s = pop(b, at, 0.45);
      if (s <= 0) return;
      const x = k % 2 ? 790 : 290, y = 1345 + Math.floor(k / 2) * 106;
      const dim = b > 28.6 ? 0.35 : 1;
      ctx.save();
      ctx.globalAlpha = a * clamp(s) * dim;
      ctx.translate(x, y); ctx.scale(s * (1 + 0.06 * hit(b, at, 5)), s * (1 + 0.06 * hit(b, at, 5)));
      rr(-230, -42, 460, 84, 42); ctx.fillStyle = '#1c2128'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = ['#a371f7', '#58a6ff', '#3fb950', '#e3b341', '#f778ba', '#79c0ff'][k]; ctx.stroke();
      circle(-190, 0, 10); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
      font(34, 650); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(f, 12, 2);
      ctx.restore();
    });
    ctx.globalAlpha = a;
    const fs = pop(b, 28, 0.5);
    if (fs > 0) {
      const sh = Math.sin(b * 40) * 10 * hit(b, 28.6, 3);
      face(190 + sh, 1705, 100 * fs, '#ffffff', 8);
    }
    bubble(b, 'Nah. I like my squad.', 640, 1640, 28.3, 31.8, { size: 44 });
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ 4 · porto (beats 32–46)
  const AJ = { x: 280, y: 820 }, PO = { x: 800, y: 820 }, SW = 400;
  function sPorto(b) {
    const a = win(b, 32, 46, 0.01, 0.5);
    if (a <= 0) return;
    glow(260, 820, 700, 'rgba(210,18,46,0.45)', a * (0.5 + 0.5 * win(b, 38, 46, 0.5, 0.5)));
    glow(820, 820, 700, 'rgba(27,79,168,0.6)', a);
    ctx.globalAlpha = a;
    stamp(b, 'PROBLEM #2', 540, 250, 64, 32.05, C.red, -0.05, a * clamp((41.2 - b) / 0.4));
    ctx.globalAlpha = a;
    const ea = E.outBack(clamp((b - 32.7) / 0.7)), ep = E.outBack(clamp((b - 33.1) / 0.7));
    const pulse = hit(b, 38, 3);
    if (ea > 0) {
      ctx.save();
      ctx.globalAlpha = a * clamp((b - 32.7) / 0.3);
      shirt(lerp(-300, AJ.x, ea), AJ.y + Math.sin(b * 1.4) * 6, SW * (1 + 0.06 * pulse), 'ajax');
      ctx.restore();
    }
    if (ep > 0) {
      ctx.save();
      ctx.globalAlpha = a * clamp((b - 33.1) / 0.3);
      shirt(lerp(1380, PO.x, ep), PO.y + Math.sin(b * 1.4 + 1) * 6, SW, 'porto');
      ctx.restore();
    }
    ctx.globalAlpha = a;
    font(34, 750); ctx.letterSpacing = '5px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = a * clamp((b - 33.4) / 0.4); ctx.fillStyle = '#ffffff';
    ctx.fillText('AJAX', AJ.x, 1070);
    ctx.fillText('FC PORTO', PO.x, 1070);
    ctx.letterSpacing = '0px';
    ctx.globalAlpha = a;
    // Carlos's head lands on the Porto shirt
    const d = E.spring(clamp((b - 34.8) / 0.9));
    if (b > 34.8) {
      const hy = lerp(-200, PO.y - SW * 0.5 - 70, d) + Math.sin(b * 1.4 + 1) * 6;
      face(PO.x, hy, 92, '#ffffff', 6);
    }
    // the empty spot on the Ajax shirt
    const q = win(b, 38.3, Infinity, 0.5);
    if (q > 0) {
      ctx.save();
      ctx.globalAlpha = a * q;
      const hy = AJ.y - SW * 0.5 - 70 + Math.sin(b * 1.4) * 6;
      circle(AJ.x, hy, 92 * (1 + 0.04 * Math.sin(b * 4)));
      ctx.setLineDash([16, 14]);
      ctx.lineDashOffset = -b * 20;
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.setLineDash([]);
      font(100, 800); ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
      ctx.fillText('?', AJ.x, hy + 6);
      font(28, 550); ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText('still reserved for Carlos', AJ.x, 1120);
      ctx.restore();
    }
    // Amsterdam → Porto
    const fl = E.inOutCubic(clamp((b - 41) / 1.6));
    if (fl > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      const x0 = AJ.x + 110, x1 = PO.x - 110, y0 = 470, peak = 380;
      const pt = (t) => [lerp(x0, x1, t), y0 - Math.sin(t * Math.PI) * (y0 - peak)];
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) { const [x, y] = pt((k / 40) * fl); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.setLineDash([4, 16]); ctx.lineCap = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.setLineDash([]);
      const [px, py] = pt(fl);
      circle(px, py, 14); ctx.fillStyle = C.yellow; ctx.fill();
      font(34, 750); ctx.fillStyle = C.yellow; ctx.textAlign = 'center';
      ctx.globalAlpha = a * clamp((b - 42) / 0.4);
      ctx.fillText('1,600 km', 540, 340 + 0 * peak);
      ctx.restore();
    }
    ctx.globalAlpha = a;
    text(b, 'Carlos supports|*FC* *Porto*.', 540, 1330, 84, 33.8, 37.7, { hl: C.portoHi });
    text(b, 'Instead of *Ajax*.', 540, 1330, 92, 38, 40.9, { hl: C.ajaxHi });
    text(b, '1,600 km from|the *right* club.', 540, 1330, 80, 41.2, 45.8, { hl: C.ajaxHi });
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ 5 · transfer window (beats 46–54)
  function card(b, y, at, o) {
    const e = E.outBack(clamp((b - at) / 0.6));
    if (e <= 0) return;
    ctx.save();
    ctx.translate(lerp(1100, 0, e), 0);
    rr(70, y, 940, 300, 36); ctx.fillStyle = C.panel; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#3d444d'; ctx.stroke();
    o.avatar(190, y + 150);
    font(42, 800); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(o.name, 315, y + 80);
    font(28, 550); ctx.fillStyle = C.mute; ctx.fillText(o.sub, 315, y + 128);
    let x = 315;
    x += pill(x, y + 215, o.from[0], o.from[1], '#fff', 30) + 18;
    font(40, 700); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.fillText('→', x, y + 213); x += 58;
    pill(x, y + 215, o.to[0], o.to[1], '#fff', 30);
    o.status(840, y + 105);
    ctx.restore();
  }
  function sTransfer(b) {
    const a = win(b, 46, 54, 0.01, 0.5);
    if (a <= 0) return;
    glow(540, 700, 900, 'rgba(255,211,61,0.22)', a);
    ctx.globalAlpha = a;
    // ticker
    const tk = E.outCubic(clamp((b - 46.05) / 0.4));
    if (tk > 0) {
      ctx.save();
      ctx.translate(0, lerp(-140, 0, tk));
      ctx.fillStyle = C.yellow; ctx.fillRect(0, 230, W, 90);
      font(44, 900); ctx.fillStyle = '#111'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '3px';
      const s = 'TRANSFER WINDOW  •  ', sw = ctx.measureText(s).width;
      for (let k = -1; k < 4; k++) ctx.fillText(s, k * sw - ((b * 90) % sw), 277);
      ctx.letterSpacing = '0px';
      ctx.restore();
    }
    card(b, 430, 46.4, {
      name: 'Francesco Farioli', sub: 'Head coach',
      from: ['Ajax', C.ajax], to: ['FC Porto', C.porto],
      avatar: (x, y) => {
        circle(x, y, 90); ctx.fillStyle = '#2d333b'; ctx.fill();
        ctx.save(); circle(x, y, 90); ctx.clip();
        circle(x, y - 22, 34); ctx.fillStyle = '#8b949e'; ctx.fill();
        rr(x - 62, y + 22, 124, 110, 50); ctx.fill();
        ctx.restore();
      },
      status: (x, y) => {
        if (b < 47.9) { spinner(x - 80, y, 16, b); font(30, 600); ctx.fillStyle = C.mute; ctx.textAlign = 'left'; ctx.fillText('pending…', x - 50, y); }
        else stamp(b, 'HERE WE GO!', x + 10, y, 30, 47.9, C.green, -0.1);
      },
    });
    card(b, 790, 48.9, {
      name: 'Carlos', sub: 'Developer · Porto fan',
      from: ['Squad', '#484f58'], to: ['Copilot App', C.violet],
      avatar: (x, y) => face(x, y, 86, '#ffffff', 4),
      status: (x, y) => {
        if (b < 50.9) { spinner(x - 80, y, 16, b); font(30, 600); ctx.fillStyle = C.mute; ctx.textAlign = 'left'; ctx.fillText('pending…', x - 50, y); }
        else stamp(b, 'STILL THINKING', x, y, 28, 50.9, C.amber, -0.1);
      },
    });
    text(b, 'Even *Farioli*|made the switch.', 540, 1330, 84, 48.3, 53.8, { hl: C.yellow });
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ 6 · your move (beats 54–60)
  const CONF = [];
  { const r = BJ.rng(11); for (let k = 0; k < 70; k++) CONF.push({ x: r() * W, d: r() * 1.4, v: 0.6 + r() * 0.8, s: 14 + r() * 16, w: r() * 6, c: [C.ajax, '#ffffff', C.purple, C.ajax, '#ffffff'][k % 5] }); }
  function sEnd(b) {
    const a = win(b, 54, 70, 0.01);
    if (a <= 0) return;
    glow(540, 760, 900, 'rgba(210,18,46,0.5)', a);
    glow(540, 760, 500, 'rgba(163,113,247,0.35)', a);
    // confetti
    const t = b - 54;
    CONF.forEach((c) => {
      const tt = t - c.d;
      if (tt <= 0) return;
      const y = -40 + tt * c.v * 420, x = c.x + Math.sin(tt * 2 + c.w) * 40;
      if (y > H + 40) return;
      ctx.save(); ctx.translate(x, y); ctx.rotate(tt * 3 + c.w); ctx.scale(1, Math.cos(tt * 5 + c.w));
      ctx.fillStyle = c.c; ctx.globalAlpha = a * 0.9; ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2);
      ctx.restore();
    });
    ctx.globalAlpha = a;
    const s = pop(b, 54.1, 0.8);
    if (s > 0) {
      const r = 270 * s * (1 + 0.03 * hit(b, 58, 3));
      const cg = ctx.createConicGradient(b * 0.7, 540, 760);
      for (let k = 0; k <= 12; k++) { cg.addColorStop(k / 12, k % 2 ? '#ffffff' : C.ajax); if (k < 12) cg.addColorStop((k + 0.999) / 12, k % 2 ? '#ffffff' : C.ajax); }
      face(540, 760, r, cg, 18);
      const bs = pop(b, 55.2, 0.5);
      if (bs > 0) {
        ctx.save(); ctx.translate(760, 980); ctx.scale(bs, bs); ctx.rotate(-0.12);
        pill(0, 0, 'Carlos 2.0', C.violet, '#fff', 36, 'center');
        ctx.restore();
      }
    }
    text(b, 'Your move, Carlos.', 540, 1180, 96, 54.6, Infinity, { weight: 850 });
    text(b, '1. Install the GitHub Copilot App.', 540, 1330, 44, 55.8, Infinity, { weight: 600, color: C.mute });
    text(b, '2. Get an Ajax shirt.', 540, 1400, 44, 56.6, Infinity, { weight: 600, color: C.mute });
    text(b, '— with love, Bart', 540, 1620, 38, 57.6, Infinity, { weight: 500, color: '#c9d1d9', ls: 0 });
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ transitions: a wipe hides every cut
  const CUTS = [
    { at: 8, kind: 'grad', c: ['#f85149', '#8250df'] },
    { at: 20, kind: 'grad', c: ['#8250df', '#1f6feb'] },
    { at: 32, kind: 'stripes', c: [C.porto, '#ffffff'] },
    { at: 46, kind: 'grad', c: [C.yellow, '#f0883e'] },
    { at: 54, kind: 'ajax', c: [C.ajax, '#ffffff'] },
  ];
  function wipe(b) {
    for (const w of CUTS) {
      const p = (b - (w.at - 0.45)) / 0.9;
      if (p <= 0 || p >= 1) continue;
      const e = E.inOutCubic(p), bw = W * 1.9, cx = lerp(-bw / 2 - 300, W + bw / 2 + 300, e);
      ctx.save();
      ctx.translate(cx, H / 2);
      ctx.rotate(-0.2);
      ctx.beginPath(); ctx.rect(-bw / 2, -H, bw, H * 2); ctx.clip();
      if (w.kind === 'grad') {
        const g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
        g.addColorStop(0, w.c[0]); g.addColorStop(1, w.c[1]);
        ctx.fillStyle = g; ctx.fillRect(-bw / 2, -H, bw, H * 2);
      } else if (w.kind === 'stripes') {
        ctx.fillStyle = w.c[1]; ctx.fillRect(-bw / 2, -H, bw, H * 2);
        ctx.fillStyle = w.c[0]; for (let x = -bw / 2; x < bw / 2; x += 160) ctx.fillRect(x, -H, 80, H * 2);
      } else {
        ctx.fillStyle = w.c[1]; ctx.fillRect(-bw / 2, -H, bw, H * 2);
        ctx.fillStyle = w.c[0]; ctx.fillRect(-bw * 0.22, -H, bw * 0.44, H * 2);
      }
      ctx.restore();
    }
  }

  // ------------------------------------------------------------ frame
  function render(sec) {
    const b = sec / BEAT;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    if (b < 8.5) sMeet(b);
    if (b >= 7.5 && b < 20.5) sSquad(b);
    if (b >= 19.5 && b < 32.5) sApp(b);
    if (b >= 31.5 && b < 46.5) sPorto(b);
    if (b >= 45.5 && b < 54.5) sTransfer(b);
    if (b >= 53.5) sEnd(b);
    wipe(b);
  }

  // ------------------------------------------------------------ score (same beats as the picture)
  function events() {
    const A = BJ.Audio, m = BJ.m, ms = BJ.ms, ev = [];
    const at = (b, fn) => ev.push({ t: b * BEAT, fn });
    const V = (b, name, ...args) => at(b, (T) => A[name](T, ...args));
    // I–V–vi–IV in C, one chord per bar
    const PROG = [['C3 G3 B3 E4', 'C2'], ['G2 D3 B3 D4', 'G1'], ['A2 E3 G3 C4', 'A1'], ['F2 C3 A3 E4', 'F1']];
    const off = (b) => (b >= 28.6 && b < 32) || (b >= 50.8 && b < 54); // groove drops out for the punchlines
    for (let bar = 0; bar < 15; bar++) {
      const b0 = bar * 4, [ch, root] = PROG[bar % 4];
      if (!(b0 >= 52 && b0 < 54)) V(b0, 'pad', ms(ch), 4 * BEAT, bar < 2 ? 0.2 : 0.24);
      for (let k = 0; k < 8; k++) {
        const b = b0 + k * 0.5;
        if (b < 8 || off(b) || b >= 58) continue;
        V(b, 'bass', m(root) + 12 + (k % 2 ? 12 : 0), 0.4 * BEAT, 0.32);
      }
      for (let k = 0; k < 4; k++) {
        const b = b0 + k;
        if (off(b) || b >= 58) continue;
        if (b >= 2) V(b, 'kick', b >= 8 ? 0.42 : 0.3);
        if (b >= 8) { V(b + 0.5, 'hat', 0.07, false, 0.3); if (k % 2) V(b, 'clap', 0.16); }
        if (b >= 20 && b < 28) V(b + 0.75, 'hat', 0.04, false, -0.3);
      }
    }
    // 1 · meet
    V(0.15, 'drop', m('C6'), 0.2);
    V(0.9, 'pluck', m('E5'), 0.22); V(1.4, 'pluck', m('G5'), 0.2); V(1.9, 'pluck', m('C6'), 0.2);
    V(2.1, 'marimba', m('E5'), 0.2); V(3.1, 'marimba', m('D5'), 0.2); V(4.1, 'marimba', m('C5'), 0.2);
    V(5, 'rip', 0.4, 0.3); V(5, 'boom', 0.35);
    V(7.1, 'whoosh', 0.9 * BEAT * 2, 0.22, 300, 5000);
    // 2 · squad
    V(8.05, 'stamp', 0.7); V(8.05, 'boom', 0.5); V(8.05, 'crash', 0.25);
    V(8.5, 'whoosh', 0.8 * BEAT, 0.12, 400, 2400);
    for (let k = 0; k < 10; k++) V(9.4 + (k * 1.4) / 10, 'key', 0.35, (k % 3 - 1) * 0.3);
    V(10.9, 'key', 0.5);
    V(11, 'blip', m('G5'), 0.18); V(11.5, 'blip', m('E5'), 0.12);
    ['C5', 'E5', 'G5', 'C6'].forEach((n, k) => V(12.2 + k * 0.5, 'coin', m(n), 0.16, (k - 1.5) * 0.4));
    for (let k = 0; k < 5; k++) V(13.9 + k * 0.08, 'key', 0.25);
    V(14.3, 'whoosh', 1.1 * BEAT, 0.2, 300, 3500);
    V(15.6, 'marimba', m('G5'), 0.22); V(16, 'marimba', m('A5'), 0.2);
    V(16.8, 'drop', m('G5'), 0.2);
    // referee whistle: a short peep and a long one
    V(17.2, 'beep', m('B6'), 0.16); V(17.45, 'beep', m('B6'), 0.16); V(17.7, 'beep', m('B6'), 0.2);
    V(19.2, 'whoosh', 0.9 * BEAT * 2, 0.22, 300, 5000);
    // 3 · the app
    V(20.9, 'splash', 0.18);
    ['G5', 'B5', 'D6', 'G6', 'D6'].forEach((n, k) => V(21.2 + k * 0.15, 'blip', m(n), 0.08, (k - 2) * 0.3));
    V(21.6, 'pluck', m('D5'), 0.2);
    for (let k = 0; k < 5; k++) V(22.5 + k, 'coin', m(['E6', 'G6', 'A6', 'C7', 'E7'][k]) - 12, 0.16, 0.3);
    FEAT.forEach((f, k) => V(22 + k, 'pluck', m(['C5', 'E5', 'G5', 'A5', 'C6', 'E6'][k]), 0.24, (k % 2 ? 0.35 : -0.35)));
    V(23.2, 'shutter', 0.15);
    V(27, 'bell', m('C6'), 0.2); V(27.25, 'bell', m('G6'), 0.16);
    V(28, 'drop', m('E5'), 0.25);
    V(28.6, 'buzz', 0.45);
    V(28.6, 'womp', m('C3'), 0.8 * BEAT, 0.25);
    V(30.5, 'riser', 1.5 * BEAT * 2, 1);
    // 4 · porto
    V(32.05, 'stamp', 0.7); V(32.05, 'boom', 0.5); V(32.05, 'crash', 0.28);
    V(32.7, 'whoosh', 0.7 * BEAT, 0.15, 500, 3000); V(33.1, 'whoosh', 0.7 * BEAT, 0.15, 500, 3000);
    V(34.8, 'whoosh', 0.8 * BEAT, 0.12, 3000, 400); V(35.4, 'thump', 0.55); V(35.4, 'drop', m('C5'), 0.2);
    V(38, 'stamp', 0.4); V(38, 'crash', 0.15);
    // the stadium: "A-JAX!" clap clap clap
    V(38.5, 'vox', m('E4'), 0.4 * BEAT, 0.2, 'a', -0.2); V(39, 'vox', m('C4'), 0.6 * BEAT, 0.2, 'a', 0.2);
    [39.75, 40.25, 40.75].forEach((b) => V(b, 'clap', 0.3, 0));
    V(41, 'whoosh', 1.6 * BEAT, 0.14, 800, 5000);
    V(42.6, 'bell', m('E6'), 0.14);
    V(45, 'whoosh', 0.9 * BEAT * 2, 0.22, 300, 5000);
    // 5 · transfer
    V(46.05, 'beep', m('G5'), 0.12); V(46.3, 'beep', m('C6'), 0.12); V(46.55, 'beep', m('E6'), 0.14);
    V(46.4, 'whoosh', 0.6 * BEAT, 0.16, 600, 3000);
    V(47.9, 'stamp', 0.6); V(47.9, 'crash', 0.3); V(47.9, 'boom', 0.4);
    V(48.1, 'vox', m('G4'), 0.9 * BEAT, 0.16, 'o', -0.3); V(48.1, 'vox', m('C5'), 0.9 * BEAT, 0.14, 'o', 0.3);
    V(48.9, 'whoosh', 0.6 * BEAT, 0.16, 600, 3000);
    // sad trombone: wah, wah, wah, waaah
    V(50.9, 'stamp', 0.45);
    V(51.0, 'womp', m('G3'), 0.55 * BEAT, 0.34);
    V(51.7, 'womp', m('F#3'), 0.55 * BEAT, 0.34);
    V(52.4, 'womp', m('F3'), 0.55 * BEAT, 0.34);
    V(53.1, 'womp', m('E3'), 1.2 * BEAT, 0.34, 1);
    V(53.3, 'whoosh', 0.7 * BEAT * 2, 0.2, 300, 5000);
    // 6 · your move
    V(54, 'crash', 0.35); V(54, 'boom', 0.45); V(54.1, 'splash', 0.2);
    ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].forEach((n, k) => V(54.6 + k * 0.25, 'pluck', m(n), 0.2, (k - 2.5) * 0.25));
    V(55.2, 'coin', m('C6'), 0.14);
    V(55.8, 'marimba', m('E5'), 0.2); V(56.6, 'marimba', m('G5'), 0.2);
    V(58, 'kick', 0.5); V(58, 'boom', 0.5); V(58, 'crash', 0.25);
    V(58, 'pad', ms('C3 G3 C4 E4 G4'), 2.5 * BEAT, 0.3);
    V(58, 'sub', m('C2'), 2 * BEAT, 0.3);
    V(58, 'bell', m('C6'), 0.18); V(58, 'bell', m('G5'), 0.14);
    return ev;
  }

  window.FILM = { W, H, BEAT, total: BEATS * BEAT, render, events, ready };
})();
