import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

function richTextField(min: number, max: number, minMsg: string, maxMsg: string) {
  return z
    .string()
    .trim()
    .transform((val) => DOMPurify.sanitize(val))
    .superRefine((val, ctx) => {
      const text = val.replace(/<[^>]*>?/gm, '').trim()
      if (text.length < min) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: min,
          type: 'string',
          inclusive: true,
          message: minMsg,
          origin: 'string',
        })
      }
      if (text.length > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: max,
          type: 'string',
          inclusive: true,
          message: maxMsg,
          origin: 'string',
        })
      }
    })
}

export const submissionSchema = z.object({
  sponsorId: z.string().uuid('Sponsor is required'),
  customPitchAlignment: richTextField(
    50,
    1500,
    'Please explain why your team aligns with this company (min 50 chars).',
    'Pitch alignment must be 1500 characters or fewer'
  ),
  specificNeedsStatement: richTextField(
    50,
    1500,
    'Please detail your specific financial or material needs.',
    'Specific needs must be 1500 characters or fewer'
  ),
  localConnectionNotes: z.string().max(1000, 'Must be 1000 characters or fewer').optional(),
})

export type SubmissionInput = z.infer<typeof submissionSchema>
