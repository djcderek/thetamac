import { randomUUID } from "crypto";
import type {
  Operation,
  Difficulty,
  RaceProblem,
  PlayerProblems,
  RacePlayer,
  RaceState,
  RaceConfig,
  ActionType,
  ActionResult,
  RaceMatchmakingEntry,
  TrackObstacle,
  TrackDrop,
  ObstacleType,
  DropType,
} from "./types";

// ============================================
// DEFAULT CONFIG
// ============================================

export const DEFAULT_RACE_CONFIG: RaceConfig = {
  trackLength: 150,         // 150 meters
  maxPlayers: 5,
  laneCount: 5,
  difficulty: "medium",
  operations: ["+", "-", "×", "÷"],
  stunDuration: 2000,       // 2 seconds
  pushbackDistance: 2,      // 2 meters
  boostDistance: 3,         // 3 meters (for boost action)
  forwardDistance: 1,       // 1 meter per forward solve
  wrongAnswerPenalty: 1500, // 1.5 second cooldown
  obstacleCount: 15,        // Obstacle density tuned for the default track length
  dropCount: 0,             // No powerup drops (only coins remain)
  coinDropCount: 10,        // Coin pickups on track
  baseSpeed: 2,           // 3x base speed to keep races moving
};

const COIN_DROP_VALUE = 5;

// ============================================
// PROBLEM GENERATION
// ============================================

const difficultyConfig: Record<Difficulty, { addSubMax: number; mulDivMax: number }> = {
  easy: { addSubMax: 20, mulDivMax: 10 },
  medium: { addSubMax: 50, mulDivMax: 12 },
  hard: { addSubMax: 100, mulDivMax: 15 },
  expert: { addSubMax: 200, mulDivMax: 20 },
};

// Problem difficulty multipliers based on action type
const actionDifficultyMultiplier: Record<ActionType, number> = {
  forward: 0.8,   // Easier - keep the race moving
  left: 1.0,      // Medium - attacking costs effort
  right: 1.0,     // Medium - attacking costs effort
  boost: 1.3,     // Harder - high risk/reward
};

export function generateProblem(
  baseDifficulty: Difficulty,
  operations: Operation[],
  actionType: ActionType
): RaceProblem {
  const operation = operations[Math.floor(Math.random() * operations.length)];
  const baseConfig = difficultyConfig[baseDifficulty];
  const multiplier = actionDifficultyMultiplier[actionType];
  
  // Adjust max values based on action type
  const addSubMax = Math.round(baseConfig.addSubMax * multiplier);
  const mulDivMax = Math.round(baseConfig.mulDivMax * multiplier);
  
  let a: number, b: number, answer: number;
  let problemDifficulty: "easy" | "medium" | "hard" = "medium";

  switch (operation) {
    case "+":
      a = Math.floor(Math.random() * addSubMax) + 1;
      b = Math.floor(Math.random() * addSubMax) + 1;
      answer = a + b;
      problemDifficulty = addSubMax <= 20 ? "easy" : addSubMax <= 50 ? "medium" : "hard";
      break;
    case "-":
      a = Math.floor(Math.random() * addSubMax) + 1;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      problemDifficulty = addSubMax <= 20 ? "easy" : addSubMax <= 50 ? "medium" : "hard";
      break;
    case "×":
      a = Math.floor(Math.random() * mulDivMax) + 1;
      b = Math.floor(Math.random() * mulDivMax) + 1;
      answer = a * b;
      problemDifficulty = mulDivMax <= 10 ? "easy" : mulDivMax <= 12 ? "medium" : "hard";
      break;
    case "÷":
      // Keep BOTH displayed numbers (dividend 'a' and divisor 'b') within mulDivMax
      // while ensuring an integer quotient.
      b = Math.floor(Math.random() * mulDivMax) + 1;
      // a = b * answer <= mulDivMax => answer <= floor(mulDivMax / b)
      answer = Math.floor(Math.random() * Math.floor(mulDivMax / b)) + 1;
      a = b * answer;
      problemDifficulty = mulDivMax <= 10 ? "easy" : mulDivMax <= 12 ? "medium" : "hard";
      break;
    default:
      a = 1;
      b = 1;
      answer = 2;
  }

  return {
    id: randomUUID(),
    a,
    b,
    operation,
    answer,
    difficulty: problemDifficulty,
  };
}

