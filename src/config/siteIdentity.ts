type SiteIdentityId = 'dx' | 'renamed';

interface SiteIdentity {
  productName: string;
}

const IDENTITIES: Record<SiteIdentityId, SiteIdentity> = {
  dx: { productName: 'MechvibesDX' },
  renamed: { productName: 'Mechvibes' },
};

const identityId: SiteIdentityId =
  import.meta.env.VITE_SITE_IDENTITY === 'renamed' ? 'renamed' : 'dx';

export const siteIdentity: SiteIdentity = IDENTITIES[identityId];

/** The Mechvibes website: home page, guides and the sound pack library. */
export const websiteUrl = 'https://mechvibes.com';

export const editorRepoUrl =
  'https://github.com/hainguyents13/mechvibes-editor';
