import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.APSIS_BROWSER || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:8080/");
  const result = await page.evaluate(async () => {
    const {
      createWorld,
      stepWorld,
      FIXED_DT,
      predictPath,
      addBody,
      orbitalVelocity,
      spawnEncounter,
      MAX_BODIES,
    } = await import("/src/lib/sim/physics.ts");
    const { loadScene, SOLAR_PLANETS } = await import("/src/lib/sim/presets.ts");
    const { captureSnapshot, restoreSnapshot } = await import("/src/lib/sim/rewind.ts");
    const { useSimUi } = await import("/src/lib/sim/store.ts");
    const solar = createWorld();
    loadScene(solar, "milkyway");
    const start = solar.bodies.map((b) => ({ name: b.name, x: b.x, y: b.y }));
    for (let i = 0; i < 90 * 120; i++) stepWorld(solar, FIXED_DT, false);
    const sun = solar.bodies.find((b) => b.name === "Sun");
    const stable = SOLAR_PLANETS.map((p) => {
      const body = solar.bodies.find((b) => b.name === p.name);
      return {
        name: p.name,
        massRatio: body?.mass / sun.mass,
        expectedRatio: p.massRatio,
        distanceError: body
          ? Math.abs(Math.hypot(body.x - sun.x, body.y - sun.y) / p.distance - 1)
          : 1,
      };
    });
    const path = predictPath(solar, {
      x: sun.x + 260,
      y: sun.y,
      vx: sun.vx,
      vy: sun.vy + Math.sqrt((solar.G * sun.mass) / 260),
      mass: 0.00168,
      color: "#3984a8",
      kind: "rock",
    });
    const galaxy = createWorld();
    loadScene(galaxy, "galaxy", "QA-SEED");
    const cluster = galaxy.bodies.find((b) => b.name === "Cluster 1");
    const clusterX = cluster.x;
    for (let i = 0; i < 90; i++) stepWorld(galaxy, FIXED_DT, false);
    const storm = createWorld();
    loadScene(storm, "cometStorm");
    for (let i = 0; i < 90 * 17; i++) stepWorld(storm, FIXED_DT, false);
    const snapshot = captureSnapshot(storm);
    const advance = () => {
      for (let i = 0; i < 90 * 3; i++) stepWorld(storm, FIXED_DT, false);
    };
    advance();
    const stormState = JSON.stringify(
      storm.bodies.map((b) => [b.id, b.x, b.y, b.vx, b.vy, b.name]),
    );
    const wave = storm.stormWave;
    restoreSnapshot(storm, snapshot);
    advance();
    const sameStorm =
      stormState === JSON.stringify(storm.bodies.map((b) => [b.id, b.x, b.y, b.vx, b.vy, b.name]));
    const orbit = createWorld("ORBIT-QA");
    const anchor = addBody(orbit, { x: 0, y: 0, vx: 8, vy: -3, mass: 560, color: "#f0e2b6" });
    const velocity = orbitalVelocity(orbit, 200, 0, 0.00168);
    const launched = addBody(orbit, { x: 200, y: 0, ...velocity, mass: 0.00168, color: "#3984a8" });
    const nearAnchorDenied = orbitalVelocity(orbit, 5, 0, 1) === null;
    const noAnchorDenied = orbitalVelocity(createWorld(), 200, 0, 1) === null;
    let maxOrbitDrift = 0;
    for (let i = 0; i < 90 * 50; i++) {
      stepWorld(orbit, FIXED_DT, false);
      maxOrbitDrift = Math.max(
        maxOrbitDrift,
        Math.abs(Math.hypot(launched.x - anchor.x, launched.y - anchor.y) / 200 - 1),
      );
    }
    const encounters = [];
    for (const kind of ["comets", "rogue", "stellar"]) {
      const world = createWorld();
      loadScene(world, "milkyway", "ENCOUNTER-QA");
      const before = captureSnapshot(world);
      const started = spawnEncounter(world, kind);
      const activeBlocked = !spawnEncounter(world, kind);
      const visitorCount = world.encounter.visitorIds.length;
      const firstState = JSON.stringify(
        world.bodies.map((b) => [b.id, b.x, b.y, b.vx, b.vy, b.mass]),
      );
      restoreSnapshot(world, before);
      spawnEncounter(world, kind);
      const deterministic =
        firstState ===
        JSON.stringify(world.bodies.map((b) => [b.id, b.x, b.y, b.vx, b.vy, b.mass]));
      const during = captureSnapshot(world);
      const advanceEncounter = () => {
        for (let i = 0; i < 90 * 33; i++) stepWorld(world, FIXED_DT, false);
      };
      advanceEncounter();
      const finished = JSON.stringify({
        bodies: world.bodies.map((b) => [b.id, b.x, b.y, b.vx, b.vy]),
        encounter: world.encounter,
      });
      const outcome = world.encounter.status;
      restoreSnapshot(world, during);
      advanceEncounter();
      const sameAfterRewind =
        finished ===
        JSON.stringify({
          bodies: world.bodies.map((b) => [b.id, b.x, b.y, b.vx, b.vy]),
          encounter: world.encounter,
        });
      encounters.push({
        kind,
        started,
        activeBlocked,
        visitorCount,
        deterministic,
        outcome,
        sameAfterRewind,
      });
    }
    const full = createWorld();
    for (let i = 0; i < MAX_BODIES; i++) addBody(full, { x: i * 40, y: 0, mass: 1, color: "#ccc" });
    const capacityBlocked = !spawnEncounter(full, "comets") && full.encounter === null;
    const changed = createWorld();
    addBody(changed, { x: 0, y: 0, mass: 560, color: "#ccc" });
    spawnEncounter(changed, "comets");
    changed.bodies = changed.bodies.filter((b) => !changed.encounter.protectedIds.includes(b.id));
    changed.time = changed.encounter.endsAt;
    stepWorld(changed, FIXED_DT, false);
    const lossRecorded = changed.encounter.status === "changed";
    const { encodeExperiment, decodeExperiment } = await import("/src/lib/sim/sharing.ts");
    const shared = {
      v: 1,
      seed: "ENCOUNTER-QA",
      scene: "milkyway",
      actions: [{ type: "encounter", t: 0, kind: "comets" }],
    };
    const shareRoundTrip =
      JSON.stringify(decodeExperiment(encodeExperiment(shared))) === JSON.stringify(shared);
    const ui = useSimUi;
    ui.setState({ sound: false, notifiedDiscoveries: [], lastNotificationAt: 0 });
    ui.getState().toggleSound();
    ui.getState().toggleSound();
    ui.getState().setScene("helios", "QA");
    ui.getState().recordDiscovery("capture", "first");
    const firstNotice = ui.getState().lastDiscovery.id;
    ui.setState({ lastNotificationAt: 0 });
    ui.getState().recordDiscovery("capture", "repeat");
    const dedup = ui.getState().lastDiscovery.id === firstNotice && ui.getState().captures === 2;
    ui.setState({ lastNotificationAt: Date.now() });
    ui.getState().recordDiscovery("slingshot", "cooldown");
    const cooldown = ui.getState().lastDiscovery.id === firstNotice;
    ui.getState().setScene("binary", "QA");
    const sceneReset =
      ui.getState().captures === 0 && ui.getState().slingshots === 0 && ui.getState().score === 0;
    ui.setState({
      challengingTasks: false,
      captures: 2,
      closeCalls: 2,
      orbits: 3,
      sceneId: "helios",
    });
    const telemetry = {
      encounter: null,
      bodyCount: 0,
      worldTime: 50,
      seed: "QA",
      rewindSeconds: 0,
      bodies: [],
      timeline: [],
      phenomenonCount: 0,
      galaxyStars: 0,
      galaxyFormation: 0,
    };
    ui.getState().syncWorld(telemetry);
    const disabled = !ui.getState().objectivesComplete;
    ui.getState().toggleChallengingTasks();
    ui.getState().syncWorld(telemetry);
    const enabled = ui.getState().objectivesComplete;
    const bonusScore = ui.getState().score;
    ui.getState().syncWorld(telemetry);
    const oneBonus = ui.getState().score === bonusScore;
    return {
      maxOrbitDrift,
      nearAnchorDenied,
      noAnchorDenied,
      encounters,
      capacityBlocked,
      lossRecorded,
      shareRoundTrip,
      solarBodies: solar.bodies.length,
      stable,
      sunOffset: Math.hypot(sun.x, sun.y),
      solarMoved: start.some((p) => {
        const b = solar.bodies.find((b) => b.name === p.name);
        return Math.hypot(b.x - p.x, b.y - p.y) > 5;
      }),
      pathLength: path.length,
      liveClusters: galaxy.bodies.filter((b) => b.name.startsWith("Cluster")).length,
      clusterMoved: Math.abs(cluster.x - clusterX) > 1,
      wave,
      sameStorm,
      dedup,
      cooldown,
      sceneReset,
      disabled,
      enabled,
      oneBonus,
    };
  });
  assert.ok(result.maxOrbitDrift < 0.001, "Orbit-assisted launch drifted");
  for (const encounter of result.encounters) {
    for (const key of ["started", "activeBlocked", "deterministic", "sameAfterRewind"])
      assert.equal(encounter[key], true, `${encounter.kind}: ${key}`);
    assert.equal(encounter.visitorCount, encounter.kind === "comets" ? 5 : 1);
    assert.notEqual(encounter.outcome, "active");
  }
  for (const key of [
    "nearAnchorDenied",
    "noAnchorDenied",
    "capacityBlocked",
    "lossRecorded",
    "shareRoundTrip",
  ])
    assert.equal(result[key], true, key);
  assert.equal(result.solarBodies, 9);
  assert.equal(result.solarMoved, true);
  for (const p of result.stable) {
    assert.ok(p.distanceError < 0.05, `${p.name} drifted`);
    assert.ok(Math.abs(p.massRatio / p.expectedRatio - 1) < 1e-10);
  }
  assert.ok(result.sunOffset < 3);
  assert.ok(result.pathLength > 70);
  assert.equal(result.liveClusters, 12);
  assert.equal(result.clusterMoved, true);
  assert.equal(result.wave, 1);
  for (const key of [
    "sameStorm",
    "dedup",
    "cooldown",
    "sceneReset",
    "disabled",
    "enabled",
    "oneBonus",
  ])
    assert.equal(result[key], true, key);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} finally {
  await browser.close();
}
