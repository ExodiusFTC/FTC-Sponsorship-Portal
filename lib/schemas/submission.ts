import { z } from 'zod'

export const submissionSchema = z.object({
  sponsorId: z.string().uuid('Sponsor is required'),
  customPitchAlignment: z.string().min(50, 'Please explain why your team aligns with this company (min 50 chars).'),
  specificNeedsStatement: z.string().min(50, 'Please detail your specific financial or material needs.'),
  localConnectionNotes: z.string().optional(),
})

export type SubmissionInput = z.infer<typeof submissionSchema>
