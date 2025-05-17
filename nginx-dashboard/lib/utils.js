import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes and custom classes using clsx and tailwind-merge
 * This prevents conflicts when multiple Tailwind CSS classes target the same CSS property
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}