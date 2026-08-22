import { create } from "zustand";
import type { MassId } from "./types";

type SimUi = {
  massId: MassId;
  timeScale: number;
  trails: boolean;
  fieldWorlds: boolean;
  fieldHoles: boolean;
  paused: boolean;
  follow: boolean;
  bodyCount: number;
  setMassId: (id: MassId) => void;
  setTimeScale: (n: number) => void;
  toggleTrails: () => void;
  toggleFieldWorlds: () => void;
  toggleFieldHoles: () => void;
  togglePaused: () => void;
  toggleFollow: () => void;
  setPaused: (v: boolean) => void;
  setBodyCount: (n: number) => void;
};

export const useSimUi = create<SimUi>((set) => ({
  massId: "planet",
  timeScale: 1,
  trails: true,
  fieldWorlds: true,
  fieldHoles: true,
  paused: false,
  follow: false,
  bodyCount: 5,
  setMassId: (id) => set({ massId: id }),
  setTimeScale: (n) => set({ timeScale: n }),
  toggleTrails: () => set((s) => ({ trails: !s.trails })),
  toggleFieldWorlds: () => set((s) => ({ fieldWorlds: !s.fieldWorlds })),
  toggleFieldHoles: () => set((s) => ({ fieldHoles: !s.fieldHoles })),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  toggleFollow: () => set((s) => ({ follow: !s.follow })),
  setPaused: (v) => set({ paused: v }),
  setBodyCount: (n) => set({ bodyCount: n }),
}));