'use server'

import { getCompanySsoProfile, isCompanyOnlyAuthEnabled } from '@/lib/auth/company-sso'
import { loginSchema, signupSchema } from '@/lib/validation/auth-schema'
import { destroySession, setSessionCookie } from '@/lib/auth/session'
import { authenticateUser, createUser, findOrCreateSsoUser } from '@/services/auth-service'
import type { AuthResult, LoginInput, SignupInput } from '@/types/user'

const GENERIC_AUTH_ERROR = '이메일 또는 비밀번호가 올바르지 않습니다'

/** 회원가입: zod 검증 → 계정 생성 → 세션 발급. 실패 시 AuthResult로 변환. */
export async function signup(input: SignupInput): Promise<AuthResult> {
  if (isCompanyOnlyAuthEnabled()) {
    return { ok: false, error: '이 서비스는 GitHub 회사 계정으로만 가입할 수 있습니다' }
  }

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
  if (isCompanyOnlyAuthEnabled()) {
    return { ok: false, error: '이 서비스는 GitHub 회사 계정으로만 로그인할 수 있습니다' }
  }

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

/** Supabase Auth access token을 서버에서 재검증하고 로컬 세션으로 교환한다. */
export async function completeCompanySsoLogin(accessToken: string): Promise<AuthResult> {
  if (!accessToken) {
    return { ok: false, error: 'GitHub 로그인 토큰이 없습니다. 다시 로그인해 주세요.' }
  }

  try {
    const profile = await getCompanySsoProfile(accessToken)
    const user = await findOrCreateSsoUser(profile)
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
    })
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'SSO_EMAIL_DOMAIN_FORBIDDEN') {
      return { ok: false, error: '@wonjd.com GitHub 회사 계정만 로그인할 수 있습니다' }
    }
    return { ok: false, error: 'GitHub 로그인 처리에 실패했습니다. 다시 시도해 주세요.' }
  }
}
