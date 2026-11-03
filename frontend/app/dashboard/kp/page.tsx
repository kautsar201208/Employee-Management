import Sidebar from "../_components/sidebar";
import Navbar from "../_components/navbar";
import KPDirectory from "./kp-directory";

export const metadata = {
  title: "Monitoring Kenaikan Pangkat (KP) | Pusbanglin",
  description:
    "Monitoring kenaikan pangkat (KP) reguler 4 tahunan bagi jabatan pelaksana dan pemenuhan angka kredit (point) bagi jabatan fungsional dan struktural Pusat Pengembangan dan Pelindungan Bahasa dan Sastra",
};

export default function KPPage() {
  return (
    <main className="dashboard-shell">
      <Sidebar activePage="kp" />

      <section className="dashboard-main min-w-0 max-w-full">
        <Navbar />
        <div className="employees-content min-w-0 max-w-full space-y-5">
          <KPDirectory />
        </div>
      </section>
    </main>
  );
}
