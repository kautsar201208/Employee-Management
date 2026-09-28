import Sidebar from "../_components/sidebar";
import DashboardHeader from "../_components/dashboard-header";
import EmployeeDirectory from "./employee-directory";

const employeeStats = [
  { label: "Total Karyawan", value: "128", note: "+4% bulan ini", icon: "♙" },
  { label: "Pegawai Tetap", value: "84", note: "65.6% dari total", icon: "✓" },
  { label: "Kontrak (PKWT)", value: "36", note: "28.1% dari total", icon: "▤" },
  { label: "Magang & Internship", value: "8", note: "6.3% dari total", icon: "▦" },
];

export default function EmployeesPage() {
  return (
    <main className="dashboard-shell">
      <Sidebar activePage="employees" />
      <section className="dashboard-main">
        <DashboardHeader />
        <div className="employees-content">
          <section className="employees-summary-grid" aria-label="Ringkasan data karyawan">
            {employeeStats.map((stat) => (
              <article className="employees-summary-card" key={stat.label}>
                <div>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <small>{stat.note}</small>
                </div>
                <span className="employees-summary-icon" aria-hidden="true">{stat.icon}</span>
              </article>
            ))}
          </section>

          <header className="employees-heading">
            <div>
              <h1>Data Karyawan</h1>
              <p>Kelola seluruh data karyawan secara terpusat.</p>
            </div>
            <button className="primary-button" type="button"><span aria-hidden="true">+</span>Tambah Karyawan</button>
          </header>

          <EmployeeDirectory />
        </div>
      </section>
    </main>
  );
}