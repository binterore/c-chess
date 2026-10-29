import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HomeScreen } from '../src/components/HomeScreen';
import { RulesGuide } from '../src/components/RulesGuide';
import { BoardEditor } from '../src/components/BoardEditor';
import { CollectionPanel } from '../src/components/CollectionPanel';
import { createInitialBoard } from '../src/engine/rules';
import type { PlayerProfile } from '../src/types/chess';

const profile: PlayerProfile = {
  id: 'component-test-player',
  name: '测试棋手',
  createdAt: Date.now(),
  gamesPlayed: 3,
  wins: 2,
  losses: 1,
  draws: 0,
  puzzlesSolved: 4,
  totalMoves: 80,
  dailyDates: ['2026-10-29']
};

describe('functional screens', () => {
  it('renders the home screen with real archive and daily entries', () => {
    const html = renderToStaticMarkup(
      <HomeScreen board={createInitialBoard()} skin="figurine" quality="balanced" renderMode="2d" soundOn onMode={() => undefined} onToggleSound={() => undefined} onSettings={() => undefined} onDaily={() => undefined} onArchive={() => undefined} onRules={() => undefined} onCollection={() => undefined} />
    );
    expect(html).toContain('棋谱库');
    expect(html).toContain('今日一局');
    expect(html).toContain('二维兼容模式');
  });

  it('renders interactive rules, editor, and season collection', () => {
    expect(renderToStaticMarkup(<RulesGuide onClose={() => undefined} />)).toContain('一子一式');
    expect(renderToStaticMarkup(<BoardEditor onStart={() => undefined} onClose={() => undefined} />)).toContain('从任意局面开始');
    expect(renderToStaticMarkup(<CollectionPanel profile={profile} records={[]} skin="classic" onSkin={() => undefined} onClose={() => undefined} />)).toContain('本季棋具工坊');
  });
});
