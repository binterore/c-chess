import React, { useEffect, useState, useRef } from 'react';
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
} from './types/chess';
import {
  cloneBoard,
  createInitialBoard,
  detectKillPattern,
  findGeneral,
  getLegalMoves,
  hasAnyLegalMove,
  isCheck,
  isLegalMove
} from './engine/rules';
import { getBestAiMove } from './engine/ai';
import { Board } from './components/Board';
import { KillBanner } from './components/effects/KillBanner';
import { VictoryModal } from './components/effects/VictoryModal';
import { LobbyModal } from './components/LobbyModal';
import { PlayerBar, ActionToolbar } from './components/GameControls';
import { ChatBox } from './components/ChatBox';
import { getSocket } from './services/socket';
import { soundManager } from './audio/soundManager';
import { i18n } from './i18n';

export const App: React.FC = () => {
  const [inLobby, setInLobby] = useState(true);
  const [gameMode, setGameMode] = useState<'online' | 'ai' | 'local'>('online');
  const [playerColor, setPlayerColor] = useState<PieceColor | undefined>('red');
  const [board, setBoard] = useState<BoardState>(createInitialBoard());
  const [turn, setTurn] = useState<PieceColor>('red');
  const [history, setHistory] = useState<Move[]>([]);
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [activeEffect, setActiveEffect] = useState<{
    type: KillPatternType;
    from?: Position;
    to?: Position;
    timestamp: number;
  } | undefined>(undefined);
  const [result, setResult] = useState<GameResult | null>(null);

  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [spectators, setSpectators] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [drawPrompt, setDrawPrompt] = useState(false);
  const [undoPrompt, setUndoPrompt] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [initialRoomParam, setInitialRoomParam] = useState<string | undefined>(
    undefined
  );
  const [aiEngine, setAiEngine] = useState<'pikafish' | 'builtin'>('pikafish');
  const [aiLevel, setAiLevel] = useState<'easy' | 'medium' | 'hard' | 'master'>(
    'medium'
  );
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  const aiThinkingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setInitialRoomParam(roomParam.toUpperCase());
      }
    }
  }, []);

  const checkedKingPos = React.useMemo(() => {
    if (isCheck(board, turn)) {
      return findGeneral(board, turn);
    }
    return null;
  }, [board, turn]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('room_updated', (updatedRoom: RoomState) => {
      setBoard(updatedRoom.board);
      setTurn(updatedRoom.turn);
      setPlayers(updatedRoom.players);
      setSpectators(updatedRoom.spectators);
      setHistory(updatedRoom.history);
      if (updatedRoom.history.length > 0) {
        const last = updatedRoom.history[updatedRoom.history.length - 1];
        setLastMove({ from: last.from, to: last.to });
      } else {
        setLastMove(null);
      }
      if (updatedRoom.result) {
        setResult(updatedRoom.result);
      }
    });

    socket.on('game_moved', (data: { room: RoomState; move: Move; effect?: any }) => {
      setBoard(data.room.board);
      setTurn(data.room.turn);
      setHistory(data.room.history);
      setLastMove({ from: data.move.from, to: data.move.to });

      if (data.effect) {
        setActiveEffect(data.effect);
        soundManager.playPatternSound(data.effect.type);
      } else {
        soundManager.playMove();
      }

      if (data.room.result) {
        setResult(data.room.result);
      }
    });

    socket.on('game_over', (res: GameResult) => {
      setResult(res);
    });

    socket.on('timer_tick', (data: { players: Record<string, Player> }) => {
      setPlayers(data.players);
    });

    socket.on('draw_offered', () => {
      setDrawPrompt(true);
    });

    socket.on('draw_declined', () => {
      showNotice(i18n.zh.drawDeclined);
    });

    socket.on('undo_requested', () => {
      setUndoPrompt(true);
    });

    socket.on('undo_declined', () => {
      showNotice(i18n.zh.undoDeclined);
    });

    socket.on('undo_applied', () => {
      showNotice(i18n.zh.undoAccepted);
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('room_updated');
      socket.off('game_moved');
      socket.off('game_over');
      socket.off('timer_tick');
      socket.off('draw_offered');
      socket.off('draw_declined');
      socket.off('undo_requested');
      socket.off('undo_declined');
      socket.off('undo_applied');
      socket.off('chat_message');
    };
  }, []);

  const showNotice = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleCreateRoom = (options: {
    preferredColor: PieceColor | 'random';
    timeLimit: number;
    playerName: string;
  }) => {
    const socket = getSocket();
    socket.emit('create_room', options, (res: any) => {
      if (res.success) {
        setGameMode('online');
        setRoomId(res.roomId);
        setPlayerColor(res.color);
        setFlipped(res.color === 'black');
        setBoard(res.room.board);
        setTurn(res.room.turn);
        setPlayers(res.room.players);
        setInLobby(false);
      }
    });
  };

  const handleJoinRoom = (code: string, name: string) => {
    const socket = getSocket();
    socket.emit('join_room', { roomId: code, playerName: name }, (res: any) => {
      if (res.success) {
        setGameMode('online');
        setRoomId(res.roomId);
        setPlayerColor(res.color);
        setFlipped(res.color === 'black');
        setBoard(res.room.board);
        setTurn(res.room.turn);
        setPlayers(res.room.players);
        setInLobby(false);
      } else {
        alert(res.error === 'ROOM_NOT_FOUND' ? '房间未找到，请检查房间号' : '无法加入房间');
      }
    });
  };

  const handleStartAi = (
    color: PieceColor,
    engine: 'pikafish' | 'builtin' = 'pikafish',
    level: 'easy' | 'medium' | 'hard' | 'master' = 'medium'
  ) => {
    setGameMode('ai');
    setAiEngine(engine);
    setAiLevel(level);
    setPlayerColor(color);
    setFlipped(color === 'black');
    setBoard(createInitialBoard());
    setTurn('red');
    setHistory([]);
    setLastMove(null);
    setResult(null);
    setInLobby(false);

    const levelStr =
      level === 'master'
        ? i18n.zh.levelMaster
        : level === 'hard'
        ? i18n.zh.levelHard
        : level === 'medium'
        ? i18n.zh.levelMedium
        : i18n.zh.levelEasy;

    const engineName =
      engine === 'pikafish'
        ? `皮卡鱼 · Pikafish (${levelStr})`
        : i18n.zh.engineBuiltin;

    setPlayers({
      p1: { id: 'p1', name: '少侠 (我)', color, isReady: true, timeLeft: 600 },
      ai: {
        id: 'ai',
        name: engineName,
        color: color === 'red' ? 'black' : 'red',
        isReady: true,
        timeLeft: 600
      }
    });
  };

  const handleStartLocal = () => {
    setGameMode('local');
    setPlayerColor(undefined);
    setFlipped(false);
    setBoard(createInitialBoard());
    setTurn('red');
    setHistory([]);
    setLastMove(null);
    setResult(null);
    setInLobby(false);

    setPlayers({
      p1: { id: 'p1', name: '红方少侠', color: 'red', isReady: true, timeLeft: 600 },
      p2: { id: 'p2', name: '黑方大师', color: 'black', isReady: true, timeLeft: 600 }
    });
  };

  useEffect(() => {
    if (gameMode !== 'ai' || inLobby || result) return;

    const aiColor: PieceColor = playerColor === 'red' ? 'black' : 'red';
    if (turn === aiColor && !aiThinkingRef.current) {
      aiThinkingRef.current = true;
      setIsAiThinking(true);

      if (aiEngine === 'pikafish') {
        const socket = getSocket();
        socket.emit(
          'request_ai_move',
          { board, turn: aiColor, engine: 'pikafish', level: aiLevel },
          (res: any) => {
            if (res && res.success && res.from && res.to) {
              executeLocalMove(res.from, res.to);
            } else {
              const fallback = getBestAiMove(board, aiColor);
              if (fallback) {
                executeLocalMove(fallback.from, fallback.to);
              }
            }
            aiThinkingRef.current = false;
            setIsAiThinking(false);
          }
        );
      } else {
        const timer = setTimeout(() => {
          const bestMove = getBestAiMove(board, aiColor);
          if (bestMove) {
            executeLocalMove(bestMove.from, bestMove.to);
          }
          aiThinkingRef.current = false;
          setIsAiThinking(false);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [gameMode, inLobby, turn, board, playerColor, result, aiEngine, aiLevel]);

  const executeLocalMove = (from: Position, to: Position) => {
    const piece = board[from[1]][from[0]];
    if (!piece) return;

    const prevBoard = cloneBoard(board);
    const captured = board[to[1]][to[0]] || undefined;

    const nextBoard = cloneBoard(board);
    nextBoard[to[1]][to[0]] = piece;
    nextBoard[from[1]][from[0]] = null;

    const nextTurn: PieceColor = turn === 'red' ? 'black' : 'red';
    const enemyInCheck = isCheck(nextBoard, nextTurn);
    const enemyHasMoves = hasAnyLegalMove(nextBoard, nextTurn);
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

    const pattern = detectKillPattern(
      prevBoard,
      nextBoard,
      move,
      enemyInCheck,
      enemyCheckmated
    );

    move.killPattern = pattern;

    setBoard(nextBoard);
    setTurn(nextTurn);
    setHistory((prev) => [...prev, move]);
    setLastMove({ from, to });
    setSelectedPos(null);
    setLegalMoves([]);

    const effectData = {
      type: pattern,
      from,
      to,
      timestamp: Date.now()
    };
    setActiveEffect(effectData);
    soundManager.playPatternSound(pattern);

    if (enemyCheckmated || enemyStalemated) {
      setResult({
        winner: turn,
        reason: enemyCheckmated ? 'checkmate' : 'stalemate',
        pattern
      });
    }
  };

  const handleSquareClick = (pos: Position) => {
    if (result) return;

    if (gameMode === 'online') {
      if (playerColor && turn !== playerColor) return;
    } else if (gameMode === 'ai') {
      if (turn !== playerColor) return;
    }

    const [x, y] = pos;
    const piece = board[y][x];

    if (selectedPos) {
      const isLegal = legalMoves.some(([lx, ly]) => lx === x && ly === y);

      if (isLegal) {
        if (gameMode === 'online') {
          const socket = getSocket();
          socket.emit('make_move', {
            roomId,
            from: selectedPos,
            to: pos
          });
          setSelectedPos(null);
          setLegalMoves([]);
        } else {
          executeLocalMove(selectedPos, pos);
        }
        return;
      }

      if (piece && piece.color === turn) {
        setSelectedPos(pos);
        setLegalMoves(getLegalMoves(board, pos, turn));
        return;
      }

      setSelectedPos(null);
      setLegalMoves([]);
      return;
    }

    if (piece && piece.color === turn) {
      setSelectedPos(pos);
      setLegalMoves(getLegalMoves(board, pos, turn));
    }
  };

  const handleResign = () => {
    if (result) return;
    if (gameMode === 'online') {
      const socket = getSocket();
      socket.emit('resign', { roomId });
    } else {
      const winner: PieceColor =
        gameMode === 'ai'
          ? playerColor === 'red'
            ? 'black'
            : 'red'
          : turn === 'red'
          ? 'black'
          : 'red';
      setResult({ winner, reason: 'surrender' });
    }
  };

  const handleOfferDraw = () => {
    if (result) return;
    if (gameMode === 'online') {
      const socket = getSocket();
      socket.emit('offer_draw', { roomId });
      showNotice('已向对方发起和棋请求');
    } else {
      setResult({ winner: 'draw', reason: 'agreement' });
    }
  };

  const handleUndo = () => {
    if (result) return;
    if (gameMode === 'online') {
      const socket = getSocket();
      socket.emit('request_undo', { roomId });
      showNotice('已向对方请求悔棋');
    } else if (gameMode === 'local') {
      if (history.length === 0) return;
      const last = history[history.length - 1];
      const nextBoard = cloneBoard(board);
      nextBoard[last.from[1]][last.from[0]] = last.piece;
      nextBoard[last.to[1]][last.to[0]] = last.captured || null;
      setBoard(nextBoard);
      setTurn(last.piece.color);
      setHistory((prev) => prev.slice(0, -1));
      const prevMove = history.length > 1 ? history[history.length - 2] : null;
      setLastMove(prevMove ? { from: prevMove.from, to: prevMove.to } : null);
      setSelectedPos(null);
      setLegalMoves([]);
    } else if (gameMode === 'ai') {
      if (history.length < 2) return;
      const prev2History = history.slice(0, -2);
      const newBoard = createInitialBoard();
      for (const m of prev2History) {
        newBoard[m.to[1]][m.to[0]] = m.piece;
        newBoard[m.from[1]][m.from[0]] = null;
      }
      setBoard(newBoard);
      setTurn(playerColor || 'red');
      setHistory(prev2History);
      const prevMove =
        prev2History.length > 0 ? prev2History[prev2History.length - 1] : null;
      setLastMove(prevMove ? { from: prevMove.from, to: prevMove.to } : null);
      setSelectedPos(null);
      setLegalMoves([]);
    }
  };

  const handleRematch = () => {
    if (gameMode === 'online') {
      const socket = getSocket();
      socket.emit('rematch', { roomId });
    } else {
      setBoard(createInitialBoard());
      setTurn('red');
      setHistory([]);
      setLastMove(null);
      setResult(null);
      setSelectedPos(null);
      setLegalMoves([]);
      setActiveEffect(undefined);
    }
  };

  const handleExit = () => {
    setInLobby(true);
    setResult(null);
    setRoomId(undefined);
    setBoard(createInitialBoard());
    setHistory([]);
    setLastMove(null);
    setSelectedPos(null);
    setLegalMoves([]);
    setActiveEffect(undefined);
  };

  const handleSendChat = (text: string, isPreset?: boolean) => {
    if (gameMode === 'online') {
      const socket = getSocket();
      socket.emit('send_chat', { roomId, text, isPreset });
    } else {
      const msg: ChatMessage = {
        id: Math.random().toString(),
        senderId: 'local',
        senderName: '我',
        text,
        timestamp: Date.now(),
        isPreset
      };
      setChatMessages((prev) => [...prev, msg]);
    }
  };

  const redPlayer = Object.values(players).find((p) => p.color === 'red') || {
    name: gameMode === 'ai' && playerColor === 'black' ? 'AI 大师' : '红方',
    timeLeft: 600
  };

  const blackPlayer = Object.values(players).find(
    (p) => p.color === 'black'
  ) || {
    name: gameMode === 'ai' && playerColor === 'red' ? 'AI 大师' : '黑方',
    timeLeft: 600
  };

  const topPlayer = flipped ? redPlayer : blackPlayer;
  const topColor: PieceColor = flipped ? 'red' : 'black';
  const bottomPlayer = flipped ? blackPlayer : redPlayer;
  const bottomColor: PieceColor = flipped ? 'black' : 'red';

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-1 sm:p-4 overflow-x-hidden relative">
      {notice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-stone-950 font-bold px-5 py-2.5 rounded-full shadow-2xl font-serif-sc animate-bounce text-sm">
          {notice}
        </div>
      )}

      {drawPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-stone-900 border-2 border-amber-500 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-lg font-bold text-amber-300 font-serif-sc mb-4">
              {i18n.zh.drawOffered}
            </h3>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  getSocket().emit('respond_draw', { roomId, accept: true });
                  setDrawPrompt(false);
                }}
                className="flex-1 py-2 px-4 rounded-xl bg-amber-500 text-stone-950 font-bold font-serif-sc cursor-pointer"
              >
                {i18n.zh.accept}
              </button>
              <button
                onClick={() => {
                  getSocket().emit('respond_draw', { roomId, accept: false });
                  setDrawPrompt(false);
                }}
                className="flex-1 py-2 px-4 rounded-xl bg-stone-800 text-stone-200 font-serif-sc border border-stone-700 cursor-pointer"
              >
                {i18n.zh.decline}
              </button>
            </div>
          </div>
        </div>
      )}

      {undoPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-stone-900 border-2 border-amber-500 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-lg font-bold text-amber-300 font-serif-sc mb-4">
              {i18n.zh.undoRequested}
            </h3>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  getSocket().emit('respond_undo', { roomId, accept: true });
                  setUndoPrompt(false);
                }}
                className="flex-1 py-2 px-4 rounded-xl bg-amber-500 text-stone-950 font-bold font-serif-sc cursor-pointer"
              >
                {i18n.zh.accept}
              </button>
              <button
                onClick={() => {
                  getSocket().emit('respond_undo', { roomId, accept: false });
                  setUndoPrompt(false);
                }}
                className="flex-1 py-2 px-4 rounded-xl bg-stone-800 text-stone-200 font-serif-sc border border-stone-700 cursor-pointer"
              >
                {i18n.zh.decline}
              </button>
            </div>
          </div>
        </div>
      )}

      {showChatModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-4 py-2 bg-stone-950 border-b border-stone-800">
              <span className="text-xs font-bold text-amber-300 font-serif-sc">局内互动</span>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-stone-400 hover:text-stone-200 text-xs px-2 py-1 rounded-lg cursor-pointer"
              >
                关闭
              </button>
            </div>
            <ChatBox
              messages={chatMessages}
              onSendMessage={handleSendChat}
            />
          </div>
        </div>
      )}

      <KillBanner effect={activeEffect || null} />

      {result && (
        <VictoryModal
          result={result}
          playerColor={playerColor}
          onRematch={handleRematch}
          onExit={handleExit}
        />
      )}

      {inLobby ? (
        <LobbyModal
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onStartAi={handleStartAi}
          onStartLocal={handleStartLocal}
          initialRoomCode={initialRoomParam}
        />
      ) : (
        <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 z-10 py-1">
          <div className="w-full flex flex-col items-center gap-1.5 max-w-[520px]">
            <PlayerBar
              player={topPlayer}
              color={topColor}
              isCurrentTurn={turn === topColor && !result}
              isThinking={gameMode === 'ai' && isAiThinking && turn === topColor}
              isSelf={playerColor === topColor}
            />

            <Board
              board={board}
              selectedPos={selectedPos}
              legalMoves={legalMoves}
              lastMove={lastMove}
              checkedKingPos={checkedKingPos}
              flipped={flipped}
              activeEffect={activeEffect}
              onSquareClick={handleSquareClick}
            />

            <PlayerBar
              player={bottomPlayer}
              color={bottomColor}
              isCurrentTurn={turn === bottomColor && !result}
              isThinking={gameMode === 'ai' && isAiThinking && turn === bottomColor}
              isSelf={playerColor === bottomColor}
            />

            <ActionToolbar
              roomId={roomId}
              spectatorsCount={spectators.length}
              onUndo={handleUndo}
              onOfferDraw={handleOfferDraw}
              onResign={handleResign}
              onFlipBoard={() => setFlipped(!flipped)}
              onExit={handleExit}
              onToggleChat={() => setShowChatModal(true)}
            />
          </div>

          <div className="hidden lg:flex w-80 flex-col gap-4">
            <ChatBox
              messages={chatMessages}
              onSendMessage={handleSendChat}
            />
          </div>
        </div>
      )}
    </div>
  );
};
