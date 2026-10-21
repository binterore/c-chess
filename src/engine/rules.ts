import {
  BoardState,
  KillPatternType,
  Move,
  Piece,
  PieceColor,
  PieceType,
  Position
} from '../types/chess';

export function createInitialBoard(): BoardState {
  const board: BoardState = Array(10)
    .fill(null)
    .map(() => Array(9).fill(null));

  const place = (
    x: number,
    y: number,
    type: PieceType,
    color: PieceColor,
    id: string
  ) => {
    board[y][x] = { id, type, color };
  };

  place(0, 0, 'chariot', 'black', 'b_r1');
  place(1, 0, 'horse', 'black', 'b_n1');
  place(2, 0, 'elephant', 'black', 'b_b1');
  place(3, 0, 'advisor', 'black', 'b_a1');
  place(4, 0, 'general', 'black', 'b_k');
  place(5, 0, 'advisor', 'black', 'b_a2');
  place(6, 0, 'elephant', 'black', 'b_b2');
  place(7, 0, 'horse', 'black', 'b_n2');
  place(8, 0, 'chariot', 'black', 'b_r2');
  place(1, 2, 'cannon', 'black', 'b_c1');
  place(7, 2, 'cannon', 'black', 'b_c2');
  for (let i = 0; i < 5; i++) {
    place(i * 2, 3, 'soldier', 'black', `b_p${i + 1}`);
  }

  place(0, 9, 'chariot', 'red', 'r_r1');
  place(1, 9, 'horse', 'red', 'r_n1');
  place(2, 9, 'elephant', 'red', 'r_b1');
  place(3, 9, 'advisor', 'red', 'r_a1');
  place(4, 9, 'general', 'red', 'r_k');
  place(5, 9, 'advisor', 'red', 'r_a2');
  place(6, 9, 'elephant', 'red', 'r_b2');
  place(7, 9, 'horse', 'red', 'r_n2');
  place(8, 9, 'chariot', 'red', 'r_r2');
  place(1, 7, 'cannon', 'red', 'r_c1');
  place(7, 7, 'cannon', 'red', 'r_c2');
  for (let i = 0; i < 5; i++) {
    place(i * 2, 6, 'soldier', 'red', `r_p${i + 1}`);
  }

  return board;
}

export function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function findGeneral(
  board: BoardState,
  color: PieceColor
): Position | null {
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (piece && piece.type === 'general' && piece.color === color) {
        return [x, y];
      }
    }
  }
  return null;
}

export function countObstacles(
  board: BoardState,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  let count = 0;
  if (x1 === x2) {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY + 1; y < maxY; y++) {
      if (board[y][x1]) count++;
    }
  } else if (y1 === y2) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let x = minX + 1; x < maxX; x++) {
      if (board[y1][x]) count++;
    }
  }
  return count;
}

export function isGeneralFacing(board: BoardState): boolean {
  const redKing = findGeneral(board, 'red');
  const blackKing = findGeneral(board, 'black');
  if (!redKing || !blackKing) return false;
  if (redKing[0] !== blackKing[0]) return false;

  const obstacles = countObstacles(
    board,
    redKing[0],
    redKing[1],
    blackKing[0],
    blackKing[1]
  );
  return obstacles === 0;
}

export function isValidGeometricMove(
  board: BoardState,
  from: Position,
  to: Position
): boolean {
  const [fx, fy] = from;
  const [tx, ty] = to;

  if (tx < 0 || tx > 8 || ty < 0 || ty > 9) return false;
  if (fx === tx && fy === ty) return false;

  const piece = board[fy][fx];
  if (!piece) return false;

  const target = board[ty][tx];
  if (target && target.color === piece.color) return false;

  const dx = tx - fx;
  const dy = ty - fy;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  switch (piece.type) {
    case 'general': {
      const inPalace =
        tx >= 3 &&
        tx <= 5 &&
        (piece.color === 'red' ? ty >= 7 && ty <= 9 : ty >= 0 && ty <= 2);
      if (!inPalace) return false;
      return absDx + absDy === 1;
    }
    case 'advisor': {
      const inPalace =
        tx >= 3 &&
        tx <= 5 &&
        (piece.color === 'red' ? ty >= 7 && ty <= 9 : ty >= 0 && ty <= 2);
      if (!inPalace) return false;
      return absDx === 1 && absDy === 1;
    }
    case 'elephant': {
      if (absDx !== 2 || absDy !== 2) return false;
      const crossesRiver = piece.color === 'red' ? ty < 5 : ty > 4;
      if (crossesRiver) return false;
      const eyeX = fx + dx / 2;
      const eyeY = fy + dy / 2;
      if (board[eyeY][eyeX] !== null) return false;
      return true;
    }
    case 'horse': {
      if (!((absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1))) {
        return false;
      }
      if (absDx === 2) {
        const legX = fx + dx / 2;
        if (board[fy][legX] !== null) return false;
      } else {
        const legY = fy + dy / 2;
        if (board[legY][fx] !== null) return false;
      }
      return true;
    }
    case 'chariot': {
      if (fx !== tx && fy !== ty) return false;
      return countObstacles(board, fx, fy, tx, ty) === 0;
    }
    case 'cannon': {
      if (fx !== tx && fy !== ty) return false;
      const obstacles = countObstacles(board, fx, fy, tx, ty);
      if (target === null) {
        return obstacles === 0;
      } else {
        return obstacles === 1;
      }
    }
    case 'soldier': {
      if (piece.color === 'red') {
        const crossedRiver = fy <= 4;
        if (!crossedRiver) {
          return dx === 0 && dy === -1;
        } else {
          return (dx === 0 && dy === -1) || (absDx === 1 && dy === 0);
        }
      } else {
        const crossedRiver = fy >= 5;
        if (!crossedRiver) {
          return dx === 0 && dy === 1;
        } else {
          return (dx === 0 && dy === 1) || (absDx === 1 && dy === 0);
        }
      }
    }
  }
}

