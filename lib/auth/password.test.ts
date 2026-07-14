import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

describe('hashPassword', () => {
  it('평문 비밀번호를 원문과 다른 해시 문자열로 변환한다', async () => {
    const hash = await hashPassword('Sup3rSecret!')
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
    expect(hash).not.toBe('Sup3rSecret!')
  })

  it('같은 비밀번호도 매 호출마다 다른 해시를 생성한다 (salt 적용)', async () => {
    const hash1 = await hashPassword('Sup3rSecret!')
    const hash2 = await hashPassword('Sup3rSecret!')
    expect(hash1).not.toBe(hash2)
  })
})

describe('verifyPassword', () => {
  it('올바른 비밀번호로 검증하면 true를 반환한다', async () => {
    const hash = await hashPassword('Sup3rSecret!')
    await expect(verifyPassword('Sup3rSecret!', hash)).resolves.toBe(true)
  })

  it('틀린 비밀번호로 검증하면 false를 반환한다', async () => {
    const hash = await hashPassword('Sup3rSecret!')
    await expect(verifyPassword('WrongPassword!', hash)).resolves.toBe(false)
  })

  it('빈 문자열 비밀번호는 항상 false를 반환한다', async () => {
    const hash = await hashPassword('Sup3rSecret!')
    await expect(verifyPassword('', hash)).resolves.toBe(false)
  })
})
