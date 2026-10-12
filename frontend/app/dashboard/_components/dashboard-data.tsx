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
  "#3366CC", // Brand Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#84CC16", // Lime
  "#64748B", // Slate
];

function getItemColor(key: StatCategoryKey, name: string, index: number): string {
  if (key === "jenis_kelamin") {
    if (name.toLowerCase().includes("laki")) return "#3366CC";
    if (name.toLowerCase().includes("perempuan")) return "#EC4899";
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

  useEffect(() => {
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);

    if (!accessToken) {
      const timeout = window.setTimeout(() => {
        setError("Silakan masuk untuk melihat ringkasan dashboard.");
        setIsLoading(false);
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const controller = new AbortController();

    Promise.all([
      getDashboardSummary(accessToken, controller.signal),
      getEmployees(accessToken, controller.signal),
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

    return () => controller.abort();
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
  const topStats = useMemo(() => {
    // 1. Jenis Kelamin
    let lakiCount = 0;
    let perempuanCount = 0;
    // 2. Status PNS / PPPK
    let pnsCount = 0;
    let pppkCount = 0;
    // 3. Jenis Jabatan Fungsional
    let fungsionalCount = 0;
    let pelaksanaCount = 0;

    for (const emp of employees) {
      const jk = (emp.jenis_kelamin || "").toLowerCase();
      if (jk.includes("laki") || jk === "l") lakiCount++;
      if (jk.includes("perempuan") || jk === "p") perempuanCount++;

      const st = (emp.status || "").toLowerCase();
      if (st.includes("pns")) pnsCount++;
      if (st.includes("pppk")) pppkCount++;

      const jj = (emp.jenis_jabatan || "").toLowerCase();
      if (jj.includes("fungsional")) fungsionalCount++;
      if (jj.includes("pelaksana")) pelaksanaCount++;
    }

    return [
      {
        label: "Total Pegawai",
        value: totalEmployees.toLocaleString("id-ID"),
        sublabel: "Pegawai Aktif Terdata",
        icon: "♙",
      },
      {
        label: "Jenis Kelamin",
        value: `${perempuanCount} P • ${lakiCount} L`,
        sublabel: `${perempuanCount} Perempuan, ${lakiCount} Laki-laki`,
        icon: "🚻",
      },
      {
        label: "Status Kepegawaian",
        value: `${pnsCount} PNS • ${pppkCount} PPPK`,
        sublabel: `${pnsCount} PNS & ${pppkCount} Pegawai PPPK`,
        icon: "✓",
      },
      {
        label: "Jenis Jabatan",
        value: `${fungsionalCount} Fungsional`,
        sublabel: `${pelaksanaCount} Pelaksana / Lainnya`,
        icon: "▦",
      },
    ];
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
      {/* 1. GREETING */}
      <motion.section className="home-greeting" variants={fadeUpVariants}>
        <div>
          <h1>Selamat datang, Admin HR</h1>
          <p>
            Ringkasan aktivitas, demografi, dan metrik manajemen sumber daya
            manusia hari ini.
          </p>
        </div>
        <div className="home-date" suppressHydrationWarning>
          <span aria-hidden="true">▦</span>
          {currentDate}
        </div>
      </motion.section>

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
        {topStats.map((stat) => (
          <motion.article
            className="home-stat-card"
            key={stat.label}
            variants={fadeUpVariants}
            whileHover={shouldReduceMotion ? undefined : { y: -2 }}
          >
            <div className="home-stat-top">
              <div>
                <span className="home-stat-label">{stat.label}</span>
                <strong className="home-stat-value">{stat.value}</strong>
                <small
                  style={{
                    display: "block",
                    fontSize: "10px",
                    color: "var(--muted)",
                    marginTop: "3px",
                  }}
                >
                  {stat.sublabel}
                </small>
              </div>
              <span className="home-stat-icon" aria-hidden="true">
                {stat.icon}
              </span>
            </div>
          </motion.article>
        ))}
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
                  <Icon size={13} />
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
                  Terbanyak: <strong>{categoryBreakdown[0].name}</strong> (
                  {categoryBreakdown[0].count} orang)
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
                fontSize: "10px",
                color: "var(--muted)",
                background: "#f1f5f9",
                padding: "3px 8px",
                borderRadius: "12px",
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
              <circle className="contract-track" cx="80" cy="80" r="60" />
              {donutItems.map((item, index) => {
                const fraction = item.count / (totalEmployees || 1);
                const strokeLength = fraction * 376.99;
                const offset = -donutItems
                  .slice(0, index)
                  .reduce(
                    (total, prev) =>
                      total + (prev.count / (totalEmployees || 1)) * 376.99,
                    0
                  );

                return (
                  <circle
                    className="contract-segment"
                    key={item.name}
                    cx="80"
                    cy="80"
                    r="60"
                    stroke={item.color}
                    strokeDasharray={`${strokeLength} 376.99`}
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
