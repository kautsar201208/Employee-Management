"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  FileUp,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type UserSidebarActivePage = "profil" | "berkas";

const USER_SIDEBAR_COLLAPSED_KEY = "pusbanglin_user_sidebar_collapsed";

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
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_SIDEBAR_COLLAPSED_KEY);
      if (stored !== null) {
        const val = stored === "true";
        setIsCollapsed(val);
        document.documentElement.style.setProperty(
          "--user-sidebar-w",
          val ? "78px" : "280px"
        );
      } else {
        document.documentElement.style.setProperty("--user-sidebar-w", "280px");
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(USER_SIDEBAR_COLLAPSED_KEY, String(next));
        document.documentElement.style.setProperty(
          "--user-sidebar-w",
          next ? "78px" : "280px"
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

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

  return (
    <>
      {/* ───────────────── 1. DESKTOP SIDEBAR ───────────────── */}
      <aside
        className={`sidebar hidden md:flex fixed left-0 top-0 z-30 h-screen flex-col bg-[#3366CC] border-r-0 shadow-none transition-all duration-200 ease-in-out ${isCollapsed ? "w-[78px]" : "w-[280px]"
          }`}
      >
        {/* Header */}
        <div
          className={`h-[82px] flex items-center border-b border-white/15 bg-[#3366CC] transition-all duration-200 shrink-0 ${isCollapsed ? "justify-center px-2" : "justify-start px-4"
            }`}
        >
          <Link
            className="flex items-center gap-3 min-w-0 flex-1"
            href="/Homepage"
            title="Pusat Pengembangan dan Pelindungan Bahasa dan Sastra"
          >
            <Image
              className="w-[48px] h-[48px] shrink-0 object-contain"
              src="/pusbanglin-logo.png"
              alt="Logo Pusbanglin"
              width={48}
              height={48}
              priority
            />
            {!isCollapsed && (
              <span className="text-[15px] font-bold text-white leading-[1.3]">
                Pusat Pengembangan dan Pelindungan Bahasa dan Sastra
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4 select-none scrollbar-thin"
          aria-label="Navigasi Pegawai"
        >
          {!isCollapsed && (
            <p className="px-4 text-[10.5px] font-bold text-white/65 tracking-[0.08em] uppercase">
              Menu Utama
            </p>
          )}

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <div key={item.id} className="relative group">
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex items-center transition-colors duration-200 ${isActive
                        ? isCollapsed
                          ? "ml-2.5 mr-0 py-2 justify-center rounded-l-2xl z-10"
                          : "ml-3 mr-0 pl-2.5 py-1.5 gap-3 rounded-l-2xl text-xs z-10"
                        : isCollapsed
                          ? "mx-2 py-2 justify-center rounded-xl text-white hover:bg-white/12"
                          : "mx-3 px-3 py-2 gap-3 rounded-xl text-white hover:bg-white/12 font-medium text-xs"
                      }`}
                  >
                    {/* ── Sliding active background (layoutId) ── */}
                    {isActive && (
                      <motion.div
                        layoutId="user-sidebar-active-pill"
                        className="absolute inset-0 -right-[1px] rounded-l-2xl pointer-events-none z-0"
                        style={{ backgroundColor: "var(--dashboard-bg)" }}
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 32,
                        }}
                        aria-hidden="true"
                      >
                        {/* Top Inverted Corner */}
                        <div
                          aria-hidden="true"
                          className="absolute -top-4 right-0 w-4 h-4 pointer-events-none z-10"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            className="w-full h-full fill-[var(--dashboard-bg)]"
                          >
                            <path d="M16 0 Q16 16 0 16 L16 16 Z" />
                          </svg>
                        </div>

                        {/* Bottom Inverted Corner */}
                        <div
                          aria-hidden="true"
                          className="absolute -bottom-4 right-0 w-4 h-4 pointer-events-none z-10"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            className="w-full h-full fill-[var(--dashboard-bg)]"
                          >
                            <path d="M0 0 Q16 0 16 16 L16 0 Z" />
                          </svg>
                        </div>
                      </motion.div>
                    )}

                    {/* Icon circle */}
                    <span
                      className={`transition-all duration-150 shrink-0 ${isActive
                          ? "w-9 h-9 rounded-full bg-[#3366CC] shadow-[0_4px_12px_rgba(51,102,204,0.35)] flex items-center justify-center text-white"
                          : "w-9 h-9 flex items-center justify-center text-white bg-transparent"
                      }`}
                    aria-hidden="true"
                    >
                    <Icon
                      size={18}
                      strokeWidth={2.2}
                      className="text-white"
                    />
                  </span>

                  {!isCollapsed && (
                    <span
                      className={`truncate text-xs ${isActive
                          ? "font-bold text-[#3366CC]"
                          : "text-white font-medium"
                        }`}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>

                  {
                isCollapsed && (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 scale-95 group-hover:scale-100"
                  >
                    {item.label}
                    <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-slate-900 rotate-45" />
                  </div>
                )
              }
                </div>
          );
            })}
        </div>
      </nav>

      {/* Footer */}
      <div className="bg-[#2A55A8] border-t border-white/15 p-3 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/10 border border-white/15">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white leading-tight truncate">
                Pusbanglin
              </p>
              <p className="text-[9.5px] text-blue-100 leading-tight truncate mt-0.5">
                Portal Pegawai
              </p>
            </div>
            <button
              onClick={toggleSidebar}
              type="button"
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors cursor-pointer shrink-0 shadow-sm"
              title="Tutup Menu"
              aria-label="Tutup Menu"
            >
              <ChevronLeft size={16} className="text-[#2A55A8]" />
            </button>
          </div>
        ) : (
          <button
            onClick={toggleSidebar}
            type="button"
            className="w-full py-2 flex items-center justify-center cursor-pointer"
            title="Buka Menu"
            aria-label="Buka Menu"
          >
            <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors shadow-sm">
              <ChevronRight size={16} className="text-[#2A55A8]" />
            </span>
          </button>
        )}
      </div>
    </aside >

      {/* ───────────────── 2. MOBILE DRAWER ───────────────── */ }
      <AnimatePresence>
  {
    mobileMenuOpen && (
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
          className="fixed top-0 left-0 bottom-0 w-[280px] bg-[#3366CC] z-50 flex flex-col justify-between shadow-2xl md:hidden overflow-y-auto"
        >
          <div className="flex flex-col">
            <div className="h-[92px] px-4 flex items-center justify-between border-b border-white/15">
              <Link
                className="flex items-center gap-3 min-w-0 flex-1 mr-2"
                href="/Homepage"
                onClick={onCloseMobileMenu}
              >
                <Image
                  src="/pusbanglin-logo.png"
                  alt="Logo Pusbanglin"
                  width={44}
                  height={44}
                  className="shrink-0 object-contain"
                />
                <span className="text-[14px] font-bold text-white leading-[1.3]">
                  Pusat Pengembangan dan Pelindungan Bahasa dan Sastra
                </span>
              </Link>
              {onCloseMobileMenu && (
                <button
                  onClick={onCloseMobileMenu}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/12 flex-shrink-0"
                  aria-label="Tutup Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <p className="px-4 pt-4 pb-2 text-[10.5px] font-bold text-white/65 tracking-[0.08em] uppercase">
              Menu Utama
            </p>

            <nav className="px-2 space-y-1" aria-label="Navigasi Pegawai Mobile">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <Link
                    key={item.id}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${isActive
                        ? "bg-white/15 text-white"
                        : "text-white hover:bg-white/12"
                      }`}
                    href={item.href}
                    onClick={onCloseMobileMenu}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive
                          ? "bg-[#3366CC] text-white shadow-[0_4px_12px_rgba(51,102,204,0.35)]"
                          : "text-white"
                        }`}
                    >
                      <Icon size={16} />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="bg-[#2A55A8] border-t border-white/15 p-3">
            <div className="p-2 rounded-xl bg-white/10 border border-white/20 text-white">
              <p className="text-xs font-bold leading-snug">
                Pusbanglin
              </p>
              <p className="text-[10px] text-white/80">
                Portal Pegawai
              </p>
            </div>
          </div>
        </motion.aside>
      </>
    )
  }
      </AnimatePresence >
    </>
  );
}
