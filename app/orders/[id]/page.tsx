import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getOrder } from '@/services/order-service'
import { OrderSummary } from '@/components/features/orders/order-summary'
import { TopHeader } from '@/components/features/restaurants/top-header'

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const { id } = await params
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId <= 0) {
    notFound()
  }

  // 소유자 아니면 null → notFound()(존재 노출 방지).
  const order = getOrder(session.userId, numericId)
  if (!order) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-bg">
      <TopHeader nickname={session.nickname} showSearch={false} />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span aria-hidden className="text-5xl">
            ✅
          </span>
          <h1 className="text-xl font-bold text-text">주문이 접수되었어요</h1>
          <p className="text-md text-text-muted">{order.restaurantName}</p>
        </div>

        <OrderSummary items={order.items} totalPrice={order.totalPrice} />

        <Link
          href="/"
          className="w-full rounded-md bg-primary px-4 py-2 text-center text-md font-medium text-primary-text transition-colors hover:bg-primary/90"
        >
          홈으로 돌아가기
        </Link>
      </main>
    </div>
  )
}
