import { describe, expect, it } from 'vitest';
import {
  createInitialBoard,
  findGeneral,
  getAllLegalMoves,
  getLegalMoves,
  hasAnyLegalMove,
  isInCheck,
  isLegalMove,
  parseBoard,
  positionKey,
  toChineseNotation
} from '../src/engine/rules';
import {
  applyMoveToSnapshot,
  createGameSnapshot
} from '../src/engine/game';
import { getAiMove } from '../src/engine/ai';
import { NOTATION_EXPECTATIONS } from '../src/i18n/chess';

describe('Chinese chess rules', () => {
  it('creates the full starting position and legal opening moves', () => {
    const board = createInitialBoard();
    expect(board.flat().filter(Boolean)).toHaveLength(32);
    expect(getAllLegalMoves(board, 'red')).toHaveLength(44);
    expect(findGeneral(board, 'red')).toEqual([4, 9]);
    expect(findGeneral(board, 'black')).toEqual([4, 0]);
    const backRank = ['chariot', 'horse', 'elephant', 'advisor', 'general', 'advisor', 'elephant', 'horse', 'chariot'];
    backRank.forEach((type, x) => {
      expect(board[0][x]).toMatchObject({ type, color: 'black' });
      expect(board[9][x]).toMatchObject({ type, color: 'red' });
    });
    expect(board[2][1]).toMatchObject({ type: 'cannon', color: 'black' });
    expect(board[2][7]).toMatchObject({ type: 'cannon', color: 'black' });
    expect(board[7][1]).toMatchObject({ type: 'cannon', color: 'red' });
    expect(board[7][7]).toMatchObject({ type: 'cannon', color: 'red' });
    [0, 2, 4, 6, 8].forEach((x) => {
      expect(board[3][x]).toMatchObject({ type: 'soldier', color: 'black' });
      expect(board[6][x]).toMatchObject({ type: 'soldier', color: 'red' });
    });
  });

  it('handles the horse leg block', () => {
    const board = parseBoard([
      '....k....',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      '....A....',
      '....K....'
    ]);
    board[4][4] = { id: 'red_horse', color: 'red', type: 'horse' };
    board[4][5] = { id: 'red_soldier', color: 'red', type: 'soldier' };
    expect(isLegalMove(board, [4, 4], [6, 5], 'red')).toBe(false);
    board[4][5] = null;
    expect(isLegalMove(board, [4, 4], [6, 5], 'red')).toBe(true);
  });

  it('handles the elephant eye and river boundary', () => {
    const board = parseBoard([
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      '....k....',
      '.........',
      '..B......',
      '....K....',
      '.........'
    ]);
    expect(isLegalMove(board, [2, 7], [4, 5], 'red')).toBe(true);
    board[6][3] = { id: 'blocker', color: 'red', type: 'soldier' };
    expect(isLegalMove(board, [2, 7], [4, 5], 'red')).toBe(false);
    board[6][3] = null;
    expect(isLegalMove(board, [2, 7], [1, 4], 'red')).toBe(false);
  });

  it('requires exactly one screen for a cannon capture', () => {
    const board = parseBoard([
      '....k....',
      '.........',
      '.........',
      '....p....',
      '.........',
      '....P....',
      '.........',
      '....C....',
      '....A....',
      '....K....'
    ]);
    expect(isLegalMove(board, [4, 7], [4, 3], 'red')).toBe(true);
    expect(getLegalMoves(board, [4, 7], 'red')).toContainEqual([4, 3]);
    board[6][4] = { id: 'screen', color: 'red', type: 'soldier' };
    expect(isLegalMove(board, [4, 7], [4, 3], 'red')).toBe(false);
    expect(isLegalMove(board, [4, 7], [4, 2], 'red')).toBe(false);
  });

  it('allows soldiers to move sideways only after crossing the river', () => {
    const board = parseBoard([
      '....k....',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      'P........',
      '.........',
      '....A....',
      '....K....'
    ]);
    expect(isLegalMove(board, [0, 6], [1, 6], 'red')).toBe(false);
    board[4][0] = board[6][0];
    board[6][0] = null;
    expect(isLegalMove(board, [0, 4], [1, 4], 'red')).toBe(true);
    expect(isLegalMove(board, [0, 4], [0, 5], 'red')).toBe(false);
  });

  it('prevents generals from facing each other and filters self-check', () => {
    const board = parseBoard([
      '....k....',
      '.........',
      '.........',
      '.........',
      '....R....',
      '.........',
      '.........',
      '.........',
      '.........',
      '....K....'
    ]);
    expect(isLegalMove(board, [4, 4], [3, 4], 'red')).toBe(false);
    expect(isLegalMove(board, [4, 4], [4, 3], 'red')).toBe(true);
  });

  it('recognizes stalemate as no legal move without check', () => {
    const board = parseBoard([
      '....k....',
      '...R.R...',
      '..N......',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      '....A....',
      '....K....'
    ]);
    expect(isInCheck(board, 'black')).toBe(false);
    expect(hasAnyLegalMove(board, 'black')).toBe(false);
  });

  it('writes traditional Chinese move notation', () => {
    const board = createInitialBoard();
    NOTATION_EXPECTATIONS.forEach(({ from, to, value }) => {
      expect(toChineseNotation(board, from, to)).toBe(value);
    });
  });

  it('detects a threefold repetition', () => {
    let snapshot = createGameSnapshot();
    const cycle: Array<[[number, number], [number, number]]> = [
      [[1, 9], [2, 7]],
      [[1, 0], [2, 2]],
      [[2, 7], [1, 9]],
      [[2, 2], [1, 0]]
    ];
    for (let repetition = 0; repetition < 2; repetition += 1) {
      for (const [from, to] of cycle) snapshot = applyMoveToSnapshot(snapshot, from, to).snapshot;
    }
    expect(snapshot.status).toBe('ended');
    expect(snapshot.result).toEqual({ winner: 'draw', reason: 'repetition-draw' });
    expect(positionKey(snapshot.board, snapshot.turn)).toContain('K');
  });

  it('returns a legal AI move for the opening position', () => {
    const board = createInitialBoard();
    const move = getAiMove(board, 'red', 'easy', 150);
    expect(move).not.toBeNull();
    expect(getLegalMoves(board, move!.from, 'red').some(([x, y]) => x === move!.to[0] && y === move!.to[1])).toBe(true);
  });
});
