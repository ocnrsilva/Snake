
export const WORLD_SIZE = 4000;
export const INITIAL_SNAKE_LENGTH = 10;
export const SEGMENT_DISTANCE = 5;
export const BASE_SPEED = 2.2;
export const BOOST_SPEED = 4.5;
export const SPECIAL_SPEED_MULTIPLIER = 1.8; // Multiplicador para o item de raio
export const TURN_SPEED = 0.12;
export const FOOD_COUNT = 400;
export const AI_COUNT = 15;

export const SPECIAL_ITEMS_CONFIG = {
  SIZE: {
    max: 4,
    respawnMs: 3 * 60 * 1000,
    label: '+',
    color: '#10b981' // emerald
  },
  SPEED: {
    max: 10,
    respawnMs: 1 * 60 * 1000,
    durationMs: 30 * 1000,
    label: '⚡',
    color: '#f59e0b' // amber
  },
  ANGEL: {
    max: 2,
    respawnMs: 5 * 60 * 1000,
    durationMs: 15 * 1000,
    label: '😇',
    color: '#60a5fa' // blue
  }
};

export const COLORS = [
  '#22c55e', '#3b82f6', '#ef4444', '#eab308', 
  '#a855f7', '#ec4899', '#06b6d4', '#f97316',
];

export const NAMES = [
  'Neon Hunter', 'Swift Viper', 'Glow Cobra', 'Light Racer', 
  'Grid Runner', 'Slither King', 'Dark Naga', 'Electro Asp',
  'Byte Mamba', 'Flash Wyrm', 'Solar Python', 'Quantum Boa'
];
