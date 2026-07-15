import Link from 'next/link'
import { requireOwner } from '@/lib/auth/guard'
import { getRestaurantByOwner } from '@/services/restaurant-service'
import { listOrdersByRestaurant } from '@/services/order-service'
import { TopHeader } from '@/components/features/restaurants/top-header'
import { CreateRestaurantForm } from '@/components/features/seller/create-restaurant-form'

export default async function SellerDashboardPage() {
  const session = await requireOwner()
  const restaurant = getRestaurantByOwner(session.userId)

  return (
    <div className="min-h-screen bg-bg">
      <TopHeader nickname={session.nickname} role={session.role} showSearch={false} />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
        {!restaurant ? (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold text-text">음식점을 등록해 주세요</h1>
              <p className="text-md text-text-muted">
                음식점을 먼저 등록하면 메뉴와 주문을 관리할 수 있어요.
              </p>
            </div>
            <CreateRestaurantForm />
          </section>
        ) : (
          <SellerDashboard restaurantName={restaurant.name} restaurantId={restaurant.id} menuCount={restaurant.menu.length} />
        )}
      </main>
    </div>
  )
}

function SellerDashboard({
  restaurantName,
  restaurantId,
  menuCount,
}: {
  restaurantName: string
  restaurantId: number
  menuCount: number
}) {
  const orders = listOrdersByRestaurant(restaurantId)
  const pendingCount = orders.filter((order) => order.status !== 'completed').length

  const cardClass =
    'flex flex-col gap-2 rounded-lg border border-border bg-bg p-6 transition-shadow hover:shadow-sm'

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-text">{restaurantName}</h1>
        <p className="text-md text-text-muted">사장님 관리 대시보드</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/seller/menu" className={cardClass}>
          <span className="text-md font-semibold text-text">메뉴 관리</span>
          <span className="text-sm text-text-muted">등록된 메뉴 {menuCount}개</span>
        </Link>
        <Link href="/seller/orders" className={cardClass}>
          <span className="text-md font-semibold text-text">주문 관리</span>
          <span className="text-sm text-text-muted">진행 중 주문 {pendingCount}건</span>
        </Link>
      </div>
    </section>
  )
}
