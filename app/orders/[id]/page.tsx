import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getOrder } from '@/services/order-service'
import { getReviewByOrder } from '@/services/review-service'
import { OrderSummary } from '@/components/features/orders/order-summary'
import { ReorderButton } from '@/components/features/orders/reorder-button'
import { ReviewCard } from '@/components/features/reviews/review-card'
import { ReviewForm } from '@/components/features/reviews/review-form'
import { TopHeader } from '@/components/features/restaurants/top-header'
import { ORDER_STATUS_LABELS } from '@/types/order'
import type { OrderStatus } from '@/types/order'

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

// 상태별 상세 화면 문구/아이콘. ORDER_STATUS_LABELS(접수/조리중/완료)와 짝을 이룬다.
const STATUS_HEADINGS: Record<OrderStatus, string> = {
  pending: '주문이 접수되었어요',
  cooking: '조리 중이에요',
  completed: '완료된 주문이에요',
}

const STATUS_ICONS: Record<OrderStatus, string> = {
  pending: '✅',
  cooking: '🍳',
  completed: '🎉',
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

  // 리뷰 작성/조회는 completed 주문에서만. 이미 작성했으면 폼 대신 내 리뷰를 표시(재작성 UI 차단).
  const myReview =
    order.status === 'completed' ? getReviewByOrder(session.userId, order.id) : null

  return (
    <div className="min-h-screen bg-bg">
      <TopHeader nickname={session.nickname} showSearch={false} />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span aria-hidden className="text-5xl">
            {STATUS_ICONS[order.status]}
          </span>
          <h1 className="text-xl font-bold text-text">{STATUS_HEADINGS[order.status]}</h1>
          <span className="rounded-md bg-surface px-4 py-1 text-sm font-medium text-text">
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          <p className="text-md text-text-muted">{order.restaurantName}</p>
        </div>

        <OrderSummary items={order.items} totalPrice={order.totalPrice} />

        {order.status === 'completed' && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-text">리뷰</h2>
            {myReview ? (
              <ul className="flex flex-col">
                <ReviewCard
                  authorNickname={session.nickname}
                  rating={myReview.rating}
                  comment={myReview.comment}
                  createdAt={myReview.createdAt}
                />
              </ul>
            ) : (
              <ReviewForm orderId={order.id} />
            )}
          </section>
        )}

        {/* 같은 메뉴로 다시 담기 — 완료 여부와 무관하게 자연스러운 액션(전체 상태 노출). */}
        <ReorderButton orderId={order.id} />

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
