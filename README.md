# Apsis

An orbital gravity sandbox. Click-drag to fling worlds, then watch them orbit, slingshot, and merge.

Helios loads on open: a star with four planets already in motion. Drag anywhere to throw a new body. A dashed path previews the short n-body trajectory so you can aim captures and flybys.

## Play

**Throw** — click (or tap) and drag. Velocity follows the drag; a tiny flick drops a body nearly at rest, a long pull sends it on a hyperbolic pass.

**Mass** — Dust, Moon, Planet, Giant, Star, Red giant, Black hole, or Supermassive. Heavier bodies dominate the dance; dust is for scattering. Black holes stay compact (a horizon plus an accretion disk) while a red giant is bloated and cool.

**Field** — a warped lattice plus iso-g rings. **Worlds** (`G`) shows pull from planets, moons, and stars. **Holes** (`H`) shows pull from black holes. Toggle each independently.

**Collisions** — overlapping bodies merge. Mass and momentum are conserved, so a pile-up grows into a new world instead of exploding.

**Time** — 0.25× to 6×. Slow down to thread a slingshot; speed up to watch a system settle.

**Trails** — fade-out orbits. Toggle them off if the field gets noisy.

**Follow** — lock the camera to the barycenter so the whole system stays framed.

**Clear** — empty the lab. Pause to place a choreography, then resume.

### Scenes

| Scene | What you get |
| --- | --- |
| Helios | A star and four planets on nested orbits |
| Binary | Two stars circling a shared barycenter, plus a distant planet |
| Figure-8 | The Chenciner–Montgomery three-body choreography |
| Slingshot | A star, a planet, and an incoming comet on a flyby |
| Empty | A clean field |

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
| `1`–`8` | Dust → Supermassive |
| Space | Pause / resume |
| `T` | Trails |
| `G` | Worlds gravity field |
| `H` | Black-hole gravity field |
| `F` | Follow barycenter |
| `C` | Clear |
| `R` | Recenter |
| `[` / `]` | Time scale down / up |
| Arrow keys | Pan |

## Physics

N-body gravity with velocity Verlet, Plummer softening, and a fixed timestep so close encounters stay stable. Fast movers substep so they do not tunnel through a star. Bodies that fly too far from the system are culled.

The Figure-8 scene is a scaled Chenciner–Montgomery solution (equal masses, G scaled with the lab). It should hold the pretzel for a long time if you leave it alone.

## Stack

React 19, TypeScript, Vite, TanStack Start, Tailwind v4. The sim is a 2D canvas loop; HUD is a DOM overlay. Sign-in (Google / X) is optional — the lab itself is open to guests.

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
