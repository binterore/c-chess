import type { BoardState, Piece, PieceColor, Position } from '../types/chess';
import {
  ARABIC_NUMERALS,
  CHINESE_NUMERALS,
  FILE_MARKERS,
  MOVE_PREFIX,
  PIECE_NAMES
} from '../i18n/chess';

const BOARD_WIDTH = 9;
const BOARD_HEIGHT = 10;

const RED_BACK_RANK: Array<'chariot' | 'horse' | 'elephant' | 'advisor' | 'general' | 'advisor' | 'elephant' | 'horse' | 'chariot'> = [
  'chariot',
  'horse',
  'elephant',
  'advisor',
  'general',
  'advisor',
  'elephant',
  'horse',
  'chariot'
];

const BLACK_BACK_RANK = RED_BACK_RANK;

export function createEmptyBoard(): BoardState {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<null>(BOARD_WIDTH).fill(null));
}

export function createInitialBoard(): BoardState {
  const board = createEmptyBoard();
  const put = (x: number, y: number, type: Piece['type'], color: PieceColor, suffix: string) => {
    board[y][x] = { id: `${color[0]}_${type}_${suffix}`, type, color };
  };

  RED_BACK_RANK.forEach((type, x) => put(x, 9, type, 'red', `back_${x}`));
  BLACK_BACK_RANK.forEach((type, x) => put(x, 0, type, 'black', `back_${x}`));
  put(1, 7, 'cannon', 'red', 'cannon_1');
  put(7, 7, 'cannon', 'red', 'cannon_2');
  put(1, 2, 'cannon', 'black', 'cannon_1');
  put(7, 2, 'cannon', 'black', 'cannon_2');

  for (let index = 0; index < 5; index += 1) {
    put(index * 2, 6, 'soldier', 'red', `soldier_${index}`);
    put(index * 2, 3, 'soldier', 'black', `soldier_${index}`);
  }

  return board;
}

export function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

export function isInside(position: Position): boolean {
  return position[0] >= 0 && position[0] < BOARD_WIDTH && position[1] >= 0 && position[1] < BOARD_HEIGHT;
}

export function isInPalace(color: PieceColor, position: Position): boolean {
  const [x, y] = position;
  if (x < 3 || x > 5) return false;
  return color === 'red' ? y >= 7 && y <= 9 : y >= 0 && y <= 2;
}

export function findGeneral(board: BoardState, color: PieceColor): Position | null {
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const piece = board[y][x];
      if (piece?.type === 'general' && piece.color === color) return [x, y];
    }
  }
  return null;
}

export function countPiecesBetween(board: BoardState, from: Position, to: Position): number {
  const [fromX, fromY] = from;
  const [toX, toY] = to;
  let count = 0;

  if (fromX === toX) {
    const start = Math.min(fromY, toY) + 1;
    const end = Math.max(fromY, toY);
    for (let y = start; y < end; y += 1) count += board[y][fromX] ? 1 : 0;
  } else if (fromY === toY) {
    const start = Math.min(fromX, toX) + 1;
    const end = Math.max(fromX, toX);
    for (let x = start; x < end; x += 1) count += board[fromY][x] ? 1 : 0;
  } else {
    return Number.POSITIVE_INFINITY;
  }

  return count;
}

export function areGeneralsFacing(board: BoardState): boolean {
  const redGeneral = findGeneral(board, 'red');
  const blackGeneral = findGeneral(board, 'black');
  if (!redGeneral || !blackGeneral || redGeneral[0] !== blackGeneral[0]) return false;
  return countPiecesBetween(board, redGeneral, blackGeneral) === 0;
}

function canSoldierMove(piece: Piece, from: Position, to: Position): boolean {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const forward = piece.color === 'red' ? -1 : 1;
  if (dx === 0 && dy === forward) return true;
  const hasCrossedRiver = piece.color === 'red' ? from[1] <= 4 : from[1] >= 5;
  return hasCrossedRiver && Math.abs(dx) === 1 && dy === 0;
}

