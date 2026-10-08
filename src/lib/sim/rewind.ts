import {
  TRAIL_CAP,
  type Body,
  type GalaxySystem,
  type Phenomenon,
  type TimelineEvent,
  type World,
} from "./types";

type BodySnapshot = Omit<Body, "trail">;

export type WorldSnapshot = {
  encounter: World["encounter"];
  stormWave: number;
  nextEncounterAt: number;
  time: number;
  nextId: number;
  nextPhenomenonId: number;
  mergeSerial: number;
  phenomenonSerial: number;
  fragmentSerial: number;
  rngState: number;
  bodies: BodySnapshot[];
  phenomena: Phenomenon[];
  timeline: TimelineEvent[];
  actionsLength: number;
  galaxy: GalaxySystem | null;
};

export function captureSnapshot(world: World): WorldSnapshot {
  return {
    encounter: structuredClone(world.encounter),
    stormWave: world.stormWave,
    nextEncounterAt: world.nextEncounterAt,
    time: world.time,
    nextId: world.nextId,
    nextPhenomenonId: world.nextPhenomenonId,
    mergeSerial: world.mergeSerial,
    phenomenonSerial: world.phenomenonSerial,
    fragmentSerial: world.fragmentSerial,
    rngState: world.rngState,
    bodies: world.bodies.map(({ trail: _trail, ...body }) => ({
      ...body,
      distinctions: [...body.distinctions],
    })),
    phenomena: structuredClone(world.phenomena),
    timeline: structuredClone(world.timeline),
    actionsLength: world.actions.length,
    galaxy: structuredClone(world.galaxy),
  };
}

export function restoreSnapshot(world: World, snapshot: WorldSnapshot) {
  world.encounter = structuredClone(snapshot.encounter);
  world.stormWave = snapshot.stormWave;
  world.nextEncounterAt = snapshot.nextEncounterAt;
  world.time = snapshot.time;
  world.nextId = snapshot.nextId;
  world.nextPhenomenonId = snapshot.nextPhenomenonId;
  world.mergeSerial = snapshot.mergeSerial;
  world.lastMerge = null;
  world.phenomenonSerial = snapshot.phenomenonSerial;
  world.lastPhenomenon = null;
  world.pendingPhenomena.length = 0;
  world.fragmentSerial = snapshot.fragmentSerial;
  world.rngState = snapshot.rngState;
  world.phenomena = structuredClone(snapshot.phenomena);
  world.timeline = structuredClone(snapshot.timeline);
  world.actions.length = snapshot.actionsLength;
  world.galaxy = structuredClone(snapshot.galaxy);
  world.bursts.length = 0;
  world.sparks.length = 0;
  world.bodies = snapshot.bodies.map((body) => ({
    ...body,
    distinctions: [...body.distinctions],
    px: body.x,
    py: body.y,
    trail: new Float32Array(TRAIL_CAP * 2),
    trailHead: 0,
    trailLen: 0,
  }));
}
