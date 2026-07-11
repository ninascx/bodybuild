import { useEffect, useMemo, useRef, useState } from 'react'

import {
  commitXunjiDailySync,
  fetchXunjiConnections,
  previewXunjiDailySync,
  type XunjiConnections,
  type XunjiDailySyncPreview,
} from '../lib/xunjiData'
import type { XunjiSyncResult } from '../lib/storage'
import type { BodyMetricType, BodyRecord, DailyLog } from '../types'
import { Badge, Button, Checkbox, StatusMessage } from './ui'

const FOOD_LABELS = {
  calories: '热量',
  protein: '蛋白质',
  carbs: '碳水',
  fat: '脂肪',
} as const

type SourceKind = 'training' | 'food' | 'body'
type SourceResult = { status: 'success' | 'empty' | 'error'; message: string }
type Results = Partial<Record<SourceKind, SourceResult>>

function sourceStatusLabel(status: XunjiConnections[SourceKind] | undefined): string {
  if (!status?.configured) return '未配置'
  if (status.validationStatus === 'valid') return '已验证'
  return '已配置，未验证'
}

function previewStatusLabel(status: XunjiDailySyncPreview['sources']['food']['status'] | undefined): string {
  if (status === 'ready') return '可导入'
  if (status === 'error') return '读取失败'
  if (status === 'unavailable') return '不可用'
  return '无变化'
}

function previewStatusTone(
  status: XunjiDailySyncPreview['sources']['food']['status'] | undefined,
): 'positive' | 'danger' | 'neutral' {
  if (status === 'ready') return 'positive'
  if (status === 'error' || status === 'unavailable') return 'danger'
  return 'neutral'
}

