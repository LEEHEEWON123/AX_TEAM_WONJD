'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

const buttonClass = cn(
  'w-full rounded-md border border-border bg-bg px-4 py-2 text-md font-medium text-text',
  'transition-colors hover:bg-surface',
  'disabled:pointer-events-none disabled:opacity-50'
)

export function CompanySsoButton() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)

    startTransition(async () => {
      try {
        const supabase = createBrowserSupabaseClient()
        const redirectTo = `${window.location.origin}/auth/company/callback`

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: { redirectTo, skipBrowserRedirect: true },
        })

        if (error || !data.url) {
          setError('GitHub 로그인 URL을 만들지 못했습니다')
          return
        }

        window.location.assign(data.url)
      } catch {
        setError('GitHub 로그인 준비에 실패했습니다')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={handleClick} disabled={isPending} className={buttonClass}>
        {isPending ? 'GitHub로 이동 중...' : 'GitHub 회사 계정으로 로그인'}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
