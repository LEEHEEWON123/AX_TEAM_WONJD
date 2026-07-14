// 닫힌 셋(union) — 별도 테이블 없이 상수 배열로. types/user.ts의 AuthResult union 선례를 따른다.
export const FOOD_CATEGORIES = ['한식', '치킨', '분식', '일식', '중식'] as const
export type FoodCategory = (typeof FOOD_CATEGORIES)[number]

// 필터 UI용(전체 포함). '전체'는 저장값이 아니라 "필터 없음"을 의미.
export type CategoryFilter = FoodCategory | '전체'

export interface Restaurant {
  id: number
  name: string
  category: FoodCategory
  description: string
  rating: number // 0.0~5.0, 저장된 집계값
  etaMin: number // 예상 소요시간(분) 하한
  etaMax: number // 예상 소요시간(분) 상한
  createdAt: string // ISO
}

export interface MenuItem {
  id: number
  restaurantId: number
  name: string
  description: string
  price: number // 원(KRW) 정수, 소수 없음
  createdAt: string
}

export interface RestaurantWithMenu extends Restaurant {
  menu: MenuItem[]
}

export interface RestaurantListQuery {
  category?: CategoryFilter
  q?: string
}
