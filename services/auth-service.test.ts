import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import type { SignupInput } from '@/types/user'

// 계약: services/auth-service.ts는 '@/lib/db/client'의 getDb()를 통해서만 DB에 접근해야 한다.
// 이 테스트는 getDb()를 모킹해 격리된 in-memory DB를 주입한다.
let testDb: InstanceType<typeof Database>

vi.mock('@/lib/db/client', () => ({
  getDb: () => testDb,
}))

import { createUser, authenticateUser } from '@/services/auth-service'

function createTestDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)
  return db
}

const SIGNUP_INPUT: SignupInput = {
  email: 'user@example.com',
  password: 'Password1!',
  passwordConfirm: 'Password1!',
  nickname: '닉네임',
}

describe('createUser', () => {
  beforeEach(() => {
    testDb = createTestDb()
  })

  it('사용자를 생성하고 세션 구성에 필요한 공개 정보를 반환한다', async () => {
    const user = await createUser(SIGNUP_INPUT)
    expect(user.email).toBe(SIGNUP_INPUT.email)
    expect(user.nickname).toBe(SIGNUP_INPUT.nickname)
    expect(user.id).toBeDefined()
  })

  it('비밀번호를 평문이 아닌 해시로 저장한다', async () => {
    await createUser(SIGNUP_INPUT)
    const row = testDb
      .prepare('SELECT password_hash FROM users WHERE email = ?')
      .get(SIGNUP_INPUT.email) as { password_hash: string }

    expect(row.password_hash).toBeDefined()
    expect(row.password_hash).not.toBe(SIGNUP_INPUT.password)
  })

  it('이미 가입된 이메일로 재가입을 시도하면 에러를 throw한다', async () => {
    await createUser(SIGNUP_INPUT)
    await expect(createUser(SIGNUP_INPUT)).rejects.toThrow()
  })
})

describe('authenticateUser', () => {
  beforeEach(async () => {
    testDb = createTestDb()
    await createUser(SIGNUP_INPUT)
  })

  it('올바른 이메일/비밀번호로 인증에 성공하면 사용자 정보를 반환한다', async () => {
    const user = await authenticateUser({
      email: SIGNUP_INPUT.email,
      password: SIGNUP_INPUT.password,
    })
    expect(user.email).toBe(SIGNUP_INPUT.email)
  })

  it('존재하지 않는 이메일이면 에러를 throw한다', async () => {
    await expect(
      authenticateUser({ email: 'nobody@example.com', password: SIGNUP_INPUT.password })
    ).rejects.toThrow()
  })

  it('비밀번호가 틀리면 에러를 throw한다', async () => {
    await expect(
      authenticateUser({ email: SIGNUP_INPUT.email, password: 'WrongPassword!' })
    ).rejects.toThrow()
  })

  it('존재하지 않는 이메일과 틀린 비밀번호는 동일한 에러 메시지를 반환한다 (계정 열거 방지)', async () => {
    let nonexistentError: Error | undefined
    let wrongPasswordError: Error | undefined

    try {
      await authenticateUser({ email: 'nobody@example.com', password: SIGNUP_INPUT.password })
    } catch (e) {
      nonexistentError = e as Error
    }

    try {
      await authenticateUser({ email: SIGNUP_INPUT.email, password: 'WrongPassword!' })
    } catch (e) {
      wrongPasswordError = e as Error
    }

    expect(nonexistentError).toBeDefined()
    expect(wrongPasswordError).toBeDefined()
    expect(nonexistentError?.message).toBe(wrongPasswordError?.message)
  })
})
