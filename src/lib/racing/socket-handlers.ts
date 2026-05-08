import { Server, Socket } from "socket.io";
import { randomBytes, randomUUID } from "crypto";
import { z } from "zod";
import type {
  RaceClientToServerEvents,
  RaceServerToClientEvents,
  RaceInterServerEvents,
  RaceSocketData,
  RaceMatchmakingEntry,
  RaceLobby,
  RaceState,
  RacePrivateRoomSnapshot,
} from "./types";
import {
  DEFAULT_RACE_CONFIG,
  createRaceState,
  processAction,
  startCountdown,
  decrementCountdown,
  checkRaceOver,
  calculateRaceRatings,
  getRaceSnapshot,
  handlePlayerDisconnect,
  generatePlayerProblems,
  gameTick,
} from "./game-logic";
import { db } from "../db";
import { authenticateSocket } from "../socket-auth";
import {
  createRateLimiter,
  isPayloadTooLarge,
  parseWithSchema,
  safelyExecute,
} from "../socket-guards";

// ============================================
// TYPE ALIASES FOR CLEANER CODE
// ============================================

type RaceServer = Server<
  RaceClientToServerEvents,
  RaceServerToClientEvents,
  RaceInterServerEvents,
  RaceSocketData
>;

type RaceSocket = Socket<
  RaceClientToServerEvents,
  RaceServerToClientEvents,
  RaceInterServerEvents,
  RaceSocketData
>;

// ============================================
// SERVER STATE
// ============================================

// Matchmaking queue for races
const raceQueue: Map<string, RaceMatchmakingEntry> = new Map();

// Active lobbies (waiting for more players)
const activeLobbies: Map<string, RaceLobby> = new Map();

// Active races
const activeRaces: Map<string, {
  state: RaceState;
  gameLoop: NodeJS.Timeout | null;
  countdownTimer: NodeJS.Timeout | null;
  botLoop: NodeJS.Timeout | null;
  botPlayerId: string | null;
  dbRaceId: string | null;
  isRated: boolean;
  disconnectTimeouts: Map<string, NodeJS.Timeout>; // userId -> timeout
}> = new Map();

// Track lobby disconnect grace timers (keyed by userId)
const lobbyDisconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

// Per-lobby bot fallback timers (lobbyId -> timer)
const lobbyBotFallbackTimers: Map<string, NodeJS.Timeout> = new Map();

// Socket to race/lobby mapping
const socketToRace: Map<string, string> = new Map();
const socketToLobby: Map<string, string> = new Map();
const socketToPlayer: Map<string, { id: string; username: string; isGuest: boolean }> = new Map();

// ============================================
// PRIVATE RACE ROOMS (LINK LOBBIES)
// ============================================

type PrivateRaceRoom = {
  roomCode: string;
  socketRoomName: string;
  hostId: string;
  players: RaceMatchmakingEntry[];
  config: ReturnType<typeof getPrivateRaceConfig>;
  createdAt: number;
  lastActivityAt: number;
  disconnectTimeouts: Map<string, NodeJS.Timeout>;
  disconnectedPlayers: Set<string>;
  cleanupTimer: NodeJS.Timeout | null;
};

const privateRaceRooms: Map<string, PrivateRaceRoom> = new Map(); // roomCode -> room
const socketToPrivateRaceRoom: Map<string, string> = new Map(); // socketId -> roomCode
const playerToPrivateRaceRoom: Map<string, string> = new Map(); // userId -> roomCode

// ============================================
// GUARDRAILS
// ============================================

const MAX_PAYLOAD_BYTES = 4096;

const raceJoinLimiter = createRateLimiter({ limit: 4, windowMs: 10_000 });
const raceLeaveLimiter = createRateLimiter({ limit: 8, windowMs: 10_000 });
const raceActionLimiter = createRateLimiter({ limit: 30, windowMs: 5_000 });
const raceForfeitLimiter = createRateLimiter({ limit: 3, windowMs: 15_000 });
const privateRoomLimiter = createRateLimiter({ limit: 10, windowMs: 10_000 });

const cosmeticsSchema = z.object({
  equippedSkin: z.string().max(64).nullable(),
  equippedTrail: z.string().max(64).nullable(),
  equippedVehicle: z.string().max(64).nullable(),
  equippedWheel: z.string().max(64).nullable(),
});

const raceJoinQueueSchema = z
  .object({
    cosmetics: cosmeticsSchema.optional(),
  })
  .default({});

const racePrivateJoinSchema = z.object({
  roomCode: z.string().trim().min(4).max(16),
  cosmetics: cosmeticsSchema.optional(),
});

const raceSubmitSchema = z.object({
  action: z.enum(["forward", "left", "right", "boost"]),
  answer: z.number().finite().min(-1_000_000).max(1_000_000),
  problemId: z.string().min(1).max(128),
});

// ============================================
// CONFIGURATION
// ============================================

const MIN_PLAYERS_TO_START = 2;
const MAX_PLAYERS = 5;
const LOBBY_COUNTDOWN_SECONDS = 10;
const GAME_LOOP_INTERVAL_MS = 100; // Faster tick (10Hz) for smoother client motion
const DISCONNECT_GRACE_PERIOD_MS = 15000; // 15 seconds to reconnect
const LOBBY_DISCONNECT_GRACE_PERIOD_MS = 10000; // Grace before removing from lobby on disconnect
const BOT_FALLBACK_DELAY_MS = 10_000;

const PRIVATE_RACE_MAX_PLAYERS = 8;
const PRIVATE_RACE_IDLE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const PRIVATE_RACE_LOBBY_DISCONNECT_GRACE_MS = 10_000;

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getUserRating(userId: string): Promise<number> {
  try {
    const userStats = await db.userStats.findUnique({
      where: { userId },
      select: { rating: true },
    });
    return userStats?.rating ?? 1000;
  } catch (error) {
    console.error(`[Race] Failed to fetch rating for user ${userId}:`, error);
    return 1000;
  }
}

function generateRoomCode(length = 8) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function getPrivateRaceConfig() {
  return {
    ...DEFAULT_RACE_CONFIG,
    maxPlayers: PRIVATE_RACE_MAX_PLAYERS,
    laneCount: PRIVATE_RACE_MAX_PLAYERS,
  };
}

function getPrivateRaceJoinUrl(roomCode: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const origin = (() => {
    try {
      return new URL(appUrl).origin;
    } catch {
      return "";
    }
  })();
  return origin ? `${origin}/multiplayer/private/race/${roomCode}` : `/multiplayer/private/race/${roomCode}`;
}

function privateRaceSnapshot(room: PrivateRaceRoom): RacePrivateRoomSnapshot {
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    maxPlayers: PRIVATE_RACE_MAX_PLAYERS,
    players: room.players.map((p) => ({
      id: p.playerId,
      username: p.username,
      rating: p.rating,
      cosmetics: p.cosmetics,
    })),
    config: room.config,
  };
}

function clearPrivateRaceTimers(room: PrivateRaceRoom) {
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.cleanupTimer = null;
  for (const t of room.disconnectTimeouts.values()) clearTimeout(t);
  room.disconnectTimeouts.clear();
  room.disconnectedPlayers.clear();
}

function cleanupPrivateRaceRoom(roomCode: string) {
  const room = privateRaceRooms.get(roomCode);
  if (!room) return;
  clearPrivateRaceTimers(room);
  for (const p of room.players) {
    playerToPrivateRaceRoom.delete(p.playerId);
    socketToPrivateRaceRoom.delete(p.socketId);
  }
  privateRaceRooms.delete(roomCode);
}

function maybeTransferPrivateRaceHost(room: PrivateRaceRoom): string | null {
  if (room.players.some((p) => p.playerId === room.hostId)) return null;
  const next = room.players[0]?.playerId ?? null;
  if (next) {
    room.hostId = next;
    return next;
  }
  return null;
}

function isBotEntry(entry: RaceMatchmakingEntry) {
  return entry.isBot === true;
}

function getBotEntry(lobby: RaceLobby): RaceMatchmakingEntry | null {
  return lobby.players.find(isBotEntry) ?? null;
}

function getRealPlayers(lobby: RaceLobby): RaceMatchmakingEntry[] {
  return lobby.players.filter((p) => !isBotEntry(p));
}

function clearLobbyBotFallbackTimer(lobbyId: string) {
  const timer = lobbyBotFallbackTimers.get(lobbyId);
  if (timer) clearTimeout(timer);
  lobbyBotFallbackTimers.delete(lobbyId);
}

