'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { reviewSchema } from '@/lib/validation/review-schema'
import { createReview } from '@/services/review-service'
import type { ReviewErrorCode } from '@/services/review-service'
import type { ReviewInput } from '@/types/review'

// 폼 인라인 검증/에러 표시용 결과(seller SellerActionResult / auth AuthResult 패턴 준용).
export type ReviewActionResult = { ok: true } | { ok: false; error: string }

// 서비스 throw 코드 → 사용자 메시지 매핑.
const ERROR_MESSAGES: Record<ReviewErrorCode, string> = {
  ORDER_NOT_FOUND: '리뷰를 작성할 수 없는 주문입니다',
  ORDER_NOT_COMPLETED: '완료된 주문만 리뷰를 작성할 수 있습니다',
  INVALID_RATING: '별점을 선택해 주세요',
  ALREADY_REVIEWED: '이미 리뷰를 작성했습니다',
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message in ERROR_MESSAGES) {
    return ERROR_MESSAGES[error.message as ReviewErrorCode]
  }
  return '리뷰 작성에 실패했습니다'
}

/**
 * 리뷰 작성. 비로그인 → /login. 소유·상태·중복·범위 검증은 서비스에서 서버 재확인.
 * orderId는 액션 인자로 별도 전달(폼 prop) — input에는 rating/comment만(id류 필드 금지, 서버 소유 검증).
 */
export async function createReviewAction(
  orderId: number,
  input: ReviewInput
): Promise<ReviewActionResult> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return { ok: false, error: '잘못된 요청입니다' }
  }

  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }

  try {
    createReview(session.userId, orderId, parsed.data)
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }

  // 동적 세그먼트는 문자열 리터럴 경로 실수 방지 위해 '[id]' + 'page' 형식(seller 선례 동일).
  revalidatePath('/restaurants/[id]', 'page')
  revalidatePath('/orders/[id]', 'page')
  return { ok: true }
}
