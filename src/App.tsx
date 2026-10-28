import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AiLevel,
  BoardSkin,
  ChatMessage,
  EffectIntensity,
  EngineInfo,
  GameMode,
  GameSnapshot,
  Move,
  OnlineActionResult,
  PieceColor,
  Position,
  PublicOnlineRoom,
  VisualMove
} from './types/chess';
import {
  applyMoveToSnapshot,
  createGameSnapshot,
  endByResignation,
  replayMoves
} from './engine/game';
import {
  createInitialBoard,
  findGeneral,
  getLegalMoves,
  isInCheck
} from './engine/rules';
import { endgames, getEndgameBoard, type Endgame } from './engine/endgames';
import { HomeScreen } from './components/HomeScreen';
import { SetupPanel, type OnlineSetup, type SetupKind } from './components/SetupPanel';
import { ChessBoard, type ChessBoardHandle } from './components/ChessBoard';
import { GameInterface } from './components/GameInterface';
import { PromptDialog, ResultOverlay, SettingsDialog, Toast } from './components/Overlays';
import { soundManager } from './audio/soundManager';
import { getPlayerName, getPlayerToken, getSocket } from './services/socket';
import AiWorker from './workers/aiWorker?worker&inline';
import { copy } from './i18n';

type Screen = 'home' | 'game';
type PromptType = 'leave' | 'resign' | 'undo' | 'restart' | 'incoming-draw' | 'incoming-undo';

interface PromptState {
  type: PromptType;
}

interface AiWorkerResponse {
  id: number;
  from?: Position;
  to?: Position;
  depth?: number;
  nodes?: number;
  elapsed?: number;
  evaluation?: number;
  error?: string;
}

const SPEED: Record<string, number> = {
  general: 300,
  advisor: 280,
  elephant: 300,
  horse: 340,
  chariot: 260,
  cannon: 320,
  soldier: 260
};

function initialReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function storedIntensity(): EffectIntensity {
  const value = localStorage.getItem('jiangjie-intensity');
  if (value === 'full' || value === 'reduced' || value === 'off') return value;
  return initialReducedMotion() ? 'reduced' : 'full';
}

function storedSkin(): BoardSkin {
  const item = localStorage.getItem('jiangjie-skin-v4');
  return item === 'classic' ? 'classic' : 'figurine';
}

