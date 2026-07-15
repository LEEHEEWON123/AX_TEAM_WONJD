import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import type { Session, UserRole } from '@/types/user'
import { USER_ROLES } from '@/types/user'

const COOKIE_NAME = 'session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET 환경변수가 설정되지 않았거나 32자 미만입니다. .env.local에 32자 이상의 랜덤 값을 설정하세요.'
    )
  }
  return new TextEncoder().encode(secret)
}

/** 세션 정보를 HS256 JWT로 서명한다. */
export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({
    userId: session.userId,
    email: session.email,
    nickname: session.nickname,
    role: session.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey())
}

/** JWT를 검증하고 세션 payload를 복원한다. 위조/오류 시 null. */
export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    const { userId, email, nickname, role } = payload

    if (
      typeof userId !== 'string' ||
      typeof email !== 'string' ||
      typeof nickname !== 'string'
    ) {
      return null
    }

    // 기존 발급 토큰은 role 필드가 없다 → 누락/비정상 값이면 'customer'로 폴백(재로그인 불필요).
    const safeRole: UserRole =
      typeof role === 'string' && (USER_ROLES as readonly string[]).includes(role)
        ? (role as UserRole)
        : 'customer'

    return { userId, email, nickname, role: safeRole }
  } catch {
    return null
  }
}

/** 세션 쿠키를 HttpOnly·Secure·SameSite=Lax로 설정한다. */
export async function setSessionCookie(session: Session): Promise<void> {
  const token = await createSessionToken(session)
  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

/** 세션 쿠키를 삭제(파기)한다. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

/** 현재 요청의 세션을 조회한다. 쿠키 없음/위조 시 null. */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)

  if (!cookie?.value) return null

  return verifySessionToken(cookie.value)
}
