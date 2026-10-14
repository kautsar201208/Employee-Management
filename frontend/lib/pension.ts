import type { ApiEmployee } from "./api";

export interface BUPResult {
  bup: 58 | 60;
  kategori: string;
  dasarAturan: string;
  badgeColor: "blue" | "indigo" | "emerald" | "amber" | "slate";
}

/**
 * Logika Batas Usia Pensiun (BUP) berdasarkan ketentuan:
 * - 58 Tahun: Pertama, Muda, Penyelia, Terampil, Mahir, Kepala Subbagian Tata Usaha, dan Pelaksana (seluruh jabatan di luar yang disebut)
 * - 60 Tahun: Madya, Utama, Kepala Pusat, Kepala Bidang, Struktural
 */
export function determineBUP(
  jabatanRaw?: string | null,
  jenisJabatanRaw?: string | null
): BUPResult {
  const j = (jabatanRaw || "").toLowerCase().trim();
  const jj = (jenisJabatanRaw || "").toLowerCase().trim();

  // 1. Pengecualian struktural setingkat pengawas / sub tata usaha -> 58 Tahun
  if (
    j.includes("subbagian") ||
    j.includes("sub tata usaha") ||
    j.includes("kasubbag") ||
    j.includes("keplasubtatausaha")
  ) {
    return {
      bup: 58,
      kategori: "Kepala Subbagian Tata Usaha",
      dasarAturan: "Jabatan Pengawas / Sub Tata Usaha (Batas Usia 58 Tahun)",
      badgeColor: "amber",
    };
  }

  // 2. Kategori BUP 60 Tahun
  if (j.includes("madya")) {
    return {
      bup: 60,
      kategori: "Ahli Madya",
      dasarAturan: "Jabatan Fungsional Keahlian Ahli Madya (Batas Usia 60 Tahun)",
      badgeColor: "indigo",
    };
  }

  if (j.includes("utama")) {
    return {
      bup: 60,
      kategori: "Ahli Utama",
      dasarAturan: "Jabatan Fungsional Keahlian Ahli Utama (Batas Usia 60 Tahun)",
      badgeColor: "indigo",
    };
  }

  if (j.includes("kepala pusat") || j.includes("kepalapusat") || j.includes("kapus")) {
    return {
      bup: 60,
      kategori: "Kepala Pusat",
      dasarAturan: "Jabatan Pimpinan Tinggi Pratama / Kepala Pusat (Batas Usia 60 Tahun)",
      badgeColor: "blue",
    };
  }

  if (j.includes("kepala bidang") || j.includes("kepalabidang") || j.includes("kabid")) {
    return {
      bup: 60,
      kategori: "Kepala Bidang",
      dasarAturan: "Jabatan Administrator / Kepala Bidang (Batas Usia 60 Tahun)",
      badgeColor: "blue",
    };
  }

  if (jj.includes("struktural") || j.includes("struktural")) {
    return {
      bup: 60,
      kategori: "Struktural",
      dasarAturan: "Jabatan Struktural / Eselon (Batas Usia 60 Tahun)",
      badgeColor: "blue",
    };
  }

  // 3. Kategori BUP 58 Tahun (Fungsional)
  if (j.includes("pertama")) {
    return {
      bup: 58,
      kategori: "Ahli Pertama",
      dasarAturan: "Jabatan Fungsional Keahlian Ahli Pertama (Batas Usia 58 Tahun)",
      badgeColor: "emerald",
    };
  }

  if (j.includes("muda")) {
    return {
      bup: 58,
      kategori: "Ahli Muda",
      dasarAturan: "Jabatan Fungsional Keahlian Ahli Muda (Batas Usia 58 Tahun)",
      badgeColor: "emerald",
    };
  }

  if (j.includes("penyelia")) {
    return {
      bup: 58,
      kategori: "Penyelia",
      dasarAturan: "Jabatan Fungsional Keterampilan Penyelia (Batas Usia 58 Tahun)",
      badgeColor: "amber",
    };
  }

  if (j.includes("mahir")) {
    return {
      bup: 58,
      kategori: "Mahir",
      dasarAturan: "Jabatan Fungsional Keterampilan Mahir (Batas Usia 58 Tahun)",
      badgeColor: "amber",
    };
  }

  if (j.includes("terampil")) {
    return {
      bup: 58,
      kategori: "Terampil",
      dasarAturan: "Jabatan Fungsional Keterampilan Terampil (Batas Usia 58 Tahun)",
      badgeColor: "amber",
    };
  }

  // 4. Default: Pelaksana (BUP 58)
  return {
    bup: 58,
    kategori: "Pelaksana",
    dasarAturan: "Jabatan Pelaksana / Administrasi Umum (Batas Usia 58 Tahun)",
    badgeColor: "slate",
  };
}

