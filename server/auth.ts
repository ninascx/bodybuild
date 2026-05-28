import type { User } from '@prisma/client'
import bcrypt from 'bcrypt'
import { parse, serialize } from 'cookie'
import type { Request, Response } from 'express'
import crypto from 'node:crypto'

import { prisma } from './db'

const SESSION_COOKIE = 'bodybuild_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const DEFAULT_BCRYPT_ROUNDS = 10
const MIN_BCRYPT_ROUNDS = 8
const MAX_BCRYPT_ROUNDS = 14

export interface PublicUser {
  id: string
  username: string
  displayName: string
  role: User['role']
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function createSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function bcryptRounds(): number {
  const parsed = Number(process.env.BODYBUILD_BCRYPT_ROUNDS)
  if (!Number.isFinite(parsed)) return DEFAULT_BCRYPT_ROUNDS
  return Math.min(MAX_BCRYPT_ROUNDS, Math.max(MIN_BCRYPT_ROUNDS, Math.round(parsed)))
}

function secureCookieForRequest(request: Request): boolean {
  const configured = process.env.BODYBUILD_SECURE_COOKIES
  if (configured === 'true' || configured === '1') return true
  if (configured === 'false' || configured === '0') return false
  return request.secure || request.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https'
}

function sessionCookie(token: string, maxAge: number, secure: boolean): string {
  return serialize(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge,
  })
}

export function clearSessionCookie(request: Request): string {
  return sessionCookie('', 0, secureCookieForRequest(request))
}

export async function createSession(request: Request, response: Response, userId: string): Promise<void> {
  const token = createSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  })
  response.setHeader('Set-Cookie', sessionCookie(token, SESSION_MAX_AGE_SECONDS, secureCookieForRequest(request)))
}

export async function destroySession(request: Request, response: Response): Promise<void> {
  const token = parse(request.headers.cookie ?? '')[SESSION_COOKIE]
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } })
  }
  response.setHeader('Set-Cookie', clearSessionCookie(request))
}

export async function getCurrentUser(request: Request): Promise<User | null> {
  const token = parse(request.headers.cookie ?? '')[SESSION_COOKIE]
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })
  if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
    if (session) {
      await prisma.session.deleteMany({ where: { id: session.id } })
    }
    return null
  }
  return session.user
}

export async function requireUser(request: Request, response: Response): Promise<User | null> {
  const user = await getCurrentUser(request)
  if (!user) {
    response.status(401).json({ error: '请先登录' })
    return null
  }
  return user
}

export async function requireAdmin(request: Request, response: Response): Promise<User | null> {
  const user = await requireUser(request, response)
  if (!user) return null
  if (user.role !== 'admin') {
    response.status(403).json({ error: '需要管理员权限' })
    return null
  }
  return user
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, bcryptRounds())
}
