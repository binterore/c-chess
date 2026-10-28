import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server, type Socket } from 'socket.io';
import type {
  ChatMessage,
  GameResult,
  OnlineActionResult,
  OnlinePlayer,
  OnlineRoom,
  Position,
  PublicOnlineRoom
} from '../src/types/chess';
import {
  applyMoveToSnapshot,
  createGameSnapshot,
  endByAgreement,
  endByResignation
} from '../src/engine/game';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 2e6
});
const rooms = new Map<string, OnlineRoom>();
const timers = new Map<string, NodeJS.Timeout>();
const pendingUndo = new Map<string, string>();
const pendingDraw = new Map<string, string>();
const disconnectTimestamps = new Map<string, number>();

app.use(express.json());

function createRoomId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  do {
    id = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  } while (rooms.has(id));
  return id;
}

function publicRoom(room: OnlineRoom): PublicOnlineRoom {
  return {
    id: room.id,
    players: room.players.map(({ token: _token, ...player }) => player),
    spectatorCount: room.spectatorCount,
    status: room.status,
    game: room.game,
    timeLimit: room.timeLimit,
    createdAt: room.createdAt,
    hostColor: room.players.find((player) => player.token === room.hostToken)?.color ?? 'red',
    rematchVotes: room.rematchVotes
  };
}

function emitRoom(room: OnlineRoom): void {
  io.to(room.id).emit('room_updated', publicRoom(room));
}

function findPlayer(room: OnlineRoom, token: string): OnlinePlayer | undefined {
  return room.players.find((player) => player.token === token);
}

function syncSocketToRoom(socket: Socket, room: OnlineRoom, token?: string): void {
  socket.join(room.id);
  const player = token ? findPlayer(room, token) : undefined;
  if (player) {
    player.socketId = socket.id;
    player.connected = true;
    disconnectTimestamps.delete(`${room.id}:${player.token}`);
  }
}

function finishRoom(room: OnlineRoom, result: GameResult): void {
  room.status = 'ended';
  room.game.status = 'ended';
  room.game.result = result;
  const timer = timers.get(room.id);
  if (timer) clearInterval(timer);
  timers.delete(room.id);
  emitRoom(room);
  io.to(room.id).emit('game_over', result);
}

function startClock(room: OnlineRoom): void {
  if (room.timeLimit <= 0 || timers.has(room.id)) return;
  const timer = setInterval(() => {
    if (room.status !== 'playing') return;
    const active = room.players.find((player) => player.color === room.game.turn);
    if (!active) return;
    active.timeLeft = Math.max(0, active.timeLeft - 1);
    io.to(room.id).emit('clock_tick', { players: publicRoom(room).players, turn: room.game.turn });
    if (active.timeLeft === 0) finishRoom(room, { winner: active.color === 'red' ? 'black' : 'red', reason: 'timeout' });
  }, 1000);
  timers.set(room.id, timer);
}

function roomForSocket(socket: Socket): OnlineRoom | undefined {
  for (const room of rooms.values()) {
    if (room.players.some((player) => player.socketId === socket.id)) return room;
  }
  return undefined;
}

function beginPlaying(room: OnlineRoom): void {
  if (room.players.length !== 2) return;
  room.status = 'playing';
  room.game = createGameSnapshot();
  room.players.forEach((player) => {
    player.timeLeft = room.timeLimit;
  });
  startClock(room);
  emitRoom(room);
}

