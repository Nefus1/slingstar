import {
  TRAIL_CAP,
  type Body,
  type BodyKind,
  type BodyStyle,
  type GalaxySystem,
  type InstrumentId,
  type World,
} from "./types";
import { lerpBody } from "./physics";
import { createRng } from "./rng";

export function hexAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const r = parseInt(n.slice(0, 2), 16) || 0;
  const g = parseInt(n.slice(2, 4), 16) || 0;
  const b = parseInt(n.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

export function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const ch = (i: number) =>
    Math.max(0, Math.min(255, Math.round(parseInt(n.slice(i, i + 2), 16) * amt)));
  const r = ch(0);
  const g = ch(2);
  const b = ch(4);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export type Star = { x: number; y: number; r: number; a: number; layer: number };

export function makeStars(count = 220, seed = "APSIS-STARS"): Star[] {
  const rng = createRng(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rng(),
      y: rng(),
      r: rng() < 0.86 ? 0.6 + rng() * 0.7 : 1.2 + rng() * 1.1,
      a: 0.18 + rng() * 0.55,
      layer: rng() < 0.55 ? 0.15 : 0.4,
    });
  }
  return stars;
}

export function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  w: number,
  h: number,
  camX: number,
  camY: number,
  t: number,
) {
  ctx.save();
  for (const s of stars) {
    const px = ((s.x * w - camX * s.layer) % w + w) % w;
    const py = ((s.y * h - camY * s.layer) % h + h) % h;
    const twinkle = 0.72 + 0.28 * Math.sin(t * 0.6 + s.x * 40);
    ctx.fillStyle = `rgba(232,230,222,${s.a * twinkle})`;
    ctx.beginPath();
    ctx.arc(px, py, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawGalaxy(
  ctx: CanvasRenderingContext2D,
  galaxy: GalaxySystem,
  time: number,
) {
  const rawFormation = Math.max(0, Math.min(1, galaxy.formation));
  const formation = 1 - Math.pow(1 - rawFormation, 3);
  const flatten = galaxy.kind === "milkyWay" ? 0.68 : 0.74;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, galaxy.radius * 0.88);
  halo.addColorStop(0, `rgba(233,196,151,${0.095 * formation})`);
  halo.addColorStop(0.28, `rgba(126,163,202,${0.04 * formation})`);
  halo.addColorStop(1, "rgba(74,102,136,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(0, 0, galaxy.radius * 0.98, galaxy.radius * flatten, galaxy.barAngle * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Dust lanes make the arm geometry legible before the individual stars resolve.
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";
  for (let arm = 0; arm < galaxy.arms; arm++) {
    ctx.beginPath();
    for (let i = 0; i <= 44; i++) {
      const r = galaxy.coreRadius * 0.65 + (i / 44) * (galaxy.radius - galaxy.coreRadius * 0.65);
      const a = (arm / galaxy.arms) * Math.PI * 2 + (r / galaxy.radius) * Math.PI * (galaxy.kind === "milkyWay" ? 3.15 : 3.65) + galaxy.barAngle * 0.18;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * flatten;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(12,14,18,${0.16 * formation})`;
    ctx.lineWidth = 32;
    ctx.stroke();
    ctx.strokeStyle = `rgba(102,139,177,${0.07 * formation})`;
    ctx.lineWidth = 18;
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "lighter";
  for (const star of galaxy.stars) {
    const tx = Math.cos(star.angle) * star.radius;
    const ty = Math.sin(star.angle) * star.radius * flatten;
    const x = star.startX + (tx - star.startX) * formation;
    const y = star.startY + (ty - star.startY) * formation;
    const twinkle = 0.76 + 0.24 * Math.sin(time * (0.65 + star.depth) + star.phase);
    const alpha = star.brightness * twinkle * (0.42 + formation * 0.58);
    if (star.size > 2.15) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, star.size * 5.5);
      glow.addColorStop(0, hexAlpha(star.color, alpha * 0.32));
      glow.addColorStop(1, hexAlpha(star.color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, star.size * 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = hexAlpha(star.color, Math.min(0.96, alpha));
    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, galaxy.coreRadius * 1.45);
  core.addColorStop(0, `rgba(255,241,207,${0.38 * formation})`);
  core.addColorStop(0.18, `rgba(232,187,137,${0.22 * formation})`);
  core.addColorStop(0.56, `rgba(115,143,177,${0.065 * formation})`);
  core.addColorStop(1, "rgba(92,120,150,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(0, 0, galaxy.coreRadius * 1.55, galaxy.coreRadius * 0.72, galaxy.barAngle, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (rawFormation > 0.62) {
    const reveal = Math.min(1, (rawFormation - 0.62) / 0.28);
    ctx.save();
    ctx.globalAlpha = reveal;
    for (const label of galaxy.labels) drawGalaxyLabel(ctx, label.x, label.y, label.title, label.detail, label.accent);
    ctx.restore();
  }
}

function drawGalaxyLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  title: string,
  detail: string,
  accent = "#b7c8d6",
) {
  ctx.save();
  ctx.strokeStyle = hexAlpha(accent, 0.45);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 7);
  ctx.lineTo(x + 28, y - 28);
  ctx.lineTo(x + 78, y - 28);
  ctx.stroke();
  ctx.fillStyle = hexAlpha("#f4f1ea", 0.86);
  ctx.font = "600 23px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(title, x + 34, y - 38);
  ctx.fillStyle = hexAlpha("#c5c9cb", 0.68);
  ctx.font = "18px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(detail, x + 34, y - 15);
  ctx.restore();
}

export function drawTrails(
  ctx: CanvasRenderingContext2D,
  bodies: Body[],
  alpha: number,
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const body of bodies) {
    if (body.trailLen < 3) continue;
    const n = body.trailLen;
    ctx.beginPath();
    let first = true;
    for (let i = 0; i < n; i++) {
      const idx = (body.trailHead - n + i + TRAIL_CAP * 4) % TRAIL_CAP;
      let x = body.trail[idx * 2]!;
      let y = body.trail[idx * 2 + 1]!;
      if (i === n - 1) {
        const p = lerpBody(body, alpha);
        x = p.x;
        y = p.y;
      }
      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = hexAlpha(body.color, 0.22);
    ctx.lineWidth = Math.max(1.4, body.radius * 0.42);
    ctx.stroke();
    ctx.strokeStyle = hexAlpha(body.color, 0.55);
    ctx.lineWidth = Math.max(0.7, body.radius * 0.18);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  glow: number,
  kind: BodyKind = "rock",
  style?: BodyStyle,
  vx = 0,
  vy = 0,
  time = 0,
) {
  const bodyStyle = style ?? (kind === "star" ? "star" : kind === "redGiant" ? "redGiant" : kind === "blackHole" || kind === "smbh" ? "blackHole" : "terrestrial");
  if (bodyStyle === "gargantua") {
    drawGargantua(ctx, x, y, radius, glow, time);
    return;
  }
  if (kind === "blackHole" || kind === "smbh") {
    drawBlackHole(ctx, x, y, radius, color, glow, kind === "smbh");
    return;
  }
  if (kind === "redGiant") {
    drawRedGiant(ctx, x, y, radius, color, glow);
    return;
  }

  const isStar = kind === "star" || radius > 18;
  const r = radius;

  if (bodyStyle === "comet") drawCometTail(ctx, x, y, r, vx, vy, time);
  if (bodyStyle === "asteroid" || bodyStyle === "dust") {
    drawAsteroid(ctx, x, y, r, color, glow, bodyStyle === "dust");
    return;
  }

  ctx.save();
  const corona = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * (isStar ? 4.2 : 2.6));
  corona.addColorStop(0, hexAlpha(color, isStar ? 0.28 + glow * 0.2 : 0.16 + glow * 0.2));
  corona.addColorStop(0.45, hexAlpha(color, 0.06));
  corona.addColorStop(1, hexAlpha(color, 0));
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(x, y, r * (isStar ? 4.2 : 2.6), 0, Math.PI * 2);
  ctx.fill();

  if (!isStar && bodyStyle === "ringed") {
    ctx.strokeStyle = hexAlpha(shade(color, 1.28), 0.48);
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.65, r * 0.48, -0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = hexAlpha(color, 0.2);
    ctx.lineWidth = Math.max(2, r * 0.24);
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.8, r * 0.54, -0.28, 0, Math.PI * 2);
    ctx.stroke();
  }

  const hx = x - r * 0.32;
  const hy = y - r * 0.34;
  const body = ctx.createRadialGradient(hx, hy, r * 0.08, x, y, r);
  body.addColorStop(0, shade(color, isStar ? 1.35 : 1.22));
  body.addColorStop(0.42, color);
  body.addColorStop(1, shade(color, 0.42));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  if (!isStar && (bodyStyle === "gas" || bodyStyle === "ringed")) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.98, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = hexAlpha(shade(color, 1.18), 0.22);
    ctx.lineWidth = Math.max(1.4, r * 0.13);
    for (let band = -1; band <= 1; band++) {
      ctx.beginPath();
      ctx.ellipse(x, y + band * r * 0.36, r * 0.94, r * 0.16, -0.08, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (!isStar && bodyStyle === "ocean") {
    drawOceanSurface(ctx, x, y, r);
  } else if (!isStar && bodyStyle === "ice") {
    drawIceSurface(ctx, x, y, r);
  } else if (!isStar && bodyStyle === "lava") {
    drawLavaSurface(ctx, x, y, r, time);
  } else if (!isStar && bodyStyle === "desert") {
    drawDesertSurface(ctx, x, y, r);
  } else if (!isStar && r > 6) {
    ctx.fillStyle = hexAlpha(shade(color, 0.48), 0.22);
    ctx.beginPath();
    ctx.ellipse(x + r * 0.28, y + r * 0.12, r * 0.2, r * 0.14, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = hexAlpha("#f4f1ea", isStar ? 0.18 : 0.1);
  ctx.lineWidth = Math.max(0.6, r * 0.06);
  ctx.stroke();

  ctx.fillStyle = hexAlpha("#ffffff", isStar ? 0.35 : 0.18);
  ctx.beginPath();
  ctx.ellipse(hx, hy, r * 0.28, r * 0.18, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAsteroid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  glow: number,
  dust: boolean,
) {
  ctx.save();
  if (glow > 0) {
    ctx.shadowBlur = r * 2.4;
    ctx.shadowColor = color;
  }
  const points = dust ? 7 : 10;
  const phase = x * 0.013 + y * 0.009;
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2 + phase;
    const cr = r * (0.76 + 0.18 * Math.sin(i * 3.7 + phase));
    const px = x + Math.cos(angle) * cr;
    const py = y + Math.sin(angle) * cr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const rock = ctx.createRadialGradient(x - r * 0.3, y - r * 0.32, 0, x, y, r);
  rock.addColorStop(0, shade(color, 1.28));
  rock.addColorStop(0.46, color);
  rock.addColorStop(1, shade(color, 0.38));
  ctx.fillStyle = rock;
  ctx.fill();
  ctx.strokeStyle = hexAlpha("#f0ece5", 0.12);
  ctx.lineWidth = Math.max(0.7, r * 0.08);
  ctx.stroke();
  if (!dust && r > 5) {
    ctx.fillStyle = hexAlpha(shade(color, 0.42), 0.42);
    ctx.beginPath();
    ctx.ellipse(x + r * 0.25, y + r * 0.06, r * 0.22, r * 0.15, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCometTail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  vx: number,
  vy: number,
  time: number,
) {
  const speed = Math.hypot(vx, vy);
  const ux = speed > 1 ? -vx / speed : -0.94;
  const uy = speed > 1 ? -vy / speed : 0.34;
  const length = r * 5 + Math.min(82, speed * 0.22);
  const sideX = -uy;
  const sideY = ux;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const gradient = ctx.createLinearGradient(x, y, x + ux * length, y + uy * length);
  gradient.addColorStop(0, "rgba(207,237,249,0.58)");
  gradient.addColorStop(0.32, "rgba(127,185,220,0.22)");
  gradient.addColorStop(1, "rgba(94,148,186,0)");
  ctx.fillStyle = gradient;
  const flutter = Math.sin(time * 4.2 + x * 0.03) * r * 0.35;
  ctx.beginPath();
  ctx.moveTo(x + sideX * r * 0.58, y + sideY * r * 0.58);
  ctx.quadraticCurveTo(
    x + ux * length * 0.56 + sideX * flutter,
    y + uy * length * 0.56 + sideY * flutter,
    x + ux * length,
    y + uy * length,
  );
  ctx.quadraticCurveTo(
    x + ux * length * 0.48 - sideX * flutter,
    y + uy * length * 0.48 - sideY * flutter,
    x - sideX * r * 0.58,
    y - sideY * r * 0.58,
  );
  ctx.fill();
  ctx.restore();
}

function withPlanetClip(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, draw: () => void) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.98, 0, Math.PI * 2);
  ctx.clip();
  draw();
  ctx.restore();
}

function drawOceanSurface(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  withPlanetClip(ctx, x, y, r, () => {
    ctx.fillStyle = "rgba(185,218,202,0.5)";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.2, y + r * 0.08, r * 0.42, r * 0.2, -0.52, 0, Math.PI * 2);
    ctx.ellipse(x + r * 0.38, y - r * 0.28, r * 0.27, r * 0.16, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(224,241,242,0.28)";
    ctx.lineWidth = Math.max(0.8, r * 0.07);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(x, y + i * r * 0.25, r * (0.62 + i * 0.08), 0.2, 2.5);
      ctx.stroke();
    }
  });
}

function drawIceSurface(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  withPlanetClip(ctx, x, y, r, () => {
    ctx.strokeStyle = "rgba(238,251,255,0.46)";
    ctx.lineWidth = Math.max(0.65, r * 0.055);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x - r * (0.7 - i * 0.18), y - r * 0.72);
      ctx.lineTo(x + r * (0.55 - i * 0.12), y + r * 0.7);
      ctx.stroke();
    }
  });
}

function drawLavaSurface(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number) {
  withPlanetClip(ctx, x, y, r, () => {
    ctx.strokeStyle = "rgba(255,208,94,0.72)";
    ctx.shadowColor = "#ff7b36";
    ctx.shadowBlur = r * 0.45;
    ctx.lineWidth = Math.max(1, r * 0.09);
    for (let i = 0; i < 3; i++) {
      const offset = Math.sin(time * 0.45 + i * 2.1) * r * 0.08;
      ctx.beginPath();
      ctx.moveTo(x - r, y - r * 0.45 + i * r * 0.42);
      ctx.bezierCurveTo(x - r * 0.35, y + offset, x + r * 0.2, y - offset, x + r, y + r * 0.3);
      ctx.stroke();
    }
  });
}

function drawDesertSurface(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  withPlanetClip(ctx, x, y, r, () => {
    ctx.strokeStyle = "rgba(255,222,164,0.3)";
    ctx.lineWidth = Math.max(0.75, r * 0.06);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(x + i * r * 0.11, y + i * r * 0.18, r * 0.86, r * 0.2, -0.22, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function drawGargantua(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  glow: number,
  time: number,
) {
  const diskR = r * 7.2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const outer = ctx.createRadialGradient(x, y, r * 0.2, x, y, diskR * 1.18);
  outer.addColorStop(0, `rgba(255,229,190,${0.2 + glow * 0.08})`);
  outer.addColorStop(0.32, "rgba(235,151,82,0.08)");
  outer.addColorStop(1, "rgba(127,73,38,0)");
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(x, y, diskR * 1.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, y);
  const tilt = -0.13;
  ctx.rotate(tilt);
  // Lensed rear disk: light from behind bends above and below the horizon.
  ctx.strokeStyle = "rgba(255,229,191,0.58)";
  ctx.lineWidth = Math.max(2, r * 0.22);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 2.05, r * 1.72, 0, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  ctx.strokeStyle = "rgba(218,126,68,0.36)";
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 2.48, r * 2.02, 0, 0.06, Math.PI * 0.94);
  ctx.stroke();

  const disk = ctx.createLinearGradient(-diskR, 0, diskR, 0);
  disk.addColorStop(0, "rgba(110,167,230,0)");
  disk.addColorStop(0.12, "rgba(112,177,244,0.72)");
  disk.addColorStop(0.42, "rgba(255,242,213,0.96)");
  disk.addColorStop(0.58, "rgba(255,212,155,0.98)");
  disk.addColorStop(0.88, "rgba(233,98,47,0.76)");
  disk.addColorStop(1, "rgba(175,54,26,0)");
  ctx.fillStyle = disk;
  ctx.beginPath();
  ctx.ellipse(0, 0, diskR, r * (0.38 + 0.025 * Math.sin(time * 0.8)), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 1.22, 0, Math.PI * 2);
  ctx.fillStyle = "#010102";
  ctx.shadowColor = "#000";
  ctx.shadowBlur = r;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,241,220,0.92)";
  ctx.lineWidth = Math.max(1.4, r * 0.11);
  ctx.shadowColor = "#ffb66f";
  ctx.shadowBlur = r * 0.75;
  ctx.stroke();
  ctx.restore();
}

function drawRedGiant(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  glow: number,
) {
  ctx.save();
  const halo = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3.4);
  halo.addColorStop(0, hexAlpha(color, 0.32 + glow * 0.15));
  halo.addColorStop(0.4, hexAlpha(color, 0.1));
  halo.addColorStop(1, hexAlpha(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 3.4, 0, Math.PI * 2);
  ctx.fill();

  const hx = x - r * 0.22;
  const hy = y - r * 0.24;
  const body = ctx.createRadialGradient(hx, hy, r * 0.12, x, y, r);
  body.addColorStop(0, shade(color, 1.28));
  body.addColorStop(0.35, color);
  body.addColorStop(0.78, shade(color, 0.55));
  body.addColorStop(1, shade(color, 0.28));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hexAlpha("#1a0c08", 0.22);
  ctx.beginPath();
  ctx.ellipse(x + r * 0.28, y + r * 0.12, r * 0.22, r * 0.16, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hexAlpha("#ffd2a8", 0.22);
  ctx.beginPath();
  ctx.ellipse(hx, hy, r * 0.34, r * 0.22, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBlackHole(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  glow: number,
  supermassive: boolean,
) {
  const diskR = r * (supermassive ? 3.4 : 2.8);
  ctx.save();

  const well = ctx.createRadialGradient(x, y, r * 0.4, x, y, diskR * 2.2);
  well.addColorStop(0, hexAlpha(color, 0.22 + glow * 0.15));
  well.addColorStop(0.45, hexAlpha(color, 0.06));
  well.addColorStop(1, hexAlpha(color, 0));
  ctx.fillStyle = well;
  ctx.beginPath();
  ctx.arc(x, y, diskR * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, y);
  ctx.rotate(-0.42);
  ctx.scale(1, 0.38);
  const disk = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, diskR);
  disk.addColorStop(0, hexAlpha("#000000", 0));
  disk.addColorStop(0.42, hexAlpha(color, 0.15));
  disk.addColorStop(0.62, hexAlpha(shade(color, 1.25), supermassive ? 0.95 : 0.82));
  disk.addColorStop(0.78, hexAlpha(color, 0.55));
  disk.addColorStop(1, hexAlpha(color, 0));
  ctx.fillStyle = disk;
  ctx.beginPath();
  ctx.arc(0, 0, diskR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexAlpha("#f4efe4", supermassive ? 0.55 : 0.35);
  ctx.lineWidth = Math.max(1.1, r * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#050506";
  ctx.fill();
  ctx.strokeStyle = hexAlpha(color, 0.55);
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
  ctx.restore();
}

type FieldSample = { x: number; y: number; mass: number; color: string; hole?: boolean };

export function drawGravityField(
  ctx: CanvasRenderingContext2D,
  bodies: FieldSample[],
  G: number,
  softening: number,
  view: { x: number; y: number; scale: number; w: number; h: number },
) {
  if (bodies.length === 0) return;
  const eps2 = softening * softening;
  const halfW = view.w / (2 * view.scale);
  const halfH = view.h / (2 * view.scale);
  const pad = Math.max(halfW, halfH) * 0.12;
  const left = view.x - halfW - pad;
  const right = view.x + halfW + pad;
  const top = view.y - halfH - pad;
  const bottom = view.y + halfH + pad;
  const maxR = Math.hypot(halfW, halfH) * 1.15;

  const screenStep = 72;
  let worldStep = screenStep / view.scale;
  const nice = [8, 10, 12, 16, 20, 25, 32, 40, 50, 64, 80, 100, 128, 160, 200, 256, 320];
  worldStep = nice.find((n) => n >= worldStep) ?? 320;
  const originX = Math.floor(left / worldStep) * worldStep;
  const originY = Math.floor(top / worldStep) * worldStep;

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const warp = (x: number, y: number) => {
    let gx = 0;
    let gy = 0;
    for (const b of bodies) {
      const dx = b.x - x;
      const dy = b.y - y;
      const r2 = dx * dx + dy * dy + eps2;
      const inv = (G * b.mass) / (r2 * Math.sqrt(r2));
      gx += dx * inv;
      gy += dy * inv;
    }
    const mag = Math.hypot(gx, gy);
    const s = mag > 1e-6 ? Math.min(mag * 0.2, 34) / mag : 0;
    return { x: x + gx * s, y: y + gy * s, mag };
  };

  const cols = Math.ceil((right - originX) / worldStep) + 1;
  const rows = Math.ceil((bottom - originY) / worldStep) + 1;
  const pts: { x: number; y: number; mag: number }[] = new Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    const y = originY + j * worldStep;
    for (let i = 0; i < cols; i++) {
      pts[j * cols + i] = warp(originX + i * worldStep, y);
    }
  }

  ctx.lineWidth = 1 / view.scale;
  for (let j = 0; j < rows; j++) {
    ctx.beginPath();
    for (let i = 0; i < cols; i++) {
      const p = pts[j * cols + i]!;
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "rgba(197,206,214,0.14)";
    ctx.stroke();
  }
  for (let i = 0; i < cols; i++) {
    ctx.beginPath();
    for (let j = 0; j < rows; j++) {
      const p = pts[j * cols + i]!;
      if (j === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "rgba(197,206,214,0.14)";
    ctx.stroke();
  }

  const levels = [140, 42, 14];
  for (const b of bodies) {
    for (let i = 0; i < levels.length; i++) {
      const a = levels[i]!;
      const r = Math.sqrt((G * b.mass) / a);
      if (!Number.isFinite(r) || r < 6 || r > maxR) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = hexAlpha(b.color, 0.16 + (1 - i / levels.length) * 0.16);
      ctx.lineWidth = (1.15 + (levels.length - i) * 0.25) / view.scale;
      ctx.setLineDash([5 / view.scale, 7 / view.scale]);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
}

type EnhancedFieldPoint = {
  x: number;
  y: number;
  wx: number;
  wy: number;
  gx: number;
  gy: number;
  mag: number;
  potential: number;
};

export function drawGravityFieldEnhanced(
  ctx: CanvasRenderingContext2D,
  bodies: FieldSample[],
  G: number,
  softening: number,
  view: { x: number; y: number; scale: number; w: number; h: number },
  time: number,
) {
  if (bodies.length === 0) return;
  const eps2 = softening * softening;
  const halfW = view.w / (2 * view.scale);
  const halfH = view.h / (2 * view.scale);
  const left = view.x - halfW;
  const right = view.x + halfW;
  const top = view.y - halfH;
  const bottom = view.y + halfH;
  const targetStep = 58 / view.scale;
  const cols = Math.max(10, Math.min(30, Math.ceil((right - left) / targetStep)));
  const rows = Math.max(8, Math.min(22, Math.ceil((bottom - top) / targetStep)));
  const dx = (right - left) / cols;
  const dy = (bottom - top) / rows;

  const sample = (x: number, y: number): EnhancedFieldPoint => {
    let gx = 0;
    let gy = 0;
    let potential = 0;
    for (const body of bodies) {
      const bx = body.x - x;
      const by = body.y - y;
      const r2 = bx * bx + by * by + eps2;
      const r = Math.sqrt(r2);
      const inv = (G * body.mass) / (r2 * r);
      gx += bx * inv;
      gy += by * inv;
      potential += (G * body.mass) / r;
    }
    const mag = Math.hypot(gx, gy);
    const warpScreen = Math.min(25, Math.log1p(mag) * 5.2);
    const warpWorld = warpScreen / view.scale;
    const scale = mag > 1e-7 ? warpWorld / mag : 0;
    return {
      x,
      y,
      wx: x + gx * scale,
      wy: y + gy * scale,
      gx,
      gy,
      mag,
      potential: Math.log1p(potential * 0.0015),
    };
  };

  const points: EnhancedFieldPoint[] = new Array((cols + 1) * (rows + 1));
  let minPotential = Number.POSITIVE_INFINITY;
  let maxPotential = 0;
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const point = sample(left + col * dx, top + row * dy);
      points[row * (cols + 1) + col] = point;
      minPotential = Math.min(minPotential, point.potential);
      maxPotential = Math.max(maxPotential, point.potential);
    }
  }

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Deep, softly colored basins make the field read as a topographic surface.
  for (const body of bodies) {
    const basinR = Math.min(Math.max(58 / view.scale, Math.sqrt(G * body.mass / 9)), Math.max(halfW, halfH));
    const gradient = ctx.createRadialGradient(body.x, body.y, 0, body.x, body.y, basinR);
    const basinColor = body.hole ? "#b57d61" : body.color;
    gradient.addColorStop(0, hexAlpha(basinColor, body.hole ? 0.11 : 0.055));
    gradient.addColorStop(0.45, hexAlpha(basinColor, body.hole ? 0.045 : 0.02));
    gradient.addColorStop(1, hexAlpha(basinColor, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(body.x, body.y, basinR, 0, Math.PI * 2);
    ctx.fill();
  }

  const smoothStroke = (line: EnhancedFieldPoint[]) => {
    if (line.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(line[0]!.wx, line[0]!.wy);
    for (let i = 1; i < line.length - 1; i++) {
      const current = line[i]!;
      const next = line[i + 1]!;
      ctx.quadraticCurveTo(current.wx, current.wy, (current.wx + next.wx) / 2, (current.wy + next.wy) / 2);
    }
    const end = line[line.length - 1]!;
    ctx.lineTo(end.wx, end.wy);
    ctx.stroke();
  };

  ctx.strokeStyle = "rgba(174,190,202,0.105)";
  ctx.lineWidth = 0.85 / view.scale;
  for (let row = 0; row <= rows; row++) {
    const line: EnhancedFieldPoint[] = [];
    for (let col = 0; col <= cols; col++) line.push(points[row * (cols + 1) + col]!);
    smoothStroke(line);
  }
  for (let col = 0; col <= cols; col++) {
    const line: EnhancedFieldPoint[] = [];
    for (let row = 0; row <= rows; row++) line.push(points[row * (cols + 1) + col]!);
    smoothStroke(line);
  }

  // Marching-squares isopotential contours reveal combined multi-body wells.
  const spread = Math.max(0.001, maxPotential - minPotential);
  const levels = [0.24, 0.4, 0.57, 0.74].map((amount) => minPotential + spread * amount);
  ctx.lineWidth = 1.05 / view.scale;
  ctx.setLineDash([5 / view.scale, 8 / view.scale]);
  ctx.lineDashOffset = (-time * 8) / view.scale;
  for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
    const level = levels[levelIndex]!;
    ctx.beginPath();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tl = points[row * (cols + 1) + col]!;
        const tr = points[row * (cols + 1) + col + 1]!;
        const br = points[(row + 1) * (cols + 1) + col + 1]!;
        const bl = points[(row + 1) * (cols + 1) + col]!;
        const crossings: { x: number; y: number }[] = [];
        addCrossing(crossings, tl, tr, level);
        addCrossing(crossings, tr, br, level);
        addCrossing(crossings, br, bl, level);
        addCrossing(crossings, bl, tl, level);
        if (crossings.length === 2) {
          ctx.moveTo(crossings[0]!.x, crossings[0]!.y);
          ctx.lineTo(crossings[1]!.x, crossings[1]!.y);
        } else if (crossings.length === 4) {
          ctx.moveTo(crossings[0]!.x, crossings[0]!.y);
          ctx.lineTo(crossings[1]!.x, crossings[1]!.y);
          ctx.moveTo(crossings[2]!.x, crossings[2]!.y);
          ctx.lineTo(crossings[3]!.x, crossings[3]!.y);
        }
      }
    }
    ctx.strokeStyle = `rgba(190,205,215,${0.085 + levelIndex * 0.026})`;
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Small animated flow needles give the otherwise static topology direction.
  ctx.lineWidth = 1 / view.scale;
  for (let row = 1; row < rows; row += 2) {
    for (let col = 1; col < cols; col += 2) {
      const point = points[row * (cols + 1) + col]!;
      if (point.mag < 0.02) continue;
      const inv = 1 / point.mag;
      const length = (5 + Math.min(9, Math.log1p(point.mag) * 2.2)) / view.scale;
      const pulse = 0.62 + 0.38 * Math.sin(time * 1.6 + row * 0.8 + col * 0.55);
      const ux = point.gx * inv;
      const uy = point.gy * inv;
      const sx = point.x - ux * length * 0.45;
      const sy = point.y - uy * length * 0.45;
      const ex = point.x + ux * length * 0.55;
      const ey = point.y + uy * length * 0.55;
      ctx.strokeStyle = `rgba(198,211,220,${0.13 + pulse * 0.1})`;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.fillStyle = `rgba(218,226,231,${0.2 + pulse * 0.12})`;
      ctx.beginPath();
      ctx.arc(ex, ey, 1.15 / view.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function addCrossing(
  crossings: { x: number; y: number }[],
  a: EnhancedFieldPoint,
  b: EnhancedFieldPoint,
  level: number,
) {
  const av = a.potential - level;
  const bv = b.potential - level;
  if ((av < 0) === (bv < 0) || av === bv) return;
  const t = Math.max(0, Math.min(1, av / (av - bv)));
  crossings.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
}

export function drawPhenomena(ctx: CanvasRenderingContext2D, world: World, time: number) {
  ctx.save();
  ctx.lineCap = "round";
  for (const phenomenon of world.phenomena) {
    if (phenomenon.kind === "wormhole") {
      ctx.strokeStyle = "rgba(153,177,194,0.13)";
      ctx.lineWidth = 1.1;
      ctx.setLineDash([5, 9]);
      ctx.lineDashOffset = -time * 12;
      ctx.beginPath();
      ctx.moveTo(phenomenon.ax, phenomenon.ay);
      const mx = (phenomenon.ax + phenomenon.bx) / 2;
      const my = (phenomenon.ay + phenomenon.by) / 2 - Math.min(90, Math.abs(phenomenon.bx - phenomenon.ax) * 0.18);
      ctx.quadraticCurveTo(mx, my, phenomenon.bx, phenomenon.by);
      ctx.stroke();
      ctx.setLineDash([]);
      drawPortal(ctx, phenomenon.ax, phenomenon.ay, phenomenon.radius, time + phenomenon.phase, "#9db3c2");
      drawPortal(ctx, phenomenon.bx, phenomenon.by, phenomenon.radius, -time + phenomenon.phase, "#c08a70");
    } else if (phenomenon.kind === "shockwave") {
      const fade = Math.max(0, 1 - phenomenon.radius / phenomenon.maxRadius);
      ctx.strokeStyle = hexAlpha(phenomenon.color, 0.2 + fade * 0.55);
      ctx.lineWidth = 1.2 + fade * 2.4;
      ctx.beginPath();
      ctx.arc(phenomenon.x, phenomenon.y, phenomenon.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = hexAlpha("#f2e6dc", fade * 0.22);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(phenomenon.x, phenomenon.y, Math.max(1, phenomenon.radius - 7), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const life = Math.max(0, phenomenon.life / phenomenon.maxLife);
      const pulse = 0.82 + Math.sin(time * 2.2 + phenomenon.id) * 0.12;
      const gradient = ctx.createRadialGradient(
        phenomenon.x,
        phenomenon.y,
        0,
        phenomenon.x,
        phenomenon.y,
        phenomenon.radius * 2.6,
      );
      gradient.addColorStop(0, `rgba(170,191,203,${0.12 * life})`);
      gradient.addColorStop(0.45, `rgba(129,157,176,${0.055 * life})`);
      gradient.addColorStop(1, "rgba(129,157,176,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(phenomenon.x, phenomenon.y, phenomenon.radius * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(181,202,214,${0.32 * life})`;
      ctx.lineWidth = 1.1;
      ctx.setLineDash([3, 6]);
      ctx.lineDashOffset = time * 9;
      ctx.beginPath();
      ctx.arc(phenomenon.x, phenomenon.y, phenomenon.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

function drawPortal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
  color: string,
) {
  const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
  halo.addColorStop(0, hexAlpha(color, 0.16));
  halo.addColorStop(0.45, hexAlpha(color, 0.055));
  halo.addColorStop(1, hexAlpha(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 0.7);
  ctx.strokeStyle = hexAlpha(color, 0.74);
  ctx.lineWidth = 2;
  ctx.setLineDash([9, 5, 2, 5]);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius * 0.58, 0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = hexAlpha("#eef1ef", 0.28);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.72, radius * 0.4, -0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawInstrumentPreview(
  ctx: CanvasRenderingContext2D,
  instrument: InstrumentId,
  x: number,
  y: number,
  anchor: { x: number; y: number } | null,
  time: number,
) {
  if (instrument === "launch") return;
  ctx.save();
  if (instrument === "wormhole") {
    if (anchor) {
      ctx.strokeStyle = "rgba(174,194,207,0.24)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.setLineDash([]);
      drawPortal(ctx, anchor.x, anchor.y, 18, time, "#9db3c2");
    }
    drawPortal(ctx, x, y, 18, -time, anchor ? "#c08a70" : "#9db3c2");
  } else {
    const radius = instrument === "nova" ? 34 + Math.sin(time * 3) * 4 : 26;
    ctx.strokeStyle = instrument === "nova" ? "rgba(216,161,132,0.62)" : "rgba(174,196,209,0.62)";
    ctx.fillStyle = instrument === "nova" ? "rgba(216,161,132,0.06)" : "rgba(174,196,209,0.06)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBursts(
  ctx: CanvasRenderingContext2D,
  world: World,
) {
  for (const burst of world.bursts) {
    const t = 1 - burst.life;
    const r = burst.maxR * (0.2 + t * 0.8);
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = hexAlpha(burst.color, burst.life * 0.7);
    ctx.lineWidth = 2.4 * burst.life;
    ctx.stroke();
  }
  for (const spark of world.sparks) {
    ctx.fillStyle = hexAlpha(spark.color, Math.max(0, spark.life));
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPath(
  ctx: CanvasRenderingContext2D,
  path: { x: number; y: number }[],
  color: string,
) {
  if (path.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(path[0]!.x, path[0]!.y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i]!.x, path[i]!.y);
  ctx.strokeStyle = hexAlpha(color, 0.55);
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 6]);
  ctx.stroke();
  ctx.restore();
}

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;
  const ux = dx / len;
  const uy = dy / len;
  ctx.save();
  ctx.strokeStyle = hexAlpha(color, 0.85);
  ctx.fillStyle = hexAlpha(color, 0.85);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const ah = 9;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * ah + -uy * 5, y1 - uy * ah + ux * 5);
  ctx.lineTo(x1 - ux * ah + uy * 5, y1 - uy * ah - ux * 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawLaunchReadout(
  ctx: CanvasRenderingContext2D,
  pointerX: number,
  pointerY: number,
  speed: number,
  label: string,
  viewportW: number,
  viewportH: number,
) {
  const speedText = `${Math.round(speed)} u/s`;
  ctx.save();
  ctx.font = '600 11px "Figtree", ui-sans-serif, sans-serif';
  const labelWidth = ctx.measureText(label).width;
  ctx.font = '500 11px "SFMono-Regular", Consolas, monospace';
  const speedWidth = ctx.measureText(speedText).width;
  const width = Math.max(126, labelWidth + speedWidth + 31);
  const height = 31;
  const x = Math.max(10, Math.min(viewportW - width - 10, pointerX + 16));
  const y = Math.max(10, Math.min(viewportH - height - 10, pointerY - height - 12));

  ctx.fillStyle = "rgba(18,20,23,0.94)";
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.stroke();

  ctx.font = '600 11px "Figtree", ui-sans-serif, sans-serif';
  ctx.fillStyle = "rgba(236,236,232,0.92)";
  ctx.fillText(label, x + 10, y + 19.5);
  ctx.font = '500 11px "SFMono-Regular", Consolas, monospace';
  ctx.fillStyle = "rgba(139,141,143,0.96)";
  ctx.textAlign = "right";
  ctx.fillText(speedText, x + width - 10, y + 19.5);
  ctx.restore();
}
