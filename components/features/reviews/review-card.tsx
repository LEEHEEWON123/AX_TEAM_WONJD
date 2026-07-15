import { StarRating } from '@/components/features/reviews/star-rating'

interface ReviewCardProps {
  authorNickname: string
  rating: number
  comment: string
  createdAt: string // ISO
}

/**
 * 리뷰 1건 카드(Server). 작성자 닉네임·별점(표시)·일시·텍스트.
 * 카드 골격은 OrderCard/MenuItemForm 관례(rounded-lg border border-border ... p-4).
 * 날짜는 RSC에서 toLocaleString('ko-KR') 렌더 — hydration 불일치 없음.
 */
export function ReviewCard({ authorNickname, rating, comment, createdAt }: ReviewCardProps) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-md font-semibold text-text">{authorNickname}</span>
        <span className="text-sm text-text-muted">
          {new Date(createdAt).toLocaleString('ko-KR')}
        </span>
      </div>
      <StarRating value={rating} />
      {comment && <p className="text-md text-text">{comment}</p>}
    </li>
  )
}
