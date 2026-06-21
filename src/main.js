import './style.css'
import Phaser from 'phaser'
import StartScene from './scenes/StartScene.js'
import GameScene from './scenes/GameScene.js'
import HUDScene from './scenes/HUDScene.js'
import GameOverScene from './scenes/GameOverScene.js'

const dpr = window.devicePixelRatio || 1

const config = {
  type: Phaser.AUTO,
  width: 390 * dpr,
  height: 844 * dpr,
  backgroundColor: '#000000',
  parent: 'app',
  scene: [StartScene, GameScene, HUDScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    touch: true,
  },
}

new Phaser.Game(config)
