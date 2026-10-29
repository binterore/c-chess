import { Check, Crown, Gem, Lock, Sparkles, Trophy, X } from 'lucide-react';
import type { BoardSkin, GameRecord, PlayerProfile } from '../types/chess';
import { useDialogFocus } from './useDialogFocus';

const skins: Array<{ id: BoardSkin; name: string; description: string; requirement: number }> = [
  { id: 'figurine', name: '军阵玉雕', description: '立体将士兵人棋具，默认外观', requirement: 0 },
  { id: 'classic', name: '经典字章', description: '传统圆章棋子，清晰沉稳', requirement: 0 },
  { id: 'jade', name: '羊脂暖玉', description: '温润半透玉质与青玉黑方', requirement: 600 },
  { id: 'bronze', name: '宣德古铜', description: '古铜金属与岁月纹理', requirement: 1400 }
];

const tiers = [
  { points: 0, name: '初入棋道' },
  { points: 300, name: '弈者' },
  { points: 800, name: '棋士' },
  { points: 1500, name: '国手' },
  { points: 2600, name: '宗师' }
];

export function CollectionPanel({
  profile,
  records,
  skin,
  onSkin,
  onClose
}: {
  profile: PlayerProfile;
  records: GameRecord[];
  skin: BoardSkin;
  onSkin: (skin: BoardSkin) => void;
  onClose: () => void;
}) {
  const panelRef = useDialogFocus(true, onClose);
  const seasonKey = new Date().toISOString().slice(0, 7);
  const seasonRecords = records.filter((record) => new Date(record.createdAt).toISOString().slice(0, 7) === seasonKey);
  const dailyDatesThisSeason = new Set(seasonRecords.map((record) => record.dailyDate).filter(Boolean)).size;
  const points = seasonRecords.length * 40 + seasonRecords.filter((record) => record.playerColor && record.result?.winner === record.playerColor).length * 60 + seasonRecords.filter((record) => record.mode === 'puzzle' && record.result?.winner === record.playerColor).length * 25 + dailyDatesThisSeason * 30;
  const currentTierIndex = tiers.reduce((best, tier, index) => points >= tier.points ? index : best, 0);
  const currentTier = tiers[currentTierIndex];
  const nextTier = tiers[currentTierIndex + 1];
  const tierProgress = nextTier ? Math.min(1, (points - currentTier.points) / (nextTier.points - currentTier.points)) : 1;
  return (
    <div className="modal-layer collection-layer" role="dialog" aria-modal="true" aria-labelledby="collection-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="关闭棋具工坊" />
      <section ref={panelRef} className="collection-panel">
        <button className="panel-close" onClick={onClose} aria-label="关闭棋具工坊"><X size={18} /></button>
        <header>
          <span className="setup-kicker"><Sparkles size={14} />本季棋具工坊</span>
          <h2 id="collection-title">以棋力解锁收藏</h2>
          <p>{seasonKey} 赛季。积分来自本月对局、胜利、残局和每日挑战；新赛季会从零开始。</p>
        </header>
        <div className="season-card">
          <span className="season-emblem"><Crown size={23} /></span>
          <div><small>{profile.name} · 当前赛季称号</small><strong>{currentTier.name}</strong><p>{points} 赛季积分 · {nextTier ? `距离 ${nextTier.name} 还差 ${nextTier.points - points}` : '已达到最高段位'}</p></div>
          <Trophy size={24} />
          <i><b style={{ width: `${Math.round(tierProgress * 100)}%` }} /></i>
        </div>
        <div className="season-tiers">
          {tiers.map((tier, index) => <span key={tier.points} className={index <= currentTierIndex ? 'reached' : ''}><b>{tier.points}</b><small>{tier.name}</small></span>)}
        </div>
        <div className="skin-gallery">
          {skins.map((item) => {
            const unlocked = points >= item.requirement;
            return (
              <button key={item.id} disabled={!unlocked} className={`${skin === item.id ? 'active' : ''} skin-${item.id}`} onClick={() => onSkin(item.id)}>
                <span className="skin-gallery-preview"><i>将</i><i>帥</i></span>
                <span><strong>{item.name}</strong><small>{item.description}</small></span>
                <em>{skin === item.id ? <><Check size={13} />使用中</> : unlocked ? <><Gem size={13} />可使用</> : <><Lock size={13} />{item.requirement} 分</>}</em>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
