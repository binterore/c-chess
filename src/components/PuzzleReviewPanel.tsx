import { RotateCcw, Route, X } from 'lucide-react';
import type { Endgame } from '../engine/endgames';
import { getEndgameBoard, getPuzzleLine } from '../engine/endgames';
import { applyMoveToSnapshot, createGameSnapshot } from '../engine/game';
import { useDialogFocus } from './useDialogFocus';

export function PuzzleReviewPanel({ puzzle, onRetry, onClose }: { puzzle: Endgame; onRetry: () => void; onClose: () => void }) {
  const panelRef = useDialogFocus(true, onClose);
  const moves = (() => {
    let snapshot = createGameSnapshot(getEndgameBoard(puzzle));
    return getPuzzleLine(puzzle).map((step, index) => {
      const result = applyMoveToSnapshot(snapshot, step.from, step.to);
      snapshot = result.snapshot;
      return { ...result.move, player: index % 2 === 0 };
    });
  })();
  return (
    <div className="modal-layer puzzle-review-layer" role="dialog" aria-modal="true" aria-labelledby="puzzle-review-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="关闭解法复盘" />
      <section ref={panelRef} className="puzzle-review-panel">
        <button className="panel-close" onClick={onClose} aria-label="关闭解法复盘"><X size={18} /></button>
        <header>
          <span className="setup-kicker"><Route size={14} />解法复盘</span>
          <h2 id="puzzle-review-title">这不是唯一答案，但这是最短杀法</h2>
          <p>红方与黑方按强制应手演示。两步题会先将军，再根据对方唯一应手完成绝杀。</p>
        </header>
        <div className="puzzle-review-line">
          {moves.map((move, index) => (
            <div key={`${index}-${move.notation}`} className={move.player ? 'player' : 'opponent'}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><small>{move.player ? '你的着法' : '对手应手'}</small><strong>{move.notation}</strong></div>
              <i>{move.kind === 'checkmate' ? '绝杀' : move.givesCheck ? '将军' : move.captured ? '吃子' : '推进'}</i>
            </div>
          ))}
        </div>
        <footer>
          <button onClick={onClose}>返回结果</button>
          <button className="panel-primary" onClick={onRetry}><RotateCcw size={16} />按正确线路再试一次</button>
        </footer>
      </section>
    </div>
  );
}
