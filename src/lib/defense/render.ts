import { ORBIT_FLATTEN, ORBIT_RADII, ORBIT_SLOTS, TOWER_CONFIGS, WAVES } from "./config";
import { pathPoint, slotPosition, towerPosition, towerStats } from "./engine";
import type { DefenseWorld, OrbitalSlot, TowerType } from "./types";
import { drawBody, drawStars, hexAlpha, type Star } from "@/lib/sim/render";

export type DefenseView = {
  width: number;
  height: number;
  scale: number;
  centerX: number;
  centerY: number;
};

export function drawDefenseScene(
  ctx: CanvasRenderingContext2D,
  world: DefenseWorld,
  view: DefenseView,
  stars: Star[],
  time: number,
  hoverSlot: OrbitalSlot | null,
  selectedBuild: TowerType,
  shakeX = 0,
  shakeY = 0,
) {
  ctx.fillStyle = "#070809";
  ctx.fillRect(0, 0, view.width, view.height);
  drawStars(ctx, stars, view.width, view.height, 0, 0, time);
  drawBackdrop(ctx, view);

  ctx.save();
  ctx.translate(view.centerX + shakeX, view.centerY + shakeY);
  ctx.scale(view.scale, view.scale);

  drawApproachLanes(ctx, time, world.waveIndex);
  drawOrbitGrid(ctx, world, world.phase === "build" || hoverSlot !== null);
  drawCore(ctx, world, time);
  drawProjectiles(ctx, world);
  drawEnemies(ctx, world, time);
  drawTowers(ctx, world, time);
  drawParticles(ctx, world);
  if (hoverSlot) drawPlacementGhost(ctx, world, hoverSlot, selectedBuild, time);

  ctx.restore();
}

