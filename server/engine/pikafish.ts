import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import fs from 'fs';
import { BoardState, PieceColor, Position } from '../../src/types/chess';

export interface PikafishSearchResult {
  bestmove: string;
  from: Position;
  to: Position;
  depth?: number;
  score?: number;
}

export function boardToFen(board: BoardState, turn: PieceColor): string {
  const pieceCharMap: Record<string, string> = {
    general: 'k',
    advisor: 'a',
    elephant: 'b',
    horse: 'n',
    chariot: 'r',
    cannon: 'c',
    soldier: 'p'
  };

  const rows: string[] = [];

  for (let y = 0; y < 10; y++) {
    let emptyCount = 0;
    let rowStr = '';

    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (!piece) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rowStr += emptyCount;
          emptyCount = 0;
        }
        const char = pieceCharMap[piece.type] || 'p';
        rowStr += piece.color === 'red' ? char.toUpperCase() : char;
      }
    }

    if (emptyCount > 0) {
      rowStr += emptyCount;
    }
    rows.push(rowStr);
  }

  const activeTurn = turn === 'red' ? 'w' : 'b';
  return `${rows.join('/')} ${activeTurn} - - 0 1`;
}

export function uciMoveToCoords(uci: string): { from: Position; to: Position } {
  const fromCol = uci.charCodeAt(0) - 97;
  const fromRank = parseInt(uci[1], 10);
  const toCol = uci.charCodeAt(2) - 97;
  const toRank = parseInt(uci[3], 10);

  return {
    from: [fromCol, 9 - fromRank],
    to: [toCol, 9 - toRank]
  };
}

interface QueuedSearch {
  fen: string;
  depth: number;
  movetime: number;
  resolve: (res: PikafishSearchResult) => void;
  reject: (err: Error) => void;
}

export class PikafishEngine {
  private process: ChildProcessWithoutNullStreams | null = null;
  private isReady: boolean = false;
  private binaryPath: string | null = null;
  private nnuePath: string | null = null;
  private outputBuffer: string = '';
  private currentSearch: QueuedSearch | null = null;
  private queue: QueuedSearch[] = [];
  private searchTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.resolvePaths();
    if (this.binaryPath && fs.existsSync(this.binaryPath)) {
      this.initProcess();
    }
  }

  private resolvePaths() {
    const rootDir = process.cwd();
    const binDir = path.join(rootDir, 'engine', 'bin');

    let binaryName = 'Pikafish-MacOS-universal';
    if (process.platform === 'linux') {
      binaryName = 'Pikafish-Linux-x86-64-universal';
    } else if (process.platform === 'win32') {
      binaryName = 'Pikafish-Windows-x86-64-universal.exe';
    }

    const candidateBin = path.join(binDir, binaryName);
    const candidateNnue = path.join(binDir, 'pikafish.nnue');

    if (fs.existsSync(candidateBin)) {
      this.binaryPath = candidateBin;
    }
    if (fs.existsSync(candidateNnue)) {
      this.nnuePath = candidateNnue;
    }
  }

  public isAvailable(): boolean {
    return !!(this.binaryPath && fs.existsSync(this.binaryPath));
  }

  private initProcess() {
    if (!this.binaryPath) return;

    try {
      this.process = spawn(this.binaryPath, [], {
        cwd: path.dirname(this.binaryPath)
      });

      this.process.stdout.on('data', (chunk: Buffer) => {
        this.handleOutput(chunk.toString());
      });

      this.process.stderr.on('data', () => {});

      this.process.on('close', () => {
        this.isReady = false;
        this.process = null;
      });

      this.send('uci');
      if (this.nnuePath && fs.existsSync(this.nnuePath)) {
        this.send(`setoption name EvalFile value ${this.nnuePath}`);
      }
      this.send('isready');
    } catch {
      this.process = null;
    }
  }

  private send(cmd: string) {
    if (this.process && this.process.stdin.writable) {
      this.process.stdin.write(`${cmd}\n`);
    }
  }

  private handleOutput(data: string) {
    this.outputBuffer += data;
    const lines = this.outputBuffer.split('\n');
    this.outputBuffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (line === 'readyok') {
        this.isReady = true;
        this.processQueue();
      }

      if (line.startsWith('bestmove ') && this.currentSearch) {
        if (this.searchTimeout) {
          clearTimeout(this.searchTimeout);
          this.searchTimeout = null;
        }

        const parts = line.split(' ');
        const bestmove = parts[1];
        const search = this.currentSearch;
        this.currentSearch = null;

        if (bestmove && bestmove !== '(none)') {
          const coords = uciMoveToCoords(bestmove);
          search.resolve({
            bestmove,
            from: coords.from,
            to: coords.to
          });
        } else {
          search.reject(new Error('Pikafish returned no legal move (none)'));
        }

        this.processQueue();
      }
    }
  }

  private processQueue() {
    if (this.currentSearch || this.queue.length === 0) {
      return;
    }

    if (!this.process) {
      this.initProcess();
      return;
    }

    if (!this.isReady) {
      this.send('isready');
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.currentSearch = item;

    this.searchTimeout = setTimeout(() => {
      if (this.currentSearch === item) {
        this.currentSearch = null;
        this.searchTimeout = null;
        item.reject(new Error('Pikafish search timed out'));
        this.processQueue();
      }
    }, item.movetime + 8000);

    this.send(`position fen ${item.fen}`);
    this.send(`go depth ${item.depth} movetime ${item.movetime}`);
  }

  public async search(
    fen: string,
    options: { depth?: number; movetime?: number } = {}
  ): Promise<PikafishSearchResult> {
    if (!this.isAvailable()) {
      throw new Error('Pikafish binary not available');
    }

    const depth = options.depth || 8;
    const movetime = options.movetime || 600;

    return new Promise((resolve, reject) => {
      this.queue.push({
        fen,
        depth,
        movetime,
        resolve,
        reject
      });
      this.processQueue();
    });
  }

  public destroy() {
    if (this.process) {
      this.send('quit');
      this.process.kill();
      this.process = null;
    }
  }
}

export const pikafish = new PikafishEngine();
