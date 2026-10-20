import type { ApiEmployee } from "./api";
import { parseTMTKerjaFromNIP } from "./pension";

export interface KGBStep {
  stepNumber: number; // 1 to 16
  mkgYears: number; // 2, 4, ..., 32
  estimatedDate: Date | null;
  estimatedDateFormatted: string;
  status: "completed" | "current" | "next" | "future";
  isTargetNext: boolean;
}

export interface KGBRecord {
  employee: ApiEmployee;
  // Tanggal & Masa Kerja
  tmtPengangkatan: Date | null;
  tmtPengangkatanFormatted: string;
  tmtKgbTerakhir: Date | null;
  tmtKgbTerakhirFormatted: string;
  kgbSelanjutnya: Date | null;
  kgbSelanjutnyaFormatted: string;
  tahunKgbSelanjutnya: number | null;
  bulanKgbSelanjutnyaStr: string;

  // Masa Kerja
  masaKerja: {
    years: number;
    months: number;
    text: string;
  } | null;
  mkgCurrentYears: number;
  mkgNextYears: number;
  isMaxMasaKerja: boolean; // >= 32 tahun

  // Capaian Masa Kerja (0 - 32 tahun)
  progressPercentage: number;
  currentStepIndex: number; // 0 - 16
  totalSteps: number; // 16

  // Status & Urgensi
  status:
    | "lewat_tempo"
    | "segera"
    | "tahun_berjalan"
    | "mendatang"
    | "maksimal"
    | "tidak_diketahui";
  statusLabel: string;
  statusBadgeColor: "rose" | "amber" | "blue" | "emerald" | "indigo" | "slate";

  // Countdown / Keterangan Sisa Waktu
  remainingTime: {
    days: number;
    months: number;
    years: number;
    text: string;
    isOverdue: boolean;
  } | null;

  // Siklus Lengkap (16 Tahapan hingga 32 Tahun)
  timelineSteps: KGBStep[];
}