io.on('connection', (socket) => {
  socket.on('create_room', (data, callback: (result: OnlineActionResult) => void) => {
    const { name, color, timeLimit, token } = data ?? {};
    if (!token || typeof token !== 'string') {
      callback({ success: false, error: 'INVALID_TOKEN' });
      return;
    }
    const roomId = createRoomId();
    const player: OnlinePlayer = {
      token,
      socketId: socket.id,
      name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 24) : 'Player 1',
      color: color === 'black' ? 'black' : 'red',
      connected: true,
      timeLeft: Number(timeLimit) || 0
    };
    const room: OnlineRoom = {
      id: roomId,
      hostToken: token,
      players: [player],
      spectatorCount: 0,
      status: 'waiting',
      game: createGameSnapshot(),
      timeLimit: Math.max(0, Math.min(3600, Number(timeLimit) || 0)),
      createdAt: Date.now(),
      rematchVotes: []
    };
    rooms.set(roomId, room);
    syncSocketToRoom(socket, room, token);
    callback({ success: true, roomId, token, role: 'player', room: publicRoom(room) });
  });

  socket.on('join_room', (data, callback: (result: OnlineActionResult) => void) => {
    const code = typeof data?.roomId === 'string' ? data.roomId.trim().toUpperCase() : '';
    const room = rooms.get(code);
    if (!room) {
      callback({ success: false, error: 'ROOM_NOT_FOUND' });
      return;
    }
    const token = typeof data?.token === 'string' ? data.token : '';
    const existing = token ? findPlayer(room, token) : undefined;
    if (existing) {
      syncSocketToRoom(socket, room, token);
      existing.name = typeof data?.name === 'string' && data.name.trim() ? data.name.trim().slice(0, 24) : existing.name;
      callback({ success: true, roomId: room.id, token, role: 'player', room: publicRoom(room) });
      emitRoom(room);
      return;
    }
    if (room.players.length >= 2) {
      syncSocketToRoom(socket, room);
      room.spectatorCount += 1;
      socket.data.spectatorRoom = room.id;
      callback({ success: true, roomId: room.id, role: 'spectator', room: publicRoom(room) });
      emitRoom(room);
      return;
    }
    if (!token) {
      callback({ success: false, error: 'INVALID_TOKEN' });
      return;
    }
    const hostColor = room.players[0]?.color ?? 'red';
    const player: OnlinePlayer = {
      token,
      socketId: socket.id,
      name: typeof data?.name === 'string' && data.name.trim() ? data.name.trim().slice(0, 24) : 'Player 2',
      color: hostColor === 'red' ? 'black' : 'red',
      connected: true,
      timeLeft: room.timeLimit
    };
    room.players.push(player);
    syncSocketToRoom(socket, room, token);
    beginPlaying(room);
    callback({ success: true, roomId: room.id, token, role: 'player', room: publicRoom(room) });
  });

  socket.on('sync_room', (data, callback: (result: OnlineActionResult) => void) => {
    const room = rooms.get(String(data?.roomId ?? '').toUpperCase());
    if (!room) {
      callback({ success: false, error: 'ROOM_NOT_FOUND' });
      return;
    }
    const token = typeof data?.token === 'string' ? data.token : '';
    const player = token ? findPlayer(room, token) : undefined;
    if (player) {
      syncSocketToRoom(socket, room, token);
      callback({ success: true, roomId: room.id, token, role: 'player', room: publicRoom(room) });
      emitRoom(room);
    } else {
      syncSocketToRoom(socket, room);
      callback({ success: true, roomId: room.id, role: 'spectator', room: publicRoom(room) });
    }
  });

  socket.on('move', (data, callback: (result: { success: boolean; error?: string }) => void) => {
    const room = rooms.get(String(data?.roomId ?? '').toUpperCase());
    if (!room || room.status !== 'playing') {
      callback({ success: false, error: 'ROOM_NOT_PLAYING' });
      return;
    }
    const player = findPlayer(room, String(data?.token ?? ''));
    const from = data?.from as Position;
    const to = data?.to as Position;
    if (!player || player.socketId !== socket.id || player.color !== room.game.turn) {
      callback({ success: false, error: 'NOT_YOUR_TURN' });
      return;
    }
    try {
      const result = applyMoveToSnapshot(room.game, from, to);
      room.game = result.snapshot;
      if (room.game.status === 'ended') {
        room.status = 'ended';
        const timer = timers.get(room.id);
        if (timer) clearInterval(timer);
        timers.delete(room.id);
      }
      callback({ success: true });
      io.to(room.id).emit('game_moved', { room: publicRoom(room), move: result.move });
      if (room.game.status === 'ended' && room.game.result) io.to(room.id).emit('game_over', room.game.result);
    } catch (error) {
      callback({ success: false, error: error instanceof Error ? error.message : 'ILLEGAL_MOVE' });
    }
  });

  socket.on('request_undo', (data) => {
    const room = rooms.get(String(data?.roomId ?? '').toUpperCase());
    if (!room || room.status !== 'playing') return;
    const player = findPlayer(room, String(data?.token ?? ''));
    if (!player) return;
    pendingUndo.set(room.id, player.token);
    socket.to(room.id).emit('undo_requested', { fromToken: player.token, color: player.color });
  });

  socket.on('respond_undo', (data) => {
    const room = rooms.get(String(data?.roomId ?? '').toUpperCase());
    if (!room || room.status !== 'playing') return;
    const requesterToken = pendingUndo.get(room.id);
    if (!requesterToken || requesterToken === data?.token) return;
    pendingUndo.delete(room.id);
    if (!data?.accept) {
      io.to(room.id).emit('undo_declined');
      return;
    }
    if (room.game.history.length === 0) return;
    const history = room.game.history.slice(0, -1);
    const board = createGameSnapshot();
    let rebuilt = board;
    for (const move of history) rebuilt = applyMoveToSnapshot(rebuilt, move.from, move.to).snapshot;
    room.game = rebuilt;
    room.status = 'playing';
    emitRoom(room);
    io.to(room.id).emit('undo_applied');
  });

  socket.on('request_draw', (data) => {
    const room = rooms.get(String(data?.roomId ?? '').toUpperCase());
    if (!room || room.status !== 'playing') return;
    const player = findPlayer(room, String(data?.token ?? ''));
    if (!player) return;
    pendingDraw.set(room.id, player.token);
    socket.to(room.id).emit('draw_requested', { fromToken: player.token, color: player.color });
  });

  socket.on('respond_draw', (data) => {
    const room = rooms.get(String(data?.roomId ?? '').toUpperCase());
    if (!room || room.status !== 'playing') return;
    const requesterToken = pendingDraw.get(room.id);
    if (!requesterToken || requesterToken === data?.token) return;
    pendingDraw.delete(room.id);
    if (data?.accept) {
      room.game = endByAgreement(room.game);
      finishRoom(room, room.game.result!);
    } else {
      io.to(room.id).emit('draw_declined');
    }
  });

  socket.on('resign', (data) => {
    const room = rooms.get(String(data?.roomId ?? '').toUpperCase());
    if (!room) return;
    const player = findPlayer(room, String(data?.token ?? ''));
    if (!player || room.status === 'ended') return;
    room.game = endByResignation(room.game, player.color);
    finishRoom(room, room.game.result!);
  });

  socket.on('request_rematch', (data) => {
    const room = rooms.get(String(data?.roomId ?? '').toUpperCase());
    if (!room) return;
    const player = findPlayer(room, String(data?.token ?? ''));
    if (!player) return;
    if (!room.rematchVotes.includes(player.color)) room.rematchVotes.push(player.color);
    if (room.rematchVotes.length === 2) {
      room.rematchVotes = [];
      beginPlaying(room);
    } else {
      emitRoom(room);
    }
  });

  socket.on('send_chat', (data) => {
    const room = rooms.get(String(data?.roomId ?? '').toUpperCase());
    if (!room) return;
    const player = findPlayer(room, String(data?.token ?? ''));
    const text = typeof data?.text === 'string' ? data.text.trim().slice(0, 120) : '';
    if (!text) return;
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: player?.token ?? socket.id,
      senderName: player?.name ?? 'Spectator',
      text,
      timestamp: Date.now()
    };
    io.to(room.id).emit('chat_message', message);
  });

  socket.on('leave_room', (data) => {
    const room = rooms.get(String(data?.roomId ?? '').toUpperCase());
    if (!room) return;
    const player = findPlayer(room, String(data?.token ?? ''));
    if (player) {
      player.connected = false;
      socket.leave(room.id);
      emitRoom(room);
    } else if (socket.data.spectatorRoom === room.id) {
      socket.data.spectatorRoom = undefined;
      room.spectatorCount = Math.max(0, room.spectatorCount - 1);
      socket.leave(room.id);
      emitRoom(room);
    }
  });

  socket.on('disconnect', () => {
    const room = roomForSocket(socket);
    if (room) {
      const player = room.players.find((candidate) => candidate.socketId === socket.id);
      if (player) {
        player.connected = false;
        disconnectTimestamps.set(`${room.id}:${player.token}`, Date.now());
        emitRoom(room);
      }
    }
    for (const room of rooms.values()) {
      if (socket.data.spectatorRoom === room.id) {
        room.spectatorCount = Math.max(0, room.spectatorCount - 1);
        emitRoom(room);
        break;
      }
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    const age = now - room.createdAt;
    const everyoneAway = room.players.every((player) => !player.connected);
    if (age > 6 * 60 * 60 * 1000 || (everyoneAway && age > 20 * 60 * 1000)) {
      const timer = timers.get(roomId);
      if (timer) clearInterval(timer);
      timers.delete(roomId);
      rooms.delete(roomId);
    }
  }
  for (const [key, timestamp] of disconnectTimestamps) {
    if (now - timestamp > 30 * 60 * 1000) disconnectTimestamps.delete(key);
  }
}, 60_000);

const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*path', (_request, response) => {
  response.sendFile(path.join(distPath, 'index.html'));
});

const port = Number(process.env.PORT) || 3001;
server.listen(port, () => {
  console.log(`Jiang Jie server listening on ${port}`);
});