export function generatePlayerProblems(
  lane: number,
  config: RaceConfig
): PlayerProblems {
  return {
    forward: generateProblem(config.difficulty, config.operations, "forward"),
    left: lane > 1 ? generateProblem(config.difficulty, config.operations, "left") : null,
    right: lane < config.laneCount ? generateProblem(config.difficulty, config.operations, "right") : null,
    boost: generateProblem(config.difficulty, config.operations, "boost"),
  };
}

// ============================================
// TRACK OBJECT GENERATION
// ============================================

const OBSTACLE_TYPES: ObstacleType[] = ["barrier", "oil_slick", "cone", "pothole"];

export function generateTrackObstacles(config: RaceConfig): TrackObstacle[] {
  const obstacles: TrackObstacle[] = [];
  const minPosition = 5; // Don't place obstacles in first 5 meters
  const maxPosition = config.trackLength - 5; // Or last 5 meters
  
  for (let i = 0; i < config.obstacleCount; i++) {
    const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
    const lane = Math.floor(Math.random() * config.laneCount) + 1; // 1-laneCount
    const position = minPosition + Math.random() * (maxPosition - minPosition);
    
    // Width based on obstacle type
    const widthByType: Record<ObstacleType, number> = {
      barrier: 0.8,
      oil_slick: 0.6,
      cone: 0.4,
      pothole: 0.5,
    };
    
    obstacles.push({
      id: randomUUID(),
      type,
      lane,
      position: Math.round(position * 10) / 10, // Round to 1 decimal
      width: widthByType[type],
    });
  }
  
  return obstacles;
}

export function generateTrackDrops(config: RaceConfig): TrackDrop[] {
  const drops: TrackDrop[] = [];
  const minPosition = 8; // Don't place drops in first 8 meters
  const maxPosition = config.trackLength - 3; // Or last 3 meters

  // Only coin drops remain
  for (let i = 0; i < config.coinDropCount; i++) {
    const lane = Math.floor(Math.random() * config.laneCount) + 1; // 1-laneCount
    const position = minPosition + Math.random() * (maxPosition - minPosition);
    drops.push({
      id: randomUUID(),
      type: "coin",
      lane,
      position: Math.round(position * 10) / 10,
      collected: false,
      collectedBy: null,
    });
  }

  return drops;
}

// Effects for each obstacle type
export const OBSTACLE_EFFECTS: Record<ObstacleType, { stunDuration: number; pushback: number }> = {
  barrier: { stunDuration: 2000, pushback: 3 },     // Hard hit - long stun, big pushback
  oil_slick: { stunDuration: 1500, pushback: 0 },   // Spin out - medium stun, no pushback
  cone: { stunDuration: 800, pushback: 1 },         // Minor - short stun, small pushback
  pothole: { stunDuration: 1000, pushback: 2 },     // Bounce - medium stun, medium pushback
};

// Effects for each drop type
export const DROP_EFFECTS: Record<DropType, { duration: number; description: string }> = {
  speed_boost: { duration: 5000, description: "Double movement distance for 5 seconds" },
  shield: { duration: 10000, description: "Block one obstacle or bump" },
  freeze_others: { duration: 3000, description: "Stun all other players for 3 seconds" },
  magnet: { duration: 8000, description: "Auto-collect nearby drops" },
  coin: { duration: 0, description: "Collect coins" },
};

// ============================================
// PLAYER CREATION
// ============================================

export function createRacePlayer(
  entry: RaceMatchmakingEntry,
  startingLane: number,
  config: RaceConfig
): RacePlayer {
  return {
    id: entry.playerId,
    socketId: entry.socketId,
    username: entry.username,
    rating: entry.rating,
    lane: startingLane,
    position: 0,
    isStunned: false,
    stunEndTime: 0,
    invulnerableEndTime: 0,
    magnetEndTime: 0,
    hasShield: false,
    shieldEndTime: 0,
    problems: generatePlayerProblems(startingLane, config),
    problemsSolved: 0,
    bumpsGiven: 0,
    bumpsReceived: 0,
    boostsUsed: 0,
    wrongAnswers: 0,
    dropsCollected: 0,
    obstacleHits: 0,
    coinPickups: 0,
    coinsEarned: 0,
    finishPosition: null,
    finishTime: null,
  };
}