function scheduleLobbyBotFallback(io: RaceServer, lobby: RaceLobby) {
  // Only schedule when:
  // - lobby exists
  // - countdown not started
  // - no bot is present
  // - exactly 1 real player is waiting
  if (lobby.countdownStarted) return;
  if (getBotEntry(lobby)) return;
  if (getRealPlayers(lobby).length !== 1) return;

  if (lobbyBotFallbackTimers.has(lobby.lobbyId)) return;

  const timer = setTimeout(() => {
    // This timer has fired; remove it so a future eligible state can reschedule.
    lobbyBotFallbackTimers.delete(lobby.lobbyId);

    const currentLobby = activeLobbies.get(lobby.lobbyId);
    if (!currentLobby) return;
    if (currentLobby.countdownStarted) return;
    if (getBotEntry(currentLobby)) return;
    const realPlayers = getRealPlayers(currentLobby);
    if (realPlayers.length !== 1) return;

    // Require the waiting human socket to still be connected.
    const waitingSocket = io.sockets.sockets.get(realPlayers[0].socketId);
    if (!waitingSocket) return;

    addBotToLobby(io, currentLobby);
  }, BOT_FALLBACK_DELAY_MS);

  lobbyBotFallbackTimers.set(lobby.lobbyId, timer);
}

function removeBotFromLobby(io: RaceServer, lobby: RaceLobby) {
  const bot = getBotEntry(lobby);
  if (!bot) return;

  lobby.players = lobby.players.filter((p) => p.playerId !== bot.playerId);

  io.to(lobby.lobbyId).emit("race:player_left", {
    playerId: bot.playerId,
    totalPlayers: lobby.players.length,
  });
}

function addBotToLobby(io: RaceServer, lobby: RaceLobby) {
  // Defensive: clear any pending fallback now that we are acting on it.
  clearLobbyBotFallbackTimer(lobby.lobbyId);

  if (getBotEntry(lobby)) return;

  const botId = `bot_${randomUUID()}`;
  const botUsername = `Guest ${Math.floor(1000 + Math.random() * 9000)}`;

  const botEntry: RaceMatchmakingEntry = {
    socketId: botId, // no real socket
    playerId: botId,
    username: botUsername,
    rating: 1000,
    isGuest: true,
    isBot: true,
    joinedAt: Date.now(),
  };

  lobby.players.push(botEntry);

  io.to(lobby.lobbyId).emit("race:player_joined", {
    player: {
      id: botEntry.playerId,
      username: botEntry.username,
      rating: botEntry.rating,
      cosmetics: botEntry.cosmetics,
    },
    totalPlayers: lobby.players.length,
  });

  // Start countdown now that we have enough players (1 real + bot).
  if (lobby.players.length >= MIN_PLAYERS_TO_START && !lobby.countdownStarted) {
    startLobbyCountdown(io, lobby);
  }
}

// ============================================
// MATCHMAKING / LOBBY MANAGEMENT
// ============================================

function findOrCreateLobby(): RaceLobby | null {
  // Try to find an existing lobby with space
  for (const [, lobby] of activeLobbies) {
    if (lobby.players.length < MAX_PLAYERS) {
      return lobby;
    }
  }

  // Create a new lobby
  const lobbyId = `lobby_${randomUUID()}`;
  const lobby: RaceLobby = {
    lobbyId,
    players: [],
    config: { ...DEFAULT_RACE_CONFIG },
    createdAt: Date.now(),
    countdownStarted: false,
    startCountdown: LOBBY_COUNTDOWN_SECONDS,
  };
  
  activeLobbies.set(lobbyId, lobby);
  return lobby;
}

function addPlayerToLobby(
  io: RaceServer,
  lobby: RaceLobby,
  entry: RaceMatchmakingEntry,
  socket: RaceSocket
) {
  // Check if player is already in lobby (prevent duplicates)
  if (lobby.players.some(p => p.playerId === entry.playerId)) {
    return;
  }

  // Lobby state is changing; clear any scheduled bot fallback and re-evaluate below.
  clearLobbyBotFallbackTimer(lobby.lobbyId);

  lobby.players.push(entry);
  socketToLobby.set(socket.id, lobby.lobbyId);
  
  // Join socket room for lobby
  socket.join(lobby.lobbyId);
  
  // Notify the player they joined
  socket.emit("race:lobby_joined", {
    lobbyId: lobby.lobbyId,
    players: lobby.players.map(p => ({
      id: p.playerId,
      username: p.username,
      rating: p.rating,
      cosmetics: p.cosmetics,
    })),
    config: lobby.config,
  });

  // If the lobby is already counting down, sync the late joiner immediately.
  if (lobby.countdownStarted) {
    socket.emit("race:starting_soon", {
      secondsUntilStart: lobby.startCountdown,
    });
  }
  
  // Notify other players in lobby
  socket.to(lobby.lobbyId).emit("race:player_joined", {
    player: {
      id: entry.playerId,
      username: entry.username,
      rating: entry.rating,
      cosmetics: entry.cosmetics,
    },
    totalPlayers: lobby.players.length,
  });

  // If a bot is present and we now have at least 2 real players, remove the bot.
  // This allows real players to "replace" the bot during countdown.
  if (getBotEntry(lobby) && getRealPlayers(lobby).length >= 2) {
    removeBotFromLobby(io, lobby);
  }
  
  // Check if we should start countdown
  if (lobby.players.length >= MIN_PLAYERS_TO_START && !lobby.countdownStarted) {
    startLobbyCountdown(io, lobby);
  }

  // If we're still waiting (single real player), schedule a bot fallback.
  scheduleLobbyBotFallback(io, lobby);
}

function startLobbyCountdown(io: RaceServer, lobby: RaceLobby) {
  lobby.countdownStarted = true;
  lobby.startCountdown = LOBBY_COUNTDOWN_SECONDS;

  // Countdown has started; bot fallback no longer applies.
  clearLobbyBotFallbackTimer(lobby.lobbyId);
  
  io.to(lobby.lobbyId).emit("race:starting_soon", {
    secondsUntilStart: lobby.startCountdown,
  });
  
  const countdownInterval = setInterval(() => {
    // Check if lobby still exists
    if (!activeLobbies.has(lobby.lobbyId)) {
      clearInterval(countdownInterval);
      return;
    }

    // Check if players dropped below min
    if (lobby.players.length < MIN_PLAYERS_TO_START) {
      lobby.countdownStarted = false;
      lobby.startCountdown = LOBBY_COUNTDOWN_SECONDS;
      io.to(lobby.lobbyId).emit("race:error", "Waiting for more players...");
      clearInterval(countdownInterval);
      // Re-evaluate bot fallback once we're back to waiting.
      scheduleLobbyBotFallback(io, lobby);
      return;
    }

    lobby.startCountdown--;
    
    if (lobby.startCountdown <= 0) {
      clearInterval(countdownInterval);
      startRace(io, lobby);
    } else {
      io.to(lobby.lobbyId).emit("race:starting_soon", {
        secondsUntilStart: lobby.startCountdown,
      });
    }
  }, 1000);
}

// ============================================
// RACE MANAGEMENT
// ============================================

