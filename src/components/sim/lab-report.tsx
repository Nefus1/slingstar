import {
  Award,
  Check,
  Circle,
  Copy,
  Gauge,
  History,
  Orbit,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Waves,
  X,
} from "lucide-react";
import { useState, type MutableRefObject, type ReactNode } from "react";
import type { SimApi } from "@/components/sim/orbit-canvas";
import { CONTRACTS, contractById } from "@/lib/sim/contracts";
import { useSimUi } from "@/lib/sim/store";
import type { BodySummary } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

type TabId = "contracts" | "archive" | "timeline";

export function LabReport({ apiRef }: { apiRef: MutableRefObject<SimApi | null> }) {
  const [tab, setTab] = useState<TabId>("contracts");
  const open = useSimUi((state) => state.reportOpen);
  const setOpen = useSimUi((state) => state.setReportOpen);
  const score = useSimUi((state) => state.score);
  const bestScore = useSimUi((state) => state.bestScore);
  const totalDiscoveries = useSimUi((state) => state.totalDiscoveries);
  const launches = useSimUi((state) => state.launches);
  const captures = useSimUi((state) => state.captures);
  const closeCalls = useSimUi((state) => state.closeCalls);
  const merges = useSimUi((state) => state.merges);
  const slingshots = useSimUi((state) => state.slingshots);
  const blackHoles = useSimUi((state) => state.blackHoles);
  const wormholes = useSimUi((state) => state.wormholes);
  const fragments = useSimUi((state) => state.fragments);
  const novaPulses = useSimUi((state) => state.novaPulses);
  const sound = useSimUi((state) => state.sound);
  const shake = useSimUi((state) => state.shake);
  const seed = useSimUi((state) => state.seed);
  const worldTime = useSimUi((state) => state.worldTime);
  const rewindSeconds = useSimUi((state) => state.rewindSeconds);
  const bodies = useSimUi((state) => state.bodies);
  const timeline = useSimUi((state) => state.timeline);
  const activeContractId = useSimUi((state) => state.activeContractId);
  const contractStatus = useSimUi((state) => state.contractStatus);
  const contractProgress = useSimUi((state) => state.contractProgress);
  const completedContracts = useSimUi((state) => state.completedContracts);
  const rewindsUsed = useSimUi((state) => state.rewindsUsed);
  const efficiencyScore = useSimUi((state) => state.efficiencyScore);
  const stabilityScore = useSimUi((state) => state.stabilityScore);
  const rarityScore = useSimUi((state) => state.rarityScore);
  const styleScore = useSimUi((state) => state.styleScore);
  const toggleSound = useSimUi((state) => state.toggleSound);
  const toggleShake = useSimUi((state) => state.toggleShake);
  const abandonContract = useSimUi((state) => state.abandonContract);
  const resetFieldNotes = useSimUi((state) => state.resetFieldNotes);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-30 transition-[background-color] duration-150",
        open && "pointer-events-auto bg-bg/35",
      )}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        aria-label="Close observatory log"
        className={cn("absolute inset-0", !open && "hidden")}
        onClick={() => setOpen(false)}
      />
      <aside
        aria-label="Observatory log"
        className={cn(
          "absolute inset-x-3 inset-y-3 flex flex-col overflow-hidden rounded-2xl bg-surface shadow-panel transition-[transform,opacity] duration-250 ease-out sm:inset-y-5 sm:left-auto sm:right-5 sm:w-[30rem]",
          open ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        )}
      >
        <div className="border-b border-border px-5 pb-0 pt-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Apsis: Strange Orbits</p>
              <h2 className="mt-1 font-display text-3xl italic leading-none">Observatory log</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="icon-button" aria-label="Close observatory log">
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-4 flex gap-5" role="tablist" aria-label="Observatory sections">
            <TabButton selected={tab === "contracts"} onClick={() => setTab("contracts")}>Contracts</TabButton>
            <TabButton selected={tab === "archive"} onClick={() => setTab("archive")}>Archive</TabButton>
            <TabButton selected={tab === "timeline"} onClick={() => setTab("timeline")}>Timeline</TabButton>
          </div>
        </div>

        <div className="lab-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {tab === "contracts" && (
            <ContractsTab
              apiRef={apiRef}
              activeId={activeContractId}
              status={contractStatus}
              progress={contractProgress}
              completed={completedContracts}
              rewindsUsed={rewindsUsed}
              onAbandon={abandonContract}
            />
          )}

          {tab === "archive" && (
            <>
              <section className="grid grid-cols-2 gap-2">
                <Stat label="Session score" value={formatScore(score)} />
                <Stat label="Personal best" value={formatScore(bestScore)} />
              </section>

              <section className="mt-5 rounded-xl border border-border bg-surface-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">Score signature</p>
                  <span className="font-mono text-xs tabular-nums text-muted">4 vectors</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  <ScoreLine label="Efficiency" value={efficiencyScore} total={score} />
                  <ScoreLine label="Stability" value={stabilityScore} total={score} />
                  <ScoreLine label="Rarity" value={rarityScore} total={score} />
                  <ScoreLine label="Style" value={styleScore} total={score} />
                </div>
              </section>

              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <p className="eyebrow">Named bodies</p>
                  <span className="font-mono text-xs tabular-nums text-muted">{bodies.length} catalogued</span>
                </div>
                <div className="space-y-2">
                  {bodies.slice(0, 10).map((body) => <BodyRecord key={body.id} body={body} />)}
                  {bodies.length === 0 && (
                    <p className="rounded-xl border border-border px-4 py-5 text-sm text-muted">The field is empty. Launch a body to begin its history.</p>
                  )}
                </div>
              </section>

              <section className="mt-6">
                <p className="eyebrow mb-3">Experiment log</p>
                <div className="grid grid-cols-2 gap-2">
                  <MiniStat icon={<Sparkles className="size-4" />} label="Launches" value={launches} />
                  <MiniStat icon={<Orbit className="size-4" />} label="Captures" value={captures} />
                  <MiniStat icon={<Waves className="size-4" />} label="Assists" value={slingshots} />
                  <MiniStat icon={<Circle className="size-4" />} label="Mergers" value={merges} />
                  <MiniStat icon={<Gauge className="size-4" />} label="Close shaves" value={closeCalls} />
                  <MiniStat icon={<Circle className="size-4 fill-current" />} label="Singularities" value={blackHoles} />
                  <MiniStat icon={<History className="size-4" />} label="Gate transits" value={wormholes} />
                  <MiniStat icon={<Award className="size-4" />} label="Fragments / novas" value={fragments + novaPulses} />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted">{totalDiscoveries} discoveries recorded on this device.</p>
              </section>

              <section className="mt-6 rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow">Experiment seed</p>
                    <p className="mt-2 truncate font-mono text-sm text-fg">{seed}</p>
                  </div>
                  <button type="button" className="secondary-button" onClick={() => apiRef.current?.share()}>
                    <Share2 className="size-4" /> Share
                  </button>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted">The link includes this seed and every launch or anomaly placement as a compact deterministic replay.</p>
              </section>

              <section className="mt-6">
                <p className="eyebrow mb-3">Comfort</p>
                <div className="flex gap-2">
                  <SettingButton pressed={sound} onClick={toggleSound} label="Sound">
                    {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                  </SettingButton>
                  <SettingButton pressed={shake} onClick={toggleShake} label="Impact shake">
                    <Waves className="size-4" />
                  </SettingButton>
                </div>
              </section>
            </>
          )}

          {tab === "timeline" && (
            <>
              <section className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">Temporal recorder</p>
                    <p className="mt-2 text-sm leading-relaxed text-fg">Up to eight simulated seconds remain reversible. Rewind pauses at the restored instant; replay runs it at half speed.</p>
                  </div>
                  <span className="font-mono text-sm tabular-nums text-fg">{rewindSeconds.toFixed(1)}s</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" className="secondary-button" onClick={() => apiRef.current?.rewind()}>
                    <RotateCcw className="size-4" /> Rewind
                  </button>
                  <button type="button" className="secondary-button" onClick={() => apiRef.current?.replay()}>
                    <Play className="size-4" /> Replay
                  </button>
                </div>
              </section>

              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <p className="eyebrow">Post-experiment timeline</p>
                  <span className="font-mono text-xs tabular-nums text-muted">T+{formatSimTime(worldTime)}</span>
                </div>
                <ol className="space-y-0 border-l border-border pl-4">
                  {[...timeline].reverse().map((event) => (
                    <li key={event.id} className="relative pb-5 pl-3">
                      <span className="absolute -left-[1.19rem] top-1.5 size-2 rounded-full border border-accent bg-surface" />
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium text-fg">{event.title}</p>
                        <time className="shrink-0 font-mono text-[0.68rem] tabular-nums text-muted">{formatSimTime(event.time)}</time>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{event.detail}</p>
                    </li>
                  ))}
                  {timeline.length === 0 && <li className="pb-4 text-sm text-muted">No events have been recorded.</li>}
                </ol>
              </section>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border p-4">
          <button type="button" onClick={resetFieldNotes} className="secondary-button flex-1">
            <RotateCcw className="size-4" /> Fresh session
          </button>
          <button type="button" onClick={() => apiRef.current?.share()} className="icon-button" aria-label="Copy shareable experiment" title="Copy shareable experiment">
            <Copy className="size-4" />
          </button>
        </div>
      </aside>
    </div>
  );
}

function ContractsTab({
  apiRef,
  activeId,
  status,
  progress,
  completed,
  rewindsUsed,
  onAbandon,
}: {
  apiRef: MutableRefObject<SimApi | null>;
  activeId: (typeof CONTRACTS)[number]["id"] | null;
  status: "idle" | "active" | "complete" | "failed";
  progress: number;
  completed: (typeof CONTRACTS)[number]["id"][];
  rewindsUsed: number;
  onAbandon: () => void;
}) {
  const active = contractById(activeId);
  return (
    <>
      <section className="grid grid-cols-2 gap-2">
        <Stat label="Contracts complete" value={`${completed.length} / ${CONTRACTS.length}`} />
        <Stat label="Rank" value={rankFor(completed.length)} />
      </section>

      {active && (
        <section className={cn("mt-5 rounded-xl border p-4", status === "failed" ? "border-danger/50 bg-danger/5" : "border-border bg-surface-2")}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Active contract · {active.number}</p>
              <h3 className="mt-2 text-base font-semibold text-fg">{active.title}</h3>
            </div>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">{status}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">{active.objective}</p>
          <progress className="mission-progress mt-4" value={progress} max={active.target} />
          <div className="mt-2 flex items-center justify-between font-mono text-xs tabular-nums text-muted">
            <span>{formatProgress(active.metric, progress)} / {formatProgress(active.metric, active.target)}</span>
            <span>Rewinds {Math.max(0, 2 - rewindsUsed)} / 2</span>
          </div>
          {(status === "failed" || status === "complete") && (
            <button type="button" className="secondary-button mt-4 w-full" onClick={onAbandon}>Close contract</button>
          )}
        </section>
      )}

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Contract board</p>
          <span className="text-xs text-muted">Optional field work</span>
        </div>
        <div className="space-y-2">
          {CONTRACTS.map((contract) => {
            const done = completed.includes(contract.id);
            const isActive = activeId === contract.id;
            return (
              <article key={contract.id} className={cn("rounded-xl border border-border p-4", isActive ? "bg-surface-2" : "bg-transparent")}>
                <div className="flex gap-3">
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border font-mono text-xs", done ? "border-accent bg-accent text-bg" : "border-border text-muted")}>
                    {done ? <Check className="size-4" /> : contract.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-fg">{contract.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{contract.brief}</p>
                      </div>
                      <span className="shrink-0 text-[0.68rem] text-muted">{contract.difficulty}</span>
                    </div>
                    <div className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs leading-relaxed text-fg">{contract.objective}</div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="truncate text-xs text-muted"><Trophy className="mr-1 inline size-3" />{contract.reward}</span>
                      <button
                        type="button"
                        className="contract-start"
                        disabled={isActive && status === "active"}
                        onClick={() => apiRef.current?.startContract(contract.id)}
                      >
                        {isActive && status === "active" ? "Running" : done ? "Run again" : "Start"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function BodyRecord({ body }: { body: BodySummary }) {
  const detail = body.distinctions.at(-1) ?? (body.orbitCount > 0 ? `${body.orbitCount} recorded orbits` : "No distinctions yet");
  return (
    <article className="rounded-xl border border-border px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-fg">{body.name}</h3>
          <p className="mt-1 truncate text-xs text-muted">{detail}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-xs tabular-nums text-fg">{Math.round(body.mass)} m</p>
          <p className="mt-1 text-[0.68rem] capitalize text-muted">{body.style.replace(/([A-Z])/g, " $1")} · {body.orbitCount} yr · {body.mergeCount} merges</p>
        </div>
      </div>
    </article>
  );
}

function TabButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={selected} onClick={onClick} className={cn("log-tab", selected && "log-tab-active")}>
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg tabular-nums tracking-tight text-fg">{value}</p>
    </div>
  );
}

function ScoreLine({ label, value, total }: { label: string; value: number; total: number }) {
  const amount = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono tabular-nums text-fg">{Math.round(value)}</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-bg">
        <div className="h-full rounded-full bg-accent" style={{ width: `${amount}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 text-muted">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs">{label}</p>
        <p className="font-mono text-sm tabular-nums text-fg">{value}</p>
      </div>
    </div>
  );
}

function SettingButton({ pressed, onClick, label, children }: { pressed: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={cn("secondary-button flex-1", pressed && "bg-accent text-bg hover:bg-accent")}>
      {children}{label}
    </button>
  );
}

function formatProgress(metric: string, value: number) {
  return metric === "time" ? `${Math.floor(value)}s` : Math.floor(value).toString();
}

function formatScore(value: number) {
  return Math.round(value).toString().padStart(6, "0");
}

function formatSimTime(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function rankFor(completed: number) {
  if (completed >= 12) return "Apsis master";
  if (completed >= 8) return "Anomaly lead";
  if (completed >= 4) return "Deep-field";
  return "Observer";
}
