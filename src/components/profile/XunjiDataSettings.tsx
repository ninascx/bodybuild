import { useEffect, useMemo, useState } from 'react'

import {
  clearXunjiConnection,
  fetchXunjiConnections,
  validateAndSaveXunjiConnection,
  type XunjiConnectionKind,
  type XunjiConnections,
} from '../../lib/xunjiData'
import type { BodyRecord } from '../../types'
import { useConfirm } from '../ConfirmDialog'
import { Badge, Button, Field, StatusMessage, TextInput } from '../ui'
import { FormSection } from '../FormPanel'

type Drafts = Record<XunjiConnectionKind, string>
type Feedback = Partial<Record<XunjiConnectionKind, { tone: 'positive' | 'danger'; message: string }>>

const EMPTY_DRAFTS: Drafts = { training: '', food: '', body: '' }

const CONNECTIONS: Array<{
  kind: XunjiConnectionKind
  label: string
  description: string
  placeholder: string
}> = [
  {
    kind: 'training',
    label: '训练数据 Key',
    description: '从训记读取当天训练记录。',
    placeholder: '粘贴训练 Open API Key',
  },
  {
    kind: 'food',
    label: '饮食数据 Key',
    description: '只读取当天热量和三大营养素汇总。',
    placeholder: 'xjfood_…',
  },
  {
    kind: 'body',
    label: '身体数据 Key',
    description: '读取身体数据，并在确认后写入本地待同步记录。',
    placeholder: 'xjbody_…',
  },
]

function formatValidatedAt(value: string | undefined): string {
  if (!value) return '尚未验证'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '尚未验证' : `上次验证 ${date.toLocaleString('zh-CN')}`
}

function validatePrefix(kind: XunjiConnectionKind, value: string): string | undefined {
  if (!value) return '请输入要验证的 Key。'
  if (/\s/.test(value) || value.length < 16) return 'Key 格式不正确。'
  if (kind === 'food' && !value.startsWith('xjfood_')) return '饮食数据 Key 应以 xjfood_ 开头。'
  if (kind === 'body' && !value.startsWith('xjbody_')) return '身体数据 Key 应以 xjbody_ 开头。'
  return undefined
}

