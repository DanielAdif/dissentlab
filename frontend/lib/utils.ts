import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PersonaStyle = {
  stripeColor: string;
};

const PERSONA_STYLES: Record<string, PersonaStyle> = {
  optimist:   { stripeColor: "#9b8f82" },
  pessimist:  { stripeColor: "#5f5550" },
  contrarian: { stripeColor: "#b5a99b" },
  observer:   { stripeColor: "#c8bdb0" },
};

const FALLBACK: PersonaStyle = { stripeColor: "#9b8f82" };

export function getPersonaStyle(personaId: string): PersonaStyle {
  return PERSONA_STYLES[personaId] ?? FALLBACK;
}
