'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sponsorApplicationSchema, sponsorSchema, type SponsorApplicationInput, type SponsorInput } from '@/lib/schemas/sponsor'
import { sendSponsorApplicationConfirmation } from '@/lib/notify'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export async function submitSponsorApplication(data: SponsorApplicationInput) {
  const result = sponsorApplicationSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided' }
  }

  const { companyName, contactName, contactEmail, proposedCapCents, message } = result.data

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

  await sendSponsorApplicationConfirmation(
    companyName,
    contactEmail,
    contactName ?? 'Sponsor',
    proposedCapCents
  )

  return { success: true }
}

export async function adminCreateSponsor(data: SponsorInput) {
  const result = sponsorSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided' }
  }

  const supabase = createAdminClient()
  const authClient = await createClient()

  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Forbidden: Admin access required' }
  }

  const { error } = await supabase
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

  await supabase.from('audit_log').insert({
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

  const supabase = createAdminClient()
  const authClient = await createClient()

  // Verify the acting user is an admin
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Forbidden: Admin access required' }
  }

  const { error } = await supabase
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
  await supabase.from('audit_log').insert({
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

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Forbidden: Admin access required' }
  }

  const supabase = createAdminClient()

  // Snapshot for audit metadata before delete.
  const { data: snapshot } = await supabase
    .from('sponsors')
    .select('*')
    .eq('id', parsed.data.id)
    .single()

  if (!snapshot) return { error: 'Sponsor not found' }

  const { error } = await supabase.from('sponsors').delete().eq('id', parsed.data.id)
  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
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

/** Lightweight toggle — only updates status, no full schema validation required. */
export async function adminToggleSponsorStatus(id: string, newStatus: 'active' | 'inactive') {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Forbidden' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('sponsors')
    .update({ status: newStatus })
    .eq('id', id)

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'toggle_sponsor_status',
    entity_type: 'sponsors',
    entity_id: id,
    metadata: { newStatus },
  })

  revalidatePath('/sponsors')
  return { success: true }
}
