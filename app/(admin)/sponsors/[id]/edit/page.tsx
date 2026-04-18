import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SponsorForm } from '@/components/sponsor/sponsor-form'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { DeleteButton } from '../delete-button'

export default async function EditSponsorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: sponsor } = await supabase
    .from('sponsors')
    .select(
      'id, company_name, industry, website, contact_name, contact_email, contact_title, funding_cap_cents, status, notes'
    )
    .eq('id', id)
    .single()

  if (!sponsor) notFound()

  return (
    <div className="container mx-auto max-w-2xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Sponsor</h1>
        <div className="flex items-center gap-2">
          <Link href="/sponsors" className={buttonVariants({ variant: 'outline' })}>
            ← Back
          </Link>
          <DeleteButton sponsorId={sponsor.id} sponsorName={sponsor.company_name} />
        </div>
      </div>
      <SponsorForm initialSponsor={sponsor} />
    </div>
  )
}
