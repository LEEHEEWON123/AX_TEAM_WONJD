export interface User {
  id: string
  email: string
  nickname: string
  passwordHash: string
  createdAt: string
}

export interface SignupInput {
  email: string
  password: string
  passwordConfirm: string
  nickname: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface Session {
  userId: string
  email: string
  nickname: string
}

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string; field?: keyof SignupInput }
