import React from 'react';
import { HERO_CLASSES } from '../game/rules';
import type { HeroClassKey } from '../game/types';

interface TitleScreenProps {
  playerName: string;
  selectedClass: HeroClassKey;
  onNameChange: (name: string) => void;
  onSelectClass: (cls: HeroClassKey) => void;
  onStart: () => void;
}

const CLASS_ORDER: HeroClassKey[] = ['shadowblade', 'pyromancer', 'ironwarden', 'voidwalker'];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  playerName,
  selectedClass,
  onNameChange,
  onSelectClass,
  onStart,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-6 md:p-10 pointer-events-none">
      {/* Subtle left-edge readability scrim over live 3D flyover */}
      <div
        aria-hidden="true"
        className="fixed inset-y-0 left-0 w-full md:w-[560px] bg-gradient-to-r from-[#070a12]/95 via-[#070a12]/82 to-transparent pointer-events-none"
      />

      <main className="relative z-10 my-auto w-full max-w-[460px] pointer-events-auto">
        {/* Bespoke inline SVG Title Crest Emblem */}
        <div className="mb-6">
          <svg
            viewBox="0 0 440 86"
            className="w-full max-w-[440px] h-auto"
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

        {/* Hero Name Field */}
        <div className="mb-5">
          <label htmlFor="hero-name-input" className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide">
            Adventurer Name
          </label>
          <input
            id="hero-name-input"
            type="text"
            maxLength={18}
            value={playerName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter hero name"
            className="w-full rounded-lg border border-slate-700/90 bg-[#0d1322] px-3.5 py-2.5 text-sm font-medium text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          />
        </div>

        {/* 4 ShadowRealm Classes Selector */}
        <fieldset className="mb-6">
          <legend className="text-xs font-semibold text-slate-400 mb-2 tracking-wide">Choose Discipline</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {CLASS_ORDER.map((key) => {
              const spec = HERO_CLASSES[key];
              const active = selectedClass === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectClass(key)}
                  aria-pressed={active}
                  className={`text-left rounded-lg border p-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer ${
                    active
                      ? 'border-amber-500 bg-[#1a2036] text-slate-50'
                      : 'border-slate-800 bg-[#0c111e]/95 text-slate-300 hover:border-slate-600 hover:bg-[#131b2e]'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-display text-sm font-bold text-slate-50">{spec.name}</span>
                    <span className="text-[11px] font-medium text-amber-400 whitespace-nowrap">{spec.role}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-snug mb-2">{spec.description}</p>
                  <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-slate-400">
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

        {/* Single Clear Primary Start CTA */}
        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            onStart();
          }}
          className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-slate-950 font-display font-bold text-base tracking-wider py-3.5 px-6 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 cursor-pointer shadow-lg"
        >
          Enter Realm
        </button>
      </main>

      {/* Flat borderless inline control hint along bottom safe margin */}
      <footer className="relative z-10 text-xs text-slate-300/90 hud-text-stroke tracking-wide">
        WASD Move · Space Jump · Shift Dash · LMB / 1–5 Skills · E Buggy / Portal / NPC · F Fish / Campfire · M MemeForge · Esc Pause
      </footer>
    </div>
  );
};
