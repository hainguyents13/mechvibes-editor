import { describe, expect, it } from 'vitest';
import { websiteUrl } from '@/config/siteIdentity';
import { type LibraryPackSummary, packPageUrl } from './websiteApi';

describe('packPageUrl', () => {
  const pack = (fields: Partial<LibraryPackSummary>): LibraryPackSummary => ({
    id: 'mv-1',
    slug: 'blue',
    name: 'Blue',
    status: 'PUBLISHED',
    revision: 2,
    iconUrl: null,
    removedReason: null,
    updatedAt: '2026-10-30T13:20:00.000Z',
    ...fields,
  });

  it('links a published pack to its page in the library', () => {
    expect(packPageUrl(pack({}))).toBe(`${websiteUrl}/sound-packs/blue`);
  });

  it('has no page for a draft or a removed pack', () => {
    expect(packPageUrl(pack({ status: 'DRAFT', revision: 0 }))).toBeNull();
    expect(packPageUrl(pack({ status: 'REMOVED' }))).toBeNull();
  });
});