// ============================================
// RACE STATE MANAGEMENT
// ============================================

export function createRaceState(
  raceId: string,
  entries: RaceMatchmakingEntry[],
  config: RaceConfig = DEFAULT_RACE_CONFIG
): RaceState {
  // Assign starting lanes - distribute evenly
  const startingLanes = assignStartingLanes(entries.length, config.laneCount);
  
  const players = entries.map((entry, index) => 
    createRacePlayer(entry, startingLanes[index], config)
  );

  return {
    raceId,
    players,
    config,
    status: "waiting",
    startTime: 0,
    finishOrder: [],
    countdownValue: 3,
    obstacles: generateTrackObstacles(config),
    drops: generateTrackDrops(config),
  };
}

function assignStartingLanes(playerCount: number, laneCount: number): number[] {
  const lanes = Array.from({ length: Math.max(1, laneCount) }, (_, i) => i + 1);
  const center = (laneCount + 1) / 2;
  lanes.sort((a, b) => {
    const da = Math.abs(a - center);
    const db = Math.abs(b - center);
    if (da !== db) return da - db;
    return a - b;
  });

  // If playerCount > laneCount, some lanes will be shared; this is OK because collision logic
  // is based on (lane, position) proximity and can handle multiple players in a lane.
  const out: number[] = [];
  for (let i = 0; i < playerCount; i++) {
    out.push(lanes[i % lanes.length]);
  }
  return out;
}

// ============================================
// GAME ACTIONS
// ============================================

export function processAction(
  state: RaceState,
  playerId: string,
  action: ActionType,
  answer: number,
  problemId: string
): { newState: RaceState; result: ActionResult } {
  const player = state.players.find(p => p.id === playerId);
  
  if (!player) {
    return {
      newState: state,
      result: { success: false, playerId, action, error: "Player not found" },
    };
  }

  // Check if player is stunned
  if (player.isStunned && Date.now() < player.stunEndTime) {
    return {
      newState: state,
      result: { success: false, playerId, action, error: "Player is stunned" },
    };
  }

  // Clear stun if expired
  if (player.isStunned && Date.now() >= player.stunEndTime) {
    player.isStunned = false;
    player.stunEndTime = 0;
  }

  // Check if player already finished
  if (player.finishPosition !== null) {
    return {
      newState: state,
      result: { success: false, playerId, action, error: "Player already finished" },
    };
  }

  // Get the corresponding problem
  const problem = getProblemForAction(player, action);
  
  if (!problem) {
    return {
      newState: state,
      result: { success: false, playerId, action, error: "Invalid action for current lane" },
    };
  }

  // Verify problem ID matches (prevent replay attacks)
  if (problem.id !== problemId) {
    return {
      newState: state,
      result: { success: false, playerId, action, error: "Problem mismatch" },
    };
  }

  // Check answer
  if (answer !== problem.answer) {
    player.wrongAnswers++;
    return {
      newState: state,
      result: { success: false, playerId, action, error: "Wrong answer" },
    };
  }

  // Process the action
  let result: ActionResult;
  
  switch (action) {
    case "forward":
      result = processMove(state, player, "forward");
      break;
    case "boost":
      result = processMove(state, player, "boost");
      break;
    case "left":
      result = processLaneChange(state, player, -1);
      break;
    case "right":
      result = processLaneChange(state, player, 1);
      break;
    default:
      result = { success: false, playerId, action, error: "Unknown action" };
  }

  // Generate new problems if action was successful
  if (result.success) {
    player.problemsSolved++;
    player.problems = generatePlayerProblems(player.lane, state.config);
  }

  return { newState: state, result };
}

