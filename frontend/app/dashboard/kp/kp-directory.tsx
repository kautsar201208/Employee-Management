"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Award,
  ShieldAlert,
  Info,
  X,
  TrendingUp,
  Briefcase,
  HelpCircle,
  FileCheck2,
  Check,
  ChevronDown,
  Edit3,
  Sparkles,
  Layers,
  ArrowUpRight,
  Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SkeletonTableRow } from "../_components/skeleton";
import {
  ACCESS_TOKEN_KEY,
  getEmployees,
  type ApiEmployee,
} from "@/lib/api";
import {
  processEmployeeKP,
  setStoredPoint,
  getStoredPoint,
  type KPRecord,
  type SkemaKP,
} from "@/lib/kp";

const ROWS_PER_PAGE = 25;

function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function KPEmployeeAvatar({
  imageUrl,
  name,
  className = "w-9 h-9 rounded-full bg-blue-100 text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/60 shadow-2xs",
  imageSize = 48,
}: {
  imageUrl: string | null | undefined;
  name: string;
  className?: string;
  imageSize?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!imageUrl || imageFailed) {
    return (
      <div aria-hidden="true" className={className}>
        {getInitials(name)}
      </div>
    );
  }

  return (
    <Image
      alt={`Foto profil ${name}`}
      className={`${className} object-cover`}
      height={imageSize}
      onError={() => setImageFailed(true)}
      src={imageUrl}
      unoptimized
      width={imageSize}
    />
  );
}

