'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { StarRating } from '@/components/features/reviews/star-rating'
import { createReviewAction } from '@/actions/review'
import type { ReviewInput } from '@/types/review'

interface ReviewFormProps {
  /** 리뷰 대상 주문 id. 액션 인자로 전달 — 서버에서 소유·상태 재확인(input에는 담지 않음). */
  orderId: number
}

const inputClass = cn(
  'w-full rounded-md border border-border bg-bg px-4 py-2 text-md text-text',
  'placeholder:text-text-muted',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
)

/** 리뷰 작성 폼(Client + useTransition). 검증 실패는 인라인 메시지(MenuItemForm 준용). */
export function ReviewForm({ orderId }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    // 별점 필수 — 빈 별점(0)은 제출 전 인라인 차단(서버도 이중 검증).
    if (rating === 0) {
      setError('별점을 선택해 주세요')
      return
    }

    const input: ReviewInput = { rating, comment }

    startTransition(async () => {
      const result = await createReviewAction(orderId, input)
      if (!result.ok) {
        setError(result.error)
      }
      // 성공 시 revalidatePath로 폼이 내 리뷰 카드로 교체됨(별도 처리 불필요).
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
      noValidate
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">별점</span>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`review-comment-${orderId}`} className="text-sm font-medium text-text">
          리뷰 (선택)
        </label>
        <textarea
          id={`review-comment-${orderId}`}
          name="comment"
          rows={3}
          maxLength={500}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="음식은 어떠셨나요?"
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          'rounded-md bg-primary px-4 py-2 text-md font-medium text-primary-text',
          'transition-colors hover:bg-primary/90',
          'disabled:pointer-events-none disabled:opacity-50'
        )}
      >
        {isPending ? '저장 중...' : '리뷰 등록'}
      </button>
    </form>
  )
}
