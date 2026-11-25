import type {
  CultivationRealmSpec,
  HeroClassKey,
  HeroClassSpec,
  InventoryState,
  LineageId,
  LineageSpec,
  LoraWeights,
  QuestProgress,
  RealmShardSpec,
  SavePayload,
  SkillLevels,
} from './types';

export const HERO_CLASSES: Record<HeroClassKey, HeroClassSpec> = {
  shadowblade: {
    key: 'shadowblade',
    name: 'Shadowblade',
    role: 'Crit Assassin',
    description: 'High-speed melee duelist with wide crimson cleave and lethal critical strikes.',
    hp: 185,
    mp: 100,
    speed: 16.5,
    damage: 28,
    critChance: 0.28,
    range: 6.4,
    ranged: false,
    bodyColor: 0x2a1b3d,
    accentColor: 0xf43f5e,
    weapon: 'blade',
  },
  pyromancer: {
    key: 'pyromancer',
    name: 'Pyromancer',
    role: 'Flame Caster',
    description: 'Launches explosive firebolts with rapid mana regeneration and siege AoE burst.',
    hp: 145,
    mp: 155,
    speed: 15.2,
    damage: 26,
    critChance: 0.18,
    range: 28.0,
    ranged: true,
    bodyColor: 0x4a1919,
    accentColor: 0xf97316,
    weapon: 'staff',
  },
  ironwarden: {
    key: 'ironwarden',
    name: 'Iron Warden',
    role: 'Siege Tank',
    description: 'Armored fortress vanguard with massive vitality and earth-shattering hammer blows.',
    hp: 245,
    mp: 95,
    speed: 14.4,
    damage: 25,
    critChance: 0.14,
    range: 6.8,
    ranged: false,
    bodyColor: 0x263547,
    accentColor: 0x38bdf8,
    weapon: 'hammer',
  },
  voidwalker: {
    key: 'voidwalker',
    name: 'Voidwalker',
    role: 'Rift Siphon',
    description: 'Channels piercing Void bolts that siphon soul energy on every hit.',
    hp: 165,
    mp: 140,
    speed: 15.8,
    damage: 25,
    critChance: 0.22,
    range: 27.0,
    ranged: true,
    bodyColor: 0x1e1638,
    accentColor: 0xc084fc,
    weapon: 'voidorb',
  },
};

export const LINEAGES: Record<LineageId, LineageSpec> = {
  human: {
    id: 'human',
    name: 'Terran Sovereign',
    origin: 'Solara Citadel',
    passiveSummary: '+10% HP · +10% ATK · +12% Spirit',
    hpBonusPct: 10,
    attackBonusPct: 10,
    defenseBonusPct: 10,
    manaBonusPct: 10,
    cultivationSpeedPct: 12,
    scale: [1, 1, 1],
    accentColor: 0xe0b254,
    skinColor: 0xe6be98,
    trait: 'crest',
  },
  sylvan_elf: {
    id: 'sylvan_elf',
    name: 'Sylvan High-Elf',
    origin: 'Verdant Spires',
    passiveSummary: '+18% ATK · +15% MP · Agile',
    hpBonusPct: 4,
    attackBonusPct: 18,
    defenseBonusPct: 4,
    manaBonusPct: 15,
    cultivationSpeedPct: 10,
    scale: [0.94, 1.07, 0.94],
    accentColor: 0x10b981,
    skinColor: 0xf0d7bf,
    trait: 'ears',
  },
  ironforge_dwarf: {
    id: 'ironforge_dwarf',
    name: 'Ironforge Runesmith',
    origin: 'Ironforge Bastion',
    passiveSummary: '+22% HP · +20% DEF · Sturdy',
    hpBonusPct: 22,
    attackBonusPct: 8,
    defenseBonusPct: 20,
    manaBonusPct: 4,
    cultivationSpeedPct: 8,
    scale: [1.14, 0.86, 1.12],
    accentColor: 0xd97706,
    skinColor: 0xddb08b,
    trait: 'beard',
  },
  azure_dragonkin: {
    id: 'azure_dragonkin',
    name: 'Azure Dragonkin',
    origin: 'Skyridge Peak',
    passiveSummary: '+16% HP · +16% ATK · Horns',
    hpBonusPct: 16,
    attackBonusPct: 16,
    defenseBonusPct: 12,
    manaBonusPct: 10,
    cultivationSpeedPct: 14,
    scale: [1.06, 1.08, 1.06],
    accentColor: 0x0ea5e9,
    skinColor: 0x8ab4d6,
    trait: 'horns',
  },
  celestial_kitsune: {
    id: 'celestial_kitsune',
    name: 'Celestial Kitsune',
    origin: 'Moonlit Grove',
    passiveSummary: '+24% MP · +14% ATK · +18% Spirit',
    hpBonusPct: 6,
    attackBonusPct: 14,
    defenseBonusPct: 6,
    manaBonusPct: 24,
    cultivationSpeedPct: 18,
    scale: [0.95, 1.01, 0.95],
    accentColor: 0xf43f5e,
    skinColor: 0xf5dfc9,
    trait: 'tails',
  },
  void_walker: {
    id: 'void_walker',
    name: 'Void Walker',
    origin: 'Astral Rift',
    passiveSummary: '+20% ATK · +20% MP · Shards',
    hpBonusPct: 8,
    attackBonusPct: 20,
    defenseBonusPct: 8,
    manaBonusPct: 20,
    cultivationSpeedPct: 16,
    scale: [0.98, 1.05, 0.98],
    accentColor: 0x8b5cf6,
    skinColor: 0x6d7599,
    trait: 'crystals',
  },
};

