import {
  Check,
  CircleDot,
  ClipboardList,
  Crosshair,
  Eye,
  FlaskConical,
  History,
  Home,
  LocateFixed,
  Magnet,
  Orbit,
  Pause,
  Play,
  Shuffle,
  Share2,
  Sparkles,
  Spline,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useState, type MutableRefObject, type ReactNode } from "react";
import { AuthChip } from "@/components/sim/auth-chip";
import { LabReport } from "@/components/sim/lab-report";
import type { SimApi } from "@/components/sim/orbit-canvas";
import { contractById } from "@/lib/sim/contracts";
import {
  COSMIC_MODES,
  MASS_PRESETS,
  PLANET_CATALOG_IDS,
  QUICK_MASS_IDS,
  SCENES,
  type SceneId,
} from "@/lib/sim/types";
import { useSimUi, type DiscoveryToast as DiscoveryToastType } from "@/lib/sim/store";
import { cn } from "@/lib/utils";

export function Hud({ apiRef, onExit }: { apiRef: MutableRefObject<SimApi | null>; onExit: () => void }) {
  const massId = useSimUi((s) => s.massId);
  const multiMassIds = useSimUi((s) => s.multiMassIds);
  const multiLaunch = useSimUi((s) => s.multiLaunch);
  const instrument = useSimUi((s) => s.instrument);
  const timeScale = useSimUi((s) => s.timeScale);
  const trails = useSimUi((s) => s.trails);
  const fieldWorlds = useSimUi((s) => s.fieldWorlds);
  const fieldHoles = useSimUi((s) => s.fieldHoles);
  const paused = useSimUi((s) => s.paused);
  const follow = useSimUi((s) => s.follow);
  const bodyCount = useSimUi((s) => s.bodyCount);
  const galaxyStars = useSimUi((s) => s.galaxyStars);
  const galaxyFormation = useSimUi((s) => s.galaxyFormation);
  const sceneId = useSimUi((s) => s.sceneId);
  const score = useSimUi((s) => s.score);
  const streak = useSimUi((s) => s.streak);
  const sound = useSimUi((s) => s.sound);
  const hudHidden = useSimUi((s) => s.hudHidden);
  const reportOpen = useSimUi((s) => s.reportOpen);
  const rewindSeconds = useSimUi((s) => s.rewindSeconds);
  const activeContractId = useSimUi((s) => s.activeContractId);
  const contractStatus = useSimUi((s) => s.contractStatus);
  const contractProgress = useSimUi((s) => s.contractProgress);
  const completedContracts = useSimUi((s) => s.completedContracts);
  const captures = useSimUi((s) => s.captures);
  const closeCalls = useSimUi((s) => s.closeCalls);
  const merges = useSimUi((s) => s.merges);
  const lastDiscovery = useSimUi((s) => s.lastDiscovery);
  const setMassId = useSimUi((s) => s.setMassId);
  const toggleMultiMassId = useSimUi((s) => s.toggleMultiMassId);
  const toggleMultiLaunch = useSimUi((s) => s.toggleMultiLaunch);
  const setInstrument = useSimUi((s) => s.setInstrument);
  const setTimeScale = useSimUi((s) => s.setTimeScale);
  const toggleTrails = useSimUi((s) => s.toggleTrails);
  const toggleFieldWorlds = useSimUi((s) => s.toggleFieldWorlds);
  const toggleFieldHoles = useSimUi((s) => s.toggleFieldHoles);
  const togglePaused = useSimUi((s) => s.togglePaused);
  const toggleFollow = useSimUi((s) => s.toggleFollow);
  const toggleSound = useSimUi((s) => s.toggleSound);
  const toggleHud = useSimUi((s) => s.toggleHud);
  const setReportOpen = useSimUi((s) => s.setReportOpen);
  const hydrateProfile = useSimUi((s) => s.hydrateProfile);
  const [catalogOpen, setCatalogOpen] = useState(false);

  useEffect(() => hydrateProfile(), [hydrateProfile]);

  const showDiscovery =
    lastDiscovery !== null && Date.now() - lastDiscovery.createdAt < 5000 && !reportOpen;

  if (hudHidden) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20">
        {showDiscovery && lastDiscovery && <DiscoveryToast key={lastDiscovery.id} toast={lastDiscovery} />}
        <button
          type="button"
          className="secondary-button pointer-events-auto absolute bottom-14 right-3 shadow-panel sm:bottom-5 sm:right-5"
          onClick={toggleHud}
        >
          <Eye className="size-4" />
          Show controls
        </button>
      </div>
    );
  }

  const goalCount = [captures, closeCalls, merges].filter((n) => n > 0).length;
  const activeContract = contractById(activeContractId);
  const cosmicMode = COSMIC_MODES.find((mode) => mode.id === sceneId);
  const quickMasses = MASS_PRESETS.filter((mass) => QUICK_MASS_IDS.includes(mass.id));
  const catalogMasses = MASS_PRESETS.filter((mass) => PLANET_CATALOG_IDS.includes(mass.id));

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 pb-14 sm:p-5">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="hud-panel pointer-events-auto px-4 py-3">
            <div className="flex items-baseline gap-2">
              <h1 className="font-display text-2xl italic leading-none tracking-tight text-fg sm:text-3xl">
                Apsis
              </h1>
              <span className="eyebrow hidden sm:inline">Strange Orbits</span>
            </div>
            <p className="mt-1 hidden text-sm text-muted sm:block">
              Drag to launch · Right-drag to pan · Scroll to zoom
            </p>
            <p className="mt-1 text-xs text-muted sm:hidden">Drag to launch a world</p>
          </div>
          <div className="hud-panel hidden min-h-16 px-4 py-3 sm:block">
            <p className="eyebrow">Score</p>
            <p key={score} className="score-pop mt-1 font-mono text-sm tabular-nums text-fg">
              {formatScore(score)}
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <IconButton label="Choose game mode" onClick={onExit}>
            <Home className="size-4" />
          </IconButton>
          <IconButton label={sound ? "Mute sound" : "Enable sound"} onClick={toggleSound}>
            {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </IconButton>
          <IconButton label="Open field notes" onClick={() => setReportOpen(true)} badge={goalCount < 3}>
            <ClipboardList className="size-4" />
          </IconButton>
          <div className="hidden sm:block">
            <IconButton label="Copy experiment replay" onClick={() => apiRef.current?.share()}>
              <Share2 className="size-4" />
            </IconButton>
          </div>
          <AuthChip />
        </div>
      </header>

      <MissionCard
        captures={captures}
        closeCalls={closeCalls}
        merges={merges}
        activeContract={activeContract}
        contractStatus={contractStatus}
        contractProgress={contractProgress}
        mode={cosmicMode}
        galaxyStars={galaxyStars}
        galaxyFormation={galaxyFormation}
        bodyCount={bodyCount}
        apiRef={apiRef}
      />
      <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 sm:hidden">
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface/90 px-4 text-xs font-medium text-fg shadow-panel backdrop-blur-sm"
        >
          <FlaskConical className="size-4 text-muted" />
          {activeContract
            ? `${activeContract.title} · ${Math.floor(contractProgress)}/${activeContract.target}`
            : cosmicMode
              ? cosmicMode.label
              : `Contracts · ${completedContracts.length}/12`}
        </button>
      </div>

      {showDiscovery && lastDiscovery && <DiscoveryToast key={lastDiscovery.id} toast={lastDiscovery} />}

      <footer className="pointer-events-auto mx-auto w-full max-w-6xl">
        <div className="hud-panel p-2.5 sm:p-3.5">
          <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <p className="eyebrow">Launch body</p>
              <span className="hidden font-mono text-xs tabular-nums text-muted sm:inline">
                {streak > 1 ? `${streak}× discovery streak` : "Aim with the predicted path"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs tabular-nums text-muted sm:hidden">{formatScore(score)}</span>
              <span className="font-mono text-xs tabular-nums text-muted">
                {galaxyStars > 0 ? `${galaxyStars} stars · ` : ""}{bodyCount} {bodyCount === 1 ? "body" : "bodies"}
              </span>
            </div>
          </div>

          <div className="control-strip flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              aria-expanded={catalogOpen}
              onClick={() => setCatalogOpen((open) => !open)}
              className={cn("mass-button", catalogOpen && "mass-button-selected")}
            >
              <FlaskConical className="size-3.5" />
              World catalog
            </button>
            {quickMasses.map((mass) => {
              const selected = mass.id === massId && !multiLaunch;
              return (
                <button
                  key={mass.id}
                  type="button"
                  aria-pressed={selected}
                  title={`${mass.label}: ${mass.hint}`}
                  onClick={() => setMassId(mass.id)}
                  className={cn("mass-button", selected && "mass-button-selected")}
                >
                  <span className="size-2.5 rounded-full" style={{ background: mass.color }} aria-hidden />
                  {mass.label}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={multiLaunch}
              onClick={toggleMultiLaunch}
              className={cn("mass-button", multiLaunch && "mass-button-selected")}
              title="Cycle through every checked world type on successive launches"
            >
              <Shuffle className="size-3.5" />
              Mixed ×{multiMassIds.length}
            </button>
          </div>

          {catalogOpen && (
            <div className="planet-catalog mt-2.5">
              <div className="flex items-center justify-between gap-3 px-1 pb-2">
                <div>
                  <p className="eyebrow">World catalog</p>
                  <p className="mt-1 text-xs text-muted">Choose one to launch, or check several for the mixed launcher.</p>
                </div>
                <button type="button" onClick={toggleMultiLaunch} className={cn("scene-button", multiLaunch && "instrument-button-selected")}> 
                  <Shuffle className="size-3.5" />
                  {multiLaunch ? "Cycling worlds" : "Use checked"}
                </button>
              </div>
              <div className="planet-catalog-grid lab-scroll">
                {catalogMasses.map((mass) => {
                  const checked = multiMassIds.includes(mass.id);
                  const singleSelected = mass.id === massId && !multiLaunch;
                  return (
                    <div key={mass.id} className="planet-catalog-item">
                      <button
                        type="button"
                        onClick={() => setMassId(mass.id)}
                        className={cn("planet-catalog-main", singleSelected && "planet-catalog-main-selected")}
                      >
                        <span className="catalog-planet" style={{ background: mass.color }} aria-hidden />
                        <span className="min-w-0 text-left">
                          <span className="block truncate text-sm font-medium">{mass.label}</span>
                          <span className="block truncate text-[0.68rem] text-muted">{mass.hint} · {Math.round(mass.mass)} m</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-pressed={checked}
                        aria-label={`${checked ? "Remove" : "Add"} ${mass.label} ${checked ? "from" : "to"} mixed launcher`}
                        title={`${checked ? "Remove from" : "Add to"} mixed launcher`}
                        onClick={() => toggleMultiMassId(mass.id)}
                        className={cn("catalog-check", checked && "catalog-check-selected")}
                      >
                        <Check className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <label className="time-control">
              <span className="eyebrow shrink-0">Time</span>
              <input
                type="range"
                min={0.25}
                max={6}
                step={0.25}
                value={timeScale}
                onChange={(event) => setTimeScale(Number(event.target.value))}
                className="lab-range h-11 w-full cursor-pointer"
                aria-label="Time scale"
                suppressHydrationWarning
              />
              <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-fg">
                {formatScale(timeScale)}
              </span>
            </label>

            <div className="control-strip flex flex-nowrap gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <IconToggle pressed={paused} onClick={togglePaused} label={paused ? "Resume" : "Pause"}>
                {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </IconToggle>
              <IconToggle pressed={trails} onClick={toggleTrails} label="Trails">
                <Spline className="size-4" />
              </IconToggle>
              <IconToggle pressed={fieldWorlds} onClick={toggleFieldWorlds} label="World field">
                <Magnet className="size-4" />
              </IconToggle>
              <IconToggle pressed={fieldHoles} onClick={toggleFieldHoles} label="Hole field">
                <CircleDot className="size-4" />
              </IconToggle>
              <IconToggle pressed={follow} onClick={toggleFollow} label="Follow">
                <Crosshair className="size-4" />
              </IconToggle>
              <ToolButton onClick={() => apiRef.current?.undo()} label="Undo launch">
                <Undo2 className="size-4" />
              </ToolButton>
              <ToolButton onClick={() => apiRef.current?.rewind()} label={`Rewind ${rewindSeconds.toFixed(1)} seconds`}>
                <History className="size-4" />
              </ToolButton>
              <ToolButton onClick={() => apiRef.current?.recenter()} label="Recenter">
                <LocateFixed className="size-4" />
              </ToolButton>
              <ToolButton onClick={() => apiRef.current?.clear()} label="Clear lab" danger>
                <Trash2 className="size-4" />
              </ToolButton>
            </div>
          </div>

          <div className="control-strip mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="eyebrow mr-1 hidden shrink-0 px-1 md:inline">Cosmic modes</span>
            {COSMIC_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                title={mode.short}
                onClick={() => apiRef.current?.loadScene(mode.id)}
                className={cn("mode-button", sceneId === mode.id && "mode-button-selected")}
              >
                {mode.id === "galaxy" && <Sparkles className="size-3.5" />}
                {mode.id === "gargantua" && <CircleDot className="size-3.5" />}
                {mode.id === "cometStorm" && <Orbit className="size-3.5" />}
                {mode.label}
              </button>
            ))}
            {sceneId === "galaxy" && (
              <button type="button" onClick={() => apiRef.current?.reformGalaxy()} className="scene-button">
                <History className="size-3.5" />
                Re-form
              </button>
            )}
          </div>

          <div className="control-strip mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="eyebrow mr-1 hidden shrink-0 px-1 md:inline">Instruments</span>
            <InstrumentButton selected={instrument === "launch"} onClick={() => setInstrument("launch")} label="Launch">
              <Orbit className="size-3.5" />
            </InstrumentButton>
            <InstrumentButton selected={instrument === "wormhole"} onClick={() => setInstrument("wormhole")} label="Wormhole">
              <CircleDot className="size-3.5" />
            </InstrumentButton>
            <InstrumentButton selected={instrument === "nova"} onClick={() => setInstrument("nova")} label="Nova pulse">
              <Sparkles className="size-3.5" />
            </InstrumentButton>
            <InstrumentButton selected={instrument === "gravityWell"} onClick={() => setInstrument("gravityWell")} label="Gravity well">
              <Magnet className="size-3.5" />
            </InstrumentButton>
            <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />
            <span className="eyebrow mr-1 hidden shrink-0 px-1 md:inline">Scenes</span>
            {SCENES.map((scene) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => apiRef.current?.loadScene(scene.id)}
                className={cn("scene-button", sceneId === scene.id && "instrument-button-selected")}
              >
                {scene.id === "remix" && <Shuffle className="size-3.5" />}
                {scene.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
      <LabReport apiRef={apiRef} />
    </div>
  );
}

function MissionCard({
  captures,
  closeCalls,
  merges,
  activeContract,
  contractStatus,
  contractProgress,
  mode,
  galaxyStars,
  galaxyFormation,
  bodyCount,
  apiRef,
}: {
  captures: number;
  closeCalls: number;
  merges: number;
  activeContract: ReturnType<typeof contractById>;
  contractStatus: "idle" | "active" | "complete" | "failed";
  contractProgress: number;
  mode: { id: SceneId; label: string; short: string } | undefined;
  galaxyStars: number;
  galaxyFormation: number;
  bodyCount: number;
  apiRef: MutableRefObject<SimApi | null>;
}) {
  if (activeContract) {
    return (
      <section className="hud-panel pointer-events-auto absolute left-5 top-28 hidden w-72 p-4 lg:block">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Contract {activeContract.number}</p>
          <span className={cn("text-xs capitalize", contractStatus === "failed" ? "text-danger" : "text-muted")}>{contractStatus}</span>
        </div>
        <h2 className="mt-3 text-sm font-semibold text-fg">{activeContract.title}</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{activeContract.objective}</p>
        <progress className="mission-progress mt-4" value={contractProgress} max={activeContract.target} aria-label={`${contractProgress} of ${activeContract.target}`} />
        <div className="mt-2 flex items-center justify-between font-mono text-xs tabular-nums text-muted">
          <span>{Math.floor(contractProgress)} / {activeContract.target}</span>
          <span>{activeContract.difficulty}</span>
        </div>
      </section>
    );
  }
  if (mode) {
    const detail = mode.id === "galaxy"
      ? "A diffuse stellar cloud is condensing into a seeded four-arm spiral."
      : mode.id === "milkyway"
        ? "A playable reconstruction with the galactic bar, Sol, Orion Spur, and Perseus Arm marked."
        : mode.id === "accretion"
          ? "Let the planetesimal belt collide, merge, and grow the three colored planetary embryos."
          : mode.id === "cometStorm"
            ? "Icy visitors and rubble are converging on three inhabited inner worlds. Intercept or redirect them."
            : "Gargantua bends its luminous accretion disk around the event horizon, with Miller, Mann, and Endurance nearby.";
    return (
      <section className="mode-card hud-panel pointer-events-auto absolute left-5 top-28 hidden w-72 p-4 lg:block">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Cosmic mode</p>
          <span className="font-mono text-xs tabular-nums text-muted">{galaxyStars > 0 ? `${galaxyStars} stars` : `${bodyCount} bodies`}</span>
        </div>
        <h2 className="mt-3 font-display text-xl italic text-fg">{mode.label}</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">{detail}</p>
        {mode.id === "galaxy" && (
          <>
            <progress className="mission-progress mt-4" value={galaxyFormation} max={1} aria-label={`${Math.round(galaxyFormation * 100)} percent formed`} />
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-xs tabular-nums text-muted">{Math.round(galaxyFormation * 100)}% formed</span>
              <button type="button" className="text-xs font-medium text-fg underline decoration-subtle underline-offset-4" onClick={() => apiRef.current?.reformGalaxy()}>
                Restart formation
              </button>
            </div>
          </>
        )}
        {mode.id === "milkyway" && <p className="mt-4 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted">Barred spiral · 4 principal arms</p>}
        {mode.id === "gargantua" && <p className="mt-4 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted">Photon ring · lensed rear disk</p>}
      </section>
    );
  }
  const items = [
    ["Capture an orbit", captures > 0],
    ["Thread the needle", closeCalls > 0],
    ["Make contact", merges > 0],
  ] as const;
  const done = items.filter(([, complete]) => complete).length;
  return (
    <section className="hud-panel pointer-events-auto absolute left-5 top-28 hidden w-64 p-4 lg:block">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Field notes</p>
        <span className="font-mono text-xs tabular-nums text-muted">{done}/3</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {items.map(([label, complete]) => (
          <div key={label} className="flex items-center gap-2.5 text-sm">
            <span className={cn("flex size-5 items-center justify-center rounded-full border", complete ? "border-accent bg-accent text-bg" : "border-subtle text-transparent")}>
              <Check className="size-3" />
            </span>
            <span className={complete ? "text-muted line-through decoration-subtle" : "text-fg"}>{label}</span>
          </div>
        ))}
      </div>
      <progress className="mission-progress mt-4" value={done} max={3} aria-label={`${done} of 3 field notes complete`} />
    </section>
  );
}

function InstrumentButton({
  selected,
  onClick,
  label,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn("scene-button", selected && "instrument-button-selected")}
    >
      {children}
      {label}
    </button>
  );
}

function DiscoveryToast({ toast }: { toast: DiscoveryToastType }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const remaining = Math.max(0, 4200 - (Date.now() - toast.createdAt));
    const timer = window.setTimeout(() => setVisible(false), remaining);
    return () => window.clearTimeout(timer);
  }, [toast.createdAt]);
  return (
    <div className={cn("pointer-events-none absolute left-3 right-3 top-36 z-40 transition-[opacity,transform] duration-150 sm:left-1/2 sm:right-auto sm:top-5 sm:w-96 sm:-translate-x-1/2", visible ? "opacity-100" : "-translate-y-2 opacity-0")}>
      <div className="discovery-toast flex items-center gap-3 rounded-xl border border-border bg-surface/95 px-4 py-3 shadow-panel backdrop-blur-sm">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-bg">
          <Orbit className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">{toast.title}</p>
          <p className="truncate text-xs text-muted">{toast.detail}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm tabular-nums text-fg">+{toast.points}</p>
          {toast.streak > 1 && <p className="text-xs text-muted">{toast.streak}× streak</p>}
        </div>
      </div>
    </div>
  );
}

function IconButton({ label, onClick, badge, children }: { label: string; onClick: () => void; badge?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="icon-button relative">
      {children}
      {badge && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" />}
    </button>
  );
}

function IconToggle({ pressed, onClick, label, children }: { pressed: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={pressed} aria-label={label} title={label} onClick={onClick} className={cn("tool-button", pressed && "tool-button-selected")}>
      {children}
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

function ToolButton({ onClick, label, danger = false, children }: { onClick: () => void; label: string; danger?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cn("tool-button", danger && "hover:text-danger")}>
      {children}
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

function formatScale(n: number) {
  if (n < 1) return `${n.toFixed(2).replace(/0$/, "")}×`;
  if (Number.isInteger(n)) return `${n}×`;
  return `${n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}×`;
}

function formatScore(n: number) {
  return Math.round(n).toString().padStart(6, "0");
}
