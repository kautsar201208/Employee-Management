import Sidebar from "./_components/sidebar";
import DashboardHeader from "./_components/dashboard-header";
import DashboardData from "./_components/dashboard-data";

export default function DashboardPage() {
  return (
    <main className="dashboard-shell">
      <Sidebar activePage="dashboard" />

      <section className="dashboard-main">
        <DashboardHeader />

          <DashboardData />
      </section>
    </main>
  );
}
