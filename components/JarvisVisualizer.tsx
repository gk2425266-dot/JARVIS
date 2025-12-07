import React, { useEffect, useRef } from 'react';
import { AssistantMode } from '../types';

interface JarvisVisualizerProps {
  isActive: boolean;
  volume: number; // 0 to 100
  mode: AssistantMode;
}

const JarvisVisualizer: React.FC<JarvisVisualizerProps> = ({ isActive, volume, mode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rotation = 0;

    // Color Configurations
    const isHomework = mode === AssistantMode.HOMEWORK;
    const isQuiz = mode === AssistantMode.GK_QUIZ;
    const isScience = mode === AssistantMode.SCIENCE;
    
    // Default (General): Cyan
    let colorPrimary = '#22d3ee'; // Cyan-400
    let colorSecondary = '#06b6d4'; // Cyan-500
    let colorDetail = '#a5f3fc'; // Cyan-200
    let glowStart = 'rgba(34, 211, 238, 0.8)';
    let glowEnd = 'rgba(34, 211, 238, 0.1)';

    if (isHomework) {
      // Purple Theme
      colorPrimary = '#c084fc'; // Purple-400
      colorSecondary = '#9333ea'; // Purple-600
      colorDetail = '#e9d5ff'; // Purple-200
      glowStart = 'rgba(192, 132, 252, 0.8)';
      glowEnd = 'rgba(192, 132, 252, 0.1)';
    } else if (isQuiz) {
      // Amber/Gold Theme
      colorPrimary = '#fbbf24'; // Amber-400
      colorSecondary = '#d97706'; // Amber-600
      colorDetail = '#fde68a'; // Amber-200
      glowStart = 'rgba(251, 191, 36, 0.8)';
      glowEnd = 'rgba(251, 191, 36, 0.1)';
    } else if (isScience) {
      // Emerald/Green Theme
      colorPrimary = '#34d399'; // Emerald-400
      colorSecondary = '#059669'; // Emerald-600
      colorDetail = '#6ee7b7'; // Emerald-300
      glowStart = 'rgba(52, 211, 153, 0.8)';
      glowEnd = 'rgba(52, 211, 153, 0.1)';
    }
    
    const colorInactive = '#4b5563'; // Gray-600
    
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Dynamic radius based on volume
      const baseRadius = 60;
      const pulse = isActive ? Math.max(0, volume) * 1.5 : 5;
      const currentRadius = baseRadius + pulse;

      // Outer Ring
      ctx.beginPath();
      ctx.strokeStyle = isActive ? colorPrimary : colorInactive;
      ctx.lineWidth = 2;
      ctx.arc(centerX, centerY, currentRadius + 40, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating Segments (The "Arc Reactor" look)
      rotation += 0.02;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      
      ctx.beginPath();
      ctx.strokeStyle = isActive ? colorSecondary : '#374151';
      ctx.lineWidth = 4;
      const segments = 3;
      for (let i = 0; i < segments; i++) {
        const angle = (Math.PI * 2 * i) / segments;
        ctx.arc(0, 0, currentRadius + 20, angle, angle + 1.5);
      }
      ctx.stroke();
      ctx.restore();

      // Inner Core
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, currentRadius);
      gradient.addColorStop(0, isActive ? glowStart : 'rgba(75, 85, 99, 0.2)');
      gradient.addColorStop(1, isActive ? glowEnd : 'rgba(75, 85, 99, 0.0)');
      ctx.fillStyle = gradient;
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner Circuit lines
      ctx.beginPath();
      ctx.strokeStyle = isActive ? colorDetail : '#9ca3af';
      ctx.lineWidth = 1;
      ctx.arc(centerX, centerY, currentRadius * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isActive, volume, mode]);

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={300} 
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
};

export default JarvisVisualizer;