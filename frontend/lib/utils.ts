import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PERSONA_COLORS: Record<string, string> = {
  optimist: "text-optimist border-optimist",
  pessimist: "text-pessimist border-pessimist",
  contrarian: "text-contrarian border-contrarian",
  observer: "text-observer border-observer",
};

export function getPersonaColor(personaId: string): string {
  return PERSONA_COLORS[personaId] ?? "text-foreground border-border";
}
