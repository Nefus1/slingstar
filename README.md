# Apsis: Strange Orbits

Apsis now opens on a mode-select screen with two complete ways to play: the original cosmic sandbox and a ten-wave tower-defense campaign. Progress for both modes is stored locally in the browser.

The **Sandbox Simulator** is an orbital gravity laboratory with five large cosmic modes, 12 optional contracts, an eight-second rewind, named-body histories, deterministic experiment sharing, and an anomaly instrument rack. Forge spiral galaxies, tour a labeled Milky Way, grow planets from rubble, redirect comet storms, or explore a cinematic Gargantua-inspired system.

Helios loads on open: a star with four planets already in motion. Drag anywhere to throw a new body. A dashed path previews the short n-body trajectory so you can aim captures and flybys.

The trajectory readout now calls out bound arcs, intercepts, and escape vectors before launch. Discoveries award points and short streak multipliers; session bests, sound, and motion preferences persist locally with a versioned save.

## Orbital Defense

Protect the inhabited ocean world Asteria from ten escalating waves of asteroids, comets, armored raiders, and boss ships. Defenses occupy fixed anchors on three rotating orbits, so coverage changes continuously while each wave follows four readable gravity lanes.

| Defense | Specialty |
| --- | --- |
| Moon Battery | Inexpensive rapid fire |
| Cryo World | Slows targets for the fleet |
| Magma Forge | Splash damage against clusters |
| Gravity Giant | Pushes threats back along their lane |
| Ring Lance | Long-range heavy strikes |

Between waves, spend salvaged stardust to deploy, upgrade, retarget, or sell defenses. Each tower can prioritize the first, strongest, or closest threat. Perfect waves award bonus resources; score streaks reward quick consecutive kills; campaign best score, highest wave, and victories persist locally.

Orbital Defense supports mouse, touch, and the following shortcuts:

| Key | Action |
| --- | --- |
| `1`–`5` | Select Moon Battery → Ring Lance |
| Space | Launch the next wave or pause/resume combat |

## Sandbox Simulator

**Throw** — click (or tap) and drag. Velocity follows the drag; a tiny flick drops a body nearly at rest, a long pull sends it on a hyperbolic pass.

**Bodies** — Asteroid, Comet, Planet, Gas giant, Star, Red giant, Black hole, or Supermassive are always on the quick launcher. The world catalog adds moons plus rocky, ocean, desert, ice, lava, gas, and ringed planets. Check several and enable **Mixed** to cycle through those types on successive launches.

**Galaxy layer** — Galaxy-scale stars use a lightweight analytic spiral model while launched objects remain in the full n-body simulation. Galaxy Forge starts as a diffuse seeded cloud and visibly condenses into a barred four-arm galaxy; re-form it or press the mode again for a new seed.

**Field** — a curved space-time lattice, combined isopotential contours, directional flow needles, animated contour drift, and softly colored gravity basins. **Worlds** (`G`) shows pull from planets, moons, stars, and temporary wells. **Holes** (`H`) isolates black-hole influence.

**Collisions** — ordinary impacts merge with conserved momentum. High-energy rock collisions and close black-hole passes can fragment a named body into momentum-bearing descendants.

**Time** — 0.25× to 6×. Slow down to thread a slingshot; speed up to watch a system settle.

**Trails** — fade-out orbits. Toggle them off if the field gets noisy.

**Follow** — lock the camera to the barycenter so the whole system stays framed.

**Clear** — empty the lab. Pause to place a choreography, then resume.

**Undo** — remove the most recent launched body if it has not already merged.

**Contracts** — 12 optional assignments cover efficient captures, close flybys, chain reactions, stable binaries, wormhole transits, fragmentation, and nova choreography. Contract progress persists locally.

**Timeline** — the last eight simulated seconds are sampled continuously. Rewind restores the physical world and pauses for a correction; cinematic replay runs the same span at half speed. Contracts allow two revisions.

**Archive** — every body receives a deterministic name and keeps orbital years, close shaves, assists, merger survival, fragment lineage, and fold-space distinctions. A post-experiment timeline records the system's story.

**Share** — copied experiment links include the seed plus every launch and anomaly placement. Opening one rebuilds the scene and replays the compact deterministic action timeline.

### Anomaly instruments

