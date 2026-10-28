import type {
  BoardState,
  GameResult,
  GameSnapshot,
  Move,
  PieceColor,
  Position
} from '../types/chess';
import {
  applyBoardMove,
  createInitialBoard,
  getLegalMoves,
  hasAnyLegalMove,
  isInCheck,
  isLegalMove,
  positionKey,
  toChineseNotation
} from './rules';

export function createGameSnapshot(board: BoardState = createInitialBoard()): GameSnapshot {
  return {
    board,
    turn: 'red',
    history: [],
    positionCounts: { [positionKey(board, 'red')]: 1 },
    status: 'playing'
  };
}

function hasContinuousChecks(history: Move[], color: PieceColor): boolean {
  const recent = history.slice(-12).filter((move) => move.piece.color === color);
  return recent.length >= 4 && recent.every((move) => move.givesCheck);
}

function repetitionResult(history: Move[]): GameResult {
  const redChecks = hasContinuousChecks(history, 'red');
  const blackChecks = hasContinuousChecks(history, 'black');

  if (redChecks && !blackChecks) return { winner: 'black', winnerColor: 'black', reason: 'perpetual-check' };
  if (blackChecks && !redChecks) return { winner: 'red', winnerColor: 'red', reason: 'perpetual-check' };
  return { winner: 'draw', reason: 'repetition-draw' };
}

export function applyMoveToSnapshot(
  snapshot: GameSnapshot,
  from: Position,
  to: Position
): { snapshot: GameSnapshot; move: Move } {
  if (snapshot.status !== 'playing') throw new Error('GAME_ENDED');
  if (!isLegalMove(snapshot.board, from, to, snapshot.turn)) throw new Error('ILLEGAL_MOVE');

  const piece = snapshot.board[from[1]][from[0]];
  if (!piece) throw new Error('NO_PIECE');
  const captured = snapshot.board[to[1]][to[0]] ?? undefined;
  const nextBoard = applyBoardMove(snapshot.board, from, to);
  const opponent: PieceColor = snapshot.turn === 'red' ? 'black' : 'red';
  const givesCheck = isInCheck(nextBoard, opponent);
  const opponentCanMove = hasAnyLegalMove(nextBoard, opponent);
  const checkmate = givesCheck && !opponentCanMove;
  const stalemate = !givesCheck && !opponentCanMove;

  const move: Move = {
    from,
    to,
    piece,
    captured,
    notation: toChineseNotation(snapshot.board, from, to),
    kind: checkmate ? 'checkmate' : givesCheck ? 'check' : captured ? 'capture' : 'quiet',
    givesCheck,
    checkmate,
    createdAt: Date.now()
  };

  const key = positionKey(nextBoard, opponent);
  const positionCounts = {
    ...snapshot.positionCounts,
    [key]: (snapshot.positionCounts[key] ?? 0) + 1
  };
  const history = [...snapshot.history, move];
  let result: GameResult | undefined;

  if (checkmate) {
    result = { winner: snapshot.turn, winnerColor: snapshot.turn, reason: 'checkmate' };
  } else if (stalemate) {
    result = { winner: snapshot.turn, winnerColor: snapshot.turn, reason: 'stalemate' };
  } else if (positionCounts[key] >= 3) {
    result = repetitionResult(history);
  }

  return {
    snapshot: {
      board: nextBoard,
      turn: opponent,
      history,
      positionCounts,
      status: result ? 'ended' : 'playing',
      result,
      lastMove: move
    },
    move
  };
}

export function legalDestinations(snapshot: GameSnapshot, from: Position): Position[] {
  if (snapshot.status !== 'playing') return [];
  return getLegalMoves(snapshot.board, from, snapshot.turn);
}

export function replayMoves(
  initialBoard: BoardState,
  history: Move[],
  startingTurn: PieceColor = 'red'
): GameSnapshot {
  let snapshot: GameSnapshot = {
    ...createGameSnapshot(initialBoard),
    turn: startingTurn,
    positionCounts: { [positionKey(initialBoard, startingTurn)]: 1 }
  };
  for (const move of history) {
    snapshot = applyMoveToSnapshot(snapshot, move.from, move.to).snapshot;
  }
  return snapshot;
}

export function endByResignation(snapshot: GameSnapshot, loser: PieceColor): GameSnapshot {
  if (snapshot.status === 'ended') return snapshot;
  return {
    ...snapshot,
    status: 'ended',
    result: { winner: loser === 'red' ? 'black' : 'red', reason: 'resignation' }
  };
}

export function endByTimeout(snapshot: GameSnapshot, loser: PieceColor): GameSnapshot {
  if (snapshot.status === 'ended') return snapshot;
  return {
    ...snapshot,
    status: 'ended',
    result: { winner: loser === 'red' ? 'black' : 'red', reason: 'timeout' }
  };
}

export function endByAgreement(snapshot: GameSnapshot): GameSnapshot {
  if (snapshot.status === 'ended') return snapshot;
  return {
    ...snapshot,
    status: 'ended',
    result: { winner: 'draw', reason: 'agreement' }
  };
}
