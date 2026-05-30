export type FeatureNavItem = {
  href: string;
  label: string;
  description: string;
  group: 'Video' | 'Images' | 'Publishing';
};

export const featureNavItems: FeatureNavItem[] = [
  {
    href: '/',
    label: 'Video Builder',
    description: 'Search clips and render TikTok videos',
    group: 'Video',
  },
  {
    href: '/posts',
    label: 'Post Images',
    description: 'Generate square vocabulary posts',
    group: 'Images',
  },
  {
    href: '/formal-contrast',
    label: 'Formal Contrast',
    description: 'Compare casual and formal phrasing',
    group: 'Images',
  },
  {
    href: '/read-along',
    label: 'Read Along',
    description: 'Scrolling reading practice with vocab dock',
    group: 'Video',
  },
  {
    href: '/opengraph',
    label: 'OpenGraph',
    description: 'Create horizontal blog share images',
    group: 'Publishing',
  },
  {
    href: '/engagement-card',
    label: 'End Card',
    description: 'Final like and follow card',
    group: 'Publishing',
  },
];
