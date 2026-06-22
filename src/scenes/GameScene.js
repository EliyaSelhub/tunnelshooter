import Phaser from 'phaser'

const SIDES = 16
const RINGS = 20
const RADIUS = 180
const FOCAL = 400
const RING_STEP = 120
const SPEED = 300
const Z_PLAYER = 175
const Z_RECYCLE = 150
const Z_DESPAWN = Z_RECYCLE - 2
const Z_FAR = Z_RECYCLE + RINGS * RING_STEP   // 2550
const Z_FADE_START = Z_FAR * 0.25

const CURVE_PEAK = 60.5
const Z_MID = Z_RECYCLE + (Z_FAR - Z_RECYCLE) / 4
const CURVE_HALF_SPAN = Z_MID - Z_RECYCLE

const FACE_ANGLE = (Math.PI * 2) / SIDES
const BASE_ANGLE_ORIGIN = 11.25 * Math.PI / 180
const MAX_ROT_SPEED = Math.PI * 0.75
const MAX_TILT = Math.PI / 9

const SHOT_SPEED = 1300
const SHOT_FIRE_RATE = 0.18
const SHOT_WORLD_RADIUS = RADIUS * Math.sin(Math.PI / (SIDES * 2)) / 5

const ENEMY_SPEED_DELTA = 200
const ENEMY_SPAWN_RATE = .2
const ENEMY_SIZE = 18
const ENEMY_HIT_ANGLE = FACE_ANGLE * 0.55
const WANDER_MAX_VEL = 3.5
const WANDER_ACCEL = 14

const LARGE_HIT_ANGLE = FACE_ANGLE * 1.1
const MEDIUM_WAVE_RATE = 6
const MEDIUM_PATTERN_MIN = 3
const MEDIUM_PATTERN_MAX = 5
const MEDIUM_HP = 2
const LARGE_HP = 10
const PARTICLE_COUNT = 8
const PARTICLE_SPEED = 120
const PARTICLE_LIFE = 0.6
const MAX_SHIELDS = 5
const SCORE_SMALL = 10
const SCORE_MEDIUM = 50
const SCORE_LARGE = 200
const PLAYER_HIT_ANGLE = FACE_ANGLE * 0.4
const SHIELD_RESTORE = 1

const ENTITY_RADIUS = RADIUS * 0.85

const BOSS_ENABLED = false

const UPGRADE_DURATION = 15
const SIDE_CANNON_ANGLE = Math.PI / 9   // 20° off axis
const SIDE_CANNON_SPIRAL_RATE = Math.PI / 2
const UPGRADES = ['dualCannons', 'largerAmmo', 'firingRate', 'sideCannons']
const UPGRADE_LABELS = { dualCannons: 'DUAL CANNONS', largerAmmo: 'BIG SHOTS', firingRate: 'RAPID FIRE', sideCannons: 'SIDE CANNONS' }

const MEDIUM_WAVE_AMP = Math.PI / 3              // 60° half-swing → 120° total ≈ 1/3 circumference
const MEDIUM_WAVE_FREQ = (2 * Math.PI) / (20 * RING_STEP) // full cycle per 20 ring-steps (slow spatial wave)
const PLAYER_FLASH_DURATION = 0.5

const BOSS_REST_Z = 630
const BOSS_OUTER_R = ENTITY_RADIUS
const BOSS_INNER_R = RADIUS * 0.62
const BOSS_SPEED = 3200
const BOSS_POINTS = 16
const BOSS_POINT_HP = 2
const BOSS_HIT_HALF_ANGLE = (Math.PI / BOSS_POINTS) * 0.7
const BOSS_JAG_COUNT = 4
const BOSS_JAG_AMP = BOSS_INNER_R * 0.12
const BOSS_FLASH_DUR = 0.08
const BOSS_SHOT_SPEED = 323
const BOSS_SHOT_HIT_ANGLE = FACE_ANGLE * 0.55
const MINE_SPEED = 250
const MINE_HP = 1
const MINE_HIT_ANGLE = FACE_ANGLE * 0.55
const MINE_EXPLODE_HALF_ANGLE = Math.PI / 5
const MINE_EXPLODE_Z_RANGE = 200
const MINE_BLAST_RADIUS = 80
const MINE_BLAST_SPEED = 450
const MINE_SPAWN_INTERVAL_MIN = 2.0
const MINE_SPAWN_INTERVAL_MAX = 4.0
const WALL_SPEED = 80
const WALL_HP = 2
const WALL_HALF_ANGLE = FACE_ANGLE           // total = 2 face widths
const WALL_WAVE_COUNT = 3
const WALL_WAVE_GAP = 0.7
const WALL_GROW_DURATION = 0.15
const LASER_TRAIL_LENGTH = 30
const ATTACK_COLUMN_GAP = 0.4
const ATTACK_SPIRAL_INTERVAL = 0.08
const ATTACK_COOLDOWN_MIN = 0.5
const ATTACK_COOLDOWN_MAX = 1.0

const SHIP_DEPTH = 25
const SHIP_HALF_FACE = Math.PI / (SIDES * 2)

// Ship model-space vertices (XY only; Z assigned per vertex at render time)
const SHIP_BL = [Math.cos(Math.PI / 2 - SHIP_HALF_FACE) * ENTITY_RADIUS, Math.sin(Math.PI / 2 - SHIP_HALF_FACE) * ENTITY_RADIUS]
const SHIP_BR = [Math.cos(Math.PI / 2 + SHIP_HALF_FACE) * ENTITY_RADIUS, Math.sin(Math.PI / 2 + SHIP_HALF_FACE) * ENTITY_RADIUS]
const SHIP_AP = [0, ENTITY_RADIUS * 0.78]

