import Phaser from 'phaser'

const SIDES = 16
const RINGS = 20
const RADIUS = 180
const FOCAL = 400
const RING_STEP = 120
const SPEED = 300
const Z_PLAYER = 175
const Z_RECYCLE = 150
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
const PLAYER_HIT_ANGLE = FACE_ANGLE * 0.8
const SHIELD_RESTORE = 1

const ENTITY_RADIUS = RADIUS * 0.85

const UPGRADE_DURATION = 15
const SIDE_CANNON_ANGLE = Math.PI / 9   // 20° off axis
const SIDE_CANNON_SPIRAL_RATE = Math.PI / 2
const UPGRADES = ['dualCannons', 'largerAmmo', 'firingRate', 'sideCannons']
const UPGRADE_LABELS = { dualCannons: 'DUAL CANNONS', largerAmmo: 'BIG SHOTS', firingRate: 'RAPID FIRE', sideCannons: 'SIDE CANNONS' }

const MEDIUM_WAVE_AMP = Math.PI / 3              // 60° half-swing → 120° total ≈ 1/3 circumference
const MEDIUM_WAVE_FREQ = (2 * Math.PI) / (20 * RING_STEP) // full cycle per 20 ring-steps (slow spatial wave)
const PLAYER_FLASH_DURATION = 0.5

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
    const s = FOCAL / z
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
    this.gfx.lineStyle(2, shipColor, 1)
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
      this.gfx.lineStyle(1.5, shipColor, 1)
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
        this.gfx.lineStyle(1, shipColor, 1)
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
    this.gfx.lineStyle(1.5, shipColor, 1)
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
    this.shotTimer += dt
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

    // Player-enemy collision
    for (let ei = 0; ei < this.enemies.length; ei++) {
      if (deadEnemies.has(ei)) continue
      const enemy = this.enemies[ei]
      if (enemy.z <= Z_PLAYER) {
        let da = (enemy.cylinderAngle + this.baseAngle) - Math.PI / 2
        da -= Math.round(da / (Math.PI * 2)) * (Math.PI * 2)
        if (Math.abs(da) < PLAYER_HIT_ANGLE) {
          const dmg = enemy.type === 'large' ? 5 : enemy.type === 'medium' ? 2 : 1
          this.drainShields(dmg)
          this.playerFlash = PLAYER_FLASH_DURATION
          this.spawnExplosion(0, ENTITY_RADIUS, Z_PLAYER, 0xffffff)
        }
        deadEnemies.add(ei)
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
            this.spawnPickupAnim(psx, psy, 0xffff00, UPGRADE_LABELS[pickup.upgradeType] + '!', { x: 374, y: 54 })
          } else {
            this.shields = Math.min(MAX_SHIELDS, this.shields + SHIELD_RESTORE)
            this.registry.set('shields', this.shields)
            this.spawnPickupAnim(psx, psy, 0x00ffff, 'SHIELDS +' + SHIELD_RESTORE, { x: 91, y: 29 })
          }
        }
        deadPickups.add(pi)
      }
    }

    this.shots = this.shots.filter((s, i) => !deadShots.has(i) && s.z < Z_FAR)
    this.enemies = this.enemies.filter((e, i) => !deadEnemies.has(i) && e.z > Z_RECYCLE)
    this.pickups = this.pickups.filter((p, i) => !deadPickups.has(i) && p.z > Z_RECYCLE)
    this.particles = this.particles.filter(p => p.life > 0 && p.z > Z_RECYCLE)

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
        this.gfx.lineStyle(1, 0x00ff00, alpha)
        const [x1, y1] = radialFrames[r].pts[i]
        const [x2, y2] = radialFrames[r + 1].pts[i]
        this.gfx.lineBetween(x1, y1, x2, y2)
      }
    }

    for (const { pts, alpha } of frames) {
      if (alpha <= 0) continue
      this.gfx.lineStyle(1, 0x00ff00, alpha)
      for (let i = 0; i < SIDES; i++) {
        const [x1, y1] = pts[i]
        const [x2, y2] = pts[(i + 1) % SIDES]
        this.gfx.lineBetween(x1, y1, x2, y2)
      }
    }

    this.drawPlayer()

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
      const sr = SHOT_WORLD_RADIUS * damageScale * FOCAL / shot.z
      this.gfx.fillStyle(0x000000, alpha)
      this.gfx.fillCircle(px, py, sr)
      this.gfx.lineStyle(shot.damage > 1 ? 2 : 1, 0xffff00, alpha)
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
      this.gfx.lineStyle(1.5, eFlash ? 0xffffff : strokeColor, alpha)
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
      const s = 10 * FOCAL / pickup.z
      if (pickup.type === 'weapon') {
        this.gfx.lineStyle(2, 0xffff00, alpha)
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4
          this.gfx.lineBetween(px, py, px + Math.cos(a) * s, py + Math.sin(a) * s)
        }
        this.gfx.strokeCircle(px, py, s * 0.5)
      } else {
        this.gfx.lineStyle(2, 0x00ffff, alpha)
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
      this.gfx.fillCircle(sx, sy, p.size * FOCAL / p.z)
    }
  }

  spawnPickupAnim(fromX, fromY, color, label, target) {
    const hex = '#' + color.toString(16).padStart(6, '0')
    const icon = this.add.arc(fromX, fromY, 8, 0, 360, false, color, 1)
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
      fontSize: '18px', fontFamily: 'monospace', color: hex,
    }).setOrigin(0.5).setDepth(50)
    this.tweens.add({
      targets: text,
      y: cy - 60, alpha: 0,
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
    this.shields = Math.max(0, this.shields - amount)
    this.registry.set('shields', this.shields)
    if (this.shields <= 0) this.endGame()
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
