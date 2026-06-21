import Phaser from 'phaser'

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(data) {
    const { width, height } = this.scale
    const dpr = width / 390
    const score = data?.score ?? 0

    this.add.text(width / 2, height * 0.30, 'GAME OVER', {
      fontSize: `${42 * dpr}px`, fontFamily: 'monospace', color: '#ff4400',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.46, 'SCORE', {
      fontSize: `${14 * dpr}px`, fontFamily: 'monospace', color: '#009999',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.52, String(score), {
      fontSize: `${36 * dpr}px`, fontFamily: 'monospace', color: '#00ffff',
    }).setOrigin(0.5)

    const tap = this.add.text(width / 2, height * 0.68, 'tap to play again', {
      fontSize: `${18 * dpr}px`, fontFamily: 'monospace', color: '#009999',
    }).setOrigin(0.5)

    this.tweens.add({
      targets: tap,
      alpha: 0,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.time.delayedCall(500, () => {
      this.input.once('pointerdown', () => this.scene.start('GameScene'))
    })
  }
}
