"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Award,
  Building2,
  Layers,
  BadgeCheck,
  GraduationCap,
  Briefcase,
  Search,
  UserCheck,
  Calendar,
  Clock,
  Landmark,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  ACCESS_TOKEN_KEY,
  getDashboardSummary,
  getEmployees,
  type ApiEmployee,
  type DashboardSummary,
} from "@/lib/api";

type StatCategoryKey =
  | "jenis_kelamin"
  | "pangkat_golongan"
  | "tim_kerja"
  | "jenis_jabatan"
  | "status"
  | "jenjang_pendidikan"
  | "jabatan";

interface CategoryMeta {
  key: StatCategoryKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: "jenis_kelamin",
    label: "Jenis Kelamin",
    icon: Users,
    description: "Distribusi pegawai berdasarkan jenis kelamin",
  },
  {
    key: "pangkat_golongan",
    label: "Pangkat / Golongan",
    icon: Award,
    description: "Tingkatan pangkat dan golongan ruang pegawai ASN",
  },
  {
    key: "tim_kerja",
    label: "Tim Kerja",
    icon: Building2,
    description: "Persebaran pegawai di setiap unit / tim kerja",
  },
  {
    key: "jenis_jabatan",
    label: "Jenis Jabatan",
    icon: Layers,
    description: "Distribusi formasi fungsional, pelaksana, dan struktural",
  },
  {
    key: "status",
    label: "Status",
    icon: BadgeCheck,
    description: "Status ikatan kerja pegawai (PNS, PPPK, dll)",
  },
  {
    key: "jenjang_pendidikan",
    label: "Jenjang Pendidikan",
    icon: GraduationCap,
    description: "Kualifikasi tingkat pendidikan formal terakhir",
  },
  {
    key: "jabatan",
    label: "Jabatan",
    icon: Briefcase,
    description: "Rincian spesifik nomenklatur nama jabatan",
  },
];

const PALETTE = [
  "#2563EB", // Primary Royal Blue
  "#85A8EB", // Soft Light Blue
  "#38BDF8", // Sky Blue
  "#818CF8", // Indigo Blue
  "#A5B4FC", // Soft Indigo
  "#60A5FA", // Medium Blue
  "#94A3B8", // Slate
  "#CBD5E1", // Light Slate
];

function getItemColor(key: StatCategoryKey, name: string, index: number): string {
  if (key === "jenis_kelamin") {
    const lower = name.toLowerCase();
    if (lower.includes("perempuan") || lower === "p") return "#2563EB";
    if (lower.includes("laki") || lower === "l") return "#85A8EB";
  }
  return PALETTE[index % PALETTE.length];
}