function getProblemForAction(player: RacePlayer, action: ActionType): RaceProblem | null {
  switch (action) {
    case "forward":
      return player.problems.forward;
    case "left":
      return player.problems.left;
    case "right":
      return player.problems.right;
    case "boost":
      return player.problems.boost;
    default:
      return null;
  }
}

function processMove(state: RaceState, player: RacePlayer, action: "forward" | "boost"): ActionResult {
  const previousPosition = player.position;
  const now = Date.now();
  
  // Calculate movement distance
  const moveDist = action === "forward" 
    ? state.config.forwardDistance 
    : state.config.boostDistance;
    
  // Apply "Speed Boost" powerup (now acts as distance multiplier)
  // If we have a generic "speed boost" drop, it doubles the move distance
  // NOTE: We need to handle the 'speedBoostActive' flag or similar if we kept it?
  // I removed speedBoostActive from RacePlayer but let's check if we need a temporary effect.
  // Since I removed the explicit flag, I'll skip the multiplier unless I re-add it as a "powerup" state.
  // For now, let's assume drops might just give instant distance or we rely on a different mechanism.
  // WAIT: The DropType includes "speed_boost". I should probably re-add a simple "distanceMultiplier" or similar to player state if I want to support it.
  // Let's check if I can use a temporary state.
  // For simplicity in this rebuild, let's say "speed_boost" drop gives an INSTANT forward burst rather than a duration buff, OR
  // we can say it doubles next X moves.
  // Re-reading my previous thought: I removed `speedBoostActive` from types. 
  // Let's implement "speed_boost" drop as an INSTANT +5m burst instead of a duration buff.
  
  const newPosition = Math.min(
    player.position + moveDist,
    state.config.trackLength
  );
  
  const distanceMoved = newPosition - player.position;
  player.position = newPosition;
  
  if (action === "boost") {
    player.boostsUsed++;
  }

  // Check for obstacle collision
  const obstacleHit = checkObstacleCollision(player, state.obstacles, previousPosition);
  if (obstacleHit) {
    player.isStunned = true;
    player.stunEndTime = Date.now() + obstacleHit.stunDuration;
    player.position = Math.max(0, player.position - obstacleHit.pushback);
    player.obstacleHits++;
  }
  
  // Check for drop collection
  let dropCollectedInfo: { dropId: string; type: DropType; effectDuration: number; coinValue?: number } | undefined;
  const dropCollected = checkDropCollection(player, state.drops, previousPosition, now);
  if (dropCollected) {
    // Handle specific drops
    if (dropCollected.drop.type === "speed_boost") {
      // Instant burst instead of duration
      player.position = Math.min(player.position + 5, state.config.trackLength);
      dropCollectedInfo = { dropId: dropCollected.drop.id, type: "speed_boost", effectDuration: 0 };
    } else if (dropCollected.drop.type === "coin") {
      player.coinPickups++;
      player.coinsEarned += dropCollected.coinValue ?? COIN_DROP_VALUE;
      dropCollectedInfo = {
        dropId: dropCollected.drop.id,
        type: "coin",
        effectDuration: 0,
        coinValue: dropCollected.coinValue ?? COIN_DROP_VALUE,
      };
    } else {
      applyDropEffect(player, dropCollected.drop, state.players);
      dropCollectedInfo = { 
        dropId: dropCollected.drop.id,
        type: dropCollected.drop.type, 
        effectDuration: DROP_EFFECTS[dropCollected.drop.type].duration 
      };
    }
  }

  // Check for finish
  const finished = player.position >= state.config.trackLength;
  let finishPosition: number | undefined;
  
  if (finished && player.finishPosition === null) {
    finishPosition = state.finishOrder.length + 1;
    player.finishPosition = finishPosition;
    player.finishTime = Date.now() - state.startTime;
    state.finishOrder.push(player.id);
  }

  return {
    success: true,
    playerId: player.id,
    action,
    newPosition: player.position,
    newLane: player.lane,
    distanceMoved,
    finished,
    finishPosition,
    obstacleHit: obstacleHit ? { type: obstacleHit.obstacle.type, stunDuration: obstacleHit.stunDuration } : undefined,
    dropCollected: dropCollectedInfo,
  };
}

