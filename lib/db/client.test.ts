import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

// 계약: lib/db/client.ts는 process.env.DB_PATH를 읽어 커넥션 경로를 결정해야 한다.
// 테스트는 DB_PATH=':memory:'로 설정해 파일 시스템에 영향을 주지 않는다.
const ORIGINAL_DB_PATH = process.env.DB_PATH

describe('getDb', () => {
  beforeEach(() => {
    process.env.DB_PATH = ':memory:'
    vi.resetModules()
  })

  afterEach(() => {
    process.env.DB_PATH = ORIGINAL_DB_PATH
  })

  it('호출할 때마다 동일한 커넥션 인스턴스를 반환한다 (싱글턴)', async () => {
    const { getDb } = await import('@/lib/db/client')
    const db1 = getDb()
    const db2 = getDb()
    expect(db1).toBe(db2)
  })

  it('최초 호출 시 users 테이블을 생성한다', async () => {
    const { getDb } = await import('@/lib/db/client')
    const db = getDb()
    const tableInfo = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
      .get()
    expect(tableInfo).toBeDefined()
  })

  it('users 테이블은 id, email, password_hash, nickname, created_at 컬럼을 가진다', async () => {
    const { getDb } = await import('@/lib/db/client')
    const db = getDb()
    const columns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>
    const columnNames = columns.map((c) => c.name)
    expect(columnNames).toEqual(
      expect.arrayContaining(['id', 'email', 'password_hash', 'nickname', 'created_at'])
    )
  })

  it('email 컬럼에 UNIQUE 제약이 걸려 있어 중복 삽입 시 예외가 발생한다', async () => {
    const { getDb } = await import('@/lib/db/client')
    const db = getDb()
    const insert = db.prepare(
      'INSERT INTO users (id, email, password_hash, nickname, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    insert.run('id-1', 'dup@example.com', 'hash', '닉네임1', new Date().toISOString())
    expect(() =>
      insert.run('id-2', 'dup@example.com', 'hash2', '닉네임2', new Date().toISOString())
    ).toThrow()
  })

  // ─── issue #2: restaurants / menu_items 스키마 ──────────────────────
  it('최초 호출 시 restaurants 테이블을 생성한다', async () => {
    const { getDb } = await import('@/lib/db/client')
    const db = getDb()
    const tableInfo = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='restaurants'")
      .get()
    expect(tableInfo).toBeDefined()
  })

  it('최초 호출 시 menu_items 테이블을 생성한다', async () => {
    const { getDb } = await import('@/lib/db/client')
    const db = getDb()
    const tableInfo = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='menu_items'")
      .get()
    expect(tableInfo).toBeDefined()
  })

  it('restaurants 테이블은 id, name, category, description, rating, eta_min, eta_max, created_at 컬럼을 가진다', async () => {
    const { getDb } = await import('@/lib/db/client')
    const db = getDb()
    const columns = db.prepare('PRAGMA table_info(restaurants)').all() as Array<{ name: string }>
    const columnNames = columns.map((c) => c.name)
    expect(columnNames).toEqual(
      expect.arrayContaining([
        'id',
        'name',
        'category',
        'description',
        'rating',
        'eta_min',
        'eta_max',
        'created_at',
      ])
    )
  })

  it('menu_items 테이블은 id, restaurant_id, name, description, price, created_at 컬럼을 가진다', async () => {
    const { getDb } = await import('@/lib/db/client')
    const db = getDb()
    const columns = db.prepare('PRAGMA table_info(menu_items)').all() as Array<{ name: string }>
    const columnNames = columns.map((c) => c.name)
    expect(columnNames).toEqual(
      expect.arrayContaining(['id', 'restaurant_id', 'name', 'description', 'price', 'created_at'])
    )
  })

  it('최초 호출 시 restaurants에 시드 데이터가 1건 이상 삽입되어 있다 (빈 화면 방지)', async () => {
    const { getDb } = await import('@/lib/db/client')
    const db = getDb()
    const { c } = db.prepare('SELECT COUNT(*) as c FROM restaurants').get() as { c: number }
    expect(c).toBeGreaterThan(0)
  })

  it('시드된 음식점의 category는 FOOD_CATEGORIES 닫힌 셋 안의 값이다', async () => {
    const { getDb } = await import('@/lib/db/client')
    const { FOOD_CATEGORIES } = await import('@/types/restaurant')
    const db = getDb()
    const rows = db.prepare('SELECT category FROM restaurants').all() as Array<{
      category: string
    }>
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(FOOD_CATEGORIES).toContain(row.category)
    }
  })

  it('시드된 음식점에 연결된 menu_items가 1건 이상 존재한다 (join 가능)', async () => {
    const { getDb } = await import('@/lib/db/client')
    const db = getDb()
    const { c } = db.prepare('SELECT COUNT(*) as c FROM menu_items').get() as { c: number }
    expect(c).toBeGreaterThan(0)
  })
})

describe('getDb — restaurants 시드 멱등성 (마이그레이션 재실행)', () => {
  let tmpDbPath: string

  beforeEach(() => {
    tmpDbPath = join(tmpdir(), `test-restaurants-${randomUUID()}.db`)
    process.env.DB_PATH = tmpDbPath
    vi.resetModules()
  })

  afterEach(() => {
    process.env.DB_PATH = ORIGINAL_DB_PATH
    for (const suffix of ['', '-shm', '-wal']) {
      const p = `${tmpDbPath}${suffix}`
      if (existsSync(p)) rmSync(p)
    }
  })

  it('동일한 DB 파일을 재오픈해 마이그레이션을 다시 실행해도 restaurants 시드 행 수가 늘어나지 않는다', async () => {
    const { getDb: getDbFirst } = await import('@/lib/db/client')
    const dbFirst = getDbFirst()
    const { c: countAfterFirst } = dbFirst
      .prepare('SELECT COUNT(*) as c FROM restaurants')
      .get() as { c: number }
    expect(countAfterFirst).toBeGreaterThan(0)

    // 서버 재시작을 흉내: 모듈을 리셋해 싱글턴을 초기화하고 같은 파일 경로로 다시 연다.
    vi.resetModules()
    const { getDb: getDbSecond } = await import('@/lib/db/client')
    const dbSecond = getDbSecond()
    const { c: countAfterSecond } = dbSecond
      .prepare('SELECT COUNT(*) as c FROM restaurants')
      .get() as { c: number }

    expect(countAfterSecond).toBe(countAfterFirst)
  })
})
