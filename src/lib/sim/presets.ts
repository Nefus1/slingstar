import {
  addBody,
  barycenter,
  circularVelocity,
  clearWorld,
  DEFAULT_G,
  recordTimeline,
  setWorldSeed,
  zeroMomentumAndCenter,
  type World,
} from "./physics";
import { createRng, randomSeed } from "./rng";
import type { BodyStyle, GalaxyStar, SceneId } from "./types";

const C = {
  star: "#f0e2b6",
  starB: "#e8d4a4",
  rust: "#c17a5a",
  ice: "#8eacc0",
  sage: "#8d9a86",
  copper: "#c4926a",
  stone: "#b4aea6",
  ocean: "#3984a8",
  desert: "#d49b5f",
  frost: "#9fc5d5",
  lava: "#e25d32",
  ringed: "#c1aa78",
};

export function loadScene(world: World, id: SceneId, seed?: string) {
  clearWorld(world);
  setWorldSeed(world, seed ?? (id === "remix" || id === "galaxy" ? randomSeed() : `APSIS-${id.toUpperCase()}`));
  world.G = DEFAULT_G;
  world.softening = 18;
  const rng = createRng(`${world.seed}:scene`);
  recordTimeline(world, "scene", `${sceneLabel(id)} field loaded`, `Experiment seed ${world.seed}.`);

  if (id === "empty") return;

  if (id === "helios") {
    const star = addBody(world, {
      x: 0,
      y: 0,
      mass: 560,
      color: C.star,
      kind: "star",
      name: "Helios",
    })!;
    placeCircular(world, star, 132, 22, C.rust, 0);
    placeCircular(world, star, 210, 18, C.ice, 0.04);
    placeCircular(world, star, 305, 28, C.sage, -0.03);
    placeCircular(world, star, 412, 8, C.stone, 0.08, true);
    zeroMomentumAndCenter(world.bodies);
    return;
  }

  if (id === "binary") {
    const D = 168;
    const m = 300;
    const v = Math.sqrt((world.G * m) / (2 * D));
    addBody(world, {
      x: -D / 2,
      y: 0,
      vx: 0,
      vy: v,
      mass: m,
      color: C.star,
      kind: "star",
      name: "Castor",
    });
    addBody(world, {
      x: D / 2,
      y: 0,
      vx: 0,
      vy: -v,
      mass: m,
      color: C.starB,
      kind: "star",
      name: "Pollux",
    });
    const pair = { x: 0, y: 0, vx: 0, vy: 0, mass: m * 2 };
    const px = 0;
    const py = 340;
    const pv = circularVelocity(pair, px, py, world.G);
    addBody(world, {
      x: px,
      y: py,
      vx: pv.vx,
      vy: pv.vy,
      mass: 16,
      color: C.ice,
    });
    zeroMomentumAndCenter(world.bodies);
    return;
  }

  if (id === "figure8") {
    // Chenciner–Montgomery figure-8 (G=1, m=1), scaled into the lab.
    const scale = 128;
    const mass = 42;
    const vScale = Math.sqrt((world.G * mass) / scale);
    const pts = [
      { x: 0.97000436, y: -0.24308753, vx: 0.466203685, vy: 0.43236573 },
      { x: -0.97000436, y: 0.24308753, vx: 0.466203685, vy: 0.43236573 },
      { x: 0, y: 0, vx: -0.93240737, vy: -0.86473146 },
    ];
    const colors = [C.rust, C.ice, C.sage];
    pts.forEach((p, i) => {
      addBody(world, {
        x: p.x * scale,
        y: p.y * scale,
        vx: p.vx * vScale,
        vy: p.vy * vScale,
        mass,
        color: colors[i]!,
      });
    });
    zeroMomentumAndCenter(world.bodies);
    return;
  }

  if (id === "slingshot") {
    const star = addBody(world, {
      x: 0,
      y: 0,
      mass: 620,
      color: C.star,
      kind: "star",
      name: "Atlas",
    })!;
    placeCircular(world, star, 240, 20, C.copper, 0);
    addBody(world, {
      x: -520,
      y: -118,
      vx: 118,
      vy: 18,
      mass: 6,
      color: C.ice,
    });
    zeroMomentumAndCenter(world.bodies);
    return;
  }

  if (id === "horizon") {
    const hole = addBody(world, {
      x: 0,
      y: 0,
      mass: 6200,
      color: "#d4a078",
      kind: "blackHole",
      name: "Morrow Well",
    })!;
    const colors = [C.ice, C.rust, C.sage, C.copper, C.stone, C.starB];
    for (let i = 0; i < 9; i++) {
      placeCircular(
        world,
        hole,
        118 + i * 42,
        3 + (i % 4) * 3.5,
        colors[i % colors.length]!,
        i * 0.137,
        i % 3 === 0,
      );
    }
    zeroMomentumAndCenter(world.bodies);
    return;
  }

  if (id === "mayhem") {
    const giant = addBody(world, {
      x: 0,
      y: 0,
      mass: 1800,
      color: "#e07040",
      kind: "redGiant",
      name: "Cinder Crown",
    })!;
    const colors = [C.rust, C.ice, C.sage, C.copper, C.stone];
    for (let i = 0; i < 15; i++) {
      const band = i % 2;
      placeCircular(
        world,
        giant,
        176 + band * 96 + (i % 5) * 9,
        i % 5 === 0 ? 18 : 2.4 + (i % 3) * 2,
        colors[i % colors.length]!,
        i / 15,
        i % 4 === 0,
      );
    }
    zeroMomentumAndCenter(world.bodies);
    return;
  }

  if (id === "galaxy") {
    world.softening = 26;
    world.galaxy = makeGalaxy("forge", rng);
    addBody(world, {
      x: 0,
      y: 0,
      mass: 26000,
      color: "#d5ae82",
      kind: "smbh",
      style: "blackHole",
      name: "Forgeheart",
    });
    recordTimeline(
      world,
      "scene",
      "Protogalactic cloud released",
      `${world.galaxy.stars.length} stellar seeds are collapsing into a spiral.`,
    );
    return;
  }

  if (id === "milkyway") {
    world.softening = 26;
    world.galaxy = makeGalaxy("milkyWay", rng);
    addBody(world, {
      x: 0,
      y: 0,
      mass: 26000,
      color: "#e3c19a",
      kind: "smbh",
      style: "blackHole",
      name: "Sagittarius A*",
    });
    recordTimeline(
      world,
      "scene",
      "Milky Way reconstruction online",
      "The galactic bar, four principal arms, Orion Spur, and Sol marker are mapped.",
    );
    return;
  }

  if (id === "accretion") {
    const star = addBody(world, {
      x: 0,
      y: 0,
      mass: 680,
      color: C.star,
      kind: "star",
      style: "star",
      name: "Nursery Sun",
    })!;
    const rubbleColors = ["#8f8172", "#a29280", "#766e67", "#b49b7a"];
    for (let i = 0; i < 38; i++) {
      const dist = 112 + rng() * 360;
      const phase = rng();
      const body = placeCircular(
        world,
        star,
        dist,
        2.2 + rng() * 5.8,
        rubbleColors[i % rubbleColors.length]!,
        phase,
        rng() < 0.06,
        "asteroid",
        `Planetesimal ${String(i + 1).padStart(2, "0")}`,
      );
      if (body) {
        const agitation = 0.88 + rng() * 0.25;
        body.vx *= agitation;
        body.vy *= agitation;
      }
    }
    for (const [index, style] of (["lava", "ocean", "ice"] as BodyStyle[]).entries()) {
      placeCircular(
        world,
        star,
        175 + index * 105,
        11 + index * 2,
        style === "lava" ? C.lava : style === "ocean" ? C.ocean : C.frost,
        0.17 + index * 0.29,
        false,
        style,
        `${style.charAt(0).toUpperCase() + style.slice(1)} embryo`,
      );
    }
    zeroMomentumAndCenter(world.bodies);
    recordTimeline(world, "scene", "Accretion disk seeded", "Collisions can now grow the three planetary embryos.");
    return;
  }

  if (id === "cometStorm") {
    const star = addBody(world, {
      x: 0,
      y: 0,
      mass: 640,
      color: C.star,
      kind: "star",
      style: "star",
      name: "Vigil",
    })!;
    placeCircular(world, star, 142, 22, C.desert, 0.08, false, "desert", "Sahra");
    placeCircular(world, star, 238, 27, C.ocean, 0.42, false, "ocean", "Pelagos");
    placeCircular(world, star, 348, 84, C.ringed, 0.7, false, "ringed", "Crown");
    for (let i = 0; i < 21; i++) {
      const angle = (i / 21) * Math.PI * 2 + (rng() - 0.5) * 0.18;
      const dist = 570 + rng() * 180;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      const aimX = (rng() - 0.5) * 230;
      const aimY = (rng() - 0.5) * 230;
      const dx = aimX - x;
      const dy = aimY - y;
      const length = Math.hypot(dx, dy) || 1;
      const speed = 72 + rng() * 55;
      const comet = i % 3 !== 0;
      addBody(world, {
        x,
        y,
        vx: (dx / length) * speed,
        vy: (dy / length) * speed,
        mass: comet ? 5 + rng() * 4 : 4 + rng() * 7,
        color: comet ? "#b9ddec" : "#9a8d7b",
        kind: "rock",
        style: comet ? "comet" : "asteroid",
        name: `${comet ? "Comet" : "Asteroid"} ${String(i + 1).padStart(2, "0")}`,
      });
    }
    zeroMomentumAndCenter(world.bodies);
    recordTimeline(world, "scene", "Comet storm inbound", "Fourteen icy visitors and seven asteroids are converging on the inner system.");
    return;
  }

  if (id === "gargantua") {
    world.softening = 30;
    const gargantua = addBody(world, {
      x: 0,
      y: 0,
      mass: 42000,
      color: "#f0b06e",
      kind: "smbh",
      style: "gargantua",
      name: "Gargantua",
    })!;
    placeCircular(world, gargantua, 270, 25, C.ocean, 0.13, false, "ocean", "Miller");
    placeCircular(world, gargantua, 410, 7, "#b9c1c6", 0.62, true, "asteroid", "Endurance");
    placeCircular(world, gargantua, 520, 20, C.frost, 0.82, false, "ice", "Mann");
    zeroMomentumAndCenter(world.bodies);
    recordTimeline(world, "scene", "Gargantua acquired", "A cinematic photon ring and lensed accretion disk dominate the field.");
    return;
  }

  if (id === "remix") {
    const starMass = 430 + rng() * 420;
    const star = addBody(world, {
      x: 0,
      y: 0,
      mass: starMass,
      color: rng() > 0.45 ? C.star : C.starB,
      kind: "star",
      name: "Seedstar",
    })!;
    const colors = [C.rust, C.ice, C.sage, C.copper, C.stone];
    const count = 5 + Math.floor(rng() * 6);
    for (let i = 0; i < count; i++) {
      placeCircular(
        world,
        star,
        110 + i * (38 + rng() * 17),
        3 + rng() * 44,
        colors[i % colors.length]!,
        rng(),
        rng() < 0.18,
      );
    }
    zeroMomentumAndCenter(world.bodies);
  }
}

