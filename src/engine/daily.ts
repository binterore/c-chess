import { endgames, type Endgame } from './endgames';

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateNumber(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function getDailyEndgame(dateKey = localDateKey()): Endgame {
  const day = Math.max(0, dateNumber(dateKey));
  const index = ((day * 17 + 11) >>> 0) % endgames.length;
  return endgames[index];
}

export function calculateDailyStreak(dates: string[], today = localDateKey()): number {
  const solved = new Set(dates);
  let cursor = dateNumber(today);
  if (!solved.has(today)) cursor -= 1;
  let streak = 0;
  while (streak < 3660) {
    const key = new Date(cursor * 86_400_000).toISOString().slice(0, 10);
    if (!solved.has(key)) break;
    streak += 1;
    cursor -= 1;
  }
  return streak;
}
