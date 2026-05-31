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
    href: '/quiz',
    label: 'Quiz Reveal',
    description: 'German multiple choice videos with timed answer reveal',
    group: 'Video',
  },
  {
    href: '/cover',
    label: 'TikTok Cover',
    description: 'Generate reusable vertical cover images',
    group: 'Publishing',
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
