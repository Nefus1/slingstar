import {
  ENEMY_CONFIGS,
  ORBIT_FLATTEN,
  ORBIT_RADII,
  ORBIT_SLOTS,
  ORBIT_SPEEDS,
  TOWER_CONFIGS,
  WAVES,
} from "./config";
import type {
  DefenseEvent,
  DefenseTelemetry,
  DefenseWorld,
  Enemy,
  EnemyType,
  OrbitalSlot,
  TargetMode,
  Tower,
  TowerType,
} from "./types";

const TAU = Math.PI * 2;
const CORE_RADIUS = 46;

export function createDefenseWorld(): DefenseWorld {
  return {
    phase: "build",
    time: 0,
    waveTime: 0,
    waveIndex: 0,
    completedWaves: 0,
    lives: 20,
    maxLives: 20,
    stardust: 260,
    score: 0,
    killStreak: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    spawnQueue: [],
    spawnIndex: 0,
    nextId: 1,
    nextProjectileId: 1,
    orbitAngles: [0.18, 0.42, -0.28],
    selectedBuild: "moon",
    selectedTowerId: null,
    eventSerial: 0,
    lastEvent: null,
    escaped: 0,
    totalKills: 0,
    damageDealt: 0,
    waveKills: 0,
  };
}

export function defenseTelemetry(world: DefenseWorld): DefenseTelemetry {
  return {
    phase: world.phase,
    waveIndex: world.waveIndex,
    completedWaves: world.completedWaves,
    lives: world.lives,
    maxLives: world.maxLives,
    stardust: world.stardust,
    score: world.score,
    killStreak: world.killStreak,
    towerCount: world.towers.length,
    enemyCount: world.enemies.length,
    spawnRemaining: Math.max(0, world.spawnQueue.length - world.spawnIndex),
    selectedBuild: world.selectedBuild,
    selectedTower: world.towers.find((tower) => tower.id === world.selectedTowerId) ?? null,
    lastEvent: world.lastEvent,
    escaped: world.escaped,
    totalKills: world.totalKills,
    damageDealt: world.damageDealt,
  };
}

export function startDefenseWave(world: DefenseWorld): boolean {
  if (world.phase !== "build" || world.waveIndex >= WAVES.length) return false;
  if (world.towers.length === 0) {
    emit(world, "notice", "No defenses deployed", "Place at least one tower on a glowing orbital slot.");
    return false;
  }
  world.spawnQueue = makeSpawnQueue(world.waveIndex);
  world.spawnIndex = 0;
  world.waveTime = 0;
  world.waveKills = 0;
  world.phase = "wave";
  world.selectedTowerId = null;
  const plan = WAVES[world.waveIndex]!;
  emit(world, "wave", `Wave ${world.waveIndex + 1}: ${plan.title}`, plan.warning);
  return true;
}

export function stepDefense(world: DefenseWorld, dt: number) {
  if (world.phase === "victory" || world.phase === "defeat") {
    tickParticles(world, dt);
    return;
  }
  world.time += dt;
  for (let ring = 0; ring < world.orbitAngles.length; ring++) {
    world.orbitAngles[ring] = wrap(world.orbitAngles[ring]! + ORBIT_SPEEDS[ring]! * dt);
  }
  for (const tower of world.towers) {
    tower.cooldown = Math.max(0, tower.cooldown - dt);
    tower.flash = Math.max(0, tower.flash - dt * 5);
  }

  if (world.phase === "wave") {
    world.waveTime += dt;
    while (
      world.spawnIndex < world.spawnQueue.length &&
      world.spawnQueue[world.spawnIndex]!.at <= world.waveTime
    ) {
      const order = world.spawnQueue[world.spawnIndex++]!;
      spawnEnemy(world, order.type, order.lane);
    }
    updateEnemies(world, dt);
    updateTowers(world);
    updateProjectiles(world, dt);
    collectDestroyed(world);
    if (
      world.phase === "wave" &&
      world.spawnIndex >= world.spawnQueue.length &&
      world.enemies.length === 0
    ) {
      completeWave(world);
    }
  }
  tickParticles(world, dt);
}

