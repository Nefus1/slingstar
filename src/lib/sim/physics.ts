import { TRAIL_CAP, type Body, type BodyKind, type BodyStyle, type World } from "./types";
import { bodyName, hashSeed, nextRandom } from "./rng";
import type { TimelineEventType } from "./types";

export type { World } from "./types";

export const DEFAULT_G = 2600;
export const DEFAULT_SOFTENING = 18;
export const FIXED_DT = 1 / 90;
export const RADIUS_K = 3.35;
export const MAX_BODIES = 72;
export const CULL_DISTANCE = 9000;
export const THROW_SCALE = 2.15;

const ax: number[] = [];
const ay: number[] = [];

export function inferKind(mass: number): BodyKind {
  if (mass >= 18000) return "smbh";
  if (mass >= 3500) return "blackHole";
  if (mass >= 250) return "star";
  return "rock";
}

export function inferStyle(mass: number, kind: BodyKind): BodyStyle {
  if (kind === "smbh" || kind === "blackHole") return "blackHole";
  if (kind === "redGiant") return "redGiant";
  if (kind === "star") return "star";
  if (mass < 4) return "dust";
  if (mass < 12) return "moon";
  if (mass > 55) return "gas";
  return "terrestrial";
}

export function radiusFor(mass: number, kind: BodyKind): number {
  const cbrt = Math.cbrt(Math.max(mass, 0.4));
  switch (kind) {
    case "blackHole":
      return 6.5 + cbrt * 0.28;
    case "smbh":
      return 10 + cbrt * 0.32;
    case "redGiant":
      return RADIUS_K * cbrt * 1.65;
    default:
      return RADIUS_K * cbrt;
  }
}

export function radiusFromMass(mass: number): number {
  return radiusFor(mass, inferKind(mass));
}

function mergeKind(a: Body, b: Body): BodyKind {
  const total = a.mass + b.mass;
  if (a.kind === "smbh" || b.kind === "smbh" || total >= 18000) return "smbh";
  if (a.kind === "blackHole" || b.kind === "blackHole" || total >= 3500) return "blackHole";
  if (a.kind === "redGiant" || b.kind === "redGiant") return "redGiant";
  if (a.kind === "star" || b.kind === "star" || total >= 380) return "star";
  return "rock";
}

export function createWorld(seed = "HELIOS-17"): World {
  return {
    scene: "empty",
    stormWave: 0,
    nextEncounterAt: 18,
    bodies: [],
    bursts: [],
    sparks: [],
    G: DEFAULT_G,
    nextId: 1,
    softening: DEFAULT_SOFTENING,
    time: 0,
    mergeSerial: 0,
    lastMerge: null,
    seed,
    rngState: hashSeed(seed) ^ 0x9e3779b9,
    phenomena: [],
    nextPhenomenonId: 1,
    phenomenonSerial: 0,
    lastPhenomenon: null,
    pendingPhenomena: [],
    fragmentSerial: 0,
    timeline: [],
    nextTimelineId: 1,
    actions: [],
    galaxy: null,
  };
}

export function makeBody(
  world: World,
  spec: {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    mass: number;
    color: string;
    kind?: BodyKind;
    style?: BodyStyle;
    name?: string;
    fragmentGeneration?: number;
  },
): Body {
  const kind = spec.kind ?? inferKind(spec.mass);
  const radius = radiusFor(spec.mass, kind);
  const id = world.nextId++;
  const body: Body = {
    id,
    x: spec.x,
    y: spec.y,
    vx: spec.vx ?? 0,
    vy: spec.vy ?? 0,
    px: spec.x,
    py: spec.y,
    mass: spec.mass,
    radius,
    color: spec.color,
    kind,
    style: spec.style ?? inferStyle(spec.mass, kind),
    trail: new Float32Array(TRAIL_CAP * 2),
    trailHead: 0,
    trailLen: 0,
    glow: 0,
    name: spec.name ?? bodyName(world.seed, id, kind),
    bornAt: world.time,
    orbitCount: 0,
    closeCalls: 0,
    assists: 0,
    mergeCount: 0,
    distinctions: [],
    wormholeCooldown: 0,
    fragmentGeneration: spec.fragmentGeneration ?? 0,
  };
  return body;
}

