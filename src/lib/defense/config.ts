import type { EnemyConfig, EnemyType, TowerConfig, TowerType, WavePlan } from "./types";

export const ORBIT_RADII = [155, 255, 365] as const;
export const ORBIT_SLOTS = [8, 12, 16] as const;
export const ORBIT_SPEEDS = [0.075, -0.048, 0.032] as const;
export const ORBIT_FLATTEN = 0.74;

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  moon: {
    type: "moon",
    name: "Moon Battery",
    role: "Rapid kinetic fire",
    cost: 70,
    damage: 15,
    range: 305,
    fireRate: 1.55,
    projectileSpeed: 330,
    color: "#aeb6ae",
    radius: 14,
    splash: 0,
    slow: 0,
    push: 0,
  },
  ice: {
    type: "ice",
    name: "Cryo World",
    role: "Slows the first target",
    cost: 95,
    damage: 9,
    range: 318,
    fireRate: 0.82,
    projectileSpeed: 285,
    color: "#92c5da",
    radius: 17,
    splash: 0,
    slow: 0.52,
    push: 0,
  },
  lava: {
    type: "lava",
    name: "Magma Forge",
    role: "High-damage blast",
    cost: 125,
    damage: 28,
    range: 268,
    fireRate: 0.62,
    projectileSpeed: 250,
    color: "#dd7043",
    radius: 19,
    splash: 50,
    slow: 0,
    push: 0,
  },
  gas: {
    type: "gas",
    name: "Gravity Giant",
    role: "Pulls enemies backward",
    cost: 150,
    damage: 7,
    range: 365,
    fireRate: 0.7,
    projectileSpeed: 370,
    color: "#829bb5",
    radius: 23,
    splash: 0,
    slow: 0,
    push: 0.028,
  },
  ringed: {
    type: "ringed",
    name: "Ring Lance",
    role: "Long-range heavy shot",
    cost: 180,
    damage: 48,
    range: 430,
    fireRate: 0.46,
    projectileSpeed: 480,
    color: "#c3aa78",
    radius: 22,
    splash: 18,
    slow: 0,
    push: 0,
  },
};

export const TOWER_ORDER: TowerType[] = ["moon", "ice", "lava", "gas", "ringed"];

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  asteroid: {
    type: "asteroid",
    name: "Rubble",
    hp: 54,
    speed: 0.024,
    reward: 10,
    damage: 1,
    armor: 0,
    radius: 10,
    color: "#9b8a76",
  },
  comet: {
    type: "comet",
    name: "Comet",
    hp: 40,
    speed: 0.036,
    reward: 11,
    damage: 1,
    armor: 0,
    radius: 9,
    color: "#a8d4e5",
  },
  raider: {
    type: "raider",
    name: "Void Raider",
    hp: 82,
    speed: 0.031,
    reward: 15,
    damage: 2,
    armor: 0.08,
    radius: 11,
    color: "#bf8167",
  },
  armored: {
    type: "armored",
    name: "Iron Dreadnought",
    hp: 155,
    speed: 0.022,
    reward: 21,
    damage: 3,
    armor: 0.28,
    radius: 14,
    color: "#8f969e",
  },
  boss: {
    type: "boss",
    name: "Dread Comet",
    hp: 820,
    speed: 0.016,
    reward: 120,
    damage: 8,
    armor: 0.18,
    radius: 25,
    color: "#d07a52",
  },
};

export const WAVES: WavePlan[] = [
  {
    title: "Loose rubble",
    warning: "Slow asteroids entering two lanes.",
    groups: [{ type: "asteroid", count: 9, interval: 0.8 }],
  },
  {
    title: "Blue tails",
    warning: "Fast comets punish uncovered approaches.",
    groups: [{ type: "comet", count: 12, interval: 0.62 }],
  },
  {
    title: "Split vector",
    warning: "Rubble screens a faster comet formation.",
    groups: [
      { type: "asteroid", count: 9, interval: 0.58, gap: 1.4 },
      { type: "comet", count: 9, interval: 0.48 },
    ],
  },
  {
    title: "Iron procession",
    warning: "Armored hulls reduce incoming damage.",
    groups: [
      { type: "armored", count: 7, interval: 1.05, gap: 1.2 },
      { type: "comet", count: 8, interval: 0.55 },
    ],
  },
  {
    title: "The first dread",
    warning: "Boss signature detected behind a raider escort.",
    groups: [
      { type: "raider", count: 10, interval: 0.65, gap: 1.5 },
      { type: "boss", count: 1, interval: 1 },
    ],
  },
  {
    title: "Four-lane breach",
    warning: "Raiders and comets will use every approach.",
    groups: [
      { type: "raider", count: 14, interval: 0.46, gap: 0.8 },
      { type: "comet", count: 12, interval: 0.4 },
    ],
  },
  {
    title: "Cold iron",
    warning: "A dense armored wave needs focused upgrades.",
    groups: [
      { type: "armored", count: 12, interval: 0.72, gap: 1 },
      { type: "raider", count: 10, interval: 0.48 },
    ],
  },
  {
    title: "Periapsis rush",
    warning: "Fast targets arrive inside an armored screen.",
    groups: [
      { type: "comet", count: 20, interval: 0.3, gap: 0.8 },
      { type: "armored", count: 9, interval: 0.7 },
    ],
  },
  {
    title: "Twin catastrophes",
    warning: "Two dread signatures with a full escort.",
    groups: [
      { type: "boss", count: 2, interval: 3, gap: 0.8 },
      { type: "raider", count: 18, interval: 0.4 },
    ],
  },
  {
    title: "Extinction orbit",
    warning: "Everything the dark has left. Hold Asteria.",
    groups: [
      { type: "comet", count: 16, interval: 0.3, gap: 0.5 },
      { type: "armored", count: 13, interval: 0.52, gap: 0.6 },
      { type: "raider", count: 15, interval: 0.36, gap: 1.2 },
      { type: "boss", count: 1, interval: 1 },
    ],
  },
];

export function enemyTypesForWave(index: number) {
  const wave = WAVES[index];
  if (!wave) return [];
  return [...new Set(wave.groups.map((group) => group.type))];
}
