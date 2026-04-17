'use server'

import { createClient } from '@/lib/supabase/server'
import { signupSchema, loginSchema, type SignupInput, type LoginInput } from '@/lib/schemas/auth'
import { redirect } from 'next/navigation'
import { env } from '@/lib/env'

export async function signUp(data: SignupInput) {
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

  redirect('/')
}
