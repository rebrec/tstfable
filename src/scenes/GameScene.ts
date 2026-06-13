import Phaser from "phaser";
import { TILE } from "../textures";
import {
  BUILTIN_LEVELS,
  LevelData,
  normalizeGrid,
  SOLID_CHARS,
} from "../levels";
import { addParallaxBackground } from "../ui";

export interface GameSceneData {
  levelIndex?: number;
  custom?: LevelData;
  fromEditor?: boolean;
  lives?: number;
  coins?: number;
}

const SPEED = 220;
const JUMP_VELOCITY = -500;
const COYOTE_MS = 110;
const JUMP_BUFFER_MS = 130;

export class GameScene extends Phaser.Scene {
  private sceneData!: GameSceneData;
  private grid: string[] = [];
  private offsetY = 0;
  private levelName = "";

  private player!: Phaser.Physics.Arcade.Sprite;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private hazardZones: Phaser.GameObjects.Zone[] = [];
  private flagZones: Phaser.GameObjects.Zone[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  private spawn = { x: 0, y: 0 };
  private lives = 3;
  private coinCount = 0;
  private lastGrounded = -99999;
  private lastJumpPressed = -99999;
  private wasAirborne = false;
  private dead = false;
  private won = false;

  private touchLeft = false;
  private touchRight = false;
  private touchJumpHeld = false;

  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private burstEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super("Game");
  }

  init(data: GameSceneData): void {
    this.sceneData = data;
    this.lives = data.lives ?? 3;
    this.coinCount = data.coins ?? 0;
    this.dead = false;
    this.won = false;
    this.wasAirborne = false;
    this.lastGrounded = -99999;
    this.lastJumpPressed = -99999;
    this.hazardZones = [];
    this.flagZones = [];
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJumpHeld = false;
  }

  create(): void {
    const level =
      this.sceneData.custom ??
      BUILTIN_LEVELS[this.sceneData.levelIndex ?? 0] ??
      BUILTIN_LEVELS[0];
    this.levelName = level.name;
    this.grid = normalizeGrid(level.grid);

    const rows = this.grid.length;
    const cols = this.grid[0].length;
    const levelW = cols * TILE;
    const levelH = rows * TILE;
    this.offsetY = Math.max(0, this.scale.height - levelH);
    const worldH = this.offsetY + levelH;

    addParallaxBackground(this);

    this.solids = this.physics.add.staticGroup();
    this.coins = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();

    this.buildLevel();

    // joueur
    this.player = this.physics.add.sprite(
      this.spawn.x,
      this.spawn.y,
      "player-idle"
    );
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 30).setOffset(4, 3);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    this.physics.world.setBounds(0, -200, levelW, worldH + 600);
    this.physics.world.checkCollision.down = false;
    this.physics.world.checkCollision.up = false;

    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.overlap(this.player, this.coins, (_p, coin) =>
      this.collectCoin(coin as Phaser.Physics.Arcade.Sprite)
    );
    this.physics.add.overlap(this.player, this.enemies, (_p, enemy) =>
      this.touchEnemy(enemy as Phaser.Physics.Arcade.Sprite)
    );
    if (this.hazardZones.length > 0) {
      this.physics.add.overlap(this.player, this.hazardZones, () => this.die());
    }

    // caméra
    const cam = this.cameras.main;
    cam.setBounds(0, 0, levelW, Math.max(worldH, this.scale.height));
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setDeadzone(120, 60);
    cam.fadeIn(300, 11, 16, 33);

    // particules
    this.dustEmitter = this.add.particles(0, 0, "pixel", {
      speed: { min: 30, max: 110 },
      angle: { min: 200, max: 340 },
      lifespan: 350,
      scale: { start: 1, end: 0 },
      tint: 0xd7ccc8,
      emitting: false,
    });
    this.sparkEmitter = this.add.particles(0, 0, "spark", {
      speed: { min: 60, max: 160 },
      lifespan: 450,
      scale: { start: 0.9, end: 0 },
      tint: [0xffd54f, 0xffb300, 0xffffff],
      emitting: false,
    });
    this.burstEmitter = this.add.particles(0, 0, "pixel", {
      speed: { min: 80, max: 260 },
      lifespan: 600,
      scale: { start: 1.3, end: 0 },
      gravityY: 500,
      emitting: false,
    });
    this.dustEmitter.setDepth(9);
    this.sparkEmitter.setDepth(20);
    this.burstEmitter.setDepth(20);

