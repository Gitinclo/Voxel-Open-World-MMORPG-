import React, { useEffect, useRef, useState } from 'react';
import { LANDMARKS, WORLD_SIZE } from '../game/worldMath';
import type { ChatMessage, FloatingLabel, HudSnapshot, PopupAdItem, SuiteModalKey } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  chatLog: ChatMessage[];
  popupAds: PopupAdItem[];
  floatingLabels: FloatingLabel[];
  toast: string | null;
  onSkill: (slot: 1 | 2 | 3 | 4 | 5) => void;
  onOpenModal: (modal: SuiteModalKey) => void;
  onToggleCamera: () => void;
  onToggleVR: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onSendChat: (text: string) => void;
  onBlockAd: (id: string) => void;
}

const SKILL_SLOTS: Array<{
  slot: 1 | 2 | 3 | 4 | 5;
  keyLabel: string;
  name: string;
  role: string;
  accent: string;
  icon: React.ReactNode;
}> = [
  {
    slot: 1,
    keyLabel: '1',
    name: 'Strike',
    role: 'Primary',
    accent: '#f59e0b',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path d="M19 4L9 14l-3-1 1-3L17 2l2 2z" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" />
        <path d="M5 17l2 2-3 3-2-2 3-3z" fill="#f59e0b" />
      </svg>
    ),
  },
  {
    slot: 2,
    keyLabel: '2',
    name: 'Rift',
    role: '20 MP AoE',
    accent: '#c084fc',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" stroke="#c084fc" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="3.5" fill="#e879f9" />
      </svg>
    ),
  },
  {
    slot: 3,
    keyLabel: '3',
    name: 'Ad-Shield',
    role: '15 MP Block',
    accent: '#22d3ee',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path
          d="M12 3l7 3v5c0 4.8-3 8.5-7 10-4-1.5-7-5.2-7-10V6l7-3z"
          fill="#083344"
          stroke="#22d3ee"
          strokeWidth="2"
        />
        <path d="M9 12l2 2 4-4" fill="none" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    slot: 4,
    keyLabel: '4',
    name: 'Ascend',
    role: '30 MP Form',
    accent: '#e879f9',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path d="M12 2l3 7h6l-5 4 2 8-6-4-6 4 2-8-5-4h6l3-7z" fill="#e879f9" stroke="#3b0764" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    slot: 5,
    keyLabel: '5',
    name: 'Vibe',
    role: '18 MP Heal',
    accent: '#38bdf8',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path
          d="M4 12h3l2-6 3 12 3-9 2 3h3"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const SUITE_ITEMS: Array<{ key: Exclude<SuiteModalKey, null>; label: string; hotkey: string }> = [
  { key: 'craft', label: 'Forge', hotkey: 'C' },
  { key: 'skills', label: 'Skills', hotkey: 'K' },
  { key: 'guilds', label: 'Guilds', hotkey: 'U' },
  { key: 'arcade', label: 'Arcade', hotkey: 'J' },
  { key: 'leo', label: 'L.E.O.', hotkey: 'L' },
  { key: 'meme', label: 'MemeForge', hotkey: 'M' },
  { key: 'omni', label: 'XR Cinema', hotkey: 'O' },
  { key: 'vibe', label: 'VibePitch', hotkey: 'P' },
  { key: 'lora', label: 'LoRAFlow', hotkey: 'B' },
  { key: 'gm', label: 'GM Desk', hotkey: 'G' },
];

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  chatLog,
  popupAds,
  floatingLabels,
  toast,
  onSkill,
  onOpenModal,
  onToggleCamera,
  onToggleVR,
  onToggleMute,
  onPause,
  onSendChat,
  onBlockAd,
}) => {
  const [chatText, setChatText] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [suiteExpanded, setSuiteExpanded] = useState(false);
  const [ghostHpPct, setGhostHpPct] = useState(100);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const hpPct = hud.maxHp > 0 ? Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100)) : 0;
  const mpPct = hud.maxMp > 0 ? Math.max(0, Math.min(100, (hud.mp / hud.maxMp) * 100)) : 0;
  const xpPct = hud.xpNext > 0 ? Math.max(0, Math.min(100, (hud.xp / hud.xpNext) * 100)) : 0;

  // Delayed trailing damage ghost bar
  useEffect(() => {
    const id = window.setTimeout(() => setGhostHpPct(hpPct), 260);
    return () => window.clearTimeout(id);
  }, [hpPct]);

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [chatLog, chatOpen]);

  // Draw live navigable world minimap
  useEffect(() => {
    const cvs = minimapRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const W = cvs.width;
    const toMap = (v: number) => ((v / WORLD_SIZE) + 0.5) * W;

    ctx.fillStyle = hud.inDungeon ? '#19142a' : '#14261d';
    ctx.fillRect(0, 0, W, W);

    if (!hud.inDungeon) {
      // Ashfield Rift biome
      ctx.fillStyle = '#361754';
      ctx.beginPath();
      ctx.arc(toMap(LANDMARKS.malakor.x), toMap(LANDMARKS.malakor.z), 16, 0, Math.PI * 2);
      ctx.fill();

      // Ashen Sea
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.arc(toMap(LANDMARKS.sea.x), toMap(LANDMARKS.sea.z), 17, 0, Math.PI * 2);
      ctx.fill();

      // Trails from center
      ctx.strokeStyle = 'rgba(214, 195, 143, 0.35)';
      ctx.lineWidth = 2;
      const cx = toMap(0);
      const cz = toMap(0);
      (['blueCastle', 'redCastle', 'malakor', 'cinema', 'biolab', 'dungeon'] as const).forEach((k) => {
        ctx.beginPath();
        ctx.moveTo(cx, cz);
        ctx.lineTo(toMap(LANDMARKS[k].x), toMap(LANDMARKS[k].z));
        ctx.stroke();
      });

      // Blips
      for (const b of hud.minimapBlips) {
        const bx = toMap(b.x);
        const bz = toMap(b.z);
        if (b.kind === 'castleBlue') {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(bx - 4, bz - 4, 8, 8);
        } else if (b.kind === 'castleRed') {
          ctx.fillStyle = '#f87171';
          ctx.fillRect(bx - 4, bz - 4, 8, 8);
        } else if (b.kind === 'boss') {
          ctx.fillStyle = '#e879f9';
          ctx.beginPath();
          ctx.arc(bx, bz, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (b.kind === 'spam') {
          ctx.fillStyle = '#facc15';
          ctx.fillRect(bx - 2, bz - 2, 4, 4);
        } else if (b.kind === 'buggy') {
          ctx.fillStyle = '#fb923c';
          ctx.fillRect(bx - 2.5, bz - 2.5, 5, 5);
        } else if (b.kind === 'portal') {
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(bx, bz, 3.5, 0, Math.PI * 2);
          ctx.stroke();
        } else if (b.kind === 'ally') {
          ctx.fillStyle = '#34d399';
          ctx.fillRect(bx - 1.5, bz - 1.5, 3, 3);
        } else {
          ctx.fillStyle = '#f87171';
          ctx.fillRect(bx - 1.5, bz - 1.5, 3, 3);
        }
      }
    } else {
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, W / 2, W * 0.36, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Player marker
    const px = hud.inDungeon ? W / 2 + (hud.playerPos.x / 30) * (W * 0.36) : toMap(hud.playerPos.x);
    const pz = hud.inDungeon ? W / 2 + ((hud.playerPos.z + 240) / 30) * (W * 0.36) : toMap(hud.playerPos.z);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, pz, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }, [hud.minimapBlips, hud.playerPos, hud.inDungeon]);

  const completedQuests = [
    hud.quests.captureObsidian,
    hud.quests.adsBlocked >= hud.quests.adsBlockedTarget,
    hud.quests.memeProjected,
    hud.quests.defeatMalakor,
    hud.quests.defeatVoryn,
    hud.quests.catchFish,
    hud.quests.driveBuggy,
  ].filter(Boolean).length;

  const submitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText);
    setChatText('');
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* Critical low-HP peripheral vignette */}
      {hpPct < 28 && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 90px rgba(220, 38, 38, 0.55)' }}
        />
      )}

      {/* Stereoscopic VR center divider */}
      {hud.vrMode && <div aria-hidden="true" className="fixed inset-y-0 left-1/2 w-[3px] bg-black z-30" />}

      {/* TOP-LEFT: Compact Hero Vitals Cluster */}
      <section
        aria-label="Hero vitals"
        className="absolute top-3 left-3 w-[256px] rounded-lg border border-amber-500/30 bg-[#090d18]/88 px-3 py-2.5 pointer-events-auto"
      >
        <div className="mb-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="font-display text-sm font-bold text-slate-50 truncate">
              {hud.guildTag && <span className="text-amber-400 mr-1">[{hud.guildTag}]</span>}
              {hud.playerName}
            </div>
            <div className="text-[11px] font-mono-tabular text-slate-300 whitespace-nowrap shrink-0">
              {hud.wsConnected ? `Online ${hud.onlineCount}` : 'Solo'}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {hud.lineageName} {hud.className} · Lv <span className="font-mono-tabular text-amber-400 font-bold">{hud.level}</span>
          </div>
          <div className="text-[10px] font-mono-tabular text-sky-300/90 flex items-center justify-between gap-2">
            <span className="truncate">{hud.cultivationName}</span>
            <span className="whitespace-nowrap text-amber-300">CP {hud.combatPower}</span>
          </div>
        </div>

        {/* HP Bar with delayed trailing ghost bar */}
        <div className="mb-1.5">
          <div className="flex justify-between text-[10px] font-mono-tabular text-slate-300 mb-0.5">
            <span className="text-rose-300 font-semibold">HP</span>
            <span>
              {hud.hp} / {hud.maxHp}
            </span>
          </div>
          <div className="relative h-2 w-full rounded-sm bg-slate-900 overflow-hidden border border-slate-700/70">
            <div
              className="absolute inset-y-0 left-0 bg-amber-300/70 transition-all duration-300"
              style={{ width: `${ghostHpPct}%` }}
            />
            <div className="absolute inset-y-0 left-0 bg-rose-500 transition-all duration-100" style={{ width: `${hpPct}%` }} />
          </div>
        </div>

        {/* MP & XP Bars */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <div className="flex justify-between text-[10px] font-mono-tabular text-slate-400 mb-0.5">
              <span>MP</span>
              <span>{hud.mp}</span>
            </div>
            <div className="h-1.5 rounded-sm bg-slate-900 overflow-hidden">
              <div className="h-full bg-sky-400 transition-all duration-100" style={{ width: `${mpPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-mono-tabular text-slate-400 mb-0.5">
              <span>XP</span>
              <span>
                {hud.xp}/{hud.xpNext}
              </span>
            </div>
            <div className="h-1.5 rounded-sm bg-slate-900 overflow-hidden">
              <div className="h-full bg-violet-400 transition-all duration-150" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>

        {/* Clean unboxed stat metadata line */}
        <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-300 pt-1 border-t border-slate-800/90">
          <span>Gold {hud.gold}</span>
          <span aria-hidden="true">·</span>
          <span>Stones {hud.spiritStones}</span>
          <span aria-hidden="true">·</span>
          <span>Ads {hud.adsBlocked}</span>
        </div>
      </section>

      {/* TOP-CENTER: Castle Warfare Bar + Conditional Capture & Boss Bars */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 w-[390px] max-w-[90vw]">
        <div className="w-full rounded-lg border border-slate-700/80 bg-[#090d18]/88 px-3.5 py-1.5 flex items-center justify-between text-xs font-mono-tabular">
          <span className="text-sky-400 font-bold whitespace-nowrap">Dawn {hud.blueCastles}</span>
          <span className="text-slate-300 text-[11px] truncate px-2">
            {hud.biome} · {hud.timeOfDayLabel} · {hud.weather}
          </span>
          <span className="text-rose-400 font-bold whitespace-nowrap">Obsidian {hud.redCastles}</span>
        </div>

        {hud.captureBanner && (
          <div className="w-full rounded-lg border border-sky-400/70 bg-[#0b192c]/92 px-3 py-1.5 text-center text-xs font-semibold text-sky-200">
            {hud.captureBanner}
          </div>
        )}

        {hud.bossHud && (
          <div className="w-full rounded-lg border border-fuchsia-500/70 bg-[#170922]/92 px-3.5 py-2">
            <div className="flex items-center justify-between text-xs font-display font-bold text-fuchsia-200 mb-1">
              <span>{hud.bossHud.name}</span>
              <span className="font-mono-tabular">
                {hud.bossHud.hp} / {hud.bossHud.maxHp}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-sm bg-slate-950 overflow-hidden border border-fuchsia-800/70">
              <div
                className="h-full bg-fuchsia-500 transition-all duration-100"
                style={{ width: `${Math.max(0, (hud.bossHud.hp / hud.bossHud.maxHp) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* TOP-RIGHT: Compact Utility Icons, Minimap & Collapsible Quest Tracker */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Toggle First-Person Camera (V)"
            title="Toggle First/Third Person Camera (V)"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleCamera();
            }}
            className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
              hud.firstPerson
                ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                : 'border-slate-700 bg-[#090d18]/90 text-slate-200 hover:border-slate-500'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Toggle Stereoscopic VR Mode (X)"
            title="Toggle Stereoscopic VR Split-Screen (X)"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleVR();
            }}
            className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
              hud.vrMode
                ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                : 'border-slate-700 bg-[#090d18]/90 text-slate-200 hover:border-slate-500'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="10" rx="2" />
              <path d="M12 7v10" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={hud.muted ? 'Unmute Audio' : 'Mute Audio'}
            title="Toggle Audio"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-9 h-9 rounded-lg border border-slate-700 bg-[#090d18]/90 text-slate-200 hover:border-slate-500 flex items-center justify-center cursor-pointer"
          >
            {hud.muted ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H3v6h3l5 4V5z" />
                <path d="M22 9l-6 6M16 9l6 6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H3v6h3l5 4V5z" />
                <path d="M15.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" />
              </svg>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game (Esc)"
            title="Pause Game (Esc)"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-9 h-9 rounded-lg border border-slate-700 bg-[#090d18]/90 text-slate-200 hover:border-slate-500 flex items-center justify-center cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>
        </div>

        {/* Minimap */}
        <div className="rounded-lg border border-slate-700/80 bg-[#090d18]/88 p-1.5">
          <canvas ref={minimapRef} width={118} height={118} className="block w-[118px] h-[118px] rounded" />
        </div>

        {/* Collapsible Quests Drawer */}
        <div className="pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-expanded={questsOpen}
            onClick={(e) => {
              e.currentTarget.blur();
              setQuestsOpen((v) => !v);
            }}
            className="rounded-lg border border-slate-700/80 bg-[#090d18]/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-amber-500/60 cursor-pointer"
          >
            Quests {completedQuests}/7 {questsOpen ? '▴' : '▾'}
          </button>
          {questsOpen && (
            <div className="mt-1.5 w-[235px] rounded-lg border border-slate-700/80 bg-[#090d18]/94 p-2.5 text-xs space-y-1.5">
              {[
                { label: 'Capture Obsidian Citadel', done: hud.quests.captureObsidian },
                {
                  label: `Block ${hud.quests.adsBlockedTarget} Spam Ads (${Math.min(hud.quests.adsBlocked, hud.quests.adsBlockedTarget)}/${hud.quests.adsBlockedTarget})`,
                  done: hud.quests.adsBlocked >= hud.quests.adsBlockedTarget,
                },
                { label: 'Project a Meme to Billboards', done: hud.quests.memeProjected },
                { label: 'Defeat Malakor (Shadow Rift)', done: hud.quests.defeatMalakor },
                { label: 'Defeat Voryn (Sunken Dungeon)', done: hud.quests.defeatVoryn },
                { label: 'Catch a Fish (Ashen Sea)', done: hud.quests.catchFish },
                { label: 'Drive the Island Buggy', done: hud.quests.driveBuggy },
              ].map((q) => (
                <div key={q.label} className={q.done ? 'text-emerald-400 line-through opacity-80' : 'text-slate-300'}>
                  {q.done ? '[Done] ' : '[ ] '}
                  {q.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM-LEFT: Collapsible MMO Chat */}
      <div className="absolute bottom-3 left-3 pointer-events-auto hidden md:block">
        {!chatOpen ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setChatOpen(true);
            }}
            className="rounded-lg border border-slate-700/80 bg-[#090d18]/90 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-sky-400 cursor-pointer"
          >
            Realm Chat ({chatLog.length})
          </button>
        ) : (
          <div className="w-[285px] rounded-lg border border-slate-700/80 bg-[#090d18]/92 p-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span>Realm Chat</span>
              <button
                type="button"
                aria-label="Minimize Chat"
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-slate-100 px-1 cursor-pointer"
              >
                Hide
              </button>
            </div>
            <div className="h-[106px] overflow-y-auto realm-scroll text-xs space-y-1 pr-1 select-text">
              {chatLog.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.tone === 'system'
                      ? 'text-amber-300'
                      : m.tone === 'leo'
                        ? 'text-sky-300'
                        : m.tone === 'spam'
                          ? 'text-rose-400 italic'
                          : m.tone === 'blocked'
                            ? 'text-emerald-400'
                            : 'text-slate-200'
                  }
                >
                  <span className="font-bold">[{m.sender}]</span> {m.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={submitChat} className="flex gap-1.5">
              <input
                type="text"
                aria-label="Realm chat message"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Send message..."
                maxLength={100}
                className="flex-1 rounded border border-slate-700 bg-[#0f172a] px-2.5 py-1 text-xs text-slate-100 focus:border-sky-400 focus:outline-none select-text"
              />
              <button
                type="submit"
                className="rounded bg-slate-700 hover:bg-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-100 cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* BOTTOM-CENTER: Contextual Interact Prompt + Unified Action Hotbar + Collapsible Suite Dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 max-w-[96vw]">
        {hud.interactPrompt && (
          <div className="rounded-md border border-sky-400/70 bg-[#081626]/92 px-3.5 py-1 text-xs font-semibold text-sky-200">
            {hud.interactPrompt}
          </div>
        )}

        {/* Collapsible 20-Repo Unified Suite Bar */}
        <div className="pointer-events-auto flex flex-col items-center">
          <button
            type="button"
            tabIndex={-1}
            aria-expanded={suiteExpanded}
            onClick={(e) => {
              e.currentTarget.blur();
              setSuiteExpanded((v) => !v);
            }}
            className="mb-1 rounded-t-md border border-b-0 border-slate-700/80 bg-[#090d18]/90 px-3 py-0.5 text-[11px] font-medium text-slate-300 hover:text-amber-300 cursor-pointer"
          >
            {suiteExpanded ? '▾ Hide Realm Modules' : '▴ Show Realm Modules'}
          </button>

          {suiteExpanded && (
            <div className="mb-1.5 flex flex-wrap lg:flex-nowrap items-center justify-center gap-1 rounded-lg border border-slate-700/80 bg-[#090d18]/92 px-2 py-1.5">
              {SUITE_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenModal(item.key);
                  }}
                  className="rounded-md border border-slate-700/70 bg-[#111829] hover:border-amber-400/80 hover:bg-[#1a243d] px-2 py-1 text-[11px] font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  {item.label}{' '}
                  <span className="font-mono-tabular text-[10px] text-slate-400">[{item.hotkey}]</span>
                </button>
              ))}
            </div>
          )}

          {/* 1-5 Combat Hotbar */}
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-[#090d18]/92 p-1.5">
            {SKILL_SLOTS.map((s, idx) => {
              const cd = hud.cooldowns[idx];
              const activeBuff =
                (s.slot === 3 && hud.adShieldActive) || (s.slot === 4 && hud.ascendantActive);
              return (
                <button
                  key={s.slot}
                  type="button"
                  tabIndex={-1}
                  aria-label={`${s.name} (${s.role}, Key ${s.keyLabel})`}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSkill(s.slot);
                  }}
                  className={`relative w-[70px] h-[58px] rounded-md border flex flex-col items-center justify-center transition-colors cursor-pointer overflow-hidden ${
                    activeBuff
                      ? 'border-sky-400 bg-sky-950/70'
                      : 'border-slate-700 bg-[#101627] hover:border-amber-400'
                  }`}
                >
                  <span className="absolute top-0.5 left-1.5 text-[10px] font-mono-tabular text-slate-400 font-bold">
                    {s.keyLabel}
                  </span>
                  {s.icon}
                  <span className="text-[11px] font-semibold text-slate-100 leading-tight mt-0.5">{s.name}</span>
                  <span className="text-[9px] text-slate-400 leading-none">{s.role}</span>
                  {cd > 0.05 && (
                    <div className="absolute inset-0 bg-[#050811]/92 flex items-center justify-center font-mono-tabular text-sm font-bold text-amber-300">
                      {cd.toFixed(1)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FLOATING DAMAGE & STATUS NUMBERS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
        {floatingLabels.map((lbl) => (
          <div
            key={lbl.id}
            className="absolute font-mono-tabular font-bold text-sm hud-text-stroke -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${lbl.x}px`, top: `${lbl.y}px`, color: lbl.color }}
          >
            {lbl.text}
          </div>
        ))}
      </div>

      {/* TOAST BANNER */}
      {toast && (
        <div
          role="status"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 rounded-lg border border-amber-400/60 bg-[#0d1424]/95 px-4 py-2 text-xs font-semibold text-amber-200 shadow-lg"
        >
          {toast}
        </div>
      )}

      {/* KOTLIN AD-BLOCKER FAKE POP-UP AD ATTACK LAYER */}
      {popupAds.map((ad) => (
        <div
          key={ad.id}
          role="alertdialog"
          aria-label={ad.title}
          className="fixed z-30 w-[238px] rounded-lg border-2 border-red-600 bg-amber-400 text-slate-950 p-3 shadow-2xl pointer-events-auto"
          style={{ left: `${ad.leftPct}%`, top: `${ad.topPct}%` }}
        >
          <div className="text-xs font-extrabold uppercase tracking-wide mb-1">{ad.title}</div>
          <p className="text-xs font-medium mb-2.5 leading-snug">{ad.body}</p>
          <button
            type="button"
            onClick={() => onBlockAd(ad.id)}
            className="w-full rounded bg-slate-950 hover:bg-slate-800 text-white py-1.5 text-xs font-bold cursor-pointer"
          >
            Block Ad [X] (+15 XP)
          </button>
        </div>
      ))}
    </div>
  );
};
