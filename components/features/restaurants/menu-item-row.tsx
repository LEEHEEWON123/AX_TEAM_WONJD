import type { MenuItem } from '@/types/restaurant'
import { PriceTag } from './price-tag'

interface MenuItemRowProps {
  item: MenuItem
}

/** 상세 메뉴 한 줄. 좌측 이름/설명, 우측 가격 + 담기(+) 버튼. */
export function MenuItemRow({ item }: MenuItemRowProps) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="flex flex-col gap-1">
        <span className="text-md font-medium text-text">{item.name}</span>
        {item.description && <span className="text-sm text-text-muted">{item.description}</span>}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <PriceTag price={item.price} />
        {/* 담기(+) 버튼 — 이번 이슈에서는 비기능 placeholder (장바구니는 이후 이슈) */}
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-md text-text-muted"
        >
          +
        </span>
      </div>
    </li>
  )
}
