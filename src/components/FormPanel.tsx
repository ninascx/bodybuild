import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Card, StatusMessage } from './ui'

export function FormPanel({
  title,
  description,
  badges,
  actions,
  success,
  error,
  warning,
  children,
  className = '',
  contentClassName = 'mt-5',
}: {
  title: ReactNode
  description?: ReactNode
  badges?: ReactNode
  actions?: ReactNode
  success?: ReactNode
  error?: ReactNode
  warning?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={className}>
      <FormPanelHeader title={title} description={description} badges={badges} actions={actions} />
      <FormStatusStack className="mt-4" success={success} error={error} warning={warning} />
      {children ? <div className={contentClassName}>{children}</div> : null}
    </Card>
  )
}

export function FormPanelHeader({
  title,
  description,
  badges,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  badges?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
          {badges}
        </div>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function FormStatusStack({
  success,
  error,
  warning,
  className = '',
}: {
  success?: ReactNode
  error?: ReactNode
  warning?: ReactNode
  className?: string
}) {
  if (!success && !error && !warning) return null

  return (
    <div className={cn('grid gap-2', className)}>
      {success ? <StatusMessage tone="positive" announce>{success}</StatusMessage> : null}
      {error ? <StatusMessage tone="danger" announce>{error}</StatusMessage> : null}
      {warning && !success && !error ? <StatusMessage tone="warning" announce>{warning}</StatusMessage> : null}
    </div>
  )
}

export function FormSection({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
          {description ? <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}
