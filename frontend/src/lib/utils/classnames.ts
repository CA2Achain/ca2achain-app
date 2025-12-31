import { clsx, type ClassValue } from 'clsx'

// Utility for merging Tailwind CSS classes
export function classNames(...inputs: ClassValue[]) {
  return clsx(inputs)
}