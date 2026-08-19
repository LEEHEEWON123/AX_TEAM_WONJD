import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadModule(remoteSecret: string | null = null) {
  vi.resetModules()
  vi.doMock('./supabase-secret-client', () => ({
    fetchSupabaseSecret: vi.fn().mockResolvedValue(remoteSecret),
  }))
  return import('@/lib/security/server-secrets')
}

describe('server-secrets', () => {
  afterEach(() => {
    delete process.env.AUTH_SECRET
    vi.resetModules()
  })

  it('직접 env가 있으면 그 값을 우선 사용한다', async () => {
    process.env.AUTH_SECRET = 'direct-secret-value-123456789012345'

    const { getServerSecret } = await loadModule()
    expect(await getServerSecret('AUTH_SECRET')).toBe('direct-secret-value-123456789012345')
  })

  it('직접 env가 없고 원격 조회도 없으면 null을 반환한다', async () => {
    const { getServerSecret } = await loadModule()
    expect(await getServerSecret('AUTH_SECRET')).toBeNull()
  })

  it('직접 env가 없으면 Supabase 원격 시크릿을 사용한다', async () => {
    const { getServerSecret } = await loadModule('remote-secret-value-123456789012345')
    expect(await getServerSecret('AUTH_SECRET')).toBe('remote-secret-value-123456789012345')
  })

  it('필수 시크릿이 없으면 명확한 에러를 던진다', async () => {
    const { getRequiredServerSecret } = await loadModule()
    await expect(getRequiredServerSecret('AUTH_SECRET')).rejects.toThrow('AUTH_SECRET 환경변수가 설정되지 않았습니다')
  })

  it('getServerSecretSync는 env만 확인한다', async () => {
    process.env.AUTH_SECRET = 'sync-secret-value-123456789012345'
    const { getServerSecretSync } = await loadModule()
    expect(getServerSecretSync('AUTH_SECRET')).toBe('sync-secret-value-123456789012345')
    expect(getServerSecretSync('MISSING')).toBeNull()
  })
})
