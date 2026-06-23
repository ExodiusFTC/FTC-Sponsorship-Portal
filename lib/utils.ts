import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts (possibly) HTML content to clean plain text. New pitch fields are stored as
 * plain text, but older submissions still hold TipTap HTML (`<p>…</p>`); this strips those
 * tags so every surface renders simple, readable text instead of raw markup. Pure JS so it
 * runs in both server and client components.
 */
export function htmlToPlainText(input: string | null | undefined): string {
  if (!input) return ''
  return input
    // Treat block-level boundaries as line breaks before stripping tags.
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip every remaining tag.
    .replace(/<[^>]+>/g, '')
    // Decode the handful of entities TipTap/DOMPurify emit.
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    // Tidy whitespace left behind by removed markup.
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
