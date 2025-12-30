
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../services/GameEngine';
import { WORLD_SIZE, SPECIAL_ITEMS_CONFIG, FOOD_TIERS } from '../constants';

interface LeaderboardEntry {
  name: string;
  score: number;
  isPlayer: boolean;
}

interface GameCanvasProps {
  onScoreUpdate: (score: number) => void;
  onLeaderboardUpdate: (leaders: LeaderboardEntry[]) => void;
  onGameOver: () => void;
  playerName: string;
  isPaused: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onScoreUpdate, onLeaderboardUpdate, onGameOver, playerName, isPaused }) => {
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

      const leaders = [...engine.state.snakes]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(s => ({ name: s.name, score: Math.floor(s.score), isPlayer: s.isPlayer }));
      onLeaderboardUpdate(leaders);
      
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
        const zoom = Math.max(0.35, 1 - (player.length - 10) * 0.00035);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-head.x, -head.y);
      }

      // Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const step = 400;
      for (let x = 0; x <= worldSize; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, worldSize); ctx.stroke();
      }
      for (let y = 0; y <= worldSize; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(worldSize, y); ctx.stroke();
      }

      // Boundary
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 20;
      ctx.strokeRect(0, 0, worldSize, worldSize);

      // Trails
      engineRef.current.state.trails.forEach(p => {
        ctx.globalAlpha = p.life * 0.5;
        ctx.shadowBlur = 10 * p.life;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      // Knives
      engineRef.current.state.knives.forEach(knife => {
        ctx.save();
        ctx.translate(knife.x, knife.y);
        ctx.rotate(knife.angle);
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'white';
        ctx.fillStyle = '#e2e8f0';
        // Knife shape (rectangle + triangle tip)
        ctx.beginPath();
        ctx.moveTo(-15, -4);
        ctx.lineTo(5, -4);
        ctx.lineTo(15, 0);
        ctx.lineTo(5, 4);
        ctx.lineTo(-15, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // Food
      engineRef.current.state.foods.forEach(food => {
        let glowSize = 8;
        if (food.value >= FOOD_TIERS.RARE.value) {
          glowSize = 25 + Math.sin(time / 150) * 10;
          ctx.shadowBlur = glowSize;
          ctx.shadowColor = '#ffffff';
        } else if (food.value >= FOOD_TIERS.LARGE.value) {
          glowSize = 15 + Math.sin(time / 200) * 5;
          ctx.shadowBlur = glowSize;
          ctx.shadowColor = food.color;
        } else {
          ctx.shadowBlur = 8;
          ctx.shadowColor = food.color;
        }

        ctx.fillStyle = food.color;
        ctx.beginPath();
        ctx.arc(food.x, food.y, food.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Special Items
      engineRef.current.state.specialItems.forEach(item => {
        if (!item.isAvailable) return;
        const config = SPECIAL_ITEMS_CONFIG[item.type];
        const pulse = Math.sin(time / 200) * 8 + 20;
        ctx.shadowBlur = pulse;
        ctx.shadowColor = config.color;
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(config.label, item.x, item.y);
      });

      // Snakes
      engineRef.current.state.snakes.forEach(snake => {
        const isInvincible = snake.invincibilityEndTime > time;
        const isFast = snake.speedBoostEndTime > time;
        const hasMagnet = snake.magnetEndTime > time;
        const hasScouter = snake.scouterEndTime > time;
        const isSlicer = snake.slicerEndTime > time;

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        const bodyWidth = 20 + Math.min(100, snake.length * 0.1);
        ctx.lineWidth = bodyWidth;
        
        if (isInvincible) {
          ctx.shadowBlur = 30;
          ctx.shadowColor = '#60a5fa'; 
        } else if (isFast) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#f59e0b'; 
        } else if (hasMagnet) {
          ctx.shadowBlur = 25;
          ctx.shadowColor = '#f43f5e';
        } else if (hasScouter) {
          ctx.shadowBlur = 25;
          ctx.shadowColor = '#a855f7';
        } else if (isSlicer) {
          ctx.shadowBlur = 25;
          ctx.shadowColor = '#94a3b8';
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
        gradient.addColorStop(0, (isInvincible || isSlicer) ? '#ffffff' : snake.color);
        gradient.addColorStop(1, '#000000');
        ctx.strokeStyle = gradient;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        let statusIcons = '';
        if (isInvincible) statusIcons += ' 😇';
        if (isFast) statusIcons += ' ⚡';
        if (hasMagnet) statusIcons += ' 🧲';
        if (hasScouter) statusIcons += ' 🔍';
        if (isSlicer) statusIcons += ' ⚔️';
        ctx.fillText(snake.name + statusIcons, snake.segments[0].x, snake.segments[0].y - bodyWidth/2 - 25);
      });

      // Mini Map
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const mmSize = Math.min(canvas.width * 0.22, 220);
      const mmX = canvas.width - mmSize - 20;
      const mmY = canvas.height - mmSize - 20;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(mmX, mmY, mmSize, mmSize);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(mmX, mmY, mmSize, mmSize);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      engineRef.current.state.foods.forEach((f, i) => {
        if (i % 10 === 0 && f.value > 5) {
          const sx = mmX + (f.x / worldSize) * mmSize;
          const sy = mmY + (f.y / worldSize) * mmSize;
          ctx.fillRect(sx, sy, 1, 1);
        }
      });

      const isPlayerScouting = player && player.scouterEndTime > time;
      if (isPlayerScouting) {
        engineRef.current.state.specialItems.forEach(item => {
          if (!item.isAvailable) return;
          const sx = mmX + (item.x / worldSize) * mmSize;
          const sy = mmY + (item.y / worldSize) * mmSize;
          ctx.fillStyle = SPECIAL_ITEMS_CONFIG[item.type].color;
          ctx.beginPath();
          ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      engineRef.current.state.snakes.forEach(snake => {
        const sx = mmX + (snake.segments[0].x / worldSize) * mmSize;
        const sy = mmY + (snake.segments[0].y / worldSize) * mmSize;
        ctx.fillStyle = snake.isPlayer ? 'white' : snake.color;
        ctx.beginPath();
        ctx.arc(sx, sy, snake.isPlayer ? 4 : 2, 0, Math.PI * 2);
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
  }, [resize, playerName, onScoreUpdate, onLeaderboardUpdate, onGameOver, isPaused]);

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
      className="block cursor-crosshair touch-none"
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
