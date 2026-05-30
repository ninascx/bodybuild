import { useState, type ReactNode } from 'react'
import { DisclosurePanel } from './ui'

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
    <DisclosurePanel
      open={open}
      onOpenChange={setOpen}
      className="bg-white shadow-sm dark:bg-slate-900 dark:shadow-none"
      title={summary}
      summaryClassName="text-lg text-slate-950 dark:text-slate-50"
      contentClassName="p-3 sm:p-4"
    >
      {children}
    </DisclosurePanel>
  )
}
