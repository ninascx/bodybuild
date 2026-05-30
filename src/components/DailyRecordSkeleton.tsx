import { Card, DisclosurePanel } from './ui'

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />
}

export function DailyRecordSkeleton() {
  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-32" />
          <SkeletonBlock className="hidden h-4 w-56 bg-slate-100 dark:bg-slate-800 sm:block" />
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <SkeletonBlock className="h-11 w-48" />
        </div>
      </div>

      <section className="rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-20" />
            <SkeletonBlock className="h-3 w-44 bg-slate-100 dark:bg-slate-800" />
          </div>
          <SkeletonBlock className="h-7 w-12 rounded-full" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <SkeletonBlock key={item} className="h-8 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
        <SkeletonBlock className="mt-3 h-11 w-full bg-slate-300 dark:bg-slate-600" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-24" />
            <SkeletonBlock className="h-3 w-36 bg-slate-100 dark:bg-slate-800" />
          </div>
          <SkeletonBlock className="h-3 w-20 bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="space-y-2">
              <SkeletonBlock className="h-4 w-20 bg-slate-100 dark:bg-slate-800" />
              <SkeletonBlock className="h-12 w-full bg-slate-100 dark:bg-slate-800" />
              <div className="flex gap-1.5">
                <SkeletonBlock className="h-8 w-16 rounded-md bg-slate-100 dark:bg-slate-800" />
                <SkeletonBlock className="h-8 w-16 rounded-md bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/70">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-md bg-white px-2.5 py-2 dark:bg-slate-900">
              <SkeletonBlock className="h-3 w-10 bg-slate-100 dark:bg-slate-800" />
              <SkeletonBlock className="mt-2 h-4 w-16 bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
        <SkeletonBlock className="h-5 w-24" />
        <DisclosurePanel className="mt-3 bg-white dark:bg-slate-900" title="最近 6 周日历">
          <span className="sr-only">正在加载日历</span>
        </DisclosurePanel>
        <DisclosurePanel className="mt-3 bg-white dark:bg-slate-900" title="身体状态">
          <span className="sr-only">正在加载身体状态</span>
        </DisclosurePanel>
      </section>
    </Card>
  )
}
