export type MassId =
  | "dust"
  | "asteroid"
  | "comet"
  | "moon"
  | "planet"
  | "ocean"
  | "desert"
  | "ice"
  | "lava"
  | "giant"
  | "ringed"
  | "star"
  | "redGiant"
  | "blackHole"
  | "smbh";

export type BodyKind = "rock" | "star" | "redGiant" | "blackHole" | "smbh";

export type BodyStyle =
  | "dust"
  | "asteroid"
  | "comet"
  | "moon"
  | "terrestrial"
  | "ocean"
  | "desert"
  | "ice"
  | "lava"
  | "gas"
  | "ringed"
  | "star"
  | "redGiant"
  | "blackHole"
  | "gargantua";

export type InstrumentId = "launch" | "wormhole" | "nova" | "gravityWell";

export type SceneId =
  | "helios"
  | "binary"
  | "figure8"
  | "slingshot"
  | "horizon"
  | "mayhem"
  | "remix"
  | "galaxy"
  | "milkyway"
  | "accretion"
  | "cometStorm"
  | "gargantua"
  | "empty";

export type MassPreset = {
  id: MassId;
  label: string;
  mass: number;
  color: string;
  hint: string;
  kind: BodyKind;
  style: BodyStyle;
};

export type Body = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  px: number;
  py: number;
  mass: number;
  radius: number;
  color: string;
  kind: BodyKind;
  style: BodyStyle;
  trail: Float32Array;
  trailHead: number;
  trailLen: number;
  glow: number;
  name: string;
  bornAt: number;
  orbitCount: number;
  closeCalls: number;
  assists: number;
  mergeCount: number;
  distinctions: string[];
  wormholeCooldown: number;
  fragmentGeneration: number;
};

export type Burst = {
  x: number;
  y: number;
  life: number;
  color: string;
  maxR: number;
};

export type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

export type MergeEvent = {
  serial: number;
  x: number;
  y: number;
  totalMass: number;
  absorbedMass: number;
  kind: BodyKind;
  formedHorizon: boolean;
  survivorId: number;
  survivorName: string;
  absorbedName: string;
};

export type WormholePair = {
  kind: "wormhole";
  id: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  radius: number;
  phase: number;
  uses: number;
};

export type Shockwave = {
  kind: "shockwave";
  id: number;
  x: number;
  y: number;
  radius: number;
  previousRadius: number;
  maxRadius: number;
  speed: number;
  force: number;
  color: string;
  hitIds: number[];
};

export type GravityWell = {
  kind: "gravityWell";
  id: number;
  x: number;
  y: number;
  mass: number;
  radius: number;
  life: number;
  maxLife: number;
};

export type Phenomenon = WormholePair | Shockwave | GravityWell;

export type GalaxyStar = {
  radius: number;
  angle: number;
  speed: number;
  startX: number;
  startY: number;
  size: number;
  color: string;
  brightness: number;
  depth: number;
  phase: number;
};

export type GalaxyLabel = {
  x: number;
  y: number;
  title: string;
  detail: string;
  accent?: string;
};

export type GalaxySystem = {
  kind: "forge" | "milkyWay";
  label: string;
  stars: GalaxyStar[];
  formation: number;
  formationRate: number;
  arms: number;
  radius: number;
  coreRadius: number;
  barLength: number;
  barAngle: number;
  labels: GalaxyLabel[];
};

export type TimelineEventType =
  | "birth"
  | "orbit"
  | "closeCall"
  | "assist"
  | "merge"
  | "fragment"
  | "wormhole"
  | "nova"
  | "well"
  | "rewind"
  | "scene";

export type TimelineEvent = {
  id: number;
  time: number;
  type: TimelineEventType;
  title: string;
  detail: string;
  bodyIds: number[];
};

export type PhenomenonEvent = {
  serial: number;
  kind: "wormhole" | "fragment" | "nova" | "well";
  title: string;
  detail: string;
  bodyId?: number;
};

export type EncounterKind = "comets" | "rogue" | "stellar";
export type CosmicEncounter = {
  kind: EncounterKind;
  startedAt: number;
  endsAt: number;
  protectedIds: number[];
  visitorIds: number[];
  status: "active" | "intact" | "changed";
};

export type ExperimentAction =
  | {
      type: "launch";
      t: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      massId: MassId;
    }
  | { type: "wormhole"; t: number; ax: number; ay: number; bx: number; by: number }
  | { type: "nova"; t: number; x: number; y: number }
  | { type: "gravityWell"; t: number; x: number; y: number }
  | { type: "encounter"; t: number; kind: EncounterKind };

