import { useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { SuiteModals } from './components/SuiteModals';
import { TitleScreen } from './components/TitleScreen';
import { ShadowVoxelEngine } from './game/engine';
import {
  CULTIVATION_REALMS,
  HERO_CLASSES,
  INITIAL_INVENTORY,
  INITIAL_LORA,
  INITIAL_QUESTS,
  INITIAL_SKILLS,
  LINEAGES,
  REALM_SHARDS,
} from './game/rules';
import type {
  ChatMessage,
  FloatingLabel,
  HeroClassKey,
  HudSnapshot,
  LineageId,
  PopupAdItem,
  SuiteModalKey,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  outcome: null,
  playerName: 'GitincloHero',
  classKey: 'shadowblade',
  className: HERO_CLASSES.shadowblade.name,
  lineageId: 'human',
  lineageName: LINEAGES.human.name,
  shardId: REALM_SHARDS[0].id,
  shardName: REALM_SHARDS[0].name,
  guildId: null,
  guildTag: null,
  cultivationTier: 0,
  cultivationName: CULTIVATION_REALMS[0].name,
  spiritStones: 35,
  combatPower: 1120,
  level: 1,
  hp: HERO_CLASSES.shadowblade.hp,
  maxHp: HERO_CLASSES.shadowblade.hp,
  mp: HERO_CLASSES.shadowblade.mp,
  maxMp: HERO_CLASSES.shadowblade.mp,
  xp: 0,
  xpNext: 100,
  gold: 60,
  kills: 0,
  adsBlocked: 0,
  infinityTier: 1,
  skillPoints: 1,
  skills: { ...INITIAL_SKILLS },
  inventory: { ...INITIAL_INVENTORY },
  lora: { ...INITIAL_LORA },
  quests: { ...INITIAL_QUESTS },
  cooldowns: [0, 0, 0, 0, 0],
  adShieldActive: false,
  ascendantActive: false,
  bioSerumActive: false,
  inBuggy: false,
  inDungeon: false,
  isSwimming: false,
  isFishing: false,
  firstPerson: false,
  vrMode: false,
  muted: false,
  biome: 'Whispering Woods',
  weather: 'Clear',
  timeOfDayLabel: 'DAY',
  blueCastles: 1,
  redCastles: 1,
  captureBanner: null,
  interactPrompt: null,
  bossHud: null,
  onlineCount: 1,
  wsConnected: false,
  entityCount: 20,
  playerPos: { x: 0, z: 12, rotY: Math.PI },
  minimapBlips: [],
  elapsedSec: 0,
  pitchSemitones: 0,
  cinemaChannel: 'cyber',
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ShadowVoxelEngine | null>(null);

  const [playerName, setPlayerName] = useState('GitincloHero');
  const [selectedClass, setSelectedClass] = useState<HeroClassKey>('shadowblade');
  const [selectedLineage, setSelectedLineage] = useState<LineageId>('human');
  const [selectedShard, setSelectedShard] = useState<string>(REALM_SHARDS[0].id);
  const playerNameRef = useRef('GitincloHero');
  const selectedClassRef = useRef<HeroClassKey>('shadowblade');
  const selectedLineageRef = useRef<LineageId>('human');
  const selectedShardRef = useRef<string>(REALM_SHARDS[0].id);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [activeModal, setActiveModal] = useState<SuiteModalKey>(null);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [popupAds, setPopupAds] = useState<PopupAdItem[]>([]);
  const [floatingLabels, setFloatingLabels] = useState<FloatingLabel[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Mount Three.js engine ONCE inside isolated ref container (never torn down by React HUD updates)
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new ShadowVoxelEngine(mount, {
      onHudUpdate: (snap) => setHud(snap),
      onToast: (msg) => {
        setToast(msg);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(null), 2800);
      },
      onChat: (msg) => {
        setChatLog((prev) => [...prev.slice(-39), msg]);
      },
      onPopupAd: (ad) => {
        setPopupAds((prev) => (prev.length >= 3 ? prev : [...prev, ad]));
      },
      onClearPopups: () => {
        setPopupAds([]);
      },
      onFloatLabel: (lbl) => {
        setFloatingLabels((prev) => [...prev.slice(-14), lbl]);
        window.setTimeout(() => {
          setFloatingLabels((prev) => prev.filter((item) => item.id !== lbl.id));
        }, 760);
      },
      onOpenModal: (modal) => setActiveModal(modal),
    });

    engineRef.current = engine;

    // Support ?autostart=1 to jump straight into active gameplay
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startGame('GitincloHero', 'shadowblade');
    }

    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Global keyboard shortcuts for Suite Modals & Pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
        if (e.code === 'Escape') {
          (el as HTMLElement).blur();
        }
        return;
      }

      if (hud.phase === 'paused') {
        if (e.code === 'Escape') {
          e.preventDefault();
          engineRef.current?.setPhase('playing');
        }
        return;
      }

      if (hud.phase !== 'playing') return;

      if (e.code === 'Escape') {
        e.preventDefault();
        if (activeModal) {
          setActiveModal(null);
        } else {
          engineRef.current?.setPhase('paused');
        }
        return;
      }

      const keyMap: Record<string, SuiteModalKey> = {
        KeyC: 'craft',
        KeyK: 'skills',
        KeyU: 'guilds',
        KeyL: 'leo',
        KeyM: 'meme',
        KeyO: 'omni',
        KeyP: 'vibe',
        KeyB: 'lora',
        KeyG: 'gm',
      };
      const target = keyMap[e.code];
      if (target) {
        e.preventDefault();
        setActiveModal((prev) => (prev === target ? null : target));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.phase, activeModal]);

  const handleNameChange = (name: string) => {
    playerNameRef.current = name;
    setPlayerName(name);
  };

  const handleSelectClass = (cls: HeroClassKey) => {
    selectedClassRef.current = cls;
    setSelectedClass(cls);
  };

  const handleSelectLineage = (lin: LineageId) => {
    selectedLineageRef.current = lin;
    setSelectedLineage(lin);
  };

  const handleSelectShard = (shardId: string) => {
    selectedShardRef.current = shardId;
    setSelectedShard(shardId);
  };

  const handleStart = () => {
    setActiveModal(null);
    engineRef.current?.startGame(
      playerNameRef.current,
      selectedClassRef.current,
      selectedLineageRef.current,
      selectedShardRef.current,
    );
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070a12]">
      {/* Isolated sibling mount for Three.js WebGLRenderer */}
      <div ref={canvasMountRef} className="fixed inset-0 w-full h-full" />

      {hud.phase === 'title' && (
        <TitleScreen
          playerName={playerName}
          selectedClass={selectedClass}
          selectedLineage={selectedLineage}
          selectedShard={selectedShard}
          onNameChange={handleNameChange}
          onSelectClass={handleSelectClass}
          onSelectLineage={handleSelectLineage}
          onSelectShard={handleSelectShard}
          onStart={handleStart}
        />
      )}

      {hud.phase !== 'title' && (
        <GameHud
          hud={hud}
          chatLog={chatLog}
          popupAds={popupAds}
          floatingLabels={floatingLabels}
          toast={toast}
          onSkill={(slot) => engineRef.current?.triggerSkill(slot)}
          onOpenModal={(m) => setActiveModal((prev) => (prev === m ? null : m))}
          onToggleCamera={() => engineRef.current?.toggleCameraMode()}
          onToggleVR={() => engineRef.current?.toggleVRMode()}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onPause={() => {
            setActiveModal(null);
            engineRef.current?.setPhase('paused');
          }}
          onSendChat={(text) => engineRef.current?.sendChat(text)}
          onBlockAd={(id) => {
            setPopupAds((prev) => prev.filter((a) => a.id !== id));
            engineRef.current?.blockPopupAd(id);
          }}
        />
      )}

      <SuiteModals
        engine={engineRef.current}
        hud={hud}
        activeModal={activeModal}
        onCloseModal={() => setActiveModal(null)}
        onResume={() => engineRef.current?.setPhase('playing')}
        onRestart={() => {
          setActiveModal(null);
          engineRef.current?.restartRun();
        }}
        onReturnTitle={() => {
          setActiveModal(null);
          engineRef.current?.setPhase('title');
        }}
      />
    </div>
  );
}
