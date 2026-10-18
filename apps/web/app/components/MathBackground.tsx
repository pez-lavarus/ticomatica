"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  angle: number;
  distance: number;
  orbitSpeed: number;
  size: number;
  symbol: string;
  type: "text" | "shape";
  opacity: number;
  targetOpacity: number;
  pulseSpeed: number;
  rotation: number;
  rotationSpeed: number;
}

const MATH_SYMBOLS = [
  "∫", "∑", "∞", "π", "θ", "λ", "Δ", "∇", "∂", "∀", "∃", "∈", "∉", "√", "∛", "∜",
  "∠", "⊥", "∥", "≅", "≈", "≠", "≡", "≤", "≥", "∓", "±", "×", "÷", "⊕", "⊗", "∅",
  "A = πr²", "e=mc²", "a²+b²=c²", "f(x)", "sinθ", "cosθ", "log", "exp", "lim", "dx",
  "0101", "G=(V,E)", "P(A)", "σ²", "μ", "Ω", "ζ", "α", "β", "γ", "δ", "ε", "η", "κ",
  "ν", "ξ", "ρ", "τ", "φ", "χ", "ψ", "ω", "ℝ", "ℕ", "ℤ", "ℚ", "ℂ", "ℏ", "ℑ", "ℜ",
  "℘", "ℵ", "ℶ", "ℷ", "ℸ", "∪", "∩", "⊂", "⊃", "⊆", "⊇", "⊄", "⊅", "⊢", "⊣", "⊨", "⊩"
];

const DRAW_SHAPES = [
  "triangle", "circle", "square", "plus", "cross", "mobius", "penrose",
  "hexagon", "diamond", "star", "rhombus", "parallelogram"
];

