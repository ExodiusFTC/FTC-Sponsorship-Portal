import { redirect } from 'next/navigation'

export default function LegacyTeamEditPage() {
  redirect('/dashboard?tab=portfolio')
}
