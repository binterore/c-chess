import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import {
  BoardState,
  ChatMessage,
  GameResult,
  KillPatternType,
  Move,
  PieceColor,
  Player,
  Position,
  RoomState
} from '../src/types/chess';
import {
  cloneBoard,
  createInitialBoard,
  detectKillPattern,
  findGeneral,
  hasAnyLegalMove,
  isCheck,
  isLegalMove
} from '../src/engine/rules';
import { getBestAiMove } from '../src/engine/ai';
import { pikafish, boardToFen } from './engine/pikafish';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms: Record<string, RoomState> = {};
const roomTimers: Record<string, NodeJS.Timeout> = {};

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms[id] ? generateRoomId() : id;
}

function stopRoomTimer(roomId: string) {
  if (roomTimers[roomId]) {
    clearInterval(roomTimers[roomId]);
    delete roomTimers[roomId];
  }
}

function startRoomTimer(roomId: string) {
  stopRoomTimer(roomId);
  const room = rooms[roomId];
  if (!room || room.timeLimit <= 0 || room.status !== 'playing') return;

  roomTimers[roomId] = setInterval(() => {
    const r = rooms[roomId];
    if (!r || r.status !== 'playing') {
      stopRoomTimer(roomId);
      return;
    }

    const currentTurn = r.turn;
    const playerEntry = Object.values(r.players).find(
      (p) => p.color === currentTurn
    );

    if (playerEntry) {
      playerEntry.timeLeft -= 1;
      if (playerEntry.timeLeft <= 0) {
        playerEntry.timeLeft = 0;
        r.status = 'ended';
        r.result = {
          winner: currentTurn === 'red' ? 'black' : 'red',
          reason: 'timeout'
        };
        stopRoomTimer(roomId);
        io.to(roomId).emit('game_over', r.result);
      }
      io.to(roomId).emit('timer_tick', {
        players: r.players
      });
    }
  }, 1000);
}

