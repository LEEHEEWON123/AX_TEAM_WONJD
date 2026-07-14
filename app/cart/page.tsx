import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getCart } from '@/services/cart-service'
import { CartItemRow } from '@/components/features/cart/cart-item-row'
import { CartSummary } from '@/components/features/cart/cart-summary'
import { TopHeader } from '@/components/features/restaurants/top-header'

export default async function CartPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const cart = getCart(session.userId)
  const isEmpty = cart.items.length === 0

  return (
    <div className="min-h-screen bg-bg">
      <TopHeader nickname={session.nickname} showSearch={false} />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
        <h1 className="text-xl font-bold text-text">장바구니</h1>

        {isEmpty ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span aria-hidden className="text-5xl">
              🛒
            </span>
            <p className="text-md text-text-muted">장바구니가 비어 있어요</p>
            <Link
              href="/"
              className="rounded-md bg-primary px-4 py-2 text-md font-medium text-primary-text transition-colors hover:bg-primary/90"
            >
              음식점 둘러보기
            </Link>
          </div>
        ) : (
          <>
            {cart.restaurantName && (
              <h2 className="text-lg font-bold text-text">{cart.restaurantName}</h2>
            )}
            <ul className="flex flex-col">
              {cart.items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </ul>
            <CartSummary totalPrice={cart.totalPrice} />
          </>
        )}
      </main>
    </div>
  )
}
