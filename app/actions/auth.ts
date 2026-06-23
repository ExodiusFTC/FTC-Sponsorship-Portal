'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signupSchema } from '@/lib/schemas/auth'
import { sponsorSignupSchema, type SponsorSignupInput } from '@/lib/schemas/sponsor-signup'
import {
  sendCredentialUploadAlert,
  sendCoachSignupWelcomeEmail,
  sendWelcomeInAppNotification,
  sendSponsorApplicationConfirmation,
  sendSponsorApplicationAlert,
  createInAppNotification,
} from '@/lib/notify'

/**
 * Finalize a coach signup AFTER the Clerk session is active. The client wizard
 * creates + verifies the Clerk user first; this action then provisions the
 * `profiles` row, stores the credential file, mirrors the role into Clerk, and
 * fires the welcome / admin-alert notifications. It does NOT redirect — the
 * client owns navigation.
 */
export async function createCoachProfile(
  formData: FormData
): Promise<{ error?: string } | void> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return { error: 'Not authenticated' }

  // Parse JSON data
  const dataString = formData.get('data') as string
  if (!dataString) return { error: 'No data provided' }

  let rawData
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

  const adminClient = createAdminClient()

  // Derive extension from validated MIME type — never trust the client filename.
  const extByMime: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
  }
  const canonicalExt = extByMime[file.type]
  if (!canonicalExt) return { error: 'Invalid file type.' }
  // RLS partitions coach-credentials storage by Clerk id.
  const filePath = `${clerkUserId}/credentials_${Date.now()}.${canonicalExt}`

  const { error: uploadError } = await adminClient.storage
    .from('coach-credentials')
    .upload(filePath, file, { upsert: true })

  if (uploadError) {
    console.error('Failed to upload credentials:', uploadError)
    // Continue despite error; admin can request a re-upload later.
  }

  // Provision the coach profile keyed by the Clerk id. Profile creation is owned
  // here (the old handle_new_user DB trigger is gone).
  const { error: upsertError } = await adminClient
    .from('profiles')
    .upsert(
      {
        clerk_user_id: clerkUserId,
        role: 'coach',
        email: payload.email,
        full_name: payload.fullName,
        date_of_birth: payload.dateOfBirth,
        phone_number: payload.phoneNumber,
        address_line1: payload.addressLine1,
        city: payload.city,
        state: payload.state,
        zip_code: payload.zipCode,
        referral_source: payload.referralSource || null,
        coppa_acknowledged: payload.coppaAcknowledged,
        tos_accepted: payload.tosAccepted,
        age_confirmed_at: new Date().toISOString(),
        coach_credentials_url: uploadError ? null : filePath,
        pending_team_data: payload.teamData,
      } as never,
      { onConflict: 'clerk_user_id' }
    )

  if (upsertError) {
    console.error('Failed to upsert coach profile:', upsertError)
    return { error: 'Unable to create your profile right now. Please try again.' }
  }

  // Mirror the role into Clerk publicMetadata for client UX gating (not security).
  try {
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { role: 'coach' },
    })
  } catch (e) {
    console.error('Failed to mirror coach role into Clerk metadata:', e)
  }

  // Notify admins
  await sendCredentialUploadAlert(clerkUserId, payload.fullName, payload.email)

  // Welcome user
  await Promise.all([
    sendCoachSignupWelcomeEmail(payload.email, payload.fullName),
    sendWelcomeInAppNotification(clerkUserId, payload.fullName),
  ])
}

/**
 * Finalize a sponsor application AFTER the Clerk session is active. Mirrors
 * `createCoachProfile`: provisions the `profiles` row (role='sponsor',
 * `sponsor_id` stays null until an admin links the company), mirrors the role
 * into Clerk, records the `sponsor_applications` row, and notifies. No redirect.
 */
export async function createSponsorApplication(
  data: SponsorSignupInput
): Promise<{ error?: string } | void> {
  const result = sponsorSignupSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Validation failed: ' + result.error.issues.map(i => i.message).join(', ') }
  }

  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return { error: 'Not authenticated' }

  const payload = result.data

  const adminClient = createAdminClient()

  // Provision the sponsor profile keyed by the Clerk id. sponsor_id stays null
  // until an admin approves and links the company row.
  const { error: upsertError } = await adminClient
    .from('profiles')
    .upsert(
      {
        clerk_user_id: clerkUserId,
        role: 'sponsor',
        email: payload.email,
        full_name: payload.fullName,
        phone_number: payload.phoneNumber,
        address_line1: payload.companyAddress,
        coppa_acknowledged: payload.coppaAcknowledged,
        tos_accepted: payload.tosAccepted,
        age_confirmed_at: new Date().toISOString(),
      } as never,
      { onConflict: 'clerk_user_id' }
    )

  if (upsertError) {
    console.error('Failed to upsert sponsor profile:', upsertError)
    return { error: 'Unable to create your account right now. Please try again.' }
  }

  // Mirror the role into Clerk publicMetadata for client UX gating (not security).
  try {
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { role: 'sponsor' },
    })
  } catch (e) {
    console.error('Failed to mirror sponsor role into Clerk metadata:', e)
  }

  // Create a Sponsor Application entry
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

  // Send Notifications
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
          skipEmail: true,
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
}
