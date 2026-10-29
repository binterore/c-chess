import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { Server, type Socket } from 'socket.io';
import type {
  ChatMessage,
  GameRecord,
  GameResult,
  LobbyRoom,
  OnlineActionResult,
  OnlinePlayer,
  OnlineRoom,
  PlayerProfile,
  Position,
  PublicOnlineRoom
} from '../src/types/chess';
import {
  applyMoveToSnapshot,
  createGameSnapshot,
  endByAgreement,
  endByResignation
} from '../src/engine/game';
import { createInitialBoard } from '../src/engine/rules';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN ?? '*' },
  maxHttpBufferSize: 2e6,
  pingTimeout: 20_000,
  pingInterval: 25_000
});
const rooms = new Map<string, OnlineRoom>();
const timers = new Map<string, NodeJS.Timeout>();
const pendingUndo = new Map<string, string>();
const pendingDraw = new Map<string, string>();
const disconnectDeadlines = new Map<string, NodeJS.Timeout>();
const chatWindows = new Map<string, number[]>();

interface ChatReport {
  id: string;
  roomId: string;
  reporterName: string;
  message: ChatMessage;
  createdAt: number;
}

interface PersistedData {
  profiles: Record<string, PlayerProfile>;
  records: Record<string, GameRecord[]>;
  friends: Record<string, string[]>;
  reports: ChatReport[];
  rooms?: OnlineRoom[];
}

const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(__dirname, '../data'));
const dataFile = path.join(dataDir, 'store.json');
let data: PersistedData = loadData();
for (const room of data.rooms ?? []) {
  if (room.status === 'ended' || Date.now() - room.createdAt > 6 * 60 * 60 * 1000) continue;
  room.players = room.players.map((player) => ({ ...player, socketId: '', connected: false }));
  rooms.set(room.id, room);
}

function loadData(): PersistedData {
  try {
    if (!existsSync(dataFile)) return { profiles: {}, records: {}, friends: {}, reports: [] };
    const parsed = JSON.parse(readFileSync(dataFile, 'utf8')) as Partial<PersistedData>;
    return {
      profiles: parsed.profiles ?? {},
      records: parsed.records ?? {},
      friends: parsed.friends ?? {},
      reports: parsed.reports ?? [],
      rooms: parsed.rooms ?? []
    };
  } catch (error) {
    console.error('Unable to read persisted data:', error);
    return { profiles: {}, records: {}, friends: {}, reports: [] };
  }
}

function persistData(): void {
  mkdirSync(dataDir, { recursive: true });
  const temporary = `${dataFile}.tmp`;
  const persisted = {
    ...data,
    rooms: [...rooms.values()].map((room) => ({
      ...room,
      players: room.players.map((player) => ({ ...player, socketId: '', connected: false }))
    }))
  };
  writeFileSync(temporary, JSON.stringify(persisted, null, 2));
  renameSync(temporary, dataFile);
}

function ensureProfile(token: string, name: string): PlayerProfile {
  const existing = data.profiles[token];
  if (existing) {
    if (name && existing.name !== name) {
      existing.name = name;
      persistData();
    }
    return existing;
  }
  const profile: PlayerProfile = {
    id: token,
    name,
    createdAt: Date.now(),
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    puzzlesSolved: 0,
    totalMoves: 0,
    dailyDates: []
  };
  data.profiles[token] = profile;
  persistData();
  return profile;
}

function storeRecord(token: string, record: GameRecord): void {
  const records = data.records[token] ?? [];
  const previous = records.find((item) => item.id === record.id);
  const next = [record, ...records.filter((item) => item.id !== record.id)].slice(0, 100);
  data.records[token] = next;
  const profile = ensureProfile(token, record.playerColor === 'black' ? record.blackName : record.redName);
  const becameFinished = !previous?.result && Boolean(record.result && record.playerColor);
  if (becameFinished && record.result && record.playerColor) {
    const draw = record.result.winner === 'draw';
    const won = !draw && record.result.winner === record.playerColor;
    profile.gamesPlayed += 1;
    profile.wins += won ? 1 : 0;
    profile.losses += !draw && !won ? 1 : 0;
    profile.draws += draw ? 1 : 0;
    if (record.mode === 'puzzle' && won) profile.puzzlesSolved += 1;
  }
  profile.totalMoves += record.history.length - (previous?.history.length ?? 0);
  profile.totalMoves = Math.max(0, profile.totalMoves);
  if (record.dailyDate && !profile.dailyDates.includes(record.dailyDate)) profile.dailyDates.push(record.dailyDate);
  persistData();
}

