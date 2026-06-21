# Tunnelshooter Backlog

## Rendering model (reference)

- 16-sided cylinder, 20 rings, RING_STEP=120, manual perspective projection (FOCAL=400/z).
- VP at `(width/2, height/3)`. SPEED=400 units/sec. Z_RECYCLE=150, Z_FAR=2550.
- `Graphics` redrawn each frame. Ring depths cycled; recycled to far end when z < Z_RECYCLE.
- Depth alpha: 0 at Z_FAR, 1 at Z_FADE_START (Z_FAR×0.25 ≈ 637).
- Visual Y offset: asymmetric parabola in **world space** (CURVE_PEAK=50, peak at 25% depth). Does not affect game geometry.
- Rotation: `this.baseAngle` rotates cylinder around the fixed player (π/2, bottom). Controls: tap-drag, speed = pointer X offset from center, snap to next face on release (600ms ease-out). Valid positions = BASE_ANGLE_ORIGIN + n × 22.5°.

---

## Steps

### ✓ STEP 1 — Static wireframe
### ✓ STEP 2 — Forward movement (infinite)
### ✓ STEP 3 — Rotation controls
### ✓ STEP 4 — Player ship
- Triangle at Z_PLAYER=175. Tilt toward movement direction. Cannon at centroid (circle + barrel).
- **In progress:** ship apex needs z-depth for 3D perspective; barrel needs to extend in Z (not XY plane) to show taper.

### ✓ STEP 5 — Shooting
- Auto-fire every 0.3s. Shots travel in +Z at 1200 units/sec (camera-relative). Spawn from barrel tip. Rotate with cylinder (cylinderAngle + baseAngle). Fade and despawn at Z_FAR.

### STEP 6 — Enemy system

#### Small enemies
- Spawn randomly in any lane at Z_FAR.
- Move toward player at SPEED + small delta (slightly faster than the cylinder lines).
- Move left/right between lanes in an insect-like pattern (sinusoidal or random lane hops).
- 1 hit to kill.

#### Medium enemies
- Spawn in patterns: e.g., a wave of 3–5 appearing sequentially, each offset by one ring row.
- Move toward player at same approach speed as small enemies.
- 2 hits to kill.
- Destroying all enemies in a pattern drops a **shield icon** at the position of the last kill. Icon moves with the cylinder and can be collected by the player.

#### Large enemies
- Span 2 lanes horizontally.
- Do not move laterally — they travel with the cylinder at SPEED (same as rings), not faster.
- 10 hits to kill.
- Killing a large enemy drops a **weapon upgrade** (see Step 7).

#### General enemy rules
- All enemies are positioned at (angle, z) in cylinder coordinates, drawn as vector art sprites using the same perspective projection as rings.
- Bullet physics: shots check collision each frame against enemy positions — no tunneling through fast enemies. Use swept collision or per-frame overlap test at bullet z range.
- Collision with player reduces shields. Damage by size: small = 1, medium = 2, large = 5.

### ✓ STEP 7 — Weapon upgrades

Rewards drop from large enemy kills. Each reward is random and lasts **15 seconds**. Getting the same reward again resets its duration. Effects are cumulative (all active at once).

| # | Name | Effect | Cannon visual change |
|---|------|---------|----------------------|
| 1 | Dual cannons | Fire two shots side by side | Two barrels |
| 2 | Larger ammo | Shots deal double damage | Wider barrel |
| 3 | Firing rate | Fire rate increased | Shorter barrel (faster cycle) |
| 4 | Side cannons | Extra shots at ±20° off axis, spiral along cylinder surface | Two additional angled barrels |

Side cannon shot physics: shot moves in +Z AND laterally (along cylinder surface). World position = (cylinderAngle + spiralRate × dt, radius, z). Spiraling means worldAngle changes each frame as z increases.

### STEP 8 — Shields / player health

- Player has a shield bar (displayed as HUD).
- Enemy collision drains shields (amounts per Step 6).
- Shield icon drops when a medium-enemy pattern is fully cleared (see Step 6). Collecting it restores partial shields.
- Player dies when shields reach 0 → game over screen.

### STEP 9 — Score, speed progression, game loop
- Score increments per enemy kill (weighted by size).
- Speed ramps gradually over time.
- Start screen, game-over screen, restart.

### STEP 10 — Polish
- Explosion / death effects (particle bursts using same projection).
- More 3D-looking enemy representations (optional future upgrade).
- Depth cueing: vary stroke width with depth (closer = thicker).
