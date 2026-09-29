import Sidebar from "./_components/sidebar";
import Navbar from "./_components/navbar";
import DashboardData from "./_components/dashboard-data";

export default function DashboardPage() {
  return (
    <main className="dashboard-shell">
      <Sidebar activePage="dashboard" />

      <section className="dashboard-main">
        <Navbar />

          <DashboardData />
      </section>
    </main>
  );
}
