import { getDb } from '@/lib/db/client'
import type { AddToCartResult, Cart, CartItem } from '@/types/cart'

// cart_items(snake_case) + menu_items 조인 결과 row. restaurant-service의 명시 매핑 패턴 준용.
interface CartItemJoinRow {
  id: number
  menu_item_id: number
  restaurant_id: number
  name: string
  price: number
  quantity: number
}

/** join row(snake_case) → CartItem(camelCase) 명시 매핑. lineTotal은 파생 계산. */
function mapCartItem(row: CartItemJoinRow): CartItem {
  return {
    id: row.id,
    menuItemId: row.menu_item_id,
    restaurantId: row.restaurant_id,
    name: row.name,
    price: row.price,
    quantity: row.quantity,
    lineTotal: row.price * row.quantity,
  }
}

/**
 * 사용자 장바구니를 조회한다.
 * cart_items를 menu_items에 조인해 현재 이름·단가를 표시하고, lineTotal·totalPrice를 파생한다.
 * 비어 있으면 restaurantId/name은 null.
 */
export function getCart(userId: string): Cart {
  const db = getDb()

  const rows = db
    .prepare(
      `SELECT c.id, c.menu_item_id, c.restaurant_id, m.name, m.price, c.quantity
       FROM cart_items c
       JOIN menu_items m ON m.id = c.menu_item_id
       WHERE c.user_id = ?
       ORDER BY c.id ASC`
    )
    .all(userId) as CartItemJoinRow[]

  const items = rows.map(mapCartItem)
  const totalPrice = items.reduce((sum, item) => sum + item.lineTotal, 0)

  const first = items[0]
  let restaurantId: number | null = null
  let restaurantName: string | null = null
  if (first) {
    restaurantId = first.restaurantId
    const rest = db.prepare('SELECT name FROM restaurants WHERE id = ?').get(restaurantId) as
      | { name: string }
      | undefined
    restaurantName = rest?.name ?? null
  }

  return { restaurantId, restaurantName, items, totalPrice }
}

/**
 * 메뉴를 장바구니에 담는다(UPSERT: 동일 메뉴 재담기 시 quantity +1).
 * 장바구니에 다른 음식점 메뉴가 이미 있으면(단일 음식점 제약) 담지 않고 different_restaurant를 반환한다.
 * force=true면 기존 장바구니를 비우고 새 메뉴로 교체한다.
 */
export function addToCart(userId: string, menuItemId: number, force = false): AddToCartResult {
  const db = getDb()

  const menu = db
    .prepare('SELECT id, restaurant_id FROM menu_items WHERE id = ?')
    .get(menuItemId) as { id: number; restaurant_id: number } | undefined
  if (!menu) {
    throw new Error('MENU_ITEM_NOT_FOUND')
  }

  const existingRestaurant = db
    .prepare('SELECT restaurant_id FROM cart_items WHERE user_id = ? LIMIT 1')
    .get(userId) as { restaurant_id: number } | undefined

  if (existingRestaurant && existingRestaurant.restaurant_id !== menu.restaurant_id) {
    if (!force) {
      const rest = db
        .prepare('SELECT name FROM restaurants WHERE id = ?')
        .get(existingRestaurant.restaurant_id) as { name: string } | undefined
      return {
        status: 'different_restaurant',
        currentRestaurantName: rest?.name ?? '',
      }
    }
    // force: 기존 음식점 장바구니 비우고 교체.
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId)
  }

  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO cart_items (user_id, menu_item_id, restaurant_id, quantity, created_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(user_id, menu_item_id) DO UPDATE SET quantity = quantity + 1`
  ).run(userId, menuItemId, menu.restaurant_id, now)

  return { status: 'added' }
}

/** 장바구니 항목 수량을 설정한다. quantity <= 0 이면 항목 삭제(clamp 아님). 소유자 스코프. */
export function updateCartItemQuantity(
  userId: string,
  cartItemId: number,
  quantity: number
): void {
  const db = getDb()

  if (quantity <= 0) {
    removeCartItem(userId, cartItemId)
    return
  }

  db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?').run(
    quantity,
    cartItemId,
    userId
  )
}

/** 장바구니 항목을 삭제한다. 소유자 스코프. */
export function removeCartItem(userId: string, cartItemId: number): void {
  const db = getDb()
  db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(cartItemId, userId)
}

/** 사용자 장바구니를 비운다. 소유자 스코프. */
export function clearCart(userId: string): void {
  const db = getDb()
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId)
}
