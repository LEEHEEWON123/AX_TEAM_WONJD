import { getDb } from '@/lib/db/client'
import type { FoodCategory, Restaurant } from '@/types/restaurant'

// restaurants row(snake_case). restaurant-service의 RestaurantRow 패턴 준용
// (서비스별 자체 매핑 — order-service 선례).
interface RestaurantRow {
  id: number
  name: string
  category: string
  description: string
  rating: number
  eta_min: number
  eta_max: number
  owner_id: string | null
  created_at: string
}

/** row(snake_case) → Restaurant(camelCase) 명시 매핑. */
function mapRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    category: row.category as FoodCategory,
    description: row.description,
    rating: row.rating,
    etaMin: row.eta_min,
    etaMax: row.eta_max,
    ownerId: row.owner_id ?? null,
    createdAt: row.created_at,
  }
}

/**
 * 찜 토글. 존재하면 delete(찜 해제), 없으면 insert(찜)한다.
 * @returns 토글 후 찜 상태 — insert면 true, delete면 false.
 * userId는 반드시 서버 세션에서 얻은 값만 전달한다(액션에서 강제).
 */
export function toggleFavorite(userId: string, restaurantId: number): boolean {
  const db = getDb()

  const existing = db
    .prepare('SELECT id FROM favorites WHERE user_id = ? AND restaurant_id = ?')
    .get(userId, restaurantId) as { id: number } | undefined

  if (existing) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id)
    return false
  }

  const now = new Date().toISOString()
  db.prepare(
    'INSERT INTO favorites (user_id, restaurant_id, created_at) VALUES (?, ?, ?)'
  ).run(userId, restaurantId, now)
  return true
}

/** 사용자가 찜한 음식점 목록을 최신 찜순(favorites.id DESC)으로 조회한다. */
export function listFavoritesByUser(userId: string): Restaurant[] {
  const db = getDb()

  const rows = db
    .prepare(
      `SELECT r.*
       FROM favorites f
       JOIN restaurants r ON r.id = f.restaurant_id
       WHERE f.user_id = ?
       ORDER BY f.id DESC`
    )
    .all(userId) as RestaurantRow[]

  return rows.map(mapRestaurant)
}

/** 특정 음식점의 찜 여부. */
export function isFavorited(userId: string, restaurantId: number): boolean {
  const db = getDb()

  const row = db
    .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND restaurant_id = ?')
    .get(userId, restaurantId)

  return row !== undefined
}

/**
 * 여러 음식점의 찜 여부를 한 번에 조회한다(목록 페이지 N+1 방지).
 * @returns 찜한 restaurant_id의 Set. 빈 입력이면 빈 Set.
 */
export function getFavoritedRestaurantIds(
  userId: string,
  restaurantIds: number[]
): Set<number> {
  if (restaurantIds.length === 0) return new Set()

  const db = getDb()
  const placeholders = restaurantIds.map(() => '?').join(', ')
  const rows = db
    .prepare(
      `SELECT restaurant_id FROM favorites
       WHERE user_id = ? AND restaurant_id IN (${placeholders})`
    )
    .all(userId, ...restaurantIds) as Array<{ restaurant_id: number }>

  return new Set(rows.map((r) => r.restaurant_id))
}
