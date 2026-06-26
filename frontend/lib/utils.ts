import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PersonaStyle = {
  bubbleBg: string;
  avatarBg: string;
  stripeColor: string;
};

const PERSONA_STYLES: Record<string, PersonaStyle> = {
  optimist:   { bubbleBg: "bg-bubble-1", avatarBg: "bg-optimist", stripeColor: "#9b8f82" },
  pessimist:  { bubbleBg: "bg-bubble-2", avatarBg: "bg-pessimist", stripeColor: "#5f5550" },
  contrarian: { bubbleBg: "bg-bubble-3", avatarBg: "bg-contrarian", stripeColor: "#b5a99b" },
  observer:   { bubbleBg: "bg-bubble-4", avatarBg: "bg-observer", stripeColor: "#c8bdb0" },
};

const FALLBACK: PersonaStyle = { bubbleBg: "bg-bubble-1", avatarBg: "bg-optimist", stripeColor: "#9b8f82" };

export function getPersonaStyle(personaId: string): PersonaStyle {
  return PERSONA_STYLES[personaId] ?? FALLBACK;
}
