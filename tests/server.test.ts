import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type { OnlineActionResult } from '../src/types/chess';

const port = 3400 + Math.floor(Math.random() * 200);
const endpoint = `http://127.0.0.1:${port}`;
const dataDir = mkdtempSync(path.join(tmpdir(), 'jiangjie-server-test-'));
let server: ChildProcessWithoutNullStreams;
const clients: Socket[] = [];

function connect(): Socket {
  const socket = io(endpoint, { forceNew: true, transports: ['websocket'] });
  clients.push(socket);
  return socket;
}

function event<T>(socket: Socket, name: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${name}`)), 4000);
    socket.once(name, (value: T) => { clearTimeout(timer); resolve(value); });
  });
}


function roomWhere(socket: Socket, predicate: (room: NonNullable<OnlineActionResult['room']>) => boolean): Promise<NonNullable<OnlineActionResult['room']>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off('room_updated', handler); reject(new Error('Timed out waiting for room state')); }, 4000);
    const handler = (room: NonNullable<OnlineActionResult['room']>) => {
      if (!predicate(room)) return;
      clearTimeout(timer);
      socket.off('room_updated', handler);
      resolve(room);
    };
    socket.on('room_updated', handler);
  });
}

function ack<T>(socket: Socket, name: string, payload?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${name}`)), 4000);
    const receive = (value: T) => { clearTimeout(timer); resolve(value); };
    if (payload === undefined) socket.emit(name, receive);
    else socket.emit(name, payload, receive);
  });
}

async function startServer(): Promise<void> {
  server = spawn(path.resolve('node_modules/.bin/tsx'), ['server/index.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server start timed out')), 8000);
    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes('listening')) { clearTimeout(timer); resolve(); }
    });
    server.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
  });
}

beforeAll(startServer);

afterAll(async () => {
  clients.forEach((socket) => socket.close());
  if (server.exitCode === null) {
    const exited = new Promise<void>((resolve) => server.once('exit', () => resolve()));
    server.kill('SIGTERM');
    await Promise.race([exited, new Promise<void>((resolve) => setTimeout(resolve, 1000))]);
  }
  rmSync(dataDir, { recursive: true, force: true });
});

describe('online server', () => {
  it('matches public rooms, increments clocks and persists history', async () => {
    const a = connect();
    const b = connect();
    await Promise.all([event(a, 'connect'), event(b, 'connect')]);
    const tokenA = 'server-test-player-a';
    const tokenB = 'server-test-player-b';
    const created = await ack<OnlineActionResult>(a, 'create_room', {
      name: 'A', color: 'red', timeLimit: 300, increment: 5, visibility: 'public', token: tokenA
    });
    expect(created.success).toBe(true);
    expect(created.roomId).toBeTruthy();
    const matched = await ack<OnlineActionResult>(b, 'quick_match', {
      name: 'B', color: 'red', timeLimit: 300, increment: 5, token: tokenB
    });
    expect(matched.success).toBe(true);
    expect(matched.roomId).toBe(created.roomId);
    expect(matched.room?.status).toBe('playing');

    const movedPromise = event<{ room: NonNullable<OnlineActionResult['room']>; move: { notation: string } }>(b, 'game_moved');
    const movedResult = await ack<{ success: boolean }>(a, 'move', { roomId: created.roomId, token: tokenA, from: [1, 7], to: [4, 7] });
    const moved = await movedPromise;
    expect(movedResult.success).toBe(true);
    expect(moved.move.notation).toBe('炮八平五');
    expect(moved.room.players.find((player) => player.name === 'A')?.timeLeft).toBeGreaterThan(300);

    a.emit('resign', { roomId: created.roomId, token: tokenA });
    await event(b, 'game_over');
    const history = await ack<OnlineActionResult>(a, 'sync_history', { token: tokenA, name: 'A' });
    expect(history.records?.some((record) => record.mode === 'online' && record.history.length === 1)).toBe(true);

    const oldGameId = moved.room.gameId;
    a.emit('request_rematch', { roomId: created.roomId, token: tokenA });
    const rematchPromise = roomWhere(b, (room) => room.status === 'playing');
    b.emit('request_rematch', { roomId: created.roomId, token: tokenB });
    const rematch = await rematchPromise;
    expect(rematch.status).toBe('playing');
    expect(rematch.gameId).not.toBe(oldGameId);

    const friend = await ack<OnlineActionResult>(a, 'add_friend', { token: tokenA, friendToken: tokenB });
    expect(friend.success).toBe(true);
    expect(friend.friends?.map((profile) => profile.name)).toContain('B');
    const recordId = history.records?.find((record) => record.mode === 'online')?.id;
    const deleted = await ack<OnlineActionResult>(a, 'delete_history', { token: tokenA, recordId });
    expect(deleted.records?.some((record) => record.id === recordId)).toBe(false);
  });

  it('survives clients that omit acknowledgement callbacks', async () => {
    const socket = connect();
    await event(socket, 'connect');
    socket.emit('create_room', { name: 'NoAck', color: 'red', timeLimit: 0, token: 'server-test-no-ack' });
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(socket.connected).toBe(true);
    const room = await ack<OnlineActionResult>(socket, 'create_room', { name: 'AfterNoAck', color: 'red', timeLimit: 0, token: 'server-test-after-no-ack' });
    expect(room.success).toBe(true);
  });

  it('restores a live room after a server process restart', async () => {
    const a = connect();
    const b = connect();
    await Promise.all([event(a, 'connect'), event(b, 'connect')]);
    const tokenA = 'server-restart-player-a';
    const tokenB = 'server-restart-player-b';
    const created = await ack<OnlineActionResult>(a, 'create_room', { name: 'Restart A', color: 'red', timeLimit: 600, increment: 2, token: tokenA });
    const roomId = created.roomId!;
    await ack<OnlineActionResult>(b, 'join_room', { roomId, name: 'Restart B', token: tokenB });
    await ack(a, 'move', { roomId, token: tokenA, from: [1, 7], to: [4, 7] });

    a.close();
    b.close();
    const exited = new Promise<void>((resolve) => server.once('exit', () => resolve()));
    server.kill('SIGTERM');
    await exited;
    await startServer();

    const restoredClient = connect();
    await event(restoredClient, 'connect');
    const restored = await ack<OnlineActionResult>(restoredClient, 'sync_room', { roomId, token: tokenA });
    expect(restored.success).toBe(true);
    expect(restored.room?.status).toBe('playing');
    expect(restored.room?.game.history).toHaveLength(1);
    expect(restored.room?.game.lastMove?.notation).toBe('炮八平五');
  });


  it('requires the correct password for a private room', async () => {
    const host = connect();
    const guest = connect();
    await Promise.all([event(host, 'connect'), event(guest, 'connect')]);
    const created = await ack<OnlineActionResult>(host, 'create_room', {
      name: 'Host', color: 'red', timeLimit: 600, increment: 0, visibility: 'private', password: 'secret-pass', token: 'server-private-host'
    });
    expect(created.room?.hasPassword).toBe(true);
    const denied = await ack<OnlineActionResult>(guest, 'join_room', { roomId: created.roomId, name: 'Guest', token: 'server-private-guest', password: 'wrong' });
    expect(denied.error).toBe('PASSWORD_REQUIRED');
    const accepted = await ack<OnlineActionResult>(guest, 'join_room', { roomId: created.roomId, name: 'Guest', token: 'server-private-guest', password: 'secret-pass' });
    expect(accepted.success).toBe(true);
    expect(accepted.role).toBe('player');
  });

});
