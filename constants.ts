
export const WORLD_SIZE = 8000;
export const INITIAL_SNAKE_LENGTH = 10;
export const SEGMENT_DISTANCE = 5;
export const BASE_SPEED = 2.2;
export const BOOST_SPEED = 4.5;
export const SPECIAL_SPEED_MULTIPLIER = 1.8;
export const TURN_SPEED = 0.12;
export const FOOD_COUNT = 5000; // Aumentado para maior densidade
export const AI_COUNT = 45;

export const MAGNET_RADIUS = 250;
export const MAGNET_PULL_STRENGTH = 8;
export const KNIFE_SPEED = 12;

export const FOOD_TIERS = {
  NORMAL: { probability: 0.85, value: 1, size: 3, glow: 5 },
  LARGE: { probability: 0.12, value: 5, size: 6, glow: 12 },
  RARE: { probability: 0.03, value: 15, size: 10, glow: 20 },
};

export const SPECIAL_ITEMS_CONFIG = {
  SIZE: {
    max: 10,
    respawnMs: 2 * 60 * 1000, // 2 minutos
    label: '+',
    color: '#10b981'
  },
  SPEED: {
    max: 15,
    respawnMs: 1 * 60 * 1000, // 1 minuto
    durationMs: 30 * 1000,    // 30 segundos
    label: '⚡',
    color: '#f59e0b'
  },
  ANGEL: {
    max: 6,
    respawnMs: 1 * 60 * 1000, // 1 minuto
    durationMs: 15 * 1000,    // 15 segundos
    label: '😇',
    color: '#60a5fa'
  },
  MAGNET: {
    max: 10,
    respawnMs: 2 * 60 * 1000, // 2 minutos
    durationMs: 15 * 1000,    // 15 segundos
    label: '🧲',
    color: '#f43f5e'
  },
  SCOUTER: {
    max: 8,
    respawnMs: 2 * 60 * 1000, // 2 minutos
    durationMs: 10 * 1000,    // 10 segundos
    label: '🔍',
    color: '#a855f7'
  },
  SLICER: {
    max: 4,
    respawnMs: 1 * 60 * 1000, // 1 minuto
    durationMs: 15 * 1000,    // 15 segundos
    label: '⚔️',
    color: '#94a3b8'
  }
};

export const COLORS = [
  '#22c55e', '#3b82f6', '#ef4444', '#eab308', 
  '#a855f7', '#ec4899', '#06b6d4', '#f97316',
];

export const NAMES = [
  'Neon Hunter', 'Swift Viper', 'Glow Cobra', 'Light Racer', 
  'Grid Runner', 'Slither King', 'Dark Naga', 'Electro Asp',
  'Byte Mamba', 'Flash Wyrm', 'Solar Python', 'Quantum Boa',
  'Cyber Krait', 'Digital Adder', 'Neon Taipan', 'Prism Urutu'
];
