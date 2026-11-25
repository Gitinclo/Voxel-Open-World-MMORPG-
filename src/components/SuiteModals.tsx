import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ShadowVoxelEngine } from '../game/engine';
import {
  ALL_TERRITORY_SECTORS,
  CULTIVATION_REALMS,
  MAX_IMPERIAL_CASTLE_LEVEL,
  PET_EVOLUTION_STAGES,
  PET_SPECIES_SPECS,
  REALM_SHARDS,
  SIEGE_FORMATIONS,
  TROOP_SPECS,
  WAR_COMMANDERS,
  checkTicTacToeWinner,
  compute2060BigIntOffsetNs,
  computeWarfarePower,
  createLightsOutPuzzle,
  getImperialCastleSpec,
  getPetFormTitle,
  getPetStatusModifiers,
  getTotalTroopCount,
  isLightsOutSolved,
  pickTicTacToeAiMove,
  resolveOfflineLeoReply,
  toggleLightsOutGrid,
  type TicTacToeCell,
} from '../game/rules';
import type {
  CastleSiegeState,
  GuildRecord,
  HudSnapshot,
  LandmarkKey,
  LeaderboardEntry,
  PetSpeciesKey,
  SiegeFormationType,
  SuiteModalKey,
  TroopBranch,
  WarCommanderId,
} from '../game/types';

interface SuiteModalsProps {
  engine: ShadowVoxelEngine | null;
  hud: HudSnapshot;
  activeModal: SuiteModalKey;
  onCloseModal: () => void;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

const AI_MEME_CAPTIONS: Array<[string, string]> = [
  ['20 GITHUB REPOS COMBINED', 'INTO ONE 3D OPEN-WORLD MMORPG'],
  ['ENTERS SHADOW RIFT AT LV 1', 'MALAKOR: ALLOW ME TO INTRODUCE MYSELF'],
  ['POP-UP SPAM DRONE APPEARS', 'AD-BLOCKER SHIELD: NOT TODAY'],
  ['CAPTURED OBSIDIAN CITADEL SOLO', 'LOOK AT ME, I AM THE LORD NOW'],
  ['C++ + TYPESCRIPT + KOTLIN', 'THE INFINITY CORE STACK'],
];

const BARD_NOTES: Array<{ label: string; hz: number }> = [
  { label: 'C4', hz: 261.63 },
  { label: 'D4', hz: 293.66 },
  { label: 'E4', hz: 329.63 },
  { label: 'G4', hz: 392.0 },
  { label: 'A4', hz: 440.0 },
  { label: 'C5', hz: 523.25 },
  { label: 'E5', hz: 659.25 },
];

export const SuiteModals: React.FC<SuiteModalsProps> = ({
  engine,
  hud,
  activeModal,
  onCloseModal,
  onResume,
  onRestart,
  onReturnTitle,
}) => {
  // MemeForge Studio State (Undo/Redo history + Captions + Filter)
  const memeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vizCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [memeTop, setMemeTop] = useState('20 GITHUB REPOS COMBINED');
  const [memeBottom, setMemeBottom] = useState('INTO ONE 3D MMORPG');
  const [memeFilter, setMemeFilter] = useState<'none' | 'sora' | 'shadow' | 'crt'>('none');
  const [memeHistory, setMemeHistory] = useState<Array<{ top: string; bottom: string }>>([
    { top: '20 GITHUB REPOS COMBINED', bottom: 'INTO ONE 3D MMORPG' },
  ]);
  const [memeHistIdx, setMemeHistIdx] = useState(0);
  const [memeSnapImg, setMemeSnapImg] = useState<HTMLImageElement | null>(null);
  const [memeStatus, setMemeStatus] = useState('Snap a live 3D frame and project it onto all Castle Billboards.');

  // L.E.O. Neural Companion & 3D Pet Follower State
  const [leoInput, setLeoInput] = useState('');
  const [leoBusy, setLeoBusy] = useState(false);
  const [petFeedback, setPetFeedback] = useState<string | null>(null);
  const [warfareFeedback, setWarfareFeedback] = useState<string | null>(null);
  const [leoMessages, setLeoMessages] = useState<Array<{ sender: string; text: string }>>([
    {
      sender: 'L.E.O.',
      text: 'Tri-Core Neural Companion online. Ask me for boss locations, dungeon portals, crafting tips, or click a quick command below.',
    },
  ]);

  // 2060 BigInt Epoch Clock for GM Command Desk
  const [epochClock, setEpochClock] = useState(() => compute2060BigIntOffsetNs());

  // Open-World-MMORPG- Guilds, Cultivation & Leaderboard State
  const [guildTab, setGuildTab] = useState<'cultivation' | 'guilds' | 'leaderboard'>('cultivation');
  const [guilds, setGuilds] = useState<GuildRecord[]>([]);
  const [siege, setSiege] = useState<CastleSiegeState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildTag, setNewGuildTag] = useState('');
  const [guildStatus, setGuildStatus] = useState<string | null>(null);

  // GeminIsland Interactive Arcade State (Tic-Tac-Toe, Simon Synth, Lights Out)
  const [arcadeTab, setArcadeTab] = useState<'ttt' | 'simon' | 'lights'>('ttt');
  const [tttBoard, setTttBoard] = useState<TicTacToeCell[]>(() => Array<TicTacToeCell>(9).fill(null));
  const [tttStatus, setTttStatus] = useState('Your turn (X) — beat the Island AI for +120 Gold & +15 Spirit Stones!');
  const [lightsSeed, setLightsSeed] = useState(0);
  const [lightsGrid, setLightsGrid] = useState<boolean[]>(() => createLightsOutPuzzle(0));
  const [lightsMoves, setLightsMoves] = useState(0);
  const [lightsSolved, setLightsSolved] = useState(false);
  const [simonSeq, setSimonSeq] = useState<number[]>([]);
  const [simonInputIdx, setSimonInputIdx] = useState(0);
  const [simonLitPad, setSimonLitPad] = useState<number | null>(null);
  const [simonPlaying, setSimonPlaying] = useState(false);
  const [simonStatus, setSimonStatus] = useState('Press Start Sequence — repeat 3 musical rounds to win!');

  const SIMON_PADS = [
    { id: 0, label: 'Aqua C4', hz: 261.63, activeClass: 'bg-cyan-300 border-white text-slate-950', idleClass: 'bg-cyan-900/70 border-cyan-500/60 text-cyan-200 hover:bg-cyan-800/80' },
    { id: 1, label: 'Emerald E4', hz: 329.63, activeClass: 'bg-emerald-300 border-white text-slate-950', idleClass: 'bg-emerald-900/70 border-emerald-500/60 text-emerald-200 hover:bg-emerald-800/80' },
    { id: 2, label: 'Sunburst G4', hz: 392.0, activeClass: 'bg-amber-300 border-white text-slate-950', idleClass: 'bg-amber-900/70 border-amber-500/60 text-amber-200 hover:bg-amber-800/80' },
    { id: 3, label: 'Lagoon C5', hz: 523.25, activeClass: 'bg-fuchsia-300 border-white text-slate-950', idleClass: 'bg-fuchsia-900/70 border-fuchsia-500/60 text-fuchsia-200 hover:bg-fuchsia-800/80' },
  ] as const;

  const playSimonSequence = (seq: number[]) => {
    setSimonPlaying(true);
    setSimonStatus(`Watch Round ${seq.length} (${seq.length} notes)...`);
    seq.forEach((padId, idx) => {
      window.setTimeout(() => {
        setSimonLitPad(padId);
        engine?.playBardNote(SIMON_PADS[padId].hz);
        window.setTimeout(() => setSimonLitPad(null), 280);
        if (idx === seq.length - 1) {
          window.setTimeout(() => {
            setSimonPlaying(false);
            setSimonInputIdx(0);
            setSimonStatus(`Your turn! Repeat ${seq.length} notes.`);
          }, 340);
        }
      }, 480 * idx + 220);
    });
  };

  const startSimonRound = (nextSeq?: number[]) => {
    const firstPad = Math.floor(Math.random() * 4);
    const seq = nextSeq ?? [firstPad];
    setSimonSeq(seq);
    setSimonInputIdx(0);
    playSimonSequence(seq);
  };

  const handleSimonPadClick = (padId: number) => {
    if (simonPlaying || simonSeq.length === 0) return;
    setSimonLitPad(padId);
    engine?.playBardNote(SIMON_PADS[padId].hz);
    window.setTimeout(() => setSimonLitPad(null), 180);

    if (simonSeq[simonInputIdx] !== padId) {
      setSimonStatus('Missed note! Press Start Sequence to try again.');
      setSimonSeq([]);
      setSimonInputIdx(0);
      return;
    }
    const nextIdx = simonInputIdx + 1;
    if (nextIdx >= simonSeq.length) {
      if (simonSeq.length >= 3) {
        setSimonStatus('Cleared Round 3! Victory rewards granted!');
        engine?.rewardArcadeWin('Simon Synth', 140, 45, 18);
        setSimonSeq([]);
        setSimonInputIdx(0);
      } else {
        const extended = [...simonSeq, Math.floor(Math.random() * 4)];
        setSimonStatus(`Round ${simonSeq.length} cleared! Next round starting...`);
        window.setTimeout(() => startSimonRound(extended), 450);
      }
    } else {
      setSimonInputIdx(nextIdx);
    }
  };