function updateEnemies(world: DefenseWorld, dt: number) {
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const enemy = world.enemies[i]!;
    const previousX = enemy.x;
    const previousY = enemy.y;
    const slow = world.time < enemy.slowUntil ? enemy.slowFactor : 1;
    enemy.progress += enemy.speed * slow * dt;
    const point = pathPoint(enemy.lane, enemy.progress);
    enemy.x = point.x;
    enemy.y = point.y;
    enemy.vx = (enemy.x - previousX) / Math.max(dt, 0.0001);
    enemy.vy = (enemy.y - previousY) / Math.max(dt, 0.0001);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 6);
    if (enemy.progress < 1) continue;
    world.enemies.splice(i, 1);
    world.lives = Math.max(0, world.lives - enemy.damage);
    world.escaped += 1;
    world.killStreak = 0;
    burst(world, 0, 0, enemy.color, enemy.type === "boss" ? 28 : 14, 125);
    emit(
      world,
      "leak",
      enemy.type === "boss" ? "Catastrophic impact" : "Asteria struck",
      `${enemy.name} breached the core for ${enemy.damage} integrity.`,
    );
    if (world.lives <= 0) {
      world.phase = "defeat";
      emit(world, "defeat", "Asteria has fallen", `The defense held through ${world.completedWaves} complete waves.`);
      return;
    }
  }
}

function updateTowers(world: DefenseWorld) {
  for (const tower of world.towers) {
    if (tower.cooldown > 0) continue;
    const config = TOWER_CONFIGS[tower.type];
    const stats = towerStats(tower);
    const position = towerPosition(world, tower);
    const candidates = world.enemies.filter((enemy) => {
      const dx = enemy.x - position.x;
      const dy = enemy.y - position.y;
      return dx * dx + dy * dy <= stats.range * stats.range;
    });
    if (candidates.length === 0) continue;
    const target = chooseTarget(candidates, tower.targetMode, position.x, position.y);
    tower.aimAngle = Math.atan2(target.y - position.y, target.x - position.x);
    tower.cooldown = 1 / stats.fireRate;
    tower.flash = 1;
    const speed = config.projectileSpeed;
    const angle = tower.aimAngle;
    world.projectiles.push({
      id: world.nextProjectileId++,
      towerId: tower.id,
      targetId: target.id,
      x: position.x + Math.cos(angle) * (config.radius + 5),
      y: position.y + Math.sin(angle) * (config.radius + 5),
      tx: target.x,
      ty: target.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      damage: stats.damage,
      splash: stats.splash,
      slow: stats.slow,
      push: stats.push,
      color: config.color,
      radius: tower.type === "ringed" ? 4 : tower.type === "lava" ? 5 : 3,
      life: 2.4,
    });
  }
}

function updateProjectiles(world: DefenseWorld, dt: number) {
  for (let i = world.projectiles.length - 1; i >= 0; i--) {
    const projectile = world.projectiles[i]!;
    projectile.life -= dt;
    const target = world.enemies.find((enemy) => enemy.id === projectile.targetId && enemy.hp > 0);
    if (target) {
      projectile.tx = target.x;
      projectile.ty = target.y;
    }
    const dx = projectile.tx - projectile.x;
    const dy = projectile.ty - projectile.y;
    const distance = Math.hypot(dx, dy) || 1;
    const travel = projectile.speed * dt;
    if (distance <= travel + (target?.radius ?? 4)) {
      if (target) hitEnemy(world, target, projectile);
      burst(world, projectile.tx, projectile.ty, projectile.color, projectile.splash > 0 ? 9 : 5, 62);
      world.projectiles.splice(i, 1);
      continue;
    }
    const desiredVx = (dx / distance) * projectile.speed;
    const desiredVy = (dy / distance) * projectile.speed;
    const steer = 1 - Math.exp(-8 * dt);
    projectile.vx += (desiredVx - projectile.vx) * steer;
    projectile.vy += (desiredVy - projectile.vy) * steer;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    if (projectile.life <= 0) world.projectiles.splice(i, 1);
  }
}

