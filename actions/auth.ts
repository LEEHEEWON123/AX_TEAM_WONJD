'use server'

import { loginSchema, signupSchema } from '@/lib/validation/auth-schema'
import { destroySession, setSessionCookie } from '@/lib/auth/session'
import { authenticateUser, createUser } from '@/services/auth-service'
import type { AuthResult, LoginInput, SignupInput } from '@/types/user'

const GENERIC_AUTH_ERROR = '이메일 또는 비밀번호가 올바르지 않습니다'

/** 회원가입: zod 검증 → 계정 생성 → 세션 발급. 실패 시 AuthResult로 변환. */
export async function signup(input: SignupInput): Promise<AuthResult> {
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path[0]
    const field = typeof path === 'string' ? (path as keyof SignupInput) : undefined
    return { ok: false, error: issue?.message ?? '입력값이 올바르지 않습니다', field }
  }

  try {
    const user = await createUser(input)
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
    })
    return { ok: true }
  } catch {
    return { ok: false, error: '이미 사용 중인 이메일입니다', field: 'email' }
  }
}

/** 로그인: zod 검증 → 인증 → 세션 발급. 실패는 계정 열거 방지를 위해 동일 일반 메시지. */
export async function login(input: LoginInput): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: GENERIC_AUTH_ERROR }
  }

  try {
    const user = await authenticateUser(input)
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
    })
    return { ok: true }
  } catch {
    return { ok: false, error: GENERIC_AUTH_ERROR }
  }
}

/** 로그아웃: 세션 파기. */
export async function logout(): Promise<void> {
  await destroySession()
}
