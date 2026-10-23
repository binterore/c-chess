import { BoardState, PieceColor, PieceType, Position } from '../types/chess';
import {
  cloneBoard,
  getLegalMoves,
  hasAnyLegalMove,
  isCheck
} from './rules';

const PIECE_VALUES: Record<PieceType, number> = {
  general: 10000,
  chariot: 1000,
  cannon: 500,
  horse: 450,
  advisor: 250,
  elephant: 250,
  soldier: 100
};

const POSITION_WEIGHTS: Record<PieceType, number[][]> = {
  soldier: [
    [0, 3, 6, 9, 12, 9, 6, 3, 0],
    [18, 36, 56, 80, 100, 80, 56, 36, 18],
    [14, 26, 42, 60, 70, 60, 42, 26, 14],
    [10, 20, 30, 40, 50, 40, 30, 20, 10],
    [6, 12, 18, 24, 30, 24, 18, 12, 6],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  horse: [
    [0, -4, 0, 0, 0, 0, 0, -4, 0],
    [-2, 2, 4, 6, 4, 6, 4, 2, -2],
    [0, 4, 8, 12, 10, 12, 8, 4, 0],
    [2, 6, 12, 16, 14, 16, 12, 6, 2],
    [4, 8, 16, 20, 18, 20, 16, 8, 4],
    [4, 8, 16, 20, 18, 20, 16, 8, 4],
    [2, 6, 12, 16, 14, 16, 12, 6, 2],
    [0, 4, 8, 10, 8, 10, 8, 4, 0],
    [-2, 2, 4, 4, 2, 4, 4, 2, -2],
    [0, -4, 0, 0, 0, 0, 0, -4, 0]
  ],
  chariot: [
    [14, 14, 12, 18, 16, 18, 12, 14, 14],
    [16, 20, 18, 24, 26, 24, 18, 20, 16],
    [12, 16, 14, 20, 20, 20, 14, 16, 12],
    [12, 16, 14, 20, 20, 20, 14, 16, 12],
    [12, 14, 12, 16, 16, 16, 12, 14, 12],
    [10, 12, 10, 14, 14, 14, 10, 12, 10],
    [8, 10, 8, 12, 12, 12, 8, 10, 8],
    [8, 10, 8, 10, 14, 10, 8, 10, 8],
    [-2, 10, 4, 14, 10, 14, 4, 10, -2],
    [0, 0, -2, 10, 8, 10, -2, 0, 0]
  ],
  cannon: [
    [0, 0, 2, 4, 4, 4, 2, 0, 0],
    [0, 2, 4, 6, 6, 6, 4, 2, 0],
    [2, 4, 6, 8, 10, 8, 6, 4, 2],
    [2, 4, 6, 10, 12, 10, 6, 4, 2],
    [4, 6, 8, 12, 14, 12, 8, 6, 4],
    [4, 6, 8, 12, 14, 12, 8, 6, 4],
    [2, 4, 6, 8, 8, 8, 6, 4, 2],
    [0, 0, 2, 6, 6, 6, 2, 0, 0],
    [0, 0, 0, 2, 2, 2, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  advisor: Array(10).fill(Array(9).fill(0)),
  elephant: Array(10).fill(Array(9).fill(0)),
  general: Array(10).fill(Array(9).fill(0))
};

export function evaluateBoard(board: BoardState, evalColor: PieceColor): number {
  let score = 0;

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      let val = PIECE_VALUES[piece.type];

      const py = piece.color === 'red' ? 9 - y : y;
      const weightTable = POSITION_WEIGHTS[piece.type];
      if (weightTable && weightTable[py] && weightTable[py][x]) {
        val += weightTable[py][x];
      }

      if (piece.color === evalColor) {
        score += val;
      } else {
        score -= val;
      }
    }
  }

  return score;
}

interface MoveCandidate {
  from: Position;
  to: Position;
  score: number;
}

function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: PieceColor
): number {
  const currentTurn: PieceColor = isMaximizing
    ? aiColor
    : aiColor === 'red'
    ? 'black'
    : 'red';

  const inCheck = isCheck(board, currentTurn);
  const hasMoves = hasAnyLegalMove(board, currentTurn);

  if (!hasMoves) {
    return inCheck ? (isMaximizing ? -20000 + (3 - depth) * 100 : 20000 - (3 - depth) * 100) : 0;
  }

  if (depth === 0) {
    return evaluateBoard(board, aiColor);
  }

  const moves: { from: Position; to: Position; priority: number }[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (p && p.color === currentTurn) {
        const legal = getLegalMoves(board, [x, y], currentTurn);
        for (const to of legal) {
          const target = board[to[1]][to[0]];
          let priority = 0;
          if (target) {
            priority = PIECE_VALUES[target.type] * 10 - PIECE_VALUES[p.type];
          }
          moves.push({ from: [x, y], to, priority });
        }
      }
    }
  }

  moves.sort((a, b) => b.priority - a.priority);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      const next = cloneBoard(board);
      next[m.to[1]][m.to[0]] = next[m.from[1]][m.from[0]];
      next[m.from[1]][m.from[0]] = null;

      const evalScore = minimax(next, depth - 1, alpha, beta, false, aiColor);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      const next = cloneBoard(board);
      next[m.to[1]][m.to[0]] = next[m.from[1]][m.from[0]];
      next[m.from[1]][m.from[0]] = null;

      const evalScore = minimax(next, depth - 1, alpha, beta, true, aiColor);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getBestAiMove(
  board: BoardState,
  aiColor: PieceColor
): { from: Position; to: Position } | null {
  const candidates: MoveCandidate[] = [];

  const moves: { from: Position; to: Position; priority: number }[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (p && p.color === aiColor) {
        const legal = getLegalMoves(board, [x, y], aiColor);
        for (const to of legal) {
          const target = board[to[1]][to[0]];
          let priority = 0;
          if (target) {
            priority = PIECE_VALUES[target.type] * 10 - PIECE_VALUES[p.type];
          }
          moves.push({ from: [x, y], to, priority });
        }
      }
    }
  }

  if (moves.length === 0) return null;

  moves.sort((a, b) => b.priority - a.priority);

  const searchDepth = 2;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const m of moves) {
    const next = cloneBoard(board);
    next[m.to[1]][m.to[0]] = next[m.from[1]][m.from[0]];
    next[m.from[1]][m.from[0]] = null;

    const score = minimax(next, searchDepth, alpha, beta, false, aiColor);
    candidates.push({ from: m.from, to: m.to, score });
    alpha = Math.max(alpha, score);
  }

  candidates.sort((a, b) => b.score - a.score);
  return { from: candidates[0].from, to: candidates[0].to };
}
