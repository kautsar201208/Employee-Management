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
  Building2,
  Briefcase,
  Sparkles,
  HelpCircle,
  FileCheck2,
  CalendarDays,
  Timer,
  Check,
  ChevronDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ACCESS_TOKEN_KEY,
  getEmployees,
  type ApiEmployee,
} from "@/lib/api";
import {
  processEmployeeKGB,
  type KGBRecord,
  type KGBStep,
} from "@/lib/kgb";

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

function KGBEmployeeAvatar({
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

export default function KGBDirectory() {
  const shouldReduceMotion = useReducedMotion();

  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [timKerjaFilter, setTimKerjaFilter] = useState<string>("all");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal Detail
  const [selectedRecord, setSelectedRecord] = useState<KGBRecord | null>(null);

  // Aturan KGB Collapsible
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
      setError("Silakan masuk untuk melihat data kenaikan gaji berkala (KGB).");
      return;
    }

    try {
      const data = await getEmployees(token);
      setEmployees(data || []);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal memuat data pegawai. Pastikan backend aktif.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Process KGB records
  const kgbRecords = useMemo(() => {
    return employees.map((emp) => processEmployeeKGB(emp));
  }, [employees]);

  // Extract available years for filter
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    kgbRecords.forEach((rec) => {
      if (rec.tahunKgbSelanjutnya) {
        years.add(rec.tahunKgbSelanjutnya);
      }
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [kgbRecords]);

  // Extract available tim kerja
  const availableTimKerja = useMemo(() => {
    const tims = new Set<string>();
    employees.forEach((emp) => {
      if (emp.tim_kerja && emp.tim_kerja.trim()) {
        tims.add(emp.tim_kerja.trim());
      }
    });
    return Array.from(tims).sort();
  }, [employees]);

  // Extract available employee status (PNS, PPPK, etc)
  const availableEmployeeStatuses = useMemo(() => {
    const statuses = new Set<string>();
    employees.forEach((emp) => {
      if (emp.status && emp.status.trim()) {
        statuses.add(emp.status.trim());
      }
    });
    return Array.from(statuses).sort();
  }, [employees]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return kgbRecords.filter((rec) => {
      const emp = rec.employee;
      const searchable = `${emp.nama_lengkap || emp.nama || ""} ${emp.nip || ""} ${emp.jabatan || ""} ${emp.pangkat_golongan || ""} ${emp.tim_kerja || ""}`.toLowerCase();
      const matchQuery = !query.trim() || searchable.includes(query.trim().toLowerCase());

      const matchStatus =
        statusFilter === "all" || rec.status === statusFilter;

      const matchYear =
        yearFilter === "all" ||
        (rec.tahunKgbSelanjutnya && String(rec.tahunKgbSelanjutnya) === yearFilter);

      const matchTimKerja =
        timKerjaFilter === "all" ||
        (emp.tim_kerja || "").trim() === timKerjaFilter;

      const matchEmpStatus =
        employeeStatusFilter === "all" ||
        (emp.status || "").trim() === employeeStatusFilter;

      return matchQuery && matchStatus && matchYear && matchTimKerja && matchEmpStatus;
    });
  }, [
    kgbRecords,
    query,
    statusFilter,
    yearFilter,
    timKerjaFilter,
    employeeStatusFilter,
  ]);

  // Sort: Urgensi prioritas (lewat tempo > segera < 3 bulan > tahun berjalan > mendatang > maksimal)
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      // Prioritas status urgensi
      const priorityOrder: Record<string, number> = {
        lewat_tempo: 1,
        segera: 2,
        tahun_berjalan: 3,
        mendatang: 4,
        maksimal: 5,
        tidak_diketahui: 6,
      };

      const pA = priorityOrder[a.status] || 99;
      const pB = priorityOrder[b.status] || 99;

      if (pA !== pB) return pA - pB;

      // Jika sama-sama lewat tempo atau sama-sama segera, urutkan berdasarkan hari terdekat
      if (a.kgbSelanjutnya && b.kgbSelanjutnya) {
        return a.kgbSelanjutnya.getTime() - b.kgbSelanjutnya.getTime();
      }

      if (a.kgbSelanjutnya) return -1;
      if (b.kgbSelanjutnya) return 1;

      return 0;
    });
  }, [filteredRecords]);

  // Metrics
  const metrics = useMemo(() => {
    const total = kgbRecords.length;
    let lewatTempoCount = 0;
    let segeraCount = 0;
    let tahunBerjalanCount = 0;
    let mendatangCount = 0;
    let maksimalCount = 0;

    kgbRecords.forEach((rec) => {
      if (rec.status === "lewat_tempo") lewatTempoCount++;
      else if (rec.status === "segera") segeraCount++;
      else if (rec.status === "tahun_berjalan") tahunBerjalanCount++;
      else if (rec.status === "mendatang") mendatangCount++;
      else if (rec.status === "maksimal") maksimalCount++;
    });

    return {
      total,
      lewatTempoCount,
      segeraCount,
      tahunBerjalanCount,
      mendatangCount,
      maksimalCount,
    };
  }, [kgbRecords]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / ROWS_PER_PAGE);
  const activePage = Math.min(currentPage, Math.max(totalPages, 1));
  const firstIndex = (activePage - 1) * ROWS_PER_PAGE;
  const visibleRecords = sortedRecords.slice(firstIndex, firstIndex + ROWS_PER_PAGE);

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setYearFilter("all");
    setTimKerjaFilter("all");
    setEmployeeStatusFilter("all");
    setCurrentPage(1);
  };

  const isFilterActive =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    yearFilter !== "all" ||
    timKerjaFilter !== "all" ||
    employeeStatusFilter !== "all";

  // CSV Export
  const exportCSV = () => {
    const headers = [
      "No",
      "Nama Lengkap",
      "NIP",
      "Status Pegawai",
      "Jabatan",
      "Pangkat/Golongan",
      "Tim Kerja",
      "Masa Kerja Saat Ini",
      "Masa Kerja Golongan (MKG)",
      "Capaian Menuju 32 Thn (%)",
      "Siklus KGB Ke",
      "TMT Pengangkatan",
      "TMT KGB Terakhir",
      "Jadwal KGB Selanjutnya",
      "Tahun KGB Selanjutnya",
      "Sisa Waktu Menuju KGB",
      "Status KGB",
    ];

    const rows = sortedRecords.map((rec, index) => {
      const emp = rec.employee;
      return [
        index + 1,
        `"${emp.nama_lengkap || emp.nama || "—"}"`,
        `'${emp.nip || "—"}`,
        `"${emp.status || "—"}"`,
        `"${emp.jabatan || "—"}"`,
        `"${emp.pangkat_golongan || "—"}"`,
        `"${emp.tim_kerja || "—"}"`,
        `"${rec.masaKerja?.text || "—"}"`,
        `"MKG ${rec.mkgCurrentYears} Tahun"`,
        `${rec.progressPercentage}%`,
        `"Ke-${rec.currentStepIndex} dari ${rec.totalSteps}"`,
        `"${rec.tmtPengangkatanFormatted}"`,
        `"${rec.tmtKgbTerakhirFormatted}"`,
        `"${rec.kgbSelanjutnyaFormatted}"`,
        rec.tahunKgbSelanjutnya || "—",
        `"${rec.remainingTime?.text || (rec.isMaxMasaKerja ? "Maksimal (32 Thn)" : "—")}"`,
        `"${rec.statusLabel}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const a = document.createElement("a");
    a.href = encodedUri;
    a.download = `monitoring-kgb-pegawai-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 min-w-0 max-w-full w-full">
      {/* HEADER PAGE */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
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
              Kenaikan Gaji Berkala (KGB)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Monitoring Kenaikan Gaji Berkala (KGB)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pemantauan siklus kenaikan gaji per 2 tahun, progres masa kerja golongan (maksimal hingga 32 tahun), dan jadwal penerbitan SK KGB pegawai.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <button
            onClick={() => setShowRuleInfo((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs cursor-pointer"
            title="Panduan aturan Kenaikan Gaji Berkala (KGB)"
            type="button"
          >
            <HelpCircle size={14} className="text-[#2563EB]" />
            <span>Aturan KGB</span>
          </button>

          <button
            onClick={exportCSV}
            disabled={sortedRecords.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
            title="Ekspor CSV"
            type="button"
          >
            <Download size={14} className="text-slate-600" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={fetchEmployees}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl transition-all shadow-xs disabled:opacity-60 cursor-pointer"
            title="Muat ulang data"
            type="button"
          >
            <RefreshCw
              size={14}
              className={isLoading ? "animate-spin text-white" : "text-white"}
            />
            <span>Segarkan</span>
          </button>
        </div>
      </header>

      {/* RULE EXPLANATION CARD (COLLAPSIBLE) */}
      <AnimatePresence>
        {showRuleInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-slate-800 text-xs sm:text-sm shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base">
                  <Sparkles size={16} className="text-slate-500" />
                  <span>Ketentuan Kenaikan Gaji Berkala (KGB) &amp; Masa Kerja Golongan</span>
                </div>
                <button
                  onClick={() => setShowRuleInfo(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  aria-label="Tutup panduan"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3">
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2 font-bold text-slate-800 mb-1.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-extrabold">
                      2
                    </span>
                    <span>Periode 2 Tahun Sekali</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Kenaikan Gaji Berkala diberikan kepada pegawai setiap <strong>2 tahun sekali</strong> jika telah memenuhi syarat masa kerja golongan dan penilaian kinerja baik.
                  </p>
                </div>

                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2 font-bold text-slate-800 mb-1.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-extrabold">
                      32
                    </span>
                    <span>Batas Maksimal 32 Tahun</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Siklus kenaikan gaji berkala berlangsung maksimal hingga <strong>32 tahun masa kerja</strong> (total 16 tahapan siklus). Setelah 32 tahun, masa kerja golongan maksimal telah tercapai.
                  </p>
                </div>

                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2 font-bold text-slate-800 mb-1.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-extrabold">
                      SK
                    </span>
                    <span>Penerbitan SK KGB</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Disarankan memproses usulan SK KGB <strong>1-3 bulan sebelum jatuh tempo</strong> agar hak kenaikan penghasilan terhitung mulai tanggal (TMT) tepat waktu.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* METRIC SUMMARY CARDS */}
      <section
        className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4"
        aria-label="Statistik ringkasan KGB pegawai"
      >
        {/* TOTAL PEGAWAI */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("all");
            setCurrentPage(1);
          }}
          className={`text-left rounded-2xl border p-4 shadow-2xs flex flex-col justify-between transition-all cursor-pointer ${
            statusFilter === "all"
              ? "bg-[#2563EB] text-white border-[#2563EB] shadow-md ring-2 ring-blue-500/25"
              : "bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                statusFilter === "all" ? "text-blue-100" : "text-slate-500"
              }`}
            >
              Total Pegawai
            </span>
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                statusFilter === "all"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Users size={16} />
            </span>
          </div>
          <div className="mt-2">
            <div
              className={`text-2xl font-extrabold tracking-tight ${
                statusFilter === "all" ? "text-white" : "text-[#0F172A]"
              }`}
            >
              {isLoading ? "—" : metrics.total}
            </div>
            <p
              className={`text-[11px] mt-0.5 ${
                statusFilter === "all" ? "text-blue-100" : "text-slate-400"
              }`}
            >
              Pegawai terpantau
            </p>
          </div>
        </button>

        {/* JATUH TEMPO / PERLU SK */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "lewat_tempo" ? "all" : "lewat_tempo");
            setCurrentPage(1);
          }}
          className={`text-left rounded-2xl border p-4 shadow-2xs flex flex-col justify-between transition-all cursor-pointer ${
            statusFilter === "lewat_tempo"
              ? "bg-[#2563EB] text-white border-[#2563EB] shadow-md ring-2 ring-blue-500/25"
              : "bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                statusFilter === "lewat_tempo" ? "text-blue-100" : "text-slate-500"
              }`}
            >
              Jatuh Tempo
            </span>
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                statusFilter === "lewat_tempo"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className="mt-2">
            <div
              className={`text-2xl font-extrabold tracking-tight ${
                statusFilter === "lewat_tempo" ? "text-white" : "text-[#0F172A]"
              }`}
            >
              {isLoading ? "—" : metrics.lewatTempoCount}
            </div>
            <p
              className={`text-[11px] mt-0.5 ${
                statusFilter === "lewat_tempo" ? "text-blue-100" : "text-slate-400"
              }`}
            >
              Perlu tindak lanjut SK
            </p>
          </div>
        </button>

        {/* SEGERA (< 3 BULAN) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "segera" ? "all" : "segera");
            setCurrentPage(1);
          }}
          className={`text-left rounded-2xl border p-4 shadow-2xs flex flex-col justify-between transition-all cursor-pointer ${
            statusFilter === "segera"
              ? "bg-[#2563EB] text-white border-[#2563EB] shadow-md ring-2 ring-blue-500/25"
              : "bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                statusFilter === "segera" ? "text-blue-100" : "text-slate-500"
              }`}
            >
              &lt; 3 Bln Lagi
            </span>
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                statusFilter === "segera"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Timer size={16} />
            </span>
          </div>
          <div className="mt-2">
            <div
              className={`text-2xl font-extrabold tracking-tight ${
                statusFilter === "segera" ? "text-white" : "text-[#0F172A]"
              }`}
            >
              {isLoading ? "—" : metrics.segeraCount}
            </div>
            <p
              className={`text-[11px] mt-0.5 ${
                statusFilter === "segera" ? "text-blue-100" : "text-slate-400"
              }`}
            >
              Persiapan usulan KGB
            </p>
          </div>
        </button>

        {/* TAHUN BERJALAN (< 1 TAHUN) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "tahun_berjalan" ? "all" : "tahun_berjalan");
            setCurrentPage(1);
          }}
          className={`text-left rounded-2xl border p-4 shadow-2xs flex flex-col justify-between transition-all cursor-pointer ${
            statusFilter === "tahun_berjalan"
              ? "bg-[#2563EB] text-white border-[#2563EB] shadow-md ring-2 ring-blue-500/25"
              : "bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                statusFilter === "tahun_berjalan" ? "text-blue-100" : "text-slate-500"
              }`}
            >
              Tahun Ini
            </span>
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                statusFilter === "tahun_berjalan"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <CalendarDays size={16} />
            </span>
          </div>
          <div className="mt-2">
            <div
              className={`text-2xl font-extrabold tracking-tight ${
                statusFilter === "tahun_berjalan" ? "text-white" : "text-[#0F172A]"
              }`}
            >
              {isLoading ? "—" : metrics.tahunBerjalanCount}
            </div>
            <p
              className={`text-[11px] mt-0.5 ${
                statusFilter === "tahun_berjalan" ? "text-blue-100" : "text-slate-400"
              }`}
            >
              Jadwal tahun berjalan
            </p>
          </div>
        </button>

        {/* MASA KERJA MAKSIMAL (32 TAHUN) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "maksimal" ? "all" : "maksimal");
            setCurrentPage(1);
          }}
          className={`col-span-2 lg:col-span-1 text-left rounded-2xl border p-4 shadow-2xs flex flex-col justify-between transition-all cursor-pointer ${
            statusFilter === "maksimal"
              ? "bg-[#2563EB] text-white border-[#2563EB] shadow-md ring-2 ring-blue-500/25"
              : "bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                statusFilter === "maksimal" ? "text-blue-100" : "text-slate-500"
              }`}
            >
              Maks. 32 Tahun
            </span>
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                statusFilter === "maksimal"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Award size={16} />
            </span>
          </div>
          <div className="mt-2">
            <div
              className={`text-2xl font-extrabold tracking-tight ${
                statusFilter === "maksimal" ? "text-white" : "text-[#0F172A]"
              }`}
            >
              {isLoading ? "—" : metrics.maksimalCount}
            </div>
            <p
              className={`text-[11px] mt-0.5 ${
                statusFilter === "maksimal" ? "text-blue-100" : "text-slate-400"
              }`}
            >
              Gaji pokok maksimal
            </p>
          </div>
        </button>
      </section>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* SEARCH BOX */}
          <div className="md:col-span-4 relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari nama, NIP, jabatan, golongan..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* STATUS URGENSI FILTER */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-slate-700 cursor-pointer"
            >
              <option value="all">Semua Status Urgensi</option>
              <option value="lewat_tempo">Jatuh Tempo (Perlu SK)</option>
              <option value="segera">Segera Jatuh Tempo (&lt; 3 Bln)</option>
              <option value="tahun_berjalan">Tahun Berjalan (&lt; 1 Thn)</option>
              <option value="mendatang">Mendatang (&gt; 1 Thn)</option>
              <option value="maksimal">Masa Kerja Maksimal (32 Thn)</option>
            </select>
          </div>

          {/* TAHUN KGB FILTER */}
          <div className="md:col-span-2">
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-slate-700 cursor-pointer"
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>

          {/* TIM KERJA FILTER */}
          <div className="md:col-span-3">
            <select
              value={timKerjaFilter}
              onChange={(e) => {
                setTimKerjaFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-slate-700 truncate cursor-pointer"
            >
              <option value="all">Semua Tim Kerja</option>
              {availableTimKerja.map((tim) => (
                <option key={tim} value={tim}>
                  {tim}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ACTIVE FILTER BADGES & RESET */}
        {isFilterActive && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
              <span className="font-semibold text-slate-700">Filter Aktif:</span>
              {query && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  Cari: &ldquo;{query}&rdquo;
                  <button onClick={() => setQuery("")} className="cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  Status: {statusFilter.replace("_", " ")}
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {yearFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  Tahun: {yearFilter}
                  <button
                    onClick={() => setYearFilter("all")}
                    className="cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {timKerjaFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  Tim: {timKerjaFilter}
                  <button
                    onClick={() => setTimKerjaFilter("all")}
                    className="cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
          <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
          </div>
        </div>
      )}

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden min-w-0 max-w-full w-full">
        {/* SCROLL HINT BAR */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/80 text-xs text-slate-500 flex-wrap gap-2">
          <div className="font-semibold text-slate-700 flex items-center gap-2">
            <span>Daftar Siklus KGB Pegawai</span>
            <span className="text-2xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
              {filteredRecords.length} Pegawai
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-2xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
            <span>Geser tabel ke samping untuk melihat seluruh kolom</span>
            <span className="text-[#2563EB] font-bold text-xs">⇄</span>
          </div>
        </div>

        <div className="table-scroll-container">
          <table className="w-full min-w-[1360px] text-left border-collapse text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center whitespace-nowrap">No</th>
                <th className="py-3 px-4 min-w-[240px] whitespace-nowrap">Pegawai</th>
                <th className="py-3 px-4 min-w-[220px] whitespace-nowrap">Jabatan &amp; Golongan</th>
                <th className="py-3 px-4 min-w-[170px] whitespace-nowrap">Tim Kerja</th>
                <th className="py-3 px-4 min-w-[200px] whitespace-nowrap">Masa Kerja (Maks 32 Thn)</th>
                <th className="py-3 px-4 min-w-[150px] whitespace-nowrap">KGB Terakhir</th>
                <th className="py-3 px-4 min-w-[180px] whitespace-nowrap">KGB Selanjutnya</th>
                <th className="py-3 px-4 min-w-[180px] whitespace-nowrap">Status &amp; Urgensi</th>
                <th className="py-3 px-4 text-center w-28 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="w-4 h-4 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-full shrink-0" />
                        <div className="space-y-1 flex-1">
                          <div className="w-32 h-3 bg-slate-200 rounded" />
                          <div className="w-24 h-2 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="w-28 h-3 bg-slate-200 rounded mb-1" />
                      <div className="w-20 h-2 bg-slate-100 rounded" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="w-24 h-3 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="w-28 h-3 bg-slate-200 rounded mb-1" />
                      <div className="w-full h-1.5 bg-slate-100 rounded" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="w-20 h-3 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="w-24 h-3 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="w-20 h-5 bg-slate-200 rounded-full" />
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="w-14 h-6 bg-slate-200 rounded-lg mx-auto" />
                    </td>
                  </tr>
                ))
              ) : visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <TrendingUp
                      size={36}
                      className="mx-auto mb-2 text-slate-300 stroke-[1.5]"
                    />
                    <p className="font-semibold text-slate-600 text-xs">
                      Tidak ada data pegawai yang sesuai
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coba sesuaikan kata kunci atau atur ulang filter pencarian.
                    </p>
                    {isFilterActive && (
                      <button
                        onClick={resetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                visibleRecords.map((rec, index) => {
                  const emp = rec.employee;
                  const rowNumber = firstIndex + index + 1;

                  return (
                    <tr
                      key={emp.id || emp.nip || index}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedRecord(rec)}
                    >
                      {/* NO */}
                      <td className="py-3 px-4 text-center text-slate-400 font-medium text-xs whitespace-nowrap">
                        {rowNumber}
                      </td>

                      {/* PEGAWAI */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <KGBEmployeeAvatar
                            imageUrl={emp.profile_image}
                            name={emp.nama_lengkap || emp.nama || "Pegawai"}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 group-hover:text-[#2563EB] transition-colors truncate text-xs">
                              {emp.nama_lengkap || emp.nama || "—"}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                              {emp.nip ? `NIP: ${emp.nip}` : "NIP belum ada"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* JABATAN & GOLONGAN */}
                      <td className="py-3 px-4 min-w-[200px] whitespace-nowrap">
                        <div className="font-medium text-slate-700 truncate text-xs">
                          {emp.jabatan || "—"}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 inline-flex items-center gap-1 whitespace-nowrap">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200/60">
                            {emp.pangkat_golongan || "—"}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span>{emp.status || "PNS"}</span>
                        </div>
                      </td>

                      {/* TIM KERJA */}
                      <td className="py-3 px-4 min-w-[170px] text-slate-600 whitespace-nowrap text-xs">
                        <span className="truncate block font-medium">
                          {emp.tim_kerja || "—"}
                        </span>
                      </td>

                      {/* MASA KERJA & PROGRESS (0 - 32 THN) */}
                      <td className="py-3 px-4 min-w-[200px] whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">
                              {rec.masaKerja?.text || "—"}
                            </span>
                            <span
                              className={`text-[11px] font-semibold ${
                                rec.isMaxMasaKerja
                                  ? "text-indigo-600"
                                  : "text-slate-500"
                              }`}
                            >
                              {rec.isMaxMasaKerja ? "Maksimal" : `${rec.progressPercentage}%`}
                            </span>
                          </div>
                          {/* PROGRESS BAR */}
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                rec.isMaxMasaKerja
                                  ? "bg-indigo-600"
                                  : rec.progressPercentage > 75
                                  ? "bg-amber-500"
                                  : "bg-blue-600"
                              }`}
                              style={{ width: `${rec.progressPercentage}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-400">
                            MKG {rec.mkgCurrentYears} dari 32 Tahun
                          </div>
                        </div>
                      </td>

                      {/* KGB TERAKHIR */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-slate-800 text-xs">
                          {rec.tmtKgbTerakhirFormatted}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          MKG {rec.mkgCurrentYears} Thn
                        </div>
                      </td>

                      {/* KGB SELANJUTNYA */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {rec.isMaxMasaKerja ? (
                          <div className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md inline-block">
                            Masa Kerja Maksimal (32 Thn)
                          </div>
                        ) : rec.kgbSelanjutnya ? (
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                              <Calendar size={13} className="text-blue-600" />
                              <span>{rec.kgbSelanjutnyaFormatted}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Target MKG: {rec.mkgNextYears} Tahun
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Belum terjadwal</span>
                        )}
                      </td>

                      {/* STATUS & URGENSI */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {rec.status === "lewat_tempo" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle size={11} className="text-rose-600" />
                            <span>Jatuh Tempo (Perlu SK)</span>
                          </span>
                        ) : rec.status === "segera" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Timer size={11} className="text-amber-600" />
                            <span>{rec.remainingTime?.text || "Segera"}</span>
                          </span>
                        ) : rec.status === "tahun_berjalan" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock size={11} className="text-blue-600" />
                            <span>{rec.remainingTime?.text || "Tahun Ini"}</span>
                          </span>
                        ) : rec.status === "maksimal" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <Award size={11} className="text-slate-600" />
                            <span>Maksimal 32 Thn</span>
                          </span>
                        ) : rec.status === "mendatang" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            <span>{rec.remainingTime?.text || "Mendatang"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                            Data Belum Lengkap
                          </span>
                        )}
                      </td>

                      {/* AKSI */}
                      <td
                        className="py-3 px-4 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-[#2563EB] hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Lihat detail siklus KGB"
                        >
                          <span>Detail</span>
                          <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        {!isLoading && sortedRecords.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/80 bg-slate-50/50 text-xs text-slate-600">
            <div>
              Menampilkan{" "}
              <strong className="text-slate-900 font-bold">
                {firstIndex + 1}
              </strong>{" "}
              sampai{" "}
              <strong className="text-slate-900 font-bold">
                {Math.min(firstIndex + ROWS_PER_PAGE, sortedRecords.length)}
              </strong>{" "}
              dari{" "}
              <strong className="text-slate-900 font-bold">
                {sortedRecords.length}
              </strong>{" "}
              pegawai
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={activePage <= 1}
                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="px-2.5 py-1 text-xs font-semibold text-slate-800">
                Halaman {activePage} dari {totalPages || 1}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={activePage >= totalPages}
                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL WITH 16-CYCLE TIMELINE */}
      <AnimatePresence>
        {selectedRecord && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
            onClick={() => setSelectedRecord(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
            >
              {/* MODAL HEADER */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <KGBEmployeeAvatar
                    imageUrl={selectedRecord.employee.profile_image}
                    name={
                      selectedRecord.employee.nama_lengkap ||
                      selectedRecord.employee.nama ||
                      "Pegawai"
                    }
                    className="w-14 h-14 rounded-2xl bg-white/10 text-white font-bold text-base flex items-center justify-center shrink-0 border border-white/20 shadow-md"
                    imageSize={64}
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-200 text-2xs font-semibold border border-blue-400/30">
                        {selectedRecord.employee.status || "PNS"}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 text-2xs font-semibold">
                        {selectedRecord.employee.pangkat_golongan || "—"}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold mt-1 text-white">
                      {selectedRecord.employee.nama_lengkap ||
                        selectedRecord.employee.nama ||
                        "—"}
                    </h2>
                    <p className="text-xs text-slate-300 font-mono mt-0.5">
                      NIP: {selectedRecord.employee.nip || "—"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                  aria-label="Tutup modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* MODAL BODY (SCROLLABLE) */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
                {/* STATUS & COUNTDOWN CARD */}
                <div
                  className={`p-4 rounded-2xl border ${
                    selectedRecord.status === "lewat_tempo"
                      ? "bg-rose-50/70 border-rose-200 text-rose-900"
                      : selectedRecord.status === "segera"
                      ? "bg-amber-50/70 border-amber-200 text-amber-900"
                      : selectedRecord.status === "maksimal"
                      ? "bg-indigo-50/70 border-indigo-200 text-indigo-900"
                      : "bg-blue-50/70 border-blue-200 text-blue-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {selectedRecord.status === "lewat_tempo" ? (
                        <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                      ) : selectedRecord.status === "segera" ? (
                        <Timer size={18} className="text-amber-600 shrink-0" />
                      ) : selectedRecord.status === "maksimal" ? (
                        <Award size={18} className="text-indigo-600 shrink-0" />
                      ) : (
                        <Clock size={18} className="text-blue-600 shrink-0" />
                      )}
                      <span className="font-bold text-sm">
                        {selectedRecord.statusLabel}
                      </span>
                    </div>

                    <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200/60 shadow-2xs">
                      {selectedRecord.isMaxMasaKerja
                        ? "Masa Kerja Maksimal (32 Thn)"
                        : selectedRecord.remainingTime?.text || "—"}
                    </div>
                  </div>

                  <p className="text-xs mt-2 opacity-90 leading-relaxed">
                    {selectedRecord.isMaxMasaKerja
                      ? "Pegawai telah mencapai batas maksimal 32 tahun masa kerja golongan. Gaji pokok berada pada tingkat tertinggi golongan."
                      : selectedRecord.status === "lewat_tempo"
                      ? "Jadwal KGB telah jatuh tempo atau terlewati. Bagian kepegawaian disarankan segera menerbitkan Surat Keputusan (SK) Kenaikan Gaji Berkala."
                      : selectedRecord.status === "segera"
                      ? "Jadwal KGB akan jatuh tempo dalam kurang dari 3 bulan. Harap siapkan berkas pendukung dan pengusulan SK KGB."
                      : "Jadwal KGB masih dalam pantauan normal. Pembaruan SK akan dilakukan saat mendekati waktu jatuh tempo."}
                  </p>
                </div>

                {/* INFO GRID: METRIK MASA KERJA & TANGGAL */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-2xs text-slate-500 font-medium">
                      TMT Pengangkatan
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                      {selectedRecord.tmtPengangkatanFormatted}
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-2xs text-slate-500 font-medium">
                      Masa Kerja Riil
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                      {selectedRecord.masaKerja?.text || "—"}
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-2xs text-slate-500 font-medium">
                      KGB Terakhir
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                      {selectedRecord.tmtKgbTerakhirFormatted}
                    </div>
                    <div className="text-3xs text-slate-500 mt-0.5">
                      MKG {selectedRecord.mkgCurrentYears} Thn
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-2xs text-slate-500 font-medium">
                      KGB Selanjutnya
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-blue-700 mt-1">
                      {selectedRecord.isMaxMasaKerja
                        ? "Maksimal"
                        : selectedRecord.kgbSelanjutnyaFormatted}
                    </div>
                    {!selectedRecord.isMaxMasaKerja && (
                      <div className="text-3xs text-slate-500 mt-0.5">
                        Target MKG {selectedRecord.mkgNextYears} Thn
                      </div>
                    )}
                  </div>
                </div>

                {/* PROGRESS MASA KERJA (0 - 32 TAHUN) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Capaian Masa Kerja Golongan (Maks. 32 Tahun)
                    </span>
                    <span className="font-extrabold text-[#2563EB]">
                      {selectedRecord.progressPercentage}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        selectedRecord.isMaxMasaKerja
                          ? "bg-indigo-600"
                          : "bg-[#2563EB]"
                      }`}
                      style={{ width: `${selectedRecord.progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-2xs text-slate-500 pt-0.5">
                    <span>Awal (0 Thn)</span>
                    <span className="font-medium text-slate-700">
                      Siklus Ke-{selectedRecord.currentStepIndex} dari 16 Kali
                    </span>
                    <span>Maksimal (32 Thn)</span>
                  </div>
                </div>

                {/* 16-CYCLE INTERACTIVE TIMELINE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <TrendingUp size={16} className="text-[#2563EB]" />
                      <span>Linimasa 16 Tahapan Siklus KGB (Maksimal 32 Tahun)</span>
                    </h3>
                    <span className="text-2xs text-slate-500">
                      Interval 2 Tahun
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {selectedRecord.timelineSteps.map((step) => {
                      const isCompleted = step.status === "completed";
                      const isCurrent = step.status === "current";
                      const isNext = step.status === "next";

                      return (
                        <div
                          key={step.stepNumber}
                          className={`p-2.5 rounded-xl border text-xs transition-all relative ${
                            isCurrent
                              ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 text-blue-900"
                              : isNext
                              ? "bg-amber-50 border-amber-300 ring-1 ring-amber-400 text-amber-900"
                              : isCompleted
                              ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                              : "bg-slate-50/60 border-slate-200 text-slate-600"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-2xs uppercase tracking-wider">
                              KGB Ke-{step.stepNumber}
                            </span>
                            {isCompleted ? (
                              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-3xs">
                                <Check size={10} strokeWidth={3} />
                              </span>
                            ) : isCurrent ? (
                              <span className="px-1.5 py-0.2 rounded text-3xs font-extrabold bg-blue-600 text-white">
                                Saat Ini
                              </span>
                            ) : isNext ? (
                              <span className="px-1.5 py-0.2 rounded text-3xs font-extrabold bg-amber-500 text-white">
                                Target
                              </span>
                            ) : null}
                          </div>

                          <div className="font-extrabold text-sm text-slate-900">
                            MKG {step.mkgYears} Thn
                          </div>

                          <div className="text-3xs text-slate-500 mt-1 truncate">
                            {step.estimatedDateFormatted}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PERSYARATAN BERKAS USULAN SK KGB */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileCheck2 size={15} className="text-blue-600" />
                    <span>Kelengkapan Berkas Pengusulan SK KGB:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 text-2xs leading-relaxed">
                    <li>Salinan Surat Keputusan (SK) Pangkat / Golongan Terakhir</li>
                    <li>Salinan Surat Keputusan (SK) Kenaikan Gaji Berkala (KGB) Terakhir</li>
                    <li>Penilaian Kinerja Pegawai (SKP) dengan predikat minimal Baik dalam 2 tahun terakhir</li>
                  </ul>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <div className="text-2xs text-slate-500">
                  Data otomatis disinkronkan dengan database kepegawaian Pusbanglin.
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
