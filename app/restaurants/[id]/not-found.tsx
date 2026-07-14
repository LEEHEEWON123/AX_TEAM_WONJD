import Link from 'next/link'

export default function RestaurantNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-bold text-text">음식점을 찾을 수 없어요</h1>
      <p className="text-md text-text-muted">삭제되었거나 존재하지 않는 음식점입니다.</p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-md font-medium text-primary-text transition-colors hover:bg-primary/90"
      >
        홈으로 돌아가기
      </Link>
    </main>
  )
}
