import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/** 평문 비밀번호를 salt가 적용된 해시 문자열로 변환한다. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

/** 평문 비밀번호와 해시를 비교한다. 빈 문자열/불일치는 false를 반환한다. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false
  return bcrypt.compare(plain, hash)
}