function drawBackdrop(ctx: CanvasRenderingContext2D, view: DefenseView) {
  ctx.save();
  const x = view.centerX;
  const y = view.centerY;
  const radius = Math.min(view.width, view.height) * 0.58;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, "rgba(80,100,116,0.12)");
  gradient.addColorStop(0.44, "rgba(44,61,76,0.045)");
  gradient.addColorStop(1, "rgba(7,8,9,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawApproachLanes(ctx: CanvasRenderingContext2D, time: number, waveIndex: number) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.setLineDash([8, 13]);
  ctx.lineDashOffset = -time * 16;
  for (let lane = 0; lane < 4; lane++) {
    ctx.beginPath();
    for (let step = 0; step <= 70; step++) {
      const point = pathPoint(lane, step / 70);
      if (step === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    const active = lane <= Math.min(3, Math.floor(waveIndex / 2) + 1);
    ctx.strokeStyle = active ? "rgba(159,179,193,0.15)" : "rgba(159,179,193,0.065)";
    ctx.lineWidth = active ? 1.25 : 0.8;
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawOrbitGrid(ctx: CanvasRenderingContext2D, world: DefenseWorld, showSlots: boolean) {
  ctx.save();
  for (let ring = 0; ring < ORBIT_RADII.length; ring++) {
    const radius = ORBIT_RADII[ring]!;
    ctx.strokeStyle = `rgba(181,198,210,${0.1 - ring * 0.015})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * ORBIT_FLATTEN, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (!showSlots) continue;
    for (let slot = 0; slot < ORBIT_SLOTS[ring]!; slot++) {
      const position = slotPosition(world, ring, slot);
      const occupied = world.towers.some((tower) => tower.ring === ring && tower.slot === slot);
      ctx.fillStyle = occupied ? "rgba(214,222,225,0.08)" : "rgba(201,214,221,0.22)";
      ctx.beginPath();
      ctx.arc(position.x, position.y, occupied ? 2.2 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawCore(ctx: CanvasRenderingContext2D, world: DefenseWorld, time: number) {
  const integrity = world.lives / world.maxLives;
  ctx.save();
  const shield = ctx.createRadialGradient(0, 0, 34, 0, 0, 90);
  shield.addColorStop(0, "rgba(88,160,191,0.12)");
  shield.addColorStop(0.58, `rgba(135,186,207,${0.12 * integrity})`);
  shield.addColorStop(1, "rgba(95,154,184,0)");
  ctx.fillStyle = shield;
  ctx.beginPath();
  ctx.arc(0, 0, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = integrity > 0.35 ? "rgba(167,206,221,0.58)" : "rgba(211,105,78,0.68)";
  ctx.lineWidth = 2.2;
  ctx.setLineDash([6, 7]);
  ctx.lineDashOffset = -time * 9;
  ctx.beginPath();
  ctx.arc(0, 0, 55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * integrity);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  drawBody(ctx, 0, 0, 34, "#3984a8", 0.2, "rock", "ocean", 0, 0, time);
  ctx.save();
  ctx.fillStyle = "rgba(237,241,240,0.82)";
  ctx.font = "600 12px ui-monospace, SFMono-Regular, monospace";
  ctx.textAlign = "center";
  ctx.fillText("ASTERIA", 0, 78);
  ctx.restore();
}

function drawTowers(ctx: CanvasRenderingContext2D, world: DefenseWorld, time: number) {
  for (const tower of world.towers) {
    const config = TOWER_CONFIGS[tower.type];
    const position = towerPosition(world, tower);
    const selected = tower.id === world.selectedTowerId;
    if (selected) {
      const stats = towerStats(tower);
      ctx.save();
      ctx.strokeStyle = "rgba(206,218,224,0.28)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.arc(position.x, position.y, stats.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    drawBody(
      ctx,
      position.x,
      position.y,
      config.radius,
      config.color,
      tower.flash,
      "rock",
      tower.type === "moon" ? "moon" : tower.type,
      0,
      0,
      time,
    );
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(tower.aimAngle);
    ctx.strokeStyle = tower.flash > 0 ? "rgba(255,246,224,0.94)" : "rgba(224,230,229,0.62)";
    ctx.lineWidth = tower.type === "ringed" ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(config.radius * 0.35, 0);
    ctx.lineTo(config.radius + 8, 0);
    ctx.stroke();
    ctx.restore();
    drawLevelPips(ctx, position.x, position.y + config.radius + 8, tower.level);
  }
}

function drawLevelPips(ctx: CanvasRenderingContext2D, x: number, y: number, level: number) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < level ? "rgba(230,232,224,0.7)" : "rgba(230,232,224,0.16)";
    ctx.beginPath();
    ctx.arc(x + (i - 1) * 5, y, 1.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemies(ctx: CanvasRenderingContext2D, world: DefenseWorld, time: number) {
  for (const enemy of world.enemies) {
    const glow = enemy.hitFlash;
    if (enemy.type === "raider") {
      drawRaider(ctx, enemy.x, enemy.y, enemy.radius, enemy.color, Math.atan2(enemy.vy, enemy.vx), glow);
    } else {
      drawBody(
        ctx,
        enemy.x,
        enemy.y,
        enemy.radius,
        enemy.color,
        glow,
        "rock",
        enemy.type === "comet" ? "comet" : "asteroid",
        enemy.vx,
        enemy.vy,
        time,
      );
    }
    if (enemy.type === "boss") {
      ctx.save();
      ctx.strokeStyle = "rgba(219,129,89,0.42)";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 5]);
      ctx.lineDashOffset = time * 8;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (enemy.hp < enemy.maxHp || enemy.type === "boss") drawHealthBar(ctx, enemy.x, enemy.y - enemy.radius - 10, enemy.hp / enemy.maxHp, enemy.type === "boss" ? 48 : 25);
    if (world.time < enemy.slowUntil) {
      ctx.save();
      ctx.strokeStyle = "rgba(151,210,232,0.58)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawRaider(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  angle: number,
  flash: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (flash > 0) {
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#f5eee4";
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(radius * 1.35, 0);
  ctx.lineTo(-radius * 0.8, radius * 0.75);
  ctx.lineTo(-radius * 0.35, 0);
  ctx.lineTo(-radius * 0.8, -radius * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(246,238,230,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, amount: number, width: number) {
  ctx.save();
  ctx.fillStyle = "rgba(3,4,5,0.68)";
  ctx.fillRect(x - width / 2, y, width, 3.5);
  ctx.fillStyle = amount > 0.4 ? "rgba(205,218,212,0.82)" : "rgba(207,104,78,0.9)";
  ctx.fillRect(x - width / 2, y, width * Math.max(0, amount), 3.5);
  ctx.restore();
}

function drawProjectiles(ctx: CanvasRenderingContext2D, world: DefenseWorld) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const projectile of world.projectiles) {
    const speed = Math.hypot(projectile.vx, projectile.vy) || 1;
    const ux = projectile.vx / speed;
    const uy = projectile.vy / speed;
    ctx.strokeStyle = hexAlpha(projectile.color, 0.35);
    ctx.lineWidth = projectile.radius * 1.4;
    ctx.beginPath();
    ctx.moveTo(projectile.x - ux * 12, projectile.y - uy * 12);
    ctx.lineTo(projectile.x, projectile.y);
    ctx.stroke();
    ctx.fillStyle = hexAlpha("#ffffff", 0.88);
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, world: DefenseWorld) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const particle of world.particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = hexAlpha(particle.color, alpha * 0.82);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlacementGhost(
  ctx: CanvasRenderingContext2D,
  world: DefenseWorld,
  slot: OrbitalSlot,
  type: TowerType,
  time: number,
) {
  const config = TOWER_CONFIGS[type];
  const affordable = world.stardust >= config.cost;
  const valid = slot.valid && affordable;
  ctx.save();
  ctx.globalAlpha = valid ? 0.72 : 0.36;
  drawBody(ctx, slot.x, slot.y, config.radius, valid ? config.color : "#a45f50", 0.25, "rock", type === "moon" ? "moon" : type, 0, 0, time);
  ctx.strokeStyle = valid ? "rgba(220,229,231,0.7)" : "rgba(202,91,72,0.72)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(slot.x, slot.y, config.radius + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function currentWaveLabel(world: DefenseWorld) {
  return WAVES[world.waveIndex]?.title ?? "Campaign complete";
}
