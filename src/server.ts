import express from "express";
import { Client } from "pg";
import dotenv from "dotenv";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";

import statsRoutes from "./routes/stats/stats.routes";
import userRoutes from "./routes/user/user.routes";
import leaguesRoutes from "./routes/leagues/leagues.routes";
import friendsRoutes from "./routes/friends/friends.routes";
import settingsRoutes from "./routes/settings/settings.routes";
import missionsRoutes from "./routes/missions/missions.routes";

dotenv.config();

const app = express();
const port = 3000;

const client = new Client({
  user: "postgres",
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PW,
  port: parseInt(process.env.DB_PORT as string),
  ssl: {
    rejectUnauthorized: false,
  },
});

client.connect()
  .then(() => console.log("Connected to the PostgreSQL database"))
  .catch((err) => console.error("Connection error", err.stack));

app.use(express.json());

app.get("/status", async (_req, res) => {
  try {
    await client.query("SELECT 1");
    res.status(200).send("Service is working");
  } catch (error) {
    res.status(500).send();
  }
});

app.use("/", userRoutes);
app.use("/stats", statsRoutes);
app.use("/", leaguesRoutes);
app.use("/friend", friendsRoutes);
app.use("/", settingsRoutes);
app.use("/", missionsRoutes);

const server = createServer(app);
const wss = new WebSocketServer({ server });

interface Player {
  userId: number;
  username: string;
  score: number;
  health: number;
}

interface Lobby {
  code: string;
  hostId: number;
  players: Record<number, Player>;
  started: boolean;
}

const lobbies: Record<string, Lobby> = {};
const playerSockets: Record<number, WebSocket> = {};

function generateLobbyCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function broadcast(code: string, message: any) {
  const lobby = lobbies[code];
  if (!lobby) return;

  const payload = JSON.stringify(message);
  for (const player of Object.values(lobby.players)) {
    const socket = playerSockets[player.userId];
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
}

wss.on("connection", (ws: WebSocket) => {
  ws.on("message", (message: string) => {
    try {
      const { type, payload } = JSON.parse(message);

      switch (type) {
        case "CREATE_LOBBY": {
          const { userId, username } = payload;
          const code = generateLobbyCode();
          const player: Player = { userId, username, score: 0, health: 5 };

          lobbies[code] = {
            code,
            hostId: userId,
            players: { [userId]: player },
            started: false,
          };
          playerSockets[userId] = ws;

          ws.send(JSON.stringify({ type: "LOBBY_CREATED", payload: { code, userId, username } }));
          break;
        }

        case "JOIN_LOBBY": {
          const { code, userId, username } = payload;
          const lobby = lobbies[code];

          if (!lobby || lobby.started) {
            return ws.send(JSON.stringify({ type: "ERROR", payload: "Invalid or started lobby." }));
          }

          const player: Player = { userId, username, score: 0, health: 5 };
          lobby.players[userId] = player;
          playerSockets[userId] = ws;

          broadcast(code, {
            type: "PLAYER_JOINED",
            payload: Object.values(lobby.players),
          });

          break;
        }

        case "START_GAME": {
          const { lobbyCode, userId } = payload;
          const lobby = lobbies[lobbyCode];

          if (!lobby) {
            return ws.send(JSON.stringify({ type: "ERROR", payload: "Only host can start the game." }));
          }

          lobby.started = true;

          broadcast(lobbyCode, {
            type: "GAME_STARTED",
            payload: { players: Object.values(lobby.players) },
          });

          break;
        }

        case "UPDATE_USER": {
          const { code, userId, score, health } = payload;
          const lobby = lobbies[code];
          if (!lobby || !lobby.players[userId]){
            return;
          }

          lobby.players[userId].score = score;
          lobby.players[userId].health = health;

          broadcast(code, {
            type: "USER_UPDATED",
            payload: Object.values(lobby.players),
          });

          break;
        }

        default:
          ws.send(JSON.stringify({ type: "ERROR", payload: "Unknown message type." }));
      }
    } catch (err) {
      console.error("WebSocket Error:", err);
      ws.send(JSON.stringify({ type: "ERROR", payload: "Invalid message format." }));
    }
  });
});

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}

export { app as server, client };
