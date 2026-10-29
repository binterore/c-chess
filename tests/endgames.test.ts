import { describe, expect, it } from 'vitest';
import { endgames, getEndgameBoard, getPuzzleLine } from '../src/engine/endgames';
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

  it.each(endgames.map((game) => [game.id, game] as const))('%s has a verified forced mating line', (_id, game) => {
    const board = getEndgameBoard(game);
    expect(isInCheck(board, game.playerColor)).toBe(false);
    expect(getAllLegalMoves(board, game.playerColor).length).toBeGreaterThan(0);
    const line = getPuzzleLine(game);
    expect(line.length).toBe(game.targetMoves * 2 - 1);
    let snapshot = createGameSnapshot(board);
    line.forEach((step, index) => {
      const movingColor = index % 2 === 0 ? game.playerColor : (game.playerColor === 'red' ? 'black' : 'red');
      expect(snapshot.turn).toBe(movingColor);
      expect(isLegalMove(snapshot.board, step.from, step.to, movingColor)).toBe(true);
      if (index === 1) {
        const replies = getAllLegalMoves(snapshot.board, movingColor);
        expect(replies).toHaveLength(1);
      }
      snapshot = applyMoveToSnapshot(snapshot, step.from, step.to).snapshot;
    });
    expect(snapshot.status).toBe('ended');
    expect(snapshot.result).toEqual({ winner: game.playerColor, winnerColor: game.playerColor, reason: 'checkmate' });
  });

  it('has a unique first move in every puzzle', () => {
    for (const game of endgames) {
      const board = getEndgameBoard(game);
      const opponent = game.playerColor === 'red' ? 'black' : 'red';
      const winningMoves = getAllLegalMoves(board, game.playerColor).filter((move) => {
        const next = applyBoardMove(board, move.from, move.to);
        if (game.targetMoves === 1) return isInCheck(next, opponent) && !hasAnyLegalMove(next, opponent);
        if (!isInCheck(next, opponent)) return false;
        const replies = getAllLegalMoves(next, opponent);
        if (replies.length !== 1) return false;
        const afterReply = applyBoardMove(next, replies[0].from, replies[0].to);
        if (isInCheck(afterReply, game.playerColor)) return false;
        return getAllLegalMoves(afterReply, game.playerColor).filter((mate) => {
          const mateBoard = applyBoardMove(afterReply, mate.from, mate.to);
          return isInCheck(mateBoard, opponent) && !hasAnyLegalMove(mateBoard, opponent);
        }).length === 1;
      });
      expect(winningMoves).toHaveLength(1);
    }
  });
});
