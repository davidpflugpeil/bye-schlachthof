import { twMerge } from "tailwind-merge";

type ClassValue = string | false | null | undefined;

/**
 * Joins class names and resolves conflicting Tailwind utilities — the last one
 * passed wins, regardless of the order in the generated stylesheet.
 */
export function cn(...classes: ClassValue[]): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
