/**
 * Centralised site configuration.
 * Edit this file to update stats, sponsors, mock data, and copy
 * across the entire landing page without touching component code.
 */

// ─── Theme ───────────────────────────────────────────────────────────────────
// Professional Steel palette (Slate)
export const ACCENT_DARK_TEXT = "#657ba1ff"  // Slate 400
export const ACCENT_DARK_GLOBE = "#ffffff" // Slate 600
export const ACCENT_LIGHT_TEXT = "#617c98ff" // Slate 800
export const ACCENT_LIGHT_GLOBE = "#000000" // Slate 500

// ─── Season ──────────────────────────────────────────────────────────────────
export const CURRENT_SEASON = '2026'
export const DISPATCH_SEASON_LABEL = `Season ${CURRENT_SEASON} dispatch window open`

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
  { to: 'partnerships@northwind.example', team: 'Iron Eagles · 14256', status: 'pending' },
  { to: 'grants@cascade-mfg.example', team: 'Circuit Breakers · 9871', status: 'approved' },
  { to: 'community@brightpath.example', team: 'Voltage Vipers · 18203', status: 'pending' },
  { to: 'giving@summit-labs.example', team: 'Gear Daemons · 7412', status: 'changes' },
] as const

// ─── Footer social links ─────────────────────────────────────────────────────
export const FOOTER_SOCIALS = [
  { label: 'Website', href: 'https://firstinspires.org', icon: 'Globe' },
  { label: 'Contact', href: 'mailto:exodiusftc@gmail.com', icon: 'Mail' },
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
export const HERO_MORPHING_WORDS = ['sponsorship', 'partnership', 'opportunity', 'investment', 'connection', 'breakthrough', 'endorsement', 'contribution'] as const
export const HERO_DESCRIPTION = 'The professional sponsorship pipeline for FIRST Tech Challenge coaches. Build a verified portfolio, send moderated pitches, and connect with the industry leaders powering the next generation.'