export function addBody(
  world: World,
  spec: {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    mass: number;
    color: string;
    kind?: BodyKind;
    style?: BodyStyle;
    name?: string;
    fragmentGeneration?: number;
  },
): Body | null {
  if (world.bodies.length >= MAX_BODIES) return null;
  const body = makeBody(world, spec);
  world.bodies.push(body);
  return body;
}

export function clearWorld(world: World) {
  world.scene = "empty";
  world.stormWave = 0;
  world.nextEncounterAt = 18;
  world.bodies.length = 0;
  world.bursts.length = 0;
  world.sparks.length = 0;
  world.time = 0;
  world.nextId = 1;
  world.mergeSerial = 0;
  world.lastMerge = null;
  world.phenomena.length = 0;
  world.nextPhenomenonId = 1;
  world.phenomenonSerial = 0;
  world.lastPhenomenon = null;
  world.pendingPhenomena.length = 0;
  world.fragmentSerial = 0;
  world.timeline.length = 0;
  world.nextTimelineId = 1;
  world.actions.length = 0;
  world.galaxy = null;
}

export function setWorldSeed(world: World, seed: string) {
  world.seed = seed;
  world.rngState = hashSeed(seed) ^ 0x9e3779b9;
}

export function recordTimeline(
  world: World,
  type: TimelineEventType,
  title: string,
  detail: string,
  bodyIds: number[] = [],
) {
  world.timeline.push({
    id: world.nextTimelineId++,
    time: world.time,
    type,
    title,
    detail,
    bodyIds,
  });
  if (world.timeline.length > 48) world.timeline.splice(0, world.timeline.length - 48);
}

function emitPhenomenon(
  world: World,
  kind: "wormhole" | "fragment" | "nova" | "well",
  title: string,
  detail: string,
  bodyId?: number,
) {
  world.phenomenonSerial += 1;
  world.lastPhenomenon = {
    serial: world.phenomenonSerial,
    kind,
    title,
    detail,
    bodyId,
  };
  world.pendingPhenomena.push(world.lastPhenomenon);
  if (world.pendingPhenomena.length > 72) world.pendingPhenomena.shift();
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  return [
    parseInt(n.slice(0, 2), 16) || 0,
    parseInt(n.slice(2, 4), 16) || 0,
    parseInt(n.slice(4, 6), 16) || 0,
  ];
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, "0");
}

function ensureAccel(n: number) {
  while (ax.length < n) {
    ax.push(0);
    ay.push(0);
  }
}

function accelerations(world: World, bodies: Body[]) {
  const n = bodies.length;
  const eps2 = world.softening * world.softening;
  const G = world.G;
  ensureAccel(n);
  for (let i = 0; i < n; i++) {
    ax[i] = 0;
    ay[i] = 0;
  }
  for (let i = 0; i < n; i++) {
    const a = bodies[i]!;
    for (let j = i + 1; j < n; j++) {
      const b = bodies[j]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const r2 = dx * dx + dy * dy + eps2;
      const inv = G / (r2 * Math.sqrt(r2));
      const fx = dx * inv;
      const fy = dy * inv;
      ax[i]! += fx * b.mass;
      ay[i]! += fy * b.mass;
      ax[j]! -= fx * a.mass;
      ay[j]! -= fy * a.mass;
    }
  }
  for (const phenomenon of world.phenomena) {
    if (phenomenon.kind !== "gravityWell") continue;
    const strength = Math.max(0, phenomenon.life / phenomenon.maxLife);
    for (let i = 0; i < n; i++) {
      const body = bodies[i]!;
      const dx = phenomenon.x - body.x;
      const dy = phenomenon.y - body.y;
      const r2 = dx * dx + dy * dy + eps2;
      const inv = (G * phenomenon.mass * strength) / (r2 * Math.sqrt(r2));
      ax[i]! += dx * inv;
      ay[i]! += dy * inv;
    }
  }
}

function recordTrail(body: Body) {
  const i = body.trailHead;
  body.trail[i * 2] = body.x;
  body.trail[i * 2 + 1] = body.y;
  body.trailHead = (body.trailHead + 1) % TRAIL_CAP;
  if (body.trailLen < TRAIL_CAP) body.trailLen++;
}

