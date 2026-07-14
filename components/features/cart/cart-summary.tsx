import { placeOrderAction } from '@/actions/order'
import { PriceTag } from '@/components/features/restaurants/price-tag'

interface CartSummaryProps {
  totalPrice: number
}

/** 장바구니 하단 요약: 총 금액 + 주문하기 버튼(Server Action form). */
export function CartSummary({ totalPrice }: CartSummaryProps) {
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <span className="text-md font-medium text-text">총 금액</span>
        <PriceTag price={totalPrice} className="text-lg" />
      </div>

      <form action={placeOrderAction}>
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2 text-md font-medium text-primary-text transition-colors hover:bg-primary/90"
        >
          주문하기
        </button>
      </form>
    </div>
  )
}