export function isPseudoLegalMove(board: BoardState, from: Position, to: Position): boolean {
  if (!isInside(from) || !isInside(to)) return false;
  if (from[0] === to[0] && from[1] === to[1]) return false;

  const piece = board[from[1]][from[0]];
  if (!piece) return false;
  const target = board[to[1]][to[0]];
  if (target?.color === piece.color) return false;

  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  switch (piece.type) {
    case 'general': {
      if (target?.type === 'general' && dx === 0) {
        return countPiecesBetween(board, from, to) === 0;
      }
      return isInPalace(piece.color, to) && absDx + absDy === 1;
    }
    case 'advisor':
      return isInPalace(piece.color, to) && absDx === 1 && absDy === 1;
    case 'elephant': {
      if (absDx !== 2 || absDy !== 2) return false;
      const staysOnOwnSide = piece.color === 'red' ? to[1] >= 5 : to[1] <= 4;
      const eye = [from[0] + dx / 2, from[1] + dy / 2] as Position;
      return staysOnOwnSide && board[eye[1]][eye[0]] === null;
    }
    case 'horse': {
      if (!((absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1))) return false;
      const leg = absDx === 2
        ? ([from[0] + dx / 2, from[1]] as Position)
        : ([from[0], from[1] + dy / 2] as Position);
      return board[leg[1]][leg[0]] === null;
    }
    case 'chariot':
      return (dx === 0 || dy === 0) && countPiecesBetween(board, from, to) === 0;
    case 'cannon': {
      if (dx !== 0 && dy !== 0) return false;
      const screens = countPiecesBetween(board, from, to);
      return target ? screens === 1 : screens === 0;
    }
    case 'soldier':
      return canSoldierMove(piece, from, to);
    default:
      return false;
  }
}

export function getPseudoLegalMoves(board: BoardState, from: Position): Position[] {
  const piece = board[from[1]]?.[from[0]];
  if (!piece) return [];
  const moves: Position[] = [];

  if (piece.type === 'chariot') {
    const directions: Position[] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    for (const [dx, dy] of directions) {
      let x = from[0] + dx;
      let y = from[1] + dy;
      while (x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT) {
        const to: Position = [x, y];
        const target = board[y][x];
        if (target?.color !== piece.color) moves.push(to);
        if (target) break;
        x += dx;
        y += dy;
      }
    }
    return moves;
  }

  if (piece.type === 'cannon') {
    const directions: Position[] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    for (const [dx, dy] of directions) {
      let x = from[0] + dx;
      let y = from[1] + dy;
      let screens = 0;
      while (x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT) {
        const target = board[y][x];
        if (!target) {
          if (screens === 0) moves.push([x, y]);
        } else if (screens === 0) {
          screens = 1;
        } else {
          if (target.color !== piece.color) moves.push([x, y]);
          break;
        }
        x += dx;
        y += dy;
      }
    }
    return moves;
  }

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const to: Position = [x, y];
      if (isPseudoLegalMove(board, from, to)) moves.push(to);
    }
  }
  return moves;
}

export function isInCheck(board: BoardState, color: PieceColor): boolean {
  const general = findGeneral(board, color);
  if (!general) return true;
  if (areGeneralsFacing(board)) return true;
  const enemy: PieceColor = color === 'red' ? 'black' : 'red';

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const piece = board[y][x];
      if (piece?.color === enemy && isPseudoLegalMove(board, [x, y], general)) return true;
    }
  }
  return false;
}

export function isLegalMove(
  board: BoardState,
  from: Position,
  to: Position,
  turn: PieceColor
): boolean {
  const piece = board[from[1]]?.[from[0]];
  if (!piece || piece.color !== turn || !isPseudoLegalMove(board, from, to)) return false;
  const next = cloneBoard(board);
  next[to[1]][to[0]] = piece;
  next[from[1]][from[0]] = null;
  return !isInCheck(next, turn);
}

export function getLegalMoves(board: BoardState, from: Position, turn: PieceColor): Position[] {
  const piece = board[from[1]]?.[from[0]];
  if (!piece || piece.color !== turn) return [];
  return getPseudoLegalMoves(board, from).filter((to) => isLegalMove(board, from, to, turn));
}

export function getAllLegalMoves(board: BoardState, turn: PieceColor): Array<{ from: Position; to: Position }> {
  const moves: Array<{ from: Position; to: Position }> = [];
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const piece = board[y][x];
      if (!piece || piece.color !== turn) continue;
      const from: Position = [x, y];
      for (const to of getLegalMoves(board, from, turn)) moves.push({ from, to });
    }
  }
  return moves;
}

export function hasAnyLegalMove(board: BoardState, turn: PieceColor): boolean {
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const piece = board[y][x];
      if (piece?.color === turn && getLegalMoves(board, [x, y], turn).length > 0) return true;
    }
  }
  return false;
}

