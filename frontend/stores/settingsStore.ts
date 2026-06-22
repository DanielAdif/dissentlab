import { create } from "zustand";
import { persist } from "zustand/middleware";

type SettingsState = {
  defaultIntensity: "quick" | "standard" | "deep_dive";
  defaultProvider: string;
  defaultModel: string;
  setDefaultIntensity: (v: "quick" | "standard" | "deep_dive") => void;
  setDefaultProvider: (v: string) => void;
  setDefaultModel: (v: string) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultIntensity: "standard",
      defaultProvider: "openai",
      defaultModel: "gpt-4o-mini",
      setDefaultIntensity: (v) => set({ defaultIntensity: v }),
      setDefaultProvider: (v) => set({ defaultProvider: v }),
      setDefaultModel: (v) => set({ defaultModel: v }),
    }),
    { name: "dissentlab-settings" }
  )
);
