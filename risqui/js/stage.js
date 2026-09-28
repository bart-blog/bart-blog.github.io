/* Stage: a small cast of plain divs, each positioned by exactly one matrix3d.
   A pose has two parts so whole formations can turn in 3D while their members move:
     group  gx gy gz · grx gry grz · gs      (the formation: where it is, how it is turned)
     local  x y z · rx ry rz · w h           (the element inside it; w, h in px)
     look   o (opacity) · r g b (colour) · clip (visible fraction from the top) · f (Lottie frame)
   world = T(centre + g) · Rx · Ry · Rz · S(gs) · T(x, y, z) · Rz · Ry · Rx · S(w/bw, h/bh)
   Blending two poses field by field is what makes every transition continuous. */
(function () {
  'use strict';
  const BJ = window.BJ, G = BJ.G;
  const F = (BJ.FIELDS = ['gx', 'gy', 'gz', 'grx', 'gry', 'grz', 'gs', 'x', 'y', 'z', 'rx', 'ry', 'rz', 'w', 'h', 'o', 'r', 'g', 'b', 'clip', 'f']);
  BJ.GROUP = { gx: 1, gy: 1, gz: 1, grx: 1, gry: 1, grz: 1, gs: 1 };
  BJ.resetPose = function (q) {
    for (let k = 0; k < F.length; k++) q[F[k]] = 0;
    q.gs = 1; q.o = 1; q.g = 23; q.b = 82; q.clip = 1;
    return q;
  };

  // column-major 4×4, right-multiplied in place
  function tr(m, x, y, z) {
    for (let i = 0; i < 4; i++) m[12 + i] += m[i] * x + m[4 + i] * y + m[8 + i] * z;
  }
  function rx(m, a) {
    if (!a) return;
    const c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < 4; i++) { const p = m[4 + i], q = m[8 + i]; m[4 + i] = c * p + s * q; m[8 + i] = -s * p + c * q; }
  }
  function ry(m, a) {
    if (!a) return;
    const c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < 4; i++) { const p = m[i], q = m[8 + i]; m[i] = c * p - s * q; m[8 + i] = s * p + c * q; }
  }
  function rz(m, a) {
    if (!a) return;
    const c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < 4; i++) { const p = m[i], q = m[4 + i]; m[i] = c * p + s * q; m[4 + i] = -s * p + c * q; }
  }
  function sc(m, x, y, z) {
    for (let i = 0; i < 4; i++) { m[i] *= x; m[4 + i] *= y; m[8 + i] *= z; }
  }
  const f4 = (v) => (Math.abs(v) < 1e-7 ? '0' : v.toFixed(Math.abs(v) >= 100 ? 2 : 5));

  function Stage(root, specs) {
    const n = (this.n = specs.length);
    this.els = [];
    this.spec = specs;
    this.p = {};
    for (const k of F) this.p[k] = new Float32Array(n);
    this.lastT = new Array(n).fill('');
    this.lastO = new Array(n).fill(-1);
    this.lastC = new Array(n).fill('');
    this.lastClip = new Array(n).fill(-1);
    this.vis = new Uint8Array(n);
    this.m = new Float64Array(16);
    this.anim = [];
    this.lastF = new Array(n).fill(-1);
    this.subEl = [];
    specs.forEach((s) => {
      const el = document.createElement('div');
      el.className = 'el ' + s.cls;
      el.style.width = s.w + 'px';
      el.style.height = s.h + 'px';
      el.style.marginLeft = -s.w / 2 + 'px';
      el.style.marginTop = -s.h / 2 + 'px';
      if (s.html) el.innerHTML = s.html;
      root.appendChild(el);
      this.els.push(el);
      if (s.lottie && window.lottie && BJ.LOTTIE) {
        const a = window.lottie.loadAnimation({ container: el, renderer: 'svg', loop: false, autoplay: false, animationData: BJ.LOTTIE[s.lottie], rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
        this.anim[this.els.length - 1] = a;
      }
    });
  }
  Stage.prototype.set = function (i, q) {
    const p = this.p;
    for (let k = 0; k < F.length; k++) p[F[k]][i] = q[F[k]];
  };
  Stage.prototype.render = function () {
    const p = this.p, m = this.m;
    for (let i = 0; i < this.n; i++) {
      const el = this.els[i], s = this.spec[i];
      const o = p.o[i], w = p.w[i], h = p.h[i];
      if (!(o > 0.002 && w > 0.05 && h > 0.05)) {
        if (this.vis[i]) { el.style.visibility = 'hidden'; this.vis[i] = 0; }
        continue;
      }
      if (!this.vis[i]) { el.style.visibility = 'visible'; this.vis[i] = 1; }
      m.fill(0); m[0] = m[5] = m[10] = m[15] = 1;
      tr(m, G.cx + p.gx[i], G.cy + p.gy[i], p.gz[i]);
      rx(m, p.grx[i]); ry(m, p.gry[i]); rz(m, p.grz[i]);
      const gs = p.gs[i];
      if (gs !== 1) sc(m, gs, gs, gs);
      tr(m, p.x[i], p.y[i], p.z[i]);
      rz(m, p.rz[i]); ry(m, p.ry[i]); rx(m, p.rx[i]);
      sc(m, w / s.w, h / s.h, 1);
      let t = 'matrix3d(';
      for (let k = 0; k < 16; k++) t += (k ? ',' : '') + f4(m[k]);
      t += ')';
      if (t !== this.lastT[i]) { el.style.transform = t; this.lastT[i] = t; }
      const oo = Math.round(Math.min(1, o) * 500) / 500;
      if (oo !== this.lastO[i]) { el.style.opacity = oo; this.lastO[i] = oo; }
      if (s.paint) {
        const c = 'rgb(' + Math.round(p.r[i]) + ',' + Math.round(p.g[i]) + ',' + Math.round(p.b[i]) + ')';
        if (c !== this.lastC[i]) {
          if (s.paint === 'border') el.style.borderColor = c; else el.style.backgroundColor = c;
          this.lastC[i] = c;
        }
      }
      const a = this.anim[i];
      if (a) {
        const f = Math.round(p.f[i] * 4) / 4;
        if (f !== this.lastF[i]) { a.goToAndStop(f, true); this.lastF[i] = f; }
        if (s.sub) {
          const se = this.subEl[i] || (this.subEl[i] = el.querySelector(s.sub));
          const so = Math.round(Math.max(0, Math.min(1, p.clip[i])) * 100) / 100;
          if (se && so !== this.lastClip[i]) { se.style.opacity = so; this.lastClip[i] = so; }
        }
      } else if (s.clip) {
        const cl = Math.round((1 - Math.max(0, Math.min(1, p.clip[i]))) * 400) / 4;
        if (cl !== this.lastClip[i]) { el.style.clipPath = el.style.webkitClipPath = 'inset(0 0 ' + cl + '% 0)'; this.lastClip[i] = cl; }
      }
    }
  };
  BJ.Stage = Stage;
})();
