import { useEffect, useMemo, useRef, useState } from 'react'

import {
  commitXunjiBodyRecords,
  fetchXunjiConnections,
  previewXunjiBodyRecords,
  type XunjiConnections,
} from '../lib/xunjiData'
import { createId } from '../lib/ids'
import type { BodyMetricType, BodyRecord } from '../types'
import { Button, Checkbox, StatusMessage } from './ui'

type Step = 'select' | 'preview' | 'success'

function previewSummary(value: unknown, count: number): string {
  if (typeof value !== 'object' || value === null) return `训记已校验 ${count} 项身体数据。`
  const summary = (value as { summary?: unknown }).summary
  return typeof summary === 'string' && summary.trim()
    ? summary.trim()
    : `训记已校验 ${count} 项身体数据。`
}

export function XunjiBodySyncDialog({
  open,
  date,
  records,
  onClose,
  onOpenSettings,
  onSynced,
}: {
  open: boolean
  date: string
  records: BodyRecord[]
  onClose: () => void
  onOpenSettings: () => void
  onSynced: (records: BodyRecord[]) => void
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const [connections, setConnections] = useState<XunjiConnections | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<BodyMetricType[]>([])
  const [step, setStep] = useState<Step>('select')
  const [requestId, setRequestId] = useState('')
  const [summary, setSummary] = useState('')
  const [waitSeconds, setWaitSeconds] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const availableRecords = useMemo(
    () => records.filter((record) => record.origin !== 'xunji'),
    [records],
  )
  const selectedRecords = availableRecords.filter((record) => selectedTypes.includes(record.type))

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      setSelectedTypes(availableRecords.map((record) => record.type))
      setStep('select')
      setSummary('')
      setError('')
      setConnections(null)
      void fetchXunjiConnections()
        .then(setConnections)
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : '读取训记连接状态失败')
        })
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [availableRecords, open])

  useEffect(() => {
    if (step !== 'preview' || waitSeconds <= 0) return
    const timer = window.setInterval(() => {
      setWaitSeconds((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [step, waitSeconds])

  function toggle(type: BodyMetricType) {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    )
  }

  async function runPreview() {
    if (selectedRecords.length === 0) return
    const nextRequestId = createId('xunji-body')
    setPending(true)
    setError('')
    try {
      const result = await previewXunjiBodyRecords({
        client_request_id: nextRequestId,
        records: selectedRecords,
      })
      setRequestId(nextRequestId)
      setSummary(previewSummary(result.res, selectedRecords.length))
      setWaitSeconds(Math.max(0, Math.ceil((result.retryAfterMs ?? 0) / 1000)))
      setStep('preview')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '预检身体数据失败')
    } finally {
      setPending(false)
    }
  }

  async function commit() {
    if (!requestId || selectedRecords.length === 0 || waitSeconds > 0) return
    setPending(true)
    setError('')
    try {
      const result = await commitXunjiBodyRecords({
        client_request_id: requestId,
        records: selectedRecords,
      })
      const saved = result.bodyRecords ?? selectedRecords
      onSynced(saved)
      setSummary(`已同步 ${saved.length} 项身体数据到训记。`)
      setStep('success')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '写入训记身体数据失败')
    } finally {
      setPending(false)
    }
  }

  const bodyReady = connections?.body.configured === true

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="xunji-body-sync-title"
      className="m-auto max-h-[calc(100vh-2rem)] w-[min(620px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/45 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h2 id="xunji-body-sync-title" className="text-lg font-semibold">
          同步 {date} 的身体数据到训记
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          本地记录不会因取消或写入失败而丢失。
        </p>
      </div>

      <div className="grid gap-4 p-5">
        {!connections && !error ? (
          <StatusMessage tone="neutral" announce>正在读取身体数据连接状态…</StatusMessage>
        ) : null}

        {connections && !bodyReady ? (
          <StatusMessage tone="warning" announce>
            尚未配置可用的身体数据 Key。记录会继续保存在本项目中。
          </StatusMessage>
        ) : null}

        {step === 'select' && bodyReady ? (
          <>
            {availableRecords.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {availableRecords.map((record) => (
                  <Checkbox
                    key={record.type}
                    checked={selectedTypes.includes(record.type)}
                    onChange={() => toggle(record.type)}
                    label={(
                      <span className="flex w-full items-center justify-between gap-3">
                        <span>{record.label}</span>
                        <span className="tabular-nums text-slate-600 dark:text-slate-300">
                          {record.value}{record.unit}
                        </span>
                      </span>
                    )}
                  />
                ))}
              </div>
            ) : (
              <StatusMessage tone="positive">当天没有待同步的身体数据。</StatusMessage>
            )}
          </>
        ) : null}

        {step === 'preview' ? (
          <div className="grid gap-3">
            <StatusMessage tone="neutral" announce>{summary}</StatusMessage>
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800">
              {selectedRecords.map((record) => (
                <div key={record.type} className="flex items-center justify-between gap-4 py-1">
                  <span>{record.label}</span>
                  <span className="tabular-nums">{record.value}{record.unit}</span>
                </div>
              ))}
            </div>
            {waitSeconds > 0 ? (
              <StatusMessage tone="warning" announce>
                训记限频保护中，{waitSeconds} 秒后可以确认写入。
              </StatusMessage>
            ) : null}
          </div>
        ) : null}

        {step === 'success' ? <StatusMessage tone="positive" announce>{summary}</StatusMessage> : null}
        {error ? <StatusMessage tone="danger" announce>{error}</StatusMessage> : null}

        <div className="flex flex-wrap justify-end gap-2">
          {connections && !bodyReady ? (
            <Button variant="secondary" onClick={onOpenSettings}>配置身体数据 Key</Button>
          ) : null}
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {step === 'success' ? '完成' : '取消'}
          </Button>
          {step === 'select' && bodyReady && availableRecords.length > 0 ? (
            <Button onClick={() => void runPreview()} loading={pending} disabled={selectedRecords.length === 0}>
              预检 {selectedRecords.length} 项数据
            </Button>
          ) : null}
          {step === 'preview' ? (
            <>
              <Button variant="secondary" onClick={() => setStep('select')} disabled={pending}>
                返回选择
              </Button>
              <Button onClick={() => void commit()} loading={pending} disabled={waitSeconds > 0}>
                确认写入训记
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </dialog>
  )
}
