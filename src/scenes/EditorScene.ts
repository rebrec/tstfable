import Phaser from "phaser";
import { TILE } from "../textures";
import {
  isLevelData,
  LevelData,
  normalizeGrid,
  saveCustomLevel,
  VALID_CHARS,
  validateLevel,
} from "../levels";
import { makeButton } from "../ui";

const TOOLBAR_H = 92;
const MIN_COLS = 20;
const MAX_COLS = 250;
const MIN_ROWS = 10;
const MAX_ROWS = 30;

interface EditorState {
  name: string;
  grid: string[];
}

interface PaletteEntry {
  ch: string;
  texture: string | null;
  tip: string;
}

const PALETTE: PaletteEntry[] = [
  { ch: "#", texture: "ground", tip: "Sol" },
  { ch: "=", texture: "brick", tip: "Brique" },
  { ch: "o", texture: "coin", tip: "Pièce" },
  { ch: "^", texture: "spike", tip: "Piques" },
  { ch: "E", texture: "enemy", tip: "Ennemi" },
  { ch: "P", texture: "player-idle", tip: "Départ" },
  { ch: "F", texture: "flag", tip: "Arrivée" },
  { ch: " ", texture: null, tip: "Gomme" },
];

export class EditorScene extends Phaser.Scene {
  private levelName = "Mon niveau";
  private cells: string[][] = [];
  private selected = "#";

  private tileImages = new Map<string, Phaser.GameObjects.Image>();
  private gridGfx!: Phaser.GameObjects.Graphics;
  private cursorRect!: Phaser.GameObjects.Rectangle;
  private paletteMarker!: Phaser.GameObjects.Rectangle;
  private dimsText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTouch = false;
  private panX = 0;
  private panY = 0;

  constructor() {
    super("Editor");
  }

  init(data: { level?: LevelData }): void {
    let state: EditorState | undefined;
    if (data.level) {
      state = { name: data.level.name, grid: data.level.grid };
    } else {
      state = this.registry.get("editor.state") as EditorState | undefined;
    }
    if (!state) {
      state = { name: "Mon niveau", grid: defaultTemplate() };
    }
    this.levelName = state.name;
    this.cells = normalizeGrid(state.grid).map((row) => row.split(""));
    this.tileImages = new Map();
  }

