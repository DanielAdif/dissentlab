import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PersonaStyle = {
  bubbleBg: string;
  avatarBg: string;
};

const PERSONA_STYLES: Record<string, PersonaStyle> = {
  optimist:   { bubbleBg: "bg-bubble-1", avatarBg: "bg-optimist" },
  pessimist:  { bubbleBg: "bg-bubble-2", avatarBg: "bg-pessimist" },
  contrarian: { bubbleBg: "bg-bubble-3", avatarBg: "bg-contrarian" },
  observer:   { bubbleBg: "bg-bubble-4", avatarBg: "bg-observer" },
};

const FALLBACK: PersonaStyle = { bubbleBg: "bg-bubble-1", avatarBg: "bg-optimist" };

export function getPersonaStyle(personaId: string): PersonaStyle {
  return PERSONA_STYLES[personaId] ?? FALLBACK;
}
