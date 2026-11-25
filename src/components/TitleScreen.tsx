import React from 'react';
import { HERO_CLASSES, LINEAGES, REALM_SHARDS } from '../game/rules';
import type { HeroClassKey, LineageId } from '../game/types';

interface TitleScreenProps {
  playerName: string;
  selectedClass: HeroClassKey;
  selectedLineage: LineageId;
  selectedShard: string;
  onNameChange: (name: string) => void;
  onSelectClass: (cls: HeroClassKey) => void;
  onSelectLineage: (lineage: LineageId) => void;
  onSelectShard: (shardId: string) => void;
  onStart: () => void;
}

const CLASS_ORDER: HeroClassKey[] = ['shadowblade', 'pyromancer', 'ironwarden', 'voidwalker'];
const LINEAGE_ORDER: LineageId[] = [
  'human',
  'sylvan_elf',
  'ironforge_dwarf',
  'azure_dragonkin',
  'celestial_kitsune',
  'void_walker',
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  playerName,
  selectedClass,
  selectedLineage,
  selectedShard,
  onNameChange,
  onSelectClass,
  onSelectLineage,
  onSelectShard,
  onStart,
}) => {
  const activeLineage = LINEAGES[selectedLineage];

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-5 md:p-8 pointer-events-none">
      {/* Subtle left-edge readability scrim over live 3D flyover */}
      <div
        aria-hidden="true"
        className="fixed inset-y-0 left-0 w-full md:w-[560px] bg-gradient-to-r from-[#070a12]/95 via-[#070a12]/82 to-transparent pointer-events-none"
      />

      <main className="relative z-10 my-auto w-full max-w-[475px] pointer-events-auto">
        {/* Bespoke inline SVG Title Crest Emblem */}
        <div className="mb-4">
          <svg
            viewBox="0 0 440 86"
            className="w-full max-w-[430px] h-auto"
            role="img"
            aria-label="ShadowVoxel: Infinity Core"
          >
            {/* Geometric Infinity Core Crest */}
            <g transform="translate(8, 11)">
              <polygon
                points="30,2 56,17 56,47 30,62 4,47 4,17"
                fill="#101829"
                stroke="#d97706"
                strokeWidth="2.2"
              />
              <polygon
                points="30,11 47,32 30,53 13,32"
                fill="#38bdf8"
                fillOpacity="0.22"
                stroke="#38bdf8"
                strokeWidth="1.8"
              />
              <polygon points="30,18 39,32 30,46 21,32" fill="#f59e0b" />
              <circle cx="30" cy="32" r="4" fill="#f8fafc" />
            </g>
            {/* World-matched Monumental Title Typography */}
            <text
              x="78"
              y="42"
              fill="#f8fafc"
              fontFamily="Cinzel, Georgia, serif"
              fontWeight="800"
              fontSize="29"
              letterSpacing="2"
            >
              SHADOWVOXEL
            </text>
            <line x1="78" y1="51" x2="424" y2="51" stroke="#d97706" strokeWidth="1.5" strokeOpacity="0.7" />
            <text
              x="78"
              y="70"
              fill="#cbd5e1"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="600"
              fontSize="11.5"
              letterSpacing="2.6"
            >
              INFINITY CORE · OPEN WORLD MMORPG
            </text>
          </svg>
        </div>

        {/* Hero Name + Realm Shard Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
          <div>
            <label htmlFor="hero-name-input" className="block text-[11px] font-semibold text-slate-400 mb-1 tracking-wide">
              Adventurer Name
            </label>
            <input
              id="hero-name-input"
              type="text"
              maxLength={18}
              value={playerName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter hero name"
              className="w-full rounded-lg border border-slate-700/90 bg-[#0d1322] px-3 py-2 text-sm font-medium text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            />
          </div>
          <div>
            <label htmlFor="realm-shard-select" className="block text-[11px] font-semibold text-slate-400 mb-1 tracking-wide">
              Realm Shard
            </label>
            <select
              id="realm-shard-select"
              value={selectedShard}
              onChange={(e) => onSelectShard(e.target.value)}
              className="w-full rounded-lg border border-slate-700/90 bg-[#0d1322] px-3 py-2 text-sm font-medium text-slate-100 focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            >
              {REALM_SHARDS.map((sh) => (
                <option key={sh.id} value={sh.id}>
                  {sh.name} ({sh.region})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 ShadowRealm Classes Selector */}
        <fieldset className="mb-3.5">
          <legend className="text-[11px] font-semibold text-slate-400 mb-1.5 tracking-wide">Choose Discipline</legend>
          <div className="grid grid-cols-2 gap-2">
            {CLASS_ORDER.map((key) => {
              const spec = HERO_CLASSES[key];
              const active = selectedClass === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectClass(key)}
                  aria-pressed={active}
                  className={`text-left rounded-lg border p-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer ${
                    active
                      ? 'border-amber-500 bg-[#1a2036] text-slate-50'
                      : 'border-slate-800 bg-[#0c111e]/95 text-slate-300 hover:border-slate-600 hover:bg-[#131b2e]'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className="font-display text-sm font-bold text-slate-50">{spec.name}</span>
                    <span className="text-[10px] font-medium text-amber-400 whitespace-nowrap">{spec.role}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug mb-1.5 line-clamp-2">{spec.description}</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular text-slate-400">
                    <span>HP {spec.hp}</span>
                    <span aria-hidden="true">·</span>
                    <span>MP {spec.mp}</span>
                    <span aria-hidden="true">·</span>
                    <span>ATK {spec.damage}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* 6 Fantasy Lineages Selector (Open-World-MMORPG-) */}
        <fieldset className="mb-4">
          <div className="flex items-baseline justify-between mb-1.5">
            <legend className="text-[11px] font-semibold text-slate-400 tracking-wide">Fantasy Lineage</legend>
            <span className="text-[10px] font-mono-tabular text-amber-300/90">{activeLineage.passiveSummary}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {LINEAGE_ORDER.map((linKey) => {
              const lin = LINEAGES[linKey];
              const active = selectedLineage === linKey;
              return (
                <button
                  key={linKey}
                  type="button"
                  onClick={() => onSelectLineage(linKey)}
                  aria-pressed={active}
                  className={`rounded-md border px-2 py-1.5 text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-sky-400 bg-[#142038] text-slate-50'
                      : 'border-slate-800 bg-[#0c111e]/95 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-[11px] font-semibold truncate">{lin.name}</div>
                  <div className="text-[9px] text-slate-400 truncate">{lin.origin}</div>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Single Clear Primary Start CTA */}
        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            onStart();
          }}
          className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-slate-950 font-display font-bold text-base tracking-wider py-3 px-6 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 cursor-pointer shadow-lg"
        >
          Enter Realm
        </button>
      </main>

      {/* Flat borderless inline control hint along bottom safe margin */}
      <footer className="relative z-10 text-xs text-slate-300/90 hud-text-stroke tracking-wide">
        WASD Move · Space Jump · Shift Dash · LMB / 1–5 Skills · E Buggy / Portal / NPC · U Guilds &amp; Cultivation · M MemeForge · Esc Pause
      </footer>
    </div>
  );
};
