import React, { useEffect, useRef } from 'react';
import { KillPatternType, Position } from '../../types/chess';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'spark' | 'flame' | 'smoke';
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  width: number;
}

interface LaserBeam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  alpha: number;
  color: string;
}

interface GallopEffect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  alpha: number;
}

interface BoardEffectsCanvasProps {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  paddingX: number;
  paddingY: number;
  flipped: boolean;
  activeEffect?: {
    type: KillPatternType;
    from?: Position;
    to?: Position;
    timestamp: number;
  };
}

export const BoardEffectsCanvas: React.FC<BoardEffectsCanvasProps> = ({
  width,
  height,
  cellWidth,
  cellHeight,
  paddingX,
  paddingY,
  flipped,
  activeEffect
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const lasersRef = useRef<LaserBeam[]>([]);
  const gallopRef = useRef<GallopEffect[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const getPixelCoord = (pos: Position): { x: number; y: number } => {
    const x = flipped ? 8 - pos[0] : pos[0];
    const y = flipped ? 9 - pos[1] : pos[1];
    return {
      x: paddingX + x * cellWidth,
      y: paddingY + y * cellHeight
    };
  };

  useEffect(() => {
    if (!activeEffect) return;

    const { type, from, to } = activeEffect;
    if (!to) return;

    const toPixel = getPixelCoord(to);
    const fromPixel = from ? getPixelCoord(from) : toPixel;

    if (type === 'wocaoma') {
      gallopRef.current.push({
        x1: fromPixel.x,
        y1: fromPixel.y,
        x2: toPixel.x,
        y2: toPixel.y,
        progress: 0,
        alpha: 1
      });

      shockwavesRef.current.push({
        x: toPixel.x,
        y: toPixel.y,
        radius: 10,
        maxRadius: cellWidth * 1.8,
        color: 'rgba(245, 158, 11, ',
        alpha: 1,
        width: 6
      });

      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particlesRef.current.push({
          x: toPixel.x,
          y: toPixel.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 4 + Math.random() * 5,
          color: Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
          alpha: 1,
          life: 0,
          maxLife: 40 + Math.random() * 30,
          shape: 'flame'
        });
      }
    } else if (type === 'zhongpao') {
      lasersRef.current.push({
        x1: fromPixel.x,
        y1: fromPixel.y,
        x2: toPixel.x,
        y2: toPixel.y,
        progress: 0,
        alpha: 1,
        color: '#f97316'
      });

      shockwavesRef.current.push({
        x: toPixel.x,
        y: toPixel.y,
        radius: 12,
        maxRadius: cellWidth * 2.2,
        color: 'rgba(239, 68, 68, ',
        alpha: 1,
        width: 8
      });

      for (let i = 0; i < 70; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 7;
        particlesRef.current.push({
          x: toPixel.x,
          y: toPixel.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 5 + Math.random() * 6,
          color: Math.random() > 0.5 ? '#f97316' : '#eab308',
          alpha: 1,
          life: 0,
          maxLife: 45 + Math.random() * 30,
          shape: 'smoke'
        });
      }
    } else if (type === 'check' || type === 'guajiaoma' || type === 'tiemenshuan') {
      shockwavesRef.current.push({
        x: toPixel.x,
        y: toPixel.y,
        radius: 8,
        maxRadius: cellWidth * 1.5,
        color: 'rgba(239, 68, 68, ',
        alpha: 1,
        width: 5
      });

      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        particlesRef.current.push({
          x: toPixel.x,
          y: toPixel.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 3 + Math.random() * 4,
          color: '#ef4444',
          alpha: 1,
          life: 0,
          maxLife: 30 + Math.random() * 20,
          shape: 'spark'
        });
      }
    } else {
      shockwavesRef.current.push({
        x: toPixel.x,
        y: toPixel.y,
        radius: 5,
        maxRadius: cellWidth * 0.9,
        color: 'rgba(217, 119, 6, ',
        alpha: 0.9,
        width: 3
      });

      for (let i = 0; i < 24; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        particlesRef.current.push({
          x: toPixel.x,
          y: toPixel.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2.5 + Math.random() * 3,
          color: '#fbbf24',
          alpha: 1,
          life: 0,
          maxLife: 25 + Math.random() * 15,
          shape: 'circle'
        });
      }
    }
  }, [activeEffect, flipped, cellWidth, cellHeight, paddingX, paddingY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, width, height);

      lasersRef.current = lasersRef.current.filter((laser) => {
        laser.progress += 0.08;
        laser.alpha -= 0.025;
        if (laser.alpha <= 0 || laser.progress > 1.3) return false;

        ctx.save();
        ctx.strokeStyle = laser.color;
        ctx.lineWidth = 6 * laser.alpha;
        ctx.shadowColor = laser.color;
        ctx.shadowBlur = 15;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(laser.x1, laser.y1);
        const curX = laser.x1 + (laser.x2 - laser.x1) * Math.min(1, laser.progress);
        const curY = laser.y1 + (laser.y2 - laser.y1) * Math.min(1, laser.progress);
        ctx.lineTo(curX, curY);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * laser.alpha;
        ctx.stroke();
        ctx.restore();

        return true;
      });

      gallopRef.current = gallopRef.current.filter((g) => {
        g.progress += 0.05;
        g.alpha -= 0.02;
        if (g.alpha <= 0 || g.progress > 1.2) return false;

        const currentX = g.x1 + (g.x2 - g.x1) * Math.min(1, g.progress);
        const currentY = g.y1 + (g.y2 - g.y1) * Math.min(1, g.progress);

        ctx.save();
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = `rgba(245, 158, 11, ${g.alpha * 0.8})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(g.x1, g.y1);
        ctx.quadraticCurveTo(
          (g.x1 + g.x2) / 2,
          Math.min(g.y1, g.y2) - 40,
          currentX,
          currentY
        );
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 230, 100, ${g.alpha})`;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      shockwavesRef.current = shockwavesRef.current.filter((wave) => {
        wave.radius += (wave.maxRadius - wave.radius) * 0.12 + 0.5;
        wave.alpha = Math.max(0, 1 - wave.radius / wave.maxRadius);

        if (wave.alpha <= 0.01 || wave.radius >= wave.maxRadius) return false;

        ctx.save();
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${wave.color}${wave.alpha})`;
        ctx.lineWidth = wave.width * wave.alpha;
        ctx.shadowColor = `${wave.color}0.8)`;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();

        return true;
      });

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.alpha <= 0 || p.life >= p.maxLife) return false;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;

        if (p.shape === 'spark') {
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 1.5, p.size * 0.6, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        return true;
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-20"
    />
  );
};
