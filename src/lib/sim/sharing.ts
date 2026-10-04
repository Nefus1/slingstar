import type { ExperimentAction, SceneId } from "./types";

export type SharedExperiment = {
  v: 1;
  seed: string;
  scene: SceneId;
  actions: ExperimentAction[];
};

export function encodeExperiment(experiment: SharedExperiment): string {
  const json = JSON.stringify(experiment);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeExperiment(value: string): SharedExperiment | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<SharedExperiment>;
    if (parsed.v !== 1 || typeof parsed.seed !== "string" || !Array.isArray(parsed.actions)) return null;
    const scenes: SceneId[] = [
      "helios",
      "binary",
      "figure8",
      "slingshot",
      "horizon",
      "mayhem",
      "remix",
      "galaxy",
      "milkyway",
      "accretion",
      "cometStorm",
      "gargantua",
      "empty",
    ];
    if (!scenes.includes(parsed.scene as SceneId)) return null;
    return parsed as SharedExperiment;
  } catch {
    return null;
  }
}
