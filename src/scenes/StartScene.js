import Phaser from 'phaser'

export default class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' })
  }

  create() {
    const { width, height } = this.scale
    const dpr = width / 390

    this.add.text(width / 2, height * 0.35, 'TUNNEL\nSHOOTER', {
      fontSize: `${52 * dpr}px`,
      fontFamily: 'monospace',
      color: '#00ffff',
      align: 'center',
    }).setOrigin(0.5)

    const tap = this.add.text(width / 2, height * 0.62, 'tap to start', {
      fontSize: `${18 * dpr}px`,
      fontFamily: 'monospace',
      color: '#009999',
    }).setOrigin(0.5)

    this.tweens.add({
      targets: tap,
      alpha: 0,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.input.once('pointerdown', () => this.scene.start('GameScene'))
  }
}
