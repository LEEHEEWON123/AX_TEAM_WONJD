import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 조건부 className 병합 유틸. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
