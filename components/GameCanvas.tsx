
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../services/GameEngine';
import { WORLD_SIZE, SPECIAL_ITEMS_CONFIG } from '../constants';

interface GameCanvasProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: () => void;
  playerName: string;
  isPaused: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onScoreUpdate, onGameOver, playerName, isPaused }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine>(new GameEngine());
  const requestRef = useRef<number | undefined>(undefined);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const resize = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', resize);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (e.code === 'Space') {
        const player = engineRef.current.state.player;
        if (player) player.isBoosting = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      if (e.code === 'Space') {
        const player = engineRef.current.state.player;
        if (player) player.isBoosting = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    resize();
    
    const engine = engineRef.current;
    engine.spawnPlayer(playerName);

    const animate = (time: number) => {
      if (!isPaused) {
        updateKeyboardInput();
        engine.update(time);
      }
      
      render(time);
      
      const player = engine.state.player;
      if (player) {
        onScoreUpdate(Math.floor(player.score));
      }
      
      if (engine.state.isGameOver) {
        onGameOver();
      } else {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    const updateKeyboardInput = () => {
      const player = engine.state.player;
      if (!player) return;

      let dx = 0;
      let dy = 0;

      if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;

      if (dx !== 0 || dy !== 0) {
        player.targetAngle = Math.atan2(dy, dx);
      }
    };

    const render = (time: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const player = engineRef.current.state.player;
      const worldSize = engineRef.current.state.worldSize;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (player) {
        const head = player.segments[0];
        const zoom = Math.max(0.5, 1 - (player.length - 10) * 0.0005);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-head.x, -head.y);
      }

      // Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const step = 100;
      for (let x = 0; x <= worldSize; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, worldSize); ctx.stroke();
      }
      for (let y = 0; y <= worldSize; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(worldSize, y); ctx.stroke();
      }

      // Boundary
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 5;
      ctx.strokeRect(0, 0, worldSize, worldSize);

      // Food
      engineRef.current.state.foods.forEach(food => {
        ctx.fillStyle = food.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = food.color;
        ctx.beginPath();
        ctx.arc(food.x, food.y, food.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Special Items
      engineRef.current.state.specialItems.forEach(item => {
        if (!item.isAvailable) return;
        const config = SPECIAL_ITEMS_CONFIG[item.type];
        
        // Glow Pulse
        const pulse = Math.sin(time / 200) * 5 + 15;
        ctx.shadowBlur = pulse;
        ctx.shadowColor = config.color;
        
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(config.label, item.x, item.y);
      });

      // Snakes
      engineRef.current.state.snakes.forEach(snake => {
        const isInvincible = snake.invincibilityEndTime > time;
        const isFast = snake.speedBoostEndTime > time;

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        const bodyWidth = 20 + Math.min(60, snake.length * 0.15);
        ctx.lineWidth = bodyWidth;
        
        // Efeitos visuais por estado
        if (isInvincible) {
          ctx.shadowBlur = 25;
          ctx.shadowColor = '#60a5fa'; // Aura anjinho
        } else if (isFast) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#f59e0b'; // Aura raio
        } else {
          ctx.shadowBlur = 15;
          ctx.shadowColor = snake.color;
        }
        
        ctx.beginPath();
        snake.segments.forEach((seg, i) => {
          if (i === 0) ctx.moveTo(seg.x, seg.y);
          else ctx.lineTo(seg.x, seg.y);
        });
        
        const gradient = ctx.createLinearGradient(
            snake.segments[0].x, snake.segments[0].y, 
            snake.segments[snake.segments.length-1].x, snake.segments[snake.segments.length-1].y
        );
        gradient.addColorStop(0, isInvincible ? '#ffffff' : snake.color);
        gradient.addColorStop(1, '#000000');
        ctx.strokeStyle = gradient;
        ctx.stroke();

        // Nome e ícones de status
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        let statusIcons = '';
        if (isInvincible) statusIcons += ' 😇';
        if (isFast) statusIcons += ' ⚡';
        ctx.fillText(snake.name + statusIcons, snake.segments[0].x, snake.segments[0].y - bodyWidth/2 - 20);
      });

      // Mini Map
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const mmSize = 150;
      const mmX = canvas.width - mmSize - 20;
      const mmY = canvas.height - mmSize - 20;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(mmX, mmY, mmSize, mmSize);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.strokeRect(mmX, mmY, mmSize, mmSize);
      
      // Desenhar itens especiais no mapa
      engineRef.current.state.specialItems.forEach(item => {
        if (!item.isAvailable) return;
        const sx = mmX + (item.x / worldSize) * mmSize;
        const sy = mmY + (item.y / worldSize) * mmSize;
        ctx.fillStyle = SPECIAL_ITEMS_CONFIG[item.type].color;
        ctx.fillRect(sx - 1, sy - 1, 3, 3);
      });

      engineRef.current.state.snakes.forEach(snake => {
        const sx = mmX + (snake.segments[0].x / worldSize) * mmSize;
        const sy = mmY + (snake.segments[0].y / worldSize) * mmSize;
        ctx.fillStyle = snake.isPlayer ? 'white' : snake.color;
        ctx.beginPath();
        ctx.arc(sx, sy, snake.isPlayer ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [resize, playerName, onScoreUpdate, onGameOver, isPaused]);

  const handleInput = (clientX: number, clientY: number) => {
    if (isPaused) return;
    const player = engineRef.current.state.player;
    if (!player) return;
    const dx = clientX - window.innerWidth / 2;
    const dy = clientY - window.innerHeight / 2;
    player.targetAngle = Math.atan2(dy, dx);
  };

  const handleMouseMove = (e: React.MouseEvent) => handleInput(e.clientX, e.clientY);
  const handleTouchMove = (e: React.TouchEvent) => handleInput(e.touches[0].clientX, e.touches[0].clientY);
  
  const handleMouseDown = () => {
    if (isPaused) return;
    const player = engineRef.current.state.player;
    if (player) player.isBoosting = true;
  };
  const handleMouseUp = () => {
    const player = engineRef.current.state.player;
    if (player) player.isBoosting = false;
  };

  return (
    <canvas
      ref={canvasRef}
      className="block cursor-crosshair"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    />
  );
};

export default GameCanvas;
