import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, X } from 'lucide-react';
import type { PieceColor, PieceType, Position } from '../types/chess';
import { PIECE_GLYPHS } from '../i18n/chess';
import { useDialogFocus } from './useDialogFocus';

interface RuleEntry {
  color: PieceColor;
  type: PieceType;
  name: string;
  short: string;
  description: string;
  from: Position;
  targets: Position[];
}

const rules: RuleEntry[] = [
  { color: 'red', type: 'general', name: '将 / 帅', short: '九宫一步', description: '只能在九宫内上下左右走一步；双方将帅不能在同一直线上无遮挡照面。', from: [4, 8], targets: [[4, 7], [3, 8], [5, 8]] },
  { color: 'red', type: 'advisor', name: '士 / 仕', short: '斜走一步', description: '只能在九宫内沿斜线走一步，负责保护将帅。', from: [4, 8], targets: [[3, 7], [5, 7]] },
  { color: 'red', type: 'elephant', name: '象 / 相', short: '田字守境', description: '走田字，象眼被堵时不能走，且不能越过楚河汉界。', from: [2, 9], targets: [[0, 7], [4, 7]] },
  { color: 'red', type: 'horse', name: '马', short: '日字蹩腿', description: '走日字；马腿位置有棋子时不能走。', from: [1, 9], targets: [[0, 7], [2, 7], [3, 8]] },
  { color: 'red', type: 'chariot', name: '车', short: '横直无阻', description: '沿横线或直线任意步数移动，不能越过其他棋子。', from: [0, 9], targets: [[0, 8], [0, 7], [1, 9], [2, 9], [3, 9]] },
  { color: 'red', type: 'cannon', name: '炮', short: '隔子吃子', description: '不吃子时像车一样移动；吃子时必须隔着恰好一个棋子。', from: [1, 7], targets: [[1, 6], [1, 5], [1, 4], [4, 7], [7, 7]] },
  { color: 'red', type: 'soldier', name: '兵 / 卒', short: '过河横行', description: '未过河只能向前一步；过河后还能左右走一步，任何时候都不能后退。', from: [4, 4], targets: [[4, 3], [3, 4], [5, 4]] }
];

function MiniRuleBoard({ entry }: { entry: RuleEntry }) {
  const keys = useMemo(() => new Set(entry.targets.map(([x, y]) => `${x}:${y}`)), [entry]);
  return (
    <div className="rule-mini-board" role="img" aria-label={`${entry.name}在标准中国象棋盘上的走法示意`}>
      <div className="rule-board-grid">
        {Array.from({ length: 90 }, (_, index) => {
          const x = index % 9;
          const y = Math.floor(index / 9);
          const isFrom = entry.from[0] === x && entry.from[1] === y;
          const isTarget = keys.has(`${x}:${y}`);
          return (
            <span key={index} className={`${isFrom ? 'rule-origin' : ''} ${isTarget ? 'rule-target' : ''}`}>
              {isFrom ? <b className={`${entry.color}-piece`}>{PIECE_GLYPHS[entry.color][entry.type]}</b> : isTarget ? <i /> : null}
              {isFrom && isTarget && <i className="overlap-target" />}
            </span>
          );
        })}
      </div>
      <i className="rule-palace top-a" aria-hidden="true" />
      <i className="rule-palace top-b" aria-hidden="true" />
      <i className="rule-palace bottom-a" aria-hidden="true" />
      <i className="rule-palace bottom-b" aria-hidden="true" />
      <span className="rule-river-label" aria-hidden="true">楚河 · 汉界</span>
    </div>
  );
}

export function RulesGuide({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const panelRef = useDialogFocus(true, onClose);
  const entry = rules[index];
  return (
    <div className="modal-layer rules-layer" role="dialog" aria-modal="true" aria-labelledby="rules-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="关闭规则指南" />
      <section ref={panelRef} className="rules-panel">
        <button className="panel-close" onClick={onClose} aria-label="关闭规则指南"><X size={18} /></button>
        <header className="rules-header">
          <span className="setup-kicker"><BookOpen size={14} />新手规则</span>
          <h2 id="rules-title">一子一式，看图就会</h2>
          <p>选择棋子查看走法。棋盘上的光点表示示例中的合法落点。</p>
        </header>
        <div className="rules-layout">
          <div className="rules-pieces">
            {rules.map((rule, ruleIndex) => (
              <button key={rule.type} className={ruleIndex === index ? 'active' : ''} onClick={() => setIndex(ruleIndex)}>
                <b>{PIECE_GLYPHS[rule.color][rule.type]}</b><span>{rule.name}</span><small>{rule.short}</small>
              </button>
            ))}
          </div>
          <div className="rule-demo">
            <MiniRuleBoard entry={entry} />
            <div className="rule-copy">
              <span>{entry.short}</span>
              <h3>{entry.name}</h3>
              <p>{entry.description}</p>
            </div>
          </div>
        </div>
        <footer className="rules-footer">
          <button onClick={() => setIndex((value) => (value - 1 + rules.length) % rules.length)}><ArrowLeft size={15} />上一种</button>
          <span>{index + 1} / {rules.length}</span>
          <button onClick={() => setIndex((value) => (value + 1) % rules.length)}>下一种<ArrowRight size={15} /></button>
        </footer>
      </section>
    </div>
  );
}
