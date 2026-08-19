interface SupabaseIdentity {
  provider?: string
  identity_data?: {
    email?: string
    name?: string
    user_name?: string
    preferred_username?: string
  }
}

interface SupabaseUserResponse {
  email?: string
  identities?: SupabaseIdentity[]
  user_metadata?: {
    email?: string
    name?: string
    full_name?: string
    nickname?: string
    user_name?: string
    preferred_username?: string
  }
}

export interface CompanySsoProfile {
  email: string
  nickname: string
}

function getRequiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} 환경변수가 필요합니다`)
  }
  return value
}

export function isCompanyOnlyAuthEnabled(): boolean {
  return true
}

export function getAllowedCompanyDomain(): string {
  return process.env.SSO_ALLOWED_EMAIL_DOMAIN ?? 'wonjd.com'
}

export function isCompanyEmail(email: string, domain = getAllowedCompanyDomain()): boolean {
  return email.trim().toLowerCase().endsWith(`@${domain.toLowerCase()}`)
}

function collectEmails(user: SupabaseUserResponse): string[] {
  const emails = [
    user.email,
    user.user_metadata?.email,
    ...(user.identities ?? []).map((identity) => identity.identity_data?.email),
  ]

  return [...new Set(emails.map((email) => email?.trim().toLowerCase()).filter((email): email is string => Boolean(email)))]
}

export function pickCompanyEmail(user: SupabaseUserResponse, domain = getAllowedCompanyDomain()): string {
  const companyEmail = collectEmails(user).find((email) => isCompanyEmail(email, domain))
  if (!companyEmail) {
    throw new Error('SSO_EMAIL_DOMAIN_FORBIDDEN')
  }
  return companyEmail
}

export async function getCompanySsoProfile(accessToken: string): Promise<CompanySsoProfile> {
  const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('SSO_PROFILE_FETCH_FAILED')
  }

  const user = (await res.json()) as SupabaseUserResponse
  const email = pickCompanyEmail(user)

  const nickname =
    user.user_metadata?.name?.trim() ||
    user.user_metadata?.full_name?.trim() ||
    user.user_metadata?.nickname?.trim() ||
    user.user_metadata?.user_name?.trim() ||
    user.user_metadata?.preferred_username?.trim() ||
    user.identities?.[0]?.identity_data?.name?.trim() ||
    user.identities?.[0]?.identity_data?.user_name?.trim() ||
    email.split('@')[0] ||
    '원정대'

  return { email, nickname }
}
