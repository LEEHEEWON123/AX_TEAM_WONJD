import { getDb } from '@/lib/db/client'
import type {
  FoodCategory,
  MenuItem,
  Restaurant,
  RestaurantListQuery,
  RestaurantWithMenu,
} from '@/types/restaurant'

// DB row(snake_case). auth-service의 UserRow 패턴 준용.
interface RestaurantRow {
  id: number
  name: string
  category: string
  description: string
  rating: number
  eta_min: number
  eta_max: number
  created_at: string
}

interface MenuItemRow {
  id: number
  restaurant_id: number
  name: string
  description: string
  price: number
  created_at: string
}

/** row(snake_case) → Restaurant(camelCase) 명시 매핑. 매핑 누락 시 undefined 필드 위험. */
function mapRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    category: row.category as FoodCategory,
    description: row.description,
    rating: row.rating,
    etaMin: row.eta_min,
    etaMax: row.eta_max,
    createdAt: row.created_at,
  }
}

function mapMenuItem(row: MenuItemRow): MenuItem {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description,
    price: row.price,
    createdAt: row.created_at,
  }
}

/**
 * 음식점 목록을 조회한다.
 * - category: '전체' 또는 미지정이면 필터 없음, 그 외는 해당 카테고리만.
 * - q: 음식점명 OR 메뉴명에 부분 일치하는 음식점만.
 */
export function listRestaurants(query: RestaurantListQuery = {}): Restaurant[] {
  const db = getDb()

  const conditions: string[] = []
  const params: Array<string | number> = []

  if (query.category && query.category !== '전체') {
    conditions.push('r.category = ?')
    params.push(query.category)
  }

  const q = query.q?.trim()
  if (q) {
    const like = `%${q}%`
    conditions.push(
      '(r.name LIKE ? OR EXISTS (SELECT 1 FROM menu_items m WHERE m.restaurant_id = r.id AND m.name LIKE ?))'
    )
    params.push(like, like)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db
    .prepare(`SELECT r.* FROM restaurants r ${where} ORDER BY r.id ASC`)
    .all(...params) as RestaurantRow[]

  return rows.map(mapRestaurant)
}

/** 단일 음식점을 메뉴와 함께 조회한다. 미존재 시 null. */
export function getRestaurantWithMenu(id: number): RestaurantWithMenu | null {
  const db = getDb()

  const row = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(id) as
    | RestaurantRow
    | undefined
  if (!row) return null

  const menuRows = db
    .prepare('SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY id ASC')
    .all(id) as MenuItemRow[]

  return {
    ...mapRestaurant(row),
    menu: menuRows.map(mapMenuItem),
  }
}
