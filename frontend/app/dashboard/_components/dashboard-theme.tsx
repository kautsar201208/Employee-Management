"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

const ADMIN_THEME_KEY = "pusbanglin_admin_theme";
const THEME_CHANGE_EVENT = "pusbanglin:admin-theme-change";
type Theme = "light" | "dark";

type DashboardThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const DashboardThemeContext = createContext<DashboardThemeContextValue | null>(null);

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

function getThemeSnapshot(): Theme {
  return localStorage.getItem(ADMIN_THEME_KEY) === "dark" ? "dark" : "light";
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  function toggleTheme() {
    localStorage.setItem(ADMIN_THEME_KEY, theme === "dark" ? "light" : "dark");
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <DashboardThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="admin-theme" data-theme={theme}>
        {children}
      </div>
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const context = useContext(DashboardThemeContext);
  if (!context) {
    throw new Error("useDashboardTheme must be used within DashboardThemeProvider");
  }
  return context;
}
