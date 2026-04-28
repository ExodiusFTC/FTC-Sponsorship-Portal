'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signupSchema } from '@/lib/schemas/auth'
import { redirect } from 'next/navigation'
import { env } from '@/lib/env'
import { sendCredentialUploadAlert, sendCoachSignupWelcomeEmail, sendWelcomeInAppNotification } from '@/lib/notify'
import { getClientIp, validateAuthLimit } from '@/lib/actions-utils'

import { sponsorSignupSchema, type SponsorSignupInput } from '@/lib/schemas/sponsor-signup'
import { sendSponsorApplicationConfirmation, sendSponsorApplicationAlert, createInAppNotification } from '@/lib/notify'

export async function signUpSponsor(data: SponsorSignupInput) {
  const result = sponsorSignupSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Validation failed: ' + result.error.issues.map(i => i.message).join(', ') }
  }

  const payload = result.data
  const ip = await getClientIp()
  const limit = await validateAuthLimit(`sponsor_signup_${payload.email}_${ip}`)
  if ('error' in limit) return limit

  const supabase = await createClient()
  const adminClient = createAdminClient()

  // 1. Create Auth User - Include role in metadata so trigger handles it correctly
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName,
        role: 'sponsor',
      },
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (authError || !authData.user) {
    if (authError?.message.toLowerCase().includes('already')) {
      return { error: 'Unable to create account. If this email is already registered, please log in.' }
    }
    return { error: `Unable to create account: ${authError?.message || 'Unknown error'}` }
  }

  const userId = authData.user.id

  // 2. Update Profile - Set role and extra info (retry if needed due to trigger delay)
  let profileUpdateSuccess = false
  for (let i = 0; i < 3; i++) {
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        role: 'sponsor',
        phone_number: payload.phoneNumber,
        address_line1: payload.companyAddress,
        coppa_acknowledged: payload.coppaAcknowledged,
        tos_accepted: payload.tosAccepted,
      } as any)
      .eq('id', userId)

    if (!profileError) {
      profileUpdateSuccess = true
      break
    }
    await new Promise(r => setTimeout(r, 500))
  }

  if (!profileUpdateSuccess) {
    console.error('Failed to update sponsor profile after retries')
  }

  // 3. Create a Sponsor Application entry
  const { error: appError } = await adminClient
    .from('sponsor_applications')
    .insert({
      company_name: payload.companyName,
      contact_name: payload.fullName,
      contact_email: payload.email,
      proposed_cap_cents: payload.proposedCapCents,
      message: payload.sponsorshipReason,
    })

  if (appError) {
    console.error('Failed to create sponsor application entry:', appError)
  }

  // 4. Send Notifications
  try {
    // Confirmation to sponsor
    await sendSponsorApplicationConfirmation(
      payload.companyName,
      payload.email,
      payload.fullName,
      payload.proposedCapCents
    )

    // Alert to admins (Email)
    await sendSponsorApplicationAlert(
      payload.companyName,
      payload.fullName,
      payload.email,
      payload.proposedCapCents
    )

    // Alert to admins (In-App)
    const { data: admins } = await adminClient.from('profiles').select('id').eq('role', 'admin')
    if (admins) {
      await Promise.all(admins.map(admin => 
        createInAppNotification({
          recipientId: admin.id,
          type: 'general',
          title: 'New Sponsor Application',
          body: `${payload.companyName} (${payload.fullName}) has applied to become a sponsor.`,
        })
      ))
    }
  } catch (e) {
    console.error('Failed to send sponsor notifications:', e)
  }

  redirect('/verify-email')
}

