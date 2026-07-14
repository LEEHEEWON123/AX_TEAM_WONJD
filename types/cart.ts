// 장바구니 라인(= cart_items row + menu_items 조인으로 얻은 표시 정보).
export interface CartItem {
  id: number // cart_items PK
  menuItemId: number
  restaurantId: number
  name: string // 현재 menu_items.name (조인)
  price: number // 현재 menu_items.price (조인, 원 KRW 정수)
  quantity: number // 1 이상
  lineTotal: number // price * quantity (파생, 서비스에서 계산)
}

// 단일 음식점 장바구니 스냅샷. 비어 있으면 restaurantId/name은 null.
export interface Cart {
  restaurantId: number | null
  restaurantName: string | null
  items: CartItem[]
  totalPrice: number
}

/**
 * addToCart 결과.
 * - added: 정상 담김(신규 또는 수량 +1).
 * - different_restaurant: 장바구니에 다른 음식점 메뉴가 있어 담기 보류. UI가 확인 후 force로 재호출.
 */
export type AddToCartResult =
  | { status: 'added' }
  | { status: 'different_restaurant'; currentRestaurantName: string }
