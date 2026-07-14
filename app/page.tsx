import { getSession } from '@/lib/auth/session'
import { listRestaurants } from '@/services/restaurant-service'
import {
  FOOD_CATEGORIES,
  type CategoryFilter,
  type FoodCategory,
} from '@/types/restaurant'
import { CategoryFilterChip } from '@/components/features/restaurants/category-filter-chip'
import { RestaurantCard } from '@/components/features/restaurants/restaurant-card'
import { TopHeader } from '@/components/features/restaurants/top-header'

// 필터 칩 UI 순서(전체 포함).
const CHIP_CATEGORIES: CategoryFilter[] = ['전체', ...FOOD_CATEGORIES]

/** searchParams 값(string | string[] | undefined)에서 단일 문자열을 안전하게 뽑는다. */
function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

/** category 쿼리를 닫힌 셋으로 검증한다. 셋 밖 값은 '전체'로 폴백(throw 아님). */
function parseCategory(value: string | undefined): CategoryFilter {
  if (value && (FOOD_CATEGORIES as readonly string[]).includes(value)) {
    return value as FoodCategory
  }
  return '전체'
}

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const category = parseCategory(firstParam(params.category))
  const q = firstParam(params.q)?.trim() || undefined

  // 탐색은 공개(A안). 로그인 사용자면 헤더에 닉네임, 아니면 로그인 CTA 노출.
  const session = await getSession()
  const restaurants = listRestaurants({ category, q })

  return (
    <div className="min-h-screen bg-bg">
      <TopHeader initialQuery={q ?? ''} nickname={session?.nickname ?? null} />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CHIP_CATEGORIES.map((chip) => (
            <CategoryFilterChip
              key={chip}
              category={chip}
              active={chip === category}
              q={q}
            />
          ))}
        </div>

        <h2 className="text-lg font-bold text-text">내 주변 인기 음식점</h2>

        {restaurants.length === 0 ? (
          <p className="py-10 text-center text-md text-text-muted">
            조건에 맞는 음식점이 없어요
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4">
            {restaurants.map((restaurant) => (
              <li key={restaurant.id}>
                <RestaurantCard restaurant={restaurant} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
