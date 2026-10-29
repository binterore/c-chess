import { useMemo, useState } from 'react';
import { Eraser, RotateCcw, Trash2, X } from 'lucide-react';
import type { BoardState, Piece, PieceColor, PieceType, Position } from '../types/chess';
import { createEmptyBoard, createInitialBoard, findGeneral, isInCheck } from '../engine/rules';
import { PIECE_GLYPHS } from '../i18n/chess';
import { useDialogFocus } from './useDialogFocus';

interface BoardEditorProps {
  initialBoard?: BoardState;
  initialTurn?: PieceColor;
  onStart: (board: BoardState, turn: PieceColor) => void;
  onClose: () => void;
}

type Tool = { color: PieceColor; type: PieceType } | null;

const pieces: Array<{ type: PieceType; name: string }> = [
  { type: 'general', name: '将帅' },
  { type: 'advisor', name: '士仕' },
  { type: 'elephant', name: '象相' },
  { type: 'horse', name: '马' },
  { type: 'chariot', name: '车' },
  { type: 'cannon', name: '炮' },
  { type: 'soldier', name: '兵卒' }
];

function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

export function BoardEditor({ initialBoard, initialTurn = 'red', onStart, onClose }: BoardEditorProps) {
  const [board, setBoard] = useState<BoardState>(() => cloneBoard(initialBoard ?? createInitialBoard()));
  const [tool, setTool] = useState<Tool>({ color: 'red', type: 'general' });
  const [turn, setTurn] = useState<PieceColor>(initialTurn);
  const [error, setError] = useState('');
  const nextId = useMemo(() => ({ value: Date.now() }), []);
  const panelRef = useDialogFocus(true, onClose);

  const place = (position: Position) => {
    setBoard((current) => {
      const next = cloneBoard(current);
      const [x, y] = position;
      if (!tool) {
        next[y][x] = null;
      } else {
        nextId.value += 1;
        const piece: Piece = { ...tool, id: `custom_${tool.color}_${tool.type}_${nextId.value}` };
        next[y][x] = piece;
      }
      return next;
    });
    setError('');
  };

  const submit = () => {
    if (!findGeneral(board, 'red') || !findGeneral(board, 'black')) {
      setError('红黑双方都必须各有一枚将帅。');
      return;
    }
    const opponent = turn === 'red' ? 'black' : 'red';
    if (isInCheck(board, opponent)) {
      setError('非行棋方的将帅正处于被将军状态，请调整局面。');
      return;
    }
    onStart(board, turn);
  };

  return (
    <div className="modal-layer editor-layer" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="关闭摆棋" />
      <section ref={panelRef} className="editor-panel">
        <button className="panel-close" onClick={onClose} aria-label="关闭摆棋"><X size={18} /></button>
        <header className="editor-header">
          <span className="setup-kicker">自由摆棋</span>
          <h2 id="editor-title">从任意局面开始</h2>
          <p>选择棋子后点击棋盘放置；选择橡皮后点击可移除棋子。</p>
        </header>
        <div className="editor-layout">
          <div className="editor-board" aria-label="摆棋棋盘">
            {Array.from({ length: 90 }, (_, index) => {
              const x = index % 9;
              const y = Math.floor(index / 9);
              const piece = board[y][x];
              return (
                <button key={index} onClick={() => place([x, y])} className={piece ? `${piece.color}-piece` : ''} aria-label={`${String.fromCharCode(65 + x)}${10 - y}${piece ? ` ${piece.type}` : ''}`}>
                  {piece ? PIECE_GLYPHS[piece.color][piece.type] : ''}
                </button>
              );
            })}
          </div>
          <div className="editor-tools">
            {(['red', 'black'] as const).map((color) => (
              <div className="editor-palette" key={color}>
                <strong>{color === 'red' ? '红方棋子' : '黑方棋子'}</strong>
                <div>
                  {pieces.map((piece) => (
                    <button key={piece.type} className={`${tool?.color === color && tool.type === piece.type ? 'active' : ''} ${color}-piece`} onClick={() => setTool({ color, type: piece.type })} title={piece.name}>
                      {PIECE_GLYPHS[color][piece.type]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="editor-common-tools">
              <button className={tool === null ? 'active' : ''} onClick={() => setTool(null)}><Eraser size={15} />橡皮</button>
              <button onClick={() => setBoard(createEmptyBoard())}><Trash2 size={15} />清空</button>
              <button onClick={() => setBoard(createInitialBoard())}><RotateCcw size={15} />初始局面</button>
            </div>
            <label className="editor-turn">先行方
              <span>
                <button className={turn === 'red' ? 'active' : ''} onClick={() => setTurn('red')}>红方</button>
                <button className={turn === 'black' ? 'active' : ''} onClick={() => setTurn('black')}>黑方</button>
              </span>
            </label>
            {error && <p className="editor-error">{error}</p>}
            <button className="panel-primary" onClick={submit}>从当前局面开始</button>
          </div>
        </div>
      </section>
    </div>
  );
}
