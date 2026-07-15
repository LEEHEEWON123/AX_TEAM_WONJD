import { getDb } from '@/lib/db/client'
import { RATING_MAX, RATING_MIN } from '@/types/review'
import type { Review, ReviewInput, ReviewSummary, ReviewWithAuthor } from '@/types/review'

// reviews(snake_case) row.
interface ReviewRow {
  id: number
  order_id: number
  user_id: string
  restaurant_id: number
  rating: number
  comment: string
  created_at: string
}

// listReviewsByRestaurant 전용 — users 조인으로 작성자 닉네임 포함.
interface ReviewWithAuthorRow extends ReviewRow {
  author_nickname: string
}

/**
 * createReview 검증 실패 코드. 액션에서 사용자 메시지로 매핑한다(api-error-throw).
 * - ORDER_NOT_FOUND: 미존재 또는 타인 주문(존재 노출 방지 — 둘을 구분하지 않음).
 * - ORDER_NOT_COMPLETED: completed가 아닌 주문(pending/cooking).
 * - INVALID_RATING: 별점 범위(1~5) 밖(액션 우회 대비 서비스 방어).
 * - ALREADY_REVIEWED: 이미 리뷰한 주문(선확인 또는 UNIQUE 위반).
 */
export type ReviewErrorCode =
  | 'ORDER_NOT_FOUND'
  | 'ORDER_NOT_COMPLETED'
  | 'INVALID_RATING'
  | 'ALREADY_REVIEWED'

/** reviews row(snake_case) → Review(camelCase) 명시 매핑. */
function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  }
}

/** better-sqlite3 UNIQUE(order_id) 위반 여부. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  )
}

/**
 * 리뷰를 생성한다. 작성 권한을 서버에서 재확인한다(클라 입력 신뢰 금지).
 *  1) orderId로 주문 row 조회 → o.user_id === userId AND o.status === 'completed' 재확인.
 *     불일치 시 insert 없이 throw(소유·상태를 클라 입력으로 판단하지 않음).
 *  2) restaurant_id는 주문 row에서 파생 저장(위조 방지 — 인자 input에는 rating/comment만).
 *  3) 별점 범위(1~5) 방어 체크(액션 우회 대비).
 *  4) 중복 방지 이중 방어: 선확인(getReviewByOrder) + DB UNIQUE(order_id) 위반 catch.
 * 위반 시 ReviewErrorCode를 message로 하는 Error throw.
 */
export function createReview(userId: string, orderId: number, input: ReviewInput): Review {
  const db = getDb()

  // (1) 소유·상태 서버 재확인. restaurant_id도 이 row에서 파생.
  const order = db
    .prepare(`SELECT user_id, restaurant_id, status FROM orders WHERE id = ?`)
    .get(orderId) as { user_id: string; restaurant_id: number; status: string } | undefined

  if (!order || order.user_id !== userId) {
    throw new Error('ORDER_NOT_FOUND' satisfies ReviewErrorCode)
  }
  if (order.status !== 'completed') {
    throw new Error('ORDER_NOT_COMPLETED' satisfies ReviewErrorCode)
  }

  // (3) 별점 범위 방어(정수 1~5).
  if (
    !Number.isInteger(input.rating) ||
    input.rating < RATING_MIN ||
    input.rating > RATING_MAX
  ) {
    throw new Error('INVALID_RATING' satisfies ReviewErrorCode)
  }

  // (4a) 중복 선확인.
  const existing = db
    .prepare(`SELECT id FROM reviews WHERE order_id = ?`)
    .get(orderId) as { id: number } | undefined
  if (existing) {
    throw new Error('ALREADY_REVIEWED' satisfies ReviewErrorCode)
  }

  // (2) restaurant_id는 주문 row에서 파생.
  const restaurantId = order.restaurant_id
  const comment = input.comment.trim()
  const now = new Date().toISOString()

  let insertedId: number
  try {
    const result = db
      .prepare(
        `INSERT INTO reviews (order_id, user_id, restaurant_id, rating, comment, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(orderId, userId, restaurantId, input.rating, comment, now)
    insertedId = Number(result.lastInsertRowid)
  } catch (error) {
    // (4b) 동시성 등으로 선확인을 통과한 뒤 UNIQUE 위반이 나면 중복으로 매핑.
    if (isUniqueViolation(error)) {
      throw new Error('ALREADY_REVIEWED' satisfies ReviewErrorCode)
    }
    throw error
  }

  return {
    id: insertedId,
    orderId,
    userId,
    restaurantId,
    rating: input.rating,
    comment,
    createdAt: now,
  }
}

/**
 * 음식점의 리뷰 목록을 최신순으로 조회한다(음식점 상세 노출용).
 * users를 조인해 현재 닉네임을 라이브로 표시(스냅샷 아님).
 */
export function listReviewsByRestaurant(restaurantId: number): ReviewWithAuthor[] {
  const db = getDb()

  const rows = db
    .prepare(
      `SELECT r.id, r.order_id, r.user_id, r.restaurant_id, r.rating, r.comment, r.created_at,
              u.nickname AS author_nickname
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.restaurant_id = ?
       ORDER BY r.id DESC`
    )
    .all(restaurantId) as ReviewWithAuthorRow[]

  return rows.map((row) => ({
    ...mapReview(row),
    authorNickname: row.author_nickname,
  }))
}

/**
 * 주문에 대한 내 리뷰를 조회한다("이미 작성했는가" 게이팅용).
 * 소유(userId) 불일치·미존재 시 null(존재 노출 방지).
 */
export function getReviewByOrder(userId: string, orderId: number): Review | null {
  const db = getDb()

  const row = db
    .prepare(`SELECT * FROM reviews WHERE order_id = ? AND user_id = ?`)
    .get(orderId, userId) as ReviewRow | undefined
  if (!row) return null

  return mapReview(row)
}

/** 음식점 리뷰 요약(평균 별점·개수). 리뷰가 없으면 average=0, count=0. */
export function getRestaurantReviewSummary(restaurantId: number): ReviewSummary {
  const db = getDb()

  const row = db
    .prepare(
      `SELECT AVG(rating) AS average, COUNT(*) AS count
       FROM reviews
       WHERE restaurant_id = ?`
    )
    .get(restaurantId) as { average: number | null; count: number }

  return {
    average: row.average ?? 0,
    count: row.count,
  }
}
