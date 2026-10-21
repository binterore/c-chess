import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameResult, PieceColor } from '../../types/chess';
import { i18n } from '../../i18n';
import { Trophy, RefreshCw, LogOut } from 'lucide-react';
import { soundManager } from '../../audio/soundManager';

interface VictoryModalProps {
  result: GameResult;
  playerColor?: PieceColor;
  onRematch: () => void;
  onExit: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  result,
  playerColor,
  onRematch,
  onExit
}) => {
  const isWinner = playerColor && result.winner === playerColor;
  const isDraw = result.winner === 'draw';

  useEffect(() => {
    soundManager.playVictory();

    const end = Date.now() + 2500;
    const colors = ['#f59e0b', '#ef4444', '#10b981', '#eab308'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [result]);

  const winnerText = isDraw
    ? i18n.zh.drawGame
    : result.winner === 'red'
    ? `${i18n.zh.redSide} · ${i18n.zh.victory}`
    : `${i18n.zh.blackSide} · ${i18n.zh.victory}`;

  let reasonDesc = '';
  if (result.reason === 'checkmate') reasonDesc = i18n.zh.stalemateWin;
  else if (result.reason === 'surrender') reasonDesc = i18n.zh.surrenderWin;
  else if (result.reason === 'timeout') reasonDesc = i18n.zh.timeoutWin;
  else if (result.reason === 'agreement') reasonDesc = i18n.zh.drawGame;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative max-w-md w-full bg-stone-900 border-2 border-amber-500/60 rounded-3xl p-8 text-center shadow-[0_0_80px_rgba(245,158,11,0.4)]">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/50 border-4 border-stone-900">
          <Trophy className="w-12 h-12 text-stone-950" />
        </div>

        <div className="mt-8">
          <span className="text-xs uppercase tracking-widest text-amber-400 font-serif-sc">
            {isDraw ? 'DRAW' : isWinner ? 'TRIUMPH' : 'GAME OVER'}
          </span>
          <h2 className="text-4xl font-black font-calligraphy text-amber-300 mt-2">
            {winnerText}
          </h2>
          {reasonDesc && (
            <p className="text-amber-100/70 font-serif-sc mt-3 text-sm">
              {reasonDesc}
            </p>
          )}
        </div>

        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={onRematch}
            className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-950 font-bold font-serif-sc flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            {i18n.zh.rematch}
          </button>
          <button
            onClick={onExit}
            className="py-3 px-5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-serif-sc flex items-center justify-center gap-2 border border-stone-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            {i18n.zh.returnLobby}
          </button>
        </div>
      </div>
    </div>
  );
};
