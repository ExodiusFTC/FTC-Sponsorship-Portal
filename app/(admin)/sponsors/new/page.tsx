import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SponsorForm } from '@/components/sponsor/sponsor-form'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export default async function NewSponsorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add Sponsor</h1>
        <Link href="/sponsors" className={buttonVariants({ variant: 'outline' })}>
          ← Back
        </Link>
      </div>
      <SponsorForm />
    </div>
  )
}
