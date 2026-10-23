import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    let url = '';
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (window.location.port === '5173') {
        url = `http://${host}:3001`;
      } else {
        url = window.location.origin;
      }
    }
    socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
  }
  return socket;
}