export function parseDateString(raw?: string | null): Date | null {
  if (!raw || !raw.trim()) return null;
  const clean = raw.trim();

  // Match YYYY-MM-DD
  const matchYMD = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchYMD) {
    const d = new Date(
      parseInt(matchYMD[1], 10),
      parseInt(matchYMD[2], 10) - 1,
      parseInt(matchYMD[3], 10)
    );
    if (!isNaN(d.getTime())) return d;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const matchDMY = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchDMY) {
    const d = new Date(
      parseInt(matchDMY[3], 10),
      parseInt(matchDMY[2], 10) - 1,
      parseInt(matchDMY[1], 10)
    );
    if (!isNaN(d.getTime())) return d;
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

export function formatIndonesianDate(
  date: Date | null,
  options: { includeDay?: boolean } = { includeDay: true }
): string {
  if (!date || isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: options.includeDay ? "numeric" : undefined,
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Menghitung selisih tahun dan bulan antara dua tanggal
 */
export function calculateYearMonthDiff(
  startDate: Date,
  endDate: Date = new Date()
): { years: number; months: number; totalMonths: number } {
  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  if (endDate.getDate() < startDate.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  years = Math.max(0, years);
  months = Math.max(0, months);
  return {
    years,
    months,
    totalMonths: years * 12 + months,
  };
}

/**
 * Tambah N tahun ke sebuah tanggal
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date.getTime());
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Proses kalkulasi data KGB untuk satu pegawai
 */
export function processEmployeeKGB(
  employee: ApiEmployee,
  referenceDate: Date = new Date()
): KGBRecord {
  // 1. Tentukan TMT Pengangkatan (CPNS atau NIP atau Golongan)
  let tmtPengangkatan = parseDateString(employee.tmt_cpns);
  if (!tmtPengangkatan) {
    tmtPengangkatan = parseTMTKerjaFromNIP(employee.nip);
  }
  if (!tmtPengangkatan) {
    tmtPengangkatan = parseDateString(employee.tmt_pns);
  }
  if (!tmtPengangkatan) {
    tmtPengangkatan = parseDateString(employee.tmt_golongan);
  }

  // Hitung masa kerja dari TMT Pengangkatan
  let masaKerja: KGBRecord["masaKerja"] = null;
  let currentWorkYears = 0;
  let currentWorkMonths = 0;

  if (tmtPengangkatan) {
    const diff = calculateYearMonthDiff(tmtPengangkatan, referenceDate);
    currentWorkYears = diff.years;
    currentWorkMonths = diff.months;
    masaKerja = {
      years: diff.years,
      months: diff.months,
      text: `${diff.years} thn ${diff.months} bln`,
    };
  }

  const isMaxMasaKerja = currentWorkYears >= 32;

  // 2. Tentukan TMT KGB Terakhir & KGB Selanjutnya
  let tmtKgbTerakhir = parseDateString(employee.tmt_kgb_terakhir);
  let kgbSelanjutnya = parseDateString(employee.kgb_selanjutnya);

  // Jika belum ada di record tapi ada TMT pengangkatan
  if (!kgbSelanjutnya && !tmtKgbTerakhir && tmtPengangkatan) {
    // KGB terjadi setiap 2 tahun dari pengangkatan:
    // Cari kelipatan 2 tahun
    const cycleCount = Math.floor(currentWorkYears / 2);
    if (cycleCount > 0) {
      tmtKgbTerakhir = addYears(tmtPengangkatan, cycleCount * 2);
    } else {
      tmtKgbTerakhir = tmtPengangkatan;
    }

    if (!isMaxMasaKerja) {
      kgbSelanjutnya = addYears(tmtPengangkatan, (cycleCount + 1) * 2);
    }
  } else if (tmtKgbTerakhir && !kgbSelanjutnya && !isMaxMasaKerja) {
    kgbSelanjutnya = addYears(tmtKgbTerakhir, 2);
  } else if (!tmtKgbTerakhir && kgbSelanjutnya) {
    tmtKgbTerakhir = addYears(kgbSelanjutnya, -2);
  }

  // Jika sudah mencapai masa kerja maksimal (>= 32 tahun), KGB berikutnya tidak ada
  if (isMaxMasaKerja) {
    kgbSelanjutnya = null;
  }

  // MKG (Masa Kerja Golongan) perhitungan
  const mkgCurrentYears = Math.min(32, Math.floor(currentWorkYears / 2) * 2);
  const mkgNextYears = isMaxMasaKerja ? 32 : Math.min(32, mkgCurrentYears + 2);

  // Capaian progress (0 - 100%) berdasarkan max 32 tahun
  const progressPercentage = Math.min(
    100,
    Math.round((Math.min(32, currentWorkYears + currentWorkMonths / 12) / 32) * 100)
  );

  const currentStepIndex = Math.min(16, Math.floor(currentWorkYears / 2));

  // 3. Status Urgensi & Sisa Waktu Menuju KGB Berikutnya
  let status: KGBRecord["status"] = "tidak_diketahui";
  let statusLabel = "Data Belum Lengkap";
  let statusBadgeColor: KGBRecord["statusBadgeColor"] = "slate";
  let remainingTime: KGBRecord["remainingTime"] = null;

  if (isMaxMasaKerja) {
    status = "maksimal";
    statusLabel = "Masa Kerja Maksimal (32 Thn)";
    statusBadgeColor = "indigo";
  } else if (kgbSelanjutnya) {
    const diffMs = kgbSelanjutnya.getTime() - referenceDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const isOverdue = diffDays < 0;
    const absDays = Math.abs(diffDays);
    const monthsApprox = Math.floor(absDays / 30);
    const remDays = absDays % 30;

    let countdownText = "";
    if (isOverdue) {
      if (absDays === 0) {
        countdownText = "Jatuh tempo hari ini";
      } else if (absDays < 30) {
        countdownText = `Lewat tempo ${absDays} hari lalu`;
      } else {
        countdownText = `Lewat tempo ${monthsApprox} bln ${remDays > 0 ? `${remDays} hr` : ""} lalu`;
      }
    } else {
      if (diffDays === 0) {
        countdownText = "Jatuh tempo hari ini";
      } else if (diffDays <= 30) {
        countdownText = `${diffDays} hari lagi`;
      } else if (diffDays <= 365) {
        countdownText = `${monthsApprox} bulan ${remDays > 0 ? `${remDays} hr` : ""} lagi`;
      } else {
        const remYears = Math.floor(diffDays / 365);
        const remMonths = Math.floor((diffDays % 365) / 30);
        countdownText = `${remYears} thn ${remMonths > 0 ? `${remMonths} bln` : ""} lagi`;
      }
    }

    remainingTime = {
      days: diffDays,
      months: monthsApprox,
      years: Math.floor(absDays / 365),
      text: countdownText,
      isOverdue,
    };

    if (isOverdue) {
      status = "lewat_tempo";
      statusLabel = "Jatuh Tempo (Perlu SK)";
      statusBadgeColor = "rose";
    } else if (diffDays <= 90) {
      status = "segera";
      statusLabel = "Segera Jatuh Tempo (< 3 Bln)";
      statusBadgeColor = "amber";
    } else if (diffDays <= 365) {
      status = "tahun_berjalan";
      statusLabel = "Tahun Ini (< 1 Thn)";
      statusBadgeColor = "blue";
    } else {
      status = "mendatang";
      statusLabel = "Mendatang (> 1 Thn)";
      statusBadgeColor = "emerald";
    }
  }

  // 4. Bangun Timeline 16 Langkah (Maksimal 32 Tahun, setiap 2 Tahun)
  const timelineSteps: KGBStep[] = [];
  if (tmtPengangkatan) {
    for (let i = 1; i <= 16; i++) {
      const stepMkg = i * 2;
      const stepDate = addYears(tmtPengangkatan, stepMkg);

      let stepStatus: KGBStep["status"] = "future";
      const isNext = !isMaxMasaKerja && i === currentStepIndex + 1;

      if (i <= currentStepIndex) {
        stepStatus = i === currentStepIndex ? "current" : "completed";
      } else if (isNext) {
        stepStatus = "next";
      } else {
        stepStatus = "future";
      }

      timelineSteps.push({
        stepNumber: i,
        mkgYears: stepMkg,
        estimatedDate: stepDate,
        estimatedDateFormatted: formatIndonesianDate(stepDate),
        status: stepStatus,
        isTargetNext: isNext,
      });
    }
  }

  const bulanNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  return {
    employee,
    tmtPengangkatan,
    tmtPengangkatanFormatted: formatIndonesianDate(tmtPengangkatan),
    tmtKgbTerakhir,
    tmtKgbTerakhirFormatted: formatIndonesianDate(tmtKgbTerakhir),
    kgbSelanjutnya,
    kgbSelanjutnyaFormatted: formatIndonesianDate(kgbSelanjutnya),
    tahunKgbSelanjutnya: kgbSelanjutnya ? kgbSelanjutnya.getFullYear() : null,
    bulanKgbSelanjutnyaStr: kgbSelanjutnya
      ? `${bulanNames[kgbSelanjutnya.getMonth()]} ${kgbSelanjutnya.getFullYear()}`
      : "—",
    masaKerja,
    mkgCurrentYears,
    mkgNextYears,
    isMaxMasaKerja,
    progressPercentage,
    currentStepIndex,
    totalSteps: 16,
    status,
    statusLabel,
    statusBadgeColor,
    remainingTime,
    timelineSteps,
  };
}
