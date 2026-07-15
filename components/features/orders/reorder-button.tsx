'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reorderAction } from '@/actions/order'
import { cn } from '@/lib/utils'

interface ReorderButtonProps {
  /** 재주문 대상 주문 id. 액션 인자로 전달 — 서버에서 소유 재확인(getOrder). */
  orderId: number
}

/**
 * 재주문 버튼(Client + useTransition, ReviewForm/FavoriteButton 준용).
 * 성공 & 담은 항목이 있으면 /cart로 이동. 전부 품절이면 이동하지 않고 인라인 안내.
 * 일부 품절이어도 이동은 하되, 제외된 개수를 짧게 안내(1회성, 과도한 UX 없이 실용 톤).
 */
export function ReorderButton({ orderId }: ReorderButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    setNotice(null)

    startTransition(async () => {
      const result = await reorderAction(orderId)
      if (!result.ok) {
        setError(result.error)
        return
      }

      // 전부 판매 종료 — 장바구니 변화 없음. 이동하지 않고 인라인 안내.
      if (result.addedCount === 0) {
        setError('모든 메뉴가 더 이상 판매되지 않아요')
        return
      }

      // 일부만 담김 — 이동 직전 제외 개수 안내(단순화).
      if (result.unavailableItemNames.length > 0) {
        setNotice(`${result.unavailableItemNames.length}개 메뉴가 판매 종료되어 제외됐어요`)
      }

      router.push('/cart')
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          'w-full rounded-md bg-surface px-4 py-2 text-center text-md font-medium text-text',
          'border border-border transition-colors hover:bg-border/40',
          'disabled:pointer-events-none disabled:opacity-50'
        )}
      >
        {isPending ? '담는 중...' : '재주문'}
      </button>

      {notice && <p className="text-sm text-text-muted">{notice}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