const CANNON_CIRCLE_R = RADIUS * 0.036
const CANNON_CIRCLE_N = 16

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    const { width, height } = this.scale
    this.cx = width / 2
    this.vpY = height / 3
    this.dpr = width / 390
    this.focal = 400 * this.dpr
    this.gfx = this.add.graphics()

    this.baseAngle = BASE_ANGLE_ORIGIN
    this.playerTilt = 0
    this.rotNorm = 0
    this.isDragging = false
    this.resolving = false

    this.rings = Array.from({ length: RINGS }, (_, i) => ({
      z: Z_RECYCLE + (i + 1) * RING_STEP,
    }))

    this.shots = []
    this.shotTimer = 0

    this.enemies = []
    this.enemySpawnTimer = 0

    this.shields = MAX_SHIELDS
    this.score = 0
    this.particles = []
    this.pickups = []
    this.upgrades = {}
    this.playerFlash = 0
    this.mediumWaveTimer = MEDIUM_WAVE_RATE
    this.mediumPatterns = {}
    this.nextPatternId = 0
    this.largeWaveCountdown = 3 + Math.floor(Math.random() * 2)
    this.gameActive = true
    this.dying = false
    this.bossCountdown = 90
    this.bossShots = []
    this.mines = []
    this.blasts = []
    this.walls = []
    this.bossAttack = null
    this.bossAttackCooldown = 0
    this.wallAttackCooldown = 0

    this.bossMode = false
    this.boss = null

    this.registry.set('score', 0)
    this.registry.set('shields', MAX_SHIELDS)
    this.registry.set('maxShields', MAX_SHIELDS)
    this.registry.set('upgrades', {})
    this.scene.stop('HUDScene')
    this.scene.launch('HUDScene')

    // Reused each frame — rebuilt via identity() + transforms
    this.cylMat = new Phaser.Math.Matrix4()
    this.shipMat = new Phaser.Math.Matrix4()

    // Cannon centroid, updated by drawPlayer(), used for shot spawn
    this.cannonCenter = {
      x: 0,
      y: (SHIP_BL[1] + SHIP_BR[1] + SHIP_AP[1]) / 3,
      z: Z_PLAYER + SHIP_DEPTH / 3,
    }

    this.input.on('pointerdown', (p) => {
      this.tweens.killTweensOf(this)
      this.resolving = false
      this.isDragging = true
      this.rotNorm = (p.x - this.cx) / this.cx
    })
    this.input.on('pointermove', (p) => {
      if (this.isDragging) this.rotNorm = (p.x - this.cx) / this.cx
    })
    this.input.on('pointerup', () => {
      if (!this.isDragging) return
      this.isDragging = false
      this.snapToNextFace()
    })
  }

  snapToNextFace() {
    if (this.resolving || this.rotNorm === 0) return
    const fractN = (this.baseAngle - BASE_ANGLE_ORIGIN) / FACE_ANGLE
    let targetN
    if (this.rotNorm > 0) {
      targetN = Math.floor(fractN + 1e-9) + 1
    } else {
      targetN = Math.ceil(fractN - 1e-9) - 1
    }
    this.resolving = true
    this.tweens.add({
      targets: this,
      baseAngle: BASE_ANGLE_ORIGIN + targetN * FACE_ANGLE,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.resolving = false
        this.rotNorm = 0
      },
    })
  }

  // Final step of the 3D pipeline: world (x, y, z) → screen (sx, sy).
  // y must already include yOffset before calling.
  project(x, y, z) {
    const s = this.focal / z
    return [this.cx + x * s, this.vpY + y * s]
  }

  xOffset(z) {
    return this.yOffset(z) * (this.playerTilt / MAX_TILT) * -0.5
  }

  // Visual-only parabolic Y offset applied in world space before projecting.
  // Gives the illusion the tunnel curves; does not affect game logic.
  yOffset(z) {
    const dz = z - Z_MID
    if (dz <= 0) {
      const t = dz / CURVE_HALF_SPAN
      if (t < -1) return 0
      return CURVE_PEAK * (t * t - 1)
    } else {
      const t = dz / (Z_FAR - Z_MID)
      if (t > 1) return 0
      return CURVE_PEAK * (t * t - 1)
    }
  }

  // Apply a Phaser.Math.Matrix4 to a 2D world-space point (XY only).
  // Z is managed separately for each vertex.
  applyMat2D(mat, x, y) {
    const v = mat.val
    return [v[0] * x + v[4] * y + v[12], v[1] * x + v[5] * y + v[13]]
  }

  pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
    const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by)
    const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy)
    const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay)
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0
    return !(hasNeg && hasPos)
  }

  depthAlpha(z) {
    if (z <= Z_FADE_START) return 1
    return Math.max(0, (Z_FAR - z) / (Z_FAR - Z_FADE_START))
  }

  // Ring vertices: local-space angle → cylMat (Rz by baseAngle) → world XY → project.
  buildRing(z) {
    const xOff = this.xOffset(z)
    const yOff = this.yOffset(z)
    const pts = []
    for (let i = 0; i < SIDES; i++) {
      const localAngle = (i / SIDES) * Math.PI * 2
      const [wx, wy] = this.applyMat2D(this.cylMat, Math.cos(localAngle) * RADIUS, Math.sin(localAngle) * RADIUS)
      const [px, py] = this.project(wx + xOff, wy + yOff, z)
      pts.push([px, py])
    }
    return pts
  }

  drawPlayer() {
    const flashOn = this.playerFlash > 0 && (Math.floor(this.playerFlash * 10) % 2 === 0)
    const shipColor = flashOn ? 0xff0000 : 0x00ffff
    const shipXOff = this.xOffset(Z_PLAYER)

    const [BLx, BLy] = this.applyMat2D(this.shipMat, ...SHIP_BL)
    const [BRx, BRy] = this.applyMat2D(this.shipMat, ...SHIP_BR)
    const [APx, APy] = this.applyMat2D(this.shipMat, ...SHIP_AP)

    const [lsx, lsy] = this.project(BLx + shipXOff, BLy + this.yOffset(Z_PLAYER), Z_PLAYER)
    const [rsx, rsy] = this.project(BRx + shipXOff, BRy + this.yOffset(Z_PLAYER), Z_PLAYER)
    const [asx, asy] = this.project(APx + shipXOff, APy + this.yOffset(Z_PLAYER + SHIP_DEPTH), Z_PLAYER + SHIP_DEPTH)

    this.gfx.fillStyle(0x000000, 1)
    this.gfx.fillTriangle(lsx, lsy, rsx, rsy, asx, asy)
    this.gfx.lineStyle(2 * this.dpr, shipColor, 1)
    this.gfx.strokeTriangle(lsx, lsy, rsx, rsy, asx, asy)

    const cX = (BLx + BRx + APx) / 3
    const cY = (BLy + BRy + APy) / 3
    const cZ = Z_PLAYER + SHIP_DEPTH / 3

    const tw = (this.upgrades.largerAmmo ? 2.5 : 1.5) * CANNON_CIRCLE_R
    const th = (this.upgrades.firingRate ? 2.0 : 3.0) * CANNON_CIRCLE_R
    const nZ = cZ
    const fZ = cZ + th

    const drawBarrel = (bx, by, halfW) => {
      const [t0x, t0y] = this.project(bx - halfW + shipXOff, by + this.yOffset(nZ), nZ)
      const [t1x, t1y] = this.project(bx + halfW + shipXOff, by + this.yOffset(nZ), nZ)
      const [t2x, t2y] = this.project(bx + halfW + shipXOff, by + this.yOffset(fZ), fZ)
      const [t3x, t3y] = this.project(bx - halfW + shipXOff, by + this.yOffset(fZ), fZ)
      this.gfx.fillStyle(0x000000, 1)
      this.gfx.fillTriangle(t0x, t0y, t1x, t1y, t2x, t2y)
      this.gfx.fillTriangle(t0x, t0y, t2x, t2y, t3x, t3y)
      this.gfx.lineStyle(1.5 * this.dpr, shipColor, 1)
      this.gfx.strokePoints([{x:t0x,y:t0y},{x:t1x,y:t1y},{x:t2x,y:t2y},{x:t3x,y:t3y}], true)
    }

    if (this.upgrades.dualCannons) {
      const rlen = Math.hypot(cX, cY)
      const tx = -cY / rlen, ty = cX / rlen
      const off = tw * 0.7
      drawBarrel(cX + tx * off, cY + ty * off, tw * 0.4)
      drawBarrel(cX - tx * off, cY - ty * off, tw * 0.4)
    } else {
      drawBarrel(cX, cY, tw / 2)
    }

    if (this.upgrades.sideCannons) {
      const wa = Math.atan2(cY, cX)
      const rlen = Math.hypot(cX, cY)
      for (const sideOff of [-SIDE_CANNON_ANGLE, SIDE_CANNON_ANGLE]) {
        const sx = Math.cos(wa + sideOff) * rlen
        const sy = Math.sin(wa + sideOff) * rlen
        const [ln0x, ln0y] = this.project(cX + shipXOff, cY + this.yOffset(nZ), nZ)
        const [ln1x, ln1y] = this.project(sx + shipXOff, sy + this.yOffset(fZ), fZ)
        this.gfx.lineStyle(1 * this.dpr, shipColor, 1)
        this.gfx.lineBetween(ln0x, ln0y, ln1x, ln1y)
      }
    }

    const e1x = BRx - BLx, e1y = BRy - BLy
    const e2x = APx - BLx, e2y = APy - BLy

    const e1len = Math.sqrt(e1x * e1x + e1y * e1y)
    const ux = e1x / e1len, uy = e1y / e1len

    const nx = e1y * SHIP_DEPTH
    const ny = -e1x * SHIP_DEPTH
    const nz = e1x * e2y - e1y * e2x
    const nlen = Math.sqrt(nx * nx + ny * ny + nz * nz)

    const vx = -(nz / nlen) * uy
    const vy =  (nz / nlen) * ux
    const vz = (nx * uy - ny * ux) / nlen

    const r = CANNON_CIRCLE_R
    const pts = []
    for (let i = 0; i < CANNON_CIRCLE_N; i++) {
      const phi = (i / CANNON_CIRCLE_N) * Math.PI * 2
      const cp = Math.cos(phi), sp = Math.sin(phi)
      const px = cX + r * (cp * ux + sp * vx)
      const py = cY + r * (cp * uy + sp * vy)
      const pz = cZ + r * sp * vz
      const [sx, sy] = this.project(px + shipXOff, py + this.yOffset(pz), pz)
      pts.push({ x: sx, y: sy })
    }

    const [ccx, ccy] = this.project(cX + shipXOff, cY + this.yOffset(cZ), cZ)
    this.gfx.fillStyle(0x000000, 1)
    for (let i = 0; i < CANNON_CIRCLE_N; i++) {
      const next = (i + 1) % CANNON_CIRCLE_N
      this.gfx.fillTriangle(ccx, ccy, pts[i].x, pts[i].y, pts[next].x, pts[next].y)
    }
    this.gfx.lineStyle(1.5 * this.dpr, shipColor, 1)
    this.gfx.strokePoints(pts, true)

    this.cannonCenter = { x: cX, y: cY, z: fZ + CANNON_CIRCLE_R }
  }

  update(time, delta) {
    if (!this.gameActive) return
    const dt = delta / 1000

    if (this.isDragging && !this.resolving) {
      this.baseAngle += this.rotNorm * MAX_ROT_SPEED * dt
      this.playerTilt += (this.rotNorm * MAX_TILT - this.playerTilt) * 0.2
    } else {
      this.playerTilt += (0 - this.playerTilt) * 0.15
    }

    this.cylMat.identity()
    this.cylMat.rotateZ(this.baseAngle)

    const pivotY = Math.cos(SHIP_HALF_FACE) * RADIUS
    this.shipMat.identity()
    this.shipMat.translateXYZ(0, pivotY, 0)
    this.shipMat.rotateZ(this.playerTilt)
    this.shipMat.translateXYZ(0, -pivotY, 0)

    // --- upgrade timers ---
    for (const key of Object.keys(this.upgrades)) {
      this.upgrades[key] -= dt
      if (this.upgrades[key] <= 0) delete this.upgrades[key]
    }
    this.registry.set('upgrades', { ...this.upgrades })
    if (this.playerFlash > 0) this.playerFlash = Math.max(0, this.playerFlash - dt)

    // --- physics ---

    for (const shot of this.shots) shot.zPrev = shot.z
    for (const enemy of this.enemies) enemy.zPrev = enemy.z

    const fireRate = this.upgrades.firingRate ? SHOT_FIRE_RATE * 0.5 : SHOT_FIRE_RATE
    const shotDamage = this.upgrades.largerAmmo ? 2 : 1
    if (!this.dying) this.shotTimer += dt
    while (this.shotTimer >= fireRate) {
      this.shotTimer -= fireRate
      const c = this.cannonCenter
      const cannonAngle = Math.atan2(c.y, c.x) - this.baseAngle
      const r = Math.hypot(c.x, c.y)
      const mainAngles = this.upgrades.dualCannons
        ? [cannonAngle - FACE_ANGLE * 0.5, cannonAngle + FACE_ANGLE * 0.5]
        : [cannonAngle]
      for (const angle of mainAngles) {
        this.shots.push({ cylinderAngle: angle, radius: r, z: c.z, zPrev: c.z, damage: shotDamage })
      }
      if (this.upgrades.sideCannons) {
        for (const sideOff of [-SIDE_CANNON_ANGLE, SIDE_CANNON_ANGLE]) {
          this.shots.push({
            cylinderAngle: cannonAngle + sideOff,
            radius: r, z: c.z, zPrev: c.z,
            damage: shotDamage,
            spiralRate: sideOff > 0 ? SIDE_CANNON_SPIRAL_RATE : -SIDE_CANNON_SPIRAL_RATE,
          })
        }
      }
    }

    for (const shot of this.shots) {
      shot.z += SHOT_SPEED * dt
      if (shot.spiralRate) shot.cylinderAngle += shot.spiralRate * dt
    }

    if (!this.bossMode) {
      // Spawn small enemies
      this.enemySpawnTimer -= dt
      if (this.enemySpawnTimer <= 0) {
        this.enemySpawnTimer = ENEMY_SPAWN_RATE
        const lane = Math.floor(Math.random() * SIDES)
        this.enemies.push({
          type: 'small',
          cylinderAngle: (lane + 0.5) * FACE_ANGLE,
          angVel: 0,
          z: Z_FAR,
          zPrev: Z_FAR,
          age: 0,
          hp: 1,
        })
      }

      // Spawn medium wave; large enemy piggybacks every 3-4 medium waves
      this.mediumWaveTimer -= dt
      if (this.mediumWaveTimer <= 0) {
        this.mediumWaveTimer = MEDIUM_WAVE_RATE
        const count = MEDIUM_PATTERN_MIN + Math.floor(Math.random() * (MEDIUM_PATTERN_MAX - MEDIUM_PATTERN_MIN + 1))
        const pid = this.nextPatternId++
        this.mediumPatterns[pid] = count
        const baseLane = Math.floor(Math.random() * SIDES)
        const waveCenter = (baseLane + 0.5) * FACE_ANGLE
        for (let i = 0; i < count; i++) {
          const spawnZ = Z_FAR - i * RING_STEP
          this.enemies.push({
            type: 'medium',
            patternId: pid,
            cylinderAngle: waveCenter + MEDIUM_WAVE_AMP * Math.sin(MEDIUM_WAVE_FREQ * spawnZ),
            waveCenter,
            z: spawnZ,
            zPrev: spawnZ,
            age: 0,
            hp: MEDIUM_HP,
          })
        }
        if (--this.largeWaveCountdown <= 0) {
          this.largeWaveCountdown = 3 + Math.floor(Math.random() * 2)
          this.enemies.push({
            type: 'large',
            cylinderAngle: (Math.floor(Math.random() * SIDES) + 0.5) * FACE_ANGLE,
            z: Z_FAR,
            zPrev: Z_FAR,
            age: 0,
            hp: LARGE_HP,
          })
        }
      }
    }

    // Boss respawn countdown
    if (BOSS_ENABLED && !this.bossMode && this.bossCountdown > 0) {
      this.bossCountdown -= dt
      if (this.bossCountdown <= 0) {
        this.bossMode = true
        this.boss = {
          z: Z_FAR + 600,
          angle: 0,
          points: Array.from({ length: BOSS_POINTS }, () => ({ hp: BOSS_POINT_HP, alive: true, jags: null, flash: 0 })),
          mineTimers: Array.from({ length: BOSS_POINTS }, () => MINE_SPAWN_INTERVAL_MIN + Math.random() * (MINE_SPAWN_INTERVAL_MAX - MINE_SPAWN_INTERVAL_MIN)),
        }
      }
    }

    // Boss approach
    if (this.boss) {
      if (this.boss.z > BOSS_REST_Z) {
        this.boss.z = Math.max(BOSS_REST_Z, this.boss.z - BOSS_SPEED * dt)
      }
      this.boss.angle += 0.25 * dt
      for (const bp of this.boss.points) {
        if (bp.flash > 0) bp.flash = Math.max(0, bp.flash - dt)
      }
    }

    this.tickBossAttack(dt)

    // Move enemies
    for (const enemy of this.enemies) {
      enemy.age += dt
      enemy.z -= (enemy.type === 'large' ? SPEED : SPEED + ENEMY_SPEED_DELTA) * dt
      if (enemy.flash > 0) enemy.flash = Math.max(0, enemy.flash - dt)
      if (enemy.type === 'small') {
        enemy.angVel += (Math.random() - 0.5) * WANDER_ACCEL * dt
        enemy.angVel = Math.max(-WANDER_MAX_VEL, Math.min(WANDER_MAX_VEL, enemy.angVel))
        enemy.cylinderAngle += enemy.angVel * dt
      } else if (enemy.type === 'medium') {
        enemy.cylinderAngle = enemy.waveCenter + MEDIUM_WAVE_AMP * Math.sin(MEDIUM_WAVE_FREQ * enemy.z)
      }
    }

    for (const s of this.bossShots) { s.zPrev = s.z; s.z -= BOSS_SHOT_SPEED * dt }
    for (const m of this.mines) { m.zPrev = m.z; m.z -= MINE_SPEED * dt; m.cylinderAngle += m.angVel * dt; if (m.flash > 0) m.flash = Math.max(0, m.flash - dt) }
    for (const w of this.walls) { w.zPrev = w.z; w.z -= WALL_SPEED * dt; if (w.flash > 0) w.flash = Math.max(0, w.flash - dt); w.growTimer = Math.min(WALL_GROW_DURATION, (w.growTimer || 0) + dt) }

    for (const pickup of this.pickups) pickup.z -= SPEED * dt

    for (const p of this.particles) {
      p.wx += p.vx * dt
      p.wy += p.vy * dt
      p.z -= SPEED * dt
      p.life -= dt
    }

    // Swept bullet-enemy collision
    const deadShots = new Set()
    const deadEnemies = new Set()
    for (let si = 0; si < this.shots.length; si++) {
      const shot = this.shots[si]
      for (let ei = 0; ei < this.enemies.length; ei++) {
        if (deadEnemies.has(ei)) continue
        const enemy = this.enemies[ei]
        if (shot.zPrev <= enemy.zPrev && shot.z >= enemy.z && this.depthAlpha(enemy.z) >= 0.25) {
          const hitAngle = enemy.type === 'large' ? LARGE_HIT_ANGLE : ENEMY_HIT_ANGLE
          let da = shot.cylinderAngle - enemy.cylinderAngle
          da -= Math.round(da / (Math.PI * 2)) * (Math.PI * 2)
          if (Math.abs(da) < hitAngle) {
            deadShots.add(si)
            const dmgDone = (shot.damage || 1)
            if ((enemy.hp -= dmgDone) <= 0) {
              deadEnemies.add(ei)
              this.addScore(enemy.type === 'large' ? SCORE_LARGE : enemy.type === 'medium' ? SCORE_MEDIUM : SCORE_SMALL)
              const wa = enemy.cylinderAngle + this.baseAngle
              this.spawnExplosion(Math.cos(wa) * ENTITY_RADIUS, Math.sin(wa) * ENTITY_RADIUS, enemy.z,
                enemy.type === 'large' ? 0x44aaff : enemy.type === 'medium' ? 0xaa00ff : 0xff4400)
              if (enemy.type === 'medium') {
                const pid = enemy.patternId
                if (this.mediumPatterns[pid] !== undefined && --this.mediumPatterns[pid] <= 0) {
                  delete this.mediumPatterns[pid]
                  this.pickups.push({ type: 'shield', cylinderAngle: enemy.cylinderAngle, z: enemy.z })
                }
              } else if (enemy.type === 'large') {
                const upgradeType = UPGRADES[Math.floor(Math.random() * UPGRADES.length)]
                this.pickups.push({ type: 'weapon', upgradeType, cylinderAngle: enemy.cylinderAngle, z: enemy.z })
              }
            } else {
              enemy.flash = 0.07
            }
          }
        }
      }
    }

    // Boss point collision
    if (this.boss) {
      for (let si = 0; si < this.shots.length; si++) {
        if (!this.boss) break
        if (deadShots.has(si)) continue
        const shot = this.shots[si]
        if (!(shot.zPrev <= this.boss.z && shot.z >= this.boss.z)) continue
        const shotWorldAngle = shot.cylinderAngle + this.baseAngle
        for (let p = 0; p < BOSS_POINTS; p++) {
          const bp = this.boss.points[p]
          if (!bp.alive) continue
          const pointWorldAngle = (p / BOSS_POINTS) * Math.PI * 2 + this.boss.angle + this.baseAngle
          let da = shotWorldAngle - pointWorldAngle
          da -= Math.round(da / (Math.PI * 2)) * (Math.PI * 2)
          if (Math.abs(da) < BOSS_HIT_HALF_ANGLE) {
            deadShots.add(si)
            bp.hp -= shot.damage || 1
            if (bp.hp <= 0) {
              bp.alive = false
              bp.jags = Array.from({ length: BOSS_JAG_COUNT }, () => (Math.random() - 0.5) * 2 * BOSS_JAG_AMP)
              if (this.boss.points.every(b => !b.alive)) this.defeatBoss()
            } else {
              bp.flash = BOSS_FLASH_DUR
            }
            break
          }
        }
      }
    }

    // Player shots vs mines
    const deadMines = new Set()
    for (let si = 0; si < this.shots.length; si++) {
      if (deadShots.has(si)) continue
      const shot = this.shots[si]
      for (let mi = 0; mi < this.mines.length; mi++) {
        if (deadMines.has(mi)) continue
        const mine = this.mines[mi]
        if (shot.zPrev <= mine.zPrev && shot.z >= mine.z) {
          let da = shot.cylinderAngle - mine.cylinderAngle
          da -= Math.round(da / (Math.PI * 2)) * (Math.PI * 2)
          if (Math.abs(da) < MINE_HIT_ANGLE) {
            deadShots.add(si)
            mine.hp -= shot.damage || 1
            if (mine.hp <= 0) this.triggerMineExplosion(mi, deadMines)
            else mine.flash = 0.07
            break
          }
        }
      }
    }

    // Player shots vs walls
    const deadWalls = new Set()
    for (let si = 0; si < this.shots.length; si++) {
      if (deadShots.has(si)) continue
      const shot = this.shots[si]
      for (let wi = 0; wi < this.walls.length; wi++) {
        if (deadWalls.has(wi)) continue
        const wall = this.walls[wi]
        if (shot.zPrev <= wall.zPrev && shot.z >= wall.z) {
          let da = shot.cylinderAngle - wall.cylinderAngle
          da -= Math.round(da / (Math.PI * 2)) * (Math.PI * 2)
          if (Math.abs(da) < WALL_HALF_ANGLE) {
            deadShots.add(si)
            wall.hp -= shot.damage || 1
            if (wall.hp <= 0) {
              deadWalls.add(wi)
              const wa = wall.cylinderAngle + this.baseAngle
              this.spawnExplosion(Math.cos(wa) * ENTITY_RADIUS, Math.sin(wa) * ENTITY_RADIUS, wall.z, 0x886600)
            } else {
              wall.flash = 0.07
            }
            break
          }
        }
      }
    }

    // Player-enemy collision (swept — enemies continue to Z_DESPAWN before removal)
    for (let ei = 0; ei < this.enemies.length; ei++) {
      if (deadEnemies.has(ei)) continue
      const enemy = this.enemies[ei]
      if (!enemy.passed && enemy.zPrev > Z_PLAYER && enemy.z <= Z_PLAYER) {
        enemy.passed = true
        let da = (enemy.cylinderAngle + this.baseAngle) - Math.PI / 2
        da -= Math.round(da / (Math.PI * 2)) * (Math.PI * 2)
        if (Math.abs(da) < PLAYER_HIT_ANGLE) {
          const dmg = enemy.type === 'large' ? 5 : enemy.type === 'medium' ? 2 : 1
          this.drainShields(dmg)
          this.playerFlash = PLAYER_FLASH_DURATION
          this.spawnExplosion(0, ENTITY_RADIUS, Z_PLAYER, 0xffffff)
        }
      }
    }

    // Boss shots vs player (triangle hull hit detection)
    const deadBossShots = new Set()
    const [BLx, BLy] = this.applyMat2D(this.shipMat, ...SHIP_BL)
    const [BRx, BRy] = this.applyMat2D(this.shipMat, ...SHIP_BR)
    const [APx, APy] = this.applyMat2D(this.shipMat, ...SHIP_AP)
    const [OPx, OPy] = this.applyMat2D(this.shipMat, 0, ENTITY_RADIUS)
    for (let si = 0; si < this.bossShots.length; si++) {
      const s = this.bossShots[si]
      if (s.zPrev > Z_PLAYER && s.z <= Z_PLAYER) {
        const wa = s.cylinderAngle + this.baseAngle
        const lx = Math.cos(wa) * ENTITY_RADIUS
        const ly = Math.sin(wa) * ENTITY_RADIUS
        if (this.pointInTriangle(lx, ly, APx, APy, BLx, BLy, OPx, OPy) ||
            this.pointInTriangle(lx, ly, APx, APy, OPx, OPy, BRx, BRy)) {
          this.drainShields(0.5)
          this.playerFlash = PLAYER_FLASH_DURATION
          this.spawnExplosion(0, ENTITY_RADIUS, Z_PLAYER, 0xff2200)
        }
        deadBossShots.add(si)
      }
    }

    // Mines vs player (swept)
    for (let mi = 0; mi < this.mines.length; mi++) {
      if (deadMines.has(mi)) continue
      const mine = this.mines[mi]
      if (!mine.passed && mine.zPrev > Z_PLAYER && mine.z <= Z_PLAYER) {
        mine.passed = true
        this.triggerMineExplosion(mi, deadMines)
      }
    }

    // Mine blast expansion — delayed damage until circle reaches each object
    for (const blast of this.blasts) {
      blast.radius += MINE_BLAST_SPEED * dt
      const bwa = blast.cylinderAngle + this.baseAngle
      if (!blast.hitPlayer) {
        let da = bwa - Math.PI / 2
        da -= Math.round(da / (Math.PI * 2)) * (Math.PI * 2)
        const arcDist = Math.abs(da) * ENTITY_RADIUS
        const zDist = Math.abs(blast.z - Z_PLAYER)
        if (Math.abs(da) < MINE_EXPLODE_HALF_ANGLE && zDist < MINE_EXPLODE_Z_RANGE &&
            blast.radius >= Math.sqrt(arcDist * arcDist + zDist * zDist)) {
          blast.hitPlayer = true
          this.drainShields(0.5)
          this.playerFlash = PLAYER_FLASH_DURATION
        }
      }
      for (let mj = 0; mj < this.mines.length; mj++) {
        if (deadMines.has(mj)) continue
        const other = this.mines[mj]
        if (blast.hitMines.has(other)) continue
        let da2 = (other.cylinderAngle + this.baseAngle) - bwa
        da2 -= Math.round(da2 / (Math.PI * 2)) * (Math.PI * 2)
        const arcDist2 = Math.abs(da2) * ENTITY_RADIUS
        const zDist2 = Math.abs(other.z - blast.z)
        if (Math.abs(da2) < MINE_EXPLODE_HALF_ANGLE && zDist2 < MINE_EXPLODE_Z_RANGE &&
            blast.radius >= Math.sqrt(arcDist2 * arcDist2 + zDist2 * zDist2)) {
          blast.hitMines.add(other)
          this.triggerMineExplosion(mj, deadMines)
        }
      }
    }
    this.blasts = this.blasts.filter(b => b.radius < MINE_BLAST_RADIUS)

    // Walls vs player (swept — walls continue to Z_DESPAWN before removal)
    for (let wi = 0; wi < this.walls.length; wi++) {
      if (deadWalls.has(wi)) continue
      const wall = this.walls[wi]
      if (!wall.passed && wall.zPrev > Z_PLAYER && wall.z <= Z_PLAYER) {
        wall.passed = true
        let da = (wall.cylinderAngle + this.baseAngle) - Math.PI / 2
        da -= Math.round(da / (Math.PI * 2)) * (Math.PI * 2)
        if (Math.abs(da) < WALL_HALF_ANGLE) {
          this.drainShields(0.5)
          this.playerFlash = PLAYER_FLASH_DURATION
          this.spawnExplosion(0, ENTITY_RADIUS, Z_PLAYER, 0x886600)
        }
      }
    }

    // Pickup collection
    const deadPickups = new Set()
    for (let pi = 0; pi < this.pickups.length; pi++) {
      const pickup = this.pickups[pi]
      if (pickup.z <= Z_PLAYER) {
        let da = (pickup.cylinderAngle + this.baseAngle) - Math.PI / 2
        da -= Math.round(da / (Math.PI * 2)) * (Math.PI * 2)
        if (Math.abs(da) < FACE_ANGLE) {
          const pa = pickup.cylinderAngle + this.baseAngle
          const pwx = Math.cos(pa) * ENTITY_RADIUS + this.xOffset(pickup.z)
          const pwy = Math.sin(pa) * ENTITY_RADIUS + this.yOffset(pickup.z)
          const [psx, psy] = this.project(pwx, pwy, pickup.z)
          if (pickup.type === 'weapon') {
            this.upgrades[pickup.upgradeType] = UPGRADE_DURATION
            this.spawnPickupAnim(psx, psy, 0xffff00, UPGRADE_LABELS[pickup.upgradeType] + '!', { x: 374 * this.dpr, y: 54 * this.dpr })
          } else {
            this.shields = Math.min(MAX_SHIELDS, this.shields + SHIELD_RESTORE)
            this.registry.set('shields', this.shields)
            this.spawnPickupAnim(psx, psy, 0x00ffff, 'SHIELDS +' + SHIELD_RESTORE, { x: 127 * this.dpr, y: 29 * this.dpr })
          }
        }
        deadPickups.add(pi)
      }
    }

    this.shots = this.shots.filter((s, i) => !deadShots.has(i) && s.z < Z_FAR)
    this.enemies = this.enemies.filter((e, i) => !deadEnemies.has(i) && e.z > Z_DESPAWN)
    this.pickups = this.pickups.filter((p, i) => !deadPickups.has(i) && p.z > Z_DESPAWN)
    this.particles = this.particles.filter(p => p.life > 0 && p.z > Z_DESPAWN)
    this.bossShots = this.bossShots.filter((s, i) => !deadBossShots.has(i) && s.z > Z_DESPAWN)
    this.mines = this.mines.filter((m, i) => !deadMines.has(i) && m.z > Z_DESPAWN)
    this.walls = this.walls.filter((w, i) => !deadWalls.has(i) && w.z > Z_DESPAWN)

    // --- rings ---

    for (const r of this.rings) r.z -= SPEED * dt
    let maxZ = Math.max(...this.rings.map(r => r.z))
    for (const r of this.rings) {
      if (r.z < Z_RECYCLE) { maxZ += RING_STEP; r.z = maxZ }
    }

    const frames = this.rings
      .slice()
      .sort((a, b) => a.z - b.z)
      .map(r => ({ z: r.z, pts: this.buildRing(r.z), alpha: this.depthAlpha(r.z) }))

    // --- draw ---

    this.gfx.clear()

    const nearAnchor = { pts: this.buildRing(Z_RECYCLE), alpha: 1 }
    const radialFrames = [nearAnchor, ...frames]

    for (let i = 0; i < SIDES; i++) {
      for (let r = 0; r < radialFrames.length - 1; r++) {
        const alpha = Math.min(radialFrames[r].alpha, radialFrames[r + 1].alpha)
        if (alpha <= 0) continue
        this.gfx.lineStyle(1 * this.dpr, 0x00ff00, alpha)
        const [x1, y1] = radialFrames[r].pts[i]
        const [x2, y2] = radialFrames[r + 1].pts[i]
        this.gfx.lineBetween(x1, y1, x2, y2)
      }
    }

    for (const { pts, alpha } of frames) {
      if (alpha <= 0) continue
      this.gfx.lineStyle(1 * this.dpr, 0x00ff00, alpha)
      for (let i = 0; i < SIDES; i++) {
        const [x1, y1] = pts[i]
        const [x2, y2] = pts[(i + 1) % SIDES]
        this.gfx.lineBetween(x1, y1, x2, y2)
      }
    }

    if (!this.dying) this.drawPlayer()

    for (const shot of this.shots) {
      const alpha = this.depthAlpha(shot.z)
      if (alpha <= 0) continue
      const worldAngle = shot.cylinderAngle + this.baseAngle
      const xOff = this.xOffset(shot.z)
      const yOff = this.yOffset(shot.z)
      const [px, py] = this.project(
        Math.cos(worldAngle) * shot.radius + xOff,
        Math.sin(worldAngle) * shot.radius + yOff,
        shot.z
      )
      const damageScale = (shot.damage || 1) > 1 ? 2.2 : 1.0
      const sr = SHOT_WORLD_RADIUS * damageScale * this.focal / shot.z
      this.gfx.fillStyle(0x000000, alpha)
      this.gfx.fillCircle(px, py, sr)
      this.gfx.lineStyle((shot.damage > 1 ? 2 : 1) * this.dpr, 0xffff00, alpha)
      this.gfx.strokeCircle(px, py, sr)
    }

    for (const enemy of this.enemies) {
      const alpha = this.depthAlpha(enemy.z)
      if (alpha <= 0) continue
      const worldAngle = enemy.cylinderAngle + this.baseAngle
      const xOff = this.xOffset(enemy.z)
      const yOff = this.yOffset(enemy.z)
      const cosA = Math.cos(worldAngle)
      const sinA = Math.sin(worldAngle)
      const cx = cosA * ENTITY_RADIUS
      const cy = sinA * ENTITY_RADIUS
      const isLarge = enemy.type === 'large'
      const isMedium = enemy.type === 'medium'
      const tSize = isLarge ? ENEMY_SIZE * 2.5 : isMedium ? ENEMY_SIZE * 1.5 : ENEMY_SIZE
      const rSize = isLarge ? ENEMY_SIZE * 1.2 : isMedium ? ENEMY_SIZE * 1.2 : ENEMY_SIZE
      const fillColor = isLarge ? 0x0044ff : isMedium ? 0xaa00ff : 0xff4400
      const strokeColor = isLarge ? 0x44aaff : isMedium ? 0xff00ff : 0xff8800

      const [p0x, p0y] = this.project(cx + cosA * rSize + xOff, cy + sinA * rSize + yOff, enemy.z)
      const [p1x, p1y] = this.project(cx - sinA * tSize + xOff, cy + cosA * tSize + yOff, enemy.z)
      const [p2x, p2y] = this.project(cx - cosA * rSize + xOff, cy - sinA * rSize + yOff, enemy.z)
      const [p3x, p3y] = this.project(cx + sinA * tSize + xOff, cy - cosA * tSize + yOff, enemy.z)

      const eFlash = enemy.flash > 0
      this.gfx.fillStyle(eFlash ? 0xffffff : fillColor, alpha * (eFlash ? 1.0 : 0.7))
      this.gfx.fillTriangle(p0x, p0y, p1x, p1y, p2x, p2y)
      this.gfx.fillTriangle(p0x, p0y, p2x, p2y, p3x, p3y)
      this.gfx.lineStyle(1.5 * this.dpr, eFlash ? 0xffffff : strokeColor, alpha)
      this.gfx.strokePoints([{x:p0x,y:p0y},{x:p1x,y:p1y},{x:p2x,y:p2y},{x:p3x,y:p3y}], true)
    }

    for (const pickup of this.pickups) {
      const alpha = this.depthAlpha(pickup.z)
      if (alpha <= 0) continue
      const worldAngle = pickup.cylinderAngle + this.baseAngle
      const xOff = this.xOffset(pickup.z)
      const yOff = this.yOffset(pickup.z)
      const wx = Math.cos(worldAngle) * ENTITY_RADIUS
      const wy = Math.sin(worldAngle) * ENTITY_RADIUS
      const [px, py] = this.project(wx + xOff, wy + yOff, pickup.z)
      const s = 10 * this.focal / pickup.z
      if (pickup.type === 'weapon') {
        this.gfx.lineStyle(2 * this.dpr, 0xffff00, alpha)
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4
          this.gfx.lineBetween(px, py, px + Math.cos(a) * s, py + Math.sin(a) * s)
        }
        this.gfx.strokeCircle(px, py, s * 0.5)
      } else {
        this.gfx.lineStyle(2 * this.dpr, 0x00ffff, alpha)
        this.gfx.lineBetween(px - s, py, px + s, py)
        this.gfx.lineBetween(px, py - s, px, py + s)
        this.gfx.strokeCircle(px, py, s * 0.7)
      }
    }

    for (const p of this.particles) {
      if (p.life <= 0) continue
      const alpha = (p.life / p.maxLife) * this.depthAlpha(p.z)
      if (alpha <= 0) continue
      const [sx, sy] = this.project(p.wx + this.xOffset(p.z), p.wy + this.yOffset(p.z), p.z)
      this.gfx.fillStyle(p.color, alpha)
      this.gfx.fillCircle(sx, sy, p.size * this.focal / p.z)
    }

    for (const s of this.bossShots) {
      const alpha = this.depthAlpha(s.z)
      if (alpha <= 0) continue
      const wa = s.cylinderAngle + this.baseAngle
      const cosA = Math.cos(wa), sinA = Math.sin(wa)
      const ex = cosA * ENTITY_RADIUS, ey = sinA * ENTITY_RADIUS
      const tailZ = Math.min(s.z + LASER_TRAIL_LENGTH, Z_FAR - 1)
      const [p0x, p0y] = this.project(ex + this.xOffset(s.z), ey + this.yOffset(s.z), s.z)
      const [p1x, p1y] = this.project(ex + this.xOffset(tailZ), ey + this.yOffset(tailZ), tailZ)
      this.gfx.lineStyle(12 * this.dpr, 0xff3300, alpha * 0.4)
      this.gfx.lineBetween(p0x, p0y, p1x, p1y)
      this.gfx.lineStyle(4.5 * this.dpr, 0xffffff, alpha)
      this.gfx.lineBetween(p0x, p0y, p1x, p1y)
    }

    for (const mine of this.mines) {
      const alpha = this.depthAlpha(mine.z)
      if (alpha <= 0) continue
      const wa = mine.cylinderAngle + this.baseAngle
      const xOff = this.xOffset(mine.z), yOff = this.yOffset(mine.z)
      const [px, py] = this.project(Math.cos(wa) * ENTITY_RADIUS + xOff, Math.sin(wa) * ENTITY_RADIUS + yOff, mine.z)
      const s = 14 * this.focal / mine.z
      const mFlash = mine.flash > 0
      this.gfx.fillStyle(mFlash ? 0xffffff : 0x884400, alpha * 0.85)
      this.gfx.fillTriangle(px, py - s, px + s, py, px, py + s)
      this.gfx.fillTriangle(px, py - s, px - s, py, px, py + s)
      this.gfx.lineStyle(1.5 * this.dpr, mFlash ? 0xffffff : 0xff6600, alpha)
      this.gfx.strokeTriangle(px, py - s, px + s, py, px, py + s)
      this.gfx.strokeTriangle(px, py - s, px - s, py, px, py + s)
    }

    for (const blast of this.blasts) {
      const frac = blast.radius / MINE_BLAST_RADIUS
      const alpha = (1 - frac) * this.depthAlpha(blast.z)
      if (alpha <= 0) continue
      const bwa = blast.cylinderAngle + this.baseAngle
      const xOff = this.xOffset(blast.z), yOff = this.yOffset(blast.z)
      const [bsx, bsy] = this.project(Math.cos(bwa) * ENTITY_RADIUS + xOff, Math.sin(bwa) * ENTITY_RADIUS + yOff, blast.z)
      const screenR = blast.radius * this.focal / blast.z
      this.gfx.lineStyle(3 * this.dpr, 0xff8800, alpha)
      this.gfx.strokeCircle(bsx, bsy, screenR)
    }

    for (const wall of this.walls) {
      const alpha = this.depthAlpha(wall.z)
      if (alpha <= 0) continue
      const growFrac = (wall.growTimer || 0) / WALL_GROW_DURATION
      const halfA = WALL_HALF_ANGLE * growFrac
      const wFlash = wall.flash > 0
      const xOff = this.xOffset(wall.z), yOff = this.yOffset(wall.z)
      const baseWa = wall.cylinderAngle + this.baseAngle
      const [p0x, p0y] = this.project(Math.cos(baseWa - halfA) * ENTITY_RADIUS + xOff, Math.sin(baseWa - halfA) * ENTITY_RADIUS + yOff, wall.z)
      const [p1x, p1y] = this.project(Math.cos(baseWa + halfA) * ENTITY_RADIUS + xOff, Math.sin(baseWa + halfA) * ENTITY_RADIUS + yOff, wall.z)
      this.gfx.lineStyle(5 * this.dpr, wFlash ? 0xffffff : 0xcc8800, alpha)
      this.gfx.lineBetween(p0x, p0y, p1x, p1y)
    }

    if (this.boss) this.drawBoss()
  }

  tickBossAttack(dt) {
    if (!this.boss || this.boss.z > BOSS_REST_Z) return

    // Mines always spawn continuously from alive points
    for (let p = 0; p < BOSS_POINTS; p++) {
      if (!this.boss.points[p].alive) continue
      if ((this.boss.mineTimers[p] -= dt) <= 0) {
        this.mines.push({ cylinderAngle: (p / BOSS_POINTS) * Math.PI * 2 + this.boss.angle, z: this.boss.z, zPrev: this.boss.z, hp: MINE_HP, flash: 0, angVel: (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.4) })
        this.boss.mineTimers[p] = MINE_SPAWN_INTERVAL_MIN + Math.random() * (MINE_SPAWN_INTERVAL_MAX - MINE_SPAWN_INTERVAL_MIN)
      }
    }

    if (this.wallAttackCooldown > 0) this.wallAttackCooldown -= dt

    if (this.bossAttack === null) {
      if ((this.bossAttackCooldown -= dt) <= 0) this.startNextAttack()
      return
    }
    const atk = this.bossAttack
    if (atk.type === 'columnSpread') {
      if (atk.phase === 0) {
        for (let p = 0; p < BOSS_POINTS; p += 2) {
          if (!this.boss.points[p].alive) continue
          this.bossShots.push({ cylinderAngle: (p / BOSS_POINTS) * Math.PI * 2 + this.boss.angle, z: this.boss.z, zPrev: this.boss.z })
        }
        atk.phase = 1; atk.timer = ATTACK_COLUMN_GAP
      } else if ((atk.timer -= dt) <= 0) {
        for (let p = 1; p < BOSS_POINTS; p += 2) {
          if (!this.boss.points[p].alive) continue
          this.bossShots.push({ cylinderAngle: (p / BOSS_POINTS) * Math.PI * 2 + this.boss.angle, z: this.boss.z, zPrev: this.boss.z })
        }
        this.endAttack()
      }
    } else if (atk.type === 'spiral') {
      if ((atk.timer -= dt) <= 0) {
        while (atk.nextPoint < BOSS_POINTS) {
          const p = atk.nextPoint++
          if (!this.boss.points[p].alive) continue
          this.bossShots.push({ cylinderAngle: (p / BOSS_POINTS) * Math.PI * 2 + this.boss.angle, z: this.boss.z, zPrev: this.boss.z })
          atk.timer = ATTACK_SPIRAL_INTERVAL
          break
        }
        if (atk.nextPoint >= BOSS_POINTS) this.endAttack()
      }
    } else if (atk.type === 'walls') {
      if ((atk.timer -= dt) <= 0) {
        let i = 0
        for (let p = 0; p < BOSS_POINTS; p++) {
          if (!this.boss.points[p].alive) continue
          if (i % 2 === 0) this.walls.push({ cylinderAngle: (p / BOSS_POINTS) * Math.PI * 2 + this.boss.angle, z: this.boss.z, zPrev: this.boss.z, hp: WALL_HP, flash: 0, growTimer: 0 })
          i++
        }
        if (--atk.wavesLeft <= 0) this.endAttack()
        else atk.timer = WALL_WAVE_GAP
      }
    }
  }

  startNextAttack() {
    const types = this.wallAttackCooldown > 0
      ? ['columnSpread', 'spiral']
      : ['columnSpread', 'spiral', 'walls']
    const type = types[Math.floor(Math.random() * types.length)]
    if (type === 'columnSpread') this.bossAttack = { type, phase: 0, timer: 0 }
    else if (type === 'spiral') this.bossAttack = { type, nextPoint: 0, timer: 0 }
    else { this.bossAttack = { type: 'walls', wavesLeft: WALL_WAVE_COUNT, timer: 0 }; this.wallAttackCooldown = 5 }
  }

  endAttack() {
    this.bossAttack = null
    this.bossAttackCooldown = ATTACK_COOLDOWN_MIN + Math.random() * (ATTACK_COOLDOWN_MAX - ATTACK_COOLDOWN_MIN)
  }

  triggerMineExplosion(mi, deadMines) {
    if (deadMines.has(mi)) return
    deadMines.add(mi)
    const mine = this.mines[mi]
    const worldAngle = mine.cylinderAngle + this.baseAngle
    this.spawnExplosion(Math.cos(worldAngle) * ENTITY_RADIUS, Math.sin(worldAngle) * ENTITY_RADIUS, mine.z, 0xff6600)
    this.blasts.push({ cylinderAngle: mine.cylinderAngle, z: mine.z, radius: 0, hitPlayer: false, hitMines: new Set() })
  }

  defeatBoss() {
    const { z, angle } = this.boss
    const worldAngle = angle + this.baseAngle
    this.spawnExplosion(0, 0, z, 0xffff00)
    for (let i = 0; i < BOSS_POINTS; i++) {
      const a = (i / BOSS_POINTS) * Math.PI * 2 + worldAngle
      this.spawnExplosion(Math.cos(a) * BOSS_OUTER_R, Math.sin(a) * BOSS_OUTER_R, z, i % 2 === 0 ? 0xffaa00 : 0xff4400)
    }
    this.boss = null
    this.bossMode = false
    this.bossCountdown = 20
  }

  drawBoss() {
    const { z, points } = this.boss
    const angle = this.boss.angle + this.baseAngle
    const alpha = this.depthAlpha(z)
    if (alpha <= 0) return
    const xOff = this.xOffset(z)
    const yOff = this.yOffset(z)

    const proj = (wx, wy) => { const [sx, sy] = this.project(wx + xOff, wy + yOff, z); return { x: sx, y: sy } }

    // Pre-compute inner and outer world-space positions
    const inWX = [], inWY = [], outWX = [], outWY = []
    for (let p = 0; p < BOSS_POINTS; p++) {
      const aIn = ((2 * p + 1) / (BOSS_POINTS * 2)) * Math.PI * 2 + angle  // inner between spike p and p+1
      inWX[p] = Math.cos(aIn) * BOSS_INNER_R
      inWY[p] = Math.sin(aIn) * BOSS_INNER_R
      const aOut = (p / BOSS_POINTS) * Math.PI * 2 + angle
      outWX[p] = Math.cos(aOut) * BOSS_OUTER_R
      outWY[p] = Math.sin(aOut) * BOSS_OUTER_R
    }

    // Build polygon: for each spike, inner_before → outer-or-jag → (inner_after added by next spike)
    const poly = []
    for (let p = 0; p < BOSS_POINTS; p++) {
      const prevP = (p - 1 + BOSS_POINTS) % BOSS_POINTS
      poly.push(proj(inWX[prevP], inWY[prevP]))  // inner before spike p
      const bp = points[p]
      if (bp.alive) {
        poly.push(proj(outWX[p], outWY[p]))
      } else {
        const ibx = inWX[prevP], iby = inWY[prevP]
        const iax = inWX[p], iay = inWY[p]
        const dx = iax - ibx, dy = iay - iby
        const len = Math.hypot(dx, dy) || 1
        const perpX = -dy / len, perpY = dx / len
        const jags = bp.jags || []
        for (let j = 0; j < BOSS_JAG_COUNT; j++) {
          const t = (j + 1) / (BOSS_JAG_COUNT + 1)
          poly.push(proj(ibx + dx * t + perpX * (jags[j] || 0), iby + dy * t + perpY * (jags[j] || 0)))
        }
      }
    }
    poly.push(proj(inWX[BOSS_POINTS - 1], inWY[BOSS_POINTS - 1]))  // close back to inW[15]

    this.gfx.fillStyle(0xcc8800, alpha * 0.5)
    this.gfx.fillPoints(poly, true)
    this.gfx.lineStyle(2 * this.dpr, 0xffff00, alpha)
    this.gfx.strokePoints(poly, true)

    // Flash individual struck spikes white
    for (let p = 0; p < BOSS_POINTS; p++) {
      const bp = points[p]
      if (!bp.alive || bp.flash <= 0) continue
      const prevP = (p - 1 + BOSS_POINTS) % BOSS_POINTS
      const p0 = proj(inWX[prevP], inWY[prevP])
      const p1 = proj(outWX[p], outWY[p])
      const p2 = proj(inWX[p], inWY[p])
      this.gfx.fillStyle(0xffffff, alpha * (bp.flash / BOSS_FLASH_DUR))
      this.gfx.fillTriangle(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y)
    }
  }

  spawnPickupAnim(fromX, fromY, color, label, target) {
    const hex = '#' + color.toString(16).padStart(6, '0')
    const icon = this.add.arc(fromX, fromY, 8 * this.dpr, 0, 360, false, color, 1)
    icon.setDepth(50)
    this.tweens.add({
      targets: icon,
      x: target.x, y: target.y,
      alpha: 0, scaleX: 0.3, scaleY: 0.3,
      duration: 700, ease: 'Cubic.easeIn',
      onComplete: () => icon.destroy(),
    })
    const cy = this.scale.height / 2
    const text = this.add.text(this.cx, cy, label, {
      fontSize: `${18 * this.dpr}px`, fontFamily: 'monospace', color: hex,
    }).setOrigin(0.5).setDepth(50)
    this.tweens.add({
      targets: text,
      y: cy - 60 * this.dpr, alpha: 0,
      duration: 1200, ease: 'Power2',
      onComplete: () => text.destroy(),
    })
  }

  spawnExplosion(wx, wy, z, color) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = PARTICLE_SPEED * (0.5 + Math.random())
      this.particles.push({
        wx, wy, z,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE * (0.6 + Math.random() * 0.4),
        maxLife: PARTICLE_LIFE,
        size: 2 + Math.random() * 4,
        color,
      })
    }
  }

  drainShields(amount) {
    if (this.dying) return
    this.shields = Math.max(0, this.shields - amount)
    this.registry.set('shields', this.shields)
    if (this.shields <= 0) this.startDeathSequence()
  }

  startDeathSequence() {
    if (this.dying) return
    this.dying = true
    for (const color of [0xffffff, 0xff8800, 0xff2200, 0xffff00]) {
      this.spawnExplosion(0, ENTITY_RADIUS, Z_PLAYER, color)
    }
    this.time.delayedCall(800, () => this.endGame())
  }

  addScore(pts) {
    this.score += pts
    this.registry.set('score', this.score)
  }

  endGame() {
    if (!this.gameActive) return
    this.gameActive = false
    this.scene.stop('HUDScene')
    this.scene.start('GameOverScene', { score: this.score })
  }
}