async function startRace(io: RaceServer, lobby: RaceLobby) {
  const raceId = `race_${randomUUID()}`;
  
  // Convert lobby players to matchmaking entries
  const entries: RaceMatchmakingEntry[] = lobby.players;
  const isRated = entries.every((entry) => !entry.isGuest);

  // Clear any pending lobby grace timers now that the race is starting
  for (const entry of entries) {
    const timeout = lobbyDisconnectTimeouts.get(entry.playerId);
    if (timeout) {
      clearTimeout(timeout);
      lobbyDisconnectTimeouts.delete(entry.playerId);
    }
  }

  // Create race state
  const state = createRaceState(raceId, entries, lobby.config);
  
  // Apply cosmetics from entry (already fetched when joining queue)
  state.players.forEach(p => {
    const entry = entries.find(e => e.playerId === p.id);
    if (entry?.cosmetics) {
      p.selectedSkin = entry.cosmetics.equippedSkin || undefined;
      p.selectedTrail = entry.cosmetics.equippedTrail || undefined;
      p.selectedVehicle = entry.cosmetics.equippedVehicle || undefined;
      p.selectedWheel = entry.cosmetics.equippedWheel || undefined;
    }
  });
  
  // Move sockets from lobby to race room
  for (const entry of entries) {
    const socket = io.sockets.sockets.get(entry.socketId);
    if (socket) {
      socket.leave(lobby.lobbyId);
      socket.join(raceId);
      socketToLobby.delete(entry.socketId);
      socketToRace.set(entry.socketId, raceId);
    }
  }
  
  // Remove lobby
  clearLobbyBotFallbackTimer(lobby.lobbyId);
  activeLobbies.delete(lobby.lobbyId);
  
  // Create race record in database
  let dbRaceId: string | null = null;
  if (isRated) {
    try {
      const dbRace = await db.raceMatch.create({
        data: {
          trackLength: state.config.trackLength,
          difficulty: state.config.difficulty,
          maxPlayers: state.config.maxPlayers,
          status: "countdown",
        },
      });
      dbRaceId = dbRace.id;
      
      // Create player records
      await Promise.all(
        state.players.map(player =>
          db.racePlayer.create({
            data: {
              raceId: dbRaceId!,
              userId: player.id,
              username: player.username,
              ratingBefore: player.rating,
              lane: player.lane,
              position: player.position,
              selectedSkin: player.selectedSkin,
              selectedTrail: player.selectedTrail,
              selectedVehicle: player.selectedVehicle,
            },
          })
        )
      );
      
      console.log(`[Race] Created race in database: ${dbRaceId}`);
    } catch (error) {
      console.error("[Race] Failed to create race in database:", error);
      dbRaceId = null;
    }
  }
  
  // Store race
  const botPlayerId = state.players.find((p) => p.id.startsWith("bot_"))?.id ?? null;
  activeRaces.set(raceId, {
    state,
    gameLoop: null,
    countdownTimer: null,
    botLoop: null,
    botPlayerId,
    dbRaceId,
    isRated,
    disconnectTimeouts: new Map(),
  });
  
  // Send start event to all players with their specific problems
  for (const player of state.players) {
    const socket = io.sockets.sockets.get(player.socketId);
    if (socket) {
      socket.emit("race:start", {
        raceId,
        players: state.players.map(p => ({
          id: p.id,
          username: p.username,
          rating: p.rating,
          lane: p.lane,
          position: p.position,
          selectedSkin: p.selectedSkin,
          selectedTrail: p.selectedTrail,
          selectedVehicle: p.selectedVehicle,
          selectedWheel: p.selectedWheel,
        })),
        config: state.config,
        yourProblems: player.problems,
        obstacles: state.obstacles,
        drops: state.drops,
      });
    }
  }
  
  // Start countdown
  startRaceCountdown(io, raceId);
}

async function startPrivateRace(io: RaceServer, room: PrivateRaceRoom) {
  const raceId = `race_${randomUUID()}`;

  const entries: RaceMatchmakingEntry[] = room.players;
  const isRated = false; // private rooms are unrated by default

  const state = createRaceState(raceId, entries, room.config);

  // Apply cosmetics from entry
  state.players.forEach((p) => {
    const entry = entries.find((e) => e.playerId === p.id);
    if (entry?.cosmetics) {
      p.selectedSkin = entry.cosmetics.equippedSkin || undefined;
      p.selectedTrail = entry.cosmetics.equippedTrail || undefined;
      p.selectedVehicle = entry.cosmetics.equippedVehicle || undefined;
      p.selectedWheel = entry.cosmetics.equippedWheel || undefined;
    }
  });

  // Move sockets from private lobby to race room
  for (const entry of entries) {
    const socket = io.sockets.sockets.get(entry.socketId);
    if (socket) {
      socket.leave(room.socketRoomName);
      socket.join(raceId);
      socketToRace.set(entry.socketId, raceId);
      socketToPrivateRaceRoom.delete(entry.socketId);
    }
    playerToPrivateRaceRoom.delete(entry.playerId);
  }

  // Remove private room
  clearPrivateRaceTimers(room);
  privateRaceRooms.delete(room.roomCode);

  // Store race (unrated)
  const botPlayerId = state.players.find((p) => p.id.startsWith("bot_"))?.id ?? null;
  activeRaces.set(raceId, {
    state,
    gameLoop: null,
    countdownTimer: null,
    botLoop: null,
    botPlayerId,
    dbRaceId: null,
    isRated,
    disconnectTimeouts: new Map(),
  });

  // Send start event to all players with their specific problems
  for (const player of state.players) {
    const socket = io.sockets.sockets.get(player.socketId);
    if (socket) {
      socket.emit("race:start", {
        raceId,
        players: state.players.map((p) => ({
          id: p.id,
          username: p.username,
          rating: p.rating,
          lane: p.lane,
          position: p.position,
          selectedSkin: p.selectedSkin,
          selectedTrail: p.selectedTrail,
          selectedVehicle: p.selectedVehicle,
          selectedWheel: p.selectedWheel,
        })),
        config: state.config,
        yourProblems: player.problems,
        obstacles: state.obstacles,
        drops: state.drops,
      });
    }
  }

  startRaceCountdown(io, raceId);
}

function startRaceCountdown(io: RaceServer, raceId: string) {
  const race = activeRaces.get(raceId);
  if (!race) return;
  
  race.state = startCountdown(race.state);
  
  const countdownInterval = setInterval(() => {
    try {
      const currentRace = activeRaces.get(raceId);
      if (!currentRace) {
        clearInterval(countdownInterval);
        return;
      }

      // Step the countdown first so clients don’t see a duplicated leading value
      currentRace.state = decrementCountdown(currentRace.state);

      if (currentRace.state.status === "racing") {
        clearInterval(countdownInterval);
        currentRace.countdownTimer = null;
        startGameLoop(io, raceId);
        
        // Update database
        if (currentRace.dbRaceId) {
          db.raceMatch.update({
            where: { id: currentRace.dbRaceId },
            data: { status: "racing", startedAt: new Date() },
          }).catch(err => console.error("[Race] Failed to update race status:", err));
        }
        return;
      }

      io.to(raceId).emit("race:countdown", {
        seconds: currentRace.state.countdownValue,
      });
    } catch (err) {
      console.error(`[Race] countdown tick failed for ${raceId}:`, err);
    }
  }, 1000);
  
  race.countdownTimer = countdownInterval;
}

