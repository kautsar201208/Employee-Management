import Sidebar from "../_components/sidebar";
import Navbar from "../_components/navbar";
import AttendanceDirectory from "./attendance-directory";

export const metadata = {
  title: "Rekap Kehadiran | Pusbanglin",
  description: "Rekap akumulasi kehadiran pegawai berdasarkan jam kerja",
};

export default function AttendancePage() {
  return (
    <main className="dashboard-shell">
      <Sidebar activePage="attendance" />
      <section className="dashboard-main min-w-0 max-w-full">
        <Navbar />
        <div className="employees-content min-w-0 max-w-full">
          <AttendanceDirectory />
        </div>
      </section>
    </main>
  );
}
