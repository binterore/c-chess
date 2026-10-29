import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AiLevel,
  BoardSkin,
  BoardState,
  ChatMessage,
  EffectIntensity,
  EngineInfo,
  GameAnalysisReport,
  GameMode,
  GameRecord,
  GameSnapshot,
  LobbyRoom,
  Move,
  MoveAnalysis,
  PlayerProfile,
  QualityLevel,
  RenderMode,
  TimeControl,
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
  endByTimeout,
  replayMoves
} from './engine/game';
import {
  createInitialBoard,
  findGeneral,
  getLegalMoves,
  isInCheck,
  positionKey,
  toChineseNotation
} from './engine/rules';
import { endgames, getEndgameBoard, getPuzzleLine, type Endgame } from './engine/endgames';
import { HomeScreen } from './components/HomeScreen';
import { SetupPanel, type OnlineSetup, type SetupKind } from './components/SetupPanel';
import { ChessBoard, type ChessBoardHandle } from './components/ChessBoard';
import { GameInterface } from './components/GameInterface';
import { HandoffDialog, PromptDialog, ResultOverlay, SettingsDialog, Toast } from './components/Overlays';
import { ArchivePanel } from './components/ArchivePanel';
import { BoardEditor } from './components/BoardEditor';
import { RulesGuide } from './components/RulesGuide';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ReplayBar } from './components/ReplayBar';
import { PuzzleReviewPanel } from './components/PuzzleReviewPanel';
import { GameAnalysisPanel } from './components/GameAnalysisPanel';
import { CollectionPanel } from './components/CollectionPanel';
import { soundManager } from './audio/soundManager';
import { clearOnlineSession, getPlayerName, getPlayerToken, getSocket, loadOnlineSession, saveOnlineSession } from './services/socket';
import { calculateDailyStreak, getDailyEndgame, localDateKey } from './engine/daily';
import { recordToIccs } from './engine/notation';
import {
  clearGameRecords,
  completeDaily,
  deleteGameRecord,
  loadDailyDates,
  loadGameRecords,
  mergeGameRecords,
  loadProfile,
  persistProfile,
  saveGameRecord,
  updateProfileName
} from './services/storage';
import AiWorker from './workers/aiWorker?worker&inline';
import GameAnalysisWorker from './workers/gameAnalysisWorker?worker&inline';
import { copy } from './i18n';
import { PIECE_GLYPHS } from './i18n/chess';

const ShareRoomDialog = lazy(() => import('./components/ShareRoomDialog').then((module) => ({ default: module.ShareRoomDialog })));

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

interface GameMeta {
  id: string;
  mode: GameMode;
  initialBoard: BoardState;
  initialTurn: PieceColor;
  createdAt: number;
  redName: string;
  blackName: string;
  playerColor?: PieceColor;
  timeControl?: TimeControl;
  puzzleId?: string;
  dailyDate?: string;
  roomId?: string;
}

function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function makeGameId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `game-${Date.now()}`;
}

function recordFromSnapshot(snapshot: GameSnapshot, meta: GameMeta): GameRecord {
  return {
    id: meta.id,
    mode: meta.mode,
    createdAt: meta.createdAt,
    updatedAt: Date.now(),
    redName: meta.redName,
    blackName: meta.blackName,
    playerColor: meta.playerColor,
    initialBoard: cloneBoard(meta.initialBoard),
    initialTurn: meta.initialTurn,
    history: snapshot.history,
    result: snapshot.result,
    timeControl: meta.timeControl,
    puzzleId: meta.puzzleId,
    dailyDate: meta.dailyDate
  };
}

function applyRecordToProfile(profile: PlayerProfile, record: GameRecord): PlayerProfile {
  if (!record.result || !record.playerColor) return profile;
  const draw = record.result.winner === 'draw';
  const won = !draw && record.result.winner === record.playerColor;
  return {
    ...profile,
    gamesPlayed: profile.gamesPlayed + 1,
    wins: profile.wins + (won ? 1 : 0),
    losses: profile.losses + (!draw && !won ? 1 : 0),
    draws: profile.draws + (draw ? 1 : 0),
    totalMoves: profile.totalMoves + record.history.length,
    puzzlesSolved: profile.puzzlesSolved + (record.mode === 'puzzle' && won ? 1 : 0)
  };
}

function rebuildRecordStats(profile: PlayerProfile, records: GameRecord[]): PlayerProfile {
  const base = { ...profile, gamesPlayed: 0, wins: 0, losses: 0, draws: 0, totalMoves: 0 };
  return records.reduce((current, record) => applyRecordToProfile(current, record), base);
}

const PIECE_RULE_TEXT: Record<string, string> = {
  general: '九宫内一步；双方将帅不可无子照面',
  advisor: '九宫内斜走一步',
  elephant: '走田字，不可塞象眼或过河',
  horse: '走日字，马腿有子时不能走',
  chariot: '横直任意步，不能越子',
  cannon: '移动如车，吃子时恰好隔一子',
  soldier: '向前一步，过河后可横行，不可后退'
};

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
  return item === 'classic' || item === 'jade' || item === 'bronze' ? item : 'figurine';
}

function storedQuality(): QualityLevel {
  const value = localStorage.getItem('jiangjie-quality');
  return value === 'high' || value === 'low' ? value : 'balanced';
}

