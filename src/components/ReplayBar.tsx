import { BrainCircuit, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Download, Play, Share2, X } from 'lucide-react';
import type { GameRecord } from '../types/chess';

interface ReplayBarProps {
  record: GameRecord;
  index: number;
  onSeek: (index: number) => void;
  onAnalyze: () => void;
  onAnalyzeGame: () => void;
  onContinue: () => void;
  onExport: () => void;
  onShare: () => void;
  onExit: () => void;
}

export function ReplayBar({ record, index, onSeek, onAnalyze, onAnalyzeGame, onContinue, onExport, onShare, onExit }: ReplayBarProps) {
  return (
    <div className="replay-bar" role="toolbar" aria-label="棋谱复盘控制">
      <div className="replay-title">
        <small>棋谱复盘</small>
        <strong>{record.redName} <i>VS</i> {record.blackName}</strong>
      </div>
      <div className="replay-buttons">
        <button onClick={() => onSeek(0)} aria-label="回到开局"><ChevronFirst size={17} /></button>
        <button onClick={() => onSeek(index - 1)} disabled={index <= 0} aria-label="上一步"><ChevronLeft size={17} /></button>
        <span>{index} / {record.history.length}</span>
        <button onClick={() => onSeek(index + 1)} disabled={index >= record.history.length} aria-label="下一步"><ChevronRight size={17} /></button>
        <button onClick={() => onSeek(record.history.length)} aria-label="跳到最后"><ChevronLast size={17} /></button>
      </div>
      <div className="replay-actions">
        <button onClick={onAnalyze}><BrainCircuit size={16} />当前局面</button>
        <button onClick={onAnalyzeGame}><BrainCircuit size={16} />全盘分析</button>
        <button onClick={onContinue} disabled={index >= record.history.length}><Play size={16} />从此继续</button>
        <button onClick={onExport}><Download size={16} />导出</button>
        <button onClick={onShare}><Share2 size={16} />分享</button>
        <button onClick={onExit}><X size={16} />退出</button>
      </div>
    </div>
  );
}
