import React, { useState } from 'react';
import { PieceColor } from '../types/chess';
import { i18n } from '../i18n';
import { Users, Bot, Gamepad2, ArrowRight, Sparkles, Cpu } from 'lucide-react';

interface LobbyModalProps {
  onCreateRoom: (options: {
    preferredColor: PieceColor | 'random';
    timeLimit: number;
    playerName: string;
  }) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
  onStartAi: (
    playerColor: PieceColor,
    engine: 'pikafish' | 'builtin',
    level: 'easy' | 'medium' | 'hard' | 'master'
  ) => void;
  onStartLocal: () => void;
  initialRoomCode?: string;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  onCreateRoom,
  onJoinRoom,
  onStartAi,
  onStartLocal,
  initialRoomCode
}) => {
  const [tab, setTab] = useState<'online' | 'ai' | 'local'>('online');
  const [playerName, setPlayerName] = useState('棋坛少侠');
  const [preferredColor, setPreferredColor] = useState<PieceColor | 'random'>(
    'random'
  );
  const [timeLimit, setTimeLimit] = useState<number>(600);
  const [joinCode, setJoinCode] = useState(initialRoomCode || '');
  const [aiEngine, setAiEngine] = useState<'pikafish' | 'builtin'>('pikafish');
  const [aiLevel, setAiLevel] = useState<'easy' | 'medium' | 'hard' | 'master'>('medium');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg bg-stone-900 border-2 border-amber-600/70 rounded-3xl p-6 md:p-8 shadow-[0_0_80px_rgba(217,119,6,0.3)]">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-black font-calligraphy text-amber-400 tracking-wider">
            {i18n.zh.appTitle}
          </h1>
          <p className="text-xs uppercase tracking-[0.25em] text-amber-200/70 font-serif-sc mt-1">
            {i18n.zh.subtitle}
          </p>
        </div>

        <div className="flex border-b border-stone-800 mb-6 gap-2">
          <button
            onClick={() => setTab('online')}
            className={`flex-1 pb-3 text-sm font-serif-sc flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              tab === 'online'
                ? 'border-amber-500 text-amber-400 font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            {i18n.zh.onlineBattle}
          </button>
          <button
            onClick={() => setTab('ai')}
            className={`flex-1 pb-3 text-sm font-serif-sc flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              tab === 'ai'
                ? 'border-amber-500 text-amber-400 font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            {i18n.zh.playWithAi}
          </button>
          <button
            onClick={() => setTab('local')}
            className={`flex-1 pb-3 text-sm font-serif-sc flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              tab === 'local'
                ? 'border-amber-500 text-amber-400 font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            {i18n.zh.localTwoPlayer}
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-stone-400 font-serif-sc mb-1">
            玩家称号
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-stone-200 focus:outline-none focus:border-amber-500 font-serif-sc"
            maxLength={12}
          />
        </div>

        {tab === 'online' && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800">
              <h3 className="text-sm font-bold text-amber-300 font-serif-sc mb-3">
                {i18n.zh.createRoom}
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setPreferredColor('red')}
                  className={`py-2 px-3 rounded-xl border text-xs font-serif-sc transition-colors cursor-pointer ${
                    preferredColor === 'red'
                      ? 'border-red-500 bg-red-950/60 text-red-300 font-bold'
                      : 'border-stone-800 bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {i18n.zh.redFirst}
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredColor('random')}
                  className={`py-2 px-3 rounded-xl border text-xs font-serif-sc transition-colors cursor-pointer ${
                    preferredColor === 'random'
                      ? 'border-amber-500 bg-amber-950/60 text-amber-300 font-bold'
                      : 'border-stone-800 bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {i18n.zh.randomSide}
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredColor('black')}
                  className={`py-2 px-3 rounded-xl border text-xs font-serif-sc transition-colors cursor-pointer ${
                    preferredColor === 'black'
                      ? 'border-stone-400 bg-stone-800 text-stone-200 font-bold'
                      : 'border-stone-800 bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {i18n.zh.blackSecond}
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-stone-400 font-serif-sc mb-1">
                  {i18n.zh.timeControl}
                </label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-serif-sc"
                >
                  <option value={0}>{i18n.zh.timeUnlimited}</option>
                  <option value={180}>{i18n.zh.time3m}</option>
                  <option value={300}>{i18n.zh.time5m}</option>
                  <option value={600}>{i18n.zh.time10m}</option>
                  <option value={1200}>{i18n.zh.time20m}</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() =>
                  onCreateRoom({
                    preferredColor,
                    timeLimit,
                    playerName: playerName || '房主'
                  })
                }
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-500 hover:to-yellow-500 text-stone-950 font-bold font-serif-sc shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                {i18n.zh.createRoom}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800">
              <h3 className="text-sm font-bold text-amber-300 font-serif-sc mb-3">
                {i18n.zh.joinRoom}
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={i18n.zh.inputRoomCode}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-stone-200 font-mono text-center tracking-widest uppercase focus:outline-none focus:border-amber-500"
                  maxLength={6}
                />
                <button
                  type="button"
                  disabled={!joinCode.trim()}
                  onClick={() =>
                    onJoinRoom(joinCode.trim(), playerName || '挑战者')
                  }
                  className="px-6 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-amber-400 font-bold font-serif-sc border border-stone-700 transition-colors cursor-pointer"
                >
                  {i18n.zh.joinRoom}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-300 font-serif-sc flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-amber-400" />
                {i18n.zh.engineSelect}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAiEngine('pikafish')}
                className={`p-3 rounded-xl border text-left font-serif-sc transition-all cursor-pointer ${
                  aiEngine === 'pikafish'
                    ? 'border-amber-500 bg-amber-950/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'border-stone-800 bg-stone-900 text-stone-400 hover:text-stone-200'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {i18n.zh.enginePikafish}
                </div>
                <div className="text-[10px] text-stone-400 mt-1 line-clamp-1">
                  {i18n.zh.enginePikafishDesc}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAiEngine('builtin')}
                className={`p-3 rounded-xl border text-left font-serif-sc transition-all cursor-pointer ${
                  aiEngine === 'builtin'
                    ? 'border-amber-500 bg-amber-950/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'border-stone-800 bg-stone-900 text-stone-400 hover:text-stone-200'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-300">
                  <Bot className="w-3.5 h-3.5" />
                  {i18n.zh.engineBuiltin}
                </div>
                <div className="text-[10px] text-stone-400 mt-1 line-clamp-1">
                  {i18n.zh.engineBuiltinDesc}
                </div>
              </button>
            </div>

            {aiEngine === 'pikafish' && (
              <div>
                <label className="block text-xs text-stone-400 font-serif-sc mb-1.5">
                  {i18n.zh.aiLevel}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['easy', 'medium', 'hard', 'master'] as const).map((lvl) => {
                    const label =
                      lvl === 'easy'
                        ? i18n.zh.levelEasy
                        : lvl === 'medium'
                        ? i18n.zh.levelMedium
                        : lvl === 'hard'
                        ? i18n.zh.levelHard
                        : i18n.zh.levelMaster;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setAiLevel(lvl)}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-serif-sc transition-colors cursor-pointer ${
                          aiLevel === lvl
                            ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold'
                            : 'border-stone-800 bg-stone-900 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-stone-800/80 pt-3">
              <label className="block text-xs text-stone-400 font-serif-sc mb-2">
                选择阵营开始对弈
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onStartAi('red', aiEngine, aiLevel)}
                  className="py-3 px-4 rounded-xl bg-red-950/70 border border-red-600/70 text-red-200 hover:bg-red-900/80 font-serif-sc font-bold transition-transform active:scale-95 cursor-pointer flex flex-col items-center gap-0.5"
                >
                  <span>执红先手</span>
                  <span className="text-[10px] text-red-400">红方出招</span>
                </button>
                <button
                  type="button"
                  onClick={() => onStartAi('black', aiEngine, aiLevel)}
                  className="py-3 px-4 rounded-xl bg-stone-800/80 border border-stone-600/70 text-stone-200 hover:bg-stone-700 font-serif-sc font-bold transition-transform active:scale-95 cursor-pointer flex flex-col items-center gap-0.5"
                >
                  <span>执黑后手</span>
                  <span className="text-[10px] text-stone-400">后发制人</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'local' && (
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-4 text-center">
            <h3 className="text-sm font-bold text-amber-300 font-serif-sc">
              双人同屏对战
            </h3>
            <p className="text-xs text-stone-400 font-serif-sc">
              两人在一台设备上轮流走棋，亲朋好友面对面切磋！
            </p>
            <button
              type="button"
              onClick={onStartLocal}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 text-stone-950 font-bold font-serif-sc shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              开始同屏对战
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