io.on('connection', (socket: Socket) => {
  socket.on('query_engine_status', (callback) => {
    callback({
      pikafishAvailable: pikafish.isAvailable()
    });
  });

  socket.on('request_ai_move', async (data, callback) => {
    const { board, turn, engine, level } = data || {};
    if (!board || !turn) {
      callback?.({ success: false, error: 'INVALID_REQUEST' });
      return;
    }

    if (engine === 'pikafish' && pikafish.isAvailable()) {
      try {
        const fen = boardToFen(board, turn);
        let depth = 10;
        let movetime = 800;

        if (level === 'easy') {
          depth = 6;
          movetime = 400;
        } else if (level === 'medium') {
          depth = 10;
          movetime = 800;
        } else if (level === 'hard') {
          depth = 14;
          movetime = 1500;
        } else if (level === 'master') {
          depth = 18;
          movetime = 2500;
        }

        const res = await pikafish.search(fen, { depth, movetime });
        callback?.({
          success: true,
          from: res.from,
          to: res.to,
          engine: 'pikafish',
          bestmove: res.bestmove
        });
        return;
      } catch (err) {
        console.error('Pikafish search failed, fallback to minimax AI', err);
      }
    }

    const fallbackMove = getBestAiMove(board, turn);
    if (fallbackMove) {
      callback?.({
        success: true,
        from: fallbackMove.from,
        to: fallbackMove.to,
        engine: 'builtin'
      });
    } else {
      callback?.({ success: false, error: 'NO_LEGAL_MOVES' });
    }
  });

  socket.on('create_room', (data, callback) => {
    const { preferredColor, timeLimit, playerName } = data || {};
    const roomId = generateRoomId();

    let assignedColor: PieceColor = 'red';
    if (preferredColor === 'black') {
      assignedColor = 'black';
    } else if (preferredColor === 'random') {
      assignedColor = Math.random() > 0.5 ? 'red' : 'black';
    }

    const limit = typeof timeLimit === 'number' ? timeLimit : 600;

    const hostPlayer: Player = {
      id: socket.id,
      name: playerName || 'Player 1',
      color: assignedColor,
      isReady: true,
      timeLeft: limit
    };

    const newRoom: RoomState = {
      id: roomId,
      hostId: socket.id,
      players: {
        [socket.id]: hostPlayer
      },
      spectators: [],
      status: 'waiting',
      turn: 'red',
      board: createInitialBoard(),
      history: [],
      timeLimit: limit
    };

    rooms[roomId] = newRoom;
    socket.join(roomId);

    callback({
      success: true,
      roomId,
      room: newRoom,
      color: assignedColor
    });
  });

  socket.on('join_room', (data, callback) => {
    const { roomId, playerName } = data || {};
    const room = rooms[roomId];

    if (!room) {
      callback({ success: false, error: 'ROOM_NOT_FOUND' });
      return;
    }

    const playerKeys = Object.keys(room.players);
    let assignedColor: PieceColor | undefined = undefined;

    if (room.players[socket.id]) {
      assignedColor = room.players[socket.id].color;
    } else if (playerKeys.length < 2) {
      const existingPlayer = room.players[playerKeys[0]];
      assignedColor = existingPlayer.color === 'red' ? 'black' : 'red';
      room.players[socket.id] = {
        id: socket.id,
        name: playerName || `Player ${playerKeys.length + 1}`,
        color: assignedColor,
        isReady: true,
        timeLeft: room.timeLimit
      };
      if (room.status === 'waiting') {
        room.status = 'playing';
        startRoomTimer(roomId);
      }
    } else {
      if (!room.spectators.includes(socket.id)) {
        room.spectators.push(socket.id);
      }
    }

    socket.join(roomId);

    io.to(roomId).emit('room_updated', room);
    callback({
      success: true,
      roomId,
      room,
      color: assignedColor
    });
  });

  socket.on('make_move', (data, callback) => {
    const { roomId, from, to } = data;
    const room = rooms[roomId];

    if (!room || room.status !== 'playing') {
      callback?.({ success: false, error: 'INVALID_GAME_STATE' });
      return;
    }

    const player = room.players[socket.id];
    if (!player || player.color !== room.turn) {
      callback?.({ success: false, error: 'NOT_YOUR_TURN' });
      return;
    }

    const piece = room.board[from[1]][from[0]];
    if (!piece || piece.color !== room.turn) {
      callback?.({ success: false, error: 'INVALID_PIECE' });
      return;
    }

    if (!isLegalMove(room.board, from, to, room.turn)) {
      callback?.({ success: false, error: 'ILLEGAL_MOVE' });
      return;
    }

    const prevBoard = cloneBoard(room.board);
    const captured = room.board[to[1]][to[0]] || undefined;

    room.board[to[1]][to[0]] = piece;
    room.board[from[1]][from[0]] = null;

    const nextTurn: PieceColor = room.turn === 'red' ? 'black' : 'red';
    const enemyInCheck = isCheck(room.board, nextTurn);
    const enemyHasMoves = hasAnyLegalMove(room.board, nextTurn);
    const enemyCheckmated = enemyInCheck && !enemyHasMoves;
    const enemyStalemated = !enemyInCheck && !enemyHasMoves;

    const move: Move = {
      from,
      to,
      piece,
      captured,
      isCheck: enemyInCheck,
      isCheckmate: enemyCheckmated
    };

    const pattern: KillPatternType = detectKillPattern(
      prevBoard,
      room.board,
      move,
      enemyInCheck,
      enemyCheckmated
    );

    move.killPattern = pattern;
    room.history.push(move);
    room.turn = nextTurn;

    room.activeEffect = {
      type: pattern,
      from,
      to,
      timestamp: Date.now()
    };

    if (enemyCheckmated || enemyStalemated) {
      room.status = 'ended';
      room.result = {
        winner: player.color,
        reason: enemyCheckmated ? 'checkmate' : 'stalemate',
        pattern
      };
      stopRoomTimer(roomId);
    }

    io.to(roomId).emit('game_moved', {
      room,
      move,
      effect: room.activeEffect
    });

    callback?.({ success: true });
  });

  socket.on('offer_draw', ({ roomId }) => {
    socket.to(roomId).emit('draw_offered', { fromId: socket.id });
  });

  socket.on('respond_draw', ({ roomId, accept }) => {
    const room = rooms[roomId];
    if (!room) return;

    if (accept) {
      room.status = 'ended';
      room.result = {
        winner: 'draw',
        reason: 'agreement'
      };
      stopRoomTimer(roomId);
      io.to(roomId).emit('game_over', room.result);
      io.to(roomId).emit('room_updated', room);
    } else {
      socket.to(roomId).emit('draw_declined');
    }
  });

  socket.on('request_undo', ({ roomId }) => {
    socket.to(roomId).emit('undo_requested', { fromId: socket.id });
  });

  socket.on('respond_undo', ({ roomId, accept }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;

    if (accept && room.history.length > 0) {
      const lastMove = room.history.pop()!;
      room.board[lastMove.from[1]][lastMove.from[0]] = lastMove.piece;
      room.board[lastMove.to[1]][lastMove.to[0]] = lastMove.captured || null;
      room.turn = lastMove.piece.color;
      delete room.activeEffect;

      io.to(roomId).emit('room_updated', room);
      io.to(roomId).emit('undo_applied');
    } else {
      socket.to(roomId).emit('undo_declined');
    }
  });

  socket.on('resign', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;

    const player = room.players[socket.id];
    if (!player || !player.color) return;

    room.status = 'ended';
    room.result = {
      winner: player.color === 'red' ? 'black' : 'red',
      reason: 'surrender'
    };
    stopRoomTimer(roomId);
    io.to(roomId).emit('game_over', room.result);
    io.to(roomId).emit('room_updated', room);
  });

  socket.on('rematch', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.board = createInitialBoard();
    room.history = [];
    room.turn = 'red';
    room.status = 'playing';
    delete room.result;
    delete room.activeEffect;

    Object.values(room.players).forEach((p) => {
      p.timeLeft = room.timeLimit;
    });

    startRoomTimer(roomId);
    io.to(roomId).emit('room_updated', room);
  });

  socket.on('send_chat', ({ roomId, text, isPreset }) => {
    const room = rooms[roomId];
    if (!room) return;

    const sender = room.players[socket.id];
    const message: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: socket.id,
      senderName: sender?.name || 'Spectator',
      text,
      timestamp: Date.now(),
      isPreset
    };

    io.to(roomId).emit('chat_message', message);
  });

  socket.on('disconnect', () => {
    Object.entries(rooms).forEach(([roomId, room]) => {
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        if (Object.keys(room.players).length === 0) {
          stopRoomTimer(roomId);
          delete rooms[roomId];
        } else {
          io.to(roomId).emit('room_updated', room);
        }
      } else {
        const specIdx = room.spectators.indexOf(socket.id);
        if (specIdx !== -1) {
          room.spectators.splice(specIdx, 1);
          io.to(roomId).emit('room_updated', room);
        }
      }
    });
  });
});

const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
