import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PersonaStyle = {
  color: string;
  bg: string;
  symbol: string;
  name: string;
  stripeColor: string;
};

const PERSONA_STYLES: Record<string, PersonaStyle> = {
  optimist:   { color: "#4E7A5F", bg: "rgba(78, 122, 95, 0.15)",   symbol: "O", name: "Optimist",   stripeColor: "#4E7A5F" },
  pessimist:  { color: "#8B4F4F", bg: "rgba(139, 79, 79, 0.15)",   symbol: "P", name: "Pessimist",  stripeColor: "#8B4F4F" },
  contrarian: { color: "#4F6B8B", bg: "rgba(79, 107, 139, 0.15)",  symbol: "C", name: "Contrarian", stripeColor: "#4F6B8B" },
  observer:   { color: "#7B5C3A", bg: "rgba(123, 92, 58, 0.15)",   symbol: "⚖", name: "Observer",   stripeColor: "#7B5C3A" },
};

const FALLBACK: PersonaStyle = { color: "#9A9289", bg: "rgba(154, 146, 137, 0.15)", symbol: "?", name: "Unknown", stripeColor: "#9A9289" };

export function getPersonaStyle(personaId: string): PersonaStyle {
  return PERSONA_STYLES[personaId] ?? FALLBACK;
}
