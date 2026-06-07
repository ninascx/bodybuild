import { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes, WheelEvent as ReactWheelEvent } from 'react'
import { cn } from '../../lib/cn'

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput(props, ref) {
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
        className={cn(
          'h-11 w-full min-w-0 rounded-md border border-[var(--surface-border-strong)] bg-white px-3 text-base text-slate-950 outline-none transition-colors placeholder:text-slate-500 focus:border-[var(--color-primary-600)] focus:ring-2 focus:ring-[var(--color-primary-100)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-500/25',
          props.className,
        )}
      />
    )
  }
)

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'min-h-24 min-w-0 rounded-md border border-[var(--surface-border-strong)] bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-500 focus:border-[var(--color-primary-600)] focus:ring-2 focus:ring-[var(--color-primary-100)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-500/25',
        props.className,
      )}
    />
  )
}
