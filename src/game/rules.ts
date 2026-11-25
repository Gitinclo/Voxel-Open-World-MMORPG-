import type {
  HeroClassKey,
  HeroClassSpec,
  InventoryState,
  LoraWeights,
  QuestProgress,
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
  roll?: number; // 0..1 deterministic hook for testing
}

export function computePlayerDamage(params: DamageParams): { damage: number; isCrit: boolean } {
  const levelMult = 1 + (params.level - 1) * 0.12;
  const weaponBonus = (params.weaponTier - 1) * 12;
  const skillBonus = params.powerSkill * 6;
  const coreMult = 1 + (params.infinityTier - 1) * 0.15;
  const ascMult = params.ascendantActive ? 1.75 : 1.0;
  const bioMult = params.bioSerumActive ? 1.35 : 1.0;

  const roll = params.roll ?? Math.random();
  const isCrit = roll < params.critChance;
  const critMult = isCrit ? 1.65 : 1.0;

  const total = Math.round(
    (params.baseDamage + weaponBonus + skillBonus) * levelMult * coreMult * ascMult * bioMult * critMult,
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
