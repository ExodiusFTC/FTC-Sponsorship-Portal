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

// ─── Sponsors showcase ───────────────────────────────────────────────────────
// Cards displayed in the #sponsors section. Add real sponsors here as the
// platform grows; keep descriptions concise (≤ 2 sentences).
export const SPONSORS_SHOWCASE = [
  {
    name: 'Gringotts Capital',
    industry: 'Financial Services',
    tier: 'Platinum',
    description: 'Empowering the next generation of STEM innovators through targeted FIRST Robotics investments.',
    href: '#',
  },
  {
    name: 'Ollivanders Precision',
    industry: 'Advanced Manufacturing',
    tier: 'Gold',
    description: 'Crafting the tools that build tomorrow — proud partner of competitive robotics programs nationwide.',
    href: '#',
  },
  {
    name: 'Weasley Tech Co.',
    industry: 'Consumer Electronics',
    tier: 'Gold',
    description: 'We believe tinkering changes the world. That\'s why we sponsor teams that build, break, and build again.',
    href: '#',
  },
  {
    name: 'Honeydukes Labs',
    industry: 'Biotechnology',
    tier: 'Silver',
    description: 'Investing in scientific curiosity and hands-on STEM education at the grassroots level.',
    href: '#',
  },
  {
    name: 'QQ Supplies Co.',
    industry: 'Engineering & Supply',
    tier: 'Silver',
    description: 'Providing premium components and materials to FTC teams competing at the highest levels.',
    href: '#',
  },
  {
    name: 'The Daily Dispatch',
    industry: 'Media & Communications',
    tier: 'Bronze',
    description: 'Amplifying STEM stories and spotlighting team achievements across our regional readership.',
    href: '#',
  },
] as const

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
export const HERO_MORPHING_WORDS = ['sponsorship', 'partnership', 'opportunity', 'investment', 'connection', 'breakthrough', 'endorsement', 'contribution'] as const
export const HERO_DESCRIPTION = 'The professional sponsorship pipeline for FIRST Tech Challenge coaches. Build a verified portfolio, send moderated pitches, and connect with the industry leaders powering the next generation.'