export const CULTIVATION_REALMS: readonly CultivationRealmSpec[] = [
  {
    tier: 0,
    name: 'Mortal Initiate',
    minLevel: 1,
    spiritStoneCost: 0,
    powerMultiplier: 1.0,
    auraHex: '#94a3b8',
    auraColor: 0x94a3b8,
  },
  {
    tier: 1,
    name: 'Qi Condensation',
    minLevel: 2,
    spiritStoneCost: 30,
    powerMultiplier: 1.25,
    auraHex: '#38bdf8',
    auraColor: 0x38bdf8,
  },
  {
    tier: 2,
    name: 'Foundation Realm',
    minLevel: 4,
    spiritStoneCost: 85,
    powerMultiplier: 1.6,
    auraHex: '#10b981',
    auraColor: 0x10b981,
  },
  {
    tier: 3,
    name: 'Core Formation',
    minLevel: 6,
    spiritStoneCost: 180,
    powerMultiplier: 2.05,
    auraHex: '#f59e0b',
    auraColor: 0xf59e0b,
  },
  {
    tier: 4,
    name: 'Nascent Soul',
    minLevel: 9,
    spiritStoneCost: 340,
    powerMultiplier: 2.65,
    auraHex: '#a855f7',
    auraColor: 0xa855f7,
  },
  {
    tier: 5,
    name: 'Sovereign Ascendant',
    minLevel: 12,
    spiritStoneCost: 600,
    powerMultiplier: 3.4,
    auraHex: '#facc15',
    auraColor: 0xfacc15,
  },
];

export const REALM_SHARDS: readonly RealmShardSpec[] = [
  {
    id: 'solara-eu',
    name: 'Solara Citadel',
    region: 'EU-West',
    biomeTheme: 'Sunlit Plains & Grand Keep',
    maxCapacity: 250,
  },
  {
    id: 'verdant-na',
    name: 'Verdant Spires',
    region: 'NA-East',
    biomeTheme: 'Emerald Canopy & Ancient Shrines',
    maxCapacity: 250,
  },
  {
    id: 'ironforge-ap',
    name: 'Ironforge Bastion',
    region: 'AP-East',
    biomeTheme: 'Volcanic Crags & Runic Watchtowers',
    maxCapacity: 250,
  },
];

