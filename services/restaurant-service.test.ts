import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import type { RestaurantListQuery } from '@/types/restaurant'

// 계약: services/restaurant-service.ts는 '@/lib/db/client'의 getDb()를 통해서만 DB에 접근해야 한다.
// 이 테스트는 getDb()를 모킹해 격리된 in-memory DB를 주입한다 (services/auth-service.test.ts 패턴 준용).
let testDb: InstanceType<typeof Database>

vi.mock('@/lib/db/client', () => ({
  getDb: () => testDb,
}))

import { listRestaurants, getRestaurantWithMenu } from '@/services/restaurant-service'

function createTestDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      rating REAL NOT NULL DEFAULT 0,
      eta_min INTEGER NOT NULL,
      eta_max INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
  `)
  return db
}

interface SeedRestaurantInput {
  name: string
  category: string
  description?: string
  rating?: number
  etaMin: number
  etaMax: number
  menu?: Array<{ name: string; description?: string; price: number }>
}

/** 테스트 픽스처 삽입 헬퍼. row(snake_case) 직접 INSERT로 서비스 계층과 분리해 격리한다. */
function seedRestaurant(db: InstanceType<typeof Database>, input: SeedRestaurantInput): number {
  const now = new Date().toISOString()
  const result = db
    .prepare(
      'INSERT INTO restaurants (name, category, description, rating, eta_min, eta_max, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      input.name,
      input.category,
      input.description ?? '',
      input.rating ?? 4.5,
      input.etaMin,
      input.etaMax,
      now
    )
  const restaurantId = Number(result.lastInsertRowid)

  for (const item of input.menu ?? []) {
    db.prepare(
      'INSERT INTO menu_items (restaurant_id, name, description, price, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(restaurantId, item.name, item.description ?? '', item.price, now)
  }

  return restaurantId
}

describe('listRestaurants', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedRestaurant(testDb, {
      name: '성수족발 본점',
      category: '한식',
      rating: 4.8,
      etaMin: 35,
      etaMax: 45,
      menu: [
        { name: '족발(中)', price: 32000 },
        { name: '막국수', price: 9000 },
      ],
    })
    seedRestaurant(testDb, {
      name: '청년치킨 강남점',
      category: '치킨',
      rating: 4.6,
      etaMin: 25,
      etaMax: 35,
      menu: [{ name: '후라이드', price: 18000 }],
    })
    seedRestaurant(testDb, {
      name: '황금분식',
      category: '분식',
      rating: 4.9,
      etaMin: 20,
      etaMax: 30,
      menu: [{ name: '떡볶이', price: 4500 }],
    })
  })

  it('필터 조건이 없으면 모든 음식점을 반환한다', () => {
    const result = listRestaurants({})
    expect(result).toHaveLength(3)
  })

  it("category가 '전체'이면 모든 음식점을 반환한다", () => {
    const query: RestaurantListQuery = { category: '전체' }
    const result = listRestaurants(query)
    expect(result).toHaveLength(3)
  })

  it("category를 지정하면 해당 카테고리 음식점만 반환한다", () => {
    const query: RestaurantListQuery = { category: '한식' }
    const result = listRestaurants(query)
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('성수족발 본점')
    expect(result[0]!.category).toBe('한식')
  })

  it('음식점 이름에 검색어가 포함되면 결과에 포함된다', () => {
    const result = listRestaurants({ q: '황금' })
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('황금분식')
  })

  it('음식점 이름은 일치하지 않아도 메뉴명에 검색어가 포함되면 결과에 포함된다', () => {
    const result = listRestaurants({ q: '막국수' })
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('성수족발 본점')
  })

  it('category와 q를 함께 지정하면 두 조건을 모두 만족하는 음식점만 반환한다', () => {
    const result = listRestaurants({ category: '한식', q: '족발' })
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('성수족발 본점')
  })

  it('검색어와 일치하는 음식점/메뉴가 없으면 빈 배열을 반환한다', () => {
    const result = listRestaurants({ q: '존재하지않는메뉴이름' })
    expect(result).toEqual([])
  })

  it('반환된 Restaurant는 camelCase 필드(etaMin/etaMax/createdAt)로 매핑되어 있다', () => {
    const result = listRestaurants({ category: '치킨' })
    expect(result[0]!).toMatchObject({
      name: '청년치킨 강남점',
      etaMin: 25,
      etaMax: 35,
    })
    expect(result[0]!.createdAt).toBeDefined()
  })
})

describe('getRestaurantWithMenu', () => {
  beforeEach(() => {
    testDb = createTestDb()
  })

  it('존재하는 id를 조회하면 음식점 정보와 메뉴 목록을 반환한다', () => {
    const id = seedRestaurant(testDb, {
      name: '멘야도쿄 라멘',
      category: '일식',
      rating: 4.7,
      etaMin: 30,
      etaMax: 40,
      menu: [
        { name: '돈코츠라멘', price: 11000 },
        { name: '차슈덮밥', price: 9500 },
      ],
    })

    const result = getRestaurantWithMenu(id)

    expect(result).not.toBeNull()
    expect(result?.name).toBe('멘야도쿄 라멘')
    expect(result?.etaMin).toBe(30)
    expect(result?.etaMax).toBe(40)
    expect(result?.menu).toHaveLength(2)
    expect(result?.menu[0]).toMatchObject({
      restaurantId: id,
      name: '돈코츠라멘',
      price: 11000,
    })
  })

  it('존재하지 않는 id를 조회하면 null을 반환한다', () => {
    const result = getRestaurantWithMenu(999999)
    expect(result).toBeNull()
  })

  it('메뉴가 없는 음식점을 조회하면 menu가 빈 배열이다', () => {
    const id = seedRestaurant(testDb, {
      name: '오픈예정 식당',
      category: '한식',
      etaMin: 10,
      etaMax: 20,
      menu: [],
    })

    const result = getRestaurantWithMenu(id)

    expect(result).not.toBeNull()
    expect(result?.menu).toEqual([])
  })
})