function hitEnemy(world: DefenseWorld, target: Enemy, projectile: DefenseWorld["projectiles"][number]) {
  applyDamage(world, target, projectile.damage);
  if (projectile.slow > 0 && target.hp > 0) {
    target.slowFactor = projectile.slow;
    target.slowUntil = world.time + 2.2;
  }
  if (projectile.push > 0 && target.type !== "boss" && target.hp > 0) {
    target.progress = Math.max(0.015, target.progress - projectile.push);
  }
  if (projectile.splash > 0) {
    const radius2 = projectile.splash * projectile.splash;
    for (const enemy of world.enemies) {
      if (enemy.id === target.id || enemy.hp <= 0) continue;
      const dx = enemy.x - target.x;
      const dy = enemy.y - target.y;
      if (dx * dx + dy * dy <= radius2) applyDamage(world, enemy, projectile.damage * 0.52);
    }
  }
  const tower = world.towers.find((candidate) => candidate.id === projectile.towerId);
  if (tower && target.hp <= 0) tower.kills += 1;
}

function applyDamage(world: DefenseWorld, enemy: Enemy, amount: number) {
  if (enemy.hp <= 0) return;
  const actual = amount * (1 - enemy.armor);
  enemy.hp -= actual;
  enemy.hitFlash = 1;
  world.damageDealt += actual;
}

function collectDestroyed(world: DefenseWorld) {
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const enemy = world.enemies[i]!;
    if (enemy.hp > 0) continue;
    world.enemies.splice(i, 1);
    world.stardust += enemy.reward;
    world.totalKills += 1;
    world.waveKills += 1;
    world.killStreak += 1;
    const multiplier = 1 + Math.min(4, Math.floor(world.killStreak / 8)) * 0.2;
    world.score += Math.round(enemy.reward * 12 * multiplier);
    burst(world, enemy.x, enemy.y, enemy.color, enemy.type === "boss" ? 34 : 12, enemy.type === "boss" ? 170 : 92);
    if (enemy.type === "boss") {
      emit(world, "wave", "Dread signature destroyed", `The fleet earned ${enemy.reward} stardust from the wreckage.`);
    }
  }
}

function completeWave(world: DefenseWorld) {
  const finished = world.waveIndex;
  world.completedWaves = finished + 1;
  const perfectBonus = world.waveKills > 0 && world.lives === world.maxLives ? 35 : 0;
  const prepBonus = 28 + finished * 7 + perfectBonus;
  world.stardust += prepBonus;
  world.score += 500 + finished * 160 + perfectBonus * 10;
  world.killStreak = 0;
  if (world.completedWaves >= WAVES.length) {
    world.phase = "victory";
    emit(world, "victory", "Asteria holds", `All ten waves repelled with ${world.lives} core integrity remaining.`);
    return;
  }
  world.waveIndex += 1;
  world.phase = "build";
  emit(world, "wave", `Wave ${finished + 1} cleared`, `Salvage crews recovered ${prepBonus} stardust for the next deployment.`);
}

export function placeTower(world: DefenseWorld, type: TowerType, ring: number, slot: number): boolean {
  const config = TOWER_CONFIGS[type];
  if (world.phase === "victory" || world.phase === "defeat") return false;
  if (world.towers.some((tower) => tower.ring === ring && tower.slot === slot)) {
    emit(world, "notice", "Orbital slot occupied", "Choose another illuminated anchor point.");
    return false;
  }
  if (world.stardust < config.cost) {
    emit(world, "notice", "Insufficient stardust", `${config.name} requires ${config.cost} stardust.`);
    return false;
  }
  const tower: Tower = {
    id: world.nextId++,
    type,
    ring,
    slot,
    level: 1,
    cooldown: 0.25,
    targetMode: "first",
    kills: 0,
    spent: config.cost,
    aimAngle: 0,
    flash: 0,
  };
  world.towers.push(tower);
  world.stardust -= config.cost;
  world.selectedTowerId = tower.id;
  emit(world, "build", `${config.name} deployed`, `Orbit ${ring + 1}, anchor ${slot + 1}. Targeting: first.`);
  return true;
}

