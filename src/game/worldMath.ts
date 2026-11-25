import type { LandmarkKey } from './types';

export const WORLD_SIZE = 280;
export const WORLD_HALF = 128;
export const WATER_LEVEL = 0.25;
export const DUNGEON_Z_THRESHOLD = -185;
export const DUNGEON_CENTER = { x: 0, y: 10, z: -240 } as const;
export const DUNGEON_RADIUS = 26;

export interface LandmarkSpec {
  key: LandmarkKey;
  x: number;
  z: number;
  r: number;
  h: number;
  name: string;
}

export const LANDMARKS: Record<LandmarkKey, LandmarkSpec> = {
  spawn:      { key: 'spawn',      x: 0,    z: 0,    r: 15, h: 2.5,  name: 'Infinity Core Plaza' },
  blueCastle: { key: 'blueCastle', x: -54,  z: -28,  r: 20, h: 4.0,  name: 'Dawn Citadel' },
  redCastle:  { key: 'redCastle',  x: 56,   z: 36,   r: 20, h: 4.2,  name: 'Obsidian Citadel' },
  malakor:    { key: 'malakor',    x: 4,    z: -78,  r: 22, h: 2.0,  name: 'Ashfield Shadow Rift' },
  dungeon:    { key: 'dungeon',    x: -54,  z: 42,   r: 16, h: 2.4,  name: 'Sunken Ruin Portal' },
  cinema:     { key: 'cinema',     x: 16,   z: 62,   r: 17, h: 2.9,  name: 'OmniStream XR Cinema' },
  biolab:     { key: 'biolab',     x: 44,   z: -32,  r: 15, h: 3.2,  name: 'LoRAFlow Bio-Lab' },
  bookstore:  { key: 'bookstore',  x: -22,  z: 16,   r: 11, h: 2.5,  name: 'Rainy Bookstore' },
  sea:        { key: 'sea',        x: -10,  z: 96,   r: 36, h: -2.4, name: 'Ashen Sea' },
  waterfall:  { key: 'waterfall',  x: -46,  z: 74,   r: 16, h: 2.2,  name: 'Emerald Cliff Waterfall' },
  arcade:     { key: 'arcade',     x: 22,   z: 18,   r: 10, h: 2.5,  name: 'GeminIsland Arcade' },
};

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Deterministic terrain elevation used consistently by mesh generation,
 * grounded prop placement, character walking, buggy suspension, and camera clamping.
 */
export function getTerrainHeight(x: number, z: number): number {
  if (z < DUNGEON_Z_THRESHOLD) {
    return DUNGEON_CENTER.y;
  }

  let h =
    Math.sin(x * 0.032) * Math.cos(z * 0.032) * 4.1 +
    Math.sin(x * 0.072 + 1.1) * 1.3 +
    Math.cos(z * 0.068 - 0.7) * 1.3 +
    2.4;

  // Frostpeak Tundra ridge in the northwest
  const dFrost = Math.hypot(x + 78, z + 78);
  if (dFrost < 48) {
    h += (1 - smoothstep(8, 48, dFrost)) * 8.5;
  }

  // Subtle stepped-voxel terracing while staying smooth to drive
  h = h * 0.76 + (Math.round(h * 1.4) / 1.4) * 0.24;

  for (const key of Object.keys(LANDMARKS) as LandmarkKey[]) {
    const lm = LANDMARKS[key];
    const dist = Math.hypot(x - lm.x, z - lm.z);
    const blend = 1 - smoothstep(lm.r * 0.62, lm.r * 1.42, dist);
    if (blend > 0) {
      h = h * (1 - blend) + lm.h * blend;
    }
  }

  return h;
}

/**
 * All 7 authentic ShadowRealm biomes + Sunken Ruin Dungeon interior.
 */
