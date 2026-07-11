import { useState } from 'react'

type ContextRailProps = {
  children: React.ReactNode
  title?: string
}

export function ContextRail({ children, title = '相关信息' }: ContextRailProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <aside className="hidden 2xl:flex w-12 border-l border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl">
        <button
          onClick={() => setCollapsed(false)}
          className="w-full py-4 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:text-slate-300 dark:hover:bg-slate-800/80 transition-colors"
          title="展开侧栏"
          aria-label="展开侧栏"
        >
          <span className="block text-center">«</span>
        </button>
      </aside>
    )
  }

  return (
    <aside className="hidden 2xl:block 2xl:w-80 border-l border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl">
      <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            onClick={() => setCollapsed(true)}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            title="折叠侧栏"
            aria-label="折叠侧栏"
          >
            »
          </button>
        </div>
        <div className="p-4 space-y-4">
          {children}
        </div>
      </div>
    </aside>
  )
}
