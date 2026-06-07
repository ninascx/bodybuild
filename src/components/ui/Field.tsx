import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface FieldProps {
  label: string
  children: ReactNode
  helper?: ReactNode
  error?: ReactNode
  labelAction?: ReactNode
  className?: string
}

type DescribedFieldControlProps = {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling'
}

function withFieldDescription(
  children: ReactNode,
  describedBy: string | undefined,
  hasError: boolean,
  controlId?: string,
): ReactNode {
  const childArray = Children.toArray(children)
  if (childArray.length !== 1) return children

  const child = childArray[0]
  if (!isValidElement<DescribedFieldControlProps>(child)) return children

  const existingDescription = child.props['aria-describedby']
  const nextDescription = [existingDescription, describedBy].filter(Boolean).join(' ') || undefined

  return cloneElement(child as ReactElement<DescribedFieldControlProps>, {
    'aria-describedby': nextDescription,
    'aria-invalid': hasError ? true : child.props['aria-invalid'],
    ...(controlId ? { id: controlId } : {}),
  })
}

export function Field({ label, children, helper, error, labelAction, className = '' }: FieldProps) {
  const fieldId = useId()
  const controlId = labelAction ? `${fieldId}-control` : undefined
  const helperId = helper ? `${fieldId}-helper` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined
  const control = withFieldDescription(children, describedBy, Boolean(error), controlId)

  if (labelAction) {
    return (
      <div className={cn('grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300', className)}>
        <label htmlFor={controlId} className="min-w-0 truncate">
          {label}
        </label>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-hidden">{control}</div>
          <div className="shrink-0">{labelAction}</div>
        </div>
        {helper ? <span id={helperId} className="text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">{helper}</span> : null}
        {error ? (
          <span id={errorId} className="text-xs font-semibold leading-5 text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <label className={cn('grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300', className)}>
      <span>{label}</span>
      {control}
      {helper ? <span id={helperId} className="text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">{helper}</span> : null}
      {error ? (
        <span id={errorId} className="text-xs font-semibold leading-5 text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