export async function signUp(formData: FormData) {
  // Parse JSON data
  const dataString = formData.get('data') as string
  if (!dataString) return { error: 'No data provided' }

  let rawData;
  try {
    rawData = JSON.parse(dataString)
  } catch {
    return { error: 'Invalid JSON data' }
  }

  // Parse File
  const file = formData.get('photoIdFile') as File | null
  if (!file) return { error: 'Photo ID upload is required' }

  // Validate File
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  if (file.size > MAX_SIZE) return { error: 'Photo ID file too large. Maximum size is 5MB.' }

  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png']
  if (!allowedMimes.includes(file.type)) {
    return { error: 'Invalid file type for Photo ID. Only PDF, JPG, and PNG are allowed.' }
  }

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer).subarray(0, 4)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

  let isValid = false
  if (file.type === 'application/pdf' && hex.startsWith('25504446')) isValid = true
  if (file.type === 'image/jpeg' && hex.startsWith('ffd8ff')) isValid = true
  if (file.type === 'image/png' && hex === '89504e47') isValid = true

  if (!isValid) return { error: 'Invalid Photo ID file format.' }

  // Validate Data
  const result = signupSchema.safeParse(rawData)
  if (!result.success) {
    return { error: 'Validation failed: ' + result.error.issues.map(i => i.message).join(', ') }
  }

  const payload = result.data
  const ip = await getClientIp()
  const limit = await validateAuthLimit(`signup_${payload.email}_${ip}`)
  if ('error' in limit) return limit

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName,
      },
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (authError || !authData.user) {
    if (authError?.message.toLowerCase().includes('already')) {
      return { error: 'Unable to create account. If this email is already registered, please log in.' }
    }
    return { error: 'Unable to create account right now. Please try again.' }
  }

  const userId = authData.user.id

  // Derive extension from validated MIME type — never trust the client filename.
  const extByMime: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
  }
  const canonicalExt = extByMime[file.type]
  if (!canonicalExt) return { error: 'Invalid file type.' }
  const filePath = `${userId}/credentials_${Date.now()}.${canonicalExt}`

  const { error: uploadError } = await adminClient.storage
    .from('coach-credentials')
    .upload(filePath, file, { upsert: true })

  if (uploadError) {
    console.error('Failed to upload credentials:', uploadError)
    // Continue despite error, we can retry upload later or notify admin
  }

  // Update profile with all the extra fields using admin client
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({
      date_of_birth: payload.dateOfBirth,
      phone_number: payload.phoneNumber,
      address_line1: payload.addressLine1,
      city: payload.city,
      state: payload.state,
      zip_code: payload.zipCode,
      referral_source: payload.referralSource || null,
      coppa_acknowledged: payload.coppaAcknowledged,
      tos_accepted: payload.tosAccepted,
      coach_credentials_url: uploadError ? null : filePath,
      pending_team_data: payload.teamData,
    })
    .eq('id', userId)

  if (updateError) {
    console.error('Failed to update profile data:', updateError)
  }

  // Notify admins
  await sendCredentialUploadAlert(userId, payload.fullName, payload.email)

  // Welcome user
  await Promise.all([
    sendCoachSignupWelcomeEmail(payload.email, payload.fullName),
    sendWelcomeInAppNotification(userId, payload.fullName)
  ])

  redirect('/verify-email')
}

import { loginSchema, type LoginInput } from '@/lib/schemas/auth'

export async function forgotPassword(email: string) {
  const parsed = z.string().email().safeParse(email.trim().toLowerCase())
  if (!parsed.success) return { error: 'Please enter a valid email address.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  })

  if (error) return { error: 'Unable to send reset email. Please try again.' }
  return { success: true }
}

export async function resetPassword(password: string) {
  const parsed = z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[a-z]/, 'Must include a lowercase letter')
    .regex(/[0-9]/, 'Must include a number')
    .safeParse(password)

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data })
  if (error) return { error: 'Unable to update password. The reset link may have expired.' }
  return { success: true }
}

export async function signIn(data: LoginInput) {
  const result = loginSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided' }
  }

  const { email, password } = result.data
  const ip = await getClientIp()
  const limit = await validateAuthLimit(`signin_${email}_${ip}`)
  if ('error' in limit) return limit

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Invalid email or password.' }
  }

  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
