import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, WheelEvent as ReactWheelEvent } from 'react'
import type { RecommendationTone } from '../types'

const toneClasses: Record<RecommendationTone, string> = {
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-600/40 dark:bg-amber-900/30 dark:text-amber-100',
  danger: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-600/40 dark:bg-rose-900/30 dark:text-rose-100',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

const toneAccentClasses: Record<RecommendationTone, string> = {
  positive: 'border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-50',
  warning: 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-600/40 dark:bg-amber-900/20 dark:text-amber-50',
  danger: 'border-rose-200 bg-rose-50/80 text-rose-950 dark:border-rose-600/40 dark:bg-rose-900/20 dark:text-rose-50',
  neutral: 'border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50',
}

const toneSoftTextClasses: Record<RecommendationTone, string> = {
  positive: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-rose-700 dark:text-rose-300',
  neutral: 'text-slate-500 dark:text-slate-400',
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none sm:p-4 ${className}`}
    >
      {children}
    </section>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: RecommendationTone }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}>{children}</span>
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{eyebrow}</p> : null}
        <h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p> : null}
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
      <div>
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
    <section className={`rounded-lg border p-4 shadow-sm sm:p-5 ${toneAccentClasses[tone]}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className={`text-xs font-semibold ${toneSoftTextClasses[tone]}`}>{eyebrow}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
            <Badge tone={tone}>状态</Badge>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 opacity-85">{message}</p>
          {meta ? <div className="mt-4">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  )
}

export function MetricGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>{children}</div>
}

export function InsightCard({
  title,
  value,
  message,
  tone = 'neutral',
}: {
  title: ReactNode
  value?: ReactNode
  message?: ReactNode
  tone?: RecommendationTone
}) {
  return (
    <div className={`min-w-0 rounded-lg border p-3 ${toneAccentClasses[tone]}`}>
      <p className={`text-xs font-medium ${toneSoftTextClasses[tone]}`}>{title}</p>
      {value ? <p className="mt-1 text-2xl font-semibold leading-tight">{value}</p> : null}
      {message ? <p className="mt-1 text-xs leading-5 opacity-80">{message}</p> : null}
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
    <div className={`rounded-lg border p-3 ${toneAccentClasses[tone]}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          {description ? <p className="mt-1 text-sm leading-5 opacity-80">{description}</p> : null}
        </div>
        {action}
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  message,
}: {
  title: ReactNode
  message?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {message ? <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{message}</p> : null}
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
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none ${className}`}>
      <div className="h-5 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-4 grid gap-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="h-3 animate-pulse rounded bg-slate-100 dark:bg-slate-800"
            style={{ width: `${Math.max(45, 100 - index * 18)}%` }}
          />
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{title}</p>
    </div>
  )
}

export function StatusMessage({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode
  tone?: RecommendationTone
  className?: string
}) {
  return <p className={`rounded-md border px-3 py-2 text-sm ${toneClasses[tone]} ${className}`}>{children}</p>
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: ReactNode }>
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-9 rounded px-3 text-sm font-medium transition ${
            value === option.value
              ? 'bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-50'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function ProgressBar({ value }: { value: number }) {
  const bounded = Math.min(100, Math.max(0, value))
  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${bounded}%` }} />
    </div>
  )
}

export function StatCard({
  label,
  value,
  helper,
  delta,
  size = 'normal',
}: {
  label: string
  value: ReactNode
  helper?: string
  delta?: { direction: 'up' | 'down' | 'flat'; text: string; tone?: 'positive' | 'warning' | 'neutral' }
  /** 'large' 用于关键 KPI（前 4 张），'normal' 是其它较为辅助的指标。 */
  size?: 'normal' | 'large'
}) {
  const deltaTone = delta?.tone ?? 'neutral'
  const deltaClasses: Record<NonNullable<typeof delta>['tone'] & string, string> = {
    positive: 'text-emerald-700 dark:text-emerald-300',
    warning: 'text-rose-600 dark:text-rose-300',
    neutral: 'text-slate-500 dark:text-slate-400',
  }
  const arrow = delta?.direction === 'up' ? '↑' : delta?.direction === 'down' ? '↓' : '→'
  const isLarge = size === 'large'
  return (
    <Card className={isLarge ? 'min-h-32' : 'min-h-24'}>
      <p className={`${isLarge ? 'text-sm' : 'text-xs'} text-slate-500 dark:text-slate-400`}>{label}</p>
      <p
        className={`mt-2 font-semibold text-slate-950 dark:text-slate-50 ${
          isLarge ? 'text-3xl' : 'text-xl'
        }`}
      >
        {value}
      </p>
      {delta ? (
        <p className={`mt-1 text-xs font-medium ${deltaClasses[deltaTone]}`}>
          {arrow} {delta.text}
        </p>
      ) : null}
      {helper ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p> : null}
    </Card>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  )
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(props, ref) {
  const handleWheel = (event: ReactWheelEvent<HTMLInputElement>) => {
    if (props.onWheel) {
      props.onWheel(event)
    }
    if (event.currentTarget.type === 'number') {
      event.currentTarget.blur()
    }
  }
  return (
    <input
      {...props}
      ref={ref}
      onWheel={handleWheel}
      className={`h-11 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30 ${props.className ?? ''}`}
    />
  )
})

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-24 min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30 ${props.className ?? ''}`}
    />
  )
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const classes = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400',
    secondary:
      'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  }
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      className={`inline-flex min-h-11 min-w-0 items-center justify-center rounded-md px-4 py-2 text-center text-sm font-medium leading-5 transition disabled:cursor-not-allowed disabled:opacity-50 ${classes[variant]} ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

export function RecommendationBox({ title, message, tone }: { title: string; message: string; tone: RecommendationTone }) {
  return (
    <div className={`rounded-lg border p-3 ${toneClasses[tone]}`}>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm leading-6">{message}</p>
    </div>
  )
}
