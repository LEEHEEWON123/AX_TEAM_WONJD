import { z } from 'zod'
import { RATING_MAX, RATING_MIN } from '@/types/review'

const COMMENT_MAX = 500

// 리뷰 작성 입력. 별점은 필수(1~5 정수), 텍스트는 선택(빈 문자열 허용, 최대 500자).
// 별점+텍스트 = 별점 필수 + 텍스트 입력 가능으로 해석(스펙 권장 기본값).
export const reviewSchema = z.object({
  rating: z
    .number({ invalid_type_error: '별점을 선택해 주세요' })
    .int('별점은 정수여야 합니다')
    .min(RATING_MIN, '별점을 선택해 주세요')
    .max(RATING_MAX, '별점은 5점까지 선택할 수 있습니다'),
  comment: z.string().trim().max(COMMENT_MAX, '리뷰가 너무 깁니다'),
})

export type ReviewSchema = z.infer<typeof reviewSchema>
