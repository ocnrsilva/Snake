
export interface Point {
  x: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface TrailParticle {
  x: number;
  y: number;
  color: string;
  life: number;
  size: number;
}

export type SpecialItemType = 'SIZE' | 'SPEED' | 'ANGEL' | 'MAGNET' | 'SCOUTER' | 'SLICER' | 'USURPER' | 'STALKER';

export interface Knife {
  id: string;
  x: number;
  y: number;
  angle: number;
  ownerId: string;
  speed: number;
  distanceTravelled: number;
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
  // Inventário de itens (quantidades acumuladas)
  powerupInventory: Record<SpecialItemType, number>;
  // Timestamps de expiração (ms)
  speedBoostEndTime: number;
  invincibilityEndTime: number;
  magnetEndTime: number;
  scouterEndTime: number;
  slicerEndTime: number;
  usurperEndTime: number;
  stalkerEndTime: number;
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
