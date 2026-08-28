import { describe, expect, it } from 'vitest';

import {
  ASK_HEMI_VISITOR_ID_KEY,
  getOrCreateAskHemiVisitorId,
} from './askHemiIdentity';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

const cryptoImpl = {
  randomUUID: () => '12345678-1234-1234-1234-123456789abc',
  getRandomValues: <T extends ArrayBufferView | null>(array: T) => array,
};

describe('Ask Hemi visitor identity', () => {
  it('keeps one anonymous identity for the same browser', () => {
    const storage = memoryStorage();
    const first = getOrCreateAskHemiVisitorId({ storage, cryptoImpl });
    const second = getOrCreateAskHemiVisitorId({
      storage,
      cryptoImpl: {
        ...cryptoImpl,
        randomUUID: () => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      },
    });

    expect(first).toBe('hwj_web_12345678123412341234123456789abc');
    expect(second).toBe(first);
    expect(storage.getItem(ASK_HEMI_VISITOR_ID_KEY)).toBe(first);
  });

  it('replaces an invalid stored identity', () => {
    const storage = memoryStorage();
    storage.setItem(ASK_HEMI_VISITOR_ID_KEY, 'invalid');

    expect(getOrCreateAskHemiVisitorId({ storage, cryptoImpl })).toBe(
      'hwj_web_12345678123412341234123456789abc',
    );
  });
});
