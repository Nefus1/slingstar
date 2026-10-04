export type TowerType = "moon" | "ice" | "lava" | "gas" | "ringed";
export type EnemyType = "asteroid" | "comet" | "raider" | "armored" | "boss";
export type TargetMode = "first" | "strongest" | "closest";
export type DefensePhase = "build" | "wave" | "victory" | "defeat";

export type TowerConfig = {
  type: TowerType;
  name: string;
  role: string;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  projectileSpeed: number;
  color: string;
  radius: number;
  splash: number;
  slow: number;
  push: number;
};

export type EnemyConfig = {
  type: EnemyType;
  name: string;
  hp: number;
  speed: number;
  reward: number;
  damage: number;
  armor: number;
  radius: number;
  color: string;
};

export type WaveGroup = {
  type: EnemyType;
  count: number;
  interval: number;
  gap?: number;
};

export type WavePlan = {
  title: string;
  warning: string;
  groups: WaveGroup[];
};

export type Tower = {
  id: number;
  type: TowerType;
  ring: number;
  slot: number;
  level: number;
  cooldown: number;
  targetMode: TargetMode;
  kills: number;
  spent: number;
  aimAngle: number;
  flash: number;
};

export type Enemy = {
  id: number;
  type: EnemyType;
  name: string;
  lane: number;
  progress: number;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  damage: number;
  armor: number;
  radius: number;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  slowUntil: number;
  slowFactor: number;
  hitFlash: number;
};

export type Projectile = {
  id: number;
  towerId: number;
  targetId: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  splash: number;
  slow: number;
  push: number;
  color: string;
  radius: number;
  life: number;
};

export type DefenseParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

export type SpawnOrder = {
  at: number;
  type: EnemyType;
  lane: number;
};

export type DefenseEvent = {
  serial: number;
  kind: "build" | "upgrade" | "sell" | "wave" | "leak" | "victory" | "defeat" | "notice";
  title: string;
  detail: string;
};

export type DefenseWorld = {
  phase: DefensePhase;
  time: number;
  waveTime: number;
  waveIndex: number;
  completedWaves: number;
  lives: number;
  maxLives: number;
  stardust: number;
  score: number;
  killStreak: number;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: DefenseParticle[];
  spawnQueue: SpawnOrder[];
  spawnIndex: number;
  nextId: number;
  nextProjectileId: number;
  orbitAngles: number[];
  selectedBuild: TowerType;
  selectedTowerId: number | null;
  eventSerial: number;
  lastEvent: DefenseEvent | null;
  escaped: number;
  totalKills: number;
  damageDealt: number;
  waveKills: number;
};

export type OrbitalSlot = {
  ring: number;
  slot: number;
  angle: number;
  x: number;
  y: number;
  valid: boolean;
};

export type DefenseTelemetry = {
  phase: DefensePhase;
  waveIndex: number;
  completedWaves: number;
  lives: number;
  maxLives: number;
  stardust: number;
  score: number;
  killStreak: number;
  towerCount: number;
  enemyCount: number;
  spawnRemaining: number;
  selectedBuild: TowerType;
  selectedTower: Tower | null;
  lastEvent: DefenseEvent | null;
  escaped: number;
  totalKills: number;
  damageDealt: number;
};
