import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/auth-service', () => ({
  createUser: vi.fn(),
  authenticateUser: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  setSessionCookie: vi.fn(),
  destroySession: vi.fn(),
}))

import { createUser, authenticateUser } from '@/services/auth-service'
import { setSessionCookie, destroySession } from '@/lib/auth/session'
import { signup, login, logout } from '@/actions/auth'

const mockCreateUser = vi.mocked(createUser)
const mockAuthenticateUser = vi.mocked(authenticateUser)
const mockSetSessionCookie = vi.mocked(setSessionCookie)
const mockDestroySession = vi.mocked(destroySession)

const VALID_SIGNUP = {
  email: 'user@example.com',
  password: 'Password1!',
  passwordConfirm: 'Password1!',
  nickname: '닉네임',
}

const MOCK_USER = {
  id: 'user-1',
  email: VALID_SIGNUP.email,
  nickname: VALID_SIGNUP.nickname,
  createdAt: new Date().toISOString(),
}

describe('signup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('유효한 입력으로 회원가입하면 계정을 생성하고 세션을 발급한 뒤 ok:true를 반환한다', async () => {
    mockCreateUser.mockResolvedValueOnce(MOCK_USER as never)

    const result = await signup(VALID_SIGNUP)

    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: VALID_SIGNUP.email, nickname: VALID_SIGNUP.nickname })
    )
    expect(mockSetSessionCookie).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true })
  })

  it('이미 사용 중인 이메일이면 ok:false와 email 필드 에러를 반환하고 세션을 발급하지 않는다', async () => {
    mockCreateUser.mockRejectedValueOnce(new Error('EMAIL_TAKEN'))

    const result = await signup(VALID_SIGNUP)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.field).toBe('email')
      expect(result.error).toBeTruthy()
    }
    expect(mockSetSessionCookie).not.toHaveBeenCalled()
  })

  it('비밀번호와 비밀번호 확인이 일치하지 않으면 서비스 호출 없이 ok:false를 반환한다', async () => {
    const result = await signup({ ...VALID_SIGNUP, passwordConfirm: 'Different1!' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.field).toBe('passwordConfirm')
    }
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it('이메일 형식이 올바르지 않으면 서비스 호출 없이 ok:false를 반환한다', async () => {
    const result = await signup({ ...VALID_SIGNUP, email: 'not-an-email' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.field).toBe('email')
    }
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it('비밀번호가 최소 길이 미만이면 서비스 호출 없이 ok:false를 반환한다', async () => {
    const result = await signup({ ...VALID_SIGNUP, password: '123', passwordConfirm: '123' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.field).toBe('password')
    }
    expect(mockCreateUser).not.toHaveBeenCalled()
  })
})

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('올바른 이메일/비밀번호로 로그인하면 세션을 발급하고 ok:true를 반환한다', async () => {
    mockAuthenticateUser.mockResolvedValueOnce(MOCK_USER as never)

    const result = await login({ email: VALID_SIGNUP.email, password: VALID_SIGNUP.password })

    expect(mockSetSessionCookie).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true })
  })

  it('존재하지 않는 이메일과 잘못된 비밀번호는 동일한 일반 에러 메시지를 반환한다 (계정 열거 방지)', async () => {
    mockAuthenticateUser.mockRejectedValueOnce(new Error('INVALID_CREDENTIALS'))
    const nonexistentResult = await login({ email: 'nobody@example.com', password: 'whatever1!' })

    mockAuthenticateUser.mockRejectedValueOnce(new Error('INVALID_CREDENTIALS'))
    const wrongPasswordResult = await login({
      email: VALID_SIGNUP.email,
      password: 'WrongPassword!',
    })

    expect(nonexistentResult.ok).toBe(false)
    expect(wrongPasswordResult.ok).toBe(false)
    if (!nonexistentResult.ok && !wrongPasswordResult.ok) {
      expect(nonexistentResult.error).toBe(wrongPasswordResult.error)
      expect(nonexistentResult.field).toBeUndefined()
    }
    expect(mockSetSessionCookie).not.toHaveBeenCalled()
  })
})

describe('logout', () => {
  it('세션을 파기한다', async () => {
    await logout()
    expect(mockDestroySession).toHaveBeenCalledTimes(1)
  })
})
