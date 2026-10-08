import {
  Check,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
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
import { fieldGoals } from "@/lib/sim/challenges";
import { contractById } from "@/lib/sim/contracts";
import { COSMIC_MODES, MASS_PRESETS, SCENES, type MassId, type SceneId } from "@/lib/sim/types";
import { useSimUi, type DiscoveryToast as DiscoveryToastType } from "@/lib/sim/store";
import { cn } from "@/lib/utils";

export function Hud({
  apiRef,
  onExit,
}: {
  apiRef: MutableRefObject<SimApi | null>;
  onExit: () => void;
}) {
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
  const sceneId = useSimUi((s) => s.sceneId);
  const score = useSimUi((s) => s.score);
  const objectivesComplete = useSimUi((s) => s.objectivesComplete);
  const sound = useSimUi((s) => s.sound);
  const hudHidden = useSimUi((s) => s.hudHidden);
  const reportOpen = useSimUi((s) => s.reportOpen);
  const rewindSeconds = useSimUi((s) => s.rewindSeconds);
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
  const challengingTasks = useSimUi((s) => s.challengingTasks);
  const toggleChallengingTasks = useSimUi((s) => s.toggleChallengingTasks);
  const shake = useSimUi((s) => s.shake);
  const toggleShake = useSimUi((s) => s.toggleShake);
  const [panel, setPanel] = useState<"bodies" | "modes" | "tools" | "view">("bodies");
  const [category, setCategory] = useState("worlds");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => hydrateProfile(), [hydrateProfile]);

  const showDiscovery =
    lastDiscovery !== null && Date.now() - lastDiscovery.createdAt < 5000 && !reportOpen;

  if (hudHidden) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20">
        {showDiscovery && lastDiscovery && (
          <DiscoveryToast key={lastDiscovery.id} toast={lastDiscovery} />
        )}
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

  const categories: { id: string; label: string; ids: MassId[] }[] = [
    { id: "rocks", label: "Small bodies", ids: ["dust", "asteroid", "comet", "moon"] },
    {
      id: "worlds",
      label: "Planets",
      ids: ["planet", "ocean", "desert", "ice", "lava", "giant", "ringed"],
    },
    { id: "stars", label: "Stars & holes", ids: ["star", "redGiant", "blackHole", "smbh"] },
    {
      id: "mixed",
      label: "Mixed",
      ids: ["moon", "planet", "ocean", "desert", "ice", "lava", "giant", "ringed"],
    },
  ];
  const selectedPreset = MASS_PRESETS.find((m) => m.id === massId)!;
  const visibleMasses = MASS_PRESETS.filter((m) =>
    categories.find((c) => c.id === category)!.ids.includes(m.id),
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 pb-14 sm:p-5">
      <header className="sandbox-header flex items-start justify-between gap-2">
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
          <IconButton
            label="Open field notes"
            onClick={() => setReportOpen(true)}
            badge={challengingTasks && !objectivesComplete}
          >
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

      <MissionCard apiRef={apiRef} />

      {showDiscovery && lastDiscovery && (
        <DiscoveryToast key={lastDiscovery.id} toast={lastDiscovery} />
      )}

      <footer className="sandbox-controls pointer-events-auto mx-auto w-full max-w-5xl">
        <div className="hud-panel p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="eyebrow">
                {instrument === "launch" ? "Launch body" : "Place instrument"}
              </p>
              <p className="mt-1 truncate text-sm text-fg">
                {instrument === "launch"
                  ? multiLaunch
                    ? `Mixed launcher · ${multiMassIds.length} types`
                    : selectedPreset.label
                  : instrument === "nova"
                    ? "Nova pulse"
                    : instrument === "gravityWell"
                      ? "Gravity well"
                      : "Wormhole"}{" "}
                <span className="text-muted">
                  · {instrument === "launch" ? "drag to aim" : "tap to place"}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden font-mono text-xs text-muted sm:block">
                {galaxyStars > 0 ? `${galaxyStars} stars · ` : ""}
                {bodyCount} bodies
              </span>
              <IconButton
                label={collapsed ? "Expand launch controls" : "Collapse launch controls"}
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </IconButton>
            </div>
          </div>
          {!collapsed && (
            <div className="launch-options lab-scroll">
              <nav
                className="control-strip my-2 flex gap-1.5 overflow-x-auto"
                aria-label="Sandbox control categories"
              >
                {(["bodies", "modes", "tools", "view"] as const).map((tab) => (
                  <button
                    type="button"
                    key={tab}
                    aria-pressed={panel === tab}
                    className={cn("control-tab", panel === tab && "control-tab-selected")}
                    onClick={() => setPanel(tab)}
                  >
                    {tab === "bodies"
                      ? "Bodies"
                      : tab === "modes"
                        ? "Modes"
                        : tab === "tools"
                          ? "Tools"
                          : "View"}
                  </button>
                ))}
              </nav>
              {panel === "bodies" && (
                <section aria-label="Body catalog">
                  <nav
                    className="control-strip mb-2 flex gap-1.5 overflow-x-auto"
                    aria-label="Body categories"
                  >
                    {categories.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        aria-pressed={category === c.id}
                        className={cn(
                          "body-category",
                          category === c.id && "body-category-selected",
                        )}
                        onClick={() => setCategory(c.id)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </nav>
                  <div className="body-picks">
                    {visibleMasses.map((mass) => (
                      <button
                        type="button"
                        key={mass.id}
                        aria-pressed={
                          category === "mixed"
                            ? multiMassIds.includes(mass.id)
                            : mass.id === massId && !multiLaunch
                        }
                        title={
                          sceneId === "milkyway"
                            ? `${mass.hint} · Solar System mass scale`
                            : `${mass.hint} · ${mass.mass} mass units`
                        }
                        className={cn(
                          "mass-button",
                          (category === "mixed"
                            ? multiMassIds.includes(mass.id)
                            : mass.id === massId && !multiLaunch) && "mass-button-selected",
                        )}
                        onClick={() =>
                          category === "mixed" ? toggleMultiMassId(mass.id) : setMassId(mass.id)
                        }
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: mass.color }}
                          aria-hidden
                        />
                        {mass.label}
                        {category === "mixed" && multiMassIds.includes(mass.id) && (
                          <Check className="size-3" />
                        )}
                      </button>
                    ))}
                  </div>
                  {category === "mixed" && (
                    <button
                      type="button"
                      className={cn(
                        "scene-button mt-2",
                        multiLaunch && "instrument-button-selected",
                      )}
                      aria-pressed={multiLaunch}
                      onClick={toggleMultiLaunch}
                    >
                      <Shuffle className="size-4" />
                      {multiLaunch ? "Mixed launcher on" : "Launch selected types in rotation"}
                    </button>
                  )}
                </section>
              )}
              {panel === "modes" && (
                <section aria-label="Simulation modes" className="space-y-3">
                  <div className="body-picks">
                    {COSMIC_MODES.map((mode) => (
                      <button
                        type="button"
                        key={mode.id}
                        title={mode.short}
                        aria-pressed={sceneId === mode.id}
                        onClick={() => apiRef.current?.loadScene(mode.id)}
                        className={cn("mode-button", sceneId === mode.id && "mode-button-selected")}
                      >
                        {mode.label}
                      </button>
                    ))}
                    {SCENES.map((scene) => (
                      <button
                        type="button"
                        key={scene.id}
                        aria-pressed={sceneId === scene.id}
                        onClick={() => apiRef.current?.loadScene(scene.id)}
                        className={cn(
                          "scene-button",
                          sceneId === scene.id && "instrument-button-selected",
                        )}
                      >
                        {scene.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => apiRef.current?.loadScene(sceneId)}
                    >
                      <History className="size-4" />
                      Restart mode
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      aria-pressed={challengingTasks}
                      onClick={toggleChallengingTasks}
                    >
                      <FlaskConical className="size-4" />
                      Challenges {challengingTasks ? "on" : "off"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setReportOpen(true)}
                    >
                      <ClipboardList className="size-4" />
                      Contracts
                    </button>
                  </div>
                </section>
              )}
              {panel === "tools" && (
                <section aria-label="Instruments" className="space-y-2">
                  <div className="body-picks">
                    <InstrumentButton
                      selected={instrument === "launch"}
                      onClick={() => setInstrument("launch")}
                      label="Launch"
                    >
                      <Orbit className="size-4" />
                    </InstrumentButton>
                    <InstrumentButton
                      selected={instrument === "wormhole"}
                      onClick={() => setInstrument("wormhole")}
                      label="Wormhole"
                    >
                      <CircleDot className="size-4" />
                    </InstrumentButton>
                    <InstrumentButton
                      selected={instrument === "nova"}
                      onClick={() => setInstrument("nova")}
                      label="Nova pulse"
                    >
                      <Sparkles className="size-4" />
                    </InstrumentButton>
                    <InstrumentButton
                      selected={instrument === "gravityWell"}
                      onClick={() => setInstrument("gravityWell")}
                      label="Gravity well"
                    >
                      <Magnet className="size-4" />
                    </InstrumentButton>
                  </div>
                  <p className="text-sm text-muted">
                    {instrument === "wormhole"
                      ? "Tap two points to connect them. Send bodies through the pair."
                      : instrument === "nova"
                        ? "Tap to send a shockwave through nearby bodies."
                        : instrument === "gravityWell"
                          ? "Tap to create a temporary pull and bend trajectories."
                          : "Drag on the field to aim. The line predicts your trajectory."}
                  </p>
                  <div className="body-picks">
                    <ToolButton onClick={() => apiRef.current?.undo()} label="Undo launch">
                      <Undo2 className="size-4" />
                    </ToolButton>
                    <ToolButton
                      onClick={() => apiRef.current?.rewind()}
                      label={`Rewind ${rewindSeconds.toFixed(1)}s`}
                    >
                      <History className="size-4" />
                    </ToolButton>
                    <ToolButton onClick={() => apiRef.current?.replay()} label="Replay">
                      <Play className="size-4" />
                    </ToolButton>
                    <ToolButton onClick={() => apiRef.current?.share()} label="Share">
                      <Share2 className="size-4" />
                    </ToolButton>
                    <ToolButton onClick={() => apiRef.current?.clear()} label="Clear lab" danger>
                      <Trash2 className="size-4" />
                    </ToolButton>
                  </div>
                </section>
              )}
              {panel === "view" && (
                <section aria-label="View and comfort settings" className="body-picks">
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
                  <IconToggle pressed={shake} onClick={toggleShake} label="Major-event shake">
                    <Sparkles className="size-4" />
                  </IconToggle>
                  <IconToggle
                    pressed={challengingTasks}
                    onClick={toggleChallengingTasks}
                    label="Challenges"
                  >
                    <FlaskConical className="size-4" />
                  </IconToggle>
                  <ToolButton onClick={toggleHud} label="Hide controls">
                    <Eye className="size-4" />
                  </ToolButton>
                </section>
              )}
            </div>
          )}
          <div className="mt-2 flex items-center gap-1.5">
            <IconToggle pressed={paused} onClick={togglePaused} label={paused ? "Resume" : "Pause"}>
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </IconToggle>
            <label className="time-control min-w-0">
              <span className="eyebrow shrink-0 hidden sm:inline">Time</span>
              <input
                type="range"
                min={0.25}
                max={6}
                step={0.25}
                value={timeScale}
                onChange={(event) => setTimeScale(Number(event.target.value))}
                className="lab-range h-11 w-full min-w-0"
                aria-label="Time scale"
              />
              <span className="shrink-0 font-mono text-xs">{formatScale(timeScale)}</span>
            </label>
            <ToolButton onClick={() => apiRef.current?.zoom(1 / 1.3)} label="Zoom out">
              <Minus className="size-4" />
            </ToolButton>
            <ToolButton onClick={() => apiRef.current?.zoom(1.3)} label="Zoom in">
              <Plus className="size-4" />
            </ToolButton>
            <ToolButton onClick={() => apiRef.current?.recenter()} label="Recenter">
              <LocateFixed className="size-4" />
            </ToolButton>
          </div>
        </div>
      </footer>
      <LabReport apiRef={apiRef} />
    </div>
  );
}

const MODE_BRIEFS: Record<SceneId, string> = {
  helios: "Build a lasting system. Aim along a tangent for a stable orbit.",
  binary: "Thread a path around two moving suns without disturbing their dance.",
  figure8: "Three worlds share one figure-eight. Find room for a fourth.",
  slingshot: "Skim Atlas, borrow speed, then escape the system intact.",
  horizon: "Surf the edge of the well. Get too close and tidal forces tear worlds apart.",
  mayhem: "Counter-rotating worlds collide. Start a chain reaction or rescue a survivor.",
  remix: "A new seeded system each time. Discover its stable paths.",
  galaxy:
    "Twelve live stellar clusters orbit the core. Launch visitors, open wormholes, and reshape their paths.",
  milkyway:
    "The Sun and all eight planets. Explore their orbits or launch a visitor into the system.",
  accretion: "Guide rubble into planetary embryos. Grow worlds with gentle collisions.",
  cometStorm:
    "Protect the three inner worlds. Stronger comet waves arrive every 18 simulated seconds.",
  gargantua: "Skim the photon ring. Rescue a world with a wormhole before it is torn apart.",
  empty: "Start with nothing. Build your own suns, planets and orbital architecture.",
};

function MissionCard({ apiRef }: { apiRef: MutableRefObject<SimApi | null> }) {
  const state = useSimUi();
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const sync = () => setExpanded(desktop.matches);
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);
  const activeContract = contractById(state.activeContractId);
  const label =
    COSMIC_MODES.find((m) => m.id === state.sceneId)?.label ??
    SCENES.find((m) => m.id === state.sceneId)?.label ??
    "Field";
  const goals = fieldGoals(state);
  const done = state.objectivesComplete ? 3 : goals.filter((g) => g.value >= g.target).length;
  return (
    <section
      className={cn(
        "mission-card hud-panel pointer-events-auto",
        expanded && "mission-card-expanded",
      )}
      aria-label="Mode and objectives"
    >
      <button
        type="button"
        className="mission-heading"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-sm font-semibold">
          {activeContract ? activeContract.title : label}
        </span>
        <span className="text-xs text-muted">
          {activeContract
            ? state.contractStatus
            : state.challengingTasks
              ? `${done}/3`
              : "Free play"}
        </span>
        <ChevronDown className="mission-chevron size-4" />
      </button>
      <div className="mission-content">
        <p className="text-sm leading-relaxed text-muted">
          {activeContract ? activeContract.objective : MODE_BRIEFS[state.sceneId]}
        </p>
        {state.sceneId === "milkyway" && (
          <p className="mt-2 text-xs text-muted">
            Solar System within the Milky Way · real mass ratios · scaled distances, sizes and time
          </p>
        )}
        {state.sceneId === "cometStorm" && (
          <p className="mt-3 font-mono text-xs text-fg">
            Wave {Math.floor(state.worldTime / 18) + 1} · next in{" "}
            {Math.ceil(18 - (state.worldTime % 18))}s
          </p>
        )}
        {activeContract ? (
          <progress
            className="mission-progress mt-3"
            value={state.contractProgress}
            max={activeContract.target}
            aria-label="Contract progress"
          />
        ) : (
          state.challengingTasks && (
            <div className="mt-4 space-y-3">
              {goals.map((goal) => (
                <div key={goal.label}>
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span
                      className={
                        goal.value >= goal.target || state.objectivesComplete
                          ? "text-muted"
                          : "text-fg"
                      }
                    >
                      {goal.label}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted">
                      {Math.min(goal.target, Math.floor(goal.value))}/{goal.target}
                    </span>
                  </div>
                  <progress
                    className="mission-progress mt-1.5"
                    value={
                      state.objectivesComplete ? goal.target : Math.min(goal.target, goal.value)
                    }
                    max={goal.target}
                    aria-label={goal.label}
                  />
                </div>
              ))}
            </div>
          )
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="body-category"
            aria-pressed={state.challengingTasks}
            onClick={state.toggleChallengingTasks}
          >
            Challenges {state.challengingTasks ? "on" : "off"}
          </button>
          <button
            type="button"
            className="body-category"
            onClick={() =>
              activeContract
                ? apiRef.current?.startContract(activeContract.id)
                : apiRef.current?.loadScene(state.sceneId)
            }
          >
            Restart
          </button>
        </div>
      </div>
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
    <div
      className={cn(
        "discovery-notice pointer-events-none absolute right-3 top-40 z-40 w-64 max-w-[calc(100%-1.5rem)] transition-[opacity,transform] duration-150 sm:right-5 sm:top-28 sm:w-72",
        visible ? "opacity-100" : "-translate-y-2 opacity-0",
      )}
    >
      <div
        role="status"
        aria-live="polite"
        className="discovery-toast flex items-center gap-3 rounded-xl border border-border bg-surface/95 px-4 py-3 shadow-panel backdrop-blur-sm"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-bg">
          <Orbit className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">{toast.title}</p>
          <p className="truncate text-xs text-muted">{toast.detail}</p>
        </div>
        <div className="text-right">
          {toast.points > 0 && (
            <p className="font-mono text-sm tabular-nums text-fg">+{toast.points}</p>
          )}
          {toast.streak > 1 && <p className="text-xs text-muted">{toast.streak}× streak</p>}
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  badge,
  children,
}: {
  label: string;
  onClick: () => void;
  badge?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="icon-button relative"
    >
      {children}
      {badge && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" />}
    </button>
  );
}

function IconToggle({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn("tool-button", pressed && "tool-button-selected")}
    >
      {children}
      <span className="control-label">{label}</span>
    </button>
  );
}

function ToolButton({
  onClick,
  label,
  danger = false,
  children,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn("tool-button", danger && "hover:text-danger")}
    >
      {children}
      <span className="control-label">{label}</span>
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
