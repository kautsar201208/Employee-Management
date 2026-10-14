import Sidebar from "../_components/sidebar";
import Navbar from "../_components/navbar";
import EmployeeDirectory from "./employee-directory";

export const metadata = {
  title: "Data Karyawan | Pusbanglin",
  description: "Kelola data pegawai Pusat Pengembangan dan Pelindungan Bahasa dan Sastra",
};

export default function EmployeesPage() {
  return (
    <main className="dashboard-shell">
      <Sidebar activePage="employees" />
      <section className="dashboard-main">
        <Navbar />
        <div className="employees-content space-y-5">
          <EmployeeDirectory />
        </div>
      </section>
    </main>
  );
}