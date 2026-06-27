import { Skeleton } from '@/components/ui/skeleton'

export default function SponsorViewLoading() {
  return (
    <div className="min-h-screen">
      {/* Sticky header skeleton */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/85 px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      {/* Body */}
      <div className="mx-auto max-w-3xl space-y-12 px-6 py-10">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  )
}
