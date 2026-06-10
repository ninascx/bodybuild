import type { AriaRole, ReactNode, KeyboardEvent } from 'react'
import type { RecommendationTone } from '../types'
import { cn } from '../lib/cn'
import { Button, Card, Badge, Field, TextInput, TextArea, Select, Checkbox, DisclosurePanel, DropdownMenu, AnimatedMetric, UserAvatar } from './ui/index'
import type { ButtonProps, ButtonVariant, CardProps, BadgeProps, FieldProps, DisclosurePanelProps, DropdownMenuItem, DropdownMenuProps, AnimatedMetricProps, UserAvatarProps } from './ui/index'
import { GradientCard } from './ui/GradientCard'
import type { GradientCardProps } from './ui/GradientCard'
import { IconBadge } from './ui/IconBadge'
import type { IconBadgeProps, IconBadgeIcon, IconBadgeVariant, IconBadgeSize } from './ui/IconBadge'

export { Button, Card, Badge, Field, TextInput, TextArea, Select, Checkbox, DisclosurePanel, DropdownMenu, GradientCard, IconBadge, AnimatedMetric, UserAvatar }
export type { ButtonProps, ButtonVariant, CardProps, BadgeProps, FieldProps, DisclosurePanelProps, DropdownMenuItem, DropdownMenuProps, GradientCardProps, IconBadgeProps, IconBadgeIcon, IconBadgeVariant, IconBadgeSize, AnimatedMetricProps, UserAvatarProps }

