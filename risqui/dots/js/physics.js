/* A small impulse-based circle solver — a nod to the hand-rolled rigid-body
   engine that runs me.bartj.blog. Sub-stepped, sequential impulses with
   positional correction and a little sleeping so the pile comes to rest. */
(function () {
  'use strict';
  const BJ = window.BJ;

  function World(n) {
    this.n = n;
    for (const k of ['x', 'y', 'vx', 'vy', 'r', 'cool']) this[k] = new Float32Array(n);
    this.active = false;
  }

  World.prototype.step = function (dt, opt) {
    const n = this.n, x = this.x, y = this.y, vx = this.vx, vy = this.vy, r = this.r, cool = this.cool;
    const { g, floor, left, right, onImpact, thr } = opt;
    dt = Math.min(dt, 1 / 20);
    const subs = Math.max(1, Math.min(8, Math.ceil(dt / (1 / 240))));
    const h = dt / subs;
    const e = 0.28, eF = 0.32;
    for (let i = 0; i < n; i++) cool[i] = Math.max(0, cool[i] - dt);

    for (let s = 0; s < subs; s++) {
      for (let i = 0; i < n; i++) {
        vy[i] += g * h;
        x[i] += vx[i] * h;
        y[i] += vy[i] * h;
      }
      for (let it = 0; it < 6; it++) {
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const dx = x[j] - x[i], dy = y[j] - y[i], rs = r[i] + r[j];
            const d2 = dx * dx + dy * dy;
            if (d2 >= rs * rs || d2 < 1e-6) continue;
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
            const c = Math.max(0, rs - d - 0.3) * 0.5;
            x[i] -= nx * c; y[i] -= ny * c;
            x[j] += nx * c; y[j] += ny * c;
            const vn = (vx[j] - vx[i]) * nx + (vy[j] - vy[i]) * ny;
            if (vn < 0) {
              const imp = (-(1 + (-vn > thr * 0.5 ? e : 0)) * vn) / 2;
              vx[i] -= imp * nx; vy[i] -= imp * ny;
              vx[j] += imp * nx; vy[j] += imp * ny;
              // tangential friction
              const tx = -ny, ty = nx;
              const vt = (vx[j] - vx[i]) * tx + (vy[j] - vy[i]) * ty;
              const f = vt * 0.1;
              vx[i] += f * tx; vy[i] += f * ty;
              vx[j] -= f * tx; vy[j] -= f * ty;
              if (it === 0 && -vn > thr && cool[i] === 0 && cool[j] === 0) {
                cool[i] = cool[j] = 0.12;
                onImpact((x[i] + x[j]) / 2, -vn);
              }
            }
          }
        }
        for (let i = 0; i < n; i++) {
          if (y[i] + r[i] > floor) {
            y[i] = floor - r[i];
            if (vy[i] > 0) {
              if (it === 0 && vy[i] > thr && cool[i] === 0) { cool[i] = 0.12; onImpact(x[i], vy[i]); }
              vy[i] = vy[i] > thr * 0.5 ? -vy[i] * eF : 0;
              vx[i] *= 0.9;
            }
          }
          if (x[i] - r[i] < left) { x[i] = left + r[i]; if (vx[i] < 0) vx[i] = -vx[i] * 0.4; }
          if (x[i] + r[i] > right) { x[i] = right - r[i]; if (vx[i] > 0) vx[i] = -vx[i] * 0.4; }
        }
      }
      // sleeping: quiet the micro-jitter of a settled pile
      const sleep = thr * 0.12;
      for (let i = 0; i < n; i++) {
        if (Math.abs(vx[i]) + Math.abs(vy[i]) < sleep) { vx[i] *= 0.8; vy[i] *= 0.8; }
      }
    }
  };

  BJ.World = World;
})();
