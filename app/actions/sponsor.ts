'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sponsorApplicationSchema, sponsorSchema, type SponsorApplicationInput, type SponsorInput } from '@/lib/schemas/sponsor'
import { sendSponsorApplicationConfirmation } from '@/lib/notify'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getClientIp, validateRateLimit, requireAdmin } from '@/lib/actions-utils'

export async function submitSponsorApplication(data: SponsorApplicationInput) {
  const result = sponsorApplicationSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided' }
  }

  const { companyName, contactName, contactEmail, proposedCapCents, message } = result.data
  const ip = await getClientIp()
  const limit = await validateRateLimit(`sponsor_app_${contactEmail.toLowerCase()}_${ip}`)
  if ('error' in limit) return limit

  // Use admin client since the user may be unauthenticated
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('sponsor_applications')
    .insert({
      company_name: companyName,
      contact_name: contactName,
      contact_email: contactEmail,
      proposed_cap_cents: proposedCapCents,
      message,
    })

  if (error) {
    return { error: error.message }
  }

  try {
    await sendSponsorApplicationConfirmation(
      companyName,
      contactEmail,
      contactName ?? 'Sponsor',
      proposedCapCents
    )
  } catch (e) {
    console.error('Failed to send sponsor application confirmation email:', e)
  }

  return { success: true }
}

export async function adminCreateSponsor(data: SponsorInput) {
  const result = sponsorSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided' }
  }

  let user, adminClient
  try {
    const auth = await requireAdmin()
    user = auth.user
    adminClient = auth.adminClient
  } catch (e: any) {
    return { error: e.message }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`admin_create_sponsor_${user.id}_${ip}`)
  if ('error' in limit) return limit

  const { error } = await adminClient
    .from('sponsors')
    .insert({
      company_name: result.data.companyName,
      industry: result.data.industry || null,
      website: result.data.website || null,
      contact_name: result.data.contactName,
      contact_email: result.data.contactEmail,
      contact_title: result.data.contactTitle || null,
      funding_cap_cents: result.data.fundingCapCents,
      status: result.data.status,
      notes: result.data.notes || null,
      source: 'admin_added',
    })

  if (error) {
    return { error: error.message }
  }

  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    action: 'create_sponsor',
    entity_type: 'sponsors',
    metadata: result.data as any,
  })

  revalidatePath('/sponsors')
  return { success: true }
}

export async function adminUpdateSponsor(id: string, data: SponsorInput) {
  const result = sponsorSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided' }
  }

  let user, adminClient
  try {
    const auth = await requireAdmin()
    user = auth.user
    adminClient = auth.adminClient
  } catch (e: any) {
    return { error: e.message }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`admin_update_sponsor_${user.id}_${ip}`)
  if ('error' in limit) return limit

  const { error } = await adminClient
    .from('sponsors')
    .update({
      company_name: result.data.companyName,
      industry: result.data.industry || null,
      website: result.data.website || null,
      contact_name: result.data.contactName,
      contact_email: result.data.contactEmail,
      contact_title: result.data.contactTitle || null,
      funding_cap_cents: result.data.fundingCapCents,
      status: result.data.status,
      notes: result.data.notes || null,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Write to audit log
  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    action: 'update_sponsor',
    entity_type: 'sponsors',
    entity_id: id,
    metadata: data as any,
  })

  revalidatePath('/sponsors')
  return { success: true }
}

const deleteSponsorSchema = z.object({ id: z.string().uuid() })

export async function deleteSponsor(id: string): Promise<{ success?: true; error?: string }> {
  const parsed = deleteSponsorSchema.safeParse({ id })
  if (!parsed.success) return { error: 'Invalid sponsor id' }

  let user, adminClient
  try {
    const auth = await requireAdmin()
    user = auth.user
    adminClient = auth.adminClient
  } catch (e: any) {
    return { error: e.message }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`admin_delete_sponsor_${user.id}_${ip}`)
  if ('error' in limit) return limit

  // Snapshot for audit metadata before delete.
  const { data: snapshot } = await adminClient
    .from('sponsors')
    .select('*')
    .eq('id', parsed.data.id)
    .single()

  if (!snapshot) return { error: 'Sponsor not found' }

  const { error } = await adminClient.from('sponsors').delete().eq('id', parsed.data.id)
  if (error) return { error: error.message }

  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    action: 'delete_sponsor',
    entity_type: 'sponsors',
    entity_id: parsed.data.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: { snapshot } as any,
  })

  revalidatePath('/sponsors')
  return { success: true }
}

