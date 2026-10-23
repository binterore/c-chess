import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  BoardState,
  KillPatternType,
  Position
} from '../types/chess';
import { PieceView } from './PieceView';
import { BoardEffectsCanvas } from './effects/BoardEffectsCanvas';
import { i18n } from '../i18n';

interface BoardProps {
  board: BoardState;
  selectedPos: Position | null;
  legalMoves: Position[];
  lastMove: { from: Position; to: Position } | null;
  checkedKingPos: Position | null;
  flipped: boolean;
  activeEffect?: {
    type: KillPatternType;
    from?: Position;
    to?: Position;
    timestamp: number;
  };
  onSquareClick: (pos: Position) => void;
}

export const Board: React.FC<BoardProps> = ({
  board,
  selectedPos,
  legalMoves,
  lastMove,
  checkedKingPos,
  flipped,
  activeEffect,
  onSquareClick
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [boardDimension, setBoardDimension] = useState<{
    cellWidth: number;
    cellHeight: number;
    paddingX: number;
    paddingY: number;
    boardWidth: number;
    boardHeight: number;
  }>({
    cellWidth: 54,
    cellHeight: 54,
    paddingX: 36,
    paddingY: 36,
    boardWidth: 504,
    boardHeight: 558
  });

  useEffect(() => {
    const updateSize = () => {
      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 600;
      const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

      const maxWidth = Math.min(screenWidth - 20, 520);
      const maxHeight = screenHeight - 220;
      const availableWidth = Math.min(maxWidth, Math.floor(maxHeight * (8 / 9.5)));

      const cell = Math.max(34, Math.floor((availableWidth - 32) / 8));
      const padX = Math.max(16, Math.floor((availableWidth - cell * 8) / 2));
      const padY = padX;

      setBoardDimension({
        cellWidth: cell,
        cellHeight: cell,
        paddingX: padX,
        paddingY: padY,
        boardWidth: padX * 2 + cell * 8,
        boardHeight: padY * 2 + cell * 9
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const { cellWidth, cellHeight, paddingX, paddingY, boardWidth, boardHeight } =
    boardDimension;

  const legalMoveSet = useMemo(() => {
    const set = new Set<string>();
    legalMoves.forEach(([x, y]) => set.add(`${x},${y}`));
    return set;
  }, [legalMoves]);

  const toBoardCoords = (x: number, y: number) => {
    const bx = flipped ? 8 - x : x;
    const by = flipped ? 9 - y : y;
    return {
      px: paddingX + bx * cellWidth,
      py: paddingY + by * cellHeight
    };
  };

  const handleBoardTouchOrClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const rawX = (clickX - paddingX) / cellWidth;
    const rawY = (clickY - paddingY) / cellHeight;

    const gridX = Math.round(rawX);
    const gridY = Math.round(rawY);

    if (gridX >= 0 && gridX <= 8 && gridY >= 0 && gridY <= 9) {
      const dist = Math.hypot(rawX - gridX, rawY - gridY);
      if (dist <= 0.6) {
        const boardX = flipped ? 8 - gridX : gridX;
        const boardY = flipped ? 9 - gridY : gridY;
        onSquareClick([boardX, boardY]);
      }
    }
  };

  const renderGridLines = () => {
    const lines = [];

    for (let r = 0; r < 10; r++) {
      const y = paddingY + r * cellHeight;
      lines.push(
        <line
          key={`h-${r}`}
          x1={paddingX}
          y1={y}
          x2={paddingX + 8 * cellWidth}
          y2={y}
          stroke="#78350f"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />
      );
    }

    lines.push(
      <line
        key="v-left"
        x1={paddingX}
        y1={paddingY}
        x2={paddingX}
        y2={paddingY + 9 * cellHeight}
        stroke="#78350f"
        strokeWidth="1.5"
        strokeOpacity="0.8"
      />
    );
    lines.push(
      <line
        key="v-right"
        x1={paddingX + 8 * cellWidth}
        y1={paddingY}
        x2={paddingX + 8 * cellWidth}
        y2={paddingY + 9 * cellHeight}
        stroke="#78350f"
        strokeWidth="1.5"
        strokeOpacity="0.8"
      />
    );

    for (let c = 1; c < 8; c++) {
      const x = paddingX + c * cellWidth;
      lines.push(
        <line
          key={`v-top-${c}`}
          x1={x}
          y1={paddingY}
          x2={x}
          y2={paddingY + 4 * cellHeight}
          stroke="#78350f"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />
      );
      lines.push(
        <line
          key={`v-bottom-${c}`}
          x1={x}
          y1={paddingY + 5 * cellHeight}
          x2={x}
          y2={paddingY + 9 * cellHeight}
          stroke="#78350f"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />
      );
    }

    const topP1 = toBoardCoords(3, 0);
    const topP2 = toBoardCoords(5, 2);
    const topP3 = toBoardCoords(5, 0);
    const topP4 = toBoardCoords(3, 2);

    lines.push(
      <line
        key="palace-top-1"
        x1={topP1.px}
        y1={topP1.py}
        x2={topP2.px}
        y2={topP2.py}
        stroke="#78350f"
        strokeWidth="1.5"
        strokeOpacity="0.8"
      />
    );
    lines.push(
      <line
        key="palace-top-2"
        x1={topP3.px}
        y1={topP3.py}
        x2={topP4.px}
        y2={topP4.py}
        stroke="#78350f"
        strokeWidth="1.5"
        strokeOpacity="0.8"
      />
    );

    const btmP1 = toBoardCoords(3, 7);
    const btmP2 = toBoardCoords(5, 9);
    const btmP3 = toBoardCoords(5, 7);
    const btmP4 = toBoardCoords(3, 9);

    lines.push(
      <line
        key="palace-btm-1"
        x1={btmP1.px}
        y1={btmP1.py}
        x2={btmP2.px}
        y2={btmP2.py}
        stroke="#78350f"
        strokeWidth="1.5"
        strokeOpacity="0.8"
      />
    );
    lines.push(
      <line
        key="palace-btm-2"
        x1={btmP3.px}
        y1={btmP3.py}
        x2={btmP4.px}
        y2={btmP4.py}
        stroke="#78350f"
        strokeWidth="1.5"
        strokeOpacity="0.8"
      />
    );

    return lines;
  };

  const renderStarMarker = (x: number, y: number) => {
    const { px, py } = toBoardCoords(x, y);
    const d = Math.max(3, cellWidth * 0.08);
    const len = Math.max(6, cellWidth * 0.16);

    const brackets = [];

    if (x > 0) {
      brackets.push(
        <path
          key={`b-tl-${x}-${y}`}
          d={`M ${px - d - len} ${py - d} L ${px - d} ${py - d} L ${px - d} ${py - d - len}`}
          stroke="#78350f"
          strokeWidth="1.5"
          fill="none"
          strokeOpacity="0.75"
        />
      );
      brackets.push(
        <path
          key={`b-bl-${x}-${y}`}
          d={`M ${px - d - len} ${py + d} L ${px - d} ${py + d} L ${px - d} ${py + d + len}`}
          stroke="#78350f"
          strokeWidth="1.5"
          fill="none"
          strokeOpacity="0.75"
        />
      );
    }

    if (x < 8) {
      brackets.push(
        <path
          key={`b-tr-${x}-${y}`}
          d={`M ${px + d + len} ${py - d} L ${px + d} ${py - d} L ${px + d} ${py - d - len}`}
          stroke="#78350f"
          strokeWidth="1.5"
          fill="none"
          strokeOpacity="0.75"
        />
      );
      brackets.push(
        <path
          key={`b-br-${x}-${y}`}
          d={`M ${px + d + len} ${py + d} L ${px + d} ${py + d} L ${px + d} ${py + d + len}`}
          stroke="#78350f"
          strokeWidth="1.5"
          fill="none"
          strokeOpacity="0.75"
        />
      );
    }

    return brackets;
  };

  const starPositions: Position[] = [
    [1, 2],
    [7, 2],
    [0, 3],
    [2, 3],
    [4, 3],
    [6, 3],
    [8, 3],
    [0, 6],
    [2, 6],
    [4, 6],
    [6, 6],
    [8, 6],
    [1, 7],
    [7, 7]
  ];

  return (
    <div className="relative select-none flex items-center justify-center p-1 sm:p-3 touch-manipulation max-w-full">
      <div
        ref={containerRef}
        onClick={handleBoardTouchOrClick}
        style={{ width: `${boardWidth}px`, height: `${boardHeight}px` }}
        className="relative rounded-2xl shadow-[0_15px_45px_rgba(0,0,0,0.8),inset_0_2px_15px_rgba(255,255,255,0.15)] border-4 sm:border-8 border-[#3e2723] bg-gradient-to-br from-[#dfb17b] via-[#cf9e65] to-[#b7844b] overflow-hidden cursor-pointer"
      >
        <svg
          width={boardWidth}
          height={boardHeight}
          className="absolute inset-0 pointer-events-none"
        >
          <rect
            x={paddingX - 8}
            y={paddingY - 8}
            width={cellWidth * 8 + 16}
            height={cellHeight * 9 + 16}
            fill="none"
            stroke="#78350f"
            strokeWidth="2.5"
            strokeOpacity="0.8"
          />

          {renderGridLines()}

          {starPositions.map(([x, y]) => renderStarMarker(x, y))}

          <text
            x={paddingX + 2 * cellWidth}
            y={paddingY + 4.65 * cellHeight}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#78350f"
            fillOpacity="0.75"
            style={{ fontSize: `${cellWidth * 0.42}px` }}
            className="font-calligraphy font-black tracking-[0.5em]"
          >
            {flipped ? i18n.zh.riverLower : i18n.zh.riverUpper}
          </text>
          <text
            x={paddingX + 6 * cellWidth}
            y={paddingY + 4.65 * cellHeight}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#78350f"
            fillOpacity="0.75"
            style={{ fontSize: `${cellWidth * 0.42}px` }}
            className="font-calligraphy font-black tracking-[0.5em]"
          >
            {flipped ? i18n.zh.riverUpper : i18n.zh.riverLower}
          </text>
        </svg>

        <BoardEffectsCanvas
          width={boardWidth}
          height={boardHeight}
          cellWidth={cellWidth}
          cellHeight={cellHeight}
          paddingX={paddingX}
          paddingY={paddingY}
          flipped={flipped}
          activeEffect={activeEffect}
        />

        {lastMove && (
          <>
            <div
              style={{
                left: `${toBoardCoords(lastMove.from[0], lastMove.from[1]).px}px`,
                top: `${toBoardCoords(lastMove.from[0], lastMove.from[1]).py}px`,
                width: `${cellWidth * 0.88}px`,
                height: `${cellHeight * 0.88}px`,
                transform: 'translate(-50%, -50%)'
              }}
              className="absolute rounded-full border-2 border-amber-400/50 bg-amber-400/10 pointer-events-none"
            />
            <div
              style={{
                left: `${toBoardCoords(lastMove.to[0], lastMove.to[1]).px}px`,
                top: `${toBoardCoords(lastMove.to[0], lastMove.to[1]).py}px`,
                width: `${cellWidth * 0.92}px`,
                height: `${cellHeight * 0.92}px`,
                transform: 'translate(-50%, -50%)'
              }}
              className="absolute rounded-full border-2 border-amber-400 bg-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.6)] pointer-events-none"
            />
          </>
        )}

        {Array.from({ length: 10 }).map((_, y) =>
          Array.from({ length: 9 }).map((_, x) => {
            const pos: Position = [x, y];
            const isLegal = legalMoveSet.has(`${x},${y}`);
            const { px, py } = toBoardCoords(x, y);

            if (!isLegal) return null;

            const targetPiece = board[y][x];

            return (
              <div
                key={`hint-${x}-${y}`}
                style={{
                  left: `${px}px`,
                  top: `${py}px`,
                  width: `${cellWidth}px`,
                  height: `${cellHeight}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                className="absolute z-20 pointer-events-none flex items-center justify-center"
              >
                {targetPiece ? (
                  <div
                    style={{
                      width: `${cellWidth * 0.88}px`,
                      height: `${cellHeight * 0.88}px`
                    }}
                    className="rounded-full border-2 border-red-500 bg-red-500/30 animate-pulse flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.9)]"
                  />
                ) : (
                  <div
                    style={{
                      width: `${Math.max(14, cellWidth * 0.32)}px`,
                      height: `${Math.max(14, cellHeight * 0.32)}px`
                    }}
                    className="rounded-full bg-amber-400 border-2 border-amber-200 shadow-[0_0_10px_rgba(245,158,11,1)]"
                  />
                )}
              </div>
            );
          })
        )}

        {board.map((row, y) =>
          row.map((piece, x) => {
            if (!piece) return null;

            const isSelected = selectedPos?.[0] === x && selectedPos?.[1] === y;
            const isThreatened =
              checkedKingPos?.[0] === x && checkedKingPos?.[1] === y;
            const isLast = lastMove?.to[0] === x && lastMove?.to[1] === y;
            const { px, py } = toBoardCoords(x, y);

            return (
              <div
                key={piece.id}
                style={{
                  left: `${px}px`,
                  top: `${py}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                className="absolute pointer-events-none"
              >
                <PieceView
                  piece={piece}
                  size={cellWidth}
                  isSelected={isSelected}
                  isThreatened={isThreatened}
                  isLastMove={isLast}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
