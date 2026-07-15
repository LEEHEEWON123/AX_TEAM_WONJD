import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireOwner } from '@/lib/auth/guard'
import { getRestaurantByOwner } from '@/services/restaurant-service'
import { listOrdersByRestaurant } from '@/services/order-service'
import { TopHeader } from '@/components/features/restaurants/top-header'
import { SellerOrderCard } from '@/components/features/seller/seller-order-card'

export default async function SellerOrdersPage() {
  const session = await requireOwner()
  const restaurant = getRestaurantByOwner(session.userId)
  if (!restaurant) {
    redirect('/seller')
  }

  const orders = listOrdersByRestaurant(restaurant.id)

  return (
    <div className="min-h-screen bg-bg">
      <TopHeader nickname={session.nickname} role={session.role} showSearch={false} />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
        <div className="flex flex-col gap-1">
          <Link href="/seller" className="text-sm text-text-muted hover:text-text">
            ← 대시보드
          </Link>
          <h1 className="text-xl font-bold text-text">주문 관리</h1>
          <p className="text-md text-text-muted">{restaurant.name}</p>
        </div>

        {orders.length === 0 ? (
          <p className="py-10 text-center text-md text-text-muted">들어온 주문이 없어요</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {orders.map((order) => (
              <SellerOrderCard key={order.id} order={order} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
