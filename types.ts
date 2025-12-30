
export interface Point {
  x: number;
  y: number;
}

export interface TrailParticle {
  x: number;
  y: number;
  color: string;
  life: number; // 1.0 (novo) até 0.0 (sumindo)
  size: number;
}

export type SpecialItemType = 'SIZE' | 'SPEED' | 'ANGEL' | 'MAGNET' | 'SCOUTER' | 'SLICER';

export interface Knife {
  id: string;
  x: number;
  y: number;
  angle: number;
  ownerId: string;
  speed: number;
}

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
  magnetEndTime: number;
  scouterEndTime: number;
  slicerEndTime: number;
  lastKnifeTime: number;
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
  trails: TrailParticle[];
  knives: Knife[];
  worldSize: number;
  isGameOver: boolean;
}
