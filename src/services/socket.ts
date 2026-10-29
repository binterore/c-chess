import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 600,
      reconnectionDelayMax: 3000
    });
  }
  return socket;
}

export function getPlayerToken(): string {
  const key = 'jiangjie-player-token';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const token = crypto.randomUUID();
  localStorage.setItem(key, token);
  return token;
}

export function setPlayerToken(token: string): boolean {
  const normalized = token.trim();
  if (normalized.length < 8 || normalized.length > 128) return false;
  localStorage.setItem('jiangjie-player-token', normalized);
  return true;
}

export function getPlayerName(): string {
  return localStorage.getItem('jiangjie-player-name') ?? '';
}

export function savePlayerName(name: string): void {
  localStorage.setItem('jiangjie-player-name', name);
}


export interface OnlineSession {
  roomId: string;
  token: string;
  role: 'player' | 'spectator';
  playerName: string;
  savedAt: number;
}

const ONLINE_SESSION_KEY = 'jiangjie-online-session';

export function loadOnlineSession(): OnlineSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(ONLINE_SESSION_KEY) ?? 'null') as OnlineSession | null;
    return value && typeof value.roomId === 'string' && typeof value.token === 'string' ? value : null;
  } catch {
    return null;
  }
}

export function saveOnlineSession(session: Omit<OnlineSession, 'savedAt'>): void {
  localStorage.setItem(ONLINE_SESSION_KEY, JSON.stringify({ ...session, savedAt: Date.now() }));
}

export function clearOnlineSession(): void {
  localStorage.removeItem(ONLINE_SESSION_KEY);
}
