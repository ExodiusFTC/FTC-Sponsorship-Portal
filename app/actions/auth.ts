'use server'

import { createClient } from '@/lib/supabase/server'
import { signupSchema, loginSchema, type SignupInput, type LoginInput } from '@/lib/schemas/auth'
import { redirect } from 'next/navigation'
import { env } from '@/lib/env'
import { checkActionLimit } from '@/lib/rate-limit'
import { sendCredentialUploadAlert } from '@/lib/notify'

export async function signUp(data: SignupInput) {
  const limit = await checkActionLimit(`signup_${data.email}`)
  if (!limit.ok) {
    return { error: 'rate_limited', retryAfterSeconds: limit.retryAfterSeconds, limit: limit.limit }
  }

  const result = signupSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided' }
  }

  const { fullName, email, password } = result.data
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        age_confirmed_at: new Date().toISOString(),
      },
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/verify-email')
}

export async function signIn(data: LoginInput) {
  const result = loginSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided' }
  }

  const { email, password } = result.data
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function uploadCredentials(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) {
    return { error: 'No file provided' }
  }

  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  if (file.size > MAX_SIZE) {
    return { error: 'File too large. Maximum size is 5MB.' }
  }

  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png']
  if (!allowedMimes.includes(file.type)) {
    return { error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' }
  }

  // Server-side magic bytes validation
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer).subarray(0, 4)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  
  let isValid = false
  if (file.type === 'application/pdf' && hex.startsWith('25504446')) isValid = true
  if (file.type === 'image/jpeg' && hex.startsWith('ffd8ff')) isValid = true
  if (file.type === 'image/png' && hex === '89504e47') isValid = true
  
  if (!isValid) {
    return { error: 'Invalid file format.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const fileExt = file.name.split('.').pop()
  const filePath = `${user.id}/credentials.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('coach-credentials')
    .upload(filePath, file, {
      upsert: true,
    })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ coach_credentials_url: filePath })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  // Notify admins. Fire-and-forget; failures are logged inside notify and must not
  // block the redirect. Note: redirect() throws, so this MUST run before it.
  const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single()
  if (profile) {
    await sendCredentialUploadAlert(user.id, profile.full_name, profile.email)
  }

  redirect('/awaiting-verification')
}