function storedRenderMode(): RenderMode {
  const value = localStorage.getItem('jiangjie-render-mode');
  return value === '3d' || value === '2d' ? value : 'auto';
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
  const [puzzleReviewOpen, setPuzzleReviewOpen] = useState(false);
  const [puzzleDailyDate, setPuzzleDailyDate] = useState<string | undefined>();
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
  const [lobbyRooms, setLobbyRooms] = useState<LobbyRoom[]>([]);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [friends, setFriends] = useState<PlayerProfile[]>([]);
  const [records, setRecords] = useState<GameRecord[]>(loadGameRecords);
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile(getPlayerToken(), getPlayerName() || copy.setup.namePlaceholder));
  const [dailyDates, setDailyDates] = useState<string[]>(loadDailyDates);
  const [todayKey, setTodayKey] = useState(() => localDateKey());
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [replayRecord, setReplayRecord] = useState<GameRecord | null>(null);
  const [replayIndex, setReplayIndex] = useState(0);
  const [analysis, setAnalysis] = useState<MoveAnalysis | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [shareRoomOpen, setShareRoomOpen] = useState(false);
  const [gameAnalysis, setGameAnalysis] = useState<GameAnalysisReport | null>(null);
  const [gameAnalysisOpen, setGameAnalysisOpen] = useState(false);
  const [gameAnalysisProgress, setGameAnalysisProgress] = useState(0);
  const [gameAnalyzing, setGameAnalyzing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [quality, setQuality] = useState<QualityLevel>(storedQuality);
  const [renderMode, setRenderMode] = useState<RenderMode>(storedRenderMode);
  const [localClocks, setLocalClocks] = useState<Record<PieceColor, number> | null>(null);
  const [localTimeControl, setLocalTimeControl] = useState<TimeControl>({ initial: 0, increment: 0 });
  const [handoffColor, setHandoffColor] = useState<PieceColor | null>(null);

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
  const analysisWorkerRef = useRef<Worker | null>(null);
  const gameAnalysisWorkerRef = useRef<Worker | null>(null);
  const pendingOnlineMove = useRef<{ from: Position; to: Position; before: GameSnapshot; visualId: number } | null>(null);
  const resultHandledRef = useRef('');
  const puzzleFailHandledRef = useRef('');
  const toastTimerRef = useRef<number | null>(null);
  const boardRef = useRef<ChessBoardHandle | null>(null);
  const gameMetaRef = useRef<GameMeta | null>(null);
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const handoffRef = useRef<PieceColor | null>(handoffColor);
  handoffRef.current = handoffColor;
  const localClocksRef = useRef<Record<PieceColor, number> | null>(localClocks);
  localClocksRef.current = localClocks;
  const homeBoard = useMemo(() => createInitialBoard(), []);
  const dailyPuzzle = useMemo(() => getDailyEndgame(todayKey), [todayKey]);
  const dailyStreak = useMemo(() => calculateDailyStreak(dailyDates, todayKey), [dailyDates, todayKey]);
  const dailySolved = dailyDates.includes(todayKey);

  const replaceSnapshot = useCallback((next: GameSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
    setAnalysis(null);
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
    analysisWorkerRef.current?.terminate();
    analysisWorkerRef.current = null;
    gameAnalysisWorkerRef.current?.terminate();
    gameAnalysisWorkerRef.current = null;
    setAnalyzing(false);
    setGameAnalyzing(false);
    setGameAnalysisProgress(0);
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
    setPuzzleReviewOpen(false);
    setHandoffColor(null);
    setAnalysis(null);
    setAnalysisOpen(false);
    setGameAnalysis(null);
    setGameAnalysisOpen(false);
    setGameAnalysisProgress(0);
    setReplayRecord(null);
    setReplayIndex(0);
    setShareRoomOpen(false);
    clearSelection();
    boardRef.current?.setCinematicEnding(false);
    boardRef.current?.clearHint();
    setSceneKey((key) => key + 1);
  }, [clearSelection]);

  const commitRecord = useCallback((record: GameRecord) => {
    const previous = recordsRef.current.find((item) => item.id === record.id);
    const next = saveGameRecord(record);
    recordsRef.current = next;
    setRecords(next);
    if (!previous?.result && record.result && record.playerColor) {
      setProfile((current) => {
        const updated = applyRecordToProfile(current, record);
        persistProfile(updated);
        return updated;
      });
    }
    const socket = getSocket();
    if (record.mode !== 'online' && socket.connected && record.history.length > 0) {
      socket.emit('save_history', { token: getPlayerToken(), record, name: record.playerColor === 'black' ? record.blackName : record.redName });
    }
  }, []);

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
      if (modeRef.current === 'local' && localClocksRef.current && localTimeControl.increment > 0) {
        const mover = current.turn;
        setLocalClocks((clocks) => clocks ? { ...clocks, [mover]: clocks[mover] + localTimeControl.increment } : clocks);
      }
      replaceSnapshot(result.snapshot);
      clearSelection();
      startVisual(result.move);
      soundManager.move(result.move);
      return result;
    } catch {
      showToast(copy.game.hintUnavailable);
      return null;
    }
  }, [clearSelection, localTimeControl.increment, replaceSnapshot, showToast, startVisual]);

  const startAiGame = useCallback((color: PieceColor, level: AiLevel, name?: string) => {
    const next = createGameSnapshot();
    resetVisualState();
    const displayName = name || playerName;
    if (name) {
      setPlayerName(name);
      setProfile((current) => {
        const updated = updateProfileName(current, name);
        profileRef.current = updated;
        return updated;
      });
    }
    gameMetaRef.current = {
      id: makeGameId(), mode: 'ai', initialBoard: cloneBoard(next.board), initialTurn: next.turn,
      createdAt: Date.now(), redName: color === 'red' ? displayName : `AI ${copy.setup[level]}`,
      blackName: color === 'black' ? displayName : `AI ${copy.setup[level]}`, playerColor: color
    };
    setLocalClocks(null);
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
  }, [playerName, replaceSnapshot, resetVisualState]);

  const startLocalGame = useCallback((timeLimit: number, increment: number) => {
    resetVisualState();
    const next = createGameSnapshot();
    const control: TimeControl = { initial: timeLimit, increment };
    setLocalTimeControl(control);
    setLocalClocks(timeLimit > 0 ? { red: timeLimit, black: timeLimit } : null);
    gameMetaRef.current = {
      id: makeGameId(), mode: 'local', initialBoard: cloneBoard(next.board), initialTurn: next.turn,
      createdAt: Date.now(), redName: '红方', blackName: '黑方', timeControl: control
    };
    setAnalysis(null);
    setReplayRecord(null);
    setIsSpectator(false);
    setMode('local');
    setPlayerColor('red');
    setLocalPlayerColor(null);
    setPuzzle(null);
    setPuzzleFailed(false);
    setOnlineRoom(null);
    setMyToken(null);
    setMessages([]);
    replaceSnapshot(next);
    setFlipped(false);
    resultHandledRef.current = '';
    puzzleFailHandledRef.current = '';
    setSetupKind(null);
    setScreen('game');
    setPanelOpen(window.innerWidth > 920);
  }, [replaceSnapshot, resetVisualState]);

  const startPuzzle = useCallback((game: Endgame, dailyDate?: string) => {
    resetVisualState();
    setPuzzleDailyDate(dailyDate);
    const board = getEndgameBoard(game);
    const next = createGameSnapshot(board);
    gameMetaRef.current = {
      id: makeGameId(), mode: 'puzzle', initialBoard: cloneBoard(board), initialTurn: next.turn,
      createdAt: Date.now(), redName: game.playerColor === 'red' ? playerName : '残局',
      blackName: game.playerColor === 'black' ? playerName : '残局', playerColor: game.playerColor,
      puzzleId: game.id, dailyDate
    };
    setLocalClocks(null);
    setAnalysis(null);
    setReplayRecord(null);
    setIsSpectator(false);
    setMode('puzzle');
    setPuzzle(game);
    setPlayerColor(game.playerColor);
    setLocalPlayerColor(null);
    setPuzzleFailed(false);
    setOnlineRoom(null);
    setMyToken(null);
    setMessages([]);
    replaceSnapshot(next);
    setFlipped(game.playerColor === 'black');
    resultHandledRef.current = '';
    puzzleFailHandledRef.current = '';
    setSetupKind(null);
    setScreen('game');
    setPanelOpen(window.innerWidth > 920);
  }, [playerName, replaceSnapshot, resetVisualState]);

  const startCustomGame = useCallback((board: BoardState, turn: PieceColor) => {
    resetVisualState();
    const next = createGameSnapshot(cloneBoard(board));
    next.turn = turn;
    next.positionCounts = { [positionKey(board, turn)]: 1 };
    gameMetaRef.current = {
      id: makeGameId(), mode: 'ai', initialBoard: cloneBoard(board), initialTurn: turn,
      createdAt: Date.now(), redName: turn === 'red' ? playerName : 'AI', blackName: turn === 'black' ? playerName : 'AI',
      playerColor: turn
    };
    setMode('ai');
    setDifficulty('medium');
    setPlayerColor(turn);
    setLocalPlayerColor(null);
    setPuzzle(null);
    setOnlineRoom(null);
    setMyToken(null);
    setEditorOpen(false);
    setSetupKind(null);
    setFlipped(turn === 'black');
    replaceSnapshot(next);
    setScreen('game');
  }, [playerName, replaceSnapshot, resetVisualState]);

  const openReplay = useCallback((record: GameRecord, index = record.history.length) => {
    if (modeRef.current === 'online' && snapshotRef.current.status === 'playing') {
      showToast('请先完成或离开当前联机对局，再打开其他棋谱');
      return;
    }
    if (modeRef.current === 'online' && onlineRoom && myToken) {
      getSocket().emit('leave_room', { roomId: onlineRoom.id, token: myToken });
    }
    resetVisualState();
    setReplayRecord(record);
    setReplayIndex(index);
    const reconstructed = replayMoves(record.initialBoard, record.history.slice(0, index), record.initialTurn);
    const snapshotAtIndex = index === record.history.length && record.result
      ? { ...reconstructed, status: 'ended' as const, result: record.result }
      : reconstructed;
    setMode('replay');
    setPuzzle(null);
    setOnlineRoom(null);
    setMyToken(null);
    setPlayerColor(record.playerColor ?? record.initialTurn);
    setFlipped(record.playerColor === 'black' || (!record.playerColor && record.initialTurn === 'black'));
    replaceSnapshot(snapshotAtIndex);
    gameMetaRef.current = null;
    setArchiveOpen(false);
    setScreen('game');
    setPanelOpen(window.innerWidth > 920);
  }, [myToken, onlineRoom, replaceSnapshot, resetVisualState, showToast]);

  const seekReplay = useCallback((index: number) => {
    if (!replayRecord) return;
    const safeIndex = Math.max(0, Math.min(replayRecord.history.length, index));
    const reconstructed = replayMoves(replayRecord.initialBoard, replayRecord.history.slice(0, safeIndex), replayRecord.initialTurn);
    const snapshotAtIndex = safeIndex === replayRecord.history.length && replayRecord.result
      ? { ...reconstructed, status: 'ended' as const, result: replayRecord.result }
      : reconstructed;
    setReplayIndex(safeIndex);
    replaceSnapshot(snapshotAtIndex);
    clearSelection();
  }, [clearSelection, replaceSnapshot, replayRecord]);

  const exportRecord = useCallback((record: GameRecord) => {
    const text = recordToIccs(record);
    const blob = new Blob([text], { type: 'application/x-xiangqi;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `jiangjie-${record.createdAt}-${record.redName}-vs-${record.blackName}.xq`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast('棋谱已导出');
  }, [showToast]);

  const shareRecord = useCallback(async (record: GameRecord) => {
    const text = recordToIccs(record);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${record.redName} 对 ${record.blackName} · 将·界棋谱`, text });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('棋谱已复制，可粘贴分享');
    } catch {
      showToast('分享失败，请使用导出功能');
    }
  }, [showToast]);

  const importRecord = useCallback((record: GameRecord) => {
    commitRecord(record);
    showToast(`已导入 ${record.history.length} 着棋谱`);
    openReplay(record);
  }, [commitRecord, openReplay, showToast]);

  const addFriend = useCallback((friendToken: string) => {
    getSocket().timeout(5000).emit('add_friend', { token: getPlayerToken(), friendToken }, (error: Error | null, response: OnlineActionResult) => {
      if (!error && response?.success) {
        setFriends(response.friends ?? []);
        showToast('好友已添加，双方会自动同步');
      } else {
        showToast('未找到该棋手，请检查同步码');
      }
    });
  }, [showToast]);

  const removeFriend = useCallback((friendToken: string) => {
    getSocket().emit('remove_friend', { token: getPlayerToken(), friendToken }, (response: OnlineActionResult) => {
      if (response?.success) setFriends(response.friends ?? []);
    });
  }, []);

  const removeRecord = useCallback((id: string) => {
    getSocket().emit('delete_history', { token: getPlayerToken(), recordId: id });
    const next = deleteGameRecord(id);
    recordsRef.current = next;
    setRecords(next);
    setProfile((current) => {
      const updated = rebuildRecordStats(current, next);
      persistProfile(updated);
      return updated;
    });
    showToast('棋谱已删除');
  }, [showToast]);

  const clearArchive = useCallback(() => {
    getSocket().emit('clear_history', { token: getPlayerToken() });
    clearGameRecords();
    recordsRef.current = [];
    setRecords([]);
    setProfile((current) => {
      const updated = rebuildRecordStats(current, []);
      persistProfile(updated);
      return updated;
    });
    showToast('棋谱数据已清空');
  }, [showToast]);

  const saveCurrentGame = useCallback(() => {
    const meta = gameMetaRef.current;
    if (!meta || snapshotRef.current.history.length === 0) {
      showToast('当前还没有可保存的着法');
      return;
    }
    commitRecord(recordFromSnapshot(snapshotRef.current, meta));
    showToast('当前对局已保存到棋谱库');
  }, [commitRecord, showToast]);

  const analyzeCurrentPosition = useCallback(() => {
    analysisWorkerRef.current?.terminate();
    const current = snapshotRef.current;
    const worker = new AiWorker();
    analysisWorkerRef.current = worker;
    setAnalyzing(true);
    worker.postMessage({ id: Date.now(), board: current.board, turn: current.turn, level: 'hard' });
    worker.onmessage = (event: MessageEvent<AiWorkerResponse>) => {
      worker.terminate();
      analysisWorkerRef.current = null;
      setAnalyzing(false);
      const response = event.data;
      if (!response.from || !response.to) {
        showToast('当前局面没有可分析的合法着法');
        return;
      }
      const notation = toChineseNotation(current.board, response.from, response.to);
      const piece = current.board[response.from[1]]?.[response.from[0]];
      const target = current.board[response.to[1]]?.[response.to[0]];
      const score = response.evaluation ?? 0;
      const explanation = target
        ? `推荐 ${piece?.type === 'soldier' ? '兵卒' : '该子'} 吃子：${notation}，直接改善子力对比。`
        : score > 250
          ? `推荐 ${notation}，搜索认为当前一方已占据明显主动。`
          : score < -250
            ? `推荐 ${notation}，当前局面压力较大，应优先稳住将帅与关键棋子。`
            : `推荐 ${notation}，兼顾出子、线路控制和后续攻防。`;
      setAnalysis({
        summary: notation,
        bestMove: { from: response.from, to: response.to, notation },
        score,
        depth: response.depth ?? 0,
        nodes: response.nodes ?? 0,
        elapsed: response.elapsed ?? 0,
        explanation
      });
      setAnalysisOpen(true);
    };
    worker.onerror = () => {
      worker.terminate();
      analysisWorkerRef.current = null;
      setAnalyzing(false);
      showToast('局面分析失败');
    };
  }, [showToast]);

  const analyzeReplayGame = useCallback(() => {
    if (!replayRecord) return;
    gameAnalysisWorkerRef.current?.terminate();
    const worker = new GameAnalysisWorker();
    gameAnalysisWorkerRef.current = worker;
    setGameAnalysis(null);
    setGameAnalysisProgress(0);
    setGameAnalyzing(true);
    setGameAnalysisOpen(true);
    let current = replayMoves(replayRecord.initialBoard, [], replayRecord.initialTurn);
    const jobs = replayRecord.history.map((move) => {
      const job = { board: current.board, turn: current.turn, from: move.from, to: move.to, notation: move.notation };
      current = applyMoveToSnapshot(current, move.from, move.to).snapshot;
      return job;
    });
    worker.postMessage({ id: Date.now(), jobs });
    worker.onmessage = (event: MessageEvent<{ type: string; value?: number; report?: GameAnalysisReport; error?: string }>) => {
      if (event.data.type === 'progress') setGameAnalysisProgress(event.data.value ?? 0);
      if (event.data.type === 'complete' && event.data.report) {
        setGameAnalysis(event.data.report);
        setGameAnalyzing(false);
        setGameAnalysisProgress(1);
        worker.terminate();
        gameAnalysisWorkerRef.current = null;
      }
      if (event.data.type === 'error') {
        setGameAnalyzing(false);
        showToast('全盘分析失败');
        worker.terminate();
        gameAnalysisWorkerRef.current = null;
      }
    };
    worker.onerror = () => {
      setGameAnalyzing(false);
      gameAnalysisWorkerRef.current = null;
      showToast('全盘分析失败');
      worker.terminate();
    };
  }, [replayRecord, showToast]);

  const startDaily = useCallback(() => {
    startPuzzle(dailyPuzzle, todayKey);
  }, [dailyPuzzle, startPuzzle, todayKey]);

  const returnHome = useCallback(() => {
    resetVisualState();
    clearOnlineSession();
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
    setLocalClocks(null);
    setHandoffColor(null);
    setReplayRecord(null);
    setAnalysis(null);
    gameMetaRef.current = null;
    replaceSnapshot(createGameSnapshot());
    setFlipped(false);
  }, [myToken, onlineRoom, replaceSnapshot, resetVisualState]);

  const failPuzzle = useCallback(() => {
    const current = snapshotRef.current;
    const key = `${puzzle?.id ?? 'puzzle'}-${current.history.length}`;
    if (puzzleFailHandledRef.current === key) return;
    puzzleFailHandledRef.current = key;
    setPuzzleFailed(true);
    setVictoryColor('black');
    setVictoryToken((token) => token + 1);
    window.setTimeout(() => setResultOpen(true), 450);
    soundManager.defeat();
  }, [puzzle]);

  const handleSquareClick = useCallback((position: Position) => {
    const current = snapshotRef.current;
    if (current.status !== 'playing' || isAnimatingRef.current || aiThinkingRef.current) return;
    if (modeRef.current === 'replay' || modeRef.current === 'analysis') return;
    if (modeRef.current === 'local' && handoffRef.current) return;
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
      if (modeRef.current === 'puzzle' && puzzle) {
        const expected = getPuzzleLine(puzzle)[current.history.length];
        if (!expected || expected.from[0] !== selectedPosition[0] || expected.from[1] !== selectedPosition[1] || expected.to[0] !== x || expected.to[1] !== y) {
          failPuzzle();
          return;
        }
      }
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
  }, [applyLocalMove, clearSelection, failPuzzle, puzzle, replaceSnapshot, showToast, startVisual]);

  const onAnimationComplete = useCallback((id: number) => {
    if (visualRef.current?.id !== id) return;
    visualRef.current = null;
    setVisualMove(null);
    setIsAnimating(false);
    if (modeRef.current === 'local' && snapshotRef.current.status === 'playing') {
      const nextTurn = snapshotRef.current.turn;
      setFlipped(nextTurn === 'black');
      setHandoffColor(nextTurn);
    }
  }, []);

  const enterOnlineRoom = useCallback((response: OnlineActionResult, fallbackToken: string, fallbackName: string) => {
    if (!response.success || !response.room) return;
    const socket = getSocket();
    const room = response.room;
    const seat = response.role === 'player' ? room.players.find((player) => player.socketId === socket.id) : undefined;
    const color = seat?.color ?? room.hostColor;
    const redName = room.players.find((player) => player.color === 'red')?.name ?? '红方';
    const blackName = room.players.find((player) => player.color === 'black')?.name ?? '黑方';
    const token = response.token ?? fallbackToken;
    resetVisualState();
    setMode('online');
    setIsSpectator(response.role === 'spectator');
    setPlayerColor(color);
    setPlayerName(fallbackName);
    setProfile((current) => {
      const updated = updateProfileName(current, fallbackName);
      profileRef.current = updated;
      return updated;
    });
    setLocalPlayerColor(null);
    setMyToken(token);
    setOnlineRoom(room);
    roomRef.current = room;
    setMessages([]);
    replaceSnapshot(room.game);
    setFlipped(seat?.color === 'black');
    setPuzzle(null);
    setPuzzleFailed(false);
    setSetupKind(null);
    setScreen('game');
    setPanelOpen(window.innerWidth > 920);
    setResultOpen(false);
    resultHandledRef.current = '';
    setLocalClocks(null);
    gameMetaRef.current = {
      id: `online-${room.gameId}`, mode: 'online', initialBoard: createInitialBoard(), initialTurn: 'red',
      createdAt: room.gameStartedAt ?? room.createdAt, redName, blackName, playerColor: seat?.color,
      timeControl: { initial: room.timeLimit, increment: room.increment }, roomId: room.id
    };
    saveOnlineSession({ roomId: room.id, token, role: response.role ?? 'spectator', playerName: fallbackName });
    const url = new URL(window.location.href);
    url.searchParams.set('room', room.id);
    window.history.replaceState({}, '', url);
  }, [replaceSnapshot, resetVisualState]);

  const handleStartOnline = useCallback((options: OnlineSetup) => {
    const socket = getSocket();
    const token = getPlayerToken();
    socket.timeout(6000).emit('create_room', {
      name: options.name,
      color: options.color === 'random' ? (Math.random() > 0.5 ? 'red' : 'black') : options.color,
      timeLimit: options.timeLimit,
      increment: options.increment,
      visibility: options.visibility ?? 'public',
      password: options.password,
      token
    }, (error: Error | null, response: OnlineActionResult) => {
      if (error || !response?.success || !response.room) {
        showToast(copy.online.createFailed);
        return;
      }
      enterOnlineRoom(response, token, options.name);
    });
  }, [enterOnlineRoom, showToast]);

  const handleJoinOnline = useCallback((roomId: string, name: string, password?: string) => {
    const socket = getSocket();
    const token = getPlayerToken();
    socket.timeout(6000).emit('join_room', { roomId: roomId.toUpperCase(), name, token, password }, (error: Error | null, response: OnlineActionResult) => {
      if (error || !response?.success || !response.room) {
        showToast(response?.error === 'ROOM_NOT_FOUND' ? copy.online.roomNotFound : copy.online.joinFailed);
        return;
      }
      enterOnlineRoom(response, token, name);
    });
  }, [enterOnlineRoom, showToast]);

  const handleQuickMatch = useCallback((options: OnlineSetup) => {
    const socket = getSocket();
    const token = getPlayerToken();
    socket.timeout(8000).emit('quick_match', {
      name: options.name,
      color: options.color === 'random' ? (Math.random() > 0.5 ? 'red' : 'black') : options.color,
      timeLimit: options.timeLimit,
      increment: options.increment,
      token
    }, (error: Error | null, response: OnlineActionResult) => {
      if (error || !response?.success || !response.room) {
        showToast('匹配失败，请稍后重试');
        return;
      }
      enterOnlineRoom(response, token, options.name);
      showToast(response.room.status === 'playing' ? '匹配成功，棋局开始' : '已创建公开房，等待对手');
    });
  }, [enterOnlineRoom, showToast]);

  const refreshLobby = useCallback(() => {
    const socket = getSocket();
    setLobbyLoading(true);
    socket.timeout(5000).emit('list_rooms', (error: Error | null, response: OnlineActionResult) => {
      setLobbyLoading(false);
      if (!error && response?.success) setLobbyRooms(response.rooms ?? []);
    });
  }, []);

  useEffect(() => {
    const applyRoom = (room: PublicOnlineRoom) => {
      roomRef.current = room;
      setOnlineRoom(room);
      const socket = getSocket();
      const me = room.players.find((player) => player.socketId === socket.id);
      if (modeRef.current === 'online' || screen === 'game') setIsSpectator(!me);
      if (me) {
        playerColorRef.current = me.color;
        setPlayerColor(me.color);
      }
      if (!isAnimatingRef.current || room.game.history.length > snapshotRef.current.history.length) {
        replaceSnapshot(room.game);
        setFlipped(me?.color === 'black');
      }
      if (gameMetaRef.current?.roomId === room.id) {
        gameMetaRef.current = {
          ...gameMetaRef.current,
          id: `online-${room.gameId}`,
          createdAt: room.gameStartedAt ?? room.createdAt,
          redName: room.players.find((player) => player.color === 'red')?.name ?? '红方',
          blackName: room.players.find((player) => player.color === 'black')?.name ?? '黑方',
          playerColor: me?.color,
          timeControl: { initial: room.timeLimit, increment: room.increment }
        };
      }
      if (modeRef.current === 'online') saveOnlineSession({
        roomId: room.id,
        token: tokenRef.current ?? getPlayerToken(),
        role: me ? 'player' : 'spectator',
        playerName: me?.name ?? playerName
      });
    };

    const socket = getSocket();
    const syncHistory = () => {
      socket.emit('sync_history', { token: getPlayerToken(), name: playerName }, (response: OnlineActionResult) => {
        if (!response?.success) return;
        const serverRecords = response.records ?? [];
        const serverIds = new Set(serverRecords.map((record) => record.id));
        for (const record of loadGameRecords()) {
          if (!serverIds.has(record.id) && record.mode !== 'online') {
            socket.emit('save_history', { token: getPlayerToken(), record });
          }
        }
        const merged = mergeGameRecords(serverRecords);
        recordsRef.current = merged;
        setRecords(merged);
        setFriends(response.friends ?? []);
        const serverProfile = response.profile;
        if (serverProfile?.dailyDates) {
          setDailyDates((current) => {
            const dates = [...new Set([...current, ...serverProfile.dailyDates])].sort();
            localStorage.setItem('jiangjie-daily-completions-v1', JSON.stringify(dates));
            return dates;
          });
        }
        setProfile((current) => {
          const dates = [...new Set([...current.dailyDates, ...loadDailyDates(), ...(serverProfile?.dailyDates ?? [])])].sort();
          const rebuilt = rebuildRecordStats({ ...current, name: serverProfile?.name || current.name, dailyDates: dates, puzzlesSolved: Math.max(current.puzzlesSolved, serverProfile?.puzzlesSolved ?? 0) }, merged);
          const updated = { ...rebuilt, puzzlesSolved: Math.max(rebuilt.puzzlesSolved, current.puzzlesSolved, serverProfile?.puzzlesSolved ?? 0) };
          persistProfile(updated);
          return updated;
        });
      });
    };
    setConnected(socket.connected);
    const onConnect = () => {
      setConnected(true);
      const saved = loadOnlineSession();
      const requestedRoom = new URLSearchParams(window.location.search).get('room')?.toUpperCase();
      const session = roomRef.current && tokenRef.current
        ? { roomId: roomRef.current.id, token: tokenRef.current, role: modeRef.current === 'online' ? 'player' as const : 'spectator' as const, playerName, savedAt: Date.now() }
        : saved && (!requestedRoom || requestedRoom === saved.roomId) ? saved : null;
      if (session) {
        socket.emit('sync_room', { roomId: session.roomId, token: session.token }, (response: OnlineActionResult) => {
          if (response?.success && response.room) {
            if (roomRef.current?.id === response.room.id) applyRoom(response.room);
            else enterOnlineRoom(response, session.token, session.playerName);
          } else {
            clearOnlineSession();
          }
        });
      }
      syncHistory();
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
    const onChatBlocked = ({ reason }: { reason: string }) => showToast(reason === 'MUTED' ? '你已被房主禁言' : '发送太快，请稍后再试');
    const onGameOver = () => window.setTimeout(syncHistory, 350);
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
    socket.on('chat_blocked', onChatBlocked);
    socket.on('game_over', onGameOver);
    if (socket.connected) onConnect();
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
      socket.off('chat_blocked', onChatBlocked);
      socket.off('game_over', onGameOver);
    };
  }, [clearSelection, enterOnlineRoom, playerName, replaceSnapshot, screen, showToast, startVisual]);

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
    localStorage.setItem('jiangjie-quality', quality);
    localStorage.setItem('jiangjie-render-mode', renderMode);
  }, [intensity, quality, renderMode, skin]);

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
    if (setupKind === 'online') refreshLobby();
  }, [refreshLobby, setupKind]);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('room');
    if (code) {
      setInitialRoomCode(code.toUpperCase());
      setSetupKind('online');
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('jiangjie-rules-seen') && !new URLSearchParams(window.location.search).has('room')) {
      const timer = window.setTimeout(() => {
        if (!document.querySelector('.modal-layer')) setRulesOpen(true);
      }, 700);
      localStorage.setItem('jiangjie-rules-seen', '1');
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = localDateKey();
      setTodayKey((previous) => previous === current ? previous : current);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (screen !== 'game' || mode !== 'local' || snapshot.status !== 'playing' || isAnimating || handoffColor || !localClocks) return;
    const timer = window.setInterval(() => {
      const clocks = localClocksRef.current;
      const current = snapshotRef.current;
      if (!clocks || current.status !== 'playing') return;
      const active = current.turn;
      const nextValue = Math.max(0, clocks[active] - 1);
      const next = { ...clocks, [active]: nextValue };
      localClocksRef.current = next;
      setLocalClocks(next);
      if (nextValue === 0) replaceSnapshot(endByTimeout(current, active));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [handoffColor, isAnimating, localClocks, mode, replaceSnapshot, screen, snapshot.status, snapshot.turn]);

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
    if (used >= puzzle.targetMoves && snapshot.turn === puzzle.playerColor) failPuzzle();
  }, [failPuzzle, isAnimating, mode, puzzle, screen, snapshot]);

  useEffect(() => {
    if (screen !== 'game' || mode !== 'puzzle' || !puzzle || snapshot.status !== 'playing' || isAnimating || puzzleFailed) return;
    if (snapshot.turn === puzzle.playerColor) return;
    const expected = getPuzzleLine(puzzle)[snapshot.history.length];
    if (!expected) {
      failPuzzle();
      return;
    }
    const timer = window.setTimeout(() => applyLocalMove(expected.from, expected.to), 420);
    return () => window.clearTimeout(timer);
  }, [applyLocalMove, failPuzzle, isAnimating, mode, puzzle, puzzleFailed, screen, snapshot]);

  useEffect(() => {
    if (mode === 'replay' || mode === 'analysis') return;
    if (screen !== 'game' || snapshot.status !== 'ended' || !snapshot.result || isAnimating) return;
    const key = `${gameMetaRef.current?.id ?? 'game'}-${snapshot.history.length}-${snapshot.result.reason}-${snapshot.result.winner}`;
    if (resultHandledRef.current === key) return;
    resultHandledRef.current = key;
    const winner = snapshot.result.winner;
    const meta = gameMetaRef.current;
    if (meta) commitRecord(recordFromSnapshot(snapshot, meta));
    if (meta?.dailyDate && winner === meta.playerColor) {
      const dates = completeDaily(meta.dailyDate);
      setDailyDates(dates);
      setProfile((current) => {
        const updated = { ...current, dailyDates: dates };
        persistProfile(updated);
        return updated;
      });
    }
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
  }, [commitRecord, isAnimating, isSpectator, mode, playerColor, puzzle, screen, snapshot]);

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
      analysisWorkerRef.current?.terminate();
      gameAnalysisWorkerRef.current?.terminate();
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
          if (puzzle) startPuzzle(puzzle, puzzleDailyDate);
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
      if (mode === 'puzzle' && puzzle) startPuzzle(puzzle, puzzleDailyDate);
      else if (mode === 'ai') startAiGame(playerColor, difficulty, playerName);
      else if (mode === 'local') startLocalGame(localTimeControl.initial, localTimeControl.increment);
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
      if (snapshot.turn !== playerColor) {
        showToast('等待对手强制应手');
        return;
      }
      const expected = getPuzzleLine(puzzle)[snapshot.history.length];
      if (expected) {
        boardRef.current?.showHint(expected.from, expected.to);
        showToast(`提示：${snapshot.history.length % 2 === 0 ? '先将军' : '完成绝杀'}`);
        window.setTimeout(() => boardRef.current?.clearHint(), 2800);
      } else {
        showToast('已到解法终点');
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
        const notation = toChineseNotation(snapshot.board, event.data.from, event.data.to);
        boardRef.current?.showHint(event.data.from, event.data.to);
        setAnalysis({
          summary: notation,
          bestMove: { from: event.data.from, to: event.data.to, notation },
          score: event.data.evaluation ?? 0,
          depth: event.data.depth ?? 0,
          nodes: event.data.nodes ?? 0,
          elapsed: event.data.elapsed ?? 0,
          explanation: `推荐 ${notation}。这一步兼顾线路控制、子力安全和后续进攻；点击“分析”可重新计算并查看完整评估。`
        });
        showToast(`提示：${notation}`);
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

  const muteOnlinePlayer = (color: PieceColor, muted: boolean) => {
    if (mode === 'online' && onlineRoom && myToken) {
      getSocket().emit('mute_player', { roomId: onlineRoom.id, token: myToken, color, muted });
      showToast(muted ? '已禁言对方聊天' : '已解除对方禁言');
    }
  };

  const reportChatMessage = (message: ChatMessage) => {
    if (mode !== 'online' || !onlineRoom) return;
    getSocket().timeout(5000).emit('report_chat', { roomId: onlineRoom.id, token: myToken ?? undefined, message }, (error: Error | null, response: OnlineActionResult) => {
      showToast(!error && response?.success ? '举报已提交' : '举报提交失败');
    });
  };

  const sendChat = (text: string) => {
    if (mode === 'online' && onlineRoom && myToken) {
      getSocket().emit('send_chat', { roomId: onlineRoom.id, text, token: myToken });
    }
  };

  const replayGame = () => {
    setResultOpen(false);
    if (mode === 'puzzle' && puzzle) startPuzzle(puzzle, puzzleDailyDate);
    else if (mode === 'ai') startAiGame(playerColor, difficulty, playerName);
    else if (mode === 'local') startLocalGame(localTimeControl.initial, localTimeControl.increment);
    else if (mode === 'online' && onlineRoom && myToken) {
      getSocket().emit('request_rematch', { roomId: onlineRoom.id, token: myToken });
      showToast(copy.prompts.waiting);
    }
  };

  const retryPuzzle = () => {
    setResultOpen(false);
    if (puzzle) startPuzzle(puzzle, puzzleDailyDate);
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

  const selectedExplanation = useMemo(() => {
    if (!selectedId) return null;
    for (const row of snapshot.board) {
      const piece = row.find((candidate) => candidate?.id === selectedId);
      if (piece) return { piece, text: PIECE_RULE_TEXT[piece.type], count: legalMoves.length };
    }
    return null;
  }, [legalMoves.length, selectedId, snapshot.board]);

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
          quality={quality}
          renderMode={renderMode}
          soundOn={soundOn}
          onMode={(nextMode) => {
            if (nextMode === 'ai' || nextMode === 'local' || nextMode === 'online' || nextMode === 'puzzle') setSetupKind(nextMode);
          }}
          onToggleSound={() => setSoundOn((value) => !value)}
          onSettings={() => setSettingsOpen(true)}
          onDaily={() => setSetupKind('daily')}
          onArchive={() => setArchiveOpen(true)}
          onRules={() => setRulesOpen(true)}
          onCollection={() => setCollectionOpen(true)}
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
              quality={quality}
              renderMode={renderMode}
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
            replayRecord={replayRecord}
            replayIndex={replayIndex}
            localClocks={localClocks}
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
            onSaveGame={saveCurrentGame}
            onOpenArchive={() => setArchiveOpen(true)}
            onOpenRules={() => setRulesOpen(true)}
            onAnalyze={analyzeCurrentPosition}
            onSeekReplay={replayRecord ? seekReplay : undefined}
            onShareRoom={() => setShareRoomOpen(true)}
            onMutePlayer={muteOnlinePlayer}
            onReportMessage={reportChatMessage}
          />
          {selectedExplanation && mode !== 'replay' && (
            <div className="board-coach">
              <span className={selectedExplanation.piece.color === 'red' ? 'red-piece' : 'black-piece'}>{PIECE_GLYPHS[selectedExplanation.piece.color][selectedExplanation.piece.type]}</span>
              <div><strong>{selectedExplanation.text}</strong><small>当前有 {selectedExplanation.count} 个合法落点</small></div>
            </div>
          )}
          {mode === 'replay' && replayRecord && (
            <ReplayBar
              record={replayRecord}
              index={replayIndex}
              onSeek={seekReplay}
              onAnalyze={analyzeCurrentPosition}
              onAnalyzeGame={analyzeReplayGame}
              onContinue={() => startCustomGame(snapshot.board, snapshot.turn)}
              onExport={() => exportRecord(replayRecord)}
              onShare={() => void shareRecord(replayRecord)}
              onExit={() => { returnHome(); setArchiveOpen(true); }}
            />
          )}
        </>
      )}

      {setupKind && (
        <SetupPanel
          kind={setupKind}
          initialRoomCode={initialRoomCode}
          puzzleProgress={puzzleProgressIds}
          dailyPuzzle={dailyPuzzle}
          dailyDate={todayKey}
          dailySolved={dailySolved}
          dailyStreak={dailyStreak}
          lobbyRooms={lobbyRooms}
          lobbyLoading={lobbyLoading}
          onClose={() => setSetupKind(null)}
          onStartAi={startAiGame}
          onCreateOnline={handleStartOnline}
          onJoinOnline={handleJoinOnline}
          onQuickMatch={handleQuickMatch}
          onRefreshRooms={refreshLobby}
          onStartLocal={startLocalGame}
          onStartPuzzle={startPuzzle}
          onStartDaily={startDaily}
          onOpenEditor={() => setEditorOpen(true)}
          onOpenArchive={() => setArchiveOpen(true)}
          onOpenRules={() => setRulesOpen(true)}
        />
      )}

      {archiveOpen && (
        <ArchivePanel
          records={records}
          profile={profile}
          onReplay={openReplay}
          onImport={importRecord}
          onExport={exportRecord}
          onDelete={removeRecord}
          onClear={clearArchive}
          friends={friends}
          onAddFriend={addFriend}
          onRemoveFriend={removeFriend}
          onClose={() => setArchiveOpen(false)}
        />
      )}

      {editorOpen && (
        <BoardEditor
          onStart={startCustomGame}
          onClose={() => setEditorOpen(false)}
        />
      )}

      {rulesOpen && <RulesGuide onClose={() => setRulesOpen(false)} />}

      {collectionOpen && (
        <CollectionPanel profile={profile} records={records} skin={skin} onSkin={setSkin} onClose={() => setCollectionOpen(false)} />
      )}

      <AnalysisPanel
        open={analysisOpen}
        analysis={analysis}
        analyzing={analyzing}
        onAnalyze={analyzeCurrentPosition}
        onClose={() => setAnalysisOpen(false)}
      />

      {handoffColor && <HandoffDialog color={handoffColor} onContinue={() => setHandoffColor(null)} />}

      {shareRoomOpen && onlineRoom && (
        <Suspense fallback={<div className="modal-layer"><div className="analysis-placeholder">正在生成邀请二维码…</div></div>}>
          <ShareRoomDialog roomId={onlineRoom.id} hasPassword={onlineRoom.hasPassword} onClose={() => setShareRoomOpen(false)} />
        </Suspense>
      )}

      <GameAnalysisPanel
        open={gameAnalysisOpen}
        report={gameAnalysis}
        progress={gameAnalysisProgress}
        analyzing={gameAnalyzing}
        onAnalyze={analyzeReplayGame}
        onClose={() => setGameAnalysisOpen(false)}
      />

      <SettingsDialog
        open={settingsOpen}
        intensity={intensity}
        skin={skin}
        soundOn={soundOn}
        prefersReduced={prefersReduced}
        quality={quality}
        renderMode={renderMode}
        onQuality={setQuality}
        onRenderMode={setRenderMode}
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
        onReviewPuzzle={puzzleFailed ? () => { setResultOpen(false); setPuzzleReviewOpen(true); } : undefined}
      />

      {puzzleReviewOpen && puzzle && (
        <PuzzleReviewPanel
          puzzle={puzzle}
          onClose={() => setPuzzleReviewOpen(false)}
          onRetry={() => { setPuzzleReviewOpen(false); startPuzzle(puzzle, puzzleDailyDate); }}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}