/**
 * Search sponsors by company name, industry, or notes using the pg full-text
 * search index.  Falls back to an alphabetical listing when no query is given.
 * Uses the GIN-indexed `search_vector` column for efficient lookups.
 */
export async function searchSponsors(query?: string) {
  let adminClient
  try {
    const auth = await requireAdmin()
    adminClient = auth.adminClient
  } catch (e: any) {
    return { error: e.message as string }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`admin_search_sponsors_${ip}`)
  if ('error' in limit) return limit

  const trimmed = query?.trim() ?? ''

  if (trimmed) {
    const { data, error } = await adminClient
      .from('sponsors')
      .select('*')
      .textSearch('search_vector', trimmed, { type: 'websearch', config: 'english' })

    if (error) return { error: error.message }
    return { data: data ?? [] }
  }

  const { data, error } = await adminClient
    .from('sponsors')
    .select('*')
    .order('company_name', { ascending: true })

  if (error) return { error: error.message }
  return { data: data ?? [] }
}

/**
 * Promote a pending sponsor_applications row into a real sponsors record and
 * link any sponsor profile that signed up under the same email. This is the
 * official onboarding flow for self-applied sponsors — without it, sponsors
 * who use signUpSponsor() can never call requireSponsor() because their
 * profile.sponsor_id is null.
 */
export async function approveSponsorApplication(applicationId: string) {
  const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: applicationId })
  if (!parsed.success) return { error: 'Invalid application id' }

  let user, adminClient
  try {
    const auth = await requireAdmin()
    user = auth.user
    adminClient = auth.adminClient
  } catch (e: any) {
    return { error: e.message }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`admin_approve_sponsor_app_${user.id}_${ip}`)
  if ('error' in limit) return limit

  const { data: app, error: appErr } = await adminClient
    .from('sponsor_applications')
    .select('*')
    .eq('id', applicationId)
    .single()
  if (appErr || !app) return { error: 'Application not found' }
  if ((app as any).status === 'approved') return { error: 'Already approved' }

  const { data: sponsor, error: spErr } = await adminClient
    .from('sponsors')
    .insert({
      company_name: app.company_name,
      contact_name: app.contact_name,
      contact_email: app.contact_email,
      funding_cap_cents: app.proposed_cap_cents,
      status: 'active',
      source: 'public_optin',
    })
    .select('id')
    .single()
  if (spErr || !sponsor) return { error: spErr?.message ?? 'Failed to create sponsor' }

  // Link any existing sponsor profile (created by signUpSponsor) to this sponsor row.
  await adminClient
    .from('profiles')
    .update({ sponsor_id: sponsor.id } as any)
    .eq('role', 'sponsor')
    .eq('email', app.contact_email)

  await adminClient
    .from('sponsor_applications')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    } as any)
    .eq('id', applicationId)

  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    action: 'approve_sponsor_application',
    entity_type: 'sponsor_applications',
    entity_id: applicationId,
    metadata: { sponsor_id: sponsor.id, contact_email: app.contact_email } as any,
  })

  revalidatePath('/admin/sponsors')
  revalidatePath('/admin')
  return { success: true, sponsorId: sponsor.id }
}

/** Lightweight toggle — only updates status, no full schema validation required. */
export async function adminToggleSponsorStatus(id: string, newStatus: 'active' | 'inactive') {
  let user, adminClient
  try {
    const auth = await requireAdmin()
    user = auth.user
    adminClient = auth.adminClient
  } catch (e: any) {
    return { error: e.message }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`admin_toggle_sponsor_${user.id}_${ip}`)
  if ('error' in limit) return limit

  const { error } = await adminClient
    .from('sponsors')
    .update({ status: newStatus })
    .eq('id', id)

  if (error) return { error: error.message }

  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    action: 'toggle_sponsor_status',
    entity_type: 'sponsors',
    entity_id: id,
    metadata: { newStatus },
  })

  revalidatePath('/sponsors')
  return { success: true }
}

