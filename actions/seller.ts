'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { menuItemSchema, restaurantSchema } from '@/lib/validation/menu-schema'
import {
  createMenuItem,
  deleteMenuItem,
  updateMenuItem,
} from '@/services/menu-service'
import {
  createRestaurant,
  getRestaurantByOwner,
} from '@/services/restaurant-service'
import { updateOrderStatus } from '@/services/order-service'
import { ORDER_STATUSES } from '@/types/order'
import type { OrderStatus } from '@/types/order'
import type { MenuItemInput, RestaurantInput } from '@/types/restaurant'
import type { Session } from '@/types/user'

// 폼 인라인 검증/에러 표시용 결과(auth-form의 AuthResult 패턴 준용).
export type SellerActionResult = { ok: true } | { ok: false; error: string }

/** owner 세션을 강제한다. 비로그인 → /login, 손님 → /(홈). */
async function requireOwnerSession(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  if (session.role !== 'owner') {
    redirect('/')
  }
  return session
}

/** 메뉴/음식점 변경 후 관련 경로 재검증. */
function revalidateSeller(): void {
  revalidatePath('/seller')
  revalidatePath('/seller/menu')
  revalidatePath('/seller/orders')
  revalidatePath('/restaurants/[id]', 'page')
}

/** 사장님 음식점 생성(1:1). 이미 소유 음식점이 있으면 에러. */
export async function createRestaurantAction(
  input: RestaurantInput
): Promise<SellerActionResult> {
  const session = await requireOwnerSession()

  const parsed = restaurantSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }

  try {
    createRestaurant(session.userId, parsed.data)
  } catch {
    return { ok: false, error: '이미 등록한 음식점이 있습니다' }
  }

  revalidateSeller()
  return { ok: true }
}

/** 메뉴 등록. */
export async function createMenuItemAction(
  input: MenuItemInput
): Promise<SellerActionResult> {
  const session = await requireOwnerSession()

  const parsed = menuItemSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }

  try {
    createMenuItem(session.userId, parsed.data)
  } catch {
    return { ok: false, error: '음식점을 먼저 등록해 주세요' }
  }

  revalidateSeller()
  return { ok: true }
}

/** 메뉴 수정(소유 스코프). */
export async function updateMenuItemAction(
  menuItemId: number,
  input: MenuItemInput
): Promise<SellerActionResult> {
  const session = await requireOwnerSession()

  if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
    return { ok: false, error: '잘못된 요청입니다' }
  }

  const parsed = menuItemSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }

  updateMenuItem(session.userId, menuItemId, parsed.data)
  revalidateSeller()
  return { ok: true }
}

/** 메뉴 삭제(소유 스코프). */
export async function deleteMenuItemAction(menuItemId: number): Promise<void> {
  const session = await requireOwnerSession()

  if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
    return
  }

  deleteMenuItem(session.userId, menuItemId)
  revalidateSeller()
}

/**
 * 주문 상태 전이(form action). 소유권 + 단방향 검증은 서비스에서 재확인.
 * next가 닫힌 셋 밖이면 무시.
 */
export async function updateOrderStatusAction(formData: FormData): Promise<void> {
  const session = await requireOwnerSession()

  const orderId = Number(formData.get('orderId'))
  const next = String(formData.get('next') ?? '')
  if (
    !Number.isInteger(orderId) ||
    orderId <= 0 ||
    !(ORDER_STATUSES as readonly string[]).includes(next)
  ) {
    return
  }

  // 세션 owner라도, 실제 소유 음식점이 없으면 전이 대상이 없다(방어적 조기 반환).
  const restaurant = getRestaurantByOwner(session.userId)
  if (!restaurant) {
    return
  }

  updateOrderStatus(session.userId, orderId, next as OrderStatus)
  revalidatePath('/seller/orders')
  revalidatePath('/seller')
}
