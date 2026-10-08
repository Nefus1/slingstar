import {
  useEffect,
  useRef,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  addBody,
  barycenter,
  createWorld,
  clearWorld,
  FIXED_DT,
  lerpBody,
  predictPath,
  radiusFor,
  recordTimeline,
  spawnGravityWell,
  spawnShockwave,
  spawnWormhole,
  stepWorld,
  THROW_SCALE,
} from "@/lib/sim/physics";
import { loadScene, sceneFocus, SOLAR_PLANETS } from "@/lib/sim/presets";
import {
  drawArrow,
  drawBody,
  drawBursts,
  drawGravityFieldEnhanced,
  drawGalaxy,
  drawInstrumentPreview,
  drawLaunchReadout,
  drawPath,
  drawPhenomena,
  drawStars,
  drawTrails,
  makeStars,
} from "@/lib/sim/render";
import { collideTone, phenomenonTone, throwTone, unlockAudio } from "@/lib/sim/audio";
import { useSimUi } from "@/lib/sim/store";
import { contractById, type ContractId } from "@/lib/sim/contracts";
import { captureSnapshot, restoreSnapshot, type WorldSnapshot } from "@/lib/sim/rewind";
import { decodeExperiment, encodeExperiment } from "@/lib/sim/sharing";
import {
  MASS_PRESETS,
  type Body,
  type MassId,
  type ExperimentAction,
  type SceneId,
  type World,
} from "@/lib/sim/types";

export type SimApi = {
  clear: () => void;
  loadScene: (id: SceneId, seed?: string) => void;
  startContract: (id: ContractId) => void;
  recenter: () => void;
  undo: () => void;
  rewind: () => void;
  replay: () => void;
  share: () => void;
  reformGalaxy: () => void;
  zoom: (factor: number) => void;
};

type Camera = { x: number; y: number; scale: number };
type LaunchTracker = {
  id: number;
  hostId: number | null;
  bornAt: number;
  initialRelativeSpeed: number;
  lastDistance: number;
  minDistance: number;
  lastAngle: number;
  angleTravel: number;
  captured: boolean;
  closeCall: boolean;
  slingshot: boolean;
};

type OrbitHistoryTracker = {
  hostId: number;
  lastAngle: number;
  angleTravel: number;
};

const MIN_SCALE = 0.18;
const MAX_SCALE = 4.2;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function wrapAngle(n: number) {
  return Math.atan2(Math.sin(n), Math.cos(n));
}

function dominantHost(world: World, excludeId?: number): Body | null {
  let host: Body | null = null;
  for (const body of world.bodies) {
    if (body.id === excludeId) continue;
    if (!host || body.mass > host.mass) host = body;
  }
  return host;
}

function classifyAim(
  world: World,
  spec: { x: number; y: number; vx: number; vy: number; mass: number },
  pathLength: number,
) {
  if (pathLength < 70) return "INTERCEPT";
  const host = dominantHost(world);
  if (!host) return Math.hypot(spec.vx, spec.vy) < 22 ? "GENTLE DROP" : "FREE FLIGHT";
  const dx = spec.x - host.x;
  const dy = spec.y - host.y;
  const distance = Math.hypot(dx, dy) || 1;
  const rvx = spec.vx - host.vx;
  const rvy = spec.vy - host.vy;
  const energy = 0.5 * (rvx * rvx + rvy * rvy) - (world.G * (host.mass + spec.mass)) / distance;
  return energy < 0 ? "BOUND ARC" : "ESCAPE VECTOR";
}

function makeDefaultWorld() {
  const world = createWorld();
  loadScene(world, "helios");
  return world;
}

function preset() {
  const ui = useSimUi.getState();
  const id =
    ui.multiLaunch && ui.multiMassIds.length > 0
      ? ui.multiMassIds[ui.launches % ui.multiMassIds.length]!
      : ui.massId;
  return launchPreset(id, ui.sceneId);
}

function launchPreset(id: MassId, scene: SceneId) {
  const selected = MASS_PRESETS.find((p) => p.id === id) ?? MASS_PRESETS[4]!;
  if (scene !== "milkyway") return selected;
  // Small-body launches use the same solar mass scale as the named planets.
  const solarMasses: Partial<Record<typeof id, number>> = {
    dust: 1e-9,
    asteroid: 1e-8,
    comet: 1e-7,
    moon: 0.0000207,
    planet: 0.00168168,
    ocean: 0.00168168,
    desert: 0.001372,
    ice: 0.0244496,
    lava: 0.00018088,
    giant: 0.53452,
    ringed: 0.160048,
  };
  return { ...selected, mass: solarMasses[id] ?? selected.mass };
}

function solarDisplayRadius(body: Body, scale: number) {
  const pixels =
    body.name === "Sun"
      ? 9
      : body.style === "gas" || body.style === "ringed"
        ? 7
        : body.style === "ice"
          ? 5
          : 3.5;
  return Math.max(body.radius, pixels / scale);
}

function presetLabel(body: Body) {
  if (body.style === "comet") return "comet";
  if (body.style === "asteroid") return "asteroid";
  if (["ocean", "desert", "ice", "lava", "ringed"].includes(body.style))
    return `${body.style} world`;
  if (body.kind === "smbh") return "supermassive body";
  if (body.kind === "blackHole") return "black hole";
  if (body.kind === "redGiant") return "red giant";
  if (body.kind === "star") return "star";
  if (body.mass < 5) return "dust body";
  if (body.mass < 14) return "moon";
  if (body.mass > 55) return "giant";
  return "world";
}

