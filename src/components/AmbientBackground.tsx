'use client';

import { useEffect, useRef, useState } from 'react';
import { db } from '@/lib/db';
import { MOOD_CONFIG } from '@/lib/utils';

export default function AmbientBackground({ dreamMode = false }: { dreamMode?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [latestMood, setLatestMood] = useState<number>(3);

  useEffect(() => {
    db.entries.orderBy('createdAt').last().then(entry => {
      if (entry && entry.mood) setLatestMood(entry.mood);
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: Particle[] = [];
    const stars: Star[] = [];

    interface Particle {
      x: number; y: number; size: number; speedY: number; speedX: number;
      opacity: number; color: string; life: number; maxLife: number;
    }

    interface Star {
      x: number; y: number; size: number; twinkleSpeed: number; phase: number;
    }

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},`;
    };

    const baseColor = hexToRgb(MOOD_CONFIG[latestMood as keyof typeof MOOD_CONFIG]?.color || '#E8C8A0');

    const colors = dreamMode
      ? ['rgba(196,181,224,', 'rgba(168,146,208,', 'rgba(139,111,192,']
      : [baseColor, 'rgba(196,181,224,', 'rgba(255,213,128,'];

    // Initialize stars for dream mode
    if (dreamMode) {
      for (let i = 0; i < 100; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function spawnParticle() {
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x: Math.random() * canvas!.width,
        y: canvas!.height + 10,
        size: Math.random() * 4 + 2,
        speedY: -(Math.random() * 0.5 + 0.2),
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: 0,
        color,
        life: 0,
        maxLife: Math.random() * 400 + 300,
      });
    }

    let frame = 0;
    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      frame++;

      // Spawn particles
      if (frame % (dreamMode ? 8 : 15) === 0 && particles.length < (dreamMode ? 40 : 25)) {
        spawnParticle();
      }

      // Draw stars in dream mode
      if (dreamMode) {
        stars.forEach(star => {
          const twinkle = Math.sin(frame * star.twinkleSpeed + star.phase);
          const opacity = 0.3 + twinkle * 0.4;
          ctx!.beginPath();
          ctx!.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255, 255, 255, ${Math.max(0, opacity)})`;
          ctx!.fill();
        });
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.speedX;
        p.y += p.speedY;

        // Fade in/out
        if (p.life < 60) {
          p.opacity = p.life / 60;
        } else if (p.life > p.maxLife - 60) {
          p.opacity = (p.maxLife - p.life) / 60;
        }

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `${p.color}${p.opacity * 0.6})`;
        ctx!.fill();

        // Glow effect
        if (!dreamMode) {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx!.fillStyle = `${p.color}${p.opacity * 0.1})`;
          ctx!.fill();
        }
      }

      animationId = requestAnimationFrame(animate);
    }

    animate();

    // Typing effect for Dream Mode
    const handleTyping = (e: KeyboardEvent) => {
      if (!dreamMode || e.key.length !== 1) return; // Only printable chars
      
      const color = colors[Math.floor(Math.random() * colors.length)];
      for(let j=0; j<2; j++) {
        particles.push({
          x: Math.random() * canvas!.width,
          y: canvas!.height * 0.7 + (Math.random() * 100), // Near the bottom input area
          size: Math.random() * 3 + 2,
          speedY: -(Math.random() * 2 + 1), // Faster upward speed
          speedX: (Math.random() - 0.5) * 2,
          opacity: 0.8,
          color,
          life: 0,
          maxLife: Math.random() * 100 + 50, // Shorter life
        });
      }
    };
    
    if (dreamMode) {
      window.addEventListener('keydown', handleTyping);
    }

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      if (dreamMode) window.removeEventListener('keydown', handleTyping);
    };
  }, [dreamMode, latestMood]);

  return (
    <div 
      className="ambient-bg" 
      style={{ 
        background: !dreamMode ? `radial-gradient(circle at 50% 0%, ${MOOD_CONFIG[latestMood as keyof typeof MOOD_CONFIG]?.color}22 0%, transparent 70%)` : undefined 
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    </div>
  );
}
