// 주문 상태 셋. 전이 규칙: pending → cooking → completed (단방향).
// 라벨: pending=접수, cooking=조리중, completed=완료. (cancelled는 이번 범위 밖.)
export const ORDER_STATUSES = ['pending', 'cooking', 'completed'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

// 사장님 UI 표시용 상태 라벨.
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '접수',
  cooking: '조리중',
  completed: '완료',
}

// 단방향 전이 다음 단계. completed는 종착(다음 없음).
export const ORDER_STATUS_NEXT: Record<OrderStatus, OrderStatus | null> = {
  pending: 'cooking',
  cooking: 'completed',
  completed: null,
}

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
