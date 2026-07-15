import Link from 'next/link'
import { PriceTag } from '@/components/features/restaurants/price-tag'
import { ORDER_STATUS_LABELS } from '@/types/order'
import type { Order } from '@/types/order'

interface OrderCardProps {
  order: Order
}

const statusBadgeClass =
  'rounded-md bg-surface px-4 py-1 text-sm font-medium text-text'

/** 손님용 주문 1건 카드(Server). 음식점명·주문 일시·총액·상태 배지. 카드 전체가 상세 링크. */
export function OrderCard({ order }: OrderCardProps) {
  return (
    <li>
      <Link
        href={`/orders/${order.id}`}
        className="flex flex-col gap-4 rounded-lg border border-border bg-bg p-4 transition-colors hover:bg-surface"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-md font-semibold text-text">
              {order.restaurantName}
            </span>
            <span className="text-sm text-text-muted">
              {new Date(order.createdAt).toLocaleString('ko-KR')}
            </span>
          </div>
          <span className={statusBadgeClass}>{ORDER_STATUS_LABELS[order.status]}</span>
        </div>

        <div className="flex justify-end">
          <PriceTag price={order.totalPrice} />
        </div>
      </Link>
    </li>
  )
}