export type World = {
  scene: SceneId;
  encounter: CosmicEncounter | null;
  stormWave: number;
  nextEncounterAt: number;
  bodies: Body[];
  bursts: Burst[];
  sparks: Spark[];
  G: number;
  nextId: number;
  softening: number;
  time: number;
  mergeSerial: number;
  lastMerge: MergeEvent | null;
  seed: string;
  rngState: number;
  phenomena: Phenomenon[];
  nextPhenomenonId: number;
  phenomenonSerial: number;
  lastPhenomenon: PhenomenonEvent | null;
  pendingPhenomena: PhenomenonEvent[];
  fragmentSerial: number;
  timeline: TimelineEvent[];
  nextTimelineId: number;
  actions: ExperimentAction[];
  galaxy: GalaxySystem | null;
};

export type BodySummary = Pick<
  Body,
  | "id"
  | "name"
  | "mass"
  | "kind"
  | "style"
  | "orbitCount"
  | "closeCalls"
  | "assists"
  | "mergeCount"
  | "distinctions"
>;

export const TRAIL_CAP = 220;

export const MASS_PRESETS: readonly MassPreset[] = [
  { id: "dust", label: "Dust", mass: 2.4, color: "#b4aea6", hint: "Speck", kind: "rock", style: "dust" },
  { id: "asteroid", label: "Asteroid", mass: 5.5, color: "#9a8d7b", hint: "Rubble", kind: "rock", style: "asteroid" },
  { id: "comet", label: "Comet", mass: 7, color: "#b9ddec", hint: "Icy visitor", kind: "rock", style: "comet" },
  { id: "moon", label: "Moon", mass: 9, color: "#8d9a86", hint: "Small", kind: "rock", style: "moon" },
  { id: "planet", label: "Planet", mass: 24, color: "#c17a5a", hint: "Rocky world", kind: "rock", style: "terrestrial" },
  { id: "ocean", label: "Ocean", mass: 26, color: "#3984a8", hint: "Water world", kind: "rock", style: "ocean" },
  { id: "desert", label: "Desert", mass: 23, color: "#d49b5f", hint: "Dune world", kind: "rock", style: "desert" },
  { id: "ice", label: "Ice", mass: 21, color: "#9fc5d5", hint: "Frozen world", kind: "rock", style: "ice" },
  { id: "lava", label: "Lava", mass: 29, color: "#e25d32", hint: "Volcanic world", kind: "rock", style: "lava" },
  { id: "giant", label: "Gas giant", mass: 78, color: "#7e96b2", hint: "Striped giant", kind: "rock", style: "gas" },
  { id: "ringed", label: "Ringed", mass: 88, color: "#c1aa78", hint: "Ring world", kind: "rock", style: "ringed" },
  { id: "star", label: "Star", mass: 540, color: "#f0e2b6", hint: "Anchor", kind: "star", style: "star" },
  { id: "redGiant", label: "Red giant", mass: 1800, color: "#e07040", hint: "Bloated", kind: "redGiant", style: "redGiant" },
  { id: "blackHole", label: "Black hole", mass: 6200, color: "#d4a078", hint: "Horizon", kind: "blackHole", style: "blackHole" },
  { id: "smbh", label: "Supermassive", mass: 26000, color: "#cfc6b8", hint: "Deep well", kind: "smbh", style: "blackHole" },
] as const;

export const QUICK_MASS_IDS: readonly MassId[] = [
  "asteroid",
  "comet",
  "planet",
  "giant",
  "star",
  "redGiant",
  "blackHole",
  "smbh",
];

export const PLANET_CATALOG_IDS: readonly MassId[] = [
  "moon",
  "planet",
  "ocean",
  "desert",
  "ice",
  "lava",
  "giant",
  "ringed",
];

export const SCENES: { id: SceneId; label: string }[] = [
  { id: "helios", label: "Helios" },
  { id: "binary", label: "Binary" },
  { id: "figure8", label: "Figure-8" },
  { id: "slingshot", label: "Slingshot" },
  { id: "horizon", label: "Event horizon" },
  { id: "mayhem", label: "Mayhem" },
  { id: "remix", label: "Remix" },
  { id: "empty", label: "Empty" },
];

export const COSMIC_MODES: { id: SceneId; label: string; short: string }[] = [
  { id: "galaxy", label: "Galaxy Forge", short: "Form a living spiral" },
  { id: "milkyway", label: "Milky Way", short: "Explore the Sun and eight planets" },
  { id: "accretion", label: "Planet Forge", short: "Grow worlds from rubble" },
  { id: "cometStorm", label: "Comet Storm", short: "Survive the bombardment" },
  { id: "gargantua", label: "Gargantua", short: "Enter the photon ring" },
];