  const handleTttClick = (idx: number) => {
    if (tttBoard[idx] !== null || checkTicTacToeWinner(tttBoard) !== null) return;
    const next = [...tttBoard];
    next[idx] = 'X';
    engine?.playBardNote(392.0);
    const afterPlayer = checkTicTacToeWinner(next);
    if (afterPlayer === 'X') {
      setTttBoard(next);
      setTttStatus('You defeated the GeminIsland AI! (+120 Gold, +40 XP, +15 Spirit Stones)');
      engine?.rewardArcadeWin('Voxel Tic-Tac-Toe', 120, 40, 15);
      return;
    }
    if (afterPlayer === 'draw') {
      setTttBoard(next);
      setTttStatus('Stalemate draw! Reset to play again.');
      return;
    }
    const aiIdx = pickTicTacToeAiMove(next);
    if (aiIdx !== -1) {
      next[aiIdx] = 'O';
    }
    setTttBoard(next);
    const afterAi = checkTicTacToeWinner(next);
    if (afterAi === 'O') {
      setTttStatus('Island AI claimed the grid! Hit New Match to challenge again.');
    } else if (afterAi === 'draw') {
      setTttStatus('Stalemate draw! Reset to play again.');
    } else {
      setTttStatus('Your turn (X)');
    }
  };

  const handleLightsToggle = (idx: number) => {
    if (lightsSolved) return;
    const next = toggleLightsOutGrid(lightsGrid, idx);
    setLightsGrid(next);
    setLightsMoves((m) => m + 1);
    engine?.playBardNote(329.63 + (idx % 3) * 55);
    if (isLightsOutSolved(next)) {
      setLightsSolved(true);
      engine?.rewardArcadeWin('Lights Out', 150, 50, 20);
    }
  };

