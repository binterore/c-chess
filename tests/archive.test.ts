import { describe, expect, it } from 'vitest';
import { createInitialBoard } from '../src/engine/rules';
import { createGameSnapshot, applyMoveToSnapshot } from '../src/engine/game';
import { boardToFen, fenToBoard, recordFromIccs, recordToIccs } from '../src/engine/notation';
import { calculateDailyStreak, getDailyEndgame, localDateKey } from '../src/engine/daily';
import type { GameRecord } from '../src/types/chess';

describe('Xiangqi archive format', () => {
  it('round-trips the starting FEN', () => {
    const board = createInitialBoard();
    const fen = boardToFen(board, 'red');
    const parsed = fenToBoard(fen);
    expect(boardToFen(parsed.board, parsed.turn)).toBe(fen);
  });

  it('round-trips a complete ICCS record', () => {
    let snapshot = createGameSnapshot();
    snapshot = applyMoveToSnapshot(snapshot, [1, 7], [4, 7]).snapshot;
    snapshot = applyMoveToSnapshot(snapshot, [1, 0], [2, 2]).snapshot;
    snapshot = applyMoveToSnapshot(snapshot, [0, 9], [0, 8]).snapshot;
    const record: GameRecord = {
      id: 'record-1', mode: 'local', createdAt: Date.now(), updatedAt: Date.now(),
      redName: '红方', blackName: '黑方', initialBoard: createInitialBoard(), initialTurn: 'red',
      history: snapshot.history
    };
    const text = recordToIccs(record);
    const imported = recordFromIccs(text);
    expect(imported.history.map((move) => move.notation)).toEqual(record.history.map((move) => move.notation));
    expect(imported.redName).toBe('红方');
    expect(imported.blackName).toBe('黑方');
  });

  it('selects a stable daily challenge and calculates streaks', () => {
    expect(getDailyEndgame('2026-10-29').id).toBe(getDailyEndgame('2026-10-29').id);
    expect(calculateDailyStreak(['2026-10-28', '2026-10-27'], '2026-10-29')).toBe(2);
    expect(localDateKey(new Date(2026, 9, 29))).toBe('2026-10-29');
  });
});