function processLaneChange(
  state: RaceState,
  player: RacePlayer,
  direction: -1 | 1 // -1 = left, 1 = right
): ActionResult {
  const newLane = player.lane + direction;
  
  // Validate lane bounds
  if (newLane < 1 || newLane > state.config.laneCount) {
    return {
      success: false,
      playerId: player.id,
      action: direction === -1 ? "left" : "right",
      error: "Cannot move to that lane",
    };
  }

  const action: ActionType = direction === -1 ? "left" : "right";
  
  // Check for collision with another player in that lane
  const playerInTargetLane = state.players.find(p => 
    p.id !== player.id && 
    p.lane === newLane &&
    p.finishPosition === null && // Can't bump finished players
    Math.abs(p.position - player.position) <= 3 // Within bump range
  );

  player.lane = newLane;

  // If there's a collision, bump the other player
  if (playerInTargetLane) {
    return processBump(state, player, playerInTargetLane, action);
  }

  return {
    success: true,
    playerId: player.id,
    action,
    newLane: player.lane,
    newPosition: player.position,
  };
}

function processBump(
  state: RaceState,
  bumper: RacePlayer,
  victim: RacePlayer,
  action: ActionType
): ActionResult {
  // Check if victim is invulnerable
  if (Date.now() < victim.invulnerableEndTime) {
    return {
      success: false,
      playerId: bumper.id,
      action,
      error: "Target is invulnerable!",
    };
  }

  // Push victim back
  const newVictimPosition = Math.max(0, victim.position - state.config.pushbackDistance);
  victim.position = newVictimPosition;
  
  // Stun victim
  victim.isStunned = true;
  victim.stunEndTime = Date.now() + state.config.stunDuration;
  victim.bumpsReceived++;
  
  // Track bumper stats
  bumper.bumpsGiven++;

  return {
    success: true,
    playerId: bumper.id,
    action,
    newLane: bumper.lane,
    newPosition: bumper.position,
    bumpedPlayerId: victim.id,
    bumpedPlayerNewPosition: victim.position,
    bumpedPlayerStunned: true,
  };
}

// ============================================
// GAME FLOW
// ============================================

export function startCountdown(state: RaceState): RaceState {
  return {
    ...state,
    status: "countdown",
    countdownValue: 3,
  };
}

export function decrementCountdown(state: RaceState): RaceState {
  const newValue = state.countdownValue - 1;
  
  if (newValue <= 0) {
    return {
      ...state,
      status: "racing",
      startTime: Date.now(),
      countdownValue: 0,
    };
  }
  
  return {
    ...state,
    countdownValue: newValue,
  };
}

export function checkRaceOver(state: RaceState): boolean {
  // Race is over when all players have finished
  const activePlayers = state.players.filter(p => p.finishPosition === null);
  return activePlayers.length === 0;
}

export function handlePlayerDisconnect(
  state: RaceState,
  playerId: string
): RaceState {
  const player = state.players.find(p => p.id === playerId);
  
  if (player && player.finishPosition === null) {
    // Mark as DNF (Did Not Finish) - last position
    player.finishPosition = state.players.length;
    player.finishTime = null;
  }
  
  return state;
}

// ============================================
// RATING CALCULATIONS
// ============================================

export function calculateRaceRatings(state: RaceState): Record<string, number> {
  const ratingChanges: Record<string, number> = {};
  const K = 24; // K-factor for rating changes
  
  // Calculate average rating
  const avgRating = state.players.reduce((sum, p) => sum + p.rating, 0) / state.players.length;
  
  for (const player of state.players) {
    // Expected score based on rating vs average
    const expectedScore = 1 / (1 + Math.pow(10, (avgRating - player.rating) / 400));
    
    // Actual score based on finish position (normalized to 0-1)
    // 1st place = 1, last place = 0
    const actualScore = player.finishPosition 
      ? (state.players.length - player.finishPosition) / (state.players.length - 1)
      : 0; // DNF gets 0
    
    const change = Math.round(K * (actualScore - expectedScore));
    ratingChanges[player.id] = change;
  }
  
  return ratingChanges;
}

