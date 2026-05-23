export function BudgetTile({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${danger ? 'border-rose-200 bg-rose-50 dark:border-rose-600/40 dark:bg-rose-900/30' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${danger ? 'text-rose-700' : 'text-slate-950'}`}>{value}</p>
    </div>
  )
}

export function MacroTile({
  label,
  value,
  unit,
  tone,
}: {
  label: string
  value: string
  unit: string
  tone: 'positive' | 'warning' | 'neutral'
}) {
  const classes = {
    positive: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-600/40 dark:bg-amber-900/30 dark:text-amber-100',
    neutral: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-700',
  }

  return (
    <div className={`rounded-lg border p-3 ${classes[tone]}`}>
      <p className="text-xs opacity-75">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="text-xs opacity-75">{unit}</p>
    </div>
  )
}