const toneClasses: Record<RecommendationTone, string> = {
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-600/40 dark:bg-amber-900/30 dark:text-amber-100',
  danger: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-600/40 dark:bg-rose-900/30 dark:text-rose-100',
  neutral: 'border-[var(--surface-border)] bg-[var(--surface-muted)] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

const toneAccentClasses: Record<RecommendationTone, string> = {
  positive: 'border-emerald-200 bg-white text-slate-950 dark:border-emerald-700/40 dark:bg-slate-900 dark:text-slate-50',
  warning: 'border-amber-200 bg-white text-slate-950 dark:border-amber-600/40 dark:bg-slate-900 dark:text-slate-50',
  danger: 'border-rose-200 bg-white text-slate-950 dark:border-rose-600/40 dark:bg-slate-900 dark:text-slate-50',
  neutral: 'border-[var(--surface-border)] bg-[var(--surface-panel)] text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50',
}

const toneSoftTextClasses: Record<RecommendationTone, string> = {
  positive: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-rose-700 dark:text-rose-300',
  neutral: 'text-slate-500 dark:text-slate-400',
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-sm font-medium text-[var(--color-primary-700)] dark:text-cyan-300">{eyebrow}</p> : null}
        <h2 className="mt-1 text-2xl font-semibold text-balance text-slate-950 dark:text-slate-50">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-pretty text-slate-600 dark:text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
        {description ? <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function StatusHero({
  eyebrow,
  title,
  message,
  tone = 'neutral',
  actions,
  meta,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  message: ReactNode
  tone?: RecommendationTone
  actions?: ReactNode
  meta?: ReactNode
}) {
  return (
    <section className={cn('rounded-lg border p-4', toneAccentClasses[tone])}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className={cn('text-sm font-medium', toneSoftTextClasses[tone])}>{eyebrow}</p> : null}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-balance sm:text-2xl">{title}</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-pretty text-slate-600 dark:text-slate-300">{message}</p>
          {meta ? <div className="mt-3">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  )
}

export function MetricGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>{children}</div>
}

export function InsightCard({
  title,
  value,
  message,
  tone = 'neutral',
  icon,
}: {
  title: ReactNode
  value?: ReactNode
  message?: ReactNode
  tone?: RecommendationTone
  icon?: IconBadgeIcon
}) {
  return (
    <div className={cn('min-w-0 rounded-lg border p-3 sm:p-4', toneAccentClasses[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs font-medium', toneSoftTextClasses[tone])}>{title}</p>
          {value ? <p className="mt-2 text-xl font-bold leading-tight tabular-nums sm:text-2xl">{value}</p> : null}
          {message ? <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p> : null}
        </div>
        {icon ? (
          <IconBadge
            icon={icon}
            variant={tone === 'positive' ? 'success' : tone === 'warning' ? 'warning' : tone === 'danger' ? 'danger' : 'primary'}
            size="md"
          />
        ) : null}
      </div>
    </div>
  )
}

export function ActionCard({
  title,
  description,
  tone = 'neutral',
  action,
}: {
  title: ReactNode
  description?: ReactNode
  tone?: RecommendationTone
  action?: ReactNode
}) {
  return (
    <div className={cn('rounded-lg border p-3 sm:p-4', toneAccentClasses[tone])}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</p>
          {description ? <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p> : null}
        </div>
        {action}
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  message,
  actions,
  tone = 'neutral',
  compact = false,
  className = '',
  icon,
}: {
  title: ReactNode
  message?: ReactNode
  actions?: ReactNode
  tone?: RecommendationTone
  compact?: boolean
  className?: string
  icon?: IconBadgeIcon
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed px-6 text-center',
        compact ? 'py-6' : 'py-10',
        toneAccentClasses[tone],
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex justify-center">
          <IconBadge
            icon={icon}
            variant={tone === 'positive' ? 'success' : tone === 'warning' ? 'warning' : tone === 'danger' ? 'danger' : 'neutral'}
            size="lg"
          />
        </div>
      ) : null}
      <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {message ? <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{message}</p> : null}
      {actions ? <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function LoadingBlock({
  title = '正在加载',
  lines = 3,
  className = '',
}: {
  title?: ReactNode
  lines?: number
  className?: string
}) {
  return (
    <div
      className={cn('rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="skeleton-shimmer h-6 w-40 rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="mt-5 grid gap-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="skeleton-shimmer h-4 rounded-lg bg-slate-100 dark:bg-slate-800"
            style={{
              width: `${Math.max(45, 100 - index * 18)}%`,
              animationDelay: `${index * 150}ms`
            }}
          />
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-teal-500 dark:bg-cyan-400" style={{ animationDelay: '0ms' }} />
        <div className="h-2 w-2 animate-pulse rounded-full bg-teal-500 dark:bg-cyan-400" style={{ animationDelay: '200ms' }} />
        <div className="h-2 w-2 animate-pulse rounded-full bg-teal-500 dark:bg-cyan-400" style={{ animationDelay: '400ms' }} />
        <p className="ml-2 text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      </div>
    </div>
  )
}

export function StatusMessage({
  children,
  tone = 'neutral',
  className = '',
  announce = false,
  role,
  ariaLive,
}: {
  children: ReactNode
  tone?: RecommendationTone
  className?: string
  announce?: boolean
  role?: AriaRole
  ariaLive?: 'off' | 'polite' | 'assertive'
}) {
  const liveRole = role ?? (announce ? (tone === 'danger' ? 'alert' : 'status') : undefined)
  const liveMode = ariaLive ?? (announce ? (tone === 'danger' ? 'assertive' : 'polite') : undefined)

  return (
    <p
      className={cn(
        'motion-feedback rounded-lg border px-4 py-3 text-sm font-medium',
        toneClasses[tone],
        tone === 'positive' && 'motion-success',
        className,
      )}
      role={liveRole}
      aria-live={liveMode}
      aria-atomic={announce ? 'true' : undefined}
    >
      {children}
    </p>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: ReactNode; disabled?: boolean }>
  onChange: (value: T) => void
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentValue: T) => {
    const enabledOptions = options.filter((o) => !o.disabled)
    const currentIndex = enabledOptions.findIndex((o) => o.value === currentValue)
    let nextIndex: number | undefined
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      nextIndex = (currentIndex + 1) % enabledOptions.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      nextIndex = (currentIndex - 1 + enabledOptions.length) % enabledOptions.length
    }
    if (nextIndex !== undefined) {
      onChange(enabledOptions[nextIndex].value)
    }
  }

  return (
    <div
      role="radiogroup"
      className="inline-flex max-w-full flex-wrap rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-1 dark:border-slate-700 dark:bg-slate-900"
    >
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, option.value)}
            className={cn(
              'min-h-11 min-w-11 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-45 dark:focus-visible:ring-cyan-500 dark:focus-visible:ring-offset-slate-950',
              selected
                ? 'bg-[var(--color-primary-700)] text-white dark:bg-cyan-600 dark:text-white'
                : 'text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function ProgressBar({ value, animated = true }: { value: number; animated?: boolean }) {
  const bounded = Math.min(100, Math.max(0, value))
  return (
    <div
      className="h-3 overflow-hidden rounded-full bg-[var(--surface-muted)] dark:bg-slate-800"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(bounded)}
    >
      <div
        className={cn(
          'h-full rounded-full bg-gradient-to-r from-teal-600 to-cyan-500 transition-[width] dark:from-teal-500 dark:to-cyan-400',
          animated && 'duration-[var(--motion-rest)] ease-[var(--ease-out-smooth)]'
        )}
        style={{ width: `${bounded}%` }}
      />
    </div>
  )
}

export function StatCard({
  label,
  value,
  helper,
  delta,
  size = 'normal',
  icon,
}: {
  label: string
  value: ReactNode
  helper?: string
  delta?: { direction: 'up' | 'down' | 'flat'; text: string; tone?: 'positive' | 'warning' | 'neutral' }
  size?: 'normal' | 'large'
  icon?: IconBadgeIcon
}) {
  const deltaTone = delta?.tone ?? 'neutral'
  const deltaClasses: Record<NonNullable<typeof delta>['tone'] & string, string> = {
    positive: 'text-emerald-700 dark:text-emerald-300',
    warning: 'text-rose-600 dark:text-rose-300',
    neutral: 'text-slate-500 dark:text-slate-400',
  }
  const indicator = delta?.direction === 'up' ? '↑' : delta?.direction === 'down' ? '↓' : '→'
  const isLarge = size === 'large'
  return (
    <Card className={cn(isLarge ? 'min-h-36' : 'min-h-28', 'relative overflow-hidden')}>
      {icon ? (
        <div className="absolute right-3 top-3 opacity-10">
          <IconBadge icon={icon} variant="neutral" size={isLarge ? 'lg' : 'md'} />
        </div>
      ) : null}
      <p className={cn(isLarge ? 'text-sm' : 'text-xs', 'font-medium text-slate-500 dark:text-slate-400')}>{label}</p>
      <p className={cn('mt-3 font-semibold tabular-nums text-slate-950 dark:text-slate-50', isLarge ? 'text-3xl' : 'text-2xl')}>{value}</p>
      {delta ? (
        <p className={cn('mt-2 text-sm font-semibold', deltaClasses[deltaTone])}>
          {indicator} {delta.text}
        </p>
      ) : null}
      {helper ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{helper}</p> : null}
    </Card>
  )
}

export function RecommendationBox({ title, message, tone }: { title: string; message: string; tone: RecommendationTone }) {
  return (
    <div className={cn('rounded-lg border p-3', toneAccentClasses[tone])}>
      <p className={cn('font-semibold', toneSoftTextClasses[tone])}>{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
    </div>
  )
}