    // clavier (flèches + WASD + ZQSD)
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys("W,A,S,D,Z,Q") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    // actions ponctuelles en événementiel (fiable même sur appui bref)
    for (const key of ["SPACE", "UP", "W", "Z"]) {
      kb.on(`keydown-${key}`, () => {
        this.lastJumpPressed = this.time.now;
      });
    }
    kb.on("keydown-R", () => {
      this.scene.restart({
        ...this.sceneData,
        lives: 3,
        coins: this.sceneData.coins ?? 0,
      });
    });
    kb.on("keydown-ESC", () => this.exitToHub());

    // contrôles tactiles (téléphones / tablettes)
    if (this.game.device.input.touch) {
      this.createTouchControls();
    }

    // HUD
    this.registry.set("hud.coins", this.coinCount);
    this.registry.set("hud.lives", this.lives);
    this.registry.set(
      "hud.level",
      this.sceneData.fromEditor ? `Test : ${this.levelName}` : this.levelName
    );
    if (!this.scene.isActive("UI")) {
      this.scene.launch("UI");
    }
  }

  private charAt(row: number, col: number): string {
    if (row < 0 || row >= this.grid.length) return " ";
    if (col < 0 || col >= this.grid[0].length) return " ";
    return this.grid[row][col];
  }

  private isSolid(row: number, col: number): boolean {
    return SOLID_CHARS.has(this.charAt(row, col));
  }

  private buildLevel(): void {
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        const ch = this.grid[r][c];
        const x = c * TILE + TILE / 2;
        const y = this.offsetY + r * TILE + TILE / 2;
        switch (ch) {
          case "#":
            // herbe en surface, terre quand la tuile au-dessus est pleine
            this.solids.create(x, y, this.isSolid(r - 1, c) ? "dirt" : "ground");
            break;
          case "=":
            this.solids.create(x, y, "brick");
            break;
          case "o": {
            const coin = this.coins.create(
              x,
              y,
              "coin"
            ) as Phaser.Physics.Arcade.Sprite;
            (coin.body as Phaser.Physics.Arcade.StaticBody).setSize(18, 18);
            this.tweens.add({
              targets: coin,
              y: y - 5,
              duration: 700 + ((r * 13 + c * 7) % 400),
              yoyo: true,
              repeat: -1,
              ease: "sine.inout",
            });
            break;
          }
          case "^": {
            this.add.image(x, y, "spike").setDepth(5);
            const zone = this.add.zone(x, y + 8, 24, 14);
            this.physics.add.existing(zone, true);
            this.hazardZones.push(zone);
            break;
          }
          case "E": {
            const enemy = this.enemies.create(
              x,
              y,
              "enemy"
            ) as Phaser.Physics.Arcade.Sprite;
            const eb = enemy.body as Phaser.Physics.Arcade.Body;
            eb.setSize(26, 20).setOffset(2, 4);
            enemy.setVelocityX(c % 2 === 0 ? 45 : -45);
            enemy.setDepth(8);
            break;
          }
          case "P":
            this.spawn = { x, y: y - 4 };
            break;
          case "F": {
            this.add
              .image(c * TILE, this.offsetY + (r + 1) * TILE, "flag")
              .setOrigin(0, 1)
              .setDepth(5);
            const flagZone = this.add.zone(x, y - 8, 26, 56);
            this.physics.add.existing(flagZone, true);
            this.flagZones.push(flagZone);
            break;
          }
        }
      }
    }
  }

  update(time: number): void {
    if (this.won) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // chute hors du niveau
    if (!this.dead && this.player.y > this.offsetY + this.grid.length * TILE + 80) {
      this.die();
    }

    this.updateEnemies();

    if (this.dead) return;

    // drapeau
    for (const zone of this.flagZones) {
      const zb = zone.body as Phaser.Physics.Arcade.StaticBody;
      const pb = body;
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          new Phaser.Geom.Rectangle(pb.x, pb.y, pb.width, pb.height),
          new Phaser.Geom.Rectangle(zb.x, zb.y, zb.width, zb.height)
        )
      ) {
        this.win();
        return;
      }
    }

    const left =
      this.cursors.left.isDown ||
      this.keys.A.isDown ||
      this.keys.Q.isDown ||
      this.touchLeft;
    const right =
      this.cursors.right.isDown || this.keys.D.isDown || this.touchRight;
    const jumpHeld =
      this.cursors.up.isDown ||
      this.cursors.space.isDown ||
      this.keys.W.isDown ||
      this.keys.Z.isDown ||
      this.touchJumpHeld;
    const onGround = body.blocked.down;
    if (onGround) {
      this.lastGrounded = time;
      if (this.wasAirborne) {
        // atterrissage : petit squash + poussière
        this.wasAirborne = false;
        this.player.setScale(1.15, 0.85);
        this.tweens.add({
          targets: this.player,
          scaleX: 1,
          scaleY: 1,
          duration: 120,
        });
        this.dustEmitter.explode(6, this.player.x, this.player.y + 16);
      }
    } else {
      this.wasAirborne = true;
    }

    if (left && !right) {
      body.setVelocityX(-SPEED);
      this.player.setFlipX(true);
    } else if (right && !left) {
      body.setVelocityX(SPEED);
      this.player.setFlipX(false);
    } else {
      body.setVelocityX(0);
    }

    if (
      time - this.lastJumpPressed < JUMP_BUFFER_MS &&
      time - this.lastGrounded < COYOTE_MS
    ) {
      body.setVelocityY(JUMP_VELOCITY);
      this.lastJumpPressed = -99999;
      this.lastGrounded = -99999;
      this.dustEmitter.explode(8, this.player.x, this.player.y + 16);
    }
    // saut à hauteur variable : relâcher coupe l'élan
    if (!jumpHeld && body.velocity.y < -170) {
      body.setVelocityY(-170);
    }

    // animation
    if (onGround) {
      if (left !== right) {
        if (this.player.anims.currentAnim?.key !== "player-run" || !this.player.anims.isPlaying) {
          this.player.play("player-run");
        }
      } else {
        this.player.stop();
        this.player.setTexture("player-idle");
      }
    } else {
      this.player.stop();
      this.player.setTexture("player-jump");
    }
  }

  private updateEnemies(): void {
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) continue;
      const eb = enemy.body as Phaser.Physics.Arcade.Body;
      let vx = eb.velocity.x;
      if (vx === 0) vx = 45;
      if (eb.blocked.left) vx = Math.abs(vx);
      if (eb.blocked.right) vx = -Math.abs(vx);

      // demi-tour au bord du vide ou devant des piques
      if (eb.blocked.down) {
        const dir = vx > 0 ? 1 : -1;
        const frontX = enemy.x + dir * 18;
        const col = Math.floor(frontX / TILE);
        const rowBelow = Math.floor((enemy.y + 14 - this.offsetY) / TILE) + 1;
        const rowHere = rowBelow - 1;
        if (!this.isSolid(rowBelow, col) || this.charAt(rowHere, col) === "^") {
          vx = -vx;
        }
      }
      enemy.setVelocityX(vx);
      enemy.setFlipX(vx > 0);
    }
  }

  private collectCoin(coin: Phaser.Physics.Arcade.Sprite): void {
    if (!coin.active) return;
    this.sparkEmitter.explode(10, coin.x, coin.y);
    this.tweens.killTweensOf(coin);
    coin.destroy();
    this.coinCount += 1;
    this.registry.set("hud.coins", this.coinCount);
  }

  private touchEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (this.dead || this.won || !enemy.active) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const stomp = body.velocity.y > 0 && body.bottom < enemy.y + 4;
    if (stomp) {
      enemy.disableBody(true, false);
      this.tweens.add({
        targets: enemy,
        scaleY: 0.2,
        scaleX: 1.4,
        alpha: 0,
        duration: 220,
        onComplete: () => enemy.destroy(),
      });
      this.burstEmitter.setParticleTint(0xba68c8);
      this.burstEmitter.explode(12, enemy.x, enemy.y);
      body.setVelocityY(-330);
      this.cameras.main.shake(80, 0.004);
    } else {
      this.die();
    }
  }

  private die(): void {
    if (this.dead || this.won) return;
    this.dead = true;
    this.lives -= 1;
    this.registry.set("hud.lives", this.lives);

    this.burstEmitter.setParticleTint(0xff8a65);
    this.burstEmitter.explode(22, this.player.x, this.player.y);
    this.cameras.main.shake(180, 0.012);
    this.player.disableBody(true, true);

    this.time.delayedCall(800, () => {
      if (this.lives > 0) {
        this.player.enableBody(true, this.spawn.x, this.spawn.y, true, true);
        this.player.setVelocity(0, 0);
        this.dead = false;
        // clignotement d'invulnérabilité visuelle
        this.player.setAlpha(0.3);
        this.tweens.add({
          targets: this.player,
          alpha: 1,
          duration: 120,
          repeat: 4,
          yoyo: true,
        });
      } else {
        this.game.events.emit("banner", "Game Over", "Appuyez sur R pour réessayer");
        this.time.delayedCall(1800, () => this.exitToHub());
      }
    });
  }

  private win(): void {
    if (this.won || this.dead) return;
    this.won = true;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
    this.player.stop();
    this.player.setTexture("player-idle");

    this.sparkEmitter.explode(40, this.player.x, this.player.y - 20);
    this.cameras.main.flash(250, 255, 240, 160);

    const isBuiltin = !this.sceneData.custom;
    const nextIndex = (this.sceneData.levelIndex ?? 0) + 1;
    const hasNext = isBuiltin && nextIndex < BUILTIN_LEVELS.length;

    if (hasNext) {
      this.game.events.emit("banner", "Niveau terminé !", "Niveau suivant…");
    } else if (isBuiltin) {
      this.game.events.emit(
        "banner",
        "Victoire !",
        `Jeu terminé avec ${this.coinCount} pièces`
      );
    } else {
      this.game.events.emit("banner", "Niveau terminé !");
    }

    this.time.delayedCall(1600, () => {
      if (hasNext) {
        this.scene.restart({
          levelIndex: nextIndex,
          lives: this.lives,
          coins: this.coinCount,
        } satisfies GameSceneData);
      } else {
        this.exitToHub();
      }
    });
  }

  /**
   * Boutons tactiles fixés à la caméra (déplacement, saut, recommencer, menu).
   * Le canvas est mis à l'échelle en mode FIT, donc ces boutons suivent le jeu.
   */
  private createTouchControls(): void {
    // plusieurs doigts simultanés (ex. avancer + sauter)
    this.input.addPointer(2);

    const w = this.scale.width;
    const h = this.scale.height;
    const IDLE = 0.16;
    const ACTIVE = 0.38;

    const makeButton = (
      x: number,
      y: number,
      radius: number,
      label: string,
      fontSize: number
    ): { circle: Phaser.GameObjects.Arc; zone: Phaser.GameObjects.Zone } => {
      const circle = this.add
        .circle(x, y, radius, 0xffffff, IDLE)
        .setScrollFactor(0)
        .setDepth(1000)
        .setStrokeStyle(3, 0xffffff, 0.45);
      this.add
        .text(x, y, label, {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${fontSize}px`,
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1001);
      const zone = this.add
        .zone(x, y, radius * 2, radius * 2)
        .setScrollFactor(0)
        .setDepth(1002)
        .setInteractive();
      return { circle, zone };
    };

    const press = (c: Phaser.GameObjects.Arc) => c.setFillStyle(0xffffff, ACTIVE);
    const release = (c: Phaser.GameObjects.Arc) => c.setFillStyle(0xffffff, IDLE);

    // déplacement (bas-gauche)
    const leftBtn = makeButton(86, h - 78, 52, "◀", 38);
    leftBtn.zone.on("pointerdown", () => {
      this.touchLeft = true;
      press(leftBtn.circle);
    });
    const stopLeft = () => {
      this.touchLeft = false;
      release(leftBtn.circle);
    };
    leftBtn.zone.on("pointerup", stopLeft);
    leftBtn.zone.on("pointerout", stopLeft);

    const rightBtn = makeButton(210, h - 78, 52, "▶", 38);
    rightBtn.zone.on("pointerdown", () => {
      this.touchRight = true;
      press(rightBtn.circle);
    });
    const stopRight = () => {
      this.touchRight = false;
      release(rightBtn.circle);
    };
    rightBtn.zone.on("pointerup", stopRight);
    rightBtn.zone.on("pointerout", stopRight);

    // saut (bas-droite)
    const jumpBtn = makeButton(w - 92, h - 82, 62, "⤒", 44);
    jumpBtn.zone.on("pointerdown", () => {
      this.touchJumpHeld = true;
      this.lastJumpPressed = this.time.now;
      press(jumpBtn.circle);
    });
    const stopJump = () => {
      this.touchJumpHeld = false;
      release(jumpBtn.circle);
    };
    jumpBtn.zone.on("pointerup", stopJump);
    jumpBtn.zone.on("pointerout", stopJump);

    // recommencer + plein écran + menu (bas-centre, plus discrets)
    const restartBtn = makeButton(w / 2 - 72, h - 40, 24, "⟲", 22);
    restartBtn.zone.on("pointerdown", () => {
      this.scene.restart({
        ...this.sceneData,
        lives: 3,
        coins: this.sceneData.coins ?? 0,
      });
    });

    if (this.sys.game.device.fullscreen.available) {
      const fsBtn = makeButton(w / 2, h - 40, 24, "⛶", 20);
      fsBtn.zone.on("pointerdown", () => this.scale.toggleFullscreen());
    }

    const exitBtn = makeButton(w / 2 + 72, h - 40, 24, "≡", 22);
    exitBtn.zone.on("pointerdown", () => this.exitToHub());
  }

  private exitToHub(): void {
    this.scene.stop("UI");
    this.scene.start(this.sceneData.fromEditor ? "Editor" : "Menu");
  }
}
