import { redirect } from 'next/navigation'

export default function LegacySponsorsBrowsePage() {
  redirect('/dashboard?tab=sponsors')
}
