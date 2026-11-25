import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RealmAudioEngine, type SfxName } from './audio';
import {
  createAdDroneTexture,
  createArcadePavilion,
  createCampfireProp,
  createEmeraldCliffWaterfall,
  createGeminIslandVillager,
  createHumanoidRig,
  createIslandBuggy,
  createIslandTransitShuttle,
  createLeoOrbModel,
  createLoraBioLab,
  createPetFollowerModel,
  createRainyBookstoreCabin,
  createSiegeTrebuchetModel,
  createSiegeTroopModel,
  createSlimeEnemy,
  createSpamDroneModel,
  createStoneBumpTexture,
  type BuggyModel,
  type EmeraldWaterfallModel,
  type HumanoidRig,
  type IslandVillagerRig,
  type PetFollowerRig,
  type SiegeTrebuchetModel,
  type SiegeTroopRig,
  type TransitShuttleModel,
} from './models';
import {
  CULTIVATION_REALMS,
  HERO_CLASSES,
  INITIAL_INVENTORY,
  INITIAL_LORA,
  INITIAL_PET,
  INITIAL_QUESTS,
  INITIAL_SKILLS,
  INITIAL_WARFARE,
  LINEAGES,
  PET_EVOLUTION_STAGES,
  PET_SPECIES_SPECS,
  REALM_SHARDS,
  SIEGE_FORMATIONS,
  TROOP_SPECS,
  WAR_COMMANDERS,
  advanceCastleCapture,
  applyCraftRecipe,
  applyXpGain,
  attemptCultivationBreakthrough,
  attemptImperialCastleUpgrade,
  attemptTrainSiegeTroops,
  computeHeroPowerStats,
  computePlayerDamage,
  computeWarfarePower,
  feedPetState,
  getImperialCastleSpec,
  getPetFormTitle,
  getPetStatusModifiers,
  isValidSavePayload,
  petCompanionState,
  resolveTerritoryRally,
  tickPetState,
  type CraftRecipeKey,
} from './rules';
import type {
  CastleWarfareState,
  ChatMessage,
  CinemaChannel,
  FloatingLabel,
  GamePhase,
  HeroClassKey,
  HudSnapshot,
  InventoryState,
  LandmarkKey,
  LineageId,
  LoraWeights,
  MinimapBlip,
  PetEvolutionStage,
  PetSpeciesKey,
  PetState,
  PopupAdItem,
  QuestProgress,
  SavePayload,
  SiegeFormationType,
  SkillLevels,
  TerritorySectorCode,
  TroopBranch,
  WarCommanderId,
  WeatherMode,
} from './types';
import {
  DUNGEON_CENTER,
  DUNGEON_RADIUS,
  LANDMARKS,
  WATER_LEVEL,
  WORLD_SIZE,
  clampWorldPos,
  getBiome,
  getTerrainHeight,
  getTerrainRgb,
} from './worldMath';

export interface EngineCallbacks {
  onHudUpdate: (snap: HudSnapshot) => void;
  onToast: (msg: string) => void;
  onChat: (msg: ChatMessage) => void;
  onPopupAd: (ad: PopupAdItem) => void;
  onClearPopups: () => void;
  onFloatLabel: (label: FloatingLabel) => void;
  onOpenModal?: (modal: 'craft' | 'skills' | 'guilds' | 'arcade' | 'leo' | 'meme' | 'omni' | 'vibe' | 'lora' | 'gm') => void;
}

interface EnemyEntity {
  id: string;
  kind: 'slime' | 'knight' | 'wraith' | 'spam' | 'boss';
  name: string;
  isBoss: boolean;
  inDungeon: boolean;
  group: THREE.Group;
  rig?: HumanoidRig;
  hitMeshes: THREE.Mesh[];
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  homeX: number;
  homeZ: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  xp: number;
  gold: number;
  alive: boolean;
  koTimer: number;
  respawnTimer: number;
  atkCd: number;
  hitFlash: number;
  // Telegraphed heavy attack state
  telegraphTimer: number;
  telegraphMesh: THREE.Mesh;
  aoeCd: number;
  orbitSign: number;
}

interface GatherableItem {
  id: string;
  kind: 'sticks' | 'stones' | 'apples' | 'crystals';
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  collected: boolean;
  respawnTimer: number;
}

interface CastleEntity {
  id: 'blue' | 'red';
  name: string;
  x: number;
  y: number;
  z: number;
  owner: 'blue' | 'red';
  progress: number;
  crystal: THREE.Mesh;
  ring: THREE.Mesh;
  trimMat: THREE.MeshStandardMaterial;
}

interface ProjectileEntity {
  mesh: THREE.Mesh;
  fromPlayer: boolean;
  damage: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  color: number;
  siphon: boolean;
}

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

const SAVE_STORAGE_KEY = 'shadowvoxel_infinity_core_save_v1';
const WEATHERS: WeatherMode[] = ['Clear', 'Rain', 'Snow', 'Ashstorm', 'Thunderstorm'];
const FAKE_ADS = [
  { title: 'FREE 999,999 VOXEL GOLD!', body: 'Claim your royal citadel treasure before the timer hits 0!' },
  { title: 'MALAKOR HATES THIS TRICK!', body: 'Boost sword crit +900% with one shady browser extension!' },
  { title: 'WARNING: 47 GOBLIN VIRUSES!', body: 'Download VoxelCleanerPro_2060.exe immediately!' },
  { title: 'DOUBLE XP FLASH SALE!', body: 'Limited 0.4s offer — buy 1 potion get 0 free!' },
];

// Reusable scratch math objects (Zero GC inside render loop)
const _v3A = new THREE.Vector3();
const _v3B = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _colorA = new THREE.Color();
const _colorB = new THREE.Color();

export class ShadowVoxelEngine {
  private mount: HTMLElement;
  private cb: EngineCallbacks;
  public audio = new RealmAudioEngine();

  private isSoftwareGl = false;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private vrCamera!: THREE.PerspectiveCamera;
  private resizeObserver: ResizeObserver | null = null;

  private frameId = 0;
  private disposed = false;
  private lastPerfMs = 0;
  private elapsedSec = 0;
  private hudSyncAccum = 0;
  private floatIdSeq = 1;
  private chatIdSeq = 1;
  private adIdSeq = 1;

  // Lighting, Sky, Weather
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private sunOrb!: THREE.Mesh;
  private moonOrb!: THREE.Mesh;
  private starMat!: THREE.PointsMaterial;
  private weatherPoints!: THREE.Points;
  private weatherMat!: THREE.PointsMaterial;
  private weatherIdx = 0;
  private worldTime = 0.65; // sunny mid-morning start
  private daySky = new THREE.Color(0x6fa6d8);
  private duskSky = new THREE.Color(0xc26e55);
  private nightSky = new THREE.Color(0x0c1328);
  private ascSky = new THREE.Color(0x1f0a36);
  private dungeonSky = new THREE.Color(0x110c1e);

  // Landmarks & Animated Props
  private infCrystal!: THREE.Mesh;
  private infRing1!: THREE.Mesh;
  private infRing2!: THREE.Mesh;
  private riftPortalRing!: THREE.Mesh;
  private dungeonPortalRing!: THREE.Mesh;
  private dungeonExitRing!: THREE.Mesh;
  private dnaHelix!: THREE.Group;
  private waterMesh!: THREE.Mesh;
  private emeraldWaterfall: EmeraldWaterfallModel | null = null;

  // Billboard & Cinema CanvasTextures
  private billboardCanvas!: HTMLCanvasElement;
  private billboardCtx!: CanvasRenderingContext2D;
  private billboardTex!: THREE.CanvasTexture;
  private cinemaCanvas!: HTMLCanvasElement;
  private cinemaCtx!: CanvasRenderingContext2D;
  private cinemaTex!: THREE.CanvasTexture;
  private cinemaScreenMat!: THREE.MeshBasicMaterial;
  private cinemaChannel: CinemaChannel = 'cyber';
  private localVideoEl: HTMLVideoElement | null = null;
  private localVideoTex: THREE.VideoTexture | null = null;

  // Game State
  private phase: GamePhase = 'title';
  private outcome: 'victory' | 'defeat' | null = null;
  private playerName = 'GitincloHero';
  private classKey: HeroClassKey = 'shadowblade';
  private lineageId: LineageId = 'human';
  private shardId = 'solara-eu';
  private guildId: string | null = null;
  private guildTag: string | null = null;
  private cultivationTier = 0;
  private spiritStones = 35;
  private level = 1;
  private xp = 0;
  private xpNext = 100;
  private hp = 185;
  private maxHp = 185;
  private mp = 100;
  private maxMp = 100;
  private gold = 60;
  private kills = 0;
  private adsBlocked = 0;
  private infinityTier = 1;
  private skillPoints = 1;
  private skills: SkillLevels = { ...INITIAL_SKILLS };
  private inventory: InventoryState = { ...INITIAL_INVENTORY };
  private lora: LoraWeights = { ...INITIAL_LORA };
  private quests: QuestProgress = { ...INITIAL_QUESTS };

  // Player Physics & Juice
  private playerRig!: HumanoidRig;
  private shieldMesh!: THREE.Mesh;
  private ascAuraMesh!: THREE.Mesh;
  private cultAuraMesh!: THREE.Mesh;
  private px = 0;
  private py = 2.5;
  private pz = 12; // Open plaza south of Infinity Core facing north toward Core & Castles
  private pvx = 0;
  private pvy = 0;
  private pvz = 0;
  private pRotY = Math.PI;
  private onGround = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private squashX = 1;
  private squashY = 1;
  private walkPhase = 0;
  private attackAnim = 0;
  private hitstopTimer = 0;
  private trauma = 0;
  private dashTimer = 0;
  private adShieldTimer = 0;
  private ascendantTimer = 0;
  private bioSerumTimer = 0;
  private cooldowns: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  private inDungeon = false;
  private activePopupIds = new Set<string>();

  // Buggy, Fishing, Campfire
  private buggy!: BuggyModel;
  private buggyX = 8;
  private buggyY = 2.5;
  private buggyZ = 10;
  private buggyRotY = -0.5;
  private buggySpeed = 0;
  private inBuggy = false;
  private islandShuttle!: TransitShuttleModel;
  private readonly shuttleRoute: Array<{ x: number; z: number; name: string }> = [
    { x: 10, z: 16, name: 'Infinity Core Plaza' },
    { x: 24, z: 28, name: 'GeminIsland Arcade' },
    { x: 18, z: 48, name: 'OmniStream XR Cinema' },
    { x: -16, z: 54, name: 'Ashen Coast Overlook' },
    { x: -34, z: 62, name: 'Emerald Cliff Waterfall' },
    { x: -32, z: 26, name: 'Rainy Bookstore' },
  ];
  private shuttleSeg = 0;
  private shuttleT = 0;
  private shuttleX = 10;
  private shuttleY = 2.5;
  private shuttleZ = 16;
  private shuttleRotY = 0;
  private inShuttle = false;
  private arcadeWins = 0;
  private isFishing = false;
  private fishTimer = 0;
  private bobberMesh!: THREE.Mesh;
  private bobberRipple!: THREE.Mesh;
  private campfires: Array<{ x: number; z: number; group: THREE.Group }> = [];
  private islandVillagers: Array<{
    name: string;
    line: string;
    x: number;
    z: number;
    homeX: number;
    homeZ: number;
    goalX: number;
    goalZ: number;
    timer: number;
    rig: IslandVillagerRig;
  }> = [];

  // Companions (Lira & L.E.O.) + Lore NPCs (Lin_Jie & Ji_Zhixiu)
  private liraRig!: HumanoidRig;
  private liraX = -3.5;
  private liraZ = 13.5;
  private liraAtkCd = 0;
  private liraHealCd = 0;
  private leoOrb!: { group: THREE.Group; ringA: THREE.Mesh; ringB: THREE.Mesh };
  // 3D Pet Follower (Kibo — Voxel Fox / Emerald Slime / Void Pup)
  private pet: PetState = { ...INITIAL_PET };
  private petRig!: PetFollowerRig;
  // Voxel Realms RPG Castle Warfare (Repo #4: Imperial Castle, 3D Trebuchet & Formation Siege Cohort)
  private warfare: CastleWarfareState = {
    ...INITIAL_WARFARE,
    troops: { ...INITIAL_WARFARE.troops },
    sectors: { ...INITIAL_WARFARE.sectors },
  };
  private trebuchet!: SiegeTrebuchetModel;
  private readonly trebuchetPos = { x: 14.5, z: 22.5 };
  private trebuchetAnimTimer = 0;
  private siegeBoulders: Array<{
    mesh: THREE.Mesh;
    startX: number;
    startY: number;
    startZ: number;
    targetX: number;
    targetY: number;
    targetZ: number;
    t: number;
    duration: number;
  }> = [];
  private siegeCohort: Array<{
    rig: SiegeTroopRig;
    branch: TroopBranch;
    x: number;
    z: number;
    rotY: number;
    atkCd: number;
    slotIdx: number;
  }> = [];
  private petX = 2.4;
  private petZ = 13.8;
  private petRotY = Math.PI;
  private petJumpTimer = 0;
  private petWalkPhase = 0;
  private loreNpcs: Array<{ name: string; line: string; x: number; z: number; rig: HumanoidRig }> = [];
  private allyAdventurers: Array<{
    name: string;
    x: number;
    z: number;
    tx: number;
    tz: number;
    goalX: number;
    goalZ: number;
    timer: number;
    rig: HumanoidRig;
  }> = [];

  // World Collections
  private castles: CastleEntity[] = [];
  private enemies: EnemyEntity[] = [];
  private gatherables: GatherableItem[] = [];
  private projectiles: ProjectileEntity[] = [];
  private particles: ParticleSlot[] = [];
  private particleInstanced!: THREE.InstancedMesh;
  private particleCursor = 0;
  private projGeo = new THREE.SphereGeometry(0.36, 8, 8);

  // Camera & Input
  private camYaw = 0;
  private camPitch = 0.38;
  private camDist = 13.5;
  private firstPerson = false;
  private vrMode = false;
  private isDraggingCam = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private keys = new Set<string>();

  // WebSocket Multiplayer
  private ws: WebSocket | null = null;
  private wsConnected = false;
  private myNetId: string | null = null;
  private onlineCount = 1;
  private netSyncAccum = 0;
  private remotePlayers = new Map<string, { rig: HumanoidRig; targetX: number; targetY: number; targetZ: number; rotY: number }>();

  // Clip Recording
  private isRecordingClip = false;

  constructor(mount: HTMLElement, callbacks: EngineCallbacks) {
    this.mount = mount;
    this.cb = callbacks;
    this.detectSoftwareGl();
    this.initRendererAndScene();
    this.buildTerrainAndWater();
    this.buildWorldLandmarks();
    this.buildDungeonArena();
    this.buildFoliageInstanced();
    this.buildParticlePool();
    this.buildPlayerAndCompanions();
    this.buildEnemiesAndGatherables();
    this.bindEvents();

    // Start in title flyover
    document.body.dataset.state = 'title';
    this.lastPerfMs = performance.now();
    this.emitHudSnapshot();
    this.startLoop();
  }