function mergePair(world: World, a: Body, b: Body): Body {
  const beforeA = a.kind;
  const beforeB = b.kind;
  const heavy = a.mass >= b.mass ? a : b;
  const light = heavy === a ? b : a;
  const m = a.mass + b.mass;
  const x = (a.x * a.mass + b.x * b.mass) / m;
  const y = (a.y * a.mass + b.y * b.mass) / m;
  const vx = (a.vx * a.mass + b.vx * b.mass) / m;
  const vy = (a.vy * a.mass + b.vy * b.mass) / m;
  const t = light.mass / m;
  heavy.x = x;
  heavy.y = y;
  heavy.px = x;
  heavy.py = y;
  heavy.vx = vx;
  heavy.vy = vy;
  heavy.mass = m;
  heavy.kind = mergeKind(a, b);
  if (heavy.style !== "gargantua") {
    if (heavy.kind !== "rock") heavy.style = inferStyle(m, heavy.kind);
    else if (["dust", "asteroid", "comet", "moon"].includes(heavy.style) && m >= 14)
      heavy.style = "terrestrial";
  }
  heavy.radius = radiusFor(m, heavy.kind);
  heavy.color = mixHex(heavy.color, light.color, t * 0.65);
  heavy.glow = 1;
  heavy.mergeCount += 1 + light.mergeCount;
  heavy.orbitCount = Math.max(heavy.orbitCount, light.orbitCount);
  heavy.closeCalls += light.closeCalls;
  heavy.assists += light.assists;
  if (!heavy.distinctions.includes("Collision survivor")) {
    heavy.distinctions.push("Collision survivor");
  }
  if (heavy.distinctions.length > 5) heavy.distinctions.splice(0, heavy.distinctions.length - 5);
  const formedHorizon =
    (heavy.kind === "blackHole" || heavy.kind === "smbh") &&
    beforeA !== "blackHole" &&
    beforeA !== "smbh" &&
    beforeB !== "blackHole" &&
    beforeB !== "smbh";
  world.mergeSerial += 1;
  world.lastMerge = {
    serial: world.mergeSerial,
    x,
    y,
    totalMass: m,
    absorbedMass: light.mass,
    kind: heavy.kind,
    formedHorizon,
    survivorId: heavy.id,
    survivorName: heavy.name,
    absorbedName: light.name,
  };
  if (light.trailLen > heavy.trailLen) {
    heavy.trail = light.trail;
    heavy.trailHead = light.trailHead;
    heavy.trailLen = light.trailLen;
  }
  world.bursts.push({
    x,
    y,
    life: 1,
    color: heavy.color,
    maxR: Math.max(heavy.radius * 4.5, 28),
  });
  const nSparks = 8 + Math.min(10, Math.floor(Math.sqrt(light.mass)));
  for (let i = 0; i < nSparks; i++) {
    const ang = (Math.PI * 2 * i) / nSparks + nextRandom(world) * 0.4;
    const sp = 40 + nextRandom(world) * 90;
    world.sparks.push({
      x,
      y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: 0.55 + nextRandom(world) * 0.45,
      color: mixHex(heavy.color, "#f4f1e8", 0.35),
    });
  }
  recordTimeline(
    world,
    "merge",
    `${heavy.name} survived a merger`,
    `${light.name} was absorbed at ${Math.round(m)} combined mass.`,
    [heavy.id, light.id],
  );
  return light;
}

