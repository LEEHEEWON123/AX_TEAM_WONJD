import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { isFavorited } from '@/services/favorite-service'
import { getRestaurantWithMenu } from '@/services/restaurant-service'
import {
  getRestaurantReviewSummary,
  listReviewsByRestaurant,
} from '@/services/review-service'
import { FavoriteButton } from '@/components/features/favorites/favorite-button'
import { MenuItemRow } from '@/components/features/restaurants/menu-item-row'
import { ReviewCard } from '@/components/features/reviews/review-card'
import { StarRating } from '@/components/features/reviews/star-rating'
import { TopHeader } from '@/components/features/restaurants/top-header'

interface RestaurantDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function RestaurantDetailPage({ params }: RestaurantDetailPageProps) {
  const { id } = await params

  // 숫자가 아니거나 없는 id → 404.
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId <= 0) {
    notFound()
  }

  const restaurant = getRestaurantWithMenu(numericId)
  if (!restaurant) {
    notFound()
  }

  const session = await getSession()

  // 리뷰 섹션 — reviews에서 실시간 집계(음식점 상단 rating(seed)과는 이원화, 후속 통합 여지).
  const reviewSummary = getRestaurantReviewSummary(numericId)
  const reviews = listReviewsByRestaurant(numericId)

  return (
    <div className="min-h-screen bg-bg">
      <TopHeader nickname={session?.nickname ?? null} role={session?.role ?? null} showSearch={false} />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
        <div className="flex aspect-[16/9] items-center justify-center rounded-lg bg-gradient-to-br from-surface to-border text-5xl">
          <span aria-hidden>🍽️</span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-text">{restaurant.name}</h1>
            {session && (
              <FavoriteButton
                restaurantId={restaurant.id}
                initialFavorited={isFavorited(session.userId, restaurant.id)}
              />
            )}
          </div>
          {restaurant.description && (
            <p className="text-md text-text-muted">{restaurant.description}</p>
          )}
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <span className="text-warning">★</span>
            <span className="font-medium text-text">{restaurant.rating.toFixed(1)}</span>
            <span aria-hidden>·</span>
            <span>
              {restaurant.etaMin}~{restaurant.etaMax}분
            </span>
          </p>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-text">메뉴</h2>
          {restaurant.menu.length === 0 ? (
            <p className="py-10 text-center text-md text-text-muted">
              아직 등록된 메뉴가 없어요
            </p>
          ) : (
            <ul className="flex flex-col">
              {restaurant.menu.map((item) => (
                <MenuItemRow key={item.id} item={item} isAuthenticated={session != null} />
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text">리뷰</h2>
            {reviewSummary.count > 0 && (
              <span className="flex items-center gap-2 text-sm text-text-muted">
                <StarRating
                  value={Math.round(reviewSummary.average)}
                  label={reviewSummary.average.toFixed(1)}
                />
                <span>({reviewSummary.count})</span>
              </span>
            )}
          </div>
          {reviews.length === 0 ? (
            <p className="py-10 text-center text-md text-text-muted">아직 리뷰가 없어요</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  authorNickname={review.authorNickname}
                  rating={review.rating}
                  comment={review.comment}
                  createdAt={review.createdAt}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
