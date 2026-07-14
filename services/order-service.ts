import { getDb } from '@/lib/db/client'
import { getCart } from '@/services/cart-service'
import type { Order, OrderItem, OrderWithItems } from '@/types/order'

// orders(snake_case) row. restaurant_name은 restaurants 조인으로 얻는다.
interface OrderRow {
  id: number
  user_id: string
  restaurant_id: number
  restaurant_name: string
  total_price: number
  status: string
  created_at: string
}

interface OrderItemRow {
  id: number
  order_id: number
  menu_item_id: number
  name: string
  price: number
  quantity: number
}

/** orders row(snake_case) → Order(camelCase) 명시 매핑. */
function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name,
    totalPrice: row.total_price,
    status: 'pending',
    createdAt: row.created_at,
  }
}

/** order_items row(snake_case) → OrderItem(camelCase). lineTotal은 파생. */
function mapOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    menuItemId: row.menu_item_id,
    name: row.name,
    price: row.price,
    quantity: row.quantity,
    lineTotal: row.price * row.quantity,
  }
}

/**
 * 현재 장바구니로 주문을 생성한다.
 * 장바구니 조회 → 검증(빈/단일 음식점) → orders + order_items 스냅샷 삽입 → 장바구니 비움을 단일 트랜잭션으로 수행.
 * 빈 장바구니면 Error('EMPTY_CART') throw. 조인 실패로 restaurant_id가 없으면 방어적으로 throw.
 */
export function createOrder(userId: string): Order {
  const db = getDb()
  const cart = getCart(userId)

  if (cart.items.length === 0 || cart.restaurantId === null) {
    throw new Error('EMPTY_CART')
  }

  const restaurantId = cart.restaurantId
  const totalPrice = cart.totalPrice
  const now = new Date().toISOString()

  const insertOrder = db.prepare(
    `INSERT INTO orders (user_id, restaurant_id, total_price, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`
  )
  const insertOrderItem = db.prepare(
    `INSERT INTO order_items (order_id, menu_item_id, name, price, quantity, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  const deleteCart = db.prepare('DELETE FROM cart_items WHERE user_id = ?')

  const runTransaction = db.transaction((): number => {
    const result = insertOrder.run(userId, restaurantId, totalPrice, now)
    const orderId = Number(result.lastInsertRowid)
    for (const item of cart.items) {
      insertOrderItem.run(orderId, item.menuItemId, item.name, item.price, item.quantity, now)
    }
    deleteCart.run(userId)
    return orderId
  })

  const orderId = runTransaction()

  return {
    id: orderId,
    userId,
    restaurantId,
    restaurantName: cart.restaurantName ?? '',
    totalPrice,
    status: 'pending',
    createdAt: now,
  }
}

/** 주문을 항목과 함께 조회한다. 소유자(userId) 불일치·미존재 시 null(존재 노출 방지). */
export function getOrder(userId: string, orderId: number): OrderWithItems | null {
  const db = getDb()

  const row = db
    .prepare(
      `SELECT o.id, o.user_id, o.restaurant_id, r.name AS restaurant_name,
              o.total_price, o.status, o.created_at
       FROM orders o
       JOIN restaurants r ON r.id = o.restaurant_id
       WHERE o.id = ? AND o.user_id = ?`
    )
    .get(orderId, userId) as OrderRow | undefined
  if (!row) return null

  const itemRows = db
    .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC')
    .all(orderId) as OrderItemRow[]

  return {
    ...mapOrder(row),
    items: itemRows.map(mapOrderItem),
  }
}

/** 사용자의 주문 목록을 최신순으로 조회한다(선택 기능). */
export function listOrders(userId: string): Order[] {
  const db = getDb()

  const rows = db
    .prepare(
      `SELECT o.id, o.user_id, o.restaurant_id, r.name AS restaurant_name,
              o.total_price, o.status, o.created_at
       FROM orders o
       JOIN restaurants r ON r.id = o.restaurant_id
       WHERE o.user_id = ?
       ORDER BY o.id DESC`
    )
    .all(userId) as OrderRow[]

  return rows.map(mapOrder)
}
