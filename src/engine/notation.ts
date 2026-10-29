import type { BoardState, GameRecord, GameResult, Move, Piece, PieceColor, Position } from '../types/chess';
import { applyMoveToSnapshot, createGameSnapshot } from './game';
import { createEmptyBoard } from './rules';

const FEN_SYMBOLS: Record<Piece['type'], string> = {
  general: 'k',
  advisor: 'a',
  elephant: 'b',
  horse: 'n',
  chariot: 'r',
  cannon: 'c',
  soldier: 'p'
};

const FEN_TYPES: Record<string, Piece['type']> = {
  k: 'general',
  a: 'advisor',
  b: 'elephant',
  n: 'horse',
  r: 'chariot',
  c: 'cannon',
  p: 'soldier'
};

function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

export function boardToFen(board: BoardState, turn: PieceColor): string {
  const ranks = board.map((row) => {
    let result = '';
    let empty = 0;
    for (const piece of row) {
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty) {
        result += String(empty);
        empty = 0;
      }
      const symbol = FEN_SYMBOLS[piece.type];
      result += piece.color === 'red' ? symbol.toUpperCase() : symbol;
    }
    if (empty) result += String(empty);
    return result;
  });
  return `${ranks.join('/')} ${turn === 'red' ? 'w' : 'b'} - - 0 1`;
}

export function fenToBoard(fen: string): { board: BoardState; turn: PieceColor } {
  const [position, side] = fen.trim().split(/\s+/);
  if (!position) throw new Error('INVALID_FEN');
  const rows = position.split('/');
  if (rows.length !== 10) throw new Error('INVALID_FEN_RANKS');
  const board = createEmptyBoard();
  const counters: Record<string, number> = {};
  rows.forEach((rank, y) => {
    let x = 0;
    for (const token of rank) {
      if (/\d/.test(token)) {
        x += Number(token);
        continue;
      }
      const lower = token.toLowerCase();
      const type = FEN_TYPES[lower];
      if (!type) throw new Error('INVALID_FEN_PIECE');
      if (x >= 9) throw new Error('INVALID_FEN_FILE');
      const color: PieceColor = token === token.toUpperCase() ? 'red' : 'black';
      const key = `${color}_${type}`;
      counters[key] = (counters[key] ?? 0) + 1;
      board[y][x] = { id: `${key}_${counters[key]}`, type, color };
      x += 1;
    }
    if (x !== 9) throw new Error('INVALID_FEN_FILE');
  });
  return { board, turn: side === 'b' ? 'black' : 'red' };
}

export function positionToIccs(position: Position): string {
  return `${String.fromCharCode(97 + position[0])}${9 - position[1]}`;
}

export function parseIccs(token: string): { from: Position; to: Position } | null {
  const match = /^([a-i])([0-9])([a-i])([0-9])$/i.exec(token);
  if (!match) return null;
  return {
    from: [match[1].toLowerCase().charCodeAt(0) - 97, 9 - Number(match[2])],
    to: [match[3].toLowerCase().charCodeAt(0) - 97, 9 - Number(match[4])]
  };
}

function resultLabel(result?: GameResult): string {
  if (!result) return '*';
  if (result.winner === 'draw') return '1/2-1/2';
  return result.winner === 'red' ? '1-0' : '0-1';
}

function dateLabel(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10).replaceAll('-', '.');
}

export function recordToIccs(record: GameRecord): string {
  const headers = [
    `[Event "${record.dailyDate ? 'Daily Challenge' : 'Jiang Jie Game'}"]`,
    `[Date "${dateLabel(record.createdAt)}"]`,
    `[Red "${record.redName.replaceAll('"', "'")}"]`,
    `[Black "${record.blackName.replaceAll('"', "'")}"]`,
    `[Result "${resultLabel(record.result)}"]`,
    `[FEN "${boardToFen(record.initialBoard, record.initialTurn)}"]`,
    '[SetUp "1"]',
    ''
  ];
  const moves = record.history.map((move) => `${positionToIccs(move.from)}${positionToIccs(move.to)}`);
  const lines: string[] = [];
  for (let index = 0; index < moves.length; index += 2) {
    lines.push(`${index / 2 + 1}. ${moves[index]}${moves[index + 1] ? ` ${moves[index + 1]}` : ''}`);
  }
  if (lines.length === 0 || record.result) lines.push(resultLabel(record.result));
  return `${headers.join('\n')}${lines.join('\n')}\n`;
}

export function recordFromIccs(text: string, fallbackName = 'Imported game'): GameRecord {
  const headers = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const match = /^\[([A-Za-z]+)\s+"(.*)"\]$/.exec(line.trim());
    if (match) headers.set(match[1], match[2]);
  }
  const fen = headers.get('FEN') ?? 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
  const { board, turn } = fenToBoard(fen);
  const tokens = text
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('['))
    .join(' ')
    .split(/\s+/)
    .filter((token) => !/^\d+\.$/.test(token) && !['1-0', '0-1', '1/2-1/2', '*'].includes(token));
  let snapshot = createGameSnapshot(cloneBoard(board));
  snapshot = { ...snapshot, turn };
  const history: Move[] = [];
  for (const token of tokens) {
    const parsed = parseIccs(token);
    if (!parsed) continue;
    const result = applyMoveToSnapshot(snapshot, parsed.from, parsed.to);
    snapshot = result.snapshot;
    history.push(result.move);
  }
  const resultToken = headers.get('Result');
  const result: GameResult | undefined = resultToken === '1-0'
    ? { winner: 'red', winnerColor: 'red', reason: 'checkmate' }
    : resultToken === '0-1'
      ? { winner: 'black', winnerColor: 'black', reason: 'checkmate' }
      : resultToken === '1/2-1/2'
        ? { winner: 'draw', reason: 'agreement' }
        : snapshot.result;
  const now = Date.now();
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `import-${now}`,
    mode: 'replay',
    createdAt: Date.parse(headers.get('Date')?.replaceAll('.', '-') ?? '') || now,
    updatedAt: now,
    redName: headers.get('Red') ?? fallbackName,
    blackName: headers.get('Black') ?? 'Imported opponent',
    initialBoard: cloneBoard(board),
    initialTurn: turn,
    history,
    result
  };
}
