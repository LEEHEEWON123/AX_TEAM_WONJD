import Link from 'next/link'
import type { Restaurant } from '@/types/restaurant'

interface RestaurantCardProps {
  restaurant: Restaurant
}

/** 목록 카드. 썸네일 placeholder + 이름 + 별점/ETA 메타. 클릭 시 상세로 이동. */
export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-bg transition-shadow hover:shadow-sm"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-surface to-border text-4xl">
        <span aria-hidden>🍽️</span>
        {/* 찜 버튼 — 이번 이슈에서는 비기능 placeholder (찜은 이후 이슈) */}
        <span
          aria-hidden
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-bg/80 text-md text-text-muted"
        >
          ♡
        </span>
      </div>

      <div className="flex flex-col gap-1 p-4">
        <h3 className="text-md font-semibold text-text">{restaurant.name}</h3>
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <span className="text-warning">★</span>
          <span className="font-medium text-text">{restaurant.rating.toFixed(1)}</span>
          <span aria-hidden>·</span>
          <span>
            {restaurant.etaMin}~{restaurant.etaMax}분
          </span>
        </p>
      </div>
    </Link>
  )
}
