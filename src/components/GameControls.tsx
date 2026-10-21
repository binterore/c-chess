import React, { useState } from 'react';
import { GameStatus, PieceColor, Player } from '../types/chess';
import { i18n } from '../i18n';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Flag,
  Handshake,
  Undo2,
  Copy,
  Check,
  LogOut,
  Users
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface GameControlsProps {
  status: GameStatus;
  turn: PieceColor;
  playerColor?: PieceColor;
  players: Record<string, Player>;
  spectatorsCount: number;
  roomId?: string;
  isAiMode?: boolean;
  isLocalMode?: boolean;
  flipped: boolean;
  onFlipBoard: () => void;
  onResign: () => void;
  onOfferDraw: () => void;
  onUndo: () => void;
  onExit: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  status,
  turn,
  playerColor,
  players,
  spectatorsCount,
  roomId,
  isAiMode,
  isLocalMode,
  flipped,
  onFlipBoard,
  onResign,
  onOfferDraw,
  onUndo,
  onExit
}) => {
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(soundManager.isMuted());

  const handleToggleSound = () => {
    const nextState = !muted;
    soundManager.setMuted(nextState);
    setMuted(nextState);
  };

  const handleCopyLink = () => {
    if (!roomId) return;
    const shareUrl = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const redPlayer = Object.values(players).find((p) => p.color === 'red') || {
    name: isAiMode && playerColor === 'black' ? 'AI 大师' : '红方',
    timeLeft: 600
  };

  const blackPlayer = Object.values(players).find(
    (p) => p.color === 'black'
  ) || {
    name: isAiMode && playerColor === 'red' ? 'AI 大师' : '黑方',
    timeLeft: 600
  };

  const topPlayer = flipped ? redPlayer : blackPlayer;
  const topColor: PieceColor = flipped ? 'red' : 'black';
  const bottomPlayer = flipped ? blackPlayer : redPlayer;
  const bottomColor: PieceColor = flipped ? 'black' : 'red';

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-stone-900 border border-stone-800 shadow-md">
        <div className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full ${
              topColor === 'red'
                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                : 'bg-stone-500 shadow-[0_0_8px_rgba(120,113,108,0.8)]'
            }`}
          />
          <span className="text-sm font-bold text-stone-200 font-serif-sc">
            {topPlayer.name}
          </span>
          {turn === topColor && status === 'playing' && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-serif-sc animate-pulse">
              思考中...
            </span>
          )}
        </div>
        <div className="font-mono text-base font-bold text-amber-300 bg-stone-950 px-3 py-1 rounded-xl border border-stone-800">
          {formatTime(topPlayer.timeLeft)}
        </div>
      </div>

      {roomId && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-950/30 border border-amber-600/40">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 font-serif-sc">房间号:</span>
            <span className="font-mono font-black text-amber-300 text-sm tracking-wider">
              {roomId}
            </span>
            {spectatorsCount > 0 && (
              <span className="text-[11px] text-stone-400 flex items-center gap-1 font-serif-sc ml-2">
                <Users className="w-3.5 h-3.5" />
                {spectatorsCount} {i18n.zh.spectatorsCount}
              </span>
            )}
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 py-1 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold font-serif-sc transition-transform active:scale-95 cursor-pointer shadow"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-stone-950" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                {i18n.zh.copyLink}
              </>
            )}
          </button>
        </div>
      )}

      <div className="grid grid-cols-5 gap-2">
        <button
          onClick={onUndo}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs font-serif-sc transition-colors cursor-pointer gap-1"
          title={i18n.zh.undoMove}
        >
          <Undo2 className="w-4 h-4 text-amber-400" />
          <span>{i18n.zh.undoMove}</span>
        </button>
        <button
          onClick={onOfferDraw}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs font-serif-sc transition-colors cursor-pointer gap-1"
          title={i18n.zh.offerDraw}
        >
          <Handshake className="w-4 h-4 text-emerald-400" />
          <span>{i18n.zh.offerDraw}</span>
        </button>
        <button
          onClick={onResign}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs font-serif-sc transition-colors cursor-pointer gap-1"
          title={i18n.zh.resign}
        >
          <Flag className="w-4 h-4 text-rose-400" />
          <span>{i18n.zh.resign}</span>
        </button>
        <button
          onClick={onFlipBoard}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs font-serif-sc transition-colors cursor-pointer gap-1"
          title={i18n.zh.flipBoard}
        >
          <RotateCcw className="w-4 h-4 text-cyan-400" />
          <span>{i18n.zh.flipBoard}</span>
        </button>
        <button
          onClick={handleToggleSound}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs font-serif-sc transition-colors cursor-pointer gap-1"
          title={muted ? i18n.zh.soundOff : i18n.zh.soundOn}
        >
          {muted ? (
            <VolumeX className="w-4 h-4 text-stone-500" />
          ) : (
            <Volume2 className="w-4 h-4 text-amber-400" />
          )}
          <span>{muted ? '静音' : '音效'}</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-stone-900 border border-stone-800 shadow-md">
        <div className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full ${
              bottomColor === 'red'
                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                : 'bg-stone-500 shadow-[0_0_8px_rgba(120,113,108,0.8)]'
            }`}
          />
          <span className="text-sm font-bold text-stone-200 font-serif-sc">
            {bottomPlayer.name} {playerColor === bottomColor ? '(我)' : ''}
          </span>
          {turn === bottomColor && status === 'playing' && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-serif-sc animate-pulse">
              轮到出招！
            </span>
          )}
        </div>
        <div className="font-mono text-base font-bold text-amber-300 bg-stone-950 px-3 py-1 rounded-xl border border-stone-800">
          {formatTime(bottomPlayer.timeLeft)}
        </div>
      </div>

      <button
        onClick={onExit}
        className="w-full py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs font-serif-sc border border-stone-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" />
        {i18n.zh.returnLobby}
      </button>
    </div>
  );
};
