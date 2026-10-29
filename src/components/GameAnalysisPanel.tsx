import { BrainCircuit, LoaderCircle, X } from 'lucide-react';
import type { GameAnalysisReport } from '../types/chess';
import { useDialogFocus } from './useDialogFocus';

const verdictText = {
  best: '最佳',
  good: '合理',
  inaccuracy: '欠佳',
  mistake: '失误',
  blunder: '漏着'
} as const;

export function GameAnalysisPanel({
  open,
  report,
  progress,
  analyzing,
  onAnalyze,
  onClose
}: {
  open: boolean;
  report: GameAnalysisReport | null;
  progress: number;
  analyzing: boolean;
  onAnalyze: () => void;
  onClose: () => void;
}) {
  const panelRef = useDialogFocus(open, onClose);
  if (!open) return null;
  return (
    <div className="modal-layer game-analysis-layer" role="dialog" aria-modal="true" aria-labelledby="game-analysis-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="关闭全盘分析" />
      <section ref={panelRef} className="game-analysis-panel">
        <button className="panel-close" onClick={onClose} aria-label="关闭全盘分析"><X size={18} /></button>
        <header>
          <span className="setup-kicker"><BrainCircuit size={14} />全盘分析</span>
          <h2 id="game-analysis-title">逐着评估与失误定位</h2>
          <p>比较每步实际着法与 AI 推荐着法。浅层快速分析用于复盘定位，不等同于专业引擎评分。</p>
        </header>
        {analyzing && (
          <div className="analysis-progress"><LoaderCircle className="spin" size={19} /><span>正在分析 {Math.round(progress * 100)}%</span><i><b style={{ width: `${progress * 100}%` }} /></i></div>
        )}
        {report ? (
          <>
            <div className="game-analysis-summary">
              <span><small>稳定率</small><b>{report.accuracy}%</b></span>
              <span><small>失误</small><b>{report.mistakes}</b></span>
              <span><small>漏着</small><b>{report.blunders}</b></span>
              <span><small>总着数</small><b>{report.moves.length}</b></span>
            </div>
            <div className="game-analysis-moves">
              {report.moves.map((move) => (
                <div key={move.ply} className={`verdict-${move.verdict}`}>
                  <span>{move.ply + 1}</span>
                  <strong>{move.notation}</strong>
                  <b>{verdictText[move.verdict]}</b>
                  <small>{move.bestMove && move.verdict !== 'best' ? `推荐 ${move.bestMove.notation}` : `评分 ${move.evaluation}`}</small>
                </div>
              ))}
            </div>
          </>
        ) : !analyzing && (
          <div className="analysis-placeholder"><BrainCircuit size={32} /><strong>尚未进行全盘分析</strong><p>分析会增加一次后台计算，不会修改棋谱。</p></div>
        )}
        <div className="analysis-actions">
          <button onClick={onClose}>返回棋谱</button>
          <button className="panel-primary" onClick={onAnalyze} disabled={analyzing}><BrainCircuit size={16} />{report ? '重新分析全盘' : '分析全盘'}</button>
        </div>
      </section>
    </div>
  );
}
