import EmployeeDirectory from "./employee-directory";
import PageTransition from "../_components/page-transition";

export const metadata = {
  title: "Data Karyawan | Pusbanglin",
  description: "Kelola data pegawai Pusat Pengembangan dan Pelindungan Bahasa dan Sastra",
};

export default function EmployeesPage() {
  return (
    <PageTransition>
      <div className="employees-content space-y-5">
        <EmployeeDirectory />
      </div>
    </PageTransition>
  );
}
