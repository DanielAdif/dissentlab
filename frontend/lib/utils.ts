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

/**
 * @deprecated Use getPersonaStyle instead. This function is kept for backward compatibility
 * and will be removed after MessageCard is updated to use getPersonaStyle.
 */
export function getPersonaColor(personaId: string): string {
  const style = getPersonaStyle(personaId);
  // Map new style format to old color format for MessageCard compatibility
  const styleMap: Record<string, string> = {
    "bg-bubble-1": "text-optimist",
    "bg-bubble-2": "text-pessimist",
    "bg-bubble-3": "text-contrarian",
    "bg-bubble-4": "text-observer",
  };
  const textClass = styleMap[style.avatarBg] ?? "text-foreground";
  const borderClass = textClass.replace("text-", "border-");
  return `${textClass} ${borderClass}`;
}