export function upgradeTower(world: DefenseWorld, towerId: number): boolean {
  const tower = world.towers.find((candidate) => candidate.id === towerId);
  if (!tower || tower.level >= 3) return false;
  const cost = upgradeCost(tower);
  if (world.stardust < cost) {
    emit(world, "notice", "Upgrade unavailable", `Calibration requires ${cost} stardust.`);
    return false;
  }
  tower.level += 1;
  tower.spent += cost;
  world.stardust -= cost;
  emit(world, "upgrade", `${TOWER_CONFIGS[tower.type].name} calibrated`, `Level ${tower.level} damage, range, and fire rate online.`);
  return true;
}

export function sellTower(world: DefenseWorld, towerId: number): boolean {
  const index = world.towers.findIndex((candidate) => candidate.id === towerId);
  if (index < 0) return false;
  const tower = world.towers[index]!;
  const refund = sellValue(tower);
  world.towers.splice(index, 1);
  world.stardust += refund;
  world.selectedTowerId = null;
  emit(world, "sell", `${TOWER_CONFIGS[tower.type].name} recovered`, `${refund} stardust returned to reserves.`);
  return true;
}

export function setTowerTarget(world: DefenseWorld, towerId: number, mode: TargetMode) {
  const tower = world.towers.find((candidate) => candidate.id === towerId);
  if (!tower) return;
  tower.targetMode = mode;
  emit(world, "notice", "Target protocol changed", `${TOWER_CONFIGS[tower.type].name} now prioritizes ${mode}.`);
}

export function selectBuild(world: DefenseWorld, type: TowerType) {
  world.selectedBuild = type;
  world.selectedTowerId = null;
}

export function selectTower(world: DefenseWorld, towerId: number | null) {
  world.selectedTowerId = towerId;
}

export function upgradeCost(tower: Tower) {
  return Math.round(TOWER_CONFIGS[tower.type].cost * (0.58 + tower.level * 0.24));
}

export function sellValue(tower: Tower) {
  return Math.round(tower.spent * 0.58);
}

export function towerStats(tower: Tower) {
  const config = TOWER_CONFIGS[tower.type];
  const level = tower.level - 1;
  return {
    damage: config.damage * (1 + level * 0.52),
    range: config.range + level * 22,
    fireRate: config.fireRate * (1 + level * 0.2),
    splash: config.splash + level * (config.splash > 0 ? 9 : 0),
    slow: config.slow > 0 ? Math.max(0.34, config.slow - level * 0.07) : 0,
    push: config.push * (1 + level * 0.25),
  };
}

export function towerPosition(world: DefenseWorld, tower: Pick<Tower, "ring" | "slot">) {
  return slotPosition(world, tower.ring, tower.slot);
}

export function slotPosition(world: DefenseWorld, ring: number, slot: number) {
  const count = ORBIT_SLOTS[ring]!;
  const angle = world.orbitAngles[ring]! + (slot / count) * TAU;
  const radius = ORBIT_RADII[ring]!;
  return {
    angle,
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * ORBIT_FLATTEN,
  };
}

export function snapOrbitalSlot(
  world: DefenseWorld,
  x: number,
  y: number,
  tolerance = 54,
): OrbitalSlot {
  const ellipticalRadius = Math.hypot(x, y / ORBIT_FLATTEN);
  let ring = 0;
  let difference = Number.POSITIVE_INFINITY;
  for (let index = 0; index < ORBIT_RADII.length; index++) {
    const next = Math.abs(ellipticalRadius - ORBIT_RADII[index]!);
    if (next < difference) {
      ring = index;
      difference = next;
    }
  }
  const count = ORBIT_SLOTS[ring]!;
  const angle = Math.atan2(y / ORBIT_FLATTEN, x);
  const relative = wrap(angle - world.orbitAngles[ring]!);
  const slot = Math.round((relative / TAU) * count) % count;
  const normalizedSlot = (slot + count) % count;
  const position = slotPosition(world, ring, normalizedSlot);
  return {
    ring,
    slot: normalizedSlot,
    angle: position.angle,
    x: position.x,
    y: position.y,
    valid:
      difference <= tolerance &&
      !world.towers.some((tower) => tower.ring === ring && tower.slot === normalizedSlot),
  };
}

