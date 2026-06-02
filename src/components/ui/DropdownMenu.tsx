import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export interface DropdownMenuItem {
  label: string
  onSelect: () => void
  disabled?: boolean
  tone?: 'default' | 'danger'
}

export interface DropdownMenuProps {
  label: string
  items: DropdownMenuItem[]
  className?: string
  triggerClassName?: string
  menuClassName?: string
}

export function DropdownMenu({
  label,
  items,
  className = '',
  triggerClassName = '',
  menuClassName = '',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const latestItemsRef = useRef(items)

  useEffect(() => {
    latestItemsRef.current = items
  }, [items])

  const focusMenuItem = useCallback((startIndex: number, direction: 1 | -1) => {
    const currentItems = latestItemsRef.current
    if (currentItems.length === 0) return

    for (let step = 0; step < currentItems.length; step += 1) {
      const index = (startIndex + step * direction + currentItems.length) % currentItems.length
      if (!currentItems[index]?.disabled) {
        itemRefs.current[index]?.focus()
        return
      }
    }
  }, [])

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const currentIndex = itemRefs.current.findIndex((item) => item === document.activeElement)

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusMenuItem(currentIndex >= 0 ? currentIndex + 1 : 0, 1)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusMenuItem(currentIndex >= 0 ? currentIndex - 1 : latestItemsRef.current.length - 1, -1)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      focusMenuItem(0, 1)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      focusMenuItem(latestItemsRef.current.length - 1, -1)
    }
  }

  useEffect(() => {
    if (!open) return

    focusMenuItem(0, 1)

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && !containerRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, focusMenuItem])

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onBlur={(event) => {
        if (!open) return
        const nextFocusTarget = event.relatedTarget
        if (!(nextFocusTarget instanceof Node) || !event.currentTarget.contains(nextFocusTarget)) {
          setOpen(false)
        }
      }}
    >
      <Button
        ref={triggerRef}
        variant="secondary"
        className={cn('w-full', triggerClassName)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        {label}
        <svg className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
        </svg>
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          className={cn(
            'motion-panel absolute right-0 z-40 mt-2 grid w-44 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900',
            menuClassName,
          )}
        >
          {items.map((item, index) => (
            <Button
              key={item.label}
              ref={(node) => {
                itemRefs.current[index] = node
              }}
              role="menuitem"
              variant="ghost"
              disabled={item.disabled}
              className={cn(
                'w-full justify-start px-3',
                item.tone === 'danger' && 'text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200',
              )}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
