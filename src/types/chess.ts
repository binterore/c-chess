export type PieceColor = 'red' | 'black';

export type PieceType =
  | 'general'
  | 'advisor'
  | 'elephant'
  | 'horse'
  | 'chariot'
  | 'cannon'
  | 'soldier';

export interface Piece {
  id: string;
  type: PieceType;
  color: PieceColor;
}

export type Position = [number, number];

export type BoardState = (Piece | null)[][];

export type MoveKind = 'quiet' | 'capture' | 'check' | 'checkmate';

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  notation: string;
  kind: MoveKind;
  givesCheck: boolean;
  checkmate: boolean;
  createdAt?: number;
}

export type GameOverReason =
  | 'checkmate'
  | 'stalemate'
  | 'resignation'
  | 'timeout'
  | 'agreement'
  | 'repetition-draw'
  | 'perpetual-check'
  | 'disconnect';

export interface GameResult {
  winner: PieceColor | 'draw';
  reason: GameOverReason;
  winnerColor?: PieceColor;
}

export type GameStatus = 'playing' | 'ended';

export interface GameSnapshot {
  board: BoardState;
  turn: PieceColor;
  history: Move[];
  positionCounts: Record<string, number>;
  status: GameStatus;
  result?: GameResult;
  lastMove?: Move;
}

export type GameMode = 'ai' | 'local' | 'online' | 'puzzle' | 'replay' | 'analysis';

export type AiLevel = 'easy' | 'medium' | 'hard';

export type EffectIntensity = 'full' | 'reduced' | 'off';

export type BoardSkin = 'figurine' | 'classic' | 'jade' | 'bronze';

export type CameraView = 'three-quarter' | 'overhead';
export type RenderMode = 'auto' | '3d' | '2d';
export type QualityLevel = 'high' | 'balanced' | 'low';

export interface TimeControl {
  initial: number;
  increment: number;
}

export interface VisualMove {
  id: number;
  move: Move;
  duration: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface EngineInfo {
  depth: number;
  nodes: number;
  elapsed: number;
  evaluation: number;
}

export interface OnlinePlayer {
  token: string;
  muted?: boolean;
  socketId: string;
  name: string;
  color: PieceColor;
  connected: boolean;
  timeLeft: number;
}

export interface OnlineRoom {
  id: string;
  hostToken: string;
  players: OnlinePlayer[];
  spectatorCount: number;
  status: 'waiting' | 'playing' | 'ended';
  game: GameSnapshot;
  gameId: string;
  gameStartedAt?: number;
  timeLimit: number;
  increment: number;
  visibility: 'public' | 'private';
  passwordHash?: string;
  createdAt: number;
  rematchVotes: PieceColor[];
}

export interface PublicOnlinePlayer {
  socketId: string;
  name: string;
  color: PieceColor;
  connected: boolean;
  timeLeft: number;
  muted?: boolean;
}

export interface PublicOnlineRoom extends Omit<OnlineRoom, 'players' | 'hostToken' | 'rematchVotes' | 'passwordHash'> {
  players: PublicOnlinePlayer[];
  hostColor: PieceColor;
  rematchVotes: PieceColor[];
  hasPassword: boolean;
}

export interface OnlineActionResult {
  success: boolean;
  error?: string;
  roomId?: string;
  token?: string;
  role?: 'player' | 'spectator';
  room?: PublicOnlineRoom;
  records?: GameRecord[];
  profile?: PlayerProfile;
  rooms?: LobbyRoom[];
  friends?: PlayerProfile[];
}


export interface PlayerProfile {
  id: string;
  name: string;
  createdAt: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  puzzlesSolved: number;
  totalMoves: number;
  dailyDates: string[];
}

export interface GameRecord {
  id: string;
  mode: GameMode;
  createdAt: number;
  updatedAt: number;
  redName: string;
  blackName: string;
  playerColor?: PieceColor;
  initialBoard: BoardState;
  initialTurn: PieceColor;
  history: Move[];
  result?: GameResult;
  timeControl?: TimeControl;
  puzzleId?: string;
  dailyDate?: string;
  analysisSummary?: string;
}

export interface AnalyzedMove {
  ply: number;
  notation: string;
  verdict: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  evaluation: number;
  bestMove?: { from: Position; to: Position; notation: string };
}

export interface GameAnalysisReport {
  moves: AnalyzedMove[];
  accuracy: number;
  blunders: number;
  mistakes: number;
}

export interface MoveAnalysis {
  summary: string;
  bestMove?: { from: Position; to: Position; notation: string };
  score: number;
  depth: number;
  nodes: number;
  elapsed: number;
  explanation: string;
}

export interface LobbyRoom {
  id: string;
  hostName: string;
  hostColor: PieceColor;
  timeLimit: number;
  increment: number;
  status: 'waiting' | 'playing';
  spectatorCount: number;
  createdAt: number;
}
