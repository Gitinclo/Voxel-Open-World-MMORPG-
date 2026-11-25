export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type HeroClassKey = 'shadowblade' | 'pyromancer' | 'ironwarden' | 'voidwalker';

export type WeatherMode = 'Clear' | 'Rain' | 'Snow' | 'Ashstorm' | 'Thunderstorm';

export type CinemaChannel = 'cyber' | 'warp' | 'matrix';

export type SuiteModalKey =
  | null
  | 'craft'
  | 'skills'
  | 'leo'
  | 'meme'
  | 'omni'
  | 'vibe'
  | 'lora'
  | 'gm';

export type LandmarkKey =
  | 'spawn'
  | 'blueCastle'
  | 'redCastle'
  | 'malakor'
  | 'dungeon'
  | 'cinema'
  | 'biolab'
  | 'bookstore'
  | 'sea';

export interface HeroClassSpec {
  key: HeroClassKey;
  name: string;
  role: string;
  description: string;
  hp: number;
  mp: number;
  speed: number;
  damage: number;
  critChance: number;
  range: number;
  ranged: boolean;
  bodyColor: number;
  accentColor: number;
  weapon: 'blade' | 'staff' | 'hammer' | 'voidorb';
}

export interface InventoryState {
  sticks: number;
  stones: number;
  apples: number;
  crystals: number;
  fish: number;
  weaponTier: number;
}

export interface SkillLevels {
  power: number;
  vitality: number;
  haste: number;
  arcana: number;
}

export interface LoraWeights {
  aggression: number;
  healing: number;
  magnet: number;
}

export interface QuestProgress {
  captureObsidian: boolean;
  adsBlockedTarget: number;
  adsBlocked: number;
  memeProjected: boolean;
  defeatMalakor: boolean;
  defeatVoryn: boolean;
  catchFish: boolean;
  driveBuggy: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  tone: 'normal' | 'system' | 'leo' | 'spam' | 'blocked';
}

export interface PopupAdItem {
  id: string;
  title: string;
  body: string;
  leftPct: number;
  topPct: number;
}

export interface FloatingLabel {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  createdAt: number;
}

export interface MinimapBlip {
  x: number;
  z: number;
  kind: 'castleBlue' | 'castleRed' | 'boss' | 'spam' | 'enemy' | 'ally' | 'buggy' | 'portal';
}

export interface HudSnapshot {
  phase: GamePhase;
  outcome: 'victory' | 'defeat' | null;
  playerName: string;
  classKey: HeroClassKey;
  className: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  xp: number;
  xpNext: number;
  gold: number;
  kills: number;
  adsBlocked: number;
  infinityTier: number;
  skillPoints: number;
  skills: SkillLevels;
  inventory: InventoryState;
  lora: LoraWeights;
  quests: QuestProgress;
  cooldowns: [number, number, number, number, number];
  adShieldActive: boolean;
  ascendantActive: boolean;
  bioSerumActive: boolean;
  inBuggy: boolean;
  inDungeon: boolean;
  isSwimming: boolean;
  isFishing: boolean;
  firstPerson: boolean;
  vrMode: boolean;
  muted: boolean;
  biome: string;
  weather: WeatherMode;
  timeOfDayLabel: 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';
  blueCastles: number;
  redCastles: number;
  captureBanner: string | null;
  interactPrompt: string | null;
  bossHud: { name: string; hp: number; maxHp: number } | null;
  onlineCount: number;
  wsConnected: boolean;
  entityCount: number;
  playerPos: { x: number; z: number; rotY: number };
  minimapBlips: MinimapBlip[];
  elapsedSec: number;
  pitchSemitones: number;
  cinemaChannel: CinemaChannel;
}

export interface SavePayload {
  version: number;
  savedAt: string;
  playerName: string;
  classKey: HeroClassKey;
  level: number;
  xp: number;
  xpNext: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  gold: number;
  kills: number;
  adsBlocked: number;
  infinityTier: number;
  skillPoints: number;
  skills: SkillLevels;
  inventory: InventoryState;
  lora: LoraWeights;
  quests: QuestProgress;
  x: number;
  z: number;
}