export function getBiome(x: number, z: number): string {
  if (z < DUNGEON_Z_THRESHOLD) return 'Sunken Ruin Dungeon';
  if (Math.hypot(x - LANDMARKS.waterfall.x, z - LANDMARKS.waterfall.z) < 22) return 'Emerald Falls';
  if (Math.hypot(x - LANDMARKS.sea.x, z - LANDMARKS.sea.z) < 38) return 'Ashen Sea';
  if (Math.hypot(x + 78, z + 78) < 46) return 'Frostpeak Tundra';
  if (Math.hypot(x - LANDMARKS.malakor.x, z - LANDMARKS.malakor.z) < 36) return 'Ashfield Wastes';
  if (Math.hypot(x - LANDMARKS.redCastle.x, z - LANDMARKS.redCastle.z) < 30) return 'Obsidian Citadel';
  if (Math.hypot(x - LANDMARKS.dungeon.x, z - LANDMARKS.dungeon.z) < 26) return 'Sunken Ruin';
  if (x > 30 && z < 8) return 'Crimson Marsh';
  return 'Whispering Woods';
}

/**
 * Returns true if (x, z) lies on one of the stone/dirt trails connecting Spawn
 * to Dawn Citadel, Obsidian Citadel, Ashfield Rift, Cinema, and Bio-Lab.
 */
export function isOnTrail(x: number, z: number): boolean {
  const segments: Array<[number, number, number, number]> = [
    [0, 0, LANDMARKS.blueCastle.x, LANDMARKS.blueCastle.z],
    [0, 0, LANDMARKS.redCastle.x, LANDMARKS.redCastle.z],
    [0, 0, LANDMARKS.malakor.x, LANDMARKS.malakor.z],
    [0, 0, LANDMARKS.cinema.x, LANDMARKS.cinema.z],
    [0, 0, LANDMARKS.biolab.x, LANDMARKS.biolab.z],
    [0, 0, LANDMARKS.dungeon.x, LANDMARKS.dungeon.z],
    [0, 0, LANDMARKS.arcade.x, LANDMARKS.arcade.z],
    [LANDMARKS.dungeon.x, LANDMARKS.dungeon.z, LANDMARKS.waterfall.x, LANDMARKS.waterfall.z],
  ];

  for (const [ax, az, bx, bz] of segments) {
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq));
    const px = ax + dx * t;
    const pz = az + dz * t;
    if (Math.hypot(x - px, z - pz) < 2.9) return true;
  }
  return false;
}

/**
 * Returns RGB [0..1] tuple for deterministic vertex coloration across all 7 biomes.
 */
export function getTerrainRgb(x: number, z: number, y: number): [number, number, number] {
  if (isOnTrail(x, z) && y >= WATER_LEVEL + 0.35) {
    return [0.47, 0.42, 0.34]; // warm dirt/cobble road
  }
  const biome = getBiome(x, z);
  const checker = (Math.floor(x / 5) + Math.floor(z / 5)) % 2 === 0;

  if (biome === 'Frostpeak Tundra') {
    return y > 6.0 ? [0.85, 0.89, 0.94] : [0.56, 0.63, 0.72];
  }
  if (biome === 'Ashfield Wastes') {
    return checker ? [0.22, 0.14, 0.29] : [0.18, 0.11, 0.24];
  }
  if (biome === 'Crimson Marsh') {
    return checker ? [0.42, 0.19, 0.24] : [0.35, 0.16, 0.20];
  }
  if (biome === 'Obsidian Citadel') {
    return checker ? [0.26, 0.25, 0.31] : [0.21, 0.20, 0.26];
  }
  if (biome === 'Sunken Ruin') {
    return checker ? [0.32, 0.41, 0.37] : [0.27, 0.35, 0.32];
  }
  if (y < WATER_LEVEL + 0.35) {
    return [0.78, 0.70, 0.51]; // coastal beach sand
  }
  return checker ? [0.24, 0.52, 0.30] : [0.20, 0.45, 0.26]; // Whispering Woods meadow
}

export function clampWorldPos(x: number, z: number, inDungeon: boolean): { x: number; z: number } {
  if (inDungeon) {
    const dx = x - DUNGEON_CENTER.x;
    const dz = z - DUNGEON_CENTER.z;
    const dist = Math.hypot(dx, dz);
    const maxR = DUNGEON_RADIUS - 2;
    if (dist > maxR && dist > 0.001) {
      return {
        x: DUNGEON_CENTER.x + (dx / dist) * maxR,
        z: DUNGEON_CENTER.z + (dz / dist) * maxR,
      };
    }
    return { x, z };
  }
  return {
    x: Math.max(-WORLD_HALF, Math.min(WORLD_HALF, x)),
    z: Math.max(-WORLD_HALF, Math.min(WORLD_HALF, z)),
  };
}
