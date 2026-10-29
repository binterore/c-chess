import type {
  AiLevel,
  BoardState,
  Piece,
  PieceColor,
  PieceType,
  Position
} from '../types/chess';
import {
  applyBoardMove,
  getAllLegalMoves,
  isInCheck,
  positionKey
} from './rules';
import { findOpeningMove } from './openings';

const PIECE_VALUES: Record<PieceType, number> = {
  general: 100000,
  chariot: 1100,
  cannon: 520,
  horse: 470,
  advisor: 240,
  elephant: 240,
  soldier: 120
};

const POSITION_TABLES: Partial<Record<PieceType, number[][]>> = {
  soldier: [
    [0, 4, 8, 12, 18, 12, 8, 4, 0],
    [18, 30, 48, 66, 88, 66, 48, 30, 18],
    [16, 26, 42, 58, 72, 58, 42, 26, 16],
    [10, 20, 30, 44, 56, 44, 30, 20, 10],
    [6, 12, 18, 28, 36, 28, 18, 12, 6],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  horse: [
    [0, -4, 2, 4, 2, 4, 2, -4, 0],
    [2, 4, 8, 12, 10, 12, 8, 4, 2],
    [4, 8, 14, 18, 16, 18, 14, 8, 4],
    [6, 10, 18, 24, 22, 24, 18, 10, 6],
    [6, 12, 20, 28, 26, 28, 20, 12, 6],
    [4, 10, 18, 24, 22, 24, 18, 10, 4],
    [2, 8, 14, 18, 16, 18, 14, 8, 2],
    [0, 4, 8, 10, 8, 10, 8, 4, 0],
    [-2, 2, 4, 4, 2, 4, 4, 2, -2],
    [0, -4, 0, 2, 0, 2, 0, -4, 0]
  ],
  chariot: [
    [12, 14, 12, 18, 16, 18, 12, 14, 12],
    [14, 20, 18, 24, 26, 24, 18, 20, 14],
    [12, 16, 14, 20, 22, 20, 14, 16, 12],
    [12, 16, 14, 20, 22, 20, 14, 16, 12],
    [10, 14, 12, 18, 20, 18, 12, 14, 10],
    [8, 12, 10, 16, 18, 16, 10, 12, 8],
    [6, 10, 8, 14, 16, 14, 8, 10, 6],
    [4, 8, 6, 12, 14, 12, 6, 8, 4],
    [-2, 6, 2, 10, 12, 10, 2, 6, -2],
    [0, 0, -2, 6, 8, 6, -2, 0, 0]
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
  ]
};

interface SearchMove {
  from: Position;
  to: Position;
  captured?: Piece;
  order: number;
}

interface SearchResult {
  from: Position;
  to: Position;
  score: number;
  depth: number;
  nodes: number;
  elapsed: number;
  evaluation: number;
}

interface SearchContext {
  deadline: number;
  nodes: number;
  stopped: boolean;
  table: Map<string, { depth: number; score: number; bound: 'exact' | 'lower' | 'upper' }>;
  killers: Map<number, SearchMove[]>;
}

const LEVEL_CONFIG: Record<AiLevel, { depth: number; time: number; quiescence: number; noise: number }> = {
  easy: { depth: 2, time: 300, quiescence: 1, noise: 120 },
  medium: { depth: 4, time: 900, quiescence: 2, noise: 30 },
  hard: { depth: 6, time: 1800, quiescence: 3, noise: 0 }
};

function evaluate(board: BoardState, perspective: PieceColor): number {
  let score = 0;
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const piece = board[y][x];
      if (!piece) continue;
      const tableY = piece.color === 'red' ? y : 9 - y;
      const positional = POSITION_TABLES[piece.type]?.[tableY]?.[x] ?? 0;
      const value = PIECE_VALUES[piece.type] + positional;
      score += piece.color === perspective ? value : -value;
    }
  }
  return score;
}

function terminalScore(board: BoardState, turn: PieceColor, ply: number): number | null {
  const moves = getAllLegalMoves(board, turn);
  if (moves.length > 0) return null;
  return -900000 + ply * 100;
}

function applySearchMove(board: BoardState, move: SearchMove): BoardState {
  return applyBoardMove(board, move.from, move.to);
}

function orderedMoves(board: BoardState, turn: PieceColor, context?: SearchContext, ply = 0): SearchMove[] {
  const moves = getAllLegalMoves(board, turn).map(({ from, to }) => {
    const piece = board[from[1]][from[0]];
    const captured = board[to[1]][to[0]] ?? undefined;
    let order = captured ? 200000 + PIECE_VALUES[captured.type] * 10 - PIECE_VALUES[piece!.type] : 0;
    order += 60 - (Math.abs(4 - to[0]) + Math.abs(4 - to[1])) * 2;
    const killer = context?.killers.get(ply)?.some((candidate) => candidate.from[0] === from[0] && candidate.from[1] === from[1] && candidate.to[0] === to[0] && candidate.to[1] === to[1]);
    if (killer) order += 120000;
    return { from, to, captured, order };
  });
  moves.sort((a, b) => b.order - a.order);
  return moves;
}

