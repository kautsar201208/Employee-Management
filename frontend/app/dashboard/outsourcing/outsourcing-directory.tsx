"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Building2,
  UserCheck,
  Users,
  Briefcase,
  Shield,
  Sparkles,
  Car,
  FileText,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ACCESS_TOKEN_KEY,
  createOutsourcingEmployee,
  deleteOutsourcingEmployee,
  getOutsourcingEmployees,
  updateOutsourcingEmployee,
  type OutsourcingEmployee,
  type OutsourcingEmployeeInput,
} from "@/lib/api";

const ROWS_PER_PAGE = 25;

const DEFAULT_SATUAN_KERJA = "PT Terra Perkasa Mandiri";

type FormValues = {
  nama_lengkap: string;
  jabatan: string;
  satuan_kerja: string;
};

function createEmptyForm(): FormValues {
  return {
    nama_lengkap: "",
    jabatan: "",
    satuan_kerja: DEFAULT_SATUAN_KERJA,
  };
}

function toFormValues(employee: OutsourcingEmployee): FormValues {
  return {
    nama_lengkap: employee.nama_lengkap,
    jabatan: employee.jabatan,
    satuan_kerja: employee.satuan_kerja || DEFAULT_SATUAN_KERJA,
  };
}

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

function getJabatanIcon(jabatan: string) {
  const lower = jabatan.toLowerCase();
  if (lower.includes("keamanan") || lower.includes("satpam") || lower.includes("security")) {
    return Shield;
  }
  if (lower.includes("kebersihan") || lower.includes("pramu") || lower.includes("clean")) {
    return Sparkles;
  }
  if (lower.includes("pengemudi") || lower.includes("sopir") || lower.includes("driver")) {
    return Car;
  }
  if (lower.includes("administrasi") || lower.includes("admin")) {
    return FileText;
  }
  if (lower.includes("pengawas") || lower.includes("supervisor")) {
    return UserCheck;
  }
  return Briefcase;
}

