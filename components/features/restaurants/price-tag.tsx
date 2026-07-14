import { cn } from '@/lib/utils'

interface PriceTagProps {
  price: number
  className?: string
}

/** KRW 가격 표시. 32000 → "32,000원". */
export function PriceTag({ price, className }: PriceTagProps) {
  return (
    <span className={cn('text-md font-semibold text-text', className)}>
      {price.toLocaleString('ko-KR')}원
    </span>
  )
}
