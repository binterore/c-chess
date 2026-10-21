import React from 'react';
import { Piece, PieceColor, PieceType } from '../types/chess';
import { i18n } from '../i18n';

interface PieceViewProps {
  piece: Piece;
  size: number;
  isSelected?: boolean;
  isThreatened?: boolean;
  isLastMove?: boolean;
  onClick?: () => void;
}

export const PieceView: React.FC<PieceViewProps> = ({
  piece,
  size,
  isSelected,
  isThreatened,
  isLastMove,
  onClick
}) => {
  const isRed = piece.color === 'red';
  const label = i18n.zh.pieces[piece.color][piece.type];

  const pieceDiameter = size * 0.88;

  return (
    <div
      onClick={onClick}
      style={{
        width: `${pieceDiameter}px`,
        height: `${pieceDiameter}px`
      }}
      className={`relative rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 select-none ${
        isSelected ? 'scale-110 z-30' : 'hover:scale-105 z-10'
      } ${isThreatened ? 'animate-check-glow' : ''}`}
    >
      {isSelected && (
        <div className="absolute -inset-1.5 rounded-full border-2 border-dashed border-amber-400 animate-spin-slow pointer-events-none" />
      )}

      {isLastMove && !isSelected && (
        <div className="absolute -inset-1 rounded-full border-2 border-amber-400/80 pointer-events-none shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
      )}

      <div
        className={`w-full h-full rounded-full flex items-center justify-center relative shadow-lg ${
          isRed
            ? 'bg-gradient-to-br from-[#d97736] via-[#b45309] to-[#78350f] border-2 border-[#fef3c7]/60 shadow-[#451a03]/80'
            : 'bg-gradient-to-br from-[#44403c] via-[#292524] to-[#1c1917] border-2 border-[#a8a29e]/50 shadow-black/90'
        }`}
      >
        <div
          className={`w-[84%] h-[84%] rounded-full border flex items-center justify-center ${
            isRed
              ? 'border-[#fef08a]/40 bg-gradient-to-b from-[#b45309]/80 to-[#78350f]/90'
              : 'border-[#78716c]/40 bg-gradient-to-b from-[#292524]/80 to-[#1c1917]/90'
          }`}
        >
          <span
            className={`font-calligraphy font-black leading-none text-center ${
              isRed
                ? 'text-[#fef08a] drop-shadow-[0_1px_3px_rgba(180,83,9,0.9)]'
                : 'text-[#e2e8f0] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'
            }`}
            style={{ fontSize: `${pieceDiameter * 0.54}px` }}
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
};
