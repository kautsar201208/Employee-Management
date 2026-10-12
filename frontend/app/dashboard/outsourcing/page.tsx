import Sidebar from "../_components/sidebar";
import Navbar from "../_components/navbar";
import OutsourcingDirectory from "./outsourcing-directory";

export const metadata = {
  title: "Data Karyawan Alih Daya | Pusbanglin",
  description: "Kelola data pegawai alih daya Pusat Pengembangan dan Pelindungan Bahasa dan Sastra",
};

export default function OutsourcingPage() {
  return (
    <main className="dashboard-shell">
      <Sidebar activePage="outsourcing" />

      <section className="dashboard-main">
        <Navbar />
        <OutsourcingDirectory />
      </section>
    </main>
  );
}
