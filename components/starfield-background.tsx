'use client';

import { useEffect, useRef } from 'react';

type StarfieldBackgroundProps = {
  activePanel: number | null;
};

type ParticleColor = 'white' | 'cyan' | 'amber';

type GlyphParticle = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  velocityX: number;
  velocityY: number;
  homeX: number;
  homeY: number;
  size: number;
  depth: number;
  phase: number;
  delay: number;
  color: ParticleColor;
  flare: boolean;
};

type AmbientStar = {
  x: number;
  y: number;
  size: number;
  depth: number;
  phase: number;
  color: ParticleColor;
};

const COLOR_MAP = {
  white: [232, 247, 255],
  cyan: [86, 224, 232],
  amber: [244, 178, 105],
} as const;

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const smoothstep = (value: number) => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};

const randomColor = (): ParticleColor => {
  const value = Math.random();
  if (value > 0.965) return 'amber';
  if (value > 0.68) return 'cyan';
  return 'white';
};

export function StarfieldBackground({
  activePanel,
}: StarfieldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePanelRef = useRef(activePanel);
  const replayRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let glyphParticles: GlyphParticle[] = [];
    let ambientStars: AmbientStar[] = [];
    let frame = 0;
    let startedAt = performance.now();
    let lastFrameAt = startedAt;
    let pointerX = -1000;
    let pointerY = -1000;
    let pointerActive = false;
    let pointerPressed = false;
    let resizeTimer = 0;

    const createTargetPoints = () => {
      const surface = document.createElement('canvas');
      surface.width = Math.max(1, Math.round(width));
      surface.height = Math.max(1, Math.round(height));
      const surfaceContext = surface.getContext('2d', {
        willReadFrequently: true,
      });
      if (!surfaceContext) return [];

      const compact = width < 820;
      const desiredWidth = compact
        ? Math.min(width * 0.86, 570)
        : Math.min(width * 0.5, 760);
      const centerX = compact ? width * 0.5 : width * 0.31;
      const centerY = compact ? height * 0.31 : height * 0.2;
      let fontSize = compact
        ? Math.min(width * 0.27, height * 0.21)
        : Math.min(width * 0.18, height * 0.31);

      surfaceContext.font = `800 ${fontSize}px Arial, Helvetica, sans-serif`;
      const measured = surfaceContext.measureText('DTP').width;
      if (measured > desiredWidth) fontSize *= desiredWidth / measured;

      surfaceContext.clearRect(0, 0, width, height);
      surfaceContext.fillStyle = '#fff';
      surfaceContext.font = `800 ${fontSize}px Arial, Helvetica, sans-serif`;
      surfaceContext.textAlign = 'center';
      surfaceContext.textBaseline = 'middle';
      surfaceContext.fillText('DTP', centerX, centerY);

      const pixels = surfaceContext.getImageData(0, 0, width, height).data;
      const sampleGap = compact ? 5 : 6;
      const points: Array<{ x: number; y: number }> = [];
      for (let y = 0; y < height; y += sampleGap) {
        for (let x = 0; x < width; x += sampleGap) {
          const alphaIndex =
            (Math.floor(y) * surface.width + Math.floor(x)) * 4 + 3;
          if (pixels[alphaIndex] > 90) {
            points.push({
              x: x + (Math.random() - 0.5) * 1.8,
              y: y + (Math.random() - 0.5) * 1.8,
            });
          }
        }
      }

      for (let index = points.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [points[index], points[swapIndex]] = [points[swapIndex], points[index]];
      }

      return points.slice(0, compact ? 680 : 1150);
    };

    const createAmbientStars = () => {
      const count = Math.min(
        240,
        Math.max(110, Math.round((width * height) / 7000)),
      );
      ambientStars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.35 + Math.random() * 1.25,
        depth: 0.2 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        color: randomColor(),
      }));
    };

    const createGlyphParticles = (formImmediately = false) => {
      const points = createTargetPoints();
      const centerX = width < 820 ? width * 0.5 : width * 0.31;
      const centerY = width < 820 ? height * 0.31 : height * 0.2;
      const sceneRadius = Math.max(width, height) * 0.62;

      glyphParticles = points.map((point, index) => {
        const angle = index * 0.215 + Math.random() * Math.PI * 2;
        const radius = sceneRadius * (0.16 + Math.pow(Math.random(), 0.62));
        const startX = formImmediately
          ? point.x
          : centerX + Math.cos(angle) * radius;
        const startY = formImmediately
          ? point.y
          : centerY + Math.sin(angle) * radius * 0.68;
        const tangentialSpeed = formImmediately ? 0 : 0.45 + Math.random() * 1.3;
        return {
          x: startX,
          y: startY,
          previousX: startX,
          previousY: startY,
          velocityX: -Math.sin(angle) * tangentialSpeed,
          velocityY: Math.cos(angle) * tangentialSpeed * 0.72,
          homeX: point.x,
          homeY: point.y,
          size: 0.55 + Math.pow(Math.random(), 2.4) * 2.15,
          depth: 0.25 + Math.random() * 0.75,
          phase: Math.random() * Math.PI * 2,
          delay: Math.random() * 720,
          color: randomColor(),
          flare: Math.random() > 0.977,
        };
      });

      startedAt = performance.now();
      lastFrameAt = startedAt;
    };

    const drawGlow = (
      x: number,
      y: number,
      radius: number,
      color: readonly [number, number, number],
      alpha: number,
    ) => {
      const glow = context.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(
        0,
        `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`,
      );
      glow.addColorStop(
        0.22,
        `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.34})`,
      );
      glow.addColorStop(
        1,
        `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`,
      );
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    };

    const draw = (time: number) => {
      const seconds = time * 0.001;
      const elapsed = time - startedAt;
      const delta = clamp((time - lastFrameAt) / 16.667, 0.25, 2.25);
      lastFrameAt = time;
      context.clearRect(0, 0, width, height);

      context.globalCompositeOperation = 'source-over';
      const glowCenterX = width < 820 ? width * 0.5 : width * 0.34;
      const glowCenterY = width < 820 ? height * 0.3 : height * 0.2;
      const atmosphericGlow = context.createRadialGradient(
        glowCenterX,
        glowCenterY,
        0,
        glowCenterX,
        glowCenterY,
        Math.max(width * 0.5, height * 0.6),
      );
      atmosphericGlow.addColorStop(0, 'rgba(40, 116, 139, 0.105)');
      atmosphericGlow.addColorStop(0.48, 'rgba(16, 66, 86, 0.042)');
      atmosphericGlow.addColorStop(1, 'rgba(3, 7, 13, 0)');
      context.fillStyle = atmosphericGlow;
      context.fillRect(0, 0, width, height);

      context.globalCompositeOperation = 'lighter';
      for (const star of ambientStars) {
        const drift = reduceMotion.matches
          ? 0
          : seconds * (0.2 + star.depth * 0.52);
        const x = (star.x + drift * 2.4) % width;
        const y =
          star.y + Math.sin(seconds * 0.08 + star.phase) * star.depth * 2;
        const pulse = reduceMotion.matches
          ? 0.6
          : 0.42 +
            Math.sin(seconds * (0.45 + star.depth) + star.phase) * 0.22;
        const [red, green, blue] = COLOR_MAP[star.color];
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${Math.max(0.1, pulse)})`;
        context.beginPath();
        context.arc(x, y, star.size * star.depth, 0, Math.PI * 2);
        context.fill();
      }

      const pointerRadius =
        (width < 820 ? 82 : 124) * (pointerPressed ? 1.18 : 1);
      for (const particle of glyphParticles) {
        particle.previousX = particle.x;
        particle.previousY = particle.y;

        const formation = reduceMotion.matches
          ? 1
          : smoothstep((elapsed - 240 - particle.delay) / 1580);
        const breathing = reduceMotion.matches
          ? 0
          : Math.sin(seconds * 0.72 + particle.phase) *
            0.7 *
            particle.depth;
        const targetX = particle.homeX + breathing;
        const targetY =
          particle.homeY +
          Math.cos(seconds * 0.58 + particle.phase) * 0.48;
        const spring = (0.006 + formation * 0.036) * delta;
        particle.velocityX += (targetX - particle.x) * spring;
        particle.velocityY += (targetY - particle.y) * spring;

        if (pointerActive && formation > 0.72) {
          const dx = particle.x - pointerX;
          const dy = particle.y - pointerY;
          const distance = Math.hypot(dx, dy) || 0.001;
          if (distance < pointerRadius) {
            const proximity = 1 - distance / pointerRadius;
            const force =
              proximity *
              proximity *
              (pointerPressed ? 3.8 : 2.05) *
              delta;
            particle.velocityX += (dx / distance) * force;
            particle.velocityY += (dy / distance) * force;
            particle.velocityX +=
              (-dy / distance) * proximity * 0.13 * delta;
            particle.velocityY +=
              (dx / distance) * proximity * 0.13 * delta;
          }
        }

        const damping = Math.pow(0.875 - formation * 0.018, delta);
        particle.velocityX *= damping;
        particle.velocityY *= damping;
        particle.x += particle.velocityX * delta;
        particle.y += particle.velocityY * delta;

        const [red, green, blue] = COLOR_MAP[particle.color];
        const displacement = Math.hypot(
          particle.x - particle.homeX,
          particle.y - particle.homeY,
        );
        const twinkle = reduceMotion.matches
          ? 0.86
          : 0.72 + Math.sin(seconds * 1.35 + particle.phase) * 0.22;
        const alpha = clamp(
          (0.28 + particle.depth * 0.72) *
            twinkle *
            (0.3 + formation * 0.7),
          0.04,
          1,
        );
        const radius = particle.size * (0.55 + particle.depth * 0.58);

        if (
          (formation < 0.97 || displacement > 14) &&
          !reduceMotion.matches
        ) {
          context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${alpha * 0.12})`;
          context.lineWidth = Math.max(0.35, radius * 0.42);
          context.beginPath();
          context.moveTo(particle.previousX, particle.previousY);
          context.lineTo(particle.x, particle.y);
          context.stroke();
        }

        if (particle.flare || (radius > 1.75 && alpha > 0.72)) {
          drawGlow(
            particle.x,
            particle.y,
            particle.flare ? radius * 12 : radius * 6,
            COLOR_MAP[particle.color],
            particle.flare ? alpha * 0.2 : alpha * 0.08,
          );
        }

        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        context.beginPath();
        context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        context.fill();

        if (particle.flare && formation > 0.85) {
          context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${alpha * 0.28})`;
          context.lineWidth = 0.55;
          context.beginPath();
          context.moveTo(particle.x - radius * 5.5, particle.y);
          context.lineTo(particle.x + radius * 5.5, particle.y);
          context.moveTo(particle.x, particle.y - radius * 5.5);
          context.lineTo(particle.x, particle.y + radius * 5.5);
          context.stroke();
        }
      }

      const selected = activePanelRef.current;
      if (selected !== null) {
        const focusX = width * (width < 820 ? 0.5 : 0.78);
        const focusY = height * (0.28 + selected * 0.235);
        drawGlow(
          focusX,
          focusY,
          Math.max(150, width * 0.15),
          selected === 2 ? COLOR_MAP.amber : COLOR_MAP.cyan,
          0.12,
        );
      }

      context.globalCompositeOperation = 'source-over';
      if (!reduceMotion.matches) frame = requestAnimationFrame(draw);
    };

    const resize = (animateEntrance = false) => {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.65);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      createAmbientStars();
      createGlyphParticles(reduceMotion.matches || !animateEntrance);
      if (reduceMotion.matches) draw(performance.now());
    };

    const replay = () => {
      if (reduceMotion.matches) return;
      createGlyphParticles(false);
    };

    replayRef.current = replay;

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerActive = true;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest('a, button')) return;
      pointerPressed = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerActive = true;
    };

    const handlePointerUp = () => {
      pointerPressed = false;
    };

    const handlePointerLeave = () => {
      pointerActive = false;
      pointerPressed = false;
    };

    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => resize(false), 120);
    };

    const handleMotionPreference = () => {
      cancelAnimationFrame(frame);
      resize(!reduceMotion.matches);
      if (!reduceMotion.matches) frame = requestAnimationFrame(draw);
    };

    resize(true);
    if (!reduceMotion.matches) frame = requestAnimationFrame(draw);
    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);
    reduceMotion.addEventListener('change', handleMotionPreference);

    return () => {
      replayRef.current = null;
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.documentElement.removeEventListener(
        'pointerleave',
        handlePointerLeave,
      );
      reduceMotion.removeEventListener('change', handleMotionPreference);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="starfield" aria-hidden="true" />
      <div className="starfield-ambient" aria-hidden="true" />
      <button
        className="starfield-replay"
        type="button"
        aria-label="Phát lại hiệu ứng hạt tạo chữ DTP"
        title="Phát lại hiệu ứng DTP"
        onClick={() => replayRef.current?.()}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M20 6v5h-5M4.9 16.2a8 8 0 0 0 13.5-2.1M4 18v-5h5M19.1 7.8A8 8 0 0 0 5.6 9.9" />
        </svg>
      </button>
    </>
  );
}
