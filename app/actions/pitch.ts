'use server'

import { createClient } from '@/lib/supabase/server'
import { pitchSchema, type PitchInput } from '@/lib/schemas/pitch'
import { redirect } from 'next/navigation'

export async function savePitch(data: PitchInput, status: 'draft' | 'submitted' = 'draft') {
  const result = pitchSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get the coach's team
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!team) {
    return { error: 'Team not found. Please complete onboarding first.' }
  }

  const { title, summary, costExplanation, lineItems, financialAskCents } = result.data

  const { data: pitch, error } = await supabase
    .from('pitches')
    .insert({
      team_id: team.id,
      title,
      summary,
      cost_explanation: costExplanation,
      line_items: lineItems,
      financial_ask_cents: financialAskCents,
      status,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
