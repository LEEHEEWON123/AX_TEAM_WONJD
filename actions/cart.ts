'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import {
  addToCart,
  removeCartItem,
  updateCartItemQuantity,
} from '@/services/cart-service'
import type { AddToCartResult } from '@/types/cart'

/**
 * 메뉴를 장바구니에 담는다.
 * 미로그인 시 /login으로 유도. 다른 음식점 메뉴는 different_restaurant 반환(UI가 확인 후 force 재호출).
 */
export async function addToCartAction(input: {
  menuItemId: number
  force?: boolean
}): Promise<AddToCartResult> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const result = addToCart(session.userId, input.menuItemId, input.force ?? false)
  revalidatePath('/cart')
  return result
}

/** 장바구니 항목 수량 변경(form action). quantity <= 0 이면 삭제. 미로그인 시 /login. */
export async function updateQuantityAction(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const cartItemId = Number(formData.get('cartItemId'))
  const quantity = Number(formData.get('quantity'))
  if (!Number.isInteger(cartItemId) || cartItemId <= 0 || Number.isNaN(quantity)) {
    return
  }

  updateCartItemQuantity(session.userId, cartItemId, quantity)
  revalidatePath('/cart')
}

/** 장바구니 항목 삭제(form action). 미로그인 시 /login. */
export async function removeItemAction(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const cartItemId = Number(formData.get('cartItemId'))
  if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
    return
  }

  removeCartItem(session.userId, cartItemId)
  revalidatePath('/cart')
}
