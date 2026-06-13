import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { UIScene } from "./scenes/UIScene";
import { EditorScene } from "./scenes/EditorScene";

// Le jeu est conçu pour une hauteur fixe ; la largeur s'adapte au format de
// l'écran (en paysage) pour remplir l'affichage sans bandes noires, aussi bien
// sur mobile que sur desktop. Scale.FIT met ensuite le tout à l'échelle.
//
// Sur mobile, on se base sur les dimensions de l'écran (screen.*), stables et
// indépendantes de la barre d'URL, pour que le format colle à l'écran réel —
// notamment en plein écran. Sur desktop, on suit le format de la fenêtre.
const DESIGN_HEIGHT = 540;
const isTouch =
  "ontouchstart" in window || navigator.maxTouchPoints > 0;
const refW = isTouch ? window.screen.width : window.innerWidth;
const refH = isTouch ? window.screen.height : window.innerHeight;
const longSide = Math.max(refW, refH);
const shortSide = Math.max(1, Math.min(refW, refH));
const aspect = Phaser.Math.Clamp(longSide / shortSide, 1.2, 2.6);
const DESIGN_WIDTH = Math.round(DESIGN_HEIGHT * aspect);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
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
