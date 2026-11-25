import type {
  CastleWarfareState,
  CultivationRealmSpec,
  HeroClassKey,
  HeroClassSpec,
  InventoryState,
  LineageId,
  LineageSpec,
  LoraWeights,
  PetEvolutionStage,
  PetMood,
  PetSpeciesKey,
  PetState,
  PetStatusModifiers,
  QuestProgress,
  RealmShardSpec,
  SavePayload,
  SectorOwner,
  SiegeFormationType,
  SkillLevels,
  TerritorySectorCode,
  TroopBranch,
  WarCommanderId,
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
  if (
    q.includes('pet') ||
    q.includes('hunger') ||
    q.includes('happy') ||
    q.includes('kibo') ||
    q.includes('feed') ||
    q.includes('evolv')
  ) {
    return {
      reply:
        'Your 3D Pet Follower trots right behind your shoulder! Reach 90% Hunger & 92% Happiness to evolve into Radiant Form (+1.8 HP/s, +12% ATK, +15% XP, +8% Speed), and 98% Hunger, 98% Happiness & Bond Lv 2 for Ascendant Form!',
    };
  }
  return {
    reply: `L.E.O. online. You are Level ${context.level} in ${context.biome} (${Math.round(context.hp)}/${context.maxHp} HP, ${context.questsCompleted}/7 quests done). Ask me about Pet, Malakor, Dungeon, Castle, Buggy, Cinema, Bio-Lab, Ad-Shield, or Bookstore.`,
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

// =========================================================================
// 3D PET FOLLOWER STATE RULES (Hunger, Happiness, Mood & Bond Progression)
// =========================================================================

export const PET_SPECIES_SPECS: Record<
  PetSpeciesKey,
  { label: string; title: string; stageTitles: readonly [string, string, string]; primaryHex: number; accentHex: number }
> = {
  voxel_fox: {
    label: 'Voxel Fox',
    title: 'Sunlit Kitsune',
    stageTitles: ['Voxel Fox', 'Sunlit Kitsune', 'Celestial Nine-Tail'] as const,
    primaryHex: 0xf97316,
    accentHex: 0xfef3c7,
  },
  emerald_slime: {
    label: 'Emerald Slime',
    title: 'Lagoon Sprout',
    stageTitles: ['Emerald Slime', 'Crystal Sovereign', 'Infinity Prism King'] as const,
    primaryHex: 0x10b981,
    accentHex: 0x6ee7b7,
  },
  void_pup: {
    label: 'Void Pup',
    title: 'Astral Hound',
    stageTitles: ['Void Pup', 'Astral Direhound', 'Cosmic Rift Fenrir'] as const,
    primaryHex: 0x4338ca,
    accentHex: 0x38bdf8,
  },
};

export interface PetEvolutionSpec {
  stage: PetEvolutionStage;
  tierName: 'Companion' | 'Radiant' | 'Ascendant';
  minHunger: number;
  minHappiness: number;
  minBondLevel: number;
  scale: number;
  hpRegenPerSec: number;
  atkBonusPct: number;
  xpBonusPct: number;
  speedBonusPct: number;
  auraLabel: string;
}

export const PET_EVOLUTION_STAGES: ReadonlyArray<PetEvolutionSpec> = [
  {
    stage: 0,
    tierName: 'Companion',
    minHunger: 0,
    minHappiness: 0,
    minBondLevel: 1,
    scale: 1.15,
    hpRegenPerSec: 0.6,
    atkBonusPct: 0,
    xpBonusPct: 5,
    speedBonusPct: 0,
    auraLabel: 'Warmth Aura',
  },
  {
    stage: 1,
    tierName: 'Radiant',
    minHunger: 90,
    minHappiness: 92,
    minBondLevel: 1,
    scale: 1.32,
    hpRegenPerSec: 1.8,
    atkBonusPct: 12,
    xpBonusPct: 15,
    speedBonusPct: 8,
    auraLabel: 'Radiant Bond Aura',
  },
  {
    stage: 2,
    tierName: 'Ascendant',
    minHunger: 98,
    minHappiness: 98,
    minBondLevel: 2,
    scale: 1.48,
    hpRegenPerSec: 3.2,
    atkBonusPct: 25,
    xpBonusPct: 30,
    speedBonusPct: 15,
    auraLabel: 'Celestial Ascendant Aura',
  },
];

export function computePetEvolutionStage(
  currentStage: PetEvolutionStage,
  hunger: number,
  happiness: number,
  bondLevel: number,
): PetEvolutionStage {
  let nextStage: PetEvolutionStage = currentStage;
  const stage1 = PET_EVOLUTION_STAGES[1];
  const stage2 = PET_EVOLUTION_STAGES[2];
  if (
    nextStage < 1 &&
    hunger >= stage1.minHunger &&
    happiness >= stage1.minHappiness &&
    bondLevel >= stage1.minBondLevel
  ) {
    nextStage = 1;
  }
  if (
    nextStage < 2 &&
    hunger >= stage2.minHunger &&
    happiness >= stage2.minHappiness &&
    bondLevel >= stage2.minBondLevel
  ) {
    nextStage = 2;
  }
  return nextStage;
}

export function getPetFormTitle(species: PetSpeciesKey, evolutionStage: PetEvolutionStage): string {
  return PET_SPECIES_SPECS[species].stageTitles[evolutionStage] ?? PET_SPECIES_SPECS[species].label;
}

export function getPetStatusModifiers(pet: PetState): PetStatusModifiers {
  const spec = PET_EVOLUTION_STAGES[pet.evolutionStage] ?? PET_EVOLUTION_STAGES[0];
  const auraActive = pet.hunger >= 35 && pet.happiness >= 50;
  if (!auraActive) {
    return {
      auraActive: false,
      hpRegenPerSec: 0,
      atkBonusPct: 0,
      xpBonusPct: 0,
      speedBonusPct: 0,
      auraLabel: `${spec.auraLabel} (Dormant — feed or pet to reactivate)`,
    };
  }
  return {
    auraActive: true,
    hpRegenPerSec: spec.hpRegenPerSec,
    atkBonusPct: spec.atkBonusPct,
    xpBonusPct: spec.xpBonusPct,
    speedBonusPct: spec.speedBonusPct,
    auraLabel: spec.auraLabel,
  };
}

export function getPetMood(hunger: number, happiness: number): PetMood {
  if (hunger < 25) return 'Hungry';
  if (happiness < 30) return 'Lonely';
  if (hunger >= 80 && happiness >= 85) return 'Ecstatic';
  if (happiness >= 60) return 'Joyful';
  return 'Content';
}

export const INITIAL_PET: PetState = {
  name: 'Kibo',
  species: 'voxel_fox',
  hunger: 82,
  happiness: 86,
  mood: getPetMood(82, 86),
  level: 1,
  bondXp: 0,
  evolutionStage: 0,
};

function applyPetBondXp(level: number, bondXp: number, gain: number): { level: number; bondXp: number } {
  let nextLevel = level;
  let nextXp = bondXp + Math.max(0, Math.round(gain));
  while (nextXp >= 100) {
    nextXp -= 100;
    nextLevel += 1;
  }
  return { level: nextLevel, bondXp: nextXp };
}

export function tickPetState(pet: PetState, dtSec: number): PetState {
  const safeDt = Math.max(0, dtSec);
  const nextHunger = Math.max(0, Math.min(100, pet.hunger - safeDt * 0.32));
  const happyDecay = nextHunger < 30 ? 0.48 : 0.16;
  const nextHappiness = Math.max(0, Math.min(100, pet.happiness - safeDt * happyDecay));
  return {
    ...pet,
    hunger: nextHunger,
    happiness: nextHappiness,
    mood: getPetMood(nextHunger, nextHappiness),
  };
}

export function feedPetState(pet: PetState, food: 'apple' | 'fish' | 'treat'): PetState {
  const hungerGain = food === 'fish' ? 34 : food === 'apple' ? 26 : 16;
  const happyGain = food === 'fish' ? 16 : food === 'apple' ? 12 : 8;
  const xpGain = food === 'fish' ? 28 : food === 'apple' ? 22 : 12;

  const hunger = Math.max(0, Math.min(100, pet.hunger + hungerGain));
  const happiness = Math.max(0, Math.min(100, pet.happiness + happyGain));
  const bond = applyPetBondXp(pet.level, pet.bondXp, xpGain);
  const evolutionStage = computePetEvolutionStage(pet.evolutionStage, hunger, happiness, bond.level);
  return {
    ...pet,
    hunger,
    happiness,
    mood: getPetMood(hunger, happiness),
    level: bond.level,
    bondXp: bond.bondXp,
    evolutionStage,
  };
}

export function petCompanionState(pet: PetState): PetState {
  const happiness = Math.max(0, Math.min(100, pet.happiness + 18));
  const bond = applyPetBondXp(pet.level, pet.bondXp, 15);
  const evolutionStage = computePetEvolutionStage(pet.evolutionStage, pet.hunger, happiness, bond.level);
  return {
    ...pet,
    happiness,
    mood: getPetMood(pet.hunger, happiness),
    level: bond.level,
    bondXp: bond.bondXp,
    evolutionStage,
  };
}

// =========================================================================
// VOXEL REALMS RPG: IMPERIAL CASTLE WARFARE & 9-SECTOR SIEGE RULES (Repo #4)
// =========================================================================

export const MAX_IMPERIAL_CASTLE_LEVEL = 10;

export const ALL_TERRITORY_SECTORS: readonly TerritorySectorCode[] = [
  'A1',
  'A2',
  'A3',
  'B1',
  'B2',
  'B3',
  'C1',
  'C2',
  'C3',
] as const;

export const TROOP_SPECS: Record<
  TroopBranch,
  { label: string; role: string; costGold: number; power: number; accent: string }
> = {
  shieldbearer: {
    label: 'Shieldbearers',
    role: 'Frontline Aegis Tank',
    costGold: 10,
    power: 18,
    accent: '#38bdf8',
  },
  shooter: {
    label: 'Shooters',
    role: 'Ranged Volley Corps',
    costGold: 14,
    power: 25,
    accent: '#34d399',
  },
  bomber: {
    label: 'Bombers',
    role: 'Siege Gate Breachers',
    costGold: 20,
    power: 38,
    accent: '#fb923c',
  },
};

export const SIEGE_FORMATIONS: Record<
  SiegeFormationType,
  {
    label: string;
    shortDesc: string;
    powerMult: number;
    heroAtkBonusPct: number;
    heroDmgReductionPct: number;
    heroSpeedBonusPct: number;
    captureMult: number;
  }
> = {
  SHIELD_WALL: {
    label: 'Shield Wall',
    shortDesc: '+35% Cohort Defense · -18% Hero Damage Taken',
    powerMult: 1.08,
    heroAtkBonusPct: 4,
    heroDmgReductionPct: 18,
    heroSpeedBonusPct: 0,
    captureMult: 1.1,
  },
  WEDGE_CHARGE: {
    label: 'Wedge Charge',
    shortDesc: '+25% Army Power · +16% Hero Attack Power',
    powerMult: 1.25,
    heroAtkBonusPct: 16,
    heroDmgReductionPct: 0,
    heroSpeedBonusPct: 4,
    captureMult: 1.15,
  },
  LOOSE_SKIRMISH: {
    label: 'Loose Skirmish',
    shortDesc: '+15% Army Power · +12% Hero Move Speed',
    powerMult: 1.15,
    heroAtkBonusPct: 8,
    heroDmgReductionPct: 8,
    heroSpeedBonusPct: 12,
    captureMult: 1.05,
  },
  PHALANX_ADVANCE: {
    label: 'Phalanx Advance',
    shortDesc: '+45% Castle Capture Speed · +18% Army Power',
    powerMult: 1.18,
    heroAtkBonusPct: 10,
    heroDmgReductionPct: 10,
    heroSpeedBonusPct: 0,
    captureMult: 1.45,
  },
};

export const WAR_COMMANDERS: Record<
  WarCommanderId,
  {
    name: string;
    title: string;
    specialty: TroopBranch;
    skillName: string;
    bonusDesc: string;
    specialtyBonusMult: number;
  }
> = {
  arthur: {
    name: 'Arthur Pendragon',
    title: 'Aegis of the Realm',
    specialty: 'shieldbearer',
    skillName: 'Fortress of the Gods',
    bonusDesc: '+35% Shieldbearer power & fortress vanguard aura',
    specialtyBonusMult: 1.35,
  },
  lyra: {
    name: 'Lyra Shadowshot',
    title: 'Windrunner Huntress',
    specialty: 'shooter',
    skillName: 'Gale Volley',
    bonusDesc: '+35% Shooter volley power & rapid suppression',
    specialtyBonusMult: 1.35,
  },
  aiden: {
    name: 'Aiden Skyrender',
    title: 'Vanguard Commander',
    specialty: 'bomber',
    skillName: 'Sovereign Breach',
    bonusDesc: '+35% Bomber siege power & trebuchet blast boost',
    specialtyBonusMult: 1.35,
  },
};

export const INITIAL_WARFARE: CastleWarfareState = {
  castleLevel: 1,
  troops: {
    shieldbearer: 6,
    shooter: 4,
    bomber: 2,
  },
  formation: 'SHIELD_WALL',
  commanderId: 'arthur',
  sectors: {
    A1: 'DAWN',
    A2: 'DAWN',
    A3: 'CONTESTED',
    B1: 'DAWN',
    B2: 'CONTESTED',
    B3: 'OBSIDIAN',
    C1: 'CONTESTED',
    C2: 'OBSIDIAN',
    C3: 'OBSIDIAN',
  },
  cohortDeployed: true,
  trebuchetCooldownSec: 0,
  ralliesWon: 0,
};

export function getImperialCastleEra(level: number): string {
  if (level >= 9) return 'Sovereign Imperial Keep';
  if (level >= 7) return 'Aether Citadel';
  if (level >= 5) return 'Obsidian Fortress';
  if (level >= 3) return 'Stone Bastion';
  return 'Timber Keep';
}

export function getImperialCastleSpec(level: number): {
  level: number;
  era: string;
  maxTroops: number;
  upgradeGold: number;
  upgradeStones: number;
  castlePowerBonus: number;
} {
  const safeLv = Math.max(1, Math.min(MAX_IMPERIAL_CASTLE_LEVEL, Math.floor(level)));
  return {
    level: safeLv,
    era: getImperialCastleEra(safeLv),
    maxTroops: 24 + (safeLv - 1) * 18,
    upgradeGold: 40 + safeLv * 35,
    upgradeStones: 15 + safeLv * 12,
    castlePowerBonus: safeLv * 180,
  };
}

export function getTotalTroopCount(troops: Record<TroopBranch, number>): number {
  return Math.max(0, troops.shieldbearer) + Math.max(0, troops.shooter) + Math.max(0, troops.bomber);
}

export function computeWarfarePower(warfare: CastleWarfareState): number {
  const castleSpec = getImperialCastleSpec(warfare.castleLevel);
  const commander = WAR_COMMANDERS[warfare.commanderId] ?? WAR_COMMANDERS.arthur;
  const formation = SIEGE_FORMATIONS[warfare.formation] ?? SIEGE_FORMATIONS.SHIELD_WALL;

  let troopPower = 0;
  for (const branch of ['shieldbearer', 'shooter', 'bomber'] as const) {
    const base = Math.max(0, warfare.troops[branch]) * TROOP_SPECS[branch].power;
    const mult = commander.specialty === branch ? commander.specialtyBonusMult : 1;
    troopPower += base * mult;
  }
  const dawnSectors = ALL_TERRITORY_SECTORS.filter((s) => warfare.sectors[s] === 'DAWN').length;
  return Math.round((castleSpec.castlePowerBonus + troopPower) * formation.powerMult + dawnSectors * 95);
}

export function attemptImperialCastleUpgrade(
  warfare: CastleWarfareState,
  gold: number,
  spiritStones: number,
): { ok: boolean; reason?: string; warfare: CastleWarfareState; gold: number; spiritStones: number } {
  if (warfare.castleLevel >= MAX_IMPERIAL_CASTLE_LEVEL) {
    return { ok: false, reason: 'Imperial Castle is already at max Level 10.', warfare, gold, spiritStones };
  }
  const spec = getImperialCastleSpec(warfare.castleLevel);
  if (gold < spec.upgradeGold || spiritStones < spec.upgradeStones) {
    return {
      ok: false,
      reason: `Need ${spec.upgradeGold} Gold & ${spec.upgradeStones} Spirit Stones to upgrade to Castle Lv ${warfare.castleLevel + 1}.`,
      warfare,
      gold,
      spiritStones,
    };
  }
  const nextWarfare: CastleWarfareState = {
    ...warfare,
    castleLevel: warfare.castleLevel + 1,
    troops: { ...warfare.troops },
    sectors: { ...warfare.sectors },
  };
  return {
    ok: true,
    warfare: nextWarfare,
    gold: gold - spec.upgradeGold,
    spiritStones: spiritStones - spec.upgradeStones,
  };
}

export function attemptTrainSiegeTroops(
  warfare: CastleWarfareState,
  branch: TroopBranch,
  count: number,
  gold: number,
): { ok: boolean; reason?: string; warfare: CastleWarfareState; gold: number } {
  const safeCount = Math.max(1, Math.floor(count));
  const spec = getImperialCastleSpec(warfare.castleLevel);
  const currentTotal = getTotalTroopCount(warfare.troops);
  if (currentTotal + safeCount > spec.maxTroops) {
    return {
      ok: false,
      reason: `Barracks capacity full (${currentTotal}/${spec.maxTroops}). Upgrade Imperial Castle for more slots.`,
      warfare,
      gold,
    };
  }
  const totalCost = TROOP_SPECS[branch].costGold * safeCount;
  if (gold < totalCost) {
    return {
      ok: false,
      reason: `Need ${totalCost} Gold to train ${safeCount} ${TROOP_SPECS[branch].label}.`,
      warfare,
      gold,
    };
  }
  return {
    ok: true,
    warfare: {
      ...warfare,
      troops: {
        ...warfare.troops,
        [branch]: warfare.troops[branch] + safeCount,
      },
      sectors: { ...warfare.sectors },
    },
    gold: gold - totalCost,
  };
}

export function resolveTerritoryRally(
  warfare: CastleWarfareState,
  sector: TerritorySectorCode,
): {
  ok: boolean;
  reason?: string;
  warfare: CastleWarfareState;
  goldReward: number;
  xpReward: number;
  obsidianSiegeDelta: number;
  newOwner: SectorOwner;
} {
  const currentOwner = warfare.sectors[sector];
  if (currentOwner === 'DAWN') {
    return {
      ok: false,
      reason: `Sector ${sector} is already under Dawn Imperial control.`,
      warfare,
      goldReward: 0,
      xpReward: 0,
      obsidianSiegeDelta: 0,
      newOwner: currentOwner,
    };
  }
  const armyPower = computeWarfarePower(warfare);
  const requiredPower = currentOwner === 'OBSIDIAN' ? 520 : 320;
  if (armyPower < requiredPower) {
    return {
      ok: false,
      reason: `Need ${requiredPower} Army Power to rally Sector ${sector} (current: ${armyPower}). Train troops or switch to Wedge Charge!`,
      warfare,
      goldReward: 0,
      xpReward: 0,
      obsidianSiegeDelta: 0,
      newOwner: currentOwner,
    };
  }
  const newOwner: SectorOwner = currentOwner === 'OBSIDIAN' && armyPower < 900 ? 'CONTESTED' : 'DAWN';
  const nextSectors: Record<TerritorySectorCode, SectorOwner> = {
    ...warfare.sectors,
    [sector]: newOwner,
  };
  return {
    ok: true,
    warfare: {
      ...warfare,
      troops: { ...warfare.troops },
      sectors: nextSectors,
      ralliesWon: warfare.ralliesWon + 1,
    },
    goldReward: newOwner === 'DAWN' ? 55 : 28,
    xpReward: newOwner === 'DAWN' ? 65 : 35,
    obsidianSiegeDelta: newOwner === 'DAWN' ? 16 : 8,
    newOwner,
  };
}