export function computeHeroPowerStats(params: {
  classKey: HeroClassKey;
  lineageId: LineageId;
  level: number;
  cultivationTier: number;
  skills: SkillLevels;
  weaponTier: number;
  infinityTier: number;
}): { maxHp: number; maxMp: number; combatPower: number; cultivationMult: number } {
  const cls = HERO_CLASSES[params.classKey];
  const lin = LINEAGES[params.lineageId];
  const cult = CULTIVATION_REALMS[Math.min(CULTIVATION_REALMS.length - 1, Math.max(0, params.cultivationTier))];

  const rawHp = cls.hp + (params.level - 1) * 24 + params.skills.vitality * 22;
  const rawMp = cls.mp + (params.level - 1) * 14 + params.skills.arcana * 18;
  const maxHp = Math.round(rawHp * (1 + lin.hpBonusPct / 100) * (0.85 + cult.powerMultiplier * 0.15));
  const maxMp = Math.round(rawMp * (1 + lin.manaBonusPct / 100) * (0.85 + cult.powerMultiplier * 0.15));

  const atkScore =
    (cls.damage + (params.weaponTier - 1) * 12 + params.skills.power * 6) *
    (1 + lin.attackBonusPct / 100) *
    (1 + (params.infinityTier - 1) * 0.15) *
    cult.powerMultiplier;

  const combatPower = Math.round(maxHp * 1.4 + maxMp * 1.1 + atkScore * 22 + params.level * 120);
  return { maxHp, maxMp, combatPower, cultivationMult: cult.powerMultiplier };
}

export function attemptCultivationBreakthrough(state: {
  level: number;
  cultivationTier: number;
  spiritStones: number;
}): { ok: boolean; nextTier: number; spiritStones: number; realmName: string; reason?: string } {
  const nextSpec = CULTIVATION_REALMS[state.cultivationTier + 1];
  if (!nextSpec) {
    return {
      ok: false,
      nextTier: state.cultivationTier,
      spiritStones: state.spiritStones,
      realmName: CULTIVATION_REALMS[state.cultivationTier].name,
      reason: 'Already attained Sovereign Ascendant peak realm.',
    };
  }
  if (state.level < nextSpec.minLevel) {
    return {
      ok: false,
      nextTier: state.cultivationTier,
      spiritStones: state.spiritStones,
      realmName: CULTIVATION_REALMS[state.cultivationTier].name,
      reason: `Requires Level ${nextSpec.minLevel} for ${nextSpec.name}.`,
    };
  }
  if (state.spiritStones < nextSpec.spiritStoneCost) {
    return {
      ok: false,
      nextTier: state.cultivationTier,
      spiritStones: state.spiritStones,
      realmName: CULTIVATION_REALMS[state.cultivationTier].name,
      reason: `Need ${nextSpec.spiritStoneCost} Spirit Stones (${state.spiritStones} held).`,
    };
  }
  return {
    ok: true,
    nextTier: nextSpec.tier,
    spiritStones: state.spiritStones - nextSpec.spiritStoneCost,
    realmName: nextSpec.name,
  };
}

export const INITIAL_INVENTORY: InventoryState = {
  sticks: 4,
  stones: 3,
  apples: 2,
  crystals: 2,
  fish: 1,
  weaponTier: 1,
};

export const INITIAL_SKILLS: SkillLevels = {
  power: 0,
  vitality: 0,
  haste: 0,
  arcana: 0,
};

export const INITIAL_LORA: LoraWeights = {
  aggression: 0.8,
  healing: 0.8,
  magnet: 7,
};

export const INITIAL_QUESTS: QuestProgress = {
  captureObsidian: false,
  adsBlockedTarget: 3,
  adsBlocked: 0,
  memeProjected: false,
  defeatMalakor: false,
  defeatVoryn: false,
  catchFish: false,
  driveBuggy: false,
};

export interface LevelingState {
  level: number;
  xp: number;
  xpNext: number;
  maxHp: number;
  maxMp: number;
  hp: number;
  mp: number;
  skillPoints: number;
}

