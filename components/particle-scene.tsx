'use client';

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Canvas renders an interactive image; an img cannot expose the renderer. */

import { useEffect, useRef, useState } from 'react';
import { createTraffic, drawTraffic } from './space-traffic';
import { loadShipAtlas, renderShip } from './ship-renderer';

type Particle = {
  x: number;
  y: number;
  z: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  angle: number;
  orbit: number;
  size: number;
  light: number;
  color: number;
  phase: number;
};
const colors = ['226,242,255', '140,210,242', '245,194,158'];

// Continuous strokes make a cloud of stars rather than a sampled pixel grid.
function strokePoint(t: number): [number, number] {
  const letter = Math.floor(t * 3);
  const u = t * 3 - letter;
  if (letter === 0) {
    if (u < 0.32) return [-1.12, -0.48 + (u / 0.32) * 0.96];
    const a = -Math.PI / 2 + ((u - 0.32) / 0.68) * Math.PI;
    return [-1.12 + Math.cos(a) * 0.55, Math.sin(a) * 0.48];
  }
  if (letter === 1) {
    if (u < 0.43) return [-0.39 + (u / 0.43) * 0.68, -0.48];
    return [-0.05, -0.48 + ((u - 0.43) / 0.57) * 0.96];
  }
  if (u < 0.4) return [0.5, 0.48 - (u / 0.4) * 0.96];
  const a = -Math.PI / 2 + ((u - 0.4) / 0.6) * Math.PI;
  return [0.5 + Math.cos(a) * 0.49, -0.23 + Math.sin(a) * 0.25];
}

