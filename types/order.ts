// MVP는 생성 시 'pending' 단일 상태. 상태 전이(조리/배달/완료)는 이번 이슈 범위 밖([확인 필요] #3).
export const ORDER_STATUSES = ['pending'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export interface OrderItem {
  id: number
  orderId: number
  menuItemId: number
  name: string // 주문 시점 스냅샷
  price: number // 주문 시점 단가 스냅샷(KRW 정수)
  quantity: number
  lineTotal: number // price * quantity (파생)
}

export interface Order {
  id: number
  userId: string // users.id (TEXT UUID) 참조 — id 스킴 불일치 주의
  restaurantId: number
  restaurantName: string // 조인으로 표시
  totalPrice: number
  status: OrderStatus
  createdAt: string // ISO
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
}
