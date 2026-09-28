"use client";

import { useState } from "react";

const employees = [
  { initials: "BS", id: "EMP-00101", name: "Budi Santoso", email: "budi.santoso@perusahaan.com", role: "Lead Fullstack Engineer", department: "IT", status: "Tetap", joined: "12 Jan 2021" },
  { initials: "SR", id: "EMP-00102", name: "Siti Rahayu", email: "siti.rahayu@perusahaan.com", role: "Senior Product Designer", department: "IT", status: "Tetap", joined: "03 Mar 2021" },
  { initials: "AP", id: "EMP-00103", name: "Andi Pratama", email: "andi.pratama@perusahaan.com", role: "DevOps Specialist", department: "IT", status: "Tetap", joined: "15 Jun 2022" },
  { initials: "DL", id: "EMP-00104", name: "Dewi Lestari", email: "dewi.lestari@perusahaan.com", role: "People Operations Lead", department: "HR", status: "Tetap", joined: "01 Agu 2022" },
  { initials: "RR", id: "EMP-00105", name: "Rizky Ramadhan", email: "rizky.r@perusahaan.com", role: "Performance Marketing", department: "Marketing", status: "Kontrak", joined: "10 Jan 2023" },
  { initials: "MI", id: "EMP-00106", name: "Maya Indah", email: "maya.indah@perusahaan.com", role: "Senior Financial Analyst", department: "Keuangan", status: "Tetap", joined: "05 Mei 2023" },
  { initials: "AH", id: "EMP-00107", name: "Ahmad Hidayat", email: "ahmad.h@perusahaan.com", role: "Warehouse & Logistics Supervisor", department: "Operasional", status: "Kontrak", joined: "18 Sep 2023" },
  { initials: "PW", id: "EMP-00108", name: "Putri Wulandari", email: "putri.w@perusahaan.com", role: "Talent Acquisition Officer", department: "HR", status: "Kontrak", joined: "04 Nov 2023" },
  { initials: "DA", id: "EMP-00109", name: "Dimas Anggara", email: "dimas.a@perusahaan.com", role: "Content & Copywriter", department: "Marketing", status: "Kontrak", joined: "15 Feb 2024" },
  { initials: "FP", id: "EMP-00110", name: "Fajar Pratama", email: "fajar.p@perusahaan.com", role: "Finance & Accounting Intern", department: "Keuangan", status: "Magang", joined: "01 Jul 2024" },
];

export default function EmployeeDirectory() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");

  const visibleEmployees = employees.filter((employee) => {
    const searchable = `${employee.name} ${employee.id} ${employee.email} ${employee.role}`.toLowerCase();
    return (
      searchable.includes(query.trim().toLowerCase()) &&
      (department === "all" || employee.department === department) &&
      (status === "all" || employee.status === status)
    );
  });

  const filtersActive = query.trim() !== "" || department !== "all" || status !== "all";

  function resetFilters() {
    setQuery("");
    setDepartment("all");
    setStatus("all");
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
    <section className="employee-directory" aria-label="Daftar karyawan">
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
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Keuangan">Keuangan</option>
              <option value="Marketing">Marketing</option>
              <option value="Operasional">Operasional</option>
            </select>
          </label>
          <label className="employees-select">
            <span className="visually-hidden">Filter status</span>
            <select onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">Semua Status</option>
              <option value="Tetap">Tetap</option>
              <option value="Kontrak">Kontrak</option>
              <option value="Magang">Magang</option>
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
              <tr><th scope="col">Karyawan</th><th scope="col">ID Karyawan</th><th scope="col">Jabatan</th><th scope="col">Departemen</th><th scope="col">Status</th><th scope="col">Tanggal Bergabung</th><th className="employees-actions-heading" scope="col">Aksi</th></tr>
          </thead>
          <tbody>
            {visibleEmployees.map((employee) => (
              <tr key={employee.email}>
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
                      <button aria-label={`Lihat profil ${employee.name}`} title="Lihat Profil" type="button">◉</button>
                      <button aria-label={`Ubah data ${employee.name}`} title="Ubah Data" type="button">✎</button>
                      <button aria-label={`Hapus ${employee.name}`} title="Hapus Karyawan" type="button">×</button>
                    </div>
                  </td>
              </tr>
            ))}
            {visibleEmployees.length === 0 && (
                <tr><td className="employees-empty" colSpan={7}>Karyawan tidak ditemukan. Coba ubah kata kunci atau filter Anda.</td></tr>
            )}
          </tbody>
          </table>
        </div>
        <footer className="employees-table-footer">
          <span>Menampilkan <strong>{visibleEmployees.length}</strong> data contoh dari 128 karyawan</span>
          <nav aria-label="Halaman data karyawan" className="employees-pagination">
            <span className="page-current" aria-current="page">1</span><span>2</span><span>3</span><span>…</span><span>13</span>
          </nav>
        </footer>
      </div>
    </section>
  );
}