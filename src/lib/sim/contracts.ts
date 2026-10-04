import type { SceneId } from "./types";

export type ContractMetric =
  | "capture"
  | "closeCall"
  | "collision"
  | "slingshot"
  | "singularity"
  | "system"
  | "wormhole"
  | "fragment"
  | "nova"
  | "orbit"
  | "bodyCount"
  | "time";

export type ContractId =
  | "first-light"
  | "needle-threader"
  | "one-clean-hit"
  | "borrowed-speed"
  | "crowded-sky"
  | "chain-reaction"
  | "quiet-binary"
  | "event-maker"
  | "through-the-gate"
  | "break-pattern"
  | "aftershock"
  | "three-good-years";

export type Contract = {
  id: ContractId;
  number: string;
  title: string;
  brief: string;
  objective: string;
  metric: ContractMetric;
  target: number;
  scene: SceneId;
  launchLimit?: number;
  failOnMerge?: boolean;
  reward: string;
  difficulty: "Field" | "Deep field" | "Anomaly";
};

export const CONTRACTS: readonly Contract[] = [
  {
    id: "first-light",
    number: "01",
    title: "First light",
    brief: "The observatory wants one clean, bound orbit—nothing heroic yet.",
    objective: "Capture 1 orbit in no more than 2 launches.",
    metric: "capture",
    target: 1,
    scene: "helios",
    launchLimit: 2,
    reward: "Fine-vector reticle",
    difficulty: "Field",
  },
  {
    id: "needle-threader",
    number: "02",
    title: "Needle threader",
    brief: "Skim a host closely enough to alarm everyone, then leave intact.",
    objective: "Record 1 close shave in no more than 2 launches.",
    metric: "closeCall",
    target: 1,
    scene: "slingshot",
    launchLimit: 2,
    reward: "Periapsis recorder",
    difficulty: "Field",
  },
  {
    id: "one-clean-hit",
    number: "03",
    title: "One clean hit",
    brief: "No debris budget. Put a new world exactly where the old one will be.",
    objective: "Cause 1 merger with a single launch.",
    metric: "collision",
    target: 1,
    scene: "helios",
    launchLimit: 1,
    reward: "Impact chronograph",
    difficulty: "Field",
  },
  {
    id: "borrowed-speed",
    number: "04",
    title: "Borrowed speed",
    brief: "Return the probe with more velocity than you gave it.",
    objective: "Complete 1 gravity assist in no more than 2 launches.",
    metric: "slingshot",
    target: 1,
    scene: "slingshot",
    launchLimit: 2,
    reward: "Flyby Doppler array",
    difficulty: "Deep field",
  },
  {
    id: "crowded-sky",
    number: "05",
    title: "Crowded sky",
    brief: "Populate Helios without losing the shape of the system.",
    objective: "Reach 12 live bodies with no more than 8 launches.",
    metric: "bodyCount",
    target: 12,
    scene: "helios",
    launchLimit: 8,
    reward: "System census lens",
    difficulty: "Deep field",
  },
  {
    id: "chain-reaction",
    number: "06",
    title: "Chain reaction",
    brief: "Turn a crowded red-giant system into one very expensive domino run.",
    objective: "Record 3 mergers before the field settles.",
    metric: "collision",
    target: 3,
    scene: "mayhem",
    launchLimit: 4,
    reward: "Fragment spectrometer",
    difficulty: "Anomaly",
  },
  {
    id: "quiet-binary",
    number: "07",
    title: "Quiet binary",
    brief: "Observe the pair without becoming the reason it stops being a pair.",
    objective: "Keep the binary merger-free for 30 simulated seconds.",
    metric: "time",
    target: 30,
    scene: "binary",
    launchLimit: 1,
    failOnMerge: true,
    reward: "Stability index",
    difficulty: "Deep field",
  },
  {
    id: "event-maker",
    number: "08",
    title: "Event maker",
    brief: "Deploy a singularity into an empty field and give it company.",
    objective: "Create 1 singularity with a single launch.",
    metric: "singularity",
    target: 1,
    scene: "empty",
    launchLimit: 1,
    reward: "Horizon cartograph",
    difficulty: "Anomaly",
  },
  {
    id: "through-the-gate",
    number: "09",
    title: "Through the gate",
    brief: "Place a wormhole pair, then let a named body cross the fold.",
    objective: "Record 1 successful wormhole transit.",
    metric: "wormhole",
    target: 1,
    scene: "helios",
    launchLimit: 3,
    reward: "Fold-space instrument",
    difficulty: "Anomaly",
  },
  {
    id: "break-pattern",
    number: "10",
    title: "Break pattern",
    brief: "Prove collisions do not always end in a larger, tidier sphere.",
    objective: "Cause 1 high-energy fragmentation event.",
    metric: "fragment",
    target: 1,
    scene: "mayhem",
    launchLimit: 3,
    reward: "Debris lineage map",
    difficulty: "Anomaly",
  },
  {
    id: "aftershock",
    number: "11",
    title: "Aftershock",
    brief: "Use two nova pulses to reshape a system without touching it.",
    objective: "Deploy 2 supernova shockwaves.",
    metric: "nova",
    target: 2,
    scene: "mayhem",
    reward: "Supernova exciter",
    difficulty: "Anomaly",
  },
  {
    id: "three-good-years",
    number: "12",
    title: "Three good years",
    brief: "Make one named world survive long enough to earn a history.",
    objective: "Record 3 complete orbits in the Figure-8 field.",
    metric: "orbit",
    target: 3,
    scene: "figure8",
    launchLimit: 4,
    reward: "Apsis master seal",
    difficulty: "Anomaly",
  },
] as const;

export function contractById(id: ContractId | null) {
  return id ? CONTRACTS.find((contract) => contract.id === id) ?? null : null;
}
