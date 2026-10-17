import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges Tailwind classes, letting later classes win over earlier ones. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
