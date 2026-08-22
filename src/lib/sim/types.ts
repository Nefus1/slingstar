export type MassId =
  | "dust"
  | "moon"
  | "planet"
  | "giant"
  | "star"
  | "redGiant"
  | "blackHole"
  | "smbh";

export type BodyKind = "rock" | "star" | "redGiant" | "blackHole" | "smbh";

export type SceneId = "helios" | "binary" | "figure8" | "slingshot" | "empty";

export type MassPreset = {
  id: MassId;
  label: string;
  mass: number;
  color: string;
  hint: string;
  kind: BodyKind;
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
  trail: Float32Array;
  trailHead: number;
  trailLen: number;
  glow: number;
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

export type World = {
  bodies: Body[];
  bursts: Burst[];
  sparks: Spark[];
  G: number;
  nextId: number;
  softening: number;
};

export const TRAIL_CAP = 220;

export const MASS_PRESETS: readonly MassPreset[] = [
  { id: "dust", label: "Dust", mass: 2.4, color: "#b4aea6", hint: "Speck", kind: "rock" },
  { id: "moon", label: "Moon", mass: 9, color: "#8d9a86", hint: "Small", kind: "rock" },
  { id: "planet", label: "Planet", mass: 24, color: "#c17a5a", hint: "World", kind: "rock" },
  { id: "giant", label: "Giant", mass: 78, color: "#7e96b2", hint: "Gas", kind: "rock" },
  { id: "star", label: "Star", mass: 540, color: "#f0e2b6", hint: "Anchor", kind: "star" },
  { id: "redGiant", label: "Red giant", mass: 1800, color: "#e07040", hint: "Bloated", kind: "redGiant" },
  { id: "blackHole", label: "Black hole", mass: 6200, color: "#d4a078", hint: "Horizon", kind: "blackHole" },
  { id: "smbh", label: "Supermassive", mass: 26000, color: "#cfc6b8", hint: "Well", kind: "smbh" },
] as const;

export const SCENES: { id: SceneId; label: string }[] = [
  { id: "helios", label: "Helios" },
  { id: "binary", label: "Binary" },
  { id: "figure8", label: "Figure-8" },
  { id: "slingshot", label: "Slingshot" },
  { id: "empty", label: "Empty" },
];
