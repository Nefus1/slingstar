import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const origin = process.env.APSIS_ORIGIN || "http://127.0.0.1:8080";
const label = process.env.APSIS_QA_LABEL || "dev";
const browser = await chromium.launch({
  executablePath: process.env.APSIS_BROWSER || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
mkdirSync("/workspace/screenshots", { recursive: true });
const results = [];
try {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.route("https://fonts.googleapis.com/**", (route) =>
      route.fulfill({ contentType: "text/css", body: "" }),
    );
    await page.route("https://grok.com/grok-app-builder/extensions.js", (route) =>
      route.fulfill({ contentType: "application/javascript", body: "" }),
    );
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(origin, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Enter observatory/ }).click();
    const button = (name) => page.getByRole("button", { name, exact: true });
    const picker = page.locator(".dock-picker");
    const dock = page.locator(".launch-dock");
    await button("Pause").click();
    assert.equal(await picker.count(), 0);
    const dockHeight = (await dock.boundingBox()).height;
    assert.ok(dockHeight <= (viewport.width < 640 ? 120 : 72), `Dock too tall: ${dockHeight}`);
    assert.equal(await button("Black hole").count(), 0);
    await button("Choose launch body").click();
    await button("Stars & holes").click();
    await button("Black hole").click();
    assert.equal(await picker.count(), 0, "Body selection should close its picker");
    assert.equal(await button("Choose launch body").innerText(), "Black hole");
    await button("Choose launch body").click();
    await button("Small bodies").click();
    await button("Comet").click();
    await button("Choose instrument").click();
    await button("Wormhole").click();
    assert.equal(await picker.count(), 0, "Instrument selection should close its picker");
    const canvas = page.locator("main > canvas");
    await canvas.click({ position: { x: viewport.width * 0.4, y: 270 } });
    await canvas.click({ position: { x: viewport.width * 0.8, y: 270 } });
    const start = { x: viewport.width * 0.75, y: 350 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - 15, start.y + 25, { steps: 5 });
    await page.mouse.up();
    await button("Undo launch").click();
    await button("Choose launch body").click();
    await button("Orbit assist").focus();
    await page.keyboard.press("Space");
    assert.equal(
      await page.locator(".dock-play").getAttribute("aria-label"),
      "Resume",
      "Keyboard picker selection should not also toggle simulation playback",
    );
    assert.equal(await button("Orbit assist").getAttribute("aria-pressed"), "true");
    await button("Close Launch body").click();
    assert.match(await page.locator(".dock-hint").innerText(), /Tap for an orbit/);
    await canvas.click({ position: { x: viewport.width * 0.65, y: 320 } });
    await button("Undo launch").click();
    await button("Choose simulation mode").click();
    await button("Milky Way").click();
    assert.equal(await picker.count(), 0);
    await page.waitForTimeout(200);
    const beforeZoom = await canvas.screenshot();
    await button("Zoom in").click();
    await page.waitForTimeout(100);
    const afterZoom = await canvas.screenshot();
    assert.equal(beforeZoom.equals(afterZoom), false);
    await button("Recenter").click();
    await page.screenshot({
      path: `/workspace/screenshots/apsis-solar-${label}-${viewport.width}.png`,
    });
    await button("Choose launch body").click();
    await page.screenshot({
      path: `/workspace/screenshots/apsis-picker-${label}-${viewport.width}.png`,
    });
    // Escape closes a modal picker and restores keyboard focus to its trigger.
    await page.keyboard.press("Escape");
    assert.equal(await picker.count(), 0);
    assert.equal(
      await button("Choose launch body").evaluate((el) => el === document.activeElement),
      true,
    );
    await button("Add cosmic encounter").click();
    await page.getByRole("button", { name: /^Comet train/ }).click();
    await page.waitForTimeout(100);
    assert.match(await page.getByLabel("Encounter status").innerText(), /Comet train/);
    await button("Add cosmic encounter").click();
    assert.equal(await page.getByRole("button", { name: /^Rogue planet/ }).isDisabled(), true);
    await button("Close Cosmic encounters").click();
    await button("Change simulation speed").click();
    await button("6×").click();
    await button("Resume").click();
    await page.waitForFunction(
      () => document.querySelector(".encounter-status")?.textContent.includes("Complete"),
      { timeout: 15000 },
    );
    await button("Pause").click();
    await page.screenshot({
      path: `/workspace/screenshots/apsis-encounter-${label}-${viewport.width}.png`,
    });
    await button("More controls").click();
    await button("Challenges").click();
    assert.equal(await button("Challenges").getAttribute("aria-pressed"), "false");
    await button("Close More controls").click();
    for (const mode of [
      "Galaxy Forge",
      "Planet Forge",
      "Comet Storm",
      "Gargantua",
      "Helios",
      "Binary",
      "Figure-8",
      "Slingshot",
      "Event horizon",
      "Mayhem",
      "Remix",
      "Empty",
    ]) {
      await button("Choose simulation mode").click();
      await button(mode).click();
      assert.equal(await picker.count(), 0);
      assert.match(await button("Choose simulation mode").innerText(), new RegExp(mode));
    }
    await button("Add cosmic encounter").click();
    assert.equal(await page.getByRole("button", { name: /^Comet train/ }).isDisabled(), true);
    await button("Close Cosmic encounters").click();
    await button("Choose simulation mode").click();
    await button("Comet Storm").click();
    await page.screenshot({
      path: `/workspace/screenshots/apsis-storm-${label}-${viewport.width}.png`,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    assert.equal(overflow, false);
    assert.deepEqual(errors, []);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Enter observatory/ }).click();
    await button("More controls").click();
    assert.equal(await button("Challenges").getAttribute("aria-pressed"), "false");
    assert.deepEqual(errors, []);
    results.push({
      viewport,
      dockHeight,
      modesChecked: 13,
      overflow,
      errors,
      launchAndUndo: true,
      orbitAssist: true,
      encounter: true,
      focusRestored: true,
      zoom: true,
      savedChallengePreference: true,
    });
    await page.close();
  }
  console.log(JSON.stringify({ ok: true, origin, results }, null, 2));
} finally {
  await browser.close();
}
