import { BrainCircuit, LoaderCircle, Sparkles, X } from 'lucide-react';
import type { MoveAnalysis } from '../types/chess';
import { useDialogFocus } from './useDialogFocus';

interface AnalysisPanelProps {
  open: boolean;
  analysis: MoveAnalysis | null;
  analyzing: boolean;
  onAnalyze: () => void;
  onClose: () => void;
}

function scoreText(score: number): string {
  if (score > 80000) return '必胜';
  if (score < -80000) return '危险';
  return `${score >= 0 ? '+' : ''}${Math.round(score)}`;
}

export function AnalysisPanel({ open, analysis, analyzing, onAnalyze, onClose }: AnalysisPanelProps) {
  const panelRef = useDialogFocus(open, onClose);
  if (!open) return null;
  return (
    <div className="modal-layer analysis-layer" role="dialog" aria-modal="true" aria-labelledby="analysis-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="关闭局面分析" />
      <section ref={panelRef} className="analysis-panel">
        <button className="panel-close" onClick={onClose} aria-label="关闭局面分析"><X size={18} /></button>
        <header>
          <span className="setup-kicker"><BrainCircuit size={14} />AI 局面分析</span>
          <h2 id="analysis-title">看懂下一步为什么这样走</h2>
          <p>使用当前难度搜索评估，不修改棋局。分数从当前行棋方视角计算。</p>
        </header>
        {analysis ? (
          <>
            <div className="analysis-score">
              <span><small>局面评分</small><b>{scoreText(analysis.score)}</b></span>
              <div><i style={{ width: `${Math.min(96, Math.max(4, 50 + analysis.score / 40))}%` }} /></div>
              <span><small>推荐着法</small><b>{analysis.bestMove?.notation ?? '无合法着法'}</b></span>
            </div>
            <div className="analysis-explanation">
              <Sparkles size={18} />
              <div><strong>分析结论</strong><p>{analysis.explanation}</p></div>
            </div>
            <div className="analysis-metrics">
              <span>搜索深度 <b>{analysis.depth}</b></span>
              <span>节点 <b>{analysis.nodes.toLocaleString()}</b></span>
              <span>耗时 <b>{analysis.elapsed} ms</b></span>
            </div>
          </>
        ) : (
          <div className="analysis-placeholder">
            <BrainCircuit size={32} />
            <strong>还没有分析当前局面</strong>
            <p>分析会给出推荐着法、评分和理由，适合复盘和验证自己的想法。</p>
          </div>
        )}
        <div className="analysis-actions">
          <button onClick={onClose}>返回棋局</button>
          <button className="panel-primary" onClick={onAnalyze} disabled={analyzing}>
            {analyzing ? <LoaderCircle className="spin" size={16} /> : <BrainCircuit size={16} />}
            {analyzing ? '正在分析' : analysis ? '重新分析' : '开始分析'}
          </button>
        </div>
      </section>
    </div>
  );
}