export function applyBoardMove(board: BoardState, from: Position, to: Position): BoardState {
  const next = cloneBoard(board);
  const piece = next[from[1]][from[0]];
  if (!piece) return next;
  next[to[1]][to[0]] = piece;
  next[from[1]][from[0]] = null;
  return next;
}

export function positionKey(board: BoardState, turn: PieceColor): string {
  const symbols: Record<PieceColor, Record<Piece['type'], string>> = {
    red: {
      general: 'K',
      advisor: 'A',
      elephant: 'B',
      horse: 'N',
      chariot: 'R',
      cannon: 'C',
      soldier: 'P'
    },
    black: {
      general: 'k',
      advisor: 'a',
      elephant: 'b',
      horse: 'n',
      chariot: 'r',
      cannon: 'c',
      soldier: 'p'
    }
  };
  const rows = board.map((row) => row.map((piece) => (piece ? symbols[piece.color][piece.type] : '.')).join(''));
  return `${rows.join('/')} ${turn}`;
}

function fileLabel(color: PieceColor, x: number): string {
  return color === 'red' ? CHINESE_NUMERALS[8 - x] : ARABIC_NUMERALS[x];
}

function duplicateMarker(index: number, count: number): string {
  if (count === 2) return FILE_MARKERS.two[index];
  if (count === 3) return FILE_MARKERS.three[index];
  return FILE_MARKERS.many[Math.min(index, FILE_MARKERS.many.length - 1)];
}

export function toChineseNotation(board: BoardState, from: Position, to: Position): string {
  const piece = board[from[1]][from[0]];
  if (!piece) return '';

  const peers: number[] = [];
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    const candidate = board[y][from[0]];
    if (candidate?.color === piece.color && candidate.type === piece.type) peers.push(y);
  }

  peers.sort((a, b) => (piece.color === 'red' ? a - b : b - a));
  const sameFile = peers.length > 1;
  const prefix = sameFile
    ? `${duplicateMarker(peers.indexOf(from[1]), peers.length)}${PIECE_NAMES[piece.color][piece.type]}`
    : `${PIECE_NAMES[piece.color][piece.type]}${fileLabel(piece.color, from[0])}`;

  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  if (dy === 0) {
    return `${prefix}${MOVE_PREFIX.horizontal}${fileLabel(piece.color, to[0])}`;
  }

  const advancing = piece.color === 'red' ? dy < 0 : dy > 0;
  const direction = advancing ? MOVE_PREFIX.advance : MOVE_PREFIX.retreat;
  if (dx !== 0) {
    return `${prefix}${direction}${fileLabel(piece.color, to[0])}`;
  }

  const distance = Math.abs(dy);
  const numeral = piece.color === 'red' ? CHINESE_NUMERALS[distance - 1] : ARABIC_NUMERALS[distance - 1];
  return `${prefix}${direction}${numeral}`;
}

export function parseBoard(layout: string[]): BoardState {
  const board = createEmptyBoard();
  const symbols: Record<string, { type: Piece['type']; color: PieceColor }> = {
    K: { type: 'general', color: 'red' },
    A: { type: 'advisor', color: 'red' },
    B: { type: 'elephant', color: 'red' },
    N: { type: 'horse', color: 'red' },
    R: { type: 'chariot', color: 'red' },
    C: { type: 'cannon', color: 'red' },
    P: { type: 'soldier', color: 'red' },
    k: { type: 'general', color: 'black' },
    a: { type: 'advisor', color: 'black' },
    b: { type: 'elephant', color: 'black' },
    n: { type: 'horse', color: 'black' },
    r: { type: 'chariot', color: 'black' },
    c: { type: 'cannon', color: 'black' },
    p: { type: 'soldier', color: 'black' }
  };
  const counters: Record<string, number> = {};

  layout.forEach((row, y) => {
    if (row.length !== BOARD_WIDTH) throw new Error(`Invalid board row ${y}: ${row}`);
    for (let x = 0; x < row.length; x += 1) {
      const symbol = row[x];
      if (symbol === '.' || symbol === ' ') continue;
      const descriptor = symbols[symbol];
      if (!descriptor) throw new Error(`Unknown piece symbol ${symbol}`);
      const key = `${descriptor.color}_${descriptor.type}`;
      counters[key] = (counters[key] ?? 0) + 1;
      board[y][x] = { id: `${key}_${counters[key]}`, ...descriptor };
    }
  });

  return board;
}
