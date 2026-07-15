'use client'

import { cn } from '@/lib/utils'
import { RATING_MAX } from '@/types/review'

interface StarRatingProps {
  /** 현재 별점(0 = 미선택). */
  value: number
  /** 지정되면 입력 모드(클릭 선택), 없으면 표시 모드(읽기 전용). */
  onChange?: (rating: number) => void
  /** 표시 모드에서 별 옆에 함께 노출할 라벨(예: "4.5"). */
  label?: string
  className?: string
}

// ★ 색상: 채워진 별은 기존 관례 text-warning(음식점 rating 별과 동일), 미선택은 text-border.
function starClass(filled: boolean): string {
  return filled ? 'text-warning' : 'text-border'
}

/**
 * 별점 표시/입력 공용 컴포넌트(Client — 입력 모드 클릭 상태 필요).
 * onChange 있으면 클릭 가능한 버튼(입력), 없으면 읽기 전용 별(표시).
 */
export function StarRating({ value, onChange, label, className }: StarRatingProps) {
  const stars = Array.from({ length: RATING_MAX }, (_, i) => i + 1)

  if (onChange) {
    return (
      <div role="radiogroup" aria-label="별점" className={cn('flex items-center gap-1', className)}>
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star}점`}
            onClick={() => onChange(star)}
            className={cn(
              'text-2xl leading-none transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              starClass(star <= value)
            )}
          >
            ★
          </button>
        ))}
      </div>
    )
  }

  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      aria-label={`별점 ${value}점`}
    >
      <span aria-hidden className="inline-flex">
        {stars.map((star) => (
          <span key={star} className={cn('text-md leading-none', starClass(star <= value))}>
            ★
          </span>
        ))}
      </span>
      {label && <span className="text-sm font-medium text-text">{label}</span>}
    </span>
  )
}
