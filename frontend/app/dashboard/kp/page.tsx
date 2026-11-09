import KPDirectory from "./kp-directory";
import PageTransition from "../_components/page-transition";

export const metadata = {
  title: "Monitoring Kenaikan Pangkat (KP) | Pusbanglin",
  description:
    "Monitoring kenaikan pangkat (KP) reguler 4 tahunan bagi jabatan pelaksana dan pemenuhan angka kredit (point) bagi jabatan fungsional dan struktural Pusat Pengembangan dan Pelindungan Bahasa dan Sastra",
};

export default function KPPage() {
  return (
    <PageTransition>
      <div className="employees-content min-w-0 max-w-full space-y-5">
        <KPDirectory />
      </div>
    </PageTransition>
  );
}
