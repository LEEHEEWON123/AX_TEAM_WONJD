let cache = new Map<string, { value: string | null; expiresAt: number }>()

function getFunctionUrl(): string | null {
  const explicit = process.env.SUPABASE_SECRET_FUNCTION_URL
  if (explicit) return explicit

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  if (!base) return null
  return `${base.replace(/\/$/, '')}/functions/v1/server-secrets`
}

function getFetchToken(): string | null {
  const token = process.env.SUPABASE_SECRET_FETCH_TOKEN
  return typeof token === 'string' && token.length > 0 ? token : null
}

/**
 * Supabase Edge Function에서 단일 시크릿을 조회한다.
 * 서버 런타임에서만 사용하며, 짧은 TTL 메모리 캐시를 둔다.
 */
export async function fetchSupabaseSecret(name: string): Promise<string | null> {
  const cached = cache.get(name)
  if (cached && Date.now() < cached.expiresAt) return cached.value

  const url = getFunctionUrl()
  const token = getFetchToken()
  if (!url || !token) return null

  const res = await fetch(`${url}?name=${encodeURIComponent(name)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (res.status === 404) {
    cache.set(name, { value: null, expiresAt: Date.now() + 30_000 })
    return null
  }

  if (!res.ok) {
    console.error(`[supabase-secret-client] request failed for ${name}: ${res.status}`)
    return null
  }

  const data = (await res.json()) as { value?: unknown }
  const value = typeof data.value === 'string' && data.value.length > 0 ? data.value : null
  cache.set(name, { value, expiresAt: Date.now() + 300_000 })
  return value
}

export function clearSupabaseSecretCache(): void {
  cache = new Map()
}