function fragmentBody(world: World, victim: Body, impactX: number, impactY: number): boolean {
  if (world.bodies.length > MAX_BODIES - 4 || victim.mass < 5) return false;
  const index = world.bodies.indexOf(victim);
  if (index < 0) return false;
  const count = 3 + Math.floor(nextRandom(world) * 2);
  const baseMass = victim.mass / count;
  const phase = nextRandom(world) * Math.PI * 2;
  world.bodies.splice(index, 1);
  const children: Body[] = [];
  for (let i = 0; i < count; i++) {
    const angle = phase + (i / count) * Math.PI * 2;
    const spread = 18 + nextRandom(world) * 22;
    const massBias = 0.78 + nextRandom(world) * 0.38;
    const child = makeBody(world, {
      x: victim.x + Math.cos(angle) * (victim.radius + 22),
      y: victim.y + Math.sin(angle) * (victim.radius + 22),
      vx: victim.vx + Math.cos(angle) * spread,
      vy: victim.vy + Math.sin(angle) * spread,
      mass: baseMass * massBias,
      color: mixHex(victim.color, "#c9c3b9", 0.18 + i * 0.04),
      kind: "rock",
      style: "asteroid",
      name: `${victim.name} ${String.fromCharCode(65 + i)}`,
      fragmentGeneration: victim.fragmentGeneration + 1,
    });
    child.distinctions = [...victim.distinctions.slice(-2), "Fragment descendant"];
    children.push(child);
  }
  const total = children.reduce((sum, child) => sum + child.mass, 0) || 1;
  const correction = victim.mass / total;
  for (const child of children) {
    child.mass *= correction;
    child.radius = radiusFor(child.mass, child.kind);
    world.bodies.push(child);
  }
  world.fragmentSerial += 1;
  world.bursts.push({
    x: impactX,
    y: impactY,
    life: 1,
    color: victim.color,
    maxR: Math.max(38, victim.radius * 5.5),
  });
  for (let i = 0; i < 16; i++) {
    const angle = phase + (i / 16) * Math.PI * 2;
    const speed = 65 + nextRandom(world) * 110;
    world.sparks.push({
      x: impactX,
      y: impactY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45 + nextRandom(world) * 0.55,
      color: mixHex(victim.color, "#f4f1e8", 0.42),
    });
  }
  const detail = `${victim.name} split into ${count} momentum-bearing fragments.`;
  emitPhenomenon(world, "fragment", "Fragmentation event", detail, children[0]?.id);
  recordTimeline(
    world,
    "fragment",
    `${victim.name} broke apart`,
    detail,
    children.map((body) => body.id),
  );
  return true;
}

function resolveCollisions(world: World, bodies: Body[]): boolean {
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i]!;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = (a.radius + b.radius) * 0.82;
      if (dx * dx + dy * dy < min * min) {
        const relativeSpeed = Math.hypot(a.vx - b.vx, a.vy - b.vy);
        const fragmentCandidate = a.mass <= b.mass ? a : b;
        const canFragment =
          a.kind === "rock" &&
          b.kind === "rock" &&
          relativeSpeed > 118 &&
          fragmentCandidate.mass > 5 &&
          fragmentCandidate.fragmentGeneration < 2 &&
          a.mass + b.mass < 210;
        if (
          canFragment &&
          fragmentBody(world, fragmentCandidate, (a.x + b.x) / 2, (a.y + b.y) / 2)
        ) {
          const survivor = fragmentCandidate === a ? b : a;
          const nx = dx / (Math.hypot(dx, dy) || 1);
          const ny = dy / (Math.hypot(dx, dy) || 1);
          survivor.vx -= nx * 5;
          survivor.vy -= ny * 5;
          return true;
        }
        const light = mergePair(world, a, b);
        const idx = bodies.indexOf(light);
        if (idx >= 0) bodies.splice(idx, 1);
        return true;
      }
    }
  }
  return false;
}

function integrate(world: World, bodies: Body[], dt: number) {
  accelerations(world, bodies);
  const n = bodies.length;
  const half = 0.5 * dt * dt;
  const oldAx = ax.slice(0, n);
  const oldAy = ay.slice(0, n);
  for (let i = 0; i < n; i++) {
    const b = bodies[i]!;
    b.px = b.x;
    b.py = b.y;
    b.x += b.vx * dt + oldAx[i]! * half;
    b.y += b.vy * dt + oldAy[i]! * half;
  }
  accelerations(world, bodies);
  for (let i = 0; i < n; i++) {
    const b = bodies[i]!;
    b.vx += 0.5 * (oldAx[i]! + ax[i]!) * dt;
    b.vy += 0.5 * (oldAy[i]! + ay[i]!) * dt;
  }
}

function substepCount(bodies: Body[], dt: number): number {
  let maxV = 0;
  for (const b of bodies) {
    const s = b.vx * b.vx + b.vy * b.vy;
    if (s > maxV) maxV = s;
  }
  const travel = Math.sqrt(maxV) * dt;
  if (travel < 10) return 1;
  return Math.min(10, Math.ceil(travel / 10));
}

