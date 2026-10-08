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
    const { createWorld, stepWorld, FIXED_DT, predictPath } =
      await import("/src/lib/sim/physics.ts");
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
