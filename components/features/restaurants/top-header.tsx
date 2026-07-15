'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/user'

interface TopHeaderProps {
  /** 검색 입력 초기값(현재 ?q= 반영). */
  initialQuery?: string
  /** 로그인 사용자 닉네임. null이면 로그인 CTA 노출. */
  nickname?: string | null
  /** 로그인 사용자 역할. owner이면 사장님 관리(/seller) 진입 링크 노출. */
  role?: UserRole | null
  /** 검색 UI 노출 여부(상세 화면에서는 숨김). */
  showSearch?: boolean
}

const iconButtonClass =
  'flex h-9 w-9 items-center justify-center rounded-lg text-md text-text-muted hover:text-text'

/** 상단 공통 헤더. 검색 입력은 /로 GET submit하여 ?q= 를 반영한다. */
export function TopHeader({
  initialQuery = '',
  nickname,
  role,
  showSearch = true,
}: TopHeaderProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = query.trim()
    router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/')
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold text-primary">
            FoodNow
          </Link>

          <div className="flex items-center gap-1">
            {/* 알림/찜/장바구니 — 이번 이슈에서는 비기능 placeholder */}
            <span aria-hidden className={iconButtonClass}>
              🔔
            </span>
            <span aria-hidden className={iconButtonClass}>
              ♡
            </span>
            <Link href="/cart" aria-label="장바구니" className={iconButtonClass}>
              🛒
            </Link>
            {role === 'owner' && (
              <Link
                href="/seller"
                className="ml-2 rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface"
              >
                사장님
              </Link>
            )}
            {nickname ? (
              <span className="ml-2 text-sm text-text-muted">{nickname}님</span>
            ) : (
              <Link
                href="/login"
                className="ml-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-text transition-colors hover:bg-primary/90"
              >
                로그인
              </Link>
            )}
          </div>
        </div>

        {showSearch && (
          <form onSubmit={handleSubmit}>
            <input
              type="search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="음식점 또는 메뉴 검색"
              aria-label="음식점 또는 메뉴 검색"
              className={cn(
                'w-full rounded-md border border-border bg-surface px-4 py-2 text-md text-text',
                'placeholder:text-text-muted',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
            />
          </form>
        )}
      </div>
    </header>
  )
}
