import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import type { Session } from '@/types/user'

/**
 * 사장님 전용 라우트 게이트.
 * - 비로그인 → /login
 * - role ≠ owner(손님) → /(홈)
 * 통과 시 owner 세션을 반환한다(redirect는 never를 반환하므로 이후 session은 non-null).
 */
export async function requireOwner(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  if (session.role !== 'owner') {
    redirect('/')
  }
  return session
}
