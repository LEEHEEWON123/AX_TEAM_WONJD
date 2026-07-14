import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'

let db: Database.Database | null = null

const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`

// issue #2: restaurants / menu_items 스키마.
// id는 users(TEXT UUID)와 달리 INTEGER AUTOINCREMENT — URL 경로(/restaurants/1)에 자연스럽고 seed 참조가 단순(의도된 선택).
const CREATE_RESTAURANTS_TABLE = `
  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    rating REAL NOT NULL DEFAULT 0,
    eta_min INTEGER NOT NULL,
    eta_max INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )
`

const CREATE_MENU_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )
`

const CREATE_MENU_ITEMS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id)
`

// issue #3: 장바구니 & 주문.
// id 스킴: cart_items/orders/order_items PK는 restaurants·menu_items와 동일한 INTEGER AUTOINCREMENT.
// 단 user_id는 users의 TEXT UUID (issue #2에서 확립된 의도적 불일치).
const CREATE_CART_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, menu_item_id)
  )
`

const CREATE_CART_ITEMS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id)
`

const CREATE_ORDERS_TABLE = `
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    total_price INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  )
`

const CREATE_ORDERS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)
`

// 가격/이름 스냅샷 — 이후 메뉴 변경과 무관하게 주문 내역 보존.
const CREATE_ORDER_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )
`

const CREATE_ORDER_ITEMS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)
`

interface SeedRestaurant {
  name: string
  category: string
  description: string
  rating: number
  etaMin: number
  etaMax: number
  menu: Array<{ name: string; description?: string; price: number }>
}

// 브라우징 UI가 빈 화면이 되지 않게 하는 임시 데이터. 실데이터 유입 후 제거/유지 판단은 issue #4에서.
const SEED_RESTAURANTS: SeedRestaurant[] = [
  {
    name: '성수족발 본점',
    category: '한식',
    description: '쫄깃한 국내산 족발과 시원한 막국수',
    rating: 4.8,
    etaMin: 35,
    etaMax: 45,
    menu: [
      { name: '족발(中)', description: '2~3인분', price: 32000 },
      { name: '막국수', description: '새콤달콤 비빔막국수', price: 9000 },
      { name: '보쌈세트', description: '보쌈 + 김치', price: 38000 },
    ],
  },
  {
    name: '청년치킨 강남점',
    category: '치킨',
    description: '갓 튀긴 바삭한 치킨 전문점',
    rating: 4.6,
    etaMin: 25,
    etaMax: 35,
    menu: [
      { name: '후라이드', description: '겉바속촉 기본 후라이드', price: 18000 },
      { name: '양념치킨', description: '매콤달콤 양념', price: 19000 },
      { name: '콤보', description: '후라이드 + 양념 반반', price: 21000 },
    ],
  },
  {
    name: '황금분식',
    category: '분식',
    description: '추억의 길거리 분식',
    rating: 4.9,
    etaMin: 20,
    etaMax: 30,
    menu: [
      { name: '떡볶이', description: '국물 떡볶이', price: 4500 },
      { name: '순대', description: '찹쌀 순대', price: 4000 },
      { name: '튀김세트', description: '모둠 튀김', price: 5000 },
    ],
  },
  {
    name: '멘야도쿄 라멘',
    category: '일식',
    description: '진한 육수의 정통 일본 라멘',
    rating: 4.7,
    etaMin: 30,
    etaMax: 40,
    menu: [
      { name: '돈코츠라멘', description: '진한 돈코츠 국물', price: 11000 },
      { name: '차슈덮밥', description: '불향 가득 차슈', price: 9500 },
    ],
  },
  {
    name: '홍콩반점 성수',
    category: '중식',
    description: '불맛 가득한 중화요리',
    rating: 4.5,
    etaMin: 30,
    etaMax: 40,
    menu: [
      { name: '짜장면', description: '춘장의 정석', price: 7000 },
      { name: '짬뽕', description: '얼큰한 해물 짬뽕', price: 8000 },
      { name: '탕수육', description: '바삭한 찹쌀 탕수육', price: 16000 },
    ],
  },
]

/** restaurants가 비어 있을 때만 seed를 삽입한다(멱등 가드). 재호출 시 중복 삽입 없음. */
function seedRestaurants(database: Database.Database): void {
  const { c } = database.prepare('SELECT COUNT(*) as c FROM restaurants').get() as {
    c: number
  }
  if (c > 0) return

  const now = new Date().toISOString()
  const insertRestaurant = database.prepare(
    'INSERT INTO restaurants (name, category, description, rating, eta_min, eta_max, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const insertMenuItem = database.prepare(
    'INSERT INTO menu_items (restaurant_id, name, description, price, created_at) VALUES (?, ?, ?, ?, ?)'
  )

  const seedAll = database.transaction((restaurants: SeedRestaurant[]) => {
    for (const r of restaurants) {
      const result = insertRestaurant.run(
        r.name,
        r.category,
        r.description,
        r.rating,
        r.etaMin,
        r.etaMax,
        now
      )
      const restaurantId = Number(result.lastInsertRowid)
      for (const item of r.menu) {
        insertMenuItem.run(restaurantId, item.name, item.description ?? '', item.price, now)
      }
    }
  })

  seedAll(SEED_RESTAURANTS)
}

/**
 * better-sqlite3 싱글턴 커넥션.
 * 커넥션 경로는 process.env.DB_PATH로 결정한다 (테스트는 ':memory:' 주입).
 * 최초 호출 시 상위 디렉토리(파일 기반 DB인 경우)와 users 테이블을 생성한다.
 */
export function getDb(): Database.Database {
  if (db) return db

  const dbPath = process.env.DB_PATH ?? 'data/app.db'
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true })
  }
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(CREATE_USERS_TABLE)
  db.exec(CREATE_RESTAURANTS_TABLE)
  db.exec(CREATE_MENU_ITEMS_TABLE)
  db.exec(CREATE_MENU_ITEMS_INDEX)
  db.exec(CREATE_CART_ITEMS_TABLE)
  db.exec(CREATE_CART_ITEMS_INDEX)
  db.exec(CREATE_ORDERS_TABLE)
  db.exec(CREATE_ORDERS_INDEX)
  db.exec(CREATE_ORDER_ITEMS_TABLE)
  db.exec(CREATE_ORDER_ITEMS_INDEX)
  seedRestaurants(db)

  return db
}
