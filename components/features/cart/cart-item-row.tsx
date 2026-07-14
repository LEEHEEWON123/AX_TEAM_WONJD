import { removeItemAction, updateQuantityAction } from '@/actions/cart'
import { PriceTag } from '@/components/features/restaurants/price-tag'
import type { CartItem } from '@/types/cart'

interface CartItemRowProps {
  item: CartItem
}

const stepperButtonClass =
  'flex h-8 w-8 items-center justify-center rounded-md border border-border text-md text-text-muted transition-colors hover:border-primary hover:text-primary'

/** 장바구니 한 줄. 좌: 이름/단가, 우: 수량 스테퍼(−/＋)·라인합계·삭제. 각 조작은 Server Action form. */
export function CartItemRow({ item }: CartItemRowProps) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="flex flex-col gap-1">
        <span className="text-md font-medium text-text">{item.name}</span>
        <PriceTag price={item.price} className="text-sm font-normal text-text-muted" />
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <PriceTag price={item.lineTotal} />

        <div className="flex items-center gap-2">
          <form action={updateQuantityAction}>
            <input type="hidden" name="cartItemId" value={item.id} />
            <input type="hidden" name="quantity" value={item.quantity - 1} />
            <button type="submit" aria-label={`${item.name} 수량 줄이기`} className={stepperButtonClass}>
              −
            </button>
          </form>

          <span className="w-6 text-center text-md font-medium text-text" aria-label="수량">
            {item.quantity}
          </span>

          <form action={updateQuantityAction}>
            <input type="hidden" name="cartItemId" value={item.id} />
            <input type="hidden" name="quantity" value={item.quantity + 1} />
            <button type="submit" aria-label={`${item.name} 수량 늘리기`} className={stepperButtonClass}>
              ＋
            </button>
          </form>

          <form action={removeItemAction}>
            <input type="hidden" name="cartItemId" value={item.id} />
            <button
              type="submit"
              aria-label={`${item.name} 삭제`}
              className="flex h-8 w-8 items-center justify-center rounded-md text-md text-text-muted transition-colors hover:text-danger"
            >
              ×
            </button>
          </form>
        </div>
      </div>
    </li>
  )
}
