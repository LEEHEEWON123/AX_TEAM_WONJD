// 닫힌 셋(union) — 별도 테이블 없이 상수 배열로. FoodCategory / OrderStatus 선례 준용.
// customer=손님, owner=사장님(음식점 운영자).
export const USER_ROLES = ['customer', 'owner'] as const
export type UserRole = (typeof USER_ROLES)[number]

export interface User {
  id: string
  email: string
  nickname: string
  role: UserRole
  passwordHash: string
  createdAt: string
}

export interface SignupInput {
  email: string
  password: string
  passwordConfirm: string
  nickname: string
  role: UserRole
}

export interface LoginInput {
  email: string
  password: string
}

export interface Session {
  userId: string
  email: string
  nickname: string
  role: UserRole
}

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string; field?: keyof SignupInput }
