"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ACCESS_TOKEN_KEY, getEmployeeById, getEmployees, type ApiEmployee } from "@/lib/api";

type EmployeeRow = {
  key: string;
  recordId: string;
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  joined: string;
  initials: string;
};

function toEmployeeRow(employee: ApiEmployee, index: number): EmployeeRow {
  const name = employee.nama_lengkap || employee.nama || "Nama belum diisi";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return {
    key: String(employee.id ?? employee.nip ?? employee.no ?? index),
    recordId: employee.id == null ? "" : String(employee.id),
    id: String(employee.nip ?? employee.id ?? employee.no ?? "—"),
    name,
    email: employee.email || "—",
    role: employee.jabatan || employee.jenis_jabatan || "—",
    department: employee.tim_kerja || "—",
    status: employee.status || employee.jenis_jabatan || "—",
    joined: employee.tmt_golongan || "—",
    initials: initials || "?",
  };
}

export default function EmployeeDirectory() {
  const shouldReduceMotion = useReducedMotion();
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ApiEmployee | null>(null);

  useEffect(() => {
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);

    if (!accessToken) {
      const timeout = window.setTimeout(() => {
        setError("Silakan masuk untuk melihat data karyawan.");
        setIsLoading(false);
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const controller = new AbortController();

    getEmployees(accessToken, controller.signal)
      .then(setEmployees)
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Gagal mengambil data karyawan.");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isProfileOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsProfileOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isProfileOpen]);

  const employeeRows = useMemo(() => employees.map(toEmployeeRow), [employees]);
  const departments = useMemo(
    () => [...new Set(employeeRows.map((employee) => employee.department).filter((value) => value !== "—"))].sort(),
    [employeeRows],
  );
  const statuses = useMemo(
    () => [...new Set(employeeRows.map((employee) => employee.status).filter((value) => value !== "—"))].sort(),
    [employeeRows],
  );

  const visibleEmployees = employeeRows.filter((employee) => {
    const searchable = `${employee.name} ${employee.id} ${employee.email} ${employee.role} ${employee.department}`.toLowerCase();
    return (
      searchable.includes(query.trim().toLowerCase()) &&
      (department === "all" || employee.department === department) &&
      (status === "all" || employee.status === status)
    );
  });

  const filtersActive = query.trim() !== "" || department !== "all" || status !== "all";
  const employmentType = (employee: EmployeeRow) => employee.status.toLowerCase();
  const permanentCount = employeeRows.filter((employee) => /tetap|pns|pppk/.test(employmentType(employee))).length;
  const contractCount = employeeRows.filter((employee) => /kontrak|pkwt/.test(employmentType(employee))).length;
  const internCount = employeeRows.filter((employee) => /magang|intern/.test(employmentType(employee))).length;
  const cardVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.32, ease: "easeOut" as const },
    },
  };

  const employeeStats = [
    { label: "Total Karyawan", value: String(employeeRows.length), icon: "♙" },
    { label: "Pegawai Tetap", value: String(permanentCount), icon: "✓" },
    { label: "Kontrak (PKWT)", value: String(contractCount), icon: "▤" },
    { label: "Magang & Internship", value: String(internCount), icon: "▦" },
  ];

  function resetFilters() {
    setQuery("");
    setDepartment("all");
    setStatus("all");
  }

  async function viewEmployeeProfile(employee: EmployeeRow) {
    setIsProfileOpen(true);
    setSelectedProfile(null);
    setProfileError("");

    if (!employee.recordId) {
      setProfileError("ID database pegawai tidak tersedia untuk mengambil profil.");
      return;
    }

    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) {
      setProfileError("Sesi login tidak tersedia. Silakan masuk kembali.");
      return;
    }

    setIsProfileLoading(true);
    try {
      setSelectedProfile(await getEmployeeById(accessToken, employee.recordId));
    } catch (fetchError) {
      setProfileError(fetchError instanceof Error ? fetchError.message : "Gagal mengambil profil pegawai.");
    } finally {
      setIsProfileLoading(false);
    }
  }

  function exportEmployees() {
    const headers = ["ID Karyawan", "Nama", "Email", "Jabatan", "Departemen", "Status", "Tanggal Bergabung"];
    const rows = visibleEmployees.map((employee) => [employee.id, employee.name, employee.email, employee.role, employee.department, employee.status, employee.joined]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const file = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "data-karyawan.csv";
    downloadLink.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <motion.section
      animate="visible"
      aria-label="Daftar karyawan"
      className="employee-directory"
      initial="hidden"
      variants={cardVariants}
    >
      <section className="employees-summary-grid" aria-label="Ringkasan data karyawan">
        {employeeStats.map((stat) => (
          <motion.article
            className="employees-summary-card"
            key={stat.label}
            variants={cardVariants}
            whileHover={shouldReduceMotion ? undefined : { y: -2 }}
          >
            <div><span>{stat.label}</span><strong>{isLoading ? "—" : stat.value}</strong></div>
            <span className="employees-summary-icon" aria-hidden="true">{stat.icon}</span>
          </motion.article>
        ))}
      </section>

      <div className="employees-toolbar">
        <div className="employees-filter-group">
          <label className="employees-search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Cari karyawan"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau ID karyawan..."
            type="search"
            value={query}
          />
          </label>
          <label className="employees-select">
            <span className="visually-hidden">Filter departemen</span>
            <select onChange={(event) => setDepartment(event.target.value)} value={department}>
              <option value="all">Semua Departemen</option>
              {departments.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="employees-select">
            <span className="visually-hidden">Filter status</span>
            <select onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">Semua Status</option>
              {statuses.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          {filtersActive && <button className="employees-reset" onClick={resetFilters} type="button">Reset filter</button>}
        </div>
        <button className="employees-export" onClick={exportEmployees} type="button"><span aria-hidden="true">↓</span>Ekspor CSV</button>
      </div>

      <div className="employees-table-panel">
        <div className="employees-table-wrap">
          <table className="employees-table">
            <thead>
              <tr><th scope="col">Karyawan</th><th scope="col">NIP</th><th scope="col">Jabatan</th><th scope="col">Tim Kerja</th><th scope="col">Status</th><th scope="col">TMT Golongan</th><th className="employees-actions-heading" scope="col">Aksi</th></tr>
            </thead>
            <tbody>
              {visibleEmployees.map((employee) => (
                <tr key={employee.key}>
                  <td>
                    <div className="employees-person">
                      <span className="employees-initials">{employee.initials}</span>
                      <span><strong>{employee.name}</strong><small>{employee.email}</small></span>
                    </div>
                  </td>
                  <td className="employee-id">{employee.id}</td>
                  <td>{employee.role}</td>
                  <td><span className="employee-department">{employee.department}</span></td>
                  <td><span className={`employee-status status-${employee.status.toLowerCase()}`}><i aria-hidden="true" />{employee.status}</span></td>
                  <td>{employee.joined}</td>
                  <td className="employees-actions-cell">
                    <div className="employees-actions">
                      <button aria-label={`Lihat profil ${employee.name}`} onClick={() => void viewEmployeeProfile(employee)} title="Lihat Profil" type="button"><Eye aria-hidden="true" size={16} strokeWidth={1.8} /></button>
                      <button aria-label={`Ubah data ${employee.name}`} title="Ubah Data" type="button">✎</button>
                      <button aria-label={`Hapus ${employee.name}`} title="Hapus Karyawan" type="button">×</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !error && visibleEmployees.length === 0 && (
                <tr><td className="employees-empty" colSpan={7}>Karyawan tidak ditemukan. Coba ubah kata kunci atau filter Anda.</td></tr>
              )}
              {isLoading && <tr><td className="employees-empty" colSpan={7}>Mengambil data karyawan dari backend...</td></tr>}
              {error && (
                <tr><td className="employees-empty" colSpan={7}>
                  <span role="alert">{error}</span>
                  {error.includes("Silakan masuk") && <Link className="employees-login-link" href="/auth/login">Masuk</Link>}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="employees-table-footer">
          <span>Menampilkan <strong>{visibleEmployees.length}</strong> dari <strong>{employeeRows.length}</strong> karyawan</span>
          <nav aria-label="Halaman data karyawan" className="employees-pagination">
            <span className="page-current" aria-current="page">1</span><span>2</span><span>3</span><span>…</span><span>13</span>
          </nav>
        </footer>
      </div>

      {isProfileOpen && (
        <div className="employee-profile-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsProfileOpen(false); }}>
          <section aria-labelledby="employee-profile-title" aria-modal="true" className="employee-profile-dialog" role="dialog">
            <header className="employee-profile-header">
              <div>
                <p className="eyebrow">Data pegawai</p>
                <h2 id="employee-profile-title">{selectedProfile?.nama_lengkap || selectedProfile?.nama || "Profil Karyawan"}</h2>
              </div>
              <button aria-label="Tutup profil" className="employee-profile-close" onClick={() => setIsProfileOpen(false)} type="button"><X size={19} /></button>
            </header>

            {isProfileLoading && <p className="employee-profile-message">Mengambil profil dari backend...</p>}
            {profileError && <p className="employee-profile-message" role="alert">{profileError}</p>}
            {selectedProfile && (
              <dl className="employee-profile-fields">
                <div><dt>NIP</dt><dd>{selectedProfile.nip || "—"}</dd></div>
                <div><dt>Email</dt><dd>{selectedProfile.email || "—"}</dd></div>
                <div><dt>Status</dt><dd>{selectedProfile.status || "—"}</dd></div>
                <div><dt>Jenis Jabatan</dt><dd>{selectedProfile.jenis_jabatan || "—"}</dd></div>
                <div><dt>Jabatan</dt><dd>{selectedProfile.jabatan || "—"}</dd></div>
                <div><dt>Tim Kerja</dt><dd>{selectedProfile.tim_kerja || "—"}</dd></div>
                <div><dt>Pangkat / Golongan</dt><dd>{selectedProfile.pangkat_golongan || "—"}</dd></div>
                <div><dt>TMT Golongan</dt><dd>{selectedProfile.tmt_golongan || "—"}</dd></div>
                <div><dt>Pendidikan</dt><dd>{selectedProfile.jenjang_pendidikan || "—"}</dd></div>
                <div><dt>Jurusan</dt><dd>{selectedProfile.jurusan_pendidikan || "—"}</dd></div>
                <div><dt>Jenis Kelamin</dt><dd>{selectedProfile.jenis_kelamin || "—"}</dd></div>
                <div><dt>Tempat, Tanggal Lahir</dt><dd>{[selectedProfile.tempat_lahir, selectedProfile.tanggal_lahir].filter(Boolean).join(", ") || "—"}</dd></div>
                <div><dt>Nomor Ponsel</dt><dd>{selectedProfile.nomor_ponsel || "—"}</dd></div>
              </dl>
            )}
          </section>
        </div>
      )}
    </motion.section>
  );
}