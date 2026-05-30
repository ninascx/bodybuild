type QuickStatus = { label: string; value: string; helper: string; tone: 'positive' | 'warning' | 'neutral' }

const summaryPriority = ['热量', '蛋白', '训练', '体重', '睡眠', '计划', '步数', '疲劳']

function sortSummaryStatuses(statuses: QuickStatus[]) {
  return [...statuses]
    .sort((a, b) => summaryPriority.indexOf(a.label) - summaryPriority.indexOf(b.label))
    .slice(0, 3)
}

export function DailySummaryStrip({ statuses }: { statuses: QuickStatus[] }) {
  const summaryStatuses = sortSummaryStatuses(statuses)

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/70">
      <div className="grid grid-cols-3 gap-2">
        {summaryStatuses.map((status) => (
          <div
            key={status.label}
            className={`min-w-0 rounded-md bg-white px-2.5 py-2 dark:bg-slate-900 ${
              status.tone === 'warning'
                ? 'text-amber-900 dark:text-amber-100'
                : status.tone === 'positive'
                  ? 'text-emerald-800 dark:text-emerald-200'
                  : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{status.label}</p>
            <p className="mt-1 truncate text-sm font-semibold tabular-nums">{status.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
