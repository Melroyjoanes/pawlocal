import { Skeleton } from '@/components/ui/skeleton'

// Shown by Next.js immediately (via each route's loading.tsx) while the
// server component for that route fetches data — on a slow connection this
// is the difference between a branded skeleton and a blank white flash.
export function RouteSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-28 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  )
}
