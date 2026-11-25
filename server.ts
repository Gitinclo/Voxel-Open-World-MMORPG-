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

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, players: players.size });
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