function startBotDriverLoop(io: RaceServer, raceId: string, botPlayerId: string): NodeJS.Timeout {
  // Slightly human-ish cadence; bot only uses forward/boost.
  const TICK_MS = 1100;
  const OBSTACLE_LOOKAHEAD_M = 6;
  const DODGE_SUCCESS_RATE = 0.75;
  const PLAYER_AVOID_RANGE_M = 3;

  const loop = setInterval(() => {
    try {
      const race = activeRaces.get(raceId);
      if (!race) return;
      if (race.state.status !== "racing") return;

      const bot = race.state.players.find((p) => p.id === botPlayerId);
      if (!bot) return;
      if (bot.finishPosition !== null) return;

      // Defensive: problems should always exist, but avoid crashing if state got corrupted.
      if (!bot.problems?.forward || !bot.problems?.boost) {
        bot.problems = generatePlayerProblems(bot.lane, race.state.config);
      }

      // Respect stun timing.
      if (bot.isStunned && Date.now() < bot.stunEndTime) return;

    // Obstacle dodge: if an obstacle is coming up in the bot's lane soon,
    // attempt a lane change ~75% of the time.
    const nextObstacleInLane = race.state.obstacles
      .filter((o) => o.lane === bot.lane && o.position > bot.position)
      .sort((a, b) => a.position - b.position)[0];

    if (nextObstacleInLane) {
      const distToObstacle = nextObstacleInLane.position - bot.position;
      if (distToObstacle <= OBSTACLE_LOOKAHEAD_M && Math.random() < DODGE_SUCCESS_RATE) {
        const candidateActions: Array<{
          action: "left" | "right";
          targetLane: number;
          problemId: string;
          answer: number;
        }> = [];

        if (bot.lane > 1 && bot.problems.left) {
          candidateActions.push({
            action: "left",
            targetLane: bot.lane - 1,
            problemId: bot.problems.left.id,
            answer: bot.problems.left.answer,
          });
        }
        if (bot.lane < race.state.config.laneCount && bot.problems.right) {
          candidateActions.push({
            action: "right",
            targetLane: bot.lane + 1,
            problemId: bot.problems.right.id,
            answer: bot.problems.right.answer,
          });
        }

        const safeCandidates = candidateActions.filter((c) => {
          const hasObstacleSoon = race.state.obstacles.some(
            (o) =>
              o.lane === c.targetLane &&
              o.position > bot.position &&
              o.position - bot.position <= OBSTACLE_LOOKAHEAD_M
          );
          if (hasObstacleSoon) return false;

          const hasNearbyPlayer = race.state.players.some((p) => {
            if (p.id === botPlayerId) return false;
            if (p.finishPosition !== null) return false;
            return p.lane === c.targetLane && Math.abs(p.position - bot.position) <= PLAYER_AVOID_RANGE_M;
          });
          if (hasNearbyPlayer) return false;

          return true;
        });

        const dodge = safeCandidates[0];
        if (dodge) {
          const { newState, result } = processAction(
            race.state,
            botPlayerId,
            dodge.action,
            dodge.answer,
            dodge.problemId
          );
          race.state = newState;

          if (result.success) {
            io.to(raceId).emit("race:action_result", {
              playerId: botPlayerId,
              action: dodge.action,
              success: true,
              newLane: result.newLane,
              newPosition: result.newPosition,
              bumpedPlayerId: result.bumpedPlayerId,
              bumpedPlayerNewPosition: result.bumpedPlayerNewPosition,
            });
            return; // consume tick on dodge
          }
        }
      }
    }

      const action: "forward" | "boost" = Math.random() < 0.12 ? "boost" : "forward";
      const problem = action === "boost" ? bot.problems.boost : bot.problems.forward;
      if (!problem) return;

      const { newState, result } = processAction(
        race.state,
        botPlayerId,
        action,
        problem.answer,
        problem.id
      );

      race.state = newState;

      if (!result.success) return;

      io.to(raceId).emit("race:action_result", {
        playerId: botPlayerId,
        action,
        success: true,
        newLane: result.newLane,
        newPosition: result.newPosition,
        bumpedPlayerId: result.bumpedPlayerId,
        bumpedPlayerNewPosition: result.bumpedPlayerNewPosition,
      });

      if (result.obstacleHit) {
        io.to(raceId).emit("race:obstacle_hit", {
          playerId: botPlayerId,
          obstacleId: "",
          obstacleType: result.obstacleHit.type,
          stunDuration: result.obstacleHit.stunDuration,
          pushback: 0,
        });
      }

      if (result.dropCollected) {
        const botAfter = race.state.players.find((p) => p.id === botPlayerId);
        io.to(raceId).emit("race:drop_collected", {
          playerId: botPlayerId,
          dropId: result.dropCollected.dropId,
          dropType: result.dropCollected.type,
          effectDuration: result.dropCollected.effectDuration,
          coinValue: result.dropCollected.coinValue,
          coinsEarnedTotal: botAfter?.coinsEarned,
        });
        io.to(raceId).emit("race:drops_update", {
          drops: race.state.drops,
        });

        // Keep parity with the human flow for non-coin drops (even though current config is coin-only).
        if (result.dropCollected.type !== "coin") {
          io.to(raceId).emit("race:powerup_activated", {
            playerId: botPlayerId,
            powerupType: result.dropCollected.type,
            duration: result.dropCollected.effectDuration,
          });
        }
      }

      if (result.finished && result.finishPosition) {
        const botAfter = race.state.players.find((p) => p.id === botPlayerId);
        io.to(raceId).emit("race:player_finished", {
          playerId: botPlayerId,
          position: result.finishPosition,
          time: botAfter?.finishTime ?? 0,
        });
      }

      // If the bot action ended the race, finish immediately.
      if (checkRaceOver(race.state)) {
        void endRace(io, raceId).catch((e) => {
          console.error(`[Race][Bot] endRace failed for ${raceId}:`, e);
        });
      }
    } catch (err) {
      console.error(`[Race][Bot] tick failed for ${raceId}:`, err);
    }
  }, TICK_MS);

  return loop;
}

function startGameLoop(io: RaceServer, raceId: string) {
  const race = activeRaces.get(raceId);
  if (!race) return;
  
  let lastTickTime = Date.now();

  // Game loop - primarily for timers now
  const gameLoop = setInterval(() => {
    try {
      const currentRace = activeRaces.get(raceId);
      if (!currentRace || currentRace.state.status !== "racing") {
        clearInterval(gameLoop);
        return;
      }
      
      const now = Date.now();
      const deltaTime = now - lastTickTime;
      lastTickTime = now;
      
      // Run game tick (updates timers)
      const { state, events } = gameTick(currentRace.state, deltaTime);
      currentRace.state = state;

      // Process events from tick (drop collection during base movement, finishes, obstacles)
      events.forEach(event => {
        if (event.type === "drop") {
          const playerState = currentRace.state.players.find(p => p.id === event.playerId);
          io.to(raceId).emit("race:drop_collected", {
            playerId: event.playerId,
            dropId: event.data.dropId || "",
            dropType: event.data.dropType!,
            effectDuration: event.data.effectDuration ?? 0,
            coinValue: event.data.coinValue,
            coinsEarnedTotal: playerState?.coinsEarned,
          });
          io.to(raceId).emit("race:drops_update", {
            drops: currentRace.state.drops,
          });
        }
      });
      
      // Broadcast state update to sync timers and catch any drift
      io.to(raceId).emit("race:state_update", {
        players: getRaceSnapshot(currentRace.state),
      });
      
      // Check if race is over (timeout safety)
      if (checkRaceOver(currentRace.state)) {
        clearInterval(gameLoop);
        void endRace(io, raceId).catch((e) => {
          console.error(`[Race] endRace failed for ${raceId}:`, e);
        });
      }
    } catch (err) {
      console.error(`[Race] gameLoop tick failed for ${raceId}:`, err);
    }
  }, GAME_LOOP_INTERVAL_MS);
  
  race.gameLoop = gameLoop;

  // If this race includes a bot, start its driver loop.
  if (race.botPlayerId && !race.botLoop) {
    race.botLoop = startBotDriverLoop(io, raceId, race.botPlayerId);
  }
}

const PLACEMENT_REWARDS: Record<number, number> = {
  1: 30,
  2: 20,
  3: 10,
};

async function endRace(io: RaceServer, raceId: string) {
  const race = activeRaces.get(raceId);
  if (!race) return;

  // Defensive idempotency: multiple timers/paths can try to end at once.
  if (race.state.status === "finished") return;
  
  race.state.status = "finished";

  // Stop bot loop immediately to avoid further state mutation.
  if (race.botLoop) {
    clearInterval(race.botLoop);
    race.botLoop = null;
  }
  
  // Calculate rating changes
  const ratingChanges: Record<string, number> = race.isRated
    ? calculateRaceRatings(race.state)
    : Object.fromEntries(race.state.players.map((player) => [player.id, 0]));
  
  // Build results
  const results = race.state.players
    .sort((a, b) => {
      // Sort by finish position (null = DNF, comes last)
      if (a.finishPosition === null) return 1;
      if (b.finishPosition === null) return -1;
      return a.finishPosition - b.finishPosition;
    })
    .map(player => ({
      playerId: player.id,
      username: player.username,
      position: player.finishPosition || race.state.players.length,
      time: player.finishTime,
      ratingChange: ratingChanges[player.id] || 0,
      stats: {
        problemsSolved: player.problemsSolved,
        bumpsGiven: player.bumpsGiven,
        bumpsReceived: player.bumpsReceived,
        boostsUsed: player.boostsUsed,
      },
    }));
  
  // Send results to each player
  for (const player of race.state.players) {
    const socket = io.sockets.sockets.get(player.socketId);
    if (socket) {
      const placementReward =
        race.isRated && player.finishPosition
          ? PLACEMENT_REWARDS[player.finishPosition] ?? 0
          : 0;
      const coinsEarned = race.isRated ? (player.coinsEarned || 0) + placementReward : 0;

      // Award coins
      if (race.isRated && coinsEarned > 0) {
        try {
          await db.user.update({
            where: { id: player.id },
            data: { coins: { increment: coinsEarned } }
          });
        } catch (err) {
          console.error(`[Race] Failed to award coins to ${player.id}:`, err);
        }
      }

      socket.emit("race:finished", {
        results,
        yourRatingChange: ratingChanges[player.id] || 0,
        coinsEarned,
      });
    }
  }
  
  // Save to database
  if (race.dbRaceId && race.isRated) {
    try {
      // Update race status
      await db.raceMatch.update({
        where: { id: race.dbRaceId },
        data: {
          status: "finished",
          finishedAt: new Date(),
        },
      });
      
      // Update player records
      await Promise.all(
        race.state.players.map(player =>
          db.racePlayer.updateMany({
            where: {
              raceId: race.dbRaceId!,
              userId: player.id,
            },
            data: {
              lane: player.lane,
              position: player.position,
              finishPosition: player.finishPosition,
              finishTime: player.finishTime,
              ratingChange: ratingChanges[player.id] || 0,
              problemsSolved: player.problemsSolved,
              bumpsGiven: player.bumpsGiven,
              bumpsReceived: player.bumpsReceived,
              boostsUsed: player.boostsUsed,
            },
          })
        )
      );
      
      // Update user ratings
      await Promise.all(
        Object.entries(ratingChanges).map(async ([userId, change]) => {
          try {
            const updated = await db.userStats.updateMany({
              where: { userId },
              data: { rating: { increment: change } },
            });
            
            if (updated.count === 0) {
              await db.userStats.create({
                data: { userId, rating: 1000 + change },
              });
            }
          } catch (error) {
            console.error(`[Race] Failed to update rating for ${userId}:`, error);
          }
        })
      );
      
      console.log(`[Race] Saved race results to database: ${race.dbRaceId}`);
    } catch (error) {
      console.error("[Race] Failed to save race results:", error);
    }
  }
  
  // Cleanup after delay
  setTimeout(() => cleanupRace(raceId), 5000);
}