export function spawnWormhole(world: World, ax0: number, ay0: number, bx0: number, by0: number) {
  const separation = Math.hypot(bx0 - ax0, by0 - ay0);
  if (separation < 70) return null;
  const pair = {
    kind: "wormhole" as const,
    id: world.nextPhenomenonId++,
    ax: ax0,
    ay: ay0,
    bx: bx0,
    by: by0,
    radius: 18,
    phase: nextRandom(world) * Math.PI * 2,
    uses: 0,
  };
  world.phenomena.push(pair);
  recordTimeline(
    world,
    "wormhole",
    "Fold-space gate opened",
    `Twin apertures now bridge ${Math.round(separation)} field units.`,
  );
  return pair;
}

export function spawnShockwave(world: World, x: number, y: number) {
  const shockwave = {
    kind: "shockwave" as const,
    id: world.nextPhenomenonId++,
    x,
    y,
    radius: 4,
    previousRadius: 0,
    maxRadius: 560,
    speed: 175,
    force: 62,
    color: "#d8a184",
    hitIds: [],
  };
  world.phenomena.push(shockwave);
  world.bursts.push({ x, y, life: 1, color: shockwave.color, maxR: 48 });
  const detail = "A controlled supernova pulse is crossing the field.";
  emitPhenomenon(world, "nova", "Supernova shockwave", detail);
  recordTimeline(world, "nova", "Supernova pulse deployed", detail);
  return shockwave;
}

export function spawnGravityWell(world: World, x: number, y: number) {
  const well = {
    kind: "gravityWell" as const,
    id: world.nextPhenomenonId++,
    x,
    y,
    mass: 880,
    radius: 26,
    life: 18,
    maxLife: 18,
  };
  world.phenomena.push(well);
  const detail = "A temporary gravity well will decay over 18 simulated seconds.";
  emitPhenomenon(world, "well", "Gravity well anchored", detail);
  recordTimeline(world, "well", "Temporary well anchored", detail);
  return well;
}

function processWormholes(world: World, dt: number) {
  for (const body of world.bodies) {
    body.wormholeCooldown = Math.max(0, body.wormholeCooldown - dt);
  }
  for (const phenomenon of world.phenomena) {
    if (phenomenon.kind !== "wormhole") continue;
    for (const body of world.bodies) {
      if (body.wormholeCooldown > 0) continue;
      const da = Math.hypot(body.x - phenomenon.ax, body.y - phenomenon.ay);
      const db = Math.hypot(body.x - phenomenon.bx, body.y - phenomenon.by);
      const enteredA = da < phenomenon.radius + body.radius * 0.35;
      const enteredB = db < phenomenon.radius + body.radius * 0.35;
      if (!enteredA && !enteredB) continue;
      const exitX = enteredA ? phenomenon.bx : phenomenon.ax;
      const exitY = enteredA ? phenomenon.by : phenomenon.ay;
      const speed = Math.hypot(body.vx, body.vy);
      const ux = speed > 1 ? body.vx / speed : Math.cos(phenomenon.phase);
      const uy = speed > 1 ? body.vy / speed : Math.sin(phenomenon.phase);
      const clearance = phenomenon.radius + body.radius + 6;
      body.x = exitX + ux * clearance;
      body.y = exitY + uy * clearance;
      body.px = body.x;
      body.py = body.y;
      body.wormholeCooldown = 1.1;
      body.glow = 1;
      phenomenon.uses += 1;
      if (!body.distinctions.includes("Fold-space traveler"))
        body.distinctions.push("Fold-space traveler");
      const detail = `${body.name} crossed the gate with momentum preserved.`;
      emitPhenomenon(world, "wormhole", "Wormhole transit", detail, body.id);
      recordTimeline(world, "wormhole", `${body.name} crossed fold-space`, detail, [body.id]);
      world.bursts.push({ x: exitX, y: exitY, life: 1, color: "#aebdca", maxR: 58 });
      break;
    }
  }
}

function processTidalDisruption(world: World) {
  const holes = world.bodies.filter((body) => body.kind === "blackHole" || body.kind === "smbh");
  if (holes.length === 0) return;
  for (const body of [...world.bodies]) {
    if (body.kind !== "rock" || body.mass < 5 || body.fragmentGeneration > 0) continue;
    for (const hole of holes) {
      if (hole.id === body.id) continue;
      const distance = Math.hypot(body.x - hole.x, body.y - hole.y);
      const relativeSpeed = Math.hypot(body.vx - hole.vx, body.vy - hole.vy);
      const roche = Math.max(58, hole.radius * 5.4 + body.radius);
      if (distance < roche && distance > hole.radius + body.radius && relativeSpeed > 72) {
        fragmentBody(world, body, body.x, body.y);
        return;
      }
    }
  }
}

