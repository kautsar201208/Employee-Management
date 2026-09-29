import { House, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type SidebarProps = {
  activePage: "dashboard" | "employees";
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
      <p className="nav-caption">Menu Utama</p>
      <nav className="side-nav" aria-label="Navigasi utama">
        <Link className={`nav-item${activePage === "dashboard" ? " active" : ""}`} href="/dashboard" aria-current={activePage === "dashboard" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true"><House size={20} strokeWidth={1.8} /></span>Beranda</Link>
        <Link className={`nav-item${activePage === "employees" ? " active" : ""}`} href="/dashboard/employees" aria-current={activePage === "employees" ? "page" : undefined}><span className="nav-symbol" aria-hidden="true"><UsersRound size={20} strokeWidth={1.8} /></span>Data Karyawan</Link>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-org-footer">
          <span><strong>Pusat Pengembangan dan Pelindungan Bahasa dan Sastra</strong><small>Sistem Kepegawaian</small></span>
        </div>
      </div>
    </aside>
  );
}