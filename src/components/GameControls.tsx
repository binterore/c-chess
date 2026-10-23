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
  Users,
  MessageSquare
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

export const PlayerBar: React.FC<{
  player: { name: string; timeLeft: number };
  color: PieceColor;
  isCurrentTurn: boolean;
  isThinking?: boolean;
  isSelf?: boolean;
}> = ({ player, color, isCurrentTurn, isThinking, isSelf }) => {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`flex items-center justify-between px-3 py-1.5 sm:py-2 rounded-xl transition-all duration-300 w-full max-w-[520px] ${
        isCurrentTurn
          ? 'bg-stone-900 border-2 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
          : 'bg-stone-900/90 border border-stone-800'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-3.5 h-3.5 rounded-full shrink-0 ${
            color === 'red'
              ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
              : 'bg-stone-400 shadow-[0_0_8px_rgba(168,162,158,0.8)]'
          }`}
        />
        <span className="text-xs sm:text-sm font-bold text-stone-200 font-serif-sc truncate">
          {player.name} {isSelf ? '(我)' : ''}
        </span>
        {isCurrentTurn && (
          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded-full font-serif-sc shrink-0 animate-pulse">
            {isThinking ? '思考中...' : '出招中'}
          </span>
        )}
      </div>

      <div className="font-mono text-xs sm:text-sm font-bold text-amber-300 bg-stone-950 px-2 sm:px-2.5 py-0.5 rounded-lg border border-stone-800 shrink-0">
        {formatTime(player.timeLeft)}
      </div>
    </div>
  );
};

export const ActionToolbar: React.FC<{
  roomId?: string;
  spectatorsCount: number;
  onUndo: () => void;
  onOfferDraw: () => void;
  onResign: () => void;
  onFlipBoard: () => void;
  onExit: () => void;
  onToggleChat?: () => void;
}> = ({
  roomId,
  spectatorsCount,
  onUndo,
  onOfferDraw,
  onResign,
  onFlipBoard,
  onExit,
  onToggleChat
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

  return (
    <div className="flex flex-col gap-1.5 w-full max-w-[520px]">
      {roomId && (
        <div className="flex items-center justify-between p-1.5 sm:p-2 rounded-xl bg-amber-950/30 border border-amber-600/40">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] text-stone-400 font-serif-sc">房号:</span>
            <span className="font-mono font-black text-amber-300 text-xs sm:text-sm tracking-wider">
              {roomId}
            </span>
            {spectatorsCount > 0 && (
              <span className="text-[10px] text-stone-400 flex items-center gap-0.5 font-serif-sc ml-1">
                <Users className="w-3 h-3" />
                {spectatorsCount}
              </span>
            )}
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-bold font-serif-sc transition-transform active:scale-95 cursor-pointer shadow"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-stone-950" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                {i18n.zh.copyLink}
              </>
            )}
          </button>
        </div>
      )}

      <div className="grid grid-cols-6 gap-1 sm:gap-1.5 py-0.5">
        <button
          onClick={onUndo}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-[10px] sm:text-[11px] font-serif-sc transition-colors cursor-pointer gap-0.5 active:scale-95"
          title={i18n.zh.undoMove}
        >
          <Undo2 className="w-3.5 h-3.5 text-amber-400" />
          <span>{i18n.zh.undoMove}</span>
        </button>
        <button
          onClick={onOfferDraw}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-[10px] sm:text-[11px] font-serif-sc transition-colors cursor-pointer gap-0.5 active:scale-95"
          title={i18n.zh.offerDraw}
        >
          <Handshake className="w-3.5 h-3.5 text-emerald-400" />
          <span>{i18n.zh.offerDraw}</span>
        </button>
        <button
          onClick={onResign}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-[10px] sm:text-[11px] font-serif-sc transition-colors cursor-pointer gap-0.5 active:scale-95"
          title={i18n.zh.resign}
        >
          <Flag className="w-3.5 h-3.5 text-rose-400" />
          <span>{i18n.zh.resign}</span>
        </button>
        <button
          onClick={onFlipBoard}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-[10px] sm:text-[11px] font-serif-sc transition-colors cursor-pointer gap-0.5 active:scale-95"
          title={i18n.zh.flipBoard}
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>{i18n.zh.flipBoard}</span>
        </button>
        <button
          onClick={handleToggleSound}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-[10px] sm:text-[11px] font-serif-sc transition-colors cursor-pointer gap-0.5 active:scale-95"
          title={muted ? i18n.zh.soundOff : i18n.zh.soundOn}
        >
          {muted ? (
            <VolumeX className="w-3.5 h-3.5 text-stone-500" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>{muted ? '静音' : '音效'}</span>
        </button>
        {onToggleChat ? (
          <button
            onClick={onToggleChat}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-800 text-[10px] sm:text-[11px] font-serif-sc transition-colors cursor-pointer gap-0.5 active:scale-95"
            title="互动"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>互动</span>
          </button>
        ) : (
          <button
            onClick={onExit}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 text-[10px] sm:text-[11px] font-serif-sc transition-colors cursor-pointer gap-0.5 active:scale-95"
            title={i18n.zh.returnLobby}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>大厅</span>
          </button>
        )}
      </div>
    </div>
  );
};
