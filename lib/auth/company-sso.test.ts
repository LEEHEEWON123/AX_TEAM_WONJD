import { describe, expect, it } from 'vitest'
import { isCompanyEmail, pickCompanyEmail } from '@/lib/auth/company-sso'

describe('isCompanyEmail', () => {
  it('@wonjd.com 메일이면 허용한다', () => {
    expect(isCompanyEmail('heh139811@wonjd.com')).toBe(true)
  })

  it('다른 도메인이면 거절한다', () => {
    expect(isCompanyEmail('someone@gmail.com')).toBe(false)
  })
})

describe('pickCompanyEmail', () => {
  it('GitHub identity에 회사 메일이 있으면 그 값을 쓴다', () => {
    const email = pickCompanyEmail({
      email: 'user@users.noreply.github.com',
      identities: [
        {
          provider: 'github',
          identity_data: { email: 'staff@wonjd.com', user_name: 'staff' },
        },
      ],
    })

    expect(email).toBe('staff@wonjd.com')
  })

  it('회사 메일이 없으면 에러를 던진다', () => {
    expect(() =>
      pickCompanyEmail({
        email: 'someone@gmail.com',
        identities: [{ provider: 'github', identity_data: { email: 'someone@gmail.com' } }],
      })
    ).toThrow('SSO_EMAIL_DOMAIN_FORBIDDEN')
  })
})