function tickPhenomena(world: World, dt: number) {
  processWormholes(world, dt);
  for (let i = world.phenomena.length - 1; i >= 0; i--) {
    const phenomenon = world.phenomena[i]!;
    if (phenomenon.kind === "shockwave") {
      phenomenon.previousRadius = phenomenon.radius;
      phenomenon.radius += phenomenon.speed * dt;
      for (const body of world.bodies) {
        if (phenomenon.hitIds.includes(body.id)) continue;
        const dx = body.x - phenomenon.x;
        const dy = body.y - phenomenon.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance > phenomenon.previousRadius && distance <= phenomenon.radius + body.radius) {
          const kick = phenomenon.force * (1 - distance / phenomenon.maxRadius) + 12;
          body.vx += (dx / distance) * kick;
          body.vy += (dy / distance) * kick;
          body.glow = Math.max(body.glow, 0.75);
          phenomenon.hitIds.push(body.id);
        }
      }
      if (phenomenon.radius >= phenomenon.maxRadius) world.phenomena.splice(i, 1);
    } else if (phenomenon.kind === "gravityWell") {
      phenomenon.life -= dt;
      if (phenomenon.life <= 0) world.phenomena.splice(i, 1);
    }
  }
}

export function stepWorld(world: World, dt: number, record = true) {
  const bodies = world.bodies;
  stepGalaxy(world, dt);
  if (bodies.length === 0) {
    world.time += dt;
    tickPhenomena(world, dt);
    tickFx(world, dt);
    return;
  }
  world.time += dt;
  tickEncounters(world);
  const subs = substepCount(bodies, dt);
  const h = dt / subs;
  for (let s = 0; s < subs; s++) {
    integrate(world, bodies, h);
    let guard = 0;
    while (resolveCollisions(world, bodies) && guard++ < 12) {
      /* merge cascade */
    }
  }
  processTidalDisruption(world);
  tickPhenomena(world, dt);
  if (record) {
    for (const b of bodies) recordTrail(b);
  }
  cullFar(world);
  tickFx(world, dt);
}

function tickEncounters(world: World) {
  if (world.scene !== "cometStorm" || world.time < world.nextEncounterAt) return;
  world.nextEncounterAt += 18;
  world.stormWave += 1;
  const host = world.bodies.find((body) => body.name === "Vigil");
  if (!host) return;
  const count = Math.min(12, 5 + world.stormWave);
  for (let i = 0; i < count; i++) {
    const angle = nextRandom(world) * Math.PI * 2;
    const distance = 650 + nextRandom(world) * 160;
    const speed = 70 + Math.min(50, world.stormWave * 6) + nextRandom(world) * 25;
    const skew = (nextRandom(world) - 0.5) * 0.65;
    addBody(world, {
      x: host.x + Math.cos(angle) * distance,
      y: host.y + Math.sin(angle) * distance,
      vx: host.vx - Math.cos(angle + skew) * speed,
      vy: host.vy - Math.sin(angle + skew) * speed,
      mass: 4 + nextRandom(world) * 5,
      color: "#b9ddec",
      kind: "rock",
      style: "comet",
      name: `Wave ${world.stormWave + 1} · Comet ${i + 1}`,
    });
  }
  recordTimeline(
    world,
    "scene",
    `Comet wave ${world.stormWave + 1} inbound`,
    `${count} visitors incoming. Redirect them to protect the inner worlds.`,
  );
}

function stepGalaxy(world: World, dt: number) {
  const galaxy = world.galaxy;
  if (!galaxy) return;
  galaxy.formation = Math.min(1, galaxy.formation + galaxy.formationRate * dt);
  galaxy.barAngle += dt * (galaxy.kind === "milkyWay" ? 0.005 : 0.009);
  for (const star of galaxy.stars) star.angle += star.speed * dt;
}

