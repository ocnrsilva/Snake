
import { Point, Snake, Food, GameState, SpecialItem, SpecialItemType, TrailParticle, Knife } from '../types';
import { 
  WORLD_SIZE, 
  INITIAL_SNAKE_LENGTH, 
  SEGMENT_DISTANCE, 
  BASE_SPEED, 
  BOOST_SPEED, 
  TURN_SPEED, 
  FOOD_COUNT, 
  AI_COUNT,
  COLORS,
  NAMES,
  SPECIAL_ITEMS_CONFIG,
  SPECIAL_SPEED_MULTIPLIER,
  MAGNET_RADIUS,
  MAGNET_PULL_STRENGTH,
  FOOD_TIERS,
  KNIFE_SPEED
} from '../constants';

export class GameEngine {
  public state: GameState;
  private lastUpdate: number = 0;

  constructor() {
    this.state = {
      player: null,
      snakes: [],
      foods: [],
      specialItems: [],
      trails: [],
      knives: [],
      worldSize: WORLD_SIZE,
      isGameOver: false
    };
    this.init();
  }

  private init() {
    this.maintainEntities(0); 
    for (let i = 0; i < AI_COUNT; i++) {
      this.spawnSnake(false);
    }
    this.initSpecialItems();
  }

  private initSpecialItems() {
    (Object.keys(SPECIAL_ITEMS_CONFIG) as SpecialItemType[]).forEach(type => {
      const config = SPECIAL_ITEMS_CONFIG[type];
      for (let i = 0; i < config.max; i++) {
        this.spawnSpecialItem(type);
      }
    });
  }

  private spawnSpecialItem(type: SpecialItemType) {
    let x = Math.random() * (WORLD_SIZE - 200) + 100;
    let y = Math.random() * (WORLD_SIZE - 200) + 100;
    this.state.specialItems.push({
      id: Math.random().toString(36).substr(2, 9),
      x, y, type, isAvailable: true
    });
  }

  public spawnPlayer(name: string) {
    const player = this.createSnake(name, true);
    player.invincibilityEndTime = performance.now() + 2000;
    this.state.player = player;
    this.state.snakes.push(player);
    this.state.isGameOver = false;
    return player;
  }

  private spawnSnake(isPlayer: boolean) {
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const snake = this.createSnake(name, isPlayer);
    this.state.snakes.push(snake);
  }

