/**
 * Format de niveau : une grille ASCII, une ligne par rangée de tuiles.
 *   ' ' vide   '#' sol   '=' brique   'o' pièce   '^' pique
 *   'E' ennemi   'P' apparition du joueur   'F' drapeau d'arrivée
 */
export interface LevelData {
  name: string;
  grid: string[];
}

export const SOLID_CHARS = new Set(["#", "="]);
export const VALID_CHARS = new Set([" ", "#", "=", "o", "^", "E", "P", "F"]);

const STORAGE_KEY = "sky-dash.custom-levels";

export const BUILTIN_LEVELS: LevelData[] = [
  {
    name: "Premiers pas",
    grid: [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "                   oo",
      "           oo     ====                 ooo                   oo",
      "          ====                        =====                 ====",
      "                         ooo                  oo",
      "  P                              ^^^                 E                      F",
      "#########################   #################    ###############################",
      "#########################   #################    ###############################",
      "#########################   #################    ###############################",
    ],
  },
  {
    name: "Les cavernes",
    grid: [
      "",
      "",
      "",
      "",
      "",
      "                                              ooo",
      "                                              ===",
      "                                         oo",
      "      ooo             oo                ====       oo                   oo",
      "      ===            ====                         ====                ====",
      "                oo                ===                    oo",
      "  P                   ^^^^  E               ^^^     E            ^^^^      E          F",
      "###############    ##############     ##################    ##############################",
      "###############    ##############     ##################    ##############################",
      "###############    ##############     ##################    ##############################",
    ],
  },
  {
    name: "Le sommet",
    grid: [
      "",
      "",
      "",
      "",
      "                                                                                            ooo",
      "                                                                                            ===",
      "                                                                                      ooo",
      "                                                                                      ===",
      "    ooo          ooo                   ooooo               ooooo",
      "    ===          =====                =======              =======                ===",
      "           oo                  ===              ===              ===",
      " P                ^^^^    E             ^^^^  E             ^^^^  E          ^^^     E           F",
      "##########    ################     ###############     ###############     #########################",
      "##########    ################     ###############     ###############     #########################",
      "##########    ################     ###############     ###############     #########################",
    ],
  },
];

/** Complète les lignes pour obtenir une grille rectangulaire d'au moins 30×15. */
export function normalizeGrid(grid: string[], minCols = 30, minRows = 15): string[] {
  const rows = grid.slice();
  while (rows.length < minRows) rows.unshift("");
  const width = Math.max(minCols, ...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(width, " "));
}

export function gridFindChar(grid: string[], ch: string): { row: number; col: number } | null {
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf(ch);
    if (c !== -1) return { row: r, col: c };
  }
  return null;
}

export function validateLevel(grid: string[]): string | null {
  if (!gridFindChar(grid, "P")) return "Il manque un point de départ (P).";
  if (!gridFindChar(grid, "F")) return "Il manque un drapeau d'arrivée (F).";
  return null;
}

export function isLevelData(value: unknown): value is LevelData {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    Array.isArray(v.grid) &&
    v.grid.every((row) => typeof row === "string")
  );
}

export function loadCustomLevels(): LevelData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLevelData);
  } catch {
    return [];
  }
}

export function saveCustomLevel(level: LevelData): void {
  const levels = loadCustomLevels().filter((l) => l.name !== level.name);
  levels.push(level);
  levels.sort((a, b) => a.name.localeCompare(b.name));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
}

export function deleteCustomLevel(name: string): void {
  const levels = loadCustomLevels().filter((l) => l.name !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
}