function recalculateProfileFromRecords(token: string): PlayerProfile | undefined {
  const profile = data.profiles[token];
  if (!profile) return undefined;
  const records = data.records[token] ?? [];
  profile.gamesPlayed = 0;
  profile.wins = 0;
  profile.losses = 0;
  profile.draws = 0;
  profile.totalMoves = records.reduce((sum, record) => sum + record.history.length, 0);
  profile.puzzlesSolved = 0;
  for (const record of records) {
    if (!record.result || !record.playerColor) continue;
    const draw = record.result.winner === 'draw';
    const won = !draw && record.result.winner === record.playerColor;
    profile.gamesPlayed += 1;
    profile.wins += won ? 1 : 0;
    profile.losses += !draw && !won ? 1 : 0;
    profile.draws += draw ? 1 : 0;
    if (record.mode === 'puzzle' && won) profile.puzzlesSolved += 1;
  }
  persistData();
  return profile;
}

function validToken(value: unknown): string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128 ? value : '';
}

function cleanName(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 24) : fallback;
}

function reply<T>(callback: ((result: T) => void) | undefined, result: T): void {
  if (typeof callback === 'function') callback(result);
}

function createRoomId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  do {
    const bytes = randomBytes(6);
    id = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
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
    gameId: room.gameId,
    gameStartedAt: room.gameStartedAt,
    timeLimit: room.timeLimit,
    increment: room.increment,
    visibility: room.visibility,
    createdAt: room.createdAt,
    hostColor: room.players.find((player) => player.token === room.hostToken)?.color ?? 'red',
    rematchVotes: room.rematchVotes,
    hasPassword: Boolean(room.passwordHash)
  };
}

function lobbyRoom(room: OnlineRoom): LobbyRoom {
  const host = room.players.find((player) => player.token === room.hostToken);
  return {
    id: room.id,
    hostName: host?.name ?? 'Player',
    hostColor: host?.color ?? 'red',
    timeLimit: room.timeLimit,
    increment: room.increment,
    status: room.status === 'playing' ? 'playing' : 'waiting',
    spectatorCount: room.spectatorCount,
    createdAt: room.createdAt
  };
}

function emitRoom(room: OnlineRoom): void {
  io.to(room.id).emit('room_updated', publicRoom(room));
}

function findPlayer(room: OnlineRoom, token: string): OnlinePlayer | undefined {
  return room.players.find((player) => player.token === token);
}

function ownedPlayer(room: OnlineRoom, socket: Socket, token: string): OnlinePlayer | undefined {
  const player = findPlayer(room, token);
  return player?.socketId === socket.id ? player : undefined;
}

function syncSocketToRoom(socket: Socket, room: OnlineRoom, token?: string): void {
  socket.join(room.id);
  const player = token ? findPlayer(room, token) : undefined;
  if (player) {
    player.socketId = socket.id;
    player.connected = true;
    const disconnectKey = `${room.id}:${player.token}`;
    const deadline = disconnectDeadlines.get(disconnectKey);
    if (deadline) clearTimeout(deadline);
    disconnectDeadlines.delete(disconnectKey);
    if (room.status === 'playing') startClock(room);
    persistData();
  }
}

