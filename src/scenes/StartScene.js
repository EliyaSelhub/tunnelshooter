import Phaser from 'phaser'

export default class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' })
  }

  create() {
    const { width, height } = this.scale

    this.add.text(width / 2, height * 0.35, 'TUNNEL\nSHOOTER', {
      fontSize: '52px',
      fontFamily: 'monospace',
      color: '#00ffff',
      align: 'center',
    }).setOrigin(0.5)

    const tap = this.add.text(width / 2, height * 0.62, 'tap to start', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#006666',
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
