import { useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Eye,
  Flag,
  Home,
  MonitorUp,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import type {
  BoardSkin,
  EffectIntensity,
  GameMode,
  GameResult,
  PieceColor
} from '../types/chess';
import type { Endgame } from '../engine/endgames';
import { copy, format } from '../i18n';
import { PIECE_GLYPHS } from '../i18n/chess';
import { puzzleCopy, type PuzzleTitleKey } from '../i18n/puzzles';

interface ResultOverlayProps {
  open: boolean;
  result: GameResult | null;
  mode: GameMode;
  playerColor: PieceColor;
  isSpectator: boolean;
  moveCount: number;
  puzzle: Endgame | null;
  puzzleFailed: boolean;
  hasNextPuzzle: boolean;
  onClose: () => void;
  onReplay: () => void;
  onHome: () => void;
  onNextPuzzle: () => void;
  onRetryPuzzle: () => void;
}

const reasonText: Record<GameResult['reason'], string> = {
  checkmate: copy.result.checkmate,
  stalemate: copy.result.stalemate,
  resignation: copy.result.resignation,
  timeout: copy.result.timeout,
  agreement: copy.result.agreement,
  'repetition-draw': copy.result.repetitionDraw,
  'perpetual-check': copy.result.perpetualCheck
};

export function ResultOverlay({
  open,
  result,
  mode,
  playerColor,
  isSpectator,
  moveCount,
  puzzle,
  puzzleFailed,
  hasNextPuzzle,
  onClose,
  onReplay,
  onHome,
  onNextPuzzle,
  onRetryPuzzle
}: ResultOverlayProps) {
  if (!open) return null;
  const win = result?.winner === playerColor;
  const draw = result?.winner === 'draw';
  const spectatorWinner = isSpectator && result && result.winner !== 'draw' ? result.winner : null;
  const puzzleWin = mode === 'puzzle' && win;
  const title = puzzleFailed
    ? copy.game.puzzleFailed
    : puzzleWin
      ? copy.game.puzzleSolved
      : draw
        ? copy.result.drawTitle
        : (mode === 'local' || spectatorWinner) && result && result.winner !== 'draw'
          ? result.winner === 'red' ? copy.result.redWin : copy.result.blackWin
          : win
            ? copy.result.victory
            : copy.result.defeat;
  const subtitle = puzzleFailed
    ? copy.game.puzzleFailedDesc
    : puzzleWin
      ? copy.game.puzzleSolvedDesc
      : result
        ? reasonText[result.reason]
        : '';
  const winnerColor = result?.winner === 'black' ? 'black' : 'red';
  const seal = draw ? copy.result.drawGlyph : PIECE_GLYPHS[winnerColor].general;

  return (
    <div className="modal-layer result-layer" role="dialog" aria-modal="true">
      <div className="result-backdrop" />
      <div className="result-rays" />
      <section className={`result-card ${spectatorWinner ? 'draw' : win ? 'victory' : draw ? 'draw' : 'defeat'} ${puzzleFailed ? 'defeat' : ''}`}>
        <div className="result-topline">
          <span><Sparkles size={14} />{copy.brand.latin}</span>
          <button onClick={onClose} aria-label={copy.result.close}><X size={18} /></button>
        </div>
        <div className="result-seal-wrap">
          <i className="result-orbit orbit-one" />
          <i className="result-orbit orbit-two" />
          <span className="result-seal">{seal}</span>
        </div>
        <small className="result-kicker">{mode === 'puzzle' ? copy.setup.puzzleKicker : copy.brand.motto}</small>
        <h2>{title}</h2>
        <p>{subtitle}</p>

        {puzzle && (
          <div className="result-puzzle-name">
            <span>{format(copy.game.puzzleChapter, { chapter: puzzle.chapter, name: puzzleCopy.chapters[puzzle.chapter - 1].name })}</span>
            <strong>{puzzleCopy.titles[puzzle.titleKey as PuzzleTitleKey]}</strong>
          </div>
        )}

        <div className="result-stats">
          <span><b>{moveCount}</b><small>{copy.result.summaryMoves}</small></span>
          <i />
          <span>
            <b>{puzzle ? puzzle.bestMoves : result?.winner === 'red' ? copy.result.redWin : result?.winner === 'black' ? copy.result.blackWin : copy.result.draw}</b>
            <small>{puzzle ? copy.result.summaryGoal : copy.result.summaryOutcome}</small>
          </span>
          <i />
          <span><b>{result ? reasonText[result.reason] : copy.game.puzzleFailed}</b><small>{copy.result.summaryReason}</small></span>
        </div>

        <div className="result-actions">
          {mode === 'puzzle' ? (
            <>
              <button className="result-secondary" onClick={onRetryPuzzle}><RotateCcw size={16} />{copy.game.tryAgain}</button>
              {hasNextPuzzle && puzzleWin ? (
                <button className="result-primary" onClick={onNextPuzzle}>{copy.game.nextPuzzle}<ArrowRight size={17} /></button>
              ) : (
                <button className="result-primary" onClick={onHome}>{copy.result.home}<Home size={17} /></button>
              )}
            </>
          ) : (
            <>
              <button className="result-secondary" onClick={onClose}><Eye size={16} />{copy.result.review}</button>
              <button className="result-primary" onClick={onReplay}><RotateCcw size={17} />{copy.result.replay}</button>
            </>
          )}
        </div>
        <button className="result-home" onClick={onHome}><Home size={14} />{copy.result.home}</button>
      </section>
    </div>
  );
}


interface PromptDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  incoming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PromptDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  incoming = false,
  onConfirm,
  onCancel
}: PromptDialogProps) {
  if (!open) return null;
  return (
    <div className="modal-layer prompt-layer" role="dialog" aria-modal="true">
      <button className="modal-backdrop" onClick={onCancel} aria-label={cancelLabel} />
      <section className={`prompt-card ${destructive ? 'destructive' : ''}`}>
        <span className="prompt-icon">{incoming ? <Flag size={22} /> : destructive ? <ShieldAlert size={22} /> : <RotateCcw size={22} />}</span>
        <small>{copy.brand.name}</small>
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="prompt-actions">
          <button onClick={onCancel}>{cancelLabel}</button>
          <button className={destructive ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}

interface SettingsDialogProps {
  open: boolean;
  intensity: EffectIntensity;
  skin: BoardSkin;
  soundOn: boolean;
  prefersReduced: boolean;
  onIntensity: (intensity: EffectIntensity) => void;
  onSkin: (skin: BoardSkin) => void;
  onSound: (enabled: boolean) => void;
  onResetView: () => void;
  onOverhead: () => void;
  onClearProgress: () => void;
  onClose: () => void;
}

export function SettingsDialog({
  open,
  intensity,
  skin,
  soundOn,
  prefersReduced,
  onIntensity,
  onSkin,
  onSound,
  onResetView,
  onOverhead,
  onClearProgress,
  onClose
}: SettingsDialogProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  if (!open) return null;
  return (
    <div className="modal-layer settings-layer" role="dialog" aria-modal="true">
      <button className="modal-backdrop" onClick={onClose} aria-label={copy.common.close} />
      <section className="settings-panel">
        <button className="panel-close" onClick={onClose}><X size={18} /></button>
        <header className="settings-header">
          <span>{copy.settings.kicker}</span>
          <h2>{copy.settings.title}</h2>
          <p>{copy.settings.subtitle}</p>
        </header>

        {prefersReduced && <div className="settings-notice"><MonitorUp size={16} />{copy.settings.reducedNotice}</div>}

        <div className="settings-group">
          <div className="settings-group-title"><strong>{copy.settings.motion}</strong><small>{copy.settings.motionDesc}</small></div>
          <div className="segmented-control">
            {(['full', 'reduced', 'off'] as const).map((value) => (
              <button key={value} className={intensity === value ? 'active' : ''} onClick={() => onIntensity(value)}>
                {value === 'full' ? copy.game.full : value === 'reduced' ? copy.game.reduced : copy.game.off}
                {intensity === value && <Check size={13} />}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-title"><strong>{copy.settings.skin}</strong><small>{copy.settings.skinDesc}</small></div>
          <div className="skin-options">
            <button className={skin === 'figurine' ? 'active' : ''} onClick={() => onSkin('figurine')}>
              <span className="skin-preview figurine-preview"><i>{PIECE_GLYPHS.red.horse}</i><i>{PIECE_GLYPHS.black.general}</i></span>
              <b>{copy.game.figurine}</b>
            </button>
            <button className={skin === 'classic' ? 'active' : ''} onClick={() => onSkin('classic')}>
              <span className="skin-preview classic-preview"><i>{PIECE_GLYPHS.red.chariot}</i><i>{PIECE_GLYPHS.black.cannon}</i></span>
              <b>{copy.game.classic}</b>
            </button>
          </div>
        </div>

        <div className="settings-split">
          <div className="settings-group compact-group">
            <div className="settings-group-title"><strong>{copy.settings.sound}</strong><small>{copy.settings.soundDesc}</small></div>
            <button className={`sound-toggle ${soundOn ? 'on' : ''}`} onClick={() => onSound(!soundOn)}>
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <span>{soundOn ? copy.settings.on : copy.settings.off}</span>
              <i />
            </button>
          </div>
          <div className="settings-group compact-group">
            <div className="settings-group-title"><strong>{copy.settings.camera}</strong><small>{copy.settings.cameraDesc}</small></div>
            <div className="camera-options">
              <button onClick={onResetView}><RotateCcw size={15} />{copy.settings.resetView}</button>
              <button onClick={onOverhead}><Eye size={15} />{copy.settings.overhead}</button>
            </div>
          </div>
        </div>

        <div className="settings-danger">
          <span><Trash2 size={15} />{copy.settings.data}</span>
          <button
            onClick={() => {
              if (confirmClear) {
                onClearProgress();
                setConfirmClear(false);
              } else setConfirmClear(true);
            }}
          >
            {confirmClear ? copy.settings.clearConfirm : copy.settings.clearData}
          </button>
        </div>

        <button className="panel-primary" onClick={onClose}>{copy.settings.done}<ChevronRight size={17} /></button>
      </section>
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="toast"><Sparkles size={14} /><span>{message}</span></div>;
}

