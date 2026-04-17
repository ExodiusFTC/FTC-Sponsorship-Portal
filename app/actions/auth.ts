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
  await sendCredentialUploadAlert({ coachId: user.id })

  redirect('/awaiting-verification')
}
