import { PageHeader } from '@/components/page-header'

export default function CoachLoading() {
  return (
    <div className="flex flex-col gap-10 opacity-60 animate-pulse">
      <PageHeader title="Loading..." subtitle="Fetching your dashboard..." />
      <div className="h-64 bg-card rounded-xl border border-border"></div>
    </div>
  )
}
