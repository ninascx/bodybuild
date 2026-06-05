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
      className="bg-white dark:bg-slate-900"
      title={summary}
      summaryClassName="text-lg text-slate-950 dark:text-slate-50"
      contentClassName="p-3 sm:p-4"
    >
      {children}
    </DisclosurePanel>
  )
}
