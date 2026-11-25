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
  CULTIVATION_REALMS,
  HERO_CLASSES,
  INITIAL_INVENTORY,
  INITIAL_PET,
  INITIAL_SKILLS,
  INITIAL_WARFARE,
  LINEAGES,
  PET_EVOLUTION_STAGES,
  applyCraftRecipe,
  applyXpGain,
  advanceCastleCapture,
  attemptCultivationBreakthrough,
  attemptImperialCastleUpgrade,
  attemptTrainSiegeTroops,
  checkTicTacToeWinner,
  compute2060BigIntOffsetNs,
  computeHeroPowerStats,
  computePetEvolutionStage,
  computePlayerDamage,
  computeWarfarePower,
  createLightsOutPuzzle,
  feedPetState,
  getImperialCastleSpec,
  getPetFormTitle,
  getPetMood,
  getPetStatusModifiers,
  getTotalTroopCount,
  isLightsOutSolved,
  petCompanionState,
  pickTicTacToeAiMove,
  resolveOfflineLeoReply,
  resolveTerritoryRally,
  tickPetState,
  toggleLightsOutGrid,
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

test('all 6 Fantasy Lineages scale HP, MP, ATK, and Combat Power cleanly', () => {
  assert.equal(Object.keys(LINEAGES).length, 6);
  const dwarf = computeHeroPowerStats({
    classKey: 'ironwarden',
    lineageId: 'ironforge_dwarf',
    level: 5,
    cultivationTier: 0,
    skills: INITIAL_SKILLS,
    weaponTier: 1,
    infinityTier: 1,
  });
  const kitsune = computeHeroPowerStats({
    classKey: 'ironwarden',
    lineageId: 'celestial_kitsune',
    level: 5,
    cultivationTier: 0,
    skills: INITIAL_SKILLS,
    weaponTier: 1,
    infinityTier: 1,
  });
  assert.ok(dwarf.maxHp > kitsune.maxHp);
  assert.ok(kitsune.maxMp > dwarf.maxMp);

  const ascended = computeHeroPowerStats({
    classKey: 'shadowblade',
    lineageId: 'void_walker',
    level: 12,
    cultivationTier: 5,
    skills: INITIAL_SKILLS,
    weaponTier: 2,
    infinityTier: 2,
  });
  assert.equal(ascended.cultivationMult, CULTIVATION_REALMS[5].powerMultiplier);
  assert.ok(ascended.combatPower > dwarf.combatPower * 2);
});

test('Cultivation Breakthrough enforces level and Spirit Stone requirements', () => {
  const tooLow = attemptCultivationBreakthrough({ level: 1, cultivationTier: 0, spiritStones: 50 });
  assert.equal(tooLow.ok, false);
  assert.equal(tooLow.nextTier, 0);

  const notEnoughStones = attemptCultivationBreakthrough({ level: 3, cultivationTier: 0, spiritStones: 10 });
  assert.equal(notEnoughStones.ok, false);

  const breakthrough = attemptCultivationBreakthrough({ level: 2, cultivationTier: 0, spiritStones: 45 });
  assert.equal(breakthrough.ok, true);
  assert.equal(breakthrough.nextTier, 1);
  assert.equal(breakthrough.spiritStones, 15);
  assert.equal(breakthrough.realmName, 'Qi Condensation');
});

