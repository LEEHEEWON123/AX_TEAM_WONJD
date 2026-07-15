'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { toggleFavorite } from '@/services/favorite-service'

// 버튼은 목록/상세 어디서나 클릭될 수 있으므로 비로그인 시 redirect가 아니라 에러를 반환한다.
export type ToggleFavoriteResult =
  | { ok: true; favorited: boolean }
  | { ok: false; error: string }

/**
 * 찜 토글. userId는 세션에서만 얻는다(클라이언트가 다른 user_id를 보낼 수 없는 구조).
 * 성공 시 목록/찜목록/상세 경로를 재검증한다.
 */
export async function toggleFavoriteAction(
  restaurantId: number
): Promise<ToggleFavoriteResult> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: '로그인이 필요합니다' }
  }

  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    return { ok: false, error: '잘못된 요청입니다' }
  }

  let favorited: boolean
  try {
    favorited = toggleFavorite(session.userId, restaurantId)
  } catch {
    return { ok: false, error: '찜 처리에 실패했습니다' }
  }

  revalidatePath('/')
  revalidatePath('/favorites')
  // 동적 세그먼트는 문자열 리터럴 경로 실수 방지 위해 '[id]' + 'page' 형식(review/seller 선례 동일).
  revalidatePath('/restaurants/[id]', 'page')
  return { ok: true, favorited }
}
