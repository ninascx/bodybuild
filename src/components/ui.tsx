import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, WheelEvent as ReactWheelEvent } from 'react'
import type { RecommendationTone } from '../types'

const toneClasses: Record<RecommendationTone, string> = {
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-600/40 dark:bg-amber-900/30 dark:text-amber-100',
  danger: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-600/40 dark:bg-rose-900/30 dark:text-rose-100',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none ${className}`}
    >
      {children}
    </section>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: RecommendationTone }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}>{children}</span>
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
