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
  | 'perpetual-check';

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

export type GameMode = 'ai' | 'local' | 'online' | 'puzzle';

export type AiLevel = 'easy' | 'medium' | 'hard';

export type EffectIntensity = 'full' | 'reduced' | 'off';

export type BoardSkin = 'figurine' | 'classic';

export type CameraView = 'three-quarter' | 'overhead';

export interface VisualMove {
  id: number;
  move: Move;
  duration: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  color: PieceColor;
  connected: boolean;
  timeLeft: number;
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
  timeLimit: number;
  createdAt: number;
  rematchVotes: PieceColor[];
}

export interface PublicOnlinePlayer {
  socketId: string;
  name: string;
  color: PieceColor;
  connected: boolean;
  timeLeft: number;
}

export interface PublicOnlineRoom extends Omit<OnlineRoom, 'players' | 'hostToken' | 'rematchVotes'> {
  players: PublicOnlinePlayer[];
  hostColor: PieceColor;
  rematchVotes: PieceColor[];
}

export interface OnlineActionResult {
  success: boolean;
  error?: string;
  roomId?: string;
  token?: string;
  role?: 'player' | 'spectator';
  room?: PublicOnlineRoom;
}
