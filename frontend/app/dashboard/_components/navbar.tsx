"use client";

import { useSyncExternalStore } from "react";
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
  const email = useSyncExternalStore(subscribeToEmail, getEmailSnapshot, getServerEmailSnapshot);

  return (
    <header className="topbar home-topbar">
      <label className="home-search">
        <span aria-hidden="true">⌕</span>
        <input aria-label="Cari sesuatu" placeholder="Cari sesuatu..." type="search" />
      </label>
      <div className="topbar-right home-topbar-right">
        <button className="notification" aria-label="Notifikasi" type="button">♧</button>
        <span aria-hidden="true" className="home-profile-avatar">{email ? getInitials(email) : "HR"}</span>
        <div className="home-profile-copy"><strong>{email || "Admin HR"}</strong><span>HR Manager</span></div>
      </div>
    </header>
  );
}