import { describe, it, expect } from 'vitest'
import { submissionSchema } from '../schemas/submission'

const VALID_BASE = {
  sponsorId: '550e8400-e29b-41d4-a716-446655440000',
  customPitchAlignment: 'A'.repeat(60),
  specificNeedsStatement: 'B'.repeat(60),
}

describe('submissionSchema — customPitchAlignment', () => {
  it('strips <script> XSS from customPitchAlignment', () => {
    const result = submissionSchema.safeParse({
      ...VALID_BASE,
      customPitchAlignment: '<script>alert(1)</script>' + 'A'.repeat(60),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customPitchAlignment).not.toContain('<script>')
    }
  })

  it('fails when plain-text content is under 50 chars (ignores HTML tags)', () => {
    const result = submissionSchema.safeParse({
      ...VALID_BASE,
      customPitchAlignment: '<p><strong>' + 'A'.repeat(30) + '</strong></p>',
    })
    expect(result.success).toBe(false)
  })

  it('passes when plain-text is over 50 chars even if HTML string is long', () => {
    const manyTags = '<p><strong><em>' + 'A'.repeat(60) + '</em></strong></p>'
    const result = submissionSchema.safeParse({
      ...VALID_BASE,
      customPitchAlignment: manyTags,
    })
    expect(result.success).toBe(true)
  })

  it('fails when plain-text exceeds 1500 chars', () => {
    const result = submissionSchema.safeParse({
      ...VALID_BASE,
      customPitchAlignment: 'A'.repeat(1501),
    })
    expect(result.success).toBe(false)
  })
})

describe('submissionSchema — specificNeedsStatement', () => {
  it('strips XSS from specificNeedsStatement', () => {
    const result = submissionSchema.safeParse({
      ...VALID_BASE,
      specificNeedsStatement: '<img src=x onerror=alert(1)>' + 'B'.repeat(60),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.specificNeedsStatement).not.toContain('onerror')
    }
  })

  it('fails when plain-text is under 50 chars', () => {
    const result = submissionSchema.safeParse({
      ...VALID_BASE,
      specificNeedsStatement: 'Short',
    })
    expect(result.success).toBe(false)
  })
})
