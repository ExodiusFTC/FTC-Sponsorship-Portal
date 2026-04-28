import { Skeleton } from '@/components/ui/skeleton'

export default function SponsorLoading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
