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

  return db
}
