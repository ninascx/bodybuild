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
          'h-11 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition-colors placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-400 dark:focus:ring-orange-500/30',
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
        'min-h-24 min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-400 dark:focus:ring-orange-500/30',
        props.className,
      )}
    />
  )
}
