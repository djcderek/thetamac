import { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";
import type {
  RaceClientToServerEvents,
  RaceServerToClientEvents,
  RaceInterServerEvents,
  RaceSocketData,
  RaceMatchmakingEntry,
  RaceLobby,
  RaceState,
  RaceConfig,
  ActionType,
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
import { db } from "@/lib/db";

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
  dbRaceId: string | null;
}> = new Map();

// Socket to race/lobby mapping
const socketToRace: Map<string, string> = new Map();
const socketToLobby: Map<string, string> = new Map();
const socketToPlayer: Map<string, { id: string; username: string }> = new Map();

// ============================================
// CONFIGURATION
// ============================================

const MIN_PLAYERS_TO_START = 2;
const MAX_PLAYERS = 5;
const LOBBY_COUNTDOWN_SECONDS = 10;
const GAME_LOOP_INTERVAL_MS = 100; // Update state every 100ms

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

// ============================================
// MATCHMAKING / LOBBY MANAGEMENT
// ============================================

function findOrCreateLobby(entry: RaceMatchmakingEntry): RaceLobby | null {
  // Try to find an existing lobby with space
  for (const [lobbyId, lobby] of activeLobbies) {
    if (lobby.players.length < MAX_PLAYERS && !lobby.countdownStarted) {
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
    })),
    config: lobby.config,
  });
  
  // Notify other players in lobby
  socket.to(lobby.lobbyId).emit("race:player_joined", {
    player: {
      id: entry.playerId,
      username: entry.username,
      rating: entry.rating,
    },
    totalPlayers: lobby.players.length,
  });
  
  // Check if we should start countdown
  if (lobby.players.length >= MIN_PLAYERS_TO_START && !lobby.countdownStarted) {
    startLobbyCountdown(io, lobby);
  }
}

