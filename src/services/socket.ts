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

export function getPlayerName(): string {
  return localStorage.getItem('jiangjie-player-name') ?? '';
}

export function savePlayerName(name: string): void {
  localStorage.setItem('jiangjie-player-name', name);
}
