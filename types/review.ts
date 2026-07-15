// 별점 범위(닫힌 셋의 경계). zod 스키마·StarRating·서비스 방어 체크가 공유한다.
export const RATING_MIN = 1
export const RATING_MAX = 5

export interface Review {
  id: number
  orderId: number
  userId: string // users.id (TEXT UUID) 참조 — id 스킴 불일치 주의(Order 선례와 동일)
  restaurantId: number
  rating: number // 1~5
  comment: string
  createdAt: string // ISO
}

// 음식점 상세 노출용 — users 조인으로 작성자 닉네임 포함(스냅샷 아님, 라이브 조인).
export interface ReviewWithAuthor extends Review {
  authorNickname: string
}

// 폼 → 액션 전달 입력. id류 필드 금지(restaurant_id/order_id는 서버에서 파생/전달).
export interface ReviewInput {
  rating: number
  comment: string
}

// 음식점 리뷰 요약(평균/개수) — 리뷰 섹션 헤더용.
export interface ReviewSummary {
  average: number // 소수 1자리 표시 예정
  count: number
}
