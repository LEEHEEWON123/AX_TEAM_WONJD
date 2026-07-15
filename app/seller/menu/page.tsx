import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireOwner } from '@/lib/auth/guard'
import { getRestaurantByOwner } from '@/services/restaurant-service'
import { TopHeader } from '@/components/features/restaurants/top-header'
import { MenuManager } from '@/components/features/seller/menu-manager'

export default async function SellerMenuPage() {
  const session = await requireOwner()
  const restaurant = getRestaurantByOwner(session.userId)
  if (!restaurant) {
    redirect('/seller')
  }

  return (
    <div className="min-h-screen bg-bg">
      <TopHeader nickname={session.nickname} role={session.role} showSearch={false} />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
        <div className="flex flex-col gap-1">
          <Link href="/seller" className="text-sm text-text-muted hover:text-text">
            ← 대시보드
          </Link>
          <h1 className="text-xl font-bold text-text">메뉴 관리</h1>
          <p className="text-md text-text-muted">{restaurant.name}</p>
        </div>

        <MenuManager menu={restaurant.menu} />
      </main>
    </div>
  )
}