export function XunjiDailySyncDialog({
  open,
  date,
  defaultTraining,
  hasExistingWorkout,
  onClose,
  onOpenSettings,
  onSyncTraining,
  onSynced,
}: {
  open: boolean
  date: string
  defaultTraining: boolean
  hasExistingWorkout: boolean
  onClose: () => void
  onOpenSettings: () => void
  onSyncTraining: () => Promise<XunjiSyncResult | undefined>
  onSynced: (result: {
    dailyLog?: DailyLog
    bodyRecords: BodyRecord[]
    results: {
      food: { status: 'success' | 'skipped'; count: number }
      body: { status: 'success' | 'skipped'; count: number }
    }
  }) => void
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const [connections, setConnections] = useState<XunjiConnections | null>(null)
  const [includeTraining, setIncludeTraining] = useState(false)
  const [includeFood, setIncludeFood] = useState(false)
  const [includeBody, setIncludeBody] = useState(false)
  const [preview, setPreview] = useState<XunjiDailySyncPreview | null>(null)
  const [foodFields, setFoodFields] = useState<XunjiDailySyncPreview['foodChanges'][number]['field'][]>([])
  const [bodyTypes, setBodyTypes] = useState<BodyMetricType[]>([])
  const [results, setResults] = useState<Results | null>(null)
  const [retrySeconds, setRetrySeconds] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      setConnections(null)
      setPreview(null)
      setResults(null)
      setError('')
      setRetrySeconds(0)
      setPending(true)
      void fetchXunjiConnections()
        .then((next) => {
          setConnections(next)
          setIncludeTraining(defaultTraining && next.training.configured)
          setIncludeFood(!defaultTraining && next.food.configured)
          setIncludeBody(!defaultTraining && next.body.configured)
        })
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : '读取训记连接状态失败')
        })
        .finally(() => setPending(false))
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [defaultTraining, open])

  const previewSources = preview?.sources
  const selectableCount = foodFields.length + bodyTypes.length + (includeTraining ? 1 : 0)
  const failedSources = useMemo(
    () => (Object.entries(results ?? {}) as Array<[SourceKind, SourceResult]>)
      .filter(([, result]) => result.status === 'error')
      .map(([kind]) => kind),
    [results],
  )
  const previewChangeCount = (previewSources?.food.changes.length ?? 0) + (previewSources?.body.changes.length ?? 0)

  useEffect(() => {
    if (retrySeconds <= 0) return
    const timer = window.setInterval(() => {
      setRetrySeconds((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [retrySeconds])

  async function buildPreview() {
    if (!includeTraining && !includeFood && !includeBody) {
      setError('请至少选择一种可用的数据来源。')
      return
    }
    setPending(true)
    setError('')
    setResults(null)
    try {
      if (includeFood || includeBody) {
        const next = await previewXunjiDailySync(date, { food: includeFood, body: includeBody })
        setPreview(next)
        const retryAfterMs = Math.max(
          next.sources.food.retryAfterMs ?? 0,
          next.sources.body.retryAfterMs ?? 0,
        )
        setRetrySeconds(Math.max(0, Math.ceil(retryAfterMs / 1000)))
        setFoodFields(next.sources.food.changes.filter((change) => change.defaultSelected).map((change) => change.field))
        setBodyTypes(next.sources.body.changes.filter((change) => change.defaultSelected).map((change) => change.type))
      } else {
        setPreview({
          previewId: '',
          datestr: date,
          sources: {
            food: { status: 'unavailable', changes: [] },
            body: { status: 'unavailable', changes: [] },
          },
          foodChanges: [],
          bodyChanges: [],
        })
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '读取训记数据失败')
    } finally {
      setPending(false)
    }
  }

  async function commit() {
    if (!preview || selectableCount === 0) return
    setPending(true)
    setError('')
    const nextResults: Results = {}

    if (includeFood) {
      if (preview.sources.food.status === 'error' || preview.sources.food.status === 'unavailable') {
        nextResults.food = { status: 'error', message: preview.sources.food.message ?? '饮食汇总读取失败。' }
      } else if (foodFields.length === 0) {
        nextResults.food = { status: 'empty', message: preview.sources.food.message ?? '饮食汇总没有需要导入的变化。' }
      }
    }
    if (includeBody) {
      if (preview.sources.body.status === 'error' || preview.sources.body.status === 'unavailable') {
        nextResults.body = { status: 'error', message: preview.sources.body.message ?? '身体数据读取失败。' }
      } else if (bodyTypes.length === 0) {
        nextResults.body = { status: 'empty', message: preview.sources.body.message ?? '身体数据没有需要导入的变化。' }
      }
    }

    try {
      if (foodFields.length > 0 || bodyTypes.length > 0) {
        try {
          const result = await commitXunjiDailySync({
            previewId: preview.previewId,
            foodFields,
            bodyTypes,
          })
          onSynced(result)
          if (includeFood && foodFields.length > 0) {
            nextResults.food = { status: 'success', message: `已导入 ${result.results.food.count} 项饮食汇总。` }
          }
          if (includeBody && bodyTypes.length > 0) {
            nextResults.body = { status: 'success', message: `已导入 ${result.results.body.count} 项身体数据。` }
          }
        } catch (reason) {
          const message = reason instanceof Error ? reason.message : '饮食或身体数据导入失败。'
          if (foodFields.length > 0) nextResults.food = { status: 'error', message }
          if (bodyTypes.length > 0) nextResults.body = { status: 'error', message }
        }
      }

      if (includeTraining) {
        try {
          const result = await onSyncTraining()
          nextResults.training = result?.workoutLog
            ? {
                status: 'success',
                message: `已导入 ${result.trainCount} 条训练、${result.movementCount} 个动作。`,
              }
            : { status: 'empty', message: '训记当天没有训练记录。' }
        } catch (reason) {
          nextResults.training = {
            status: 'error',
            message: reason instanceof Error ? reason.message : '训练数据导入失败。',
          }
        }
      }
      setResults(nextResults)
    } finally {
      setPending(false)
    }
  }

  function retryFailed() {
    setIncludeTraining(failedSources.includes('training'))
    setIncludeFood(failedSources.includes('food'))
    setIncludeBody(failedSources.includes('body'))
    setPreview(null)
    setResults(null)
    setFoodFields([])
    setBodyTypes([])
    setError('')
  }

  function toggleFoodField(field: XunjiDailySyncPreview['foodChanges'][number]['field']) {
    setFoodFields((current) => current.includes(field) ? current.filter((item) => item !== field) : [...current, field])
  }

  function toggleBodyType(type: BodyMetricType) {
    setBodyTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type])
  }

  const sourceOptions: Array<{
    kind: SourceKind
    label: string
    checked: boolean
    setChecked: (value: boolean) => void
  }> = [
    { kind: 'food', label: '饮食汇总', checked: includeFood, setChecked: setIncludeFood },
    { kind: 'body', label: '身体数据', checked: includeBody, setChecked: setIncludeBody },
    { kind: 'training', label: '训练数据', checked: includeTraining, setChecked: setIncludeTraining },
  ]

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="xunji-daily-sync-title"
      aria-describedby="xunji-daily-sync-description"
      aria-busy={pending}
      className="m-auto max-h-[calc(100vh-2rem)] w-[min(760px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/45 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h2 id="xunji-daily-sync-title" className="text-lg font-semibold">
          从训记导入 {date} 的数据
        </h2>
        <p id="xunji-daily-sync-description" className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          各来源独立处理，失败的来源可以单独重试。
        </p>
      </div>

      <div className="grid gap-5 p-5">
        {!connections && !error ? (
          <StatusMessage tone="neutral" announce>
            正在读取训记连接状态…
          </StatusMessage>
        ) : null}
        {!preview && !results ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {sourceOptions.map((source) => {
                const status = connections?.[source.kind]
                return (
                  <div key={source.kind} className="grid gap-1">
                    <Checkbox
                      checked={source.checked}
                      disabled={!status?.configured || pending}
                      onChange={(event) => source.setChecked(event.target.checked)}
                      label={source.label}
                    />
                    <span className="px-1 text-xs text-slate-500 dark:text-slate-400">
                      {sourceStatusLabel(status)}
                    </span>
                  </div>
                )
              })}
            </div>
            {connections && sourceOptions.some((source) => !connections[source.kind].configured) ? (
              <div>
                <Button variant="secondary" onClick={onOpenSettings}>配置缺少的训记 Key</Button>
              </div>
            ) : null}
            {includeTraining && hasExistingWorkout ? (
              <StatusMessage tone="warning">
                当天已有训练记录，确认导入时会覆盖当前动作、组数和有氧记录。
              </StatusMessage>
            ) : null}
          </>
        ) : null}

        {preview && !results ? (
          <>
            {includeFood ? (
              <section>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">饮食汇总</h3>
                  <Badge tone={previewStatusTone(previewSources?.food.status)}>
                    {previewStatusLabel(previewSources?.food.status)}
                  </Badge>
                </div>
                {previewSources?.food.changes.length ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {previewSources.food.changes.map((change) => (
                      <Checkbox
                        key={change.field}
                        checked={foodFields.includes(change.field)}
                        onChange={() => toggleFoodField(change.field)}
                        label={(
                          <span className="flex w-full items-center justify-between gap-3">
                            <span>{FOOD_LABELS[change.field]}</span>
                            <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                              {change.current ?? '未记录'} → {change.incoming}{change.unit}
                            </span>
                            {change.conflict ? <Badge tone="warning">冲突</Badge> : null}
                          </span>
                        )}
                      />
                    ))}
                  </div>
                ) : (
                  <StatusMessage
                    tone={previewSources?.food.status === 'error' || previewSources?.food.status === 'unavailable' ? 'danger' : 'neutral'}
                    announce
                  >
                    {previewSources?.food.message ?? '本地饮食汇总已是最新。'}
                  </StatusMessage>
                )}
              </section>
            ) : null}

            {includeBody ? (
              <section>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">身体数据</h3>
                  <Badge tone={previewStatusTone(previewSources?.body.status)}>
                    {previewStatusLabel(previewSources?.body.status)}
                  </Badge>
                </div>
                {previewSources?.body.changes.length ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {previewSources.body.changes.map((change) => (
                      <Checkbox
                        key={change.type}
                        checked={bodyTypes.includes(change.type)}
                        onChange={() => toggleBodyType(change.type)}
                        label={(
                          <span className="flex w-full items-center justify-between gap-3">
                            <span>{change.label}</span>
                            <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                              {change.current ?? '未记录'} → {change.incoming}{change.unit}
                            </span>
                            {change.conflict ? <Badge tone="warning">冲突</Badge> : null}
                          </span>
                        )}
                      />
                    ))}
                  </div>
                ) : (
                  <StatusMessage
                    tone={previewSources?.body.status === 'error' || previewSources?.body.status === 'unavailable' ? 'danger' : 'neutral'}
                    announce
                  >
                    {previewSources?.body.message ?? '本地身体数据已是最新。'}
                  </StatusMessage>
                )}
              </section>
            ) : null}

            {includeTraining ? (
              <StatusMessage tone={hasExistingWorkout ? 'warning' : 'neutral'}>
                训练数据将在确认后导入{hasExistingWorkout ? '，并覆盖当天现有训练记录' : ''}。
              </StatusMessage>
            ) : null}
          </>
        ) : null}

        {preview && !results ? (
          <div className="rounded-lg bg-[var(--surface-muted)] px-4 py-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200" role="status" aria-live="polite">
            已读取 {previewChangeCount} 项变化，当前选择 {selectableCount} 项。请确认后再导入。
          </div>
        ) : null}

        {results ? (
          <div className="grid gap-2">
            {(Object.entries(results) as Array<[SourceKind, SourceResult]>).map(([kind, result]) => (
              <StatusMessage
                key={kind}
                tone={result.status === 'success' ? 'positive' : result.status === 'error' ? 'danger' : 'neutral'}
                announce
              >
                {kind === 'training' ? '训练' : kind === 'food' ? '饮食' : '身体'}：{result.message}
              </StatusMessage>
            ))}
          </div>
        ) : null}

        {error ? <StatusMessage tone="danger" announce>{error}</StatusMessage> : null}
        {retrySeconds > 0 ? (
          <StatusMessage tone="warning" announce>
            训记限频保护中，{retrySeconds} 秒后可以重新读取失败来源。
          </StatusMessage>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {results ? '完成' : '取消'}
          </Button>
          {!preview && !results ? (
            <Button
              onClick={() => void buildPreview()}
              loading={pending}
              disabled={!connections || retrySeconds > 0 || (!includeTraining && !includeFood && !includeBody)}
            >
              读取可导入数据
            </Button>
          ) : null}
          {preview && !results ? (
            <>
              <Button variant="secondary" onClick={() => setPreview(null)} disabled={pending}>返回来源选择</Button>
              <Button onClick={() => void commit()} loading={pending} disabled={selectableCount === 0}>
                确认导入 {selectableCount} 项
              </Button>
            </>
          ) : null}
          {results && failedSources.length > 0 ? (
            <Button onClick={retryFailed}>仅重试失败来源</Button>
          ) : null}
        </div>
      </div>
    </dialog>
  )
}
