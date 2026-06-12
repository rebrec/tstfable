import Phaser from "phaser";

/**
 * HUD au-dessus du jeu : pièces, vies, nom du niveau, bannières.
 * Piloté par le registry (hud.coins / hud.lives / hud.level)
 * et l'événement global "banner".
 */
export class UIScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;

  constructor() {
    super("UI");
  }

  create(): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "system-ui, sans-serif",
      fontSize: "20px",
      color: "#ffffff",
      stroke: "#0b1021",
      strokeThickness: 4,
    };

    this.add.image(26, 26, "coin").setScale(1).setScrollFactor(0);
    this.coinsText = this.add.text(42, 15, "0", style).setScrollFactor(0);

    this.levelText = this.add
      .text(this.scale.width / 2, 15, "", style)
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.livesText = this.add
      .text(this.scale.width - 16, 15, "", {
        ...style,
        color: "#ff6b6b",
        fontSize: "22px",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.refresh();
    this.registry.events.on("changedata", this.refresh, this);
    this.game.events.on("banner", this.showBanner, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off("changedata", this.refresh, this);
      this.game.events.off("banner", this.showBanner, this);
    });
  }

  private refresh(): void {
    this.coinsText.setText(String(this.registry.get("hud.coins") ?? 0));
    const lives = (this.registry.get("hud.lives") as number) ?? 0;
    this.livesText.setText("♥".repeat(Math.max(0, lives)));
    this.levelText.setText((this.registry.get("hud.level") as string) ?? "");
  }

  private showBanner(text: string, sub?: string): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 - 40;

    const bg = this.add
      .rectangle(cx, cy, 520, sub ? 110 : 80, 0x0b1021, 0.82)
      .setStrokeStyle(2, 0x5d7bb0);
    const main = this.add
      .text(cx, sub ? cy - 16 : cy, text, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "34px",
        color: "#ffd54f",
        stroke: "#0b1021",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    const items: Phaser.GameObjects.GameObject[] = [bg, main];
    if (sub) {
      items.push(
        this.add
          .text(cx, cy + 24, sub, {
            fontFamily: "system-ui, sans-serif",
            fontSize: "18px",
            color: "#e8eefc",
          })
          .setOrigin(0.5)
      );
    }

    for (const item of items) {
      (item as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0);
    }
    this.tweens.add({ targets: items, alpha: 1, duration: 180 });
    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: items,
        alpha: 0,
        duration: 250,
        onComplete: () => items.forEach((i) => i.destroy()),
      });
    });
  }
}
