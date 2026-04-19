/**
 * Centralised site configuration.
 * Edit this file to update stats, sponsors, mock data, and copy
 * across the entire landing page without touching component code.
 */

// ─── Platform stats ─────────────────────────────────────────────────────────
export const PLATFORM_STATS = [
  { label: 'Teams onboarded', value: 0, suffix: '+' },
  { label: 'Sponsors active', value: 0, suffix: '' },
  { label: 'Avg. review time', value: 0, suffix: 'h' },
  { label: 'Pitches dispatched', value: 0, suffix: '' },
] as const

// ─── Season ──────────────────────────────────────────────────────────────────
export const CURRENT_SEASON = '2026'
export const DISPATCH_SEASON_LABEL = `Season ${CURRENT_SEASON} dispatch window open`

// ─── Sponsors marquee ────────────────────────────────────────────────────────
// Add real sponsor names here as the platform grows.
export const MARQUEE_SPONSORS = [
  'Gringotts Bank',
  'Ollivanders Wands',
  'Weasleys Wizard Wheezes',
  'Honeydukes',
  'Quality Quidditch Supplies',
  'The Daily Prophet',
  'Flourish and Blotts',
  'Madam Malkins',
  'The Leaky Cauldron',
  'Borgin and Burkes',
  'Slug and Jiggers',
  'The Quibbler',
]

// ─── Portfolio mock (product showcase) ───────────────────────────────────────
export const PORTFOLIO_MOCK = {
  teamNumber: '31579',
  teamName: 'Exodius',
  budgetItems: [
    { label: `Outreach, Q1 ${CURRENT_SEASON}`, funded: '$2,400', goal: '$5,000' },
    { label: 'Robot build', funded: '$1,100', goal: '$2,800' },
    { label: 'Travel to Regionals', funded: '$0', goal: '$3,200' },
  ],
}

// ─── Moderation queue mock ───────────────────────────────────────────────────
export const MODERATION_MOCK_ROWS = [
  { to: 'griphook@gringotts.test', team: 'The Golden Snitches', status: 'pending' },
  { to: 'garrick@ollivanders.test', team: 'Ravenclaw Roboteers', status: 'approved' },
  { to: 'fred@weasley.test', team: 'Gryffindor Gearheads', status: 'pending' },
  { to: 'rita@prophet.test', team: 'The Golden Snitches', status: 'changes' },
] as const

// ─── Footer social links ─────────────────────────────────────────────────────
export const FOOTER_SOCIALS = [
  { label: 'Website', href: 'https://firstinspires.org', icon: 'Globe' },
  { label: 'Contact', href: 'mailto:hello@matchmaker.app', icon: 'Mail' },
  { label: 'FTC Forum', href: 'https://ftcforum.firstinspires.org', icon: 'AtSign' },
] as const

// ─── Footer columns ───────────────────────────────────────────────────────────
export const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'For coaches', href: '/signup' },
      { label: 'For sponsors', href: '/sponsors/apply' },
      { label: 'Sign in', href: '/login' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'How it works', href: '#how' },
      { label: 'FAQ', href: '#faq' },
      { label: 'FIRST Inspires', href: 'https://firstinspires.org' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Privacy', href: '/legal/privacy' },
    ],
  },
] as const

// ─── Hero copy ───────────────────────────────────────────────────────────────
export const HERO_TITLE_TOP = 'One'
export const HERO_TITLE_BOTTOM = 'away from fueling your FTC journey.'
export const HERO_MORPHING_WORDS = ['sponsorship', 'partnership', 'opportunity', 'connection', 'endorsement', 'breakthrough', 'investment', 'contribution'] as const;
export const HERO_DESCRIPTION = 'The professional sponsorship pipeline for FIRST Tech Challenge coaches. Build a verified portfolio, send moderated pitches, and connect with the industry leaders powering the next generation.'
