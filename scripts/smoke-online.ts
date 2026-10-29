import { io, type Socket } from 'socket.io-client';
import type { OnlineActionResult } from '../src/types/chess';

const endpoint = process.env.SOCKET_URL ?? 'http://localhost:3001';
const suffix = Date.now().toString(36);
const tokenA = `smoke-player-a-${suffix}`;
const tokenB = `smoke-player-b-${suffix}`;
const tokenC = `smoke-player-c-${suffix}`;
const clients: Socket[] = [];
let failures = 0;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    failures += 1;
    throw new Error(message);
  }
}

function connect(token: string): Socket {
  const socket = io(endpoint, { forceNew: true, transports: ['websocket'] });
  clients.push(socket);
  return socket;
}

function event<T>(socket: Socket, name: string, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${name}`)), timeout);
    socket.once(name, (value: T) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}

function emitAck<T>(socket: Socket, name: string, payload?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${name} ack`)), 5000);
    const receive = (response: T) => {
      clearTimeout(timer);
      resolve(response);
    };
    if (payload === undefined) socket.emit(name, receive);
    else socket.emit(name, payload, receive);
  });
}

const a = connect(tokenA);
const b = connect(tokenB);
const c = connect(tokenC);
await Promise.all([event(a, 'connect'), event(b, 'connect'), event(c, 'connect')]);

const created = await emitAck<OnlineActionResult>(a, 'create_room', {
  name: 'A', color: 'red', timeLimit: 300, increment: 3, visibility: 'public', token: tokenA
});
assert(created.success && created.roomId, `create failed: ${created.error}`);
const roomId = created.roomId!;
const listed = await emitAck<OnlineActionResult>(c, 'list_rooms');
assert(listed.rooms?.some((room) => room.id === roomId), 'public room did not appear in lobby');
const joined = await emitAck<OnlineActionResult>(b, 'join_room', { roomId, name: 'B', token: tokenB });
assert(joined.success && joined.room?.status === 'playing', 'second player did not start game');

const movedPromise = event<{ room: OnlineActionResult['room']; move: { notation: string } }>(b, 'game_moved');
const moveResult = await emitAck<{ success: boolean; error?: string }>(a, 'move', {
  roomId, token: tokenA, from: [1, 7], to: [4, 7]
});
const moved = await movedPromise;
assert(moveResult.success, `move failed: ${moveResult.error}`);
assert(moved.move.notation === '炮八平五', 'unexpected Chinese notation');
const moverTime = moved.room?.players.find((player) => player.name === 'A')?.timeLeft;
assert((moverTime ?? 0) > 300, 'increment was not applied after move');

const chatPromise = event<{ senderId: string; text: string }>(b, 'chat_message');
a.emit('send_chat', { roomId, token: tokenA, text: 'test chat' });
const chat = await chatPromise;
assert(chat.text === 'test chat' && chat.senderId === 'red', 'chat identity or delivery is wrong');

const mutedPromise = event(b, 'room_updated');
a.emit('mute_player', { roomId, token: tokenA, color: 'black', muted: true });
await mutedPromise;
const blockedPromise = event<{ reason: string }>(b, 'chat_blocked');
b.emit('send_chat', { roomId, token: tokenB, text: 'blocked' });
const blocked = await blockedPromise;
assert(blocked.reason === 'MUTED', 'host mute did not block chat');

const spectator = await emitAck<OnlineActionResult>(c, 'join_room', { roomId, name: 'C', token: tokenC });
assert(spectator.success && spectator.role === 'spectator', 'third client was not seated as spectator');
const report = await emitAck<OnlineActionResult>(c, 'report_chat', { roomId, token: tokenC, message: { id: 'm1', senderId: 'red', senderName: 'A', text: 'test chat', timestamp: Date.now() } });
assert(report.success, 'chat report was not accepted');

a.disconnect();
await new Promise((resolve) => setTimeout(resolve, 120));
const reconnected = connect(tokenA);
await event(reconnected, 'connect');
const restored = await emitAck<OnlineActionResult>(reconnected, 'sync_room', { roomId, token: tokenA });
assert(restored.success && restored.room?.game.history.length === 1, 'reconnect did not restore the game');
reconnected.emit('resign', { roomId, token: tokenA });
await event(b, 'game_over');
const history = await emitAck<OnlineActionResult>(reconnected, 'sync_history', { token: tokenA, name: 'A' });
assert(history.records?.some((record) => record.mode === 'online' && record.history.length === 1), 'finished online game was not persisted');

// Missing acknowledgements must not crash the server.
const unsafe = connect(`smoke-no-ack-${suffix}`);
await event(unsafe, 'connect');
unsafe.emit('create_room', { name: 'NoAck', color: 'red', timeLimit: 0, token: `smoke-nack-${suffix}` });
await new Promise((resolve) => setTimeout(resolve, 150));
assert(unsafe.connected, 'server crashed on a missing acknowledgement callback');

console.log(JSON.stringify({
  roomId,
  lobby: listed.rooms?.length ?? 0,
  move: moved.move.notation,
  incrementFrom: 300,
  incrementTo: moverTime,
  chatSender: chat.senderId,
  muted: blocked.reason,
  report: report.success,
  reconnectHistory: restored.room?.game.history.length,
  persistedGames: history.records?.length,
  noAckAlive: unsafe.connected,
  failures
}, null, 2));

clients.forEach((socket) => socket.close());