export function ParticleScene() {
  const ref = useRef<HTMLCanvasElement>(null);
  const replay = useRef<() => void>(() => {});
  const pause = useRef(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1,
      height = 1,
      scale = 1,
      frame = 0,
      last = 0,
      elapsed = 0;
    let mx = -10000,
      my = -10000,
      down = false,
      lastX = 0,
      lastY = 0,
      tiltX = 0,
      tiltY = 0;
    const particles: Particle[] = [];
    const random = () => Math.random() + Math.random() + Math.random() - 1.5;
    for (let i = 0; i < 2700; i++) {
      const [x, y] = strokePoint(Math.random() * 0.99999);
      const core = Math.random();
      particles.push({
        x: x + random() * 0.036,
        y: y + random() * 0.036,
        z: random() * 0.08,
        ox: 0,
        oy: 0,
        vx: 0,
        vy: 0,
        angle: Math.random() * Math.PI * 2,
        orbit: 0.45 + Math.random() * 1.65,
        size:
          core > 0.965
            ? 1.7 + Math.random() * 1.2
            : core > 0.78
              ? 0.8 + Math.random() * 0.5
              : 0.28 + Math.random() * 0.42,
        light: 0.35 + Math.random() * 0.65,
        color: Math.random() < 0.13 ? 2 : Math.random() < 0.45 ? 1 : 0,
        phase: Math.random() * 6.28,
      });
    }
    const background = Array.from({ length: 180 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.25 + Math.random() * 0.65,
      a: 0.1 + Math.random() * 0.4,
    }));
    // Sparse background transits, drawn before the DTP particles.
    const traffic = createTraffic();
    const shipAtlas = loadShipAtlas();
    const paintShip = (context: CanvasRenderingContext2D, model: number, t: number, now: number, w: number, size: number) =>
      renderShip(context, shipAtlas, model, t, now, w, size);
    const sprites = colors.map((color) => {
      const s = document.createElement('canvas');
      s.width = 64;
      s.height = 64;
      const c = s.getContext('2d')!;
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.075, `rgba(${color},.95)`);
      g.addColorStop(0.19, `rgba(${color},.3)`);
      g.addColorStop(0.48, `rgba(${color},.055)`);
      g.addColorStop(1, `rgba(${color},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      return s;
    });
    const resize = () => {
      const box = canvas.getBoundingClientRect();
      width = box.width;
      height = box.height;
      scale = Math.min(width * 0.32, height * 0.65, 350);
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const draw = (time: number) => {
      const dt = Math.min((time - last) / 1000 || 0.016, 0.035);
      last = time;
      if (!pause.current && !motion.matches && !document.hidden) elapsed += dt;
      const still = pause.current || motion.matches || document.hidden;
      const progress = motion.matches ? 1 : Math.min(1, elapsed / 3.8);
      const ease = progress * progress * (3 - 2 * progress);
      ctx.clearRect(0, 0, width, height);
      for (const star of background) {
        ctx.fillStyle = `rgba(184,217,237,${star.a})`;
        ctx.fillRect(star.x * width, star.y * height, star.r, star.r);
      }
      ctx.globalCompositeOperation = 'lighter';
      if (!motion.matches) {
        const flight = traffic.tick(elapsed);
        if (flight) drawTraffic(ctx, flight, elapsed, width, height, paintShip);
      }
      if (!down && !still) {
        tiltX *= Math.pow(0.91, dt * 60);
        tiltY *= Math.pow(0.91, dt * 60);
      }
      const ry =
          tiltX + (motion.matches ? 0 : Math.sin(elapsed * 0.18) * 0.035),
        rx = tiltY;
      for (const p of particles) {
        const angle = p.angle + elapsed * 0.55;
        const sx = Math.cos(angle) * p.orbit,
          sy = Math.sin(angle) * p.orbit * 0.65;
        const x = p.x * ease + sx * (1 - ease),
          y = p.y * ease + sy * (1 - ease);
        const z = p.z + Math.sin(p.phase + elapsed * 0.4) * 0.003;
        const x3 = x * Math.cos(ry) + z * Math.sin(ry),
          z3 = -x * Math.sin(ry) + z * Math.cos(ry);
        const y3 = y * Math.cos(rx) - z3 * Math.sin(rx);
        const perspective = 2.7 / (2.7 + z3);
        const tx = width * 0.5 + x3 * scale * perspective,
          ty = height * 0.48 + y3 * scale * perspective;
        if (!still) {
          const dx = tx + p.ox - mx,
            dy = ty + p.oy - my,
            d = Math.hypot(dx, dy) || 1;
          const radius = Math.min(width * 0.16, 105);
          if (d < radius && progress > 0.85) {
            const force = (1 - d / radius) ** 2 * (down ? 3.6 : 2.3);
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
          }
          p.vx += -p.ox * 0.022;
          p.vy += -p.oy * 0.022;
          const damp = Math.pow(0.86, dt * 60);
          p.vx *= damp;
          p.vy *= damp;
          p.ox += p.vx * dt * 60;
          p.oy += p.vy * dt * 60;
        }
        const px = tx + p.ox,
          py = ty + p.oy;
        const alpha =
          p.light *
          (0.78 + Math.sin(elapsed * 0.7 + p.phase) * 0.16) *
          (0.5 + ease * 0.5);
        const size = p.size * Math.max(0.72, scale / 310) * perspective;
        if (p.size > 1.5) {
          ctx.globalAlpha = alpha;
          const s = size * 15;
          ctx.drawImage(sprites[p.color], px - s / 2, py - s / 2, s, s);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = `rgba(${colors[p.color]},${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      frame = requestAnimationFrame(draw);
    };
    replay.current = () => {
      elapsed = 0;
      traffic.reset();
      tiltX = 0;
      tiltY = 0;
      particles.forEach((p) => {
        p.ox = p.oy = p.vx = p.vy = 0;
      });
    };
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
      if (down) {
        tiltX = Math.max(
          -0.65,
          Math.min(0.65, tiltX + (e.clientX - lastX) * 0.004),
        );
        tiltY = Math.max(
          -0.35,
          Math.min(0.35, tiltY + (e.clientY - lastY) * 0.003),
        );
      }
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const press = (e: PointerEvent) => {
      down = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      move(e);
    };
    const release = (e: PointerEvent) => {
      down = false;
      if (e.pointerType !== 'mouse') mx = my = -10000;
    };
    const leave = () => {
      if (!down) mx = my = -10000;
    };
    const keys = (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        tiltX +=
          e.key === 'ArrowLeft' ? -0.15 : e.key === 'ArrowRight' ? 0.15 : 0;
        tiltY += e.key === 'ArrowUp' ? -0.1 : e.key === 'ArrowDown' ? 0.1 : 0;
      }
    };
    const summon = (e: KeyboardEvent) => {
      if (e.code !== 'KeyS' || !e.ctrlKey || !e.altKey || e.shiftKey || e.metaKey || e.repeat || e.isComposing) return;
      const target = e.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select'))) return;
      if (motion.matches || pause.current || document.hidden) return;
      e.preventDefault();
      traffic.summon(elapsed);
    };
    window.addEventListener('keydown', summon);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', press);
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('keydown', keys);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      shipAtlas.image.onload = null;
      shipAtlas.image.onerror = null;
      window.removeEventListener('keydown', summon);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerdown', press);
      canvas.removeEventListener('pointerup', release);
      canvas.removeEventListener('pointercancel', release);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('keydown', keys);
    };
  }, []);
  return (
    <>
      <canvas
        ref={ref}
        className="particle-canvas"
        tabIndex={0}
        role="img"
        aria-label="Trường sao DTP. Di chuyển con trỏ để đẩy hạt; kéo hoặc dùng phím mũi tên để xoay."
      />
      <div className="scene-controls">
        <button
          type="button"
          aria-label={paused ? 'Tiếp tục chuyển động' : 'Tạm dừng chuyển động'}
          onClick={() => {
            pause.current = !pause.current;
            setPaused(pause.current);
          }}
        >
          <svg viewBox="0 0 24 24">
            {paused ? (
              <path d="m9 5 10 7-10 7Z" />
            ) : (
              <path d="M9 6v12M15 6v12" />
            )}
          </svg>
        </button>
        <button
          type="button"
          aria-label="Phát lại hiệu ứng DTP"
          onClick={() => {
            pause.current = false;
            setPaused(false);
            replay.current();
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" />
          </svg>
        </button>
      </div>
    </>
  );
}
