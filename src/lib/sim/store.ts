import { fieldGoals } from "./challenges";
import { create } from "zustand";
import { contractById, type ContractId, type ContractMetric } from "./contracts";
import { discoveryTone, setAudioEnabled } from "./audio";
import { loadProfile, saveProfile } from "./progress";
import type { BodyKind, BodySummary, InstrumentId, MassId, SceneId, TimelineEvent } from "./types";

export type DiscoveryKind =
  | "capture"
  | "closeCall"
  | "collision"
  | "slingshot"
  | "singularity"
  | "system"
  | "wormhole"
  | "fragment"
  | "nova"
  | "orbit";

export type DiscoveryToast = {
  id: number;
  createdAt: number;
  title: string;
  detail: string;
  points: number;
  streak: number;
};

type ScoreCategory = "efficiency" | "stability" | "rarity" | "style";

const DISCOVERIES: Record<
  DiscoveryKind,
  { title: string; points: number; category: ScoreCategory }
> = {
  capture: { title: "Orbit captured", points: 260, category: "efficiency" },
  closeCall: { title: "Close shave", points: 180, category: "style" },
  collision: { title: "Worlds merged", points: 140, category: "style" },
  slingshot: { title: "Gravity assist", points: 320, category: "efficiency" },
  singularity: { title: "Singularity deployed", points: 420, category: "rarity" },
  system: { title: "Living system", points: 500, category: "stability" },
  wormhole: { title: "Fold-space transit", points: 460, category: "rarity" },
  fragment: { title: "Body fragmented", points: 380, category: "style" },
  nova: { title: "Nova pulse", points: 240, category: "rarity" },
  orbit: { title: "Orbital year", points: 210, category: "stability" },
};

type ContractStatus = "idle" | "active" | "complete" | "failed";

type WorldTelemetry = {
  bodyCount: number;
  worldTime: number;
  seed: string;
  rewindSeconds: number;
  bodies: BodySummary[];
  timeline: TimelineEvent[];
  phenomenonCount: number;
  galaxyStars: number;
  galaxyFormation: number;
};

type SimUi = {
  massId: MassId;
  instrument: InstrumentId;
  sceneId: SceneId;
  seed: string;
  timeScale: number;
  trails: boolean;
  fieldWorlds: boolean;
  fieldHoles: boolean;
  paused: boolean;
  follow: boolean;
  bodyCount: number;
  worldTime: number;
  rewindSeconds: number;
  bodies: BodySummary[];
  timeline: TimelineEvent[];
  phenomenonCount: number;
  galaxyStars: number;
  galaxyFormation: number;
  multiMassIds: MassId[];
  multiLaunch: boolean;
  reportOpen: boolean;
  hudHidden: boolean;
  sound: boolean;
  shake: boolean;
  challengingTasks: boolean;
  notifiedDiscoveries: string[];
  lastNotificationAt: number;
  hydrated: boolean;
  score: number;
  bestScore: number;
  efficiencyScore: number;
  stabilityScore: number;
  rarityScore: number;
  styleScore: number;
  streak: number;
  launches: number;
  captures: number;
  closeCalls: number;
  merges: number;
  slingshots: number;
  blackHoles: number;
  wormholes: number;
  fragments: number;
  novaPulses: number;
  orbits: number;
  totalDiscoveries: number;
  objectivesComplete: boolean;
  systemMilestone: boolean;
  lastEventAt: number;
  lastDiscovery: DiscoveryToast | null;
  activeContractId: ContractId | null;
  contractStatus: ContractStatus;
  contractProgress: number;
  contractStartedAt: number;
  completedContracts: ContractId[];
  rewindsUsed: number;
  setMassId: (id: MassId) => void;
  toggleMultiMassId: (id: MassId) => void;
  toggleMultiLaunch: () => void;
  setInstrument: (id: InstrumentId) => void;
  setScene: (id: SceneId, seed: string) => void;
  setTimeScale: (n: number) => void;
  toggleTrails: () => void;
  toggleFieldWorlds: () => void;
  toggleFieldHoles: () => void;
  togglePaused: () => void;
  toggleFollow: () => void;
  setPaused: (v: boolean) => void;
  setBodyCount: (n: number) => void;
  syncWorld: (telemetry: WorldTelemetry) => void;
  setReportOpen: (open: boolean) => void;
  toggleHud: () => void;
  toggleSound: () => void;
  toggleShake: () => void;
  toggleChallengingTasks: () => void;
  hydrateProfile: () => void;
  recordLaunch: (kind: BodyKind) => void;
  recordDiscovery: (kind: DiscoveryKind, detail: string) => void;
  markSystemMilestone: () => void;
  announce: (title: string, detail: string) => void;
  activateContract: (id: ContractId, worldTime: number) => void;
  abandonContract: () => void;
  consumeRewind: () => boolean;
  resetFieldNotes: () => void;
};

