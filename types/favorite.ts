// issue #7: 찜(즐겨찾기). favorites 테이블 row에 대응하는 엔티티.
// user_id는 users(TEXT UUID), restaurant_id는 restaurants(INTEGER) 참조 —
// 기존 cart_items/orders에서 확립된 의도적 id 스킴 불일치를 그대로 따른다.
export interface Favorite {
  id: number
  userId: string
  restaurantId: number
  createdAt: string // ISO
}