export function OrbitCanvas({ apiRef }: { apiRef: MutableRefObject<SimApi | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef(makeDefaultWorld());
  const camRef = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const starsRef = useRef(makeStars());
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const modeRef = useRef<"none" | "fling" | "pan" | "pinch">("none");
  const flingRef = useRef<{ x: number; y: number; sx: number; sy: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const pathRef = useRef<{ x: number; y: number }[] | null>(null);
  const aimLabelRef = useRef("FREE FLIGHT");
  const wormholeAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const launchTrackersRef = useRef(new Map<number, LaunchTracker>());
  const orbitHistoryRef = useRef(new Map<number, OrbitHistoryTracker>());
  const undoIdsRef = useRef<number[]>([]);
  const snapshotsRef = useRef<WorldSnapshot[]>([]);
  const lastSnapshotTimeRef = useRef(0);
  const replayQueueRef = useRef<ExperimentAction[]>([]);
  const replayIndexRef = useRef(0);
  const currentSceneRef = useRef<SceneId>("helios");
  const traumaRef = useRef(0);
  const keysRef = useRef(new Set<string>());
  const lastMergeSerialRef = useRef(0);
  const lastPhenomenonSerialRef = useRef(0);
  const lastCollisionReportRef = useRef(-12000);
  const lastPhenomenonSoundRef = useRef(-8000);
  const lastTelemetryAtRef = useRef(0);
  const lastCount = useRef(0);

  function syncTelemetry(world: World) {
    const oldest = snapshotsRef.current[0];
    useSimUi.getState().syncWorld({
      bodyCount: world.bodies.length,
      worldTime: world.time,
      seed: world.seed,
      rewindSeconds: oldest ? Math.min(8, Math.max(0, world.time - oldest.time)) : 0,
      bodies: [...world.bodies]
        .sort((a, b) => b.mass - a.mass)
        .slice(0, 24)
        .map((body) => ({
          id: body.id,
          name: body.name,
          mass: body.mass,
          kind: body.kind,
          style: body.style,
          orbitCount: body.orbitCount,
          closeCalls: body.closeCalls,
          assists: body.assists,
          mergeCount: body.mergeCount,
          distinctions: [...body.distinctions],
        })),
      timeline: world.timeline.slice(-30),
      phenomenonCount: world.phenomena.length,
      galaxyStars: world.galaxy?.stars.length ?? 0,
      galaxyFormation: world.galaxy?.formation ?? 0,
    });
  }

  function resetTracking(world: World) {
    launchTrackersRef.current.clear();
    orbitHistoryRef.current.clear();
    undoIdsRef.current.length = 0;
    snapshotsRef.current = [captureSnapshot(world)];
    lastSnapshotTimeRef.current = world.time;
    lastMergeSerialRef.current = world.mergeSerial;
    lastPhenomenonSerialRef.current = world.phenomenonSerial;
    traumaRef.current = 0;
    wormholeAnchorRef.current = null;
    replayQueueRef.current = [];
    replayIndexRef.current = 0;
  }

  function fitCamera(world: World) {
    const next = sceneFocus(world);
    const canvas = canvasRef.current;
    if (canvas) {
      const top = canvas.clientWidth < 640 ? 164 : 112;
      const controlsTop =
        document.querySelector(".sandbox-controls")?.getBoundingClientRect().top ??
        canvas.clientHeight - 300;
      const playHeight = Math.max(200, controlsTop - top - 24);
      next.scale = clamp(
        next.scale * Math.min(1, (canvas.clientWidth - 32) / 560, playHeight / 560),
        MIN_SCALE,
        MAX_SCALE,
      );
      next.y += (canvas.clientHeight / 2 - top - playHeight / 2) / next.scale;
    }
    return next;
  }

  function resetRuntime(world: World, id: SceneId, seed?: string) {
    loadScene(world, id, seed);
    currentSceneRef.current = id;
    resetTracking(world);
    const next = fitCamera(world);
    camRef.current = { ...next };
    const ui = useSimUi.getState();
    ui.setScene(id, world.seed);
    ui.setInstrument("launch");
    ui.setBodyCount(world.bodies.length);
    lastCount.current = world.bodies.length;
    syncTelemetry(world);
  }

  function applyExperimentAction(world: World, action: ExperimentAction) {
    if (action.type === "launch") {
      const pset = launchPreset(action.massId, world.scene);
      const host = dominantHost(world);
      const body = addBody(world, {
        x: action.x,
        y: action.y,
        vx: action.vx,
        vy: action.vy,
        mass: pset.mass,
        color: pset.color,
        kind: pset.kind,
        style: pset.style,
      });
      if (body) {
        if (host) {
          const dx = body.x - host.x,
            dy = body.y - host.y;
          launchTrackersRef.current.set(body.id, {
            id: body.id,
            hostId: host.id,
            bornAt: world.time,
            initialRelativeSpeed: Math.hypot(body.vx - host.vx, body.vy - host.vy),
            lastDistance: Math.hypot(dx, dy),
            minDistance: Math.hypot(dx, dy),
            lastAngle: Math.atan2(dy, dx),
            angleTravel: 0,
            captured: false,
            closeCall: false,
            slingshot: false,
          });
        }
        useSimUi.getState().recordLaunch(pset.kind);
      }
    } else if (action.type === "wormhole") {
      spawnWormhole(world, action.ax, action.ay, action.bx, action.by);
    } else if (action.type === "nova") {
      spawnShockwave(world, action.x, action.y);
    } else {
      spawnGravityWell(world, action.x, action.y);
    }
  }

  function processReplayQueue(world: World) {
    while (replayIndexRef.current < replayQueueRef.current.length) {
      const action = replayQueueRef.current[replayIndexRef.current]!;
      if (action.t > world.time + FIXED_DT * 0.5) break;
      applyExperimentAction(world, action);
      replayIndexRef.current += 1;
    }
  }

  function restoreTimeline(world: World, replay: boolean) {
    const ui = useSimUi.getState();
    const snapshot = snapshotsRef.current[0];
    if (!snapshot || world.time - snapshot.time < 0.45) {
      ui.announce(
        "Timeline is still forming",
        "Run the experiment a little longer before rewinding.",
      );
      return;
    }
    if (!replay && !ui.consumeRewind()) return;
    const seconds = Math.min(8, world.time - snapshot.time);
    restoreSnapshot(world, snapshot);
    recordTimeline(
      world,
      "rewind",
      replay ? "Cinematic replay started" : "Timeline revised",
      `${seconds.toFixed(1)} simulated seconds restored.`,
    );
    snapshotsRef.current = [captureSnapshot(world)];
    lastSnapshotTimeRef.current = world.time;
    lastMergeSerialRef.current = world.mergeSerial;
    lastPhenomenonSerialRef.current = world.phenomenonSerial;
    launchTrackersRef.current.clear();
    orbitHistoryRef.current.clear();
    ui.setPaused(!replay);
    if (replay) ui.setTimeScale(0.5);
    phenomenonTone("rewind");
    ui.announce(
      replay ? "Cinematic replay" : "Timeline restored",
      replay
        ? "The last eight seconds are running at half speed."
        : "Adjust the launch, then resume time.",
    );
    syncTelemetry(world);
  }

  function inspectLaunches(world: World) {
    const ui = useSimUi.getState();
    for (const [id, tracker] of launchTrackersRef.current) {
      const body = world.bodies.find((candidate) => candidate.id === id);
      if (!body) {
        launchTrackersRef.current.delete(id);
        continue;
      }
      let host = world.bodies.find((candidate) => candidate.id === tracker.hostId) ?? null;
      if (!host || host.id === body.id) host = dominantHost(world, body.id);
      if (!host) continue;

      const dx = body.x - host.x;
      const dy = body.y - host.y;
      const distance = Math.hypot(dx, dy) || 1;
      const angle = Math.atan2(dy, dx);
      tracker.angleTravel += Math.abs(wrapAngle(angle - tracker.lastAngle));
      tracker.lastAngle = angle;
      tracker.minDistance = Math.min(tracker.minDistance, distance);
      const receding = distance > tracker.lastDistance + 0.35;
      const age = world.time - tracker.bornAt;
      const rvx = body.vx - host.vx;
      const rvy = body.vy - host.vy;
      const relativeSpeed = Math.hypot(rvx, rvy);
      const energy =
        0.5 * relativeSpeed * relativeSpeed - (world.G * (host.mass + body.mass)) / distance;
      const clearance = tracker.minDistance - host.radius - body.radius;

      if (!tracker.captured && age > 2 && tracker.angleTravel > Math.PI && energy < 0) {
        tracker.captured = true;
        if (!body.distinctions.includes("Captured orbit")) body.distinctions.push("Captured orbit");
        recordTimeline(
          world,
          "orbit",
          `${body.name} entered a bound arc`,
          `Captured by ${host.name} after ${age.toFixed(1)} simulated seconds.`,
          [body.id, host.id],
        );
        ui.recordDiscovery("capture", `A ${presetLabel(body)} settled around a heavier host.`);
      }
      if (
        !tracker.closeCall &&
        age > 0.35 &&
        clearance > 0 &&
        clearance < Math.max(22, host.radius * 2.1) &&
        receding &&
        distance > tracker.minDistance + 28
      ) {
        tracker.closeCall = true;
        body.closeCalls += 1;
        if (!body.distinctions.includes("Surface skimmer"))
          body.distinctions.push("Surface skimmer");
        recordTimeline(
          world,
          "closeCall",
          `${body.name} skimmed ${host.name}`,
          `Closest clearance: ${Math.round(clearance)} field units.`,
          [body.id, host.id],
        );
        ui.recordDiscovery("closeCall", `Cleared the surface by ${Math.round(clearance)} units.`);
      }
      if (
        !tracker.slingshot &&
        age > 0.7 &&
        tracker.minDistance < host.radius * 6 + body.radius &&
        receding &&
        distance > tracker.minDistance + 90 &&
        relativeSpeed > tracker.initialRelativeSpeed * 1.18 + 10
      ) {
        tracker.slingshot = true;
        body.assists += 1;
        if (!body.distinctions.includes("Gravity-assisted"))
          body.distinctions.push("Gravity-assisted");
        recordTimeline(
          world,
          "assist",
          `${body.name} borrowed speed`,
          `Exit velocity reached ${Math.round(relativeSpeed)} u/s around ${host.name}.`,
          [body.id, host.id],
        );
        ui.recordDiscovery(
          "slingshot",
          `Exit velocity climbed to ${Math.round(relativeSpeed)} u/s.`,
        );
      }
      tracker.lastDistance = distance;

      if (age > 14 && energy > 0 && distance > 2600) launchTrackersRef.current.delete(id);
    }
  }

  function inspectBodyHistories(world: World) {
    const ui = useSimUi.getState();
    const liveIds = new Set(world.bodies.map((body) => body.id));
    for (const id of orbitHistoryRef.current.keys()) {
      if (!liveIds.has(id)) orbitHistoryRef.current.delete(id);
    }
    for (const body of world.bodies) {
      const host = dominantHost(world, body.id);
      if (!host || host.mass <= body.mass * 1.05) continue;
      const angle = Math.atan2(body.y - host.y, body.x - host.x);
      const tracker = orbitHistoryRef.current.get(body.id);
      if (!tracker || tracker.hostId !== host.id) {
        orbitHistoryRef.current.set(body.id, { hostId: host.id, lastAngle: angle, angleTravel: 0 });
        continue;
      }
      tracker.angleTravel += Math.abs(wrapAngle(angle - tracker.lastAngle));
      tracker.lastAngle = angle;
      if (tracker.angleTravel < Math.PI * 2) continue;
      tracker.angleTravel -= Math.PI * 2;
      body.orbitCount += 1;
      if (body.orbitCount === 1 && !body.distinctions.includes("Completed one orbital year")) {
        body.distinctions.push("Completed one orbital year");
      }
      if (body.orbitCount === 5 && !body.distinctions.includes("Long-lived orbit")) {
        body.distinctions.push("Long-lived orbit");
      }
      recordTimeline(
        world,
        "orbit",
        `${body.name} completed orbit ${body.orbitCount}`,
        `A full revolution around ${host.name}.`,
        [body.id, host.id],
      );
      if (launchTrackersRef.current.has(body.id))
        ui.recordDiscovery(
          "orbit",
          `${body.name} completed a full revolution around ${host.name}.`,
        );
    }
  }

  useEffect(() => {
    const world = worldRef.current;
    if (world.bodies.length === 0) resetRuntime(world, "helios");
    else {
      const focus = fitCamera(world);
      camRef.current = { ...focus };
      resetTracking(world);
      useSimUi.getState().setScene("helios", world.seed);
      syncTelemetry(world);
      lastCount.current = world.bodies.length;
    }

    const api: SimApi = {
      clear() {
        clearWorld(world);
        currentSceneRef.current = "empty";
        recordTimeline(world, "scene", "Empty field opened", `Experiment seed ${world.seed}.`);
        resetTracking(world);
        const ui = useSimUi.getState();
        ui.abandonContract();
        ui.setScene("empty", world.seed);
        ui.setBodyCount(0);
        syncTelemetry(world);
      },
      loadScene(id, seed) {
        useSimUi.getState().abandonContract();
        resetRuntime(world, id, seed);
      },
      startContract(id) {
        const contract = contractById(id);
        if (!contract) return;
        resetRuntime(world, contract.scene);
        useSimUi.getState().activateContract(id, world.time);
      },
      zoom(factor) {
        camRef.current.scale = clamp(camRef.current.scale * factor, MIN_SCALE, MAX_SCALE);
      },
      recenter() {
        const next = fitCamera(world);
        camRef.current.x = next.x;
        camRef.current.y = next.y;
        camRef.current.scale = next.scale;
      },
      undo() {
        while (undoIdsRef.current.length > 0) {
          const id = undoIdsRef.current.pop()!;
          const index = world.bodies.findIndex((body) => body.id === id);
          if (index < 0) continue;
          world.bodies.splice(index, 1);
          launchTrackersRef.current.delete(id);
          for (let actionIndex = world.actions.length - 1; actionIndex >= 0; actionIndex--) {
            if (world.actions[actionIndex]?.type === "launch") {
              world.actions.splice(actionIndex, 1);
              break;
            }
          }
          lastCount.current = world.bodies.length;
          useSimUi.getState().setBodyCount(world.bodies.length);
          syncTelemetry(world);
          return;
        }
      },
      rewind() {
        restoreTimeline(world, false);
      },
      replay() {
        restoreTimeline(world, true);
      },
      share() {
        const code = encodeExperiment({
          v: 1,
          seed: world.seed,
          scene: currentSceneRef.current,
          actions: world.actions,
        });
        const url = `${window.location.origin}${window.location.pathname}?run=${code}`;
        void navigator.clipboard.writeText(url).then(
          () =>
            useSimUi
              .getState()
              .announce("Experiment copied", "The seed and launch timeline are ready to share."),
          () => useSimUi.getState().announce("Share link ready", url),
        );
      },
      reformGalaxy() {
        if (!world.galaxy) return;
        world.galaxy.formation = 0.035;
        recordTimeline(
          world,
          "scene",
          "Galactic formation restarted",
          "The stellar cloud is collapsing into its seeded spiral again.",
        );
        useSimUi.getState().setPaused(false);
        useSimUi
          .getState()
          .announce("Formation restarted", "Increase time to watch the arms condense faster.");
      },
    };
    apiRef.current = api;

    const params = new URLSearchParams(window.location.search);
    const shared = params.get("run");
    const decoded = shared ? decodeExperiment(shared) : null;
    if (decoded) {
      resetRuntime(world, decoded.scene, decoded.seed);
      world.actions = structuredClone(decoded.actions);
      replayQueueRef.current = structuredClone(decoded.actions);
      replayIndexRef.current = 0;
      useSimUi.getState().setTimeScale(0.5);
      useSimUi
        .getState()
        .announce(
          "Shared experiment",
          "Replaying its deterministic launch timeline at half speed.",
        );
    } else {
      const seed = params.get("seed");
      if (seed) resetRuntime(world, "remix", seed.slice(0, 48));
    }
    return () => {
      apiRef.current = null;
    };
    // The simulation API is intentionally installed once; its operations read mutable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let raf = 0;
    let acc = 0;
    let last = performance.now();
    let running = true;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const loop = (now: number) => {
      if (!running) return;
      const raw = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ui = useSimUi.getState();
      const world = worldRef.current;
      const cam = camRef.current;

      processReplayQueue(world);
      if (
        !ui.paused &&
        (world.bodies.length > 0 ||
          world.galaxy !== null ||
          world.phenomena.length > 0 ||
          replayIndexRef.current < replayQueueRef.current.length)
      ) {
        acc += raw * ui.timeScale;
        const cap = FIXED_DT * 14;
        if (acc > cap) acc = cap;
        while (acc >= FIXED_DT) {
          stepWorld(world, FIXED_DT);
          processReplayQueue(world);
          acc -= FIXED_DT;
        }
      } else {
        acc = 0;
      }

      if (world.mergeSerial !== lastMergeSerialRef.current && world.lastMerge) {
        const chained = world.mergeSerial - lastMergeSerialRef.current;
        const merge = world.lastMerge;
        lastMergeSerialRef.current = world.mergeSerial;
        const major =
          merge.formedHorizon ||
          merge.absorbedMass >= 250 ||
          (merge.absorbedMass >= 70 && merge.totalMass >= 140);
        if (major && now - lastCollisionReportRef.current >= 12000) {
          lastCollisionReportRef.current = now;
          traumaRef.current = merge.formedHorizon ? 0.9 : 0.6;
          collideTone(merge.totalMass);
        }
        // Count every merger; feedback pacing must not change challenge progress.
        for (let i = 0; i < chained; i++)
          ui.recordDiscovery(
            "collision",
            merge.formedHorizon
              ? "The merger formed a new event horizon."
              : `${merge.survivorName} absorbed ${merge.absorbedName}.`,
          );
      }

      if (world.phenomenonSerial !== lastPhenomenonSerialRef.current && world.lastPhenomenon) {
        lastPhenomenonSerialRef.current = world.phenomenonSerial;
        for (const event of world.pendingPhenomena.splice(0)) {
          if (event.kind !== "well") {
            if (event.kind === "nova" && now - lastCollisionReportRef.current >= 12000) {
              traumaRef.current = 0.7;
              lastCollisionReportRef.current = now;
            }
            if (now - lastPhenomenonSoundRef.current >= 8000) {
              phenomenonTone(event.kind === "fragment" ? "nova" : event.kind);
              lastPhenomenonSoundRef.current = now;
            }
            ui.recordDiscovery(event.kind, event.detail);
          }
        }
      }

      inspectLaunches(world);
      inspectBodyHistories(world);

      if (!ui.paused && world.time - lastSnapshotTimeRef.current >= 0.18) {
        snapshotsRef.current.push(captureSnapshot(world));
        lastSnapshotTimeRef.current = world.time;
        while (
          snapshotsRef.current.length > 2 &&
          snapshotsRef.current[1]!.time < world.time - 8.15
        ) {
          snapshotsRef.current.shift();
        }
      }

      if (now - lastTelemetryAtRef.current > 300) {
        lastTelemetryAtRef.current = now;
        syncTelemetry(world);
      }

      if (world.bodies.length !== lastCount.current) {
        lastCount.current = world.bodies.length;
        ui.setBodyCount(world.bodies.length);
      }
      if (world.bodies.length >= 12) ui.markSystemMilestone();

      if (!ui.follow) {
        const panSpeed =
          (keysRef.current.has("ShiftLeft") || keysRef.current.has("ShiftRight") ? 620 : 360) * raw;
        if (keysRef.current.has("ArrowLeft")) cam.x -= panSpeed / cam.scale;
        if (keysRef.current.has("ArrowRight")) cam.x += panSpeed / cam.scale;
        if (keysRef.current.has("ArrowUp")) cam.y -= panSpeed / cam.scale;
        if (keysRef.current.has("ArrowDown")) cam.y += panSpeed / cam.scale;
      }

      if (ui.follow && world.bodies.length > 0) {
        const c = barycenter(world.bodies);
        const k = 1 - Math.exp(-3.2 * raw);
        cam.x += (c.x - cam.x) * k;
        cam.y += (c.y - cam.y) * k;
      }

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const alpha = ui.paused ? 1 : acc / FIXED_DT;

      ctx.fillStyle = "#070809";
      ctx.fillRect(0, 0, w, h);
      drawStars(ctx, starsRef.current, w, h, cam.x, cam.y, now / 1000);

      ctx.save();
      const trauma = ui.shake && !reducedMotion ? traumaRef.current : 0;
      const shake = trauma * trauma;
      const shakeX = Math.sin(now * 0.071) * 7 * shake;
      const shakeY = Math.cos(now * 0.093) * 5 * shake;
      traumaRef.current = Math.max(0, traumaRef.current - raw * 1.65);
      ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
      ctx.scale(cam.scale, cam.scale);
      ctx.translate(-cam.x, -cam.y);

      if (world.galaxy) drawGalaxy(ctx, world.galaxy, now / 1000);

      const fling = flingRef.current;
      const pset = preset();

      if (!world.galaxy && world.scene !== "milkyway" && (ui.fieldWorlds || ui.fieldHoles)) {
        const samples = world.bodies.map((b) => {
          const p = lerpBody(b, alpha);
          const hole = b.kind === "blackHole" || b.kind === "smbh";
          return { x: p.x, y: p.y, mass: b.mass, color: b.color, hole };
        });
        if (ui.fieldWorlds) {
          for (const phenomenon of world.phenomena) {
            if (phenomenon.kind !== "gravityWell") continue;
            samples.push({
              x: phenomenon.x,
              y: phenomenon.y,
              mass: phenomenon.mass * (phenomenon.life / phenomenon.maxLife),
              color: "#9eb6c5",
              hole: false,
            });
          }
        }
        const ghostHole = pset.kind === "blackHole" || pset.kind === "smbh";
        const showGhost = (ghostHole && ui.fieldHoles) || (!ghostHole && ui.fieldWorlds);
        if (ui.instrument === "launch" && showGhost && fling) {
          samples.push({
            x: fling.x,
            y: fling.y,
            mass: pset.mass,
            color: pset.color,
            hole: ghostHole,
          });
        } else if (
          ui.instrument === "launch" &&
          showGhost &&
          hoverRef.current &&
          modeRef.current === "none"
        ) {
          samples.push({
            x: hoverRef.current.x,
            y: hoverRef.current.y,
            mass: pset.mass,
            color: pset.color,
            hole: ghostHole,
          });
        }
        const visible = samples.filter((s) => (s.hole ? ui.fieldHoles : ui.fieldWorlds));
        if (visible.length > 0) {
          drawGravityFieldEnhanced(
            ctx,
            visible,
            world.G,
            world.softening,
            {
              x: cam.x,
              y: cam.y,
              scale: cam.scale,
              w,
              h,
            },
            now / 1000,
          );
        }
      }

      if (world.scene === "milkyway") {
        const sun = world.bodies.find((body) => body.name === "Sun");
        if (sun) {
          ctx.lineWidth = 1 / cam.scale;
          ctx.strokeStyle = "rgba(180,193,209,0.15)";
          for (const planet of SOLAR_PLANETS) {
            ctx.beginPath();
            ctx.arc(sun.x, sun.y, planet.distance, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      drawPhenomena(ctx, world, now / 1000);
      if (ui.trails) drawTrails(ctx, world.bodies, alpha);

      if (fling && pathRef.current) {
        drawPath(ctx, pathRef.current, pset.color);
        drawArrow(ctx, fling.x, fling.y, fling.sx, fling.sy, pset.color);
      }

      for (const body of world.bodies) {
        const p = lerpBody(body, alpha);
        const displayRadius =
          world.scene === "milkyway" ? solarDisplayRadius(body, cam.scale) : body.radius;
        drawBody(
          ctx,
          p.x,
          p.y,
          displayRadius,
          body.color,
          body.glow,
          body.kind,
          body.style,
          body.vx,
          body.vy,
          now / 1000,
        );
      }

      if (world.scene === "milkyway") {
        ctx.font = `${13 / cam.scale}px sans-serif`;
        ctx.textAlign = "center";
        for (const body of world.bodies) {
          if (body.name !== "Sun" && !body.distinctions.includes("Solar System planet")) continue;
          const p = lerpBody(body, alpha);
          ctx.fillStyle = "#d3d8de";
          const sun = world.bodies.find((b) => b.name === "Sun");
          const radius = solarDisplayRadius(body, cam.scale);
          if (body.name === "Sun" || !sun) {
            ctx.textAlign = "center";
            ctx.fillText(body.name, p.x, p.y - radius - 8 / cam.scale);
          } else {
            const angle = Math.atan2(p.y - sun.y, p.x - sun.x);
            ctx.textAlign = Math.cos(angle) >= 0 ? "left" : "right";
            const offset = radius + 7 / cam.scale;
            ctx.fillText(
              body.name,
              p.x + Math.cos(angle) * offset,
              p.y + Math.sin(angle) * offset + 4 / cam.scale,
            );
          }
        }
      }
      if (["cometStorm", "accretion", "gargantua", "binary"].includes(world.scene)) {
        const namedTargets = new Set([
          "Vigil",
          "Sahra",
          "Pelagos",
          "Crown",
          "Lava embryo",
          "Ocean embryo",
          "Ice embryo",
          "Miller",
          "Mann",
          "Endurance",
          "Castor",
          "Pollux",
        ]);
        ctx.font = `${13 / cam.scale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#d3d8de";
        for (const body of world.bodies) {
          if (!namedTargets.has(body.name)) continue;
          const p = lerpBody(body, alpha);
          const label =
            world.scene === "accretion" ? `${body.name} · ${Math.round(body.mass)} m` : body.name;
          ctx.fillText(label, p.x, p.y + body.radius + 17 / cam.scale);
        }
      }
      drawBursts(ctx, world);

      if (hoverRef.current && modeRef.current === "none" && ui.instrument !== "launch") {
        drawInstrumentPreview(
          ctx,
          ui.instrument,
          hoverRef.current.x,
          hoverRef.current.y,
          wormholeAnchorRef.current,
          now / 1000,
        );
      }

      if (fling) {
        drawBody(
          ctx,
          fling.x,
          fling.y,
          radiusFor(pset.mass, pset.kind),
          pset.color,
          0.4,
          pset.kind,
          pset.style,
          0,
          0,
          now / 1000,
        );
      } else if (ui.instrument === "launch" && hoverRef.current && modeRef.current === "none") {
        const hv = hoverRef.current;
        ctx.globalAlpha = 0.45;
        drawBody(
          ctx,
          hv.x,
          hv.y,
          radiusFor(pset.mass, pset.kind),
          pset.color,
          0,
          pset.kind,
          pset.style,
          0,
          0,
          now / 1000,
        );
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      if (fling) {
        const speed = Math.hypot(
          (fling.sx - fling.x) * THROW_SCALE,
          (fling.sy - fling.y) * THROW_SCALE,
        );
        drawLaunchReadout(
          ctx,
          (fling.sx - cam.x) * cam.scale + w / 2,
          (fling.sy - cam.y) * cam.scale + h / 2,
          speed,
          aimLabelRef.current,
          w,
          h,
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const cam = camRef.current;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX;
      const sy = e.clientY;
      const before = {
        x: (sx - rect.left - rect.width / 2) / cam.scale + cam.x,
        y: (sy - rect.top - rect.height / 2) / cam.scale + cam.y,
      };
      const factor = Math.exp(-e.deltaY * 0.0012);
      cam.scale = clamp(cam.scale * factor, MIN_SCALE, MAX_SCALE);
      const after = {
        x: (sx - rect.left - rect.width / 2) / cam.scale + cam.x,
        y: (sy - rect.top - rect.height / 2) / cam.scale + cam.y,
      };
      cam.x += before.x - after.x;
      cam.y += before.y - after.y;
    };
    canvas.addEventListener("wheel", onWheelNative, { passive: false });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("wheel", onWheelNative);
    };
    // The animation loop is intentionally stable and reads live state through refs/Zustand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.type === "keyup") {
        keysRef.current.delete(e.code);
        return;
      }
      keysRef.current.add(e.code);
      const ui = useSimUi.getState();
      unlockAudio();
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      if (e.repeat) return;
      if (e.code === "Space") {
        ui.togglePaused();
      }
      if (e.code === "Digit1") ui.setMassId("dust");
      if (e.code === "Digit2") ui.setMassId("moon");
      if (e.code === "Digit3") ui.setMassId("planet");
      if (e.code === "Digit4") ui.setMassId("giant");
      if (e.code === "Digit5") ui.setMassId("star");
      if (e.code === "Digit6") ui.setMassId("redGiant");
      if (e.code === "Digit7") ui.setMassId("blackHole");
      if (e.code === "Digit8") ui.setMassId("smbh");
      if (e.code === "KeyT") ui.toggleTrails();
      if (e.code === "KeyG") ui.toggleFieldWorlds();
      if (e.code === "KeyH") ui.toggleFieldHoles();
      if (e.code === "KeyF") ui.toggleFollow();
      if (e.code === "KeyC") apiRef.current?.clear();
      if (e.code === "KeyR") apiRef.current?.recenter();
      if (e.code === "KeyZ") apiRef.current?.undo();
      if (e.code === "KeyB") apiRef.current?.rewind();
      if (e.code === "KeyP") apiRef.current?.replay();
      if (e.code === "KeyW") ui.setInstrument("wormhole");
      if (e.code === "KeyN") ui.setInstrument("nova");
      if (e.code === "KeyV") ui.setInstrument("gravityWell");
      if (e.code === "Escape") {
        wormholeAnchorRef.current = null;
        ui.setInstrument("launch");
      }
      if (e.code === "KeyM") ui.toggleSound();
      if (e.code === "KeyU") ui.toggleHud();
      if (e.code === "BracketLeft") ui.setTimeScale(clamp(ui.timeScale / 1.5, 0.25, 6));
      if (e.code === "BracketRight") ui.setTimeScale(clamp(ui.timeScale * 1.5, 0.25, 6));
    };
    const clearKeys = () => keysRef.current.clear();
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", clearKeys);
    document.addEventListener("visibilitychange", clearKeys);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", clearKeys);
    };
  }, [apiRef]);

  function toWorld(el: HTMLCanvasElement, sx: number, sy: number) {
    const rect = el.getBoundingClientRect();
    const cam = camRef.current;
    return {
      x: (sx - rect.left - rect.width / 2) / cam.scale + cam.x,
      y: (sy - rect.top - rect.height / 2) / cam.scale + cam.y,
    };
  }

  function updatePredict(wx: number, wy: number, vx: number, vy: number) {
    const pset = preset();
    const spec = {
      x: wx,
      y: wy,
      vx,
      vy,
      mass: pset.mass,
      color: pset.color,
      kind: pset.kind,
      style: pset.style,
    };
    pathRef.current = predictPath(worldRef.current, spec);
    aimLabelRef.current = classifyAim(worldRef.current, spec, pathRef.current.length);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    unlockAudio();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      modeRef.current = "pinch";
      flingRef.current = null;
      pathRef.current = null;
      const pts = [...pointersRef.current.values()];
      const dx = pts[0]!.x - pts[1]!.x;
      const dy = pts[0]!.y - pts[1]!.y;
      pinchRef.current = { dist: Math.hypot(dx, dy) || 1, scale: camRef.current.scale };
      const midX = (pts[0]!.x + pts[1]!.x) / 2;
      const midY = (pts[0]!.y + pts[1]!.y) / 2;
      panRef.current = { x: midX, y: midY, cx: camRef.current.x, cy: camRef.current.y };
      return;
    }

    const pan = e.button === 1 || e.button === 2 || e.shiftKey;
    if (pan) {
      modeRef.current = "pan";
      panRef.current = {
        x: e.clientX,
        y: e.clientY,
        cx: camRef.current.x,
        cy: camRef.current.y,
      };
      return;
    }

    if (e.button !== 0) return;
    const ui = useSimUi.getState();
    const instrument = ui.instrument;
    if (instrument !== "launch") {
      const point = toWorld(el, e.clientX, e.clientY);
      const world = worldRef.current;
      modeRef.current = "none";
      if (instrument === "wormhole") {
        const anchor = wormholeAnchorRef.current;
        if (!anchor) {
          wormholeAnchorRef.current = point;
          ui.announce(
            "First aperture placed",
            "Choose a second point at least 70 field units away.",
          );
        } else {
          const pair = spawnWormhole(world, anchor.x, anchor.y, point.x, point.y);
          if (!pair) {
            ui.announce(
              "Apertures too close",
              "Separate the two wormhole mouths before linking them.",
            );
          } else {
            world.actions.push({
              type: "wormhole",
              t: world.time,
              ax: anchor.x,
              ay: anchor.y,
              bx: point.x,
              by: point.y,
            });
            wormholeAnchorRef.current = null;
            ui.setInstrument("launch");
            phenomenonTone("wormhole");
            ui.announce("Wormhole linked", "Momentum will be preserved across the two apertures.");
          }
        }
      } else if (instrument === "nova") {
        spawnShockwave(world, point.x, point.y);
        world.actions.push({ type: "nova", t: world.time, x: point.x, y: point.y });
        ui.setInstrument("launch");
      } else {
        spawnGravityWell(world, point.x, point.y);
        world.actions.push({ type: "gravityWell", t: world.time, x: point.x, y: point.y });
        ui.setInstrument("launch");
      }
      syncTelemetry(world);
      return;
    }
    modeRef.current = "fling";
    const w = toWorld(el, e.clientX, e.clientY);
    flingRef.current = { x: w.x, y: w.y, sx: w.x, sy: w.y };
    pathRef.current = null;
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const el = e.currentTarget;
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (
      modeRef.current === "pinch" &&
      pointersRef.current.size === 2 &&
      pinchRef.current &&
      panRef.current
    ) {
      const pts = [...pointersRef.current.values()];
      const dx = pts[0]!.x - pts[1]!.x;
      const dy = pts[0]!.y - pts[1]!.y;
      const dist = Math.hypot(dx, dy) || 1;
      camRef.current.scale = clamp(
        pinchRef.current.scale * (dist / pinchRef.current.dist),
        MIN_SCALE,
        MAX_SCALE,
      );
      const midX = (pts[0]!.x + pts[1]!.x) / 2;
      const midY = (pts[0]!.y + pts[1]!.y) / 2;
      const cam = camRef.current;
      cam.x = panRef.current.cx - (midX - panRef.current.x) / cam.scale;
      cam.y = panRef.current.cy - (midY - panRef.current.y) / cam.scale;
      return;
    }

    if (modeRef.current === "pan" && panRef.current) {
      const cam = camRef.current;
      cam.x = panRef.current.cx - (e.clientX - panRef.current.x) / cam.scale;
      cam.y = panRef.current.cy - (e.clientY - panRef.current.y) / cam.scale;
      return;
    }

    const wpos = toWorld(el, e.clientX, e.clientY);
    hoverRef.current = wpos;

    if (modeRef.current === "fling" && flingRef.current) {
      flingRef.current.sx = wpos.x;
      flingRef.current.sy = wpos.y;
      const vx = (wpos.x - flingRef.current.x) * THROW_SCALE;
      const vy = (wpos.y - flingRef.current.y) * THROW_SCALE;
      updatePredict(flingRef.current.x, flingRef.current.y, vx, vy);
    }
  }

  function onPointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    const el = e.currentTarget;
    pointersRef.current.delete(e.pointerId);
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    if (modeRef.current === "fling" && flingRef.current && e.button === 0) {
      const start = flingRef.current;
      const end = toWorld(el, e.clientX, e.clientY);
      const pset = preset();
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const vx = dx * THROW_SCALE;
      const vy = dy * THROW_SCALE;
      const world = worldRef.current;
      const host = dominantHost(world);
      const body = addBody(world, {
        x: start.x,
        y: start.y,
        vx,
        vy,
        mass: pset.mass,
        color: pset.color,
        kind: pset.kind,
        style: pset.style,
      });
      if (body) {
        body.distinctions.push("Launched from the Apsis lab");
        world.actions.push({
          type: "launch",
          t: world.time,
          x: start.x,
          y: start.y,
          vx,
          vy,
          massId: pset.id,
        });
        recordTimeline(
          world,
          "birth",
          `${body.name} entered the field`,
          `${pset.label} launched at ${Math.round(Math.hypot(vx, vy))} u/s.`,
          [body.id],
        );
        throwTone();
        const rvx = body.vx - (host?.vx ?? 0);
        const rvy = body.vy - (host?.vy ?? 0);
        const hostDx = body.x - (host?.x ?? body.x);
        const hostDy = body.y - (host?.y ?? body.y);
        const distance = host ? Math.hypot(hostDx, hostDy) : Number.POSITIVE_INFINITY;
        if (host) {
          launchTrackersRef.current.set(body.id, {
            id: body.id,
            hostId: host.id,
            bornAt: world.time,
            initialRelativeSpeed: Math.hypot(rvx, rvy),
            lastDistance: distance,
            minDistance: distance,
            lastAngle: Math.atan2(hostDy, hostDx),
            angleTravel: 0,
            captured: false,
            closeCall: false,
            slingshot: false,
          });
        }
        undoIdsRef.current.push(body.id);
        useSimUi.getState().recordLaunch(pset.kind);
        useSimUi.getState().setBodyCount(world.bodies.length);
        lastCount.current = world.bodies.length;
        syncTelemetry(world);
      }
    }

    if (pointersRef.current.size === 0) {
      modeRef.current = "none";
      flingRef.current = null;
      panRef.current = null;
      pinchRef.current = null;
      pathRef.current = null;
    } else if (pointersRef.current.size === 1) {
      modeRef.current = "none";
      pinchRef.current = null;
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full cursor-crosshair touch-none select-none bg-bg"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => {
        hoverRef.current = null;
      }}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