export function XunjiDataSettings({
  userId,
  bodyRecords,
  onOpenBodyDate,
}: {
  userId: string
  bodyRecords: BodyRecord[]
  onOpenBodyDate: (date: string) => void
}) {
  const { confirm, dialog } = useConfirm()
  const [connections, setConnections] = useState<XunjiConnections | null>(null)
  const [drafts, setDrafts] = useState<Drafts>(EMPTY_DRAFTS)
  const [feedback, setFeedback] = useState<Feedback>({})
  const [loading, setLoading] = useState(true)
  const [savingKind, setSavingKind] = useState<XunjiConnectionKind | null>(null)

  const pendingDates = useMemo(() => {
    const counts = new Map<string, number>()
    bodyRecords
      .filter((record) => record.origin !== 'xunji')
      .forEach((record) => counts.set(record.datestr, (counts.get(record.datestr) ?? 0) + 1))
    return Array.from(counts, ([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [bodyRecords])

  useEffect(() => {
    let canceled = false
    setLoading(true)
    void fetchXunjiConnections()
      .then((next) => {
        if (!canceled) setConnections(next)
      })
      .catch((reason: unknown) => {
        if (!canceled) {
          setFeedback({
            training: {
              tone: 'danger',
              message: reason instanceof Error ? reason.message : '读取训记连接状态失败',
            },
          })
        }
      })
      .finally(() => {
        if (!canceled) setLoading(false)
      })
    return () => {
      canceled = true
    }
  }, [userId])

  async function validateAndSave(kind: XunjiConnectionKind, label: string) {
    const value = drafts[kind].trim()
    const localError = validatePrefix(kind, value)
    if (localError) {
      setFeedback((current) => ({ ...current, [kind]: { tone: 'danger', message: localError } }))
      return
    }
    setSavingKind(kind)
    setFeedback((current) => ({ ...current, [kind]: undefined }))
    try {
      const next = await validateAndSaveXunjiConnection(kind, value)
      setConnections(next)
      setDrafts((current) => ({ ...current, [kind]: '' }))
      setFeedback((current) => ({
        ...current,
        [kind]: { tone: 'positive', message: `${label}已验证并保存。` },
      }))
    } catch (reason) {
      setFeedback((current) => ({
        ...current,
        [kind]: {
          tone: 'danger',
          message: reason instanceof Error ? reason.message : `${label}验证失败`,
        },
      }))
    } finally {
      setSavingKind(null)
    }
  }

  async function remove(kind: XunjiConnectionKind, label: string) {
    const accepted = await confirm({
      title: `移除${label}？`,
      message: '将移除当前账户保存的 Key。若服务器配置了环境变量 Key，移除后会自动恢复使用环境配置。',
      confirmLabel: '移除 Key',
      tone: 'danger',
    })
    if (!accepted) return
    setSavingKind(kind)
    setFeedback((current) => ({ ...current, [kind]: undefined }))
    try {
      const next = await clearXunjiConnection(kind)
      setConnections(next)
      setDrafts((current) => ({ ...current, [kind]: '' }))
      setFeedback((current) => ({
        ...current,
        [kind]: { tone: 'positive', message: `${label}已移除。` },
      }))
    } catch (reason) {
      setFeedback((current) => ({
        ...current,
        [kind]: {
          tone: 'danger',
          message: reason instanceof Error ? reason.message : `移除${label}失败`,
        },
      }))
    } finally {
      setSavingKind(null)
    }
  }

  return (
    <>
      <FormSection
        title="训记连接"
        description="三类 Key 相互独立。饮食只读取汇总；身体数据只在预检并确认后写入。"
      >
        <div className="divide-y divide-[var(--surface-border)] dark:divide-slate-700">
          {CONNECTIONS.map(({ kind, label, description, placeholder }) => {
            const status = connections?.[kind]
            const rowFeedback = feedback[kind]
            return (
              <section key={kind} className="grid gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</h4>
                      <Badge tone={status?.configured ? 'positive' : 'neutral'}>
                        {status?.configured ? '已配置' : '未配置'}
                      </Badge>
                      {status?.source === 'environment' ? <Badge tone="neutral">服务器环境</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {status?.maskedKey ? `${status.maskedKey} · ` : ''}
                      {formatValidatedAt(status?.validatedAt)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <Field label={`替换或配置${label}`}>
                    <TextInput
                      type="password"
                      autoComplete="off"
                      value={drafts[kind]}
                      placeholder={status?.configured ? '输入新 Key，验证成功后替换' : placeholder}
                      onChange={(event) => {
                        setDrafts((current) => ({ ...current, [kind]: event.target.value }))
                        setFeedback((current) => ({ ...current, [kind]: undefined }))
                      }}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => void validateAndSave(kind, label)}
                      loading={savingKind === kind}
                      disabled={loading || savingKind !== null}
                    >
                      验证并保存{label}
                    </Button>
                    {status?.source === 'account' ? (
                      <Button
                        variant="secondary"
                        onClick={() => void remove(kind, label)}
                        disabled={loading || savingKind !== null}
                      >
                        移除{label}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {rowFeedback ? (
                  <StatusMessage tone={rowFeedback.tone} announce>{rowFeedback.message}</StatusMessage>
                ) : null}
              </section>
            )
          })}
        </div>
      </FormSection>

      {pendingDates.length > 0 ? (
        <FormSection
          title="待同步身体数据"
          description={`共有 ${pendingDates.reduce((sum, item) => sum + item.count, 0)} 项本地或旧数据，可按日期处理。`}
        >
          <div className="flex flex-wrap gap-2">
            {pendingDates.map(({ date, count }) => (
              <Button key={date} variant="secondary" onClick={() => onOpenBodyDate(date)}>
                前往 {date}（{count} 项）
              </Button>
            ))}
          </div>
        </FormSection>
      ) : null}
      {dialog}
    </>
  )
}