function sceneLabel(id: SceneId) {
  return id === "figure8"
    ? "Figure-8"
    : id === "horizon"
      ? "Event horizon"
      : id === "milkyway"
        ? "Milky Way"
        : id === "cometStorm"
          ? "Comet Storm"
          : id === "accretion"
            ? "Planet Forge"
      : id.charAt(0).toUpperCase() + id.slice(1);
}

function makeGalaxy(kind: "forge" | "milkyWay", rng: () => number) {
  const milkyWay = kind === "milkyWay";
  const radius = milkyWay ? 720 : 680;
  const arms = 4;
  const count = milkyWay ? 760 : 640;
  const stars: GalaxyStar[] = [];
  const palette = milkyWay
    ? ["#f4e7c1", "#d9e9ff", "#a8c9f0", "#e3bb91", "#fff7e0"]
    : ["#d9e9ff", "#8fb8df", "#f0d7b4", "#d69a7a", "#ffffff"];

  for (let i = 0; i < count; i++) {
    const core = rng() < (milkyWay ? 0.24 : 0.18);
    const bar = rng() < (milkyWay ? 0.14 : 0.08);
    let starRadius: number;
    let angle: number;
    if (bar) {
      starRadius = Math.pow(rng(), 0.72) * (milkyWay ? 205 : 160);
      angle = (milkyWay ? -0.27 : 0.18) + (rng() < 0.5 ? 0 : Math.PI) + (rng() - 0.5) * 0.18;
    } else if (core) {
      starRadius = Math.pow(rng(), 1.7) * (milkyWay ? 165 : 145);
      angle = rng() * Math.PI * 2;
    } else {
      starRadius = 90 + Math.pow(rng(), 0.72) * (radius - 90);
      const arm = i % arms;
      const spiral = (starRadius / radius) * Math.PI * (milkyWay ? 3.15 : 3.65);
      const spread = (rng() - 0.5) * (milkyWay ? 0.38 : 0.5) * (0.55 + starRadius / radius);
      angle = (arm / arms) * Math.PI * 2 + spiral + spread;
    }
    const cloudAngle = rng() * Math.PI * 2;
    const cloudRadius = Math.pow(rng(), 0.55) * radius * 1.38;
    const depth = rng();
    stars.push({
      radius: starRadius,
      angle,
      speed: (0.003 + (1 - Math.min(1, starRadius / radius)) * 0.011) * (rng() < 0.04 ? -1 : 1),
      startX: Math.cos(cloudAngle) * cloudRadius,
      startY: Math.sin(cloudAngle) * cloudRadius * 0.78,
      size: rng() < 0.9 ? 0.8 + rng() * 1.25 : 2.1 + rng() * 1.5,
      color: palette[Math.floor(rng() * palette.length)]!,
      brightness: 0.34 + rng() * 0.64,
      depth,
      phase: rng() * Math.PI * 2,
    });
  }

  return {
    kind,
    label: milkyWay ? "Milky Way reconstruction" : "Seeded spiral galaxy",
    stars,
    formation: milkyWay ? 1 : 0.035,
    formationRate: milkyWay ? 0 : 0.042,
    arms,
    radius,
    coreRadius: milkyWay ? 155 : 138,
    barLength: milkyWay ? 210 : 165,
    barAngle: milkyWay ? -0.27 : 0.18,
    labels: milkyWay
      ? [
          { x: 0, y: 0, title: "Sagittarius A*", detail: "Galactic center", accent: "#f0c38e" },
          { x: 365, y: 118, title: "Sol", detail: "Orion Spur · you are here", accent: "#f4e7b9" },
          { x: -405, y: -220, title: "Perseus Arm", detail: "Outer spiral arm" },
        ]
      : [
          { x: 0, y: 0, title: "Forgeheart", detail: "Central attractor", accent: "#e0b58a" },
        ],
  };
}

function placeCircular(
  world: World,
  host: { x: number; y: number; vx: number; vy: number; mass: number },
  dist: number,
  mass: number,
  color: string,
  phase: number,
  retrograde = false,
  style?: BodyStyle,
  name?: string,
) {
  const ang = phase * Math.PI * 2;
  const x = host.x + Math.cos(ang) * dist;
  const y = host.y + Math.sin(ang) * dist;
  const v = circularVelocity(host, x, y, world.G, retrograde);
  return addBody(world, { x, y, vx: v.vx, vy: v.vy, mass, color, style, name });
}

export function sceneFocus(world: World): { x: number; y: number; scale: number } {
  if (world.galaxy) return { x: 0, y: 0, scale: Math.max(0.34, 280 / world.galaxy.radius) };
  if (world.bodies.length === 0) return { x: 0, y: 0, scale: 1 };
  const c = barycenter(world.bodies);
  let maxR = 80;
  for (const b of world.bodies) {
    const d = Math.hypot(b.x - c.x, b.y - c.y) + b.radius;
    if (d > maxR) maxR = d;
  }
  const scale = Math.min(1.35, Math.max(0.35, 280 / maxR));
  return { x: c.x, y: c.y, scale };
}
