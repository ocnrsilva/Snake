
import { Point, Snake, Food, GameState, SpecialItem, SpecialItemType } from '../types';
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
  SPECIAL_SPEED_MULTIPLIER
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
      worldSize: WORLD_SIZE,
      isGameOver: false
    };
    this.init();
  }

  private init() {
    this.spawnFood(FOOD_COUNT);
    for (let i = 0; i < AI_COUNT; i++) {
      this.spawnSnake(false);
    }
    // Inicializar itens especiais
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
    let x = 0, y = 0;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 50) {
      x = Math.random() * (WORLD_SIZE - 200) + 100;
      y = Math.random() * (WORLD_SIZE - 200) + 100;
      attempts++;

      // Verificar proximidade de itens do mesmo tipo
      const sameTypeNearby = this.state.specialItems.some(item => {
        if (item.type !== type || !item.isAvailable) return false;
        const distSq = (item.x - x) ** 2 + (item.y - y) ** 2;
        return distSq < 400 * 400; // Raio de 400 unidades de distância mínima
      });

      if (!sameTypeNearby) valid = true;
    }

    this.state.specialItems.push({
      id: Math.random().toString(36).substr(2, 9),
      x, y, type, isAvailable: true
    });
  }

  public spawnPlayer(name: string) {
    const player = this.createSnake(name, true);
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
    const x = Math.random() * (WORLD_SIZE - 200) + 100;
    const y = Math.random() * (WORLD_SIZE - 200) + 100;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const angle = Math.random() * Math.PI * 2;
    
    const segments: Point[] = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
      segments.push({ x: x - i * SEGMENT_DISTANCE * Math.cos(angle), y: y - i * SEGMENT_DISTANCE * Math.sin(angle) });
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      name,
      color,
      segments,
      angle,
      targetAngle: angle,
      speed: BASE_SPEED,
      length: INITIAL_SNAKE_LENGTH,
      isPlayer,
      score: 0,
      isBoosting: false,
      speedBoostEndTime: 0,
      invincibilityEndTime: 0
    };
  }

  private spawnFood(count: number) {
    for (let i = 0; i < count; i++) {
      this.state.foods.push(this.createFood());
    }
  }

  private createFood(x?: number, y?: number, value?: number): Food {
    return {
      x: x ?? Math.random() * WORLD_SIZE,
      y: y ?? Math.random() * WORLD_SIZE,
      size: value ? 4 + value / 2 : 2 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      value: value ?? 1
    };
  }

  public update(now: number) {
    if (!this.lastUpdate) this.lastUpdate = now;
    const dt = (now - this.lastUpdate) / 16;
    this.lastUpdate = now;

    this.updateSnakes(dt, now);
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

      // Calcular velocidade base considerando power-ups
      let currentBaseSpeed = BASE_SPEED;
      if (snake.speedBoostEndTime > now) {
        currentBaseSpeed *= SPECIAL_SPEED_MULTIPLIER;
      }

      // Boosting logic (tecla espaço / clique)
      if (snake.isBoosting && snake.segments.length > 5) {
        snake.speed = currentBaseSpeed * (BOOST_SPEED / BASE_SPEED);
        if (Math.random() < 0.1) {
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
    });
  }

  private handleCollisions(now: number) {
    this.state.snakes.forEach(snake => {
      const head = snake.segments[0];
      
      // 1. Snake vs Food
      this.state.foods = this.state.foods.filter(food => {
        const distSq = (head.x - food.x) ** 2 + (head.y - food.y) ** 2;
        if (distSq < (food.size + 15) ** 2) {
          snake.length += food.value * 0.2;
          snake.score += Math.floor(food.value * 10);
          return false;
        }
        return true;
      });

      // 2. Snake vs Special Items
      this.state.specialItems.forEach(item => {
        if (!item.isAvailable) return;
        const distSq = (head.x - item.x) ** 2 + (head.y - item.y) ** 2;
        if (distSq < 35 * 35) {
          this.applySpecialEffect(snake, item, now);
        }
      });
    });

    // 3. Snake vs Snake
    const snakesToKill: Snake[] = [];
    this.state.snakes.forEach(attacker => {
      // Se estiver invencível, não morre por colisão
      if (attacker.invincibilityEndTime > now) return;

      const head = attacker.segments[0];
      this.state.snakes.forEach(target => {
        const startIdx = attacker.id === target.id ? 10 : 0;
        for (let i = startIdx; i < target.segments.length; i++) {
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

  private applySpecialEffect(snake: Snake, item: SpecialItem, now: number) {
    item.isAvailable = false;
    item.respawnAt = now + SPECIAL_ITEMS_CONFIG[item.type].respawnMs;

    switch (item.type) {
      case 'SIZE':
        snake.length *= 2;
        snake.score += 500;
        break;
      case 'SPEED':
        snake.speedBoostEndTime = now + SPECIAL_ITEMS_CONFIG.SPEED.durationMs;
        break;
      case 'ANGEL':
        snake.invincibilityEndTime = now + SPECIAL_ITEMS_CONFIG.ANGEL.durationMs;
        break;
    }
  }

  private killSnake(snake: Snake, now: number) {
    // Verificação dupla de invencibilidade
    if (snake.invincibilityEndTime > now) return;

    if (this.state.player?.id === snake.id) {
      this.state.isGameOver = true;
    }

    snake.segments.forEach((seg, i) => {
      if (i % 3 === 0) {
        this.state.foods.push(this.createFood(
          seg.x + (Math.random() - 0.5) * 20, 
          seg.y + (Math.random() - 0.5) * 20, 
          2
        ));
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
        let closestEntityPos: Point | null = null;
        let minDistSq = 400 * 400;
        
        // Priorizar itens especiais se estiverem perto
        this.state.specialItems.forEach(item => {
           if (!item.isAvailable) return;
           const distSq = (head.x - item.x) ** 2 + (head.y - item.y) ** 2;
           if (distSq < minDistSq) {
             minDistSq = distSq;
             closestEntityPos = { x: item.x, y: item.y };
           }
        });

        if (!closestEntityPos) {
          const scanLimit = 50;
          for (let i = 0; i < Math.min(this.state.foods.length, scanLimit); i++) {
            const food = this.state.foods[i];
            const distSq = (head.x - food.x) ** 2 + (head.y - food.y) ** 2;
            if (distSq < minDistSq) {
              minDistSq = distSq;
              closestEntityPos = { x: food.x, y: food.y };
            }
          }
        }

        if (closestEntityPos) {
          snake.targetAngle = Math.atan2(closestEntityPos.y - head.y, closestEntityPos.x - head.x);
        }
      }

      if (Math.random() < 0.01) {
        snake.isBoosting = !snake.isBoosting;
      }
    });
  }

  private maintainEntities(now: number) {
    if (this.state.foods.length < FOOD_COUNT) {
      this.spawnFood(FOOD_COUNT - this.state.foods.length);
    }
    if (this.state.snakes.length < AI_COUNT + (this.state.player ? 1 : 0)) {
      this.spawnSnake(false);
    }
    
    // Gerenciar Respawn de itens especiais
    this.state.specialItems.forEach(item => {
      if (!item.isAvailable && item.respawnAt && now >= item.respawnAt) {
        // Remover item antigo e criar um novo em posição válida
        this.state.specialItems = this.state.specialItems.filter(i => i.id !== item.id);
        this.spawnSpecialItem(item.type);
      }
    });
  }
}
