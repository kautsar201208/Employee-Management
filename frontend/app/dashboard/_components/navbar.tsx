"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ACCESS_TOKEN_KEY, USER_EMAIL_KEY } from "@/lib/api";

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

  function handleLogout() {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(USER_EMAIL_KEY);
    router.replace("/auth/login");
  }

  return (
    <header className="topbar home-topbar">
      <label className="home-search">
        <span aria-hidden="true">⌕</span>
        <input aria-label="Cari sesuatu" placeholder="Cari sesuatu..." type="search" />
      </label>
      <div className="topbar-right home-topbar-right">
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