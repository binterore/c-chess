import { searchBestMove } from '../engine/ai';
import type { AiLevel, BoardState, PieceColor, Position } from '../types/chess';

interface SearchRequest {
  id: number;
  board: BoardState;
  turn: PieceColor;
  level: AiLevel;
}

interface SearchResponse {
  id: number;
  from?: Position;
  to?: Position;
  depth?: number;
  nodes?: number;
  elapsed?: number;
  evaluation?: number;
  error?: string;
}

self.onmessage = (event: MessageEvent<SearchRequest>) => {
  const { id, board, turn, level } = event.data;
  try {
    const result = searchBestMove(board, turn, level);
    if (!result) {
      self.postMessage({ id, error: 'NO_LEGAL_MOVES' } satisfies SearchResponse);
      return;
    }
    self.postMessage({
      id,
      from: result.from,
      to: result.to,
      depth: result.depth,
      nodes: result.nodes,
      elapsed: result.elapsed,
      evaluation: result.evaluation
    } satisfies SearchResponse);
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : 'SEARCH_FAILED'
    } satisfies SearchResponse);
  }
};
