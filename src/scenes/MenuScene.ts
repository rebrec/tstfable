import Phaser from "phaser";
import { BUILTIN_LEVELS, deleteCustomLevel, loadCustomLevels } from "../levels";
import { addParallaxBackground, makeButton } from "../ui";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create(): void {
    const { width, height } = this.scale;
    addParallaxBackground(this);
    this.setupFullscreen(width);

    // sol décoratif
    for (let x = 16; x < width; x += 32) {
      this.add.image(x, height - 16, "ground");
    }

    // titre
    const title = this.add
      .text(width / 2, 78, "SKY DASH", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "64px",
        fontStyle: "bold",
        color: "#ffd54f",
        stroke: "#0b1021",
        strokeThickness: 10,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: title,
      y: 70,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "sine.inout",
    });
    this.add
      .text(width / 2, 124, "Un petit jeu de plateforme — niveaux + éditeur intégré", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "17px",
        color: "#e8eefc",
        stroke: "#0b1021",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // mascotte qui sautille
    const mascot = this.add.sprite(width / 2 - 250, height - 49, "player-idle");
    this.tweens.add({
      targets: mascot,
      y: mascot.y - 36,
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: "quad.out",
      onYoyo: () => mascot.setTexture("player-jump"),
      onRepeat: () => mascot.setTexture("player-idle"),
    });
    const coin = this.add.image(width / 2 + 250, height - 60, "coin").setScale(1.3);
    this.tweens.add({
      targets: coin,
      y: coin.y - 10,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "sine.inout",
    });

    // colonne gauche : aventure
    const leftX = width / 2 - 190;
    this.add
      .text(leftX, 168, "Aventure", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#0b1021",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    BUILTIN_LEVELS.forEach((level, i) => {
      makeButton(
        this,
        leftX,
        210 + i * 52,
        `${i + 1}. ${level.name}`,
        () => this.scene.start("Game", { levelIndex: i }),
        { width: 250 }
      );
    });

    // colonne droite : niveaux personnalisés + éditeur
    const rightX = width / 2 + 190;
    this.add
      .text(rightX, 168, "Mes niveaux", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#0b1021",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const customs = loadCustomLevels();
    if (customs.length === 0) {
      this.add
        .text(rightX, 214, "Aucun niveau personnalisé.\nCréez-en un avec l'éditeur !", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
          color: "#c9d6f2",
          align: "center",
          stroke: "#0b1021",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    }
    customs.slice(0, 4).forEach((level, i) => {
      const y = 210 + i * 52;
      makeButton(
        this,
        rightX - 30,
        y,
        level.name.length > 16 ? level.name.slice(0, 15) + "…" : level.name,
        () => this.scene.start("Game", { custom: level }),
        { width: 190 }
      );
      makeButton(
        this,
        rightX + 87,
        y,
        "✎",
        () => this.scene.start("Editor", { level }),
        { width: 38, color: 0x2a4a2f, hoverColor: 0x3e8e41 }
      );
      makeButton(
        this,
        rightX + 130,
        y,
        "✕",
        () => {
          deleteCustomLevel(level.name);
          this.scene.restart();
        },
        { width: 38, color: 0x4a2a2a, hoverColor: 0xc62828 }
      );
    });

    makeButton(
      this,
      rightX,
      210 + Math.max(customs.slice(0, 4).length, 1) * 52 + 18,
      "✏  Éditeur de niveaux",
      () => this.scene.start("Editor"),
      { width: 250, color: 0x2a4a2f, hoverColor: 0x3e8e41 }
    );

    // aide
    this.add
      .text(
        width / 2,
        height - 58,
        "← → / Q D : se déplacer     Espace / ↑ / Z : sauter     R : recommencer     Échap : menu",
        {
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
          color: "#e8eefc",
          stroke: "#0b1021",
          strokeThickness: 4,
        }
      )
      .setOrigin(0.5);
  }

  /**
   * Bouton plein écran (utile surtout sur mobile : masque la barre d'URL du
   * navigateur et remplit tout l'écran). Sur tactile, on tente aussi le passage
   * automatique en plein écran au premier appui (geste utilisateur requis).
   */
  private setupFullscreen(width: number): void {
    if (!this.sys.game.device.fullscreen.available) return;

    const btn = makeButton(
      this,
      width - 40,
      30,
      this.scale.isFullscreen ? "🗗" : "⛶",
      () => this.scale.toggleFullscreen(),
      { width: 44, fontSize: 22 }
    );
    btn.setDepth(100);

    if (this.game.device.input.touch) {
      this.input.once("pointerdown", () => {
        if (!this.scale.isFullscreen) {
          try {
            this.scale.startFullscreen();
          } catch {
            /* certains navigateurs (iOS) ne le permettent pas : ignoré */
          }
        }
      });
    }
  }
}
