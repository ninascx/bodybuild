import { useState } from 'react'
import type { CardioPlan, ExercisePlan, WorkoutLog, WorkoutTemplate } from '../../types'
import { Button, DisclosurePanel, EmptyState, Field, TextInput } from '../ui'
import { FormStatusStack } from '../FormPanel'
import { CustomTemplateCard } from './CustomTemplateCard'

function normalizeTemplateTokenInput(value: string): string {
  return value.replace(/[\s-]/g, '').toLowerCase()
}

export function WorkoutTemplateManager({
  builtinTemplates,
  templates,
  selectedWorkout,
  onCreateTemplate,
  onSaveCurrent,
  onUpdateTemplate,
  onUpdateTemplateExercise,
  onAddTemplateExercise,
  onDeleteTemplateExercise,
  onUpdateTemplateCardio,
  onAddTemplateCardio,
  onDeleteTemplateCardio,
  onApplyTemplate,
  onDeleteTemplate,
  onExportToken,
  onImportToken,
}: {
  builtinTemplates: WorkoutTemplate[]
  templates: WorkoutTemplate[]
  selectedWorkout: WorkoutLog | undefined
  onCreateTemplate: () => void
  onSaveCurrent: () => void
  onUpdateTemplate: (templateId: string, patch: Partial<WorkoutTemplate>) => void
  onUpdateTemplateExercise: (templateId: string, exerciseIndex: number, patch: Partial<ExercisePlan>) => void
  onAddTemplateExercise: (templateId: string) => void
  onDeleteTemplateExercise: (templateId: string, exerciseIndex: number) => void
  onUpdateTemplateCardio: (templateId: string, cardioIndex: number, patch: Partial<CardioPlan>) => void
  onAddTemplateCardio: (templateId: string) => void
  onDeleteTemplateCardio: (templateId: string, cardioIndex: number) => void
  onApplyTemplate: (template: WorkoutTemplate) => void
  onDeleteTemplate: (templateId: string) => void
  onExportToken: () => Promise<{ token: string; count: number }>
  onImportToken: (token: string) => Promise<{ importedCount: number }>
}) {
  const editableBuiltinTemplates = builtinTemplates
  const customTemplates = templates.filter((t) => !t.isBuiltin)
  const [exportToken, setExportToken] = useState('')
  const [importToken, setImportToken] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [shareError, setShareError] = useState('')
  const [sharePending, setSharePending] = useState<'export' | 'import' | 'copy' | null>(null)
  const normalizedImportToken = normalizeTemplateTokenInput(importToken)
  const importTokenHasInvalidChars = /[^a-f0-9]/.test(normalizedImportToken)
  const importTokenReady = normalizedImportToken.length === 64 && !importTokenHasInvalidChars
  const importTokenHelper = importToken
    ? importTokenReady
      ? 'token 已就绪'
      : `已识别 ${normalizedImportToken.length}/64 位`
    : '粘贴其他设备导出的 64 位模板 token。'
  const importTokenError = importToken && importTokenHasInvalidChars ? 'token 只能包含 0-9 和 a-f' : undefined

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
    <DisclosurePanel
      className="bg-white dark:bg-slate-900"
      title={`模板管理 · ${editableBuiltinTemplates.length} 个内置 · ${customTemplates.length} 个自定义`}
      contentClassName="grid gap-4 p-4"
    >
        <div className="grid gap-2 sm:grid-cols-[auto_auto] sm:justify-start">
          <Button onClick={onCreateTemplate}>新建模板</Button>
          <Button
            variant="secondary"
            onClick={onSaveCurrent}
            disabled={!selectedWorkout || (selectedWorkout.exercises.length === 0 && (selectedWorkout.cardio ?? []).length === 0)}
          >
            从当前训练保存为模板
          </Button>
        </div>

        <DisclosurePanel
          className="bg-slate-50 dark:bg-slate-800/70"
          title="导入 / 导出模板 token"
          contentClassName="grid gap-3"
        >
            <div className="grid gap-2 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-end">
              <Button
                onClick={() => void handleExportToken()}
                disabled={customTemplates.length === 0 || sharePending !== null}
                loading={sharePending === 'export'}
              >
                导出 token
              </Button>
              <Field label="导出的 64 位 token" helper="复制后可在另一台设备导入，不会包含训练记录或个人资料。">
                <TextInput className="font-mono text-xs" value={exportToken} readOnly />
              </Field>
              <Button
                variant="secondary"
                onClick={() => void copyExportToken()}
                disabled={!exportToken || sharePending !== null}
                loading={sharePending === 'copy'}
              >
                复制
              </Button>
            </div>
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <Field label="导入 64 位 token" helper={importTokenError ? undefined : importTokenHelper} error={importTokenError}>
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
                loading={sharePending === 'import'}
              >
                导入模板
              </Button>
            </div>
            <FormStatusStack success={shareMessage} error={shareError} />
        </DisclosurePanel>

        <DisclosurePanel
          className="bg-slate-50 dark:bg-slate-800/70"
          title={`内置训练模板 · ${editableBuiltinTemplates.length} 个`}
          contentClassName="grid gap-3 p-3"
        >
          {editableBuiltinTemplates.map((template) => (
            <CustomTemplateCard
              key={template.id}
              template={template}
              badgeLabel="内置"
              badgeTone="neutral"
              showCategory={false}
              canDelete={false}
              onUpdateTemplate={onUpdateTemplate}
              onUpdateTemplateExercise={onUpdateTemplateExercise}
              onAddTemplateExercise={onAddTemplateExercise}
              onDeleteTemplateExercise={onDeleteTemplateExercise}
              onUpdateTemplateCardio={onUpdateTemplateCardio}
              onAddTemplateCardio={onAddTemplateCardio}
              onDeleteTemplateCardio={onDeleteTemplateCardio}
              onApplyTemplate={onApplyTemplate}
              onDeleteTemplate={onDeleteTemplate}
            />
          ))}
        </DisclosurePanel>

        {customTemplates.length === 0 ? (
          <EmptyState
            compact
            title="还没有自定义模板"
            message="可以从当前训练保存为模板，或先新建一个空模板。"
            actions={<Button variant="secondary" onClick={onCreateTemplate}>新建模板</Button>}
          />
        ) : null}

        {customTemplates.map((template) => (
          <CustomTemplateCard
            key={template.id}
            template={template}
            badgeLabel="自定义"
            badgeTone="warning"
            showCategory
            canDelete
            onUpdateTemplate={onUpdateTemplate}
            onUpdateTemplateExercise={onUpdateTemplateExercise}
            onAddTemplateExercise={onAddTemplateExercise}
            onDeleteTemplateExercise={onDeleteTemplateExercise}
            onUpdateTemplateCardio={onUpdateTemplateCardio}
            onAddTemplateCardio={onAddTemplateCardio}
            onDeleteTemplateCardio={onDeleteTemplateCardio}
            onApplyTemplate={onApplyTemplate}
            onDeleteTemplate={onDeleteTemplate}
          />
        ))}
    </DisclosurePanel>
  )
}
