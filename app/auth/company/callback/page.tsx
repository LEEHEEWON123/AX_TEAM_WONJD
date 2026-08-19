'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeCompanySsoLogin } from '@/actions/auth'

function readAccessTokenFromHash(): string | null {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  const params = new URLSearchParams(hash)
  return params.get('access_token')
}

export default function CompanyAuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('GitHub 회사 계정 로그인 처리 중...')

  useEffect(() => {
    let cancelled = false

    async function run() {
      const accessToken = readAccessTokenFromHash()
      if (!accessToken) {
        setMessage('GitHub 로그인 토큰이 없습니다. 다시 로그인해 주세요.')
        return
      }

      const result = await completeCompanySsoLogin(accessToken)
      if (cancelled) return

      if (!result.ok) {
        setMessage(result.error)
        return
      }

      window.history.replaceState({}, document.title, '/auth/company/callback')
      router.replace('/')
      router.refresh()
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-bg p-6 text-center shadow-sm">
        <h1 className="mb-3 text-xl font-bold text-text">GitHub 회사 계정 로그인</h1>
        <p className="text-sm text-text-muted">{message}</p>
      </div>
    </main>
  )
}