function makeVisual(move: Move, intensity: EffectIntensity, counter: number): VisualMove {
  const base = SPEED[move.piece.type] ?? 300;
  const captureBonus = move.captured ? 40 : 0;
  const reduceFactor = intensity === 'off' ? 0.35 : intensity === 'reduced' ? 0.75 : 1;
  return {
    id: counter,
    move,
    duration: Math.round((base + captureBonus) * reduceFactor)
  };
}

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [sceneKey, setSceneKey] = useState(0);
  const [mode, setMode] = useState<GameMode>('ai');
  const [setupKind, setSetupKind] = useState<SetupKind | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => createGameSnapshot());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [visualMove, setVisualMove] = useState<VisualMove | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [playerColor, setPlayerColor] = useState<PieceColor>('red');
  const [playerName, setPlayerName] = useState(() => getPlayerName() || copy.setup.namePlaceholder);
  const [isSpectator, setIsSpectator] = useState(false);
  const [localPlayerColor, setLocalPlayerColor] = useState<PieceColor | null>(null);
  const [difficulty, setDifficulty] = useState<AiLevel>('medium');
  const [engineInfo, setEngineInfo] = useState<EngineInfo | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [puzzle, setPuzzle] = useState<Endgame | null>(null);
  const [puzzleFailed, setPuzzleFailed] = useState(false);
  const [puzzleProgressIds, setPuzzleProgressIds] = useState<string[]>(() => {
    try {
      const value = JSON.parse(localStorage.getItem('jiangjie-puzzle-progress') ?? '[]');
      return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });
  const [flipped, setFlipped] = useState(false);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('jiangjie-sound') !== 'off');
  const [intensity, setIntensity] = useState<EffectIntensity>(storedIntensity);
  const [skin, setSkin] = useState<BoardSkin>(storedSkin);
  const [prefersReduced, setPrefersReduced] = useState(initialReducedMotion);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 920);
  const [resultOpen, setResultOpen] = useState(false);
  const [victoryToken, setVictoryToken] = useState(0);
  const [victoryColor, setVictoryColor] = useState<'red' | 'black' | 'draw'>('red');
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [onlineRoom, setOnlineRoom] = useState<PublicOnlineRoom | null>(null);
  const [myToken, setMyToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initialRoomCode, setInitialRoomCode] = useState('');

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const legalMovesRef = useRef(legalMoves);
  legalMovesRef.current = legalMoves;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const playerColorRef = useRef(playerColor);
  playerColorRef.current = playerColor;
  const localPlayerColorRef = useRef(localPlayerColor);
  localPlayerColorRef.current = localPlayerColor;
  const isAnimatingRef = useRef(isAnimating);
  isAnimatingRef.current = isAnimating;
  const aiThinkingRef = useRef(aiThinking);
  aiThinkingRef.current = aiThinking;
  const roomRef = useRef<PublicOnlineRoom | null>(onlineRoom);
  roomRef.current = onlineRoom;
  const tokenRef = useRef<string | null>(myToken);
  tokenRef.current = myToken;
  const visualRef = useRef<VisualMove | null>(visualMove);
  visualRef.current = visualMove;
  const visualSequence = useRef(0);
  const aiWorkerRef = useRef<Worker | null>(null);
  const hintWorkerRef = useRef<Worker | null>(null);
  const pendingOnlineMove = useRef<{ from: Position; to: Position; before: GameSnapshot; visualId: number } | null>(null);
  const resultHandledRef = useRef('');
  const puzzleFailHandledRef = useRef('');
  const toastTimerRef = useRef<number | null>(null);
  const boardRef = useRef<ChessBoardHandle | null>(null);
  const homeBoard = useMemo(() => createInitialBoard(), []);

  const replaceSnapshot = useCallback((next: GameSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setLegalMoves([]);
  }, []);

  const resetVisualState = useCallback(() => {
    aiWorkerRef.current?.terminate();
    aiWorkerRef.current = null;
    hintWorkerRef.current?.terminate();
    hintWorkerRef.current = null;
    pendingOnlineMove.current = null;
    visualRef.current = null;
    isAnimatingRef.current = false;
    aiThinkingRef.current = false;
    setVisualMove(null);
    setIsAnimating(false);
    setAiThinking(false);
    setEngineInfo(null);
    setResultOpen(false);
    setPuzzleFailed(false);
    clearSelection();
    boardRef.current?.setCinematicEnding(false);
    boardRef.current?.clearHint();
    setSceneKey((key) => key + 1);
  }, [clearSelection]);

  const startVisual = useCallback((move: Move) => {
    visualSequence.current += 1;
    const visual = makeVisual(move, intensity, visualSequence.current);
    visualRef.current = visual;
    setVisualMove(visual);
    setIsAnimating(true);
    return visual;
  }, [intensity]);

  const applyLocalMove = useCallback((from: Position, to: Position) => {
    const current = snapshotRef.current;
    try {
      const result = applyMoveToSnapshot(current, from, to);
      replaceSnapshot(result.snapshot);
      clearSelection();
      startVisual(result.move);
      soundManager.move(result.move);
      return result;
    } catch {
      showToast(copy.game.hintUnavailable);
      return null;
    }
  }, [clearSelection, replaceSnapshot, showToast, startVisual]);

  const startAiGame = useCallback((color: PieceColor, level: AiLevel, name?: string) => {
    const next = createGameSnapshot();
    resetVisualState();
    if (name) setPlayerName(name);
    setIsSpectator(false);
    setMode('ai');
    setDifficulty(level);
    setPlayerColor(color);
    setLocalPlayerColor(null);
    setPuzzle(null);
    setPuzzleFailed(false);
    setOnlineRoom(null);
    setMyToken(null);
    setMessages([]);
    replaceSnapshot(next);
    setFlipped(color === 'black');
    clearSelection();
    resultHandledRef.current = '';
    puzzleFailHandledRef.current = '';
    setSetupKind(null);
    setScreen('game');
    setPanelOpen(window.innerWidth > 920);
  }, [replaceSnapshot, resetVisualState]);

  const startLocalGame = useCallback(() => {
    resetVisualState();
    setIsSpectator(false);
    setMode('local');
    setPlayerColor('red');
    setLocalPlayerColor(null);
    setPuzzle(null);
    setPuzzleFailed(false);
    setOnlineRoom(null);
    setMyToken(null);
    setMessages([]);
    replaceSnapshot(createGameSnapshot());
    setFlipped(false);
    resultHandledRef.current = '';
    puzzleFailHandledRef.current = '';
    setSetupKind(null);
    setScreen('game');
    setPanelOpen(window.innerWidth > 920);
  }, [replaceSnapshot, resetVisualState]);

  const startPuzzle = useCallback((game: Endgame) => {
    resetVisualState();
    setIsSpectator(false);
    setMode('puzzle');
    setPuzzle(game);
    setPlayerColor(game.playerColor);
    setLocalPlayerColor(null);
    setPuzzleFailed(false);
    setOnlineRoom(null);
    setMyToken(null);
    setMessages([]);
    replaceSnapshot(createGameSnapshot(getEndgameBoard(game)));
    setFlipped(game.playerColor === 'black');
    resultHandledRef.current = '';
    puzzleFailHandledRef.current = '';
    setSetupKind(null);
    setScreen('game');
    setPanelOpen(window.innerWidth > 920);
  }, [replaceSnapshot, resetVisualState]);

  const returnHome = useCallback(() => {
    resetVisualState();
    const socket = getSocket();
    if (onlineRoom) socket.emit('leave_room', { roomId: onlineRoom.id, token: myToken ?? undefined });
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('room')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setScreen('home');
    setSetupKind(null);
    setSettingsOpen(false);
    setResultOpen(false);
    setPrompt(null);
    setOnlineRoom(null);
    setMessages([]);
    setPuzzle(null);
    setPuzzleFailed(false);
    replaceSnapshot(createGameSnapshot());
    setFlipped(false);
  }, [myToken, onlineRoom, replaceSnapshot, resetVisualState]);

  const handleSquareClick = useCallback((position: Position) => {
    const current = snapshotRef.current;
    if (current.status !== 'playing' || isAnimatingRef.current || aiThinkingRef.current) return;
    if (modeRef.current === 'online') {
      const room = roomRef.current;
      if (!room || room.status !== 'playing' || room.players.length < 2) return;
      const me = room.players.find((player) => player.socketId === getSocket().id);
      if (!me || me.color !== current.turn) return;
    }
    if ((modeRef.current === 'ai' || modeRef.current === 'puzzle') && current.turn !== playerColorRef.current) return;

    const [x, y] = position;
    const piece = current.board[y][x];
    let selectedPosition: Position | null = null;
    if (selectedRef.current) {
      for (let row = 0; row < current.board.length; row += 1) {
        const column = current.board[row].findIndex((candidate) => candidate?.id === selectedRef.current);
        if (column >= 0) {
          selectedPosition = [column, row];
          break;
        }
      }
    }

    if (selectedPosition && legalMovesRef.current.some(([mx, my]) => mx === x && my === y)) {
      if (modeRef.current === 'online') {
        const room = roomRef.current;
        const token = tokenRef.current;
        if (!room || !token) return;
        try {
          const optimistic = applyMoveToSnapshot(current, selectedPosition, position);
          const visual = startVisual(optimistic.move);
          replaceSnapshot(optimistic.snapshot);
          clearSelection();
          soundManager.move(optimistic.move);
          pendingOnlineMove.current = { from: selectedPosition, to: position, before: current, visualId: visual.id };
          getSocket().emit('move', { roomId: room.id, token, from: selectedPosition, to: position }, (response: { success: boolean; error?: string }) => {
            if (!response?.success) {
              const pending = pendingOnlineMove.current;
              if (pending?.visualId === visual.id) {
                replaceSnapshot(pending.before);
                setVisualMove(null);
                visualRef.current = null;
                setIsAnimating(false);
                pendingOnlineMove.current = null;
                clearSelection();
                showToast(copy.online.joinFailed);
              }
            }
          });
        } catch {
          showToast(copy.game.hintUnavailable);
        }
        return;
      }
      applyLocalMove(selectedPosition, position);
      return;
    }

    if (piece && piece.color === current.turn) {
      const moves = getLegalMoves(current.board, position, current.turn);
      setSelectedId(piece.id);
      setLegalMoves(moves);
      soundManager.select();
    } else {
      clearSelection();
    }
    boardRef.current?.clearHint();
  }, [applyLocalMove, clearSelection, replaceSnapshot, showToast, startVisual]);

  const onAnimationComplete = useCallback((id: number) => {
    if (visualRef.current?.id !== id) return;
    visualRef.current = null;
    setVisualMove(null);
    setIsAnimating(false);
  }, []);

  const handleStartOnline = useCallback((options: OnlineSetup) => {
    const socket = getSocket();
    const token = getPlayerToken();
    socket.timeout(6000).emit('create_room', {
      name: options.name,
      color: options.color === 'random' ? (Math.random() > 0.5 ? 'red' : 'black') : options.color,
      timeLimit: options.timeLimit,
      token
    }, (error: Error | null, response: OnlineActionResult) => {
      if (error || !response?.success || !response.room) {
        showToast(copy.online.createFailed);
        return;
      }
      resetVisualState();
      setMode('online');
      setPlayerColor(response.room.hostColor);
      setPlayerName(options.name);
      setIsSpectator(false);
      setLocalPlayerColor(null);
      setMyToken(response.token ?? token);
      setOnlineRoom(response.room);
      setMessages([]);
      replaceSnapshot(response.room.game);
      setFlipped(response.room.hostColor === 'black');
      setPuzzle(null);
      setPuzzleFailed(false);
      setSetupKind(null);
      setScreen('game');
      setPanelOpen(window.innerWidth > 920);
      setResultOpen(false);
      resultHandledRef.current = '';
    });
  }, [replaceSnapshot, resetVisualState, showToast]);

  const handleJoinOnline = useCallback((roomId: string, name: string) => {
    const socket = getSocket();
    const token = getPlayerToken();
    socket.timeout(6000).emit('join_room', { roomId: roomId.toUpperCase(), name, token }, (error: Error | null, response: OnlineActionResult) => {
      if (error || !response?.success || !response.room) {
        showToast(response?.error === 'ROOM_NOT_FOUND' ? copy.online.roomNotFound : copy.online.joinFailed);
        return;
      }
      const seat = response.room.players.find((player) => player.socketId === socket.id);
      resetVisualState();
      setMode('online');
      setIsSpectator(!seat);
      setPlayerColor(seat?.color ?? response.room.hostColor);
      setLocalPlayerColor(null);
      setMyToken(response.token ?? token);
      setOnlineRoom(response.room);
      setMessages([]);
      replaceSnapshot(response.room.game);
      setFlipped(seat?.color === 'black');
      setPlayerName(name);
      setPuzzle(null);
      setPuzzleFailed(false);
      setSetupKind(null);
      setScreen('game');
      setPanelOpen(window.innerWidth > 920);
      setResultOpen(false);
      resultHandledRef.current = '';
      window.history.replaceState({}, '', window.location.pathname);
    });
  }, [replaceSnapshot, resetVisualState, showToast]);

  useEffect(() => {
    const applyRoom = (room: PublicOnlineRoom) => {
      roomRef.current = room;
      setOnlineRoom(room);
      const socket = getSocket();
      const me = room.players.find((player) => player.socketId === socket.id);
      if (modeRef.current === 'online') setIsSpectator(!me);
      if (me) {
        playerColorRef.current = me.color;
        setPlayerColor(me.color);
      }
      if (!isAnimatingRef.current || room.game.history.length > snapshotRef.current.history.length) {
        replaceSnapshot(room.game);
        setFlipped(me?.color === 'black');
      }
    };

    const socket = getSocket();
    setConnected(socket.connected);
    const onConnect = () => {
      setConnected(true);
      if (roomRef.current && tokenRef.current) {
        socket.emit('sync_room', { roomId: roomRef.current.id, token: tokenRef.current }, (response: OnlineActionResult) => {
          if (response?.success && response.room) applyRoom(response.room);
        });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onConnectError = () => setConnected(false);
    const onRoomUpdated = (room: PublicOnlineRoom) => applyRoom(room);
    const onGameMoved = ({ room, move }: { room: PublicOnlineRoom; move: Move }) => {
      roomRef.current = room;
      setOnlineRoom(room);
      const pending = pendingOnlineMove.current;
      const isOwnOptimistic = pending && pending.from[0] === move.from[0] && pending.from[1] === move.from[1] && pending.to[0] === move.to[0] && pending.to[1] === move.to[1] && move.piece.color === playerColorRef.current;
      replaceSnapshot(room.game);
      pendingOnlineMove.current = null;
      if (!isOwnOptimistic) {
        clearSelection();
        startVisual(move);
        soundManager.move(move);
      }
    };
    const onClockTick = ({ players }: { players: PublicOnlineRoom['players'] }) => {
      setOnlineRoom((current) => current ? { ...current, players } : current);
    };
    const onUndoRequested = () => setPrompt({ type: 'incoming-undo' });
    const onDrawRequested = () => setPrompt({ type: 'incoming-draw' });
    const onUndoDeclined = () => showToast(copy.game.undoDeclined);
    const onDrawDeclined = () => showToast(copy.game.drawDeclined);
    const onUndoApplied = () => {
      clearSelection();
      showToast(copy.game.undo);
    };
    const onChatMessage = (message: ChatMessage) => setMessages((current) => [...current, message].slice(-30));
    const onGameOver = () => undefined;
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('room_updated', onRoomUpdated);
    socket.on('game_moved', onGameMoved);
    socket.on('clock_tick', onClockTick);
    socket.on('undo_requested', onUndoRequested);
    socket.on('draw_requested', onDrawRequested);
    socket.on('undo_declined', onUndoDeclined);
    socket.on('draw_declined', onDrawDeclined);
    socket.on('undo_applied', onUndoApplied);
    socket.on('chat_message', onChatMessage);
    socket.on('game_over', onGameOver);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('room_updated', onRoomUpdated);
      socket.off('game_moved', onGameMoved);
      socket.off('clock_tick', onClockTick);
      socket.off('undo_requested', onUndoRequested);
      socket.off('draw_requested', onDrawRequested);
      socket.off('undo_declined', onUndoDeclined);
      socket.off('draw_declined', onDrawDeclined);
      socket.off('undo_applied', onUndoApplied);
      socket.off('chat_message', onChatMessage);
      socket.off('game_over', onGameOver);
    };
  }, [clearSelection, replaceSnapshot, showToast, startVisual]);

  useEffect(() => {
    soundManager.setEnabled(soundOn);
    localStorage.setItem('jiangjie-sound', soundOn ? 'on' : 'off');
    const unlock = () => void soundManager.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [soundOn]);

  useEffect(() => {
    localStorage.setItem('jiangjie-intensity', intensity);
    localStorage.setItem('jiangjie-skin-v4', skin);
  }, [intensity, skin]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = () => {
      setPrefersReduced(media.matches);
      if (media.matches && !localStorage.getItem('jiangjie-intensity')) setIntensity('reduced');
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('room');
    if (code) {
      setInitialRoomCode(code.toUpperCase());
      setSetupKind('online');
    }
  }, []);

  useEffect(() => {
    if (screen !== 'game' || mode !== 'ai' || snapshot.status !== 'playing' || isAnimating) return;
    const aiColor: PieceColor = playerColor === 'red' ? 'black' : 'red';
    if (snapshot.turn !== aiColor || aiWorkerRef.current) return;
    const searchSnapshot = snapshot;
    const worker = new AiWorker();
    aiWorkerRef.current = worker;
    setAiThinking(true);
    aiThinkingRef.current = true;
    setEngineInfo(null);
    const requestId = Date.now();
    worker.postMessage({ id: requestId, board: snapshot.board, turn: aiColor, level: difficulty });
    worker.onmessage = (event: MessageEvent<AiWorkerResponse>) => {
      const response = event.data;
      worker.terminate();
      aiWorkerRef.current = null;
      setAiThinking(false);
      aiThinkingRef.current = false;
      if (response.from && response.to && snapshotRef.current === searchSnapshot) {
        setEngineInfo({
          depth: response.depth ?? 0,
          nodes: response.nodes ?? 0,
          elapsed: response.elapsed ?? 0,
          evaluation: response.evaluation ?? 0
        });
        applyLocalMove(response.from, response.to);
      } else if (response.error) {
        showToast(copy.game.hintUnavailable);
      }
    };
    worker.onerror = () => {
      worker.terminate();
      aiWorkerRef.current = null;
      setAiThinking(false);
      aiThinkingRef.current = false;
      showToast(copy.game.hintUnavailable);
    };
    return () => {
      worker.terminate();
      if (aiWorkerRef.current === worker) aiWorkerRef.current = null;
      setAiThinking(false);
      aiThinkingRef.current = false;
    };
  }, [applyLocalMove, difficulty, isAnimating, mode, playerColor, screen, showToast, snapshot]);

  useEffect(() => {
    if (screen !== 'game' || mode !== 'puzzle' || !puzzle || snapshot.status !== 'playing' || isAnimating) return;
    const used = snapshot.history.filter((move) => move.piece.color === puzzle.playerColor).length;
    if (used < puzzle.targetMoves) return;
    const key = `${puzzle.id}-${snapshot.history.length}`;
    if (puzzleFailHandledRef.current === key) return;
    puzzleFailHandledRef.current = key;
    setPuzzleFailed(true);
    setVictoryColor('black');
    setVictoryToken((token) => token + 1);
    window.setTimeout(() => setResultOpen(true), 450);
    soundManager.defeat();
  }, [isAnimating, mode, puzzle, screen, snapshot]);

  useEffect(() => {
    if (screen !== 'game' || snapshot.status !== 'ended' || !snapshot.result || isAnimating) return;
    const key = `${snapshot.history.length}-${snapshot.result.reason}-${snapshot.result.winner}`;
    if (resultHandledRef.current === key) return;
    resultHandledRef.current = key;
    const winner = snapshot.result.winner;
    setVictoryColor(winner);
    setVictoryToken((token) => token + 1);
    if (mode === 'puzzle' && puzzle && winner === puzzle.playerColor) {
      setPuzzleProgressIds((current) => {
        if (current.includes(puzzle.id)) return current;
        const next = [...current, puzzle.id];
        localStorage.setItem('jiangjie-puzzle-progress', JSON.stringify(next));
        return next;
      });
    }
    if (winner === 'draw' || isSpectator) soundManager.draw();
    else if (mode === 'local' || winner === playerColor) soundManager.victory();
    else soundManager.defeat();

    boardRef.current?.setCinematicEnding(true);
    const lastMove = snapshot.history[snapshot.history.length - 1];
    if (lastMove) {
      boardRef.current?.replayCheckmateMove(lastMove);
      window.setTimeout(() => setResultOpen(true), 4200);
    } else {
      window.setTimeout(() => setResultOpen(true), 1200);
    }
  }, [isAnimating, isSpectator, mode, playerColor, puzzle, screen, snapshot]);

  const handleReplayCheckmate = useCallback(() => {
    setResultOpen(false);
    const lastMove = snapshot.history[snapshot.history.length - 1];
    if (lastMove) {
      boardRef.current?.replayCheckmateMove(lastMove);
    } else {
      boardRef.current?.setCinematicEnding(true);
    }
  }, [snapshot.history]);

  useEffect(() => {
    return () => {
      aiWorkerRef.current?.terminate();
      hintWorkerRef.current?.terminate();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const confirmPrompt = () => {
    if (!prompt) return;
    if (prompt.type === 'leave') {
      if (mode === 'online' && onlineRoom && myToken && onlineRoom.status === 'playing') {
        getSocket().emit('resign', { roomId: onlineRoom.id, token: myToken });
      }
      returnHome();
      return;
    }
    if (prompt.type === 'resign') {
      if (mode === 'online' && onlineRoom && myToken) {
        getSocket().emit('resign', { roomId: onlineRoom.id, token: myToken });
      } else {
        const loser = mode === 'ai' || mode === 'puzzle' ? playerColor : snapshot.turn;
        replaceSnapshot(endByResignation(snapshot, loser));
        clearSelection();
      }
      setPrompt(null);
      return;
    }
    if (prompt.type === 'undo') {
      if (mode === 'online' && onlineRoom && myToken) {
        getSocket().emit('request_undo', { roomId: onlineRoom.id, token: myToken });
        showToast(copy.prompts.waiting);
      } else {
        let removeCount = 1;
        if (mode === 'ai') removeCount = Math.min(2, snapshot.history.length);
        if (mode === 'puzzle') {
          setPrompt(null);
          if (puzzle) startPuzzle(puzzle);
          return;
        }
        const initial = createInitialBoard();
        const next = replayMoves(initial, snapshot.history.slice(0, Math.max(0, snapshot.history.length - removeCount)));
        replaceSnapshot(next);
        clearSelection();
        resultHandledRef.current = '';
        setResultOpen(false);
      }
      setPrompt(null);
      return;
    }
    if (prompt.type === 'restart') {
      if (mode === 'puzzle' && puzzle) startPuzzle(puzzle);
      else if (mode === 'ai') startAiGame(playerColor, difficulty, playerName);
      else if (mode === 'local') startLocalGame();
      else if (mode === 'online' && onlineRoom && myToken) {
        getSocket().emit('request_rematch', { roomId: onlineRoom.id, token: myToken });
        setResultOpen(false);
        showToast(copy.prompts.waiting);
      }
      setPrompt(null);
      return;
    }
    if (prompt.type === 'incoming-draw' && onlineRoom && myToken) {
      getSocket().emit('respond_draw', { roomId: onlineRoom.id, token: myToken, accept: true });
    }
    if (prompt.type === 'incoming-undo' && onlineRoom && myToken) {
      getSocket().emit('respond_undo', { roomId: onlineRoom.id, token: myToken, accept: true });
    }
    setPrompt(null);
  };

  const cancelPrompt = () => {
    if (prompt?.type === 'incoming-draw' && onlineRoom && myToken) {
      getSocket().emit('respond_draw', { roomId: onlineRoom.id, token: myToken, accept: false });
    }
    if (prompt?.type === 'incoming-undo' && onlineRoom && myToken) {
      getSocket().emit('respond_undo', { roomId: onlineRoom.id, token: myToken, accept: false });
    }
    setPrompt(null);
  };

  const handleBack = () => {
    if (isSpectator) {
      returnHome();
      return;
    }
    if (mode === 'online' && onlineRoom?.status === 'waiting') {
      returnHome();
      return;
    }
    if (snapshot.status === 'ended') {
      returnHome();
      return;
    }
    setPrompt({ type: 'leave' });
  };

  const requestUndo = () => {
    if (mode === 'online') {
      setPrompt({ type: 'undo' });
      return;
    }
    if (mode === 'puzzle') {
      setPrompt({ type: 'undo' });
      return;
    }
    setPrompt({ type: 'undo' });
  };

  const requestHint = () => {
    if (mode === 'online') {
      showToast(copy.game.hintUnavailable);
      return;
    }
    if (puzzle) {
      const correct = getLegalMoves(snapshot.board, puzzle.solution.from, snapshot.turn).some(
        ([x, y]) => x === puzzle.solution.to[0] && y === puzzle.solution.to[1]
      );
      if (correct) {
        boardRef.current?.showHint(puzzle.solution.from, puzzle.solution.to);
        showToast(copy.game.hintReady);
        window.setTimeout(() => boardRef.current?.clearHint(), 2800);
      }
      return;
    }
    hintWorkerRef.current?.terminate();
    const worker = new AiWorker();
    hintWorkerRef.current = worker;
    worker.postMessage({ id: Date.now(), board: snapshot.board, turn: snapshot.turn, level: 'medium' });
    worker.onmessage = (event: MessageEvent<AiWorkerResponse>) => {
      worker.terminate();
      hintWorkerRef.current = null;
      if (event.data.from && event.data.to) {
        boardRef.current?.showHint(event.data.from, event.data.to);
        showToast(copy.game.hintReady);
        window.setTimeout(() => boardRef.current?.clearHint(), 2800);
      } else {
        showToast(copy.game.hintUnavailable);
      }
    };
  };

  const resetCamera = () => boardRef.current?.resetCamera(false);
  const overheadCamera = () => {
    boardRef.current?.resetCamera(true);
    setSettingsOpen(false);
  };

  const handleRestart = () => setPrompt({ type: 'restart' });
  const handleResign = () => {
    if (!isSpectator) setPrompt({ type: 'resign' });
  };

  const handleDraw = () => {
    if (!isSpectator && mode === 'online' && onlineRoom && myToken) {
      getSocket().emit('request_draw', { roomId: onlineRoom.id, token: myToken });
      showToast(copy.game.drawSent);
    }
  };

  const copyRoom = async (roomId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    const text = url.toString();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement('textarea');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    showToast(copy.setup.shareCopied);
  };

  const sendChat = (text: string) => {
    if (mode === 'online' && onlineRoom && myToken) {
      getSocket().emit('send_chat', { roomId: onlineRoom.id, text, token: myToken });
    }
  };

  const replayGame = () => {
    setResultOpen(false);
    if (mode === 'puzzle' && puzzle) startPuzzle(puzzle);
    else if (mode === 'ai') startAiGame(playerColor, difficulty, playerName);
    else if (mode === 'local') startLocalGame();
    else if (mode === 'online' && onlineRoom && myToken) {
      getSocket().emit('request_rematch', { roomId: onlineRoom.id, token: myToken });
      showToast(copy.prompts.waiting);
    }
  };

  const retryPuzzle = () => {
    setResultOpen(false);
    if (puzzle) startPuzzle(puzzle);
  };

  const nextPuzzle = () => {
    if (!puzzle) return;
    const index = endgames.findIndex((game) => game.id === puzzle.id);
    const next = endgames[index + 1];
    if (next) startPuzzle(next);
  };

  const clearProgress = () => {
    setPuzzleProgressIds([]);
    localStorage.removeItem('jiangjie-puzzle-progress');
    showToast(copy.settings.cleared);
  };

  const checkedId = useMemo(() => {
    if (snapshot.status !== 'playing' || !isInCheck(snapshot.board, snapshot.turn)) return null;
    const general = findGeneral(snapshot.board, snapshot.turn);
    return general ? snapshot.board[general[1]][general[0]]?.id ?? null : null;
  }, [snapshot]);

  const promptText = prompt
    ? prompt.type === 'leave'
      ? { title: copy.prompts.leaveTitle, description: copy.prompts.leaveDesc, confirm: copy.prompts.leave, cancel: copy.prompts.stay, destructive: true }
      : prompt.type === 'resign'
        ? { title: copy.prompts.resignTitle, description: copy.prompts.resignDesc, confirm: copy.prompts.request, cancel: copy.prompts.stay, destructive: true }
        : prompt.type === 'undo'
          ? { title: copy.prompts.undoTitle, description: copy.prompts.undoDesc, confirm: copy.prompts.request, cancel: copy.prompts.stay, destructive: false }
          : prompt.type === 'restart'
            ? { title: copy.prompts.restartTitle, description: copy.prompts.restartDesc, confirm: copy.prompts.restart, cancel: copy.prompts.stay, destructive: false }
            : prompt.type === 'incoming-draw'
              ? { title: copy.prompts.incomingDrawTitle, description: copy.prompts.incomingDrawDesc, confirm: copy.prompts.accept, cancel: copy.prompts.decline, destructive: false }
              : { title: copy.prompts.incomingUndoTitle, description: copy.prompts.incomingUndoDesc, confirm: copy.prompts.accept, cancel: copy.prompts.decline, destructive: false }
    : null;

  return (
    <div className={`app-shell screen-${screen}`}>
      {screen === 'home' ? (
        <HomeScreen
          board={homeBoard}
          skin={skin}
          soundOn={soundOn}
          onMode={(nextMode) => setSetupKind(nextMode)}
          onToggleSound={() => setSoundOn((value) => !value)}
          onSettings={() => setSettingsOpen(true)}
          onDaily={() => setSetupKind('puzzle')}
        />
      ) : (
        <>
          <div className="game-canvas-wrap">
            <ChessBoard
              key={sceneKey}
              ref={boardRef}
              board={snapshot.board}
              selectedId={selectedId}
              legalMoves={legalMoves}
              checkedId={checkedId}
              lastMove={snapshot.lastMove ? { from: snapshot.lastMove.from, to: snapshot.lastMove.to } : null}
              visualMove={visualMove}
              skin={skin}
              intensity={intensity}
              flipped={flipped}
              victoryToken={victoryToken}
              victoryColor={victoryColor}
              onSquareClick={handleSquareClick}
              onAnimationComplete={onAnimationComplete}
            />
            <div className="game-vignette" />
            <div className="game-grain" />
          </div>
          <GameInterface
            snapshot={snapshot}
            mode={mode}
            playerColor={playerColor}
            playerName={playerName}
            isSpectator={isSpectator}
            localPlayerColor={localPlayerColor}
            difficulty={difficulty}
            engineInfo={engineInfo}
            aiThinking={aiThinking}
            isAnimating={isAnimating}
            soundOn={soundOn}
            intensity={intensity}
            onlineRoom={onlineRoom}
            connected={connected}
            messages={messages}
            puzzle={puzzle}
            flipped={flipped}
            panelOpen={panelOpen}
            onPanelOpenChange={setPanelOpen}
            onBack={handleBack}
            onUndo={requestUndo}
            onResign={handleResign}
            onDraw={handleDraw}
            onHint={requestHint}
            onSettings={() => setSettingsOpen(true)}
            onToggleSound={() => setSoundOn((value) => !value)}
            onResetCamera={resetCamera}
            onFlip={() => setFlipped((value) => !value)}
            onRestart={handleRestart}
            onCopyRoom={copyRoom}
            onSendChat={sendChat}
            onRematch={replayGame}
            onReplayCheckmate={handleReplayCheckmate}
            onOpenResult={() => setResultOpen(true)}
          />
        </>
      )}

      {setupKind && (
        <SetupPanel
          kind={setupKind}
          initialRoomCode={initialRoomCode}
          puzzleProgress={puzzleProgressIds}
          onClose={() => setSetupKind(null)}
          onStartAi={startAiGame}
          onCreateOnline={handleStartOnline}
          onJoinOnline={handleJoinOnline}
          onStartLocal={startLocalGame}
          onStartPuzzle={startPuzzle}
        />
      )}

      <SettingsDialog
        open={settingsOpen}
        intensity={intensity}
        skin={skin}
        soundOn={soundOn}
        prefersReduced={prefersReduced}
        onIntensity={setIntensity}
        onSkin={setSkin}
        onSound={setSoundOn}
        onResetView={() => boardRef.current?.resetCamera(false)}
        onOverhead={overheadCamera}
        onClearProgress={clearProgress}
        onClose={() => setSettingsOpen(false)}
      />

      {promptText && (
        <PromptDialog
          open
          title={promptText.title}
          description={promptText.description}
          confirmLabel={promptText.confirm}
          cancelLabel={promptText.cancel}
          destructive={promptText.destructive}
          incoming={prompt?.type.startsWith('incoming')}
          onConfirm={confirmPrompt}
          onCancel={cancelPrompt}
        />
      )}

      <ResultOverlay
        open={resultOpen}
        result={snapshot.result ?? null}
        mode={mode}
        playerColor={playerColor}
        isSpectator={isSpectator}
        moveCount={snapshot.history.length}
        puzzle={puzzle}
        puzzleFailed={puzzleFailed}
        hasNextPuzzle={Boolean(puzzle && endgames.findIndex((game) => game.id === puzzle.id) < endgames.length - 1)}
        hasCheckmateReplay={snapshot.history.length > 0}
        onReplayCheckmate={handleReplayCheckmate}
        onClose={() => setResultOpen(false)}
        onReplay={replayGame}
        onHome={returnHome}
        onNextPuzzle={nextPuzzle}
        onRetryPuzzle={retryPuzzle}
      />

      <Toast message={toast} />
    </div>
  );
}
