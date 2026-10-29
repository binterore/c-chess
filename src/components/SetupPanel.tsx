import { useMemo, useState, type CSSProperties } from 'react';
import {
  Check,
  ChevronRight,
  CalendarDays,
  Clock3,
  Crown,
  DoorOpen,
  Flame,
  Link2,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Target,
  Users,
  X
} from 'lucide-react';
import type { AiLevel, LobbyRoom, PieceColor } from '../types/chess';
import type { Endgame } from '../engine/endgames';
import { endgames } from '../engine/endgames';
import { copy, format } from '../i18n';
import { PIECE_GLYPHS } from '../i18n/chess';
import { puzzleCopy, type PuzzleTitleKey } from '../i18n/puzzles';
import { getPlayerName, savePlayerName } from '../services/socket';
import { useDialogFocus } from './useDialogFocus';

export type SetupKind = 'ai' | 'online' | 'local' | 'puzzle' | 'daily';

export interface OnlineSetup {
  name: string;
  color: PieceColor | 'random';
  timeLimit: number;
  increment: number;
  visibility?: 'public' | 'private';
  password?: string;
  roomId?: string;
}

interface SetupPanelProps {
  kind: SetupKind;
  initialRoomCode?: string;
  puzzleProgress: string[];
  dailyPuzzle?: Endgame;
  dailyDate?: string;
  dailySolved?: boolean;
  dailyStreak?: number;
  lobbyRooms?: LobbyRoom[];
  lobbyLoading?: boolean;
  onClose: () => void;
  onStartAi: (color: PieceColor, level: AiLevel, name: string) => void;
  onCreateOnline: (options: OnlineSetup) => void;
  onJoinOnline: (roomId: string, name: string, password?: string) => void;
  onQuickMatch: (options: OnlineSetup) => void;
  onRefreshRooms: () => void;
  onStartLocal: (timeLimit: number, increment: number) => void;
  onStartPuzzle: (endgame: Endgame) => void;
  onStartDaily: () => void;
  onOpenEditor: () => void;
  onOpenArchive: () => void;
  onOpenRules: () => void;
}

const levelOptions: Array<{ key: AiLevel; title: string; description: string; marks: number }> = [
  { key: 'easy', title: copy.setup.easy, description: copy.setup.easyDesc, marks: 1 },
  { key: 'medium', title: copy.setup.medium, description: copy.setup.mediumDesc, marks: 2 },
  { key: 'hard', title: copy.setup.hard, description: copy.setup.hardDesc, marks: 3 }
];

const timeOptions = [0, 300, 600, 1200];