  create(): void {
    this.isTouch = this.game.device.input.touch;
    this.panX = 0;
    this.panY = 0;
    this.input.mouse?.disableContextMenu();
    this.cameras.main.setBackgroundColor("#16203a");

    this.gridGfx = this.add.graphics().setDepth(0);
    this.cursorRect = this.add
      .rectangle(0, 0, TILE, TILE, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffd54f, 0.9)
      .setOrigin(0)
      .setDepth(50)
      .setVisible(false);

    this.rebuildAllTiles();
    this.buildToolbar();
    this.layoutCamera(true);

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.paint(p));
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      this.updateCursor(p);
      if (p.isDown) this.paint(p);
    });
    this.input.on(
      "wheel",
      (
        _p: Phaser.Input.Pointer,
        _objs: unknown,
        dx: number,
        dy: number
      ) => {
        const cam = this.cameras.main;
        cam.scrollX += dx * 0.7;
        cam.scrollY += dy * 0.7;
      }
    );

    if (this.isTouch) {
      this.buildPanControls();
    }
  }

  update(): void {
    const cam = this.cameras.main;
    const speed = 9;
    if (this.cursors.left.isDown) cam.scrollX -= speed;
    if (this.cursors.right.isDown) cam.scrollX += speed;
    if (this.cursors.up.isDown) cam.scrollY -= speed;
    if (this.cursors.down.isDown) cam.scrollY += speed;
    cam.scrollX += this.panX * speed;
    cam.scrollY += this.panY * speed;
  }

  /** Croix directionnelle tactile pour déplacer la vue de l'éditeur. */
  private buildPanControls(): void {
    const { width, height } = this.scale;
    const cx = width - 86;
    const cy = height - 70;
    const r = 22;
    const gap = 46;

    const mk = (dx: number, dy: number, label: string, ox: number, oy: number) => {
      const circle = this.add
        .circle(cx + ox, cy + oy, r, 0xffffff, 0.16)
        .setScrollFactor(0)
        .setDepth(940)
        .setStrokeStyle(2, 0xffffff, 0.45);
      this.add
        .text(cx + ox, cy + oy, label, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "22px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(941);
      const zone = this.add
        .zone(cx + ox, cy + oy, r * 2, r * 2)
        .setScrollFactor(0)
        .setDepth(942)
        .setInteractive();
      const start = () => {
        this.panX = dx;
        this.panY = dy;
        circle.setFillStyle(0xffffff, 0.38);
      };
      const stop = () => {
        if (this.panX === dx) this.panX = 0;
        if (this.panY === dy) this.panY = 0;
        circle.setFillStyle(0xffffff, 0.16);
      };
      zone.on("pointerdown", start);
      zone.on("pointerup", stop);
      zone.on("pointerout", stop);
    };

    mk(-1, 0, "◀", -gap, 0);
    mk(1, 0, "▶", gap, 0);
    mk(0, -1, "▲", 0, -gap);
    mk(0, 1, "▼", 0, gap);
  }

  // --- grille ---------------------------------------------------------

  private get rows(): number {
    return this.cells.length;
  }

  private get cols(): number {
    return this.cells[0].length;
  }

  private gridAsStrings(): string[] {
    return this.cells.map((row) => row.join(""));
  }

  private currentLevel(): LevelData {
    return { name: this.levelName, grid: this.gridAsStrings() };
  }

  private persist(): void {
    this.registry.set("editor.state", {
      name: this.levelName,
      grid: this.gridAsStrings(),
    } satisfies EditorState);
  }

  private layoutCamera(reset: boolean): void {
    const cam = this.cameras.main;
    cam.setBounds(
      -60,
      -TOOLBAR_H - 40,
      this.cols * TILE + 320,
      this.rows * TILE + TOOLBAR_H + 220
    );
    if (reset) {
      cam.setScroll(-20, -TOOLBAR_H - 16);
    }
    this.drawGridLines();
    if (this.dimsText) {
      this.dimsText.setText(`${this.cols} × ${this.rows}`);
    }
  }

  private drawGridLines(): void {
    const g = this.gridGfx;
    g.clear();
    g.fillStyle(0x0e1730, 1);
    g.fillRect(0, 0, this.cols * TILE, this.rows * TILE);
    g.lineStyle(1, 0x2c3e66, 0.6);
    for (let c = 0; c <= this.cols; c++) {
      g.lineBetween(c * TILE, 0, c * TILE, this.rows * TILE);
    }
    for (let r = 0; r <= this.rows; r++) {
      g.lineBetween(0, r * TILE, this.cols * TILE, r * TILE);
    }
    g.lineStyle(2, 0x5d7bb0, 1);
    g.strokeRect(0, 0, this.cols * TILE, this.rows * TILE);
  }

  private rebuildAllTiles(): void {
    for (const img of this.tileImages.values()) img.destroy();
    this.tileImages.clear();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.refreshCellImage(r, c);
      }
    }
  }

  private refreshCellImage(row: number, col: number): void {
    const key = `${row},${col}`;
    const existing = this.tileImages.get(key);
    if (existing) {
      existing.destroy();
      this.tileImages.delete(key);
    }
    const ch = this.cells[row][col];
    const entry = PALETTE.find((p) => p.ch === ch);
    if (!entry || !entry.texture) return;
    let img: Phaser.GameObjects.Image;
    if (ch === "F") {
      img = this.add
        .image(col * TILE, (row + 1) * TILE, "flag")
        .setOrigin(0, 1);
    } else {
      img = this.add.image(
        col * TILE + TILE / 2,
        row * TILE + TILE / 2,
        entry.texture
      );
    }
    img.setDepth(10);
    this.tileImages.set(key, img);
  }

  private setCell(row: number, col: number, ch: string): void {
    if (this.cells[row][col] === ch) return;
    // P et F sont uniques : on déplace l'existant
    if (ch === "P" || ch === "F") {
      for (let r = 0; r < this.rows; r++) {
        const c = this.cells[r].indexOf(ch);
        if (c !== -1) {
          this.cells[r][c] = " ";
          this.refreshCellImage(r, c);
        }
      }
    }
    this.cells[row][col] = ch;
    this.refreshCellImage(row, col);
  }

  private pointerCell(p: Phaser.Input.Pointer): { row: number; col: number } | null {
    if (p.y < TOOLBAR_H + 4) return null;
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    const col = Math.floor(wp.x / TILE);
    const row = Math.floor(wp.y / TILE);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return { row, col };
  }

  private paint(p: Phaser.Input.Pointer): void {
    const cell = this.pointerCell(p);
    if (!cell) return;
    const ch = p.rightButtonDown() ? " " : this.selected;
    this.setCell(cell.row, cell.col, ch);
  }

  private updateCursor(p: Phaser.Input.Pointer): void {
    const cell = this.pointerCell(p);
    if (!cell) {
      this.cursorRect.setVisible(false);
      return;
    }
    this.cursorRect
      .setVisible(true)
      .setPosition(cell.col * TILE, cell.row * TILE);
  }

  private changeSize(dCols: number, dRows: number): void {
    const cols = Phaser.Math.Clamp(this.cols + dCols, MIN_COLS, MAX_COLS);
    const rows = Phaser.Math.Clamp(this.rows + dRows, MIN_ROWS, MAX_ROWS);
    if (cols === this.cols && rows === this.rows) return;
    // lignes ajoutées en haut pour garder le sol en bas
    const next: string[][] = [];
    for (let r = 0; r < rows; r++) {
      const srcRow = this.cells[r - (rows - this.rows)];
      const row: string[] = [];
      for (let c = 0; c < cols; c++) {
        row.push(srcRow?.[c] ?? " ");
      }
      next.push(row);
    }
    this.cells = next;
    this.rebuildAllTiles();
    this.layoutCamera(false);
  }

  // --- barre d'outils --------------------------------------------------

  private buildToolbar(): void {
    const { width } = this.scale;

    this.add
      .rectangle(0, 0, width, TOOLBAR_H, 0x0b1021, 0.96)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(900)
      .setStrokeStyle(2, 0x5d7bb0, 0.8);

    // palette
    this.paletteMarker = this.add
      .rectangle(0, 24, 42, 42)
      .setStrokeStyle(3, 0xffd54f)
      .setScrollFactor(0)
      .setDepth(902);

    PALETTE.forEach((entry, i) => {
      const x = 34 + i * 50;
      const y = 26;
      const slot = this.add
        .rectangle(x, y, 42, 42, 0x1f2a44)
        .setScrollFactor(0)
        .setDepth(901)
        .setInteractive({ useHandCursor: true });
      if (entry.texture) {
        const icon = this.add
          .image(x, y, entry.texture)
          .setScrollFactor(0)
          .setDepth(902);
        const scale = Math.min(30 / icon.width, 30 / icon.height);
        icon.setScale(scale);
      } else {
        this.add
          .text(x, y, "⌫", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "22px",
            color: "#ff8a80",
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(902);
      }
      this.add
        .text(x, y + 28, entry.tip, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "11px",
          color: "#9fb3dc",
        })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(902);
      slot.on("pointerdown", () => {
        this.selected = entry.ch;
        this.paletteMarker.setPosition(x, y);
      });
      if (entry.ch === this.selected) {
        this.paletteMarker.setPosition(x, y);
      }
    });

    // dimensions
    const sizeX = 34 + PALETTE.length * 50 + 30;
    this.dimsText = this.add
      .text(sizeX + 50, 14, `${this.cols} × ${this.rows}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#e8eefc",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(902);
    const sizeButtons: Array<[string, () => void]> = [
      ["−L", () => this.changeSize(-10, 0)],
      ["+L", () => this.changeSize(10, 0)],
      ["−H", () => this.changeSize(0, -2)],
      ["+H", () => this.changeSize(0, 2)],
    ];
    sizeButtons.forEach(([label, fn], i) => {
      makeButton(this, sizeX + 22 + i * 48, 38, label, fn, {
        fontSize: 13,
        width: 42,
      })
        .setScrollFactor(0)
        .setDepth(902);
    });

    // actions, alignées à droite sur la deuxième ligne
    const actions: Array<[string, () => void, number?]> = [
      ["▶ Tester", () => this.testLevel(), 0x2a4a2f],
      ["💾 Sauver", () => this.saveLevel()],
      ["⇪ Exporter", () => this.exportLevel()],
      ["⇩ Importer", () => this.importLevel()],
      ["🧹 Vider", () => this.clearLevel()],
      ["↩ Menu", () => this.exitToMenu(), 0x4a2a2a],
    ];
    let x = width - 10;
    for (const [label, fn, color] of [...actions].reverse()) {
      const btn = makeButton(this, 0, 70, label, fn, {
        fontSize: this.isTouch ? 16 : 13,
        color,
      })
        .setScrollFactor(0)
        .setDepth(902);
      btn.setX(x - btn.width / 2);
      x -= btn.width + (this.isTouch ? 10 : 8);
    }

    // raccourcis d'aide (souris uniquement ; sur tactile, croix de déplacement)
    if (!this.isTouch) {
      this.add
        .text(34, 70, "Clic G : placer  •  Clic D : effacer  •  Flèches : vue", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#9fb3dc",
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(902);
    }
  }

  // --- actions ----------------------------------------------------------

  private testLevel(): void {
    const error = validateLevel(this.gridAsStrings());
    if (error) {
      this.toast(error);
      return;
    }
    this.persist();
    this.scene.start("Game", { custom: this.currentLevel(), fromEditor: true });
  }

  private saveLevel(): void {
    const error = validateLevel(this.gridAsStrings());
    if (error) {
      this.toast(error);
      return;
    }
    const name = window.prompt("Nom du niveau :", this.levelName);
    if (!name || !name.trim()) return;
    this.levelName = name.trim().slice(0, 32);
    saveCustomLevel(this.currentLevel());
    this.persist();
    this.toast(`« ${this.levelName} » sauvegardé — jouable depuis le menu`);
  }

  private exportLevel(): void {
    const json = JSON.stringify(this.currentLevel());
    const fallback = (): void => {
      window.prompt("Copiez le JSON du niveau :", json);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(json)
        .then(() => this.toast("Niveau copié dans le presse-papiers (JSON)"))
        .catch(fallback);
    } else {
      fallback();
    }
  }

  private importLevel(): void {
    const raw = window.prompt("Collez le JSON d'un niveau exporté :");
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isLevelData(parsed)) throw new Error("format");
      const grid = normalizeGrid(parsed.grid).map((row) =>
        row
          .split("")
          .map((ch) => (VALID_CHARS.has(ch) ? ch : " "))
          .join("")
      );
      this.levelName = parsed.name.slice(0, 32) || "Niveau importé";
      this.cells = grid.map((row) => row.split(""));
      this.rebuildAllTiles();
      this.layoutCamera(true);
      this.persist();
      this.toast(`« ${this.levelName} » importé`);
    } catch {
      this.toast("JSON invalide : import impossible");
    }
  }

  private clearLevel(): void {
    if (!window.confirm("Vider entièrement le niveau ?")) return;
    this.cells = defaultTemplate().map((row) => row.split(""));
    this.cells = normalizeGrid(this.gridAsStrings()).map((r) => r.split(""));
    this.rebuildAllTiles();
    this.layoutCamera(true);
    this.persist();
  }

  private exitToMenu(): void {
    this.persist();
    this.scene.start("Menu");
  }

  private toast(message: string): void {
    const { width, height } = this.scale;
    const text = this.add
      .text(width / 2, height - 36, message, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#1f2a44",
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(950);
    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 2200,
      duration: 400,
      onComplete: () => text.destroy(),
    });
  }
}

function defaultTemplate(): string[] {
  const cols = 60;
  const rows = 15;
  const grid: string[] = [];
  for (let r = 0; r < rows - 3; r++) {
    if (r === rows - 4) {
      grid.push(
        " P".padEnd(cols - 3, " ") + "F  "
      );
    } else {
      grid.push("");
    }
  }
  for (let r = 0; r < 3; r++) {
    grid.push("#".repeat(cols));
  }
  return grid;
}
