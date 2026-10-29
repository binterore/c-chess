import {
  BookOpen,
  BrainCircuit,
  Library,
  ChevronRight,
  CircleDot,
  Flag,
  Gem,
  ScrollText,
  Settings,
  Sparkles,
  Swords,
  Users,
  Volume2,
  VolumeX
} from 'lucide-react';
import { copy } from '../i18n';
import type { BoardSkin, BoardState, GameMode, Position, QualityLevel, RenderMode } from '../types/chess';
import { ChessBoard } from './ChessBoard';

interface HomeScreenProps {
  board: BoardState;
  skin: BoardSkin;
  quality: QualityLevel;
  renderMode: RenderMode;
  soundOn: boolean;
  onMode: (mode: Exclude<GameMode, 'puzzle'> | 'puzzle') => void;
  onToggleSound: () => void;
  onSettings: () => void;
  onDaily: () => void;
  onArchive: () => void;
  onRules: () => void;
  onCollection: () => void;
}

const modes = [
  { key: 'ai' as const, icon: BrainCircuit, title: copy.home.playTitle, description: copy.home.playDesc, index: '01' },
  { key: 'puzzle' as const, icon: Flag, title: copy.home.puzzleTitle, description: copy.home.puzzleDesc, index: '02' },
  { key: 'online' as const, icon: Users, title: copy.home.onlineTitle, description: copy.home.onlineDesc, index: '03' },
  { key: 'local' as const, icon: Swords, title: copy.home.localTitle, description: copy.home.localDesc, index: '04' }
];

export function HomeScreen({
  board,
  skin,
  quality,
  renderMode,
  soundOn,
  onMode,
  onToggleSound,
  onSettings,
  onDaily,
  onArchive,
  onRules,
  onCollection
}: HomeScreenProps) {
  return (
    <div className="home-screen">
      <div className="home-scene">
        <ChessBoard
          board={board}
          selectedId={null}
          legalMoves={[]}
          checkedId={null}
          lastMove={null}
          visualMove={null}
          skin={skin}
          intensity="full"
          quality={quality}
          renderMode={renderMode}
          flipped={false}
          idle
          onSquareClick={(_position: Position) => undefined}
          onAnimationComplete={() => undefined}
        />
      </div>
      <div className="home-vignette" />
      <div className="home-grain" />

      <header className="site-header">
        <button className="brand-lockup" onClick={() => undefined} aria-label={copy.brand.name}>
          <span className="brand-seal">{copy.brand.name.charAt(0)}</span>
          <span className="brand-words">
            <strong>{copy.brand.name}</strong>
            <small>{copy.brand.latin}</small>
          </span>
        </button>
        <nav className="top-nav" aria-label="Primary">
          <button onClick={() => onMode('ai')}>{copy.nav.battle}</button>
          <button onClick={() => onMode('puzzle')}>{copy.nav.puzzles}</button>
          <button onClick={() => onMode('online')}>{copy.nav.online}</button>
          <button onClick={onArchive}>{copy.nav.archive}</button>
        </nav>
        <div className="header-actions">
          <button className="round-action" onClick={onToggleSound} aria-label={soundOn ? copy.game.soundOn : copy.game.soundOff}>
            {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button className="round-action" onClick={onCollection} aria-label="棋具工坊"><Gem size={17} /></button>
          <button className="round-action" onClick={onRules} aria-label="新手规则">
            <BookOpen size={17} />
          </button>
          <button className="round-action" onClick={onSettings} aria-label={copy.nav.settings}>
            <Settings size={17} />
          </button>
        </div>
      </header>

      <main className="home-layout">
        <section className="hero-copy">
          <div className="hero-eyebrow">
            <span className="eyebrow-line" />
            <span>{copy.home.eyebrow}</span>
          </div>
          <h1>
            <span>{copy.home.titleLead}</span>
            <em>{copy.home.titleAccent}</em>
          </h1>
          <p className="hero-intro">{copy.home.intro}</p>
          <div className="hero-cta-row">
            <button className="primary-cta" onClick={() => onMode('ai')}>
              <span>{copy.home.enter}</span>
              <Swords size={18} />
            </button>
            <button className="text-cta" onClick={() => onMode('puzzle')}>
              <CircleDot size={15} />
              <span>{copy.home.explore}</span>
            </button>
          </div>
          <div className="hero-metrics">
            <span><b>32</b>{copy.home.statusPieces.replace('32 ', '')}</span>
            <span><b>04</b>{copy.home.statusModes.replace('4 ', '')}</span>
            <span><b>3D</b>{copy.brand.subtitle}</span>
          </div>
        </section>

        <div className="battle-seal" aria-hidden="true">
          <span>{copy.board.seal}</span>
          <small>{copy.brand.motto}</small>
        </div>

        <aside className="mode-dock">
          <div className="mode-dock-head">
            <div>
              <small>{copy.home.scroll}</small>
              <strong>{copy.brand.subtitle}</strong>
            </div>
            <Sparkles size={18} />
          </div>
          <div className="mode-list">
            {modes.map(({ key, icon: Icon, title, description, index }) => (
              <button key={key} className={`mode-card mode-${key}`} onClick={() => onMode(key)}>
                <span className="mode-index">{index}</span>
                <span className="mode-icon"><Icon size={19} strokeWidth={1.6} /></span>
                <span className="mode-copy">
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <ChevronRight className="mode-arrow" size={16} />
              </button>
            ))}
          </div>
          <div className="home-dock-actions">
            <button className="daily-strip" onClick={onDaily}>
              <span className="daily-icon"><ScrollText size={16} /></span>
              <span>
                <strong>{copy.home.dailyTitle}</strong>
                <small>{copy.home.dailyDesc}</small>
              </span>
              <ChevronRight size={15} />
            </button>
            <button className="daily-strip archive-strip" onClick={onArchive}>
              <span className="daily-icon"><Library size={16} /></span>
              <span><strong>棋谱库</strong><small>复盘、导入与导出完整对局</small></span>
              <ChevronRight size={15} />
            </button>
          </div>
        </aside>
      </main>

      <footer className="home-footer">
        <span>{copy.footer.line}</span>
        <span className="interaction-hint">{copy.home.dragHint}</span>
        <span>{copy.footer.rights}</span>
      </footer>
    </div>
  );
}
