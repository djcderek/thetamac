// ============================================
// MULTIPLAYER TYPES
// ============================================

export type Operation = "+" | "-" | "×" | "÷";
export type Difficulty = "easy" | "medium" | "hard" | "expert";

export interface Problem {
  id: string;
  a: number;
  b: number;
  operation: Operation;
  answer: number;
}

export interface Player {
  id: string;
  socketId: string;
  username: string;
  rating: number;
  avatar?: string;
}

export interface GameConfig {
  rounds: number;
  timePerRound: number;
  difficulty: Difficulty;
  operations: Operation[];
}

export interface GameState {
  roomId: string;
  players: [Player, Player];
  scores: Record<string, number>;
  currentRound: number;
  totalRounds: number;
  currentProblem: Problem | null;
  roundStartTime: number;
  timePerRound: number;
  status: "waiting" | "countdown" | "playing" | "round_end" | "game_over";
  winner: string | null;
  roundWinner: string | null;
}

export interface MatchmakingEntry {
  socketId: string;
  playerId: string;
  username: string;
  rating: number;
  joinedAt: number;
}

// Socket Events - Client to Server
export interface ClientToServerEvents {
  // Matchmaking
  "matchmaking:join": (data: { userId: string; username: string; rating: number }) => void;
  "matchmaking:leave": () => void;
  
  // Game
  "game:submit_answer": (data: { answer: number; timeMs: number }) => void;
  "game:forfeit": () => void;
  "game:rematch_request": () => void;
  "game:rematch_accept": () => void;
  "game:rematch_decline": () => void;
  
  // Chat (optional)
  "game:quick_chat": (message: string) => void;
}

// Socket Events - Server to Client
export interface ServerToClientEvents {
  // Matchmaking
  "matchmaking:searching": (data: { position: number }) => void;
  "matchmaking:found": (data: { opponent: Omit<Player, "socketId"> }) => void;
  "matchmaking:cancelled": () => void;
  "matchmaking:error": (error: string) => void;
  
  // Game
  "game:start": (data: { gameState: GameState }) => void;
  "game:countdown": (data: { seconds: number }) => void;
  "game:new_round": (data: { round: number; problem: Problem }) => void;
  "game:round_result": (data: {
    winnerId: string | null;
    correctAnswer: number;
    scores: Record<string, number>;
    yourTime: number | null;
    opponentTime: number | null;
  }) => void;
  "game:time_up": () => void;
  "game:opponent_answered": () => void;
  "game:over": (data: {
    winnerId: string | null;
    finalScores: Record<string, number>;
    ratingChange: number;
  }) => void;
  "game:forfeit": (data: { forfeitedBy: string }) => void;
  "game:rematch_requested": () => void;
  "game:rematch_accepted": () => void;
  "game:rematch_declined": () => void;
  "game:opponent_disconnected": () => void;
  
  // Chat
  "game:quick_chat": (data: { from: string; message: string }) => void;
  
  // Connection
  "online_count": (count: number) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  username: string;
  roomId: string | null;
}

