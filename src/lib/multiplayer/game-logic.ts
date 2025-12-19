import { randomUUID } from "crypto";
import type { Problem, Operation, Difficulty, GameState, Player, GameConfig } from "./types";

// ============================================
// PROBLEM GENERATION
// ============================================

const difficultyConfig: Record<Difficulty, { addSubMax: number; mulDivMax: number }> = {
  easy: { addSubMax: 20, mulDivMax: 10 },
  medium: { addSubMax: 50, mulDivMax: 12 },
  hard: { addSubMax: 100, mulDivMax: 15 },
  expert: { addSubMax: 200, mulDivMax: 20 },
};

export function generateProblem(
  difficulty: Difficulty,
  operations: Operation[]
): Problem {
  const operation = operations[Math.floor(Math.random() * operations.length)];
  const config = difficultyConfig[difficulty];
  
  let a: number, b: number, answer: number;

  switch (operation) {
    case "+":
      a = Math.floor(Math.random() * config.addSubMax) + 1;
      b = Math.floor(Math.random() * config.addSubMax) + 1;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * config.addSubMax) + 1;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * config.mulDivMax) + 1;
      b = Math.floor(Math.random() * config.mulDivMax) + 1;
      answer = a * b;
      break;
    case "÷":
      // Keep BOTH displayed numbers (dividend 'a' and divisor 'b') within mulDivMax
      // while ensuring an integer quotient.
      b = Math.floor(Math.random() * config.mulDivMax) + 1;
      // a = b * answer <= mulDivMax => answer <= floor(mulDivMax / b)
      answer = Math.floor(Math.random() * Math.floor(config.mulDivMax / b)) + 1;
      a = b * answer;
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
  };
}

// ============================================
// GAME STATE MANAGEMENT
// ============================================

export function createGameState(
  roomId: string,
  player1: Player,
  player2: Player,
  config: GameConfig
): GameState {
  return {
    roomId,
    players: [player1, player2],
    scores: {
      [player1.id]: 0,
      [player2.id]: 0,
    },
    currentRound: 0,
    totalRounds: config.rounds,
    currentProblem: null,
    roundStartTime: 0,
    timePerRound: config.timePerRound,
    status: "waiting",
    winner: null,
    roundWinner: null,
  };
}

export function startNewRound(
  gameState: GameState,
  difficulty: Difficulty,
  operations: Operation[]
): GameState {
  const problem = generateProblem(difficulty, operations);
  
  return {
    ...gameState,
    currentRound: gameState.currentRound + 1,
    currentProblem: problem,
    roundStartTime: Date.now(),
    status: "playing",
    roundWinner: null,
  };
}

export interface RoundResult {
  winnerId: string | null;
  correctAnswer: number;
  scores: Record<string, number>;
  playerTimes: Record<string, number | null>;
}

export function processRoundEnd(
  gameState: GameState,
  answers: Map<string, { answer: number; timeMs: number }>
): { newState: GameState; result: RoundResult } {
  const correctAnswer = gameState.currentProblem!.answer;
  const playerTimes: Record<string, number | null> = {};
  let winnerId: string | null = null;
  let winnerTime = Infinity;

  // Find the winner (first correct answer)
  for (const player of gameState.players) {
    const submission = answers.get(player.id);
    if (submission) {
      playerTimes[player.id] = submission.timeMs;
      if (submission.answer === correctAnswer && submission.timeMs < winnerTime) {
        winnerId = player.id;
        winnerTime = submission.timeMs;
      }
    } else {
      playerTimes[player.id] = null;
    }
  }

  // Update scores
  const newScores = { ...gameState.scores };
  if (winnerId) {
    newScores[winnerId] = (newScores[winnerId] || 0) + 1;
  }

  const newState: GameState = {
    ...gameState,
    scores: newScores,
    status: "round_end",
    roundWinner: winnerId,
  };

  return {
    newState,
    result: {
      winnerId,
      correctAnswer,
      scores: newScores,
      playerTimes,
    },
  };
}

export function checkGameOver(gameState: GameState): {
  isOver: boolean;
  winnerId: string | null;
} {
  const maxRounds = gameState.totalRounds;
  const halfRounds = Math.ceil(maxRounds / 2);

  // Check if someone has won majority
  for (const player of gameState.players) {
    if (gameState.scores[player.id] >= halfRounds) {
      return { isOver: true, winnerId: player.id };
    }
  }

  // Check if all rounds completed
  if (gameState.currentRound >= maxRounds) {
    const player1 = gameState.players[0];
    const player2 = gameState.players[1];
    const score1 = gameState.scores[player1.id];
    const score2 = gameState.scores[player2.id];

    if (score1 > score2) {
      return { isOver: true, winnerId: player1.id };
    } else if (score2 > score1) {
      return { isOver: true, winnerId: player2.id };
    } else {
      return { isOver: true, winnerId: null }; // Tie
    }
  }

  return { isOver: false, winnerId: null };
}

// ============================================
// ELO RATING
// ============================================

export function calculateRatingChange(
  winnerRating: number,
  loserRating: number,
  isDraw: boolean = false
): { winnerChange: number; loserChange: number } {
  const K = 32; // K-factor for rating changes
  
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;

  if (isDraw) {
    const change = Math.round(K * (0.5 - expectedWinner));
    return { winnerChange: change, loserChange: -change };
  }

  const winnerChange = Math.round(K * (1 - expectedWinner));
  const loserChange = Math.round(K * (0 - expectedLoser));

  return { winnerChange, loserChange };
}

