"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const SIDEBAR_COLLAPSED_KEY = "pusbanglin_sidebar_collapsed";

interface SidebarContextValue {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  isCollapsed: false,
  toggleSidebar: () => {},
  setCollapsed: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored !== null) {
        setIsCollapsed(stored === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // ignore
    }
  };

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, toggleSidebar, setCollapsed }}
    >
      <div
        className={`dashboard-root min-h-screen ${
          isCollapsed ? "sidebar-collapsed" : ""
        }`}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

