import type { ReactNode } from "react";
import { DashboardThemeProvider } from "./_components/dashboard-theme";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardThemeProvider>{children}</DashboardThemeProvider>;
}
