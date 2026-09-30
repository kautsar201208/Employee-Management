"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, FileUp, X, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ACCESS_TOKEN_KEY, USER_EMAIL_KEY, USER_ROLE_KEY } from "@/lib/api";

export type UserSidebarActivePage = "profil" | "berkas";

interface UserSidebarProps {
  activePage?: UserSidebarActivePage;
  mobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

export default function UserSidebar({
  activePage = "profil",
  mobileMenuOpen = false,
  onCloseMobileMenu,
}: UserSidebarProps) {
  const navItems = [
    {
      id: "profil" as const,
      label: "Profil Saya",
      href: "/Homepage/Profile",
      icon: User,
    },
    {
      id: "berkas" as const,
      label: "Unggah & Kelola Berkas",
      href: "/Homepage/berkas",
      icon: FileUp,
    },
  ];

  const router = useRouter();

  function handleLogout() {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(USER_EMAIL_KEY);
    sessionStorage.removeItem(USER_ROLE_KEY);
    document.cookie = "pusbanglin_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    router.replace("/auth/login");
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP SIDEBAR (Identik dengan Dashboard: Logo, Nama Instansi, Style)  */}
      {/* ========================================================================= */}
      <aside className="sidebar">
        <Link className="brand" href="/Homepage">
          <Image
            className="brand-logo"
            src="/pusbanglin-logo.png"
            alt="Logo Pusbanglin"
            width={40}
            height={40}
          />
          <span className="brand-name">
            Pusat Pengembangan dan Pelindungan Bahasa dan Sastra
          </span>
        </Link>

        <p className="nav-caption">Menu Utama</p>

        {/* Menu Navigasi Portal Pegawai */}
        <nav className="side-nav" aria-label="Navigasi Pegawai">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <Link
                key={item.id}
                className={`nav-item${isActive ? " active" : ""}`}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="nav-symbol" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button
            onClick={handleLogout}
            className="nav-item w-full text-left text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors mb-2"
            aria-label="Keluar dari akun"
          >
            <span className="nav-symbol" aria-hidden="true">
              <LogOut size={20} strokeWidth={1.8} />
            </span>
            Keluar
          </button>
          <div className="sidebar-org-footer">
            <span>
              <strong>Pusat Pengembangan dan Pelindungan Bahasa dan Sastra</strong>
              <small>Sistem Kepegawaian</small>
            </span>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE DRAWER SIDEBAR (Tampilan Ponsel/Tablet)                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobileMenu}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 md:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 flex flex-col justify-between shadow-2xl md:hidden overflow-y-auto"
            >
              <div className="flex flex-col">
                <div className="h-[82px] px-5 flex items-center justify-between border-b border-[#E2E8F0]">
                  <Link
                    className="brand"
                    href="/Homepage"
                    onClick={onCloseMobileMenu}
                    style={{ padding: 0, border: "none", height: "auto" }}
                  >
                    <Image
                      className="brand-logo"
                      src="/pusbanglin-logo.png"
                      alt="Logo Pusbanglin"
                      width={38}
                      height={38}
                    />
                    <span className="brand-name" style={{ fontSize: "12px" }}>
                      Pusat Pengembangan dan Pelindungan Bahasa dan Sastra
                    </span>
                  </Link>
                  {onCloseMobileMenu && (
                    <button
                      onClick={onCloseMobileMenu}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 flex-shrink-0 ml-1"
                      aria-label="Tutup Menu"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <p className="nav-caption">Menu Utama</p>

                <nav className="side-nav" aria-label="Navigasi Pegawai Mobile">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;
                    return (
                      <Link
                        key={item.id}
                        className={`nav-item${isActive ? " active" : ""}`}
                        href={item.href}
                        onClick={onCloseMobileMenu}
                      >
                        <span className="nav-symbol" aria-hidden="true">
                          <Icon size={20} strokeWidth={1.8} />
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="sidebar-bottom">
                <button
                  onClick={() => { onCloseMobileMenu?.(); handleLogout(); }}
                  className="nav-item w-full text-left text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors mb-2"
                  aria-label="Keluar dari akun"
                >
                  <span className="nav-symbol" aria-hidden="true">
                    <LogOut size={20} strokeWidth={1.8} />
                  </span>
                  Keluar
                </button>
                <div className="sidebar-org-footer">
                  <span>
                    <strong>Pusat Pengembangan dan Pelindungan Bahasa dan Sastra</strong>
                    <small>Sistem Kepegawaian</small>
                  </span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
