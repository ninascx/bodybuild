import { useState, type ReactNode } from 'react'

export function TipsDetails({
  defaultOpen,
  summary,
  children,
}: {
  defaultOpen: boolean
  summary: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
      className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
    >
      <summary className="cursor-pointer text-lg font-semibold text-slate-950 dark:text-slate-50">{summary}</summary>
      {children}
    </details>
  )
}
