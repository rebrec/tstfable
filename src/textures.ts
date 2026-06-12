import Phaser from "phaser";

export const TILE = 32;

/**
 * Toutes les textures du jeu sont générées par code au démarrage :
 * aucun asset externe, le HTML final reste 100 % autonome.
 */
export function generateTextures(scene: Phaser.Scene): void {
  makeSky(scene);
  makeGround(scene);
  makeBrick(scene);
  makeSpike(scene);
  makeCoin(scene);
  makeFlag(scene);
  makePlayer(scene);
  makeEnemy(scene);
  makeCloud(scene);
  makeHills(scene, "hills-far", 0x2e4a7a, 120);
  makeHills(scene, "hills-near", 0x38618c, 170);
  makeParticles(scene);
}

function g(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.make.graphics({ x: 0, y: 0 }, false);
}

function makeSky(scene: Phaser.Scene): void {
  const w = 32;
  const h = 270;
  const tex = scene.textures.createCanvas("sky", w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#1e3a8a");
  grad.addColorStop(0.55, "#3b82f6");
  grad.addColorStop(1, "#93c5fd");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  tex.refresh();
}

function drawDirt(gr: Phaser.GameObjects.Graphics): void {
  gr.fillStyle(0x7a4a2b);
  gr.fillRect(0, 0, TILE, TILE);
  gr.fillStyle(0x6b3f24);
  gr.fillRect(4, 14, 6, 5);
  gr.fillRect(20, 20, 7, 5);
  gr.fillRect(12, 26, 5, 4);
  gr.fillStyle(0x8d5a3b);
  gr.fillRect(24, 12, 5, 4);
  gr.fillRect(6, 22, 4, 3);
}

function makeGround(scene: Phaser.Scene): void {
  // tuile enterrée : terre seule
  let gr = g(scene);
  drawDirt(gr);
  gr.fillStyle(0x6b3f24);
  gr.fillRect(16, 4, 6, 4);
  gr.generateTexture("dirt", TILE, TILE);
  gr.destroy();

  // tuile de surface : terre + gazon
  gr = g(scene);
  drawDirt(gr);
  gr.fillStyle(0x3e8e41);
  gr.fillRect(0, 0, TILE, 9);
  gr.fillStyle(0x5cb85c);
  gr.fillRect(0, 0, TILE, 4);
  gr.fillStyle(0x7ed07e);
  gr.fillRect(0, 0, TILE, 2);
  // brins d'herbe
  gr.fillStyle(0x5cb85c);
  for (const x of [3, 11, 19, 27]) {
    gr.fillTriangle(x, 9, x + 2, 3, x + 4, 9);
  }
  gr.generateTexture("ground", TILE, TILE);
  gr.destroy();
}

function makeBrick(scene: Phaser.Scene): void {
  const gr = g(scene);
  gr.fillStyle(0x8e99a8);
  gr.fillRect(0, 0, TILE, TILE);
  // biseau clair haut/gauche, sombre bas/droite
  gr.fillStyle(0xb8c2cf);
  gr.fillRect(0, 0, TILE, 3);
  gr.fillRect(0, 0, 3, TILE);
  gr.fillStyle(0x5f6977);
  gr.fillRect(0, TILE - 3, TILE, 3);
  gr.fillRect(TILE - 3, 0, 3, TILE);
  // joints de pierre
  gr.fillStyle(0x6e7888);
  gr.fillRect(3, 15, TILE - 6, 2);
  gr.fillRect(15, 3, 2, 12);
  gr.fillRect(9, 17, 2, 12);
  gr.fillRect(22, 17, 2, 12);
  gr.generateTexture("brick", TILE, TILE);
  gr.destroy();
}

function makeSpike(scene: Phaser.Scene): void {
  const gr = g(scene);
  for (const x of [0, 16]) {
    gr.fillStyle(0xcfd8dc);
    gr.fillTriangle(x, TILE, x + 8, 4, x + 8, TILE);
    gr.fillStyle(0x78909c);
    gr.fillTriangle(x + 8, 4, x + 16, TILE, x + 8, TILE);
  }
  gr.fillStyle(0x546e7a);
  gr.fillRect(0, TILE - 4, TILE, 4);
  gr.generateTexture("spike", TILE, TILE);
  gr.destroy();
}

function makeCoin(scene: Phaser.Scene): void {
  const gr = g(scene);
  gr.fillStyle(0xc88a00);
  gr.fillCircle(11, 11, 11);
  gr.fillStyle(0xffb300);
  gr.fillCircle(11, 10, 10);
  gr.fillStyle(0xffd54f);
  gr.fillCircle(11, 10, 6);
  gr.fillStyle(0xffecb3);
  gr.fillCircle(8, 7, 2.5);
  gr.generateTexture("coin", 22, 22);
  gr.destroy();
}

function makeFlag(scene: Phaser.Scene): void {
  const gr = g(scene);
  // mât
  gr.fillStyle(0x9e9e9e);
  gr.fillRect(4, 4, 4, 60);
  gr.fillStyle(0xe0e0e0);
  gr.fillCircle(6, 4, 4);
  // drapeau
  gr.fillStyle(0x2e7d32);
  gr.fillTriangle(8, 6, 30, 13, 8, 22);
  gr.fillStyle(0x66bb6a);
  gr.fillTriangle(8, 6, 22, 11, 8, 15);
  // socle
  gr.fillStyle(0x757575);
  gr.fillRect(0, 60, 16, 4);
  gr.generateTexture("flag", 32, 64);
  gr.destroy();
}

function drawPlayerBase(gr: Phaser.GameObjects.Graphics): void {
  // corps
  gr.fillStyle(0xe65100);
  gr.fillRoundedRect(1, 1, 26, 26, 9);
  gr.fillStyle(0xff9800);
  gr.fillRoundedRect(2, 2, 24, 24, 8);
  gr.fillStyle(0xffb74d);
  gr.fillRoundedRect(4, 4, 20, 10, 6);
  // yeux
  gr.fillStyle(0xffffff);
  gr.fillCircle(10, 12, 4.5);
  gr.fillCircle(19, 12, 4.5);
  gr.fillStyle(0x263238);
  gr.fillCircle(11.5, 12, 2.2);
  gr.fillCircle(20.5, 12, 2.2);
  // joues + bouche
  gr.fillStyle(0xff7043);
  gr.fillCircle(7, 19, 2);
  gr.fillCircle(22, 19, 2);
  gr.fillStyle(0x6d4c41);
  gr.fillRoundedRect(12, 20, 6, 2.5, 1);
}

function makePlayer(scene: Phaser.Scene): void {
  // idle : deux pieds posés
  let gr = g(scene);
  drawPlayerBase(gr);
  gr.fillStyle(0xbf360c);
  gr.fillRoundedRect(5, 27, 8, 7, 3);
  gr.fillRoundedRect(15, 27, 8, 7, 3);
  gr.generateTexture("player-idle", 28, 34);
  gr.destroy();

  // course frame 1 : jambes écartées
  gr = g(scene);
  drawPlayerBase(gr);
  gr.fillStyle(0xbf360c);
  gr.fillRoundedRect(1, 27, 8, 7, 3);
  gr.fillRoundedRect(19, 25, 8, 7, 3);
  gr.generateTexture("player-run1", 28, 34);
  gr.destroy();

  // course frame 2 : jambes croisées
  gr = g(scene);
  drawPlayerBase(gr);
  gr.fillStyle(0xbf360c);
  gr.fillRoundedRect(8, 25, 8, 7, 3);
  gr.fillRoundedRect(12, 27, 8, 7, 3);
  gr.generateTexture("player-run2", 28, 34);
  gr.destroy();

  // saut : pieds repliés
  gr = g(scene);
  drawPlayerBase(gr);
  gr.fillStyle(0xbf360c);
  gr.fillRoundedRect(4, 26, 8, 6, 3);
  gr.fillRoundedRect(16, 26, 8, 6, 3);
  gr.generateTexture("player-jump", 28, 34);
  gr.destroy();
}

function makeEnemy(scene: Phaser.Scene): void {
  const gr = g(scene);
  gr.fillStyle(0x6a1b9a);
  gr.fillRoundedRect(0, 2, 30, 20, { tl: 14, tr: 14, bl: 4, br: 4 });
  gr.fillStyle(0x8e24aa);
  gr.fillRoundedRect(1, 3, 28, 18, { tl: 13, tr: 13, bl: 4, br: 4 });
  gr.fillStyle(0xba68c8);
  gr.fillRoundedRect(4, 4, 22, 7, 5);
  // yeux fâchés
  gr.fillStyle(0xffffff);
  gr.fillCircle(10, 11, 4);
  gr.fillCircle(20, 11, 4);
  gr.fillStyle(0x1a1a1a);
  gr.fillCircle(11, 12, 2);
  gr.fillCircle(19, 12, 2);
  gr.fillStyle(0x4a148c);
  gr.fillTriangle(5, 6, 13, 8, 6, 11);
  gr.fillTriangle(25, 6, 17, 8, 24, 11);
  // pieds
  gr.fillStyle(0x38006b);
  gr.fillRoundedRect(2, 20, 9, 4, 2);
  gr.fillRoundedRect(19, 20, 9, 4, 2);
  gr.generateTexture("enemy", 30, 24);
  gr.destroy();
}

function makeCloud(scene: Phaser.Scene): void {
  const gr = g(scene);
  gr.fillStyle(0xffffff, 0.92);
  gr.fillCircle(24, 26, 14);
  gr.fillCircle(44, 18, 17);
  gr.fillCircle(66, 24, 15);
  gr.fillCircle(84, 28, 11);
  gr.fillRoundedRect(14, 24, 78, 14, 7);
  gr.generateTexture("cloud", 100, 42);
  gr.destroy();
}

function makeHills(
  scene: Phaser.Scene,
  key: string,
  color: number,
  height: number
): void {
  const w = 512;
  const gr = g(scene);
  gr.fillStyle(color);
  // collines arrondies qui se raccordent aux deux bords pour un tileSprite continu
  const bumps = [
    { x: 0, r: 90 },
    { x: 140, r: 70 },
    { x: 260, r: 100 },
    { x: 390, r: 65 },
    { x: 512, r: 90 },
  ];
  for (const b of bumps) {
    gr.fillCircle(b.x, height, b.r);
  }
  gr.fillRect(0, height - 20, w, height + 20);
  gr.generateTexture(key, w, height * 2);
  gr.destroy();
}

function makeParticles(scene: Phaser.Scene): void {
  let gr = g(scene);
  gr.fillStyle(0xffffff);
  gr.fillCircle(4, 4, 4);
  gr.generateTexture("spark", 8, 8);
  gr.destroy();

  gr = g(scene);
  gr.fillStyle(0xffffff);
  gr.fillRect(0, 0, 5, 5);
  gr.generateTexture("pixel", 5, 5);
  gr.destroy();
}
