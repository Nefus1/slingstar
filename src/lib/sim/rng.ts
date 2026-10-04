export function hashSeed(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function createRng(seed: string | number) {
  let state = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nextRandom(target: { rngState: number }): number {
  target.rngState = (target.rngState + 0x6d2b79f5) >>> 0;
  let t = target.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomSeed(): string {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const value = crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
    return `APSIS-${value.toString(36).toUpperCase().slice(0, 6)}`;
  }
  return `APSIS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

const FIRST = [
  "Aster",
  "Brink",
  "Calder",
  "Dione",
  "Elara",
  "Fallow",
  "Galen",
  "Hesper",
  "Ilex",
  "Juno",
  "Kepler",
  "Lumen",
  "Morrow",
  "Nacre",
  "Orison",
  "Pavo",
  "Quill",
  "Rhea",
  "Sable",
  "Tern",
] as const;

const LAST = [
  "Arc",
  "Drift",
  "Fall",
  "Gate",
  "Haven",
  "Kite",
  "Light",
  "Minor",
  "Reach",
  "Vale",
  "Wake",
  "Ward",
] as const;

export function bodyName(seed: string, id: number, kind: string): string {
  if (kind === "smbh") return `Abyss ${roman(id)}`;
  if (kind === "blackHole") return `Morrow Well ${roman(id)}`;
  const rng = createRng(hashSeed(`${seed}:${id}:${kind}`));
  return `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`;
}

function roman(n: number) {
  const values: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let value = Math.max(1, ((n - 1) % 19) + 1);
  let out = "";
  for (const [amount, glyph] of values) {
    while (value >= amount) {
      out += glyph;
      value -= amount;
    }
  }
  return out;
}
