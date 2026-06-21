import Phaser from 'phaser'

const UPGRADE_NAMES = {
  dualCannons: 'DUAL CANNONS',
  largerAmmo:  'BIG SHOTS',
  firingRate:  'RAPID FIRE',
  sideCannons: 'SIDE CANNONS',
}

export default class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene' })
  }

  create() {
    const { width } = this.scale

    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)')

    // Shield bar — top left
    this.add.text(16, 12, 'SHIELDS', {
      fontSize: '10px', fontFamily: 'monospace', color: '#006666',
    })

    this.shieldGfx = this.add.graphics()
    this.maxShields = this.registry.get('maxShields') ?? 10
    this.currentShields = this.registry.get('shields') ?? 10
    this.drawShields()

    // Score — top right
    this.add.text(width - 16, 12, 'SCORE', {
      fontSize: '10px', fontFamily: 'monospace', color: '#006666',
    }).setOrigin(1, 0)

    this.scoreText = this.add.text(width - 16, 24, '0', {
      fontSize: '26px', fontFamily: 'monospace', color: '#00ffff',
    }).setOrigin(1, 0)

    // Active upgrades list — top right, below score
    this._upgradeTexts = {}
    for (const key of Object.keys(UPGRADE_NAMES)) {
      this._upgradeTexts[key] = this.add.text(width - 16, 0, '', {
        fontSize: '9px', fontFamily: 'monospace', color: '#ffff00',
      }).setOrigin(1, 0).setVisible(false)
    }

    this._onScore = (_, v) => this.scoreText.setText(String(v))
    this._onShields = (_, v) => { this.currentShields = v; this.drawShields() }
    this.registry.events.on('changedata-score', this._onScore)
    this.registry.events.on('changedata-shields', this._onShields)

    this.events.once('shutdown', this._cleanup, this)
  }

  update() {
    const upgrades = this.registry.get('upgrades') || {}
    const w = this.scale.width
    let yPos = 54
    for (const key of Object.keys(UPGRADE_NAMES)) {
      const text = this._upgradeTexts[key]
      const t = upgrades[key]
      if (t > 0) {
        text.setPosition(w - 16, yPos)
        text.setText(UPGRADE_NAMES[key] + '  ' + Math.ceil(t) + 's')
        text.setVisible(true)
        yPos += 12
      } else {
        text.setVisible(false)
      }
    }
  }

  _cleanup() {
    this.registry.events.off('changedata-score', this._onScore)
    this.registry.events.off('changedata-shields', this._onShields)
  }

  drawShields() {
    this.shieldGfx.clear()
    const x = 16, y = 24, w = 150, h = 10
    this.shieldGfx.fillStyle(0x003333, 1)
    this.shieldGfx.fillRect(x, y, w, h)
    const ratio = Math.max(0, this.currentShields / this.maxShields)
    this.shieldGfx.fillStyle(ratio > 0.3 ? 0x00ffff : 0xff4400, 1)
    this.shieldGfx.fillRect(x, y, Math.round(w * ratio), h)
    this.shieldGfx.lineStyle(1, 0x006666, 1)
    this.shieldGfx.strokeRect(x, y, w, h)
  }
}