const freshSession = {
  score: 0,
  efficiencyScore: 0,
  stabilityScore: 0,
  rarityScore: 0,
  styleScore: 0,
  streak: 1,
  launches: 0,
  captures: 0,
  closeCalls: 0,
  merges: 0,
  slingshots: 0,
  blackHoles: 0,
  wormholes: 0,
  fragments: 0,
  novaPulses: 0,
  orbits: 0,
  objectivesComplete: false,
  systemMilestone: false,
  lastEventAt: 0,
  lastDiscovery: null,
};

function metricValue(state: SimUi, metric: ContractMetric) {
  switch (metric) {
    case "capture":
      return state.captures;
    case "closeCall":
      return state.closeCalls;
    case "collision":
      return state.merges;
    case "slingshot":
      return state.slingshots;
    case "singularity":
      return state.blackHoles;
    case "system":
      return state.systemMilestone ? 1 : 0;
    case "wormhole":
      return state.wormholes;
    case "fragment":
      return state.fragments;
    case "nova":
      return state.novaPulses;
    case "orbit":
      return state.orbits;
    case "bodyCount":
      return state.bodyCount;
    case "time":
      return Math.max(0, state.worldTime - state.contractStartedAt);
  }
}

export const useSimUi = create<SimUi>((set, get) => {
  const persist = () => {
    const state = get();
    saveProfile({
      bestScore: state.bestScore,
      totalDiscoveries: state.totalDiscoveries,
      sound: state.sound,
      shake: state.shake,
      challengingTasks: state.challengingTasks,
      notifiedDiscoveries: state.notifiedDiscoveries,
      completedContracts: state.completedContracts,
    });
  };

  const announce = (title: string, detail: string, points = 0, streak = 1) => {
    const current = get();
    set({
      lastNotificationAt: Date.now(),
      lastDiscovery: {
        id: (current.lastDiscovery?.id ?? 0) + 1,
        createdAt: Date.now(),
        title,
        detail,
        points,
        streak,
      },
    });
  };

  const evaluateContract = () => {
    const state = get();
    if (state.contractStatus !== "active") return;
    const contract = contractById(state.activeContractId);
    if (!contract) return;
    if (contract.launchLimit !== undefined && state.launches > contract.launchLimit) {
      set({ contractStatus: "failed" });
      announce("Contract expired", `Launch allowance exceeded for ${contract.title}.`);
      return;
    }
    if (contract.failOnMerge && state.merges > 0) {
      set({ contractStatus: "failed" });
      announce("Contract expired", "The protected system recorded a merger.");
      return;
    }
    const progress = Math.min(contract.target, metricValue(state, contract.metric));
    if (progress !== state.contractProgress) set({ contractProgress: progress });
    if (progress < contract.target) return;
    const completedContracts = state.completedContracts.includes(contract.id)
      ? state.completedContracts
      : [...state.completedContracts, contract.id];
    const firstCompletion = !state.completedContracts.includes(contract.id);
    const bonus = firstCompletion ? 1200 + completedContracts.length * 180 : 0;
    const score = state.score + bonus;
    set({
      contractStatus: "complete",
      contractProgress: contract.target,
      completedContracts,
      score,
      bestScore: Math.max(state.bestScore, score),
      stabilityScore: state.stabilityScore + bonus,
    });
    if (firstCompletion) {
      announce("Contract complete", `${contract.title} · ${contract.reward} calibrated.`, bonus, 1);
      discoveryTone(true);
    }
    persist();
  };

  const evaluateChallenges = () => {
    const state = get();
    if (!state.challengingTasks || state.objectivesComplete || state.activeContractId) return;
    if (!fieldGoals(state).every((goal) => goal.value >= goal.target)) return;
    const score = state.score + 1500;
    set({
      objectivesComplete: true,
      score,
      bestScore: Math.max(state.bestScore, score),
      stabilityScore: state.stabilityScore + 1500,
    });
    const id = `challenge:${state.sceneId}`;
    if (!state.notifiedDiscoveries.includes(id)) {
      set({ notifiedDiscoveries: [...state.notifiedDiscoveries, id] });
      announce("Challenge complete", "All three field objectives achieved.", 1500);
      discoveryTone(true);
    }
    persist();
  };

  return {
    massId: "planet",
    instrument: "launch",
    sceneId: "helios",
    seed: "APSIS-HELIOS",
    timeScale: 1,
    trails: true,
    fieldWorlds: true,
    fieldHoles: true,
    paused: false,
    follow: false,
    bodyCount: 5,
    worldTime: 0,
    rewindSeconds: 0,
    bodies: [],
    timeline: [],
    phenomenonCount: 0,
    galaxyStars: 0,
    galaxyFormation: 0,
    multiMassIds: ["ocean", "desert", "ice", "lava", "giant", "ringed"],
    multiLaunch: false,
    reportOpen: false,
    hudHidden: false,
    sound: true,
    shake: true,
    challengingTasks: true,
    notifiedDiscoveries: [],
    lastNotificationAt: 0,
    hydrated: false,
    bestScore: 0,
    totalDiscoveries: 0,
    activeContractId: null,
    contractStatus: "idle",
    contractProgress: 0,
    contractStartedAt: 0,
    completedContracts: [],
    rewindsUsed: 0,
    ...freshSession,
    setMassId: (id) => set({ massId: id, instrument: "launch", multiLaunch: false }),
    toggleMultiMassId: (id) =>
      set((state) => {
        const selected = state.multiMassIds.includes(id);
        if (selected && state.multiMassIds.length === 1) return state;
        return {
          multiMassIds: selected
            ? state.multiMassIds.filter((candidate) => candidate !== id)
            : [...state.multiMassIds, id],
        };
      }),
    toggleMultiLaunch: () =>
      set((state) => ({ multiLaunch: !state.multiLaunch, instrument: "launch" })),
    setInstrument: (id) => set({ instrument: id }),
    setScene: (id, seed) =>
      set({
        ...freshSession,
        sceneId: id,
        seed,
        activeContractId: null,
        contractStatus: "idle",
        contractProgress: 0,
        rewindsUsed: 0,
      }),
    setTimeScale: (n) => set({ timeScale: n }),
    toggleTrails: () => set((state) => ({ trails: !state.trails })),
    toggleFieldWorlds: () => set((state) => ({ fieldWorlds: !state.fieldWorlds })),
    toggleFieldHoles: () => set((state) => ({ fieldHoles: !state.fieldHoles })),
    togglePaused: () => set((state) => ({ paused: !state.paused })),
    toggleFollow: () => set((state) => ({ follow: !state.follow })),
    setPaused: (value) => set({ paused: value }),
    setBodyCount: (bodyCount) => {
      set({ bodyCount });
      evaluateContract();
    },
    syncWorld: (telemetry) => {
      set(telemetry);
      evaluateContract();
      evaluateChallenges();
    },
    setReportOpen: (reportOpen) => set({ reportOpen }),
    toggleHud: () => set((state) => ({ hudHidden: !state.hudHidden })),
    toggleSound: () => {
      const sound = !get().sound;
      set({ sound });
      setAudioEnabled(sound);
      persist();
    },
    toggleShake: () => {
      set((state) => ({ shake: !state.shake }));
      persist();
    },
    toggleChallengingTasks: () => {
      set((state) => ({ challengingTasks: !state.challengingTasks }));
      persist();
    },
    hydrateProfile: () => {
      if (get().hydrated) return;
      const profile = loadProfile();
      set({
        hydrated: true,
        bestScore: profile.bestScore,
        totalDiscoveries: profile.totalDiscoveries,
        sound: profile.sound,
        shake: profile.shake,
        challengingTasks: profile.challengingTasks,
        notifiedDiscoveries: profile.notifiedDiscoveries,
        completedContracts: profile.completedContracts,
      });
      setAudioEnabled(profile.sound);
    },
    recordLaunch: (kind) => {
      set((state) => ({
        launches: state.launches + 1,
        blackHoles:
          kind === "blackHole" || kind === "smbh" ? state.blackHoles + 1 : state.blackHoles,
      }));
      if (kind === "blackHole" || kind === "smbh") {
        get().recordDiscovery("singularity", "Space-time has entered the experiment.");
      } else {
        evaluateContract();
      }
    },
    recordDiscovery: (kind, detail) => {
      const config = DISCOVERIES[kind];
      const now = Date.now();
      const current = get();
      const streak = now - current.lastEventAt < 7000 ? Math.min(5, current.streak + 1) : 1;
      const captures = current.captures + (kind === "capture" ? 1 : 0);
      const closeCalls = current.closeCalls + (kind === "closeCall" ? 1 : 0);
      const merges = current.merges + (kind === "collision" ? 1 : 0);
      const slingshots = current.slingshots + (kind === "slingshot" ? 1 : 0);
      const wormholes = current.wormholes + (kind === "wormhole" ? 1 : 0);
      const fragments = current.fragments + (kind === "fragment" ? 1 : 0);
      const novaPulses = current.novaPulses + (kind === "nova" ? 1 : 0);
      const orbits = current.orbits + (kind === "orbit" ? 1 : 0);
      const notify =
        !current.notifiedDiscoveries.includes(kind) && now - current.lastNotificationAt >= 10000;
      const points = config.points * streak;
      const score = current.score + points;
      const categoryKey = `${config.category}Score` as
        "efficiencyScore" | "stabilityScore" | "rarityScore" | "styleScore";
      set({
        captures,
        closeCalls,
        merges,
        slingshots,
        wormholes,
        fragments,
        novaPulses,
        orbits,
        score,
        bestScore: Math.max(current.bestScore, score),
        [categoryKey]: current[categoryKey] + points,
        streak,
        lastEventAt: now,
        ...(notify
          ? {
              lastNotificationAt: now,
              notifiedDiscoveries: [...current.notifiedDiscoveries, kind],
              lastDiscovery: {
                id: (current.lastDiscovery?.id ?? 0) + 1,
                createdAt: now,
                title: config.title,
                detail,
                points,
                streak,
              },
            }
          : {}),
        totalDiscoveries: current.totalDiscoveries + 1,
      });
      if (notify && kind !== "collision" && kind !== "orbit") discoveryTone();
      evaluateContract();
      evaluateChallenges();
      persist();
    },
    markSystemMilestone: () => {
      if (get().systemMilestone || get().launches < 3) return;
      set({ systemMilestone: true });
      get().recordDiscovery("system", "Twelve bodies are sharing one sky.");
    },
    announce: (title, detail) => announce(title, detail),
    activateContract: (id, worldTime) => {
      set({
        ...freshSession,
        activeContractId: id,
        contractStatus: "active",
        contractProgress: 0,
        contractStartedAt: worldTime,
        rewindsUsed: 0,
        reportOpen: false,
        paused: false,
      });
      const contract = contractById(id);
      if (contract) announce(`Contract ${contract.number}`, contract.objective);
    },
    abandonContract: () =>
      set({
        activeContractId: null,
        contractStatus: "idle",
        contractProgress: 0,
        rewindsUsed: 0,
      }),
    consumeRewind: () => {
      const state = get();
      if (state.contractStatus === "active" && state.rewindsUsed >= 2) {
        announce("Rewind unavailable", "This contract allows two timeline revisions.");
        return false;
      }
      if (state.contractStatus === "active") set({ rewindsUsed: state.rewindsUsed + 1 });
      return true;
    },
    resetFieldNotes: () =>
      set({
        ...freshSession,
        activeContractId: null,
        contractStatus: "idle",
        contractProgress: 0,
        rewindsUsed: 0,
      }),
  };
});
