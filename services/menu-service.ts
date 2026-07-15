import { getDb } from '@/lib/db/client'
import type { MenuItem, MenuItemInput } from '@/types/restaurant'

/** 사장님 소유 음식점 id를 조회한다. 소유 음식점이 없으면 null. */
function findOwnedRestaurantId(ownerId: string): number | null {
  const db = getDb()
  const row = db.prepare('SELECT id FROM restaurants WHERE owner_id = ?').get(ownerId) as
    | { id: number }
    | undefined
  return row ? row.id : null
}

/**
 * 사장님 소유 음식점에 메뉴를 등록한다.
 * 소유 음식점이 없으면 Error('NO_RESTAURANT') throw.
 */
export function createMenuItem(ownerId: string, input: MenuItemInput): MenuItem {
  const db = getDb()

  const restaurantId = findOwnedRestaurantId(ownerId)
  if (restaurantId === null) {
    throw new Error('NO_RESTAURANT')
  }

  const now = new Date().toISOString()
  const result = db
    .prepare(
      'INSERT INTO menu_items (restaurant_id, name, description, price, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(restaurantId, input.name, input.description, input.price, now)

  return {
    id: Number(result.lastInsertRowid),
    restaurantId,
    name: input.name,
    description: input.description,
    price: input.price,
    createdAt: now,
  }
}

/**
 * 메뉴를 수정한다. 소유권 스코프: ownerId 소유 음식점의 메뉴가 아니면 no-op.
 */
export function updateMenuItem(
  ownerId: string,
  menuItemId: number,
  input: MenuItemInput
): void {
  const db = getDb()

  db.prepare(
    `UPDATE menu_items
     SET name = ?, description = ?, price = ?
     WHERE id = ?
       AND restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = ?)`
  ).run(input.name, input.description, input.price, menuItemId, ownerId)
}

/**
 * 메뉴를 하드 삭제한다. 소유권 스코프 밖이면 no-op.
 * 참조 무결성: 삭제 메뉴를 가리키는 cart_items를 함께 정리(고아 행 방지).
 * order_items는 name/price 스냅샷이라 조인하지 않으므로 주문 내역은 보존된다.
 */
export function deleteMenuItem(ownerId: string, menuItemId: number): void {
  const db = getDb()

  const remove = db.transaction(() => {
    const owned = db
      .prepare(
        `SELECT id FROM menu_items
         WHERE id = ?
           AND restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = ?)`
      )
      .get(menuItemId, ownerId)
    if (!owned) return

    db.prepare('DELETE FROM cart_items WHERE menu_item_id = ?').run(menuItemId)
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(menuItemId)
  })

  remove()
}
