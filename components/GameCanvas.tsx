
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../services/GameEngine';
import { WORLD_SIZE, SPECIAL_ITEMS_CONFIG, FOOD_TIERS } from '../constants';
import { SpecialItemType } from '../types';

interface LeaderboardEntry {
  name: string;
  score: number;
  isPlayer: boolean;
}

export interface ActivePowerup {
  type: SpecialItemType;
  timeLeft: number;
  label: string;
  icon: string;
  color: string;
}

interface GameCanvasProps {
  onScoreUpdate: (score: number) => void;
  onLeaderboardUpdate: (leaders: LeaderboardEntry[]) => void;
  onPowerupsUpdate?: (powerups: ActivePowerup[]) => void;
  onGameOver: () => void;
  playerName: string;
  isPaused: boolean;
  enabledItems: Record<SpecialItemType, boolean>;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onScoreUpdate, onLeaderboardUpdate, onPowerupsUpdate, onGameOver, playerName, isPaused, enabledItems }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
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
        const player = engineRef.current?.state.player;
        if (player) player.isBoosting = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      if (e.code === 'Space') {
        const player = engineRef.current?.state.player;
        if (player) player.isBoosting = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    resize();
    
    const engine = new GameEngine(enabledItems);
    engineRef.current = engine;
    engine.spawnPlayer(playerName);

    const animate = (time: number) => {
      if (!isPaused && engineRef.current) {
        updateKeyboardInput();
        engineRef.current.update(time);
      }
      
      render(time);
      
      const player = engineRef.current?.state.player;
      if (player) {
        onScoreUpdate(Math.floor(player.score));
        
        // Calcular powerups ativos para a UI
        if (onPowerupsUpdate) {
          const activePowers: ActivePowerup[] = [];
          const now = performance.now();
          
          const checkPower = (type: SpecialItemType, endTime: number) => {
            if (endTime > now) {
              const conf = SPECIAL_ITEMS_CONFIG[type];
              activePowers.push({
                type,
                timeLeft: Math.ceil((endTime - now) / 1000),
                label: type === 'USURPER' ? 'USURPER' : (type === 'STALKER' ? 'STALKER' : (type === 'ANGEL' ? 'ANGEL' : type)),
                icon: conf.label,
                color: conf.color
              });
            }
          };

          checkPower('ANGEL', player.invincibilityEndTime);
          checkPower('SPEED', player.speedBoostEndTime);
          checkPower('MAGNET', player.magnetEndTime);
          checkPower('SCOUTER', player.scouterEndTime);
          checkPower('SLICER', player.slicerEndTime);
          checkPower('USURPER', player.usurperEndTime);
          checkPower('STALKER', player.stalkerEndTime);

          onPowerupsUpdate(activePowers);
        }
      }

      if (engineRef.current) {
        const leaders = [...engineRef.current.state.snakes]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(s => ({ name: s.name, score: Math.floor(s.score), isPlayer: s.isPlayer }));
        onLeaderboardUpdate(leaders);
        
        if (engineRef.current.state.isGameOver) {
          onGameOver();
        } else {
          requestRef.current = requestAnimationFrame(animate);
        }
      }
    };

    const updateKeyboardInput = () => {
      const player = engineRef.current?.state.player;
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

    const renderMaskIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, time: number, isOverlay = false) => {
      ctx.save();
      ctx.translate(x, y);
      if (!isOverlay) {
          ctx.rotate(time / 1500);
          ctx.strokeStyle = color + '80';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 12]);
          ctx.beginPath();
          ctx.arc(0, 0, 42, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.rotate(-time / 1500);
          ctx.shadowBlur = 15;
          ctx.shadowColor = color;
      } else {
          ctx.scale(0.8, 0.8);
      }
      ctx.fillStyle = isOverlay ? 'rgba(255,255,255,0.9)' : color;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI, true);
      ctx.lineTo(-18, 10);
      ctx.quadraticCurveTo(0, 22, 18, 10);
      ctx.closePath();
      ctx.fill();
      if (!isOverlay) { ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.roundRect(-12, -4, 24, 7, 4); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(-6, -0.5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -0.5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    const renderEyeIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, time: number, isOverlay = false) => {
      ctx.save();
      ctx.translate(x, y);
      if (isOverlay) ctx.scale(0.7, 0.7);
      const pulse = Math.sin(time / 200) * 5 + 35;
      ctx.shadowBlur = isOverlay ? 10 : pulse;
      ctx.shadowColor = color;
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = color;
      const lookX = Math.cos(time / 400) * 8;
      ctx.beginPath(); ctx.arc(lookX, 0, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(lookX, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    const render = (time: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !engineRef.current) return;

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

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const step = 400;
      for (let x = 0; x <= worldSize; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, worldSize); ctx.stroke();
      }
      for (let y = 0; y <= worldSize; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(worldSize, y); ctx.stroke();
      }

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 20;
      ctx.strokeRect(0, 0, worldSize, worldSize);

      engineRef.current.state.trails.forEach(p => {
        ctx.globalAlpha = p.life * 0.5;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      engineRef.current.state.knives.forEach(knife => {
        ctx.save();
        ctx.translate(knife.x, knife.y);
        ctx.rotate(knife.angle);
        ctx.shadowBlur = 10; ctx.shadowColor = 'white';
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(5, -4); ctx.lineTo(15, 0); ctx.lineTo(5, 4); ctx.lineTo(-15, 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      });

      engineRef.current.state.foods.forEach(food => {
        ctx.save();
        if (food.value > 5) {
          const pulse = Math.sin(time / 150) * 10 + 15;
          ctx.shadowBlur = pulse; ctx.shadowColor = food.color;
          ctx.globalAlpha = 0.3; ctx.fillStyle = food.color;
          ctx.beginPath(); ctx.arc(food.x, food.y, food.size * 1.8, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1.0;
        }
        ctx.fillStyle = food.color;
        ctx.beginPath(); ctx.arc(food.x, food.y, food.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      engineRef.current.state.specialItems.forEach(item => {
        if (!item.isAvailable) return;
        const config = SPECIAL_ITEMS_CONFIG[item.type];
        if (item.type === 'USURPER') {
          renderMaskIcon(ctx, item.x, item.y, config.color, time);
        } else if (item.type === 'STALKER') {
          renderEyeIcon(ctx, item.x, item.y, config.color, time);
        } else {
          const pulse = Math.sin(time / 200) * 8 + 20;
          ctx.save();
          ctx.shadowBlur = pulse; ctx.shadowColor = config.color;
          ctx.fillStyle = config.color;
          ctx.beginPath(); ctx.arc(item.x, item.y, 30, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = 'white'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(config.label, item.x, item.y);
          ctx.restore();
        }
      });

      engineRef.current.state.snakes.forEach(snake => {
        const isInvincible = snake.invincibilityEndTime > time;
        const isFast = snake.speedBoostEndTime > time;
        const hasMagnet = snake.magnetEndTime > time;
        const hasScouter = snake.scouterEndTime > time;
        const isSlicer = snake.slicerEndTime > time;
        const isUsurper = snake.usurperEndTime > time;
        const isStalker = snake.stalkerEndTime > time;
        const head = snake.segments[0];

        if (isStalker && engineRef.current) {
            let targetSnake = null;
            let minDistSq = 2000 * 2000;
            engineRef.current.state.snakes.forEach(other => {
                if (other.id === snake.id) return;
                const d = (head.x - other.segments[0].x)**2 + (head.y - other.segments[0].y)**2;
                if (d < minDistSq && other.score >= snake.score) { minDistSq = d; targetSnake = other; }
            });
            if (targetSnake) {
                const targetHead = targetSnake.segments[0];
                ctx.save(); ctx.beginPath(); ctx.setLineDash([10, 10]); ctx.moveTo(head.x, head.y); ctx.lineTo(targetHead.x, targetHead.y);
                ctx.strokeStyle = 'rgba(248, 113, 113, 0.5)'; ctx.lineWidth = 3; ctx.stroke();
                ctx.setLineDash([]); ctx.beginPath(); ctx.arc(targetHead.x, targetHead.y, 100, 0, Math.PI * 2);
                ctx.strokeStyle = '#f87171'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
            }
        }

        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        const bodyWidth = 20 + Math.min(100, snake.length * 0.1);
        
        // --- DESENHO DO CORPO COM CONTORNO ---
        ctx.beginPath();
        snake.segments.forEach((seg, i) => { if (i === 0) ctx.moveTo(seg.x, seg.y); else ctx.lineTo(seg.x, seg.y); });
        
        // 1. Contorno Preto
        ctx.lineWidth = bodyWidth + 5;
        ctx.strokeStyle = '#000000';
        ctx.shadowBlur = 0;
        ctx.stroke();

        // 2. Preenchimento Neon (Body)
        ctx.lineWidth = bodyWidth;
        if (isInvincible) { ctx.shadowBlur = 35; ctx.shadowColor = '#60a5fa'; } 
        else if (isUsurper) { ctx.shadowBlur = 35; ctx.shadowColor = '#22d3ee'; }
        else if (isStalker) { ctx.shadowBlur = 40; ctx.shadowColor = '#f87171'; }
        else if (isSlicer) { ctx.shadowBlur = 30; ctx.shadowColor = '#94a3b8'; }
        else { ctx.shadowBlur = 15; ctx.shadowColor = snake.color; }
        
        const gradient = ctx.createLinearGradient(snake.segments[0].x, snake.segments[0].y, snake.segments[snake.segments.length-1].x, snake.segments[snake.segments.length-1].y);
        let startColor = snake.color;
        if (isStalker) startColor = '#111'; else if (isUsurper) startColor = '#eee';
        gradient.addColorStop(0, startColor); gradient.addColorStop(1, '#000000');
        ctx.strokeStyle = gradient; 
        ctx.stroke();

        // --- DESENHO DA CABEÇA COM CONTORNO ---
        // 1. Contorno da cabeça
        ctx.fillStyle = '#000000';
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(head.x, head.y, (bodyWidth + 5) / 2, 0, Math.PI * 2); ctx.fill();
        
        // 2. Centro da cabeça
        ctx.fillStyle = startColor;
        ctx.beginPath(); ctx.arc(head.x, head.y, bodyWidth / 2, 0, Math.PI * 2); ctx.fill();

        if (isUsurper) renderMaskIcon(ctx, head.x, head.y, '#22d3ee', time, true);
        else if (isStalker) renderEyeIcon(ctx, head.x, head.y, '#f87171', time, true);

        ctx.shadowBlur = 0; ctx.fillStyle = 'white'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
        let icons = "";
        const activeTypes: SpecialItemType[] = ['ANGEL', 'SPEED', 'SLICER', 'MAGNET', 'SCOUTER', 'SIZE'];
        activeTypes.forEach(type => {
            let isActive = false;
            switch(type) {
                case 'ANGEL': isActive = isInvincible; break;
                case 'SPEED': isActive = isFast; break;
                case 'SLICER': isActive = isSlicer; break;
                case 'MAGNET': isActive = hasMagnet; break;
                case 'SCOUTER': isActive = hasScouter; break;
            }
            const count = (isActive ? 1 : 0) + snake.powerupInventory[type];
            if (count > 0) {
                const label = SPECIAL_ITEMS_CONFIG[type].label;
                icons += ` ${label}${count > 1 ? 'x'+count : ''}`;
            }
        });
        ctx.fillText(snake.name + (icons ? " (" + icons.trim() + ")" : ""), head.x, head.y - bodyWidth/2 - 25);
      });

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const mmSize = Math.min(canvas.width * 0.22, 220);
      const mmX = canvas.width - mmSize - 20;
      const mmY = canvas.height - mmSize - 20;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(mmX, mmY, mmSize, mmSize);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'; ctx.lineWidth = 2; ctx.strokeRect(mmX, mmY, mmSize, mmSize);
      const isPlayerScouting = player && player.scouterEndTime > time;
      engineRef.current.state.specialItems.forEach(item => {
        if (!item.isAvailable) return;
        const sx = mmX + (item.x / worldSize) * mmSize;
        const sy = mmY + (item.y / worldSize) * mmSize;
        const config = SPECIAL_ITEMS_CONFIG[item.type];
        ctx.fillStyle = config.color; ctx.beginPath(); ctx.arc(sx, sy, (isPlayerScouting || item.type === 'STALKER' || item.type === 'USURPER') ? 4 : 2, 0, Math.PI * 2); ctx.fill();
      });
      engineRef.current.state.snakes.forEach(snake => {
        const sx = mmX + (snake.segments[0].x / worldSize) * mmSize;
        const sy = mmY + (snake.segments[0].y / worldSize) * mmSize;
        ctx.fillStyle = snake.isPlayer ? 'white' : snake.color; ctx.beginPath(); ctx.arc(sx, sy, snake.isPlayer ? 4 : 2, 0, Math.PI * 2); ctx.fill();
      });
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [resize, playerName, onScoreUpdate, onLeaderboardUpdate, onPowerupsUpdate, onGameOver, isPaused, enabledItems]);

  const handleInput = (clientX: number, clientY: number) => {
    if (isPaused) return;
    const player = engineRef.current?.state.player;
    if (!player) return;
    const dx = clientX - window.innerWidth / 2;
    const dy = clientY - window.innerHeight / 2;
    player.targetAngle = Math.atan2(dy, dx);
  };

  const handleMouseMove = (e: React.MouseEvent) => handleInput(e.clientX, e.clientY);
  const handleTouchMove = (e: React.TouchEvent) => handleInput(e.touches[0].clientX, e.touches[0].clientY);
  const handleMouseDown = () => { if (isPaused) return; const player = engineRef.current?.state.player; if (player) player.isBoosting = true; };
  const handleMouseUp = () => { const player = engineRef.current?.state.player; if (player) player.isBoosting = false; };

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
