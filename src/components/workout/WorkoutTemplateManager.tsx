import { useState } from 'react'
import type { ExercisePlan, WorkoutLog, WorkoutTemplate } from '../../types'
import { Button, Field, TextInput } from '../ui'
import { CustomTemplateCard } from './CustomTemplateCard'

function normalizeTemplateTokenInput(value: string): string {
  return value.replace(/[\s-]/g, '').toLowerCase()
}

export function WorkoutTemplateManager({
  templates,
  selectedWorkout,
  onCreateTemplate,
  onSaveCurrent,
  onUpdateTemplate,
  onUpdateTemplateExercise,
  onAddTemplateExercise,
  onDeleteTemplateExercise,
  onApplyTemplate,
  onDeleteTemplate,
  onExportToken,
  onImportToken,
}: {
  templates: WorkoutTemplate[]
  selectedWorkout: WorkoutLog | undefined
  onCreateTemplate: () => void
  onSaveCurrent: () => void
  onUpdateTemplate: (templateId: string, patch: Partial<WorkoutTemplate>) => void
  onUpdateTemplateExercise: (templateId: string, exerciseIndex: number, patch: Partial<ExercisePlan>) => void
  onAddTemplateExercise: (templateId: string) => void
  onDeleteTemplateExercise: (templateId: string, exerciseIndex: number) => void
  onApplyTemplate: (template: WorkoutTemplate) => void
  onDeleteTemplate: (templateId: string) => void
  onExportToken: () => Promise<{ token: string; count: number }>
  onImportToken: (token: string) => Promise<{ importedCount: number }>
}) {
  const customTemplates = templates.filter((t) => !t.isBuiltin)
  const [exportToken, setExportToken] = useState('')
  const [importToken, setImportToken] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [shareError, setShareError] = useState('')
  const [sharePending, setSharePending] = useState<'export' | 'import' | 'copy' | null>(null)
  const normalizedImportToken = normalizeTemplateTokenInput(importToken)
  const importTokenHasInvalidChars = /[^a-f0-9]/.test(normalizedImportToken)
  const importTokenReady = normalizedImportToken.length === 64 && !importTokenHasInvalidChars

  async function handleExportToken() {
    setSharePending('export')
    setShareMessage('')
    setShareError('')
    try {
      const result = await onExportToken()
      setExportToken(result.token)
      setShareMessage(`已导出 ${result.count} 个模板。`)
    } catch (error) {
      setShareError(error instanceof Error ? error.message : '导出失败')
    } finally {
      setSharePending(null)
    }
  }

  async function handleImportToken() {
    if (!importTokenReady) return
    setSharePending('import')
    setShareMessage('')
    setShareError('')
    try {
      const result = await onImportToken(normalizedImportToken)
      setImportToken('')
      setShareMessage(`已导入 ${result.importedCount} 个模板。`)
    } catch (error) {
      setShareError(error instanceof Error ? error.message : '导入失败')
    } finally {
      setSharePending(null)
    }
  }

  async function copyExportToken() {
    if (!exportToken) return
    setSharePending('copy')
    setShareMessage('')
    setShareError('')
    try {
      await navigator.clipboard.writeText(exportToken)
      setShareMessage('token 已复制。')
    } catch {
      setShareError('复制失败，请手动选中 token。')
    } finally {
      setSharePending(null)
    }
  }

  return (
    <details className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200">模板管理 · {customTemplates.length} 个自定义模板</summary>
      <div className="mt-4 grid gap-4">
        <div className="grid gap-2 sm:grid-cols-[auto_auto] sm:justify-start">
          <Button onClick={onCreateTemplate}>新建模板</Button>
          <Button variant="secondary" onClick={onSaveCurrent} disabled={!selectedWorkout || selectedWorkout.exercises.length === 0}>
            从当前训练保存为模板
          </Button>
        </div>

        <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200">导入 / 导出模板 token</summary>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-2 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-end">
              <Button onClick={() => void handleExportToken()} disabled={customTemplates.length === 0 || sharePending !== null}>
                {sharePending === 'export' ? '导出中...' : '导出 token'}
              </Button>
              <Field label="导出的 64 位 token">
                <TextInput className="font-mono text-xs" value={exportToken} readOnly />
              </Field>
              <Button variant="secondary" onClick={() => void copyExportToken()} disabled={!exportToken || sharePending !== null}>
                复制
              </Button>
            </div>
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <Field label="导入 64 位 token">
                <TextInput
                  value={importToken}
                  onChange={(event) => setImportToken(event.target.value)}
                  maxLength={96}
                  autoComplete="off"
                  placeholder="粘贴 token"
                />
              </Field>
              <Button
                variant="secondary"
                onClick={() => void handleImportToken()}
                disabled={!importTokenReady || sharePending !== null}
              >
                {sharePending === 'import' ? '导入中...' : '导入模板'}
              </Button>
            </div>
            {importToken ? (
              <p className={`text-xs ${importTokenReady ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                {importTokenReady
                  ? 'token 已就绪'
                  : importTokenHasInvalidChars
                    ? 'token 只能包含 0-9 和 a-f'
                    : `已识别 ${normalizedImportToken.length}/64 位`}
              </p>
            ) : null}
            {shareMessage ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{shareMessage}</p> : null}
            {shareError ? <p className="text-sm text-rose-600 dark:text-rose-300">{shareError}</p> : null}
          </div>
        </details>

        {customTemplates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">还没有自定义模板。</p>
        ) : null}

        {customTemplates.map((template) => (
          <CustomTemplateCard
            key={template.id}
            template={template}
            onUpdateTemplate={onUpdateTemplate}
            onUpdateTemplateExercise={onUpdateTemplateExercise}
            onAddTemplateExercise={onAddTemplateExercise}
            onDeleteTemplateExercise={onDeleteTemplateExercise}
            onApplyTemplate={onApplyTemplate}
            onDeleteTemplate={onDeleteTemplate}
          />
        ))}
      </div>
    </details>
  )
}
