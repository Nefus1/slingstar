import { CONTRACTS, type ContractId } from "./contracts";

const STORAGE_KEY = "apsis:field-notes";
const SAVE_VERSION = 3;

export type SavedLabProfile = {
  version: number;
  bestScore: number;
  totalDiscoveries: number;
  sound: boolean;
  shake: boolean;
  challengingTasks: boolean;
  notifiedDiscoveries: string[];
  completedContracts: ContractId[];
};

export const DEFAULT_PROFILE: SavedLabProfile = {
  version: SAVE_VERSION,
  bestScore: 0,
  totalDiscoveries: 0,
  sound: true,
  shake: true,
  challengingTasks: true,
  notifiedDiscoveries: [],
  completedContracts: [],
};

export function loadProfile(): SavedLabProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<SavedLabProfile>;
    const validIds = new Set(CONTRACTS.map((contract) => contract.id));
    const completedContracts = Array.isArray(parsed.completedContracts)
      ? parsed.completedContracts.filter((id): id is ContractId => validIds.has(id as ContractId))
      : [];
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      bestScore: Math.max(0, Number(parsed.bestScore) || 0),
      totalDiscoveries: Math.max(0, Number(parsed.totalDiscoveries) || 0),
      completedContracts,
      challengingTasks:
        typeof parsed.challengingTasks === "boolean" ? parsed.challengingTasks : true,
      notifiedDiscoveries: Array.isArray(parsed.notifiedDiscoveries)
        ? parsed.notifiedDiscoveries.filter((id): id is string => typeof id === "string")
        : [],
      version: SAVE_VERSION,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: Omit<SavedLabProfile, "version">) {
  if (typeof window === "undefined") return;
  try {
    const next: SavedLabProfile = { version: SAVE_VERSION, ...profile };
    window.localStorage.setItem(
      `${STORAGE_KEY}:backup`,
      window.localStorage.getItem(STORAGE_KEY) ?? "",
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable in private or embedded browsing contexts.
  }
}
