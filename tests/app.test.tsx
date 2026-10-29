import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { App } from '../src/App';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  get length() { return this.data.size; }
}

beforeAll(() => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  const fakeWindow = {
    innerWidth: 1280,
    matchMedia: () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
    location: { search: '', pathname: '/' },
    history: { replaceState: () => undefined }
  };
  Object.defineProperty(globalThis, 'window', { value: fakeWindow, configurable: true });
  Object.defineProperty(globalThis, 'document', {
    value: {
      createElement: () => ({ getContext: () => null }),
      querySelector: () => null,
      getElementById: () => null
    },
    configurable: true
  });
});

describe('application shell', () => {
  it('renders the complete home screen without browser startup errors', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('将·界');
    expect(html).toContain('棋谱库');
    expect(html).toContain('二维兼容模式');
  });
});
