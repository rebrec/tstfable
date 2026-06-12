import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { UIScene } from "./scenes/UIScene";
import { EditorScene } from "./scenes/EditorScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 540,
  backgroundColor: "#0b1021",
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 1100 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, EditorScene],
});

// exposé pour les tests automatisés (smoke test du pipeline)
(window as unknown as Record<string, unknown>).__game = game;
