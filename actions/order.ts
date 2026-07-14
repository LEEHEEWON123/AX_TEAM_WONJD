'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createOrder } from '@/services/order-service'

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
