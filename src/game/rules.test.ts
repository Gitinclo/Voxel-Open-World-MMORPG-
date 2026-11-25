import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LANDMARKS,
  DUNGEON_CENTER,
  getBiome,
  getTerrainHeight,
  clampWorldPos,
  isOnTrail,
} from './worldMath';
import {
  HERO_CLASSES,
  INITIAL_INVENTORY,
  applyCraftRecipe,
  applyXpGain,
  advanceCastleCapture,
  compute2060BigIntOffsetNs,
  computePlayerDamage,
  resolveOfflineLeoReply,
  isValidSavePayload,
} from './rules';

test('deterministic terrain height matches landmark pads and dungeon floor', () => {
  const spawnY = getTerrainHeight(LANDMARKS.spawn.x, LANDMARKS.spawn.z);
  assert.ok(Math.abs(spawnY - LANDMARKS.spawn.h) < 0.05);

  const dungeonY = getTerrainHeight(DUNGEON_CENTER.x, DUNGEON_CENTER.z);
  assert.equal(dungeonY, DUNGEON_CENTER.y);
});

test('all 7 authentic ShadowRealm biomes plus Dungeon classify accurately', () => {
  assert.equal(getBiome(0, 0), 'Whispering Woods');
  assert.equal(getBiome(LANDMARKS.sea.x, LANDMARKS.sea.z), 'Ashen Sea');
  assert.equal(getBiome(-82, -82), 'Frostpeak Tundra');
  assert.equal(getBiome(LANDMARKS.malakor.x, LANDMARKS.malakor.z), 'Ashfield Wastes');
  assert.equal(getBiome(LANDMARKS.redCastle.x, LANDMARKS.redCastle.z), 'Obsidian Citadel');
  assert.equal(getBiome(LANDMARKS.dungeon.x, LANDMARKS.dungeon.z), 'Sunken Ruin');
  assert.equal(getBiome(46, -24), 'Crimson Marsh');
  assert.equal(getBiome(DUNGEON_CENTER.x, DUNGEON_CENTER.z), 'Sunken Ruin Dungeon');
});

test('trails connect spawn plaza to major landmarks and dungeon clamp stays in arena', () => {
  assert.equal(isOnTrail(0, 0), true);
  assert.equal(isOnTrail(LANDMARKS.redCastle.x / 2, LANDMARKS.redCastle.z / 2), true);

  const clamped = clampWorldPos(DUNGEON_CENTER.x + 80, DUNGEON_CENTER.z, true);
  const dist = Math.hypot(clamped.x - DUNGEON_CENTER.x, clamped.z - DUNGEON_CENTER.z);
  assert.ok(dist <= 24.01);
});

test('XP leveling handles multi-level overflow and awards skill points', () => {
  const { next, leveledUp } = applyXpGain(
    {
      level: 1,
      xp: 0,
      xpNext: 100,
      maxHp: 185,
      maxMp: 100,
      hp: 100,
      mp: 40,
      skillPoints: 1,
    },
    260,
  );
  assert.equal(leveledUp, 2);
  assert.equal(next.level, 3);
  assert.equal(next.skillPoints, 3);
  assert.equal(next.hp, next.maxHp);
  assert.equal(next.mp, next.maxMp);
});

test('combat damage scales with weapon tier, Ascendant mode, and deterministic crits', () => {
  const normal = computePlayerDamage({
    baseDamage: HERO_CLASSES.shadowblade.damage,
    level: 1,
    weaponTier: 1,
    powerSkill: 0,
    infinityTier: 1,
    ascendantActive: false,
    bioSerumActive: false,
    critChance: 0.25,
    roll: 0.9,
  });
  assert.equal(normal.isCrit, false);
  assert.equal(normal.damage, 28);

  const boosted = computePlayerDamage({
    baseDamage: HERO_CLASSES.shadowblade.damage,
    level: 2,
    weaponTier: 2,
    powerSkill: 1,
    infinityTier: 2,
    ascendantActive: true,
    bioSerumActive: true,
    critChance: 0.25,
    roll: 0.1,
  });
  assert.equal(boosted.isCrit, true);
  assert.ok(boosted.damage > normal.damage * 4);
});

test('crafting validates requirements and deducts exact materials', () => {
  const upgraded = applyCraftRecipe(INITIAL_INVENTORY, 'weapon');
  assert.equal(upgraded.ok, true);
  assert.equal(upgraded.inventory.weaponTier, 2);
  assert.equal(upgraded.inventory.sticks, INITIAL_INVENTORY.sticks - 2);
  assert.equal(upgraded.inventory.crystals, INITIAL_INVENTORY.crystals - 1);

  const denied = applyCraftRecipe(
    { sticks: 0, stones: 0, apples: 0, crystals: 0, fish: 0, weaponTier: 1 },
    'core',
  );
  assert.equal(denied.ok, false);
});

test('castle capture flips Obsidian Citadel to Dawn faction at 100%', () => {
  const step1 = advanceCastleCapture(92, 'red', 0.5, true, 0);
  assert.equal(step1.progress, 100);
  assert.equal(step1.owner, 'blue');
  assert.equal(step1.flippedToBlue, true);
});

test('2060 BigInt clock, L.E.O. offline command routing, and save validation work reliably', () => {
  const offset = compute2060BigIntOffsetNs(Date.UTC(2059, 11, 31, 23, 59, 59));
  assert.equal(offset, '1000000000n');

  const leo = resolveOfflineLeoReply('Where is Malakor boss?', {
    biome: 'Whispering Woods',
    hp: 150,
    maxHp: 185,
    level: 2,
    questsCompleted: 1,
  });
  assert.equal(leo.teleportTarget, 'malakor');
  assert.ok(leo.reply.includes('Malakor'));

  assert.equal(isValidSavePayload({ version: 1 }), false);
  assert.equal(
    isValidSavePayload({
      version: 1,
      playerName: 'Hero',
      classKey: 'pyromancer',
      level: 3,
      hp: 140,
      maxHp: 160,
    }),
    true,
  );
});
