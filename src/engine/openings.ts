import type { BoardState, PieceColor, Position } from '../types/chess';
import { applyBoardMove, createInitialBoard, isLegalMove, positionKey } from './rules';

interface OpeningMove { from: Position; to: Position; weight: number }
interface OpeningLine { moves: Array<{ from: Position; to: Position }>; weight: number }

const lines: OpeningLine[] = [
  { weight: 5, moves: [{ from: [7, 7], to: [4, 7] }, { from: [1, 0], to: [2, 2] }, { from: [7, 9], to: [6, 7] }, { from: [7, 0], to: [6, 2] }] },
  { weight: 4, moves: [{ from: [7, 7], to: [4, 7] }, { from: [7, 0], to: [6, 2] }, { from: [1, 9], to: [2, 7] }, { from: [1, 0], to: [2, 2] }] },
  { weight: 4, moves: [{ from: [1, 7], to: [4, 7] }, { from: [1, 0], to: [2, 2] }, { from: [7, 9], to: [6, 7] }, { from: [7, 0], to: [6, 2] }] },
  { weight: 3, moves: [{ from: [2, 6], to: [2, 5] }, { from: [2, 3], to: [2, 4] }, { from: [7, 9], to: [6, 7] }, { from: [7, 0], to: [6, 2] }] },
  { weight: 2, moves: [{ from: [7, 9], to: [6, 7] }, { from: [7, 0], to: [6, 2] }, { from: [1, 7], to: [4, 7] }, { from: [1, 0], to: [2, 2] }] }
];

const book = new Map<string, OpeningMove[]>();
for (const line of lines) {
  let board = createInitialBoard();
  let turn: PieceColor = 'red';
  line.moves.forEach((move, index) => {
    const key = positionKey(board, turn);
    const candidates = book.get(key) ?? [];
    const existing = candidates.find((candidate) => candidate.from[0] === move.from[0] && candidate.from[1] === move.from[1] && candidate.to[0] === move.to[0] && candidate.to[1] === move.to[1]);
    if (existing) existing.weight += line.weight;
    else candidates.push({ ...move, weight: line.weight + (index === 0 ? 2 : 0) });
    book.set(key, candidates);
    board = applyBoardMove(board, move.from, move.to);
    turn = turn === 'red' ? 'black' : 'red';
  });
}

export function findOpeningMove(board: BoardState, turn: PieceColor): { from: Position; to: Position } | null {
  const candidates = (book.get(positionKey(board, turn)) ?? []).filter((move) => isLegalMove(board, move.from, move.to, turn));
  if (!candidates?.length) return null;
  const total = candidates.reduce((sum, move) => sum + move.weight, 0);
  let selection = Math.random() * total;
  for (const move of candidates) {
    selection -= move.weight;
    if (selection <= 0) return { from: move.from, to: move.to };
  }
  return { from: candidates[0].from, to: candidates[0].to };
}