function saveOnlineRecord(room: OnlineRoom, result: GameResult): void {
  const recordBase: GameRecord = {
    id: `online-${room.gameId}`,
    mode: 'online',
    createdAt: room.gameStartedAt ?? room.createdAt,
    updatedAt: Date.now(),
    redName: room.players.find((player) => player.color === 'red')?.name ?? 'Red',
    blackName: room.players.find((player) => player.color === 'black')?.name ?? 'Black',
    initialBoard: createInitialBoard(),
    initialTurn: 'red',
    history: room.game.history,
    result,
    timeControl: { initial: room.timeLimit, increment: room.increment }
  };
  room.players.forEach((player) => {
    storeRecord(player.token, { ...recordBase, playerColor: player.color });
  });
}

function finishRoom(room: OnlineRoom, result: GameResult): void {
  if (room.status === 'ended') return;
  room.status = 'ended';
  room.game.status = 'ended';
  room.game.result = result;
  const timer = timers.get(room.id);
  if (timer) clearInterval(timer);
  timers.delete(room.id);
  pendingUndo.delete(room.id);
  pendingDraw.delete(room.id);
  saveOnlineRecord(room, result);
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
    if ((room.players[0]?.timeLeft ?? 0) % 5 === 0) persistData();
    io.to(room.id).emit('clock_tick', { players: publicRoom(room).players, turn: room.game.turn });
    if (active.timeLeft === 0) {
      finishRoom(room, { winner: active.color === 'red' ? 'black' : 'red', winnerColor: active.color === 'red' ? 'black' : 'red', reason: 'timeout' });
    }
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
  room.gameId = crypto.randomUUID();
  room.gameStartedAt = Date.now();
  room.rematchVotes = [];
  room.players.forEach((player) => {
    player.timeLeft = room.timeLimit;
  });
  startClock(room);
  emitRoom(room);
  persistData();
}

function createRoomForSocket(
  socket: Socket,
  input: Record<string, unknown>,
  callback?: (result: OnlineActionResult) => void
): void {
  const token = validToken(input.token);
  if (!token) {
    reply(callback, { success: false, error: 'INVALID_TOKEN' });
    return;
  }
  const name = cleanName(input.name, 'Player 1');
  const color = input.color === 'black' ? 'black' : 'red';
  const timeLimit = Math.max(0, Math.min(3600, Number(input.timeLimit) || 0));
  const increment = Math.max(0, Math.min(60, Number(input.increment) || 0));
  const visibility = input.visibility === 'private' ? 'private' : 'public';
  const password = typeof input.password === 'string' ? input.password.trim().slice(0, 20) : '';
  const passwordHash = visibility === 'private' && password.length >= 4 ? createHash('sha256').update(password).digest('hex') : undefined;
  ensureProfile(token, name);
  const roomId = createRoomId();
  const player: OnlinePlayer = {
    token,
    socketId: socket.id,
    name,
    color,
    connected: true,
    timeLeft: timeLimit
  };
  const room: OnlineRoom = {
    id: roomId,
    hostToken: token,
    players: [player],
    spectatorCount: 0,
    status: 'waiting',
    game: createGameSnapshot(),
    gameId: crypto.randomUUID(),
    gameStartedAt: undefined,
    timeLimit,
    increment,
    visibility,
    passwordHash,
    createdAt: Date.now(),
    rematchVotes: []
  };
  rooms.set(roomId, room);
  syncSocketToRoom(socket, room, token);
  persistData();
  reply(callback, { success: true, roomId, token, role: 'player', room: publicRoom(room), profile: ensureProfile(token, name) });
}

