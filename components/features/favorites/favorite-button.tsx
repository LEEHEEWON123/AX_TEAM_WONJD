'use client'

import { useState, useTransition } from 'react'
import { toggleFavoriteAction } from '@/actions/favorite'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  restaurantId: number
  initialFavorited: boolean
}

/**
 * 찜 버튼(Client). useTransition으로 toggleFavoriteAction 호출, 서버 결과로 상태 갱신(낙관적 UI 없음).
 * 카드 전체가 <Link>인 목록에서도 쓰이므로 클릭 시 preventDefault + stopPropagation으로 네비게이션을 막는다
 * (상세 페이지에는 상위 Link가 없어 무해).
 */
export function FavoriteButton({ restaurantId, initialFavorited }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    startTransition(async () => {
      const result = await toggleFavoriteAction(restaurantId)
      if (result.ok) {
        setFavorited(result.favorited)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={favorited}
      aria-label={favorited ? '찜 해제' : '찜하기'}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg bg-bg/80 text-md',
        'transition-colors disabled:opacity-50',
        favorited ? 'text-danger' : 'text-text-muted hover:text-text'
      )}
    >
      {favorited ? '♥' : '♡'}
    </button>
  )
}
