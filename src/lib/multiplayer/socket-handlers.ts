import { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";
import { z } from "zod";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  MatchmakingEntry,
  GameState,
  Player,
  GameConfig,
} from "./types";
import {
  createGameState,
  startNewRound,
  processRoundEnd,
  checkGameOver,
  calculateRatingChange,
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
// SERVER STATE
// ============================================

// Matchmaking queue
const matchmakingQueue: Map<string, MatchmakingEntry> = new Map();

// Active games
const activeGames: Map<string, {
  gameState: GameState;
  config: GameConfig;
  answers: Map<string, { answer: number; timeMs: number }>;
  roundTimer: NodeJS.Timeout | null;
  dbMatchId: string | null; // Database record ID
  isRated: boolean;
  bot?: { id: string; answerTimer: NodeJS.Timeout | null };
  disconnectTimeouts: Map<string, NodeJS.Timeout>; // playerId -> timeout
  disconnectedPlayers: Set<string>; // playerId set while in grace window
}> = new Map();

// Socket to room mapping
const socketToRoom: Map<string, string> = new Map();

// Socket to player mapping
const socketToPlayer: Map<string, { id: string; username: string; isGuest: boolean }> = new Map();

// Player to room mapping (persists across reconnects)
const playerToRoom: Map<string, string> = new Map();

// Fallback timers for bot matchmaking (per socket)
const botFallbackTimers: Map<string, NodeJS.Timeout> = new Map();

function clearBotFallbackTimer(socketId: string) {
  const timer = botFallbackTimers.get(socketId);
  if (timer) clearTimeout(timer);
  botFallbackTimers.delete(socketId);
}

// ============================================
// CONFIGURATION
// ============================================

// Give clients a short window to reconnect before treating it as a loss.
// This mirrors the racing mode reconnect grace logic.
const DISCONNECT_GRACE_PERIOD_MS = 10_000;

// ============================================
// GUARDRAILS
// ============================================

const MAX_PAYLOAD_BYTES = 4096;
const QUICK_CHAT_MAX_LENGTH = 240;

const matchmakingJoinLimiter = createRateLimiter({ limit: 4, windowMs: 10_000 });
const matchmakingLeaveLimiter = createRateLimiter({ limit: 6, windowMs: 10_000 });
const submitAnswerLimiter = createRateLimiter({ limit: 20, windowMs: 10_000 }); // ~2/s
const quickChatLimiter = createRateLimiter({ limit: 5, windowMs: 10_000 });
const forfeitLimiter = createRateLimiter({ limit: 3, windowMs: 15_000 });

const submitAnswerSchema = z.object({
  answer: z
    .number()
    .finite()
    .min(-1_000_000)
    .max(1_000_000),
  timeMs: z.number().int().min(0).max(120_000),
});

const quickChatSchema = z
  .string()
  .trim()
  .min(1, "Message is required")
  .max(QUICK_CHAT_MAX_LENGTH, "Message too long");

// Helper to get user rating from database
async function getUserRating(userId: string): Promise<number> {
  try {
    const userStats = await db.userStats.findUnique({
      where: { userId },
      select: { rating: true },
    });
    return userStats?.rating ?? 1000;
  } catch (error) {
    console.error(`Failed to fetch rating for user ${userId}:`, error);
    return 1000;
  }
}

// ============================================
// MATCHMAKING
// ============================================

function findMatch(entry: MatchmakingEntry): MatchmakingEntry | null {
  const RATING_RANGE = 200; // Match within 200 rating points
  const WAIT_TIME_EXPANSION = 50; // Expand range by 50 per second waited
  
  const waitTime = (Date.now() - entry.joinedAt) / 1000;
  const expandedRange = RATING_RANGE + waitTime * WAIT_TIME_EXPANSION;

  for (const [socketId, candidate] of matchmakingQueue) {
    if (socketId === entry.socketId) continue;
    
    const ratingDiff = Math.abs(entry.rating - candidate.rating);
    if (ratingDiff <= expandedRange) {
      return candidate;
    }
  }

  return null;
}

async function createMatch(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  player1Entry: MatchmakingEntry,
  player2Entry: MatchmakingEntry
) {
  // If either player had a bot fallback scheduled, cancel it now.
  clearBotFallbackTimer(player1Entry.socketId);
  clearBotFallbackTimer(player2Entry.socketId);

  const roomId = `game_${randomUUID()}`;
  const isRated = !player1Entry.isGuest && !player2Entry.isGuest;
  
  const player1: Player = {
    id: player1Entry.playerId,
    socketId: player1Entry.socketId,
    username: player1Entry.username,
    rating: player1Entry.rating,
    isGuest: player1Entry.isGuest,
  };
  
  const player2: Player = {
    id: player2Entry.playerId,
    socketId: player2Entry.socketId,
    username: player2Entry.username,
    rating: player2Entry.rating,
    isGuest: player2Entry.isGuest,
  };

  const config: GameConfig = {
    rounds: 10,
    timePerRound: 10000, // 10 seconds
    difficulty: "medium",
    operations: ["+", "-", "×", "÷"],
  };

  const gameState = createGameState(roomId, player1, player2, config);

  // Remove from queue
  matchmakingQueue.delete(player1Entry.socketId);
  matchmakingQueue.delete(player2Entry.socketId);

  // Join socket room
  const socket1 = io.sockets.sockets.get(player1Entry.socketId);
  const socket2 = io.sockets.sockets.get(player2Entry.socketId);

  if (!socket1 || !socket2) {
    console.error("Sockets not found for matched players");
    return;
  }

  socket1.join(roomId);
  socket2.join(roomId);

  socketToRoom.set(player1Entry.socketId, roomId);
  socketToRoom.set(player2Entry.socketId, roomId);

  // Create match in database
  let dbMatchId: string | null = null;
  if (isRated) {
    try {
      const dbMatch = await db.multiplayerMatch.create({
        data: {
          player1Id: player1.id,
          player2Id: player2.id,
          player1RatingBefore: player1.rating,
          player2RatingBefore: player2.rating,
          totalRounds: config.rounds,
          difficulty: config.difficulty,
          status: "in_progress",
        },
      });
      dbMatchId = dbMatch.id;
      console.log(`Created match in database: ${dbMatchId}`);
    } catch (error) {
      console.error("Failed to create match in database:", error);
    }
  }

  // Store game
  activeGames.set(roomId, {
    gameState,
    config,
    answers: new Map(),
    roundTimer: null,
    dbMatchId,
    isRated,
    disconnectTimeouts: new Map(),
    disconnectedPlayers: new Set(),
  });

  // Track players by userId so they can rejoin after reconnects.
  playerToRoom.set(player1.id, roomId);
  playerToRoom.set(player2.id, roomId);

  // Notify players
  socket1.emit("matchmaking:found", {
    opponent: { id: player2.id, username: player2.username, rating: player2.rating, isGuest: player2.isGuest },
  });
  socket2.emit("matchmaking:found", {
    opponent: { id: player1.id, username: player1.username, rating: player1.rating, isGuest: player1.isGuest },
  });

  // Start countdown after brief delay
  setTimeout(() => {
    startGameCountdown(io, roomId);
  }, 1000);
}

async function createBotMatch(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  playerEntry: MatchmakingEntry
) {
  // Cancel any pending fallback (defensive)
  clearBotFallbackTimer(playerEntry.socketId);

  const roomId = `game_${randomUUID()}`;

  const botId = `bot_${randomUUID()}`;
  const botUsername = `Guest ${Math.floor(1000 + Math.random() * 9000)}`;

  const human: Player = {
    id: playerEntry.playerId,
    socketId: playerEntry.socketId,
    username: playerEntry.username,
    rating: playerEntry.rating,
    isGuest: playerEntry.isGuest,
  };

  const bot: Player = {
    id: botId,
    socketId: "bot",
    username: botUsername,
    rating: 1000,
    isGuest: true,
  };

  const config: GameConfig = {
    rounds: 10,
    timePerRound: 10000,
    difficulty: "medium",
    operations: ["+", "-", "×", "÷"],
  };

  const gameState = createGameState(roomId, human, bot, config);

  // Ensure removed from queue (defensive; caller may have removed already)
  matchmakingQueue.delete(playerEntry.socketId);

  // Join human socket room
  const socket = io.sockets.sockets.get(playerEntry.socketId);
  if (!socket) {
    console.error("Socket not found for bot match player");
    return;
  }

  socket.join(roomId);
  socketToRoom.set(playerEntry.socketId, roomId);

  // Store game (unrated by design)
  activeGames.set(roomId, {
    gameState,
    config,
    answers: new Map(),
    roundTimer: null,
    dbMatchId: null,
    isRated: false,
    bot: { id: botId, answerTimer: null },
    disconnectTimeouts: new Map(),
    disconnectedPlayers: new Set(),
  });

  // Track the human so they can rejoin after reconnects.
  playerToRoom.set(human.id, roomId);

  // Notify human player
  socket.emit("matchmaking:found", {
    opponent: { id: bot.id, username: bot.username, rating: bot.rating, isGuest: true },
  });

  // Start countdown after brief delay
  setTimeout(() => {
    startGameCountdown(io, roomId);
  }, 1000);
}

function startGameCountdown(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  roomId: string
) {
  const game = activeGames.get(roomId);
  if (!game) return;

  game.gameState.status = "countdown";
  
  let countdown = 3;
  
  const countdownInterval = setInterval(() => {
    io.to(roomId).emit("game:countdown", { seconds: countdown });
    
    countdown--;
    
    if (countdown < 0) {
      clearInterval(countdownInterval);
      startRound(io, roomId);
    }
  }, 1000);
}

function startRound(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  roomId: string
) {
  const game = activeGames.get(roomId);
  if (!game) return;

  // Clear any previous bot answer timer before starting a new round
  if (game.bot?.answerTimer) {
    clearTimeout(game.bot.answerTimer);
    game.bot.answerTimer = null;
  }

  // Clear previous answers
  game.answers.clear();

  // Start new round
  game.gameState = startNewRound(
    game.gameState,
    game.config.difficulty,
    game.config.operations
  );

  // Emit to both players
  io.to(roomId).emit("game:new_round", {
    round: game.gameState.currentRound,
    problem: game.gameState.currentProblem!,
  });

  // If this is a bot match, schedule the bot's answer server-side.
  if (game.bot) {
    const problem = game.gameState.currentProblem;
    const botId = game.bot.id;
    if (problem) {
      // Medium strength: usually answers correctly, sometimes wrong, sometimes no-answer.
      const roll = Math.random();
      const willAnswer = roll >= 0.05; // 5% no-answer
      const willBeCorrect = roll < 0.80; // 75% correct (since 5% no-answer)

      const opDelayBonusMs = problem.operation === "÷" || problem.operation === "×" ? 450 : 150;
      const rawDelayMs = Math.floor(700 + Math.random() * 2600 + opDelayBonusMs); // ~850ms–~3750ms
      const delayMs = Math.min(game.config.timePerRound - 250, Math.max(350, rawDelayMs));

      if (willAnswer) {
        const correctAnswer = problem.answer;
        const wrongOffsets = [-3, -2, -1, 1, 2, 3, 4, -4];
        const wrongAnswer = correctAnswer + wrongOffsets[Math.floor(Math.random() * wrongOffsets.length)];
        const chosenAnswer = willBeCorrect ? correctAnswer : wrongAnswer;

        game.bot.answerTimer = setTimeout(() => {
          const liveGame = activeGames.get(roomId);
          if (!liveGame) return;
          if (!liveGame.bot) return;
          if (liveGame.bot.id !== botId) return;
          if (liveGame.gameState.status !== "playing") return;

          // Don't answer twice
          if (liveGame.answers.has(botId)) return;

          liveGame.answers.set(botId, { answer: chosenAnswer, timeMs: delayMs });

          // Let the human client know the opponent answered
          io.to(roomId).emit("game:opponent_answered");

          // End the round early if both answered
          if (liveGame.answers.size === 2) {
            endRound(io, roomId);
          }
        }, delayMs);
      }
    }
  }

  // Set round timer
  game.roundTimer = setTimeout(() => {
    endRound(io, roomId);
  }, game.config.timePerRound);
}

async function endRound(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  roomId: string
) {
  const game = activeGames.get(roomId);
  if (!game) return;

  // Always clear any pending bot answer timer when a round is ending.
  if (game.bot?.answerTimer) {
    clearTimeout(game.bot.answerTimer);
    game.bot.answerTimer = null;
  }

  // Prevent processing if game is not playing (avoid double processing)
  if (game.gameState.status !== "playing") {
    console.log(`[EndRound] Skipping endRound for ${roomId} - Status is ${game.gameState.status}`);
    return;
  }

  try {
    // Clear timer
    if (game.roundTimer) {
      clearTimeout(game.roundTimer);
      game.roundTimer = null;
    }

    // Process round results
    const { newState, result } = processRoundEnd(game.gameState, game.answers);
    game.gameState = newState;

    // Save round to database
    if (game.dbMatchId && game.gameState.currentProblem) {
      const player1 = game.gameState.players[0];
      const player2 = game.gameState.players[1];
      const player1Answer = game.answers.get(player1.id);
      const player2Answer = game.answers.get(player2.id);

      try {
        await db.matchRound.create({
          data: {
            matchId: game.dbMatchId,
            roundNumber: game.gameState.currentRound,
            operandA: game.gameState.currentProblem.a,
            operandB: game.gameState.currentProblem.b,
            operation: game.gameState.currentProblem.operation,
            correctAnswer: result.correctAnswer,
            player1Answer: player1Answer?.answer ?? null,
            player2Answer: player2Answer?.answer ?? null,
            player1TimeMs: player1Answer?.timeMs ?? null,
            player2TimeMs: player2Answer?.timeMs ?? null,
            winnerId: result.winnerId,
          },
        });
      } catch (error) {
        console.error("Failed to save round to database:", error);
      }
    }

    // Send results to each player with their specific time
    for (const player of game.gameState.players) {
      const socket = io.sockets.sockets.get(player.socketId);
      if (socket) {
        const otherPlayer = game.gameState.players.find(p => p.id !== player.id)!;
        socket.emit("game:round_result", {
          winnerId: result.winnerId,
          correctAnswer: result.correctAnswer,
          scores: result.scores,
          yourTime: result.playerTimes[player.id],
          opponentTime: result.playerTimes[otherPlayer.id],
        });
      }
    }

    // Check if game is over
    const { isOver, winnerId } = checkGameOver(game.gameState);
    
    if (isOver) {
      endGame(io, roomId, winnerId);
    } else {
      // Start next round after delay
      setTimeout(() => {
        startRound(io, roomId);
      }, 2000);
    }
  } catch (error) {
    console.error(`[EndRound] Error in endRound for ${roomId}:`, error);
    // Force end game on error to prevent stuck state
    endGame(io, roomId, null, "disconnected"); // Treat as disconnect/aborted
  }
}

async function endGame(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  roomId: string,
  winnerId: string | null,
  status: "completed" | "forfeit" | "disconnected" = "completed",
  forfeitedBy?: string
) {
  console.log(`[EndGame] Ending game ${roomId}, Winner: ${winnerId}`);
  const game = activeGames.get(roomId);
  if (!game) {
    console.log(`[EndGame] Game ${roomId} not found`);
    return;
  }

  // Stop any pending bot actions immediately.
  if (game.bot?.answerTimer) {
    clearTimeout(game.bot.answerTimer);
    game.bot.answerTimer = null;
  }

  // Clear any pending disconnect grace timers for this game.
  for (const timeout of game.disconnectTimeouts.values()) {
    clearTimeout(timeout);
  }
  game.disconnectTimeouts.clear();
  game.disconnectedPlayers.clear();

  game.gameState.status = "game_over";
  game.gameState.winner = winnerId;

  const player1 = game.gameState.players[0];
  const player2 = game.gameState.players[1];

  // Calculate rating changes
  const ratingChanges: Record<string, number> = {
    [player1.id]: 0,
    [player2.id]: 0,
  };

  if (game.isRated) {
    if (winnerId) {
      const winner = game.gameState.players.find(p => p.id === winnerId)!;
      const loser = game.gameState.players.find(p => p.id !== winnerId)!;
      const { winnerChange, loserChange } = calculateRatingChange(winner.rating, loser.rating);
      ratingChanges[winner.id] = winnerChange;
      ratingChanges[loser.id] = loserChange;
    } else {
      // Draw
      const { winnerChange, loserChange } = calculateRatingChange(player1.rating, player2.rating, true);
      ratingChanges[player1.id] = winnerChange;
      ratingChanges[player2.id] = loserChange;
    }
  }

  // Save match result to database
  if (game.dbMatchId) {
    try {
      await db.multiplayerMatch.update({
        where: { id: game.dbMatchId },
        data: {
          player1Score: game.gameState.scores[player1.id] || 0,
          player2Score: game.gameState.scores[player2.id] || 0,
          winnerId: winnerId,
          isDraw: winnerId === null,
          player1RatingChange: ratingChanges[player1.id] || 0,
          player2RatingChange: ratingChanges[player2.id] || 0,
          status: status,
          forfeitedBy: forfeitedBy,
          completedAt: new Date(),
        },
      });
      console.log(`Updated match ${game.dbMatchId} in database`);

      // Update player ratings in UserStats
      const updateRating = async (userId: string, ratingChange: number) => {
        try {
          // First try to update existing stats
          const updated = await db.userStats.updateMany({
            where: { userId },
            data: { rating: { increment: ratingChange } },
          });
          
          // If no stats exist, create them with the rating change
          if (updated.count === 0) {
            await db.userStats.create({
              data: { 
                userId, 
                rating: 1000 + ratingChange 
              },
            });
          }
        } catch (error) {
          console.error(`Failed to update rating for user ${userId}:`, error);
        }
      };

      await Promise.all([
        updateRating(player1.id, ratingChanges[player1.id] || 0),
        updateRating(player2.id, ratingChanges[player2.id] || 0),
      ]);
      console.log("Updated player ratings in database");
    } catch (error) {
      console.error("Failed to save match result to database:", error);
    }
  }

  // Send game over to each player
  for (const player of game.gameState.players) {
    const socket = io.sockets.sockets.get(player.socketId);
    if (socket) {
      socket.emit("game:over", {
        winnerId,
        finalScores: game.gameState.scores,
        ratingChange: ratingChanges[player.id] || 0,
      });
      // Leave the socket room
      socket.leave(roomId);
    }
    // Clear socket-to-room mapping immediately so players can rejoin matchmaking
    console.log(`[EndGame] Removing socket ${player.socketId} from room ${roomId}`);
    socketToRoom.delete(player.socketId);
    playerToRoom.delete(player.id);
  }

  // Clean up game data after delay
  setTimeout(() => {
    const existingGame = activeGames.get(roomId);
    if (existingGame && existingGame.gameState.status === "game_over") {
      cleanupGame(roomId);
    }
  }, 5000); // Clean up game data after 5 seconds
}

function cleanupGame(roomId: string) {
  const game = activeGames.get(roomId);
  if (!game) return;

  // Clear timer
  if (game.roundTimer) {
    clearTimeout(game.roundTimer);
  }

  if (game.bot?.answerTimer) {
    clearTimeout(game.bot.answerTimer);
  }

  for (const timeout of game.disconnectTimeouts.values()) {
    clearTimeout(timeout);
  }

  // Remove game data
  activeGames.delete(roomId);
}

// ============================================
// SOCKET HANDLER SETUP
// ============================================

export function setupMultiplayerHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
) {
  // Broadcast online count every 5 seconds
  setInterval(() => {
    const count = io.sockets.sockets.size;
    io.emit("online_count", count);
  }, 5000);

  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
    console.log(`Client connected: ${socket.id}`);

    // Emit initial online count
    socket.emit("online_count", io.sockets.sockets.size);

    // ============================================
    // MATCHMAKING HANDLERS
    // ============================================

    socket.on("matchmaking:join", () => {
      const rate = matchmakingJoinLimiter(socket.id);
      if (!rate.allowed) {
        socket.emit("matchmaking:error", "Too many matchmaking requests");
        return;
      }

      void safelyExecute("[Multiplayer] matchmaking:join", async () => {
        const authResult = await authenticateSocket(
          socket.handshake.headers.cookie,
          socket.handshake.auth as { token?: string }
        );

        if (!authResult) {
          socket.emit("matchmaking:error", "Unauthorized");
          socket.disconnect(true);
          return;
        }

        const { userId, username, isGuest } = authResult;

        // Store player info
        socketToPlayer.set(socket.id, { id: userId, username, isGuest });

        // Rejoin flow: if this user was in an active game and got disconnected,
        // put them back into their room instead of starting a new matchmaking search.
        const existingRoomIdByPlayer = playerToRoom.get(userId);
        if (existingRoomIdByPlayer) {
          const existingGame = activeGames.get(existingRoomIdByPlayer);
          const isGameOver =
            existingGame?.gameState.status === "game_over" || !!existingGame?.gameState.winner;

          if (existingGame && !isGameOver) {
            console.log(`[Multiplayer] Player ${username} rejoining active game ${existingRoomIdByPlayer}`);

            // Clear pending disconnect timeout (if any)
            const pendingTimeout = existingGame.disconnectTimeouts.get(userId);
            if (pendingTimeout) {
              clearTimeout(pendingTimeout);
              existingGame.disconnectTimeouts.delete(userId);
            }
            existingGame.disconnectedPlayers.delete(userId);

            // Update the player's socketId in the game state
            const playerInGame = existingGame.gameState.players.find((p) => p.id === userId);
            const oldSocketId = playerInGame?.socketId;
            if (playerInGame) {
              playerInGame.socketId = socket.id;
            }

            // Defensive: clean up stale socket mapping from the old socket id
            if (oldSocketId && oldSocketId !== socket.id) {
              socketToRoom.delete(oldSocketId);
            }

            // Join room + update mapping so gameplay events work immediately
            socket.join(existingRoomIdByPlayer);
            socketToRoom.set(socket.id, existingRoomIdByPlayer);

            // Ensure we're not queued
            clearBotFallbackTimer(socket.id);
            matchmakingQueue.delete(socket.id);

            const opponent = existingGame.gameState.players.find((p) => p.id !== userId);
            if (opponent) {
              socket.emit("matchmaking:found", {
                opponent: {
                  id: opponent.id,
                  username: opponent.username,
                  rating: opponent.rating,
                  isGuest: opponent.isGuest,
                },
              });
            }

            // Send a full state snapshot so the client can resume UI immediately.
            socket.emit("game:start", { gameState: existingGame.gameState });

            return;
          }

          // Stale mapping (game ended / cleaned up)
          playerToRoom.delete(userId);
        }

        // Check if already in queue
        if (matchmakingQueue.has(socket.id)) {
          return;
        }

        // Check if already in a game
        const existingRoomId = socketToRoom.get(socket.id);
        if (existingRoomId) {
          const existingGame = activeGames.get(existingRoomId);
          
          // DEBUG LOGGING
          console.log(`[Matchmaking] Socket ${socket.id} already in room ${existingRoomId}`);
          if (existingGame) {
            console.log(`[Matchmaking] Game status: ${existingGame.gameState.status}`);
          } else {
            console.log(`[Matchmaking] Game not found in activeGames`);
          }

          // Only block if the game exists and is not over
          // We also check if there is a winner, which implies game over even if status is weird
          const isGameOver = existingGame?.gameState.status === "game_over" || !!existingGame?.gameState.winner;
          
          if (existingGame && !isGameOver) {
            socket.emit("matchmaking:error", "Already in a game");
            return;
          }
          // Game is over or doesn't exist, clean up the stale mapping
          console.log(`[Matchmaking] Cleaning up stale mapping for socket ${socket.id}`);
          socket.leave(existingRoomId);
          socketToRoom.delete(socket.id);
        }

        // Fetch the user's actual rating from database (guests are unrated)
        const actualRating = isGuest ? 1000 : await getUserRating(userId);

        const entry: MatchmakingEntry = {
          socketId: socket.id,
          playerId: userId,
          username,
          rating: actualRating,
          isGuest,
          joinedAt: Date.now(),
        };

        matchmakingQueue.set(socket.id, entry);
        
        // Try to find a match immediately
        const match = findMatch(entry);
        
        if (match) {
          createMatch(io, entry, match);
        } else {
          socket.emit("matchmaking:searching", { position: matchmakingQueue.size });

          // If no human match is found after 10 seconds, fall back to a bot duel.
          clearBotFallbackTimer(socket.id);
          const fallbackTimer = setTimeout(() => {
            // Only start a bot match if this exact queue entry is still waiting.
            const stillQueued = matchmakingQueue.get(socket.id);
            if (!stillQueued) return;
            if (stillQueued.joinedAt !== entry.joinedAt) return;

            // Remove from queue; createBotMatch will handle room/game creation.
            matchmakingQueue.delete(socket.id);
            void safelyExecute("[Multiplayer] matchmaking:bot_fallback", async () => {
              await createBotMatch(io, stillQueued);
            });
          }, 10_000);
          botFallbackTimers.set(socket.id, fallbackTimer);
        }
      });
    });

    socket.on("matchmaking:leave", () => {
      const rate = matchmakingLeaveLimiter(socket.id);
      if (!rate.allowed) {
        socket.emit("matchmaking:error", "Too many matchmaking requests");
        return;
      }

      void safelyExecute("[Multiplayer] matchmaking:leave", () => {
        clearBotFallbackTimer(socket.id);
        matchmakingQueue.delete(socket.id);
        socket.emit("matchmaking:cancelled");
      });
    });

    // ============================================
    // GAME HANDLERS
    // ============================================

    socket.on("game:submit_answer", (data) => {
      const rate = submitAnswerLimiter(socket.id);
      if (!rate.allowed) {
        socket.emit("game:error", "Too many answers, slow down");
        return;
      }

      if (isPayloadTooLarge(data, MAX_PAYLOAD_BYTES)) {
        socket.emit("game:error", "Payload too large");
        return;
      }

      const parsed = parseWithSchema(submitAnswerSchema, data);
      if (!parsed.success) {
        socket.emit("game:error", "Invalid answer payload");
        return;
      }

      void safelyExecute("[Multiplayer] game:submit_answer", () => {
        const roomId = socketToRoom.get(socket.id);
        if (!roomId) return;

        const game = activeGames.get(roomId);
        if (!game || game.gameState.status !== "playing") return;

        const player = socketToPlayer.get(socket.id);
        if (!player) return;

        // Don't allow duplicate answers
        if (game.answers.has(player.id)) return;

        // Record the answer
        game.answers.set(player.id, {
          answer: parsed.data.answer,
          timeMs: parsed.data.timeMs,
        });

        // Notify opponent that this player answered (without revealing the answer)
        const otherPlayer = game.gameState.players.find(p => p.id !== player.id);
        if (otherPlayer) {
          const otherSocket = io.sockets.sockets.get(otherPlayer.socketId);
          if (otherSocket) {
            otherSocket.emit("game:opponent_answered");
          }
        }

        // If both players answered, end round early
        if (game.answers.size === 2) {
          endRound(io, roomId);
        }
      });
    });

    socket.on("game:forfeit", () => {
      const rate = forfeitLimiter(socket.id);
      if (!rate.allowed) {
        socket.emit("game:error", "Too many forfeits");
        return;
      }

      void safelyExecute("[Multiplayer] game:forfeit", () => {
        const roomId = socketToRoom.get(socket.id);
        if (!roomId) return;

        const game = activeGames.get(roomId);
        if (!game) return;

        const player = socketToPlayer.get(socket.id);
        if (!player) return;

        // Notify both players
        io.to(roomId).emit("game:forfeit", { forfeitedBy: player.id });

        // End game with opponent as winner
        const opponent = game.gameState.players.find(p => p.id !== player.id);
        endGame(io, roomId, opponent?.id || null, "forfeit", player.id);
      });
    });

    socket.on("game:quick_chat", (message) => {
      const rate = quickChatLimiter(socket.id);
      if (!rate.allowed) {
        socket.emit("game:error", "Chat rate limited");
        return;
      }

      if (isPayloadTooLarge(message, MAX_PAYLOAD_BYTES)) {
        socket.emit("game:error", "Payload too large");
        return;
      }

      const parsed = parseWithSchema(quickChatSchema, message);
      if (!parsed.success) {
        socket.emit("game:error", "Invalid chat message");
        return;
      }

      const safeMessage = parsed.data;

      void safelyExecute("[Multiplayer] game:quick_chat", () => {
        const roomId = socketToRoom.get(socket.id);
        if (!roomId) return;

        const player = socketToPlayer.get(socket.id);
        if (!player) return;

        // Broadcast to room
        socket.to(roomId).emit("game:quick_chat", {
          from: player.username,
          message: safeMessage,
        });
      });
    });

    // Leave game room (called when player returns to lobby)
    socket.on("game:leave", () => {
      void safelyExecute("[Multiplayer] game:leave", () => {
        const roomId = socketToRoom.get(socket.id);
        if (roomId) {
          socket.leave(roomId);
          socketToRoom.delete(socket.id);
          console.log(`Player left game room: ${roomId}`);
        }
        // Also remove from matchmaking queue if they were in it
        matchmakingQueue.delete(socket.id);
      });
    });

    // ============================================
    // DISCONNECT HANDLER
    // ============================================

    socket.on("disconnect", () => {
      void safelyExecute("[Multiplayer] disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);

        clearBotFallbackTimer(socket.id);

        // Remove from matchmaking queue
        matchmakingQueue.delete(socket.id);

        // Handle game disconnection with a short grace period (reconnect protection)
        const roomId = socketToRoom.get(socket.id);
        const player = socketToPlayer.get(socket.id);
        if (roomId && player) {
          const game = activeGames.get(roomId);
          const isGameOver = game?.gameState.status === "game_over" || !!game?.gameState.winner;

          if (game && !isGameOver) {
            console.log(
              `[Multiplayer] Player ${player.username} disconnected from game ${roomId}, waiting for reconnect...`
            );

            game.disconnectedPlayers.add(player.id);

            const existingTimeout = game.disconnectTimeouts.get(player.id);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }

            const timeout = setTimeout(() => {
              const currentGame = activeGames.get(roomId);
              if (!currentGame) return;
              if (currentGame.gameState.status === "game_over" || !!currentGame.gameState.winner) return;

              // If the player reconnected in time, do nothing.
              if (!currentGame.disconnectedPlayers.has(player.id)) return;

              const opponent = currentGame.gameState.players.find((p) => p.id !== player.id);
              const opponentDisconnected = opponent ? currentGame.disconnectedPlayers.has(opponent.id) : true;

              console.log(
                `[Multiplayer] Player ${player.username} timed out (${DISCONNECT_GRACE_PERIOD_MS}ms), ending game ${roomId}`
              );

              currentGame.disconnectTimeouts.delete(player.id);
              currentGame.disconnectedPlayers.delete(player.id);

              if (opponentDisconnected) {
                // Both players dropped; treat as an aborted/disconnected game.
                endGame(io, roomId, null, "disconnected");
              } else {
                endGame(io, roomId, opponent?.id || null, "disconnected", player.id);
              }
            }, DISCONNECT_GRACE_PERIOD_MS);

            game.disconnectTimeouts.set(player.id, timeout);
          }
        }

        // Clean up mappings
        socketToRoom.delete(socket.id);
        socketToPlayer.delete(socket.id);
      });
    });
  });

  // Matchmaking loop - try to match players periodically
  setInterval(() => {
    const entries = Array.from(matchmakingQueue.values());
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!matchmakingQueue.has(entry.socketId)) continue; // Already matched
      
      const match = findMatch(entry);
      if (match && matchmakingQueue.has(match.socketId)) {
        createMatch(io, entry, match);
      }
    }
  }, 1000);
}