export default function KPDirectory() {
  const shouldReduceMotion = useReducedMotion();

  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Custom points override map (persisted in localStorage)
  const [customPointsMap, setCustomPointsMap] = useState<Record<string, number>>({});

  // Filters
  const [query, setQuery] = useState("");
  const [skemaFilter, setSkemaFilter] = useState<"all" | SkemaKP>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [timKerjaFilter, setTimKerjaFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [selectedRecord, setSelectedRecord] = useState<KPRecord | null>(null);
  const [pointModalRecord, setPointModalRecord] = useState<KPRecord | null>(null);
  const [pointInputValue, setPointInputValue] = useState<string>("");
  const [pointSaveMessage, setPointSaveMessage] = useState<string>("");

  // Panduan Skema Collapsible
  const [showRuleInfo, setShowRuleInfo] = useState(false);

  const fetchEmployees = async () => {
    setIsLoading(true);
    setError("");
    const token =
      typeof window !== "undefined"
        ? sessionStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY)
        : null;

    if (!token) {
      setIsLoading(false);
      setError("Silakan masuk untuk melihat data monitoring kenaikan pangkat (KP).");
      return;
    }

    try {
      const data = await getEmployees(token);
      setEmployees(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Proses seluruh pegawai ke dalam KPRecord
  const kpRecords = useMemo(() => {
    return employees.map((emp) => processEmployeeKP(emp, new Date(), customPointsMap));
  }, [employees, customPointsMap]);

  // Statistik Ringkasan
  const stats = useMemo(() => {
    const total = kpRecords.length;
    let pelaksanaTotal = 0;
    let pelaksanaSudahWaktunya = 0;
    let pelaksanaSegera = 0;
    let pelaksanaMaksimalPendidikan = 0;
    let pelaksanaSatuTingkatTerakhir = 0;

    let nonPelaksanaTotal = 0;
    let pointTerpenuhi = 0;
    let pointKurang = 0;

    for (const r of kpRecords) {
      if (r.isPelaksana) {
        pelaksanaTotal++;
        if (r.pelaksanaData?.status === "sudah_waktunya") {
          pelaksanaSudahWaktunya++;
        } else if (r.pelaksanaData?.status === "segera") {
          pelaksanaSegera++;
        } else if (r.pelaksanaData?.status === "pangkat_maksimal_pendidikan") {
          pelaksanaMaksimalPendidikan++;
        } else if (r.pelaksanaData?.status === "satu_tingkat_terakhir") {
          pelaksanaSatuTingkatTerakhir++;
        }
      } else {
        nonPelaksanaTotal++;
        if (r.pointData?.status === "terpenuhi") {
          pointTerpenuhi++;
        } else {
          pointKurang++;
        }
      }
    }

    return {
      total,
      pelaksanaTotal,
      pelaksanaSudahWaktunya,
      pelaksanaSegera,
      pelaksanaMaksimalPendidikan,
      pelaksanaSatuTingkatTerakhir,
      nonPelaksanaTotal,
      pointTerpenuhi,
      pointKurang,
    };
  }, [kpRecords]);

  // Filter Data
  const filteredRecords = useMemo(() => {
    return kpRecords.filter((rec) => {
      // 1. Skema / Jenis Jabatan Filter
      if (skemaFilter !== "all" && rec.skemaKP !== skemaFilter) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "sudah_waktunya" && rec.pelaksanaData?.status !== "sudah_waktunya") {
          return false;
        }
        if (statusFilter === "segera" && rec.pelaksanaData?.status !== "segera") {
          return false;
        }
        if (statusFilter === "pangkat_maksimal_pendidikan" && rec.pelaksanaData?.status !== "pangkat_maksimal_pendidikan") {
          return false;
        }
        if (statusFilter === "satu_tingkat_terakhir" && rec.pelaksanaData?.status !== "satu_tingkat_terakhir") {
          return false;
        }
        if (statusFilter === "terpenuhi" && rec.pointData?.status !== "terpenuhi") {
          return false;
        }
        if (statusFilter === "kurang" && rec.pointData?.status === "terpenuhi") {
          return false;
        }
      }

      // 3. Tim Kerja Filter
      if (timKerjaFilter !== "all") {
        if (rec.employee.tim_kerja !== timKerjaFilter) {
          return false;
        }
      }

      // 4. Text Query
      if (query.trim()) {
        const q = query.toLowerCase();
        const nama = (rec.employee.nama_lengkap || "").toLowerCase();
        const nip = (rec.employee.nip || "").toLowerCase();
        const jabatan = (rec.employee.jabatan || "").toLowerCase();
        const pangkat = (rec.employee.pangkat_golongan || "").toLowerCase();
        if (
          !nama.includes(q) &&
          !nip.includes(q) &&
          !jabatan.includes(q) &&
          !pangkat.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [kpRecords, skemaFilter, statusFilter, timKerjaFilter, query]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ROWS_PER_PAGE));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredRecords.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  const handleOpenPointModal = (rec: KPRecord) => {
    setPointModalRecord(rec);
    const identifier = String(rec.employee.nip || rec.employee.id || "");
    const current = rec.pointData?.currentPoint ?? 0;
    setPointInputValue(current.toString());
    setPointSaveMessage("");
  };

  const handleSavePoint = () => {
    if (!pointModalRecord) return;
    const identifier = String(pointModalRecord.employee.nip || pointModalRecord.employee.id || "");
    const val = parseFloat(pointInputValue);
    if (isNaN(val) || val < 0) {
      setPointSaveMessage("Mohon masukkan angka point yang valid (≥ 0)");
      return;
    }

    setStoredPoint(identifier, val);
    setCustomPointsMap((prev) => ({
      ...prev,
      [identifier]: val,
    }));

    setPointSaveMessage("Point berhasil disimpan!");
    setTimeout(() => {
      setPointModalRecord(null);
      setPointSaveMessage("");
      // Update selected record jika sedang terbuka
      if (selectedRecord && (selectedRecord.employee.nip === pointModalRecord.employee.nip)) {
        setSelectedRecord(processEmployeeKP(selectedRecord.employee, new Date(), { [identifier]: val }));
      }
    }, 600);
  };

  // Ekspor CSV
  const handleExportCSV = () => {
    const headers = [
      "No",
      "Nama Lengkap",
      "NIP",
      "Jabatan",
      "Jenis Jabatan",
      "Skema KP",
      "Pangkat/Golongan",
      "TMT Golongan",
      "Keterangan/Progress",
      "Status Kenaikan Pangkat",
    ];

    const rows = filteredRecords.map((r, i) => {
      let progressStr = "";
      if (r.isPelaksana) {
        progressStr = `KP Selanjutnya: ${r.pelaksanaData?.kpSelanjutnyaFormatted || "—"} (${r.pelaksanaData?.sisaWaktu?.text || "—"})`;
      } else {
        progressStr = `Point: ${r.pointData?.currentPoint || 0}/${r.pointData?.targetPoint || 0} (${r.pointData?.persentase || 0}%) - Sisa: ${r.pointData?.sisaPoint || 0}`;
      }

      return [
        i + 1,
        `"${(r.employee.nama_lengkap || "").replace(/"/g, '""')}"`,
        `'${r.employee.nip || ""}`,
        `"${(r.employee.jabatan || "").replace(/"/g, '""')}"`,
        `"${r.employee.jenis_jabatan || "—"}"`,
        r.isPelaksana ? "Reguler (4 Tahun)" : "Sistem Point (Angka Kredit)",
        `"${r.employee.pangkat_golongan || "—"}"`,
        r.tmtGolonganTerakhirFormatted,
        `"${progressStr}"`,
        `"${r.statusBadge.label}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Monitoring_Kenaikan_Pangkat_Pusbanglin_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-5">
      {/* HEADER SECTION */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Link
              href="/dashboard"
              className="hover:text-[#2563EB] transition-colors"
            >
              Dashboard
            </Link>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="font-semibold text-slate-800">
              Monitoring KP
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Monitoring Kenaikan Pangkat (KP)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pemantauan kenaikan pangkat reguler setiap 4 tahun bagi Jabatan Pelaksana, serta pemenuhan Point (Angka Kredit) bagi Jabatan Fungsional dan Struktural.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setShowRuleInfo((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs cursor-pointer"
            title="Informasi aturan kenaikan pangkat"
            type="button"
          >
            <HelpCircle size={14} className="text-[#2563EB]" />
            <span>Panduan Aturan</span>
          </button>
          <button
            onClick={fetchEmployees}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
            title="Perbarui Data"
            type="button"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-slate-600" : "text-slate-600"} />
            <span>Muat Ulang</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all disabled:opacity-60 cursor-pointer"
            type="button"
          >
            <Download size={14} className="text-white" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </header>

      {/* Collapsible Info Box: Aturan KP */}
      <AnimatePresence>
        {showRuleInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-slate-800 text-xs sm:text-sm shadow-2xs">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base">
                  <TrendingUp size={16} className="text-[#2563EB]" />
                  <span>Ketentuan &amp; Panduan Aturan Kenaikan Pangkat (KP)</span>
                </div>
                <button
                  onClick={() => setShowRuleInfo(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                  aria-label="Tutup panduan"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/60 text-xs text-slate-700 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                    <Clock size={16} className="text-blue-600" />
                    <span>1. Jabatan Pelaksana (Sistem Waktu 4 Tahun)</span>
                  </div>
                  <p>
                    Kenaikan pangkat reguler bagi pegawai Pelaksana diberikan <strong>setiap 4 tahun sekali</strong>{" "}
                    dihitung sejak TMT Pangkat/Golongan terakhir.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li><strong>Sudah Waktunya</strong>: Masa kerja dalam pangkat sudah mencapai ≥ 4 tahun.</li>
                    <li><strong>Segera</strong>: Sisa waktu kurang dari 6 bulan menuju 4 tahun (berkas harus disiapkan).</li>
                    <li><strong>Periode BKN</strong>: Diusulkan pada 6 periode (Februari, April, Juni, Agustus, Oktober, Desember).</li>
                    <li><strong>Batas Pendidikan</strong>: SMA (maks. III/b), D3 (maks. III/c), S1 (maks. III/d), S2 (maks. IV/a), S3 (maks. IV/b). Tidak dapat naik pangkat lagi setelah batas maksimal tercapai, kecuali 1 kenaikan terakhir menjelang pensiun.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-xs text-slate-700 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                    <Award size={16} className="text-emerald-600" />
                    <span>2. Selain Pelaksana (Sistem Point / Angka Kredit)</span>
                  </div>
                  <p>
                    Bagi pegawai Fungsional dan Struktural, kenaikan pangkat <strong>tidak berbasis waktu 4 tahun</strong>,{" "}
                    melainkan wajib memenuhi <strong>Point Angka Kredit Kumulatif (PAK)</strong>.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li><strong>Target Point</strong>: Ahli Pertama (50 pt), Ahli Muda (100 pt), Ahli Madya (150 pt), Ahli Utama (200 pt).</li>
                    <li><strong>Point Terpenuhi (≥100%)</strong>: Siap diajukan kenaikan pangkat fungsional.</li>
                    <li>Admin dapat mengklik <strong>Kelola Point</strong> untuk memperbarui perolehan angka kredit pegawai.</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ringkasan Statistik (4 Cards Responsif: 4 kolom di layar lebar, 2 di tablet, 1 di mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {/* Card 1: Total Pegawai */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors min-w-0">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Total Pegawai</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600 shrink-0">
              <Users size={15} />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.total}</div>
          <p className="text-[11px] text-slate-500 truncate">
            <span className="font-semibold text-slate-700">{stats.pelaksanaTotal}</span> Pelaksana &bull;{" "}
            <span className="font-semibold text-slate-700">{stats.nonPelaksanaTotal}</span> Non-Pelaksana
          </p>
        </div>

        {/* Card 2: Pelaksana Sudah Waktunya */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors min-w-0">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Pelaksana: Waktunya KP</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-rose-600 shrink-0">
              <ShieldAlert size={15} />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.pelaksanaSudahWaktunya}</div>
          <p className="text-[11px] text-slate-500 flex items-center truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 shrink-0" />
            Masa kerja ≥ 4 thn (Siap proses)
          </p>
        </div>

        {/* Card 3: Pelaksana Segera */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors min-w-0">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Pelaksana: Segera</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-amber-600 shrink-0">
              <Clock size={15} />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.pelaksanaSegera}</div>
          <p className="text-[11px] text-slate-500 flex items-center truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 shrink-0" />
            Jatuh tempo &lt; 6 bln ke depan
          </p>
        </div>

        {/* Card 4: Point Terpenuhi */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors min-w-0">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Point Terpenuhi</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-emerald-600 shrink-0">
              <Award size={15} />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.pointTerpenuhi}</div>
          <p className="text-[11px] text-slate-500 flex items-center truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
            Point cukup (Siap KP) &bull; {stats.pointKurang} Belum Cukup
          </p>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 md:p-5 space-y-3 min-w-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
          {/* Tab Skema KP */}
          <div className="flex flex-wrap items-center p-1 bg-slate-100 rounded-xl gap-1 max-w-full">
            <button
              onClick={() => {
                setSkemaFilter("all");
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                skemaFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua Skema ({kpRecords.length})
            </button>
            <button
              onClick={() => {
                setSkemaFilter("reguler_waktu");
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                skemaFilter === "reguler_waktu"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pelaksana (Waktu 4 Thn) ({stats.pelaksanaTotal})
            </button>
            <button
              onClick={() => {
                setSkemaFilter("angka_kredit");
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                skemaFilter === "angka_kredit"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Fungsional/Struktural (Point) ({stats.nonPelaksanaTotal})
            </button>
          </div>

          {/* Search Box - Lebar 100% di mobile, max-width sekitar 320px di layar lebar */}
          <div className="relative w-full sm:w-auto sm:max-w-[320px] flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama pegawai, NIP..."
              className="w-full pl-8 pr-7 py-1.5 sm:py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Baris Kedua (Status) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2.5 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium whitespace-nowrap mr-0.5">Filter Status:</span>

          <button
            onClick={() => {
              setStatusFilter("all");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition whitespace-nowrap ${
              statusFilter === "all"
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Semua Status
          </button>

          <button
            onClick={() => {
              setStatusFilter("sudah_waktunya");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition whitespace-nowrap ${
              statusFilter === "sudah_waktunya"
                ? "bg-rose-600 text-white border-rose-600"
                : "border-rose-200 text-rose-700 hover:bg-rose-50"
            }`}
          >
            Sudah Waktunya ({stats.pelaksanaSudahWaktunya})
          </button>

          <button
            onClick={() => {
              setStatusFilter("segera");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition whitespace-nowrap ${
              statusFilter === "segera"
                ? "bg-amber-600 text-white border-amber-600"
                : "border-amber-200 text-amber-700 hover:bg-amber-50"
            }`}
          >
            Segera &lt; 6 Bln ({stats.pelaksanaSegera})
          </button>

          <button
            onClick={() => {
              setStatusFilter("pangkat_maksimal_pendidikan");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition whitespace-nowrap ${
              statusFilter === "pangkat_maksimal_pendidikan"
                ? "bg-slate-700 text-white border-slate-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Batas Maks. Pendidikan ({stats.pelaksanaMaksimalPendidikan})
          </button>

          <button
            onClick={() => {
              setStatusFilter("satu_tingkat_terakhir");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition whitespace-nowrap ${
              statusFilter === "satu_tingkat_terakhir"
                ? "bg-amber-600 text-white border-amber-600"
                : "border-amber-200 text-amber-700 hover:bg-amber-50"
            }`}
          >
            1 Kenaikan Terakhir ({stats.pelaksanaSatuTingkatTerakhir})
          </button>

          <button
            onClick={() => {
              setStatusFilter("terpenuhi");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition whitespace-nowrap ${
              statusFilter === "terpenuhi"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            Point Terpenuhi ({stats.pointTerpenuhi})
          </button>

          <button
            onClick={() => {
              setStatusFilter("kurang");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition whitespace-nowrap ${
              statusFilter === "kurang"
                ? "bg-sky-600 text-white border-sky-600"
                : "border-sky-200 text-sky-700 hover:bg-sky-50"
            }`}
          >
            Point Belum Cukup ({stats.pointKurang})
          </button>

          {(skemaFilter !== "all" || statusFilter !== "all" || query) && (
            <button
              onClick={() => {
                setSkemaFilter("all");
                setStatusFilter("all");
                setQuery("");
                setCurrentPage(1);
              }}
              className="sm:ml-auto text-blue-600 hover:underline font-medium text-xs whitespace-nowrap py-1"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* Tabel Data Pegawai KP */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col w-full min-w-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] min-h-[380px] w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <tr className="border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-12 min-w-[48px] max-w-[48px] text-center whitespace-nowrap bg-slate-50 sticky left-0 z-30 shadow-[1px_0_0_0_#e2e8f0]">No</th>
                <th className="py-3 px-3.5 min-w-[200px] sm:min-w-[220px] whitespace-nowrap bg-slate-50 sticky left-12 z-30 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">Pegawai</th>
                <th className="py-3 px-3.5 min-w-[190px] whitespace-nowrap bg-slate-50">Jabatan &amp; Skema</th>
                <th className="py-3 px-3.5 min-w-[140px] whitespace-nowrap bg-slate-50">Pangkat &amp; TMT</th>
                <th className="py-3 px-3.5 min-w-[230px] whitespace-nowrap bg-slate-50">Progres Kenaikan Pangkat</th>
                <th className="py-3 px-3.5 min-w-[160px] whitespace-nowrap bg-slate-50">Status</th>
                <th className="py-3 px-3 w-24 text-center whitespace-nowrap bg-slate-50">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonTableRow key={i} cols={7} hasAvatar />
                ))
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-rose-500">
                    <div className="inline-flex flex-col items-center gap-2">
                      <AlertTriangle size={24} />
                      <p className="font-semibold">{error}</p>
                      <button
                        onClick={fetchEmployees}
                        className="mt-2 px-3 py-1 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 font-medium"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="inline-flex flex-col items-center gap-2">
                      <Info size={28} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">Tidak ada pegawai yang sesuai dengan filter.</p>
                      <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau reset filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec, index) => {
                  const rowNumber = (currentPage - 1) * ROWS_PER_PAGE + index + 1;
                  const emp = rec.employee;

                  return (
                    <tr
                      key={emp.id || emp.nip || index}
                      className="group hover:bg-slate-50/70 transition-colors"
                    >
                      {/* No - Sticky */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-medium whitespace-nowrap sticky left-0 z-10 bg-white group-hover:bg-slate-50 transition-colors w-12 min-w-[48px] max-w-[48px] shadow-[1px_0_0_0_#e2e8f0]">
                        {rowNumber}
                      </td>

                      {/* Pegawai - Sticky */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap sticky left-12 z-10 bg-white group-hover:bg-slate-50 transition-colors min-w-[200px] sm:min-w-[220px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-2.5">
                          <KPEmployeeAvatar
                            imageUrl={emp.profile_image}
                            name={emp.nama_lengkap || "Tanpa Nama"}
                            className="w-8 h-8 rounded-full bg-blue-100 text-[#2563EB] font-bold text-[11px] flex items-center justify-center shrink-0 border border-blue-200/60 shadow-2xs"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 whitespace-nowrap text-xs">
                              {emp.nama_lengkap || "—"}
                            </p>
                            <p className="text-[10.5px] text-slate-500 font-mono whitespace-nowrap">
                              NIP: {emp.nip || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Jabatan & Skema - Tampil full kesamping tanpa wrap */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <p className="font-medium text-slate-800 whitespace-nowrap text-xs">
                          {emp.jabatan || "—"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                          {rec.isPelaksana ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 whitespace-nowrap">
                              <Clock size={9} />
                              Waktu (4 Thn)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 whitespace-nowrap">
                              <Award size={9} />
                              Point (AK)
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                            {emp.jenis_jabatan || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Pangkat & TMT */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-800 whitespace-nowrap text-xs">
                          {emp.pangkat_golongan || "—"}
                        </p>
                        <p className="text-[10.5px] text-slate-500 mt-0.5 whitespace-nowrap">
                          TMT: {rec.tmtGolonganTerakhirFormatted}
                        </p>
                      </td>

                      {/* Progres Kenaikan Pangkat */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {rec.isPelaksana && rec.pelaksanaData ? (
                          <div className="space-y-0.5">
                            {rec.isAtPangkatCeiling ? (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className={rec.isSatuTingkatTerakhir ? "text-amber-700 font-semibold" : "text-slate-500 font-medium"}>
                                  {rec.isSatuTingkatTerakhir ? "⚠ 1 Kenaikan Terakhir" : "⛔ Batas Pangkat Pendidikan"}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-[11px] gap-3">
                                <span className="text-slate-600 font-medium whitespace-nowrap">
                                  KP: {rec.pelaksanaData.kpSelanjutnyaFormatted}
                                </span>
                                <span className="font-semibold text-slate-700 whitespace-nowrap">
                                  {rec.pelaksanaData.sisaWaktu?.text}
                                </span>
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500 whitespace-nowrap">
                              {rec.isAtPangkatCeiling
                                ? `Batas: ${rec.pangkatMaksimalPendidikan} · ${rec.employee.jenjang_pendidikan || "—"}`
                                : `Masa kerja: ${rec.pelaksanaData.masaKerjaGolongan?.text || "—"}`}
                            </div>
                          </div>
                        ) : rec.pointData ? (
                          <div className="space-y-1 min-w-[200px]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-800 whitespace-nowrap">
                                {rec.pointData.currentPoint} / {rec.pointData.targetPoint} Point
                              </span>
                              <span className="font-bold text-slate-700">
                                {rec.pointData.persentase}%
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  rec.pointData.persentase >= 100
                                    ? "bg-emerald-500"
                                    : rec.pointData.persentase >= 75
                                    ? "bg-blue-500"
                                    : "bg-amber-500"
                                }`}
                                style={{ width: `${rec.pointData.persentase}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span className="whitespace-nowrap">
                                {rec.pointData.sisaPoint > 0
                                  ? `Kurang ${rec.pointData.sisaPoint} pt`
                                  : "Target tercapai"}
                              </span>
                              <button
                                onClick={() => handleOpenPointModal(rec)}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-semibold inline-flex items-center gap-0.5 whitespace-nowrap"
                              >
                                <Edit3 size={10} />
                                Kelola Point
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          {rec.statusBadge.color === "rose" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs whitespace-nowrap">
                              <ShieldAlert size={11} className="text-rose-600" />
                              {rec.statusBadge.label}
                            </span>
                          )}
                          {rec.statusBadge.color === "amber" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                              <AlertTriangle size={11} className="text-amber-600" />
                              {rec.statusBadge.label}
                            </span>
                          )}
                          {rec.statusBadge.color === "emerald" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              {rec.statusBadge.label}
                            </span>
                          )}
                          {rec.statusBadge.color === "blue" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                              <Clock size={11} className="text-blue-600" />
                              {rec.statusBadge.label}
                            </span>
                          )}
                          {rec.statusBadge.color === "slate" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 whitespace-nowrap">
                              <Info size={11} className="text-slate-500" />
                              {rec.statusBadge.label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setSelectedRecord(rec)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition"
                          >
                            Detail
                          </button>
                          {!rec.isPelaksana && (
                            <button
                              onClick={() => handleOpenPointModal(rec)}
                              title="Update Angka Kredit"
                              className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 transition"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Menampilkan{" "}
            <strong>
              {filteredRecords.length > 0 ? (currentPage - 1) * ROWS_PER_PAGE + 1 : 0}
            </strong>{" "}
            -{" "}
            <strong>
              {Math.min(currentPage * ROWS_PER_PAGE, filteredRecords.length)}
            </strong>{" "}
            dari <strong>{filteredRecords.length}</strong> pegawai
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Halaman Selanjutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Detail Pegawai & Kenaikan Pangkat */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <TrendingUp size={20} />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Detail Kenaikan Pangkat (KP)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Pusat Pengembangan dan Pelindungan Bahasa dan Sastra
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 md:p-6 space-y-5">
                {/* Profil Singkat */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <KPEmployeeAvatar
                    imageUrl={selectedRecord.employee.profile_image}
                    name={selectedRecord.employee.nama_lengkap || "Tanpa Nama"}
                    className="w-14 h-14 rounded-full bg-blue-100 text-[#2563EB] font-bold text-base flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs"
                    imageSize={64}
                  />
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-base">
                      {selectedRecord.employee.nama_lengkap || "—"}
                    </h3>
                    <p className="text-xs text-slate-600 font-mono">
                      NIP: {selectedRecord.employee.nip || "—"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                      <span className="px-2 py-0.5 rounded bg-blue-100/70 text-blue-800 font-semibold">
                        {selectedRecord.employee.pangkat_golongan || "—"}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-medium">
                        {selectedRecord.employee.jenis_jabatan || "—"}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-medium">
                        {selectedRecord.employee.tim_kerja || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Panel Aturan yang Berlaku */}
                {selectedRecord.isPelaksana ? (
                  <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="text-blue-600" size={18} />
                        <h4 className="font-bold text-blue-900 text-sm">
                          Skema Kenaikan Pangkat Pelaksana (Waktu 4 Tahun)
                        </h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        Reguler
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-blue-100 space-y-1">
                        <span className="text-slate-500 font-medium">TMT Golongan Terakhir</span>
                        <p className="font-bold text-slate-800 text-sm">
                          {selectedRecord.tmtGolonganTerakhirFormatted}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-blue-100 space-y-1">
                        <span className="text-slate-500 font-medium">Masa Kerja dalam Pangkat</span>
                        <p className="font-bold text-slate-800 text-sm">
                          {selectedRecord.pelaksanaData?.masaKerjaGolongan?.text || "—"}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-blue-100 space-y-1">
                        <span className="text-slate-500 font-medium">Estimasi Tanggal KP</span>
                        <p className="font-bold text-slate-800 text-sm text-blue-700">
                          {selectedRecord.pelaksanaData?.kpSelanjutnyaFormatted}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-blue-100 space-y-1">
                        <span className="text-slate-500 font-medium">Periode BKN Terdekat</span>
                        <p className="font-bold text-slate-800 text-sm">
                          {selectedRecord.pelaksanaData?.periodeBknTerdekat}
                        </p>
                      </div>
                    </div>

                    {/* Education Ceiling Notice */}
                    {selectedRecord.isAtPangkatCeiling && (
                      <div className={`p-3 rounded-lg flex items-start gap-3 ${
                        selectedRecord.isSatuTingkatTerakhir
                          ? "bg-amber-50 border border-amber-200"
                          : "bg-slate-50 border border-slate-200"
                      }`}>
                        <AlertTriangle className={selectedRecord.isSatuTingkatTerakhir ? "text-amber-500 shrink-0 mt-0.5" : "text-slate-400 shrink-0 mt-0.5"} size={18} />
                        <div className="text-xs space-y-1">
                          <p className={selectedRecord.isSatuTingkatTerakhir ? "font-bold text-amber-800" : "font-bold text-slate-700"}>
                            {selectedRecord.isSatuTingkatTerakhir
                              ? "Satu Kenaikan Pangkat Terakhir (Mendekati Pensiun)"
                              : "Pangkat Maksimal Berdasarkan Pendidikan"}
                          </p>
                          <p className="text-slate-600">
                            Pegawai dengan pendidikan <strong>{selectedRecord.employee.jenjang_pendidikan || "—"}</strong> memiliki
                            batas pangkat maksimal <strong>{selectedRecord.pangkatMaksimalPendidikan}</strong>.
                            {selectedRecord.isSatuTingkatTerakhir
                              ? " Karena mendekati masa pensiun (sisa ≤ 4 tahun), pegawai ini masih berhak mendapatkan satu kenaikan pangkat terakhir."
                              : " Kenaikan pangkat reguler tidak dapat diproses hingga pegawai mendekati masa pensiun."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Status Alert */}
                    <div className={`p-3 rounded-lg bg-white flex items-start gap-3 ${
                      selectedRecord.isAtPangkatCeiling ? "border border-slate-100" : "border border-blue-100"
                    }`}>
                      {selectedRecord.pelaksanaData?.status === "sudah_waktunya" ? (
                        <>
                          <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={20} />
                          <div className="text-xs space-y-1">
                            <p className="font-bold text-rose-800">
                              Sudah Waktunya Kenaikan Pangkat!
                            </p>
                            <p className="text-slate-600">
                              Masa kerja dalam pangkat telah mencapai 4 tahun ({selectedRecord.pelaksanaData.sisaWaktu?.text}). 
                              Pegawai ini berhak segera diusulkan SK Kenaikan Pangkat ke BKN.
                            </p>
                          </div>
                        </>
                      ) : selectedRecord.pelaksanaData?.status === "segera" ? (
                        <>
                          <Clock className="text-amber-600 shrink-0 mt-0.5" size={20} />
                          <div className="text-xs space-y-1">
                            <p className="font-bold text-amber-800">
                              Mendekati Waktu Kenaikan Pangkat (&lt; 6 Bulan)
                            </p>
                            <p className="text-slate-600">
                              Tersisa {selectedRecord.pelaksanaData.sisaWaktu?.text}. 
                              Mohon persiapkan berkas SKP 2 tahun terakhir dan kelengkapan administrasi lainnya.
                            </p>
                          </div>
                        </>
                      ) : selectedRecord.pelaksanaData?.status === "pangkat_maksimal_pendidikan" ? (
                        <>
                          <Info className="text-slate-500 shrink-0 mt-0.5" size={20} />
                          <div className="text-xs space-y-1">
                            <p className="font-bold text-slate-700">
                              Kenaikan Pangkat Ditangguhkan
                            </p>
                            <p className="text-slate-600">
                              Pangkat pegawai sudah berada di batas maksimal berdasarkan pendidikan. 
                              Kenaikan pangkat baru dapat diproses kembali jika pegawai mendekati masa pensiun.
                            </p>
                          </div>
                        </>
                      ) : selectedRecord.pelaksanaData?.status === "satu_tingkat_terakhir" ? (
                        <>
                          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                          <div className="text-xs space-y-1">
                            <p className="font-bold text-amber-800">
                              Satu Kenaikan Pangkat Terakhir
                            </p>
                            <p className="text-slate-600">
                              Meski telah mencapai batas pangkat pendidikan, pegawai ini berhak mendapat <strong>satu kenaikan pangkat terakhir</strong> karena mendekati masa pensiun.
                              {selectedRecord.pelaksanaData.sisaWaktu && !selectedRecord.pelaksanaData.sisaWaktu.isOverdue
                                ? ` Proses dalam: ${selectedRecord.pelaksanaData.sisaWaktu.text}.`
                                : ""}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                          <div className="text-xs space-y-1">
                            <p className="font-bold text-emerald-800">
                              Belum Waktunya ({selectedRecord.pelaksanaData?.sisaWaktu?.text})
                            </p>
                            <p className="text-slate-600">
                              Pegawai masih dalam masa pemenuhan 4 tahun dalam pangkat/golongan saat ini.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="text-emerald-600" size={18} />
                        <h4 className="font-bold text-emerald-900 text-sm">
                          Skema Kenaikan Pangkat Fungsional / Struktural (Sistem Point)
                        </h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        Angka Kredit (PAK)
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      Kenaikan pangkat pada jabatan ini <strong>bukan berdasarkan waktu 4 tahun</strong>, 
                      melainkan diwajibkan memenuhi <strong>Angka Kredit (Point)</strong> sesuai jenjang jabatan.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-1">
                        <span className="text-slate-500 font-medium">Point Saat Ini</span>
                        <p className="font-bold text-slate-900 text-base">
                          {selectedRecord.pointData?.currentPoint} pt
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-1">
                        <span className="text-slate-500 font-medium">Target Minimal</span>
                        <p className="font-bold text-emerald-700 text-base">
                          {selectedRecord.pointData?.targetPoint} pt
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-1">
                        <span className="text-slate-500 font-medium">Capaian Persentase</span>
                        <p className="font-bold text-slate-900 text-base">
                          {selectedRecord.pointData?.persentase}%
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 bg-white p-3 rounded-lg border border-emerald-100">
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Pemenuhan Angka Kredit</span>
                        <span>{selectedRecord.pointData?.persentase}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            (selectedRecord.pointData?.persentase ?? 0) >= 100
                              ? "bg-emerald-500"
                              : (selectedRecord.pointData?.persentase ?? 0) >= 75
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${selectedRecord.pointData?.persentase}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 pt-1">
                        {selectedRecord.pointData?.rekomendasi}
                      </p>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => {
                          handleOpenPointModal(selectedRecord);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                      >
                        <Edit3 size={14} />
                        <span>Update Angka Kredit (Point) Pegawai Ini</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Kelola / Input Point Angka Kredit */}
      <AnimatePresence>
        {pointModalRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <Award size={18} />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Kelola Angka Kredit (Point)
                    </h3>
                    <p className="text-xs text-slate-500">
                      {pointModalRecord.employee.nama_lengkap}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPointModalRecord(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jabatan:</span>
                    <span className="font-semibold text-slate-800">{pointModalRecord.employee.jabatan || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pangkat/Gol:</span>
                    <span className="font-semibold text-slate-800">{pointModalRecord.employee.pangkat_golongan || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Minimal:</span>
                    <span className="font-bold text-emerald-700">{pointModalRecord.pointData?.targetPoint} Point</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Jumlah Angka Kredit (Point) Terkumpul:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={pointInputValue}
                      onChange={(e) => setPointInputValue(e.target.value)}
                      placeholder="Masukkan perolehan angka kredit..."
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-900"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      Point
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Target kenaikan pangkat adalah <strong>{pointModalRecord.pointData?.targetPoint} point</strong>. 
                    Jika mencapai target, status akan otomatis menjadi <strong>Point Terpenuhi (Siap KP)</strong>.
                  </p>
                </div>

                {pointSaveMessage && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-medium ${
                      pointSaveMessage.includes("berhasil")
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {pointSaveMessage}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  onClick={() => setPointModalRecord(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  onClick={handleSavePoint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                >
                  <Save size={14} />
                  <span>Simpan Point</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