export function applyXpGain(state: LevelingState, amount: number): { next: LevelingState; leveledUp: number } {
  const next: LevelingState = { ...state, xp: state.xp + Math.max(0, Math.round(amount)) };
  let leveledUp = 0;

  while (next.xp >= next.xpNext) {
    next.xp -= next.xpNext;
    next.level += 1;
    next.xpNext = Math.floor(next.xpNext * 1.42);
    next.maxHp += 24;
    next.maxMp += 14;
    next.hp = next.maxHp;
    next.mp = next.maxMp;
    next.skillPoints += 1;
    leveledUp += 1;
  }

  return { next, leveledUp };
}

export interface DamageParams {
  baseDamage: number;
  level: number;
  weaponTier: number;
  powerSkill: number;
  infinityTier: number;
  ascendantActive: boolean;
  bioSerumActive: boolean;
  critChance: number;
  lineageAtkBonusPct?: number;
  cultivationMult?: number;
  roll?: number; // 0..1 deterministic hook for testing
}

export function computePlayerDamage(params: DamageParams): { damage: number; isCrit: boolean } {
  const levelMult = 1 + (params.level - 1) * 0.12;
  const weaponBonus = (params.weaponTier - 1) * 12;
  const skillBonus = params.powerSkill * 6;
  const coreMult = 1 + (params.infinityTier - 1) * 0.15;
  const lineageMult = 1 + (params.lineageAtkBonusPct ?? 0) / 100;
  const cultMult = params.cultivationMult ?? 1.0;
  const ascMult = params.ascendantActive ? 1.75 : 1.0;
  const bioMult = params.bioSerumActive ? 1.35 : 1.0;

  const roll = params.roll ?? Math.random();
  const isCrit = roll < params.critChance;
  const critMult = isCrit ? 1.65 : 1.0;

  const total = Math.round(
    (params.baseDamage + weaponBonus + skillBonus) *
      levelMult *
      coreMult *
      lineageMult *
      cultMult *
      ascMult *
      bioMult *
      critMult,
  );
  return { damage: Math.max(1, total), isCrit };
}

export type CraftRecipeKey = 'weapon' | 'campfire' | 'feast' | 'core' | 'serum';

export interface CraftResult {
  ok: boolean;
  reason?: string;
  inventory: InventoryState;
}

export function applyCraftRecipe(inv: InventoryState, recipe: CraftRecipeKey): CraftResult {
  const next: InventoryState = { ...inv };
  if (recipe === 'weapon') {
    if (next.sticks < 2 || next.stones < 2 || next.crystals < 1) {
      return { ok: false, reason: 'Need 2 Sticks, 2 Stones, and 1 Crystal.', inventory: inv };
    }
    next.sticks -= 2;
    next.stones -= 2;
    next.crystals -= 1;
    next.weaponTier += 1;
    return { ok: true, inventory: next };
  }
  if (recipe === 'campfire') {
    if (next.sticks < 2 || next.stones < 1) {
      return { ok: false, reason: 'Need 2 Sticks and 1 Stone.', inventory: inv };
    }
    next.sticks -= 2;
    next.stones -= 1;
    return { ok: true, inventory: next };
  }
  if (recipe === 'feast') {
    if (next.apples > 0) {
      next.apples -= 1;
      return { ok: true, inventory: next };
    }
    if (next.fish > 0) {
      next.fish -= 1;
      return { ok: true, inventory: next };
    }
    return { ok: false, reason: 'Need 1 Apple or 1 Fish.', inventory: inv };
  }
  if (recipe === 'core') {
    if (next.crystals < 2) {
      return { ok: false, reason: 'Need 2 Crystals to charge the Infinity Core.', inventory: inv };
    }
    next.crystals -= 2;
    return { ok: true, inventory: next };
  }
  if (recipe === 'serum') {
    if (next.crystals < 1) {
      return { ok: false, reason: 'Need 1 Crystal to synthesize Bio-Mutagen Serum.', inventory: inv };
    }
    next.crystals -= 1;
    return { ok: true, inventory: next };
  }
  return { ok: false, reason: 'Unknown recipe.', inventory: inv };
}

