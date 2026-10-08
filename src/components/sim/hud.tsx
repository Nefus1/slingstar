import {
  Check,
  ChevronDown,
  Minus,
  Plus,
  CircleDot,
  ClipboardList,
  Crosshair,
  Eye,
  History,
  Home,
  LocateFixed,
  Magnet,
  MoreHorizontal,
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
  X,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { useEffect, useState, type MutableRefObject, type ReactNode } from "react";
import { AuthChip } from "@/components/sim/auth-chip";
import { LabReport } from "@/components/sim/lab-report";
import type { SimApi } from "@/components/sim/orbit-canvas";
import { fieldGoals } from "@/lib/sim/challenges";
import { contractById } from "@/lib/sim/contracts";
import { ENCOUNTERS } from "@/lib/sim/encounters";
import { COSMIC_MODES, MASS_PRESETS, SCENES, type MassId, type SceneId } from "@/lib/sim/types";
import { useSimUi, type DiscoveryToast as DiscoveryToastType } from "@/lib/sim/store";
import { cn } from "@/lib/utils";

type DockPanel = "bodies" | "modes" | "tools" | "events" | "speed" | "more";
const BODY_CATEGORIES: { id: string; label: string; ids: MassId[] }[] = [
  { id: "rocks", label: "Small bodies", ids: ["dust", "asteroid", "comet", "moon"] },
  {
    id: "worlds",
    label: "Planets",
    ids: ["planet", "ocean", "desert", "ice", "lava", "giant", "ringed"],
  },
  { id: "stars", label: "Stars & holes", ids: ["star", "redGiant", "blackHole", "smbh"] },
];

export function Hud({
  apiRef,
  onExit,
}: {
  apiRef: MutableRefObject<SimApi | null>;
  onExit: () => void;
}) {
  const state = useSimUi();
  const [panel, setPanel] = useState<DockPanel | null>(null);
  const [category, setCategory] = useState("worlds");
  useEffect(() => state.hydrateProfile(), [state.hydrateProfile]);
  const showDiscovery =
    state.lastDiscovery !== null &&
    Date.now() - state.lastDiscovery.createdAt < 5000 &&
    !state.reportOpen;
  const selected = MASS_PRESETS.find((m) => m.id === state.massId)!;
  const scene = [...COSMIC_MODES, ...SCENES].find((m) => m.id === state.sceneId)!;
  const visibleMasses = MASS_PRESETS.filter((m) =>
    BODY_CATEGORIES.find((c) => c.id === category)!.ids.includes(m.id),
  );
  const close = () => setPanel(null);
  const hint =
    state.instrument === "wormhole"
      ? "Tap two points to link a wormhole"
      : state.instrument === "nova"
        ? "Tap to send a nova pulse"
        : state.instrument === "gravityWell"
          ? "Tap to bend trajectories with a gravity well"
          : state.orbitAssist
            ? "Tap for an orbit · drag to aim manually"
            : "Drag to aim and launch";

  function picker(
    id: DockPanel,
    label: string,
    trigger: ReactNode,
    content: ReactNode,
    side: "top" | "bottom" = "top",
  ) {
    return (
      <Popover.Root modal open={panel === id} onOpenChange={(open) => setPanel(open ? id : null)}>
        <Popover.Trigger asChild>{trigger}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="dock-picker hud-panel lab-scroll"
            side={side}
            sideOffset={12}
            collisionPadding={12}
            aria-label={label}
          >
            <div className="picker-heading">
              <h2 className="text-sm font-semibold">{label}</h2>
              <Popover.Close className="picker-close" aria-label={`Close ${label}`}>
                <X className="size-4" />
              </Popover.Close>
            </div>
            {content}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  if (state.hudHidden)
    return (
      <div className="pointer-events-none absolute inset-0 z-20">
        {showDiscovery && state.lastDiscovery && (
          <DiscoveryToast key={state.lastDiscovery.id} toast={state.lastDiscovery} />
        )}
        <button
          type="button"
          className="secondary-button pointer-events-auto absolute bottom-14 right-3 sm:bottom-5 sm:right-5"
          onClick={state.toggleHud}
        >
          <Eye className="size-4" /> Show controls
        </button>
      </div>
    );

  return (
    <div className="sandbox-hud pointer-events-none absolute inset-0 z-20">
      <header className="sandbox-header">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl italic leading-none tracking-tight">Apsis</h1>
          {picker(
            "modes",
            "Choose a scene",
            <button type="button" className="dock-scene" aria-label="Choose simulation mode">
              {scene.label}
              <ChevronDown className="size-3.5" />
            </button>,
            <div className="space-y-3">
              <div className="scene-picks">
                {[...COSMIC_MODES, ...SCENES].map((mode) => (
                  <button
                    type="button"
                    key={mode.id}
                    aria-label={mode.label}
                    aria-pressed={state.sceneId === mode.id}
                    onClick={() => {
                      apiRef.current?.loadScene(mode.id);
                      close();
                    }}
                    className={cn("scene-pick", state.sceneId === mode.id && "scene-pick-selected")}
                  >
                    <span>{mode.label}</span>
                    <span className="text-xs text-muted">
                      {COSMIC_MODES.find((m) => m.id === mode.id)?.short ?? MODE_BRIEFS[mode.id]}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="secondary-button w-full"
                onClick={() => {
                  apiRef.current?.loadScene(state.sceneId);
                  close();
                }}
              >
                <History className="size-4" /> Restart mode
              </button>
            </div>,
            "bottom",
          )}
        </div>
        <div className="pointer-events-auto flex items-center gap-1">
          <span
            className="dock-score hidden font-mono text-xs text-muted sm:block"
            title="Session score"
          >
            {formatScore(state.score)}
          </span>
          <IconButton label="Open field notes" onClick={() => state.setReportOpen(true)}>
            <ClipboardList className="size-4" />
          </IconButton>
          <AuthChip />
        </div>
      </header>
      <MissionCard apiRef={apiRef} />
      <EncounterStatus />
      {showDiscovery && state.lastDiscovery && (
        <DiscoveryToast key={state.lastDiscovery.id} toast={state.lastDiscovery} />
      )}

      <aside className="camera-dock pointer-events-auto" aria-label="Camera controls">
        <IconButton label="Zoom in" onClick={() => apiRef.current?.zoom(1.3)}>
          <Plus className="size-4" />
        </IconButton>
        <IconButton label="Zoom out" onClick={() => apiRef.current?.zoom(1 / 1.3)}>
          <Minus className="size-4" />
        </IconButton>
        <IconButton label="Recenter" onClick={() => apiRef.current?.recenter()}>
          <LocateFixed className="size-4" />
        </IconButton>
      </aside>

      <footer className="sandbox-controls pointer-events-auto">
        <p className="dock-hint text-xs text-muted">{hint}</p>
        <div className="launch-dock hud-panel">
          {picker(
            "bodies",
            "Launch body",
            <button type="button" className="dock-body" aria-label="Choose launch body">
              <span className="body-swatch" style={{ background: selected.color }} aria-hidden />
              <span>{state.multiLaunch ? "Mixed bodies" : selected.label}</span>
              <ChevronDown className="size-3.5" />
            </button>,
            <section aria-label="Body catalog" className="space-y-3">
              <nav className="picker-categories" aria-label="Body categories">
                {BODY_CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    aria-pressed={category === c.id}
                    className={cn("body-category", category === c.id && "body-category-selected")}
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
                    aria-pressed={mass.id === state.massId && !state.multiLaunch}
                    title={mass.hint}
                    className={cn(
                      "mass-button",
                      mass.id === state.massId && !state.multiLaunch && "mass-button-selected",
                    )}
                    onClick={() => {
                      state.setMassId(mass.id);
                      close();
                    }}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: mass.color }}
                      aria-hidden
                    />
                    {mass.label}
                  </button>
                ))}
              </div>
              <div className="picker-divider">
                <p className="text-xs text-muted mb-2">Launch style</p>
                <div className="launch-style" aria-label="Launch style">
                  <button
                    type="button"
                    aria-pressed={!state.orbitAssist}
                    onClick={() => state.setOrbitAssist(false)}
                  >
                    Manual aim
                  </button>
                  <button
                    type="button"
                    aria-pressed={state.orbitAssist}
                    onClick={() => state.setOrbitAssist(true)}
                  >
                    <Orbit className="size-4" /> Orbit assist
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Orbit assist gives taps a circular velocity around the largest body. Dragging
                  still aims freely.
                </p>
              </div>
              <details className="picker-divider">
                <summary className="text-sm text-muted">Mixed launcher</summary>
                <div className="body-picks my-2">
                  {MASS_PRESETS.filter((m) => m.kind === "rock").map((mass) => (
                    <button
                      type="button"
                      key={mass.id}
                      aria-pressed={state.multiMassIds.includes(mass.id)}
                      onClick={() => state.toggleMultiMassId(mass.id)}
                      className={cn(
                        "mass-button",
                        state.multiMassIds.includes(mass.id) && "mass-button-selected",
                      )}
                    >
                      {mass.label}
                      {state.multiMassIds.includes(mass.id) && <Check className="size-3" />}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="secondary-button w-full"
                  onClick={() => {
                    state.toggleMultiLaunch();
                    close();
                  }}
                >
                  <Shuffle className="size-4" />
                  {state.multiLaunch ? "Disable mixed launcher" : "Use selected bodies in rotation"}
                </button>
              </details>
            </section>,
          )}

          {picker(
            "tools",
            "Instruments",
            <button
              type="button"
              className={cn(
                "dock-button dock-tools",
                state.instrument !== "launch" && "dock-button-active",
              )}
              aria-label="Choose instrument"
            >
              <Magnet className="size-4" />
              <span className="dock-button-label">Tools</span>
            </button>,
            <div className="instrument-picks">
              {(
                [
                  ["launch", "Launch", "Drag to aim a body", Orbit],
                  ["wormhole", "Wormhole", "Tap two points to fold space", CircleDot],
                  ["nova", "Nova pulse", "Send a shockwave through the field", Sparkles],
                  [
                    "gravityWell",
                    "Gravity well",
                    "Bend trajectories with a temporary pull",
                    Magnet,
                  ],
                ] as const
              ).map(([id, label, description, Icon]) => (
                <button
                  type="button"
                  key={id}
                  aria-label={label}
                  aria-pressed={state.instrument === id}
                  className="instrument-pick"
                  onClick={() => {
                    state.setInstrument(id);
                    close();
                  }}
                >
                  <Icon className="size-5" />
                  <span>
                    <span className="block text-sm">{label}</span>
                    <span className="text-xs text-muted">{description}</span>
                  </span>
                  {state.instrument === id && <Check className="ml-auto size-4" />}
                </button>
              ))}
            </div>,
          )}

          {picker(
            "events",
            "Cosmic encounters",
            <button
              type="button"
              className="dock-button dock-events"
              aria-label="Add cosmic encounter"
            >
              <Sparkles className="size-4" />
              <span className="dock-button-label">Events</span>
            </button>,
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-muted">
                Send a visitor through your current system. Redirect it with a well, a wormhole, or
                a nova pulse.
              </p>
              <div className="instrument-picks">
                {ENCOUNTERS.map((event) => (
                  <button
                    type="button"
                    key={event.id}
                    className="encounter-pick"
                    disabled={state.bodyCount === 0 || state.encounter?.status === "active"}
                    onClick={() => {
                      apiRef.current?.encounter(event.id);
                      close();
                    }}
                  >
                    <span className="flex items-center justify-between text-sm">
                      <span>{event.label}</span>
                      <span className="text-xs text-muted">{event.duration}s</span>
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                      {event.description}
                    </span>
                  </button>
                ))}
              </div>
              {state.bodyCount === 0 && (
                <p className="text-xs text-muted">Launch an anchor first, or choose a scene.</p>
              )}
              {state.encounter?.status === "active" && (
                <p className="text-xs text-muted">
                  Finish the current encounter before adding another.
                </p>
              )}
              <p className="text-xs text-muted">
                {state.challengingTasks
                  ? "Optional goal: keep your original bodies intact until the timer ends."
                  : "Free play · no survival goal"}
              </p>
            </div>,
          )}

          <span className="dock-separator" />
          <button
            type="button"
            className="dock-play"
            aria-label={state.paused ? "Resume" : "Pause"}
            onClick={state.togglePaused}
          >
            {state.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
          {picker(
            "speed",
            "Simulation speed",
            <button type="button" className="dock-speed" aria-label="Change simulation speed">
              {formatScale(state.timeScale)}
              <ChevronDown className="size-3" />
            </button>,
            <div className="space-y-3">
              <div className="body-picks">
                {[0.25, 0.5, 1, 2, 4, 6].map((speed) => (
                  <button
                    type="button"
                    key={speed}
                    className={cn(
                      "body-category",
                      speed === state.timeScale && "body-category-selected",
                    )}
                    aria-pressed={speed === state.timeScale}
                    onClick={() => {
                      state.setTimeScale(speed);
                      close();
                    }}
                  >
                    {formatScale(speed)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">Slow down a close pass or fast-forward an orbit.</p>
            </div>,
          )}
          <button
            type="button"
            className="dock-button dock-undo"
            aria-label="Undo launch"
            title="Undo launch"
            onClick={() => apiRef.current?.undo()}
          >
            <Undo2 className="size-4" />
          </button>
          {picker(
            "more",
            "More controls",
            <button type="button" className="dock-button dock-more" aria-label="More controls">
              <MoreHorizontal className="size-5" />
            </button>,
            <div className="space-y-3">
              <div className="more-actions">
                <ToolButton
                  onClick={() => {
                    apiRef.current?.rewind();
                    close();
                  }}
                  label={`Rewind ${state.rewindSeconds.toFixed(1)}s`}
                >
                  <History className="size-4" />
                </ToolButton>
                <ToolButton
                  onClick={() => {
                    apiRef.current?.replay();
                    close();
                  }}
                  label="Replay"
                >
                  <Play className="size-4" />
                </ToolButton>
                <ToolButton
                  onClick={() => {
                    apiRef.current?.share();
                    close();
                  }}
                  label="Share"
                >
                  <Share2 className="size-4" />
                </ToolButton>
                <ToolButton
                  onClick={() => {
                    state.setReportOpen(true);
                    close();
                  }}
                  label="Contracts"
                >
                  <ClipboardList className="size-4" />
                </ToolButton>
              </div>
              <div className="more-settings picker-divider">
                <IconToggle pressed={state.trails} onClick={state.toggleTrails} label="Trails">
                  <Spline className="size-4" />
                </IconToggle>
                <IconToggle
                  pressed={state.fieldWorlds}
                  onClick={state.toggleFieldWorlds}
                  label="World field"
                >
                  <Magnet className="size-4" />
                </IconToggle>
                <IconToggle
                  pressed={state.fieldHoles}
                  onClick={state.toggleFieldHoles}
                  label="Hole field"
                >
                  <CircleDot className="size-4" />
                </IconToggle>
                <IconToggle pressed={state.follow} onClick={state.toggleFollow} label="Follow">
                  <Crosshair className="size-4" />
                </IconToggle>
                <IconToggle pressed={state.sound} onClick={state.toggleSound} label="Sound">
                  {state.sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                </IconToggle>
                <IconToggle
                  pressed={state.shake}
                  onClick={state.toggleShake}
                  label="Major-event shake"
                >
                  <Sparkles className="size-4" />
                </IconToggle>
                <IconToggle
                  pressed={state.challengingTasks}
                  onClick={state.toggleChallengingTasks}
                  label="Challenges"
                >
                  <Orbit className="size-4" />
                </IconToggle>
              </div>
              <div className="more-actions picker-divider">
                <ToolButton
                  onClick={() => {
                    state.toggleHud();
                    close();
                  }}
                  label="Hide controls"
                >
                  <Eye className="size-4" />
                </ToolButton>
                <ToolButton onClick={onExit} label="Game modes">
                  <Home className="size-4" />
                </ToolButton>
                <ToolButton
                  onClick={() => {
                    apiRef.current?.clear();
                    close();
                  }}
                  label="Clear lab"
                  danger
                >
                  <Trash2 className="size-4" />
                </ToolButton>
              </div>
              <p className="text-xs text-muted">
                {state.galaxyStars > 0 ? `${state.galaxyStars} stars · ` : ""}
                {state.bodyCount} bodies · Right-drag to pan · Scroll or pinch to zoom
              </p>
            </div>,
          )}
        </div>
      </footer>
      <LabReport apiRef={apiRef} />
    </div>
  );
}

function EncounterStatus() {
  const encounter = useSimUi((s) => s.encounter);
  const time = useSimUi((s) => s.worldTime);
  const challenges = useSimUi((s) => s.challengingTasks);
  if (!encounter) return null;
  const event = ENCOUNTERS.find((e) => e.id === encounter.kind)!;
  const remaining = Math.max(0, Math.ceil(encounter.endsAt - time));
  return (
    <aside className="encounter-status hud-panel" role="status" aria-label="Encounter status">
      <p className="text-xs font-semibold">
        {event.label}
        <span className="ml-2 font-mono text-muted">
          {encounter.status === "active" ? `${remaining}s` : "Complete"}
        </span>
      </p>
      <p className="mt-1 text-xs text-muted">
        {!challenges
          ? "Visitor experiment"
          : encounter.status === "active"
            ? "Keep your original bodies intact"
            : encounter.status === "intact"
              ? "System preserved"
              : "System changed · try another approach"}
      </p>
      {encounter.status === "active" && (
        <progress
          className="mission-progress mt-2"
          max={event.duration}
          value={event.duration - remaining}
          aria-label="Encounter time elapsed"
        />
      )}
    </aside>
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
  const activeContract = contractById(state.activeContractId);
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
          {activeContract
            ? activeContract.title
            : state.challengingTasks
              ? "Field goals"
              : "Scene guide"}
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
