import { BoardState, Move, PieceColor, PieceType, Position } from '../types/chess';
import {
  cloneBoard,
  getLegalMoves,
  hasAnyLegalMove,
  isCheck,
  isLegalMove
} from './rules';

const PIECE_VALUES: Record<PieceType, number> = {
  general: 10000,
  chariot: 950,
  cannon: 480,
  horse: 450,
  advisor: 220,
  elephant: 220,
  soldier: 120
};

export function evaluateBoard(board: BoardState, aiColor: PieceColor): number {
  let score = 0;

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      let val = PIECE_VALUES[piece.type];

      if (piece.type === 'soldier') {
        const crossed = piece.color === 'red' ? y <= 4 : y >= 5;
        if (crossed) val += 90;
      }

      if (piece.color === aiColor) {
        score += val;
      } else {
        score -= val;
      }
    }
  }

  return score;
}

export function getBestAiMove(
  board: BoardState,
  aiColor: PieceColor
): { from: Position; to: Position } | null {
  const allMoves: { from: Position; to: Position; weight: number }[] = [];

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (piece && piece.color === aiColor) {
        const from: Position = [x, y];
        const moves = getLegalMoves(board, from, aiColor);

        for (const to of moves) {
          const target = board[to[1]][to[0]];
          let weight = 0;

          if (target) {
            weight += PIECE_VALUES[target.type] * 2 - PIECE_VALUES[piece.type] * 0.1;
          }

          const nextBoard = cloneBoard(board);
          nextBoard[to[1]][to[0]] = piece;
          nextBoard[y][x] = null;

          const opponentColor: PieceColor = aiColor === 'red' ? 'black' : 'red';
          if (isCheck(nextBoard, opponentColor)) {
            weight += 80;
            if (!hasAnyLegalMove(nextBoard, opponentColor)) {
              weight += 20000;
            }
          }

          weight += evaluateBoard(nextBoard, aiColor) * 0.05;
          weight += Math.random() * 5;

          allMoves.push({ from, to, weight });
        }
      }
    }
  }

  if (allMoves.length === 0) return null;

  allMoves.sort((a, b) => b.weight - a.weight);
  return { from: allMoves[0].from, to: allMoves[0].to };
}
