import { Skeleton } from '@/components/feedback/Skeleton'

export function TravelCardSkeleton() {
  return (
    <div className="@container overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-card p-4 @2xl:p-5">
      <div className="grid gap-x-6 gap-y-4 @2xl:grid-cols-[minmax(0,1fr)_188px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-5 w-28 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-1 flex-1 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-2 w-full max-w-[220px] rounded-full" />
          <Skeleton className="h-3 w-48 max-w-full" />
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-border-subtle pt-4 @2xl:flex-col @2xl:items-center @2xl:justify-center @2xl:gap-5 @2xl:border-l @2xl:border-t-0 @2xl:pl-6 @2xl:pt-0">
          <div className="flex flex-col gap-1.5 @2xl:items-center">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-10 w-[158px] rounded-lg" />
        </div>
      </div>
    </div>
  )
}
