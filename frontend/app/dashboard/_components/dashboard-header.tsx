import Image from "next/image";

export default function DashboardHeader() {
  return (
    <header className="topbar home-topbar">
      <label className="home-search">
        <span aria-hidden="true">⌕</span>
        <input aria-label="Cari sesuatu" placeholder="Cari sesuatu..." type="search" />
      </label>
      <div className="topbar-right home-topbar-right">
        <button className="notification" aria-label="Notifikasi" type="button">♧</button>
        <Image
          className="home-profile-image"
          src="/stitch-assets/hr-admin.png"
          alt=""
          width={40}
          height={40}
        />
        <div className="home-profile-copy"><strong>Admin HR</strong><span>HR Manager</span></div>
      </div>
    </header>
  );
}