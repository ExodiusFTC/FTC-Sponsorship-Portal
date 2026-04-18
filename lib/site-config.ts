/**
 * Centralised site configuration.
 * Edit this file to update stats, sponsors, mock data, and copy
 * across the entire landing page without touching component code.
 */

// ─── Platform stats ─────────────────────────────────────────────────────────
export const PLATFORM_STATS = [
  { label: 'Teams onboarded', value: 12, suffix: '+' },
  { label: 'Sponsors active', value: 7, suffix: '' },
  { label: 'Avg. review time', value: 4, suffix: 'h' },
  { label: 'Pitches dispatched', value: 31, suffix: '' },
] as const

// ─── Season ──────────────────────────────────────────────────────────────────
export const CURRENT_SEASON = '2026'
export const DISPATCH_SEASON_LABEL = `Season ${CURRENT_SEASON} dispatch window open`

// ─── Sponsors marquee ────────────────────────────────────────────────────────
// Add real sponsor names here as the platform grows.
export const MARQUEE_SPONSORS = [
  'Sponsor A',
  'Sponsor B',
  'Sponsor C',
  'Sponsor D',
  'Sponsor E',
  'Sponsor F',
  'Sponsor G',
  'Sponsor H',
  'Sponsor I',
  'Sponsor J',
  'Sponsor K',
  'Sponsor L',
]

// ─── Portfolio mock (product showcase) ───────────────────────────────────────
export const PORTFOLIO_MOCK = {
  teamNumber: '21996',
  teamName: 'Exodius',
  budgetItems: [
    { label: `Outreach, Q1 ${CURRENT_SEASON}`, funded: '$2,400', goal: '$5,000' },
    { label: 'Robot build', funded: '$1,100', goal: '$2,800' },
    { label: 'Travel to Regionals', funded: '$0', goal: '$3,200' },
  ],
}

// ─── Moderation queue mock ───────────────────────────────────────────────────
export const MODERATION_MOCK_ROWS = [
  { to: 'grants@revrobotics.com', team: 'Exodius', status: 'pending' },
  { to: 'stem@ti.com', team: 'Voltrex', status: 'approved' },
  { to: 'community@gobilda.com', team: 'NovaDrive', status: 'pending' },
  { to: 'education@qualcomm.com', team: 'Exodius', status: 'changes' },
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
export const HERO_TITLE_BOTTOM = 'away from fueling your mission.'
export const HERO_MORPHING_WORDS = ['sponsorship', 'partnership', 'opportunity', 'connection', 'endorsement', 'breakthrough', 'investment', 'contribution'] as const;
export const HERO_DESCRIPTION = 'The professional sponsorship pipeline for FIRST Tech Challenge coaches. Build a verified portfolio, send moderated pitches, and connect with the industry leaders powering the next generation.'