function quiescence(
  board: BoardState,
  turn: PieceColor,
  alpha: number,
  beta: number,
  depth: number,
  ply: number,
  context: SearchContext
): number {
  if ((context.nodes & 255) === 0 && Date.now() >= context.deadline) {
    context.stopped = true;
    return evaluate(board, turn);
  }
  context.nodes += 1;

  const standing = evaluate(board, turn);
  if (depth <= 0) return standing;
  let best = standing;
  if (best >= beta) return best;
  if (best > alpha) alpha = best;

  const opponent: PieceColor = turn === 'red' ? 'black' : 'red';
  const captures = orderedMoves(board, turn, context, ply).filter((move) => move.captured || isInCheck(applySearchMove(board, move), opponent));
  for (const move of captures) {
    const next = applySearchMove(board, move);
    const score = -quiescence(next, opponent, -beta, -alpha, depth - 1, ply + 1, context);
    if (context.stopped) return best;
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}

function negamax(
  board: BoardState,
  turn: PieceColor,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  context: SearchContext,
  quiescenceDepth: number
): number {
  if ((context.nodes & 255) === 0 && Date.now() >= context.deadline) {
    context.stopped = true;
    return evaluate(board, turn);
  }

  const terminal = terminalScore(board, turn, ply);
  if (terminal !== null) return terminal;
  if (depth <= 0) return quiescence(board, turn, alpha, beta, quiescenceDepth, ply, context);

  const key = positionKey(board, turn);
  const cached = context.table.get(key);
  if (cached && cached.depth >= depth) {
    if (cached.bound === 'exact') return cached.score;
    if (cached.bound === 'lower' && cached.score >= beta) return cached.score;
    if (cached.bound === 'upper' && cached.score <= alpha) return cached.score;
    if (cached.bound === 'lower') alpha = Math.max(alpha, cached.score);
    if (cached.bound === 'upper') beta = Math.min(beta, cached.score);
    if (alpha >= beta) return cached.score;
  }

  context.nodes += 1;
  const initialAlpha = alpha;
  const opponent: PieceColor = turn === 'red' ? 'black' : 'red';
  let best = -Infinity;

  for (const move of orderedMoves(board, turn, context, ply)) {
    const next = applySearchMove(board, move);
    const score = -negamax(next, opponent, depth - 1, -beta, -alpha, ply + 1, context, quiescenceDepth);
    if (context.stopped) return best === -Infinity ? evaluate(board, turn) : best;
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) {
      const killers = context.killers.get(ply) ?? [];
      if (!killers.some((candidate) => candidate.from[0] === move.from[0] && candidate.from[1] === move.from[1] && candidate.to[0] === move.to[0] && candidate.to[1] === move.to[1])) {
        context.killers.set(ply, [move, ...killers].slice(0, 2));
      }
      break;
    }
  }

  const bound = best <= initialAlpha ? 'upper' : best >= beta ? 'lower' : 'exact';
  context.table.set(key, { depth, score: best, bound });
  return best;
}

function searchAtDepth(
  board: BoardState,
  turn: PieceColor,
  depth: number,
  context: SearchContext,
  quiescenceDepth: number
): SearchResult | null {
  const opponent: PieceColor = turn === 'red' ? 'black' : 'red';
  const moves = orderedMoves(board, turn, context);
  let alpha = -Infinity;
  let best: SearchResult | null = null;

  for (const move of moves) {
    const next = applySearchMove(board, move);
    const score = -negamax(next, opponent, depth - 1, -Infinity, -alpha, 1, context, quiescenceDepth);
    if (context.stopped) break;
    const candidate: SearchResult = {
      from: move.from,
      to: move.to,
      score,
      depth,
      nodes: context.nodes,
      elapsed: 0,
      evaluation: evaluate(next, turn)
    };
    if (!best || score > best.score) best = candidate;
    alpha = Math.max(alpha, score);
  }

  return best;
}

export function searchBestMove(
  board: BoardState,
  turn: PieceColor,
  level: AiLevel,
  overrideTime?: number
): SearchResult | null {
  const config = LEVEL_CONFIG[level];
  const began = Date.now();
  const context: SearchContext = {
    deadline: began + (overrideTime ?? config.time),
    nodes: 0,
    stopped: false,
    table: new Map(),
    killers: new Map()
  };
  const legal = orderedMoves(board, turn, context);
  if (legal.length === 0) return null;

  const bookChance = level === 'easy' ? 0.2 : level === 'medium' ? 0.38 : 0.55;
  const bookMove = findOpeningMove(board, turn);
  if (bookMove && Math.random() < bookChance) {
    return {
      ...bookMove,
      score: evaluate(board, turn),
      depth: 0,
      nodes: 0,
      elapsed: Date.now() - began,
      evaluation: evaluate(board, turn)
    };
  }

  let completed = searchAtDepth(board, turn, 1, context, config.quiescence) ?? {
    from: legal[0].from,
    to: legal[0].to,
    score: evaluate(board, turn),
    depth: 1,
    nodes: context.nodes,
    elapsed: 0,
    evaluation: evaluate(board, turn)
  };

  for (let depth = 2; depth <= config.depth; depth += 1) {
    const result = searchAtDepth(board, turn, depth, context, config.quiescence);
    if (!result || context.stopped) break;
    completed = result;
  }

  if (config.noise > 0) {
    const rootMoves = orderedMoves(board, turn, context);
    const perturbed = rootMoves
      .map((move) => {
        const next = applySearchMove(board, move);
        const score = evaluate(next, turn) + (Math.random() * 2 - 1) * config.noise;
        return { from: move.from, to: move.to, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, level === 'easy' ? 4 : 2);
    const chosen = perturbed[Math.floor(Math.random() * perturbed.length)] ?? completed;
    completed = { ...completed, from: chosen.from, to: chosen.to };
  }

  return {
    ...completed,
    nodes: context.nodes,
    elapsed: Date.now() - began,
    evaluation: completed.score
  };
}

export function getAiMove(
  board: BoardState,
  turn: PieceColor,
  level: AiLevel,
  maxTime?: number
): { from: Position; to: Position } | null {
  const result = searchBestMove(board, turn, level, maxTime);
  return result ? { from: result.from, to: result.to } : null;
}
