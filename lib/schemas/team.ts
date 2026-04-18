import { z } from 'zod'

export const DRIVETRAIN_OPTIONS = ['mecanum', 'swerve', 'tank', 'other'] as const
export const BUILD_SYSTEM_OPTIONS = ['gobilda', 'rev', 'custom', 'other'] as const
export const PROGRAMMING_OPTIONS = ['java', 'blocks', 'other'] as const

export const teamOnboardingSchema = z.object({
  status: z.enum(['existing', 'incubator']),
  ftcTeamNumber: z.number().optional(),
  teamName: z.string().min(2, 'Team name must be at least 2 characters'),
  tagline: z
    .string()
    .max(250, 'Tagline must be 250 characters or fewer')
    .optional(),
  organization: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  missionStatement: z
    .string()
    .min(50, 'Mission statement should be at least 50 characters')
    .max(1500, 'Mission statement must be 1500 characters or fewer'),
  taxStatus: z.enum(['501c3', 'School', 'None']),
  communityInterestText: z.string().max(2000, 'Must be 2000 characters or fewer').optional(),
  seedFundingGoalsCents: z.number().int().nonnegative().optional(),

  technicalSummary: z.string().max(2000, 'Must be 2000 characters or fewer').optional(),
  outreachSummary: z.string().max(2000, 'Must be 2000 characters or fewer').optional(),
  drivetrain: z.enum(DRIVETRAIN_OPTIONS).optional(),
  buildSystem: z.enum(BUILD_SYSTEM_OPTIONS).optional(),
  programming: z.enum(PROGRAMMING_OPTIONS).optional(),
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
  cadSoftware: z.string().max(200).optional(),
  controlSystem: z.enum(['rev_control_hub', 'android_phone', 'other']).optional().or(z.literal('')),
  sensors: z.array(z.enum(['odometry','pid','computer_vision','custom_algorithms'])).default([]),
  githubLink: z.string().url().optional().or(z.literal('')),
  autonomousDescription: z.string().max(750).optional(),
  proudestMechanismName: z.string().max(200).optional(),
  proudestMechanismProblem: z.string().max(500).optional(),
  proudestMechanismSolution: z.string().max(1000).optional(),
  subteamBreakdown: z.string().max(1000).optional(),
  manufacturingCapabilities: z.array(z.enum(['3d_printing','cnc','lathe','laser_cutter'])).default([]),
  visualPitchItems: z.array(z.object({ url: z.string(), caption: z.string().max(100) })).default([]),
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
})

export type TeamOnboardingInput = z.infer<typeof teamOnboardingSchema>
