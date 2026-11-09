import OutsourcingDirectory from "./outsourcing-directory";
import PageTransition from "../_components/page-transition";

export const metadata = {
  title: "Data Karyawan Alih Daya | Pusbanglin",
  description: "Kelola data pegawai alih daya Pusat Pengembangan dan Pelindungan Bahasa dan Sastra",
};

export default function OutsourcingPage() {
  return (
    <PageTransition>
      <div className="employees-content space-y-5">
        <OutsourcingDirectory />
      </div>
    </PageTransition>
  );
}
