import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Archive, Copy, Download, FileUp, KeyRound, Play, Search, Trash2, X } from 'lucide-react';
import type { GameRecord, PlayerProfile } from '../types/chess';
import { recordFromIccs } from '../engine/notation';
import { setPlayerToken } from '../services/socket';
import { useDialogFocus } from './useDialogFocus';

interface ArchivePanelProps {
  records: GameRecord[];
  profile: PlayerProfile;
  onReplay: (record: GameRecord) => void;
  onImport: (record: GameRecord) => void;
  onExport: (record: GameRecord) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  friends: PlayerProfile[];
  onAddFriend: (token: string) => void;
  onRemoveFriend: (token: string) => void;
  onClose: () => void;
}

function resultText(record: GameRecord): string {
  if (!record.result) return '未结束';
  if (record.result.winner === 'draw') return '和棋';
  return record.result.winner === 'red' ? '红胜' : '黑胜';
}

function dateText(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(timestamp);
}

const modeNames: Record<string, string> = {
  ai: '人机',
  local: '同屏',
  online: '联机',
  puzzle: '残局',
  replay: '导入',
  analysis: '分析'
};

export function ArchivePanel({ records, profile, onReplay, onImport, onExport, onDelete, onClear, friends, onAddFriend, onRemoveFriend, onClose }: ArchivePanelProps) {
  const [query, setQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [fileError, setFileError] = useState('');
  const panelRef = useDialogFocus(true, onClose);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const winRate = profile.gamesPlayed ? Math.round((profile.wins / profile.gamesPlayed) * 100) : 0;
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) =>
      `${record.redName} ${record.blackName} ${modeNames[record.mode] ?? record.mode} ${resultText(record)}`.toLowerCase().includes(term)
    );
  }, [query, records]);

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setFileError('');
      const text = await file.text();
      onImport(recordFromIccs(text, file.name.replace(/\.[^.]+$/, '')));
    } catch {
      setFileError('无法导入：请确认文件包含合法的 Xiangqi FEN 与 ICCS 着法。');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="modal-layer archive-layer" role="dialog" aria-modal="true" aria-labelledby="archive-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="关闭棋谱库" />
      <section ref={panelRef} className="archive-panel">
        <header className="archive-header">
          <div>
            <span className="setup-kicker"><Archive size={14} />棋谱库</span>
            <h2 id="archive-title">你的对局与残局记录</h2>
          </div>
          <button className="panel-close" onClick={onClose} aria-label="关闭棋谱库"><X size={18} /></button>
        </header>

        <div className="profile-summary">
          <div className="profile-name">
            <span>{profile.name.charAt(0) || '棋'}</span>
            <div><strong>{profile.name}</strong><small>本地与联机战绩</small></div>
          </div>
          <dl>
            <div><dt>对局</dt><dd>{profile.gamesPlayed}</dd></div>
            <div><dt>胜率</dt><dd>{winRate}%</dd></div>
            <div><dt>残局</dt><dd>{profile.puzzlesSolved}</dd></div>
            <div><dt>着数</dt><dd>{profile.totalMoves}</dd></div>
          </dl>
        </div>

        <div className="account-sync">
          <div><KeyRound size={16} /><span><strong>跨设备同步码</strong><small>在另一台设备输入同一同步码即可读取服务端棋谱与战绩</small></span></div>
          <code>{profile.id}</code>
          <button onClick={() => void navigator.clipboard.writeText(profile.id)}><Copy size={14} />复制</button>
          <span className="sync-input"><input value={syncCode} onChange={(event) => setSyncCode(event.target.value)} placeholder="粘贴同步码" /><button onClick={() => { if (setPlayerToken(syncCode)) window.location.reload(); }}>切换档案</button></span>
        </div>

        <div className="friends-panel">
          <div className="friends-heading"><strong>好友棋手</strong><span>{friends.length} 位</span></div>
          <div className="friends-add"><input value={friendCode} onChange={(event) => setFriendCode(event.target.value)} placeholder="输入对方同步码添加好友" /><button onClick={() => { if (friendCode.trim()) { onAddFriend(friendCode); setFriendCode(''); } }}>添加</button></div>
          <div className="friends-list">
            {friends.length === 0 ? <small>添加好友后，双方档案、战绩和残局进度可通过服务端同步。</small> : friends.map((friend) => (
              <span key={friend.id}><b>{friend.name}</b><small>{friend.gamesPlayed} 局 · {friend.gamesPlayed ? Math.round((friend.wins / friend.gamesPlayed) * 100) : 0}% 胜率</small><button onClick={() => onRemoveFriend(friend.id)}>移除</button></span>
            ))}
          </div>
        </div>

        <div className="archive-toolbar">
          <label className="archive-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索对手、模式或结果" /></label>
          <button onClick={() => fileRef.current?.click()}><FileUp size={16} />导入棋谱</button>
          <input ref={fileRef} type="file" accept=".xq,.txt,.pgn,.iccs" hidden onChange={importFile} />
          {records.length > 0 && (
            <button className="archive-clear" onClick={() => {
              if (confirmClear) { onClear(); setConfirmClear(false); } else setConfirmClear(true);
            }}><Trash2 size={15} />{confirmClear ? '确认清空全部' : '清空'}</button>
          )}
        </div>

        {fileError && <p className="archive-error">{fileError}</p>}

        <div className="archive-list">
          {filtered.length === 0 ? (
            <div className="archive-empty">
              <Archive size={28} />
              <strong>{records.length ? '没有匹配的棋谱' : '还没有保存的对局'}</strong>
              <p>完成一局对弈后会自动保存，也可以从文件导入 Xiangqi FEN/ICCS 棋谱。</p>
            </div>
          ) : filtered.map((record) => (
            <article className="archive-record" key={record.id}>
              <button className="archive-record-main" onClick={() => onReplay(record)}>
                <span className="record-mode">{record.dailyDate ? '每日' : modeNames[record.mode] ?? record.mode}</span>
                <span className="record-players"><b>{record.redName}</b><i>VS</i><b>{record.blackName}</b></span>
                <span className={`record-result ${record.result?.winner ?? 'open'}`}>{resultText(record)}</span>
                <span className="record-meta">{dateText(record.createdAt)} · {record.history.length} 着</span>
                <Play size={15} />
              </button>
              <div className="record-actions">
                <button onClick={() => onExport(record)} aria-label="导出棋谱"><Download size={15} /></button>
                <button onClick={() => onDelete(record.id)} aria-label="删除棋谱"><Trash2 size={15} /></button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
