import { useEffect, useState } from 'react'
import { Button } from './ui'

type ShortcutGroup = {
  title: string
  shortcuts: Array<{ keys: string; description: string }>
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    title: '全局导航',
    shortcuts: [
      { keys: 'Ctrl + 1', description: '切换到记录' },
      { keys: 'Ctrl + 2', description: '切换到训练' },
      { keys: 'Ctrl + 3', description: '切换到复盘' },
      { keys: 'Ctrl + 4', description: '切换到设置' },
      { keys: 'Ctrl + N', description: '新建今日训练' },
      { keys: 'Ctrl + S', description: '立即保存' },
    ]
  },
  {
    title: '训练控制',
    shortcuts: [
      { keys: 'Enter', description: '完成当前组' },
      { keys: 'Space', description: '开始/结束休息' },
      { keys: '← →', description: '切换动作' },
    ]
  },
  {
    title: '每日记录',
    shortcuts: [
      { keys: 'Ctrl + Y', description: '复制昨天数据' },
      { keys: 'Ctrl + T', description: '填入目标值' },
      { keys: 'Tab', description: '切换输入字段' },
    ]
  }
]

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handleKeyPress(event: KeyboardEvent) {
      if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
        const target = event.target as HTMLElement
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return
        }
        event.preventDefault()
        setIsOpen(true)
      }
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen])

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        className="fixed bottom-4 right-4 z-40 h-11 w-11 rounded-full p-0 text-slate-500 shadow-lg hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        onClick={() => setIsOpen(true)}
        title="键盘快捷键 (?)"
        aria-label="显示键盘快捷键"
      >
        ?
      </Button>
    )
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-md"
        onClick={() => setIsOpen(false)}
        aria-label="关闭快捷键帮助"
      />
      <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">键盘快捷键</h3>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            onClick={() => setIsOpen(false)}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div className="mt-3 space-y-4">
          {SHORTCUTS.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">{group.title}</h4>
              <div className="mt-2 space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{shortcut.description}</span>
                    <kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
