import { describe, it, expect } from 'vitest'
import { teamOnboardingSchema } from '../schemas/team'

const VALID_EXISTING_BASE = {
  status: 'existing' as const,
  ftcTeamNumber: 12345,
  teamName: 'Test Robotics',
  city: 'San Jose',
  state: 'California',
  missionStatement: 'A'.repeat(60),
  taxStatus: '501c3' as const,
  budgetItems: [],
  financialAskCents: 0,
}

describe('teamOnboardingSchema — missionStatement', () => {
  it('strips XSS script tag from missionStatement', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      missionStatement: '<script>alert(1)</script>' + 'A'.repeat(60),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.missionStatement).not.toContain('<script>')
    }
  })

  it('fails when plain-text is under 50 chars', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      missionStatement: '<p>' + 'A'.repeat(30) + '</p>',
    })
    expect(result.success).toBe(false)
  })

  it('passes when formatted HTML has 60+ plain-text chars', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      missionStatement: '<p><strong>' + 'A'.repeat(60) + '</strong></p>',
    })
    expect(result.success).toBe(true)
  })

  it('fails when plain-text exceeds 1500 chars', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      missionStatement: 'A'.repeat(1501),
    })
    expect(result.success).toBe(false)
  })
})

describe('teamOnboardingSchema — technicalSummary', () => {
  it('strips XSS from technicalSummary', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      technicalSummary: '<img src=x onerror=alert(1)>valid content here',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.technicalSummary).not.toContain('onerror')
    }
  })

  it('passes when technicalSummary is undefined (optional)', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      technicalSummary: undefined,
    })
    expect(result.success).toBe(true)
  })

  it('fails when plain-text exceeds 2000 chars', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      technicalSummary: 'A'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })
})