  private createSnake(name: string, isPlayer: boolean): Snake {
    const x = Math.random() * (WORLD_SIZE - 400) + 200;
    const y = Math.random() * (WORLD_SIZE - 400) + 200;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const angle = Math.random() * Math.PI * 2;
    
    const segments: Point[] = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
      segments.push({ x: x - i * SEGMENT_DISTANCE * Math.cos(angle), y: y - i * SEGMENT_DISTANCE * Math.sin(angle) });
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      name, color, segments, angle,
      targetAngle: angle, speed: BASE_SPEED, length: INITIAL_SNAKE_LENGTH,
      isPlayer, score: 0, isBoosting: false, speedBoostEndTime: 0, invincibilityEndTime: 0, magnetEndTime: 0, scouterEndTime: 0,
      slicerEndTime: 0, lastKnifeTime: 0
    };
  }

  private spawnFood(count: number, x?: number, y?: number, radius: number = 0) {
    for (let i = 0; i < count; i++) {
      let fx, fy;
      if (x !== undefined && y !== undefined) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        fx = Math.max(10, Math.min(WORLD_SIZE - 10, x + Math.cos(angle) * dist));
        fy = Math.max(10, Math.min(WORLD_SIZE - 10, y + Math.sin(angle) * dist));
      } else {
        fx = Math.random() * WORLD_SIZE;
        fy = Math.random() * WORLD_SIZE;
      }
      this.state.foods.push(this.createFood(fx, fy));
    }
  }

  private createFood(x: number, y: number, manualValue?: number): Food {
    let tier = FOOD_TIERS.NORMAL;
    const rand = Math.random();

    if (manualValue === undefined) {
      if (rand < FOOD_TIERS.RARE.probability) tier = FOOD_TIERS.RARE;
      else if (rand < FOOD_TIERS.RARE.probability + FOOD_TIERS.LARGE.probability) tier = FOOD_TIERS.LARGE;
    }

    return {
      x,
      y,
      size: manualValue ? 3 + manualValue / 2 : tier.size,
      color: tier === FOOD_TIERS.RARE ? '#ffffff' : COLORS[Math.floor(Math.random() * COLORS.length)],
      value: manualValue ?? tier.value
    };
  }

  public update(now: number) {
    if (!this.lastUpdate) {
      this.lastUpdate = now;
      return;
    }
    const dt = Math.min(2.0, (now - this.lastUpdate) / 16.6);
    this.lastUpdate = now;

    this.updateSnakes(dt, now);
    this.updateFoodMagnet(dt, now);
    this.updateTrails(dt);
    this.updateKnives(dt);
    this.handleCollisions(now);
    this.updateAI();
    this.maintainEntities(now);
  }

  private updateSnakes(dt: number, now: number) {
    this.state.snakes.forEach(snake => {
      let angleDiff = snake.targetAngle - snake.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      snake.angle += angleDiff * TURN_SPEED * dt;

      let currentBaseSpeed = BASE_SPEED;
      if (snake.speedBoostEndTime > now) {
        currentBaseSpeed *= SPECIAL_SPEED_MULTIPLIER;
      }

      if (snake.isBoosting && snake.segments.length > 5) {
        snake.speed = currentBaseSpeed * (BOOST_SPEED / BASE_SPEED);
        if (Math.random() < 0.1) {
          snake.length -= 0.1; 
          const tail = snake.segments.pop();
          if (tail) this.state.foods.push(this.createFood(tail.x, tail.y, 1));
        }
      } else {
        snake.speed = currentBaseSpeed;
      }

      const head = snake.segments[0];
      const newHead = {
        x: head.x + Math.cos(snake.angle) * snake.speed * dt,
        y: head.y + Math.sin(snake.angle) * snake.speed * dt
      };

      if (newHead.x < 0 || newHead.x > WORLD_SIZE || newHead.y < 0 || newHead.y > WORLD_SIZE) {
        this.killSnake(snake, now);
        return;
      }

      snake.segments.unshift(newHead);
      while (snake.segments.length > snake.length) {
        snake.segments.pop();
      }

      // Trail effects
      if (Math.random() < 0.4) {
        const tail = snake.segments[snake.segments.length - 1];
        this.state.trails.push({
          x: tail.x + (Math.random() - 0.5) * 10,
          y: tail.y + (Math.random() - 0.5) * 10,
          color: snake.color,
          life: 1.0,
          size: 2 + Math.random() * 3
        });
      }

      // Slicer Knife firing logic
      if (snake.slicerEndTime > now) {
        if (now - snake.lastKnifeTime > 2000) {
          this.fireKnife(snake);
          snake.lastKnifeTime = now;
        }
      }
    });
  }

  private fireKnife(snake: Snake) {
    const head = snake.segments[0];
    this.state.knives.push({
      id: Math.random().toString(36).substr(2, 9),
      x: head.x,
      y: head.y,
      angle: snake.angle,
      ownerId: snake.id,
      speed: KNIFE_SPEED
    });
  }

  private updateKnives(dt: number) {
    this.state.knives = this.state.knives.filter(knife => {
      knife.x += Math.cos(knife.angle) * knife.speed * dt;
      knife.y += Math.sin(knife.angle) * knife.speed * dt;

      // Check boundaries
      if (knife.x < 0 || knife.x > WORLD_SIZE || knife.y < 0 || knife.y > WORLD_SIZE) {
        return false;
      }
      return true;
    });
  }

  private updateTrails(dt: number) {
    this.state.trails.forEach(p => {
      p.life -= 0.02 * dt;
    });
    this.state.trails = this.state.trails.filter(p => p.life > 0);
    
    if (this.state.trails.length > 500) {
      this.state.trails = this.state.trails.slice(-500);
    }
  }

  private updateFoodMagnet(dt: number, now: number) {
    this.state.foods.forEach(food => {
      for (const snake of this.state.snakes) {
        if (snake.magnetEndTime > now) {
          const head = snake.segments[0];
          const dx = head.x - food.x;
          const dy = head.y - food.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < MAGNET_RADIUS * MAGNET_RADIUS) {
            const dist = Math.sqrt(distSq);
            if (dist > 5) {
              const pullX = (dx / dist) * MAGNET_PULL_STRENGTH * dt;
              const pullY = (dy / dist) * MAGNET_PULL_STRENGTH * dt;
              food.x += pullX;
              food.y += pullY;
            }
          }
        }
      }
    });
  }

  private handleCollisions(now: number) {
    this.state.snakes.forEach(snake => {
      const head = snake.segments[0];
      
      this.state.foods = this.state.foods.filter(food => {
        const distSq = (head.x - food.x) ** 2 + (head.y - food.y) ** 2;
        if (distSq < (food.size + 15) ** 2) {
          snake.length += food.value * 0.15;
          snake.score += Math.floor(food.value * 10);
          return false;
        }
        return true;
      });

      this.state.specialItems.forEach(item => {
        if (!item.isAvailable) return;
        const distSq = (head.x - item.x) ** 2 + (head.y - item.y) ** 2;
        if (distSq < 35 * 35) {
          this.applySpecialEffect(snake, item, now);
        }
      });
    });

    // Knife collisions
    this.state.knives = this.state.knives.filter(knife => {
      let hit = false;
      for (const target of this.state.snakes) {
        if (target.id === knife.ownerId) continue;
        if (target.invincibilityEndTime > now) continue;

        for (const seg of target.segments) {
          const distSq = (knife.x - seg.x)**2 + (knife.y - seg.y)**2;
          if (distSq < 25**2) {
            this.sliceSnake(target);
            hit = true;
            break;
          }
        }
        if (hit) break;
      }
      return !hit;
    });

    const snakesToKill: Snake[] = [];
    this.state.snakes.forEach(attacker => {
      if (attacker.invincibilityEndTime > now) return;

      const head = attacker.segments[0];
      this.state.snakes.forEach(target => {
        if (attacker.id === target.id) return;
        for (let i = 0; i < target.segments.length; i++) {
          const seg = target.segments[i];
          const distSq = (head.x - seg.x) ** 2 + (head.y - seg.y) ** 2;
          if (distSq < 15 ** 2) {
            snakesToKill.push(attacker);
            return;
          }
        }
      });
    });

    snakesToKill.forEach(s => this.killSnake(s, now));
  }

  private sliceSnake(target: Snake) {
    if (target.length <= 5) return; // Don't slice very small snakes

    const slicePoint = Math.floor(target.length / 2);
    const lostSegments = target.segments.slice(slicePoint);
    
    // Reduce target length
    target.length = slicePoint;
    target.segments = target.segments.slice(0, slicePoint);

    // Turn lost segments into food
    lostSegments.forEach((seg, i) => {
      if (i % 2 === 0) {
        this.state.foods.push(this.createFood(seg.x + (Math.random()-0.5)*10, seg.y + (Math.random()-0.5)*10, 2));
      }
    });
  }

  private applySpecialEffect(snake: Snake, item: SpecialItem, now: number) {
    item.isAvailable = false;
    item.respawnAt = now + SPECIAL_ITEMS_CONFIG[item.type].respawnMs;

    switch (item.type) {
      case 'SIZE': snake.length *= 2; snake.score += 500; break;
      case 'SPEED': snake.speedBoostEndTime = now + SPECIAL_ITEMS_CONFIG.SPEED.durationMs; break;
      case 'ANGEL': snake.invincibilityEndTime = now + SPECIAL_ITEMS_CONFIG.ANGEL.durationMs; break;
      case 'MAGNET': snake.magnetEndTime = now + SPECIAL_ITEMS_CONFIG.MAGNET.durationMs; break;
      case 'SCOUTER': snake.scouterEndTime = now + SPECIAL_ITEMS_CONFIG.SCOUTER.durationMs; break;
      case 'SLICER': 
        snake.slicerEndTime = now + SPECIAL_ITEMS_CONFIG.SLICER.durationMs; 
        snake.lastKnifeTime = 0; // Trigger first knife immediately
        break;
    }
  }

  private killSnake(snake: Snake, now: number) {
    if (snake.invincibilityEndTime > now) return;
    if (this.state.player?.id === snake.id) this.state.isGameOver = true;

    snake.segments.forEach((seg, i) => {
      if (i % 3 === 0) {
        this.state.foods.push(this.createFood(seg.x + (Math.random()-0.5)*20, seg.y + (Math.random()-0.5)*20, 2));
      }
    });

    this.state.snakes = this.state.snakes.filter(s => s.id !== snake.id);
  }

  private updateAI() {
    this.state.snakes.forEach(snake => {
      if (snake.isPlayer) return;
      const head = snake.segments[0];
      let obstacleDetected = false;

      for (const other of this.state.snakes) {
        if (other.id === snake.id) continue;
        for (let i = 0; i < other.segments.length; i += 5) {
          const seg = other.segments[i];
          const dx = seg.x - head.x;
          const dy = seg.y - head.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 100 * 100 && distSq > 0) {
            snake.targetAngle = Math.atan2(dy, dx) + Math.PI + (Math.random() - 0.5);
            obstacleDetected = true;
            break;
          }
        }
        if (obstacleDetected) break;
      }

      if (!obstacleDetected && Math.random() < 0.05) {
        let closestPos: Point | null = null;
        let minDistSq = 500 * 500;
        
        this.state.specialItems.forEach(item => {
           if (!item.isAvailable) return;
           const d = (head.x - item.x)**2 + (head.y - item.y)**2;
           if (d < minDistSq) { minDistSq = d; closestPos = {x: item.x, y: item.y}; }
        });

        if (!closestPos) {
          for (let i = 0; i < Math.min(this.state.foods.length, 100); i++) {
            const f = this.state.foods[i];
            const d = (head.x - f.x)**2 + (head.y - f.y)**2;
            const weight = f.value > 1 ? 2 : 1; 
            const weightedDist = d / weight;
            if (weightedDist < minDistSq) { 
              minDistSq = weightedDist; 
              closestPos = {x: f.x, y: f.y}; 
            }
          }
        }

        if (closestPos) {
          snake.targetAngle = Math.atan2(closestPos.y - head.y, closestPos.x - head.x);
        }
      }
    });
  }

  private maintainEntities(now: number) {
    if (this.state.foods.length < FOOD_COUNT) {
      const needed = FOOD_COUNT - this.state.foods.length;
      if (needed > 50) {
        const clusters = Math.floor(needed / 10);
        for (let i = 0; i < clusters; i++) {
          this.spawnFood(10, Math.random() * WORLD_SIZE, Math.random() * WORLD_SIZE, 150);
        }
      } else {
        this.spawnFood(needed);
      }
    }

    if (this.state.snakes.length < AI_COUNT + (this.state.player ? 1 : 0)) this.spawnSnake(false);
    
    this.state.specialItems.forEach(item => {
      if (!item.isAvailable && item.respawnAt && now >= item.respawnAt) {
        this.spawnSpecialItem(item.type);
        this.state.specialItems = this.state.specialItems.filter(i => i.id !== item.id);
      }
    });
  }
}
