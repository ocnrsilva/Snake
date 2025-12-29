
export interface Point {
  x: number;
  y: number;
}

export type SpecialItemType = 'SIZE' | 'SPEED' | 'ANGEL';

export interface SpecialItem {
  id: string;
  x: number;
  y: number;
  type: SpecialItemType;
  respawnAt?: number;
  isAvailable: boolean;
}

export interface Snake {
  id: string;
  name: string;
  color: string;
  segments: Point[];
  angle: number;
  targetAngle: number;
  speed: number;
  length: number;
  isPlayer: boolean;
  score: number;
  isBoosting: boolean;
  // Timestamps de expiração (ms)
  speedBoostEndTime: number;
  invincibilityEndTime: number;
}

export interface Food {
  x: number;
  y: number;
  size: number;
  color: string;
  value: number;
}

export interface GameState {
  player: Snake | null;
  snakes: Snake[];
  foods: Food[];
  specialItems: SpecialItem[];
  worldSize: number;
  isGameOver: boolean;
}
