"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light" | "system";
type ColorTone = "warm" | "neutral";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  tone: ColorTone;
  setTone: (tone: ColorTone) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  tone: "warm",
  setTone: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function isColorTone(value: string | null): value is ColorTone {
  return value === "warm" || value === "neutral";
}

function resolveTheme(theme: Theme) {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolveTheme(theme));
  root.dataset.themePreference = theme;
}

function applyTone(tone: ColorTone) {
  const root = window.document.documentElement;
  root.classList.toggle("neutral-tone", tone === "neutral");
  root.dataset.colorTone = tone;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "thetamac-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return defaultTheme;
    }
    const stored = localStorage.getItem(storageKey);
    return isTheme(stored) ? stored : defaultTheme;
  });
  const toneStorageKey = `${storageKey}-tone`;
  const [tone, setToneState] = useState<ColorTone>(() => {
    if (typeof window === "undefined") {
      return "warm";
    }
    const stored = localStorage.getItem(toneStorageKey);
    return isColorTone(stored) ? stored : "warm";
  });

  useEffect(() => {
    applyTheme(theme);

    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  useEffect(() => {
    applyTone(tone);
  }, [tone]);

  const setTheme = useCallback((nextTheme: Theme) => {
    localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
    setThemeState(nextTheme);
  }, [storageKey]);

  const setTone = useCallback((nextTone: ColorTone) => {
    localStorage.setItem(toneStorageKey, nextTone);
    applyTone(nextTone);
    setToneState(nextTone);
  }, [toneStorageKey]);

  const value = useMemo(
    () => ({ theme, setTheme, tone, setTone }),
    [theme, setTheme, tone, setTone]
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};




