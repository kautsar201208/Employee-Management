import Sidebar from "../_components/sidebar";
import Navbar from "../_components/navbar";
import KGBDirectory from "./kgb-directory";

export const metadata = {
  title: "Monitoring Kenaikan Gaji Berkala (KGB) | Pusbanglin",
  description:
    "Monitoring kenaikan gaji berkala (KGB) 2 tahunan, masa kerja golongan hingga 32 tahun, dan jadwal kenaikan gaji pegawai Pusat Pengembangan dan Pelindungan Bahasa dan Sastra",
};

export default function KGBPage() {
  return (
    <main className="dashboard-shell">
      <Sidebar activePage="kgb" />

      <section className="dashboard-main min-w-0 max-w-full">
        <Navbar />
        <div className="employees-content min-w-0 max-w-full space-y-5">
          <KGBDirectory />
        </div>
      </section>
    </main>
  );
}
