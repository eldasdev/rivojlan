import { type ClassValue, clsx } from "clsx";

/**
 * Merge class names (for Tailwind). Install clsx if needed, or use simple concat.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Generate URL-friendly slug from title */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");
}
