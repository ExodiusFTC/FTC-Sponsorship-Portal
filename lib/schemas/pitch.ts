import { z } from 'zod'

export const lineItemSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  qty: z.number().min(1, 'Quantity must be at least 1'),
  unitCostCents: z.number().min(0, 'Unit cost must be at least 0'),
  totalCents: z.number().min(0),
})

export type LineItemInput = z.infer<typeof lineItemSchema>

export const pitchSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  summary: z.string().min(20, 'Summary must be at least 20 characters'),
  costExplanation: z.string().min(50, 'Please provide a more detailed cost explanation'),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  financialAskCents: z.number().min(0),
  mediaUrls: z.array(z.string()).optional(),
})

export type PitchInput = z.infer<typeof pitchSchema>
