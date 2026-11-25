import http from 'http';
import path from 'path';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

interface PlayerNetState {
  id: string;
  name: string;
  classKey: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  inBuggy: boolean;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Server-side L.E.O. AI Companion endpoint using @google/genai (never exposes key to browser)
  app.post('/api/leo', async (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    const context = req.body?.context && typeof req.body.context === 'object' ? req.body.context : {};

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in server secrets.',
        code: 'NO_API_KEY',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const sys = [
        'You are L.E.O., the holographic AI companion orb inside ShadowVoxel: Infinity Core, a 3D Open-World MMORPG.',
        'Keep replies to 2 concise sentences, practical and in-character.',
        `Player context: Level ${context.level ?? 1}, Biome: ${context.biome ?? 'Whispering Woods'}, HP: ${context.hp ?? 100}/${context.maxHp ?? 100}.`,
        'Landmarks: Infinity Core Plaza (0,0), Dawn Citadel (-54,-28), Obsidian Citadel (56,36), Ashfield Shadow Rift & Malakor (4,-78), Sunken Ruin Dungeon & Voryn (-54,42), OmniStream XR Cinema (16,62), LoRAFlow Bio-Lab (44,-32), Rainy Bookstore with Lin_Jie & Ji_Zhixiu (-22,16), Ashen Sea (-10,96).',
      ].join(' ');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction: sys,
        },
      });

      res.json({ reply: response.text?.trim() || 'L.E.O. standing by.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini request failed.';
      res.status(502).json({ error: message });
    }
  });

  // =========================================================================
  // Open-World-MMORPG- (ShadowRealms: Voxel Ascendant) Realm Guilds, Shards,
  // Castle Siege Rallies & Hall of Champions Leaderboard REST APIs
  // =========================================================================
  interface ServerGuild {
    id: string;
    name: string;
    tag: string;
    emblemColor: string;
    motto: string;
    fortressSector: string;
    treasuryGold: number;
    rallyPower: number;
    members: string[];
  }
  interface ServerSiege {
    fortressName: string;
    controllingGuildTag: string;
    controllingGuildName: string;
    gateIntegrity: number;
    maxGateIntegrity: number;
    activeRallies: number;
    totalSiegeDamage: number;
    lastCapturedBy: string;
  }
  interface ServerLeader {
    playerId: string;
    name: string;
    className: string;
    lineageName: string;
    guildTag: string | null;
    level: number;
    cultivationTier: number;
    cultivationName: string;
    kills: number;
    combatPower: number;
  }

  const realmShards = [
    { id: 'solara-eu', name: 'Solara Citadel', region: 'EU-West', biomeTheme: 'Sunlit Plains & Grand Keep', maxCapacity: 250 },
    { id: 'verdant-na', name: 'Verdant Spires', region: 'NA-East', biomeTheme: 'Emerald Canopy & Ancient Shrines', maxCapacity: 250 },
    { id: 'ironforge-ap', name: 'Ironforge Bastion', region: 'AP-East', biomeTheme: 'Volcanic Crags & Runic Watchtowers', maxCapacity: 250 },
  ];

  const guildStore = new Map<string, ServerGuild>([
    [
      'guild_valor',
      {
        id: 'guild_valor',
        name: 'Sovereign Vanguard',
        tag: 'VALOR',
        emblemColor: '#d97706',
        motto: 'Hold the Solara Gate against the Shadowvale tide.',
        fortressSector: 'Solara Citadel Keep',
        treasuryGold: 48500,
        rallyPower: 14200,
        members: ['Arthur Pendragon', 'Lyra Shadowshot', 'Garrick Ironbrow'],
      },
    ],
    [
      'guild_verdant',
      {
        id: 'guild_verdant',
        name: 'Verdant Wardens',
        tag: 'LEAF',
        emblemColor: '#10b981',
        motto: 'Swift volleys from the emerald canopy.',
        fortressSector: 'Verdant Spires Shrine',
        treasuryGold: 36200,
        rallyPower: 11850,
        members: ['Sylvara Windrunner', 'Theron Mossblade'],
      },
    ],
    [
      'guild_iron',
      {
        id: 'guild_iron',
        name: 'Ironforge Runesmiths',
        tag: 'ANVIL',
        emblemColor: '#3b82f6',
        motto: 'Tempered in mountain fire and eternal stone.',
        fortressSector: 'Ironforge Watchtower',
        treasuryGold: 41900,
        rallyPower: 12900,
        members: ['Borin Runehammer', 'Kaelen Stormforge'],
      },
    ],
  ]);

  const siegeByShard = new Map<string, ServerSiege>();
  for (const sh of realmShards) {
    siegeByShard.set(sh.id, {
      fortressName: `${sh.name} Keep`,
      controllingGuildTag: 'VALOR',
      controllingGuildName: 'Sovereign Vanguard',
      gateIntegrity: 8400,
      maxGateIntegrity: 10000,
      activeRallies: 1,
      totalSiegeDamage: 1600,
      lastCapturedBy: 'Sovereign Vanguard',
    });
  }

  const leaderboardStore = new Map<string, ServerLeader>([
    [
      'seed_arthur',
      {
        playerId: 'seed_arthur',
        name: 'Arthur Pendragon',
        className: 'Iron Warden',
        lineageName: 'Terran Sovereign',
        guildTag: 'VALOR',
        level: 14,
        cultivationTier: 4,
        cultivationName: 'Nascent Soul',
        kills: 86,
        combatPower: 9420,
      },
    ],
    [
      'seed_lyra',
      {
        playerId: 'seed_lyra',
        name: 'Lyra Shadowshot',
        className: 'Shadowblade',
        lineageName: 'Sylvan High-Elf',
        guildTag: 'LEAF',
        level: 11,
        cultivationTier: 3,
        cultivationName: 'Core Formation',
        kills: 64,
        combatPower: 6850,
      },
    ],
    [
      'seed_kaelen',
      {
        playerId: 'seed_kaelen',
        name: 'Kaelen Stormforge',
        className: 'Pyromancer',
        lineageName: 'Azure Dragonkin',
        guildTag: 'ANVIL',
        level: 9,
        cultivationTier: 2,
        cultivationName: 'Foundation Realm',
        kills: 41,
        combatPower: 5120,
      },
    ],
  ]);

  app.get('/api/realms', (_req, res) => {
    res.json({
      shards: realmShards.map((s) => ({
        ...s,
        online: players.size,
        siege: siegeByShard.get(s.id),
      })),
    });
  });

  app.get('/api/guilds', (req, res) => {
    const shardId = typeof req.query.shardId === 'string' && siegeByShard.has(req.query.shardId) ? req.query.shardId : 'solara-eu';
    res.json({
      guilds: Array.from(guildStore.values()),
      siege: siegeByShard.get(shardId),
    });
  });

  app.post('/api/guilds', (req, res) => {
    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 28) : '';
    const rawTag = typeof req.body?.tag === 'string' ? req.body.tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) : '';
    const motto = typeof req.body?.motto === 'string' ? req.body.motto.trim().slice(0, 80) : 'Forged in the Infinity Core.';
    const founder = typeof req.body?.founderName === 'string' ? req.body.founderName.trim().slice(0, 20) : 'Hero';

    if (rawName.length < 3 || rawTag.length < 2) {
      res.status(400).json({ error: 'Guild name (min 3 chars) and tag (2-6 chars) are required.' });
      return;
    }
    const id = `guild_${Date.now().toString(36)}`;
    const record: ServerGuild = {
      id,
      name: rawName,
      tag: rawTag,
      emblemColor: '#f59e0b',
      motto,
      fortressSector: 'Infinity Core Bastion',
      treasuryGold: 5000,
      rallyPower: 3200,
      members: [founder],
    };
    guildStore.set(id, record);
    res.status(201).json({ guild: record, guilds: Array.from(guildStore.values()) });
  });

  app.post('/api/guilds/:guildId/join', (req, res) => {
    const guild = guildStore.get(req.params.guildId);
    if (!guild) {
      res.status(404).json({ error: 'Guild not found.' });
      return;
    }
    const memberName = typeof req.body?.memberName === 'string' ? req.body.memberName.trim().slice(0, 20) : 'Hero';
    if (!guild.members.includes(memberName)) {
      guild.members.push(memberName);
      guild.rallyPower += 450;
    }
    res.json({ guild, guilds: Array.from(guildStore.values()) });
  });

  app.post('/api/siege/rally', (req, res) => {
    const shardId = typeof req.body?.shardId === 'string' && siegeByShard.has(req.body.shardId) ? req.body.shardId : 'solara-eu';
    const guildId = typeof req.body?.guildId === 'string' ? req.body.guildId : '';
    const combatPower = Math.max(400, Math.min(25000, Number(req.body?.combatPower) || 1200));
    const guild = guildStore.get(guildId);
    const siege = siegeByShard.get(shardId)!;
    const attackerName = guild ? guild.name : 'Free Vanguard';
    const attackerTag = guild ? guild.tag : 'FREE';

    const dmg = Math.round(900 + combatPower * 0.25);
    siege.activeRallies += 1;
    siege.totalSiegeDamage += dmg;
    siege.gateIntegrity = Math.max(0, siege.gateIntegrity - dmg);

    let captured = false;
    if (siege.gateIntegrity <= 0) {
      captured = true;
      siege.controllingGuildTag = attackerTag;
      siege.controllingGuildName = attackerName;
      siege.lastCapturedBy = attackerName;
      siege.gateIntegrity = siege.maxGateIntegrity;
      if (guild) guild.treasuryGold += 2500;
    }

    res.json({ siege, damageDealt: dmg, captured });
  });

  app.get('/api/leaderboard', (_req, res) => {
    const entries = Array.from(leaderboardStore.values()).sort((a, b) => b.combatPower - a.combatPower).slice(0, 12);
    res.json({ leaderboard: entries });
  });

  app.post('/api/leaderboard/sync', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 20) : '';
    if (!name) {
      res.status(400).json({ error: 'Player name required.' });
      return;
    }
    const key = `live_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    leaderboardStore.set(key, {
      playerId: key,
      name,
      className: String(req.body?.className || 'Shadowblade').slice(0, 20),
      lineageName: String(req.body?.lineageName || 'Terran Sovereign').slice(0, 24),
      guildTag: typeof req.body?.guildTag === 'string' ? req.body.guildTag.slice(0, 6) : null,
      level: Math.max(1, Number(req.body?.level) || 1),
      cultivationTier: Math.max(0, Math.min(5, Number(req.body?.cultivationTier) || 0)),
      cultivationName: String(req.body?.cultivationName || 'Mortal Initiate').slice(0, 24),
      kills: Math.max(0, Number(req.body?.kills) || 0),
      combatPower: Math.max(100, Number(req.body?.combatPower) || 500),
    });
    const entries = Array.from(leaderboardStore.values()).sort((a, b) => b.combatPower - a.combatPower).slice(0, 12);
    res.json({ leaderboard: entries });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, players: players.size, guilds: guildStore.size });
  });

  // Mount Vite middleware in dev, or serve dist/ in production
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);

  // Real-time authoritative WebSocket Multiplayer server mounted on /ws (same port 3000)
  const wss = new WebSocketServer({ server, path: '/ws' });
  let nextPlayerId = 1;
  const players = new Map<string, PlayerNetState>();
  let latestBillboardDataUrl: string | null = null;

  wss.on('connection', (ws) => {
    const id = `hero_${nextPlayerId++}`;
    players.set(id, {
      id,
      name: `Adventurer${nextPlayerId}`,
      classKey: 'shadowblade',
      x: 0,
      y: 2.5,
      z: 8,
      rotY: Math.PI,
      inBuggy: false,
    });

    ws.send(
      JSON.stringify({
        type: 'welcome',
        id,
        billboardDataUrl: latestBillboardDataUrl,
        onlineCount: players.size,
      }),
    );

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        const p = players.get(id);
        if (!p) return;

        if (msg.type === 'join') {
          p.name = String(msg.name || p.name).slice(0, 18);
          p.classKey = String(msg.classKey || 'shadowblade');
        } else if (msg.type === 'move') {
          if (Number.isFinite(msg.x) && Number.isFinite(msg.y) && Number.isFinite(msg.z)) {
            p.x = msg.x;
            p.y = msg.y;
            p.z = msg.z;
            p.rotY = Number.isFinite(msg.rotY) ? msg.rotY : p.rotY;
            p.inBuggy = Boolean(msg.inBuggy);
          }
        } else if (msg.type === 'chat' && typeof msg.text === 'string') {
          const text = msg.text.trim().slice(0, 110);
          if (!text) return;
          const out = JSON.stringify({ type: 'chat', sender: p.name, text });
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(out);
            }
          });
        } else if (msg.type === 'meme' && typeof msg.dataUrl === 'string' && msg.dataUrl.startsWith('data:image/')) {
          if (msg.dataUrl.length <= 260_000) {
            latestBillboardDataUrl = msg.dataUrl;
            const out = JSON.stringify({ type: 'meme', sender: p.name, dataUrl: msg.dataUrl });
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(out);
              }
            });
          }
        }
      } catch {
        // Ignore malformed packets
      }
    });

    ws.on('close', () => {
      players.delete(id);
    });
  });

  // Broadcast authoritative world positions at 15Hz
  setInterval(() => {
    if (wss.clients.size === 0) return;
    const payload = JSON.stringify({
      type: 'state',
      onlineCount: players.size,
      players: Array.from(players.values()),
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }, 66);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ShadowVoxel: Infinity Core server running on http://localhost:${PORT}`);
  });
}

void startServer();
