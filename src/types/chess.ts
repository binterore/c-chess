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

export type Position = [number, number]; // [x, y], 0 <= x <= 8, 0 <= y <= 9

export type BoardState = (Piece | null)[][]; // 10 rows (y=0 to 9), each row 9 cols (x=0 to 8)

export type KillPatternType =
  | 'wocaoma'
  | 'zhongpao'
  | 'guajiaoma'
  | 'tiemenshuan'
  | 'chouche'
  | 'mensha'
  | 'capture'
  | 'check'
  | 'checkmate';

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  killPattern?: KillPatternType;
  isCheck?: boolean;
  isCheckmate?: boolean;
}

export type GameStatus = 'waiting' | 'playing' | 'ended';

export type GameOverReason =
  | 'checkmate'
  | 'stalemate'
  | 'surrender'
  | 'timeout'
  | 'agreement';

export interface GameResult {
  winner: PieceColor | 'draw';
  reason: GameOverReason;
  pattern?: KillPatternType;
}

export interface Player {
  id: string;
  name: string;
  color?: PieceColor;
  isReady: boolean;
  timeLeft: number;
}

export interface RoomState {
  id: string;
  hostId: string;
  players: Record<string, Player>;
  spectators: string[];
  status: GameStatus;
  turn: PieceColor;
  board: BoardState;
  history: Move[];
  result?: GameResult;
  timeLimit: number; // in seconds, 0 = unlimited
  activeEffect?: {
    type: KillPatternType;
    from?: Position;
    to?: Position;
    timestamp: number;
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isPreset?: boolean;
}
