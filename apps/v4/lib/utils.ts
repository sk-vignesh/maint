import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`
}

/**
 * Deduplicate an array by a key field.
 * Last-write-wins when duplicates are found.
 * Use this at every API data load point to prevent duplicate dropdown options.
 */
export function dedupBy<T>(arr: T[], key: keyof T): T[] {
  return Array.from(new Map(arr.map((item) => [item[key], item])).values())
}