function cleanupRace(raceId: string) {
  const race = activeRaces.get(raceId);
  if (!race) return;
  
  // Clear timers
  if (race.gameLoop) clearInterval(race.gameLoop);
  if (race.countdownTimer) clearInterval(race.countdownTimer);
  if (race.botLoop) clearInterval(race.botLoop);
  
  // Clear disconnect timeouts
  for (const timeout of race.disconnectTimeouts.values()) {
    clearTimeout(timeout);
  }
  
  // Clear socket mappings
  for (const player of race.state.players) {
    socketToRace.delete(player.socketId);
  }
  
  // Remove race
  activeRaces.delete(raceId);
  console.log(`[Race] Cleaned up race: ${raceId}`);
}

// ============================================
// SOCKET EVENT HANDLERS
// ============================================

export function setupRacingHandlers(io: RaceServer) {
  io.on("connection", (socket: RaceSocket) => {
    // Helpful connection metadata for debugging prod disconnects (Fly/Vercel).
    const origin = typeof socket.handshake.headers.origin === "string" ? socket.handshake.headers.origin : "";
    const ua = typeof socket.handshake.headers["user-agent"] === "string" ? socket.handshake.headers["user-agent"] : "";
    const transport = socket.conn.transport.name;
    console.log(`[Race] Client connected: ${socket.id} transport=${transport} origin=${origin} ua=${ua}`);

    // Low-level Engine.IO lifecycle events can explain "mystery" disconnects.
    const conn = socket.conn as unknown as {
      on(event: "close", listener: (reason: string) => void): void;
      on(event: "error", listener: (err: unknown) => void): void;
    };
    conn.on("close", (reason) => {
      console.log(`[Race] Engine close: ${socket.id} reason=${reason}`);
    });
    conn.on("error", (err) => {
      console.error(`[Race] Engine error: ${socket.id}`, err);
    });

    socket.on("disconnecting", (reason) => {
      const rooms = Array.from(socket.rooms).join(",");
      console.log(`[Race] Client disconnecting: ${socket.id} reason=${reason} rooms=${rooms}`);
    });
    
    // ========================================
    // MATCHMAKING HANDLERS
    // ========================================
    
    socket.on("race:join_queue", (data) => {
      const rate = raceJoinLimiter(socket.id);
      if (!rate.allowed) {
        socket.emit("race:error", "Too many join attempts");
        return;
      }

      if (isPayloadTooLarge(data, MAX_PAYLOAD_BYTES)) {
        socket.emit("race:error", "Payload too large");
        return;
      }

      const parsed = parseWithSchema(raceJoinQueueSchema, data ?? {});
      if (!parsed.success) {
        socket.emit("race:error", "Invalid join payload");
        return;
      }

      const payload = parsed.data;

      void safelyExecute("[Race] race:join_queue", async () => {
        const authResult = await authenticateSocket(
          socket.handshake.headers.cookie,
          socket.handshake.auth as { token?: string }
        );

        if (!authResult) {
          socket.emit("race:error", "Unauthorized");
          socket.disconnect(true);
          return;
        }

        const { userId, username, isGuest } = authResult;
        const cosmetics = payload.cosmetics;
        
        // Store player info
        socketToPlayer.set(socket.id, { id: userId, username, isGuest });
        
        // 1. Check for active race rejoin (Reconnection)
        for (const [raceId, race] of activeRaces) {
          const playerIndex = race.state.players.findIndex(p => p.id === userId);
          const player = playerIndex !== -1 ? race.state.players[playerIndex] : null;
          
          // Only reconnect if:
          // - Player is in the race
          // - Race is not finished
          // - Player has not already finished their race (allow them to start a new one)
          if (player && race.state.status !== "finished" && player.finishPosition === null) {
            console.log(`[Race] Player ${username} rejoining active race ${raceId}`);
            
            // Clear disconnect timeout if any
            if (race.disconnectTimeouts.has(userId)) {
              clearTimeout(race.disconnectTimeouts.get(userId));
              race.disconnectTimeouts.delete(userId);
            }
            
            // Update socket ID
            player.socketId = socket.id;
            
            // Update mappings
            socketToRace.set(socket.id, raceId);
            socket.join(raceId);
            
            // Send current state
            socket.emit("race:start", {
              raceId,
              players: race.state.players.map(p => ({
                id: p.id,
                username: p.username,
                rating: p.rating,
                lane: p.lane,
                position: p.position,
                selectedSkin: p.selectedSkin,
                selectedTrail: p.selectedTrail,
                selectedVehicle: p.selectedVehicle,
                selectedWheel: p.selectedWheel,
              })),
              config: race.state.config,
              yourProblems: player.problems,
              obstacles: race.state.obstacles,
              drops: race.state.drops,
            });
            
            // Send sync update immediately
            socket.emit("race:state_update", {
              players: getRaceSnapshot(race.state),
            });
            
            return;
          }
        }
        
        // 1b. Check for active lobby rejoin (during countdown)
        for (const [lobbyId, lobby] of activeLobbies) {
          const playerIndex = lobby.players.findIndex(p => p.playerId === userId);
          if (playerIndex !== -1) {
            console.log(`[Race] Player ${username} rejoining lobby ${lobbyId}`);
            
            // Clear pending disconnect timeout
            const pendingTimeout = lobbyDisconnectTimeouts.get(userId);
            if (pendingTimeout) {
              clearTimeout(pendingTimeout);
              lobbyDisconnectTimeouts.delete(userId);
            }
            
            // Update socket mappings
            socketToLobby.set(socket.id, lobbyId);
            lobby.players[playerIndex].socketId = socket.id;
            socket.join(lobbyId);
            
            // Send lobby state back to the user
            socket.emit("race:lobby_joined", {
              lobbyId,
              players: lobby.players.map(p => ({
                id: p.playerId,
                username: p.username,
                rating: p.rating,
                cosmetics: p.cosmetics,
              })),
              config: lobby.config,
            });
            
            // If countdown is already running, send the current timer
            if (lobby.countdownStarted) {
              socket.emit("race:starting_soon", {
                secondsUntilStart: lobby.startCountdown,
              });
            }
            
            return;
          }
        }
        
        // 2. Regular Join Logic
        
        // Check if already in a race or lobby (by socket ID)
        if (socketToRace.has(socket.id) || socketToLobby.has(socket.id)) {
          socket.emit("race:error", "Already in a race or lobby");
          return;
        }
        
        // Check if already in queue
        if (raceQueue.has(socket.id)) {
          socket.emit("race:error", "Already in queue");
          return;
        }
        
        // Fetch rating (guests are unrated)
        const rating = isGuest ? 1000 : await getUserRating(userId);
        
        const entry: RaceMatchmakingEntry = {
          socketId: socket.id,
          playerId: userId,
          username,
          rating,
          isGuest,
          joinedAt: Date.now(),
          cosmetics,
        };
        
        // Try to find or create a lobby
        const lobby = findOrCreateLobby();
        
        if (lobby) {
          addPlayerToLobby(io, lobby, entry, socket);
        } else {
          // Add to queue
          raceQueue.set(socket.id, entry);
          socket.emit("race:queue_update", {
            playersInQueue: raceQueue.size,
            estimatedWait: 30,
          });
        }
      });
    });
    
    socket.on("race:leave_queue", () => {
      const rate = raceLeaveLimiter(socket.id);
      if (!rate.allowed) {
        socket.emit("race:error", "Too many leave requests");
        return;
      }

      void safelyExecute("[Race] race:leave_queue", () => {
        const player = socketToPlayer.get(socket.id);
        if (player) {
          const pendingTimeout = lobbyDisconnectTimeouts.get(player.id);
          if (pendingTimeout) {
            clearTimeout(pendingTimeout);
            lobbyDisconnectTimeouts.delete(player.id);
          }
        }
        
        // Remove from queue
        raceQueue.delete(socket.id);
        
        // Remove from lobby if in one
        const lobbyId = socketToLobby.get(socket.id);
        if (lobbyId) {
          // Lobby state is changing; clear any scheduled bot fallback and re-evaluate below.
          clearLobbyBotFallbackTimer(lobbyId);

          const lobby = activeLobbies.get(lobbyId);
          if (lobby) {
            lobby.players = lobby.players.filter(p => p.socketId !== socket.id);
            socket.leave(lobbyId);
            socketToLobby.delete(socket.id);
            
            // Notify other players
            const player = socketToPlayer.get(socket.id);
            if (player) {
              io.to(lobbyId).emit("race:player_left", {
                playerId: player.id,
                totalPlayers: lobby.players.length,
              });
            }
            
            // If lobby is empty, remove it
            const realPlayersLeft = getRealPlayers(lobby).length;
            if (lobby.players.length === 0 || realPlayersLeft === 0) {
              // No humans remain (or lobby truly empty) - remove the lobby entirely.
              clearLobbyBotFallbackTimer(lobbyId);
              activeLobbies.delete(lobbyId);
            } else {
              // If we dropped back to a single real player and countdown isn't running,
              // schedule bot fallback again.
              scheduleLobbyBotFallback(io, lobby);
            }
          }
        }
      });
    });

    // ========================================
    // PRIVATE ROOM HANDLERS
    // ========================================

    socket.on("race_private:create_room", (data) => {
      const rate = privateRoomLimiter(socket.id);
      if (!rate.allowed) {
        socket.emit("race_private:error", "Too many requests");
        return;
      }

      if (isPayloadTooLarge(data, MAX_PAYLOAD_BYTES)) {
        socket.emit("race_private:error", "Payload too large");
        return;
      }

      const parsed = parseWithSchema(raceJoinQueueSchema, data ?? {});
      if (!parsed.success) {
        socket.emit("race_private:error", "Invalid payload");
        return;
      }

      const cosmetics = parsed.data.cosmetics;

      void safelyExecute("[Race][Private] create_room", async () => {
        const authResult = await authenticateSocket(
          socket.handshake.headers.cookie,
          socket.handshake.auth as { token?: string }
        );

        if (!authResult) {
          socket.emit("race_private:error", "Unauthorized");
          socket.disconnect(true);
          return;
        }

        const { userId, username, isGuest } = authResult;
        socketToPlayer.set(socket.id, { id: userId, username, isGuest });

        // If already in a private room, leave it first.
        const existingRoomCode = playerToPrivateRaceRoom.get(userId);
        if (existingRoomCode) {
          const existing = privateRaceRooms.get(existingRoomCode);
          if (existing) {
            existing.players = existing.players.filter((p) => p.playerId !== userId);
            socket.leave(existing.socketRoomName);
            socketToPrivateRaceRoom.delete(socket.id);
            playerToPrivateRaceRoom.delete(userId);
            io.to(existing.socketRoomName).emit("race_private:player_left", {
              playerId: userId,
              totalPlayers: existing.players.length,
              newHostId: maybeTransferPrivateRaceHost(existing) ?? undefined,
            });
            if (existing.players.length === 0) cleanupPrivateRaceRoom(existingRoomCode);
          }
        }

        const rating = isGuest ? 1000 : await getUserRating(userId);
        let roomCode = generateRoomCode(8);
        while (privateRaceRooms.has(roomCode)) roomCode = generateRoomCode(8);

        const socketRoomName = `race_private_${roomCode}`;

        const entry: RaceMatchmakingEntry = {
          socketId: socket.id,
          playerId: userId,
          username,
          rating,
          isGuest,
          joinedAt: Date.now(),
          cosmetics,
        };

        const room: PrivateRaceRoom = {
          roomCode,
          socketRoomName,
          hostId: userId,
          players: [entry],
          config: getPrivateRaceConfig(),
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          disconnectTimeouts: new Map(),
          disconnectedPlayers: new Set(),
          cleanupTimer: null,
        };

        privateRaceRooms.set(roomCode, room);
        socketToPrivateRaceRoom.set(socket.id, roomCode);
        playerToPrivateRaceRoom.set(userId, roomCode);

        socket.join(socketRoomName);
        socket.emit("race_private:room_joined", {
          room: privateRaceSnapshot(room),
          youAreHost: true,
          joinUrl: getPrivateRaceJoinUrl(roomCode),
        });
      });
    });

    socket.on("race_private:join_room", (data) => {
      const rate = privateRoomLimiter(socket.id);
      if (!rate.allowed) {
        socket.emit("race_private:error", "Too many requests");
        return;
      }

      if (isPayloadTooLarge(data, MAX_PAYLOAD_BYTES)) {
        socket.emit("race_private:error", "Payload too large");
        return;
      }

      const parsed = parseWithSchema(racePrivateJoinSchema, data);
      if (!parsed.success) {
        socket.emit("race_private:error", "Invalid join payload");
        return;
      }

      const roomCode = parsed.data.roomCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const cosmetics = parsed.data.cosmetics;

      void safelyExecute("[Race][Private] join_room", async () => {
        const authResult = await authenticateSocket(
          socket.handshake.headers.cookie,
          socket.handshake.auth as { token?: string }
        );

        if (!authResult) {
          socket.emit("race_private:error", "Unauthorized");
          socket.disconnect(true);
          return;
        }

        const { userId, username, isGuest } = authResult;
        socketToPlayer.set(socket.id, { id: userId, username, isGuest });

        // 1) If user is mid-race, rejoin the race (works for private + public).
        for (const [raceId, race] of activeRaces) {
          const playerIndex = race.state.players.findIndex((p) => p.id === userId);
          const player = playerIndex !== -1 ? race.state.players[playerIndex] : null;
          if (player && race.state.status !== "finished" && player.finishPosition === null) {
            console.log(`[Race][Private] Player ${username} rejoining active race ${raceId}`);
            const pending = race.disconnectTimeouts.get(userId);
            if (pending) {
              clearTimeout(pending);
              race.disconnectTimeouts.delete(userId);
            }
            player.socketId = socket.id;
            socketToRace.set(socket.id, raceId);
            socket.join(raceId);

            socket.emit("race:start", {
              raceId,
              players: race.state.players.map((p) => ({
                id: p.id,
                username: p.username,
                rating: p.rating,
                lane: p.lane,
                position: p.position,
                selectedSkin: p.selectedSkin,
                selectedTrail: p.selectedTrail,
                selectedVehicle: p.selectedVehicle,
                selectedWheel: p.selectedWheel,
              })),
              config: race.state.config,
              yourProblems: player.problems,
              obstacles: race.state.obstacles,
              drops: race.state.drops,
            });

            socket.emit("race:state_update", {
              players: getRaceSnapshot(race.state),
            });

            return;
          }
        }

        const room = privateRaceRooms.get(roomCode);
        if (!room) {
          socket.emit("race_private:error", "Room not found");
          return;
        }

        room.lastActivityAt = Date.now();

        // Rejoin if already in room
        const existing = room.players.find((p) => p.playerId === userId);
        if (existing) {
          const oldSocketId = existing.socketId;
          existing.socketId = socket.id;
          existing.cosmetics = cosmetics ?? existing.cosmetics;
          socket.join(room.socketRoomName);
          socketToPrivateRaceRoom.set(socket.id, roomCode);
          playerToPrivateRaceRoom.set(userId, roomCode);
          if (oldSocketId && oldSocketId !== socket.id) socketToPrivateRaceRoom.delete(oldSocketId);

          const pending = room.disconnectTimeouts.get(userId);
          if (pending) {
            clearTimeout(pending);
            room.disconnectTimeouts.delete(userId);
          }
          room.disconnectedPlayers.delete(userId);

          socket.emit("race_private:room_joined", {
            room: privateRaceSnapshot(room),
            youAreHost: room.hostId === userId,
          });
          return;
        }

        if (room.players.length >= PRIVATE_RACE_MAX_PLAYERS) {
          socket.emit("race_private:error", "Room is full");
          return;
        }

        const rating = isGuest ? 1000 : await getUserRating(userId);
        const entry: RaceMatchmakingEntry = {
          socketId: socket.id,
          playerId: userId,
          username,
          rating,
          isGuest,
          joinedAt: Date.now(),
          cosmetics,
        };

        room.players.push(entry);
        socket.join(room.socketRoomName);
        socketToPrivateRaceRoom.set(socket.id, roomCode);
        playerToPrivateRaceRoom.set(userId, roomCode);

        socket.emit("race_private:room_joined", {
          room: privateRaceSnapshot(room),
          youAreHost: false,
        });

        socket.to(room.socketRoomName).emit("race_private:player_joined", {
          player: { id: entry.playerId, username: entry.username, rating: entry.rating, cosmetics: entry.cosmetics },
          totalPlayers: room.players.length,
        });
      });
    });

    socket.on("race_private:leave_room", () => {
      const rate = privateRoomLimiter(socket.id);
      if (!rate.allowed) {
        socket.emit("race_private:error", "Too many requests");
        return;
      }

      void safelyExecute("[Race][Private] leave_room", () => {
        const player = socketToPlayer.get(socket.id);
        if (!player) return;

        const roomCode = socketToPrivateRaceRoom.get(socket.id) ?? playerToPrivateRaceRoom.get(player.id);
        if (!roomCode) return;

        const room = privateRaceRooms.get(roomCode);
        if (!room) return;

        room.players = room.players.filter((p) => p.playerId !== player.id);
        socket.leave(room.socketRoomName);
        socketToPrivateRaceRoom.delete(socket.id);
        playerToPrivateRaceRoom.delete(player.id);

        const newHostId = maybeTransferPrivateRaceHost(room) ?? undefined;
        io.to(room.socketRoomName).emit("race_private:player_left", {
          playerId: player.id,
          totalPlayers: room.players.length,
          newHostId,
        });

        if (room.players.length === 0) {
          cleanupPrivateRaceRoom(roomCode);
        }
      });
    });

    socket.on("race_private:start_race", () => {
      const rate = privateRoomLimiter(socket.id);
      if (!rate.allowed) {
        socket.emit("race_private:error", "Too many requests");
        return;
      }

      void safelyExecute("[Race][Private] start_race", async () => {
        const player = socketToPlayer.get(socket.id);
        if (!player) return;

        const roomCode = socketToPrivateRaceRoom.get(socket.id) ?? playerToPrivateRaceRoom.get(player.id);
        if (!roomCode) {
          socket.emit("race_private:error", "Not in a room");
          return;
        }

        const room = privateRaceRooms.get(roomCode);
        if (!room) return;

        if (room.hostId !== player.id) {
          socket.emit("race_private:error", "Only host can start");
          return;
        }

        if (room.players.length < 2) {
          socket.emit("race_private:error", "Need at least 2 players");
          return;
        }

        room.lastActivityAt = Date.now();

        await startPrivateRace(io, room);
      });
    });
    
    // ========================================
    // GAME ACTION HANDLERS
    // ========================================
    
    socket.on("race:submit_answer", (data) => {
      const rate = raceActionLimiter(socket.id);
      if (!rate.allowed) {
        socket.emit("race:error", "Action rate limited");
        return;
      }

      if (isPayloadTooLarge(data, MAX_PAYLOAD_BYTES)) {
        socket.emit("race:error", "Payload too large");
        return;
      }

      const parsed = parseWithSchema(raceSubmitSchema, data);
      if (!parsed.success) {
        socket.emit("race:error", "Invalid action payload");
        return;
      }

      const { action, answer, problemId } = parsed.data;

      void safelyExecute("[Race] race:submit_answer", async () => {
        const raceId = socketToRace.get(socket.id);
        if (!raceId) {
          socket.emit("race:error", "Not in a race");
          return;
        }
        
        const race = activeRaces.get(raceId);
        if (!race || race.state.status !== "racing") {
          socket.emit("race:error", "Race not in progress");
          return;
        }
        
        const player = socketToPlayer.get(socket.id);
        if (!player) {
          socket.emit("race:error", "Player not found");
          return;
        }
        
        // Process the action
        const { newState, result } = processAction(
          race.state,
          player.id,
          action,
          answer,
          problemId
        );
        
        race.state = newState;
        
        if (result.success) {
          // Get the player's new problems (only if they haven't finished)
          const racePlayer = race.state.players.find(p => p.id === player.id);
          const hasFinished = racePlayer?.finishPosition !== null;
          
          // Emit result to the acting player
          socket.emit("race:action_result", {
            playerId: player.id,
            action,
            success: true,
            newLane: result.newLane,
            newPosition: result.newPosition,
            bumpedPlayerId: result.bumpedPlayerId,
            bumpedPlayerNewPosition: result.bumpedPlayerNewPosition,
            yourNewProblems: hasFinished ? null : racePlayer?.problems,
          });
          
          // Broadcast to other players
          socket.to(raceId).emit("race:action_result", {
            playerId: player.id,
            action,
            success: true,
            newLane: result.newLane,
            newPosition: result.newPosition,
            bumpedPlayerId: result.bumpedPlayerId,
            bumpedPlayerNewPosition: result.bumpedPlayerNewPosition,
          });
          
          // If there was a bump, notify the bumped player
          if (result.bumpedPlayerId) {
            const bumpedPlayer = race.state.players.find(p => p.id === result.bumpedPlayerId);
            if (bumpedPlayer) {
              io.to(raceId).emit("race:player_bumped", {
                bumperId: player.id,
                victimId: result.bumpedPlayerId,
                victimNewPosition: result.bumpedPlayerNewPosition!,
                victimNewLane: bumpedPlayer.lane,
                stunDuration: race.state.config.stunDuration,
              });
              
              // Send new problems to bumped player
              const bumpedSocket = io.sockets.sockets.get(bumpedPlayer.socketId);
              if (bumpedSocket) {
                bumpedPlayer.problems = generatePlayerProblems(
                  bumpedPlayer.lane,
                  race.state.config
                );
                
                bumpedSocket.emit("race:action_result", {
                  playerId: bumpedPlayer.id,
                  action: "forward", // Dummy action type for client update
                  success: true,
                  newLane: bumpedPlayer.lane,
                  newPosition: bumpedPlayer.position,
                  yourNewProblems: bumpedPlayer.problems,
                });
              }
            }
          }
          
          // If player hit an obstacle
          if (result.obstacleHit) {
            io.to(raceId).emit("race:obstacle_hit", {
              playerId: player.id,
              obstacleId: "", 
              obstacleType: result.obstacleHit.type,
              stunDuration: result.obstacleHit.stunDuration,
              pushback: 0, 
            });
          }
          
          // If player collected a drop
          if (result.dropCollected) {
            const racePlayerAfter = race.state.players.find(p => p.id === player.id);
            io.to(raceId).emit("race:drop_collected", {
              playerId: player.id,
              dropId: result.dropCollected.dropId,
              dropType: result.dropCollected.type,
              effectDuration: result.dropCollected.effectDuration,
              coinValue: result.dropCollected.coinValue,
              coinsEarnedTotal: racePlayerAfter?.coinsEarned,
            });
            
            io.to(raceId).emit("race:drops_update", {
              drops: race.state.drops,
            });
            
            if (result.dropCollected.type !== "coin") {
              socket.emit("race:powerup_activated", {
                playerId: player.id,
                powerupType: result.dropCollected.type,
                duration: result.dropCollected.effectDuration,
              });
            }
          }
          
          // Check for finish
          if (result.finished && result.finishPosition) {
            io.to(raceId).emit("race:player_finished", {
              playerId: player.id,
              position: result.finishPosition,
              time: race.state.players.find(p => p.id === player.id)?.finishTime || 0,
            });
            
            if (checkRaceOver(race.state)) {
              if (race.gameLoop) {
                clearInterval(race.gameLoop);
                race.gameLoop = null;
              }
              endRace(io, raceId);
            }
            
            // Save finish event
            if (race.dbRaceId) {
              db.raceEvent.create({
                data: {
                  raceId: race.dbRaceId,
                  playerId: player.id,
                  eventType: "finish",
                  details: { position: result.finishPosition },
                },
              }).catch(err => console.error("[Race] Failed to save finish event:", err));
            }
          }
          
          // Save action event
          if (race.dbRaceId) {
            const racePlayerObj = race.state.players.find(p => p.id === player.id);
            const problem = racePlayerObj?.problems[action === "forward" ? "forward" : action === "boost" ? "boost" : action === "left" ? "left" : "right"];
            
            db.raceEvent.create({
              data: {
                raceId: race.dbRaceId,
                playerId: player.id,
                eventType: result.bumpedPlayerId ? "bump" : action === "boost" ? "boost" : action === "forward" ? "move_forward" : "lane_change",
                details: {
                  action,
                  newLane: result.newLane,
                  newPosition: result.newPosition,
                  bumpedPlayerId: result.bumpedPlayerId,
                },
                operandA: problem?.a,
                operandB: problem?.b,
                operation: problem?.operation,
                correctAnswer: problem?.answer,
                userAnswer: answer,
              },
            }).catch(err => console.error("[Race] Failed to save action event:", err));
          }
        } else {
          // Handle errors
          const errorType = result.error;
          
          if (errorType === "Player already finished") {
            console.log(`[Race] Player ${player.id} already finished, ignoring action`);
          } else if (errorType === "Player is stunned") {
            socket.emit("race:error", "You are stunned!");
          } else if (errorType === "Problem mismatch") {
            console.log(`[Race] Problem mismatch for player ${player.id}, sending fresh problems`);
            const racePlayer = race.state.players.find(p => p.id === player.id);
            if (racePlayer) {
              socket.emit("race:action_result", {
                playerId: player.id,
                action,
                success: false,
                newLane: racePlayer.lane,
                newPosition: racePlayer.position,
                yourNewProblems: racePlayer.problems,
              });
            }
          } else if (errorType === "Wrong answer") {
            socket.emit("race:wrong_answer", {
              playerId: player.id,
              action,
              cooldownMs: race.state.config.wrongAnswerPenalty,
            });
          } else {
            socket.emit("race:error", errorType || "Invalid action");
          }
        }
      });
    });
    
    socket.on("race:forfeit", () => {
      const rate = raceForfeitLimiter(socket.id);
      if (!rate.allowed) {
        socket.emit("race:error", "Too many forfeits");
        return;
      }

      void safelyExecute("[Race] race:forfeit", () => {
        const raceId = socketToRace.get(socket.id);
        if (!raceId) return;
        
        const race = activeRaces.get(raceId);
        if (!race) return;
        
        const player = socketToPlayer.get(socket.id);
        if (!player) return;
        
        // Mark player as DNF
        race.state = handlePlayerDisconnect(race.state, player.id);
        
        // Get the player's finish position after forfeit
        const racePlayer = race.state.players.find(p => p.id === player.id);
        const finishPosition = racePlayer?.finishPosition || race.state.players.length;
        
        // Notify the forfeiting player of their finish
        socket.emit("race:player_finished", {
          playerId: player.id,
          position: finishPosition,
          time: 0, // DNF
        });
        
        // Notify other players that this player forfeited
        socket.to(raceId).emit("race:player_finished", {
          playerId: player.id,
          position: finishPosition,
          time: 0, // DNF
        });
        
        // Check if race is over
        if (checkRaceOver(race.state)) {
          // End race - this will send results to all players including the forfeiter
          endRace(io, raceId);
        }
        
        // Don't remove the player from the room yet - they need to receive race:finished
        // The cleanup will happen in cleanupRace after the race ends
        // Just mark that they've forfeited by keeping them in the room but with finishPosition set
      });
    });
    
    socket.on("race:leave", () => {
      void safelyExecute("[Race] race:leave", () => {
        // Clean up all mappings
        raceQueue.delete(socket.id);
        
        const lobbyId = socketToLobby.get(socket.id);
        if (lobbyId) {
          socket.leave(lobbyId);
          socketToLobby.delete(socket.id);
        }
        
        const raceId = socketToRace.get(socket.id);
        if (raceId) {
          socket.leave(raceId);
          socketToRace.delete(socket.id);
        }
      });
    });
    
    // ========================================
    // DISCONNECT HANDLER
    // ========================================
    
    socket.on("disconnect", (reason) => {
      void safelyExecute("[Race] disconnect", () => {
        console.log(`[Race] Client disconnected: ${socket.id} reason=${reason}`);
        
        // Remove from queue
        raceQueue.delete(socket.id);

        // Handle PRIVATE lobby disconnect (grace window)
        const privateRoomCode = socketToPrivateRaceRoom.get(socket.id);
        const privatePlayer = socketToPlayer.get(socket.id);
        if (privateRoomCode && privatePlayer) {
          const room = privateRaceRooms.get(privateRoomCode);
          if (room) {
            room.disconnectedPlayers.add(privatePlayer.id);
            const existingTimeout = room.disconnectTimeouts.get(privatePlayer.id);
            if (existingTimeout) clearTimeout(existingTimeout);

            const timeout = setTimeout(() => {
              const current = privateRaceRooms.get(privateRoomCode);
              if (!current) return;
              if (!current.disconnectedPlayers.has(privatePlayer.id)) return;

              current.players = current.players.filter((p) => p.playerId !== privatePlayer.id);
              current.disconnectedPlayers.delete(privatePlayer.id);
              current.disconnectTimeouts.delete(privatePlayer.id);
              playerToPrivateRaceRoom.delete(privatePlayer.id);

              const newHostId = maybeTransferPrivateRaceHost(current) ?? undefined;
              io.to(current.socketRoomName).emit("race_private:player_left", {
                playerId: privatePlayer.id,
                totalPlayers: current.players.length,
                newHostId,
              });

              if (current.players.length === 0) cleanupPrivateRaceRoom(privateRoomCode);
            }, PRIVATE_RACE_LOBBY_DISCONNECT_GRACE_MS);

            room.disconnectTimeouts.set(privatePlayer.id, timeout);
          }
        }
        
        // Handle lobby disconnect
        const lobbyId = socketToLobby.get(socket.id);
        const player = socketToPlayer.get(socket.id);
        if (lobbyId) {
          // Lobby state is changing; clear any scheduled bot fallback and re-evaluate below.
          clearLobbyBotFallbackTimer(lobbyId);

          const lobby = activeLobbies.get(lobbyId);
          if (lobby && player) {
            // Give the player time to reconnect before removing them
            const existingTimeout = lobbyDisconnectTimeouts.get(player.id);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }
            
            const timeout = setTimeout(() => {
              const currentLobby = activeLobbies.get(lobbyId);
              if (!currentLobby) return;
              
              currentLobby.players = currentLobby.players.filter(p => p.playerId !== player.id);
              
              io.to(lobbyId).emit("race:player_left", {
                playerId: player.id,
                totalPlayers: currentLobby.players.length,
              });
              
              const realPlayersLeft = getRealPlayers(currentLobby).length;
              if (currentLobby.players.length === 0 || realPlayersLeft === 0) {
                clearLobbyBotFallbackTimer(lobbyId);
                activeLobbies.delete(lobbyId);
              } else {
                scheduleLobbyBotFallback(io, currentLobby);
              }
              
              lobbyDisconnectTimeouts.delete(player.id);
            }, LOBBY_DISCONNECT_GRACE_PERIOD_MS);
            
            lobbyDisconnectTimeouts.set(player.id, timeout);
          } else if (lobby) {
            // Fallback: remove immediately if we don't know the player
            lobby.players = lobby.players.filter(p => p.socketId !== socket.id);
            const realPlayersLeft = getRealPlayers(lobby).length;
            if (lobby.players.length === 0 || realPlayersLeft === 0) {
              clearLobbyBotFallbackTimer(lobbyId);
              activeLobbies.delete(lobbyId);
            } else {
              scheduleLobbyBotFallback(io, lobby);
            }
          }
          
          socketToLobby.delete(socket.id);
        }
        
        // Handle race disconnect
        const raceId = socketToRace.get(socket.id);
        if (raceId) {
          const race = activeRaces.get(raceId);
          const player = socketToPlayer.get(socket.id);
          
          if (race && player && race.state.status === "racing") {
            // Instead of immediate DNF, wait for grace period
            console.log(`[Race] Player ${player.username} disconnected from race ${raceId}, waiting for reconnect...`);
            
            const timeout = setTimeout(() => {
              if (race.state.status === "finished") return;
              
              console.log(`[Race] Player ${player.username} timed out, marking DNF`);
              race.state = handlePlayerDisconnect(race.state, player.id);
              io.to(raceId).emit("race:player_disconnected", { playerId: player.id });
              
              race.disconnectTimeouts.delete(player.id);
              
              if (checkRaceOver(race.state)) {
                endRace(io, raceId);
              }
            }, DISCONNECT_GRACE_PERIOD_MS);
            
            race.disconnectTimeouts.set(player.id, timeout);
          }
          
          socketToRace.delete(socket.id);
        }
        
        // Clean up player mapping
        socketToPrivateRaceRoom.delete(socket.id);
        socketToPlayer.delete(socket.id);
      });
    });
  });
  
  // Periodic queue processing
  setInterval(() => {
    for (const [socketId, entry] of raceQueue) {
      const socket = io.sockets.sockets.get(socketId);
      if (!socket) {
        raceQueue.delete(socketId);
        continue;
      }
      
      const lobby = findOrCreateLobby();
      if (lobby) {
        raceQueue.delete(socketId);
        addPlayerToLobby(io, lobby, entry, socket as RaceSocket);
      }
    }
  }, 2000);

  // Private room cleanup loop (idle TTL)
  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of privateRaceRooms.entries()) {
      if (now - room.lastActivityAt > PRIVATE_RACE_IDLE_TTL_MS) {
        console.log(`[Race][Private] Cleaning idle room ${code}`);
        cleanupPrivateRaceRoom(code);
      }
    }
  }, 60_000);
}
