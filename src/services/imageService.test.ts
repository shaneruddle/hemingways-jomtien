import { beforeEach, describe, expect, it } from 'vitest';

import { imageService } from './imageService';

describe('ImageService', () => {
  beforeEach(() => {
    imageService.clearCache();
  });

  it('preserves year-like filename segments in Firebase Storage URLs', async () => {
    const resolved = await imageService.resolve(
      'gs://hemingways-jomtien-website.firebasestorage.app/specials/1788060964935-thanksgiving-2026.webp',
    );

    expect(resolved).toBe(
      '/api/image-proxy?path=specials%2F1788060964935-thanksgiving-2026.webp&bucket=hemingways-jomtien-website.firebasestorage.app',
    );
  });

  it('preserves year-like filename segments in direct storage paths', async () => {
    const resolved = await imageService.resolve(
      'specials/1788060964935-thanksgiving-2026.webp',
    );

    expect(resolved).toBe(
      '/api/image-proxy?path=specials%2F1788060964935-thanksgiving-2026.webp',
    );
  });

  it('continues to decode genuine encoded spaces', async () => {
    const resolved = await imageService.resolve('specials/thanksgiving%20menu.webp');

    expect(resolved).toBe(
      '/api/image-proxy?path=specials%2Fthanksgiving%20menu.webp',
    );
  });
});
