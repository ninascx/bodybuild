import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import type { RecommendationTone } from '../types'

const toneClasses: Record<RecommendationTone, string> = {
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</section>
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: RecommendationTone }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}>{children}</span>
}

export function ProgressBar({ value }: { value: number }) {
  const bounded = Math.min(100, Math.max(0, value))
  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${bounded}%` }} />
    </div>
  )
}

export function StatCard({ label, value, helper }: { label: string; value: ReactNode; helper?: string }) {
  return (
    <Card className="min-h-28">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
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
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${props.className ?? ''}`}
    />
  )
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-24 min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${props.className ?? ''}`}
    />
  )
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const classes = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
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
