import AttendanceDirectory from "./attendance-directory";
import PageTransition from "../_components/page-transition";

export const metadata = {
  title: "Rekap Kehadiran | Pusbanglin",
  description: "Rekap akumulasi kehadiran pegawai berdasarkan jam kerja",
};

export default function AttendancePage() {
  return (
    <PageTransition>
      <div className="employees-content min-w-0 max-w-full space-y-5">
        <AttendanceDirectory />
      </div>
    </PageTransition>
  );
}
