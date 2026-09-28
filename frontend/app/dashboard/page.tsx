import Link from "next/link";
import Sidebar from "./_components/sidebar";
import DashboardHeader from "./_components/dashboard-header";

const departments = [
  { name: "IT", count: 42, color: "#3366cc" },
  { name: "Operasional", count: 34, color: "#4374d4" },
  { name: "Keuangan", count: 22, color: "#5a86de" },
  { name: "Marketing", count: 18, color: "#769be5" },
  { name: "HR", count: 12, color: "#9bb7ed" },
];

const employees = [
  { initials: "BS", name: "Budi Santoso", email: "budi.santoso@perusahaan.com", role: "Senior Frontend Developer", department: "IT", joined: "18 Okt 2024", status: "Tetap" },
  { initials: "SR", name: "Siti Rahayu", email: "siti.rahayu@perusahaan.com", role: "UI/UX Designer", department: "IT", joined: "14 Okt 2024", status: "Tetap" },
  { initials: "RR", name: "Rizky Ramadhan", email: "rizky.r@perusahaan.com", role: "Marketing Specialist", department: "Marketing", joined: "08 Okt 2024", status: "Kontrak" },
  { initials: "DL", name: "Dewi Lestari", email: "dewi.lestari@perusahaan.com", role: "HR Generalist", department: "HR", joined: "02 Okt 2024", status: "Tetap" },
  { initials: "FP", name: "Fajar Pratama", email: "fajar.p@perusahaan.com", role: "Finance Intern", department: "Keuangan", joined: "26 Sep 2024", status: "Magang" },
];

const stats = [
  { label: "Total Karyawan", value: "128", icon: "♙", trend: "+4%", note: "dari bulan lalu", positive: true },
  { label: "Karyawan Aktif", value: "120", icon: "✓", trend: "93.8%", note: "tingkat aktif" },
  { label: "Karyawan Baru Bulan Ini", value: "6", icon: "+", trend: "+2 orang", note: "dibanding bulan lalu", positive: true },
  { label: "Jumlah Departemen", value: "8", icon: "▦", trend: "3 lokasi", note: "" },
];

const contractTypes = [
  { label: "Tetap (Permanent)", count: 78, percent: 61, color: "#1e4ca6" },
  { label: "Kontrak (Contract)", count: 36, percent: 28, color: "#3366cc" },
  { label: "Magang (Intern)", count: 14, percent: 11, color: "#93b8f5" },
];

