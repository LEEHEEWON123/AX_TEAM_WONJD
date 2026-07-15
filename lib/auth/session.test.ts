import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@/types/user'

// 세션은 JWT 서명 쿠키(jose + AUTH_SECRET)로 구현된다 (spec 확정 사항).
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? 'test-only-secret-key-at-least-32-chars-long'

// next/headers의 cookies()는 Next.js 15 App Router 기준 async 함수다.
const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}))

import {
  createSessionToken,
  verifySessionToken,
  setSessionCookie,
  destroySession,
  getSession,
} from '@/lib/auth/session'

const SESSION: Session = {
  userId: 'user-1',
  email: 'user@example.com',
  nickname: '닉네임',
  role: 'customer',
}

describe('createSessionToken / verifySessionToken', () => {
  it('세션 정보를 JWT로 서명하고 다시 검증하면 원본 payload를 복원한다', async () => {
    const token = await createSessionToken(SESSION)
    expect(typeof token).toBe('string')

    const decoded = await verifySessionToken(token)
    expect(decoded).toMatchObject(SESSION)
  })

  it('위조되었거나 형식이 잘못된 토큰은 null을 반환한다', async () => {
    const decoded = await verifySessionToken('tampered.invalid.token')
    expect(decoded).toBeNull()
  })
})

describe('setSessionCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HttpOnly, Secure, SameSite=Lax 옵션으로 세션 쿠키를 설정한다', async () => {
    await setSessionCookie(SESSION)

    expect(cookieStore.set).toHaveBeenCalledTimes(1)
    const [, value, options] = cookieStore.set.mock.calls[0]!
    expect(typeof value).toBe('string')
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
    })
  })
})

describe('destroySession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('세션 쿠키를 삭제(파기)한다', async () => {
    await destroySession()
    expect(cookieStore.delete).toHaveBeenCalled()
  })
})

describe('getSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('세션 쿠키가 없으면 null을 반환한다', async () => {
    cookieStore.get.mockReturnValue(undefined)
    const session = await getSession()
    expect(session).toBeNull()
  })

  it('유효한 세션 쿠키가 있으면 세션 정보를 반환한다 (새로고침/재방문 시 로그인 상태 보존)', async () => {
    const token = await createSessionToken(SESSION)
    cookieStore.get.mockReturnValue({ value: token })

    const session = await getSession()
    expect(session).toMatchObject(SESSION)
  })

  it('쿠키 값이 위조되었으면 null을 반환한다', async () => {
    cookieStore.get.mockReturnValue({ value: 'invalid.token.value' })
    const session = await getSession()
    expect(session).toBeNull()
  })
})
