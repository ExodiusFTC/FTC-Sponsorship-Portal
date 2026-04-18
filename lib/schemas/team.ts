import { z } from 'zod'

export const teamOnboardingSchema = z.object({
  status: z.enum(['existing', 'incubator']),
  ftcTeamNumber: z.number().optional(),
  teamName: z.string().min(2, 'Team name must be at least 2 characters'),
  organization: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  missionStatement: z.string().min(50, 'Mission statement should be at least 50 characters'),
  taxStatus: z.enum(['501c3', 'School', 'None']),
  communityInterestText: z.string().optional(),
  seedFundingGoalsCents: z.number().int().nonnegative().optional(),
  
  technicalSummary: z.string().optional(),
  outreachSummary: z.string().optional(),
  mediaUrls: z.array(z.string()).default([]),
  youtubeUrl: z.string().optional().nullable(),
  budgetItems: z.array(
    z.object({
      label: z.string().min(1, 'Label required'),
      qty: z.number().int().positive('Must be positive'),
      unitCostCents: z.number().int().nonnegative('Must be non-negative'),
      totalCents: z.number().int().nonnegative(),
    })
  ).default([]),
  financialAskCents: z.number().int().nonnegative().default(0),
}).superRefine((data, ctx) => {
  if (data.status === 'existing' && !data.ftcTeamNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'FTC Team Number is required for existing teams',
      path: ['ftcTeamNumber'],
    })
  }
  if (data.status === 'incubator') {
    if (!data.communityInterestText || data.communityInterestText.length < 50) {
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
})

export type TeamOnboardingInput = z.infer<typeof teamOnboardingSchema>
