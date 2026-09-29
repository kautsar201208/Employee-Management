"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ACCESS_TOKEN_KEY, getDashboardSummary, getEmployees, type ApiEmployee, type DashboardSummary } from "@/lib/api";

const teamColors = ["#3366cc", "#4374d4", "#5a86de", "#769be5", "#9bb7ed"];
const statusColors = ["#1e4ca6", "#3366cc", "#93b8f5", "#b1c5ff"];

function getEmployeeName(employee: ApiEmployee) {
  return employee.nama_lengkap || employee.nama || "Nama belum diisi";
}

function getEmployeeInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

export default function DashboardData() {
  const shouldReduceMotion = useReducedMotion();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
        setError(fetchError instanceof Error ? fetchError.message : "Gagal mengambil data dashboard.");
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

  const teams = summary ? [
    { name: "TU", count: summary.total_TU },
    { name: "Molin", count: summary.total_Molin },
    { name: "KI", count: summary.total_KI },
    { name: "Bidang", count: summary.total_Bidang },
    { name: "Kepala Pusat", count: summary.total_Kepala_Pusat },
  ].map((team, index) => ({ ...team, color: teamColors[index] })) : [];

  const stats = [
    { label: "Total Karyawan", value: summary?.total_pegawai, icon: "♙" },
    { label: "Tim TU", value: summary?.total_TU, icon: "✓" },
    { label: "Tim Molin", value: summary?.total_Molin, icon: "+" },
    { label: "Tim KI", value: summary?.total_KI, icon: "▦" },
  ];

  const statusCounts = employees.reduce<Record<string, number>>((counts, employee) => {
    const status = employee.status || employee.jenis_jabatan || "Lainnya";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const statusTypes = Object.entries(statusCounts).map(([label, count], index) => ({
    label,
    count,
    percent: employees.length ? Math.round(count / employees.length * 100) : 0,
    color: statusColors[index % statusColors.length],
  }));
  const visibleEmployees = employees.slice(0, 5);
  const maxTeamCount = Math.max(1, ...teams.map((team) => team.count));
  const totalEmployees = summary?.total_pegawai || 0;
  const fadeUpVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.32, ease: "easeOut" as const },
    },
  };
  const staggerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06 } },
  };

  return (
    <motion.div className="home-dashboard" initial="hidden" animate="visible" variants={staggerVariants}>
      <motion.section className="home-greeting" variants={fadeUpVariants}>
        <div>
          <h1>Selamat datang, Admin HR</h1>
          <p>Ringkasan aktivitas dan metrik manajemen sumber daya manusia hari ini.</p>
        </div>
        <div className="home-date"><span aria-hidden="true">▦</span>{currentDate}</div>
      </motion.section>

      <motion.section className="home-stats" aria-label="Ringkasan karyawan" variants={staggerVariants}>
        {stats.map((stat) => (
          <motion.article
            className="home-stat-card"
            key={stat.label}
            variants={fadeUpVariants}
            whileHover={shouldReduceMotion ? undefined : { y: -2 }}
          >
            <div className="home-stat-top">
              <div>
                <span className="home-stat-label">{stat.label}</span>
                <strong className="home-stat-value">{stat.value === undefined ? "—" : stat.value.toLocaleString("id-ID")}</strong>
              </div>
              <span className="home-stat-icon" aria-hidden="true">{stat.icon}</span>
            </div>
          </motion.article>
        ))}
      </motion.section>

      <motion.section className="home-chart-grid" aria-label="Statistik karyawan" variants={staggerVariants}>
        <motion.article className="home-panel department-panel" variants={fadeUpVariants}>
          <div className="home-panel-heading">
            <div>
              <h2>Karyawan per Tim Kerja</h2>
              <p>Distribusi pegawai berdasarkan tim kerja</p>
            </div>
            <span className="home-period">Data backend</span>
          </div>

          <div className="department-chart-wrap">
            <svg className="department-chart" role="img" aria-labelledby="team-chart-title" viewBox="0 0 540 200">
              <title id="team-chart-title">Jumlah karyawan per tim kerja</title>
              {[20, 65, 110, 155].map((y, index) => (
                <g key={y}>
                  <line className="chart-grid-line" x1="40" x2="520" y1={y} y2={y} />
                  <text className="chart-axis-label" textAnchor="end" x="30" y={y + 4}>{teams.length ? Math.round(maxTeamCount * (3 - index) / 3) : 0}</text>
                </g>
              ))}
              {teams.map((team, index) => {
                const height = team.count / maxTeamCount * 135;
                const x = 70 + index * 95;
                const y = 155 - height;
                return (
                  <g key={team.name}>
                    <rect fill={team.color} height={height} rx="6" width="56" x={x} y={y} />
                    <text className="chart-value-label" textAnchor="middle" x={x + 28} y={y - 8}>{team.count}</text>
                    <text className="chart-category-label" textAnchor="middle" x={x + 28} y="174">{team.name}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="department-insight">
            <span><i aria-hidden="true" />Total pegawai: <strong>{totalEmployees.toLocaleString("id-ID")}</strong></span>
            <span>Distribusi berdasarkan tim kerja</span>
          </div>
        </motion.article>

        <motion.article className="home-panel contract-panel" variants={fadeUpVariants}>
          <div className="home-panel-heading">
            <div>
              <h2>Status Karyawan</h2>
              <p>Komposisi status dari data pegawai</p>
            </div>
          </div>

          <div className="contract-chart-wrap">
            <svg className="contract-chart" role="img" aria-labelledby="employee-status-title" viewBox="0 0 160 160">
              <title id="employee-status-title">Komposisi status karyawan</title>
              <circle className="contract-track" cx="80" cy="80" r="60" />
              {statusTypes.map((status, index) => (
                <circle
                  className="contract-segment"
                  key={status.label}
                  cx="80"
                  cy="80"
                  r="60"
                  stroke={status.color}
                  strokeDasharray={`${status.percent * 3.77} 377`}
                  strokeDashoffset={-statusTypes.slice(0, index).reduce((total, item) => total + item.percent * 3.77, 0)}
                />
              ))}
            </svg>
            <div className="contract-total"><strong>{totalEmployees.toLocaleString("id-ID")}</strong><span>Total Karyawan</span></div>
          </div>

          <div className="contract-legend">
            {statusTypes.map((status) => (
              <div className="contract-legend-row" key={status.label}>
                <span className="contract-legend-name"><i style={{ background: status.color }} />{status.label}</span>
                <span className="contract-legend-value"><strong>{status.count} orang</strong><span>({status.percent}%)</span></span>
              </div>
            ))}
            {!isLoading && statusTypes.length === 0 && <p className="dashboard-empty-note">Belum ada data status dari backend.</p>}
          </div>
        </motion.article>
      </motion.section>

      <motion.section className="home-panel recent-employees" variants={fadeUpVariants}>
        <header className="recent-heading">
          <div>
            <h2>Data Karyawan</h2>
          </div>
          <Link className="home-see-all" href="/dashboard/employees">Lihat Semua <span aria-hidden="true">→</span></Link>
        </header>

        <div className="home-table-wrap">
          <table className="home-table">
            <thead>
              <tr><th>Karyawan</th><th>NIP</th><th>Jabatan</th><th>Tim Kerja</th><th>Status</th></tr>
            </thead>
            <tbody>
              {visibleEmployees.map((employee, index) => {
                const name = getEmployeeName(employee);
                return (
                  <tr key={employee.id ?? employee.nip ?? employee.no ?? index}>
                    <td>
                      <div className="home-employee-cell">
                        <span className={`home-initials tone-${index + 1}`}>{getEmployeeInitials(name)}</span>
                        <span><strong>{name}</strong><small>{employee.email || "Email belum tersedia"}</small></span>
                      </div>
                    </td>
                    <td>{employee.nip || employee.id || "—"}</td>
                    <td>{employee.jabatan || employee.jenis_jabatan || "—"}</td>
                    <td>{employee.tim_kerja || "—"}</td>
                    <td><span className="home-employment-status">{employee.status || employee.jenis_jabatan || "—"}</span></td>
                  </tr>
                );
              })}
              {!isLoading && !error && visibleEmployees.length === 0 && <tr><td className="employees-empty" colSpan={5}>Belum ada data pegawai dari backend.</td></tr>}
              {isLoading && <tr><td className="employees-empty" colSpan={5}>Mengambil data dashboard dari backend...</td></tr>}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="dashboard-feedback" role="alert">
            <span>{error}</span>
            {error.includes("Silakan masuk") && <Link href="/auth/login">Masuk</Link>}
            {error.includes("Silakan masuk kembali") && <Link href="/auth/login">Masuk kembali</Link>}
          </div>
        )}

        <footer className="home-table-footer">
          <span>Menampilkan {visibleEmployees.length} dari {totalEmployees.toLocaleString("id-ID")} total karyawan</span>
          <Link className="home-see-all" href="/dashboard/employees">Buka data karyawan <span aria-hidden="true">→</span></Link>
        </footer>
      </motion.section>
    </motion.div>
  );
}
