import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BookOpen,
  BrainCircuit,
  Camera,
  Copy,
  Flag,
  Gauge,
  Handshake,
  History,
  Lightbulb,
  Menu,
  MessageCircle,
  PanelRight,
  Rotate3D,
  RotateCcw,
  Send,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Undo2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type {
  AiLevel,
  ChatMessage,
  EffectIntensity,
  EngineInfo,
  GameMode,
  GameRecord,
  GameSnapshot,
  PieceColor,
  PublicOnlineRoom
} from '../types/chess';
import type { Endgame } from '../engine/endgames';
import { isInCheck } from '../engine/rules';
import { copy, format } from '../i18n';
import { PIECE_GLYPHS } from '../i18n/chess';

interface GameInterfaceProps {
  snapshot: GameSnapshot;
  mode: GameMode;
  playerColor: PieceColor;
  playerName: string;
  isSpectator: boolean;
  localPlayerColor: PieceColor | null;
  difficulty: AiLevel;
  engineInfo: EngineInfo | null;
  aiThinking: boolean;
  isAnimating: boolean;
  soundOn: boolean;
  intensity: EffectIntensity;
  onlineRoom: PublicOnlineRoom | null;
  connected: boolean;
  messages: ChatMessage[];
  puzzle: Endgame | null;
  replayRecord?: GameRecord | null;
  replayIndex?: number;
  localClocks?: Record<PieceColor, number> | null;
  flipped: boolean;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  onBack: () => void;
  onUndo: () => void;
  onResign: () => void;
  onDraw: () => void;
  onHint: () => void;
  onSettings: () => void;
  onToggleSound: () => void;
  onResetCamera: () => void;
  onFlip: () => void;
  onRestart: () => void;
  onCopyRoom: (roomId: string) => void;
  onSendChat: (text: string) => void;
  onRematch: () => void;
  onReplayCheckmate?: () => void;
  onOpenResult?: () => void;
  onSaveGame: () => void;
  onOpenArchive: () => void;
  onOpenRules: () => void;
  onAnalyze: () => void;
  onSeekReplay?: (index: number) => void;
  onShareRoom: () => void;
  onMutePlayer: (color: PieceColor, muted: boolean) => void;
  onReportMessage: (message: ChatMessage) => void;
}

const levelLabel: Record<AiLevel, string> = {
  easy: copy.setup.easy,
  medium: copy.setup.medium,
  hard: copy.setup.hard
};

const modeLabel: Record<GameMode, string> = {
  ai: copy.game.ai,
  local: copy.game.local,
  online: copy.game.online,
  puzzle: copy.game.puzzle,
  replay: '棋谱复盘',
  analysis: '局面分析'
};

