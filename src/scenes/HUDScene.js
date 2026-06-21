import Phaser from 'phaser'

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

    this.registry.events.on('changedata-score', (_, v) => this.scoreText.setText(String(v)), this)
    this.registry.events.on('changedata-shields', (_, v) => { this.currentShields = v; this.drawShields() }, this)
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

  shutdown() {
    this.registry.events.off('changedata-score', null, this)
    this.registry.events.off('changedata-shields', null, this)
  }
}
