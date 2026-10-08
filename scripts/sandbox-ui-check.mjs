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
    // These existing external resources are unavailable under offline cloud QA.
    // Local app requests remain untouched so asset/runtime failures still fail.
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
    const footer = page.locator(".sandbox-controls");
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    assert.equal(await footer.getByRole("button", { name: "Planet", exact: true }).count(), 1);
    assert.equal(await footer.getByRole("button", { name: "Black hole", exact: true }).count(), 0);
    await footer.getByRole("button", { name: "Stars & holes", exact: true }).click();
    await footer.getByRole("button", { name: "Black hole", exact: true }).click();
    assert.equal(
      await footer
        .getByRole("button", { name: "Black hole", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await footer.getByRole("button", { name: "Small bodies", exact: true }).click();
    await footer.getByRole("button", { name: "Comet", exact: true }).click();
    await footer.getByRole("button", { name: "Tools", exact: true }).click();
    await footer.getByRole("button", { name: "Wormhole", exact: true }).click();
    const canvas = page.locator("main > canvas");
    await canvas.click({ position: { x: viewport.width * 0.4, y: 250 } });
    await canvas.click({ position: { x: viewport.width * 0.8, y: 250 } });
    await footer.getByRole("button", { name: "Launch", exact: true }).click();
    // Launch and undo exercise the real pointer/camera path on both devices.
    const start = { x: viewport.width * 0.75, y: 320 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - 15, start.y + 25, { steps: 5 });
    await page.mouse.up();
    await footer.getByRole("button", { name: "Undo launch", exact: true }).click();
    await footer.getByRole("button", { name: "Modes", exact: true }).click();
    await footer.getByRole("button", { name: "Milky Way", exact: true }).click();
    await page.waitForTimeout(350);
    await footer.getByRole("button", { name: "Bodies", exact: true }).click();
    await footer.getByRole("button", { name: "Planets", exact: true }).click();
    assert.equal(await footer.getByRole("button", { name: "Wormhole", exact: true }).count(), 0);
    const beforeZoom = await canvas.screenshot();
    await footer.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.waitForTimeout(100);
    const afterZoom = await canvas.screenshot();
    assert.equal(beforeZoom.equals(afterZoom), false);
    await footer.getByRole("button", { name: "Recenter", exact: true }).click();
    await page.screenshot({
      path: `/workspace/screenshots/apsis-solar-${label}-${viewport.width}.png`,
    });
    await footer.getByRole("button", { name: "Collapse launch controls", exact: true }).click();
    assert.equal(await footer.getByRole("button", { name: "Bodies", exact: true }).count(), 0);
    await footer.getByRole("button", { name: "Expand launch controls", exact: true }).click();
    await footer.getByRole("button", { name: "Modes", exact: true }).click();
    const challengeButton = footer.getByRole("button", { name: "Challenges on", exact: true });
    await challengeButton.click();
    assert.equal(
      await footer
        .getByRole("button", { name: "Challenges off", exact: true })
        .getAttribute("aria-pressed"),
      "false",
    );
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
      await footer.getByRole("button", { name: mode, exact: true }).click();
      await page.waitForTimeout(75);
      assert.equal(
        await footer.getByRole("button", { name: mode, exact: true }).getAttribute("aria-pressed"),
        "true",
      );
    }
    await footer.getByRole("button", { name: "Comet Storm", exact: true }).click();
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
    await page
      .locator(".sandbox-controls")
      .getByRole("button", { name: "Modes", exact: true })
      .click();
    assert.equal(
      await page
        .locator(".sandbox-controls")
        .getByRole("button", { name: "Challenges off", exact: true })
        .getAttribute("aria-pressed"),
      "false",
    );
    assert.deepEqual(errors, []);
    results.push({
      viewport,
      modesChecked: 13,
      overflow,
      errors,
      launchAndUndo: true,
      zoom: true,
      savedChallengePreference: true,
    });
    await page.close();
  }
  console.log(JSON.stringify({ ok: true, origin, results }, null, 2));
} finally {
  await browser.close();
}