function formatClock(seconds: number, unlimited = false): string {
  if (unlimited) return '∞';
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function capturedGlyphs(snapshot: GameSnapshot, color: PieceColor): string[] {
  const counts: Record<string, number> = {};
  snapshot.history.forEach((move) => {
    if (move.captured?.color === color) {
      const key = move.captured.type;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  });
  return Object.entries(counts).flatMap(([type, count]) =>
    Array.from({ length: count }, () => PIECE_GLYPHS[color][type as keyof typeof PIECE_GLYPHS[typeof color]])
  );
}

export function GameInterface({
  snapshot,
  mode,
  playerColor,
  playerName,
  isSpectator,
  localPlayerColor,
  difficulty,
  engineInfo,
  aiThinking,
  isAnimating,
  soundOn,
  intensity,
  onlineRoom,
  connected,
  messages,
  puzzle,
  replayRecord = null,
  replayIndex = 0,
  localClocks = null,
  flipped,
  panelOpen,
  onPanelOpenChange,
  onBack,
  onUndo,
  onResign,
  onDraw,
  onHint,
  onSettings,
  onToggleSound,
  onResetCamera,
  onFlip,
  onRestart,
  onCopyRoom,
  onSendChat,
  onRematch,
  onReplayCheckmate,
  onOpenResult,
  onSaveGame,
  onOpenArchive,
  onOpenRules,
  onAnalyze,
  onSeekReplay,
  onShareRoom,
  onMutePlayer,
  onReportMessage
}: GameInterfaceProps) {
  const [chatDraft, setChatDraft] = useState('');
  const [checkSlashActive, setCheckSlashActive] = useState(false);
  const [checkSlashKey, setCheckSlashKey] = useState(0);
  const prevCheckedRef = useRef(false);

  const me = localPlayerColor ?? playerColor;
  const opponentColor: PieceColor = me === 'red' ? 'black' : 'red';
  const onlineMe = onlineRoom?.players.find((player) => player.color === me);
  const onlineOpponent = onlineRoom?.players.find((player) => player.color === opponentColor);
  const redCaptures = useMemo(() => capturedGlyphs(snapshot, 'black'), [snapshot]);
  const blackCaptures = useMemo(() => capturedGlyphs(snapshot, 'red'), [snapshot]);
  const checked = isInCheck(snapshot.board, snapshot.turn) && snapshot.status === 'playing';

  useEffect(() => {
    if (checked && !prevCheckedRef.current) {
      setCheckSlashActive(true);
      setCheckSlashKey((k) => k + 1);
      const timer = window.setTimeout(() => setCheckSlashActive(false), 1700);
      return () => window.clearTimeout(timer);
    }
    prevCheckedRef.current = checked;
  }, [checked]);
  const myTurn = !isSpectator && (mode === 'local' || snapshot.turn === me);
  const waiting = mode === 'online' && onlineRoom?.status === 'waiting';
  const isOnline = mode === 'online';
  const isReplay = mode === 'replay';
  const isHost = isOnline && onlineRoom?.hostColor === me;
  const topColor: PieceColor = flipped ? 'red' : 'black';
  const bottomColor: PieceColor = flipped ? 'black' : 'red';
  const topActive = snapshot.turn === topColor && snapshot.status === 'playing';
  const bottomActive = snapshot.turn === bottomColor && snapshot.status === 'playing';
  const aiName = mode === 'ai' ? `AI · ${levelLabel[difficulty]}` : onlineOpponent?.name ?? copy.game.opponent;
  const topName = isReplay
    ? (topColor === 'red' ? replayRecord?.redName : replayRecord?.blackName) ?? copy.game.opponent
    : mode === 'local'
    ? copy.game.blackSide
    : mode === 'online'
      ? waiting && !onlineRoom?.players.find((player) => player.color === topColor)
        ? copy.game.emptySeat
        : isSpectator
        ? onlineRoom?.players.find((player) => player.color === topColor)?.name ?? copy.game.spectator
        : topColor === me ? onlineMe?.name ?? playerName : onlineOpponent?.name ?? copy.game.opponent
      : topColor === me ? playerName : aiName;
  const bottomName = isReplay
    ? (bottomColor === 'red' ? replayRecord?.redName : replayRecord?.blackName) ?? copy.game.opponent
    : mode === 'local'
    ? copy.game.redSide
    : mode === 'online'
      ? waiting && !onlineRoom?.players.find((player) => player.color === bottomColor)
        ? copy.game.emptySeat
        : isSpectator
        ? onlineRoom?.players.find((player) => player.color === bottomColor)?.name ?? copy.game.spectator
        : bottomColor === me ? onlineMe?.name ?? playerName : onlineOpponent?.name ?? copy.game.opponent
      : bottomColor === me ? playerName : aiName;
  const topTime = mode === 'online'
    ? onlineRoom?.players.find((player) => player.color === topColor)?.timeLeft ?? 0
    : localClocks?.[topColor] ?? 0;
  const bottomTime = mode === 'online'
    ? onlineRoom?.players.find((player) => player.color === bottomColor)?.timeLeft ?? 0
    : localClocks?.[bottomColor] ?? 0;
  const movePairs = useMemo(() => {
    const pairs: Array<{ index: number; red?: string; black?: string }> = [];
    snapshot.history.forEach((move, index) => {
      const pairIndex = Math.floor(index / 2);
      if (!pairs[pairIndex]) pairs[pairIndex] = { index: pairIndex + 1 };
      if (move.piece.color === 'red') pairs[pairIndex].red = move.notation;
      else pairs[pairIndex].black = move.notation;
    });
    return pairs;
  }, [snapshot.history]);
  const puzzleUsed = puzzle ? snapshot.history.filter((move) => move.piece.color === playerColor).length : 0;
  const currentStatus = isReplay
    ? `复盘第 ${replayIndex} / ${replayRecord?.history.length ?? 0} 着`
    : waiting
    ? copy.setup.waiting
    : isSpectator
      ? copy.game.spectator
      : checked
    ? copy.game.checked
    : aiThinking
      ? copy.game.thinking
      : isAnimating
        ? copy.game.turn
        : snapshot.status === 'ended'
          ? copy.game.checkmate
          : myTurn
            ? copy.game.yourTurn
            : copy.game.waitingOpponent;

  const submitChat = () => {
    if (!chatDraft.trim()) return;
    onSendChat(chatDraft.trim());
    setChatDraft('');
  };

  return (
    <div className="game-interface">
      <div className={`check-vignette ${checked ? 'active' : ''}`} />
      {checkSlashActive && (
        <div className="check-cinematic-banner" key={checkSlashKey}>
          <div className="check-cinematic-slash" />
          <div className="check-cinematic-chars">
            <span className="check-char-left">将</span>
            <span className="check-char-right">军</span>
          </div>
          <div className="check-cinematic-sub">CHECK</div>
        </div>
      )}
      <header className="game-topbar">
        <div className="game-topbar-left">
          <button className="round-action glass" onClick={onBack} aria-label={copy.game.back}><ArrowLeft size={18} /></button>
          <div className="mini-brand">
            <span>{copy.brand.name.charAt(0)}</span>
            <div><strong>{copy.brand.name}</strong><small>{modeLabel[mode]}</small></div>
          </div>
          {isOnline && onlineRoom && (
            <button className="round-action glass room-share-action" onClick={onShareRoom} aria-label="邀请二维码"><Smartphone size={16} /></button>
          )}
          {isOnline && onlineRoom && (
            <button className="room-chip" onClick={() => onCopyRoom(onlineRoom.id)}>
              <span>{copy.game.room}</span><b>{onlineRoom.id}</b><Copy size={13} />
            </button>
          )}
        </div>

        <div className={`turn-plaque ${snapshot.turn} ${waiting ? 'waiting' : ''}`}>
          <span className="turn-orb">{snapshot.turn === 'red' ? PIECE_GLYPHS.red.general : PIECE_GLYPHS.black.general}</span>
          <div><small>{currentStatus}</small><strong>{snapshot.turn === 'red' ? copy.game.turnRed : copy.game.turnBlack}</strong></div>
          {(aiThinking || isAnimating) && <i className="thinking-ring" />}
        </div>

        <div className="game-topbar-actions">
          {isOnline && (
            <span className={`connection-pill ${connected ? 'online' : 'offline'}`}>
              {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
              {connected ? 'LIVE' : copy.game.connectionLost}
            </span>
          )}
          <button className="round-action glass" onClick={onToggleSound} aria-label={soundOn ? copy.game.soundOn : copy.game.soundOff}>
            {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button className="round-action glass" onClick={onSettings} aria-label={copy.nav.settings}><Settings size={17} /></button>
          <button className={`round-action glass mobile-panel-button ${panelOpen ? 'active' : ''}`} onClick={() => onPanelOpenChange(!panelOpen)} aria-label={copy.game.moves}>
            <PanelRight size={17} />
          </button>
        </div>
      </header>

      {checked && snapshot.lastMove && (
        <div className="check-guidance" role="status">
          <Shield size={14} />
          <span>对方上一手 <b>{snapshot.lastMove.notation}</b> 正在攻击将帅。必须移将、吃子、垫子或以其他方式解除将军。</span>
        </div>
      )}

      <div className="board-side-stack">
        <div className={`player-badge top ${topActive ? 'active' : ''}`}>
          <span className={`player-seal ${topColor}`}>{topColor === 'red' ? PIECE_GLYPHS.red.general : PIECE_GLYPHS.black.general}</span>
          <div>
            <small>{topActive ? copy.game.turn : ' '}</small>
            <strong>{topName}</strong>
            <span className="capture-row">{topColor === 'black' ? blackCaptures.join('') : redCaptures.join('')}</span>
          </div>
          {(isOnline || localClocks) && !waiting && <b className="clock">{formatClock(topTime, isOnline && onlineRoom?.timeLimit === 0)}</b>}
          {mode === 'ai' && topColor !== me && <BrainCircuit size={16} />}
          {mode === 'online' && onlineRoom?.players.find((player) => player.color === topColor)?.connected === false && <WifiOff size={14} />}
          {isHost && topColor !== me && <button className="chat-mute-badge" onClick={() => onMutePlayer(topColor, !onlineRoom?.players.find((player) => player.color === topColor)?.muted)} aria-label={`${onlineRoom?.players.find((player) => player.color === topColor)?.muted ? '解除' : '设置'}禁言`}><MessageCircle size={13} />{onlineRoom?.players.find((player) => player.color === topColor)?.muted ? '解除' : '禁言'}</button>}
        </div>

        <div className={`player-badge bottom ${bottomActive ? 'active' : ''}`}>
          <span className={`player-seal ${bottomColor}`}>{bottomColor === 'red' ? PIECE_GLYPHS.red.general : PIECE_GLYPHS.black.general}</span>
          <div>
            <small>{bottomActive ? copy.game.turn : ' '}</small>
            <strong>{bottomName}</strong>
            <span className="capture-row">{bottomColor === 'black' ? blackCaptures.join('') : redCaptures.join('')}</span>
          </div>
          {(isOnline || localClocks) && !waiting && <b className="clock">{formatClock(bottomTime, isOnline && onlineRoom?.timeLimit === 0)}</b>}
          {mode === 'ai' && bottomColor !== me && <BrainCircuit size={16} />}
          {mode === 'online' && onlineRoom?.players.find((player) => player.color === bottomColor)?.connected === false && <WifiOff size={14} />}
          {isHost && bottomColor !== me && <button className="chat-mute-badge" onClick={() => onMutePlayer(bottomColor, !onlineRoom?.players.find((player) => player.color === bottomColor)?.muted)} aria-label={`${onlineRoom?.players.find((player) => player.color === bottomColor)?.muted ? '解除' : '设置'}禁言`}><MessageCircle size={13} />{onlineRoom?.players.find((player) => player.color === bottomColor)?.muted ? '解除' : '禁言'}</button>}
        </div>
      </div>

      <div className="board-unified-dock">
        <div className="dock-group">
          {!isSpectator && !waiting && !isReplay && (
            <button className="dock-btn" onClick={onUndo} disabled={snapshot.history.length === 0 || snapshot.status === 'ended'} title={copy.game.undo}>
              <Undo2 size={16} />
              <span>{copy.game.undo}</span>
            </button>
          )}
          {!isSpectator && !waiting && !isReplay && (
            <button className="dock-btn dock-btn-highlight" onClick={onHint} title={copy.game.hint}>
              <Lightbulb size={16} />
              <span>{copy.game.hint}</span>
            </button>
          )}
        </div>

        <div className="dock-divider" />

        <div className="dock-group">
          {!isReplay && <button className="dock-btn" onClick={onAnalyze} title="AI 局面分析"><BrainCircuit size={16} /><span>分析</span></button>}
          {!isReplay && <button className="dock-btn" onClick={onSaveGame} title="保存当前棋谱"><History size={16} /><span>保存</span></button>}
          <button className="dock-btn" onClick={onOpenArchive} title="棋谱库"><BookOpen size={16} /><span>棋谱</span></button>
        </div>

        <div className="dock-divider" />

        <div className="dock-group">
          <button className="dock-btn" onClick={onResetCamera} title={copy.game.camera}>
            <Camera size={16} />
            <span>{copy.game.camera}</span>
          </button>
          <button className="dock-btn" onClick={onFlip} title={copy.game.flip}>
            <Rotate3D size={16} />
            <span>{copy.game.flip}</span>
          </button>
        </div>

        <div className="dock-divider" />

        <div className="dock-group">
          {!isSpectator && !waiting && !isOnline && !isReplay && (
            <button className="dock-btn" onClick={onRestart} title={copy.game.restart}>
              <RotateCcw size={16} />
              <span>{copy.game.restart}</span>
            </button>
          )}
          {!isSpectator && !waiting && isOnline && !isReplay && (
            <button className="dock-btn" onClick={onDraw} title={copy.game.draw}>
              <Handshake size={16} />
              <span>{copy.game.draw}</span>
            </button>
          )}
          {!isSpectator && !waiting && !isReplay && (
            <button className="dock-btn dock-btn-danger" onClick={onResign} title={copy.game.resign}>
              <Flag size={16} />
              <span>{copy.game.resign}</span>
            </button>
          )}
          <button className="dock-btn" onClick={() => onPanelOpenChange(!panelOpen)} title={copy.game.moveHistory}>
            <BookOpen size={16} />
            <span>{copy.game.moves}</span>
          </button>
        </div>
      </div>

      {snapshot.status === 'ended' && !isReplay && (
        <div className="endgame-replay-dock">
          <div className="endgame-replay-info">
            <Sparkles size={14} className="sparkle-spin" />
            <span>{snapshot.result?.reason === 'checkmate' ? '绝杀时刻 · 全景旋转' : '终局全景 · 自动旋转'}</span>
          </div>
          <div className="endgame-replay-actions">
            {snapshot.history.length > 0 && onReplayCheckmate && (
              <button className="endgame-btn-replay" onClick={onReplayCheckmate}>
                <RotateCcw size={14} />
                <span>回放绝杀</span>
              </button>
            )}
            {onOpenResult && (
              <button className="endgame-btn-summary" onClick={onOpenResult}>
                <Award size={14} />
                <span>查看结算</span>
              </button>
            )}
          </div>
        </div>
      )}

      {puzzle && (
        <div className="puzzle-objective">
          <span>{PIECE_GLYPHS.red.general}</span>
          <div>
            <small>{format(copy.game.puzzleChapter, { chapter: puzzle.chapter, name: '' }).replace(' · ', '')}</small>
            <strong>{format(copy.game.puzzleGoal, { count: puzzle.targetMoves })}</strong>
          </div>
          <b>{puzzleUsed}/{puzzle.targetMoves}</b>
        </div>
      )}

      <aside className={`game-panel ${panelOpen ? 'open' : ''}`}>
        <div className="panel-scroll">
          <div className="panel-heading">
            <div>
              <small>{modeLabel[mode]}</small>
              <h2>{copy.game.moveHistory}</h2>
            </div>
            <button className="panel-mobile-close" onClick={() => onPanelOpenChange(false)}><X size={17} /></button>
            <span className={`mode-glyph ${snapshot.turn}`}>{snapshot.turn === 'red' ? PIECE_GLYPHS.red.general : PIECE_GLYPHS.black.general}</span>
          </div>

          <div className="battle-facts">
            <span><b>{snapshot.history.length}</b><small>{copy.game.moves}</small></span>
            <span><b>{redCaptures.length + blackCaptures.length}</b><small>{copy.game.captures}</small></span>
            <span><b>{puzzle ? `${puzzleUsed}/${puzzle.targetMoves}` : levelLabel[difficulty]}</b><small>{puzzle ? copy.game.puzzle : copy.game.difficulty}</small></span>
          </div>

          {mode === 'ai' && (
            <div className="engine-strip">
              <span className="engine-icon"><BrainCircuit size={17} /></span>
              <div>
                <small>{copy.game.engine}</small>
                <strong>{aiThinking ? copy.game.aiThinking : engineInfo ? `${engineInfo.depth} PLY` : copy.home.featureAi}</strong>
              </div>
              {engineInfo && <b>{engineInfo.evaluation > 0 ? '+' : ''}{(engineInfo.evaluation / 100).toFixed(1)}</b>}
            </div>
          )}

          <div className="move-list-head">
            <span><History size={14} />{copy.game.moveHistory}</span>
            <small>{snapshot.history.length} {copy.game.moveSuffix}</small>
          </div>

          <div className="move-list">
            {movePairs.length === 0 && (
              <div className="empty-moves">
                <span>{copy.brand.name.charAt(0)}</span>
                <p>{copy.game.noMoves}</p>
              </div>
            )}
            {movePairs.map((pair) => (
              <div key={pair.index} className={`move-row ${onSeekReplay && Math.ceil(replayIndex / 2) === pair.index ? 'current' : ''}`}>
                <span className="move-number">{String(pair.index).padStart(2, '0')}</span>
                <button className="move-red" onClick={() => onSeekReplay?.((pair.index - 1) * 2 + 1)} disabled={!onSeekReplay || !pair.red}>{pair.red ?? '·'}</button>
                <button className="move-black" onClick={() => onSeekReplay?.(pair.index * 2)} disabled={!onSeekReplay || !pair.black}>{pair.black ?? '·'}</button>
              </div>
            ))}
          </div>

          {isOnline && (
            <div className="chat-block">
              <div className="chat-heading"><MessageCircle size={14} /><span>{copy.online.sendChat}</span></div>
              <div className="quick-chats">
                {[copy.online.quickHello, copy.online.quickGood, copy.online.quickThanks].map((text) => (
                  <button key={text} onClick={() => onSendChat(text)}>{text}</button>
                ))}
              </div>
              <div className="chat-feed">
                {messages.slice(-6).map((message) => (
                  <p key={message.id}><b>{message.senderName}</b><span>{message.text}</span><button onClick={() => onReportMessage(message)} title="举报消息">举报</button></p>
                ))}
              </div>
              <div className="chat-input">
                <input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submitChat()} placeholder={copy.online.chatPlaceholder} />
                <button onClick={submitChat}><Send size={14} /></button>
              </div>
            </div>
          )}

          {snapshot.status === 'ended' && !isReplay && (
            <button className="rematch-button" onClick={onRematch}><RotateCcw size={16} />{copy.result.replay}</button>
          )}
        </div>

        <div className="panel-footer-actions">
          {!isSpectator && !waiting && <button onClick={onResign}><Flag size={15} />{copy.game.resign}</button>}
          {!isSpectator && !waiting && isOnline && <button onClick={onDraw}><Handshake size={15} />{copy.game.draw}</button>}
          <button onClick={onOpenRules}><BookOpen size={15} />规则指南</button>
          <button onClick={onSettings}><Settings size={15} />{copy.settingsTitle}</button>
        </div>
      </aside>

      {waiting && onlineRoom && (
        <div className="waiting-room">
          <div className="waiting-runes"><i /><i /><i /></div>
          <span className="waiting-seal">{copy.brand.name.charAt(0)}</span>
          <small>{copy.setup.onlineKicker}</small>
          <h2>{copy.setup.waiting}</h2>
          <p>{copy.setup.waitingDesc}</p>
          <button className="waiting-code" onClick={() => onCopyRoom(onlineRoom.id)}>
            <span>{copy.game.room}</span>
            <strong>{onlineRoom.id}</strong>
            <Copy size={15} />
          </button>
          <div className="waiting-actions">
            <button onClick={() => onCopyRoom(onlineRoom.id)}><Copy size={15} />{copy.setup.copyLink}</button>
            <button onClick={onShareRoom}><Smartphone size={15} />扫码邀请</button>
            <button onClick={onBack}><ArrowLeft size={15} />{copy.online.leaveRoom}</button>
          </div>
          <div className="waiting-player">
            <span className={`player-seal ${onlineMe?.color ?? 'red'}`}>{onlineMe?.color === 'black' ? PIECE_GLYPHS.black.general : PIECE_GLYPHS.red.general}</span>
            <div><b>{onlineMe?.name}</b><small>{copy.game.you} · {copy.game.waitingOpponent}</small></div>
            <i />
          </div>
        </div>
      )}

      <div className={`game-thought ${aiThinking ? 'visible' : ''}`}>
        <span className="thought-ring"><Sparkles size={16} /></span>
        <div><b>{copy.game.aiThinking}</b><small>{engineInfo ? format(copy.game.thinkingDetail, { depth: engineInfo.depth, nodes: engineInfo.nodes.toLocaleString() }) : copy.game.thinking}</small></div>
      </div>

      <div className="game-corner-meta">
        <span><Gauge size={13} />{intensity === 'full' ? copy.game.full : intensity === 'reduced' ? copy.game.reduced : copy.game.off}</span>
        <span><Shield size={13} />{copy.game.rules}</span>
      </div>

      <div className="mobile-game-hint">
        <Menu size={14} /><span>{copy.home.dragHint}</span>
      </div>
    </div>
  );
}
