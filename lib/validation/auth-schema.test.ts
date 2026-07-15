import { describe, it, expect } from 'vitest'
import { signupSchema, loginSchema } from '@/lib/validation/auth-schema'

const VALID_SIGNUP = {
  email: 'user@example.com',
  password: 'Password1!',
  passwordConfirm: 'Password1!',
  nickname: '닉네임',
  role: 'customer',
}

describe('signupSchema', () => {
  it('유효한 입력은 통과한다', () => {
    const result = signupSchema.safeParse(VALID_SIGNUP)
    expect(result.success).toBe(true)
  })

  it('이메일 형식이 아니면 email 필드 에러와 함께 실패한다', () => {
    const result = signupSchema.safeParse({ ...VALID_SIGNUP, email: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('email'))).toBe(true)
    }
  })

  it('비밀번호가 최소 길이 미만이면 password 필드 에러와 함께 실패한다', () => {
    const result = signupSchema.safeParse({
      ...VALID_SIGNUP,
      password: '123',
      passwordConfirm: '123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('password'))).toBe(true)
    }
  })

  it('비밀번호와 비밀번호 확인이 일치하지 않으면 passwordConfirm 필드 에러와 함께 실패한다', () => {
    const result = signupSchema.safeParse({ ...VALID_SIGNUP, passwordConfirm: 'Different1!' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('passwordConfirm'))).toBe(true)
    }
  })

  it('닉네임이 비어있으면 실패한다', () => {
    const result = signupSchema.safeParse({ ...VALID_SIGNUP, nickname: '' })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('유효한 로그인 입력은 통과한다', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'Password1!' })
    expect(result.success).toBe(true)
  })

  it('이메일 형식이 아니면 실패한다', () => {
    const result = loginSchema.safeParse({ email: 'invalid', password: 'Password1!' })
    expect(result.success).toBe(false)
  })

  it('비밀번호가 비어있으면 실패한다', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
  })
})
