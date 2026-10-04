import {
  ArrowLeft,
  CircleDot,
  Coins,
  Crosshair,
  FastForward,
  Flame,
  Gauge,
  Heart,
  Magnet,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Snowflake,
  Sparkles,
  Target,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TOWER_CONFIGS, TOWER_ORDER, WAVES } from "@/lib/defense/config";
import {
  createDefenseWorld,
  defenseTelemetry,
  placeTower,
  selectBuild,
  selectTower,
  sellTower,
  setTowerTarget,
  snapOrbitalSlot,
  startDefenseWave,
  stepDefense,
  towerAtPoint,
  upgradeCost,
  upgradeTower,
  sellValue,
} from "@/lib/defense/engine";
import { drawDefenseScene, type DefenseView } from "@/lib/defense/render";
import type { DefenseEvent, DefenseTelemetry, OrbitalSlot, TargetMode, TowerType } from "@/lib/defense/types";
import { defenseTone, setAudioEnabled, unlockAudio } from "@/lib/sim/audio";
import { makeStars } from "@/lib/sim/render";

const FIXED_STEP = 1 / 60;
const PROFILE_KEY = "apsis-orbital-defense-v1";

type DefenseProfile = {
  bestScore: number;
  highestWave: number;
  victories: number;
};

const EMPTY_PROFILE: DefenseProfile = { bestScore: 0, highestWave: 0, victories: 0 };

