import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react';
import type {
  BoardSkin,
  BoardState,
  EffectIntensity,
  Position,
  VisualMove
} from '../types/chess';
import { ChessScene } from '../three/ChessScene';

export interface ChessBoardHandle {
  resetCamera: (overhead?: boolean) => void;
  showHint: (from: Position, to: Position) => void;
  clearHint: () => void;
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
  flipped: boolean;
  idle?: boolean;
  victoryToken?: number;
  victoryColor?: 'red' | 'black' | 'draw';
  onSquareClick: (position: Position) => void;
  onAnimationComplete: (id: number) => void;
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

  useImperativeHandle(ref, () => ({
    resetCamera: (overhead = false) => sceneRef.current?.resetCamera(overhead),
    showHint: (from: Position, to: Position) => sceneRef.current?.showHint(from, to),
    clearHint: () => sceneRef.current?.clearHint()
  }), []);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new ChessScene(containerRef.current, {
      skin,
      intensity,
      flipped,
      callbacks: {
        onSquareClick: (position) => callbacksRef.current.onSquareClick(position),
        onHoverSquare: () => undefined,
        onAnimationComplete: (id) => callbacksRef.current.onAnimationComplete(id)
      }
    });
    sceneRef.current = scene;
    scene.setBoard(board);
    scene.setSelection(selectedId, legalMoves);
    scene.setCheckedPiece(checkedId);
    scene.setLastMove(lastMove?.from ?? null, lastMove?.to ?? null);
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

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
    if (victoryToken > 0) sceneRef.current?.playVictory(victoryColor);
  }, [victoryToken, victoryColor]);

  return <div ref={containerRef} className="chess-board-canvas" />;
});
