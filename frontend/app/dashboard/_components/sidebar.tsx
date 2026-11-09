"use client";

import type { ElementType } from "react";
import {
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  FolderKanban,
  House,
  TrendingUp,
  UserCheck,
  UsersRound,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSidebar } from "./sidebar-context";

export type PageId =
  | "dashboard"
  | "employees"
  | "documents"
  | "outsourcing"
  | "pensiun"
  | "attendance"
  | "kgb"
  | "kp";

type MenuItem = {
  id: PageId;
  label: string;
  href: string;
  icon: ElementType;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

const MENU_GROUPS: MenuGroup[] = [
  {
    title: "MENU UTAMA",
    items: [
      {
        id: "dashboard",
        label: "Beranda",
        href: "/dashboard",
        icon: House,
      },
    ],
  },
  {
    title: "DATA KEPEGAWAIAN",
    items: [
      {
        id: "employees",
        label: "Data Karyawan",
        href: "/dashboard/employees",
        icon: UsersRound,
      },
      {
        id: "outsourcing",
        label: "Data Alih Daya",
        href: "/dashboard/outsourcing",
        icon: UserCheck,
      },
      {
        id: "pensiun",
        label: "Data Pensiun",
        href: "/dashboard/pensiun",
        icon: CalendarClock,
      },
      {
        id: "documents",
        label: "Berkas Pegawai",
        href: "/dashboard/documents",
        icon: FolderKanban,
      },
    ],
  },
  {
    title: "KEHADIRAN",
    items: [
      {
        id: "attendance",
        label: "Rekap Kehadiran",
        href: "/dashboard/attendance",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    title: "KARIER & KESEJAHTERAAN",
    items: [
      {
        id: "kgb",
        label: "Monitoring KGB",
        href: "/dashboard/kgb",
        icon: CalendarDays,
      },
      {
        id: "kp",
        label: "Monitoring KP",
        href: "/dashboard/kp",
        icon: TrendingUp,
      },
    ],
  },
];

/** Derive the active PageId from the current pathname */
function useActivePage(): PageId {
  const pathname = usePathname();
  if (pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/dashboard/employees")) return "employees";
  if (pathname.startsWith("/dashboard/outsourcing")) return "outsourcing";
  if (pathname.startsWith("/dashboard/pensiun")) return "pensiun";
  if (pathname.startsWith("/dashboard/documents")) return "documents";
  if (pathname.startsWith("/dashboard/attendance")) return "attendance";
  if (pathname.startsWith("/dashboard/kgb")) return "kgb";
  if (pathname.startsWith("/dashboard/kp")) return "kp";
  return "dashboard";
}

// Keep the prop for backward compatibility but it is now optional / ignored
type SidebarProps = {
  activePage?: PageId;
};

export default function Sidebar(_props: SidebarProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const activePage = useActivePage();

  return (
    <aside
      className={`sidebar fixed left-0 top-0 z-30 h-screen flex flex-col bg-[#3366CC] border-r-0 shadow-none transition-all duration-200 ease-in-out ${isCollapsed ? "w-[78px]" : "w-[280px]"
        }`}
    >
      {/* ───────────────── 1. HEADER / LOGO AREA ───────────────── */}
      <div
        className={`h-[82px] flex items-center border-b border-white/15 bg-[#3366CC] transition-all duration-200 shrink-0 ${isCollapsed ? "justify-center px-2" : "justify-start px-4"
          }`}
      >
        <Link
          className="flex items-center gap-3 min-w-0 flex-1"
          href="/dashboard"
          title="Pusat Pengembangan dan Pelindungan Bahasa dan Sastra"
        >
          {/* Round Pusbanglin emblem shown directly on the blue background */}
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

      {/* ───────────────── 2. GROUPED MENU ITEMS ───────────────── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4 select-none scrollbar-thin"
        aria-label="Navigasi utama"
      >
        {MENU_GROUPS.map((group, groupIdx) => (
          <div key={group.title} className="space-y-1">
            {/* Section Label or Divider */}
            {!isCollapsed ? (
              <p className="px-4 text-[10.5px] font-bold text-white/65 tracking-[0.08em] uppercase">
                {group.title}
              </p>
            ) : groupIdx > 0 ? (
              <div className="mx-3 my-2 border-t border-white/15" />
            ) : null}

            <div className="space-y-1">
              {group.items.map((item) => {
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
                      {/* ── Sliding active background (layoutId animates smoothly between items) ── */}
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-pill"
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

                      {/* Icon container */}
                      <span
                        className={`relative z-10 transition-all duration-200 shrink-0 ${isActive
                            ? "w-9 h-9 rounded-full bg-[#3366CC] shadow-[0_4px_12px_rgba(51,102,204,0.35)] flex items-center justify-center text-white"
                            : "w-9 h-9 flex items-center justify-center text-white bg-transparent"
                        }`}
                      aria-hidden="true"
                      >
                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2.2 : 1.9}
                        className="text-white"
                      />
                    </span>

                    {/* Menu Label */}
                    {!isCollapsed && (
                      <span
                        className={`relative z-10 truncate text-xs transition-colors duration-200 ${isActive
                            ? "font-bold text-[#3366CC]"
                            : "text-white font-medium"
                          }`}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>

                    {/* Tooltip on collapsed state */ }
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
          </div>
        ))}
    </nav>

      {/* ───────────────── 3. FOOTER ───────────────── */ }
  <div className="bg-[#2A55A8] border-t border-white/15 p-3 shrink-0">
    {!isCollapsed ? (
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/10 border border-white/20">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-white leading-tight truncate">
            Pusbanglin
          </p>
          <p className="text-[9.5px] text-white/80 leading-tight truncate mt-0.5">
            Sistem Kepegawaian
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
  );
}
