// ============================================
// MATH RACERS - TYPES
// ============================================

export type Operation = "+" | "-" | "×" | "÷";
export type Difficulty = "easy" | "medium" | "hard" | "expert";

// ============================================
// TRACK OBJECTS (Obstacles & Drops)
// ============================================

export type ObstacleType = "barrier" | "oil_slick" | "cone" | "pothole";
export type DropType = "speed_boost" | "shield" | "freeze_others" | "magnet" | "coin";

export interface TrackObstacle {
  id: string;
  type: ObstacleType;
  lane: number;           // 1-5
  position: number;       // Distance from start in meters
  width: number;          // How much of the lane it covers (0-1)
}

export interface TrackDrop {
  id: string;
  type: DropType;
  lane: number;           // 1-5
  position: number;       // Distance from start in meters
  collected: boolean;     // Whether it's been picked up
  collectedBy: string | null; // Player ID who collected it
}

// ============================================
// PROBLEM TYPES
// ============================================

export interface RaceProblem {
  id: string;
  a: number;
  b: number;
  operation: Operation;
  answer: number;
  difficulty: "easy" | "medium" | "hard"; // Relative difficulty for this action
}

export interface PlayerProblems {
  forward: RaceProblem;      // Move forward 1m
  left: RaceProblem | null;  // Lane change left (null if in lane 1)
  right: RaceProblem | null; // Lane change right (null if in lane 5)
  boost: RaceProblem;        // Move forward 3m (harder)
}

// ============================================
// PLAYER STATE
// ============================================

export interface RacePlayer {
  id: string;
  socketId: string;
  username: string;
  rating: number;
  
  // Cosmetics
  selectedSkin?: string;
  selectedTrail?: string;
  selectedVehicle?: string;
  selectedWheel?: string;
  
  // Race state
  lane: number;           // 1-5
  position: number;       // meters from start (0 to trackLength)
  isStunned: boolean;
  stunEndTime: number;    // timestamp when stun ends
  invulnerableEndTime: number; // timestamp until when player is immune to stuns
  
  // Active powerups
  hasShield: boolean;     // Protects from one obstacle/bump
  shieldEndTime: number;  // When shield expires
  
  // Note: Speed boosts are now instant distance bonuses, not speed multipliers
  
  // Current problems
  problems: PlayerProblems;
  
  // Stats for this race
  problemsSolved: number;
  bumpsGiven: number;
  bumpsReceived: number;
  boostsUsed: number;
  wrongAnswers: number;
  dropsCollected: number;
  obstacleHits: number;
  coinPickups: number;
  coinsEarned: number;
  
  // Finish state
  finishPosition: number | null;
  finishTime: number | null; // ms from race start
}

// ============================================
// RACE STATE
// ============================================

export type RaceStatus = "waiting" | "countdown" | "racing" | "finished";

export interface RaceConfig {
  trackLength: number;       // meters to finish (default: 50)
  maxPlayers: number;        // max players (default: 5)
  difficulty: Difficulty;    // base difficulty
  operations: Operation[];   // enabled operations
  stunDuration: number;      // ms (default: 2000)
  pushbackDistance: number;  // meters on bump (default: 2)
  boostDistance: number;     // meters per boost (default: 3)
  forwardDistance: number;   // meters per forward solve (default: 1)
  wrongAnswerPenalty: number; // ms cooldown (default: 1500)
  obstacleCount: number;     // number of obstacles on track (default: 8)
  dropCount: number;         // number of drops on track (default: 6)
  coinDropCount: number;     // number of coin drops on track
  baseSpeed: number;         // meters per second automatic movement (default: 0.2)
}

export interface RaceState {
  raceId: string;
  players: RacePlayer[];
  config: RaceConfig;
  status: RaceStatus;
  startTime: number;         // timestamp when race started
  finishOrder: string[];     // player IDs in finish order
  countdownValue: number;    // current countdown number (3, 2, 1)
  obstacles: TrackObstacle[]; // obstacles on the track
  drops: TrackDrop[];        // collectible drops on the track
}

// ============================================
// ACTION TYPES
// ============================================

export type ActionType = "forward" | "left" | "right" | "boost";

export interface ActionResult {
  success: boolean;
  playerId: string;
  action: ActionType;
  
  // Movement
  newLane?: number;
  newPosition?: number;
  distanceMoved?: number;
  
  // Bump info
  bumpedPlayerId?: string;
  bumpedPlayerNewPosition?: number;
  bumpedPlayerStunned?: boolean;
  
  // Obstacle & Drop info
  obstacleHit?: {
    type: ObstacleType;
    stunDuration: number;
  };
  dropCollected?: {
    dropId: string;
    type: DropType;
    effectDuration: number;
    coinValue?: number;
  };
  
  // Finish
  finished?: boolean;
  finishPosition?: number;
  
  // Error
  error?: string;
}

// ============================================
// MATCHMAKING
// ============================================

export interface RaceMatchmakingEntry {
  socketId: string;
  playerId: string;
  username: string;
  rating: number;
  joinedAt: number;
  cosmetics?: UserCosmetics;
}

