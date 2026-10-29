import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent
} from 'react';
import type {
  BoardSkin,
  BoardState,
  EffectIntensity,
  Move,
  Position,
  QualityLevel,
  RenderMode,
  VisualMove
} from '../types/chess';
import type { ChessScene } from '../three/ChessScene';
import { PIECE_GLYPHS } from '../i18n/chess';

export interface ChessBoardHandle {
  resetCamera: (overhead?: boolean) => void;
  showHint: (from: Position, to: Position) => void;
  clearHint: () => void;
  setCinematicEnding: (enabled: boolean) => void;
  replayCheckmateMove: (move: Move, onComplete?: () => void) => void;
}

interface ChessBoardProps {
  board: BoardState;
  selectedId: string | null;
  legalMoves: Position[];
  checkedId: string | null;
  lastMove: { from: Position; to: Position } | null;
  visualMove: VisualMove | null;
  skin: BoardSkin;
  intensity: EffectIntensity;
  quality?: QualityLevel;
  renderMode?: RenderMode;
  flipped: boolean;
  idle?: boolean;
  victoryToken?: number;
  victoryColor?: 'red' | 'black' | 'draw';
  onSquareClick: (position: Position) => void;
  onAnimationComplete: (id: number) => void;
}

function webglAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function samePosition(a: Position | null, b: Position | null): boolean {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}