/**
 * Parse tanggal lahir dari field tanggal_lahir atau dari 8 digit awal NIP (YYYYMMDD)
 */
export function parseBirthDate(
  tanggalLahir?: string | null,
  nip?: string | null
): Date | null {
  if (tanggalLahir && tanggalLahir.trim()) {
    const raw = tanggalLahir.trim();
    const matchYMD = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (matchYMD) {
      const d = new Date(
        parseInt(matchYMD[1], 10),
        parseInt(matchYMD[2], 10) - 1,
        parseInt(matchYMD[3], 10)
      );
      if (!isNaN(d.getTime())) return d;
    }

    const matchDMY = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (matchDMY) {
      const d = new Date(
        parseInt(matchDMY[3], 10),
        parseInt(matchDMY[2], 10) - 1,
        parseInt(matchDMY[1], 10)
      );
      if (!isNaN(d.getTime())) return d;
    }

    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Fallback: parse 8 digit awal NIP (YYYYMMDD)
  if (nip) {
    const cleanNip = nip.replace(/\D/g, "");
    if (cleanNip.length >= 8) {
      const year = parseInt(cleanNip.slice(0, 4), 10);
      const month = parseInt(cleanNip.slice(4, 6), 10) - 1;
      const day = parseInt(cleanNip.slice(6, 8), 10);
      if (
        year >= 1940 &&
        year <= 2030 &&
        month >= 0 &&
        month <= 11 &&
        day >= 1 &&
        day <= 31
      ) {
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  return null;
}

/**
 * Menghitung Terhitung Mulai Tanggal (TMT) Pensiun sesuai regulasi BKN:
 * Pensiun berlaku mulai tanggal 1 bulan berikutnya setelah mencapai BUP.
 * (Kecuali jika lahir tanggal 1, TMT pensiun terhitung tanggal 1 bulan tersebut).
 */
export function calculateTMTPensiun(birthDate: Date, bup: number): Date {
  const birthYear = birthDate.getFullYear();
  const birthMonth = birthDate.getMonth();
  const birthDay = birthDate.getDate();

  const retirementYear = birthYear + bup;

  if (birthDay === 1) {
    return new Date(retirementYear, birthMonth, 1);
  }
  return new Date(retirementYear, birthMonth + 1, 1);
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

export interface PensionRecord {
  employee: ApiEmployee;
  bup: 58 | 60;
  kategori: string;
  dasarAturan: string;
  badgeColor: BUPResult["badgeColor"];
  birthDate: Date | null;
  birthDateFormatted: string;
  tmtPensiun: Date | null;
  tmtPensiunFormatted: string;
  tahunPensiun: number | null;
  bulanPensiunStr: string;
  currentAge: {
    years: number;
    months: number;
    text: string;
  } | null;
  remainingTime: {
    years: number;
    months: number;
    days: number;
    totalDays: number;
    isPassed: boolean;
    text: string;
  } | null;
  status: "sudah_pensiun" | "kritis" | "waspada" | "aktif" | "tidak_diketahui";
  statusLabel: string;
  statusBadgeColor: "red" | "orange" | "yellow" | "emerald" | "slate";
}

/**
 * Menghitung seluruh data lengkap pensiun untuk pegawai
 */
export function processEmployeePension(
  employee: ApiEmployee,
  referenceDate: Date = new Date()
): PensionRecord {
  const bupResult = determineBUP(employee.jabatan, employee.jenis_jabatan);
  const birthDate = parseBirthDate(employee.tanggal_lahir, employee.nip);

  if (!birthDate) {
    return {
      employee,
      bup: bupResult.bup,
      kategori: bupResult.kategori,
      dasarAturan: bupResult.dasarAturan,
      badgeColor: bupResult.badgeColor,
      birthDate: null,
      birthDateFormatted: "Belum tercatat",
      tmtPensiun: null,
      tmtPensiunFormatted: "—",
      tahunPensiun: null,
      bulanPensiunStr: "—",
      currentAge: null,
      remainingTime: null,
      status: "tidak_diketahui",
      statusLabel: "Data Lahir Kurang",
      statusBadgeColor: "slate",
    };
  }

  const tmtPensiun = calculateTMTPensiun(birthDate, bupResult.bup);

  // Hitung usia sekarang
  let ageYears = referenceDate.getFullYear() - birthDate.getFullYear();
  let ageMonths = referenceDate.getMonth() - birthDate.getMonth();
  if (referenceDate.getDate() < birthDate.getDate()) {
    ageMonths -= 1;
  }
  if (ageMonths < 0) {
    ageYears -= 1;
    ageMonths += 12;
  }
  const currentAge = {
    years: Math.max(0, ageYears),
    months: Math.max(0, ageMonths),
    text: `${Math.max(0, ageYears)} thn ${Math.max(0, ageMonths)} bln`,
  };

  // Hitung sisa waktu hingga TMT Pensiun
  const diffMs = tmtPensiun.getTime() - referenceDate.getTime();
  const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isPassed = totalDays <= 0;

  let remainingYears = tmtPensiun.getFullYear() - referenceDate.getFullYear();
  let remainingMonths = tmtPensiun.getMonth() - referenceDate.getMonth();
  let remainingDays = tmtPensiun.getDate() - referenceDate.getDate();

  if (remainingDays < 0) {
    remainingMonths -= 1;
    const prevMonthDays = new Date(
      tmtPensiun.getFullYear(),
      tmtPensiun.getMonth(),
      0
    ).getDate();
    remainingDays += prevMonthDays;
  }
  if (remainingMonths < 0) {
    remainingYears -= 1;
    remainingMonths += 12;
  }

  let remainingText = "";
  if (isPassed) {
    const passedDays = Math.abs(totalDays);
    remainingText =
      passedDays < 30
        ? `Telah pensiun ${passedDays} hari lalu`
        : `Telah pensiun ${Math.floor(passedDays / 30)} bulan lalu`;
  } else if (remainingYears > 0) {
    remainingText = `${remainingYears} thn ${remainingMonths} bln`;
  } else if (remainingMonths > 0) {
    remainingText = `${remainingMonths} bln ${remainingDays} hr`;
  } else {
    remainingText = `${remainingDays} hari lagi`;
  }

  const remainingTime = {
    years: Math.max(0, remainingYears),
    months: Math.max(0, remainingMonths),
    days: Math.max(0, remainingDays),
    totalDays,
    isPassed,
    text: remainingText,
  };

  // Status klasifikasi
  let status: PensionRecord["status"] = "aktif";
  let statusLabel = "Masa Bakti Aktif";
  let statusBadgeColor: PensionRecord["statusBadgeColor"] = "emerald";

  if (isPassed) {
    status = "sudah_pensiun";
    statusLabel = "Purna Tugas";
    statusBadgeColor = "slate";
  } else if (totalDays <= 365) {
    status = "kritis";
    statusLabel = "< 1 Tahun (Segera Pensiun)";
    statusBadgeColor = "red";
  } else if (totalDays <= 365 * 3) {
    status = "waspada";
    statusLabel = "1 - 3 Tahun Persiapan";
    statusBadgeColor = "orange";
  } else {
    status = "aktif";
    statusLabel = "> 3 Tahun Aktif";
    statusBadgeColor = "emerald";
  }

  return {
    employee,
    bup: bupResult.bup,
    kategori: bupResult.kategori,
    dasarAturan: bupResult.dasarAturan,
    badgeColor: bupResult.badgeColor,
    birthDate,
    birthDateFormatted: formatIndonesianDate(birthDate),
    tmtPensiun,
    tmtPensiunFormatted: formatIndonesianDate(tmtPensiun),
    tahunPensiun: tmtPensiun.getFullYear(),
    bulanPensiunStr: new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(tmtPensiun),
    currentAge,
    remainingTime,
    status,
    statusLabel,
    statusBadgeColor,
  };
}