const renderParticle = (ctx: CanvasRenderingContext2D, p: Particle) => {
  if (p.type === "text") {
    ctx.font = `${p.size}px "Source Serif 4", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.symbol, 0, 0);
  } else {
    drawShape(ctx, p.symbol, p.size);
  }
};

const drawShape = (ctx: CanvasRenderingContext2D, symbol: string, size: number) => {
  ctx.lineWidth = 1;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.beginPath();
  const s = size / 2;
  if (symbol === "triangle") {
    ctx.moveTo(0, -s); ctx.lineTo(s, s); ctx.lineTo(-s, s); ctx.closePath();
  } else if (symbol === "circle") {
    ctx.arc(0, 0, s, 0, Math.PI * 2);
  } else if (symbol === "square") {
    ctx.rect(-s, -s, size, size);
  } else if (symbol === "plus") {
    ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.moveTo(0, -s); ctx.lineTo(0, s);
  } else if (symbol === "cross") {
    const cs = s * 0.7;
    ctx.moveTo(-cs, -cs); ctx.lineTo(cs, cs); ctx.moveTo(cs, -cs); ctx.lineTo(-cs, cs);
  } else if (symbol === "mobius") {
    for (let i = 0; i < Math.PI * 2; i += 0.2) {
      const mx = Math.cos(i) * s;
      const my = Math.sin(i * 2) * (s / 2);
      if (i === 0) ctx.moveTo(mx, my); else ctx.lineTo(mx, my);
    }
  } else if (symbol === "penrose") {
    ctx.moveTo(0, -s); ctx.lineTo(s, s/2); ctx.lineTo(-s, s/2); ctx.closePath();
    ctx.moveTo(0, -s*0.5); ctx.lineTo(s*0.5, s*0.25); ctx.lineTo(-s*0.5, s*0.25); ctx.closePath();
  } else if (symbol === "hexagon") {
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const hx = Math.cos(angle) * s;
      const hy = Math.sin(angle) * s;
      if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
  } else if (symbol === "diamond" || symbol === "rhombus") {
    ctx.moveTo(0, -s); ctx.lineTo(s*0.7, 0); ctx.lineTo(0, s); ctx.lineTo(-s*0.7, 0); ctx.closePath();
  } else if (symbol === "star") {
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5;
      const radius = i % 2 === 0 ? s : s / 2;
      const sx = Math.cos(angle) * radius;
      const sy = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
  } else if (symbol === "parallelogram") {
    ctx.moveTo(-s * 0.5, -s);
    ctx.lineTo(s * 1.5, -s);
    ctx.lineTo(s * 0.5, s);
    ctx.lineTo(-s * 1.5, s);
    ctx.closePath();
  }
  ctx.stroke();
};

export const MathBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef(0);
  const dimensions = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    let lastTime = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Track dimensions for smooth scaling
      const oldWidth = dimensions.current.width || width;
      const oldHeight = dimensions.current.height || height;
      const scaleX = width / oldWidth;
      const scaleY = height / oldHeight;
      dimensions.current = { width, height };

      init(scaleX, scaleY);
    };

    const init = (scaleX = 1, scaleY = 1) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      const density = width < 768 ? 3500 : 2500;
      const numberOfParticles = Math.min(
        Math.floor((width * height) / density),
        width < 768 ? 150 : 600
      );

      const oldParticles = [...particles];
      particles = [];

      for (let i = 0; i < numberOfParticles; i++) {
        if (i < oldParticles.length) {
          const p = oldParticles[i];
          p.baseX *= scaleX;
          p.baseY *= scaleY;
          p.x *= scaleX;
          p.y *= scaleY;
          p.distance = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
          p.angle = Math.atan2(p.y - centerY, p.x - centerX);
          particles.push(p);
          continue;
        }

        const x = Math.random() * width;
        const y = Math.random() * height;
        const isShape = Math.random() > 0.85;
        const symbol = isShape
          ? DRAW_SHAPES[Math.floor(Math.random() * DRAW_SHAPES.length)]
          : MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)];

        const dx = x - centerX;
        const dy = y - centerY;

        particles.push({
          x,
          y,
          baseX: x,
          baseY: y,
          angle: Math.atan2(dy, dx),
          distance: Math.sqrt(dx * dx + dy * dy),
          orbitSpeed: (Math.random() * 0.0002 + 0.0001) * (Math.random() > 0.5 ? 1 : -1),
          size: isShape ? Math.random() * 6 + 6 : Math.random() * 4 + 4,
          symbol,
          type: isShape ? "shape" : "text",
          opacity: Math.random() * 0.5 + 0.1,
          targetOpacity: Math.random() * 0.5 + 0.1,
          pulseSpeed: Math.random() * 0.005 + 0.001,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.002
        });
      }
    };

    const handleScroll = () => {
      scrollRef.current = window.scrollY;
    };

    const draw = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;

      // Normalize to 60fps (16.67ms per frame)
      // Limit deltaTime to avoid jumps after tab switching
      const timeScale = Math.min(deltaTime, 100) / 16.666;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const isDark = document.documentElement.classList.contains("dark");
      const baseRGB = isDark ? [255, 255, 255] : [0, 33, 71];
      const gradient = ctx.createLinearGradient(0, 0, window.innerWidth, window.innerHeight);

      if (isDark) {
        gradient.addColorStop(0, "#0F172A");
        gradient.addColorStop(1, "#1E293B");
      } else {
        gradient.addColorStop(0, "#FDFCF0");
        gradient.addColorStop(1, "#E2E8F0");
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      const scrollY = scrollRef.current;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      particles.forEach((p) => {
        // Spiral movement
        p.angle += p.orbitSpeed * timeScale;

        // Very slight inward/outward drift to make it more organic
        p.distance += Math.sin(p.angle * 0.5) * 0.05 * timeScale;

        const targetX = centerX + Math.cos(p.angle) * p.distance;
        const targetY = centerY + Math.sin(p.angle) * p.distance;

        // Smoothly interpolate to new position
        p.x += (targetX - p.x) * 0.05 * timeScale;
        p.y += (targetY - p.y) * 0.05 * timeScale;

        const parallaxY = p.y - scrollY * 0.15;
        const currentY = ((parallaxY % window.innerHeight) + window.innerHeight) % window.innerHeight;

        const drawX = p.x;
        const drawY = currentY;

        if (Math.abs(p.opacity - p.targetOpacity) < 0.01) {
          p.targetOpacity = Math.random() * 0.6 + 0.1;
        }
        // Use a fallback for pulseSpeed just in case
        const speed = p.pulseSpeed || (Math.random() * 0.005 + 0.001);
        p.opacity += (p.targetOpacity - p.opacity) * speed * timeScale;

        p.rotation += p.rotationSpeed * timeScale;

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(p.rotation);

        const alpha = Math.max(0.05, p.opacity * 0.4);

        ctx.fillStyle = `rgba(${baseRGB[0]}, ${baseRGB[1]}, ${baseRGB[2]}, ${alpha})`;
        renderParticle(ctx, p);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    const handleResize = () => {
      resize();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);

    resize();
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
    />
  );
};
