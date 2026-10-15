"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Moon, Sun } from "lucide-react";
import { ACCESS_TOKEN_KEY, USER_EMAIL_KEY, USER_ROLE_KEY } from "@/lib/api";
import { useDashboardTheme } from "./dashboard-theme";

function getInitials(email: string) {
  const localPart = email.split("@")[0] || "";
  const parts = localPart.split(/[._-]+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
}

function subscribeToEmail() {
  return () => {};
}

function getEmailSnapshot() {
  if (typeof window === "undefined" || !sessionStorage.getItem(ACCESS_TOKEN_KEY)) return "";
  return sessionStorage.getItem(USER_EMAIL_KEY) || "";
}

function getServerEmailSnapshot() {
  return "";
}

export default function Navbar() {
  const router = useRouter();
  const email = useSyncExternalStore(subscribeToEmail, getEmailSnapshot, getServerEmailSnapshot);
  const { theme, toggleTheme } = useDashboardTheme();

  function handleLogout() {
    // Hapus sessionStorage
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(USER_EMAIL_KEY);
    sessionStorage.removeItem(USER_ROLE_KEY);

    // Hapus cookie role agar middleware tidak redirect balik ke dashboard
    document.cookie = "pusbanglin_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

    router.replace("/auth/login");
  }

  return (
    <header className="topbar home-topbar">
      <div className="topbar-right home-topbar-right">
        <button
          aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
          aria-pressed={theme === "dark"}
          className="admin-theme-toggle"
          onClick={toggleTheme}
          title={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
          type="button"
        >
          {theme === "dark" ? <Sun aria-hidden="true" size={16} /> : <Moon aria-hidden="true" size={16} />}
        </button>
        <span aria-hidden="true" className="home-profile-avatar">{email ? getInitials(email) : "HR"}</span>
        <div className="home-profile-copy"><strong>{email || "Admin HR"}</strong><span>HR Manager</span></div>
        <button aria-label="Keluar dari akun" className="home-logout-button" onClick={handleLogout} title="Keluar dari akun" type="button">
          <LogOut aria-hidden="true" size={16} />
          <span>Keluar</span>
        </button>
      </div>
    </header>
  );
}