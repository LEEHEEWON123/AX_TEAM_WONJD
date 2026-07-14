import { PriceTag } from '@/components/features/restaurants/price-tag'
import type { OrderItem } from '@/types/order'

interface OrderSummaryProps {
  items: OrderItem[]
  totalPrice: number
}

/** 주문 항목 리스트(이름·수량·라인합계) + 총액. 주문 완료 화면에서 사용. */
export function OrderSummary({ items, totalPrice }: OrderSummaryProps) {
  return (
    <section className="flex flex-col gap-2">
      <ul className="flex flex-col">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0"
          >
            <div className="flex flex-col gap-1">
              <span className="text-md font-medium text-text">{item.name}</span>
              <span className="text-sm text-text-muted">
                {item.price.toLocaleString('ko-KR')}원 × {item.quantity}
              </span>
            </div>
            <PriceTag price={item.lineTotal} />
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-md font-medium text-text">총 금액</span>
        <PriceTag price={totalPrice} className="text-lg" />
      </div>
    </section>
  )
}
