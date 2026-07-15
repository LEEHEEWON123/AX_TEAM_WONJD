import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { listOrders } from '@/services/order-service'
import { OrderCard } from '@/components/features/orders/order-card'
import { TopHeader } from '@/components/features/restaurants/top-header'

export default async function OrdersPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const orders = listOrders(session.userId)

  return (
    <div className="min-h-screen bg-bg">
      <TopHeader nickname={session.nickname} role={session.role} showSearch={false} />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-text">내 주문</h1>
          <p className="text-md text-text-muted">주문 내역과 현재 상태를 확인하세요</p>
        </div>

        {orders.length === 0 ? (
          <p className="py-10 text-center text-md text-text-muted">아직 주문 내역이 없어요</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
