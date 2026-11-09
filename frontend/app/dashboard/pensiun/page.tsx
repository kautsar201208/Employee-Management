import PensionDirectory from "./pension-directory";
import PageTransition from "../_components/page-transition";

export const metadata = {
  title: "Data Pensiun Pegawai | Pusbanglin",
  description:
    "Pemetaan batas usia pensiun (BUP) dan monitoring masa kerja pegawai Pusat Pengembangan dan Pelindungan Bahasa dan Sastra",
};

export default function PensionPage() {
  return (
    <PageTransition>
      <div className="employees-content min-w-0 max-w-full space-y-5">
        <PensionDirectory />
      </div>
    </PageTransition>
  );
}
