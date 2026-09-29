import Sidebar from "../_components/sidebar";
import Navbar from "../_components/navbar";
import EmployeeDirectory from "./employee-directory";

export default function EmployeesPage() {
  return (
    <main className="dashboard-shell">
      <Sidebar activePage="employees" />
      <section className="dashboard-main">
        <Navbar />
        <div className="employees-content">
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