export default function DashboardPage() {
  const currentDate = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <main className="dashboard-shell">
      <Sidebar activePage="dashboard" />

      <section className="dashboard-main">
        <DashboardHeader />

        <div className="home-dashboard">
          <section className="home-greeting">
            <div>
              <h1>Selamat datang, Admin</h1>
              <p>Ringkasan aktivitas dan metrik manajemen sumber daya manusia hari ini.</p>
            </div>
            <div className="home-date"><span aria-hidden="true">▦</span>{currentDate}</div>
          </section>

          <section className="home-stats" aria-label="Ringkasan karyawan">
            {stats.map((stat) => (
              <article className="home-stat-card" key={stat.label}>
                <div className="home-stat-top">
                  <div>
                    <span className="home-stat-label">{stat.label}</span>
                    <strong className="home-stat-value">{stat.value}</strong>
                  </div>
                  <span className="home-stat-icon" aria-hidden="true">{stat.icon}</span>
                </div>
                <p className={`home-stat-note${stat.positive ? " is-positive" : ""}`}>
                  {stat.positive && <span aria-hidden="true">↗</span>}
                  <strong>{stat.trend}</strong>
                  {stat.note && <span>{stat.note}</span>}
                </p>
              </article>
            ))}
          </section>

          <section className="home-chart-grid" aria-label="Statistik karyawan">
            <article className="home-panel department-panel">
              <div className="home-panel-heading">
                <div>
                  <h2>Karyawan per Departemen</h2>
                  <p>Distribusi jumlah staf berdasarkan divisi</p>
                </div>
                <span className="home-period">Q4 2024</span>
              </div>

              <div className="department-chart-wrap">
                <svg className="department-chart" role="img" aria-labelledby="department-chart-title" viewBox="0 0 540 200">
                  <title id="department-chart-title">Jumlah karyawan per departemen</title>
                  {[20, 65, 110, 155].map((y, index) => (
                    <g key={y}>
                      <line className="chart-grid-line" x1="40" x2="520" y1={y} y2={y} />
                      <text className="chart-axis-label" textAnchor="end" x="30" y={y + 4}>{45 - index * 15}</text>
                    </g>
                  ))}
                  {departments.map((department, index) => {
                    const height = department.count / 45 * 135;
                    const x = 70 + index * 95;
                    const y = 155 - height;
                    return (
                      <g key={department.name}>
                        <rect fill={department.color} height={height} rx="6" width="56" x={x} y={y} />
                        <text className="chart-value-label" textAnchor="middle" x={x + 28} y={y - 8}>{department.count}</text>
                        <text className="chart-category-label" textAnchor="middle" x={x + 28} y="174">{department.name}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="department-insight">
                <span><i aria-hidden="true" />Departemen Terbesar: <strong>IT (32.8%)</strong></span>
                <span>Kebutuhan ekspansi teknis tinggi</span>
              </div>
            </article>

            <article className="home-panel contract-panel">
              <div className="home-panel-heading">
                <div>
                  <h2>Status Karyawan</h2>
                  <p>Proporsi tipe kontrak kerja</p>
                </div>
              </div>

              <div className="contract-chart-wrap">
                <svg className="contract-chart" role="img" aria-labelledby="contract-chart-title" viewBox="0 0 160 160">
                  <title id="contract-chart-title">Komposisi status kontrak karyawan</title>
                  <circle className="contract-track" cx="80" cy="80" r="60" />
                  {contractTypes.map((contract, index) => (
                    <circle
                      className="contract-segment"
                      key={contract.label}
                      cx="80"
                      cy="80"
                      r="60"
                      stroke={contract.color}
                      strokeDasharray={`${contract.percent * 3.77} 377`}
                      strokeDashoffset={-contractTypes.slice(0, index).reduce((total, item) => total + item.percent * 3.77, 0)}
                    />
                  ))}
                </svg>
                <div className="contract-total"><strong>128</strong><span>Total Karyawan</span></div>
              </div>

              <div className="contract-legend">
                {contractTypes.map((contract) => (
                  <div className="contract-legend-row" key={contract.label}>
                    <span className="contract-legend-name"><i style={{ background: contract.color }} />{contract.label}</span>
                    <span className="contract-legend-value"><strong>{contract.count} orang</strong><span>({contract.percent}%)</span></span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="home-panel recent-employees">
            <header className="recent-heading">
              <div>
                <h2>Karyawan Terbaru</h2>
                <p>5 karyawan yang baru bergabung baru-baru ini</p>
              </div>
              <Link className="home-see-all" href="/dashboard/employees">Lihat Semua <span aria-hidden="true">→</span></Link>
            </header>

            <div className="home-table-wrap">
              <table className="home-table">
                <thead>
                  <tr><th>Karyawan</th><th>Jabatan</th><th>Departemen</th><th>Tanggal Bergabung</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {employees.map((employee, index) => (
                    <tr key={employee.email}>
                      <td>
                        <div className="home-employee-cell">
                          <span className={`home-initials tone-${index + 1}`}>{employee.initials}</span>
                          <span><strong>{employee.name}</strong><small>{employee.email}</small></span>
                        </div>
                      </td>
                      <td>{employee.role}</td>
                      <td>{employee.department}</td>
                      <td>{employee.joined}</td>
                      <td><span className={`home-employment-status status-${employee.status.toLowerCase()}`}>{employee.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="home-table-footer">
              <span>Menampilkan 5 dari 128 total karyawan</span>
              <nav aria-label="Halaman karyawan" className="home-pagination">
                <span aria-current="page">1</span><span>2</span><span>3</span>
                <span className="pagination-next" aria-hidden="true">→</span>
              </nav>
            </footer>
          </section>
        </div>
      </section>
    </main>
  );
}
