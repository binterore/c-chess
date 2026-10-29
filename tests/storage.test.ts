import { beforeAll, describe, expect, it } from 'vitest';
import type { GameRecord } from '../src/types/chess';
import { createInitialBoard } from '../src/engine/rules';
import { deleteGameRecord, loadGameRecords, loadProfile, mergeGameRecords, saveGameRecord, updateProfileName } from '../src/services/storage';
import { clearOnlineSession, loadOnlineSession, saveOnlineSession } from '../src/services/socket';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  get length() { return this.data.size; }
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
});

function record(id: string, createdAt: number): GameRecord {
  return {
    id, mode: 'local', createdAt, updatedAt: createdAt, redName: '红方', blackName: '黑方',
    playerColor: 'red', initialBoard: createInitialBoard(), initialTurn: 'red', history: [],
    result: { winner: 'red', winnerColor: 'red', reason: 'resignation' }
  };
}

describe('local persistence and online sessions', () => {
  it('saves, merges and deletes archive records', () => {
    localStorage.clear();
    saveGameRecord(record('a', 1000));
    saveGameRecord(record('b', 2000));
    expect(loadGameRecords().map((item) => item.id)).toEqual(['b', 'a']);
    expect(mergeGameRecords([record('a', 1000), record('c', 3000)]).map((item) => item.id)).toEqual(['c', 'b', 'a']);
    expect(deleteGameRecord('b').map((item) => item.id)).toEqual(['c', 'a']);
  });

  it('persists profile names and room sessions', () => {
    localStorage.clear();
    const profile = updateProfileName(loadProfile('player-sync-code', '旧名'), '新名');
    expect(profile.name).toBe('新名');
    saveOnlineSession({ roomId: 'ABC123', token: 'player-sync-code', role: 'player', playerName: '新名' });
    expect(loadOnlineSession()).toMatchObject({ roomId: 'ABC123', role: 'player' });
    clearOnlineSession();
    expect(loadOnlineSession()).toBeNull();
  });
});
