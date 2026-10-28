import { describe, expect, it } from 'vitest';
import { endgames, getEndgameBoard } from '../src/engine/endgames';
import { puzzleCopy, type PuzzleTitleKey } from '../src/i18n/puzzles';
import { applyMoveToSnapshot, createGameSnapshot } from '../src/engine/game';
import {
  applyBoardMove,
  getAllLegalMoves,
  hasAnyLegalMove,
  isInCheck,
  isLegalMove
} from '../src/engine/rules';

describe('Endgame archive', () => {
  it('contains thirty playable puzzles across five chapters', () => {
    expect(endgames).toHaveLength(30);
    expect(new Set(endgames.map((game) => game.chapter))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(new Set(endgames.map((game) => game.id)).size).toBe(30);
    expect(new Set(endgames.map((game) => puzzleCopy.titles[game.titleKey as PuzzleTitleKey])).size).toBe(30);
  });

  it.each(endgames.map((game) => [game.id, game] as const))('%s has a verified mating solution', (_id, game) => {
    const board = getEndgameBoard(game);
    expect(isInCheck(board, game.playerColor)).toBe(false);
    expect(getAllLegalMoves(board, game.playerColor).length).toBeGreaterThan(0);
    expect(isLegalMove(board, game.solution.from, game.solution.to, game.playerColor)).toBe(true);
    const next = applyBoardMove(board, game.solution.from, game.solution.to);
    const opponent = game.playerColor === 'red' ? 'black' : 'red';
    expect(isInCheck(next, opponent)).toBe(true);
    expect(hasAnyLegalMove(next, opponent)).toBe(false);
    const solved = applyMoveToSnapshot(createGameSnapshot(board), game.solution.from, game.solution.to).snapshot;
    expect(solved.status).toBe('ended');
    expect(solved.result).toEqual({ winner: game.playerColor, winnerColor: game.playerColor, reason: 'checkmate' });
  });
});
