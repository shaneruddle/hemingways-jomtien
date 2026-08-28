export const ASK_HEMI_VISITOR_ID_KEY = 'hemingways.ask_hemi.visitor_id.v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CryptoLike {
  randomUUID?: () => string;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
}

export function isAskHemiVisitorId(value: unknown): value is string {
  return typeof value === 'string' && /^hwj_web_[a-zA-Z0-9_-]{16,}$/.test(value);
}

function randomHex(cryptoImpl: CryptoLike): string {
  const bytes = new Uint8Array(18);
  cryptoImpl.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getOrCreateAskHemiVisitorId({
  storage,
  cryptoImpl,
}: {
  storage: StorageLike;
  cryptoImpl: CryptoLike;
}): string {
  const existing = storage.getItem(ASK_HEMI_VISITOR_ID_KEY);
  if (isAskHemiVisitorId(existing)) return existing;

  const randomPart = cryptoImpl.randomUUID
    ? cryptoImpl.randomUUID().replaceAll('-', '')
    : randomHex(cryptoImpl);
  const visitorId = `hwj_web_${randomPart}`;
  storage.setItem(ASK_HEMI_VISITOR_ID_KEY, visitorId);
  return visitorId;
}
