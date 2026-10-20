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
  UserCheck,
  Building2,
  Briefcase,
  CalendarClock,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ACCESS_TOKEN_KEY,
  getEmployees,
  type ApiEmployee,
} from "@/lib/api";
import {
  processEmployeePension,
  type PensionRecord,
} from "@/lib/pension";

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

function PensionEmployeeAvatar({
  imageUrl,
  name,
  className = "w-8 h-8 rounded-full bg-blue-100 text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0",
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

export default function PensionDirectory() {
  const shouldReduceMotion = useReducedMotion();

  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [query, setQuery] = useState("");
  const [bupFilter, setBupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [timKerjaFilter, setTimKerjaFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal Detail
  const [selectedRecord, setSelectedRecord] = useState<PensionRecord | null>(null);
  const [showRuleInfo, setShowRuleInfo] = useState(false);

  const fetchEmployees = () => {
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);

    if (!accessToken) {
      setError("Silakan masuk untuk melihat data pensiun pegawai.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    getEmployees(accessToken)
      .then((data) => {
        setEmployees(data);
      })
      .catch((fetchError: unknown) => {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Gagal mengambil data pegawai."
        );
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Process all employees into pension records
  const pensionRecords: PensionRecord[] = useMemo(() => {
    return employees.map((emp) => processEmployeePension(emp));
  }, [employees]);

  // Extract available years for filter
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    pensionRecords.forEach((rec) => {
      if (rec.tahunPensiun) years.add(rec.tahunPensiun);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [pensionRecords]);

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

  // Filter records
  const filteredRecords = useMemo(() => {
    return pensionRecords.filter((rec) => {
      const emp = rec.employee;
      const searchable = `${emp.nama_lengkap || emp.nama || ""} ${emp.nip || ""} ${emp.jabatan || ""} ${emp.tim_kerja || ""}`.toLowerCase();
      const matchQuery = !query.trim() || searchable.includes(query.trim().toLowerCase());

      const matchBup =
        bupFilter === "all" ||
        String(rec.bup) === bupFilter;

      const matchStatus =
        statusFilter === "all" ||
        rec.status === statusFilter;

      const matchYear =
        yearFilter === "all" ||
        String(rec.tahunPensiun) === yearFilter;

      const matchTimKerja =
        timKerjaFilter === "all" ||
        (emp.tim_kerja || "").trim() === timKerjaFilter;

      return matchQuery && matchBup && matchStatus && matchYear && matchTimKerja;
    });
  }, [pensionRecords, query, bupFilter, statusFilter, yearFilter, timKerjaFilter]);

  // Sort by pension urgency: nearest pension date first
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      // Prioritize those with valid TMT
      if (!a.tmtPensiun) return 1;
      if (!b.tmtPensiun) return -1;
      return a.tmtPensiun.getTime() - b.tmtPensiun.getTime();
    });
  }, [filteredRecords]);

  // Metrics
  const metrics = useMemo(() => {
    const total = pensionRecords.length;
    let bup58Count = 0;
    let bup60Count = 0;
    let kritisCount = 0; // < 1 tahun
    let waspadaCount = 0; // 1 - 5 tahun
    let sudahPensiunCount = 0;

    const currentYear = new Date().getFullYear();
    let pensiunTahunIniCount = 0;

    pensionRecords.forEach((rec) => {
      if (rec.bup === 58) bup58Count++;
      if (rec.bup === 60) bup60Count++;
      if (rec.status === "kritis") kritisCount++;
      if (rec.status === "waspada") waspadaCount++;
      if (rec.status === "sudah_pensiun") sudahPensiunCount++;
      if (rec.tahunPensiun === currentYear && !rec.remainingTime?.isPassed) {
        pensiunTahunIniCount++;
      }
    });

    return {
      total,
      bup58Count,
      bup60Count,
      kritisCount,
      waspadaCount,
      sudahPensiunCount,
      pensiunTahunIniCount,
    };
  }, [pensionRecords]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / ROWS_PER_PAGE);
  const activePage = Math.min(currentPage, Math.max(totalPages, 1));
  const firstIndex = (activePage - 1) * ROWS_PER_PAGE;
  const visibleRecords = sortedRecords.slice(firstIndex, firstIndex + ROWS_PER_PAGE);

  const resetFilters = () => {
    setQuery("");
    setBupFilter("all");
    setStatusFilter("all");
    setYearFilter("all");
    setTimKerjaFilter("all");
    setCurrentPage(1);
  };

  const isFilterActive =
    query.trim() !== "" ||
    bupFilter !== "all" ||
    statusFilter !== "all" ||
    yearFilter !== "all" ||
    timKerjaFilter !== "all";

  // CSV Export
  const exportCSV = () => {
    const headers = [
      "No",
      "Nama Lengkap",
      "NIP",
      "Jabatan",
      "Jenis Jabatan",
      "Tim Kerja",
      "Kategori BUP",
      "Batas Usia Pensiun (Tahun)",
      "Tanggal Lahir",
      "Usia Saat Ini",
      "Masa Kerja",
      "TMT Pengangkatan",
      "TMT Pensiun",
      "Tahun Pensiun",
      "Sisa Menuju Pensiun",
      "Status Pensiun",
      "Dasar Aturan",
    ];

    const rows = sortedRecords.map((rec, index) => {
      const emp = rec.employee;
      return [
        index + 1,
        emp.nama_lengkap || emp.nama || "—",
        `'${emp.nip || "—"}`,
        emp.jabatan || "—",
        emp.jenis_jabatan || "—",
        emp.tim_kerja || "—",
        rec.kategori,
        rec.bup,
        rec.birthDateFormatted,
        rec.currentAge?.text || "—",
        rec.masaKerja?.text || "—",
        rec.masaKerja?.startDateFormatted || "—",
        rec.tmtPensiunFormatted,
        rec.tahunPensiun || "—",
        rec.remainingTime?.text || "—",
        rec.statusLabel,
        rec.dasarAturan,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-pensiun-pegawai-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.32,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <div className="space-y-5 min-w-0 max-w-full w-full">
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
            <span className="font-semibold text-slate-800">Data Pensiun</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Data Pensiun Pegawai
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pemetaan batas usia pensiun (BUP), estimasi TMT pensiun ASN, dan monitoring masa pengabdian pegawai.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setShowRuleInfo((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
            title="Panduan aturan BUP jabatan"
            type="button"
          >
            <HelpCircle size={14} className="text-[#2563EB]" />
            <span>Aturan BUP</span>
          </button>

          <button
            onClick={exportCSV}
            disabled={sortedRecords.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-60"
            title="Ekspor CSV"
            type="button"
          >
            <Download size={14} className="text-slate-600" />
            <span>Ekspor CSV</span>
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
                  <span>Ketentuan Batas Usia Pensiun (BUP) Pegawai Pusbanglin</span>
                </div>
                <button
                  onClick={() => setShowRuleInfo(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Tutup panduan"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2 font-bold text-slate-800 mb-1.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-extrabold">
                      58
                    </span>
                    <span>BUP 58 Tahun (Keahlian Pertama/Muda, Keterampilan, Kasubbag TU, Pelaksana)</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs leading-relaxed">
                    <li><strong>Ahli Pertama</strong> (misal: Widyabasa Ahli Pertama, Arsiparis Ahli Pertama, Perencana)</li>
                    <li><strong>Ahli Muda</strong> (misal: Widyabasa Ahli Muda, Analis SDM Aparatur Ahli Muda)</li>
                    <li><strong>Fungsional Keterampilan</strong> (Penyelia, Mahir, Terampil)</li>
                    <li><strong>Kepala Subbagian Tata Usaha</strong> (Jabatan Pengawas / Eselon IV)</li>
                    <li><strong>Seluruh Jabatan Pelaksana</strong> (Pengolah Data, Penelaah Teknis Kebijakan, Pengadministrasi, Teknisi, Operator)</li>
                  </ul>
                </div>

                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2 font-bold text-slate-800 mb-1.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-extrabold">
                      60
                    </span>
                    <span>BUP 60 Tahun (Keahlian Madya, Utama, &amp; Struktural Pimpinan)</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs leading-relaxed">
                    <li><strong>Ahli Madya</strong> (misal: Widyabasa Ahli Madya, Peneliti Ahli Madya)</li>
                    <li><strong>Ahli Utama</strong> (misal: Widyabasa Ahli Utama)</li>
                    <li><strong>Kepala Pusat</strong> (Jabatan Pimpinan Tinggi Pratama / Eselon II)</li>
                    <li><strong>Kepala Bidang</strong> (Jabatan Administrator / Eselon III)</li>
                    <li><strong>Jabatan Struktural Eselon Lainnya</strong></li>
                  </ul>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Info size={13} className="text-slate-400 shrink-0" />
                <span>
                  Sesuai ketentuan BKN, TMT (Terhitung Mulai Tanggal) pensiun resmi jatuh pada <strong>tanggal 1 di bulan berikutnya</strong> setelah pegawai mencapai usia BUP.
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* METRIC SUMMARY CARDS */}
      <section
        className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4"
        aria-label="Ringkasan data pensiun"
      >
        {/* TOTAL PEGAWAI */}
        <motion.article
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          variants={cardVariants}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total ASN
            </span>
            <span className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600">
              <Users size={16} />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {isLoading ? "—" : metrics.total}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Pegawai terpantau</p>
          </div>
        </motion.article>

        {/* BUP 58 TAHUN */}
        <motion.article
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          variants={cardVariants}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              BUP 58 Thn
            </span>
            <span className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600">
              <Award size={16} />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {isLoading ? "—" : metrics.bup58Count}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Pertama, Muda, Pelaksana</p>
          </div>
        </motion.article>

        {/* BUP 60 TAHUN */}
        <motion.article
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          variants={cardVariants}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              BUP 60 Thn
            </span>
            <span className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600">
              <ShieldAlert size={16} />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {isLoading ? "—" : metrics.bup60Count}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Madya, Utama, Pimpinan</p>
          </div>
        </motion.article>

        {/* SEGERA PENSIUN (< 1 TAHUN) */}
        <motion.article
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          variants={cardVariants}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              &lt; 1 Thn Lagi
            </span>
            <span className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600">
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {isLoading ? "—" : metrics.kritisCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Perlu tindak lanjut HR</p>
          </div>
        </motion.article>

        {/* 1-5 TAHUN PERSIAPAN */}
        <motion.article
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors col-span-2 lg:col-span-1"
          variants={cardVariants}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              1 - 5 Thn
            </span>
            <span className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600">
              <Clock size={16} />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {isLoading ? "—" : metrics.waspadaCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Persiapan purnabakti</p>
          </div>
        </motion.article>
      </section>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* SEARCH INPUT */}
          <div className="relative lg:col-span-2">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama, NIP, atau jabatan..."
              className="w-full pl-9 pr-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            />
          </div>

          {/* FILTER BUP */}
          <div>
            <select
              value={bupFilter}
              onChange={(e) => {
                setBupFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="all">Semua Usia BUP</option>
              <option value="58">BUP 58 Tahun</option>
              <option value="60">BUP 60 Tahun</option>
            </select>
          </div>

          {/* FILTER STATUS */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="all">Semua Status Sisa Waktu</option>
              <option value="kritis">&lt; 1 Tahun (Segera Pensiun)</option>
              <option value="waspada">1 - 5 Tahun Persiapan</option>
              <option value="aktif">&gt; 5 Tahun Aktif</option>
              <option value="sudah_pensiun">Purna Tugas (Sudah Lewat BUP)</option>
            </select>
          </div>

          {/* FILTER TAHUN */}
          <div>
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
            >
              <option value="all">Semua Tahun Pensiun</option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ACTIVE FILTER RESET & COUNTER */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          <div className="text-slate-500 font-medium">
            Menampilkan{" "}
            <span className="font-bold text-slate-800">
              {filteredRecords.length}
            </span>{" "}
            dari {pensionRecords.length} pegawai ASN
          </div>

          {isFilterActive && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-blue-700 transition-colors"
              type="button"
            >
              <X size={13} />
              <span>Reset filter</span>
            </button>
          )}
        </div>
      </div>

      {/* ERROR FEEDBACK */}
      {error && (
        <div className="p-3.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchEmployees}
            className="font-bold underline ml-2"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* MAIN PENSION TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden min-w-0 max-w-full w-full">
        <div className="overflow-x-auto w-full max-w-full overscroll-x-contain">
          <table className="w-full min-w-[1120px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-12 text-center whitespace-nowrap">No</th>
                <th className="py-3.5 px-4 min-w-[210px] whitespace-nowrap">Pegawai ASN</th>
                <th className="py-3.5 px-4 min-w-[220px] whitespace-nowrap">Jabatan &amp; Kategori BUP</th>
                <th className="py-3.5 px-4 min-w-[160px] whitespace-nowrap">Tanggal Lahir / Usia</th>
                <th className="py-3.5 px-4 min-w-[150px] whitespace-nowrap">Masa Kerja</th>
                <th className="py-3.5 px-4 min-w-[120px] text-center whitespace-nowrap">Batas Usia (BUP)</th>
                <th className="py-3.5 px-4 min-w-[140px] whitespace-nowrap">TMT Pensiun</th>
                <th className="py-3.5 px-4 min-w-[170px] whitespace-nowrap">Sisa Menuju Pensiun</th>
                <th className="py-3.5 px-4 w-20 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw size={22} className="animate-spin mx-auto text-[#2563EB] mb-2" />
                    <p className="font-medium">Memuat dan menghitung data pensiun pegawai...</p>
                  </td>
                </tr>
              ) : visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CalendarClock size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Tidak ada data pegawai yang cocok</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba ubah kata kunci pencarian atau sesuaikan filter Anda.
                    </p>
                  </td>
                </tr>
              ) : (
                visibleRecords.map((rec, index) => {
                  const emp = rec.employee;
                  const rowNumber = firstIndex + index + 1;

                  // Status badge styling
                  let statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  if (rec.status === "kritis") {
                    statusBadgeClass = "bg-red-50 text-red-700 border-red-200 animate-pulse";
                  } else if (rec.status === "waspada") {
                    statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                  } else if (rec.status === "sudah_pensiun") {
                    statusBadgeClass = "bg-slate-100 text-slate-600 border-slate-200";
                  }

                  return (
                    <tr
                      key={String(emp.id ?? emp.nip ?? index)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      onClick={() => setSelectedRecord(rec)}
                    >
                      {/* NO */}
                      <td className="py-3 px-4 text-center text-slate-400 font-medium whitespace-nowrap">
                        {rowNumber}
                      </td>

                      {/* PEGAWAI */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <PensionEmployeeAvatar
                            key={`${emp.id ?? emp.nip ?? index}-${emp.profile_image ?? ""}`}
                            imageUrl={emp.profile_image}
                            name={emp.nama_lengkap || emp.nama || "Tanpa Nama"}
                          />
                          <div>
                            <div className="font-bold text-slate-800 group-hover:text-[#2563EB] transition-colors whitespace-nowrap">
                              {emp.nama_lengkap || emp.nama || "Tanpa Nama"}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                              NIP: {emp.nip || "—"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* JABATAN & KATEGORI */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-700 whitespace-nowrap">
                          {emp.jabatan || "Pelaksana"}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap ${
                              rec.bup === 60
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {rec.kategori}
                          </span>
                          {emp.tim_kerja && (
                            <span className="text-[11px] text-slate-400 whitespace-nowrap" title={emp.tim_kerja}>
                              • {emp.tim_kerja}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* TANGGAL LAHIR & USIA */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-medium whitespace-nowrap">
                          {rec.birthDateFormatted}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                          Usia: <span className="font-semibold text-slate-600">{rec.currentAge?.text || "—"}</span>
                        </div>
                      </td>

                      {/* MASA KERJA (PENGABDIAN DARI NIP) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800 whitespace-nowrap">
                          {rec.masaKerja ? rec.masaKerja.text : "—"}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                          {rec.masaKerja ? `TMT: ${rec.masaKerja.startDateFormatted}` : "NIP belum lengkap"}
                        </div>
                      </td>

                      {/* BUP BADGE */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center min-w-[58px] px-2.5 py-1 rounded-full text-xs font-extrabold border shadow-2xs whitespace-nowrap ${
                            rec.bup === 60
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {rec.bup} Thn
                        </span>
                      </td>

                      {/* TMT PENSIUN */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#0F172A] whitespace-nowrap">
                          {rec.tmtPensiunFormatted}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                          Tahun {rec.tahunPensiun || "—"}
                        </div>
                      </td>

                      {/* SISA MENUJU PENSIUN */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap ${statusBadgeClass}`}
                          >
                            {rec.status === "kritis" && <AlertTriangle size={11} className="shrink-0" />}
                            <span>{rec.remainingTime?.text || "—"}</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 whitespace-nowrap">
                          {rec.statusLabel}
                        </div>
                      </td>

                      {/* AKSI */}
                      <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#2563EB] bg-blue-50/70 hover:bg-blue-100/80 rounded-lg transition-colors whitespace-nowrap"
                          title="Lihat detail lengkap pensiun"
                          type="button"
                        >
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs">
            <div className="text-slate-500">
              Halaman <strong>{activePage}</strong> dari <strong>{totalPages}</strong>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={activePage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft size={15} />
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={activePage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedRecord && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setSelectedRecord(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* MODAL HEADER */}
              <div className="bg-gradient-to-r from-[#0B192C] to-[#1E3E62] p-6 text-white relative">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="absolute right-4 top-4 text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Tutup modal"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3.5">
                  <PensionEmployeeAvatar
                    key={`${selectedRecord.employee.id ?? selectedRecord.employee.nip ?? ""}-${selectedRecord.employee.profile_image ?? ""}`}
                    className="w-20 h-20 rounded-2xl bg-white/10 text-white font-extrabold text-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-inner"
                    imageSize={80}
                    imageUrl={selectedRecord.employee.profile_image}
                    name={selectedRecord.employee.nama_lengkap || selectedRecord.employee.nama || "Tanpa Nama"}
                  />
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold leading-snug">
                      {selectedRecord.employee.nama_lengkap || selectedRecord.employee.nama || "Tanpa Nama"}
                    </h3>
                    <p className="text-xs text-white/80 font-mono mt-0.5">
                      NIP: {selectedRecord.employee.nip || "—"}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-200 mt-1">
                      <Building2 size={12} />
                      {selectedRecord.employee.tim_kerja || "Pusbanglin"}
                    </span>
                  </div>
                </div>
              </div>

              {/* MODAL BODY */}
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
                {/* STATUS HIGHLIGHT BANNER */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 text-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock size={18} className="text-slate-500 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800">{selectedRecord.statusLabel}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Sisa masa pengabdian: <strong className="text-slate-700">{selectedRecord.remainingTime?.text || "—"}</strong>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                    BUP {selectedRecord.bup} Thn
                  </span>
                </div>

                {/* DETAILS GRID */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-400 font-semibold block">
                      Jabatan
                    </span>
                    <strong className="text-slate-800 font-bold block mt-0.5 text-xs">
                      {selectedRecord.employee.jabatan || "Pelaksana"}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-400 font-semibold block">
                      Kategori Pensiun
                    </span>
                    <strong className="text-slate-800 font-bold block mt-0.5 text-xs">
                      {selectedRecord.kategori}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-400 font-semibold block">
                      Tanggal Lahir
                    </span>
                    <strong className="text-slate-800 font-bold block mt-0.5 text-xs">
                      {selectedRecord.birthDateFormatted}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-400 font-semibold block">
                      Usia Saat Ini
                    </span>
                    <strong className="text-slate-800 font-bold block mt-0.5 text-xs">
                      {selectedRecord.currentAge?.text || "—"}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-slate-400 font-semibold block">
                      Masa Kerja (Pengabdian)
                    </span>
                    <strong className="text-slate-800 font-bold block mt-0.5 text-xs">
                      {selectedRecord.masaKerja?.text || "—"}
                    </strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      TMT: {selectedRecord.masaKerja?.startDateFormatted || "—"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 col-span-2">
                    <span className="text-[11px] text-slate-500 font-bold block">
                      Terhitung Mulai Tanggal (TMT) Pensiun
                    </span>
                    <strong className="text-[#0F172A] font-extrabold block mt-0.5 text-sm">
                      {selectedRecord.tmtPensiunFormatted}
                    </strong>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {selectedRecord.dasarAturan}
                    </p>
                  </div>
                </div>

                {/* HR RECOMMENDATION */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Info size={14} className="text-slate-500" />
                    <span>Catatan Administrasi Kepegawaian</span>
                  </div>
                  {selectedRecord.status === "kritis" ? (
                    <p className="text-slate-700 leading-relaxed font-medium">
                      Pegawai akan memasuki purnatugas dalam waktu kurang dari 1 tahun. Segera koordinasikan pemberkasan usulan pensiun ke BKN dan siapkan administrasi SK Pensiun serta hak Taspen pegawai.
                    </p>
                  ) : selectedRecord.status === "waspada" ? (
                    <p className="text-slate-600 leading-relaxed">
                      Pegawai memasuki masa persiapan pensiun (1-5 tahun). Disarankan memasukkan pegawai ke dalam program pembekalan purnabakti / kewirausahaan.
                    </p>
                  ) : selectedRecord.status === "sudah_pensiun" ? (
                    <p className="text-slate-500 leading-relaxed">
                      Pegawai telah melewati batas usia pensiun. Pastikan status kepegawaian telah diperbarui menjadi purnatugas.
                    </p>
                  ) : (
                    <p className="leading-relaxed">
                      Pegawai masih dalam masa pengabdian aktif reguler. Pemantauan berkala akan dilakukan oleh sistem kepegawaian Pusbanglin.
                    </p>
                  )}
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                  type="button"
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