test('GeminIsland Tic-Tac-Toe AI blocks wins, claims victories, and detects outcomes', () => {
  const blockBoard = ['X', 'X', null, null, 'O', null, null, null, null] as const;
  assert.equal(pickTicTacToeAiMove(blockBoard), 2);

  const winBoard = ['O', 'O', null, 'X', 'X', null, null, null, null] as const;
  assert.equal(pickTicTacToeAiMove(winBoard), 2);

  assert.equal(checkTicTacToeWinner(['X', 'X', 'X', null, 'O', null, null, null, null]), 'X');
  assert.equal(checkTicTacToeWinner(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']), 'draw');
});

test('GeminIsland Lights Out puzzle toggles orthogonal neighbors and resolves solved state', () => {
  const puzzle = createLightsOutPuzzle(0);
  assert.equal(isLightsOutSolved(puzzle), false);
  // Seed 0 was built from moves [4, 0, 8]; applying them in reverse extinguishes every cell
  let board = toggleLightsOutGrid(puzzle, 8);
  board = toggleLightsOutGrid(board, 0);
  board = toggleLightsOutGrid(board, 4);
  assert.equal(isLightsOutSolved(board), true);
});

test('3D pet follower hunger/happiness decay, hungry penalty, and mood classification work cleanly', () => {
  const afterNormal = tickPetState(INITIAL_PET, 50);
  assert.ok(afterNormal.hunger < INITIAL_PET.hunger);
  assert.ok(afterNormal.happiness < INITIAL_PET.happiness);
  assert.equal(getPetMood(85, 90), 'Ecstatic');
  assert.equal(getPetMood(18, 75), 'Hungry');
  assert.equal(getPetMood(65, 22), 'Lonely');

  const starvingStart = { ...INITIAL_PET, hunger: 20, happiness: 60 };
  const wellFedStart = { ...INITIAL_PET, hunger: 80, happiness: 60 };
  const starvingAfter = tickPetState(starvingStart, 10);
  const wellFedAfter = tickPetState(wellFedStart, 10);
  assert.ok(starvingAfter.happiness < wellFedAfter.happiness);
  assert.equal(starvingAfter.mood, 'Hungry');
});

test('feeding and petting the 3D companion restores hunger/happiness and levels up bond XP', () => {
  const hungry = { ...INITIAL_PET, hunger: 40, happiness: 50, level: 1, bondXp: 85 };
  const fedFish = feedPetState(hungry, 'fish');
  assert.equal(fedFish.hunger, 74);
  assert.equal(fedFish.happiness, 66);
  assert.equal(fedFish.level, 2);
  assert.equal(fedFish.bondXp, 13);

  const petted = petCompanionState(fedFish);
  assert.equal(petted.happiness, 84);
  assert.equal(petted.bondXp, 28);
  assert.equal(petted.mood, 'Joyful');
});

test('pet evolution unlocks Radiant and Ascendant stages at thresholds and upgrades status modifiers', () => {
  assert.equal(INITIAL_PET.evolutionStage, 0);
  const baseMods = getPetStatusModifiers(INITIAL_PET);
  assert.equal(baseMods.auraActive, true);
  assert.equal(baseMods.hpRegenPerSec, PET_EVOLUTION_STAGES[0].hpRegenPerSec);
  assert.equal(baseMods.atkBonusPct, 0);
  assert.equal(getPetFormTitle('voxel_fox', 0), 'Voxel Fox');

  // Feeding an apple pushes hunger to 100% and happiness to 98%, unlocking Stage 1 (Radiant)
  const afterApple = feedPetState(INITIAL_PET, 'apple');
  assert.equal(afterApple.evolutionStage, 1);
  assert.equal(getPetFormTitle('voxel_fox', 1), 'Sunlit Kitsune');

  const stage1Mods = getPetStatusModifiers(afterApple);
  assert.ok(stage1Mods.hpRegenPerSec > baseMods.hpRegenPerSec);
  assert.ok(stage1Mods.atkBonusPct > baseMods.atkBonusPct);
  assert.ok(stage1Mods.xpBonusPct > baseMods.xpBonusPct);
  assert.ok(stage1Mods.speedBonusPct > baseMods.speedBonusPct);

  // Evolution persists even when hunger decays, while starving pauses the active aura
  const ticked = tickPetState(afterApple, 240);
  assert.equal(ticked.evolutionStage, 1);
  assert.equal(getPetStatusModifiers(ticked).auraActive, false);

  // Reaching Bond Lv 2 with >=98% hunger and >=98% happiness unlocks Stage 2 (Ascendant)
  const nearAscendant = { ...afterApple, hunger: 99, happiness: 99, level: 1, bondXp: 90 };
  const ascendant = petCompanionState(nearAscendant);
  assert.equal(ascendant.level, 2);
  assert.equal(ascendant.evolutionStage, 2);
  assert.equal(getPetFormTitle('void_pup', 2), 'Cosmic Rift Fenrir');
  assert.equal(computePetEvolutionStage(2, 50, 50, 1), 2);

  const stage2Mods = getPetStatusModifiers(ascendant);
  assert.ok(stage2Mods.hpRegenPerSec > stage1Mods.hpRegenPerSec);
  assert.ok(stage2Mods.atkBonusPct > stage1Mods.atkBonusPct);
  assert.ok(stage2Mods.xpBonusPct > stage1Mods.xpBonusPct);
  assert.ok(stage2Mods.speedBonusPct > stage1Mods.speedBonusPct);
});

test('Voxel Realms Imperial Castle upgrade, 3-branch troop training, and Army Power scale deterministically', () => {
  const basePower = computeWarfarePower(INITIAL_WARFARE);
  assert.ok(basePower > 400);
  assert.equal(getImperialCastleSpec(1).era, 'Timber Keep');
  assert.equal(getImperialCastleSpec(3).era, 'Stone Bastion');
  assert.equal(getImperialCastleSpec(9).era, 'Sovereign Imperial Keep');

  // Cannot upgrade without enough Gold & Spirit Stones
  const tooPoor = attemptImperialCastleUpgrade(INITIAL_WARFARE, 10, 5);
  assert.equal(tooPoor.ok, false);

  // Valid castle upgrade increases level and barracks capacity
  const upgraded = attemptImperialCastleUpgrade(INITIAL_WARFARE, 120, 40);
  assert.equal(upgraded.ok, true);
  assert.equal(upgraded.warfare.castleLevel, 2);
  assert.ok(getImperialCastleSpec(2).maxTroops > getImperialCastleSpec(1).maxTroops);
  assert.ok(computeWarfarePower(upgraded.warfare) > basePower);

  // Train Bombers respects gold & capacity
  const trained = attemptTrainSiegeTroops(upgraded.warfare, 'bomber', 5, 150);
  assert.equal(trained.ok, true);
  assert.equal(trained.warfare.troops.bomber, INITIAL_WARFARE.troops.bomber + 5);
  assert.equal(trained.gold, 50);
  assert.equal(getTotalTroopCount(trained.warfare.troops), getTotalTroopCount(INITIAL_WARFARE.troops) + 5);
});

test('Voxel Realms 9-sector Territory Rally captures contested/Obsidian sectors and awards siege progress', () => {
  const alreadyDawn = resolveTerritoryRally(INITIAL_WARFARE, 'A1');
  assert.equal(alreadyDawn.ok, false);

  const contestedWin = resolveTerritoryRally(INITIAL_WARFARE, 'B2');
  assert.equal(contestedWin.ok, true);
  assert.equal(contestedWin.newOwner, 'DAWN');
  assert.equal(contestedWin.warfare.sectors.B2, 'DAWN');
  assert.ok(contestedWin.obsidianSiegeDelta > 0);
  assert.equal(contestedWin.warfare.ralliesWon, 1);

  // Wedge Charge increases army power over Shield Wall
  const wedgePower = computeWarfarePower({ ...INITIAL_WARFARE, formation: 'WEDGE_CHARGE' });
  const shieldPower = computeWarfarePower({ ...INITIAL_WARFARE, formation: 'SHIELD_WALL' });
  assert.ok(wedgePower > shieldPower);
});