export const ChessBoard = forwardRef<ChessBoardHandle, ChessBoardProps>(function ChessBoard(
  {
    board,
    selectedId,
    legalMoves,
    checkedId,
    lastMove,
    visualMove,
    skin,
    intensity,
    quality = 'balanced',
    renderMode = 'auto',
    flipped,
    idle = false,
    victoryToken = 0,
    victoryColor = 'red',
    onSquareClick,
    onAnimationComplete
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<ChessScene | null>(null);
  const callbacksRef = useRef({ onSquareClick, onAnimationComplete });
  callbacksRef.current = { onSquareClick, onAnimationComplete };
  const scenePropsRef = useRef({ board, selectedId, legalMoves, checkedId, lastMove, skin, intensity, quality, flipped });
  scenePropsRef.current = { board, selectedId, legalMoves, checkedId, lastMove, skin, intensity, quality, flipped };
  const [webglWorks, setWebglWorks] = useState(webglAvailable);
  const [hint, setHint] = useState<{ from: Position; to: Position } | null>(null);
  const [keyboardCursor, setKeyboardCursor] = useState<Position>([4, 9]);
  const use2D = renderMode === '2d' || !webglWorks;

  useImperativeHandle(ref, () => ({
    resetCamera: (overhead = false) => sceneRef.current?.resetCamera(overhead),
    showHint: (from: Position, to: Position) => {
      setHint({ from, to });
      sceneRef.current?.showHint(from, to);
    },
    clearHint: () => {
      setHint(null);
      sceneRef.current?.clearHint();
    },
    setCinematicEnding: (enabled: boolean) => sceneRef.current?.setCinematicEnding(enabled),
    replayCheckmateMove: (move: Move, onComplete?: () => void) => {
      if (sceneRef.current) sceneRef.current.replayCheckmateMove(move, onComplete);
      else window.setTimeout(() => onComplete?.(), 450);
    }
  }), []);

  useEffect(() => {
    if (use2D || !containerRef.current) return;
    let cancelled = false;
    let scene: ChessScene | null = null;
    let canvas: HTMLCanvasElement | null = null;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setWebglWorks(false);
    };
    const initialize = async () => {
      try {
        const module = await import('../three/ChessScene');
        if (cancelled || !containerRef.current) return;
        const latest = scenePropsRef.current;
        scene = new module.ChessScene(containerRef.current, {
          skin: latest.skin,
          intensity: latest.intensity,
          quality: latest.quality,
          flipped: latest.flipped,
          callbacks: {
            onSquareClick: (position) => callbacksRef.current.onSquareClick(position),
            onHoverSquare: () => undefined,
            onAnimationComplete: (id) => callbacksRef.current.onAnimationComplete(id)
          }
        });
        sceneRef.current = scene;
        scene.setBoard(latest.board);
        scene.setSelection(latest.selectedId, latest.legalMoves);
        scene.setCheckedPiece(latest.checkedId);
        scene.setLastMove(latest.lastMove?.from ?? null, latest.lastMove?.to ?? null);
        canvas = containerRef.current.querySelector('canvas');
        canvas?.addEventListener('webglcontextlost', onContextLost);
      } catch {
        if (!cancelled) setWebglWorks(false);
      }
    };
    const timer = window.setTimeout(() => { void initialize(); }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      canvas?.removeEventListener('webglcontextlost', onContextLost);
      scene?.dispose();
      if (sceneRef.current === scene) sceneRef.current = null;
    };
  }, [use2D]);

  useEffect(() => {
    sceneRef.current?.setQuality(quality);
  }, [quality]);

  useEffect(() => {
    sceneRef.current?.setBoard(board);
  }, [board]);

  useEffect(() => {
    sceneRef.current?.setSelection(selectedId, legalMoves);
  }, [selectedId, legalMoves]);

  useEffect(() => {
    sceneRef.current?.setCheckedPiece(checkedId);
  }, [checkedId]);

  useEffect(() => {
    sceneRef.current?.setLastMove(lastMove?.from ?? null, lastMove?.to ?? null);
  }, [lastMove]);

  useEffect(() => {
    sceneRef.current?.setSkin(skin);
  }, [skin]);

  useEffect(() => {
    sceneRef.current?.setIntensity(intensity);
  }, [intensity]);

  useEffect(() => {
    sceneRef.current?.setFlipped(flipped);
  }, [flipped]);

  useEffect(() => {
    sceneRef.current?.setIdle(idle);
  }, [idle]);

  useEffect(() => {
    if (visualMove) sceneRef.current?.playMove(visualMove);
  }, [visualMove]);

  useEffect(() => {
    if (!use2D || !visualMove) return;
    const timer = window.setTimeout(() => callbacksRef.current.onAnimationComplete(visualMove.id), Math.min(visualMove.duration, 360));
    return () => window.clearTimeout(timer);
  }, [use2D, visualMove]);

  useEffect(() => {
    if (victoryToken > 0 && sceneRef.current) sceneRef.current.playVictory(victoryColor);
  }, [victoryToken, victoryColor]);

  useEffect(() => {
    if (use2D) sceneRef.current?.setKeyboardCursor(null);
    else sceneRef.current?.setKeyboardCursor(keyboardCursor);
  }, [keyboardCursor, use2D]);

  const moveCursor = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Enter' || event.key === ' ') {
      callbacksRef.current.onSquareClick(keyboardCursor);
      return;
    }
    const horizontal = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    const vertical = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    setKeyboardCursor(([x, y]) => [
      Math.max(0, Math.min(8, x + (flipped ? -horizontal : horizontal))),
      Math.max(0, Math.min(9, y + (flipped ? -vertical : vertical)))
    ]);
  };

  return (
    <div
      ref={containerRef}
      className={`chess-board-canvas skin-${skin} ${use2D ? 'is-2d' : ''}`}
      tabIndex={idle ? -1 : 0}
      onKeyDown={moveCursor}
      role="application"
      aria-label="中国象棋棋盘。方向键移动焦点，回车选择棋子或落子。"
    >
      {use2D && (
        <div className="board-2d-shell">
          <div className={`board-2d ${flipped ? 'flipped' : ''}`} role="grid" aria-label="二维中国象棋棋盘">
            <div className="board-2d-river" aria-hidden="true" />
            {Array.from({ length: 90 }, (_, index) => {
              const x = index % 9;
              const y = Math.floor(index / 9);
              const displayX = flipped ? 8 - x : x;
              const displayY = flipped ? 9 - y : y;
              const piece = board[y][x];
              const selected = piece?.id === selectedId;
              const legal = legalMoves.some(([mx, my]) => mx === x && my === y);
              const isLast = samePosition(lastMove?.from ?? null, [x, y]) || samePosition(lastMove?.to ?? null, [x, y]);
              const isHint = samePosition(hint?.from ?? null, [x, y]) || samePosition(hint?.to ?? null, [x, y]);
              const cursor = samePosition(keyboardCursor, [x, y]);
              return (
                <button
                  key={`${x}-${y}`}
                  className={`board-2d-cell ${piece ? `${piece.color}-piece` : ''} ${selected ? 'selected' : ''} ${checkedId === piece?.id ? 'checked' : ''} ${isLast ? 'last' : ''} ${isHint ? 'hint' : ''} ${cursor ? 'keyboard-cursor' : ''}`}
                  style={{ gridColumn: displayX + 1, gridRow: displayY + 1 }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setKeyboardCursor([x, y]);
                    callbacksRef.current.onSquareClick([x, y]);
                  }}
                  role="gridcell"
                  tabIndex={-1}
                  aria-label={`${String.fromCharCode(65 + x)}${10 - y}${piece ? `，${piece.color === 'red' ? '红方' : '黑方'}${piece.type}` : '，空位'}`}
                >
                  {piece && <span>{PIECE_GLYPHS[piece.color][piece.type]}</span>}
                  {legal && <i className="legal-dot" />}
                </button>
              );
            })}
          </div>
          <span className="board-2d-note">二维兼容模式 · 方向键选格，回车落子</span>
        </div>
      )}
    </div>
  );
});
