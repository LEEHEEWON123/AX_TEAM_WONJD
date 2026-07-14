import Link from 'next/link'
import { getSession } from '@/lib/auth/session'

// 홈은 이슈 #2에서 구현 예정 — 이번 이슈에서는 최소 placeholder.
export default async function HomePage() {
  const session = await getSession()

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-bold text-text">홈</h1>
      {session ? (
        <p className="text-md text-text-muted">
          {session.nickname}님, 환영합니다.
        </p>
      ) : (
        <p className="text-md text-text-muted">
          <Link href="/login" className="text-primary underline">
            로그인
          </Link>
          이 필요합니다.
        </p>
      )}
    </main>
  )
}
