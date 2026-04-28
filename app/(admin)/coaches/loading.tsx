import { Skeleton } from '@/components/ui/skeleton'

export default function CoachesLoading() {
  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Section: Awaiting Verification */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 flex gap-5">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-32" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-8 w-32 rounded-md shrink-0 self-center" />
          </div>
        ))}
      </div>

      {/* Section: Verified Coaches */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-36" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 flex gap-5">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-8 w-28 rounded-md shrink-0 self-center" />
          </div>
        ))}
      </div>
    </div>
  )
}