export function isCheck(board: BoardState, color: PieceColor): boolean {
  const kingPos = findGeneral(board, color);
  if (!kingPos) return true;

  const opponentColor: PieceColor = color === 'red' ? 'black' : 'red';
  if (isGeneralFacing(board)) return true;

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (piece && piece.color === opponentColor) {
        if (isValidGeometricMove(board, [x, y], kingPos)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function isLegalMove(
  board: BoardState,
  from: Position,
  to: Position,
  turn: PieceColor
): boolean {
  const [fx, fy] = from;
  const piece = board[fy][fx];
  if (!piece || piece.color !== turn) return false;

  if (!isValidGeometricMove(board, from, to)) return false;

  const nextBoard = cloneBoard(board);
  nextBoard[to[1]][to[0]] = piece;
  nextBoard[fy][fx] = null;

  if (isGeneralFacing(nextBoard)) return false;
  if (isCheck(nextBoard, turn)) return false;

  return true;
}

export function getLegalMoves(
  board: BoardState,
  from: Position,
  turn: PieceColor
): Position[] {
  const [fx, fy] = from;
  const piece = board[fy][fx];
  if (!piece || piece.color !== turn) return [];

  const moves: Position[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      if (isLegalMove(board, from, [x, y], turn)) {
        moves.push([x, y]);
      }
    }
  }
  return moves;
}

export function hasAnyLegalMove(
  board: BoardState,
  turn: PieceColor
): boolean {
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (piece && piece.color === turn) {
        if (getLegalMoves(board, [x, y], turn).length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

export function detectKillPattern(
  prevBoard: BoardState,
  board: BoardState,
  move: Move,
  deliversCheck: boolean,
  deliversCheckmate: boolean
): KillPatternType {
  const { to, piece, captured } = move;
  const opponentColor: PieceColor = piece.color === 'red' ? 'black' : 'red';
  const enemyKing = findGeneral(board, opponentColor);

  if (piece.type === 'horse' && deliversCheck && enemyKing) {
    const isWocaoRed =
      piece.color === 'red' &&
      to[1] === 1 &&
      (to[0] === 1 || to[0] === 2 || to[0] === 6 || to[0] === 7);
    const isWocaoBlack =
      piece.color === 'black' &&
      to[1] === 8 &&
      (to[0] === 1 || to[0] === 2 || to[0] === 6 || to[0] === 7);

    if (isWocaoRed || isWocaoBlack) {
      return 'wocaoma';
    }

    const isGuajiaoRed =
      piece.color === 'red' &&
      to[1] === 1 &&
      (to[0] === 3 || to[0] === 5);
    const isGuajiaoBlack =
      piece.color === 'black' &&
      to[1] === 8 &&
      (to[0] === 3 || to[0] === 5);

    if (isGuajiaoRed || isGuajiaoBlack) {
      return 'guajiaoma';
    }
  }

  if (piece.type === 'cannon' && deliversCheck && enemyKing) {
    const isSameCol = to[0] === enemyKing[0];
    const isSameRow = to[1] === enemyKing[1];
    let hasSecondCannon = false;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        if (x === to[0] && y === to[1]) continue;
        const p = board[y][x];
        if (p && p.type === 'cannon' && p.color === piece.color) {
          if (isSameCol && x === to[0]) hasSecondCannon = true;
          if (isSameRow && y === to[1]) hasSecondCannon = true;
        }
      }
    }

    if (hasSecondCannon) {
      return 'zhongpao';
    }
  }

  if (deliversCheck && enemyKing) {
    const isCenterFileBlocked =
      (piece.color === 'red' && board[1][4]?.color === 'red') ||
      (piece.color === 'black' && board[8][4]?.color === 'black');
    if (isCenterFileBlocked && enemyKing[0] !== 4) {
      return 'tiemenshuan';
    }
  }

  if (deliversCheck) {
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const p = board[y][x];
        if (p && p.type === 'chariot' && p.color === opponentColor) {
          if (isValidGeometricMove(board, to, [x, y])) {
            return 'chouche';
          }
        }
      }
    }
  }

  if (deliversCheckmate && enemyKing) {
    const [kx, ky] = enemyKing;
    let ownBlockCount = 0;
    const deltas = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    for (const [dx, dy] of deltas) {
      const nx = kx + dx;
      const ny = ky + dy;
      if (
        nx >= 3 &&
        nx <= 5 &&
        (opponentColor === 'red' ? ny >= 7 && ny <= 9 : ny >= 0 && ny <= 2)
      ) {
        const p = board[ny][nx];
        if (p && p.color === opponentColor) {
          ownBlockCount++;
        }
      }
    }
    if (ownBlockCount >= 3) {
      return 'mensha';
    }
  }

  if (deliversCheckmate) {
    return 'checkmate';
  }

  if (deliversCheck) {
    return 'check';
  }

  if (captured) {
    return 'capture';
  }

  return 'capture';
}
