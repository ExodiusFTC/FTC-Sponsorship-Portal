import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border pb-0">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-t-md" />)}
      </div>
      {/* Content */}
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}
