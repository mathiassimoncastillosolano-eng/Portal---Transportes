import { Skeleton } from '@/components/feedback/Skeleton'

export function TravelCardSkeleton() {
  return (
    <div className="@container overflow-hidden rounded-2xl border border-border bg-surface-card">
      <div className="grid @2xl:grid-cols-[minmax(0,1fr)_200px]">
        <div className="flex min-w-0 flex-col gap-4 p-4 @2xl:p-5">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-start gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="mt-6 h-1 flex-1 rounded-full" />
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex gap-1.5">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-border-subtle bg-surface-sunken/40 p-4 @2xl:flex-col @2xl:items-stretch @2xl:justify-center @2xl:gap-4 @2xl:border-l @2xl:border-t-0 @2xl:p-5">
          <div className="flex flex-col gap-1.5 @2xl:items-center">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-7 w-24" />
          </div>
          <Skeleton className="h-10 w-[148px] rounded-lg @2xl:w-full" />
        </div>
      </div>
    </div>
  )
}
