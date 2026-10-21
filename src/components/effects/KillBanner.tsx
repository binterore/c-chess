import React, { useEffect, useState } from 'react';
import { KillPatternType } from '../../types/chess';
import { i18n } from '../../i18n';

interface KillBannerProps {
  effect: {
    type: KillPatternType;
    timestamp: number;
  } | null;
}

export const KillBanner: React.FC<KillBannerProps> = ({ effect }) => {
  const [visible, setVisible] = useState(false);
  const [currentPattern, setCurrentPattern] = useState<KillPatternType | null>(
    null
  );

  useEffect(() => {
    if (!effect || effect.type === 'capture') {
      return;
    }

    setCurrentPattern(effect.type);
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
    }, 2400);

    return () => clearTimeout(timer);
  }, [effect]);

  if (!visible || !currentPattern) return null;

  const info = i18n.zh.killEffects[currentPattern];
  if (!info || !info.title) return null;

  const isHorse = currentPattern === 'wocaoma' || currentPattern === 'guajiaoma';
  const isCannon = currentPattern === 'zhongpao';
  const isCheckmate = currentPattern === 'checkmate' || currentPattern === 'mensha';

  const gradientClass = isHorse
    ? 'from-amber-600 via-yellow-500 to-amber-700'
    : isCannon
    ? 'from-red-600 via-orange-500 to-red-700'
    : isCheckmate
    ? 'from-yellow-500 via-amber-400 to-yellow-600'
    : 'from-red-700 via-rose-600 to-red-800';

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 flex flex-col items-center animate-effect-banner">
      <div className="relative flex flex-col items-center px-10 py-5 rounded-2xl bg-neutral-950/85 border-2 border-amber-500/70 shadow-[0_0_50px_rgba(245,158,11,0.5)] backdrop-blur-md min-w-[320px]">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/30 to-red-500/20 blur-xl opacity-70 -z-10" />

        <div className="text-xs uppercase tracking-[0.3em] text-amber-300/80 mb-1 font-serif-sc">
          {info.sub || 'CHINESE CHESS'}
        </div>

        <h1
          className={`text-5xl md:text-6xl font-black font-calligraphy tracking-wider bg-clip-text text-transparent bg-gradient-to-r ${gradientClass} drop-shadow-[0_2px_15px_rgba(245,158,11,0.8)] py-1`}
        >
          {info.title}
        </h1>

        {info.desc && (
          <p className="mt-2 text-sm text-amber-100/90 font-serif-sc tracking-widest text-center border-t border-amber-500/30 pt-2 px-4">
            {info.desc}
          </p>
        )}

        <div className="absolute -top-3 left-4 text-amber-400 text-lg">◈</div>
        <div className="absolute -top-3 right-4 text-amber-400 text-lg">◈</div>
        <div className="absolute -bottom-3 left-4 text-amber-400 text-lg">◈</div>
        <div className="absolute -bottom-3 right-4 text-amber-400 text-lg">◈</div>
      </div>
    </div>
  );
};
