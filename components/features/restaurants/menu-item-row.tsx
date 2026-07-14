import Link from 'next/link'
import type { MenuItem } from '@/types/restaurant'
import { AddToCartButton } from '@/components/features/cart/add-to-cart-button'
import { PriceTag } from './price-tag'

interface MenuItemRowProps {
  item: MenuItem
  /** 로그인 여부. 인증 시 담기 버튼, 미인증 시 /login 유도 Link. */
  isAuthenticated: boolean
}

/** 상세 메뉴 한 줄. 좌측 이름/설명, 우측 가격 + 담기(+) 버튼(인증 시 동작, 미인증 시 로그인 유도). */
export function MenuItemRow({ item, isAuthenticated }: MenuItemRowProps) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="flex flex-col gap-1">
        <span className="text-md font-medium text-text">{item.name}</span>
        {item.description && <span className="text-sm text-text-muted">{item.description}</span>}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <PriceTag price={item.price} />
        {isAuthenticated ? (
          <AddToCartButton menuItemId={item.id} itemName={item.name} />
        ) : (
          <Link
            href="/login"
            aria-label={`${item.name} 담기 — 로그인 필요`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-md text-text-muted transition-colors hover:border-primary hover:text-primary"
          >
            +
          </Link>
        )}
      </div>
    </li>
  )
}
