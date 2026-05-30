import type { FormEvent } from 'react'
import { Button, Field, LoadingBlock, StatusMessage, TextInput } from '../ui'
import { ThemeToggle } from '../ThemeToggle'
import type { ColorSchemePreference } from '../../hooks/useColorScheme'

type LoginScreenProps = {
  mode: 'checking' | 'anonymous'
  username: string
  password: string
  error: string
  pending: boolean
  colorPreference: ColorSchemePreference
  resolvedColorScheme: 'light' | 'dark'
  onCycleColorScheme: () => void
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function LoginScreen({
  mode,
  username,
  password,
  error,
  pending,
  colorPreference,
  resolvedColorScheme,
  onCycleColorScheme,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: LoginScreenProps) {
  if (mode === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <LoadingBlock className="w-full max-w-sm" title="正在检查登录状态..." />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <form
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
        onSubmit={onSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">BodyBuild</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">减脂增肌追踪</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              登录后记录训练、饮食和身体变化。邀请制使用，没有自助注册。
            </p>
          </div>
          <ThemeToggle preference={colorPreference} resolved={resolvedColorScheme} onCycle={onCycleColorScheme} />
        </div>

        <div className="mt-6 grid gap-4">
          <Field label="昵称" helper="请输入管理员创建账户时提供的昵称。">
            <TextInput
              type="text"
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field label="密码" helper="密码区分大小写，登录失败后可以重新输入。">
            <TextInput
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
        </div>

        {error ? <StatusMessage className="mt-4" tone="danger" announce>{error}</StatusMessage> : null}
        <Button className="mt-6 w-full" type="submit" loading={pending}>
          {pending ? '登录中...' : '登录'}
        </Button>
      </form>
    </main>
  )
}
