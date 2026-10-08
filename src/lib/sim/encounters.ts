import type { EncounterKind } from "./types";

export const ENCOUNTERS: readonly {
  id: EncounterKind;
  label: string;
  description: string;
  duration: number;
}[] = [
  {
    id: "comets",
    label: "Comet train",
    description:
      "Five icy visitors sweep through the inner system. Bend their paths or catch one in orbit.",
    duration: 24,
  },
  {
    id: "rogue",
    label: "Rogue planet",
    description: "A wandering giant crosses the planetary lanes. Protect the system from its pull.",
    duration: 28,
  },
  {
    id: "stellar",
    label: "Stellar flyby",
    description:
      "A passing star tugs at the outer worlds. Use your instruments to preserve their dance.",
    duration: 32,
  },
];
