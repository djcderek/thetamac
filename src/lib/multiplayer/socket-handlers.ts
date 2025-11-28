import { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  MatchmakingEntry,
  GameState,
  Player,
  GameConfig,
  Difficulty,
  Operation,
} from "./types";
import {
  createGameState,
  startNewRound,
  processRoundEnd,
  checkGameOver,
  calculateRatingChange,
} from "./game-logic";
import { db } from "@/lib/db";

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
}> = new Map();

// Socket to room mapping
const socketToRoom: Map<string, string> = new Map();

// Socket to player mapping
const socketToPlayer: Map<string, { id: string; username: string }> = new Map();

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
  const roomId = `game_${randomUUID()}`;
  
  const player1: Player = {
    id: player1Entry.playerId,
    socketId: player1Entry.socketId,
    username: player1Entry.username,
    rating: player1Entry.rating,
  };
  
  const player2: Player = {
    id: player2Entry.playerId,
    socketId: player2Entry.socketId,
    username: player2Entry.username,
    rating: player2Entry.rating,
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

  // Store game
  activeGames.set(roomId, {
    gameState,
    config,
    answers: new Map(),
    roundTimer: null,
    dbMatchId,
  });

  // Notify players
  socket1.emit("matchmaking:found", {
    opponent: { id: player2.id, username: player2.username, rating: player2.rating },
  });
  socket2.emit("matchmaking:found", {
    opponent: { id: player1.id, username: player1.username, rating: player1.rating },
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

  game.gameState.status = "game_over";
  game.gameState.winner = winnerId;

  const player1 = game.gameState.players[0];
  const player2 = game.gameState.players[1];

  // Calculate rating changes
  let ratingChanges: Record<string, number> = {};
  
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

    socket.on("matchmaking:join", async (data) => {
      const { userId, username } = data;

      // Store player info
      socketToPlayer.set(socket.id, { id: userId, username });

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

      // Fetch the user's actual rating from database
      const actualRating = await getUserRating(userId);

      const entry: MatchmakingEntry = {
        socketId: socket.id,
        playerId: userId,
        username,
        rating: actualRating,
        joinedAt: Date.now(),
      };

      matchmakingQueue.set(socket.id, entry);
      
      // Try to find a match immediately
      const match = findMatch(entry);
      
      if (match) {
        createMatch(io, entry, match);
      } else {
        socket.emit("matchmaking:searching", { position: matchmakingQueue.size });
      }
    });

    socket.on("matchmaking:leave", () => {
      matchmakingQueue.delete(socket.id);
      socket.emit("matchmaking:cancelled");
    });

    // ============================================
    // GAME HANDLERS
    // ============================================

    socket.on("game:submit_answer", (data) => {
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
        answer: data.answer,
        timeMs: data.timeMs,
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

    socket.on("game:forfeit", () => {
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

    socket.on("game:quick_chat", (message) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const player = socketToPlayer.get(socket.id);
      if (!player) return;

      // Broadcast to room
      socket.to(roomId).emit("game:quick_chat", {
        from: player.username,
        message,
      });
    });

    // Leave game room (called when player returns to lobby)
    socket.on("game:leave", () => {
      const roomId = socketToRoom.get(socket.id);
      if (roomId) {
        socket.leave(roomId);
        socketToRoom.delete(socket.id);
        console.log(`Player left game room: ${roomId}`);
      }
      // Also remove from matchmaking queue if they were in it
      matchmakingQueue.delete(socket.id);
    });

    // ============================================
    // DISCONNECT HANDLER
    // ============================================

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);

      // Remove from matchmaking queue
      matchmakingQueue.delete(socket.id);

      // Handle game disconnection
      const roomId = socketToRoom.get(socket.id);
      if (roomId) {
        const game = activeGames.get(roomId);
        if (game && game.gameState.status !== "game_over") {
          // Notify opponent
          io.to(roomId).emit("game:opponent_disconnected");
          
          // End game with opponent as winner
          const player = socketToPlayer.get(socket.id);
          if (player) {
            const opponent = game.gameState.players.find(p => p.id !== player.id);
            endGame(io, roomId, opponent?.id || null, "disconnected", player.id);
          }
        }
      }

      // Clean up mappings
      socketToRoom.delete(socket.id);
      socketToPlayer.delete(socket.id);
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