export default function OutsourcingDirectory() {
  const shouldReduceMotion = useReducedMotion();

  const [employees, setEmployees] = useState<OutsourcingEmployee[]>([]);
  const [query, setQuery] = useState("");
  const [jabatanFilter, setJabatanFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<OutsourcingEmployee | null>(null);
  const [form, setForm] = useState<FormValues>(createEmptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ── Fetch data ──────────────────────────────────────────────
  useEffect(() => {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setError("Silakan masuk untuk melihat data karyawan alih daya.");
      setIsLoading(false);
      return;
    }

    getOutsourcingEmployees(token)
      .then(setEmployees)
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Gagal mengambil data pegawai alih daya."
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  // ── Keyboard close ──────────────────────────────────────────
  useEffect(() => {
    if (!isFormOpen || isSaving) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFormOpen(false);
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isFormOpen, isSaving]);

  // ── Dismiss feedback after 5 s ──────────────────────────────
  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(id);
  }, [feedback]);

  // ── Derived state ────────────────────────────────────────────
  const jabatanOptions = useMemo(
    () =>
      [...new Set(employees.map((e) => e.jabatan).filter(Boolean))].sort(),
    [employees]
  );

  const statsByJabatan = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const emp of employees) {
      const j = emp.jabatan?.trim();
      if (j) {
        counts[j] = (counts[j] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      const haystack = `${e.nama_lengkap} ${e.jabatan} ${e.satuan_kerja}`.toLowerCase();
      const matchQuery = !q || haystack.includes(q);
      const matchJabatan = jabatanFilter === "all" || e.jabatan === jabatanFilter;
      return matchQuery && matchJabatan;
    });
  }, [employees, query, jabatanFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const pageStart = (activePage - 1) * ROWS_PER_PAGE;
  const visible = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);

  const firstVisiblePage = Math.max(1, Math.min(activePage - 2, totalPages - 4));
  const lastVisiblePage = Math.min(totalPages, firstVisiblePage + 4);
  const pageNumbers: number[] = [];
  for (let p = firstVisiblePage; p <= lastVisiblePage; p++) pageNumbers.push(p);

  // ── Helpers ───────────────────────────────────────────────────
  function openCreate() {
    setEditingEmployee(null);
    setForm(createEmptyForm());
    setFeedback(null);
    setIsFormOpen(true);
  }

  function openEdit(employee: OutsourcingEmployee) {
    setEditingEmployee(employee);
    setForm(toFormValues(employee));
    setFeedback(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) return;
    setIsFormOpen(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setFeedback({ type: "error", message: "Sesi login tidak tersedia. Silakan masuk kembali." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const input: OutsourcingEmployeeInput = {
      nama_lengkap: form.nama_lengkap.trim(),
      jabatan: form.jabatan.trim(),
      satuan_kerja: form.satuan_kerja.trim() || DEFAULT_SATUAN_KERJA,
    };

    try {
      if (editingEmployee) {
        const updated = await updateOutsourcingEmployee(token, editingEmployee.id, input);
        setEmployees((prev) =>
          prev.map((emp) => (emp.id === updated.id ? updated : emp))
        );
        setFeedback({ type: "success", message: `Data ${updated.nama_lengkap} berhasil diperbarui.` });
      } else {
        const created = await createOutsourcingEmployee(token, input);
        setEmployees((prev) => [...prev, created].sort((a, b) => (a.no ?? 0) - (b.no ?? 0)));
        setFeedback({ type: "success", message: `${created.nama_lengkap} berhasil ditambahkan.` });
      }
      setIsFormOpen(false);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(employee: OutsourcingEmployee) {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;
    if (!confirm(`Hapus data ${employee.nama_lengkap}? Tindakan ini tidak dapat dibatalkan.`)) return;

    setDeletingId(employee.id);
    try {
      await deleteOutsourcingEmployee(token, employee.id);
      setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
      setFeedback({ type: "success", message: `Data ${employee.nama_lengkap} berhasil dihapus.` });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal menghapus data.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  // ── Animation variants ─────────────────────────────────────────
  const cardVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.32, ease: "easeOut" as const },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -8 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.22,
        delay: shouldReduceMotion ? 0 : i * 0.03,
        ease: "easeOut" as const,
      },
    }),
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="employee-directory">
      {/* Header */}
      <motion.div
        className="directory-header"
        initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div>
          <h1 className="directory-title">Data Karyawan Alih Daya</h1>
          <p className="directory-subtitle">
            Pegawai alih daya (outsourcing) Pusat Pengembangan dan Pelindungan Bahasa dan Sastra
          </p>
        </div>
        <button id="btn-tambah-alih-daya" className="btn-add-employee" onClick={openCreate}>
          <Plus size={18} strokeWidth={2} />
          Tambah Pegawai
        </button>
      </motion.div>

      {/* Feedback toast */}
      {feedback && (
        <motion.div
          key={feedback.message}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`mutation-feedback ${feedback.type}`}
          role="status"
        >
          {feedback.message}
          <button
            aria-label="Tutup notifikasi"
            className="feedback-close"
            onClick={() => setFeedback(null)}
          >
            <X size={14} />
          </button>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div
        className="employee-stats"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <button
          type="button"
          className={`stat-card${jabatanFilter === "all" ? " active" : ""}`}
          onClick={() => {
            setJabatanFilter("all");
            setCurrentPage(1);
          }}
          title="Tampilkan semua pegawai"
        >
          <span className="stat-icon">
            <User size={20} strokeWidth={2.2} />
          </span>
          <div>
            <p className="stat-value">{employees.length}</p>
            <p className="stat-label">Total Karyawan</p>
          </div>
        </button>

        {statsByJabatan.map(([jabatanName, count]) => {
          const Icon = getJabatanIcon(jabatanName);
          const isActive = jabatanFilter === jabatanName;
          return (
            <button
              type="button"
              key={jabatanName}
              className={`stat-card${isActive ? " active" : ""}`}
              onClick={() => {
                setJabatanFilter((prev) => (prev === jabatanName ? "all" : jabatanName));
                setCurrentPage(1);
              }}
              title={`Filter berdasarkan jabatan ${jabatanName}`}
            >
              <span className="stat-icon">
                <Icon size={20} strokeWidth={2} />
              </span>
              <div>
                <p className="stat-value">{count}</p>
                <p className="stat-label">{jabatanName}</p>
              </div>
            </button>
          );
        })}
      </motion.div>

      {/* Table Card with Integrated Filters */}
      <motion.div
        className="employee-table-card"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="filters-bar">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" aria-hidden="true" />
            <input
              id="search-alih-daya"
              type="search"
              className="search-input"
              placeholder="Cari nama, jabatan, satuan kerja…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            id="filter-jabatan-alih-daya"
            className="filter-select"
            value={jabatanFilter}
            onChange={(e) => {
              setJabatanFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Semua Jabatan</option>
            {jabatanOptions.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>

          {(query || jabatanFilter !== "all") && (
            <button
              className="btn-reset-filters"
              onClick={() => {
                setQuery("");
                setJabatanFilter("all");
                setCurrentPage(1);
              }}
            >
              <X size={14} />
              Reset
            </button>
          )}
        </div>
        {isLoading ? (
          <div className="table-loading">
            <div className="table-loading-spinner" aria-hidden="true" />
            <p>Memuat data pegawai alih daya…</p>
          </div>
        ) : error ? (
          <div className="table-empty">
            <Building2 size={40} className="table-empty-icon" aria-hidden="true" />
            <p className="table-empty-title">Gagal memuat data</p>
            <p className="table-empty-desc">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <UserCheck size={40} className="table-empty-icon" aria-hidden="true" />
            <p className="table-empty-title">Tidak ada data ditemukan</p>
            <p className="table-empty-desc">
              {query || jabatanFilter !== "all"
                ? "Coba ubah filter pencarian."
                : "Belum ada pegawai alih daya yang tercatat."}
            </p>
          </div>
        ) : (
          <div className="table-wrapper" role="region" aria-label="Tabel pegawai alih daya">
            <table className="employee-table" aria-label="Daftar pegawai alih daya">
              <thead>
                <tr>
                  <th scope="col">No</th>
                  <th scope="col">Nama Lengkap</th>
                  <th scope="col">Jabatan</th>
                  <th scope="col">Satuan Kerja</th>
                  <th scope="col" style={{ textAlign: "right" }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((employee, idx) => (
                  <motion.tr
                    key={employee.id}
                    custom={idx}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    className="employee-row"
                  >
                    <td className="employee-id">{employee.no}</td>
                    <td>
                      <div className="employee-name-cell">
                        <div className="employee-avatar" aria-hidden="true">
                          {getInitials(employee.nama_lengkap)}
                        </div>
                        <span className="employee-name">{employee.nama_lengkap}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-role">{employee.jabatan}</span>
                    </td>
                    <td>{employee.satuan_kerja || "—"}</td>
                    <td>
                      <div className="action-cell">
                        <button
                          id={`btn-edit-${employee.id}`}
                          className="btn-action btn-edit"
                          aria-label={`Edit ${employee.nama_lengkap}`}
                          onClick={() => openEdit(employee)}
                        >
                          <Pencil size={15} strokeWidth={2} />
                        </button>
                        <button
                          id={`btn-delete-${employee.id}`}
                          className="btn-action btn-delete"
                          aria-label={`Hapus ${employee.nama_lengkap}`}
                          disabled={deletingId === employee.id}
                          onClick={() => handleDelete(employee)}
                        >
                          {deletingId === employee.id ? (
                            <span className="btn-spinner" aria-hidden="true" />
                          ) : (
                            <Trash2 size={15} strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="pagination" role="navigation" aria-label="Navigasi halaman">
            <button
              className="page-btn"
              disabled={activePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers.map((num) => (
              <button
                key={num}
                className={`page-btn${num === activePage ? " active" : ""}`}
                onClick={() => setCurrentPage(num)}
                aria-current={num === activePage ? "page" : undefined}
              >
                {num}
              </button>
            ))}
            <button
              className="page-btn"
              disabled={activePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </motion.div>

      {/* ── Modal form ──────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Form pegawai alih daya">
          <motion.div
            className="modal-card"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Modal header */}
            <div className="modal-header">
              <h2 className="modal-title">
                {editingEmployee ? "Edit Pegawai Alih Daya" : "Tambah Pegawai Alih Daya"}
              </h2>
              <button
                className="modal-close"
                aria-label="Tutup modal"
                onClick={closeForm}
                disabled={isSaving}
              >
                <X size={20} />
              </button>
            </div>

            {/* Feedback inside modal */}
            {feedback && (
              <div className={`mutation-feedback ${feedback.type}`} role="status">
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="employee-form" noValidate>
              <div className="form-grid">
                {/* Nama */}
                <div className="form-field">
                  <label htmlFor="field-nama-alih-daya" className="form-label">
                    Nama Lengkap <span className="required-star">*</span>
                  </label>
                  <input
                    id="field-nama-alih-daya"
                    name="nama_lengkap"
                    type="text"
                    className="form-input"
                    value={form.nama_lengkap}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>

                {/* Jabatan */}
                <div className="form-field">
                  <label htmlFor="field-jabatan-alih-daya" className="form-label">
                    Jabatan <span className="required-star">*</span>
                  </label>
                  <input
                    id="field-jabatan-alih-daya"
                    name="jabatan"
                    type="text"
                    className="form-input"
                    value={form.jabatan}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    placeholder="cth. Satpam, Pramubakti, Sopir"
                  />
                </div>

                {/* Satuan Kerja */}
                <div className="form-field form-field--full">
                  <label htmlFor="field-satuan-kerja" className="form-label">
                    Satuan Kerja / Vendor
                  </label>
                  <input
                    id="field-satuan-kerja"
                    name="satuan_kerja"
                    type="text"
                    className="form-input"
                    value={form.satuan_kerja}
                    onChange={handleChange}
                    autoComplete="off"
                    placeholder="cth. PT Terra Perkasa Mandiri"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeForm}
                  disabled={isSaving}
                >
                  Batal
                </button>
                <button
                  id="btn-simpan-alih-daya"
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving || !form.nama_lengkap.trim() || !form.jabatan.trim()}
                >
                  {isSaving ? (
                    <>
                      <span className="btn-spinner" aria-hidden="true" />
                      Menyimpan…
                    </>
                  ) : editingEmployee ? (
                    "Simpan Perubahan"
                  ) : (
                    "Tambahkan"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
