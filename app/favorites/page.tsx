import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { listFavoritesByUser } from '@/services/favorite-service'
import { RestaurantCard } from '@/components/features/restaurants/restaurant-card'
import { TopHeader } from '@/components/features/restaurants/top-header'

/** 찜한 음식점 목록. 로그인 전용 — 비로그인은 /login으로 리다이렉트. */
export default async function FavoritesPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const restaurants = listFavoritesByUser(session.userId)

  return (
    <div className="min-h-screen bg-bg">
      <TopHeader nickname={session.nickname} role={session.role} showSearch={false} />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
        <h2 className="text-lg font-bold text-text">찜한 음식점</h2>

        {restaurants.length === 0 ? (
          <p className="py-10 text-center text-md text-text-muted">
            아직 찜한 음식점이 없어요
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4">
            {restaurants.map((restaurant) => (
              <li key={restaurant.id}>
                {/* 이 목록의 모든 항목은 찜 상태이므로 initialFavorited=true. */}
                <RestaurantCard
                  restaurant={restaurant}
                  isAuthenticated
                  initialFavorited
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
