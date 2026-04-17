'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sponsorApplicationSchema, sponsorSchema, type SponsorApplicationInput, type SponsorInput } from '@/lib/schemas/sponsor'
import { redirect } from 'next/navigation'

export async function submitSponsorApplication(data: SponsorApplicationInput) {
  const result = sponsorApplicationSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided' }
  }

  const { companyName, contactEmail, proposedCapCents, message } = result.data

  // Use admin client since the user may be unauthenticated
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('sponsor_applications')
    .insert({
      company_name: companyName,
      contact_email: contactEmail,
      proposed_cap_cents: proposedCapCents,
      message,
    })

  if (error) {
    return { error: error.message }
  }

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

  return { success: true }
}
