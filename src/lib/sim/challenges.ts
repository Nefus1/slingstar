import type { BodySummary, SceneId } from "./types";
export type ChallengeState = {
  sceneId: SceneId;
  captures: number;
  closeCalls: number;
  slingshots: number;
  merges: number;
  orbits: number;
  wormholes: number;
  fragments: number;
  launches: number;
  worldTime: number;
  bodies: BodySummary[];
};
export type FieldGoal = { label: string; value: number; target: number };
const goal = (label: string, value: number, target: number): FieldGoal => ({
  label,
  value,
  target,
});
export function fieldGoals(s: ChallengeState): FieldGoal[] {
  const capture = goal("Capture two launched worlds", s.captures, 2);
  const orbit = goal("Complete three launched orbits", s.orbits, 3);
  const skim = goal("Survive two close flybys", s.closeCalls, 2);
  switch (s.sceneId) {
    case "milkyway":
      return [
        capture,
        orbit,
        goal(
          "Keep all eight planets for 45s",
          s.bodies.filter((b) =>
            [
              "Mercury",
              "Venus",
              "Earth",
              "Mars",
              "Jupiter",
              "Saturn",
              "Uranus",
              "Neptune",
            ].includes(b.name),
          ).length === 8 && s.launches > 0
            ? s.worldTime
            : 0,
          45,
        ),
      ];
    case "binary":
      return [
        capture,
        orbit,
        goal(
          "Add a body; keep the pair merger-free for 45s",
          s.merges === 0 && s.launches > 0 ? s.worldTime : 0,
          45,
        ),
      ];
    case "galaxy":
      return [capture, goal("Complete two wormhole transits", s.wormholes, 2), orbit];
    case "accretion":
      return [
        goal(
          "Grow two worlds to 30 mass units",
          s.bodies.filter((b) => b.kind === "rock" && b.mass >= 30).length,
          2,
        ),
        goal("Record eight mergers", s.merges, 8),
        capture,
      ];
    case "cometStorm":
      return [
        goal(
          "Protect Sahra, Pelagos and Crown for 60s",
          ["Sahra", "Pelagos", "Crown"].every((name) => s.bodies.some((b) => b.name === name))
            ? s.worldTime
            : 0,
          60,
        ),
        goal("Redirect visitors through wormholes twice", s.wormholes, 2),
        capture,
      ];
    case "gargantua":
    case "horizon":
      return [capture, skim, goal("Escape with a gravity assist", s.slingshots, 1)];
    case "slingshot":
      return [goal("Complete two gravity assists", s.slingshots, 2), skim, capture];
    case "mayhem":
      return [
        goal("Trigger two fragmentation events", s.fragments, 2),
        goal("Cause six mergers", s.merges, 6),
        capture,
      ];
    case "figure8":
      return [capture, goal("Complete five launched orbits", s.orbits, 5), skim];
    case "empty":
      return [goal("Launch at least six bodies", s.launches, 6), capture, orbit];
    default:
      return [capture, skim, orbit];
  }
}