export default function DashboardData() {
  const shouldReduceMotion = useReducedMotion();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // State kategori yang aktif dan pencarian
  const [activeCategory, setActiveCategory] = useState<StatCategoryKey>("jenis_kelamin");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = () => {
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);

    if (!accessToken) {
      setError("Silakan masuk untuk melihat ringkasan dashboard.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    Promise.all([
      getDashboardSummary(accessToken),
      getEmployees(accessToken),
    ])
      .then(([dashboardData, employeeData]) => {
        setSummary(dashboardData);
        setEmployees(employeeData);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Gagal mengambil data dashboard."
        );
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentDate = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const totalEmployees = employees.length || summary?.total_pegawai || 0;

  // Hitung data untuk kategori yang sedang aktif
  const currentCategoryMeta = useMemo(() => {
    return CATEGORIES.find((c) => c.key === activeCategory) || CATEGORIES[0];
  }, [activeCategory]);

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const emp of employees) {
      let rawVal = emp[activeCategory];
      if (typeof rawVal === "string") {
        rawVal = rawVal.trim();
      }
      // Normalisasi nilai umum
      if (activeCategory === "jenjang_pendidikan" && rawVal === "S1") rawVal = "S-1";
      if (activeCategory === "jenis_kelamin") {
        if (rawVal === "L") rawVal = "Laki-laki";
        if (rawVal === "P") rawVal = "Perempuan";
      }
      if (activeCategory === "tim_kerja") {
        if (rawVal === "TU") rawVal = "Tata Usaha";
        if (rawVal === "KI") rawVal = "Perkamusan dan Peristilahan";
        if (rawVal === "Molin") rawVal = "Pemodernan dan Pelindungan";
      }

      const val = rawVal && rawVal !== "-" ? rawVal : "Belum diisi";
      counts[val] = (counts[val] || 0) + 1;
    }

    const total = employees.length || 1;
    const sorted = Object.entries(counts)
      .map(([name, count], index) => ({
        name,
        count,
        percent: Math.round((count / total) * 1000) / 10,
        color: getItemColor(activeCategory, name, index),
      }))
      .sort((a, b) => b.count - a.count);

    return sorted;
  }, [employees, activeCategory]);

  // Filter breakdown dengan search query
  const filteredBreakdown = useMemo(() => {
    if (!searchQuery.trim()) return categoryBreakdown;
    const q = searchQuery.toLowerCase();
    return categoryBreakdown.filter((item) =>
      item.name.toLowerCase().includes(q)
    );
  }, [categoryBreakdown, searchQuery]);

  const maxCount = useMemo(() => {
    return Math.max(1, ...categoryBreakdown.map((item) => item.count));
  }, [categoryBreakdown]);

  // Donut chart items: tampilkan maksimal top 5 + "Lainnya" jika ada banyak item
  const donutItems = useMemo(() => {
    if (categoryBreakdown.length <= 5) {
      return categoryBreakdown;
    }
    const top5 = categoryBreakdown.slice(0, 5);
    const others = categoryBreakdown.slice(5);
    const othersCount = others.reduce((acc, curr) => acc + curr.count, 0);
    const total = employees.length || 1;
    return [
      ...top5,
      {
        name: "Lainnya",
        count: othersCount,
        percent: Math.round((othersCount / total) * 1000) / 10,
        color: "#94A3B8",
      },
    ];
  }, [categoryBreakdown, employees.length]);

  // Statistik Ringkasan Atas
  const topMetrics = useMemo(() => {
    let lakiCount = 0;
    let perempuanCount = 0;
    let pnsCount = 0;
    let pppkCount = 0;
    let fungsionalCount = 0;
    let pelaksanaCount = 0;
    let strukturalCount = 0;

    for (const emp of employees) {
      const jk = (emp.jenis_kelamin || "").toLowerCase();
      if (jk.includes("laki") || jk === "l") lakiCount++;
      if (jk.includes("perempuan") || jk === "p") perempuanCount++;

      const st = (emp.status || "").toLowerCase();
      if (st.includes("pns")) pnsCount++;
      else if (st.includes("pppk")) pppkCount++;

      const jj = (emp.jenis_jabatan || "").toLowerCase();
      if (jj.includes("fungsional")) fungsionalCount++;
      else if (jj.includes("pelaksana")) pelaksanaCount++;
      else if (jj.includes("struktural")) strukturalCount++;
    }

    const otherStatusCount = Math.max(0, totalEmployees - pnsCount - pppkCount);

    return {
      totalEmployees,
      gender: {
        perempuan: perempuanCount,
        laki: lakiCount,
        perempuanPercent: totalEmployees ? Math.round((perempuanCount / totalEmployees) * 100) : 0,
        lakiPercent: totalEmployees ? Math.round((lakiCount / totalEmployees) * 100) : 0,
      },
      status: {
        pns: pnsCount,
        pppk: pppkCount,
        other: otherStatusCount,
        pnsPercent: totalEmployees ? Math.round((pnsCount / totalEmployees) * 100) : 0,
        pppkPercent: totalEmployees ? Math.round((pppkCount / totalEmployees) * 100) : 0,
      },
      jabatan: {
        fungsional: fungsionalCount,
        pelaksana: pelaksanaCount,
        struktural: strukturalCount,
        fungsionalPercent: totalEmployees ? Math.round((fungsionalCount / totalEmployees) * 100) : 0,
        pelaksanaPercent: totalEmployees ? Math.round((pelaksanaCount / totalEmployees) * 100) : 0,
      },
    };
  }, [employees, totalEmployees]);


  const fadeUpVariants = {
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

  const staggerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06 } },
  };

  return (
    <motion.div
      className="home-dashboard"
      initial="hidden"
      animate="visible"
      variants={staggerVariants}
    >
      {/* 1. HEADER SECTION */}
      <motion.header
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1"
        variants={fadeUpVariants}
      >
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Link
              href="/dashboard"
              className="hover:text-[#2563EB] transition-colors"
            >
              Dashboard
            </Link>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="font-semibold text-slate-800">Beranda</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Selamat Datang, Admin HR
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ringkasan aktivitas, demografi, dan metrik manajemen sumber daya manusia hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-60"
            title="Muat ulang ringkasan"
          >
            <RefreshCw
              size={14}
              className={isLoading ? "animate-spin text-[#2563EB]" : "text-slate-600"}
            />
            <span>Segarkan</span>
          </button>

          <div
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl shadow-xs"
            suppressHydrationWarning
          >
            <Calendar size={14} className="text-[#2563EB]" />
            <span>{currentDate}</span>
          </div>
        </div>
      </motion.header>

      {error && (
        <div className="dashboard-feedback" role="alert" style={{ margin: "4px 0" }}>
          <span>{error}</span>
          {error.includes("Silakan masuk") && (
            <Link href="/auth/login">Masuk</Link>
          )}
          {error.includes("Silakan masuk kembali") && (
            <Link href="/auth/login">Masuk kembali</Link>
          )}
        </div>
      )}

      {/* 2. TOP METRIC STATS */}
      <motion.section
        className="home-stats"
        aria-label="Ringkasan karyawan"
        variants={staggerVariants}
      >
        {/* KARTU 1: TOTAL PEGAWAI */}
        <motion.article
          className="home-stat-card"
          variants={fadeUpVariants}
          whileHover={shouldReduceMotion ? undefined : { y: -2 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Pegawai
            </span>
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#eff6ff] text-[#2563eb]"
              aria-hidden="true"
            >
              <Users size={16} />
            </span>
          </div>

          <div className="my-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#0d1b2e] tracking-tight">
                {topMetrics.totalEmployees.toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-semibold text-slate-400">orang</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
              <span>Pegawai Aktif Terdata di Sistem</span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="w-1/3 h-full bg-[#2563eb] rounded-full" />
            </div>
          </div>
        </motion.article>

        {/* KARTU 2: JENIS KELAMIN */}
        <motion.article
          className="home-stat-card"
          variants={fadeUpVariants}
          whileHover={shouldReduceMotion ? undefined : { y: -2 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Jenis Kelamin
            </span>
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#eff6ff] text-[#2563eb]"
              aria-hidden="true"
            >
              <Clock size={16} />
            </span>
          </div>

          <div className="my-1 flex items-center gap-6">
            <div>
              <div className="text-2xl font-extrabold text-[#0d1b2e] leading-tight">
                {topMetrics.gender.perempuan}
              </div>
              <div className="text-[11px] font-medium text-[#2563eb] flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                Perempuan ({topMetrics.gender.perempuanPercent}%)
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[#0d1b2e] leading-tight">
                {topMetrics.gender.laki}
              </div>
              <div className="text-[11px] font-medium text-[#85a8eb] flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#85a8eb]" />
                Laki-laki ({topMetrics.gender.lakiPercent}%)
              </div>
            </div>
          </div>

          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${topMetrics.gender.perempuanPercent}%`, backgroundColor: "#2563eb" }}
              title={`Perempuan: ${topMetrics.gender.perempuan}`}
            />
            <div
              style={{ width: `${topMetrics.gender.lakiPercent}%`, backgroundColor: "#85a8eb" }}
              title={`Laki-laki: ${topMetrics.gender.laki}`}
            />
          </div>
        </motion.article>

        {/* KARTU 3: STATUS KEPEGAWAIAN */}
        <motion.article
          className="home-stat-card"
          variants={fadeUpVariants}
          whileHover={shouldReduceMotion ? undefined : { y: -2 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Status Kepegawaian
            </span>
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#eff6ff] text-[#2563eb]"
              aria-hidden="true"
            >
              <BadgeCheck size={16} />
            </span>
          </div>

          <div className="my-1 flex items-center gap-6">
            <div>
              <div className="text-2xl font-extrabold text-[#0d1b2e] leading-tight">
                {topMetrics.status.pns}
              </div>
              <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                PNS ({topMetrics.status.pnsPercent}%)
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[#0d1b2e] leading-tight">
                {topMetrics.status.pppk}
              </div>
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#cbd5e1]" />
                PPPK ({topMetrics.status.pppkPercent}%)
              </div>
            </div>
          </div>

          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${topMetrics.status.pnsPercent}%`, backgroundColor: "#2563eb" }}
              title={`PNS: ${topMetrics.status.pns}`}
            />
            <div
              style={{ width: `${topMetrics.status.pppkPercent}%`, backgroundColor: "#cbd5e1" }}
              title={`PPPK: ${topMetrics.status.pppk}`}
            />
          </div>
        </motion.article>

        {/* KARTU 4: JENIS JABATAN */}
        <motion.article
          className="home-stat-card"
          variants={fadeUpVariants}
          whileHover={shouldReduceMotion ? undefined : { y: -2 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Jenis Jabatan
            </span>
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#eff6ff] text-[#2563eb]"
              aria-hidden="true"
            >
              <Landmark size={16} />
            </span>
          </div>

          <div className="my-1 flex items-center gap-5">
            <div className="text-2xl font-extrabold text-[#0d1b2e] leading-tight">
              {topMetrics.jabatan.fungsional}
            </div>
            <div className="text-2xl font-extrabold text-[#0d1b2e] leading-tight">
              {topMetrics.jabatan.pelaksana}
            </div>
            <div className="text-2xl font-extrabold text-[#0d1b2e] leading-tight">
              {topMetrics.jabatan.struktural}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
              Fungsional
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#85a8eb]" />
              Pelaksana
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#cbd5e1]" />
              Struktural
            </span>
          </div>

          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              style={{
                width: `${topMetrics.jabatan.fungsionalPercent}%`,
                backgroundColor: "#2563eb",
              }}
              title={`Fungsional: ${topMetrics.jabatan.fungsional}`}
            />
            <div
              style={{
                width: `${topMetrics.jabatan.pelaksanaPercent}%`,
                backgroundColor: "#85a8eb",
              }}
              title={`Pelaksana: ${topMetrics.jabatan.pelaksana}`}
            />
            <div
              style={{
                width: `${Math.max(2, 100 - topMetrics.jabatan.fungsionalPercent - topMetrics.jabatan.pelaksanaPercent)}%`,
                backgroundColor: "#cbd5e1",
              }}
              title={`Struktural: ${topMetrics.jabatan.struktural}`}
            />
          </div>
        </motion.article>
      </motion.section>

      {/* 3. DYNAMIC DEMOGRAPHIC & STATISTICAL BREAKDOWN */}
      <motion.section
        className="home-chart-grid"
        aria-label="Statistik demografi pegawai"
        variants={staggerVariants}
      >
        {/* PANEL KIRI: DAFTAR KATEGORI INTERAKTIF */}
        <motion.article
          className="home-panel department-panel"
          variants={fadeUpVariants}
        >
          <div className="home-panel-heading">
            <div>
              <h2>Statistik &amp; Demografi Pegawai</h2>
              <p>{currentCategoryMeta.description}</p>
            </div>
            <span className="home-period">
              {categoryBreakdown.length} Kelompok
            </span>
          </div>

          {/* TAB PILIHAN KATEGORI */}
          <div className="stat-tabs-wrap" role="tablist">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`stat-tab-pill${isActive ? " active" : ""}`}
                  onClick={() => {
                    setActiveCategory(cat.key);
                    setSearchQuery("");
                  }}
                >
                  {isActive && <Icon size={13} />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* PENCARIAN (JIKA ITEM > 5) */}
          {categoryBreakdown.length > 5 && (
            <div className="stat-search-box">
              <Search size={13} style={{ color: "var(--muted)" }} />
              <input
                type="text"
                placeholder={`Cari ${currentCategoryMeta.label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* DAFTAR BREAKDOWN ITEM */}
          <div className="stat-list-container">
            {filteredBreakdown.map((item) => {
              const barPercent = Math.max(4, (item.count / maxCount) * 100);
              return (
                <div className="stat-list-item" key={item.name}>
                  <div className="stat-item-header">
                    <div className="stat-item-name" title={item.name}>
                      <span
                        className="stat-item-dot"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <div className="stat-item-numbers">
                      <span className="stat-item-count">{item.count} orang</span>
                      <span className="stat-item-pct">{item.percent}%</span>
                    </div>
                  </div>
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill"
                      style={{
                        width: `${barPercent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {!isLoading && filteredBreakdown.length === 0 && (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "var(--muted)",
                }}
              >
                Tidak ada data yang sesuai pencarian.
              </div>
            )}
            {isLoading && (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "var(--muted)",
                }}
              >
                Memuat data statistik...
              </div>
            )}
          </div>

          {/* FOOTER INSIGHT */}
          <div className="department-insight">
            <span>
              <i aria-hidden="true" />
              Total terdata: <strong>{totalEmployees} orang</strong>
            </span>
            <span>
              {categoryBreakdown[0] ? (
                <>
                  Terbanyak:{" "}
                  <strong className="highlight">
                    {categoryBreakdown[0].name} ({categoryBreakdown[0].count} orang)
                  </strong>
                </>
              ) : (
                "Data siap dihitung"
              )}
            </span>
          </div>
        </motion.article>

        {/* PANEL KANAN: DONUT CHART KOMPOSISI */}
        <motion.article
          className="home-panel contract-panel"
          variants={fadeUpVariants}
        >
          <div className="home-panel-heading">
            <div>
              <h2>Komposisi {currentCategoryMeta.label}</h2>
              <p>Visualisasi proporsi persentase data</p>
            </div>
            <span
              style={{
                fontSize: "11px",
                color: "#64748b",
                background: "#f8fafc",
                padding: "3px 10px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                fontWeight: 500,
              }}
            >
              Diagram Donat
            </span>
          </div>

          <div className="contract-chart-wrap">
            <svg
              className="contract-chart"
              role="img"
              aria-label={`Komposisi ${currentCategoryMeta.label}`}
              viewBox="0 0 160 160"
            >
              <circle className="contract-track" cx="80" cy="80" r="58" />
              {donutItems.map((item, index) => {
                const fraction = item.count / (totalEmployees || 1);
                const strokeLength = fraction * 364.42;
                const offset = -donutItems
                  .slice(0, index)
                  .reduce(
                    (total, prev) =>
                      total + (prev.count / (totalEmployees || 1)) * 364.42,
                    0
                  );

                return (
                  <circle
                    className="contract-segment"
                    key={item.name}
                    cx="80"
                    cy="80"
                    r="58"
                    stroke={item.color}
                    strokeDasharray={`${strokeLength} 364.42`}
                    strokeDashoffset={offset}
                  />
                );
              })}
            </svg>
            <div className="contract-total">
              <strong>{totalEmployees}</strong>
              <span>Total Pegawai</span>
            </div>
          </div>

          {/* LEGENDA DONUT */}
          <div
            className="contract-legend"
            style={{ maxHeight: "200px", overflowY: "auto" }}
          >
            {donutItems.map((item) => (
              <div className="contract-legend-row" key={item.name}>
                <span
                  className="contract-legend-name"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={item.name}
                >
                  <i style={{ background: item.color }} />
                  {item.name}
                </span>
                <span className="contract-legend-value">
                  <strong>{item.count} orang</strong>
                  <span>({item.percent}%)</span>
                </span>
              </div>
            ))}
            {!isLoading && donutItems.length === 0 && (
              <p className="dashboard-empty-note">Belum ada data tersedia.</p>
            )}
          </div>
        </motion.article>
      </motion.section>
    </motion.div>
  );
}
