"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import {
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [attendanceForm, setAttendanceForm] = useState<AttendanceFormValues>(EMPTY_FORM);
  const [editingSummary, setEditingSummary] = useState<AttendanceSummary | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<AttendanceSummary | null>(null);
  const [profileImageError, setProfileImageError] = useState(false);

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

      <div className="employees-table-panel">
        <div className="employees-table-wrap">
          <table className="employees-table attendance-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Nama / NIP</th>
                <th>Alpha</th>
                <th>Terlambat</th>
                <th>Pulang Awal</th>
                <th>Lupa Absen Datang</th>
                <th>Lupa Absen Pulang</th>
                <th>Ekuivalen Lupa Absen</th>
                <th>Total Alpha Ekuivalen</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="attendance-table-message" colSpan={10}>
                    Memuat rekap kehadiran...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="attendance-table-message" colSpan={10}>
                    {error
                      ? "Rekap kehadiran tidak dapat dimuat."
                      : "Tidak ada data kehadiran untuk pilihan ini."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={`${row.employee_id}-${row.attendance_year}`}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="attendance-employee">
                        <strong>{getEmployeeName(row)}</strong>
                        <span>{row.employee?.nip || "NIP tidak tersedia"}</span>
                      </div>
                    </td>
                    <td>{integerFormatter.format(row.alpha_days)}</td>
                    <td>{integerFormatter.format(row.late_minutes)} mnt</td>
                    <td>{integerFormatter.format(row.early_leave_minutes)} mnt</td>
                    <td>{integerFormatter.format(row.forgot_clock_in_count)}</td>
                    <td>{integerFormatter.format(row.forgot_clock_out_count)}</td>
                    <td>{formatDays(row.forgotten_attendance_alpha_days)} hari</td>
                    <td className="attendance-total-cell">
                      {formatDays(row.total_alpha_equivalent_days)} hari
                    </td>
                    <td>
                      <div className="attendance-row-actions">
                        {row.employee?.profile_image && (
                          <button
                            aria-label={`Lihat profil ${getEmployeeName(row)}`}
                            className="attendance-icon-button"
                            onClick={() => {
                              setProfileImageError(false);
                              setSelectedProfile(row);
                            }}
                            title="Lihat profil"
                            type="button"
                          >
                            <Eye aria-hidden="true" size={15} />
                          </button>
                        )}
                        <button
                          aria-label={`Ubah rekap ${getEmployeeName(row)}`}
                          className="attendance-icon-button"
                          onClick={() => openEditForm(row)}
                          title="Ubah rekap"
                          type="button"
                        >
                          <Pencil aria-hidden="true" size={15} />
                        </button>
                        <button
                          aria-label={`Hapus rekap ${getEmployeeName(row)}`}
                          className="attendance-icon-button is-danger"
                          onClick={() => void removeSummary(row)}
                          title="Hapus rekap"
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

      {selectedProfile && selectedProfile.employee?.profile_image && (
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
                {!profileImageError && (
                  <Image
                    alt={`Foto ${getEmployeeName(selectedProfile)}`}
                    className="employee-profile-photo"
                    height={80}
                    onError={() => setProfileImageError(true)}
                    src={selectedProfile.employee.profile_image}
                    unoptimized
                    width={80}
                  />
                )}
                <div>
                  <p className="eyebrow">Profil pegawai</p>
                  <h2 id="attendance-profile-title">{getEmployeeName(selectedProfile)}</h2>
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
            {profileImageError ? (
              <p className="employee-profile-message">
                Foto profil pegawai tidak dapat dimuat.
              </p>
            ) : (
              <dl className="employee-profile-fields">
                <div><dt>NIP</dt><dd>{selectedProfile.employee.nip || "—"}</dd></div>
                <div><dt>Jabatan</dt><dd>{selectedProfile.employee.jabatan || "—"}</dd></div>
                <div><dt>Status</dt><dd>{selectedProfile.employee.status || "—"}</dd></div>
                <div><dt>Pangkat / Golongan</dt><dd>{selectedProfile.employee.pangkat_golongan || "—"}</dd></div>
                <div><dt>Tim Kerja</dt><dd>{selectedProfile.employee.tim_kerja || "—"}</dd></div>
              </dl>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