  private detectSoftwareGl(): void {
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if (!gl) {
        this.isSoftwareGl = true;
        return;
      }
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      this.isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      this.isSoftwareGl = true;
    }
  }

  private initRendererAndScene(): void {
    const w = this.mount.clientWidth || window.innerWidth;
    const h = this.mount.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.dataset.testid = 'realm-canvas';

    this.mount.innerHTML = '';
    this.mount.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = this.daySky.clone();
    this.scene.fog = new THREE.FogExp2(0x6fa6d8, 0.0052);

    // Mandatory studio environment reflections (keeps metals/crystals vibrant on GPU & SwiftShader)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.25, 380);
    this.vrCamera = new THREE.PerspectiveCamera(62, (w * 0.5) / h, 0.25, 380);

    // Warm/cool 3-point outdoor lighting rig (single shadow caster)
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x263244, 0.62);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.15);
    this.sunLight.position.set(60, 95, 45);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 260;
    const d = 110;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // Sun, Moon, Starfield
    this.sunOrb = new THREE.Mesh(
      new THREE.SphereGeometry(6.5, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    );
    this.moonOrb = new THREE.Mesh(
      new THREE.SphereGeometry(5.0, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xc7d2fe }),
    );
    this.scene.add(this.sunOrb, this.moonOrb);

    const starGeo = new THREE.BufferGeometry();
    const starCount = 320;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 0.42 + 0.08;
      starPos[i * 3] = Math.cos(th) * Math.cos(ph) * 190;
      starPos[i * 3 + 1] = Math.sin(ph) * 190 + 20;
      starPos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * 190;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, transparent: true, opacity: 0.12 });
    this.scene.add(new THREE.Points(starGeo, this.starMat));

    // Volumetric Weather Particle System
    const wCount = 480;
    const wGeo = new THREE.BufferGeometry();
    const wPos = new Float32Array(wCount * 3);
    for (let i = 0; i < wCount; i++) {
      wPos[i * 3] = (Math.random() - 0.5) * 76;
      wPos[i * 3 + 1] = Math.random() * 38;
      wPos[i * 3 + 2] = (Math.random() - 0.5) * 76;
    }
    wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
    this.weatherMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.42,
      transparent: true,
      opacity: 0.78,
    });
    this.weatherPoints = new THREE.Points(wGeo, this.weatherMat);
    this.weatherPoints.visible = false;
    this.scene.add(this.weatherPoints);
  }

  private buildTerrainAndWater(): void {
    // Extended terrain beyond playable bounds so world fades cleanly into horizon fog (no rectangular wall box!)
    const terrainGeo = new THREE.PlaneGeometry(WORLD_SIZE + 80, WORLD_SIZE + 80, 96, 96);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const tmpColor = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = getTerrainHeight(vx, vz);
      pos.setY(i, vy);
      const [r, g, b] = getTerrainRgb(vx, vz, vy);
      tmpColor.setRGB(r, g, b, THREE.SRGBColorSpace);
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.92,
      metalness: 0.04,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    this.scene.add(terrainMesh);

    // Ashen Sea Water + Fishing Dock
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.14,
      metalness: 0.35,
      transparent: true,
      opacity: 0.78,
    });
    this.waterMesh = new THREE.Mesh(new THREE.CircleGeometry(46, 32), waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(LANDMARKS.sea.x, WATER_LEVEL, LANDMARKS.sea.z);
    this.scene.add(this.waterMesh);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c4a21, roughness: 0.88 });
    const dockGroup = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.4, 13), woodMat);
    deck.position.y = 0.82;
    dockGroup.add(deck);
    [
      [-2.2, 0, -5],
      [2.2, 0, -5],
      [-2.2, 0, 5],
      [2.2, 0, 5],
    ].forEach(([px, , pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 2.6, 8), woodMat);
      post.position.set(px, 0.4, pz);
      dockGroup.add(post);
    });
    dockGroup.position.set(-10, 0, 66);
    this.scene.add(dockGroup);

    // Fishing bobber & animated ripple ring
    this.bobberMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.4, roughness: 0.25 }),
    );
    this.bobberMesh.visible = false;
    this.bobberRipple = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.68, 20),
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
    );
    this.bobberRipple.rotation.x = -Math.PI / 2;
    this.bobberRipple.visible = false;
    this.scene.add(this.bobberMesh, this.bobberRipple);
  }

  private buildWorldLandmarks(): void {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const stoneBump = createStoneBumpTexture(maxAniso);

    // 1. MemeForge Holo-Billboard Texture
    this.billboardCanvas = document.createElement('canvas');
    this.billboardCanvas.width = 512;
    this.billboardCanvas.height = 320;
    this.billboardCtx = this.billboardCanvas.getContext('2d')!;
    this.billboardTex = new THREE.CanvasTexture(this.billboardCanvas);
    this.billboardTex.colorSpace = THREE.SRGBColorSpace;
    this.billboardTex.anisotropy = maxAniso;
    this.drawDefaultBillboard();

    const bbMat = new THREE.MeshBasicMaterial({ map: this.billboardTex, side: THREE.DoubleSide });
    const placeBillboard = (x: number, y: number, z: number, rotY = 0) => {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(10.6, 6.6, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.7 }),
      );
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(9.9, 6.0), bbMat);
      s1.position.z = 0.26;
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(9.9, 6.0), bbMat);
      s2.position.z = -0.26;
      s2.rotation.y = Math.PI;
      g.add(frame, s1, s2);
      g.position.set(x, y, z);
      g.rotation.y = rotY;
      this.scene.add(g);
    };

    // 2. Central Infinity Core Monument (Voxel-Realms Part 4) — prominent tall spawn vista!
    const coreGroup = new THREE.Group();
    const spawnY = getTerrainHeight(0, 0);
    coreGroup.position.set(0, spawnY, 0);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      bumpMap: stoneBump,
      bumpScale: 0.14,
      roughness: 0.75,
      metalness: 0.25,
    });
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 5.2, 0.9, 8), plinthMat);
    base1.position.y = 0.45;
    base1.receiveShadow = true;
    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.5, 1.0, 8), plinthMat);
    base2.position.y = 1.4;
    this.infCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(2.3, 0),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x6366f1,
        emissiveIntensity: 1.15,
        roughness: 0.14,
        metalness: 0.72,
      }),
    );
    this.infCrystal.position.y = 6.2;
    this.infRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(3.6, 0.16, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, emissiveIntensity: 0.65, metalness: 0.85, roughness: 0.2 }),
    );
    this.infRing1.position.y = 6.2;
    this.infRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(4.5, 0.12, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.8, metalness: 0.75, roughness: 0.2 }),
    );
    this.infRing2.position.y = 6.2;
    const coreLight = new THREE.PointLight(0x6366f1, 2.2, 30);
    coreLight.position.y = 6.5;
    coreGroup.add(base1, base2, this.infCrystal, this.infRing1, this.infRing2, coreLight);
    this.scene.add(coreGroup);

    // Spawn Plaza Holo-Billboard & Starter Campfire
    placeBillboard(0, getTerrainHeight(0, -14) + 6.4, -14, 0);
    const starterFire = createCampfireProp();
    starterFire.position.set(-7.5, getTerrainHeight(-7.5, 8.5), 8.5);
    this.scene.add(starterFire);
    this.campfires.push({ x: -7.5, z: 8.5, group: starterFire });

    // 3. Two Capturable 3D Castles (Dawn Citadel & Obsidian Citadel)
    const buildCastle = (id: 'blue' | 'red', name: string, cx: number, cz: number, owner: 'blue' | 'red') => {
      const by = getTerrainHeight(cx, cz);
      const g = new THREE.Group();
      g.position.set(cx, by, cz);

      const stoneMat = new THREE.MeshStandardMaterial({
        color: owner === 'blue' ? 0x94a3b8 : 0x3b3f4f,
        bumpMap: stoneBump,
        bumpScale: 0.22,
        roughness: 0.85,
        metalness: 0.08,
      });
      const trimMat = new THREE.MeshStandardMaterial({
        color: owner === 'blue' ? 0x3b82f6 : 0xef4444,
        emissive: owner === 'blue' ? 0x1d4ed8 : 0x991b1b,
        emissiveIntensity: 0.45,
        roughness: 0.3,
        metalness: 0.55,
      });

      // 4 Corner Watchtowers with pointed spires
      [
        [-12, -12],
        [12, -12],
        [-12, 12],
        [12, 12],
      ].forEach(([tx, tz]) => {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(5.0, 13.5, 5.0), stoneMat);
        tower.position.set(tx, 6.75, tz);
        tower.castShadow = true;
        tower.receiveShadow = true;
        const spire = new THREE.Mesh(new THREE.ConeGeometry(4.0, 5.2, 4), trimMat);
        spire.position.set(tx, 16.0, tz);
        spire.rotation.y = Math.PI / 4;
        g.add(tower, spire);
      });

      // Side & Back Walls + Front Gatehouse Arch (wide open passage!)
      const sideGeo = new THREE.BoxGeometry(2.2, 7.6, 20);
      const wL = new THREE.Mesh(sideGeo, stoneMat);
      wL.position.set(-12, 3.8, 0);
      const wR = new THREE.Mesh(sideGeo, stoneMat);
      wR.position.set(12, 3.8, 0);
      const wB = new THREE.Mesh(new THREE.BoxGeometry(20, 7.6, 2.2), stoneMat);
      wB.position.set(0, 3.8, -12);
      const gL = new THREE.Mesh(new THREE.BoxGeometry(6.5, 7.6, 2.2), stoneMat);
      gL.position.set(-7.2, 3.8, 12);
      const gR = new THREE.Mesh(new THREE.BoxGeometry(6.5, 7.6, 2.2), stoneMat);
      gR.position.set(7.2, 3.8, 12);
      const gTop = new THREE.Mesh(new THREE.BoxGeometry(9.6, 2.8, 2.6), stoneMat);
      gTop.position.set(0, 8.6, 12);

      // Courtyard Capture Pedestal + Floating Crystal + Glowing Ring
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.9, 1.3, 6), stoneMat);
      ped.position.y = 0.65;
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(2.0, 0),
        new THREE.MeshStandardMaterial({
          color: owner === 'blue' ? 0x38bdf8 : 0xf87171,
          emissive: owner === 'blue' ? 0x0284c7 : 0xdc2626,
          emissiveIntensity: 0.9,
          roughness: 0.16,
          metalness: 0.55,
        }),
      );
      crystal.position.y = 4.6;

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(6.8, 7.8, 32),
        new THREE.MeshBasicMaterial({
          color: owner === 'blue' ? 0x38bdf8 : 0xf87171,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.72,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.12;

      g.add(wL, wR, wB, gL, gR, gTop, ped, crystal, ring);
      this.scene.add(g);
      placeBillboard(cx, by + 13.8, cz + 12, 0);

      this.castles.push({
        id,
        name,
        x: cx,
        y: by,
        z: cz,
        owner,
        progress: owner === 'blue' ? 100 : 0,
        crystal,
        ring,
        trimMat,
      });
    };

    buildCastle('blue', 'Dawn Citadel', LANDMARKS.blueCastle.x, LANDMARKS.blueCastle.z, 'blue');
    buildCastle('red', 'Obsidian Citadel', LANDMARKS.redCastle.x, LANDMARKS.redCastle.z, 'red');

    // 3b. Voxel Realms Imperial Siege Trebuchet overlooking road to Obsidian Citadel
    this.trebuchet = createSiegeTrebuchetModel();
    const trebY = getTerrainHeight(this.trebuchetPos.x, this.trebuchetPos.z);
    this.trebuchet.group.position.set(this.trebuchetPos.x, trebY, this.trebuchetPos.z);
    this.trebuchet.group.rotation.y = Math.atan2(
      LANDMARKS.redCastle.x - this.trebuchetPos.x,
      LANDMARKS.redCastle.z - this.trebuchetPos.z,
    );
    this.scene.add(this.trebuchet.group);

    // 4. Ashfield ShadowRealm Rift Monument (Malakor World Boss Lair)
    const riftGroup = new THREE.Group();
    riftGroup.position.set(LANDMARKS.malakor.x, getTerrainHeight(LANDMARKS.malakor.x, LANDMARKS.malakor.z), LANDMARKS.malakor.z);
    this.riftPortalRing = new THREE.Mesh(
      new THREE.TorusGeometry(6.2, 0.72, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x9333ea, emissiveIntensity: 1.3, roughness: 0.2, metalness: 0.65 }),
    );
    this.riftPortalRing.position.y = 7.8;
    const riftCore = new THREE.Mesh(
      new THREE.CircleGeometry(5.6, 22),
      new THREE.MeshBasicMaterial({ color: 0x2e1065, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    riftCore.position.y = 7.8;
    const obeliskMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, bumpMap: stoneBump, bumpScale: 0.2, roughness: 0.75 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.BoxGeometry(2.0, 8 + (i % 2) * 3, 2.0), obeliskMat);
      p.position.set(Math.cos(a) * 15.5, 4.2, Math.sin(a) * 15.5);
      p.castShadow = true;
      riftGroup.add(p);
    }
    const riftLight = new THREE.PointLight(0xc084fc, 2.2, 38);
    riftLight.position.y = 8;
    riftGroup.add(this.riftPortalRing, riftCore, riftLight);
    this.scene.add(riftGroup);

    // 5. Sunken Ruin Procedural Dungeon Portal (Teleports to Voryn's Lair)
    const dPortal = new THREE.Group();
    dPortal.position.set(LANDMARKS.dungeon.x, getTerrainHeight(LANDMARKS.dungeon.x, LANDMARKS.dungeon.z), LANDMARKS.dungeon.z);
    const ruinMat = new THREE.MeshStandardMaterial({ color: 0x475569, bumpMap: stoneBump, bumpScale: 0.25, roughness: 0.88 });
    const archL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8.2, 2.2), ruinMat);
    archL.position.set(-4.2, 4.1, 0);
    const archR = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8.2, 2.2), ruinMat);
    archR.position.set(4.2, 4.1, 0);
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(10.8, 2.0, 2.6), ruinMat);
    archTop.position.set(0, 8.6, 0);
    this.dungeonPortalRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.1, 0.34, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 1.4, roughness: 0.2 }),
    );
    this.dungeonPortalRing.position.y = 4.2;
    const dCore = new THREE.Mesh(
      new THREE.CircleGeometry(2.85, 20),
      new THREE.MeshBasicMaterial({ color: 0x083344, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
    );
    dCore.position.y = 4.2;
    dPortal.add(archL, archR, archTop, this.dungeonPortalRing, dCore);
    this.scene.add(dPortal);

    // 6. OmniStream XR 3D Cinema Dome (Curved IMAX Screen + Theater Deck)
    this.cinemaCanvas = document.createElement('canvas');
    this.cinemaCanvas.width = 512;
    this.cinemaCanvas.height = 288;
    this.cinemaCtx = this.cinemaCanvas.getContext('2d')!;
    this.cinemaTex = new THREE.CanvasTexture(this.cinemaCanvas);
    this.cinemaTex.colorSpace = THREE.SRGBColorSpace;
    this.cinemaTex.anisotropy = maxAniso;
    this.cinemaScreenMat = new THREE.MeshBasicMaterial({ map: this.cinemaTex, side: THREE.DoubleSide });

    const cinGroup = new THREE.Group();
    cinGroup.position.set(LANDMARKS.cinema.x, getTerrainHeight(LANDMARKS.cinema.x, LANDMARKS.cinema.z), LANDMARKS.cinema.z);
    const cinDeck = new THREE.Mesh(new THREE.CylinderGeometry(12.5, 13.5, 0.8, 20), plinthMat);
    cinDeck.position.y = 0.4;
    const cinScreen = new THREE.Mesh(
      new THREE.CylinderGeometry(10.2, 10.2, 7.6, 22, 1, true, Math.PI * 0.72, Math.PI * 0.56),
      this.cinemaScreenMat,
    );
    cinScreen.position.set(0, 5.2, 2.2);
    const cinFrame = new THREE.Mesh(
      new THREE.TorusGeometry(12.2, 0.25, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.7, metalness: 0.7, roughness: 0.2 }),
    );
    cinFrame.rotation.x = Math.PI / 2;
    cinFrame.position.y = 0.86;
    for (let r = 0; r < 2; r++) {
      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(9.2, 0.75, 1.3),
        new THREE.MeshStandardMaterial({ color: 0x3b1f5e, roughness: 0.65 }),
      );
      bench.position.set(0, 1.05, 2.8 + r * 3.1);
      cinGroup.add(bench);
    }
    cinGroup.add(cinDeck, cinScreen, cinFrame);
    this.scene.add(cinGroup);

    // 7. LoRAFlow Spatial Bio-Lab (DNA Bio-Reactor)
    const bioLab = createLoraBioLab();
    this.dnaHelix = bioLab.dnaHelix;
    bioLab.group.position.set(LANDMARKS.biolab.x, getTerrainHeight(LANDMARKS.biolab.x, LANDMARKS.biolab.z), LANDMARKS.biolab.z);
    this.scene.add(bioLab.group);

    // 8. Rainy Bookstore Cabin (Lin_Jie & Ji_Zhixiu)
    const bookstore = createRainyBookstoreCabin();
    bookstore.position.set(LANDMARKS.bookstore.x, getTerrainHeight(LANDMARKS.bookstore.x, LANDMARKS.bookstore.z), LANDMARKS.bookstore.z);
    this.scene.add(bookstore);

    // 9. GeminIsland Emerald Cliff Waterfall (Granite Massif + Twin Aqua Curtains + Plunge Lagoon)
    this.emeraldWaterfall = createEmeraldCliffWaterfall();
    this.emeraldWaterfall.group.position.set(
      LANDMARKS.waterfall.x,
      getTerrainHeight(LANDMARKS.waterfall.x, LANDMARKS.waterfall.z) - 0.1,
      LANDMARKS.waterfall.z,
    );
    this.scene.add(this.emeraldWaterfall.group);

    // 10. GeminIsland Interactive Arcade Pavilion (Tic-Tac-Toe, Simon Synth, Lights Out)
    const arcadePavilion = createArcadePavilion();
    arcadePavilion.position.set(
      LANDMARKS.arcade.x,
      getTerrainHeight(LANDMARKS.arcade.x, LANDMARKS.arcade.z),
      LANDMARKS.arcade.z,
    );
    this.scene.add(arcadePavilion);
  }

  private buildDungeonArena(): void {
    // Procedural 3D Sunken Ruin Dungeon Arena (located at DUNGEON_CENTER)
    const g = new THREE.Group();
    g.position.set(DUNGEON_CENTER.x, DUNGEON_CENTER.y, DUNGEON_CENTER.z);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e1b2e, roughness: 0.88, metalness: 0.1 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x312e4a, roughness: 0.82, metalness: 0.15 });

    const floor = new THREE.Mesh(new THREE.CylinderGeometry(DUNGEON_RADIUS, DUNGEON_RADIUS, 1.2, 24), floorMat);
    floor.position.y = -0.6;
    floor.receiveShadow = true;
    g.add(floor);

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.BoxGeometry(2.8, 12, 2.8), wallMat);
      col.position.set(Math.cos(a) * (DUNGEON_RADIUS - 1.5), 6, Math.sin(a) * (DUNGEON_RADIUS - 1.5));
      g.add(col);
    }

    // Glowing Exit Portal on South Edge of Arena
    this.dungeonExitRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.28, 8, 22),
      new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 1.4, roughness: 0.2 }),
    );
    this.dungeonExitRing.position.set(0, 3.4, 18);
    const exitCore = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 18),
      new THREE.MeshBasicMaterial({ color: 0x064e3b, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    exitCore.position.set(0, 3.4, 18);
    const dLight = new THREE.PointLight(0xa855f7, 2.4, 48);
    dLight.position.set(0, 10, 0);

    g.add(this.dungeonExitRing, exitCore, dLight);
    this.scene.add(g);
  }

  private buildFoliageInstanced(): void {
    // 96 stylized 3-part trees using InstancedMesh (Trunks + Lower Crown + Upper Crown) with ±15% scale & tint variation
    const treePositions: Array<{ x: number; y: number; z: number; scale: number; isShadow: boolean; isSnow: boolean }> = [];
    let seed = 4219;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 220 && treePositions.length < 96; i++) {
      const tx = (rand() - 0.5) * (WORLD_SIZE - 26);
      const tz = (rand() - 0.5) * (WORLD_SIZE - 26);
      let tooClose = false;
      for (const k of Object.keys(LANDMARKS) as LandmarkKey[]) {
        const lm = LANDMARKS[k];
        if (Math.hypot(tx - lm.x, tz - lm.z) < lm.r + 3.5) {
          tooClose = true;
          break;
        }
      }
      const ty = getTerrainHeight(tx, tz);
      if (tooClose || ty < WATER_LEVEL + 0.7) continue;
      const biome = getBiome(tx, tz);
      treePositions.push({
        x: tx,
        y: ty,
        z: tz,
        scale: 0.85 + rand() * 0.3,
        isShadow: biome === 'Ashfield Wastes' || biome === 'Crimson Marsh',
        isSnow: biome === 'Frostpeak Tundra',
      });
    }

    const count = treePositions.length;
    const trunkInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.05, 4.0, 1.05),
      new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.92 }),
      count,
    );
    const crown1Inst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(3.6, 2.9, 3.6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84 }),
      count,
    );
    const crown2Inst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.2, 2.1, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
      count,
    );

    treePositions.forEach((t, idx) => {
      _dummy.position.set(t.x, t.y + 2.0 * t.scale, t.z);
      _dummy.scale.set(t.scale, t.scale, t.scale);
      _dummy.rotation.set(0, idx * 0.7, 0);
      _dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(t.x, t.y + 4.7 * t.scale, t.z);
      _dummy.updateMatrix();
      crown1Inst.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(t.x, t.y + 6.9 * t.scale, t.z);
      _dummy.updateMatrix();
      crown2Inst.setMatrixAt(idx, _dummy.matrix);

      if (t.isShadow) _colorA.setHex(0x581c87);
      else if (t.isSnow) _colorA.setHex(0xcbd5e1);
      else _colorA.setHex(idx % 2 === 0 ? 0x1d783d : 0x258a48);
      crown1Inst.setColorAt(idx, _colorA);
      _colorB.copy(_colorA).multiplyScalar(1.14);
      crown2Inst.setColorAt(idx, _colorB);
    });

    trunkInst.instanceMatrix.needsUpdate = true;
    crown1Inst.instanceMatrix.needsUpdate = true;
    crown2Inst.instanceMatrix.needsUpdate = true;
    if (crown1Inst.instanceColor) crown1Inst.instanceColor.needsUpdate = true;
    if (crown2Inst.instanceColor) crown2Inst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    crown1Inst.computeBoundingSphere();
    crown2Inst.computeBoundingSphere();
    trunkInst.castShadow = !this.isSoftwareGl;
    crown1Inst.castShadow = !this.isSoftwareGl;
    this.scene.add(trunkInst, crown1Inst, crown2Inst);
  }

  private buildParticlePool(): void {
    const cap = 180;
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleInstanced = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), mat, cap);
    this.particleInstanced.frustumCulled = false;
    this.particles = [];
    for (let i = 0; i < cap; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
        scale: 0.001,
        color: new THREE.Color(0xffffff),
      });
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.particleInstanced.setMatrixAt(i, _dummy.matrix);
      this.particleInstanced.setColorAt(i, _colorA.setHex(0xffffff));
    }
    this.particleInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(this.particleInstanced);
  }

  private spawnParticles(x: number, y: number, z: number, colorHex: number, count = 10, speed = 8): void {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.particles.length;
      slot.active = true;
      slot.x = x;
      slot.y = y;
      slot.z = z;
      slot.vx = (Math.random() - 0.5) * speed;
      slot.vy = Math.random() * speed * 0.7 + 2.2;
      slot.vz = (Math.random() - 0.5) * speed;
      slot.maxLife = 0.4 + Math.random() * 0.32;
      slot.life = slot.maxLife;
      slot.scale = 1.0;
      slot.color.setHex(colorHex);
      this.particleInstanced.setColorAt(this.particleCursor === 0 ? this.particles.length - 1 : this.particleCursor - 1, slot.color);
    }
    if (this.particleInstanced.instanceColor) this.particleInstanced.instanceColor.needsUpdate = true;
  }

  private buildPlayerAndCompanions(): void {
    const spec = HERO_CLASSES[this.classKey];
    this.playerRig = createHumanoidRig(spec.bodyColor, spec.accentColor, 1.05, spec.weapon);
    this.py = getTerrainHeight(this.px, this.pz);
    this.playerRig.group.position.set(this.px, this.py, this.pz);
    this.playerRig.group.rotation.y = this.pRotY;

    // Ad-Blocker Cyan Hex Shield Aura
    this.shieldMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.1, 1),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.58 }),
    );
    this.shieldMesh.position.y = 1.6;
    this.shieldMesh.visible = false;
    this.playerRig.group.add(this.shieldMesh);

    // Ascendant v3.0 Ring Aura
    this.ascAuraMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.14, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xd946ef }),
    );
    this.ascAuraMesh.rotation.x = Math.PI / 2;
    this.ascAuraMesh.position.y = 0.45;
    this.ascAuraMesh.visible = false;
    this.playerRig.group.add(this.ascAuraMesh);

    // Cultivation Breakthrough Ground Halo (Open-World-MMORPG-)
    this.cultAuraMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.38, 0.08, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78 }),
    );
    this.cultAuraMesh.rotation.x = Math.PI / 2;
    this.cultAuraMesh.position.y = 0.16;
    this.cultAuraMesh.visible = false;
    this.playerRig.group.add(this.cultAuraMesh);
    this.scene.add(this.playerRig.group);

    // Drivable GeminIsland Off-Road Buggy parked beside Infinity Core Plaza
    this.buggy = createIslandBuggy();
    this.buggyY = getTerrainHeight(this.buggyX, this.buggyZ);
    this.buggy.group.position.set(this.buggyX, this.buggyY, this.buggyZ);
    this.buggy.group.rotation.y = this.buggyRotY;
    this.scene.add(this.buggy.group);

    // Companion Lira (ShadowRealm Recruitable AI Healer/Ranger)
    this.liraRig = createHumanoidRig(0x0f5132, 0x34d399, 0.96, 'staff');
    this.liraRig.group.position.set(this.liraX, getTerrainHeight(this.liraX, this.liraZ), this.liraZ);
    this.scene.add(this.liraRig.group);

    // L.E.O. Floating AI Companion Orb
    this.leoOrb = createLeoOrbModel();
    this.leoOrb.group.position.set(this.px + 1.4, this.py + 2.8, this.pz);
    this.scene.add(this.leoOrb.group);

    // 3D Pet Follower Companion (trots beside player right heel)
    const initPetScale = PET_EVOLUTION_STAGES[this.pet.evolutionStage]?.scale ?? 1.15;
    this.petRig = createPetFollowerModel(this.pet.species, this.pet.evolutionStage);
    this.petRig.group.scale.setScalar(initPetScale);
    this.petRig.group.position.set(this.petX, getTerrainHeight(this.petX, this.petZ), this.petZ);
    this.petRig.group.rotation.y = this.petRotY;
    this.scene.add(this.petRig.group);

    // Voxel Realms Live 3D Allied Siege Cohort (marching in active tactical formation)
    this.rebuildSiegeCohortMeshes();

    // Rainy Bookstore Lore NPCs (Lin_Jie & Ji_Zhixiu from MemeForge v2.3.0)
    const npcDefs = [
      {
        name: 'Lin_Jie',
        x: LANDMARKS.bookstore.x - 2.4,
        z: LANDMARKS.bookstore.z + 5.2,
        body: 0x312e81,
        acc: 0xf59e0b,
        line: 'Lin_Jie: "Welcome to the Rainy Bookstore. Every realm begins as a story—take this Crystal for the Forge!"',
      },
      {
        name: 'Ji_Zhixiu',
        x: LANDMARKS.bookstore.x + 2.2,
        z: LANDMARKS.bookstore.z + 5.2,
        body: 0x581c87,
        acc: 0xf472b6,
        line: 'Ji_Zhixiu: "Nocturne in the Rainy Bookstore is playing at OmniStream XR Cinema south of here!"',
      },
    ];
    npcDefs.forEach((n) => {
      const rig = createHumanoidRig(n.body, n.acc, 0.98, 'staff');
      rig.group.position.set(n.x, getTerrainHeight(n.x, n.z), n.z);
      this.scene.add(rig.group);
      this.loreNpcs.push({ name: n.name, line: n.line, x: n.x, z: n.z, rig });
    });

    // Friendly Realm Patrol Guards (clearly allied Dawn Patrols, distinct from WebSocket players)
    const patrolDefs = [
      { name: 'DawnVanguard', body: 0x1d4ed8, acc: 0x60a5fa, w: 'blade' as const, tx: -34, tz: -18 },
      { name: 'CitadelScout', body: 0x0f766e, acc: 0x2dd4bf, w: 'hammer' as const, tx: 26, tz: 20 },
    ];
    patrolDefs.forEach((p) => {
      const rig = createHumanoidRig(p.body, p.acc, 1.0, p.w);
      rig.group.position.set(p.tx, getTerrainHeight(p.tx, p.tz), p.tz);
      this.scene.add(rig.group);
      this.allyAdventurers.push({ ...p, x: p.tx, z: p.tz, goalX: p.tx, goalZ: p.tz, timer: 2.5, rig });
    });

    // Autonomous GeminIsland Transit Shuttle cruising the scenic island loop
    this.islandShuttle = createIslandTransitShuttle();
    const s0 = this.shuttleRoute[0];
    this.shuttleX = s0.x;
    this.shuttleZ = s0.z;
    this.shuttleY = Math.max(WATER_LEVEL + 0.1, getTerrainHeight(s0.x, s0.z));
    this.islandShuttle.group.position.set(this.shuttleX, this.shuttleY, this.shuttleZ);
    this.scene.add(this.islandShuttle.group);

    // 6 Articulated GeminIsland Voxel Villagers strolling Plaza, Arcade & Emerald Falls
    const villagerDefs = [
      {
        name: 'Talia (Island Botanist)',
        line: 'The Emerald Cliff Waterfall mist keeps our island moss glowing all year!',
        x: LANDMARKS.waterfall.x - 7,
        z: LANDMARKS.waterfall.z + 18,
        shirt: 0x10b981,
        hat: 0xfde047,
        skin: 0xf1c27d,
        pack: true,
      },
      {
        name: 'Koi (Arcade Champ)',
        line: 'Try beating my Tic-Tac-Toe and Lights Out high scores inside the GeminIsland Arcade [J]!',
        x: LANDMARKS.arcade.x - 5,
        z: LANDMARKS.arcade.z + 6,
        shirt: 0x38bdf8,
        hat: 0xf43f5e,
        skin: 0xe0ac69,
        pack: false,
      },
      {
        name: 'Mina (Transit Guide)',
        line: 'Hop on the teal Island Transit Shuttle with [E] for a calm loop past the Arcade, Cinema, and Waterfall.',
        x: 6,
        z: 18,
        shirt: 0x0d9488,
        hat: 0xfef08a,
        skin: 0xffdbac,
        pack: true,
      },
      {
        name: 'Bram (Voxel Mason)',
        line: 'We carved the granite massif at Emerald Falls block by block—visit the viewing deck!',
        x: LANDMARKS.waterfall.x + 8,
        z: LANDMARKS.waterfall.z + 17,
        shirt: 0xf59e0b,
        hat: 0x475569,
        skin: 0xc68642,
        pack: true,
      },
      {
        name: 'Nori (Synth Busker)',
        line: 'Simon Synth inside the Arcade uses the same pitched chime synthesizer as VibePitch!',
        x: LANDMARKS.arcade.x + 6,
        z: LANDMARKS.arcade.z + 5,
        shirt: 0xa855f7,
        hat: 0x22d3ee,
        skin: 0xf1c27d,
        pack: false,
      },
      {
        name: 'Sora (Plaza Stroller)',
        line: 'Peaceful day on GeminIsland! Watch out for Obsidian patrols east of the Citadel.',
        x: -9,
        z: 14,
        shirt: 0xf472b6,
        hat: 0xf8fafc,
        skin: 0x8d5524,
        pack: false,
      },
    ];
    villagerDefs.forEach((v, idx) => {
      const rig = createGeminIslandVillager(v.shirt, v.hat, v.skin, v.pack);
      rig.group.position.set(v.x, getTerrainHeight(v.x, v.z), v.z);
      this.scene.add(rig.group);
      this.islandVillagers.push({
        name: v.name,
        line: v.line,
        x: v.x,
        z: v.z,
        homeX: v.x,
        homeZ: v.z,
        goalX: v.x,
        goalZ: v.z,
        timer: 1.5 + idx * 0.6,
        rig,
      });
    });
  }

  private buildEnemiesAndGatherables(): void {
    const adTex = createAdDroneTexture(this.renderer.capabilities.getMaxAnisotropy());
    let enemyIdx = 1;

    const addEnemy = (kind: EnemyEntity['kind'], x: number, z: number, inDungeon = false, customName?: string) => {
      const y = getTerrainHeight(x, z);
      let group: THREE.Group;
      let rig: HumanoidRig | undefined;
      let hitMeshes: THREE.Mesh[];
      let hp = 90;
      let damage = 12;
      let speed = 7.5;
      let xp = 45;
      let gold = 28;
      let name = customName || 'Enemy';
      const isBoss = kind === 'boss';

      if (kind === 'slime') {
        const s = createSlimeEnemy();
        group = s.group;
        hitMeshes = s.hitMeshes;
        hp = 68;
        damage = 8;
        speed = 6.2;
        xp = 32;
        gold = 18;
        name = 'Emerald Slime';
      } else if (kind === 'spam') {
        const d = createSpamDroneModel(adTex);
        group = d.group;
        hitMeshes = d.hitMeshes;
        hp = 82;
        damage = 9;
        speed = 8.4;
        xp = 48;
        gold = 34;
        name = 'Pop-Up Spam Drone';
      } else if (kind === 'knight') {
        rig = createHumanoidRig(0x7f1d1d, 0xf87171, 1.12, 'hammer');
        group = rig.group;
        hitMeshes = rig.hitMeshes;
        hp = 135;
        damage = 16;
        speed = 7.6;
        xp = 64;
        gold = 45;
        name = 'Obsidian Siege Knight';
      } else if (kind === 'wraith') {
        rig = createHumanoidRig(0x3b0764, 0xc084fc, 1.0, 'voidorb');
        group = rig.group;
        hitMeshes = rig.hitMeshes;
        hp = 96;
        damage = 13;
        speed = 8.2;
        xp = 54;
        gold = 36;
        name = 'Shadow Wraith';
      } else {
        rig = createHumanoidRig(0x140826, inDungeon ? 0x22d3ee : 0xd946ef, 2.05, 'blade', true);
        group = rig.group;
        hitMeshes = rig.hitMeshes;
        hp = inDungeon ? 560 : 680;
        damage = 25;
        speed = 7.4;
        xp = 320;
        gold = 260;
        name = customName || 'Malakor the Ascendant';
      }

      // Ground Telegraph Shockwave Ring (visible during heavy attack windup!)
      const telegraphMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.4, isBoss ? 11.5 : 4.2, 28),
        new THREE.MeshBasicMaterial({
          color: isBoss ? 0xe879f9 : 0xf43f5e,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.55,
        }),
      );
      telegraphMesh.rotation.x = -Math.PI / 2;
      telegraphMesh.position.y = 0.14;
      telegraphMesh.visible = false;
      group.add(telegraphMesh);

      group.position.set(x, y, z);
      this.scene.add(group);
      this.enemies.push({
        id: `enemy_${enemyIdx++}`,
        kind,
        name,
        isBoss,
        inDungeon,
        group,
        rig,
        hitMeshes,
        x,
        y,
        z,
        vx: 0,
        vz: 0,
        homeX: x,
        homeZ: z,
        hp,
        maxHp: hp,
        damage,
        speed,
        xp,
        gold,
        alive: true,
        koTimer: 0,
        respawnTimer: 0,
        atkCd: 1.0,
        hitFlash: 0,
        telegraphTimer: 0,
        telegraphMesh,
        aoeCd: 4.5,
        orbitSign: enemyIdx % 2 === 0 ? 1 : -1,
      });
    };

    // Roaming Slimes (Whispering Woods)
    [
      [-18, -14],
      [22, 16],
      [-28, 28],
      [24, -10],
    ].forEach(([x, z]) => addEnemy('slime', x, z));

    // Obsidian Siege Knights guarding Obsidian Citadel
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      addEnemy('knight', LANDMARKS.redCastle.x + Math.cos(a) * 15, LANDMARKS.redCastle.z + Math.sin(a) * 15);
    }

    // Pop-Up Spam Drones
    [
      [20, -24],
      [-26, -24],
      [30, 32],
      [-16, 40],
    ].forEach(([x, z]) => addEnemy('spam', x, z));

    // Shadow Wraiths near Rift
    [
      [-14, -64],
      [16, -64],
      [-18, -86],
      [20, -86],
    ].forEach(([x, z]) => addEnemy('wraith', x, z));

    // Overworld World Boss: Malakor the Ascendant
    addEnemy('boss', LANDMARKS.malakor.x, LANDMARKS.malakor.z + 8, false, 'Malakor the Ascendant');

    // Procedural Sunken Ruin Dungeon Boss: Voryn the Void Lord
    addEnemy('boss', DUNGEON_CENTER.x, DUNGEON_CENTER.z - 8, true, 'Voryn, Lord of the Sunken Ruin');

    // Gatherable Resources (Sticks, Stones, Apples, Glowing Crystals)
    const gatherDefs: Array<{ kind: GatherableItem['kind']; x: number; z: number }> = [
      { kind: 'crystals', x: 10, z: -8 },
      { kind: 'crystals', x: -12, z: -10 },
      { kind: 'crystals', x: 38, z: -26 },
      { kind: 'sticks', x: -14, z: 8 },
      { kind: 'sticks', x: 16, z: 12 },
      { kind: 'stones', x: 18, z: -4 },
      { kind: 'stones', x: -18, z: -4 },
      { kind: 'apples', x: -8, z: 24 },
      { kind: 'apples', x: 14, z: 30 },
      { kind: 'crystals', x: -46, z: 32 },
    ];

    gatherDefs.forEach((gd, i) => {
      const g = new THREE.Group();
      const y = getTerrainHeight(gd.x, gd.z);
      if (gd.kind === 'crystals') {
        const m = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.55, 0),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.9, roughness: 0.15 }),
        );
        m.position.y = 0.72;
        g.add(m);
      } else if (gd.kind === 'apples') {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 10, 10),
          new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 }),
        );
        m.position.y = 0.45;
        g.add(m);
      } else if (gd.kind === 'stones') {
        const m = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.52, 0),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 }),
        );
        m.position.y = 0.42;
        g.add(m);
      } else {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.14, 1.3, 6),
          new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9 }),
        );
        m.rotation.z = Math.PI / 2.4;
        m.position.y = 0.35;
        g.add(m);
      }
      g.position.set(gd.x, y, gd.z);
      this.scene.add(g);
      this.gatherables.push({ id: `res_${i}`, kind: gd.kind, mesh: g, x: gd.x, y, z: gd.z, collected: false, respawnTimer: 0 });
    });
  }

  private drawDefaultBillboard(): void {
    const ctx = this.billboardCtx;
    const grad = ctx.createLinearGradient(0, 0, 512, 320);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#3b155e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 300);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 32px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('SHADOWVOXEL: INFINITY CORE', 256, 118);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 22px sans-serif';
    ctx.fillText('MEMEFORGE STUDIO — PRESS [M]', 256, 176);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '18px sans-serif';
    ctx.fillText('PROJECT YOUR MEME LIVE ONTO ALL CASTLES', 256, 224);
    this.billboardTex.needsUpdate = true;
  }

  private updateCinemaCanvas(t: number): void {
    if (this.localVideoEl && !this.localVideoEl.paused && !this.localVideoEl.ended) return;
    const ctx = this.cinemaCtx;
    ctx.fillStyle = '#070b18';
    ctx.fillRect(0, 0, 512, 288);

    if (this.cinemaChannel === 'cyber') {
      const g = ctx.createLinearGradient(0, 0, 512, 288);
      g.addColorStop(0, '#0f172a');
      g.addColorStop(1, '#3b155e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 288);
      ctx.strokeStyle = 'rgba(56,189,248,0.45)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) {
        const rx = (i * 53 + t * 85) % 512;
        const ry = (i * 37 + t * 190) % 288;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 5, ry + 16);
        ctx.stroke();
      }
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('OMNISTREAM XR CINEMA', 256, 124);
      ctx.fillStyle = '#67e8f9';
      ctx.font = '17px sans-serif';
      ctx.fillText('NOW SHOWING: NOCTURNE IN THE RAINY BOOKSTORE', 256, 166);
    } else if (this.cinemaChannel === 'warp') {
      ctx.strokeStyle = '#f59e0b';
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2 + t * 0.4;
        const r1 = ((t * 140 + i * 19) % 210) + 12;
        const r2 = r1 + 26;
        ctx.beginPath();
        ctx.moveTo(256 + Math.cos(a) * r1, 144 + Math.sin(a) * r1);
        ctx.lineTo(256 + Math.cos(a) * r2, 144 + Math.sin(a) * r2);
        ctx.stroke();
      }
      ctx.fillStyle = '#fef08a';
      ctx.font = '700 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('INFINITY CORE HYPERWARP', 256, 150);
    } else {
      ctx.fillStyle = '#22c55e';
      ctx.font = '15px monospace';
      for (let col = 0; col < 24; col++) {
        const y = ((t * 120 + col * 43) % 288);
        ctx.fillText(col % 2 === 0 ? 'AD_BLOCK' : '0x2060', col * 22 + 6, y);
      }
      ctx.fillStyle = '#ecfdf5';
      ctx.font = '700 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KOTLIN AD-SHIELD PROTOCOL LIVE', 256, 152);
    }
    this.cinemaTex.needsUpdate = true;
  }

  // =========================================================================
  // PUBLIC API FOR REACT SHELL & MODALS
  // =========================================================================
  public startGame(
    name: string,
    classKey: HeroClassKey,
    lineageId: LineageId = this.lineageId,
    shardId: string = this.shardId,
  ): void {
    this.audio.unlock();
    this.playerName = name.trim() || 'GitincloHero';
    this.classKey = classKey;
    this.lineageId = lineageId;
    this.shardId = shardId;
    const spec = HERO_CLASSES[classKey];
    const lineage = LINEAGES[lineageId];
    const stats = computeHeroPowerStats({
      classKey: this.classKey,
      lineageId: this.lineageId,
      level: this.level,
      cultivationTier: this.cultivationTier,
      skills: this.skills,
      weaponTier: this.inventory.weaponTier,
      infinityTier: this.infinityTier,
    });

    this.maxHp = stats.maxHp;
    this.hp = this.maxHp;
    this.maxMp = stats.maxMp;
    this.mp = this.maxMp;
    this.outcome = null;
    this.phase = 'playing';
    this.keys.clear();
    this.isDraggingCam = false;

    // Rebuild hero mesh to match chosen class & fantasy lineage
    this.scene.remove(this.playerRig.group);
    this.playerRig = createHumanoidRig(spec.bodyColor, spec.accentColor, 1.05, spec.weapon, false, lineageId);
    this.playerRig.group.position.set(this.px, this.py, this.pz);
    this.playerRig.group.rotation.y = this.pRotY;
    this.playerRig.group.add(this.shieldMesh, this.ascAuraMesh, this.cultAuraMesh);
    this.scene.add(this.playerRig.group);
    this.syncCultivationAura();

    document.body.dataset.state = 'playing';
    this.connectMultiplayer();
    this.audio.play('levelup');
    const shardName = REALM_SHARDS.find((s) => s.id === this.shardId)?.name ?? 'Solara Citadel';
    this.cb.onChat({
      id: `c_${this.chatIdSeq++}`,
      sender: 'REALM',
      text: `Welcome ${this.playerName} (${lineage.name} ${spec.name}) to ${shardName}! Press [U] for Guilds & Cultivation, or [M] for MemeForge.`,
      tone: 'system',
    });
    this.emitHudSnapshot();
  }

  private syncCultivationAura(): void {
    const realm = CULTIVATION_REALMS[Math.min(CULTIVATION_REALMS.length - 1, Math.max(0, this.cultivationTier))];
    this.cultAuraMesh.visible = this.cultivationTier > 0;
    const mat = this.cultAuraMesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(realm.auraColor);
  }

  public attemptBreakthrough(): { ok: boolean; message: string } {
    const res = attemptCultivationBreakthrough({
      level: this.level,
      cultivationTier: this.cultivationTier,
      spiritStones: this.spiritStones,
    });
    if (!res.ok) {
      this.cb.onToast(res.reason || 'Breakthrough requirements not met.');
      return { ok: false, message: res.reason || 'Breakthrough requirements not met.' };
    }
    this.cultivationTier = res.nextTier;
    this.spiritStones = res.spiritStones;
    const stats = computeHeroPowerStats({
      classKey: this.classKey,
      lineageId: this.lineageId,
      level: this.level,
      cultivationTier: this.cultivationTier,
      skills: this.skills,
      weaponTier: this.inventory.weaponTier,
      infinityTier: this.infinityTier,
    });
    this.maxHp = stats.maxHp;
    this.hp = this.maxHp;
    this.maxMp = stats.maxMp;
    this.mp = this.maxMp;
    this.syncCultivationAura();
    this.audio.play('levelup');
    this.spawnParticles(this.px, this.py + 1.8, this.pz, CULTIVATION_REALMS[this.cultivationTier].auraColor, 34, 15);
    const msg = `Cultivation Breakthrough! Ascended to ${res.realmName} (${stats.cultivationMult.toFixed(2)}x Power)`;
    this.cb.onToast(msg);
    this.emitHudSnapshot();
    return { ok: true, message: msg };
  }

  public setGuildMembership(guildId: string | null, guildTag: string | null): void {
    this.guildId = guildId;
    this.guildTag = guildTag;
    this.emitHudSnapshot();
  }

  public setShard(shardId: string): void {
    if (!REALM_SHARDS.some((s) => s.id === shardId)) return;
    this.shardId = shardId;
    const name = REALM_SHARDS.find((s) => s.id === shardId)?.name ?? shardId;
    this.cb.onToast(`Switched Realm Shard to ${name}`);
    this.emitHudSnapshot();
  }

  public setPhase(next: GamePhase): void {
    this.phase = next;
    document.body.dataset.state = next;
    this.keys.clear();
    this.isDraggingCam = false;
    if (next === 'paused' || next === 'gameover' || next === 'title') {
      document.exitPointerLock?.();
    }
    this.emitHudSnapshot();
  }

  public restartRun(): void {
    this.level = 1;
    this.xp = 0;
    this.xpNext = 100;
    this.gold = 60;
    this.cultivationTier = 0;
    this.spiritStones = 35;
    this.kills = 0;
    this.adsBlocked = 0;
    this.infinityTier = 1;
    this.skillPoints = 1;
    this.skills = { ...INITIAL_SKILLS };
    this.inventory = { ...INITIAL_INVENTORY };
    this.quests = { ...INITIAL_QUESTS };
    this.px = 0;
    this.pz = 12;
    this.py = getTerrainHeight(0, 12);
    this.pRotY = Math.PI;
    this.inDungeon = false;
    this.inBuggy = false;
    this.inShuttle = false;
    this.isFishing = false;
    this.pet = { ...INITIAL_PET };
    this.petX = 2.4;
    this.petZ = 13.8;
    this.petJumpTimer = 0;
    this.rebuildPetModel(this.pet.species, this.pet.evolutionStage);
    this.warfare = {
      ...INITIAL_WARFARE,
      troops: { ...INITIAL_WARFARE.troops },
      sectors: { ...INITIAL_WARFARE.sectors },
    };
    this.rebuildSiegeCohortMeshes();
    this.clearPopups();
    this.startGame(this.playerName, this.classKey, this.lineageId, this.shardId);
  }

  public toggleCameraMode(): void {
    this.firstPerson = !this.firstPerson;
    this.cb.onToast(this.firstPerson ? 'First-Person Camera enabled' : 'Third-Person Camera enabled');
    this.emitHudSnapshot();
  }

  public toggleVRMode(): void {
    this.vrMode = !this.vrMode;
    this.cb.onToast(this.vrMode ? 'OmniStream Stereoscopic VR Split-Screen ON' : 'Stereoscopic VR Split-Screen OFF');
    this.emitHudSnapshot();
  }

  public toggleMute(): void {
    this.audio.setMuted(!this.audio.isMuted());
    this.emitHudSnapshot();
  }

  public setVibePitch(semitones: number): void {
    this.audio.setPitchSemitones(semitones);
    this.audio.playBardNote(329.63);
    this.emitHudSnapshot();
  }

  public playBardNote(hz: number): void {
    this.audio.playBardNote(hz);
    this.spawnParticles(this.px, this.py + 2.4, this.pz, 0x38bdf8, 8, 8);
  }

  public playSoundboard(sfx: SfxName): void {
    this.audio.play(sfx);
  }

  public cycleWeather(): void {
    this.weatherIdx = (this.weatherIdx + 1) % WEATHERS.length;
    const w = WEATHERS[this.weatherIdx];
    this.weatherPoints.visible = w !== 'Clear';
    if (w === 'Rain' || w === 'Thunderstorm') {
      this.weatherMat.color.setHex(0x93c5fd);
      this.weatherMat.size = 0.42;
    } else if (w === 'Snow') {
      this.weatherMat.color.setHex(0xffffff);
      this.weatherMat.size = 0.62;
    } else if (w === 'Ashstorm') {
      this.weatherMat.color.setHex(0xc084fc);
      this.weatherMat.size = 0.52;
    }
    this.cb.onToast(`Weather shifted to ${w}`);
    this.emitHudSnapshot();
  }

  public toggleDayNight(): void {
    this.worldTime = (this.worldTime + Math.PI) % (Math.PI * 2);
    this.cb.onToast('Time of day toggled');
    this.emitHudSnapshot();
  }

  public grantGmBoost(): void {
    this.gold += 500;
    this.spiritStones += 50;
    this.gainXp(180);
    this.cb.onToast('GM Grant: +500 Gold, +50 Spirit Stones, +180 XP');
    this.emitHudSnapshot();
  }

  public rewardArcadeWin(gameName: string, goldReward: number, xpReward: number, stoneReward: number): void {
    this.arcadeWins += 1;
    this.gold += goldReward;
    this.spiritStones += stoneReward;
    this.gainXp(xpReward);
    this.audio.play('levelup');
    this.spawnParticles(this.px, this.py + 2.1, this.pz, 0x38bdf8, 22, 12);
    this.pushFloatLabel(this.px, this.py + 3.4, this.pz, `${gameName} WIN! +${goldReward}G`, '#38bdf8');
    this.cb.onToast(`GeminIsland Arcade (${gameName}): +${goldReward} Gold, +${xpReward} XP, +${stoneReward} Spirit Stones!`);
    this.emitHudSnapshot();
  }

  public teleportTo(target: LandmarkKey): void {
    const lm = LANDMARKS[target];
    if (!lm) return;
    this.inDungeon = false;
    this.inBuggy = false;
    this.inShuttle = false;
    const zOffsets: Record<LandmarkKey, number> = {
      spawn: 11,
      blueCastle: 19,
      redCastle: 19,
      malakor: 18,
      dungeon: 11,
      cinema: 14,
      biolab: 13,
      bookstore: 9,
      sea: -26,
      waterfall: 22,
      arcade: 9,
    };
    this.px = lm.x;
    this.pz = lm.z + zOffsets[target];
    this.py = getTerrainHeight(this.px, this.pz);
    this.pvy = 0;
    this.camYaw = 0;
    this.camPitch = target === 'waterfall' ? 0.2 : 0.36;
    this.pRotY = Math.PI;
    // Snap camera immediately on teleport so tall landmarks frame cleanly right away
    const snapCx = this.px + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    const snapCz = this.pz + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    const snapCy = Math.max(
      this.py + 3.1 + Math.sin(this.camPitch) * this.camDist,
      getTerrainHeight(snapCx, snapCz) + 1.8,
    );
    this.camera.position.set(snapCx, snapCy, snapCz);
    this.camera.lookAt(this.px, this.py + 2.2, this.pz);
    // Bring 3D pet follower alongside hero on teleport
    this.petX = this.px + 2.3;
    this.petZ = this.pz + 1.4;
    this.petRig.group.position.set(this.petX, getTerrainHeight(this.petX, this.petZ), this.petZ);
    this.audio.play('shadow');
    this.spawnParticles(this.px, this.py + 1.8, this.pz, 0x38bdf8, 18, 10);
    this.cb.onToast(`Teleported to ${lm.name}`);
    this.emitHudSnapshot();
  }

  private rebuildPetModel(species: PetSpeciesKey, evolutionStage: PetEvolutionStage = this.pet.evolutionStage): void {
    if (this.petRig) {
      this.scene.remove(this.petRig.group);
    }
    const stageSpec = PET_EVOLUTION_STAGES[evolutionStage] ?? PET_EVOLUTION_STAGES[0];
    this.petRig = createPetFollowerModel(species, evolutionStage);
    this.petRig.group.scale.setScalar(stageSpec.scale);
    const py = this.inDungeon
      ? DUNGEON_CENTER.y
      : Math.max(WATER_LEVEL + 0.05, getTerrainHeight(this.petX, this.petZ));
    this.petRig.group.position.set(this.petX, py, this.petZ);
    this.petRig.group.rotation.y = this.petRotY;
    this.scene.add(this.petRig.group);
  }

  private triggerPetEvolutionCelebration(newStage: PetEvolutionStage): string {
    const stageSpec = PET_EVOLUTION_STAGES[newStage] ?? PET_EVOLUTION_STAGES[1];
    const formTitle = getPetFormTitle(this.pet.species, newStage);
    this.rebuildPetModel(this.pet.species, newStage);
    this.petJumpTimer = 0.65;
    this.trauma = Math.min(1, this.trauma + 0.25);
    this.audio.play('levelup');
    const py = this.inDungeon ? DUNGEON_CENTER.y : getTerrainHeight(this.petX, this.petZ);
    this.spawnParticles(this.petX, py + 1.3, this.petZ, 0xfacc15, 24, 12);
    this.spawnParticles(this.petX, py + 1.5, this.petZ, newStage >= 2 ? 0xe879f9 : 0x38bdf8, 22, 11);
    this.pushFloatLabel(this.petX, py + 2.6, this.petZ, `★ EVOLVED: ${formTitle}!`, '#fde047');
    return `★ EVOLUTION! ${this.pet.name} ascended to Stage ${newStage} ${stageSpec.tierName} (${formTitle}) — +${stageSpec.hpRegenPerSec.toFixed(1)} HP/s, +${stageSpec.atkBonusPct}% ATK, +${stageSpec.xpBonusPct}% XP, +${stageSpec.speedBonusPct}% Speed!`;
  }

  public feedPet(food: 'apple' | 'fish' | 'treat'): { ok: boolean; message: string } {
    if (food === 'apple') {
      if (this.inventory.apples < 1) {
        const msg = 'No Apples in inventory — gather Apples in Whispering Woods or give a Treat (5 Gold).';
        this.cb.onToast(msg);
        return { ok: false, message: msg };
      }
      this.inventory.apples -= 1;
    } else if (food === 'fish') {
      if (this.inventory.fish < 1) {
        const msg = 'No Fish in inventory — press [F] at the Ashen Sea to catch Fish!';
        this.cb.onToast(msg);
        return { ok: false, message: msg };
      }
      this.inventory.fish -= 1;
    } else {
      if (this.gold < 5) {
        const msg = 'Need 5 Gold to dispense a L.E.O. Kibble Treat.';
        this.cb.onToast(msg);
        return { ok: false, message: msg };
      }
      this.gold -= 5;
    }

    const prevLevel = this.pet.level;
    const prevStage = this.pet.evolutionStage;
    this.pet = feedPetState(this.pet, food);
    const evolved = this.pet.evolutionStage > prevStage;
    let message: string;
    if (evolved) {
      message = this.triggerPetEvolutionCelebration(this.pet.evolutionStage);
    } else {
      this.petJumpTimer = 0.65;
      this.audio.play(this.pet.level > prevLevel ? 'levelup' : 'adblock');
      this.spawnParticles(this.petX, getTerrainHeight(this.petX, this.petZ) + 1.2, this.petZ, 0xfbbf24, 16, 8);
      this.pushFloatLabel(
        this.petX,
        getTerrainHeight(this.petX, this.petZ) + 2.1,
        this.petZ,
        this.pet.level > prevLevel ? `${this.pet.name} Bond Lv ${this.pet.level}!` : `Yum! +Hunger`,
        '#fde047',
      );
      const label = food === 'fish' ? 'Ashen Fish' : food === 'apple' ? 'Crisp Apple' : 'L.E.O. Treat';
      message =
        this.pet.level > prevLevel
          ? `Fed ${this.pet.name} a ${label}! Bond rose to Lv ${this.pet.level} (${this.pet.mood}).`
          : `Fed ${this.pet.name} a ${label}! Hunger ${Math.round(this.pet.hunger)}%, Happiness ${Math.round(this.pet.happiness)}%.`;
    }
    this.cb.onToast(message);
    this.emitHudSnapshot();
    return { ok: true, message };
  }

  public petCompanion(): { ok: boolean; message: string } {
    const prevLevel = this.pet.level;
    const prevStage = this.pet.evolutionStage;
    this.pet = petCompanionState(this.pet);
    const evolved = this.pet.evolutionStage > prevStage;
    let message: string;
    if (evolved) {
      message = this.triggerPetEvolutionCelebration(this.pet.evolutionStage);
    } else {
      this.petJumpTimer = 0.65;
      this.audio.play(this.pet.level > prevLevel ? 'levelup' : 'adblock');
      this.spawnParticles(this.petX, getTerrainHeight(this.petX, this.petZ) + 1.2, this.petZ, 0xf472b6, 16, 8);
      this.pushFloatLabel(
        this.petX,
        getTerrainHeight(this.petX, this.petZ) + 2.1,
        this.petZ,
        this.pet.level > prevLevel ? `${this.pet.name} Bond Lv ${this.pet.level}!` : `+18 Happiness`,
        '#f472b6',
      );
      message =
        this.pet.level > prevLevel
          ? `${this.pet.name} leaped with joy! Bond Level ${this.pet.level} reached!`
          : `You petted ${this.pet.name}! Happiness is now ${Math.round(this.pet.happiness)}% (${this.pet.mood}).`;
    }
    this.cb.onToast(message);
    this.emitHudSnapshot();
    return { ok: true, message };
  }

  public setPetSpecies(species: PetSpeciesKey): void {
    if (!(species in PET_SPECIES_SPECS) || this.pet.species === species) return;
    this.pet = { ...this.pet, species };
    this.rebuildPetModel(species, this.pet.evolutionStage);
    this.petJumpTimer = 0.55;
    this.audio.play('shadow');
    this.spawnParticles(this.petX, getTerrainHeight(this.petX, this.petZ) + 1.1, this.petZ, 0x38bdf8, 18, 9);
    const formTitle = getPetFormTitle(species, this.pet.evolutionStage);
    this.cb.onToast(`${this.pet.name} morphed into ${formTitle}!`);
    this.emitHudSnapshot();
  }

  public renamePet(rawName: string): void {
    const clean = rawName.trim().slice(0, 18);
    if (!clean) return;
    this.pet = { ...this.pet, name: clean };
    this.cb.onToast(`Companion renamed to ${clean}`);
    this.emitHudSnapshot();
  }

  // =========================================================================
  // VOXEL REALMS CASTLE WARFARE COMMANDS (Imperial Castle, Barracks, Trebuchet, Rallies)
  // =========================================================================

  private rebuildSiegeCohortMeshes(): void {
    for (const unit of this.siegeCohort) {
      this.scene.remove(unit.rig.group);
    }
    this.siegeCohort = [];

    const branches: TroopBranch[] = [];
    const sbSlots = Math.min(2, this.warfare.troops.shieldbearer);
    const shSlots = Math.min(2, this.warfare.troops.shooter);
    const bmSlots = Math.min(2, this.warfare.troops.bomber);
    for (let i = 0; i < sbSlots; i++) branches.push('shieldbearer');
    for (let i = 0; i < shSlots; i++) branches.push('shooter');
    for (let i = 0; i < bmSlots; i++) branches.push('bomber');

    branches.forEach((branch, idx) => {
      const rig = createSiegeTroopModel(branch);
      const angle = (idx / Math.max(1, branches.length)) * Math.PI * 2;
      const ux = this.px + Math.cos(angle) * 4.5;
      const uz = this.pz + Math.sin(angle) * 4.5;
      rig.group.position.set(ux, Math.max(WATER_LEVEL + 0.05, getTerrainHeight(ux, uz)), uz);
      rig.group.visible = this.warfare.cohortDeployed && !this.inDungeon;
      this.scene.add(rig.group);
      this.siegeCohort.push({
        rig,
        branch,
        x: ux,
        z: uz,
        rotY: this.pRotY,
        atkCd: 0.4 + idx * 0.25,
        slotIdx: idx,
      });
    });
  }

  public upgradeImperialCastle(): { ok: boolean; message: string } {
    const res = attemptImperialCastleUpgrade(this.warfare, this.gold, this.spiritStones);
    if (!res.ok) {
      const msg = res.reason || 'Cannot upgrade Imperial Castle yet.';
      this.cb.onToast(msg);
      return { ok: false, message: msg };
    }
    this.warfare = res.warfare;
    this.gold = res.gold;
    this.spiritStones = res.spiritStones;
    const spec = getImperialCastleSpec(this.warfare.castleLevel);
    // Physically scale Dawn Citadel crystal & ring aura with Imperial Castle level!
    const dawnCastle = this.castles.find((c) => c.id === 'blue');
    if (dawnCastle) {
      const scale = 1 + (this.warfare.castleLevel - 1) * 0.14;
      dawnCastle.crystal.scale.setScalar(scale);
      this.spawnParticles(dawnCastle.x, dawnCastle.y + 6, dawnCastle.z, 0xfacc15, 28, 14);
    }
    this.audio.play('levelup');
    this.spawnParticles(this.px, this.py + 2, this.pz, 0xfbbf24, 24, 12);
    const msg = `Imperial Castle upgraded to Lv ${spec.level} (${spec.era}) — Max Barracks ${spec.maxTroops}!`;
    this.cb.onToast(msg);
    this.emitHudSnapshot();
    return { ok: true, message: msg };
  }

  public trainSiegeTroops(branch: TroopBranch, count: number): { ok: boolean; message: string } {
    const res = attemptTrainSiegeTroops(this.warfare, branch, count, this.gold);
    if (!res.ok) {
      const msg = res.reason || 'Unable to train troops.';
      this.cb.onToast(msg);
      return { ok: false, message: msg };
    }
    this.warfare = res.warfare;
    this.gold = res.gold;
    this.rebuildSiegeCohortMeshes();
    this.audio.play('adblock');
    const msg = `Trained +${count} ${TROOP_SPECS[branch].label} (Army Power: ${computeWarfarePower(this.warfare)})`;
    this.cb.onToast(msg);
    this.emitHudSnapshot();
    return { ok: true, message: msg };
  }

  public setSiegeFormation(formation: SiegeFormationType): void {
    if (!(formation in SIEGE_FORMATIONS) || this.warfare.formation === formation) return;
    this.warfare = { ...this.warfare, formation };
    this.audio.play('shadow');
    this.cb.onToast(`Siege Formation: ${SIEGE_FORMATIONS[formation].label}`);
    this.emitHudSnapshot();
  }

  public setWarCommander(commanderId: WarCommanderId): void {
    if (!(commanderId in WAR_COMMANDERS) || this.warfare.commanderId === commanderId) return;
    this.warfare = { ...this.warfare, commanderId };
    this.audio.play('adblock');
    this.cb.onToast(`Active War Commander: ${WAR_COMMANDERS[commanderId].name}`);
    this.emitHudSnapshot();
  }

  public toggleCohortDeployed(): void {
    this.warfare = { ...this.warfare, cohortDeployed: !this.warfare.cohortDeployed };
    for (const u of this.siegeCohort) {
      u.rig.group.visible = this.warfare.cohortDeployed && !this.inDungeon;
    }
    this.audio.play('shadow');
    this.cb.onToast(
      this.warfare.cohortDeployed
        ? `3D Siege Cohort deployed in ${SIEGE_FORMATIONS[this.warfare.formation].label} formation!`
        : '3D Siege Cohort garrisoned inside Imperial Castle.',
    );
    this.emitHudSnapshot();
  }

  public fireSiegeTrebuchet(): { ok: boolean; message: string } {
    if (this.warfare.trebuchetCooldownSec > 0.2) {
      const msg = `Imperial Trebuchet reloading (${Math.ceil(this.warfare.trebuchetCooldownSec)}s)...`;
      this.cb.onToast(msg);
      return { ok: false, message: msg };
    }
    this.warfare = { ...this.warfare, trebuchetCooldownSec: 6.0 };
    this.trebuchetAnimTimer = 0.65;
    if (this.trebuchet) {
      this.trebuchet.boulderMesh.visible = false;
    }
    const startY = getTerrainHeight(this.trebuchetPos.x, this.trebuchetPos.z) + 5.8;
    const targetX = LANDMARKS.redCastle.x + (Math.random() - 0.5) * 6;
    const targetZ = LANDMARKS.redCastle.z + (Math.random() - 0.5) * 6;
    const targetY = getTerrainHeight(targetX, targetZ) + 2.5;
    const mesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.68, 0),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 1.7,
        roughness: 0.35,
      }),
    );
    mesh.position.set(this.trebuchetPos.x, startY, this.trebuchetPos.z);
    this.scene.add(mesh);
    this.siegeBoulders.push({
      mesh,
      startX: this.trebuchetPos.x,
      startY,
      startZ: this.trebuchetPos.z,
      targetX,
      targetY,
      targetZ,
      t: 0,
      duration: 1.45,
    });
    this.audio.play('ascendant');
    this.trauma = Math.min(1, this.trauma + 0.3);
    this.spawnParticles(this.trebuchetPos.x, startY, this.trebuchetPos.z, 0xf97316, 18, 10);
    const msg = 'Imperial Trebuchet fired! Flaming siege boulder arcing into Obsidian Citadel!';
    this.cb.onToast(msg);
    this.emitHudSnapshot();
    return { ok: true, message: msg };
  }

  public launchTerritoryRally(sector: TerritorySectorCode): { ok: boolean; message: string } {
    const res = resolveTerritoryRally(this.warfare, sector);
    if (!res.ok) {
      const msg = res.reason || `Cannot rally Sector ${sector}.`;
      this.cb.onToast(msg);
      return { ok: false, message: msg };
    }
    this.warfare = res.warfare;
    this.gold += res.goldReward;
    this.gainXp(res.xpReward);
    const redCastle = this.castles.find((c) => c.id === 'red');
    if (redCastle && redCastle.owner !== 'blue') {
      redCastle.progress = Math.min(99, redCastle.progress + res.obsidianSiegeDelta);
    }
    this.audio.play('levelup');
    this.spawnParticles(this.px, this.py + 2.2, this.pz, 0x38bdf8, 22, 11);
    const msg = `Sector ${sector} Rally Victory → ${res.newOwner}! (+${res.goldReward} Gold, +${res.xpReward} XP, +${res.obsidianSiegeDelta}% Obsidian Siege)`;
    this.cb.onToast(msg);
    this.emitHudSnapshot();
    return { ok: true, message: msg };
  }

  public craft(recipe: CraftRecipeKey): { ok: boolean; message: string } {
    const res = applyCraftRecipe(this.inventory, recipe);
    if (!res.ok) {
      this.cb.onToast(res.reason || 'Insufficient materials');
      return { ok: false, message: res.reason || 'Insufficient materials' };
    }
    this.inventory = res.inventory;
    if (recipe === 'weapon') {
      this.audio.play('levelup');
      const msg = `Forged Mythic Weapon Tier ${this.inventory.weaponTier} (+12 ATK)`;
      this.cb.onToast(msg);
      this.emitHudSnapshot();
      return { ok: true, message: msg };
    }
    if (recipe === 'campfire') {
      const fx = this.px + Math.sin(this.pRotY) * 2.4;
      const fz = this.pz + Math.cos(this.pRotY) * 2.4;
      const prop = createCampfireProp();
      prop.position.set(fx, getTerrainHeight(fx, fz), fz);
      this.scene.add(prop);
      this.campfires.push({ x: fx, z: fz, group: prop });
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      this.audio.play('adblock');
      const msg = 'Campfire deployed — HP & MP fully restored';
      this.cb.onToast(msg);
      this.emitHudSnapshot();
      return { ok: true, message: msg };
    }
    if (recipe === 'feast') {
      this.hp = Math.min(this.maxHp, this.hp + 85);
      this.audio.play('adblock');
      const msg = 'Feast consumed (+85 HP)';
      this.cb.onToast(msg);
      this.emitHudSnapshot();
      return { ok: true, message: msg };
    }
    if (recipe === 'core') {
      this.infinityTier += 1;
      this.gainXp(150);
      this.audio.play('ascendant');
      this.spawnParticles(this.px, this.py + 2, this.pz, 0xfacc15, 24, 13);
      const msg = `Infinity Core charged to Tier ${this.infinityTier} (+15% All Damage)`;
      this.cb.onToast(msg);
      this.emitHudSnapshot();
      return { ok: true, message: msg };
    }
    this.bioSerumTimer = 20;
    this.hp = Math.min(this.maxHp, this.hp + 60);
    this.audio.play('ascendant');
    const msg = 'Bio-Mutagen Serum active for 20s (+35% Damage & Regen)';
    this.cb.onToast(msg);
    this.emitHudSnapshot();
    return { ok: true, message: msg };
  }

  public upgradeSkill(skill: keyof SkillLevels): boolean {
    if (this.skillPoints <= 0) return false;
    this.skillPoints -= 1;
    this.skills[skill] += 1;
    if (skill === 'vitality') {
      this.maxHp += 24;
      this.hp += 24;
    } else if (skill === 'arcana') {
      this.maxMp += 18;
      this.mp += 18;
    }
    this.audio.play('levelup');
    this.cb.onToast(`Upgraded ${skill.toUpperCase()} to Rank ${this.skills[skill]}`);
    this.emitHudSnapshot();
    return true;
  }

  public updateLoraWeights(partial: Partial<LoraWeights>): void {
    this.lora = { ...this.lora, ...partial };
    this.emitHudSnapshot();
  }

  public setCinemaChannel(ch: CinemaChannel): void {
    this.cinemaChannel = ch;
    if (this.localVideoEl) {
      this.localVideoEl.pause();
      this.localVideoEl = null;
      this.cinemaScreenMat.map = this.cinemaTex;
      this.cinemaScreenMat.needsUpdate = true;
    }
    this.cb.onToast(`OmniStream XR Cinema switched to channel: ${ch.toUpperCase()}`);
    this.emitHudSnapshot();
  }

  public loadLocalCinemaVideo(file: File): void {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = url;
      video.loop = true;
      video.muted = false;
      video.playsInline = true;
      void video.play().catch(() => {
        video.muted = true;
        void video.play().catch(() => {});
      });
      this.localVideoEl = video;
      this.localVideoTex?.dispose();
      this.localVideoTex = new THREE.VideoTexture(video);
      this.localVideoTex.colorSpace = THREE.SRGBColorSpace;
      this.cinemaScreenMat.map = this.localVideoTex;
      this.cinemaScreenMat.needsUpdate = true;
      this.cb.onToast(`Streaming "${file.name}" onto 3D XR Cinema screen`);
    } catch {
      this.cb.onToast('Could not load local video file');
    }
  }

  public captureCanvasDataUrl(): string {
    // Render fresh frame right before reading buffer
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  public projectMemeToBillboards(sourceCanvas: HTMLCanvasElement): void {
    this.billboardCtx.drawImage(sourceCanvas, 0, 0, 512, 320);
    this.billboardTex.needsUpdate = true;
    this.quests.memeProjected = true;
    this.audio.play('levelup');
    this.cb.onToast('Meme projected live onto Spawn & Castle 3D Holo-Billboards!');
    this.cb.onChat({
      id: `c_${this.chatIdSeq++}`,
      sender: 'MemeForge',
      text: `${this.playerName} projected a holographic meme onto all Castle Billboards!`,
      tone: 'system',
    });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'meme', dataUrl: sourceCanvas.toDataURL('image/jpeg', 0.6) }));
    }
    this.emitHudSnapshot();
  }

  public recordFiveSecondClip(): boolean {
    if (this.isRecordingClip) return false;
    try {
      const stream = this.renderer.domElement.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        this.isRecordingClip = false;
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ShadowVoxel-Clip.webm';
        a.click();
        URL.revokeObjectURL(url);
        this.cb.onToast('5-second gameplay clip downloaded as WebM');
      };
      this.isRecordingClip = true;
      recorder.start();
      this.cb.onToast('Recording 5-second 3D gameplay clip...');
      window.setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, 5000);
      return true;
    } catch {
      this.cb.onToast('WebM recording is not supported in this browser');
      return false;
    }
  }

  public sendChat(text: string): void {
    const clean = text.trim();
    if (!clean) return;
    this.cb.onChat({
      id: `c_${this.chatIdSeq++}`,
      sender: this.playerName,
      text: clean,
      tone: 'normal',
    });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'chat', text: clean }));
    }
  }

  public quickSave(): void {
    try {
      const payload: SavePayload = {
        version: 1,
        savedAt: new Date().toISOString(),
        playerName: this.playerName,
        classKey: this.classKey,
        lineageId: this.lineageId,
        shardId: this.shardId,
        cultivationTier: this.cultivationTier,
        spiritStones: this.spiritStones,
        guildId: this.guildId,
        guildTag: this.guildTag,
        level: this.level,
        xp: this.xp,
        xpNext: this.xpNext,
        hp: this.hp,
        maxHp: this.maxHp,
        mp: this.mp,
        maxMp: this.maxMp,
        gold: this.gold,
        kills: this.kills,
        adsBlocked: this.adsBlocked,
        infinityTier: this.infinityTier,
        skillPoints: this.skillPoints,
        skills: { ...this.skills },
        inventory: { ...this.inventory },
        lora: { ...this.lora },
        quests: { ...this.quests },
        pet: { ...this.pet },
        warfare: {
          ...this.warfare,
          troops: { ...this.warfare.troops },
          sectors: { ...this.warfare.sectors },
        },
        x: this.px,
        z: this.pz,
      };
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
      this.audio.play('adblock');
      this.cb.onToast('Quick Saved to local storage (F5)');
    } catch {
      this.cb.onToast('Quick Save failed');
    }
  }

  public quickLoad(): void {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) {
        this.cb.onToast('No Quick Save found yet (press F5 to save)');
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      if (!isValidSavePayload(parsed)) {
        this.cb.onToast('Saved data was invalid');
        return;
      }
      this.playerName = parsed.playerName;
      this.classKey = parsed.classKey;
      if (parsed.lineageId && parsed.lineageId in LINEAGES) this.lineageId = parsed.lineageId;
      if (parsed.shardId) this.shardId = parsed.shardId;
      if (typeof parsed.cultivationTier === 'number') this.cultivationTier = parsed.cultivationTier;
      if (typeof parsed.spiritStones === 'number') this.spiritStones = parsed.spiritStones;
      if (parsed.guildId !== undefined) this.guildId = parsed.guildId;
      if (parsed.guildTag !== undefined) this.guildTag = parsed.guildTag;
      this.level = parsed.level;
      this.xp = parsed.xp;
      this.xpNext = parsed.xpNext;
      this.hp = parsed.hp;
      this.maxHp = parsed.maxHp;
      this.mp = parsed.mp;
      this.maxMp = parsed.maxMp;
      this.gold = parsed.gold;
      this.kills = parsed.kills;
      this.adsBlocked = parsed.adsBlocked;
      this.infinityTier = parsed.infinityTier;
      this.skillPoints = parsed.skillPoints;
      this.skills = { ...parsed.skills };
      this.inventory = { ...parsed.inventory };
      this.lora = { ...parsed.lora };
      this.quests = { ...parsed.quests };
      if (parsed.pet && typeof parsed.pet.hunger === 'number' && typeof parsed.pet.happiness === 'number') {
        const rawStage = typeof parsed.pet.evolutionStage === 'number' ? parsed.pet.evolutionStage : 0;
        const evolutionStage = Math.max(0, Math.min(2, Math.round(rawStage))) as PetEvolutionStage;
        this.pet = { ...INITIAL_PET, ...parsed.pet, evolutionStage };
        this.rebuildPetModel(this.pet.species, this.pet.evolutionStage);
      }
      if (parsed.warfare && typeof parsed.warfare.castleLevel === 'number') {
        this.warfare = {
          ...INITIAL_WARFARE,
          ...parsed.warfare,
          troops: { ...INITIAL_WARFARE.troops, ...(parsed.warfare.troops || {}) },
          sectors: { ...INITIAL_WARFARE.sectors, ...(parsed.warfare.sectors || {}) },
        };
        this.rebuildSiegeCohortMeshes();
      }
      this.px = parsed.x;
      this.pz = parsed.z;
      this.py = getTerrainHeight(this.px, this.pz);
      this.petX = this.px + 2.3;
      this.petZ = this.pz + 1.4;
      this.inDungeon = this.pz < -185;
      this.syncCultivationAura();
      this.audio.play('levelup');
      this.cb.onToast(`Loaded Level ${this.level} ${this.playerName}`);
      this.emitHudSnapshot();
    } catch {
      this.cb.onToast('Could not load save');
    }
  }

  public blockPopupAd(id: string): void {
    if (!this.activePopupIds.has(id)) return;
    this.activePopupIds.delete(id);
    this.adsBlocked += 1;
    this.quests.adsBlocked += 1;
    this.gainXp(15);
    this.audio.play('adblock');
    this.cb.onToast('Popup Ad Blocked! (+15 XP)');
    this.emitHudSnapshot();
  }

  public triggerTestPopupAd(): void {
    this.spawnPopupAd();
  }

  // =========================================================================
  // COMBAT SKILLS (1–5) & INTERACTION (E / F)
  // =========================================================================
  public triggerSkill(slot: 1 | 2 | 3 | 4 | 5): void {
    if (this.phase !== 'playing') return;
    this.audio.unlock();
    if (slot === 1) this.primaryAttack();
    else if (slot === 2) this.castShadowRift();
    else if (slot === 3) this.castAdBlockerShield();
    else if (slot === 4) this.castAscendantForm();
    else if (slot === 5) this.castVibeSonicPulse();
    this.emitHudSnapshot();
  }

  private primaryAttack(): void {
    if (this.cooldowns[0] > 0) return;
    const spec = HERO_CLASSES[this.classKey];
    const hasteMult = 1 / (1 + this.skills.haste * 0.1);
    this.cooldowns[0] = (spec.ranged ? 0.34 : 0.4) * hasteMult;
    this.attackAnim = 0.24;
    this.audio.play('attack');

    const dirX = Math.sin(this.pRotY);
    const dirZ = Math.cos(this.pRotY);

    if (spec.ranged) {
      const mesh = new THREE.Mesh(this.projGeo, new THREE.MeshBasicMaterial({ color: spec.accentColor }));
      mesh.position.set(this.px + dirX * 1.1, this.py + 1.9, this.pz + dirZ * 1.1);
      this.scene.add(mesh);
      this.projectiles.push({
        mesh,
        fromPlayer: true,
        damage: spec.damage,
        vx: dirX * 42,
        vy: 0,
        vz: dirZ * 42,
        life: 0.95,
        color: spec.accentColor,
        siphon: this.classKey === 'voidwalker',
      });
    } else {
      this.spawnParticles(this.px + dirX * 2.4, this.py + 1.7, this.pz + dirZ * 2.4, spec.accentColor, 8, 7);
      this.enemies.forEach((e) => {
        if (!e.alive || e.inDungeon !== this.inDungeon) return;
        const dist = Math.hypot(e.x - this.px, e.z - this.pz);
        if (dist <= spec.range + (e.isBoss ? 2.2 : 0)) {
          this.damageEnemy(e, spec.damage, false);
        }
      });
    }
  }

  private castShadowRift(): void {
    if (this.cooldowns[1] > 0 || this.mp < 20) return;
    this.mp -= 20;
    this.cooldowns[1] = 4.5;
    this.attackAnim = 0.34;
    this.trauma = Math.min(1, this.trauma + 0.32);
    this.audio.play('shadow');
    this.spawnParticles(this.px, this.py + 1.5, this.pz, 0xa855f7, 26, 15);
    this.pushFloatLabel(this.px, this.py + 3.4, this.pz, 'SHADOW RIFT', '#c084fc');

    this.enemies.forEach((e) => {
      if (!e.alive || e.inDungeon !== this.inDungeon) return;
      if (Math.hypot(e.x - this.px, e.z - this.pz) <= 13.5) {
        this.damageEnemy(e, 46, true);
      }
    });
  }

  private castAdBlockerShield(): void {
    if (this.cooldowns[2] > 0 || this.mp < 15) return;
    this.mp -= 15;
    this.cooldowns[2] = 7.5;
    this.adShieldTimer = 6.5;
    this.audio.play('adblock');
    const cleared = this.clearPopups();
    if (cleared > 0) {
      this.adsBlocked += cleared;
      this.quests.adsBlocked += cleared;
      this.cb.onChat({
        id: `c_${this.chatIdSeq++}`,
        sender: 'Ad-Blocker',
        text: `Vaporized ${cleared} malicious pop-up ad(s) from HUD!`,
        tone: 'blocked',
      });
    }
    this.spawnParticles(this.px, this.py + 1.8, this.pz, 0x22d3ee, 22, 11);
    this.cb.onToast('Ad-Blocker Shield active! Popups cleared & Spam Drones zapped');

    this.enemies.forEach((e) => {
      if (e.alive && e.kind === 'spam' && Math.hypot(e.x - this.px, e.z - this.pz) <= 22) {
        this.damageEnemy(e, 95, true);
      }
    });
  }

  private castAscendantForm(): void {
    if (this.cooldowns[3] > 0 || this.mp < 30) return;
    this.mp -= 30;
    this.cooldowns[3] = 20;
    this.ascendantTimer = 12;
    this.trauma = Math.min(1, this.trauma + 0.45);
    this.audio.play('ascendant');
    this.spawnParticles(this.px, this.py + 2, this.pz, 0xd946ef, 32, 16);
    this.cb.onToast('ShadowRealm v3.0 Ascendant Form active (+75% Damage & Lifesteal)');
  }

  private castVibeSonicPulse(): void {
    if (this.cooldowns[4] > 0 || this.mp < 18) return;
    this.mp -= 18;
    this.cooldowns[4] = 8.5;
    this.audio.play('vibe');
    const heal = Math.round(this.maxHp * 0.28);
    this.hp = Math.min(this.maxHp, this.hp + heal);
    const pitchBoost = 1 + Math.abs(this.audio.getPitchSemitones()) * 0.04;
    this.spawnParticles(this.px, this.py + 1.6, this.pz, 0x38bdf8, 24, 14);
    this.pushFloatLabel(this.px, this.py + 3.5, this.pz, `+${heal} HP · VIBE PULSE`, '#38bdf8');
    this.enemies.forEach((e) => {
      if (!e.alive || e.inDungeon !== this.inDungeon) return;
      if (Math.hypot(e.x - this.px, e.z - this.pz) <= 12) {
        this.damageEnemy(e, Math.round(32 * pitchBoost), false);
      }
    });
  }

  private damageEnemy(e: EnemyEntity, baseDmg: number, isHeavy: boolean, siphon = false): void {
    const spec = HERO_CLASSES[this.classKey];
    const lineage = LINEAGES[this.lineageId];
    const cult = CULTIVATION_REALMS[Math.min(CULTIVATION_REALMS.length - 1, Math.max(0, this.cultivationTier))];
    const petMods = getPetStatusModifiers(this.pet);
    const formationAtkBonus = this.warfare.cohortDeployed
      ? SIEGE_FORMATIONS[this.warfare.formation].heroAtkBonusPct
      : 0;
    const { damage, isCrit } = computePlayerDamage({
      baseDamage: baseDmg,
      level: this.level,
      weaponTier: this.inventory.weaponTier,
      powerSkill: this.skills.power,
      infinityTier: this.infinityTier,
      ascendantActive: this.ascendantTimer > 0,
      bioSerumActive: this.bioSerumTimer > 0,
      critChance: spec.critChance,
      lineageAtkBonusPct: lineage.attackBonusPct + petMods.atkBonusPct + formationAtkBonus,
      cultivationMult: cult.powerMultiplier,
    });

    e.hp -= damage;
    e.hitFlash = 0.08;
    // Directional knockback impulse
    const dx = e.x - this.px;
    const dz = e.z - this.pz;
    const len = Math.hypot(dx, dz) || 1;
    const kb = e.isBoss ? 2.5 : 8.5;
    e.vx += (dx / len) * kb;
    e.vz += (dz / len) * kb;

    if (isCrit || isHeavy) {
      this.hitstopTimer = 0.042;
      this.trauma = Math.min(1, this.trauma + (isCrit ? 0.28 : 0.2));
      this.audio.play('crit');
    } else {
      this.audio.play('hit');
    }

    if (this.ascendantTimer > 0 || siphon) {
      this.hp = Math.min(this.maxHp, this.hp + Math.round(damage * 0.14));
    }

    this.spawnParticles(e.x, e.y + 1.6, e.z, isCrit ? 0xfacc15 : 0xf97316, isCrit ? 14 : 7, 8);
    this.pushFloatLabel(e.x, e.y + 3.0, e.z, isCrit ? `CRIT -${damage}!` : `-${damage}`, isCrit ? '#facc15' : '#fb923c');

    if (e.hp <= 0) {
      e.alive = false;
      e.koTimer = 0.38; // Smooth KO topple/dissolve instead of instant pop-out
      e.telegraphMesh.visible = false;
      e.respawnTimer = e.isBoss ? 40 : 18;
      this.kills += 1;
      this.gold += e.gold;
      const stoneGain = Math.round((e.isBoss ? 65 : 12) * (1 + lineage.cultivationSpeedPct / 100));
      this.spiritStones += stoneGain;
      this.hitstopTimer = 0.055;
      this.trauma = Math.min(1, this.trauma + 0.35);
      this.gainXp(e.xp);
      this.spawnParticles(e.x, e.y + 1.8, e.z, 0xfacc15, 22, 12);

      if (e.kind === 'spam') {
        this.adsBlocked += 1;
        this.quests.adsBlocked += 1;
      }
      if (e.isBoss && !e.inDungeon) {
        this.quests.defeatMalakor = true;
        this.audio.play('levelup');
        this.cb.onToast('WORLD BOSS DEFEATED: Malakor the Ascendant!');
      }
      if (e.isBoss && e.inDungeon) {
        this.quests.defeatVoryn = true;
        this.audio.play('levelup');
        this.cb.onToast('DUNGEON BOSS DEFEATED: Voryn vanquished!');
      }
      // Check Realm Conquest Victory (both bosses + Obsidian Citadel)
      if (this.quests.defeatMalakor && this.quests.defeatVoryn && this.quests.captureObsidian) {
        this.outcome = 'victory';
        this.setPhase('gameover');
      }
    }
  }

  private gainXp(amount: number): void {
    const petMods = getPetStatusModifiers(this.pet);
    const boostedAmount = Math.round(amount * (1 + petMods.xpBonusPct / 100));
    const { next, leveledUp } = applyXpGain(
      {
        level: this.level,
        xp: this.xp,
        xpNext: this.xpNext,
        maxHp: this.maxHp,
        maxMp: this.maxMp,
        hp: this.hp,
        mp: this.mp,
        skillPoints: this.skillPoints,
      },
      boostedAmount,
    );
    this.level = next.level;
    this.xp = next.xp;
    this.xpNext = next.xpNext;
    this.maxHp = next.maxHp;
    this.maxMp = next.maxMp;
    this.hp = next.hp;
    this.mp = next.mp;
    this.skillPoints = next.skillPoints;
    if (leveledUp > 0) {
      this.audio.play('levelup');
      this.spawnParticles(this.px, this.py + 2, this.pz, 0xfef08a, 26, 13);
      this.cb.onToast(`LEVEL UP! Reached Level ${this.level} (+${leveledUp} Skill Point)`);
    }
  }

  private handleInteractE(): void {
    if (this.phase !== 'playing') return;

    // 1. Alight / Board Autonomous Island Transit Shuttle
    if (this.inShuttle) {
      this.inShuttle = false;
      this.px = this.shuttleX + Math.cos(this.shuttleRotY) * 3.2;
      this.pz = this.shuttleZ - Math.sin(this.shuttleRotY) * 3.2;
      this.py = getTerrainHeight(this.px, this.pz);
      this.cb.onToast('Alighted from GeminIsland Transit Shuttle');
      this.emitHudSnapshot();
      return;
    }
    if (!this.inDungeon && !this.inBuggy && Math.hypot(this.px - this.shuttleX, this.pz - this.shuttleZ) < 6.8) {
      this.inShuttle = true;
      this.isFishing = false;
      this.audio.play('jump');
      this.cb.onToast('Riding GeminIsland Transit Shuttle (Scenic Loop — press E anytime to alight)');
      this.emitHudSnapshot();
      return;
    }

    // 1b. Exit / Enter Island Buggy
    if (this.inBuggy) {
      this.inBuggy = false;
      this.px = this.buggyX - Math.cos(this.buggyRotY) * 2.6;
      this.pz = this.buggyZ + Math.sin(this.buggyRotY) * 2.6;
      this.py = getTerrainHeight(this.px, this.pz);
      this.cb.onToast('Exited Island Buggy');
      this.emitHudSnapshot();
      return;
    }
    if (!this.inDungeon && Math.hypot(this.px - this.buggyX, this.pz - this.buggyZ) < 6.0) {
      this.inBuggy = true;
      this.quests.driveBuggy = true;
      this.audio.play('jump');
      this.cb.onToast('Driving Island Buggy (WASD to drive, Shift to boost, E to exit)');
      this.emitHudSnapshot();
      return;
    }

    // 2. Sunken Ruin Dungeon Enter / Exit Portal
    if (!this.inDungeon && Math.hypot(this.px - LANDMARKS.dungeon.x, this.pz - LANDMARKS.dungeon.z) < 7.5) {
      this.inDungeon = true;
      this.px = DUNGEON_CENTER.x;
      this.pz = DUNGEON_CENTER.z + 13;
      this.py = DUNGEON_CENTER.y;
      this.pRotY = Math.PI;
      this.audio.play('ascendant');
      this.cb.onToast('Entered Sunken Ruin Dungeon — Defeat Voryn!');
      this.emitHudSnapshot();
      return;
    }
    if (this.inDungeon && Math.hypot(this.px - DUNGEON_CENTER.x, this.pz - (DUNGEON_CENTER.z + 18)) < 6.5) {
      this.inDungeon = false;
      this.px = LANDMARKS.dungeon.x;
      this.pz = LANDMARKS.dungeon.z + 9;
      this.py = getTerrainHeight(this.px, this.pz);
      this.audio.play('shadow');
      this.cb.onToast('Returned to the Overworld');
      this.emitHudSnapshot();
      return;
    }

    // 3. Bookstore Lore NPCs (Lin_Jie & Ji_Zhixiu)
    for (const npc of this.loreNpcs) {
      if (Math.hypot(this.px - npc.x, this.pz - npc.z) < 5.5) {
        this.inventory.crystals += 1;
        this.audio.play('adblock');
        this.cb.onToast(`${npc.name} gifted you +1 Crystal!`);
        this.cb.onChat({ id: `c_${this.chatIdSeq++}`, sender: npc.name, text: npc.line, tone: 'leo' });
        this.emitHudSnapshot();
        return;
      }
    }

    // 3b. GeminIsland Strolling Villagers
    for (const v of this.islandVillagers) {
      if (!this.inDungeon && Math.hypot(this.px - v.x, this.pz - v.z) < 4.8) {
        this.gold += 8;
        this.audio.play('adblock');
        this.cb.onToast(`${v.name}: "${v.line}" (+8 Gold)`);
        this.cb.onChat({ id: `c_${this.chatIdSeq++}`, sender: v.name, text: v.line, tone: 'normal' });
        this.emitHudSnapshot();
        return;
      }
    }

    // 4. Voxel Realms Imperial Siege Trebuchet, GeminIsland Arcade, OmniStream Cinema, or LoRAFlow Bio-Lab Quick Open
    if (!this.inDungeon && Math.hypot(this.px - this.trebuchetPos.x, this.pz - this.trebuchetPos.z) < 7.2) {
      this.fireSiegeTrebuchet();
      return;
    }
    if (!this.inDungeon && Math.hypot(this.px - LANDMARKS.arcade.x, this.pz - LANDMARKS.arcade.z) < 9.5) {
      this.cb.onOpenModal?.('arcade');
      return;
    }
    if (Math.hypot(this.px - LANDMARKS.cinema.x, this.pz - LANDMARKS.cinema.z) < 12) {
      this.cb.onOpenModal?.('omni');
      return;
    }
    if (Math.hypot(this.px - LANDMARKS.biolab.x, this.pz - LANDMARKS.biolab.z) < 11) {
      this.cb.onOpenModal?.('lora');
      return;
    }

    // 5. Gather nearby resource manually
    for (const g of this.gatherables) {
      if (!g.collected && Math.hypot(this.px - g.x, this.pz - g.z) < 5.5) {
        this.collectGatherable(g);
        return;
      }
    }

    // 6. Pet nearby 3D Companion Follower directly in world
    if (Math.hypot(this.px - this.petX, this.pz - this.petZ) < 4.2) {
      this.petCompanion();
      return;
    }
  }

  private handleActionF(): void {
    if (this.phase !== 'playing' || this.inBuggy) return;

    // Rest at nearby Campfire
    for (const cf of this.campfires) {
      if (Math.hypot(this.px - cf.x, this.pz - cf.z) < 6.0) {
        this.hp = this.maxHp;
        this.mp = this.maxMp;
        this.audio.play('adblock');
        this.spawnParticles(cf.x, getTerrainHeight(cf.x, cf.z) + 1.2, cf.z, 0xfb923c, 16, 7);
        this.cb.onToast('Rested by the Campfire — HP & MP fully restored');
        this.emitHudSnapshot();
        return;
      }
    }

    // Fish near Ashen Sea / Dock
    const distSea = Math.hypot(this.px - LANDMARKS.sea.x, this.pz - LANDMARKS.sea.z);
    if (!this.inDungeon && distSea < 52) {
      if (!this.isFishing) {
        this.isFishing = true;
        this.fishTimer = 2.6;
        const bx = this.px + Math.sin(this.pRotY) * 5.2;
        const bz = this.pz + Math.cos(this.pRotY) * 5.2;
        this.bobberMesh.position.set(bx, WATER_LEVEL + 0.12, bz);
        this.bobberRipple.position.set(bx, WATER_LEVEL + 0.05, bz);
        this.bobberMesh.visible = true;
        this.bobberRipple.visible = true;
        this.audio.play('splash');
        this.cb.onToast('Fishing line cast into the Ashen Sea...');
        this.emitHudSnapshot();
      }
    } else {
      this.cb.onToast('Stand near the Ashen Sea (south) to fish, or near a Campfire to rest');
    }
  }

  private collectGatherable(g: GatherableItem): void {
    g.collected = true;
    g.mesh.visible = false;
    g.respawnTimer = 22;
    this.inventory[g.kind] += 1;
    this.audio.play('adblock');
    this.spawnParticles(g.x, g.y + 0.7, g.z, 0x38bdf8, 8, 6);
    this.pushFloatLabel(g.x, g.y + 1.6, g.z, `+1 ${g.kind}`, '#67e8f9');
  }

  private spawnPopupAd(): void {
    if (this.adShieldTimer > 0) {
      this.adsBlocked += 1;
      this.quests.adsBlocked += 1;
      this.audio.play('adblock');
      this.pushFloatLabel(this.px, this.py + 3.4, this.pz, 'AD BLOCKED', '#22d3ee');
      return;
    }
    if (this.activePopupIds.size >= 3) return;
    const adDef = FAKE_ADS[Math.floor(Math.random() * FAKE_ADS.length)];
    const id = `ad_${this.adIdSeq++}`;
    this.activePopupIds.add(id);
    this.cb.onPopupAd({
      id,
      title: adDef.title,
      body: adDef.body,
      leftPct: 18 + Math.random() * 54,
      topPct: 20 + Math.random() * 44,
    });
    this.cb.onChat({ id: `c_${this.chatIdSeq++}`, sender: 'SPAM-BOT', text: adDef.title, tone: 'spam' });
  }

  private clearPopups(): number {
    const n = this.activePopupIds.size;
    this.activePopupIds.clear();
    this.cb.onClearPopups();
    return n;
  }

  private pushFloatLabel(wx: number, wy: number, wz: number, text: string, color: string): void {
    _v3A.set(wx, wy, wz).project(this.camera);
    if (_v3A.z < -1 || _v3A.z > 1) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = (_v3A.x * 0.5 + 0.5) * rect.width;
    const y = (-_v3A.y * 0.5 + 0.5) * rect.height;
    this.cb.onFloatLabel({ id: this.floatIdSeq++, text, x, y, color, createdAt: performance.now() });
  }

  // =========================================================================
  // REAL-TIME WEBSOCKET MULTIPLAYER (/ws on port 3000)
  // =========================================================================
  private connectMultiplayer(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/ws`;
      const socket = new WebSocket(url);
      this.ws = socket;

      socket.onopen = () => {
        this.wsConnected = true;
        socket.send(JSON.stringify({ type: 'join', name: this.playerName, classKey: this.classKey }));
        this.emitHudSnapshot();
      };

      socket.onmessage = (evt) => {
        try {
          const msg = JSON.parse(String(evt.data));
          if (msg.type === 'welcome') {
            this.myNetId = msg.id;
            this.onlineCount = Number(msg.onlineCount || 1);
            if (typeof msg.billboardDataUrl === 'string') {
              this.applyRemoteBillboard(msg.billboardDataUrl);
            }
          } else if (msg.type === 'state' && Array.isArray(msg.players)) {
            this.onlineCount = Number(msg.onlineCount || msg.players.length);
            const seen = new Set<string>();
            for (const rp of msg.players) {
              if (!rp || rp.id === this.myNetId) continue;
              seen.add(rp.id);
              let entry = this.remotePlayers.get(rp.id);
              if (!entry) {
                const spec = HERO_CLASSES[(rp.classKey as HeroClassKey) in HERO_CLASSES ? (rp.classKey as HeroClassKey) : 'shadowblade'];
                const rig = createHumanoidRig(spec.bodyColor, spec.accentColor, 1.05, spec.weapon);
                rig.group.position.set(rp.x, rp.y, rp.z);
                this.scene.add(rig.group);
                entry = { rig, targetX: rp.x, targetY: rp.y, targetZ: rp.z, rotY: rp.rotY || 0 };
                this.remotePlayers.set(rp.id, entry);
              }
              entry.targetX = rp.x;
              entry.targetY = rp.y;
              entry.targetZ = rp.z;
              entry.rotY = rp.rotY || 0;
            }
            for (const [id, entry] of this.remotePlayers) {
              if (!seen.has(id)) {
                this.scene.remove(entry.rig.group);
                this.remotePlayers.delete(id);
              }
            }
          } else if (msg.type === 'chat' && typeof msg.text === 'string') {
            this.cb.onChat({
              id: `c_${this.chatIdSeq++}`,
              sender: String(msg.sender || 'Hero'),
              text: msg.text,
              tone: 'normal',
            });
          } else if (msg.type === 'meme' && typeof msg.dataUrl === 'string') {
            this.applyRemoteBillboard(msg.dataUrl);
          }
        } catch {
          // Ignore malformed ws messages
        }
      };

      socket.onclose = () => {
        this.wsConnected = false;
        this.emitHudSnapshot();
      };
      socket.onerror = () => {
        this.wsConnected = false;
      };
    } catch {
      this.wsConnected = false;
    }
  }

  private applyRemoteBillboard(dataUrl: string): void {
    const img = new Image();
    img.onload = () => {
      this.billboardCtx.drawImage(img, 0, 0, 512, 320);
      this.billboardTex.needsUpdate = true;
    };
    img.src = dataUrl;
  }

  // =========================================================================
  // INPUT LISTENERS & RESIZE OBSERVER
  // =========================================================================
  private isTypingTarget(): boolean {
    const el = document.activeElement;
    return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'));
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.isTypingTarget()) return;

    if (this.phase === 'title') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.startGame(this.playerName, this.classKey);
      }
      return;
    }

    if (e.code === 'F5') {
      e.preventDefault();
      this.quickSave();
      return;
    }
    if (e.code === 'F9') {
      e.preventDefault();
      this.quickLoad();
      return;
    }

    if (this.phase !== 'playing') return;

    const alreadyHeld = this.keys.has(e.code);
    this.keys.add(e.code);

    if (!alreadyHeld) {
      if (e.code === 'Space') {
        e.preventDefault();
        this.jumpBufferTimer = 0.12;
      } else if (e.code === 'Digit1') this.triggerSkill(1);
      else if (e.code === 'Digit2') this.triggerSkill(2);
      else if (e.code === 'Digit3') this.triggerSkill(3);
      else if (e.code === 'Digit4') this.triggerSkill(4);
      else if (e.code === 'Digit5') this.triggerSkill(5);
      else if (e.code === 'KeyE') this.handleInteractE();
      else if (e.code === 'KeyF') this.handleActionF();
      else if (e.code === 'KeyV') this.toggleCameraMode();
      else if (e.code === 'KeyX') this.toggleVRMode();
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (this.dashTimer <= 0) {
          this.dashTimer = 0.24;
          this.audio.play('shadow');
          this.spawnParticles(this.px, this.py + 1.2, this.pz, 0x818cf8, 10, 9);
        }
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    // Variable jump height cut when Space released early while ascending
    if (e.code === 'Space' && this.pvy > 4.5 && !this.inBuggy) {
      this.pvy *= 0.48;
    }
  };

  private onWindowBlur = (): void => {
    this.keys.clear();
    this.isDraggingCam = false;
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (this.phase !== 'playing') return;
    if (e.button === 2) {
      this.isDraggingCam = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (e.button === 0) {
      this.triggerSkill(1);
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDraggingCam) return;
    this.camYaw -= (e.clientX - this.lastMouseX) * 0.0065;
    this.camPitch = Math.max(0.14, Math.min(1.12, this.camPitch + (e.clientY - this.lastMouseY) * 0.005));
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onMouseUp = (): void => {
    this.isDraggingCam = false;
  };

  private onWheel = (e: WheelEvent): void => {
    if (this.phase !== 'playing') return;
    this.camDist = Math.max(6.5, Math.min(26, this.camDist + e.deltaY * 0.01));
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    dom.addEventListener('mousedown', this.onMouseDown);
    dom.addEventListener('wheel', this.onWheel, { passive: true });
    dom.addEventListener('contextmenu', this.onContextMenu);
    dom.addEventListener('webglcontextlost', this.onContextLost);

    this.resizeObserver = new ResizeObserver(() => {
      if (this.disposed) return;
      const w = this.mount.clientWidth || window.innerWidth;
      const h = this.mount.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.vrCamera.aspect = (w * 0.5) / h;
      this.vrCamera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
    this.resizeObserver.observe(this.mount);
  }

  // =========================================================================
  // MAIN SIMULATION LOOP (GPU rAF vs Software-WebGL afterDraw pacing)
  // =========================================================================
  private afterDraw(cb: () => void): void {
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } catch {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = Math.max(0.001, (now - this.lastPerfMs) / 1000);
      this.lastPerfMs = now;
      const dt = Math.min(rawDt, 0.05);

      this.step(dt);
      this.renderFrame();

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private step(dt: number): void {
    this.elapsedSec += dt;
    const t = this.elapsedSec;

    // Always animate world monuments, crystals, cinema, and weather even on title screen
    this.infCrystal.rotation.y += dt * 1.1;
    this.infCrystal.position.y = 6.2 + Math.sin(t * 2.2) * 0.42;
    this.infRing1.rotation.x += dt * 0.85;
    this.infRing1.rotation.y += dt * 0.55;
    this.infRing2.rotation.z -= dt * 0.72;
    this.infRing2.rotation.x += dt * 0.35;
    this.riftPortalRing.rotation.z += dt * 1.15;
    this.dungeonPortalRing.rotation.z -= dt * 1.3;
    this.dungeonExitRing.rotation.z += dt * 1.4;
    this.dnaHelix.rotation.y += dt * 0.9;
    this.waterMesh.position.y = WATER_LEVEL + Math.sin(t * 1.8) * 0.08;

    // Animate GeminIsland Emerald Cliff Waterfall rising plunge mist & aqua shimmer
    if (this.emeraldWaterfall) {
      this.emeraldWaterfall.curtainMat.emissiveIntensity = 0.68 + Math.sin(t * 4.5) * 0.14;
      for (const puff of this.emeraldWaterfall.mistPuffs) {
        const cycle = (t * puff.speed * 0.45 + puff.phase) % 1;
        puff.mesh.position.set(
          puff.baseX + Math.sin(t * 1.6 + puff.phase) * 0.55,
          1.1 + cycle * 3.4,
          puff.baseZ + cycle * 1.1,
        );
        const s = 0.65 + Math.sin(cycle * Math.PI) * 0.75;
        puff.mesh.scale.setScalar(s);
      }
    }

    // Autonomous GeminIsland Transit Shuttle loop & strolling villagers
    this.stepShuttleAndVillagers(dt, t);

    for (const c of this.castles) {
      c.crystal.rotation.y += dt * 1.35;
      c.crystal.position.y = 4.6 + Math.sin(t * 2.4 + c.x) * 0.38;
    }

    // Update OmniStream Cinema screen ~12Hz to keep CanvasTexture lightweight
    if (Math.floor(t * 12) !== Math.floor((t - dt) * 12)) {
      this.updateCinemaCanvas(t);
    }

    // Dynamic Day/Night Cycle
    this.worldTime = (this.worldTime + dt * 0.018) % (Math.PI * 2);
    const sunY = Math.sin(this.worldTime) * 155;
    const sunX = Math.cos(this.worldTime) * 155;
    this.sunOrb.position.set(sunX, sunY, -60);
    this.moonOrb.position.set(-sunX, -sunY, -60);
    const dayFactor = Math.max(0, Math.sin(this.worldTime));
    this.sunLight.position.set(sunX * 0.5, Math.max(24, sunY * 0.7), 40);
    this.sunLight.intensity = 0.35 + dayFactor * 0.95;
    this.hemiLight.intensity = 0.35 + dayFactor * 0.5;
    this.starMat.opacity = Math.max(0.05, (1 - dayFactor) * 0.85);

    // Horizon & Sky Color Continuity
    const inShadowZone = Math.hypot(this.px - LANDMARKS.malakor.x, this.pz - LANDMARKS.malakor.z) < 36;
    if (this.inDungeon) {
      _colorA.copy(this.dungeonSky);
    } else if (this.ascendantTimer > 0 || inShadowZone) {
      _colorA.copy(this.ascSky);
    } else if (dayFactor > 0.25) {
      _colorA.copy(this.daySky);
    } else if (dayFactor > 0.05) {
      _colorA.copy(this.duskSky);
    } else {
      _colorA.copy(this.nightSky);
    }
    (this.scene.background as THREE.Color).lerp(_colorA, 1 - Math.exp(-3 * dt));
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.scene.background as THREE.Color);
    }

    // Title Screen Live World Camera Flyover
    if (this.phase === 'title') {
      const ang = t * 0.14;
      this.camera.position.set(Math.sin(ang) * 46, 22 + Math.sin(t * 0.3) * 3, Math.cos(ang) * 46);
      this.camera.lookAt(0, 6, -4);
      return;
    }

    if (this.phase !== 'playing') {
      return;
    }

    // Hitstop freezes simulation physics briefly on heavy hits while camera shake & particles keep ticking
    this.trauma = Math.max(0, this.trauma - dt * 1.9);
    this.updateParticles(dt);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    this.stepPlayer(dt, t);
    this.stepCastles(dt);
    this.stepEnemies(dt, t);
    this.stepCompanionsAndNpcs(dt, t);
    this.stepProjectiles(dt);
    this.stepGatherablesAndWeather(dt, t);
    this.stepRemotePlayers(dt);

    // Throttled React HUD snapshot (~10Hz) so React never reconciles at 60Hz
    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.1) {
      this.hudSyncAccum = 0;
      this.emitHudSnapshot();
    }
  }

  private stepPlayer(dt: number, t: number): void {
    // Camera keyboard orbit (Q / E — note E is interact, so Q orbits left and R orbits right, plus RMB drag)
    if (this.keys.has('KeyQ')) this.camYaw += 2.1 * dt;
    if (this.keys.has('KeyR')) this.camYaw -= 2.1 * dt;

    // Cooldowns & Buff timers
    for (let i = 0; i < 5; i++) this.cooldowns[i] = Math.max(0, this.cooldowns[i] - dt);
    const mpRegen = (this.classKey === 'pyromancer' ? 8.5 : 5.2) + this.skills.arcana * 1.1;
    this.mp = Math.min(this.maxMp, this.mp + mpRegen * dt);
    if (this.bioSerumTimer > 0) {
      this.bioSerumTimer = Math.max(0, this.bioSerumTimer - dt);
      this.hp = Math.min(this.maxHp, this.hp + 6 * dt);
    }
    this.adShieldTimer = Math.max(0, this.adShieldTimer - dt);
    this.ascendantTimer = Math.max(0, this.ascendantTimer - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    // Fishing countdown
    if (this.isFishing) {
      this.fishTimer -= dt;
      this.bobberMesh.position.y = WATER_LEVEL + 0.1 + Math.sin(t * 7) * 0.08;
      const ripScale = 1 + ((t * 1.8) % 1.4);
      this.bobberRipple.scale.setScalar(ripScale);
      if (this.fishTimer <= 0) {
        this.isFishing = false;
        this.bobberMesh.visible = false;
        this.bobberRipple.visible = false;
        this.inventory.fish += 1;
        this.quests.catchFish = true;
        this.gainXp(25);
        this.audio.play('levelup');
        this.cb.onToast('Caught an Ashen Sea Fish! (+1 Fish, +25 XP)');
      }
    }

    // Input movement vector
    let mx = 0;
    let mz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) mz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) mz += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;

    if (this.inShuttle) {
      // Riding the Autonomous GeminIsland Transit Shuttle along the scenic island loop
      this.px = this.shuttleX;
      this.py = this.shuttleY + 1.1;
      this.pz = this.shuttleZ;
      this.pRotY = this.shuttleRotY;
      this.pvx = 0;
      this.pvy = 0;
      this.pvz = 0;
      this.playerRig.group.visible = false;
    } else if (this.inBuggy) {
      // GeminIsland Off-Road Buggy Driving Physics
      const accel = (this.dashTimer > 0 ? 46 : 32);
      const maxSpd = this.dashTimer > 0 ? 34 : 25;
      if (mz < 0) this.buggySpeed = Math.min(maxSpd, this.buggySpeed + accel * dt);
      else if (mz > 0) this.buggySpeed = Math.max(-12, this.buggySpeed - 28 * dt);
      else this.buggySpeed *= Math.exp(-4.2 * dt);

      if (Math.abs(this.buggySpeed) > 0.4) {
        this.buggyRotY -= mx * 2.2 * dt * (this.buggySpeed >= 0 ? 1 : -1);
      }

      const nx = this.buggyX + Math.sin(this.buggyRotY) * this.buggySpeed * dt;
      const nz = this.buggyZ + Math.cos(this.buggyRotY) * this.buggySpeed * dt;
      const clamped = clampWorldPos(nx, nz, false);
      this.buggyX = clamped.x;
      this.buggyZ = clamped.z;
      this.buggyY = Math.max(WATER_LEVEL + 0.1, getTerrainHeight(this.buggyX, this.buggyZ));

      // Terrain slope pitch/roll estimation
      const hFront = getTerrainHeight(this.buggyX + Math.sin(this.buggyRotY) * 1.6, this.buggyZ + Math.cos(this.buggyRotY) * 1.6);
      const hBack = getTerrainHeight(this.buggyX - Math.sin(this.buggyRotY) * 1.6, this.buggyZ - Math.cos(this.buggyRotY) * 1.6);
      this.buggy.group.position.set(this.buggyX, this.buggyY, this.buggyZ);
      this.buggy.group.rotation.y = this.buggyRotY;
      this.buggy.group.rotation.x = THREE.MathUtils.damp(this.buggy.group.rotation.x, Math.atan2(hBack - hFront, 3.2), 8, dt);

      // Spin tires proportionally to velocity
      for (const w of this.buggy.wheels) {
        w.rotation.x += (this.buggySpeed / 0.56) * dt;
      }

      this.px = this.buggyX;
      this.py = this.buggyY + 0.6;
      this.pz = this.buggyZ;
      this.pRotY = this.buggyRotY;
      this.playerRig.group.visible = false;
    } else {
      this.playerRig.group.visible = true;
      const spec = HERO_CLASSES[this.classKey];
      const hasInput = mx !== 0 || mz !== 0;
      if (hasInput) {
        this.isFishing = false;
        this.bobberMesh.visible = false;
        this.bobberRipple.visible = false;
        const len = Math.hypot(mx, mz);
        mx /= len;
        mz /= len;
        const sinY = Math.sin(this.camYaw);
        const cosY = Math.cos(this.camYaw);
        const wx = mx * cosY + mz * sinY;
        const wz = -mx * sinY + mz * cosY;

        const popupSlow = this.activePopupIds.size > 0 ? 0.84 : 1.0;
        const ascBoost = this.ascendantTimer > 0 ? 1.32 : 1.0;
        const dashBoost = this.dashTimer > 0 ? 2.3 : 1.0;
        const hasteBoost = 1 + this.skills.haste * 0.08;
        const petSpeedBoost = 1 + getPetStatusModifiers(this.pet).speedBonusPct / 100;
        const formationSpeedBoost =
          1 + (this.warfare.cohortDeployed ? SIEGE_FORMATIONS[this.warfare.formation].heroSpeedBonusPct : 0) / 100;
        const targetSpeed =
          spec.speed * popupSlow * ascBoost * dashBoost * hasteBoost * petSpeedBoost * formationSpeedBoost;

        this.pvx = THREE.MathUtils.damp(this.pvx, wx * targetSpeed, 14, dt);
        this.pvz = THREE.MathUtils.damp(this.pvz, wz * targetSpeed, 14, dt);
        this.pRotY = Math.atan2(wx, wz);
      } else {
        this.pvx = THREE.MathUtils.damp(this.pvx, 0, 14, dt);
        this.pvz = THREE.MathUtils.damp(this.pvz, 0, 14, dt);
      }

      const clamped = clampWorldPos(this.px + this.pvx * dt, this.pz + this.pvz * dt, this.inDungeon);
      this.px = clamped.x;
      this.pz = clamped.z;

      const terrainY = getTerrainHeight(this.px, this.pz);
      const isSwimming = !this.inDungeon && terrainY < WATER_LEVEL - 0.15;
      const floorY = isSwimming ? WATER_LEVEL - 0.65 : terrainY;

      if (this.onGround) {
        this.coyoteTimer = 0.1;
      } else {
        this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
      }

      if (this.jumpBufferTimer > 0 && (this.coyoteTimer > 0 || isSwimming)) {
        this.pvy = isSwimming ? 9.5 : 13.8;
        this.onGround = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.squashX = 0.85;
        this.squashY = 1.18;
        this.audio.play(isSwimming ? 'splash' : 'jump');
      }

      this.pvy -= (isSwimming ? 16 : 33) * dt;
      this.py += this.pvy * dt;
      if (this.py <= floorY) {
        if (!this.onGround && this.pvy < -6) {
          this.squashX = 1.22;
          this.squashY = 0.78;
        }
        this.py = floorY;
        this.pvy = 0;
        this.onGround = true;
      }

      // Squash & stretch recovery + distance-synced gait cycle
      const baseScale = this.ascendantTimer > 0 ? 1.32 : 1.05;
      this.squashX = THREE.MathUtils.damp(this.squashX, 1, 14, dt);
      this.squashY = THREE.MathUtils.damp(this.squashY, 1, 14, dt);
      this.playerRig.group.position.set(this.px, this.py, this.pz);
      this.playerRig.group.rotation.y = this.pRotY;
      this.playerRig.group.scale.set(baseScale * this.squashX, baseScale * this.squashY, baseScale * this.squashX);

      const horizSpd = Math.hypot(this.pvx, this.pvz);
      this.walkPhase += horizSpd * dt * 0.85;
      const swing = horizSpd > 0.6 ? Math.sin(this.walkPhase) * 0.65 : 0;
      this.playerRig.leftLeg.rotation.x = swing;
      this.playerRig.rightLeg.rotation.x = -swing;
      this.playerRig.leftArm.rotation.x = -swing * 0.8;
      this.playerRig.rightArmPivot.rotation.x =
        this.attackAnim > 0 ? -Math.sin((this.attackAnim / 0.24) * Math.PI) * 1.65 : swing * 0.8;
    }

    // Shield & Ascendant visual auras
    this.shieldMesh.visible = this.adShieldTimer > 0;
    if (this.shieldMesh.visible) this.shieldMesh.rotation.y += dt * 2.4;
    this.ascAuraMesh.visible = this.ascendantTimer > 0;
    if (this.ascAuraMesh.visible) this.ascAuraMesh.rotation.z += dt * 4.0;
    if (this.cultAuraMesh.visible) {
      this.cultAuraMesh.rotation.z -= dt * 1.6;
      const pulse = 1 + Math.sin(this.elapsedSec * 3.2) * 0.06;
      this.cultAuraMesh.scale.set(pulse, pulse, 1);
    }

    // Camera Rig (1st-Person vs 3rd-Person Orbit + Shake + Terrain Clamping)
    const shake = this.trauma * this.trauma;
    const shakeX = (Math.random() - 0.5) * shake * 0.9;
    const shakeY = (Math.random() - 0.5) * shake * 0.9;

    if (this.firstPerson) {
      this.playerRig.group.visible = false;
      this.camera.position.set(this.px + shakeX, this.py + 2.65 + shakeY, this.pz);
      const lookX = this.px - Math.sin(this.camYaw) * 12;
      const lookZ = this.pz - Math.cos(this.camYaw) * 12;
      this.camera.lookAt(lookX, this.py + 2.4 - (this.camPitch - 0.35) * 8, lookZ);
    } else {
      const dist = this.inShuttle ? this.camDist + 4.8 : this.inBuggy ? this.camDist + 3.5 : this.camDist;
      const cx = this.px + Math.sin(this.camYaw) * Math.cos(this.camPitch) * dist;
      const cz = this.pz + Math.cos(this.camYaw) * Math.cos(this.camPitch) * dist;
      const desiredY = this.py + 3.1 + Math.sin(this.camPitch) * dist;
      const minY = getTerrainHeight(cx, cz) + 1.8;
      _v3A.set(cx + shakeX, Math.max(desiredY, minY) + shakeY, cz);
      const alpha = 1 - Math.exp(-11 * dt);
      this.camera.position.lerp(_v3A, alpha);
      this.camera.lookAt(this.px, this.py + 2.2, this.pz);
    }

    // Network position broadcast (~15Hz)
    this.netSyncAccum += dt;
    if (this.netSyncAccum >= 0.066 && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.netSyncAccum = 0;
      this.ws.send(
        JSON.stringify({
          type: 'move',
          x: this.px,
          y: this.py,
          z: this.pz,
          rotY: this.pRotY,
          inBuggy: this.inBuggy,
        }),
      );
    }
  }

  private stepCastles(dt: number): void {
    if (this.inDungeon) return;
    for (const c of this.castles) {
      const playerInside = Math.hypot(this.px - c.x, this.pz - c.z) < 10.5;
      const knightsInside = this.enemies.filter(
        (e) => e.alive && e.kind === 'knight' && Math.hypot(e.x - c.x, e.z - c.z) < 15,
      ).length;

      const captureMult = this.warfare.cohortDeployed
        ? SIEGE_FORMATIONS[this.warfare.formation].captureMult
        : 1.0;
      const next = advanceCastleCapture(c.progress, c.owner, dt * captureMult, playerInside, knightsInside);
      c.progress = next.progress;
      if (next.flippedToBlue) {
        c.owner = 'blue';
        (c.crystal.material as THREE.MeshStandardMaterial).color.setHex(0x38bdf8);
        (c.crystal.material as THREE.MeshStandardMaterial).emissive.setHex(0x0284c7);
        (c.ring.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
        c.trimMat.color.setHex(0x3b82f6);
        c.trimMat.emissive.setHex(0x1d4ed8);
        this.audio.play('levelup');
        this.gainXp(140);
        this.gold += 120;
        if (c.id === 'red') this.quests.captureObsidian = true;
        this.cb.onToast(`${c.name} captured for Dawn Citadel! (+140 XP, +120 Gold)`);
        if (this.quests.defeatMalakor && this.quests.defeatVoryn && this.quests.captureObsidian) {
          this.outcome = 'victory';
          this.setPhase('gameover');
        }
      }
    }
  }

  private stepEnemies(dt: number, t: number): void {
    // Attack token pool: max 3 concurrent melee/ranged attackers so crowds stay readable and fair
    let availableTokens = 3;

    for (const e of this.enemies) {
      if (e.inDungeon !== this.inDungeon) {
        e.group.visible = false;
        continue;
      }

      if (!e.alive) {
        if (e.koTimer > 0) {
          e.koTimer = Math.max(0, e.koTimer - dt);
          const prog = 1 - e.koTimer / 0.38;
          e.group.rotation.x = prog * (Math.PI / 2);
          e.group.scale.setScalar(Math.max(0.05, (e.isBoss ? 2.05 : 1) * (1 - prog * 0.75)));
          if (e.koTimer === 0) e.group.visible = false;
        } else {
          e.respawnTimer -= dt;
          if (e.respawnTimer <= 0) {
            e.alive = true;
            e.hp = e.maxHp;
            e.x = e.homeX;
            e.z = e.homeZ;
            e.y = getTerrainHeight(e.x, e.z);
            e.group.position.set(e.x, e.y, e.z);
            e.group.rotation.x = 0;
            e.group.scale.setScalar(e.isBoss ? 2.05 : e.kind === 'knight' ? 1.12 : 1);
            e.group.visible = true;
          }
        }
        continue;
      }

      e.group.visible = true;
      e.atkCd = Math.max(0, e.atkCd - dt);

      // Brief emissive white hit flash
      if (e.hitFlash > 0) {
        e.hitFlash = Math.max(0, e.hitFlash - dt);
        for (const hm of e.hitMeshes) {
          const mat = hm.material as THREE.MeshStandardMaterial;
          if (mat.emissive) mat.emissiveIntensity = e.hitFlash > 0 ? 2.4 : 0.25;
        }
      }

      // Apply decaying knockback velocity
      e.x += e.vx * dt;
      e.z += e.vz * dt;
      e.vx *= Math.exp(-8 * dt);
      e.vz *= Math.exp(-8 * dt);

      const dx = this.px - e.x;
      const dz = this.pz - e.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      const aggro = e.isBoss ? 32 : 22;

      // Resolve active telegraphed heavy strike (Knight Cleave or Boss Shadow Nova)
      if (e.telegraphTimer > 0) {
        e.telegraphTimer -= dt;
        const pct = 1 - Math.max(0, e.telegraphTimer) / (e.isBoss ? 0.75 : 0.55);
        e.telegraphMesh.visible = true;
        e.telegraphMesh.scale.setScalar(0.35 + pct * 0.65);
        if (e.telegraphTimer <= 0) {
          e.telegraphMesh.visible = false;
          const radius = e.isBoss ? 11.5 : 4.6;
          this.spawnParticles(e.x, e.y + 1.4, e.z, e.isBoss ? 0xd946ef : 0xf43f5e, 24, 15);
          if (dist <= radius) {
            this.damagePlayer(e.isBoss ? 28 : e.damage + 6, e.isBoss ? 'SHADOW NOVA' : 'HEAVY CLEAVE');
          }
        }
        continue;
      }

      // 4 Distinct Enemy AI Movement Policies
      if (dist < aggro) {
        e.group.rotation.y = Math.atan2(dx, dz);

        if (e.kind === 'slime') {
          // Policy 1: Bouncy rhythmic hopper
          const hop = Math.abs(Math.sin(t * 5.2 + e.homeX));
          if (dist > 2.6) {
            const hopSpd = e.speed * (0.4 + hop * 0.9);
            e.x += (dx / dist) * hopSpd * dt;
            e.z += (dz / dist) * hopSpd * dt;
          }
          e.y = getTerrainHeight(e.x, e.z);
          e.group.position.set(e.x, e.y + hop * 0.95, e.z);
          if (dist <= 3.1 && e.atkCd <= 0 && availableTokens > 0) {
            availableTokens--;
            e.atkCd = 1.75;
            this.damagePlayer(e.damage);
          }
        } else if (e.kind === 'wraith') {
          // Policy 2: Mid-range kiter / orbiter firing void projectiles
          const desiredDist = 13.5;
          const radial = dist > desiredDist + 2 ? 1 : dist < desiredDist - 2 ? -0.8 : 0;
          const perpX = (-dz / dist) * e.orbitSign;
          const perpZ = (dx / dist) * e.orbitSign;
          e.x += ((dx / dist) * radial + perpX * 0.65) * e.speed * dt;
          e.z += ((dz / dist) * radial + perpZ * 0.65) * e.speed * dt;
          e.y = getTerrainHeight(e.x, e.z);
          e.group.position.set(e.x, e.y + Math.sin(t * 4 + e.homeZ) * 0.25, e.z);

          if (e.atkCd <= 0 && availableTokens > 0) {
            availableTokens--;
            e.atkCd = 2.4;
            const m = new THREE.Mesh(this.projGeo, new THREE.MeshBasicMaterial({ color: 0xc084fc }));
            m.position.set(e.x, e.y + 1.9, e.z);
            this.scene.add(m);
            this.projectiles.push({
              mesh: m,
              fromPlayer: false,
              damage: e.damage,
              vx: (dx / dist) * 20,
              vy: 0,
              vz: (dz / dist) * 20,
              life: 1.8,
              color: 0xc084fc,
              siphon: false,
            });
          }
        } else if (e.kind === 'spam') {
          // Policy 3: Erratic Pop-Up Spam Drone flanker
          const perpX = (-dz / dist) * Math.sin(t * 2.1 + e.homeX);
          const perpZ = (dx / dist) * Math.sin(t * 2.1 + e.homeX);
          if (dist > 9.5) {
            e.x += ((dx / dist) * 0.8 + perpX * 0.5) * e.speed * dt;
            e.z += ((dz / dist) * 0.8 + perpZ * 0.5) * e.speed * dt;
          }
          e.y = getTerrainHeight(e.x, e.z);
          e.group.position.set(e.x, e.y + Math.sin(t * 4.5) * 0.38, e.z);
          e.group.rotation.y += dt * 2.4;

          if (dist <= 13 && e.atkCd <= 0 && availableTokens > 0) {
            availableTokens--;
            e.atkCd = 3.6;
            this.spawnPopupAd();
            this.damagePlayer(e.damage);
          }
        } else {
          // Policy 4: Obsidian Knight & Demon Bosses (aggressive pursuit + telegraphed heavy ring!)
          const stopDist = e.isBoss ? 5.0 : 3.4;
          if (dist > stopDist) {
            e.x += (dx / dist) * e.speed * dt;
            e.z += (dz / dist) * e.speed * dt;
          }
          e.y = getTerrainHeight(e.x, e.z);
          e.group.position.set(e.x, e.y, e.z);

          if (e.rig) {
            const sw = dist > stopDist ? Math.sin(t * 9) * 0.55 : 0;
            e.rig.leftLeg.rotation.x = sw;
            e.rig.rightLeg.rotation.x = -sw;
          }

          if (e.isBoss) {
            e.aoeCd -= dt;
            if (e.aoeCd <= 0 && dist < 16) {
              e.aoeCd = 5.4;
              e.telegraphTimer = 0.75;
              this.audio.play('telegraph');
              this.pushFloatLabel(e.x, e.y + 5.2, e.z, 'SHADOW NOVA INCOMING!', '#f0abfc');
              continue;
            }
          }

          if (dist <= stopDist + 1.2 && e.atkCd <= 0 && availableTokens > 0) {
            availableTokens--;
            e.atkCd = e.isBoss ? 1.8 : 2.1;
            if (e.kind === 'knight') {
              e.telegraphTimer = 0.55;
              this.audio.play('telegraph');
            } else {
              this.damagePlayer(e.damage);
            }
          }
        }
      } else {
        // Gentle idle bob when out of aggro
        e.y = getTerrainHeight(e.x, e.z);
        e.group.position.set(e.x, e.y, e.z);
      }
    }
  }

  private damagePlayer(rawAmount: number, labelPrefix?: string): void {
    if (this.phase !== 'playing' || this.dashTimer > 0) return; // Dodge-roll i-frames!
    const formationDmgMult = this.warfare.cohortDeployed
      ? 1 - SIEGE_FORMATIONS[this.warfare.formation].heroDmgReductionPct / 100
      : 1.0;
    const dmg = Math.max(
      1,
      Math.round(rawAmount * (this.adShieldTimer > 0 ? 0.45 : 1.0) * formationDmgMult),
    );
    this.hp = Math.max(0, this.hp - dmg);
    this.trauma = Math.min(1, this.trauma + 0.25);
    this.audio.play('hit');
    this.pushFloatLabel(this.px, this.py + 3.2, this.pz, labelPrefix ? `${labelPrefix} -${dmg}` : `-${dmg}`, '#f87171');

    if (this.hp <= 0) {
      this.outcome = 'defeat';
      this.clearPopups();
      this.setPhase('gameover');
    }
  }

  private stepCompanionsAndNpcs(dt: number, t: number): void {
    // 1. L.E.O. Floating AI Companion Orb orbits player's right shoulder & auto-gathers within LoRA magnet radius
    const targetLeoX = this.px + Math.cos(t * 1.4) * 1.7;
    const targetLeoY = this.py + 2.85 + Math.sin(t * 3.0) * 0.22;
    const targetLeoZ = this.pz + Math.sin(t * 1.4) * 1.7;
    this.leoOrb.group.position.lerp(_v3B.set(targetLeoX, targetLeoY, targetLeoZ), 1 - Math.exp(-8 * dt));
    this.leoOrb.ringA.rotation.x += dt * 1.8;
    this.leoOrb.ringA.rotation.y += dt * 1.2;
    this.leoOrb.ringB.rotation.z -= dt * 2.1;

    // 2. Companion Lira follows player, heals (LoRA healing weight), & strikes enemies (LoRA aggression weight)
    const followX = this.px - Math.sin(this.pRotY) * 3.5 - Math.cos(this.pRotY) * 2.2;
    const followZ = this.pz - Math.cos(this.pRotY) * 3.5 + Math.sin(this.pRotY) * 2.2;
    const ldx = followX - this.liraX;
    const ldz = followZ - this.liraZ;
    const ldist = Math.hypot(ldx, ldz);
    if (ldist > 1.2) {
      const spd = Math.min(18, 8.5 + ldist * 0.8);
      this.liraX += (ldx / ldist) * spd * dt;
      this.liraZ += (ldz / ldist) * spd * dt;
      this.liraRig.group.rotation.y = Math.atan2(ldx, ldz);
      const sw = Math.sin(t * 10) * 0.5;
      this.liraRig.leftLeg.rotation.x = sw;
      this.liraRig.rightLeg.rotation.x = -sw;
    }
    this.liraRig.group.position.set(this.liraX, getTerrainHeight(this.liraX, this.liraZ), this.liraZ);

    this.liraHealCd = Math.max(0, this.liraHealCd - dt);
    if (this.liraHealCd <= 0 && this.hp < this.maxHp * 0.72) {
      this.liraHealCd = Math.max(3.5, 9 / this.lora.healing);
      const heal = Math.round(18 * this.lora.healing);
      this.hp = Math.min(this.maxHp, this.hp + heal);
      this.spawnParticles(this.px, this.py + 1.8, this.pz, 0x34d399, 10, 7);
      this.pushFloatLabel(this.px, this.py + 3.4, this.pz, `Lira +${heal} HP`, '#34d399');
    }

    this.liraAtkCd = Math.max(0, this.liraAtkCd - dt);
    if (this.liraAtkCd <= 0) {
      const nearest = this.enemies.find(
        (e) => e.alive && e.inDungeon === this.inDungeon && Math.hypot(e.x - this.liraX, e.z - this.liraZ) < 13,
      );
      if (nearest) {
        this.liraAtkCd = Math.max(0.9, 2.2 / this.lora.aggression);
        this.damageEnemy(nearest, Math.round(14 * this.lora.aggression), false);
      }
    }

    // 2b. 3D Pet Follower (Kibo) follows player smoothly, animates trot/tail-wag/jump/evolution aura, and updates Hunger & Happiness
    this.pet = tickPetState(this.pet, dt);
    const petMods = getPetStatusModifiers(this.pet);
    if (petMods.auraActive && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + petMods.hpRegenPerSec * dt);
    }
    const petTargetX = this.px - Math.sin(this.pRotY) * 2.5 + Math.cos(this.pRotY) * 2.1;
    const petTargetZ = this.pz - Math.cos(this.pRotY) * 2.5 - Math.sin(this.pRotY) * 2.1;
    const pdx = petTargetX - this.petX;
    const pdz = petTargetZ - this.petZ;
    const pdist = Math.hypot(pdx, pdz);

    if (pdist > 26) {
      // Snap near hero after long teleports or dungeon portal transitions
      this.petX = petTargetX;
      this.petZ = petTargetZ;
      this.spawnParticles(this.petX, getTerrainHeight(this.petX, this.petZ) + 1.0, this.petZ, 0x38bdf8, 10, 6);
    } else if (pdist > 0.72) {
      const petSpeed = Math.min(24, 7.6 + pdist * 1.35);
      this.petX += (pdx / pdist) * petSpeed * dt;
      this.petZ += (pdz / pdist) * petSpeed * dt;
      const desiredPetYaw = Math.atan2(pdx, pdz);
      let yawDiff = desiredPetYaw - this.petRotY;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      this.petRotY += yawDiff * Math.min(1, dt * 10);
      this.petWalkPhase += petSpeed * dt * 1.45;
    } else {
      const toHeroYaw = Math.atan2(this.px - this.petX, this.pz - this.petZ);
      let yawDiff = toHeroYaw - this.petRotY;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      this.petRotY += yawDiff * Math.min(1, dt * 3.5);
    }

    this.petJumpTimer = Math.max(0, this.petJumpTimer - dt);
    const jumpPhase = Math.min(1, this.petJumpTimer / 0.65);
    const jumpArc = this.petJumpTimer > 0 ? Math.max(0, Math.sin(jumpPhase * Math.PI)) * 1.1 : 0;
    const isMoving = pdist > 0.72;
    const slimeBounce =
      this.pet.species === 'emerald_slime'
        ? Math.abs(Math.sin(t * (isMoving ? 8.5 : 3.4))) * (isMoving ? 0.45 : 0.14)
        : isMoving
          ? Math.abs(Math.sin(this.petWalkPhase)) * 0.12
          : 0;
    const groundY = this.inDungeon
      ? DUNGEON_CENTER.y
      : Math.max(WATER_LEVEL + 0.04, getTerrainHeight(this.petX, this.petZ));

    this.petRig.group.position.set(this.petX, groundY, this.petZ);
    this.petRig.group.rotation.y = this.petRotY;
    this.petRig.body.position.y = jumpArc + slimeBounce;

    // Animated legs, joyful tail wag proportional to happiness, and subtle head look
    if (this.petRig.legs.length === 4) {
      const stride = isMoving ? Math.sin(this.petWalkPhase) * 0.68 : 0;
      this.petRig.legs[0].rotation.x = stride;
      this.petRig.legs[1].rotation.x = -stride;
      this.petRig.legs[2].rotation.x = -stride;
      this.petRig.legs[3].rotation.x = stride;
    } else {
      const stretch = 1 + slimeBounce * 0.32;
      this.petRig.body.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
    }
    const wagSpeed = 4.0 + (this.pet.happiness / 100) * 9.5;
    const wagAmp = 0.22 + (this.pet.happiness / 100) * 0.42;
    this.petRig.tail.rotation.y = Math.sin(t * wagSpeed) * wagAmp;
    this.petRig.head.rotation.z = Math.sin(t * 2.1) * 0.08;

    // Animate Stage 1 (Radiant) & Stage 2 (Ascendant) 3D evolution attachments
    if (this.petRig.halo) {
      this.petRig.halo.rotation.y = t * 1.4;
      this.petRig.halo.position.y =
        (this.pet.species === 'emerald_slime' ? 1.48 : 1.62) + Math.sin(t * 3.2) * 0.07;
    }
    if (this.petRig.auraRing) {
      this.petRig.auraRing.rotation.z = t * 0.85;
      const pulse = 1 + Math.sin(t * 3.4) * 0.07;
      this.petRig.auraRing.scale.setScalar(pulse);
    }
    if (this.petRig.wings) {
      const flap = Math.sin(t * (isMoving ? 10 : 4.8)) * 0.26;
      this.petRig.wings[0].rotation.z = flap;
      this.petRig.wings[1].rotation.z = -flap;
    }
    if (this.petRig.orbitCrystals) {
      this.petRig.orbitCrystals.rotation.y = -t * 2.1;
      this.petRig.orbitCrystals.position.y = 0.88 + Math.sin(t * 2.6) * 0.1;
    }

    // 3. Allied Dawn Patrols wandering overworld
    for (const a of this.allyAdventurers) {
      a.rig.group.visible = !this.inDungeon;
      if (this.inDungeon) continue;
      a.timer -= dt;
      if (a.timer <= 0) {
        a.timer = 4 + Math.random() * 4;
        a.goalX = a.tx + (Math.random() - 0.5) * 26;
        a.goalZ = a.tz + (Math.random() - 0.5) * 26;
      }
      const dx = a.goalX - a.x;
      const dz = a.goalZ - a.z;
      const d = Math.hypot(dx, dz);
      if (d > 1.2) {
        a.x += (dx / d) * 7.2 * dt;
        a.z += (dz / d) * 7.2 * dt;
        a.rig.group.position.set(a.x, Math.max(WATER_LEVEL + 0.1, getTerrainHeight(a.x, a.z)), a.z);
        a.rig.group.rotation.y = Math.atan2(dx, dz);
        const sw = Math.sin(t * 9) * 0.45;
        a.rig.leftLeg.rotation.x = sw;
        a.rig.rightLeg.rotation.x = -sw;
      }
    }

    // 4. Voxel Realms Imperial Siege Trebuchet reload/swing, flaming boulder arcs & 3D Siege Cohort formation AI
    if (this.warfare.trebuchetCooldownSec > 0) {
      this.warfare.trebuchetCooldownSec = Math.max(0, this.warfare.trebuchetCooldownSec - dt);
      if (this.warfare.trebuchetCooldownSec === 0 && this.trebuchet) {
        this.trebuchet.boulderMesh.visible = true;
      }
    }
    if (this.trebuchet) {
      this.trebuchet.group.visible = !this.inDungeon;
      if (this.trebuchetAnimTimer > 0) {
        this.trebuchetAnimTimer = Math.max(0, this.trebuchetAnimTimer - dt);
        const swingP = 1 - this.trebuchetAnimTimer / 0.65;
        this.trebuchet.armPivot.rotation.x = 0.52 - Math.sin(swingP * Math.PI) * 1.48;
      } else {
        this.trebuchet.armPivot.rotation.x = THREE.MathUtils.damp(this.trebuchet.armPivot.rotation.x, 0.52, 5, dt);
      }
    }

    for (let i = this.siegeBoulders.length - 1; i >= 0; i--) {
      const b = this.siegeBoulders[i];
      b.t += dt / b.duration;
      const p = Math.min(1, b.t);
      const bx = THREE.MathUtils.lerp(b.startX, b.targetX, p);
      const bz = THREE.MathUtils.lerp(b.startZ, b.targetZ, p);
      const by = THREE.MathUtils.lerp(b.startY, b.targetY, p) + Math.sin(p * Math.PI) * 22;
      b.mesh.position.set(bx, by, bz);
      b.mesh.rotation.x += dt * 7;
      b.mesh.rotation.z += dt * 5;
      if (p >= 1) {
        this.scene.remove(b.mesh);
        (b.mesh.material as THREE.Material).dispose();
        this.siegeBoulders.splice(i, 1);
        this.spawnParticles(b.targetX, b.targetY + 1.2, b.targetZ, 0xf97316, 30, 15);
        this.spawnParticles(b.targetX, b.targetY + 1.6, b.targetZ, 0xfef08a, 18, 12);
        this.audio.play('crit');
        const commanderBonus = this.warfare.commanderId === 'aiden' ? 1.35 : 1.0;
        const dmg = Math.round((45 + this.warfare.castleLevel * 12) * commanderBonus);
        for (const e of this.enemies) {
          if (e.alive && !e.inDungeon && Math.hypot(e.x - b.targetX, e.z - b.targetZ) < 18) {
            this.damageEnemy(e, dmg, true);
          }
        }
        const redCastle = this.castles.find((c) => c.id === 'red');
        if (redCastle && redCastle.owner !== 'blue') {
          redCastle.progress = Math.min(99, redCastle.progress + Math.round(18 * commanderBonus));
        }
        this.pushFloatLabel(b.targetX, b.targetY + 3.5, b.targetZ, `TREBUCHET HIT -${dmg}!`, '#fb923c');
      }
    }

    const fwdX = Math.sin(this.pRotY);
    const fwdZ = Math.cos(this.pRotY);
    const rightX = Math.cos(this.pRotY);
    const rightZ = -Math.sin(this.pRotY);

    for (const unit of this.siegeCohort) {
      unit.rig.group.visible = this.warfare.cohortDeployed && !this.inDungeon;
      if (!unit.rig.group.visible) continue;

      const idx = unit.slotIdx;
      let localRight = 0;
      let localFwd = -4.2;
      if (this.warfare.formation === 'SHIELD_WALL') {
        localRight = (idx - (this.siegeCohort.length - 1) / 2) * 2.1;
        localFwd = 3.2;
      } else if (this.warfare.formation === 'WEDGE_CHARGE') {
        const rank = Math.floor(idx / 2) + 1;
        const side = idx % 2 === 0 ? -1 : 1;
        localRight = side * rank * 1.9;
        localFwd = 4.8 - rank * 1.6;
      } else if (this.warfare.formation === 'LOOSE_SKIRMISH') {
        const ang = (idx / Math.max(1, this.siegeCohort.length)) * Math.PI * 2 + t * 0.2;
        localRight = Math.cos(ang) * 5.2;
        localFwd = Math.sin(ang) * 4.6;
      } else {
        // PHALANX_ADVANCE: tight disciplined double rank behind hero
        const row = Math.floor(idx / 3);
        const col = (idx % 3) - 1;
        localRight = col * 2.0;
        localFwd = -3.4 - row * 2.2;
      }

      const targetX = this.px + rightX * localRight + fwdX * localFwd;
      const targetZ = this.pz + rightZ * localRight + fwdZ * localFwd;
      const dx = targetX - unit.x;
      const dz = targetZ - unit.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 28) {
        unit.x = targetX;
        unit.z = targetZ;
      } else if (dist > 0.7) {
        const spd = Math.min(20, 7.5 + dist * 1.2);
        unit.x += (dx / dist) * spd * dt;
        unit.z += (dz / dist) * spd * dt;
        unit.rotY = Math.atan2(dx, dz);
        const swing = Math.sin(t * 10 + idx) * 0.55;
        unit.rig.leftLeg.rotation.x = swing;
        unit.rig.rightLeg.rotation.x = -swing;
      } else {
        unit.rig.leftLeg.rotation.x = 0;
        unit.rig.rightLeg.rotation.x = 0;
        unit.rotY = this.pRotY;
      }

      const gy = Math.max(WATER_LEVEL + 0.08, getTerrainHeight(unit.x, unit.z));
      unit.rig.group.position.set(unit.x, gy, unit.z);
      unit.rig.group.rotation.y = unit.rotY;

      // Active Siege Cohort combat engagement against nearby enemies
      unit.atkCd = Math.max(0, unit.atkCd - dt);
      if (unit.atkCd <= 0) {
        const range = unit.branch === 'shooter' ? 16 : unit.branch === 'bomber' ? 13 : 8;
        let nearest: EnemyEntity | null = null;
        let bestD = range;
        for (const e of this.enemies) {
          if (!e.alive || e.inDungeon) continue;
          const ed = Math.hypot(e.x - unit.x, e.z - unit.z);
          if (ed < bestD) {
            bestD = ed;
            nearest = e;
          }
        }
        if (nearest) {
          unit.atkCd = unit.branch === 'shooter' ? 1.5 : unit.branch === 'bomber' ? 2.1 : 1.7;
          unit.rig.rightArm.rotation.x = -1.1;
          const branchMult = WAR_COMMANDERS[this.warfare.commanderId].specialty === unit.branch ? 1.35 : 1.0;
          const hitDmg = Math.round((unit.branch === 'bomber' ? 18 : unit.branch === 'shooter' ? 13 : 11) * branchMult);
          this.damageEnemy(nearest, hitDmg, unit.branch === 'bomber');
          this.spawnParticles(nearest.x, nearest.y + 1.2, nearest.z, unit.branch === 'bomber' ? 0xfb923c : 0x38bdf8, 8, 7);
        }
      } else {
        unit.rig.rightArm.rotation.x = THREE.MathUtils.damp(unit.rig.rightArm.rotation.x, 0, 8, dt);
      }
    }
  }

  private stepShuttleAndVillagers(dt: number, t: number): void {
    // Autonomous GeminIsland Transit Shuttle cruising smooth waypoint loop
    if (this.islandShuttle) {
      this.islandShuttle.group.visible = !this.inDungeon;
      const from = this.shuttleRoute[this.shuttleSeg];
      const to = this.shuttleRoute[(this.shuttleSeg + 1) % this.shuttleRoute.length];
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const segLen = Math.max(1, Math.hypot(dx, dz));
      const shuttleSpeed = 9.2;
      this.shuttleT += (shuttleSpeed * dt) / segLen;
      if (this.shuttleT >= 1) {
        this.shuttleT -= 1;
        this.shuttleSeg = (this.shuttleSeg + 1) % this.shuttleRoute.length;
      }
      const a = this.shuttleRoute[this.shuttleSeg];
      const b = this.shuttleRoute[(this.shuttleSeg + 1) % this.shuttleRoute.length];
      this.shuttleX = a.x + (b.x - a.x) * this.shuttleT;
      this.shuttleZ = a.z + (b.z - a.z) * this.shuttleT;
      this.shuttleY = Math.max(WATER_LEVEL + 0.1, getTerrainHeight(this.shuttleX, this.shuttleZ));
      const desiredYaw = Math.atan2(b.x - a.x, b.z - a.z);
      let diff = desiredYaw - this.shuttleRotY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.shuttleRotY += diff * Math.min(1, dt * 5.5);

      const hFront = getTerrainHeight(
        this.shuttleX + Math.sin(this.shuttleRotY) * 2.2,
        this.shuttleZ + Math.cos(this.shuttleRotY) * 2.2,
      );
      const hBack = getTerrainHeight(
        this.shuttleX - Math.sin(this.shuttleRotY) * 2.2,
        this.shuttleZ - Math.cos(this.shuttleRotY) * 2.2,
      );
      this.islandShuttle.group.position.set(this.shuttleX, this.shuttleY, this.shuttleZ);
      this.islandShuttle.group.rotation.y = this.shuttleRotY;
      this.islandShuttle.group.rotation.x = THREE.MathUtils.damp(
        this.islandShuttle.group.rotation.x,
        Math.atan2(hBack - hFront, 4.4),
        6,
        dt,
      );
      for (const w of this.islandShuttle.wheels) {
        w.rotation.x += (shuttleSpeed / 0.56) * dt;
      }
    }

    // Articulated GeminIsland Micro-Voxel Villagers strolling gently
    for (const v of this.islandVillagers) {
      v.rig.group.visible = !this.inDungeon;
      if (this.inDungeon) continue;
      v.timer -= dt;
      if (v.timer <= 0) {
        v.timer = 3.5 + Math.random() * 4.5;
        v.goalX = v.homeX + (Math.random() - 0.5) * 10;
        v.goalZ = v.homeZ + (Math.random() - 0.5) * 10;
      }
      const dx = v.goalX - v.x;
      const dz = v.goalZ - v.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.6) {
        v.x += (dx / d) * 2.6 * dt;
        v.z += (dz / d) * 2.6 * dt;
        const vy = Math.max(WATER_LEVEL + 0.15, getTerrainHeight(v.x, v.z));
        v.rig.group.position.set(v.x, vy, v.z);
        v.rig.group.rotation.y = Math.atan2(dx, dz);
        const sw = Math.sin(t * 7.5 + v.homeX) * 0.48;
        v.rig.leftLeg.rotation.x = sw;
        v.rig.rightLeg.rotation.x = -sw;
        v.rig.leftArm.rotation.x = -sw * 0.7;
        v.rig.rightArm.rotation.x = sw * 0.7;
      } else {
        v.rig.leftLeg.rotation.x = 0;
        v.rig.rightLeg.rotation.x = 0;
        v.rig.leftArm.rotation.x = 0;
        v.rig.rightArm.rotation.x = 0;
      }
    }
  }

  private stepProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.z += p.vz * dt;
      let hit = false;

      if (p.fromPlayer) {
        for (const e of this.enemies) {
          if (!e.alive || e.inDungeon !== this.inDungeon) continue;
          if (Math.hypot(e.x - p.mesh.position.x, e.z - p.mesh.position.z) < (e.isBoss ? 3.2 : 2.1)) {
            this.damageEnemy(e, p.damage, false, p.siphon);
            hit = true;
            break;
          }
        }
      } else if (Math.hypot(this.px - p.mesh.position.x, this.pz - p.mesh.position.z) < 1.6) {
        this.damagePlayer(p.damage);
        hit = true;
      }

      if (hit || p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private stepGatherablesAndWeather(dt: number, t: number): void {
    for (const g of this.gatherables) {
      if (g.collected) {
        g.respawnTimer -= dt;
        if (g.respawnTimer <= 0) {
          g.collected = false;
          g.mesh.visible = true;
        }
        continue;
      }
      g.mesh.visible = !this.inDungeon;
      if (this.inDungeon) continue;
      if (g.kind === 'crystals') {
        g.mesh.rotation.y += dt * 1.8;
      }
      // L.E.O. Auto-Gather Magnetism radius controlled by LoRAFlow Bio-Lab slider
      if (Math.hypot(this.px - g.x, this.pz - g.z) < Math.max(2.6, this.lora.magnet * 0.48)) {
        this.collectGatherable(g);
      }
    }

    // Volumetric Weather Fall
    if (this.weatherPoints.visible) {
      this.weatherPoints.position.set(this.px, this.py, this.pz);
      const pos = this.weatherPoints.geometry.attributes.position as THREE.BufferAttribute;
      const wMode = WEATHERS[this.weatherIdx];
      const fallSpd = wMode === 'Snow' ? 6 : wMode === 'Ashstorm' ? 9 : 26;
      for (let i = 0; i < pos.count; i++) {
        let wy = pos.getY(i) - fallSpd * dt;
        if (wy < -4) wy = 34;
        pos.setY(i, wy);
      }
      pos.needsUpdate = true;
      if (wMode === 'Thunderstorm' && Math.sin(t * 2.3) > 0.992) {
        this.sunLight.intensity = 2.6;
      }
    }
  }

  private stepRemotePlayers(dt: number): void {
    const a = 1 - Math.exp(-10 * dt);
    for (const entry of this.remotePlayers.values()) {
      entry.rig.group.position.lerp(_v3A.set(entry.targetX, entry.targetY, entry.targetZ), a);
      entry.rig.group.rotation.y = entry.rotY;
    }
  }

  private updateParticles(dt: number): void {
    let anyChanged = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyChanged = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummy.position.set(0, -100, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.particleInstanced.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.vy -= 18 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const s = Math.max(0.01, (p.life / p.maxLife) * 1.15);
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.setScalar(s);
      _dummy.rotation.set(p.life * 4, p.life * 3, 0);
      _dummy.updateMatrix();
      this.particleInstanced.setMatrixAt(i, _dummy.matrix);
    }
    if (anyChanged) this.particleInstanced.instanceMatrix.needsUpdate = true;
  }

  private renderFrame(): void {
    const w = this.mount.clientWidth || window.innerWidth;
    const h = this.mount.clientHeight || window.innerHeight;

    if (this.vrMode && this.phase === 'playing') {
      // True Stereoscopic VR Split-Screen Dual Viewport Render (OmniStream XR)
      const halfW = Math.floor(w / 2);
      this.renderer.setScissorTest(true);
      const rightVec = _v3A.set(1, 0, 0).applyQuaternion(this.camera.quaternion).multiplyScalar(0.26);

      this.vrCamera.aspect = halfW / h;
      this.vrCamera.updateProjectionMatrix();

      // Left Eye
      this.vrCamera.position.copy(this.camera.position).sub(rightVec);
      this.vrCamera.quaternion.copy(this.camera.quaternion);
      this.renderer.setViewport(0, 0, halfW, h);
      this.renderer.setScissor(0, 0, halfW, h);
      this.renderer.render(this.scene, this.vrCamera);

      // Right Eye
      this.vrCamera.position.copy(this.camera.position).add(rightVec);
      this.renderer.setViewport(halfW, 0, w - halfW, h);
      this.renderer.setScissor(halfW, 0, w - halfW, h);
      this.renderer.render(this.scene, this.vrCamera);

      this.renderer.setScissorTest(false);
    } else {
      this.renderer.setViewport(0, 0, w, h);
      this.renderer.render(this.scene, this.camera);
    }
  }

  private computeInteractPrompt(): string | null {
    if (this.inShuttle) return '[E] Alight from GeminIsland Transit Shuttle';
    if (this.inBuggy) return '[E] Exit Island Buggy';
    if (!this.inDungeon && Math.hypot(this.px - this.shuttleX, this.pz - this.shuttleZ) < 6.8) {
      return '[E] Board GeminIsland Transit Shuttle';
    }
    if (!this.inDungeon && Math.hypot(this.px - this.buggyX, this.pz - this.buggyZ) < 6.0) {
      return '[E] Drive Island Buggy';
    }
    if (!this.inDungeon && Math.hypot(this.px - LANDMARKS.dungeon.x, this.pz - LANDMARKS.dungeon.z) < 7.5) {
      return '[E] Enter Sunken Ruin Dungeon (Voryn)';
    }
    if (this.inDungeon && Math.hypot(this.px - DUNGEON_CENTER.x, this.pz - (DUNGEON_CENTER.z + 18)) < 6.5) {
      return '[E] Exit Dungeon to Overworld';
    }
    for (const npc of this.loreNpcs) {
      if (Math.hypot(this.px - npc.x, this.pz - npc.z) < 5.5) return `[E] Speak with ${npc.name}`;
    }
    for (const v of this.islandVillagers) {
      if (!this.inDungeon && Math.hypot(this.px - v.x, this.pz - v.z) < 4.8) return `[E] Chat with ${v.name}`;
    }
    if (!this.inDungeon && Math.hypot(this.px - this.trebuchetPos.x, this.pz - this.trebuchetPos.z) < 7.2) {
      return this.warfare.trebuchetCooldownSec > 0.2
        ? `Imperial Trebuchet reloading (${Math.ceil(this.warfare.trebuchetCooldownSec)}s)...`
        : '[E] Fire Imperial Siege Trebuchet at Obsidian Citadel';
    }
    if (!this.inDungeon && Math.hypot(this.px - LANDMARKS.arcade.x, this.pz - LANDMARKS.arcade.z) < 9.5) {
      return '[E] Play GeminIsland Arcade (Tic-Tac-Toe / Simon / Lights Out)';
    }
    if (Math.hypot(this.px - LANDMARKS.cinema.x, this.pz - LANDMARKS.cinema.z) < 12) {
      return '[E] Open OmniStream XR Cinema Controls';
    }
    if (Math.hypot(this.px - LANDMARKS.biolab.x, this.pz - LANDMARKS.biolab.z) < 11) {
      return '[E] Open LoRAFlow Bio-Lab';
    }
    for (const cf of this.campfires) {
      if (Math.hypot(this.px - cf.x, this.pz - cf.z) < 6.0) return '[F] Rest at Campfire (Full Heal)';
    }
    if (!this.inDungeon && Math.hypot(this.px - LANDMARKS.sea.x, this.pz - LANDMARKS.sea.z) < 52) {
      return this.isFishing ? 'Fishing in Ashen Sea...' : '[F] Cast Fishing Line';
    }
    return null;
  }

  private emitHudSnapshot(): void {
    let captureBanner: string | null = null;
    if (!this.inDungeon) {
      for (const c of this.castles) {
        if (Math.hypot(this.px - c.x, this.pz - c.z) < 10.5) {
          captureBanner =
            c.owner === 'blue'
              ? `${c.name} Secured — 100% Dawn Control`
              : `Capturing ${c.name}: ${Math.floor(c.progress)}%`;
        }
      }
    }

    let bossHud: HudSnapshot['bossHud'] = null;
    for (const e of this.enemies) {
      if (e.isBoss && e.alive && e.inDungeon === this.inDungeon && Math.hypot(e.x - this.px, e.z - this.pz) < 46) {
        bossHud = { name: e.name, hp: Math.max(0, Math.round(e.hp)), maxHp: e.maxHp };
        break;
      }
    }

    const blips: MinimapBlip[] = [];
    for (const c of this.castles) {
      blips.push({ x: c.x, z: c.z, kind: c.owner === 'blue' ? 'castleBlue' : 'castleRed' });
    }
    blips.push({ x: this.buggyX, z: this.buggyZ, kind: 'buggy' });
    blips.push({ x: LANDMARKS.dungeon.x, z: LANDMARKS.dungeon.z, kind: 'portal' });
    for (const a of this.allyAdventurers) blips.push({ x: a.x, z: a.z, kind: 'ally' });
    for (const e of this.enemies) {
      if (!e.alive || e.inDungeon) continue;
      blips.push({ x: e.x, z: e.z, kind: e.isBoss ? 'boss' : e.kind === 'spam' ? 'spam' : 'enemy' });
    }

    const s = Math.sin(this.worldTime);
    const timeOfDayLabel: HudSnapshot['timeOfDayLabel'] =
      s > 0.3 ? 'DAY' : s > 0 ? (Math.cos(this.worldTime) > 0 ? 'DAWN' : 'DUSK') : 'NIGHT';

    const blueCastles = this.castles.filter((c) => c.owner === 'blue').length;
    const lineage = LINEAGES[this.lineageId];
    const shard = REALM_SHARDS.find((sh) => sh.id === this.shardId) ?? REALM_SHARDS[0];
    const cult = CULTIVATION_REALMS[Math.min(CULTIVATION_REALMS.length - 1, Math.max(0, this.cultivationTier))];
    const powerStats = computeHeroPowerStats({
      classKey: this.classKey,
      lineageId: this.lineageId,
      level: this.level,
      cultivationTier: this.cultivationTier,
      skills: this.skills,
      weaponTier: this.inventory.weaponTier,
      infinityTier: this.infinityTier,
    });

    this.cb.onHudUpdate({
      phase: this.phase,
      outcome: this.outcome,
      playerName: this.playerName,
      classKey: this.classKey,
      className: HERO_CLASSES[this.classKey].name,
      lineageId: this.lineageId,
      lineageName: lineage.name,
      shardId: shard.id,
      shardName: shard.name,
      guildId: this.guildId,
      guildTag: this.guildTag,
      cultivationTier: this.cultivationTier,
      cultivationName: cult.name,
      spiritStones: this.spiritStones,
      combatPower: powerStats.combatPower,
      level: this.level,
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      mp: Math.round(this.mp),
      maxMp: this.maxMp,
      xp: this.xp,
      xpNext: this.xpNext,
      gold: this.gold,
      kills: this.kills,
      adsBlocked: this.adsBlocked,
      infinityTier: this.infinityTier,
      skillPoints: this.skillPoints,
      skills: { ...this.skills },
      inventory: { ...this.inventory },
      lora: { ...this.lora },
      quests: { ...this.quests },
      cooldowns: [...this.cooldowns] as [number, number, number, number, number],
      adShieldActive: this.adShieldTimer > 0,
      ascendantActive: this.ascendantTimer > 0,
      bioSerumActive: this.bioSerumTimer > 0,
      inBuggy: this.inBuggy,
      inShuttle: this.inShuttle,
      arcadeWins: this.arcadeWins,
      inDungeon: this.inDungeon,
      isSwimming: !this.inDungeon && getTerrainHeight(this.px, this.pz) < WATER_LEVEL - 0.15,
      isFishing: this.isFishing,
      firstPerson: this.firstPerson,
      vrMode: this.vrMode,
      muted: this.audio.isMuted(),
      biome: getBiome(this.px, this.pz),
      weather: WEATHERS[this.weatherIdx],
      timeOfDayLabel,
      blueCastles,
      redCastles: this.castles.length - blueCastles,
      captureBanner,
      interactPrompt: this.computeInteractPrompt(),
      bossHud,
      onlineCount: this.onlineCount,
      wsConnected: this.wsConnected,
      entityCount: this.enemies.length + this.allyAdventurers.length + this.remotePlayers.size + 3,
      playerPos: { x: this.px, z: this.pz, rotY: this.pRotY },
      minimapBlips: blips,
      elapsedSec: Math.floor(this.elapsedSec),
      pitchSemitones: this.audio.getPitchSemitones(),
      cinemaChannel: this.cinemaChannel,
      pet: {
        ...this.pet,
        hunger: Math.round(this.pet.hunger),
        happiness: Math.round(this.pet.happiness),
      },
      warfare: {
        ...this.warfare,
        troops: { ...this.warfare.troops },
        sectors: { ...this.warfare.sectors },
        trebuchetCooldownSec: Math.ceil(this.warfare.trebuchetCooldownSec),
      },
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver?.disconnect();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.ws?.close();
    this.localVideoEl?.pause();
    this.localVideoTex?.dispose();
    this.renderer.dispose();
  }
}
