import { z } from 'zod'

export const teamOnboardingSchema = z.object({
  status: z.enum(['existing', 'incubator']),
  ftcTeamNumber: z.number().optional(),
  teamName: z.string().min(2, 'Team name must be at least 2 characters'),
  organization: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  missionStatement: z.string().min(50, 'Mission statement should be at least 50 characters'),
  is501c3: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.status === 'existing' && !data.ftcTeamNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'FTC Team Number is required for existing teams',
      path: ['ftcTeamNumber'],
    })
  }
})

export type TeamOnboardingInput = z.infer<typeof teamOnboardingSchema>
