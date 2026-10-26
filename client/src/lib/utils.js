import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Joins class names and lets a later Tailwind class win over an earlier one. Used by the shadcn/ui files.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