function startLobbyCountdown(io: RaceServer, lobby: RaceLobby) {
  lobby.countdownStarted = true;
  lobby.startCountdown = LOBBY_COUNTDOWN_SECONDS;
  
  io.to(lobby.lobbyId).emit("race:starting_soon", {
    secondsUntilStart: lobby.startCountdown,
  });
  
  const countdownInterval = setInterval(() => {
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
  
  // Create race state
  const state = createRaceState(raceId, entries, lobby.config);
  
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
  activeLobbies.delete(lobby.lobbyId);
  
  // Create race record in database
  let dbRaceId: string | null = null;
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
          },
        })
      )
    );
    
    console.log(`[Race] Created race in database: ${dbRaceId}`);
  } catch (error) {
    console.error("[Race] Failed to create race in database:", error);
  }
  
  // Store race
  activeRaces.set(raceId, {
    state,
    gameLoop: null,
    countdownTimer: null,
    dbRaceId,
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

function startRaceCountdown(io: RaceServer, raceId: string) {
  const race = activeRaces.get(raceId);
  if (!race) return;
  
  race.state = startCountdown(race.state);
  
  const countdownInterval = setInterval(() => {
    const currentRace = activeRaces.get(raceId);
    if (!currentRace) {
      clearInterval(countdownInterval);
      return;
    }
    
    io.to(raceId).emit("race:countdown", {
      seconds: currentRace.state.countdownValue,
    });
    
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
    }
  }, 1000);
  
  race.countdownTimer = countdownInterval;
}

function startGameLoop(io: RaceServer, raceId: string) {
  const race = activeRaces.get(raceId);
  if (!race) return;
  
  let lastTickTime = Date.now();

  // Game loop - broadcast state updates periodically
  const gameLoop = setInterval(() => {
    const currentRace = activeRaces.get(raceId);
    if (!currentRace || currentRace.state.status !== "racing") {
      clearInterval(gameLoop);
      return;
    }
    
    const now = Date.now();
    const deltaTime = now - lastTickTime;
    lastTickTime = now;
    
    // Run game tick
    const { state, events } = gameTick(currentRace.state, deltaTime);
    currentRace.state = state;

    // Process events from tick
    events.forEach(event => {
      if (event.type === "obstacle") {
        io.to(raceId).emit("race:obstacle_hit", {
          playerId: event.playerId,
          obstacleId: "",
          obstacleType: event.data.obstacleType,
          stunDuration: event.data.stunDuration,
          pushback: event.data.pushback,
        });
      } else if (event.type === "drop") {
        io.to(raceId).emit("race:drop_collected", {
          playerId: event.playerId,
          dropId: "",
          dropType: event.data.dropType,
          effectDuration: event.data.effectDuration,
        });
        io.to(raceId).emit("race:drops_update", {
          drops: currentRace.state.drops,
        });
        const socket = io.sockets.sockets.get(currentRace.state.players.find(p => p.id === event.playerId)?.socketId || "");
        if (socket) {
          socket.emit("race:powerup_activated", {
            playerId: event.playerId,
            powerupType: event.data.dropType,
            duration: event.data.effectDuration,
          });
        }
      } else if (event.type === "finish") {
        io.to(raceId).emit("race:player_finished", {
          playerId: event.playerId,
          position: event.data.position,
          time: event.data.time,
        });
        
        // Save finish event to database
        if (currentRace.dbRaceId) {
          db.raceEvent.create({
            data: {
              raceId: currentRace.dbRaceId,
              playerId: event.playerId,
              eventType: "finish",
              details: { position: event.data.position },
            },
          }).catch(err => console.error("[Race] Failed to save finish event:", err));
        }
      }
    });
    
    // Broadcast state update
    io.to(raceId).emit("race:state_update", {
      players: getRaceSnapshot(currentRace.state),
    });
    
    // Check if race is over
    if (checkRaceOver(currentRace.state)) {
      clearInterval(gameLoop);
      endRace(io, raceId);
    }
  }, GAME_LOOP_INTERVAL_MS);
  
  race.gameLoop = gameLoop;
}

async function endRace(io: RaceServer, raceId: string) {
  const race = activeRaces.get(raceId);
  if (!race) return;
  
  race.state.status = "finished";
  
  // Calculate rating changes
  const ratingChanges = calculateRaceRatings(race.state);
  
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
      socket.emit("race:finished", {
        results,
        yourRatingChange: ratingChanges[player.id] || 0,
      });
    }
  }
  
  // Save to database
  if (race.dbRaceId) {
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
    console.log(`[Race] Client connected: ${socket.id}`);
    
    // ========================================
    // MATCHMAKING HANDLERS
    // ========================================
    
    socket.on("race:join_queue", async (data) => {
      const { userId, username } = data;
      
      // Store player info
      socketToPlayer.set(socket.id, { id: userId, username });
      
      // Check if already in a race or lobby
      if (socketToRace.has(socket.id) || socketToLobby.has(socket.id)) {
        socket.emit("race:error", "Already in a race or lobby");
        return;
      }
      
      // Check if already in queue
      if (raceQueue.has(socket.id)) {
        socket.emit("race:error", "Already in queue");
        return;
      }
      
      // Fetch rating
      const rating = await getUserRating(userId);
      
      const entry: RaceMatchmakingEntry = {
        socketId: socket.id,
        playerId: userId,
        username,
        rating,
        joinedAt: Date.now(),
      };
      
      // Try to find or create a lobby
      const lobby = findOrCreateLobby(entry);
      
      if (lobby) {
        addPlayerToLobby(io, lobby, entry, socket);
      } else {
        // Add to queue (shouldn't happen often)
        raceQueue.set(socket.id, entry);
        socket.emit("race:queue_update", {
          playersInQueue: raceQueue.size,
          estimatedWait: 30,
        });
      }
    });
    
    socket.on("race:leave_queue", () => {
      // Remove from queue
      raceQueue.delete(socket.id);
      
      // Remove from lobby if in one
      const lobbyId = socketToLobby.get(socket.id);
      if (lobbyId) {
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
          if (lobby.players.length === 0) {
            activeLobbies.delete(lobbyId);
          }
        }
      }
    });
    
    // ========================================
    // GAME ACTION HANDLERS
    // ========================================
    
    socket.on("race:submit_answer", async (data) => {
      const { action, answer, problemId } = data;
      
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
        
        // Emit result to the acting player (with their new problems if not finished)
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
        
        // Broadcast to other players (without problems)
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
            
            // Send new problems to bumped player (they need fresh ones after stun)
            const bumpedSocket = io.sockets.sockets.get(bumpedPlayer.socketId);
            if (bumpedSocket) {
              // Regenerate problems for bumped player
              bumpedPlayer.problems = generatePlayerProblems(
                bumpedPlayer.lane,
                race.state.config
              );
              bumpedSocket.emit("race:action_result", {
                playerId: bumpedPlayer.id,
                action: "forward", // Dummy action
                success: true,
                newLane: bumpedPlayer.lane,
                newPosition: bumpedPlayer.position,
                yourNewProblems: bumpedPlayer.problems,
              });
            }
          }
        }
        
        // If player hit an obstacle, notify everyone
        if (result.obstacleHit) {
          io.to(raceId).emit("race:obstacle_hit", {
            playerId: player.id,
            obstacleId: "", // We don't track individual obstacle IDs in the result currently
            obstacleType: result.obstacleHit.type,
            stunDuration: result.obstacleHit.stunDuration,
            pushback: 0, // Could be added to the result
          });
        }
        
        // If player collected a drop, notify everyone
        if (result.dropCollected) {
          io.to(raceId).emit("race:drop_collected", {
            playerId: player.id,
            dropId: "", // We could track this in the result
            dropType: result.dropCollected.type,
            effectDuration: result.dropCollected.effectDuration,
          });
          
          // Also send updated drops state
          io.to(raceId).emit("race:drops_update", {
            drops: race.state.drops,
          });
          
          // Notify about powerup activation
          socket.emit("race:powerup_activated", {
            playerId: player.id,
            powerupType: result.dropCollected.type,
            duration: result.dropCollected.effectDuration,
          });
        }
        
        // Check for finish
        if (result.finished && result.finishPosition) {
          io.to(raceId).emit("race:player_finished", {
            playerId: player.id,
            position: result.finishPosition,
            time: race.state.players.find(p => p.id === player.id)?.finishTime || 0,
          });
          
          // Check if race is over immediately after someone finishes
          if (checkRaceOver(race.state)) {
            // Stop the game loop - endRace will be called
            if (race.gameLoop) {
              clearInterval(race.gameLoop);
              race.gameLoop = null;
            }
            endRace(io, raceId);
          }
          
          // Save finish event to database
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
        
        // Save action event to database
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
        // Handle different error types
        const errorType = result.error;
        
        if (errorType === "Player already finished") {
          // Player finished - don't send wrong answer, just ignore
          console.log(`[Race] Player ${player.id} already finished, ignoring action`);
        } else if (errorType === "Player is stunned") {
          // Stunned - don't count as wrong answer
          socket.emit("race:error", "You are stunned!");
        } else if (errorType === "Problem mismatch") {
          // Problem ID mismatch - likely a race condition, send new problems
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
          // Actual wrong answer - send cooldown
          socket.emit("race:wrong_answer", {
            playerId: player.id,
            action,
            cooldownMs: race.state.config.wrongAnswerPenalty,
          });
        } else {
          // Other errors (invalid lane, etc)
          socket.emit("race:error", errorType || "Invalid action");
        }
      }
    });
    
    socket.on("race:forfeit", () => {
      const raceId = socketToRace.get(socket.id);
      if (!raceId) return;
      
      const race = activeRaces.get(raceId);
      if (!race) return;
      
      const player = socketToPlayer.get(socket.id);
      if (!player) return;
      
      // Mark player as DNF
      race.state = handlePlayerDisconnect(race.state, player.id);
      
      // Notify others
      socket.to(raceId).emit("race:player_disconnected", { playerId: player.id });
      
      // Leave room
      socket.leave(raceId);
      socketToRace.delete(socket.id);
      
      // Check if race should end
      if (checkRaceOver(race.state)) {
        endRace(io, raceId);
      }
    });
    
    socket.on("race:leave", () => {
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
        socketToRace.delete(socket.id); // Fixed: was incorrectly deleting raceId
      }
    });
    
    // ========================================
    // DISCONNECT HANDLER
    // ========================================
    
    socket.on("disconnect", () => {
      console.log(`[Race] Client disconnected: ${socket.id}`);
      
      // Remove from queue
      raceQueue.delete(socket.id);
      
      // Handle lobby disconnect
      const lobbyId = socketToLobby.get(socket.id);
      if (lobbyId) {
        const lobby = activeLobbies.get(lobbyId);
        if (lobby) {
          lobby.players = lobby.players.filter(p => p.socketId !== socket.id);
          
          const player = socketToPlayer.get(socket.id);
          if (player) {
            io.to(lobbyId).emit("race:player_left", {
              playerId: player.id,
              totalPlayers: lobby.players.length,
            });
          }
          
          if (lobby.players.length === 0) {
            activeLobbies.delete(lobbyId);
          }
        }
        socketToLobby.delete(socket.id);
      }
      
      // Handle race disconnect
      const raceId = socketToRace.get(socket.id);
      if (raceId) {
        const race = activeRaces.get(raceId);
        if (race && race.state.status === "racing") {
          const player = socketToPlayer.get(socket.id);
          if (player) {
            race.state = handlePlayerDisconnect(race.state, player.id);
            io.to(raceId).emit("race:player_disconnected", { playerId: player.id });
            
            if (checkRaceOver(race.state)) {
              endRace(io, raceId);
            }
          }
        }
        socketToRace.delete(socket.id);
      }
      
      // Clean up player mapping
      socketToPlayer.delete(socket.id);
    });
  });
  
  // Periodic queue processing
  setInterval(() => {
    // Try to move queued players into lobbies
    for (const [socketId, entry] of raceQueue) {
      const socket = io.sockets.sockets.get(socketId);
      if (!socket) {
        raceQueue.delete(socketId);
        continue;
      }
      
      const lobby = findOrCreateLobby(entry);
      if (lobby) {
        raceQueue.delete(socketId);
        addPlayerToLobby(io, lobby, entry, socket as RaceSocket);
      }
    }
  }, 2000);
}

