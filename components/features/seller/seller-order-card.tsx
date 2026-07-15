import { updateOrderStatusAction } from '@/actions/seller'
import { OrderSummary } from '@/components/features/orders/order-summary'
import { ORDER_STATUS_LABELS, ORDER_STATUS_NEXT } from '@/types/order'
import type { OrderWithItems } from '@/types/order'

interface SellerOrderCardProps {
  order: OrderWithItems
}

const statusBadgeClass =
  'rounded-md bg-surface px-4 py-1 text-sm font-medium text-text'

/** 주문 1건 카드(Server). 항목 요약 + 현재 상태 + 다음 단계 전이 버튼(form action). */
export function SellerOrderCard({ order }: SellerOrderCardProps) {
  const next = ORDER_STATUS_NEXT[order.status]

  return (
    <li className="flex flex-col gap-4 rounded-lg border border-border bg-bg p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-md font-semibold text-text">주문 #{order.id}</span>
          <span className="text-sm text-text-muted">
            {new Date(order.createdAt).toLocaleString('ko-KR')}
          </span>
        </div>
        <span className={statusBadgeClass}>{ORDER_STATUS_LABELS[order.status]}</span>
      </div>

      <OrderSummary items={order.items} totalPrice={order.totalPrice} />

      {next ? (
        <form action={updateOrderStatusAction} className="flex justify-end">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-md font-medium text-primary-text transition-colors hover:bg-primary/90"
          >
            {ORDER_STATUS_LABELS[next]}(으)로 변경
          </button>
        </form>
      ) : (
        <p className="text-right text-sm text-text-muted">완료된 주문이에요</p>
      )}
    </li>
  )
}
