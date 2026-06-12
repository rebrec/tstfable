import Phaser from "phaser";
import { generateTextures } from "../textures";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    generateTextures(this);

    this.anims.create({
      key: "player-run",
      frames: [{ key: "player-run1" }, { key: "player-run2" }],
      frameRate: 11,
      repeat: -1,
    });

    this.scene.start("Menu");
  }
}
