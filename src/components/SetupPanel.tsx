import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  Check,
  ChevronRight,
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
import type { AiLevel, PieceColor } from '../types/chess';
import type { Endgame } from '../engine/endgames';
import { endgames } from '../engine/endgames';
import { copy, format } from '../i18n';
import { PIECE_GLYPHS } from '../i18n/chess';
import { puzzleCopy, type PuzzleTitleKey } from '../i18n/puzzles';
import { getPlayerName, savePlayerName } from '../services/socket';

export type SetupKind = 'ai' | 'online' | 'local' | 'puzzle';

export interface OnlineSetup {
  name: string;
  color: PieceColor | 'random';
  timeLimit: number;
  roomId?: string;
}

interface SetupPanelProps {
  kind: SetupKind;
  initialRoomCode?: string;
  puzzleProgress: string[];
  onClose: () => void;
  onStartAi: (color: PieceColor, level: AiLevel, name: string) => void;
  onCreateOnline: (options: OnlineSetup) => void;
  onJoinOnline: (roomId: string, name: string) => void;
  onStartLocal: () => void;
  onStartPuzzle: (endgame: Endgame) => void;
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
  onClose,
  onStartAi,
  onCreateOnline,
  onJoinOnline,
  onStartLocal,
  onStartPuzzle
}: SetupPanelProps) {
  const [side, setSide] = useState<PieceColor>('red');
  const [level, setLevel] = useState<AiLevel>('medium');
  const [name, setName] = useState(() => getPlayerName() || copy.setup.namePlaceholder);
  const [onlineTab, setOnlineTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [color, setColor] = useState<PieceColor | 'random'>('red');
  const [timeLimit, setTimeLimit] = useState(600);
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [selectedPuzzle, setSelectedPuzzle] = useState(() => {
    const index = endgames.findIndex((endgame) => !puzzleProgress.includes(endgame.id));
    return index >= 0 ? index : 0;
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const activePuzzle = endgames[selectedPuzzle];
  const progressPercent = Math.round((puzzleProgress.length / endgames.length) * 100);
  const grouped = useMemo(() => {
    return Array.from({ length: 5 }, (_, chapterIndex) => ({
      chapter: chapterIndex + 1,
      games: endgames.filter((endgame) => endgame.chapter === chapterIndex + 1)
    }));
  }, []);

  const normalizedName = name.trim() || copy.setup.namePlaceholder;
  const submitOnline = () => {
    savePlayerName(normalizedName);
    if (onlineTab === 'create') {
      onCreateOnline({ name: normalizedName, color, timeLimit });
    } else if (roomCode.trim().length >= 6) {
      onJoinOnline(roomCode.trim().toUpperCase(), normalizedName);
    }
  };

  return (
    <div className="modal-layer setup-layer" role="dialog" aria-modal="true">
      <button className="modal-backdrop" onClick={onClose} aria-label={copy.common.close} />
      <section className={`setup-panel setup-${kind}`}>
        <button className="panel-close" onClick={onClose} aria-label={copy.common.close}><X size={18} /></button>

        {kind === 'ai' && (
          <>
            <header className="setup-header">
              <span className="setup-kicker"><Swords size={14} />{copy.setup.aiKicker}</span>
              <h2>{copy.setup.aiTitle}</h2>
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
              <h2>{copy.setup.onlineTitle}</h2>
              <p>{copy.home.onlineDesc}</p>
            </header>

            <div className="ink-tabs">
              <button className={onlineTab === 'create' ? 'active' : ''} onClick={() => setOnlineTab('create')}>{copy.setup.createRoom}</button>
              <button className={onlineTab === 'join' ? 'active' : ''} onClick={() => setOnlineTab('join')}>{copy.setup.joinRoom}</button>
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
              </>
            ) : (
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
            )}

            <button className="panel-primary" onClick={submitOnline} disabled={onlineTab === 'join' && roomCode.length < 6}>
              <span>{onlineTab === 'create' ? copy.setup.createRoom : copy.setup.joinRoom}</span><ChevronRight size={18} />
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
            <h2>{copy.setup.localTitle}</h2>
            <p>{copy.home.localDesc}</p>
            <div className="local-facts">
              <span><Shield size={15} />{copy.setup.localFactOne}</span>
              <span><Target size={15} />{copy.setup.localFactTwo}</span>
              <span><Flame size={15} />{copy.setup.localFactThree}</span>
            </div>
            <button className="panel-primary" onClick={onStartLocal}>
              <span>{copy.setup.start}</span><DoorOpen size={18} />
            </button>
          </div>
        )}

        {kind === 'puzzle' && (
          <>
            <header className="puzzle-header">
              <div>
                <span className="setup-kicker"><ScrollText size={14} />{copy.setup.puzzleKicker}</span>
                <h2>{copy.setup.puzzleTitle}</h2>
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
