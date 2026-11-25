# ShadowVoxel: Infinity Core — 20-in-1 3D Open-World MMORPG

> **Last Updated:** 20/11/2026  
> **Runtime:** Node.js `v22.23.5` · npm `10.9.9`  
> **Core Frameworks:** React `^19.0.1` · TypeScript `^7.0.2` · Vite `^8.3.0` · Three.js `^0.187.0` · Tailwind CSS `^4.3.3` · Express `^4.21.2` · ws `^8.23.0` · `@google/genai` `^3.6.1`

Unified 3D Open-World MMORPG combining Castle Warfare (`Voxel-Realms` Parts 1–4, `Open-World-MMORPG-`, `New-world-`), 7-biome Action RPG combat & dungeon exploration (`SHADOWREALM-`, `SHADOWREALM-2`, `ShadowRealm-3D-v3.0-Ascendant-`), off-road vehicle driving, swimming, fishing & crafting (`GeminIsland`), server-backed AI companion (`L.E.O.`), live 3D snapshot/soundboard studio (`MemeForge AI Studio`), 3D Cinema & Stereoscopic VR (`OmniStream XR`), real-time Web Audio pitch shifting (`VibePitch`), DNA Bio-Reactor companion tuning (`LoRAFlow`), and HUD spam-drone defense (`Ad-Blocker`).

---

## Project Architecture Map

```text
/
├── .env.example                 # Required environment variable templates (no secrets)
├── .gitignore                   # Ignored build artifacts, dependencies, and local env files
├── index.html                   # SPA HTML entry point, fonts, and OpenGraph metadata
├── metadata.json                # Applet manifest, display title, and server-side Gemini capability
├── package.json                 # Dependencies and verified npm scripts
├── README.md                    # High-signal architecture and context guide
├── server.ts                    # Express HTTP server, Vite dev middleware, /ws multiplayer, /api/leo proxy
├── tsconfig.json                # TypeScript compiler configuration (ES2022, bundler resolution)
├── vite.config.ts               # Vite bundler configuration and Tailwind v4 plugin
└── src/
    ├── main.tsx                 # React 19 root mount
    ├── index.css                # Tailwind v4 entry (@import "tailwindcss"), font variables, scrollbars
    ├── App.tsx                  # Isolated WebGL mount container, global hotkeys, and UI orchestration
    ├── components/
    │   ├── TitleScreen.tsx      # Left-aligned title overlay, hero naming, 4-class selector
    │   ├── GameHud.tsx          # Perimeter HUD, trailing HP bar, live minimap canvas, combat hotbar, chat
    │   └── SuiteModals.tsx      # 8 interactive realm modals (Craft, Skills, L.E.O., MemeForge, OmniStream, VibePitch, LoRAFlow, GM Desk), Pause & Victory/Defeat screens
    └── game/
        ├── types.ts             # Shared TypeScript interfaces for HUD snapshots, modals, quests, saves
        ├── worldMath.ts         # Deterministic terrain heightfield, 7 biomes, trails, landmark pads
        ├── rules.ts             # Pure game rules: classes, XP curves, combat math, crafting, castle capture, 2060 BigInt clock, offline L.E.O.
        ├── rules.test.ts        # Deterministic node:test unit tests for worldMath.ts and rules.ts
        ├── audio.ts             # Procedural Web Audio synthesizer, AnalyserNode FFT, VibePitch shifter
        ├── models.ts            # Composite Three.js 3D models (heroes, bosses, Buggy, Slimes, Spam Drones, DNA Lab, Bookstore)
        └── engine.ts            # Three.js renderer, RoomEnvironment lighting, enemy AI, dungeon, cinema/VR, WebSocket sync
```

---

## Tech Stack & Agent Coding Constraints

### Installed Core Versions (from `package.json`)
- **UI & Build:** `react` `^19.0.1`, `react-dom` `^19.0.1`, `vite` `^8.3.0`, `@vitejs/plugin-react` `^6.1.1`, `typescript` `^7.0.2`, `tsx` `^4.21.0`
- **3D & Spatial Rendering:** `three` `^0.187.0`, `@types/three` `^0.187.0`
- **Styling & Icons:** `tailwindcss` `^4.3.3`, `@tailwindcss/vite` `^4.3.3`, `lucide-react` `^0.546.0`, `motion` `^12.23.24`
- **Backend, Realtime & AI:** `express` `^4.21.2`, `@types/express` `^4.17.21`, `ws` `^8.23.0`, `@types/ws` `^8.18.2`, `@google/genai` `^3.6.1`, `dotenv` `^17.2.3`

### Explicit Engineering Constraints
1. **Strict Separation of Pure Logic and Three.js Engine:** Keep deterministic math and game rules in `src/game/worldMath.ts` and `src/game/rules.ts` (covered by `src/game/rules.test.ts`), and keep WebGL/Three.js imperative rendering inside `src/game/engine.ts` mounted onto an isolated DOM node in `src/App.tsx`.
2. **Server-Side AI & Multiplayer on Port 3000:** Express serves Vite middleware in dev (or `dist/` in production), hosts the WebSocket multiplayer server on `/ws`, and proxies Gemini requests through `POST /api/leo`. Never expose `GEMINI_API_KEY` to client bundles or render API key input forms in UI.
3. **WebGL HUD Performance Rules:** Do not apply `backdrop-filter` / `backdrop-blur` over the live Three.js canvas; use solid or semi-opaque obsidian surfaces (`bg-[#090d18]/90`).
4. **Type Safety:** Run `npm run lint` (`tsc --noEmit`) with zero errors before shipping; avoid `@ts-ignore`.
5. **Semantic Controls & Accessibility:** Use native `<button>` elements for interactive controls, preserve `data-state` on `<body>`, and maintain `data-start="true"` on the primary start trigger.

---

## Zero-Friction Setup & CLI Commands

```bash
# Install dependencies
npm install

# Run full-stack dev server (Express + Vite middleware + /ws + /api/leo on port 3000)
npm run dev

# Run deterministic unit tests (node:test via tsx)
npm run test

# Type-check entire TypeScript codebase
npm run lint

# Build production client bundle to dist/
npm run build

# Start production server (requires prior npm run build)
npm run start

# Preview static Vite build
npm run preview

# Clean build artifacts
npm run clean
```

---

## Environment Variables

| Variable | Required | Description | Example / Dummy Format |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Optional (falls back to offline L.E.O. routing if unset) | Server-side API key used by `POST /api/leo` in `server.ts` via `@google/genai`. Never exposed to the browser. | `GEMINI_API_KEY="MY_GEMINI_API_KEY"` |
| `APP_URL` | Optional | Public URL where the application is hosted, used for self-referential links and API endpoints. | `APP_URL="MY_APP_URL"` |
