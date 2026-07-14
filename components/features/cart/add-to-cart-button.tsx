'use client'

import { useTransition } from 'react'
import { addToCartAction } from '@/actions/cart'
import { cn } from '@/lib/utils'

interface AddToCartButtonProps {
  menuItemId: number
  itemName: string
}

/**
 * 담기(+) 버튼(Client).
 * 다른 음식점 메뉴가 이미 담겨 있으면 확인 후 기존 장바구니를 비우고 교체(force 재호출).
 */
export function AddToCartButton({ menuItemId, itemName }: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await addToCartAction({ menuItemId })
      if (result.status === 'different_restaurant') {
        const confirmed = window.confirm(
          `장바구니에 "${result.currentRestaurantName}" 메뉴가 담겨 있어요.\n비우고 "${itemName}"을(를) 새로 담을까요?`
        )
        if (confirmed) {
          await addToCartAction({ menuItemId, force: true })
        }
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`${itemName} 담기`}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg border border-border text-md text-text-muted',
        'transition-colors hover:border-primary hover:text-primary',
        'disabled:opacity-50'
      )}
    >
      +
    </button>
  )
}
