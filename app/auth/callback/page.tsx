'use client'

import { useEffect } from 'react'

/** GitHub/Supabase가 /auth/callback 으로 보내도 회사 콜백으로 이어지게 한다. */
export default function AuthCallbackAliasPage() {
  useEffect(() => {
    window.location.replace(`/auth/company/callback${window.location.search}${window.location.hash}`)
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <p className="text-sm text-text-muted">GitHub 로그인 처리 중...</p>
    </main>
  )
}