| Instrument | Effect |
| --- | --- |
| Launch | Fling the selected mass with a predicted n-body path |
| Wormhole | Place two apertures; bodies preserve momentum while crossing |
| Nova pulse | Send an expanding shockwave through the system |
| Gravity well | Anchor a strong temporary attractor that decays after 18 simulated seconds |

### Scenes

| Scene | What you get |
| --- | --- |
| Helios | A star and four planets on nested orbits |
| Binary | Two stars circling a shared barycenter, plus a distant planet |
| Figure-8 | The Chenciner–Montgomery three-body choreography |
| Slingshot | A star, a planet, and an incoming comet on a flyby |
| Event horizon | Nine worlds orbit a compact black hole, some retrograde |
| Mayhem | A red giant and two opposing orbital bands built to cascade |
| Remix | A newly randomized but initially stable system on every press |
| Empty | A clean field |

### Cosmic modes

| Mode | What you get |
| --- | --- |
| Galaxy Forge | A fresh 640-star protogalactic cloud that forms a living four-arm spiral around Forgeheart |
| Milky Way | A 760-star barred-spiral reconstruction with Sagittarius A*, Sol, the Orion Spur, and Perseus Arm marked |
| Planet Forge | A nursery sun, 38 colliding planetesimals, and lava, ocean, and ice embryos that can accrete into worlds |
| Comet Storm | Three target worlds facing 14 visible-tailed comets and seven asteroids from every direction |
| Gargantua | A cinematic gravitational-lensing scene with a photon ring, Doppler-colored accretion disk, Miller, Mann, and Endurance |

### Pointer

| Input | Action |
| --- | --- |
| Drag | Fling a body of the selected mass |
| Right-drag / Shift-drag / middle-drag | Pan |
| Scroll | Zoom toward the cursor |
| Two-finger pinch | Pan and zoom (touch) |
| Click without much drag | Drop a nearly-still body |

### Keys

| Key | Action |
| --- | --- |
| `1`–`8` | Dust → Supermassive legacy quick selection |
| Space | Pause / resume |
| `T` | Trails |
| `G` | Worlds gravity field |
| `H` | Black-hole gravity field |
| `F` | Follow barycenter |
| `C` | Clear |
| `R` | Recenter |
| `Z` | Undo the last launch |
| `B` | Rewind up to eight simulated seconds |
| `P` | Cinematic replay at half speed |
| `W` | Select the wormhole instrument |
| `N` | Select the nova-pulse instrument |
| `V` | Select the temporary gravity-well instrument |
| `M` | Mute / enable sound |
| `U` | Hide / show the HUD |
| `[` / `]` | Time scale down / up |
| Arrow keys | Pan |

## Physics

N-body gravity with velocity Verlet, Plummer softening, and a fixed timestep so close encounters stay stable. Fast movers substep so they do not tunnel through a star. Bodies that fly too far from the system are culled.

The Figure-8 scene is a scaled Chenciner–Montgomery solution (equal masses, G scaled with the lab). It should hold the pretzel for a long time if you leave it alone.

## Stack

React 19, TypeScript, Vite, TanStack Start, Tailwind v4. The sim is a 2D canvas loop; HUD is a DOM overlay. Sign-in (Google / X) is optional — the lab itself is open to guests.

## Install from the downloaded ZIP (Windows)

1. Extract the ZIP to a normal folder (do not run it from inside the ZIP viewer).
2. Install the current LTS release of [Node.js](https://nodejs.org/) if it is not already installed.
3. Open PowerShell or Terminal in the extracted project folder.
4. Run `npm install`, then `npm run dev`.
5. Open the local address printed by the terminal. Keep that terminal open while playing.

Your observatory progress is stored in the browser profile on that PC.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run build
```

`npm run preview` serves the production build. Auth persists to Postgres when `DATABASE_URL` is set, and to an embedded PGLite database otherwise.

### Authentication credentials

OAuth credentials must be supplied through the hosting environment. Deployed sign-in uses GROK_AUTH_CLIENT_ID and GROK_AUTH_CLIENT_SECRET. Shared preview sign-in requires GROK_PREVIEW_CLIENT_SECRET. Without broker credentials, Google/X sign-in is unavailable; the game remains usable as a guest. Never commit credential values.