export function towerAtPoint(
  world: DefenseWorld,
  x: number,
  y: number,
  hitRadius = 34,
): Tower | null {
  let nearest: Tower | null = null;
  let nearestDistance = hitRadius;
  for (const tower of world.towers) {
    const position = towerPosition(world, tower);
    const distance = Math.hypot(x - position.x, y - position.y);
    if (distance < nearestDistance) {
      nearest = tower;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function pathPoint(lane: number, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const startAngles = [-2.72, -0.72, 0.46, 2.28];
  const turns = [1.36, -1.22, 1.08, -1.42];
  const angle = startAngles[lane % 4]! + turns[lane % 4]! * p + Math.sin(p * Math.PI) * (lane % 2 === 0 ? 0.28 : -0.28);
  const eased = p * (1.12 - p * 0.12);
  const radius = 650 + (CORE_RADIUS - 650) * eased;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * ORBIT_FLATTEN,
  };
}

function spawnEnemy(world: DefenseWorld, type: EnemyType, lane: number) {
  const config = ENEMY_CONFIGS[type];
  const scale = 1 + world.waveIndex * 0.22;
  const speedScale = 1 + world.waveIndex * 0.018;
  const point = pathPoint(lane, 0);
  world.enemies.push({
    id: world.nextId++,
    type,
    name: config.name,
    lane,
    progress: 0,
    hp: config.hp * scale,
    maxHp: config.hp * scale,
    speed: config.speed * speedScale,
    reward: Math.round(config.reward * (1 + world.waveIndex * 0.08)),
    damage: config.damage,
    armor: Math.min(0.48, config.armor + world.waveIndex * 0.008),
    radius: config.radius,
    color: config.color,
    x: point.x,
    y: point.y,
    vx: 0,
    vy: 0,
    slowUntil: 0,
    slowFactor: 1,
    hitFlash: 0,
  });
}

function makeSpawnQueue(waveIndex: number) {
  const wave = WAVES[waveIndex]!;
  const queue: DefenseWorld["spawnQueue"] = [];
  let at = 0.4;
  let order = 0;
  for (const group of wave.groups) {
    for (let i = 0; i < group.count; i++) {
      queue.push({ at, type: group.type, lane: (order * 3 + waveIndex + i) % 4 });
      at += group.interval;
      order += 1;
    }
    at += group.gap ?? 0.7;
  }
  return queue;
}

function chooseTarget(enemies: Enemy[], mode: TargetMode, x: number, y: number) {
  if (mode === "strongest") return enemies.reduce((best, enemy) => enemy.hp > best.hp ? enemy : best);
  if (mode === "closest") {
    return enemies.reduce((best, enemy) => {
      const bd = (best.x - x) ** 2 + (best.y - y) ** 2;
      const ed = (enemy.x - x) ** 2 + (enemy.y - y) ** 2;
      return ed < bd ? enemy : best;
    });
  }
  return enemies.reduce((best, enemy) => enemy.progress > best.progress ? enemy : best);
}

function burst(world: DefenseWorld, x: number, y: number, color: string, count: number, speed: number) {
  const capped = Math.min(count, Math.max(0, 260 - world.particles.length));
  for (let i = 0; i < capped; i++) {
    const angle = (i / Math.max(1, capped)) * TAU + ((world.nextProjectileId * 0.618) % 1);
    const velocity = speed * (0.32 + ((i * 37) % 100) / 100 * 0.68);
    const life = 0.42 + ((i * 19) % 55) / 100;
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life,
      maxLife: life,
      color,
      size: 1.2 + (i % 4) * 0.65,
    });
  }
}

function tickParticles(world: DefenseWorld, dt: number) {
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const particle = world.particles[i]!;
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.exp(-2.2 * dt);
    particle.vy *= Math.exp(-2.2 * dt);
    if (particle.life <= 0) world.particles.splice(i, 1);
  }
}

function emit(
  world: DefenseWorld,
  kind: DefenseEvent["kind"],
  title: string,
  detail: string,
) {
  world.eventSerial += 1;
  world.lastEvent = { serial: world.eventSerial, kind, title, detail };
}

function wrap(angle: number) {
  return ((angle % TAU) + TAU) % TAU;
}
