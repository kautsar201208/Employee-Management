"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  ACCESS_TOKEN_KEY,
  getAttendanceSummaries,
  type AttendanceSummary,
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

export default function AttendanceDirectory() {
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [selectedYear, setSelectedYear] = useState("2026");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) {
      setError("Sesi login tidak tersedia. Silakan masuk kembali.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    getAttendanceSummaries(accessToken, controller.signal)
      .then((data) => {
        setSummaries(data);
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
        <span className="attendance-row-count">
          {integerFormatter.format(filteredRows.length)} pegawai
        </span>
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
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="attendance-table-message" colSpan={9}>
                    Memuat rekap kehadiran...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="attendance-table-message" colSpan={9}>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
