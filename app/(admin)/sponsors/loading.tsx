import { Skeleton } from '@/components/ui/skeleton'

export default function SponsorsLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-border bg-muted/30">
          {['Company', 'Contact', 'Status', 'Cap', 'Used / Remaining', ''].map((_, i) => (
            <Skeleton key={i} className="h-3 w-full max-w-[80px]" />
          ))}
        </div>
        {/* Table rows */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-border last:border-0 items-center">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-4 w-24 ml-auto" />
            <Skeleton className="h-7 w-20 rounded-md ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
