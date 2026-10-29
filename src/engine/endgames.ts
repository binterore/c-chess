import data from './endgames.json';
import { parseBoard } from './rules';
import type { BoardState, Position } from '../types/chess';

export interface Endgame {
  id: string;
  chapter: number;
  titleKey: string;
  layout: string[];
  playerColor: 'red' | 'black';
  targetMoves: number;
  bestMoves: number;
  solution: { from: Position; to: Position };
  line?: Array<{ from: Position; to: Position }>;
}

export const endgames = data as Endgame[];

export function getPuzzleLine(endgame: Endgame): Array<{ from: Position; to: Position }> {
  return endgame.line?.length ? endgame.line : [endgame.solution];
}

export function getEndgameBoard(endgame: Endgame): BoardState {
  return parseBoard(endgame.layout);
}
