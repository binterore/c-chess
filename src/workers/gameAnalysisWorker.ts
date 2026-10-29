import { applyBoardMove, toChineseNotation } from '../engine/rules';
import { searchBestMove } from '../engine/ai';
import type { AnalyzedMove, BoardState, PieceColor, Position } from '../types/chess';

interface AnalysisJob {
  board: BoardState;
  turn: PieceColor;
  from: Position;
  to: Position;
  notation: string;
}

interface AnalysisRequest {
  id: number;
  jobs: AnalysisJob[];
}

function verdictFor(delta: number): AnalyzedMove['verdict'] {
  if (delta >= -20) return 'best';
  if (delta >= -60) return 'good';
  if (delta >= -150) return 'inaccuracy';
  if (delta >= -300) return 'mistake';
  return 'blunder';
}

self.onmessage = (event: MessageEvent<AnalysisRequest>) => {
  const { id, jobs } = event.data;
  try {
    const analyzed: AnalyzedMove[] = [];
    jobs.forEach((job, ply) => {
      const best = searchBestMove(job.board, job.turn, 'medium', 160);
      const next = applyBoardMove(job.board, job.from, job.to);
      const opponent: PieceColor = job.turn === 'red' ? 'black' : 'red';
      const after = searchBestMove(next, opponent, 'medium', 100);
      const actualScore = after ? -after.score : 900000;
      const bestScore = best?.score ?? actualScore;
      const delta = actualScore - bestScore;
      analyzed.push({
        ply,
        notation: job.notation,
        verdict: verdictFor(delta),
        evaluation: Math.round(actualScore),
        bestMove: best ? { from: best.from, to: best.to, notation: toChineseNotation(job.board, best.from, best.to) } : undefined
      });
      self.postMessage({ id, type: 'progress', value: (ply + 1) / jobs.length });
    });
    const scored = analyzed.filter((move) => move.verdict === 'best' || move.verdict === 'good').length;
    const report = {
      moves: analyzed,
      accuracy: analyzed.length ? Math.round((scored / analyzed.length) * 100) : 0,
      blunders: analyzed.filter((move) => move.verdict === 'blunder').length,
      mistakes: analyzed.filter((move) => move.verdict === 'mistake').length
    };
    self.postMessage({ id, type: 'complete', report });
  } catch (error) {
    self.postMessage({ id, type: 'error', error: error instanceof Error ? error.message : 'ANALYSIS_FAILED' });
  }
};