export function SetupPanel({
  kind,
  initialRoomCode = '',
  puzzleProgress,
  dailyPuzzle,
  dailyDate = '',
  dailySolved = false,
  dailyStreak = 0,
  lobbyRooms = [],
  lobbyLoading = false,
  onClose,
  onStartAi,
  onCreateOnline,
  onJoinOnline,
  onQuickMatch,
  onRefreshRooms,
  onStartLocal,
  onStartPuzzle,
  onStartDaily,
  onOpenEditor,
  onOpenArchive,
  onOpenRules
}: SetupPanelProps) {
  const [side, setSide] = useState<PieceColor>('red');
  const [level, setLevel] = useState<AiLevel>('medium');
  const [name, setName] = useState(() => getPlayerName() || copy.setup.namePlaceholder);
  const [onlineTab, setOnlineTab] = useState<'create' | 'join' | 'match'>(initialRoomCode ? 'join' : 'create');
  const [color, setColor] = useState<PieceColor | 'random'>('red');
  const [timeLimit, setTimeLimit] = useState(600);
  const [increment, setIncrement] = useState(3);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [roomPassword, setRoomPassword] = useState('');
  const [localTimeLimit, setLocalTimeLimit] = useState(600);
  const [localIncrement, setLocalIncrement] = useState(3);
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [selectedPuzzle, setSelectedPuzzle] = useState(() => {
    const index = endgames.findIndex((endgame) => !puzzleProgress.includes(endgame.id));
    return index >= 0 ? index : 0;
  });


  const activePuzzle = endgames[selectedPuzzle];
  const progressPercent = Math.round((puzzleProgress.length / endgames.length) * 100);
  const grouped = useMemo(() => {
    return Array.from({ length: 5 }, (_, chapterIndex) => ({
      chapter: chapterIndex + 1,
      games: endgames.filter((endgame) => endgame.chapter === chapterIndex + 1)
    }));
  }, []);

  const panelRef = useDialogFocus(true, onClose);
  const normalizedName = name.trim() || copy.setup.namePlaceholder;
  const submitOnline = () => {
    savePlayerName(normalizedName);
    if (onlineTab === 'create') {
      onCreateOnline({ name: normalizedName, color, timeLimit, increment, visibility, password: roomPassword });
    } else if (roomCode.trim().length >= 6) {
      onJoinOnline(roomCode.trim().toUpperCase(), normalizedName, roomPassword);
    } else if (onlineTab === 'match') {
      onQuickMatch({ name: normalizedName, color, timeLimit, increment, visibility: 'public' });
    }
  };

  return (
    <div className="modal-layer setup-layer" role="dialog" aria-modal="true">
      <button className="modal-backdrop" onClick={onClose} aria-label={copy.common.close} />
      <section ref={panelRef} className={`setup-panel setup-${kind}`} aria-labelledby="setup-title">
        <button className="panel-close" onClick={onClose} aria-label={copy.common.close}><X size={18} /></button>

        {kind === 'ai' && (
          <>
            <header className="setup-header">
              <span className="setup-kicker"><Swords size={14} />{copy.setup.aiKicker}</span>
              <h2 id="setup-title">{copy.setup.aiTitle}</h2>
              <p>{copy.setup.mediumDesc}</p>
            </header>

            <div className="setup-section">
              <label className="setup-label">{copy.setup.name}</label>
              <input className="ink-input" value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.setup.namePlaceholder} maxLength={24} />
            </div>

            <div className="setup-section">
              <label className="setup-label">{copy.setup.side}</label>
              <div className="side-select">
                <button className={side === 'red' ? 'active red' : ''} onClick={() => setSide('red')}>
                  <span className="piece-token red-piece">{PIECE_GLYPHS.red.general}</span>
                  <span><b>{copy.setup.red}</b><small>{copy.setup.first}</small></span>
                </button>
                <button className={side === 'black' ? 'active black' : ''} onClick={() => setSide('black')}>
                  <span className="piece-token black-piece">{PIECE_GLYPHS.black.general}</span>
                  <span><b>{copy.setup.black}</b><small>{copy.setup.second}</small></span>
                </button>
              </div>
            </div>

            <div className="setup-section">
              <label className="setup-label">{copy.setup.difficulty}</label>
              <div className="difficulty-list">
                {levelOptions.map((option) => (
                  <button key={option.key} className={level === option.key ? 'active' : ''} onClick={() => setLevel(option.key)}>
                    <span className="difficulty-mark">
                      {Array.from({ length: 3 }, (_, index) => <i key={index} className={index < option.marks ? 'lit' : ''} />)}
                    </span>
                    <span><b>{option.title}</b><small>{option.description}</small></span>
                    {level === option.key && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="setup-secondary-actions">
              <button onClick={onOpenEditor}>自由摆棋</button>
              <button onClick={onOpenRules}>查看规则</button>
              <button onClick={onOpenArchive}>棋谱库</button>
            </div>
            <button className="panel-primary" onClick={() => {
                savePlayerName(normalizedName);
                onStartAi(side, level, normalizedName);
              }}>
              <span>{copy.setup.start}</span><Swords size={18} />
            </button>
          </>
        )}

        {kind === 'online' && (
          <>
            <header className="setup-header">
              <span className="setup-kicker"><Users size={14} />{copy.setup.onlineKicker}</span>
              <h2 id="setup-title">{copy.setup.onlineTitle}</h2>
              <p>{copy.home.onlineDesc}</p>
            </header>

            <div className="ink-tabs">
              <button className={onlineTab === 'create' ? 'active' : ''} onClick={() => setOnlineTab('create')}>{copy.setup.createRoom}</button>
              <button className={onlineTab === 'join' ? 'active' : ''} onClick={() => setOnlineTab('join')}>{copy.setup.joinRoom}</button>
              <button className={onlineTab === 'match' ? 'active' : ''} onClick={() => { setOnlineTab('match'); onRefreshRooms(); }}>公开房</button>
            </div>

            <div className="setup-section">
              <label className="setup-label">{copy.setup.name}</label>
              <input className="ink-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={24} />
            </div>

            {onlineTab === 'create' ? (
              <>
                <div className="setup-section">
                  <label className="setup-label">{copy.setup.colorChoice}</label>
                  <div className="color-choices">
                    <button className={color === 'red' ? 'active red' : ''} onClick={() => setColor('red')}><span className="piece-token red-piece">{PIECE_GLYPHS.red.general}</span>{copy.setup.redShort}</button>
                    <button className={color === 'black' ? 'active black' : ''} onClick={() => setColor('black')}><span className="piece-token black-piece">{PIECE_GLYPHS.black.general}</span>{copy.setup.blackShort}</button>
                    <button className={color === 'random' ? 'active' : ''} onClick={() => setColor('random')}><Sparkles size={17} />{copy.setup.random}</button>
                  </div>
                </div>
                <div className="setup-section">
                  <label className="setup-label"><Clock3 size={14} />{copy.setup.timeLimit}</label>
                  <div className="time-options">
                    {timeOptions.map((seconds) => (
                      <button key={seconds} className={timeLimit === seconds ? 'active' : ''} onClick={() => setTimeLimit(seconds)}>
                        {seconds === 0 ? copy.setup.unlimited : format(copy.setup.minutes, { count: seconds / 60 })}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="setup-section">
                  <label className="setup-label"><Clock3 size={14} />每步加秒</label>
                  <div className="time-options">
                    {[0, 2, 3, 5, 10].map((seconds) => (
                      <button key={seconds} className={increment === seconds ? 'active' : ''} onClick={() => setIncrement(seconds)}>{seconds} 秒</button>
                    ))}
                  </div>
                </div>
                <div className="setup-section">
                  <label className="setup-label"><Users size={14} />房间可见性</label>
                  <div className="time-options">
                    <button className={visibility === 'public' ? 'active' : ''} onClick={() => setVisibility('public')}>公开房</button>
                    <button className={visibility === 'private' ? 'active' : ''} onClick={() => setVisibility('private')}>仅邀请</button>
                  </div>
                </div>
                {visibility === 'private' && <input className="ink-input" type="password" value={roomPassword} onChange={(event) => setRoomPassword(event.target.value.slice(0, 20))} placeholder="可选 4–20 位房间密码" />}
              </>
            ) : onlineTab === 'join' ? (
              <>
              <div className="setup-section join-section">
                <label className="setup-label"><Link2 size={14} />{copy.setup.roomCode}</label>
                <input
                  className="ink-input code-input"
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder={copy.setup.roomCodePlaceholder}
                  autoFocus
                />
              </div>
              <div className="setup-section">
                <label className="setup-label"><Shield size={14} />房间密码（公开房可留空）</label>
                <input className="ink-input" type="password" value={roomPassword} onChange={(event) => setRoomPassword(event.target.value.slice(0, 20))} placeholder="输入房主设置的密码" />
              </div>
              </>
            ) : (
              <div className="public-lobby">
                <div className="public-lobby-head"><span>等待中的公开棋席</span><button onClick={onRefreshRooms}>{lobbyLoading ? '刷新中…' : '刷新'}</button></div>
                {lobbyRooms.length === 0 ? (
                  <div className="lobby-empty"><Users size={24} /><p>暂时没有公开房，点击下方按钮自动创建或加入。</p></div>
                ) : lobbyRooms.map((room) => (
                  <button className="lobby-room" key={room.id} onClick={() => onJoinOnline(room.id, normalizedName)}>
                    <span>{room.hostName}</span>
                    <b>{room.id}</b>
                    <small>{room.timeLimit ? `${Math.round(room.timeLimit / 60)} 分` : '不限时'} · +{room.increment}秒</small>
                  </button>
                ))}
              </div>
            )}

            <button className="panel-primary" onClick={submitOnline} disabled={onlineTab === 'join' && roomCode.length < 6}>
              <span>{onlineTab === 'create' ? copy.setup.createRoom : onlineTab === 'join' ? copy.setup.joinRoom : '快速匹配'}</span><ChevronRight size={18} />
            </button>
          </>
        )}

        {kind === 'local' && (
          <div className="local-setup">
            <span className="setup-kicker"><Swords size={14} />{copy.setup.localKicker}</span>
            <div className="local-emblem">
              <span className="piece-token red-piece">{PIECE_GLYPHS.red.general}</span>
              <i />
              <span className="piece-token black-piece">{PIECE_GLYPHS.black.general}</span>
            </div>
            <h2 id="setup-title">{copy.setup.localTitle}</h2>
            <p>{copy.home.localDesc}</p>
            <div className="local-facts">
              <span><Shield size={15} />{copy.setup.localFactOne}</span>
              <span><Target size={15} />{copy.setup.localFactTwo}</span>
              <span><Flame size={15} />{copy.setup.localFactThree}</span>
            </div>
            <div className="local-time-controls">
              <label>{copy.setup.timeLimit}
                <select value={localTimeLimit} onChange={(event) => setLocalTimeLimit(Number(event.target.value))}>
                  <option value={0}>{copy.setup.unlimited}</option>
                  {timeOptions.filter(Boolean).map((seconds) => <option key={seconds} value={seconds}>{format(copy.setup.minutes, { count: seconds / 60 })}</option>)}
                </select>
              </label>
              <label>每步加秒
                <select value={localIncrement} onChange={(event) => setLocalIncrement(Number(event.target.value))}>
                  {[0, 2, 3, 5, 10].map((seconds) => <option key={seconds} value={seconds}>{seconds} 秒</option>)}
                </select>
              </label>
            </div>
            <button className="panel-primary" onClick={() => onStartLocal(localTimeLimit, localIncrement)}>
              <span>{copy.setup.start}</span><DoorOpen size={18} />
            </button>
            <button className="text-action" onClick={onOpenEditor}>自由摆棋</button>
          </div>
        )}

        {kind === 'daily' && dailyPuzzle && (
          <div className="daily-panel">
            <header className="setup-header">
              <span className="setup-kicker"><CalendarDays size={14} />每日挑战</span>
              <h2 id="setup-title">{dailySolved ? '今日已完成' : '今日一局'}</h2>
              <p>{dailyDate} · 每日局面由日期稳定生成，所有玩家今天挑战同一道残局。</p>
            </header>
            <div className="daily-card">
              <span className="daily-date"><b>{dailyDate.slice(8)}</b><small>{dailyDate.slice(0, 7)}</small></span>
              <div>
                <span>第 {dailyPuzzle.chapter} 章 · {dailyPuzzle.targetMoves} 步目标</span>
                <h3>{puzzleCopy.titles[dailyPuzzle.titleKey as PuzzleTitleKey]}</h3>
                <p>连续挑战：{dailyStreak} 天 · 历史完成 {dailyDate ? '每日进度会同步到棋谱库' : '尚未开始'}</p>
              </div>
            </div>
            <div className="daily-facts">
              <span><Target size={15} />{dailyPuzzle.targetMoves} 步内取胜</span>
              <span><Crown size={15} />最佳 {dailyPuzzle.bestMoves} 步</span>
              <span><Check size={15} />{dailySolved ? '已记录今日成绩' : '完成后计入连续挑战'}</span>
            </div>
            <button className="panel-primary" onClick={onStartDaily}>
              <span>{dailySolved ? '再挑战一次' : '开始今日挑战'}</span><ChevronRight size={18} />
            </button>
            <button className="text-action" onClick={onOpenArchive}>查看历史棋谱</button>
          </div>
        )}

        {kind === 'puzzle' && (
          <>
            <header className="puzzle-header">
              <div>
                <span className="setup-kicker"><ScrollText size={14} />{copy.setup.puzzleKicker}</span>
                <h2 id="setup-title">{copy.setup.puzzleTitle}</h2>
                <p>{copy.setup.puzzleProgress}</p>
              </div>
              <div className="progress-orbit" style={{ '--progress': `${progressPercent * 3.6}deg` } as CSSProperties}>
                <span>{progressPercent}<small>%</small></span>
              </div>
            </header>

            <div className="puzzle-archive">
              {grouped.map(({ chapter, games }) => (
                <section key={chapter} className="puzzle-chapter">
                  <div className="chapter-heading">
                    <span className="chapter-number">{String(chapter).padStart(2, '0')}</span>
                    <div><strong>{puzzleCopy.chapters[chapter - 1].name}</strong><small>{puzzleCopy.chapters[chapter - 1].subtitle}</small></div>
                  </div>
                  <div className="puzzle-grid">
                    {games.map((game) => {
                      const index = endgames.findIndex((item) => item.id === game.id);
                      const solved = puzzleProgress.includes(game.id);
                      return (
                        <button
                          key={game.id}
                          className={`${selectedPuzzle === index ? 'active' : ''} ${solved ? 'solved' : ''}`}
                          onClick={() => setSelectedPuzzle(index)}
                        >
                          <span>{solved ? <Check size={15} /> : String(index + 1).padStart(2, '0')}</span>
                          <b>{puzzleCopy.titles[game.titleKey as PuzzleTitleKey]}</b>
                          <small>{format(copy.setup.movesLimit, { count: game.targetMoves })}</small>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <footer className="puzzle-startbar">
              <div>
                <small>{copy.game.puzzleChapter.replace('{chapter}', String(activePuzzle.chapter)).replace('{name}', puzzleCopy.chapters[activePuzzle.chapter - 1].name)}</small>
                <strong>{puzzleCopy.titles[activePuzzle.titleKey as PuzzleTitleKey]}</strong>
              </div>
              <div className="puzzle-badges">
                <span><Crown size={14} />{format(copy.setup.bestMoves, { count: activePuzzle.bestMoves })}</span>
                <button className="panel-primary compact" onClick={() => onStartPuzzle(activePuzzle)}>
                  {copy.setup.startPuzzle}<ChevronRight size={16} />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
