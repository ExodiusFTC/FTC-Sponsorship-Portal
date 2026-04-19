import { z } from 'zod'
import { teamOnboardingSchema } from './team'

export const signupSchema = z.object({
  // Step 1: Account
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(200),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
    .regex(/[a-z]/, 'Password must include at least one lowercase letter')
    .regex(/[0-9]/, 'Password must include at least one number'),
  confirmPassword: z.string().min(12, 'Password confirmation must be at least 12 characters'),
  
  // Step 2: Coach Identity
  dateOfBirth: z.string().min(1, 'Date of birth is required').refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
  phoneNumber: z.string().trim().min(10, 'Phone number is required (at least 10 digits)'),
  addressLine1: z.string().trim().min(5, 'Address is required'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  zipCode: z.string().trim().min(5, 'Zip/Postal code is required'),
  
  // Step 3: Verification & Compliance
  photoIdFile: z.any().optional(), // Used on client side only, handled manually before auth trigger
  photoIdUrl: z.string().url().optional(), // Can be set after upload
  ageConfirmed: z.literal(true, { message: 'You must confirm you are 18 or older to register.' }),
  coppaAcknowledged: z.literal(true, { message: 'You must acknowledge your COPPA responsibilities.' }),
  tosAccepted: z.literal(true, { message: 'You must accept the Terms of Service and Privacy Policy.' }),
  referralSource: z.string().trim().optional(),
  
  // Step 4 & 5: Team Data
  teamData: teamOnboardingSchema,

}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export type SignupInput = z.infer<typeof signupSchema>

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>
