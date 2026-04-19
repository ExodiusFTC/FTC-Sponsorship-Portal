'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const DEV_CREDENTIALS = {
  coach: { email: 'noreply+coach-1776482921139@exodiusftc.com', password: 'devpassword123!', name: 'Smoke Coach' },
  admin: { email: 'anish.yarrakonda456@gmail.com', password: 'devpassword123!', name: 'Dev Admin' },
  sponsor: { email: 'devsponsor@test.local', password: 'devpassword123!', name: 'Test Sponsor' },
} as const

type Role = 'coach' | 'admin' | 'sponsor'

export async function devSignIn(role: Role) {
  if (process.env.NODE_ENV !== 'development') {
    return { error: 'Dev login is only available in development mode.' }
  }

  const { email, password, name } = DEV_CREDENTIALS[role]
  const admin = createAdminClient()

  // Check if user already exists
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existing = existingUsers?.users?.find(u => u.email === email)

  if (!existing) {
    // Create user with email pre-confirmed
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    })

    if (createErr || !created?.user) {
      return { error: createErr?.message ?? 'Failed to create dev user' }
    }

    // For admin and sponsor roles, update profile role and verification (trigger creates the profile)
    if (role === 'admin' || role === 'sponsor') {
      // Brief wait for profile trigger to fire
      await new Promise(r => setTimeout(r, 1000))
      
      let sponsorId: string | null = null
      if (role === 'sponsor') {
        // Find or create a test sponsor record
        const { data: sponsor, error: sponsorFetchError } = await admin
          .from('sponsors')
          .select('id')
          .eq('company_name', 'Test Sponsor Corp')
          .maybeSingle()
        
        if (sponsorFetchError) console.error("Sponsor fetch error:", sponsorFetchError)

        if (!sponsor) {
          const { data: newSponsor, error: sponsorCreateError } = await admin
            .from('sponsors')
            .insert({
              company_name: 'Test Sponsor Corp',
              contact_name: 'Test Sponsor',
              contact_email: email,
              funding_cap_cents: 500000, // $5k
              status: 'active',
            })
            .select()
            .single()
          if (sponsorCreateError) console.error("Sponsor create error:", sponsorCreateError)
          sponsorId = newSponsor?.id ?? null
        } else {
          sponsorId = sponsor.id
        }
      }

      const { error: profileUpdateError } = await admin
        .from('profiles')
        .update({ 
          role: role === 'admin' ? 'admin' : 'sponsor', 
          coach_verified: true,
          sponsor_id: sponsorId
        })
        .eq('id', created.user.id)
      
      if (profileUpdateError) {
        console.error("Profile update error (new user):", profileUpdateError)
        return { error: `Failed to set ${role} role: ${profileUpdateError.message}` }
      }
    }
  } else if (role === 'admin' || role === 'sponsor') {
    // Ensure existing dev admin/sponsor has correct role and verification
    let sponsorId: string | null = null
    if (role === 'sponsor') {
      const { data: sponsor } = await admin
        .from('sponsors')
        .select('id')
        .eq('company_name', 'Test Sponsor Corp')
        .maybeSingle()
      sponsorId = sponsor?.id ?? null
    }

    const { error: profileUpdateError } = await admin
      .from('profiles')
      .update({ 
        role: role === 'admin' ? 'admin' : 'sponsor', 
        coach_verified: true,
        sponsor_id: sponsorId
      })
      .eq('id', existing.id)
    
    if (profileUpdateError) {
      console.error("Profile update error (existing user):", profileUpdateError)
      return { error: `Failed to update ${role} role: ${profileUpdateError.message}. Did you run migration 0030?` }
    }
  }

  // Sign in via normal password auth
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    return { error: signInError.message }
  }

  const redirectPath = role === 'admin' ? '/admin' : role === 'sponsor' ? '/sponsor/dashboard' : '/dashboard'
  redirect(redirectPath)
}