export function advanceCastleCapture(
  progress: number,
  owner: 'blue' | 'red',
  dt: number,
  playerInside: boolean,
  enemyKnightsInside: number,
): { progress: number; owner: 'blue' | 'red'; flippedToBlue: boolean } {
  let nextProgress = progress;
  if (playerInside && enemyKnightsInside === 0) {
    nextProgress = Math.min(100, progress + dt * 18);
  } else if (playerInside && enemyKnightsInside > 0) {
    nextProgress = Math.min(100, progress + dt * 6);
  }
  const flippedToBlue = owner !== 'blue' && nextProgress >= 100;
  return {
    progress: nextProgress,
    owner: flippedToBlue ? 'blue' : owner,
    flippedToBlue,
  };
}

/**
 * 2060-01-01T00:00:00.000Z 128-bit BigInt nanosecond offset (MemeForge v2.3.0 Future-Proof Timebase).
 */
export const EPOCH_2060_MS = BigInt(Date.UTC(2060, 0, 1, 0, 0, 0));

export function compute2060BigIntOffsetNs(nowMs: number = Date.now()): string {
  const diffNs = (EPOCH_2060_MS - BigInt(Math.floor(nowMs))) * 1_000_000n;
  return `${diffNs.toString()}n`;
}

export function resolveOfflineLeoReply(
  query: string,
  context: { biome: string; hp: number; maxHp: number; level: number; questsCompleted: number },
): { reply: string; teleportTarget?: 'malakor' | 'dungeon' | 'cinema' | 'biolab' | 'bookstore' | 'redCastle' } {
  const q = query.trim().toLowerCase();
  if (q.includes('malakor') || q.includes('rift') || q.includes('boss')) {
    return {
      reply:
        'Malakor the Ascendant guards the Ashfield Shadow Rift to the north (X: 4, Z: -78). Charge your [4] Ascendant Form and watch for his crimson ground shockwave rings.',
      teleportTarget: 'malakor',
    };
  }
  if (q.includes('dungeon') || q.includes('voryn') || q.includes('portal')) {
    return {
      reply:
        'The Sunken Ruin Portal lies southwest (X: -54, Z: 42). Step near the rune arch and press [E] to enter the procedural dungeon and battle Voryn.',
      teleportTarget: 'dungeon',
    };
  }
  if (q.includes('cinema') || q.includes('movie') || q.includes('xr') || q.includes('vr')) {
    return {
      reply:
        'OmniStream XR Cinema Dome overlooks the Ashen Sea to the south (X: 16, Z: 62). Press [O] to switch channels or load a local MP4/WebM film, and [X] for stereoscopic VR mode.',
      teleportTarget: 'cinema',
    };
  }
  if (q.includes('bio') || q.includes('lora') || q.includes('dna') || q.includes('lira')) {
    return {
      reply:
        'The LoRAFlow Spatial Bio-Lab sits northeast (X: 44, Z: -32). Press [B] to tune Lira combat/healing LoRA weights and my auto-gather magnetism radius.',
      teleportTarget: 'biolab',
    };
  }
  if (q.includes('book') || q.includes('lin') || q.includes('ji') || q.includes('lore')) {
    return {
      reply:
        'Lin_Jie and Ji_Zhixiu run the Rainy Bookstore just southwest of Infinity Core Plaza (X: -22, Z: 16). Walk up and press [E] to speak with them.',
      teleportTarget: 'bookstore',
    };
  }
  if (q.includes('castle') || q.includes('obsidian') || q.includes('warfare')) {
    return {
      reply:
        'Obsidian Citadel lies southeast (X: 56, Z: 36). Defeat its Siege Knights and stand inside the courtyard crystal ring to flip it to Dawn Citadel.',
      teleportTarget: 'redCastle',
    };
  }
  if (q.includes('buggy') || q.includes('car') || q.includes('drive')) {
    return {
      reply:
        'Your GeminIsland off-road Buggy is parked beside Infinity Core Plaza. Walk next to it and press [E] to hop in, then steer with WASD and drift with Shift.',
    };
  }
  if (q.includes('ad') || q.includes('spam') || q.includes('shield')) {
    return {
      reply:
        'Pop-Up Spam Drones ambush travelers with fake pop-up ads that slow movement. Press [3] Ad-Blocker Shield to vaporize every popup instantly and zap nearby drones.',
    };
  }
  if (q.includes('fish') || q.includes('swim') || q.includes('craft')) {
    return {
      reply:
        'Head south to the Ashen Sea dock and press [F] to fish, or gather glowing Crystals/Sticks/Stones with [E] and open the Forge with [C].',
    };
  }
  return {
    reply: `L.E.O. online. You are Level ${context.level} in ${context.biome} (${Math.round(context.hp)}/${context.maxHp} HP, ${context.questsCompleted}/7 quests done). Ask me about Malakor, Dungeon, Castle, Buggy, Cinema, Bio-Lab, Ad-Shield, or Bookstore.`,
  };
}

