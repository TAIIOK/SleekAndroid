import { afterEach, describe, expect, it } from 'vitest';

import { consumeWatchSession, markWatchSessionOpen, peekWatchSession } from './watchResumeSync';

afterEach(() => {
  consumeWatchSession();
});

describe('watchResumeSync', () => {
  it('starts closed', () => {
    expect(peekWatchSession()).toBe(false);
    expect(consumeWatchSession()).toBe(false);
  });

  it('consumes a watch session once', () => {
    markWatchSessionOpen();
    expect(peekWatchSession()).toBe(true);
    expect(consumeWatchSession()).toBe(true);
    expect(peekWatchSession()).toBe(false);
    expect(consumeWatchSession()).toBe(false);
  });
});