function tickFx(world: World, dt: number) {
  for (let i = world.bursts.length - 1; i >= 0; i--) {
    const burst = world.bursts[i]!;
    burst.life -= dt * 1.6;
    if (burst.life <= 0) world.bursts.splice(i, 1);
  }
  for (let i = world.sparks.length - 1; i >= 0; i--) {
    const spark = world.sparks[i]!;
    spark.life -= dt * 1.35;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vx *= 0.985;
    spark.vy *= 0.985;
    if (spark.life <= 0) world.sparks.splice(i, 1);
  }
  for (const b of world.bodies) {
    if (b.glow > 0) b.glow = Math.max(0, b.glow - dt * 1.8);
  }
}

function cullFar(world: World) {
  const bodies = world.bodies;
  if (bodies.length === 0) return;
  let cx = 0;
  let cy = 0;
  let m = 0;
  for (const b of bodies) {
    cx += b.x * b.mass;
    cy += b.y * b.mass;
    m += b.mass;
  }
  cx /= m;
  cy /= m;
  const lim2 = CULL_DISTANCE * CULL_DISTANCE;
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i]!;
    const dx = b.x - cx;
    const dy = b.y - cy;
    if (dx * dx + dy * dy > lim2) bodies.splice(i, 1);
  }
}

export function barycenter(bodies: Body[]): { x: number; y: number } {
  if (bodies.length === 0) return { x: 0, y: 0 };
  let cx = 0;
  let cy = 0;
  let m = 0;
  for (const b of bodies) {
    cx += b.x * b.mass;
    cy += b.y * b.mass;
    m += b.mass;
  }
  return { x: cx / m, y: cy / m };
}

export function zeroMomentumAndCenter(bodies: Body[]) {
  if (bodies.length === 0) return;
  let px = 0;
  let py = 0;
  let cx = 0;
  let cy = 0;
  let m = 0;
  for (const b of bodies) {
    px += b.vx * b.mass;
    py += b.vy * b.mass;
    cx += b.x * b.mass;
    cy += b.y * b.mass;
    m += b.mass;
  }
  const vx = px / m;
  const vy = py / m;
  cx /= m;
  cy /= m;
  for (const b of bodies) {
    b.vx -= vx;
    b.vy -= vy;
    b.x -= cx;
    b.y -= cy;
    b.px = b.x;
    b.py = b.y;
  }
}

export function circularVelocity(
  host: { x: number; y: number; vx: number; vy: number; mass: number },
  x: number,
  y: number,
  G: number,
  retrograde = false,
): { vx: number; vy: number } {
  const dx = x - host.x;
  const dy = y - host.y;
  const r = Math.hypot(dx, dy) || 1;
  const v = Math.sqrt((G * host.mass) / r);
  const s = retrograde ? -1 : 1;
  return {
    vx: host.vx + (-dy / r) * v * s,
    vy: host.vy + (dx / r) * v * s,
  };
}

export function predictPath(
  world: World,
  ghost: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    mass: number;
    color: string;
    kind?: BodyKind;
    style?: BodyStyle;
  },
  seconds = 3.4,
): { x: number; y: number }[] {
  const sim = createWorld(world.seed);
  sim.G = world.G;
  sim.softening = world.softening;
  sim.rngState = world.rngState;
  sim.phenomena = structuredClone(world.phenomena);
  sim.nextPhenomenonId = world.nextPhenomenonId;
  for (const b of world.bodies) {
    const c = makeBody(sim, {
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      mass: b.mass,
      color: b.color,
      kind: b.kind,
      style: b.style,
    });
    c.radius = b.radius;
    sim.bodies.push(c);
  }
  const g = makeBody(sim, ghost);
  sim.bodies.push(g);
  const gid = g.id;
  const path: { x: number; y: number }[] = [{ x: g.x, y: g.y }];
  const steps = Math.min(260, Math.floor(seconds / FIXED_DT));
  for (let i = 0; i < steps; i++) {
    stepWorld(sim, FIXED_DT, false);
    const live = sim.bodies.find((b) => b.id === gid);
    if (!live) break;
    if (i % 2 === 0) path.push({ x: live.x, y: live.y });
  }
  return path;
}

export function lerpBody(body: Body, alpha: number): { x: number; y: number } {
  return {
    x: body.px + (body.x - body.px) * alpha,
    y: body.py + (body.y - body.py) * alpha,
  };
}
