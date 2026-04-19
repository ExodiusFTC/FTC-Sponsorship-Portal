import { z } from 'zod'

// Legacy exports kept for any import sites; values no longer enforce DB enums
export const DRIVETRAIN_OPTIONS = ['mecanum', 'swerve', 'tank', 'other'] as const
export const BUILD_SYSTEM_OPTIONS = ['gobilda', 'rev', 'custom', 'other'] as const
export const PROGRAMMING_OPTIONS = ['java', 'blocks', 'other'] as const

const locationRegex = /^[A-Za-z][A-Za-z .'-]{1,79}$/
const emptyToUndefined = (value: unknown) => {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export const teamOnboardingSchema = z.object({
  status: z.enum(['existing', 'incubator']),
  ftcTeamNumber: z.number().int().min(1, 'Team number must be positive').max(999999, 'Invalid FTC team number').optional(),
  teamName: z.string().trim().min(2, 'Team name must be at least 2 characters').max(120, 'Team name must be 120 characters or fewer'),
  tagline: z
    .string()
    .trim()
    .max(250, 'Tagline must be 250 characters or fewer')
    .optional(),
  organization: z.string().trim().max(200, 'Organization must be 200 characters or fewer').optional(),
  city: z
    .string()
    .trim()
    .min(2, 'City is required')
    .regex(locationRegex, 'City can only contain letters, spaces, periods, apostrophes, and hyphens'),
  state: z
    .string()
    .trim()
    .min(2, 'State is required')
    .max(40, 'State must be 40 characters or fewer')
    .regex(/^[A-Za-z][A-Za-z .'-]*$/, 'State can only contain letters, spaces, periods, apostrophes, and hyphens'),
  missionStatement: z
    .string()
    .trim()
    .min(50, 'Mission statement should be at least 50 characters')
    .max(1500, 'Mission statement must be 1500 characters or fewer'),
  taxStatus: z.enum(['501c3', 'School', 'None']),
  communityInterestText: z.string().trim().max(2000, 'Must be 2000 characters or fewer').optional(),
  seedFundingGoalsCents: z.number().int().nonnegative().optional(),

  technicalSummary: z.string().trim().max(2000, 'Must be 2000 characters or fewer').optional(),
  outreachSummary: z.string().trim().max(2000, 'Must be 2000 characters or fewer').optional(),
  // Free-form text fields — DB columns changed to plain TEXT in migration 0024
  drivetrain: z.string().trim().max(120).optional(),
  buildSystem: z.string().trim().max(120).optional(),
  programming: z.string().trim().max(120).optional(),
  mediaUrls: z.array(z.string().trim().url('Media URLs must be valid URLs')).max(12, 'Please provide at most 12 media URLs').default([]),
  youtubeUrl: z.preprocess((value) => emptyToUndefined(value), z.string().url().optional().nullable()),
  budgetItems: z.array(
    z.object({
      label: z.string().trim().min(1, 'Label required').max(120, 'Label is too long'),
      qty: z.number().int().positive('Must be positive'),
      unitCostCents: z.number().int().nonnegative('Must be non-negative'),
      totalCents: z.number().int().nonnegative(),
    })
  ).max(50, 'Please limit budget items to 50').default([]),
  financialAskCents: z.number().int().nonnegative().default(0),
  cadSoftware: z.string().trim().max(200).optional(),
  controlSystem: z.string().trim().max(200).optional(),
  // Comma-separated free-form text; converted to text[] by the action
  sensors: z.string().trim().max(400).optional(),
  githubLink: z.preprocess((value) => emptyToUndefined(value), z.string().url().optional()),
  autonomousDescription: z.string().trim().max(750).optional(),
  proudestMechanismName: z.string().trim().max(200).optional(),
  proudestMechanismProblem: z.string().trim().max(1000).optional(),
  proudestMechanismSolution: z.string().trim().max(1000).optional(),
  subteamBreakdown: z.string().trim().max(1000).optional(),
  // Comma-separated free-form text; converted to text[] by the action
  manufacturingCapabilities: z.string().trim().max(500).optional(),
  visualPitchItems: z.array(z.object({ url: z.string().trim().url(), caption: z.string().trim().max(100) })).max(20).default([]),
  achievements: z.array(
    z.object({
      season: z.string().trim().min(4, 'Season required').max(20),
      eventName: z.string().trim().min(2, 'Event name required').max(120),
      award: z.string().trim().max(200).optional(),
      description: z.string().trim().max(500).optional(),
    })
  ).max(25).default([]),
  coachPhotoUrl: z.preprocess((value) => emptyToUndefined(value), z.string().url().optional().nullable()),
}).superRefine((data, ctx) => {
  if (data.status === 'existing' && !data.ftcTeamNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'FTC Team Number is required for existing teams',
      path: ['ftcTeamNumber'],
    })
  }
  if (data.status === 'incubator') {
    if (!data.communityInterestText || data.communityInterestText.length < 50 || data.communityInterestText.length > 2000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please describe community interest in at least 50 characters',
        path: ['communityInterestText'],
      })
    }
    if (data.seedFundingGoalsCents === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Seed funding goal is required for incubator teams',
        path: ['seedFundingGoalsCents'],
      })
    }
  }

  let computedBudgetTotal = 0
  for (const [index, item] of data.budgetItems.entries()) {
    const computed = item.qty * item.unitCostCents
    computedBudgetTotal += computed
    if (computed !== item.totalCents) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Budget line item total does not match qty x unit cost',
        path: ['budgetItems', index, 'totalCents'],
      })
    }
  }

  if (computedBudgetTotal !== data.financialAskCents) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Portfolio ask must equal the sum of all budget line items',
      path: ['financialAskCents'],
    })
  }
})

export type TeamOnboardingInput = z.infer<typeof teamOnboardingSchema>