// ============================================
// OBSTACLE & DROP COLLISION
// ============================================

export interface ObstacleCollision {
  obstacle: TrackObstacle;
  stunDuration: number;
  pushback: number;
}

export interface DropCollection {
  drop: TrackDrop;
  effectDuration: number;
  coinValue?: number;
}

export function checkObstacleCollision(
  player: RacePlayer,
  obstacles: TrackObstacle[],
  previousPosition: number
): ObstacleCollision | null {
  // Check if player passed through any obstacle
  for (const obstacle of obstacles) {
    // Must be in same lane
    if (obstacle.lane !== player.lane) continue;
    
    // Check if obstacle is between previous and current position
    // We use a small epsilon or range since movement is discrete now
    const passedObstacle = 
      previousPosition < obstacle.position && 
      player.position >= obstacle.position;
    
    if (passedObstacle) {
      // Shield protects from obstacles
      if (player.hasShield && Date.now() < player.shieldEndTime) {
        player.hasShield = false;
        player.shieldEndTime = 0;
        continue;
      }
      
      // Invulnerability protects from obstacles
      if (Date.now() < player.invulnerableEndTime) {
        continue;
      }
      
      const effects = OBSTACLE_EFFECTS[obstacle.type];
      return {
        obstacle,
        stunDuration: effects.stunDuration,
        pushback: effects.pushback,
      };
    }
  }
  
  return null;
}

export function checkDropCollection(
  player: RacePlayer,
  drops: TrackDrop[],
  previousPosition: number,
  now: number
): DropCollection | null {
  // Check if player collected any drop
  const magnetActive = player.magnetEndTime > now;
  const magnetRange = 5; // meters forward reach when magnet is active

  for (const drop of drops) {
    // Skip already collected drops
    if (drop.collected) continue;
    
    // Lane check (ignored if magnet is active)
    if (!magnetActive && drop.lane !== player.lane) continue;
    
    // Check if drop is between previous and current position
    const passedDrop = magnetActive
      ? previousPosition < drop.position && player.position + magnetRange >= drop.position
      : previousPosition < drop.position && player.position >= drop.position;
    
    if (passedDrop) {
      // Mark as collected
      drop.collected = true;
      drop.collectedBy = player.id;
      player.dropsCollected++;
      
      const effects = DROP_EFFECTS[drop.type];
      const coinValue = drop.type === "coin" ? COIN_DROP_VALUE : undefined;
      return {
        drop,
        effectDuration: effects.duration,
        coinValue,
      };
    }
  }
  
  return null;
}