export interface RaceLobby {
  lobbyId: string;
  players: RaceMatchmakingEntry[];
  config: RaceConfig;
  createdAt: number;
  countdownStarted: boolean;
  startCountdown: number; // seconds until race starts (when enough players)
}

// ============================================
// SOCKET EVENTS - CLIENT TO SERVER
// ============================================

export interface UserCosmetics {
  equippedSkin: string | null;
  equippedTrail: string | null;
  equippedVehicle: string | null;
  equippedWheel: string | null;
}

export interface RaceClientToServerEvents {
  // Matchmaking
  "race:join_queue": (data: { cosmetics?: UserCosmetics }) => void;
  "race:leave_queue": () => void;
  
  // Game actions
  "race:submit_answer": (data: {
    action: ActionType;
    answer: number;
    problemId: string;
  }) => void;
  
  "race:forfeit": () => void;
  "race:leave": () => void;
}

// ============================================
// SOCKET EVENTS - SERVER TO CLIENT
// ============================================

export interface RaceServerToClientEvents {
  // Matchmaking
  "race:queue_update": (data: {
    playersInQueue: number;
    estimatedWait: number;
  }) => void;
  
  "race:lobby_joined": (data: {
    lobbyId: string;
    players: Array<{ 
      id: string; 
      username: string; 
      rating: number;
      cosmetics?: UserCosmetics;
    }>;
    config: RaceConfig;
  }) => void;
  
  "race:player_joined": (data: {
    player: { 
      id: string; 
      username: string; 
      rating: number;
      cosmetics?: UserCosmetics;
    };
    totalPlayers: number;
  }) => void;
  
  "race:player_left": (data: {
    playerId: string;
    totalPlayers: number;
  }) => void;
  
  "race:starting_soon": (data: {
    secondsUntilStart: number;
  }) => void;
  
  // Game events
  "race:countdown": (data: { seconds: number }) => void;
  
  "race:start": (data: {
    raceId: string;
    players: Array<{
      id: string;
      username: string;
      rating: number;
      lane: number;
      position: number;
      selectedSkin?: string;
      selectedTrail?: string;
      selectedVehicle?: string;
      selectedWheel?: string;
    }>;
    config: RaceConfig;
    yourProblems: PlayerProblems;
    obstacles: TrackObstacle[];
    drops: TrackDrop[];
  }) => void;
  
  "race:state_update": (data: {
    players: Array<{
      id: string;
      lane: number;
      position: number;
      isStunned: boolean;
      hasShield: boolean;
    }>;
  }) => void;
  
  "race:action_result": (data: {
    playerId: string;
    action: ActionType;
    success: boolean;
    newLane?: number;
    newPosition?: number;
    
    // Bump info
    bumpedPlayerId?: string;
    bumpedPlayerNewPosition?: number;
    
    // Your new problems (only sent to the acting player, null if finished)
    yourNewProblems?: PlayerProblems | null;
  }) => void;
  
  "race:player_bumped": (data: {
    bumperId: string;
    victimId: string;
    victimNewPosition: number;
    victimNewLane: number;
    stunDuration: number;
  }) => void;
  
  "race:wrong_answer": (data: {
    playerId: string;
    action: ActionType;
    cooldownMs: number;
  }) => void;
  
  "race:player_finished": (data: {
    playerId: string;
    position: number; // 1st, 2nd, 3rd, etc.
    time: number;     // ms from start
  }) => void;
  
  "race:finished": (data: {
    results: Array<{
      playerId: string;
      username: string;
      position: number;
      time: number | null;
      ratingChange: number;
      stats: {
        problemsSolved: number;
        bumpsGiven: number;
        bumpsReceived: number;
        boostsUsed: number;
      };
    }>;
    yourRatingChange: number;
    coinsEarned?: number;
  }) => void;
  
  "race:player_disconnected": (data: { playerId: string }) => void;
  
  "race:obstacle_hit": (data: {
    playerId: string;
    obstacleId: string;
    obstacleType: ObstacleType;
    stunDuration: number;
    pushback: number;
  }) => void;
  
  "race:drop_collected": (data: {
    playerId: string;
    dropId: string;
    dropType: DropType;
    effectDuration: number;
    coinValue?: number;
    coinsEarnedTotal?: number;
  }) => void;
  
  "race:drops_update": (data: {
    drops: TrackDrop[];
  }) => void;
  
  "race:powerup_activated": (data: {
    playerId: string;
    powerupType: DropType;
    duration: number;
  }) => void;
  
  "race:powerup_expired": (data: {
    playerId: string;
    powerupType: DropType;
    duration: number; 
  }) => void;
  
  "race:error": (error: string) => void;
}

// ============================================
// COMBINED SOCKET INTERFACES
// ============================================

export interface RaceInterServerEvents {
  ping: () => void;
}

export interface RaceSocketData {
  playerId: string;
  username: string;
  raceId: string | null;
  lobbyId: string | null;
}
