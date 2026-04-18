import { z } from 'zod'

export const submissionSchema = z.object({
  sponsorId: z.string().uuid('Sponsor is required'),
  customPitchAlignment: z
    .string()
    .min(50, 'Please explain why your team aligns with this company (min 50 chars).')
    .max(1500, 'Pitch alignment must be 1500 characters or fewer'),
  specificNeedsStatement: z
    .string()
    .min(50, 'Please detail your specific financial or material needs.')
    .max(1500, 'Specific needs must be 1500 characters or fewer'),
  localConnectionNotes: z.string().max(1000, 'Must be 1000 characters or fewer').optional(),
})

export type SubmissionInput = z.infer<typeof submissionSchema>