function joinRoomForSocket(
  socket: Socket,
  room: OnlineRoom,
  input: Record<string, unknown>,
  callback?: (result: OnlineActionResult) => void
): void {
  const token = typeof input.token === 'string' ? input.token : '';
  const name = cleanName(input.name, 'Player 2');
  const existing = token ? findPlayer(room, token) : undefined;
  if (existing) {
    syncSocketToRoom(socket, room, token);
    existing.name = name || existing.name;
    ensureProfile(token, existing.name);
    reply(callback, { success: true, roomId: room.id, token, role: 'player', room: publicRoom(room), profile: ensureProfile(token, existing.name) });
    emitRoom(room);
    return;
  }
  if (room.passwordHash) {
    const password = typeof input.password === 'string' ? input.password : '';
    const suppliedHash = createHash('sha256').update(password).digest('hex');
    if (suppliedHash !== room.passwordHash) {
      reply(callback, { success: false, error: 'PASSWORD_REQUIRED' });
      return;
    }
  }
  if (room.players.length >= 2) {
    syncSocketToRoom(socket, room);
    room.spectatorCount += 1;
    socket.data.spectatorRoom = room.id;
    reply(callback, { success: true, roomId: room.id, role: 'spectator', room: publicRoom(room) });
    emitRoom(room);
    return;
  }
  if (!validToken(token)) {
    reply(callback, { success: false, error: 'INVALID_TOKEN' });
    return;
  }
  const hostColor = room.players[0]?.color ?? 'red';
  const player: OnlinePlayer = {
    token,
    socketId: socket.id,
    name,
    color: hostColor === 'red' ? 'black' : 'red',
    connected: true,
    timeLeft: room.timeLimit
  };
  room.players.push(player);
  ensureProfile(token, name);
  syncSocketToRoom(socket, room, token);
  beginPlaying(room);
  reply(callback, { success: true, roomId: room.id, token, role: 'player', room: publicRoom(room), profile: ensureProfile(token, name) });
}

app.use(express.json());

