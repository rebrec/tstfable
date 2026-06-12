import Phaser from "phaser";

export interface ButtonOptions {
  width?: number;
  fontSize?: number;
  color?: number;
  hoverColor?: number;
  textColor?: string;
}

/** Bouton texte réutilisable (menu, HUD, éditeur). */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {}
): Phaser.GameObjects.Container {
  const fontSize = opts.fontSize ?? 18;
  const color = opts.color ?? 0x1f2a44;
  const hoverColor = opts.hoverColor ?? 0x3b82f6;

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${fontSize}px`,
      color: opts.textColor ?? "#e8eefc",
    })
    .setOrigin(0.5);

  const w = opts.width ?? text.width + 26;
  const h = text.height + 14;
  const bg = scene.add
    .rectangle(0, 0, w, h, color, 1)
    .setStrokeStyle(2, 0x5d7bb0, 0.9);

  const container = scene.add.container(x, y, [bg, text]);
  container.setSize(w, h);
  bg.setInteractive({ useHandCursor: true });
  bg.on("pointerover", () => bg.setFillStyle(hoverColor));
  bg.on("pointerout", () => bg.setFillStyle(color));
  bg.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
    if (pointer.leftButtonDown()) onClick();
  });
  return container;
}

/** Fond parallaxe (ciel dégradé, collines, nuages) partagé par les scènes. */
export function addParallaxBackground(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  scene.add
    .image(0, 0, "sky")
    .setOrigin(0)
    .setDisplaySize(width, height)
    .setScrollFactor(0)
    .setDepth(-30);

  scene.add
    .tileSprite(0, height, width, 240, "hills-far")
    .setOrigin(0, 1)
    .setScrollFactor(0.15, 0.02)
    .setDepth(-20)
    .setAlpha(0.9);

  scene.add
    .tileSprite(0, height, width, 340, "hills-near")
    .setOrigin(0, 1)
    .setScrollFactor(0.35, 0.05)
    .setDepth(-10)
    .setAlpha(0.95);

  for (let i = 0; i < 6; i++) {
    const cloud = scene.add
      .image(Phaser.Math.Between(0, width), 40 + i * 55, "cloud")
      .setScrollFactor(0.08 + i * 0.03, 0)
      .setDepth(-25)
      .setAlpha(0.55 + Math.random() * 0.3)
      .setScale(0.6 + Math.random() * 0.8);
    scene.tweens.add({
      targets: cloud,
      x: cloud.x + Phaser.Math.Between(30, 90),
      duration: Phaser.Math.Between(9000, 16000),
      yoyo: true,
      repeat: -1,
      ease: "sine.inout",
    });
  }
}
