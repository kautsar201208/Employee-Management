"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  ACCESS_TOKEN_KEY,
  createAttendanceSummary,
  deleteAttendanceSummary,
  getEmployees,
  getAttendanceSummaries,
  updateAttendanceSummary,
  type ApiEmployee,
  type AttendanceSummary,
  type AttendanceSummaryInput,
} from "@/lib/api";

const integerFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});
const dayFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function numberValue(value: number | string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDays(value: number | string): string {
  return dayFormatter.format(numberValue(value));
}

function getEmployeeName(row: AttendanceSummary): string {
  return row.employee?.nama_lengkap || row.employee?.nama || "Nama belum diisi";
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

function AttendanceEmployeeAvatar({
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

type AttendanceFormValues = {
  employee_id: string;
  attendance_year: string;
  alpha_days: string;
  late_minutes: string;
  early_leave_minutes: string;
  forgot_clock_in_count: string;
  forgot_clock_out_count: string;
};

const EMPTY_FORM: AttendanceFormValues = {
  employee_id: "",
  attendance_year: "2026",
  alpha_days: "0",
  late_minutes: "0",
  early_leave_minutes: "0",
  forgot_clock_in_count: "0",
  forgot_clock_out_count: "0",
};

function toAttendanceInput(values: AttendanceFormValues): AttendanceSummaryInput {
  return {
    employee_id: values.employee_id,
    attendance_year: Number(values.attendance_year),
    alpha_days: Number(values.alpha_days),
    late_minutes: Number(values.late_minutes),
    early_leave_minutes: Number(values.early_leave_minutes),
    forgot_clock_in_count: Number(values.forgot_clock_in_count),
    forgot_clock_out_count: Number(values.forgot_clock_out_count),
  };
}

export default function AttendanceDirectory() {
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [selectedYear, setSelectedYear] = useState("2026");
  const [query, setQuery] = useState("");

  const employeeMap = useMemo(() => {
    const map = new Map<string, ApiEmployee>();
    for (const emp of employees) {
      if (emp.id) map.set(String(emp.id), emp);
    }
    return map;
  }, [employees]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [attendanceForm, setAttendanceForm] = useState<AttendanceFormValues>(EMPTY_FORM);
  const [editingSummary, setEditingSummary] = useState<AttendanceSummary | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<AttendanceSummary | null>(null);
  const [profileImageError, setProfileImageError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const controller = new AbortController();
    const loadData = accessToken
      ? Promise.all([
          getAttendanceSummaries(accessToken, controller.signal),
          getEmployees(accessToken, controller.signal),
        ])
      : Promise.reject(new Error("Sesi login tidak tersedia. Silakan masuk kembali."));

    loadData
      .then(([summaryData, employeeData]) => {
        setSummaries(summaryData);
        setEmployees(employeeData);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Gagal mengambil rekap kehadiran.",
        );
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  const years = useMemo(
    () => [...new Set(summaries.map((row) => row.attendance_year))].sort((a, b) => b - a),
    [summaries],
  );
  const effectiveYear = years.includes(Number(selectedYear))
    ? Number(selectedYear)
    : years[0] ?? 2026;
  const yearRows = useMemo(
    () => summaries.filter((row) => row.attendance_year === effectiveYear),
    [effectiveYear, summaries],
  );
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    if (!normalizedQuery) return yearRows;

    return yearRows.filter((row) =>
      [getEmployeeName(row), row.employee?.nip, row.employee?.jabatan]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("id-ID").includes(normalizedQuery)),
    );
  }, [query, yearRows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedYear, rowsPerPage]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const activePage = Math.min(currentPage, Math.max(totalPages, 1));
  const firstIndex = (activePage - 1) * rowsPerPage;
  const visibleRows = filteredRows.slice(firstIndex, firstIndex + rowsPerPage);

  const totals = useMemo(
    () =>
      yearRows.reduce(
        (result, row) => ({
          alpha: result.alpha + row.alpha_days,
          late: result.late + row.late_minutes,
          early: result.early + row.early_leave_minutes,
          forgotIn: result.forgotIn + row.forgot_clock_in_count,
          forgotOut: result.forgotOut + row.forgot_clock_out_count,
        }),
        { alpha: 0, late: 0, early: 0, forgotIn: 0, forgotOut: 0 },
      ),
    [yearRows],
  );
  const forgotAttendanceDays =
    ((totals.forgotIn + totals.forgotOut) * 120) / 450;
  const totalAlphaEquivalentDays = totals.alpha + forgotAttendanceDays;

  function openCreateForm() {
    setEditingSummary(null);
    setAttendanceForm({ ...EMPTY_FORM, attendance_year: String(effectiveYear) });
    setFeedback("");
    setIsFormOpen(true);
  }

  function openEditForm(summary: AttendanceSummary) {
    setEditingSummary(summary);
    setAttendanceForm({
      employee_id: summary.employee_id,
      attendance_year: String(summary.attendance_year),
      alpha_days: String(summary.alpha_days),
      late_minutes: String(summary.late_minutes),
      early_leave_minutes: String(summary.early_leave_minutes),
      forgot_clock_in_count: String(summary.forgot_clock_in_count),
      forgot_clock_out_count: String(summary.forgot_clock_out_count),
    });
    setFeedback("");
    setIsFormOpen(true);
  }

  async function refreshSummaries() {
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) throw new Error("Sesi login tidak tersedia. Silakan masuk kembali.");
    setSummaries(await getAttendanceSummaries(accessToken));
  }

  async function saveSummary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) {
      setFeedback("Sesi login tidak tersedia. Silakan masuk kembali.");
      return;
    }

    const summaryInput = toAttendanceInput(attendanceForm);
    if (
      !summaryInput.employee_id ||
      !Number.isInteger(summaryInput.attendance_year) ||
      Object.values(summaryInput).some(
        (value) => typeof value === "number" && (!Number.isSafeInteger(value) || value < 0),
      )
    ) {
      setFeedback("Lengkapi data dengan angka bulat nol atau lebih.");
      return;
    }

    setIsSaving(true);
    setFeedback("");
    try {
      if (editingSummary) {
        await updateAttendanceSummary(accessToken, summaryInput);
      } else {
        await createAttendanceSummary(accessToken, summaryInput);
      }
      await refreshSummaries();
      setSelectedYear(String(summaryInput.attendance_year));
      setFeedback(
        editingSummary
          ? "Rekap kehadiran berhasil diperbarui."
          : "Rekap kehadiran berhasil ditambahkan.",
      );
      setIsFormOpen(false);
    } catch (saveError) {
      setFeedback(
        saveError instanceof Error
          ? saveError.message
          : "Gagal menyimpan rekap kehadiran.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeSummary(summary: AttendanceSummary) {
    if (!window.confirm(`Hapus rekap ${getEmployeeName(summary)} tahun ${summary.attendance_year}?`)) {
      return;
    }
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) {
      setError("Sesi login tidak tersedia. Silakan masuk kembali.");
      return;
    }
    try {
      await deleteAttendanceSummary(
        accessToken,
        summary.employee_id,
        summary.attendance_year,
      );
      await refreshSummaries();
      setError("");
      setFeedback("Rekap kehadiran berhasil dihapus.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus rekap kehadiran.",
      );
    }
  }

  return (
    <section className="attendance-directory">
      <div className="employees-heading">
        <div>
          <h1>Rekap Kehadiran Pegawai</h1>
          <p>
            Akumulasi tahunan. Lupa absen dikonversi dengan rumus 120 menit ÷
            450 menit per hari.
          </p>
        </div>
      </div>

      {error && (
        <div className="dashboard-feedback" role="alert">
          {error}
        </div>
      )}
      {feedback && !isFormOpen && (
        <div className="dashboard-feedback" role="status">
          {feedback}
        </div>
      )}

      <div className="employees-summary-grid attendance-summary-grid">
        <article className="employees-summary-card">
          <div>
            <span>Total Alpha</span>
            <strong>{integerFormatter.format(totals.alpha)}</strong>
            <small>hari</small>
          </div>
        </article>
        <article className="employees-summary-card">
          <div>
            <span>Lupa Absen</span>
            <strong>{formatDays(forgotAttendanceDays)}</strong>
            <small>hari ekuivalen</small>
          </div>
        </article>
        <article className="employees-summary-card">
          <div>
            <span>Total Ekuivalen Alpha</span>
            <strong>{formatDays(totalAlphaEquivalentDays)}</strong>
            <small>Alpha + lupa absen</small>
          </div>
        </article>
        <article className="employees-summary-card">
          <div>
            <span>Terlambat / Pulang Awal</span>
            <strong>
              {integerFormatter.format(totals.late + totals.early)}
            </strong>
            <small>menit</small>
          </div>
        </article>
      </div>

      <div className="employees-toolbar">
        <div className="employees-filter-group">
          <label className="employees-search">
            <Search aria-hidden="true" size={15} />
            <input
              aria-label="Cari pegawai"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, NIP, atau jabatan..."
              type="search"
              value={query}
            />
          </label>
          <label className="employees-select attendance-year-select">
            <span className="sr-only">Tahun rekap</span>
            <select
              aria-label="Pilih tahun rekap"
              onChange={(event) => setSelectedYear(event.target.value)}
              value={effectiveYear}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  Tahun {year}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="attendance-toolbar-actions">
          <span className="attendance-row-count">
            {integerFormatter.format(filteredRows.length)} pegawai
          </span>
          <button
            className="primary-button attendance-add-button"
            onClick={openCreateForm}
            type="button"
          >
            <Plus aria-hidden="true" size={15} />
            Tambah Rekap
          </button>
        </div>
      </div>

      {/* MAIN ATTENDANCE TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden min-w-0 max-w-full w-full">
        <div className="overflow-x-auto w-full max-w-full overscroll-x-contain table-scroll-container">
          <table className="w-full min-w-[1100px] text-left border-collapse text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center whitespace-nowrap">No</th>
                <th className="py-3 px-4 min-w-[220px] whitespace-nowrap">Pegawai</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Alpha</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Terlambat</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Pulang Awal</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Lupa Absen Datang</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Lupa Absen Pulang</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Ekuivalen Lupa Absen</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Total Alpha Ekuivalen</th>
                <th className="py-3 px-4 w-28 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td className="py-12 text-center text-slate-400" colSpan={10}>
                    <p className="font-medium text-xs">Memuat rekap kehadiran...</p>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="py-12 text-center text-slate-400" colSpan={10}>
                    <p className="font-semibold text-slate-600 text-xs">
                      {error
                        ? "Rekap kehadiran tidak dapat dimuat."
                        : "Tidak ada data kehadiran untuk pilihan ini."}
                    </p>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, index) => {
                  const emp = row.employee || employeeMap.get(String(row.employee_id));
                  const empName = emp?.nama_lengkap || emp?.nama || getEmployeeName(row);
                  const empNip = emp?.nip || "NIP tidak tersedia";
                  const profileImage = emp?.profile_image;
                  const rowNumber = firstIndex + index + 1;

                  return (
                    <tr
                      key={`${row.employee_id}-${row.attendance_year}`}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* NO */}
                      <td className="py-3 px-4 text-center text-slate-400 font-medium whitespace-nowrap text-xs">
                        {rowNumber}
                      </td>

                      {/* PEGAWAI */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <AttendanceEmployeeAvatar
                            key={`${row.employee_id}-${profileImage ?? ""}`}
                            imageUrl={profileImage}
                            name={empName}
                          />
                          <div>
                            <div className="font-bold text-slate-800 group-hover:text-[#2563EB] transition-colors whitespace-nowrap text-xs">
                              {empName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                              {empNip}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ALPHA */}
                      <td className="py-3 px-4 text-center whitespace-nowrap text-xs">
                        {row.alpha_days > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            {integerFormatter.format(row.alpha_days)} hari
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">0 hari</span>
                        )}
                      </td>

                      {/* TERLAMBAT */}
                      <td className="py-3 px-4 text-center whitespace-nowrap text-xs text-slate-600">
                        {row.late_minutes > 0 ? (
                          <span className="font-medium text-amber-700">
                            {integerFormatter.format(row.late_minutes)} mnt
                          </span>
                        ) : (
                          <span className="text-slate-400">0 mnt</span>
                        )}
                      </td>

                      {/* PULANG AWAL */}
                      <td className="py-3 px-4 text-center whitespace-nowrap text-xs text-slate-600">
                        {row.early_leave_minutes > 0 ? (
                          <span className="font-medium text-amber-700">
                            {integerFormatter.format(row.early_leave_minutes)} mnt
                          </span>
                        ) : (
                          <span className="text-slate-400">0 mnt</span>
                        )}
                      </td>

                      {/* LUPA ABSEN DATANG */}
                      <td className="py-3 px-4 text-center whitespace-nowrap text-xs text-slate-600">
                        {row.forgot_clock_in_count > 0 ? (
                          <span className="font-medium text-slate-700">
                            {integerFormatter.format(row.forgot_clock_in_count)}x
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* LUPA ABSEN PULANG */}
                      <td className="py-3 px-4 text-center whitespace-nowrap text-xs text-slate-600">
                        {row.forgot_clock_out_count > 0 ? (
                          <span className="font-medium text-slate-700">
                            {integerFormatter.format(row.forgot_clock_out_count)}x
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* EKUIVALEN LUPA ABSEN */}
                      <td className="py-3 px-4 text-center whitespace-nowrap text-xs text-slate-600">
                        {numberValue(row.forgotten_attendance_alpha_days) > 0 ? (
                          <span>{formatDays(row.forgotten_attendance_alpha_days)} hari</span>
                        ) : (
                          <span className="text-slate-400">0,00 hari</span>
                        )}
                      </td>

                      {/* TOTAL ALPHA EKUIVALEN */}
                      <td className="py-3 px-4 text-center whitespace-nowrap text-xs">
                        {numberValue(row.total_alpha_equivalent_days) > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {formatDays(row.total_alpha_equivalent_days)} hari
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            0,00 hari
                          </span>
                        )}
                      </td>

                      {/* AKSI */}
                      <td className="py-3 px-4 text-center whitespace-nowrap text-xs">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            aria-label={`Lihat profil ${empName}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                            onClick={() => {
                              setProfileImageError(false);
                              setSelectedProfile(row);
                            }}
                            title="Lihat profil"
                            type="button"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            aria-label={`Ubah rekap ${empName}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            onClick={() => openEditForm(row)}
                            title="Ubah rekap"
                            type="button"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            aria-label={`Hapus rekap ${empName}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            onClick={() => void removeSummary(row)}
                            title="Hapus rekap"
                            type="button"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        {!isLoading && filteredRows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/80 bg-slate-50/50 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <div>
                Menampilkan{" "}
                <strong className="text-slate-900 font-bold">
                  {firstIndex + 1}
                </strong>{" "}
                sampai{" "}
                <strong className="text-slate-900 font-bold">
                  {Math.min(firstIndex + rowsPerPage, filteredRows.length)}
                </strong>{" "}
                dari{" "}
                <strong className="text-slate-900 font-bold">
                  {filteredRows.length}
                </strong>{" "}
                pegawai
              </div>

              <div className="flex items-center gap-1.5 text-slate-500">
                <span>Tampilkan:</span>
                <select
                  aria-label="Jumlah pegawai per halaman"
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="px-2 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={activePage <= 1}
                  className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Halaman sebelumnya"
                  aria-label="Halaman sebelumnya"
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
                  className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Halaman berikutnya"
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isFormOpen && (
        <div
          className="employee-profile-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setIsFormOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="attendance-form-title"
            aria-modal="true"
            className="employee-profile-dialog attendance-form-dialog"
            role="dialog"
          >
            <header className="employee-profile-header">
              <div>
                <p className="eyebrow">Rekap kehadiran</p>
                <h2 id="attendance-form-title">
                  {editingSummary ? "Ubah Rekap Kehadiran" : "Tambah Rekap Kehadiran"}
                </h2>
              </div>
              <button
                aria-label="Tutup formulir"
                className="employee-profile-close"
                onClick={() => setIsFormOpen(false)}
                type="button"
              >
                <X size={19} />
              </button>
            </header>

            {feedback && (
              <p className="employee-profile-message" role="alert">
                {feedback}
              </p>
            )}

            <form className="attendance-form" onSubmit={(event) => void saveSummary(event)}>
              <label className="employee-form-field attendance-form-field--full">
                <span>Pegawai *</span>
                <select
                  className="employee-form-select"
                  disabled={Boolean(editingSummary)}
                  onChange={(event) =>
                    setAttendanceForm((current) => ({
                      ...current,
                      employee_id: event.target.value,
                    }))
                  }
                  required
                  value={attendanceForm.employee_id}
                >
                  <option value="">Pilih pegawai</option>
                  {employees.map((employee) => (
                    <option key={String(employee.id)} value={String(employee.id)}>
                      {employee.nama_lengkap || employee.nama || "Nama belum diisi"} — {employee.nip || "NIP tidak ada"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="employee-form-field">
                <span>Tahun *</span>
                <input
                  max="2200"
                  disabled={Boolean(editingSummary)}
                  min="2000"
                  onChange={(event) =>
                    setAttendanceForm((current) => ({
                      ...current,
                      attendance_year: event.target.value,
                    }))
                  }
                  required
                  type="number"
                  value={attendanceForm.attendance_year}
                />
              </label>
              {([
                ["alpha_days", "Alpha (hari)"],
                ["late_minutes", "Terlambat (menit)"],
                ["early_leave_minutes", "Pulang awal (menit)"],
                ["forgot_clock_in_count", "Lupa absen datang (kali)"],
                ["forgot_clock_out_count", "Lupa absen pulang (kali)"],
              ] as const).map(([field, label]) => (
                <label className="employee-form-field" key={field}>
                  <span>{label}</span>
                  <input
                    min="0"
                    onChange={(event) =>
                      setAttendanceForm((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    required
                    step="1"
                    type="number"
                    value={attendanceForm[field]}
                  />
                </label>
              ))}
              <div className="employee-form-actions attendance-form-actions">
                <button
                  className="employees-reset"
                  disabled={isSaving}
                  onClick={() => setIsFormOpen(false)}
                  type="button"
                >
                  Batal
                </button>
                <button className="primary-button" disabled={isSaving} type="submit">
                  {isSaving ? "Menyimpan..." : "Simpan Rekap"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedProfile && (
        (() => {
          const emp = selectedProfile.employee || employeeMap.get(String(selectedProfile.employee_id));
          const empName = emp?.nama_lengkap || emp?.nama || getEmployeeName(selectedProfile);
          const photoUrl = emp?.profile_image;
          return (
            <div
              className="employee-profile-backdrop"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSelectedProfile(null);
              }}
            >
              <section
                aria-labelledby="attendance-profile-title"
                aria-modal="true"
                className="employee-profile-dialog attendance-profile-dialog"
                role="dialog"
              >
                <header className="employee-profile-header">
                  <div className="employee-profile-identity">
                    {photoUrl && !profileImageError ? (
                      <Image
                        alt={`Foto ${empName}`}
                        className="employee-profile-photo"
                        height={80}
                        onError={() => setProfileImageError(true)}
                        src={photoUrl}
                        unoptimized
                        width={80}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-blue-100 text-[#2563EB] font-bold text-xl flex items-center justify-center shrink-0">
                        {getInitials(empName)}
                      </div>
                    )}
                    <div>
                      <p className="eyebrow">Profil pegawai</p>
                      <h2 id="attendance-profile-title">{empName}</h2>
                    </div>
                  </div>
                  <button
                    aria-label="Tutup profil"
                    className="employee-profile-close"
                    onClick={() => setSelectedProfile(null)}
                    type="button"
                  >
                    <X size={19} />
                  </button>
                </header>
                <dl className="employee-profile-fields">
                  <div><dt>NIP</dt><dd>{emp?.nip || "—"}</dd></div>
                  <div><dt>Jabatan</dt><dd>{emp?.jabatan || "—"}</dd></div>
                  <div><dt>Status</dt><dd>{emp?.status || "—"}</dd></div>
                  <div><dt>Pangkat / Golongan</dt><dd>{emp?.pangkat_golongan || "—"}</dd></div>
                  <div><dt>Tim Kerja</dt><dd>{emp?.tim_kerja || "—"}</dd></div>
                </dl>
              </section>
            </div>
          );
        })()
      )}
    </section>
  );
}