  const fetchRealmSocial = useCallback(async () => {
    try {
      const [gRes, lRes] = await Promise.all([
        fetch(`/api/guilds?shardId=${encodeURIComponent(hud.shardId)}`),
        fetch('/api/leaderboard/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: hud.playerName,
            className: hud.className,
            lineageName: hud.lineageName,
            guildTag: hud.guildTag,
            level: hud.level,
            cultivationTier: hud.cultivationTier,
            cultivationName: hud.cultivationName,
            kills: hud.kills,
            combatPower: hud.combatPower,
          }),
        }),
      ]);
      if (gRes.ok) {
        const gData = await gRes.json();
        setGuilds(Array.isArray(gData.guilds) ? gData.guilds : []);
        if (gData.siege) setSiege(gData.siege);
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        setLeaderboard(Array.isArray(lData.leaderboard) ? lData.leaderboard : []);
      }
    } catch {
      // Offline graceful fallback
    }
  }, [
    hud.shardId,
    hud.playerName,
    hud.className,
    hud.lineageName,
    hud.guildTag,
    hud.level,
    hud.cultivationTier,
    hud.cultivationName,
    hud.kills,
    hud.combatPower,
  ]);

  useEffect(() => {
    if (activeModal === 'guilds') {
      void fetchRealmSocial();
    }
  }, [activeModal, fetchRealmSocial]);

  const handleJoinGuild = async (guildId: string) => {
    try {
      const res = await fetch(`/api/guilds/${encodeURIComponent(guildId)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberName: hud.playerName }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.guild) {
        engine?.setGuildMembership(data.guild.id, data.guild.tag);
        setGuildStatus(`Sworn allegiance to [${data.guild.tag}] ${data.guild.name}!`);
      }
      if (Array.isArray(data.guilds)) setGuilds(data.guilds);
    } catch {
      setGuildStatus('Could not reach guild server.');
    }
  };

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuildName.trim() || !newGuildTag.trim()) return;
    try {
      const res = await fetch('/api/guilds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGuildName.trim(),
          tag: newGuildTag.trim(),
          founderName: hud.playerName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGuildStatus(data.error || 'Could not found guild.');
        return;
      }
      setNewGuildName('');
      setNewGuildTag('');
      if (data.guild) {
        engine?.setGuildMembership(data.guild.id, data.guild.tag);
        setGuildStatus(`Founded [${data.guild.tag}] ${data.guild.name}!`);
      }
      if (Array.isArray(data.guilds)) setGuilds(data.guilds);
    } catch {
      setGuildStatus('Could not reach guild server.');
    }
  };

  const handleLaunchSiegeRally = async () => {
    try {
      const res = await fetch('/api/siege/rally', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shardId: hud.shardId,
          guildId: hud.guildId,
          combatPower: hud.combatPower,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.siege) setSiege(data.siege);
      setGuildStatus(
        data.captured
          ? `FORTRESS CAPTURED! ${data.siege.controllingGuildName} now rules ${data.siege.fortressName}!`
          : `Siege Rally struck the keep gate for ${data.damageDealt} siege damage!`,
      );
    } catch {
      setGuildStatus('Siege rally server unreachable.');
    }
  };

  useEffect(() => {
    if (activeModal !== 'gm') return;
    const id = window.setInterval(() => setEpochClock(compute2060BigIntOffsetNs()), 250);
    return () => window.clearInterval(id);
  }, [activeModal]);

  // Render MemeForge Preview Canvas
  const drawMemePreview = useCallback(() => {
    const cvs = memeCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 320);

    if (memeSnapImg) {
      ctx.drawImage(memeSnapImg, 0, 0, 512, 320);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 512, 320);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#4c1d95');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 320);
    }

    if (memeFilter === 'sora') {
      ctx.fillStyle = 'rgba(236, 72, 153, 0.22)';
      ctx.fillRect(0, 0, 512, 320);
    } else if (memeFilter === 'shadow') {
      ctx.fillStyle = 'rgba(88, 28, 135, 0.36)';
      ctx.fillRect(0, 0, 512, 320);
    } else if (memeFilter === 'crt') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      for (let y = 0; y < 320; y += 6) ctx.fillRect(0, y, 512, 2);
    }

    ctx.font = '900 28px Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#ffffff';
    const top = memeTop.toUpperCase();
    const bot = memeBottom.toUpperCase();
    if (top) {
      ctx.strokeText(top, 256, 42, 488);
      ctx.fillText(top, 256, 42, 488);
    }
    if (bot) {
      ctx.strokeText(bot, 256, 298, 488);
      ctx.fillText(bot, 256, 298, 488);
    }
  }, [memeTop, memeBottom, memeFilter, memeSnapImg]);

  const snapLive3D = useCallback(() => {
    if (!engine) return;
    const dataUrl = engine.captureCanvasDataUrl();
    const img = new Image();
    img.onload = () => {
      setMemeSnapImg(img);
      setMemeStatus('Captured live 3D realm viewport.');
    };
    img.src = dataUrl;
  }, [engine]);

  useEffect(() => {
    if (activeModal === 'meme') {
      snapLive3D();
    }
  }, [activeModal, snapLive3D]);

  useEffect(() => {
    if (activeModal === 'meme') {
      drawMemePreview();
    }
  }, [activeModal, drawMemePreview]);

  // Real-time Web Audio Frequency Visualizer inside MemeForge modal
  useEffect(() => {
    if (activeModal !== 'meme' || !engine) return;
    let timer = 0;
    const drawViz = () => {
      const cvs = vizCanvasRef.current;
      if (cvs) {
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#080c17';
          ctx.fillRect(0, 0, cvs.width, cvs.height);
          const bins = engine.audio.getFrequencyData();
          if (bins) {
            const barW = cvs.width / bins.length;
            for (let i = 0; i < bins.length; i++) {
              const h = (bins[i] / 255) * (cvs.height - 6);
              ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#c084fc';
              ctx.fillRect(i * barW + 1, cvs.height - h, Math.max(2, barW - 2), h);
            }
          }
        }
      }
      timer = window.setTimeout(drawViz, 60);
    };
    drawViz();
    return () => window.clearTimeout(timer);
  }, [activeModal, engine]);

  const pushMemeCaption = (top: string, bottom: string) => {
    setMemeTop(top);
    setMemeBottom(bottom);
    const sliced = memeHistory.slice(0, memeHistIdx + 1);
    const next = [...sliced, { top, bottom }];
    setMemeHistory(next);
    setMemeHistIdx(next.length - 1);
  };

  const handleAskLeo = async (promptOverride?: string) => {
    const q = (promptOverride ?? leoInput).trim();
    if (!q || leoBusy) return;
    setLeoInput('');
    setLeoMessages((prev) => [...prev, { sender: hud.playerName, text: q }]);

    const questsCompleted = [
      hud.quests.captureObsidian,
      hud.quests.adsBlocked >= hud.quests.adsBlockedTarget,
      hud.quests.memeProjected,
      hud.quests.defeatMalakor,
      hud.quests.defeatVoryn,
      hud.quests.catchFish,
      hud.quests.driveBuggy,
    ].filter(Boolean).length;

    const offline = resolveOfflineLeoReply(q, {
      biome: hud.biome,
      hp: hud.hp,
      maxHp: hud.maxHp,
      level: hud.level,
      questsCompleted,
    });

    // If user asked a direct built-in navigation/game command, answer immediately; also try server-side Gemini for open-ended queries
    if (offline.teleportTarget || promptOverride) {
      setLeoMessages((prev) => [...prev, { sender: 'L.E.O.', text: offline.reply }]);
      return;
    }

    setLeoBusy(true);
    try {
      const resp = await fetch('/api/leo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: q,
          context: { level: hud.level, biome: hud.biome, hp: hud.hp, maxHp: hud.maxHp },
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as { reply?: string };
        setLeoMessages((prev) => [...prev, { sender: 'L.E.O. (Cloud AI)', text: data.reply || offline.reply }]);
      } else {
        setLeoMessages((prev) => [...prev, { sender: 'L.E.O.', text: offline.reply }]);
      }
    } catch {
      setLeoMessages((prev) => [...prev, { sender: 'L.E.O.', text: offline.reply }]);
    } finally {
      setLeoBusy(false);
    }
  };

  // =========================================================================
  // PAUSE MODAL
  // =========================================================================
  if (hud.phase === 'paused') {
    return (
      <div className="fixed inset-0 z-50 bg-[#050811]/82 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-heading"
          className="w-full max-w-sm rounded-xl border border-amber-500/40 bg-[#0c1120] p-6 shadow-2xl"
        >
          <h2 id="pause-heading" className="font-display text-xl font-bold text-slate-50 mb-1">
            Realm Paused
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            {hud.biome} · Level {hud.level} {hud.className}
          </p>

          <div className="grid grid-cols-3 gap-2 mb-5 text-center">
            <div className="rounded-lg border border-slate-800 bg-[#12192c] p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Kills</div>
              <div className="font-mono-tabular text-base font-bold text-slate-100">{hud.kills}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#12192c] p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Gold</div>
              <div className="font-mono-tabular text-base font-bold text-amber-300">{hud.gold}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#12192c] p-2.5">
              <div className="text-[10px] text-slate-400 uppercase">Ads Blocked</div>
              <div className="font-mono-tabular text-base font-bold text-sky-300">{hud.adsBlocked}</div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onResume}
              className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-2.5 text-sm cursor-pointer"
            >
              Resume Adventure
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => engine?.quickSave()}
                className="rounded-lg border border-slate-700 bg-[#141c30] hover:border-slate-500 text-slate-100 py-2 text-xs font-semibold cursor-pointer"
              >
                Quick Save (F5)
              </button>
              <button
                type="button"
                onClick={() => engine?.quickLoad()}
                className="rounded-lg border border-slate-700 bg-[#141c30] hover:border-slate-500 text-slate-100 py-2 text-xs font-semibold cursor-pointer"
              >
                Quick Load (F9)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onRestart}
                className="rounded-lg border border-slate-700 bg-[#141c30] hover:border-slate-500 text-slate-200 py-2 text-xs font-semibold cursor-pointer"
              >
                Restart Run
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="rounded-lg border border-slate-700 bg-[#141c30] hover:border-slate-500 text-slate-300 py-2 text-xs font-semibold cursor-pointer"
              >
                Title Screen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // GAME OVER / VICTORY MODAL
  // =========================================================================
  if (hud.phase === 'gameover') {
    const isVictory = hud.outcome === 'victory';
    return (
      <div className="fixed inset-0 z-50 bg-[#050811]/86 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="outcome-heading"
          className="w-full max-w-md rounded-xl border border-amber-500/45 bg-[#0c1120] p-6 shadow-2xl"
        >
          <h2 id="outcome-heading" className="font-display text-2xl font-bold text-slate-50 mb-1">
            {isVictory ? 'Realm Ascendant — Victory' : 'Fallen in the ShadowRealm'}
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            {isVictory
              ? 'You conquered Obsidian Citadel and vanquished both Malakor and Voryn.'
              : `Defeated in ${hud.biome} at Level ${hud.level}.`}
          </p>

          <div className="grid grid-cols-3 gap-2.5 mb-6 text-center">
            <div className="rounded-lg border border-slate-800 bg-[#12192c] p-3">
              <div className="text-[10px] text-slate-400 uppercase">Level</div>
              <div className="font-mono-tabular text-lg font-bold text-amber-400">{hud.level}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#12192c] p-3">
              <div className="text-[10px] text-slate-400 uppercase">Foes Slain</div>
              <div className="font-mono-tabular text-lg font-bold text-slate-100">{hud.kills}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#12192c] p-3">
              <div className="text-[10px] text-slate-400 uppercase">Castles Held</div>
              <div className="font-mono-tabular text-lg font-bold text-sky-400">{hud.blueCastles}/2</div>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="flex-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-2.5 text-sm cursor-pointer"
            >
              {isVictory ? 'Play Again' : 'Try Again'}
            </button>
            <button
              type="button"
              onClick={onReturnTitle}
              className="rounded-lg border border-slate-700 bg-[#141c30] hover:border-slate-500 text-slate-200 px-4 py-2.5 text-sm font-semibold cursor-pointer"
            >
              Title
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeModal || hud.phase !== 'playing') return null;

  return (
    <div className="fixed inset-0 z-40 bg-[#050811]/78 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[700px] max-h-[88vh] overflow-y-auto realm-scroll rounded-xl border border-slate-700 bg-[#0c1120] p-5 shadow-2xl"
      >
        {/* 1. CRAFTING FORGE (GeminIsland + ShadowRealm + Infinity Core) */}
        {activeModal === 'craft' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-amber-300">Crafting Forge &amp; Inventory</h2>
              <button
                type="button"
                aria-label="Close Crafting Forge"
                onClick={onCloseModal}
                className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#111829] px-3.5 py-2.5 mb-4 flex flex-wrap gap-4 text-xs font-mono-tabular text-slate-200">
              <span>Sticks: {hud.inventory.sticks}</span>
              <span>Stones: {hud.inventory.stones}</span>
              <span>Apples: {hud.inventory.apples}</span>
              <span>Crystals: {hud.inventory.crystals}</span>
              <span>Fish: {hud.inventory.fish}</span>
              <span className="text-amber-300">Weapon Tier: {hud.inventory.weaponTier}</span>
            </div>
            <div className="space-y-2.5">
              {[
                {
                  key: 'weapon' as const,
                  title: 'Mythic Weapon Upgrade (+12 ATK)',
                  cost: '2 Sticks · 2 Stones · 1 Crystal',
                  cta: 'Forge Upgrade',
                },
                {
                  key: 'campfire' as const,
                  title: 'Deploy Portable Campfire (Full HP/MP Rest)',
                  cost: '2 Sticks · 1 Stone',
                  cta: 'Build Campfire',
                },
                {
                  key: 'feast' as const,
                  title: 'Apple-Fish Feast (+85 HP Instant)',
                  cost: '1 Apple or 1 Fish',
                  cta: 'Cook Feast',
                },
                {
                  key: 'core' as const,
                  title: 'Charge Infinity Core (Realm Tier +1, +150 XP)',
                  cost: '2 Crystals',
                  cta: 'Charge Core',
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#12192c] px-3.5 py-2.5"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{item.title}</div>
                    <div className="text-xs text-slate-400">{item.cost}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => engine?.craft(item.key)}
                    className="rounded-md bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3.5 py-1.5 text-xs whitespace-nowrap cursor-pointer"
                  >
                    {item.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. ASCENDANT SKILL TREE (ShadowRealm v3.0) */}
        {activeModal === 'skills' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-amber-300">Ascendant Skill Tree</h2>
              <button
                type="button"
                aria-label="Close Skill Tree"
                onClick={onCloseModal}
                className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-300 mb-3 font-mono-tabular">
              Available Skill Points: <strong className="text-amber-300 text-sm">{hud.skillPoints}</strong>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(
                [
                  { key: 'power', label: 'Ascendant Power', desc: '+6 Base Attack Damage per rank' },
                  { key: 'vitality', label: 'Iron Vitality', desc: '+24 Max HP and immediate heal per rank' },
                  { key: 'haste', label: 'Shadow Haste', desc: '+8% Move Speed & faster attack cadence' },
                  { key: 'arcana', label: 'Void Arcana', desc: '+18 Max MP & +1.1 MP/s regeneration' },
                ] as const
              ).map((sk) => (
                <div
                  key={sk.key}
                  className="rounded-lg border border-slate-800 bg-[#12192c] p-3 flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold text-slate-100">{sk.label}</span>
                      <span className="font-mono-tabular text-xs text-amber-300">Rank {hud.skills[sk.key]}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{sk.desc}</p>
                  </div>
                  <button
                    type="button"
                    disabled={hud.skillPoints <= 0}
                    onClick={() => engine?.upgradeSkill(sk.key)}
                    className="rounded-md bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 hover:bg-amber-500 text-slate-950 font-bold py-1.5 text-xs cursor-pointer disabled:cursor-not-allowed"
                  >
                    Upgrade {sk.label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. L.E.O. AI COMPANION + 3D PET FOLLOWER TELEMETRY (Tri-Core Assistant + Server-Side /api/leo) */}
        {activeModal === 'leo' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-sky-300">L.E.O. Neural Companion &amp; Pet Care</h2>
              <button
                type="button"
                aria-label="Close L.E.O. Companion"
                onClick={onCloseModal}
                className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* 3D Pet Follower Status, Evolution & Modifiers Panel */}
            {(() => {
              const stageSpec = PET_EVOLUTION_STAGES[hud.pet.evolutionStage] ?? PET_EVOLUTION_STAGES[0];
              const nextStage = PET_EVOLUTION_STAGES[hud.pet.evolutionStage + 1] ?? null;
              const petMods = getPetStatusModifiers(hud.pet);
              const formTitle = getPetFormTitle(hud.pet.species, hud.pet.evolutionStage);
              const stageBadgeClass =
                hud.pet.evolutionStage >= 2
                  ? 'border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-200'
                  : hud.pet.evolutionStage === 1
                    ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
                    : 'border-slate-600 bg-slate-800/80 text-slate-300';
              return (
                <section
                  aria-label="3D Pet Follower Status"
                  className={`rounded-lg border p-3.5 mb-3 space-y-2.5 ${
                    hud.pet.evolutionStage >= 2
                      ? 'border-fuchsia-400/50 bg-[#14142b]'
                      : hud.pet.evolutionStage === 1
                        ? 'border-amber-400/45 bg-[#121a2d]'
                        : 'border-sky-500/35 bg-[#10182b]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-amber-300">{hud.pet.name}</span>
                        <span
                          data-testid="pet-evolution-stage"
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${stageBadgeClass}`}
                        >
                          Stage {hud.pet.evolutionStage} · {stageSpec.tierName}
                        </span>
                        <span className="text-[11px] font-mono-tabular text-slate-300">
                          {formTitle} · Bond Lv {hud.pet.level} ({hud.pet.bondXp}/100 XP)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Mood:{' '}
                        <span
                          className={`font-semibold ${
                            hud.pet.mood === 'Ecstatic' || hud.pet.mood === 'Joyful'
                              ? 'text-emerald-300'
                              : hud.pet.mood === 'Content'
                                ? 'text-sky-300'
                                : 'text-rose-300'
                          }`}
                        >
                          {hud.pet.mood}
                        </span>
                        <span className={petMods.auraActive ? 'text-emerald-400/90 ml-2' : 'text-rose-300/90 ml-2'}>
                          · {petMods.auraLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {(['voxel_fox', 'emerald_slime', 'void_pup'] as PetSpeciesKey[]).map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => {
                            engine?.setPetSpecies(sp);
                            setPetFeedback(
                              `${hud.pet.name} switched form to ${getPetFormTitle(sp, hud.pet.evolutionStage)}.`,
                            );
                          }}
                          className={`rounded border px-2 py-1 text-[11px] font-medium cursor-pointer ${
                            hud.pet.species === sp
                              ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                              : 'border-slate-700 bg-[#152038] text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {PET_SPECIES_SPECS[sp].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hunger & Happiness Progress Meters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-xs font-mono-tabular mb-1">
                        <span className="text-amber-300 font-semibold">Hunger</span>
                        <span data-testid="pet-hunger-value" className="text-slate-100">
                          {hud.pet.hunger}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-sm bg-slate-950 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all duration-200 ${
                            hud.pet.hunger < 30 ? 'bg-rose-500' : hud.pet.hunger < 60 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, hud.pet.hunger))}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-mono-tabular mb-1">
                        <span className="text-pink-300 font-semibold">Happiness</span>
                        <span data-testid="pet-happiness-value" className="text-slate-100">
                          {hud.pet.happiness}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-sm bg-slate-950 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all duration-200 ${
                            hud.pet.happiness < 35 ? 'bg-rose-500' : hud.pet.happiness < 65 ? 'bg-sky-400' : 'bg-pink-400'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, hud.pet.happiness))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Active Status Modifiers & Evolution Threshold */}
                  <div
                    data-testid="pet-modifiers"
                    className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded border border-slate-800 bg-[#0b1020] px-2.5 py-2 font-mono-tabular"
                  >
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">HP Regen</div>
                      <div
                        data-testid="pet-mod-regen"
                        className={`text-xs font-bold ${
                          hud.pet.evolutionStage >= 2
                            ? 'text-fuchsia-300'
                            : hud.pet.evolutionStage === 1
                              ? 'text-amber-300'
                              : 'text-emerald-300'
                        }`}
                      >
                        +{petMods.hpRegenPerSec.toFixed(1)}/s
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">ATK Bonus</div>
                      <div
                        data-testid="pet-mod-atk"
                        className={`text-xs font-bold ${
                          petMods.atkBonusPct > 0
                            ? hud.pet.evolutionStage >= 2
                              ? 'text-fuchsia-300'
                              : 'text-amber-300'
                            : 'text-slate-400'
                        }`}
                      >
                        +{petMods.atkBonusPct}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">XP Bonus</div>
                      <div
                        data-testid="pet-mod-xp"
                        className={`text-xs font-bold ${
                          hud.pet.evolutionStage >= 2
                            ? 'text-fuchsia-300'
                            : hud.pet.evolutionStage === 1
                              ? 'text-amber-300'
                              : 'text-sky-300'
                        }`}
                      >
                        +{petMods.xpBonusPct}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">Move Speed</div>
                      <div
                        data-testid="pet-mod-speed"
                        className={`text-xs font-bold ${
                          petMods.speedBonusPct > 0
                            ? hud.pet.evolutionStage >= 2
                              ? 'text-fuchsia-300'
                              : 'text-amber-300'
                            : 'text-slate-400'
                        }`}
                      >
                        +{petMods.speedBonusPct}%
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    {nextStage ? (
                      <span>
                        Next Evolution (<strong className="text-amber-200">{nextStage.tierName}</strong>): Hunger ≥{' '}
                        <span className="font-mono-tabular text-slate-200">{nextStage.minHunger}%</span>, Happiness ≥{' '}
                        <span className="font-mono-tabular text-slate-200">{nextStage.minHappiness}%</span>
                        {nextStage.minBondLevel > 1 && (
                          <>
                            , Bond Lv <span className="font-mono-tabular text-slate-200">{nextStage.minBondLevel}</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-fuchsia-300 font-semibold">
                        ★ Max Ascendant Evolution Unlocked — Full Celestial Modifiers Active
                      </span>
                    )}
                  </div>

                  {/* Care Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const res = engine?.feedPet('apple');
                        if (res) setPetFeedback(res.message);
                      }}
                      className="rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-2.5 py-1.5 text-xs cursor-pointer"
                    >
                      Feed Apple ({hud.inventory.apples})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = engine?.feedPet('fish');
                        if (res) setPetFeedback(res.message);
                      }}
                      className="rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-2.5 py-1.5 text-xs cursor-pointer"
                    >
                      Feed Fish ({hud.inventory.fish})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = engine?.feedPet('treat');
                        if (res) setPetFeedback(res.message);
                      }}
                      className="rounded border border-amber-500/60 bg-amber-950/60 hover:bg-amber-900/70 text-amber-200 font-semibold px-2.5 py-1.5 text-xs cursor-pointer"
                    >
                      Give Treat (5G)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = engine?.petCompanion();
                        if (res) setPetFeedback(res.message);
                      }}
                      className="rounded bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold px-3 py-1.5 text-xs cursor-pointer"
                    >
                      Pet &amp; Play
                    </button>
                  </div>
                  {petFeedback && <div className="text-[11px] text-amber-200">{petFeedback}</div>}
                </section>
              );
            })()}

            <div className="h-[156px] overflow-y-auto realm-scroll rounded-lg border border-slate-800 bg-[#080c17] p-3 text-xs space-y-2 mb-3 select-text">
              {leoMessages.map((m, idx) => (
                <div key={idx} className={m.sender.startsWith('L.E.O.') ? 'text-sky-200' : 'text-slate-200'}>
                  <strong className="text-amber-300">[{m.sender}]</strong> {m.text}
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAskLeo();
              }}
              className="flex gap-2 mb-3"
            >
              <input
                type="text"
                aria-label="Ask L.E.O. a question"
                value={leoInput}
                onChange={(e) => setLeoInput(e.target.value)}
                placeholder="Ask L.E.O. about bosses, dungeons, buggy, crafting, or strategy..."
                className="flex-1 rounded-lg border border-slate-700 bg-[#111829] px-3 py-2 text-xs text-slate-100 focus:border-sky-400 focus:outline-none select-text"
              />
              <button
                type="submit"
                disabled={leoBusy}
                className="rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 text-xs cursor-pointer disabled:opacity-60"
              >
                {leoBusy ? 'Thinking...' : 'Ask'}
              </button>
            </form>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Locate Malakor', q: 'where is malakor' },
                { label: 'Sunken Dungeon', q: 'dungeon' },
                { label: 'Obsidian Citadel', q: 'castle' },
                { label: 'XR Cinema', q: 'cinema' },
                { label: 'LoRA Bio-Lab', q: 'biolab' },
                { label: 'Rainy Bookstore', q: 'bookstore' },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => void handleAskLeo(btn.q)}
                  className="rounded border border-slate-700 bg-[#12192c] hover:border-sky-400 px-2.5 py-1 text-xs text-slate-200 cursor-pointer"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. MEMEFORGE AI SORA STUDIO v2.3.0 (Snapshots, Visualizer, Soundboard, 3D Billboards) */}
        {activeModal === 'meme' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-fuchsia-300">MemeForge Studio — Billboards &amp; Soundboard</h2>
              <button
                type="button"
                aria-label="Close MemeForge Studio"
                onClick={onCloseModal}
                className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <canvas
                  ref={memeCanvasRef}
                  width={512}
                  height={320}
                  className="w-full rounded-lg border border-slate-700 bg-[#080c17]"
                />
                <div className="mt-2.5">
                  <div className="text-[11px] text-slate-400 mb-1">Web Audio Frequency Analyzer</div>
                  <canvas
                    ref={vizCanvasRef}
                    width={320}
                    height={54}
                    className="w-full h-[54px] rounded border border-slate-800 bg-[#080c17]"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div>
                  <label htmlFor="meme-top" className="block text-[11px] text-slate-400 mb-0.5">
                    Top Caption
                  </label>
                  <input
                    id="meme-top"
                    type="text"
                    value={memeTop}
                    onChange={(e) => setMemeTop(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-[#111829] px-2.5 py-1.5 text-xs text-slate-100 select-text"
                  />
                </div>
                <div>
                  <label htmlFor="meme-bottom" className="block text-[11px] text-slate-400 mb-0.5">
                    Bottom Caption
                  </label>
                  <input
                    id="meme-bottom"
                    type="text"
                    value={memeBottom}
                    onChange={(e) => setMemeBottom(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-[#111829] px-2.5 py-1.5 text-xs text-slate-100 select-text"
                  />
                </div>
                <div>
                  <label htmlFor="meme-filter" className="block text-[11px] text-slate-400 mb-0.5">
                    Visual Filter
                  </label>
                  <select
                    id="meme-filter"
                    value={memeFilter}
                    onChange={(e) => setMemeFilter(e.target.value as 'none' | 'sora' | 'shadow' | 'crt')}
                    className="w-full rounded border border-slate-700 bg-[#111829] px-2.5 py-1.5 text-xs text-slate-100"
                  >
                    <option value="none">Clean Voxel HD</option>
                    <option value="sora">Sora Neon Cinema</option>
                    <option value="shadow">ShadowRealm Violet</option>
                    <option value="crt">Retro RPG Scanlines</option>
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={snapLive3D}
                    className="flex-1 rounded bg-sky-600 hover:bg-sky-500 text-white py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    Snap 3D View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const pair = AI_MEME_CAPTIONS[Math.floor(Math.random() * AI_MEME_CAPTIONS.length)];
                      pushMemeCaption(pair[0], pair[1]);
                      setMemeStatus('Generated new meme caption.');
                    }}
                    className="flex-1 rounded bg-violet-600 hover:bg-violet-500 text-white py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    Auto Caption
                  </button>
                  <button
                    type="button"
                    aria-label="Undo Caption"
                    disabled={memeHistIdx <= 0}
                    onClick={() => {
                      const idx = Math.max(0, memeHistIdx - 1);
                      setMemeHistIdx(idx);
                      setMemeTop(memeHistory[idx].top);
                      setMemeBottom(memeHistory[idx].bottom);
                    }}
                    className="rounded border border-slate-700 px-2.5 text-xs text-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    aria-label="Redo Caption"
                    disabled={memeHistIdx >= memeHistory.length - 1}
                    onClick={() => {
                      const idx = Math.min(memeHistory.length - 1, memeHistIdx + 1);
                      setMemeHistIdx(idx);
                      setMemeTop(memeHistory[idx].top);
                      setMemeBottom(memeHistory[idx].bottom);
                    }}
                    className="rounded border border-slate-700 px-2.5 text-xs text-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    Redo
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    drawMemePreview();
                    if (memeCanvasRef.current && engine) {
                      engine.projectMemeToBillboards(memeCanvasRef.current);
                      setMemeStatus('Projected live onto Spawn & Castle 3D Billboards!');
                    }
                  }}
                  className="w-full rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-2 text-xs cursor-pointer"
                >
                  Project to 3D Castle Billboards
                </button>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onCloseModal();
                      engine?.recordFiveSecondClip();
                    }}
                    className="flex-1 rounded border border-rose-500/60 bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    Record 5s WebM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      drawMemePreview();
                      if (!memeCanvasRef.current) return;
                      const a = document.createElement('a');
                      a.download = 'ShadowVoxel-MemeForge.png';
                      a.href = memeCanvasRef.current.toDataURL('image/png');
                      a.click();
                    }}
                    className="flex-1 rounded border border-emerald-500/60 bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-200 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    Save PNG
                  </button>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#111829] p-2">
                  <div className="text-[11px] text-slate-400 mb-1.5">Timeline Soundboard</div>
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { label: 'Airhorn', sfx: 'airhorn' },
                        { label: 'Boom', sfx: 'boom' },
                        { label: 'Violin', sfx: 'violin' },
                        { label: 'Fanfare', sfx: 'levelup' },
                      ] as const
                    ).map((sb) => (
                      <button
                        key={sb.sfx}
                        type="button"
                        onClick={() => engine?.playSoundboard(sb.sfx)}
                        className="rounded border border-slate-700 bg-[#182238] hover:border-amber-400 py-1 text-[11px] text-slate-200 cursor-pointer"
                      >
                        {sb.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-sky-300">{memeStatus}</p>
              </div>
            </div>
          </div>
        )}

        {/* 5. OMNISTREAM XR CINEMA STUDIO */}
        {activeModal === 'omni' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-sky-300">OmniStream XR 3D Cinema</h2>
              <button
                type="button"
                aria-label="Close OmniStream XR"
                onClick={onCloseModal}
                className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Stream procedural cinema channels or load a local MP4/WebM video file onto the curved 3D theater screen overlooking the Ashen Sea.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-800 bg-[#111829] p-3 space-y-2">
                <div className="text-xs font-semibold text-slate-200">Built-In 3D Channels</div>
                {(
                  [
                    { key: 'cyber', label: 'Ch 1: Nocturne Rainy Bookstore' },
                    { key: 'warp', label: 'Ch 2: Infinity Core Hyperwarp' },
                    { key: 'matrix', label: 'Ch 3: Kotlin Ad-Shield Matrix' },
                  ] as const
                ).map((ch) => (
                  <button
                    key={ch.key}
                    type="button"
                    onClick={() => engine?.setCinemaChannel(ch.key)}
                    className={`w-full text-left rounded border px-3 py-2 text-xs font-medium cursor-pointer ${
                      hud.cinemaChannel === ch.key
                        ? 'border-sky-400 bg-sky-950/60 text-sky-200'
                        : 'border-slate-700 bg-[#161f33] text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#111829] p-3 space-y-2.5">
                <label htmlFor="local-video-upload" className="block text-xs font-semibold text-slate-200">
                  Play Local Movie on 3D Screen
                </label>
                <input
                  id="local-video-upload"
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && engine) engine.loadLocalCinemaVideo(file);
                  }}
                  className="w-full text-xs text-slate-300 file:mr-2 file:rounded file:border-0 file:bg-slate-700 file:px-2.5 file:py-1 file:text-xs file:text-white"
                />
                <button
                  type="button"
                  onClick={() => engine?.toggleVRMode()}
                  className="w-full rounded bg-violet-600 hover:bg-violet-500 text-white py-2 text-xs font-semibold cursor-pointer"
                >
                  {hud.vrMode ? 'Disable Stereoscopic VR Split' : 'Enable Stereoscopic VR Split (X)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    engine?.teleportTo('cinema');
                    onCloseModal();
                  }}
                  className="w-full rounded border border-slate-700 bg-[#161f33] hover:border-amber-400 text-slate-100 py-2 text-xs font-semibold cursor-pointer"
                >
                  Teleport to XR Cinema Dome
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. VIBEPITCH AUDIO & BARD CONSOLE */}
        {activeModal === 'vibe' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-amber-300">VibePitch Audio &amp; Sonic Bard</h2>
              <button
                type="button"
                aria-label="Close VibePitch Console"
                onClick={onCloseModal}
                className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#111829] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="vibepitch-slider" className="text-slate-300 font-medium">
                  Global Real-Time Pitch Shift
                </label>
                <span className="font-mono-tabular font-bold text-amber-300">
                  {hud.pitchSemitones > 0 ? `+${hud.pitchSemitones}` : hud.pitchSemitones} semitones
                </span>
              </div>
              <input
                id="vibepitch-slider"
                type="range"
                min={-12}
                max={12}
                step={1}
                value={hud.pitchSemitones}
                onChange={(e) => engine?.setVibePitch(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Normal (0)', st: 0 },
                  { label: 'Nightcore (+5)', st: 5 },
                  { label: 'Shadow Bass (-6)', st: -6 },
                  { label: 'Celestial (+3)', st: 3 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => engine?.setVibePitch(preset.st)}
                    className="rounded border border-slate-700 bg-[#182238] hover:border-amber-400 px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => engine?.triggerSkill(5)}
                  className="rounded bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  Cast Vibe Pulse
                </button>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1.5">Playable Pitched Bard Keys</div>
                <div className="grid grid-cols-7 gap-1.5">
                  {BARD_NOTES.map((note) => (
                    <button
                      key={note.label}
                      type="button"
                      onClick={() => engine?.playBardNote(note.hz)}
                      className="rounded border border-slate-500 bg-slate-100 hover:bg-amber-200 active:bg-amber-400 text-slate-950 font-mono-tabular font-bold py-3 text-xs cursor-pointer"
                    >
                      {note.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. LORAFLOW SPATIAL MLOPS BIOSCIENCE LAB */}
        {activeModal === 'lora' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-emerald-300">LoRAFlow Spatial Bio-Lab</h2>
              <button
                type="button"
                aria-label="Close LoRAFlow Bio-Lab"
                onClick={onCloseModal}
                className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Fine-tune live companion LoRA behavior weights for Lira and L.E.O., or synthesize Bio-Mutagen Serum at the DNA Bio-Reactor.
            </p>
            <div className="rounded-lg border border-slate-800 bg-[#111829] p-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="lora-agg" className="text-slate-200">
                    Lira Combat Aggression Weight
                  </label>
                  <span className="font-mono-tabular text-emerald-300">{hud.lora.aggression.toFixed(1)}</span>
                </div>
                <input
                  id="lora-agg"
                  type="range"
                  min={0.2}
                  max={1.5}
                  step={0.1}
                  value={hud.lora.aggression}
                  onChange={(e) => engine?.updateLoraWeights({ aggression: Number(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="lora-heal" className="text-slate-200">
                    Lira Healing Priority Weight
                  </label>
                  <span className="font-mono-tabular text-emerald-300">{hud.lora.healing.toFixed(1)}</span>
                </div>
                <input
                  id="lora-heal"
                  type="range"
                  min={0.2}
                  max={1.5}
                  step={0.1}
                  value={hud.lora.healing}
                  onChange={(e) => engine?.updateLoraWeights({ healing: Number(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="lora-mag" className="text-slate-200">
                    L.E.O. Auto-Gather Magnetism Radius
                  </label>
                  <span className="font-mono-tabular text-emerald-300">{hud.lora.magnet}m</span>
                </div>
                <input
                  id="lora-mag"
                  type="range"
                  min={3}
                  max={16}
                  step={1}
                  value={hud.lora.magnet}
                  onChange={(e) => engine?.updateLoraWeights({ magnet: Number(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => engine?.craft('serum')}
                  className="flex-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2 px-3 text-xs cursor-pointer"
                >
                  Synthesize Bio-Mutagen Serum (1 Crystal)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    engine?.teleportTo('biolab');
                    onCloseModal();
                  }}
                  className="rounded border border-slate-700 bg-[#182238] hover:border-emerald-400 text-slate-100 py-2 px-3 text-xs font-semibold cursor-pointer"
                >
                  Teleport to Bio-Lab
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 8. GM / ADMIN COMMAND DESK (2060 BigInt Timebase + Teleports + World Controls) */}
        {activeModal === 'gm' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-amber-300">GM Command Desk</h2>
              <button
                type="button"
                aria-label="Close GM Command Desk"
                onClick={onCloseModal}
                className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#080c17] p-3 mb-3 font-mono-tabular text-xs text-sky-300 space-y-1">
              <div>2060-01-01 128-bit BigInt Offset: {epochClock}</div>
              <div className="text-slate-400">
                Active World Entities: {hud.entityCount} · Weather: {hud.weather} · Time: {hud.timeOfDayLabel}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-800 bg-[#111829] p-3">
                <div className="text-xs font-semibold text-amber-300 mb-2">Realm Waypoint Teleports</div>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { k: 'spawn', l: 'Infinity Core' },
                      { k: 'blueCastle', l: 'Dawn Citadel' },
                      { k: 'redCastle', l: 'Obsidian Citadel' },
                      { k: 'malakor', l: 'Malakor Rift' },
                      { k: 'dungeon', l: 'Sunken Portal' },
                      { k: 'cinema', l: 'XR Cinema' },
                      { k: 'biolab', l: 'LoRA Bio-Lab' },
                      { k: 'bookstore', l: 'Rainy Bookstore' },
                      { k: 'waterfall', l: 'Emerald Cliff Waterfall' },
                      { k: 'arcade', l: 'GeminIsland Arcade' },
                      { k: 'sea', l: 'Ashen Sea' },
                    ] as Array<{ k: LandmarkKey; l: string }>
                  ).map((tp) => (
                    <button
                      key={tp.k}
                      type="button"
                      onClick={() => {
                        engine?.teleportTo(tp.k);
                        onCloseModal();
                      }}
                      className="rounded border border-slate-700 bg-[#182238] hover:border-amber-400 px-2.5 py-1 text-xs text-slate-200 cursor-pointer"
                    >
                      {tp.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#111829] p-3">
                <div className="text-xs font-semibold text-fuchsia-300 mb-2">World &amp; Sandbox Actions</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => engine?.cycleWeather()}
                    className="rounded border border-slate-700 bg-[#182238] hover:border-sky-400 px-2.5 py-1 text-xs text-slate-200 cursor-pointer"
                  >
                    Cycle Weather
                  </button>
                  <button
                    type="button"
                    onClick={() => engine?.toggleDayNight()}
                    className="rounded border border-slate-700 bg-[#182238] hover:border-sky-400 px-2.5 py-1 text-xs text-slate-200 cursor-pointer"
                  >
                    Toggle Day/Night
                  </button>
                  <button
                    type="button"
                    onClick={() => engine?.grantGmBoost()}
                    className="rounded border border-slate-700 bg-[#182238] hover:border-amber-400 px-2.5 py-1 text-xs text-slate-200 cursor-pointer"
                  >
                    Grant +500G / +180XP
                  </button>
                  <button
                    type="button"
                    onClick={() => engine?.quickSave()}
                    className="rounded border border-slate-700 bg-[#182238] hover:border-emerald-400 px-2.5 py-1 text-xs text-slate-200 cursor-pointer"
                  >
                    Quick Save (F5)
                  </button>
                  <button
                    type="button"
                    onClick={() => engine?.quickLoad()}
                    className="rounded border border-slate-700 bg-[#182238] hover:border-emerald-400 px-2.5 py-1 text-xs text-slate-200 cursor-pointer"
                  >
                    Quick Load (F9)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCloseModal();
                      engine?.triggerTestPopupAd();
                    }}
                    className="rounded border border-rose-600/60 bg-rose-950/60 hover:bg-rose-900/70 px-2.5 py-1 text-xs text-rose-200 cursor-pointer"
                  >
                    Spawn Test Spam Ad
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 9. REALM GUILDS, CULTIVATION BREAKTHROUGH & LEADERBOARD (Open-World-MMORPG-) */}
        {activeModal === 'guilds' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-amber-300">
                  Guilds, Cultivation &amp; Shards
                </h2>
                <p className="text-xs text-slate-400">
                  Shard: <span className="text-sky-300 font-semibold">{hud.shardName}</span> · Lineage:{' '}
                  <span className="text-amber-300 font-semibold">{hud.lineageName}</span> · CP{' '}
                  <span className="font-mono-tabular text-slate-200">{hud.combatPower}</span>
                </p>
              </div>
              <button
                type="button"
                aria-label="Close Guilds and Cultivation"
                onClick={onCloseModal}
                className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex gap-1.5">
                {(
                  [
                    { k: 'cultivation', label: 'Cultivation' },
                    { k: 'guilds', label: 'Guilds & Siege' },
                    { k: 'leaderboard', label: 'Leaderboard' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.k}
                    type="button"
                    onClick={() => setGuildTab(t.k)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      guildTab === t.k
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-700 bg-[#111829] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <label htmlFor="modal-shard-select" className="text-slate-400">
                  Shard:
                </label>
                <select
                  id="modal-shard-select"
                  value={hud.shardId}
                  onChange={(e) => engine?.setShard(e.target.value)}
                  className="rounded border border-slate-700 bg-[#111829] px-2 py-1 text-xs text-slate-200"
                >
                  {REALM_SHARDS.map((sh) => (
                    <option key={sh.id} value={sh.id}>
                      {sh.name} ({sh.region})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {guildStatus && (
              <div className="mb-3 rounded border border-sky-500/50 bg-[#0b192c] px-3 py-1.5 text-xs text-sky-200">
                {guildStatus}
              </div>
            )}

            {guildTab === 'cultivation' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-800 bg-[#111829] p-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-400">Current Cultivation Realm</div>
                    <div className="font-display text-base font-bold text-amber-300">{hud.cultivationName}</div>
                    <div className="text-xs font-mono-tabular text-sky-300 mt-0.5">
                      Spirit Stones Held: {hud.spiritStones} · Level {hud.level}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = engine?.attemptBreakthrough();
                      if (res) setGuildStatus(res.message);
                    }}
                    className="rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs cursor-pointer"
                  >
                    Attempt Breakthrough
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CULTIVATION_REALMS.map((realm) => {
                    const reached = hud.cultivationTier >= realm.tier;
                    const isNext = hud.cultivationTier + 1 === realm.tier;
                    return (
                      <div
                        key={realm.tier}
                        className={`rounded-lg border p-2.5 text-xs ${
                          reached
                            ? 'border-emerald-500/60 bg-[#0d1f1b]'
                            : isNext
                              ? 'border-amber-500/70 bg-[#1a1829]'
                              : 'border-slate-800 bg-[#0e1322] opacity-80'
                        }`}
                      >
                        <div className="font-semibold text-slate-100 flex items-center justify-between gap-1">
                          <span className="truncate">{realm.name}</span>
                          <span className="font-mono-tabular text-amber-300">{realm.powerMultiplier}x</span>
                        </div>
                        <div className="text-[11px] font-mono-tabular text-slate-400 mt-1">
                          Lv {realm.minLevel} · {realm.spiritStoneCost} Stones
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {guildTab === 'guilds' && (
              <div className="space-y-3">
                {siege && (
                  <div className="rounded-lg border border-amber-500/40 bg-[#151225] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div>
                        <div className="font-display text-sm font-bold text-amber-300">{siege.fortressName}</div>
                        <div className="text-xs text-slate-300">
                          Controlled by <span className="text-amber-400 font-bold">[{siege.controllingGuildTag}]</span>{' '}
                          {siege.controllingGuildName} · Rallies: {siege.activeRallies}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleLaunchSiegeRally}
                        className="rounded bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 text-xs cursor-pointer"
                      >
                        Launch Siege Rally
                      </button>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono-tabular text-slate-400 mb-1">
                      <span>Gate Integrity</span>
                      <span>
                        {siege.gateIntegrity} / {siege.maxGateIntegrity}
                      </span>
                    </div>
                    <div className="h-2 rounded bg-slate-900 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all"
                        style={{ width: `${Math.max(0, (siege.gateIntegrity / siege.maxGateIntegrity) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {guilds.map((g) => {
                    const isMember = hud.guildId === g.id;
                    return (
                      <div key={g.id} className="rounded-lg border border-slate-800 bg-[#111829] p-2.5 flex flex-col justify-between gap-2">
                        <div>
                          <div className="font-display text-xs font-bold text-slate-100">
                            <span className="text-amber-400 mr-1">[{g.tag}]</span>
                            {g.name}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{g.motto}</p>
                          <div className="text-[10px] font-mono-tabular text-slate-400 mt-1">
                            Members {g.members.length} · Power {g.rallyPower}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleJoinGuild(g.id)}
                          disabled={isMember}
                          className={`rounded py-1 px-2 text-xs font-semibold cursor-pointer ${
                            isMember
                              ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600/50 cursor-default'
                              : 'bg-slate-800 hover:bg-amber-600 hover:text-slate-950 text-slate-100'
                          }`}
                        >
                          {isMember ? 'Active Guild' : 'Join Guild'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleCreateGuild} className="flex flex-wrap gap-2 pt-1">
                  <input
                    type="text"
                    aria-label="New guild name"
                    placeholder="Found Guild Name..."
                    value={newGuildName}
                    onChange={(e) => setNewGuildName(e.target.value)}
                    maxLength={28}
                    className="flex-1 min-w-[160px] rounded border border-slate-700 bg-[#0d1322] px-2.5 py-1.5 text-xs text-slate-100"
                  />
                  <input
                    type="text"
                    aria-label="New guild tag"
                    placeholder="TAG (2-6)"
                    value={newGuildTag}
                    onChange={(e) => setNewGuildTag(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-[100px] rounded border border-slate-700 bg-[#0d1322] px-2.5 py-1.5 text-xs font-mono-tabular text-slate-100"
                  />
                  <button
                    type="submit"
                    className="rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3 py-1.5 text-xs cursor-pointer"
                  >
                    Found Guild
                  </button>
                </form>
              </div>
            )}

            {guildTab === 'leaderboard' && (
              <div className="rounded-lg border border-slate-800 bg-[#111829] overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                  <div className="col-span-4">Champion</div>
                  <div className="col-span-3">Lineage &amp; Class</div>
                  <div className="col-span-3">Cultivation</div>
                  <div className="col-span-2 text-right">Power</div>
                </div>
                <div className="divide-y divide-slate-800/70 max-h-[250px] overflow-y-auto realm-scroll">
                  {leaderboard.map((row, idx) => (
                    <div
                      key={row.playerId}
                      className={`grid grid-cols-12 gap-2 px-3 py-2 text-xs items-center ${
                        row.name === hud.playerName ? 'bg-amber-500/10 text-amber-100' : 'text-slate-200'
                      }`}
                    >
                      <div className="col-span-4 font-semibold truncate">
                        <span className="font-mono-tabular text-slate-500 mr-1.5">#{idx + 1}</span>
                        {row.guildTag && <span className="text-amber-400 mr-1">[{row.guildTag}]</span>}
                        {row.name}
                      </div>
                      <div className="col-span-3 text-[11px] text-slate-400 truncate">
                        {row.lineageName} · {row.className}
                      </div>
                      <div className="col-span-3 text-[11px] text-sky-300 truncate">
                        Lv {row.level} · {row.cultivationName}
                      </div>
                      <div className="col-span-2 text-right font-mono-tabular font-bold text-amber-300">
                        {row.combatPower}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 10. GEMINISLAND INTERACTIVE ARCADE (Tic-Tac-Toe, Simon Synth, Lights Out) */}
        {activeModal === 'arcade' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-cyan-300">GeminIsland Interactive Arcade</h2>
                <p className="text-xs text-slate-400">
                  Play authentic GeminIsland voxel mini-games to earn Gold, XP &amp; Spirit Stones · Arcade Wins:{' '}
                  <span className="font-mono-tabular text-amber-300 font-bold">{hud.arcadeWins}</span>
                </p>
              </div>
              <button
                type="button"
                aria-label="Close GeminIsland Arcade"
                onClick={onCloseModal}
                className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex gap-1.5">
                {(
                  [
                    { k: 'ttt', label: 'Voxel Tic-Tac-Toe' },
                    { k: 'simon', label: 'Simon Synth' },
                    { k: 'lights', label: 'Lights Out 3×3' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.k}
                    type="button"
                    onClick={() => setArcadeTab(t.k)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      arcadeTab === t.k
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                        : 'border-slate-700 bg-[#111829] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    engine?.teleportTo('arcade');
                    onCloseModal();
                  }}
                  className="rounded border border-slate-700 bg-[#182238] hover:border-cyan-400 px-2.5 py-1 text-xs text-slate-200 cursor-pointer"
                >
                  Teleport to Arcade
                </button>
                <button
                  type="button"
                  onClick={() => {
                    engine?.teleportTo('waterfall');
                    onCloseModal();
                  }}
                  className="rounded border border-slate-700 bg-[#182238] hover:border-emerald-400 px-2.5 py-1 text-xs text-slate-200 cursor-pointer"
                >
                  Emerald Waterfall
                </button>
              </div>
            </div>

            {arcadeTab === 'ttt' && (
              <div className="rounded-lg border border-slate-800 bg-[#111829] p-4 flex flex-col sm:flex-row items-center gap-5">
                <div className="grid grid-cols-3 gap-2 w-[210px] shrink-0">
                  {tttBoard.map((cell, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Tic Tac Toe cell ${idx + 1}`}
                      onClick={() => handleTttClick(idx)}
                      className={`h-[64px] rounded-lg border text-2xl font-display font-bold transition-colors cursor-pointer ${
                        cell === 'X'
                          ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                          : cell === 'O'
                            ? 'border-rose-400 bg-rose-950/60 text-rose-300'
                            : 'border-slate-700 bg-[#182238] hover:border-amber-400 text-slate-200'
                      }`}
                    >
                      {cell ?? ''}
                    </button>
                  ))}
                </div>
                <div className="space-y-3 flex-1">
                  <div className="text-xs font-semibold text-cyan-200">{tttStatus}</div>
                  <p className="text-xs text-slate-400">
                    Challenge the tactical GeminIsland AI. Victory awards +120 Gold, +40 XP, and +15 Spirit Stones directly to your hero.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTttBoard(Array<TicTacToeCell>(9).fill(null));
                      setTttStatus('New match started — your turn (X).');
                    }}
                    className="rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3.5 py-1.5 text-xs cursor-pointer"
                  >
                    New Match
                  </button>
                </div>
              </div>
            )}

            {arcadeTab === 'simon' && (
              <div className="rounded-lg border border-slate-800 bg-[#111829] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-amber-200">{simonStatus}</div>
                  <button
                    type="button"
                    disabled={simonPlaying}
                    onClick={() => startSimonRound()}
                    className="rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold px-3 py-1.5 text-xs cursor-pointer"
                  >
                    Start Sequence
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5 max-w-[340px] mx-auto">
                  {SIMON_PADS.map((pad) => (
                    <button
                      key={pad.id}
                      type="button"
                      onClick={() => handleSimonPadClick(pad.id)}
                      className={`h-[72px] rounded-lg border-2 font-display text-sm font-bold transition-all cursor-pointer ${
                        simonLitPad === pad.id ? pad.activeClass : pad.idleClass
                      }`}
                    >
                      {pad.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {arcadeTab === 'lights' && (
              <div className="rounded-lg border border-slate-800 bg-[#111829] p-4 flex flex-col sm:flex-row items-center gap-5">
                <div className="grid grid-cols-3 gap-2 w-[210px] shrink-0">
                  {lightsGrid.map((lit, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Lights Out tile ${idx + 1} ${lit ? 'on' : 'off'}`}
                      onClick={() => handleLightsToggle(idx)}
                      className={`h-[64px] rounded-lg border-2 font-mono-tabular text-xs font-bold transition-colors cursor-pointer ${
                        lit
                          ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-md'
                          : 'border-slate-700 bg-[#0b1222] text-slate-500 hover:border-slate-500'
                      }`}
                    >
                      {lit ? 'ON' : 'OFF'}
                    </button>
                  ))}
                </div>
                <div className="space-y-3 flex-1">
                  <div className="text-xs font-semibold text-amber-200">
                    {lightsSolved
                      ? `All lights extinguished in ${lightsMoves} moves! (+150 Gold, +50 XP, +20 Spirit Stones)`
                      : `Extinguish every glowing voxel tile · Moves: ${lightsMoves}`}
                  </div>
                  <p className="text-xs text-slate-400">
                    Clicking a tile toggles itself and its orthogonal neighbors. Every generated puzzle is guaranteed solvable.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const nextSeed = lightsSeed + 1;
                      setLightsSeed(nextSeed);
                      setLightsGrid(createLightsOutPuzzle(nextSeed));
                      setLightsMoves(0);
                      setLightsSolved(false);
                    }}
                    className="rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3.5 py-1.5 text-xs cursor-pointer"
                  >
                    Next Puzzle
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 11. VOXEL REALMS RPG: IMPERIAL CASTLE WARFARE & 9-SECTOR SIEGE COMMAND (Repo #4) */}
        {activeModal === 'warfare' &&
          (() => {
            const w = hud.warfare;
            const castleSpec = getImperialCastleSpec(w.castleLevel);
            const totalTroops = getTotalTroopCount(w.troops);
            const armyPower = computeWarfarePower(w);
            const dawnCount = ALL_TERRITORY_SECTORS.filter((s) => w.sectors[s] === 'DAWN').length;
            const isMaxCastle = w.castleLevel >= MAX_IMPERIAL_CASTLE_LEVEL;
            const activeForm = SIEGE_FORMATIONS[w.formation];
            return (
              <div className="space-y-3">
                <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-bold text-amber-300 leading-tight">
                      Voxel Realms — Imperial Castle Warfare
                    </h2>
                    <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                      <span data-testid="warfare-castle-era" className="text-amber-200 font-semibold">
                        Lv {castleSpec.level}/{MAX_IMPERIAL_CASTLE_LEVEL} {castleSpec.era}
                      </span>{' '}
                      · Army Power{' '}
                      <span data-testid="warfare-army-power" className="text-sky-300 font-bold">
                        {armyPower}
                      </span>{' '}
                      · Barracks{' '}
                      <span data-testid="warfare-troop-count" className="text-emerald-300">
                        {totalTroops}/{castleSpec.maxTroops}
                      </span>{' '}
                      · Dawn {dawnCount}/9
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={isMaxCastle}
                      onClick={() => {
                        const res = engine?.upgradeImperialCastle();
                        if (res) setWarfareFeedback(res.message);
                      }}
                      className="rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-2.5 py-1.5 text-xs whitespace-nowrap cursor-pointer"
                    >
                      {isMaxCastle
                        ? 'Max Castle Lv 10'
                        : `Upgrade Keep (${castleSpec.upgradeGold}G · ${castleSpec.upgradeStones} Stones)`}
                    </button>
                    <button
                      type="button"
                      aria-label="Close Castle Warfare"
                      onClick={onCloseModal}
                      className="rounded border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Live 3D Siege Battlefield Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/35 bg-[#12192d] px-3 py-2">
                  <div className="text-xs text-slate-300">
                    Gold <strong className="font-mono-tabular text-amber-300">{hud.gold}</strong> · Spirit Stones{' '}
                    <strong className="font-mono-tabular text-sky-300">{hud.spiritStones}</strong> · Rallies Won{' '}
                    <strong className="font-mono-tabular text-emerald-300">{w.ralliesWon}</strong>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        engine?.toggleCohortDeployed();
                        setWarfareFeedback(
                          w.cohortDeployed
                            ? '3D Siege Cohort garrisoned inside Imperial Keep.'
                            : `3D Siege Cohort deployed in ${activeForm.label} formation!`,
                        );
                      }}
                      className={`rounded border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                        w.cohortDeployed
                          ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200'
                          : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {w.cohortDeployed ? '3D Cohort: Deployed' : 'Deploy 3D Cohort'}
                    </button>
                    <button
                      type="button"
                      disabled={w.trebuchetCooldownSec > 0}
                      onClick={() => {
                        const res = engine?.fireSiegeTrebuchet();
                        if (res) setWarfareFeedback(res.message);
                      }}
                      className="rounded bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-slate-950 font-bold px-3 py-1.5 text-xs cursor-pointer"
                    >
                      {w.trebuchetCooldownSec > 0
                        ? `Trebuchet Reloading (${w.trebuchetCooldownSec}s)`
                        : 'Fire 3D Trebuchet Volley'}
                    </button>
                  </div>
                </div>

                {warfareFeedback && (
                  <div
                    data-testid="warfare-feedback"
                    className="rounded border border-sky-500/35 bg-[#0c1426] px-3 py-1.5 text-xs text-amber-200"
                  >
                    {warfareFeedback}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Left: 3-Branch Troop Barracks + War Commanders */}
                  <div className="space-y-3">
                    <section className="rounded-lg border border-slate-800 bg-[#0d1424] p-3 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        3-Branch Siege Barracks
                      </div>
                      {(['shieldbearer', 'shooter', 'bomber'] as TroopBranch[]).map((branch) => {
                        const spec = TROOP_SPECS[branch];
                        return (
                          <div
                            key={branch}
                            className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 bg-[#121a2f] px-2.5 py-2"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-100">
                                {spec.label}{' '}
                                <span
                                  data-testid={`troop-count-${branch}`}
                                  className="font-mono-tabular text-sky-300 ml-1"
                                >
                                  x{w.troops[branch]}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {spec.role} · {spec.power} PWR · {spec.costGold}G each
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const res = engine?.trainSiegeTroops(branch, 1);
                                  if (res) setWarfareFeedback(res.message);
                                }}
                                className="rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-2.5 py-1 text-[11px] cursor-pointer"
                              >
                                +1 ({spec.costGold}G)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const res = engine?.trainSiegeTroops(branch, 5);
                                  if (res) setWarfareFeedback(res.message);
                                }}
                                className="rounded border border-sky-400/50 bg-sky-950/60 hover:bg-sky-900/70 text-sky-200 font-semibold px-2.5 py-1 text-[11px] cursor-pointer"
                              >
                                +5 ({spec.costGold * 5}G)
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </section>

                    {/* War Commanders */}
                    <section className="rounded-lg border border-slate-800 bg-[#0d1424] p-3 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Active War Commander
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                        {(['arthur', 'lyra', 'aiden'] as WarCommanderId[]).map((cid) => {
                          const cmd = WAR_COMMANDERS[cid];
                          const active = w.commanderId === cid;
                          return (
                            <button
                              key={cid}
                              type="button"
                              onClick={() => {
                                engine?.setWarCommander(cid);
                                setWarfareFeedback(`${cmd.name} (${cmd.skillName}) now commands your Siege Cohort.`);
                              }}
                              className={`text-left rounded border p-2 cursor-pointer transition-colors ${
                                active
                                  ? 'border-amber-400 bg-amber-500/15 text-amber-100'
                                  : 'border-slate-800 bg-[#121a2f] text-slate-300 hover:border-slate-600'
                              }`}
                            >
                              <div className="text-xs font-bold">{cmd.name}</div>
                              <div className="text-[10px] text-amber-300/90">{cmd.skillName}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{cmd.bonusDesc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </div>

                  {/* Right: Tactical Formations + 9-Sector Territory War Map + Active Modifiers */}
                  <div className="space-y-3">
                    <section className="rounded-lg border border-slate-800 bg-[#0d1424] p-3 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Tactical 3D Siege Formation
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          ['SHIELD_WALL', 'WEDGE_CHARGE', 'LOOSE_SKIRMISH', 'PHALANX_ADVANCE'] as SiegeFormationType[]
                        ).map((fKey) => {
                          const f = SIEGE_FORMATIONS[fKey];
                          const active = w.formation === fKey;
                          return (
                            <button
                              key={fKey}
                              type="button"
                              onClick={() => {
                                engine?.setSiegeFormation(fKey);
                                setWarfareFeedback(`3D Cohort shifted to ${f.label}: ${f.shortDesc}`);
                              }}
                              className={`text-left rounded border p-2 cursor-pointer transition-colors ${
                                active
                                  ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                                  : 'border-slate-800 bg-[#121a2f] text-slate-300 hover:border-slate-600'
                              }`}
                            >
                              <div className="text-xs font-bold">{f.label}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{f.shortDesc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section className="rounded-lg border border-slate-800 bg-[#0d1424] p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          9-Sector Territory Grid (Click to Rally)
                        </div>
                        <span className="text-[11px] font-mono-tabular text-sky-300 whitespace-nowrap shrink-0">
                          {dawnCount}/9 Dawn
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {ALL_TERRITORY_SECTORS.map((sec) => {
                          const owner = w.sectors[sec];
                          const style =
                            owner === 'DAWN'
                              ? 'border-sky-500/60 bg-sky-500/20 text-sky-200'
                              : owner === 'CONTESTED'
                                ? 'border-amber-400/70 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                                : 'border-rose-500/70 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25';
                          return (
                            <button
                              key={sec}
                              type="button"
                              data-testid={`sector-${sec}`}
                              onClick={() => {
                                const res = engine?.launchTerritoryRally(sec);
                                if (res) setWarfareFeedback(res.message);
                              }}
                              className={`rounded border px-2 py-1.5 text-center cursor-pointer transition-colors ${style}`}
                            >
                              <div className="font-mono-tabular text-xs font-bold">{sec}</div>
                              <div className="text-[10px] uppercase tracking-wider">{owner}</div>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section className="rounded-lg border border-slate-800 bg-[#0d1424] p-3 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Battlefield Modifiers
                        </div>
                        <span className="text-[10px] font-mono-tabular text-amber-300 whitespace-nowrap">
                          Trebuchet [E] (15, 23)
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 font-mono-tabular text-center">
                        <div className="rounded border border-slate-800 bg-[#121a2f] py-1.5 px-1">
                          <div className="text-[10px] text-slate-400">ATK</div>
                          <div data-testid="warfare-mod-atk" className="text-xs font-bold text-amber-300">
                            +{activeForm.heroAtkBonusPct}%
                          </div>
                        </div>
                        <div className="rounded border border-slate-800 bg-[#121a2f] py-1.5 px-1">
                          <div className="text-[10px] text-slate-400">DMG RED</div>
                          <div data-testid="warfare-mod-def" className="text-xs font-bold text-emerald-300">
                            {activeForm.heroDmgReductionPct}%
                          </div>
                        </div>
                        <div className="rounded border border-slate-800 bg-[#121a2f] py-1.5 px-1">
                          <div className="text-[10px] text-slate-400">SPEED</div>
                          <div data-testid="warfare-mod-spd" className="text-xs font-bold text-sky-300">
                            +{activeForm.heroSpeedBonusPct}%
                          </div>
                        </div>
                        <div className="rounded border border-slate-800 bg-[#121a2f] py-1.5 px-1">
                          <div className="text-[10px] text-slate-400">CAPTURE</div>
                          <div data-testid="warfare-mod-cap" className="text-xs font-bold text-fuchsia-300">
                            +{Math.round((activeForm.captureMult - 1) * 100)}%
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
};