export function OrbitalDefense({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef(createDefenseWorld());
  const starsRef = useRef(makeStars(260, "APSIS-DEFENSE-STARS"));
  const viewRef = useRef<DefenseView>({ width: 1, height: 1, scale: 1, centerX: 0, centerY: 0 });
  const hoverSlotRef = useRef<OrbitalSlot | null>(null);
  const eventSerialRef = useRef(0);
  const traumaRef = useRef(0);
  const [telemetry, setTelemetry] = useState<DefenseTelemetry>(() => defenseTelemetry(worldRef.current));
  const [briefing, setBriefing] = useState(true);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [sound, setSound] = useState(true);
  const [toast, setToast] = useState<DefenseEvent | null>(null);
  const [profile, setProfile] = useState<DefenseProfile>(EMPTY_PROFILE);

  const sync = useCallback(() => setTelemetry(defenseTelemetry(worldRef.current)), []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null") as Partial<DefenseProfile> | null;
      if (saved) setProfile({
        bestScore: Number(saved.bestScore) || 0,
        highestWave: Number(saved.highestWave) || 0,
        victories: Number(saved.victories) || 0,
      });
    } catch {
      setProfile(EMPTY_PROFILE);
    }
  }, []);

  const persistProgress = useCallback((world = worldRef.current) => {
    setProfile((current) => {
      const victoryBump = world.phase === "victory" && world.lastEvent?.serial === world.eventSerial ? 1 : 0;
      const next = {
        bestScore: Math.max(current.bestScore, world.score),
        highestWave: Math.max(current.highestWave, world.completedWaves),
        victories: current.victories + victoryBump,
      };
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let raf = 0;
    let previous = performance.now();
    let accumulator = 0;
    let lastSync = 0;
    let running = true;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const portrait = width < 640;
      viewRef.current = {
        width,
        height,
        scale: Math.min((width - 20) / 1320, Math.max(0.26, (height - (portrait ? 270 : 120)) / 760)),
        centerX: width / 2,
        centerY: portrait ? height * 0.405 : height * 0.49,
      };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const frame = (now: number) => {
      if (!running) return;
      const rawDelta = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const world = worldRef.current;
      if (!paused && !briefing) {
        accumulator = Math.min(FIXED_STEP * 10, accumulator + rawDelta * speed);
        while (accumulator >= FIXED_STEP) {
          stepDefense(world, FIXED_STEP);
          accumulator -= FIXED_STEP;
        }
      } else {
        accumulator = 0;
      }

      if (world.eventSerial !== eventSerialRef.current && world.lastEvent) {
        eventSerialRef.current = world.eventSerial;
        setToast(world.lastEvent);
        if (world.lastEvent.kind === "build") defenseTone("build");
        else if (world.lastEvent.kind === "upgrade") defenseTone("upgrade");
        else if (world.lastEvent.kind === "leak") {
          defenseTone("leak");
          traumaRef.current = Math.min(1, traumaRef.current + 0.72);
        } else if (world.lastEvent.kind === "victory") {
          defenseTone("victory");
          persistProgress(world);
        } else if (world.lastEvent.kind === "defeat") {
          defenseTone("defeat");
          persistProgress(world);
        } else if (world.lastEvent.kind === "wave") {
          defenseTone("wave");
          if (world.phase === "build") persistProgress(world);
        }
      }

      traumaRef.current = Math.max(0, traumaRef.current - rawDelta * 1.75);
      const trauma = traumaRef.current * traumaRef.current;
      drawDefenseScene(
        ctx,
        world,
        viewRef.current,
        starsRef.current,
        now / 1000,
        hoverSlotRef.current,
        world.selectedBuild,
        Math.sin(now * 0.079) * trauma * 8,
        Math.cos(now * 0.093) * trauma * 6,
      );
      if (now - lastSync > 120) {
        lastSync = now;
        sync();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [briefing, paused, persistProgress, speed, sync]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.kind === "notice" ? 2600 : 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.repeat) return;
      if (event.code.startsWith("Digit")) {
        const index = Number(event.code.slice(5)) - 1;
        const type = TOWER_ORDER[index];
        if (type) {
          selectBuild(worldRef.current, type);
          sync();
        }
      }
      if (event.code === "Space") {
        event.preventDefault();
        if (worldRef.current.phase === "build") startDefenseWave(worldRef.current);
        else if (worldRef.current.phase === "wave") setPaused((value) => !value);
        sync();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sync]);

  function toWorld(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const view = viewRef.current;
    return {
      x: (event.clientX - rect.left - view.centerX) / view.scale,
      y: (event.clientY - rect.top - view.centerY) / view.scale,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const point = toWorld(event);
    const hitRadius = Math.max(34, 22 / viewRef.current.scale);
    if (towerAtPoint(worldRef.current, point.x, point.y, hitRadius)) {
      hoverSlotRef.current = null;
      return;
    }
    const slotTolerance = Math.max(54, 22 / viewRef.current.scale);
    hoverSlotRef.current = snapOrbitalSlot(
      worldRef.current,
      point.x,
      point.y,
      slotTolerance,
    );
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (briefing) return;
    unlockAudio();
    const point = toWorld(event);
    const world = worldRef.current;
    const hitRadius = Math.max(34, 22 / viewRef.current.scale);
    const tower = towerAtPoint(world, point.x, point.y, hitRadius);
    if (tower) {
      selectTower(world, tower.id);
      hoverSlotRef.current = null;
      sync();
      return;
    }
    const slotTolerance = Math.max(54, 22 / viewRef.current.scale);
    const slot = snapOrbitalSlot(world, point.x, point.y, slotTolerance);
    if (slot.valid) placeTower(world, world.selectedBuild, slot.ring, slot.slot);
    hoverSlotRef.current = slot;
    sync();
  }

  function chooseTower(type: TowerType) {
    unlockAudio();
    selectBuild(worldRef.current, type);
    sync();
  }

  function beginWave() {
    unlockAudio();
    if (startDefenseWave(worldRef.current)) setPaused(false);
    sync();
  }

  function restart() {
    worldRef.current = createDefenseWorld();
    eventSerialRef.current = 0;
    hoverSlotRef.current = null;
    setPaused(false);
    setBriefing(false);
    setToast(null);
    sync();
  }

  function toggleSound() {
    const next = !sound;
    setSound(next);
    setAudioEnabled(next);
    if (next) unlockAudio();
  }

  const selectedTower = telemetry.selectedTower;
  const wave = WAVES[telemetry.waveIndex];

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerLeave={() => { hoverSlotRef.current = null; }}
        aria-label="Orbital Defense battlefield"
      />

      <div className="pointer-events-none absolute inset-0 z-20">
        <DefenseHeader
          telemetry={telemetry}
          paused={paused}
          speed={speed}
          sound={sound}
          onExit={onExit}
          onPause={() => setPaused((value) => !value)}
          onSpeed={() => setSpeed((value) => value === 1 ? 2 : 1)}
          onSound={toggleSound}
        />

        <WaveControl telemetry={telemetry} waveTitle={wave?.title ?? "Campaign complete"} onStart={beginWave} />

        {telemetry.towerCount === 0 && telemetry.phase === "build" && !briefing && (
          <div className="defense-hint pointer-events-none absolute left-1/2 -translate-x-1/2 text-center">
            <p className="text-sm font-medium text-fg">Deploy your first defense</p>
            <p className="mt-1 text-xs text-muted">Choose a tower below, then tap a glowing orbital anchor.</p>
          </div>
        )}

        {selectedTower && (
          <TowerInspector
            telemetry={telemetry}
            onUpgrade={() => { upgradeTower(worldRef.current, selectedTower.id); sync(); }}
            onSell={() => { sellTower(worldRef.current, selectedTower.id); sync(); }}
            onTarget={(mode) => { setTowerTarget(worldRef.current, selectedTower.id, mode); sync(); }}
          />
        )}

        <TowerDock telemetry={telemetry} onSelect={chooseTower} />
        <DefenseToast event={toast} />
      </div>

      {briefing && (
        <DefenseBriefing
          profile={profile}
          onBegin={() => { unlockAudio(); setBriefing(false); }}
          onExit={onExit}
        />
      )}

      {(telemetry.phase === "victory" || telemetry.phase === "defeat") && !briefing && (
        <CampaignResult telemetry={telemetry} bestScore={Math.max(profile.bestScore, telemetry.score)} onRestart={restart} onExit={onExit} />
      )}
    </main>
  );
}

function DefenseHeader({
  telemetry,
  paused,
  speed,
  sound,
  onExit,
  onPause,
  onSpeed,
  onSound,
}: {
  telemetry: DefenseTelemetry;
  paused: boolean;
  speed: 1 | 2;
  sound: boolean;
  onExit: () => void;
  onPause: () => void;
  onSpeed: () => void;
  onSound: () => void;
}) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-5">
      <div className="pointer-events-auto flex items-center gap-2">
        <button type="button" onClick={onExit} className="defense-icon-button" aria-label="Choose game mode" title="Choose game mode">
          <ArrowLeft className="size-4" />
        </button>
        <div className="defense-brand hidden sm:block">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl italic">Apsis</span>
            <span className="eyebrow">Orbital Defense</span>
          </div>
        </div>
      </div>

      <div className="defense-stat-row pointer-events-auto">
        <DefenseStat icon={<Heart className="size-3.5" />} label="Core" value={`${telemetry.lives}/${telemetry.maxLives}`} danger={telemetry.lives <= 6} />
        <DefenseStat icon={<Coins className="size-3.5" />} label="Stardust" value={telemetry.stardust.toString()} />
        <DefenseStat icon={<Shield className="size-3.5" />} label="Wave" value={`${Math.min(10, telemetry.waveIndex + 1)}/10`} />
        <DefenseStat icon={<Sparkles className="size-3.5" />} label="Score" value={formatScore(telemetry.score)} optional />
      </div>

      <div className="pointer-events-auto flex items-center gap-1.5">
        <button type="button" onClick={onSound} className="defense-icon-button" aria-label={sound ? "Mute sound" : "Enable sound"}>
          {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </button>
        <button type="button" onClick={onSpeed} className={cn("defense-icon-button", speed === 2 && "defense-icon-button-active")} aria-label={`Simulation speed ${speed}×`}>
          <FastForward className="size-4" />
          <span className="font-mono text-xs">{speed}×</span>
        </button>
        <button type="button" onClick={onPause} disabled={telemetry.phase !== "wave"} className={cn("defense-icon-button", paused && "defense-icon-button-active")} aria-label={paused ? "Resume defense" : "Pause defense"}>
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </button>
      </div>
    </header>
  );
}

function DefenseStat({ icon, label, value, danger = false, optional = false }: { icon: ReactNode; label: string; value: string; danger?: boolean; optional?: boolean }) {
  return (
    <div className={cn("defense-stat", danger && "defense-stat-danger", optional && "hidden lg:flex")}>
      <span className="text-muted">{icon}</span>
      <span className="hidden text-xs text-muted md:inline">{label}</span>
      <span className="font-mono text-xs tabular-nums text-fg">{value}</span>
    </div>
  );
}

function WaveControl({ telemetry, waveTitle, onStart }: { telemetry: DefenseTelemetry; waveTitle: string; onStart: () => void }) {
  if (telemetry.phase === "build") {
    return (
      <button type="button" onClick={onStart} className="wave-control pointer-events-auto absolute left-1/2 top-20 -translate-x-1/2 sm:top-24">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent text-bg"><Play className="size-4 fill-current" /></span>
        <span className="text-left">
          <span className="block text-xs font-semibold text-fg">Launch wave {telemetry.waveIndex + 1}</span>
          <span className="block max-w-36 truncate text-[0.68rem] text-muted">{waveTitle}</span>
        </span>
      </button>
    );
  }
  if (telemetry.phase !== "wave") return null;
  const remaining = telemetry.enemyCount + telemetry.spawnRemaining;
  return (
    <div className="wave-readout absolute left-1/2 top-20 -translate-x-1/2 sm:top-24">
      <span className="wave-pulse" />
      <span className="font-mono text-xs tabular-nums text-fg">Wave {telemetry.waveIndex + 1}</span>
      <span className="text-xs text-muted">{remaining} incoming</span>
    </div>
  );
}

function TowerDock({ telemetry, onSelect }: { telemetry: DefenseTelemetry; onSelect: (type: TowerType) => void }) {
  return (
    <footer className="defense-dock pointer-events-auto absolute bottom-12 left-2 right-2 sm:bottom-5 sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <p className="eyebrow">Defense fleet</p>
          <span className="hidden text-xs text-muted sm:inline">Select, then place on an orbital anchor</span>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted">{telemetry.towerCount} deployed</span>
      </div>
      <div className="control-strip flex gap-1.5 overflow-x-auto pb-1">
        {TOWER_ORDER.map((type, index) => {
          const config = TOWER_CONFIGS[type];
          const selected = telemetry.selectedBuild === type && telemetry.selectedTower === null;
          const affordable = telemetry.stardust >= config.cost;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              aria-pressed={selected}
              className={cn("tower-card", selected && "tower-card-selected", !affordable && "tower-card-expensive")}
            >
              <span className="tower-card-icon">{towerIcon(type)}</span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-xs font-semibold text-fg">{config.name}</span>
                <span className="hidden truncate text-[0.68rem] text-muted sm:block">{config.role}</span>
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums text-muted">
                <span className="hidden sm:inline">{index + 1}</span>
                <Coins className="size-3" />{config.cost}
              </span>
            </button>
          );
        })}
      </div>
    </footer>
  );
}

function TowerInspector({ telemetry, onUpgrade, onSell, onTarget }: { telemetry: DefenseTelemetry; onUpgrade: () => void; onSell: () => void; onTarget: (mode: TargetMode) => void }) {
  const tower = telemetry.selectedTower!;
  const config = TOWER_CONFIGS[tower.type];
  const cost = upgradeCost(tower);
  return (
    <aside className="tower-inspector pointer-events-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Selected defense</p>
          <h2 className="mt-2 font-display text-2xl italic text-fg">{config.name}</h2>
          <p className="mt-1 text-xs text-muted">Level {tower.level} · {tower.kills} confirmed kills</p>
        </div>
        <span className="tower-card-icon">{towerIcon(tower.type)}</span>
      </div>
      <div className="mt-4">
        <p className="eyebrow">Target protocol</p>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {(["first", "strongest", "closest"] as TargetMode[]).map((mode) => (
            <button key={mode} type="button" onClick={() => onTarget(mode)} className={cn("target-button", tower.targetMode === mode && "target-button-active")}>
              {mode === "first" ? <Gauge className="size-3.5" /> : mode === "strongest" ? <Target className="size-3.5" /> : <Crosshair className="size-3.5" />}
              <span className="capitalize">{mode}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onUpgrade} disabled={tower.level >= 3 || telemetry.stardust < cost} className="defense-primary-button">
          {tower.level >= 3 ? "Max level" : <><Sparkles className="size-3.5" /> Upgrade · {cost}</>}
        </button>
        <button type="button" onClick={onSell} className="defense-secondary-button"><Trash2 className="size-3.5" /> Sell · {sellValue(tower)}</button>
      </div>
    </aside>
  );
}

function DefenseToast({ event }: { event: DefenseEvent | null }) {
  if (!event) return null;
  return (
    <div key={event.serial} className={cn("defense-toast pointer-events-none absolute left-3 right-3 top-36 sm:left-1/2 sm:right-auto sm:top-5 sm:w-96 sm:-translate-x-1/2", event.kind === "leak" || event.kind === "defeat" ? "defense-toast-danger" : "")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-bg">
        {event.kind === "leak" ? <Heart className="size-4" /> : event.kind === "build" ? <Orbit className="size-4" /> : <Shield className="size-4" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{event.title}</span>
        <span className="block truncate text-xs text-muted">{event.detail}</span>
      </span>
    </div>
  );
}

function DefenseBriefing({ profile, onBegin, onExit }: { profile: DefenseProfile; onBegin: () => void; onExit: () => void }) {
  return (
    <div className="defense-modal-backdrop absolute inset-0 z-50 flex items-center justify-center p-4">
      <section className="defense-modal w-full max-w-xl">
        <div className="flex items-center justify-between gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-fg"><Shield className="size-5" /></span>
          <span className="font-mono text-xs tabular-nums text-muted">Best {formatScore(profile.bestScore)} · {profile.highestWave}/10</span>
        </div>
        <p className="eyebrow mt-8">Orbital Defense campaign</p>
        <h1 className="mt-3 font-display text-5xl italic leading-none text-fg sm:text-6xl">Hold the line around Asteria.</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Hostile comets and void fleets are riding four gravity lanes toward the inhabited world. Your towers occupy fixed orbital anchors—but those anchors keep moving.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <BriefingStep number="01" title="Deploy" detail="Choose a defense and place it on a glowing orbit." />
          <BriefingStep number="02" title="Intercept" detail="Launch the wave and let targeting protocols work." />
          <BriefingStep number="03" title="Adapt" detail="Spend salvage on upgrades before the next breach." />
        </div>
        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onExit} className="defense-secondary-button"><ArrowLeft className="size-4" /> Mode select</button>
          <button type="button" onClick={onBegin} className="defense-primary-button px-5"><Shield className="size-4" /> Begin deployment</button>
        </div>
      </section>
    </div>
  );
}

function BriefingStep({ number, title, detail }: { number: string; title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3.5">
      <span className="font-mono text-[0.68rem] text-muted">{number}</span>
      <p className="mt-2 text-sm font-semibold text-fg">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p>
    </div>
  );
}

function CampaignResult({ telemetry, bestScore, onRestart, onExit }: { telemetry: DefenseTelemetry; bestScore: number; onRestart: () => void; onExit: () => void }) {
  const victory = telemetry.phase === "victory";
  return (
    <div className="defense-modal-backdrop absolute inset-0 z-50 flex items-center justify-center p-4">
      <section className="defense-modal w-full max-w-lg text-center">
        <span className={cn("mx-auto flex size-14 items-center justify-center rounded-full border", victory ? "border-accent bg-accent text-bg" : "border-danger text-danger")}>
          {victory ? <Shield className="size-6" /> : <Heart className="size-6" />}
        </span>
        <p className="eyebrow mt-7">{victory ? "Campaign complete" : "Defense record"}</p>
        <h1 className="mt-3 font-display text-5xl italic text-fg">{victory ? "Asteria holds." : "The core went dark."}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
          {victory ? "Ten waves entered the gravity well. None of them ended the civilization below." : `The fleet survived ${telemetry.completedWaves} complete waves. Rebuild the orbital lattice and try a different economy.`}
        </p>
        <div className="mt-7 grid grid-cols-3 gap-2">
          <ResultStat label="Score" value={formatScore(telemetry.score)} />
          <ResultStat label="Destroyed" value={telemetry.totalKills.toString()} />
          <ResultStat label="Best" value={formatScore(bestScore)} />
        </div>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={onRestart} className="defense-primary-button"><RotateCcw className="size-4" /> Defend again</button>
          <button type="button" onClick={onExit} className="defense-secondary-button"><ArrowLeft className="size-4" /> Mode select</button>
        </div>
      </section>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-surface-2 px-3 py-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 font-mono text-sm tabular-nums text-fg">{value}</p></div>;
}

function towerIcon(type: TowerType) {
  if (type === "moon") return <CircleDot className="size-4" />;
  if (type === "ice") return <Snowflake className="size-4" />;
  if (type === "lava") return <Flame className="size-4" />;
  if (type === "gas") return <Magnet className="size-4" />;
  return <Orbit className="size-4" />;
}

function formatScore(value: number) {
  return Math.round(value).toString().padStart(6, "0");
}
