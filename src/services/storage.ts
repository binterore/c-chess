import type { GameRecord, PieceColor, PlayerProfile } from '../types/chess';

const ARCHIVE_KEY = 'jiangjie-archive-v1';
const PROFILE_KEY = 'jiangjie-profile-v1';
const DAILY_KEY = 'jiangjie-daily-completions-v1';
const MAX_RECORDS = 100;

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function loadGameRecords(): GameRecord[] {
  const records = safeParse<GameRecord[]>(localStorage.getItem(ARCHIVE_KEY), []);
  return Array.isArray(records) ? records.sort((a, b) => b.createdAt - a.createdAt) : [];
}

export function persistGameRecords(records: GameRecord[]): void {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
}

export function saveGameRecord(record: GameRecord): GameRecord[] {
  const current = loadGameRecords().filter((item) => item.id !== record.id);
  const next = [record, ...current].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_RECORDS);
  persistGameRecords(next);
  return next;
}

export function deleteGameRecord(id: string): GameRecord[] {
  const next = loadGameRecords().filter((record) => record.id !== id);
  persistGameRecords(next);
  return next;
}

export function clearGameRecords(): void {
  localStorage.removeItem(ARCHIVE_KEY);
}

export function loadProfile(playerId: string, fallbackName: string): PlayerProfile {
  const stored = safeParse<PlayerProfile | null>(localStorage.getItem(PROFILE_KEY), null);
  if (stored?.id === playerId) {
    const dailyDates = loadDailyDates();
    return { ...stored, name: stored.name || fallbackName, dailyDates };
  }
  const profile: PlayerProfile = {
    id: playerId,
    name: fallbackName,
    createdAt: Date.now(),
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    puzzlesSolved: 0,
    totalMoves: 0,
    dailyDates: loadDailyDates()
  };
  persistProfile(profile);
  return profile;
}

export function persistProfile(profile: PlayerProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function updateProfileName(profile: PlayerProfile, name: string): PlayerProfile {
  const next = { ...profile, name: name.trim() || profile.name };
  persistProfile(next);
  return next;
}

export const WINNER_BY_COLOR: Record<PieceColor, PieceColor> = {
  red: 'black',
  black: 'red'
};

export function loadDailyDates(): string[] {
  const dates = safeParse<string[]>(localStorage.getItem(DAILY_KEY), []);
  return Array.isArray(dates) ? [...new Set(dates.filter((date) => typeof date === 'string'))].sort() : [];
}

export function completeDaily(date: string): string[] {
  const next = [...new Set([...loadDailyDates(), date])].sort();
  localStorage.setItem(DAILY_KEY, JSON.stringify(next));
  return next;
}


function recordFingerprint(record: GameRecord): string {
  return `${record.mode}|${record.createdAt}|${record.redName}|${record.blackName}|${record.history.map((move) => move.notation).join(',')}`;
}

export function mergeGameRecords(incoming: GameRecord[]): GameRecord[] {
  const byFingerprint = new Map<string, GameRecord>();
  for (const record of [...loadGameRecords(), ...incoming]) {
    const key = recordFingerprint(record);
    const current = byFingerprint.get(key);
    if (!current || record.updatedAt > current.updatedAt) byFingerprint.set(key, record);
  }
  const next = [...byFingerprint.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_RECORDS);
  persistGameRecords(next);
  return next;
}
