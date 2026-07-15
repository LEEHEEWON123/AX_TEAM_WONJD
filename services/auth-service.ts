import { randomUUID } from 'node:crypto'
import { getDb } from '@/lib/db/client'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { USER_ROLES } from '@/types/user'
import type { LoginInput, SignupInput, User, UserRole } from '@/types/user'

interface UserRow {
  id: string
  email: string
  password_hash: string
  nickname: string
  role: string
  created_at: string
}

/** DB에 저장된 role 문자열을 닫힌 셋으로 좁힌다. 비정상 값은 'customer'로 폴백. */
function toUserRole(value: string): UserRole {
  return (USER_ROLES as readonly string[]).includes(value) ? (value as UserRole) : 'customer'
}

/** 계정을 생성한다. 중복 이메일 시 Error를 throw하고, 비밀번호는 해시로 저장한다. */
export async function createUser(input: SignupInput): Promise<User> {
  const db = getDb()

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(input.email)
  if (existing) {
    throw new Error('EMAIL_TAKEN')
  }

  const id = randomUUID()
  const passwordHash = await hashPassword(input.password)
  const createdAt = new Date().toISOString()

  db.prepare(
    'INSERT INTO users (id, email, password_hash, nickname, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, input.email, passwordHash, input.nickname, input.role, createdAt)

  return {
    id,
    email: input.email,
    nickname: input.nickname,
    role: input.role,
    passwordHash,
    createdAt,
  }
}

/**
 * 이메일/비밀번호로 사용자를 인증한다.
 * 계정 열거 방지를 위해 이메일 없음/비밀번호 불일치는 동일한 에러 메시지로 throw한다.
 */
export async function authenticateUser(input: LoginInput): Promise<User> {
  const db = getDb()

  const row = db
    .prepare(
      'SELECT id, email, password_hash, nickname, role, created_at FROM users WHERE email = ?'
    )
    .get(input.email) as UserRow | undefined

  if (!row) {
    throw new Error('INVALID_CREDENTIALS')
  }

  const isValid = await verifyPassword(input.password, row.password_hash)
  if (!isValid) {
    throw new Error('INVALID_CREDENTIALS')
  }

  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    role: toUserRole(row.role),
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  }
}
