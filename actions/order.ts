'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createOrder, reorder } from '@/services/order-service'

/**
 * 현재 장바구니로 주문을 생성하고 주문 완료 화면으로 이동한다(form action).
 * 미로그인 시 /login. 빈 장바구니면 createOrder가 throw(버튼은 빈 장바구니에서 미노출).
 */
export async function placeOrderAction(): Promise<void> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const order = createOrder(session.userId)
  revalidatePath('/cart')
  redirect(`/orders/${order.id}`)
}

/**
 * 과거 주문과 동일한 메뉴로 장바구니를 다시 채운다.
 * 미로그인 시 /login. 주문 미존재·비소유 시 { ok: false }. 리다이렉트는 클라이언트가 결과 보고 수행.
 */
export async function reorderAction(orderId: number): Promise<
  | { ok: true; addedCount: number; unavailableItemNames: string[] }
  | { ok: false; error: string }
> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const result = reorder(session.userId, orderId)
  if (!result) {
    return { ok: false, error: '주문을 찾을 수 없습니다' }
  }

  revalidatePath('/cart')
  return {
    ok: true,
    addedCount: result.addedCount,
    unavailableItemNames: result.unavailableItemNames,
  }
}
