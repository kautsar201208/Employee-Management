import type { ReactNode } from "react";
import { DashboardThemeProvider } from "./_components/dashboard-theme";
import { SidebarProvider } from "./_components/sidebar-context";
import Sidebar from "./_components/sidebar";
import Navbar from "./_components/navbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardThemeProvider>
      <SidebarProvider>
        <main className="dashboard-shell">
          <Sidebar />
          <section className="dashboard-main">
            <Navbar />
            {children}
          </section>
        </main>
      </SidebarProvider>
    </DashboardThemeProvider>
  );
}
