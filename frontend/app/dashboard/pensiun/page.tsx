import Sidebar from "../_components/sidebar";
import Navbar from "../_components/navbar";
import PensionDirectory from "./pension-directory";

export const metadata = {
  title: "Data Pensiun Pegawai | Pusbanglin",
  description:
    "Pemetaan batas usia pensiun (BUP) dan monitoring masa kerja pegawai Pusat Pengembangan dan Pelindungan Bahasa dan Sastra",
};

export default function PensionPage() {
  return (
    <main className="dashboard-shell">
      <Sidebar activePage="pensiun" />

      <section className="dashboard-main min-w-0 max-w-full">
        <Navbar />
        <div className="employees-content min-w-0 max-w-full space-y-5">
          <PensionDirectory />
        </div>
      </section>
    </main>
  );
}