io.on('connection', (socket) => {
  socket.on('create_room', (input: Record<string, unknown> = {}, callback?: (result: OnlineActionResult) => void) => {
    createRoomForSocket(socket, input ?? {}, callback);
  });

  socket.on('join_room', (input: Record<string, unknown> = {}, callback?: (result: OnlineActionResult) => void) => {
    const code = typeof input?.roomId === 'string' ? input.roomId.trim().toUpperCase() : '';
    const room = rooms.get(code);
    if (!room) {
      reply(callback, { success: false, error: 'ROOM_NOT_FOUND' });
      return;
    }
    joinRoomForSocket(socket, room, input ?? {}, callback);
  });

  socket.on('quick_match', (input: Record<string, unknown> = {}, callback?: (result: OnlineActionResult) => void) => {
    const token = validToken(input?.token);
    if (!token) {
      reply(callback, { success: false, error: 'INVALID_TOKEN' });
      return;
    }
    const room = [...rooms.values()]
      .filter((candidate) => candidate.status === 'waiting' && candidate.visibility === 'public' && candidate.players.length === 1 && candidate.players[0].token !== token)
      .sort((a, b) => a.createdAt - b.createdAt)[0];
    if (room) joinRoomForSocket(socket, room, { ...input, token }, callback);
    else createRoomForSocket(socket, { ...input, visibility: 'public' }, callback);
  });

  socket.on('list_rooms', (callback?: (result: OnlineActionResult) => void) => {
    const activeRooms = [...rooms.values()]
      .filter((room) => room.status === 'waiting' && room.visibility === 'public')
      .map(lobbyRoom)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 30);
    reply(callback, { success: true, rooms: activeRooms });
  });

  socket.on('sync_room', (input: Record<string, unknown> = {}, callback?: (result: OnlineActionResult) => void) => {
    const room = rooms.get(String(input?.roomId ?? '').toUpperCase());
    if (!room) {
      reply(callback, { success: false, error: 'ROOM_NOT_FOUND' });
      return;
    }
    const token = typeof input?.token === 'string' ? input.token : '';
    const player = token ? findPlayer(room, token) : undefined;
    if (player) {
      syncSocketToRoom(socket, room, token);
      reply(callback, { success: true, roomId: room.id, token, role: 'player', room: publicRoom(room), profile: ensureProfile(token, player.name) });
      emitRoom(room);
    } else {
      syncSocketToRoom(socket, room);
      socket.data.spectatorRoom = room.id;
      reply(callback, { success: true, roomId: room.id, role: 'spectator', room: publicRoom(room) });
    }
  });

  socket.on('add_friend', (input: Record<string, unknown> = {}, callback?: (result: OnlineActionResult) => void) => {
    const token = validToken(input?.token);
    const friendToken = validToken(input?.friendToken);
    if (!token || !friendToken || token === friendToken || !data.profiles[friendToken]) {
      reply(callback, { success: false, error: 'FRIEND_NOT_FOUND' });
      return;
    }
    data.friends[token] = [...new Set([...(data.friends[token] ?? []), friendToken])];
    data.friends[friendToken] = [...new Set([...(data.friends[friendToken] ?? []), token])];
    persistData();
    reply(callback, {
      success: true,
      profile: data.profiles[token],
      friends: data.friends[token].map((id) => data.profiles[id]).filter(Boolean)
    });
  });

  socket.on('remove_friend', (input: Record<string, unknown> = {}, callback?: (result: OnlineActionResult) => void) => {
    const token = validToken(input?.token);
    const friendToken = validToken(input?.friendToken);
    if (!token || !friendToken) {
      reply(callback, { success: false, error: 'INVALID_FRIEND' });
      return;
    }
    data.friends[token] = (data.friends[token] ?? []).filter((id) => id !== friendToken);
    data.friends[friendToken] = (data.friends[friendToken] ?? []).filter((id) => id !== token);
    persistData();
    reply(callback, {
      success: true,
      profile: data.profiles[token],
      friends: (data.friends[token] ?? []).map((id) => data.profiles[id]).filter(Boolean)
    });
  });

  socket.on('sync_history', (input: Record<string, unknown> = {}, callback?: (result: OnlineActionResult) => void) => {
    const token = validToken(input?.token);
    if (!token) {
      reply(callback, { success: false, error: 'INVALID_TOKEN' });
      return;
    }
    reply(callback, {
      success: true,
      records: data.records[token] ?? [],
      profile: ensureProfile(token, cleanName(input?.name, '棋手')),
      friends: (data.friends[token] ?? []).map((friendToken) => data.profiles[friendToken]).filter(Boolean)
    });
  });

  socket.on('delete_history', (input: Record<string, unknown> = {}, callback?: (result: OnlineActionResult) => void) => {
    const token = validToken(input?.token);
    const recordId = typeof input?.recordId === 'string' ? input.recordId : '';
    if (!token || !recordId) {
      reply(callback, { success: false, error: 'INVALID_RECORD' });
      return;
    }
    data.records[token] = (data.records[token] ?? []).filter((record) => record.id !== recordId);
    const profile = recalculateProfileFromRecords(token);
    reply(callback, { success: true, records: data.records[token], profile });
  });

  socket.on('clear_history', (input: Record<string, unknown> = {}, callback?: (result: OnlineActionResult) => void) => {
    const token = validToken(input?.token);
    if (!token) {
      reply(callback, { success: false, error: 'INVALID_TOKEN' });
      return;
    }
    data.records[token] = [];
    const profile = recalculateProfileFromRecords(token);
    reply(callback, { success: true, records: [], profile });
  });

  socket.on('save_history', (input: Record<string, unknown> = {}, callback?: (result: OnlineActionResult) => void) => {
    const token = validToken(input?.token);
    const record = input?.record as GameRecord | undefined;
    if (!token || !record || !Array.isArray(record.history) || !Array.isArray(record.initialBoard)) {
      reply(callback, { success: false, error: 'INVALID_RECORD' });
      return;
    }
    storeRecord(token, record);
    reply(callback, { success: true, records: data.records[token] ?? [], profile: data.profiles[token] });
  });

  socket.on('move', (input: Record<string, unknown> = {}, callback?: (result: { success: boolean; error?: string }) => void) => {
    const room = rooms.get(String(input?.roomId ?? '').toUpperCase());
    if (!room || room.status !== 'playing') {
      reply(callback, { success: false, error: 'ROOM_NOT_PLAYING' });
      return;
    }
    const player = ownedPlayer(room, socket, String(input?.token ?? ''));
    const from = input?.from as Position;
    const to = input?.to as Position;
    if (!player || player.color !== room.game.turn) {
      reply(callback, { success: false, error: 'NOT_YOUR_TURN' });
      return;
    }
    try {
      const result = applyMoveToSnapshot(room.game, from, to);
      player.timeLeft += room.increment;
      room.game = result.snapshot;
      persistData();
      reply(callback, { success: true });
      io.to(room.id).emit('game_moved', { room: publicRoom(room), move: result.move });
      if (room.game.status === 'ended' && room.game.result) finishRoom(room, room.game.result);
    } catch (error) {
      reply(callback, { success: false, error: error instanceof Error ? error.message : 'ILLEGAL_MOVE' });
    }
  });

  socket.on('request_undo', (input: Record<string, unknown> = {}) => {
    const room = rooms.get(String(input?.roomId ?? '').toUpperCase());
    if (!room || room.status !== 'playing') return;
    const player = ownedPlayer(room, socket, String(input?.token ?? ''));
    if (!player) return;
    pendingUndo.set(room.id, player.token);
    socket.to(room.id).emit('undo_requested', { fromToken: player.color, color: player.color });
  });

  socket.on('respond_undo', (input: Record<string, unknown> = {}) => {
    const room = rooms.get(String(input?.roomId ?? '').toUpperCase());
    if (!room || room.status !== 'playing') return;
    const player = ownedPlayer(room, socket, String(input?.token ?? ''));
    const requesterToken = pendingUndo.get(room.id);
    if (!player || !requesterToken || requesterToken === player.token) return;
    pendingUndo.delete(room.id);
    if (!input?.accept) {
      io.to(room.id).emit('undo_declined');
      return;
    }
    if (room.game.history.length === 0) return;
    const history = room.game.history.slice(0, -1);
    let rebuilt = createGameSnapshot();
    for (const move of history) rebuilt = applyMoveToSnapshot(rebuilt, move.from, move.to).snapshot;
    room.game = rebuilt;
    persistData();
    emitRoom(room);
    io.to(room.id).emit('undo_applied');
  });

  socket.on('request_draw', (input: Record<string, unknown> = {}) => {
    const room = rooms.get(String(input?.roomId ?? '').toUpperCase());
    if (!room || room.status !== 'playing') return;
    const player = ownedPlayer(room, socket, String(input?.token ?? ''));
    if (!player) return;
    pendingDraw.set(room.id, player.token);
    socket.to(room.id).emit('draw_requested', { fromToken: player.color, color: player.color });
  });

  socket.on('respond_draw', (input: Record<string, unknown> = {}) => {
    const room = rooms.get(String(input?.roomId ?? '').toUpperCase());
    if (!room || room.status !== 'playing') return;
    const player = ownedPlayer(room, socket, String(input?.token ?? ''));
    const requesterToken = pendingDraw.get(room.id);
    if (!player || !requesterToken || requesterToken === player.token) return;
    pendingDraw.delete(room.id);
    if (input?.accept) {
      room.game = endByAgreement(room.game);
      finishRoom(room, room.game.result!);
    } else {
      io.to(room.id).emit('draw_declined');
    }
  });

  socket.on('resign', (input: Record<string, unknown> = {}) => {
    const room = rooms.get(String(input?.roomId ?? '').toUpperCase());
    if (!room || room.status !== 'playing') return;
    const player = ownedPlayer(room, socket, String(input?.token ?? ''));
    if (!player) return;
    room.game = endByResignation(room.game, player.color);
    finishRoom(room, room.game.result!);
  });

  socket.on('request_rematch', (input: Record<string, unknown> = {}) => {
    const room = rooms.get(String(input?.roomId ?? '').toUpperCase());
    if (!room) return;
    const player = ownedPlayer(room, socket, String(input?.token ?? ''));
    if (!player) return;
    if (!room.rematchVotes.includes(player.color)) room.rematchVotes.push(player.color);
    if (room.rematchVotes.length === 2) beginPlaying(room);
    else emitRoom(room);
  });

  socket.on('mute_player', (input: Record<string, unknown> = {}) => {
    const room = rooms.get(String(input?.roomId ?? '').toUpperCase());
    if (!room) return;
    const host = ownedPlayer(room, socket, String(input?.token ?? ''));
    if (!host || host.token !== room.hostToken) return;
    const target = room.players.find((player) => player.color === input?.color && player !== host);
    if (!target) return;
    target.muted = Boolean(input?.muted);
    emitRoom(room);
  });

  socket.on('report_chat', (input: Record<string, unknown> = {}, callback?: (result: OnlineActionResult) => void) => {
    const room = rooms.get(String(input?.roomId ?? '').toUpperCase());
    const message = input?.message as ChatMessage | undefined;
    if (!room || !message || !socket.rooms.has(room.id)) {
      reply(callback, { success: false, error: 'INVALID_REPORT' });
      return;
    }
    const reporter = findPlayer(room, String(input?.token ?? ''));
    data.reports.unshift({
      id: crypto.randomUUID(),
      roomId: room.id,
      reporterName: reporter?.name ?? 'Spectator',
      message: { ...message, text: String(message.text ?? '').slice(0, 120) },
      createdAt: Date.now()
    });
    data.reports = data.reports.slice(0, 500);
    persistData();
    reply(callback, { success: true });
  });

  socket.on('send_chat', (input: Record<string, unknown> = {}) => {
    const room = rooms.get(String(input?.roomId ?? '').toUpperCase());
    if (!room || !socket.rooms.has(room.id)) return;
    const now = Date.now();
    const recent = (chatWindows.get(socket.id) ?? []).filter((timestamp) => now - timestamp < 10_000);
    if (recent.length >= 6) {
      socket.emit('chat_blocked', { reason: 'RATE_LIMIT' });
      return;
    }
    recent.push(now);
    chatWindows.set(socket.id, recent);
    const player = findPlayer(room, String(input?.token ?? ''));
    if (player?.muted) {
      socket.emit('chat_blocked', { reason: 'MUTED' });
      return;
    }
    const text = typeof input?.text === 'string' ? input.text.trim().slice(0, 120) : '';
    if (!text) return;
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: player?.color ?? socket.id,
      senderName: player?.name ?? 'Spectator',
      text,
      timestamp: now
    };
    io.to(room.id).emit('chat_message', message);
  });

  socket.on('leave_room', (input: Record<string, unknown> = {}) => {
    const room = rooms.get(String(input?.roomId ?? '').toUpperCase());
    if (!room) return;
    const player = ownedPlayer(room, socket, String(input?.token ?? ''));
    if (player) {
      if (room.status === 'playing') {
        room.game = endByResignation(room.game, player.color);
        finishRoom(room, room.game.result!);
      }
      player.connected = false;
      persistData();
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
        persistData();
        emitRoom(room);
        if (room.status === 'playing') {
          const key = `${room.id}:${player.token}`;
          const existing = disconnectDeadlines.get(key);
          if (existing) clearTimeout(existing);
          const deadline = setTimeout(() => {
            disconnectDeadlines.delete(key);
            if (room.status === 'playing' && !player.connected) {
              room.game = endByResignation(room.game, player.color);
              finishRoom(room, { winner: player.color === 'red' ? 'black' : 'red', winnerColor: player.color === 'red' ? 'black' : 'red', reason: 'disconnect' });
            }
          }, 30_000);
          disconnectDeadlines.set(key, deadline);
        }
      }
    }
    for (const room of rooms.values()) {
      if (socket.data.spectatorRoom === room.id) {
        room.spectatorCount = Math.max(0, room.spectatorCount - 1);
        emitRoom(room);
        break;
      }
    }
    chatWindows.delete(socket.id);
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

function shutdown(): void {
  try {
    persistData();
  } catch (error) {
    console.error('Unable to persist data during shutdown:', error);
  }
  for (const timer of timers.values()) clearInterval(timer);
  for (const timer of disconnectDeadlines.values()) clearTimeout(timer);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
