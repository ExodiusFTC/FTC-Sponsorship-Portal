import { PageHeader } from '@/components/page-header'

export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-10 opacity-60 animate-pulse">
      <PageHeader title="Loading..." subtitle="Please wait while we fetch the latest data." />
      <div className="h-64 bg-card rounded-xl border border-border"></div>
      <div className="h-64 bg-card rounded-xl border border-border"></div>
    </div>
  )
}
