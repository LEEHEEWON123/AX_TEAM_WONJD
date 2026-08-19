import { fetchSupabaseSecret } from './supabase-secret-client'

/**
 * 서버 전용 시크릿 조회 (우선순위):
 * 1) 직접 env (AUTH_SECRET 등)
 * 2) Supabase Edge Function 런타임 조회
 */
export async function getServerSecret(name: string): Promise<string | null> {
  const direct = process.env[name]
  if (typeof direct === 'string' && direct.length > 0) return direct

  const fromSupabase = await fetchSupabaseSecret(name)
  if (typeof fromSupabase === 'string' && fromSupabase.length > 0) return fromSupabase

  return null
}

export async function getRequiredServerSecret(name: string): Promise<string> {
  const secret = await getServerSecret(name)
  if (!secret) {
    throw new Error(
      `${name} 환경변수가 설정되지 않았습니다. 직접 env에 넣거나 Supabase 서버 시크릿 경로를 설정하세요.`
    )
  }
  return secret
}

/**
 * 동기 버전 — 네트워크 호출 없이 env만 확인.
 * 서버 초기화 등 async가 불가한 곳에서 사용.
 */
export function getServerSecretSync(name: string): string | null {
  const direct = process.env[name]
  if (typeof direct === 'string' && direct.length > 0) return direct

  return null
}
