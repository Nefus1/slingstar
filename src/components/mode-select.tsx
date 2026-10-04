import { ArrowRight, Check, Orbit, Shield, Sparkles } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { AuthChip } from "@/components/sim/auth-chip";

export type AppMode = "sandbox" | "defense";

export function ModeSelect({ onSelect }: { onSelect: (mode: AppMode) => void }) {
  return (
    <main className="mode-select relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <ModeBackdrop />
      <div className="mode-vignette absolute inset-0" aria-hidden />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 sm:p-6">
        <div className="pointer-events-auto flex items-baseline gap-2.5">
          <span className="font-display text-3xl italic tracking-tight sm:text-4xl">Apsis</span>
          <span className="eyebrow hidden sm:inline">Strange Orbits</span>
        </div>
        <div className="pointer-events-auto"><AuthChip /></div>
      </header>

      <section className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col justify-center px-4 py-24 sm:px-6">
        <div className="mx-auto w-full max-w-3xl text-center">
          <p className="eyebrow">Choose your experiment</p>
          <h1 className="mt-4 font-display text-5xl italic leading-none tracking-tight text-fg sm:text-7xl">
            One universe. Two ways to play.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Shape gravity without limits, or turn the same cosmic machinery into a moving orbital fortress.
          </p>
        </div>

        <div className="mode-card-grid mx-auto mt-8 grid w-full max-w-4xl gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4">
          <ModeCard
            icon={<Orbit className="size-5" />}
            eyebrow="Open laboratory"
            title="Sandbox Simulator"
            description="Fling worlds, forge galaxies, bend trajectories, and make beautiful astronomical mistakes."
            features={["Full n-body gravity", "Galaxy and Gargantua modes", "Rewind, replay, and share"]}
            action="Enter observatory"
            onClick={() => onSelect("sandbox")}
          />
          <ModeCard
            icon={<Shield className="size-5" />}
            eyebrow="Strategic campaign"
            title="Orbital Defense"
            description="Build a defense fleet in moving orbits and protect Asteria from ten escalating cosmic waves."
            features={["Five orbiting tower classes", "Upgrades and target priorities", "Boss waves and persistent records"]}
            action="Defend Asteria"
            onClick={() => onSelect("defense")}
            featured
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
          <Sparkles className="size-3.5" />
          Progress is stored locally on this device
        </div>
      </section>
    </main>
  );
}

function ModeCard({
  icon,
  eyebrow,
  title,
  description,
  features,
  action,
  onClick,
  featured = false,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  features: string[];
  action: string;
  onClick: () => void;
  featured?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mode-choice group ${featured ? "mode-choice-featured" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="mode-choice-icon">{icon}</span>
        <span className="eyebrow">{eyebrow}</span>
      </div>
      <div className="mt-8 text-left">
        <h2 className="font-display text-3xl italic tracking-tight text-fg sm:text-4xl">{title}</h2>
        <p className="mt-3 min-h-12 text-sm leading-relaxed text-muted">{description}</p>
      </div>
      <div className="mode-feature-list mt-6 space-y-2.5 text-left">
        {features.map((feature) => (
          <span key={feature} className="flex items-center gap-2.5 text-xs text-muted">
            <span className="flex size-5 items-center justify-center rounded-full border border-border text-fg">
              <Check className="size-3" />
            </span>
            {feature}
          </span>
        ))}
      </div>
      <span className="mode-choice-action mt-8">
        {action}
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
      </span>
    </button>
  );
}

function ModeBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let running = true;
    const rng = mulberry32(0xa9515);
    const stars = Array.from({ length: 190 }, () => ({
      x: rng(), y: rng(), r: 0.45 + rng() * 1.35, a: 0.12 + rng() * 0.52, phase: rng() * Math.PI * 2,
    }));
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      if (!running) return;
      const t = now / 1000;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = "#070809";
      ctx.fillRect(0, 0, w, h);
      for (const star of stars) {
        const pulse = 0.72 + Math.sin(t * 0.55 + star.phase) * 0.28;
        ctx.fillStyle = `rgba(225,229,230,${star.a * pulse})`;
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      drawSystem(ctx, w * 0.16, h * 0.48, Math.min(w, h) * 0.34, t, "sandbox");
      drawSystem(ctx, w * 0.86, h * 0.44, Math.min(w, h) * 0.3, -t * 0.8, "defense");
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function drawSystem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
  type: "sandbox" | "defense",
) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let ring = 1; ring <= 3; ring++) {
    const r = radius * (0.34 + ring * 0.22);
    ctx.strokeStyle = `rgba(181,198,210,${0.05 + ring * 0.018})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.42, -0.18, 0, Math.PI * 2);
    ctx.stroke();
    const angle = time * (0.1 + ring * 0.025) + ring * 1.7;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r * 0.42;
    ctx.fillStyle = type === "defense" && ring === 2 ? "#c9865e" : "#a9c0cf";
    ctx.beginPath();
    ctx.arc(px, py, 2.2 + ring, 0, Math.PI * 2);
    ctx.fill();
  }
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.34);
  glow.addColorStop(0, type === "defense" ? "rgba(212,151,102,0.34)" : "rgba(205,218,225,0.28)");
  glow.addColorStop(1, "rgba(120,148,169,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
