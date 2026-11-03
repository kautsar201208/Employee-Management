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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type PageId =
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

type SidebarProps = {
  activePage: PageId;
};

export default function Sidebar({ activePage }: SidebarProps) {
  return (
    <aside className="sidebar">
      <Link className="brand" href="/dashboard">
        <Image
          className="brand-logo"
          src="/pusbanglin-logo.png"
          alt="Logo Pusbanglin"
          width={40}
          height={40}
        />
        <span className="brand-name">Pusat Pengembangan dan Pelindungan Bahasa dan Sastra</span>
      </Link>
      <nav className="side-nav" aria-label="Navigasi utama">
        {MENU_GROUPS.map((group) => (
          <div key={group.title} className="nav-group">
            <p className="nav-caption">{group.title}</p>
            <div className="nav-group-items">
              {group.items.map((item) => {
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
            </div>
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-org-footer">
          <span><strong>Pusat Pengembangan dan Pelindungan Bahasa dan Sastra</strong><small>Sistem Kepegawaian</small></span>
        </div>
      </div>
    </aside>
  );
}