export function isValidSavePayload(raw: unknown): raw is SavePayload {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  return (
    typeof obj.version === 'number' &&
    typeof obj.playerName === 'string' &&
    typeof obj.classKey === 'string' &&
    obj.classKey in HERO_CLASSES &&
    typeof obj.level === 'number' &&
    typeof obj.hp === 'number' &&
    typeof obj.maxHp === 'number'
  );
}

// =========================================================================
// GEMINISLAND INTERACTIVE ARCADE MINI-GAME RULES (Pure Deterministic Logic)
// =========================================================================

export type TicTacToeCell = 'X' | 'O' | null;

const TTT_LINES: ReadonlyArray<[number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function checkTicTacToeWinner(board: readonly TicTacToeCell[]): 'X' | 'O' | 'draw' | null {
  for (const [a, b, c] of TTT_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every((cell) => cell !== null)) return 'draw';
  return null;
}

/**
 * Smart deterministic GeminIsland AI opponent ('O'):
 * 1) Takes winning move if available.
 * 2) Blocks player ('X') winning move.
 * 3) Takes center, then corners, then edges.
 */
export function pickTicTacToeAiMove(board: readonly TicTacToeCell[]): number {
  for (const mark of ['O', 'X'] as const) {
    for (const [a, b, c] of TTT_LINES) {
      const cells = [board[a], board[b], board[c]];
      const indices = [a, b, c];
      const countMark = cells.filter((v) => v === mark).length;
      const emptySlot = cells.findIndex((v) => v === null);
      if (countMark === 2 && emptySlot !== -1) {
        return indices[emptySlot];
      }
    }
  }
  const priority = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  for (const idx of priority) {
    if (board[idx] === null) return idx;
  }
  return -1;
}

/**
 * 3x3 Voxel Lights Out toggle (toggles target cell + orthogonal neighbors).
 */
export function toggleLightsOutGrid(grid: readonly boolean[], index: number): boolean[] {
  const next = [...grid];
  if (index < 0 || index >= 9) return next;
  const row = Math.floor(index / 3);
  const col = index % 3;
  const coords: Array<[number, number]> = [
    [row, col],
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ];
  for (const [r, c] of coords) {
    if (r >= 0 && r < 3 && c >= 0 && c < 3) {
      const i = r * 3 + c;
      next[i] = !next[i];
    }
  }
  return next;
}

export function isLightsOutSolved(grid: readonly boolean[]): boolean {
  return grid.length === 9 && grid.every((lit) => !lit);
}

/**
 * Generates a guaranteed-solvable 3x3 Lights Out puzzle by applying deterministic moves from a solved board.
 */
export function createLightsOutPuzzle(seed = 1): boolean[] {
  const patterns: ReadonlyArray<readonly number[]> = [
    [4, 0, 8],
    [1, 3, 5, 7],
    [0, 2, 4, 6],
    [2, 5, 6, 8],
  ];
  const moves = patterns[Math.abs(seed) % patterns.length];
  let grid = Array<boolean>(9).fill(false);
  for (const idx of moves) {
    grid = toggleLightsOutGrid(grid, idx);
  }
  return grid;
}

