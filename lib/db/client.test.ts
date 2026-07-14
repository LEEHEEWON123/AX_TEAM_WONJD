import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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
})
