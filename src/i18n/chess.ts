import type { PieceColor, PieceType } from '../types/chess';

export const PIECE_GLYPHS: Record<PieceColor, Record<PieceType, string>> = {
  red: {
    general: '帅',
    advisor: '仕',
    elephant: '相',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: '兵'
  },
  black: {
    general: '将',
    advisor: '士',
    elephant: '象',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: '卒'
  }
};

export const PIECE_NAMES = PIECE_GLYPHS;

export const CHINESE_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
export const ARABIC_NUMERALS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
export const FILE_MARKERS = {
  two: ['前', '后'],
  three: ['前', '中', '后'],
  many: ['前', '二', '三', '四', '五', '后']
};
export const MOVE_PREFIX = {
  advance: '进',
  retreat: '退',
  horizontal: '平'
};

export const NOTATION_EXPECTATIONS = [
  { from: [1, 7] as [number, number], to: [4, 7] as [number, number], value: '炮八平五' },
  { from: [7, 0] as [number, number], to: [6, 2] as [number, number], value: '马8进7' },
  { from: [0, 6] as [number, number], to: [0, 5] as [number, number], value: '兵九进一' }
];