export function applyDropEffect(
  player: RacePlayer,
  drop: TrackDrop,
  allPlayers: RacePlayer[]
): void {
  const effects = DROP_EFFECTS[drop.type];
  const now = Date.now();
  
  switch (drop.type) {
    case "shield":
      player.hasShield = true;
      player.shieldEndTime = now + effects.duration;
      break;
      
    case "freeze_others":
      // Stun all other players
      for (const other of allPlayers) {
        if (other.id !== player.id && other.finishPosition === null) {
          // Shield protects from freeze
          if (other.hasShield && now < other.shieldEndTime) {
            other.hasShield = false;
            other.shieldEndTime = 0;
          } else {
            other.isStunned = true;
            other.stunEndTime = now + effects.duration;
          }
        }
      }
      break;
      
    case "magnet":
      // Pull in drops for the duration (lane-agnostic, see checkDropCollection)
      player.magnetEndTime = now + effects.duration;
      break;
      
    case "speed_boost":
        // Handled inline in processMove now for instant burst
        break;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function gameTick(
  state: RaceState,
  deltaTimeMs: number
): {
  state: RaceState;
  events: Array<{
    type: "finish" | "obstacle" | "drop";
    playerId: string;
    data: {
      // Obstacle hit data
      obstacleId?: string;
      obstacleType?: ObstacleType;
      stunDuration?: number;
      pushback?: number;
      
      // Drop collected data
      dropId?: string;
      dropType?: DropType;
      effectDuration?: number;
      coinValue?: number;
      
      // Finish data
      position?: number;
      time?: number;
    };
  }>;
} {
  const events: Array<{ 
    type: "finish" | "obstacle" | "drop"; 
    playerId: string; 
    data: {
      obstacleId?: string;
      obstacleType?: ObstacleType;
      stunDuration?: number;
      pushback?: number;
      dropId?: string;
      dropType?: DropType;
      effectDuration?: number;
      position?: number;
      time?: number;
    } 
  }> = [];
  const now = Date.now();

  // Calculate base movement for this tick
  const baseMovement = (state.config.baseSpeed || 0.2) * (deltaTimeMs / 1000);

  state.players.forEach(player => {
    // Skip finished players
    if (player.finishPosition !== null) return;

    // Update status timers
    if (player.isStunned && now >= player.stunEndTime) {
      player.isStunned = false;
      player.invulnerableEndTime = now + 2000; // 2 seconds invulnerability after stun
    }

    // Expire magnet
    if (player.magnetEndTime > 0 && now >= player.magnetEndTime) {
      player.magnetEndTime = 0;
    }

    // Apply base speed movement (only if not stunned)
    if (!player.isStunned) {
      const previousPosition = player.position;
      player.position = Math.min(
        player.position + baseMovement,
        state.config.trackLength
      );

      // Check for obstacle collision during base movement
      const obstacleHit = checkObstacleCollision(player, state.obstacles, previousPosition);
      if (obstacleHit) {
        player.isStunned = true;
        player.stunEndTime = now + obstacleHit.stunDuration;
        player.position = Math.max(0, player.position - obstacleHit.pushback);
        player.obstacleHits++;
        
        events.push({
          type: "obstacle",
          playerId: player.id,
          data: {
            obstacleId: obstacleHit.obstacle.id,
            obstacleType: obstacleHit.obstacle.type,
            stunDuration: obstacleHit.stunDuration,
            pushback: obstacleHit.pushback,
          },
        });
      }

      // Check for drop collection during base movement
      const dropCollected = checkDropCollection(player, state.drops, previousPosition, now);
      if (dropCollected) {
        if (dropCollected.drop.type === "speed_boost") {
          // Instant burst
          player.position = Math.min(player.position + 5, state.config.trackLength);
        } else if (dropCollected.drop.type === "coin") {
          player.coinPickups++;
          player.coinsEarned += dropCollected.coinValue ?? COIN_DROP_VALUE;
        } else {
          applyDropEffect(player, dropCollected.drop, state.players);
        }
        
        events.push({
          type: "drop",
          playerId: player.id,
          data: {
            dropId: dropCollected.drop.id,
            dropType: dropCollected.drop.type,
            effectDuration: dropCollected.effectDuration,
            ...(dropCollected.coinValue ? { coinValue: dropCollected.coinValue } : {}),
          },
        });
      }

      // Check for finish
      if (player.position >= state.config.trackLength && player.finishPosition === null) {
        const finishPosition = state.finishOrder.length + 1;
        player.finishPosition = finishPosition;
        player.finishTime = now - state.startTime;
        state.finishOrder.push(player.id);
        
        events.push({
          type: "finish",
          playerId: player.id,
          data: {
            position: finishPosition,
            time: player.finishTime,
          },
        });
      }
    }
  });

  return { state, events };
}

export function getRaceSnapshot(state: RaceState): Array<{
  id: string;
  lane: number;
  position: number;
  isStunned: boolean;
  hasShield: boolean;
}> {
  const now = Date.now();
  return state.players.map(p => ({
    id: p.id,
    lane: p.lane,
    position: p.position,
    isStunned: p.isStunned && now < p.stunEndTime,
    invulnerable: now < p.invulnerableEndTime,
    hasShield: p.hasShield && now < p.shieldEndTime,
  }));
}

export function getPlayerPublicInfo(player: RacePlayer): {
  id: string;
  username: string;
  rating: number;
  lane: number;
  position: number;
} {
  return {
    id: player.id,
    username: player.username,
    rating: player.rating,
    lane: player.lane,
    position: player.position,
  };
}
