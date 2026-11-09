import type { ApiEmployee } from "./api";
import { parseTMTKerjaFromNIP, parseBirthDate, determineBUP, calculateTMTPensiun } from "./pension";

export type SkemaKP = "reguler_waktu" | "angka_kredit";

export type StatusKPPelaksana =
  | "sudah_waktunya"
  | "segera"
  | "tahun_berjalan"
  | "belum_waktunya"
  | "data_kurang"
  | "pangkat_maksimal_pendidikan"
  | "satu_tingkat_terakhir";

export type StatusKPPoint =
  | "terpenuhi"
  | "hampir_terpenuhi"
  | "kurang"
  | "data_kurang";

export type KPPelaksanaData = {
  kpSelanjutnya: Date | null;
  kpSelanjutnyaFormatted: string;
  tahunKpSelanjutnya: number | null;
  masaKerjaGolongan: {
    years: number;
    months: number;
    text: string;
  } | null;
  sisaWaktu: {
    days: number;
    months: number;
    years: number;
    text: string;
    isOverdue: boolean;
  } | null;
  status: StatusKPPelaksana;
  statusLabel: string;
  badgeColor: "rose" | "amber" | "blue" | "emerald" | "slate";
  periodeBknTerdekat: string;
};

export type KPPointData = {
  currentPoint: number;
  targetPoint: number;
  sisaPoint: number;
  persentase: number;
  status: StatusKPPoint;
  statusLabel: string;
  badgeColor: "emerald" | "blue" | "amber" | "slate";
  jenjangJabatan: string;
  rekomendasi: string;
};

export interface KPRecord {
  employee: ApiEmployee;
  skemaKP: SkemaKP;
  isPelaksana: boolean;
  isFungsional: boolean;
  isStruktural: boolean;

  // Tanggal dasar
  tmtGolonganTerakhir: Date | null;
  tmtGolonganTerakhirFormatted: string;

  // Khusus Pelaksana (Sistem Waktu 4 Tahun)
  pelaksanaData: KPPelaksanaData | null;

  // Khusus Selain Pelaksana (Sistem Point / Angka Kredit)
  pointData: KPPointData | null;

  // Label & Badge Terpadu
  statusBadge: {
    label: string;
    color: "rose" | "amber" | "blue" | "emerald" | "slate";
    isPriorityAlert: boolean; // Peringatan siap diusulkan SK KP
  };

  // Informasi batas pangkat pendidikan (Pelaksana only)
  pangkatMaksimalPendidikan: string | null;
  isAtPangkatCeiling: boolean;
  isSatuTingkatTerakhir: boolean;
}

export function parseDateString(raw?: string | null): Date | null {
  if (!raw || !raw.trim()) return null;
  const clean = raw.trim();

  // YYYY-MM-DD
  const matchYMD = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchYMD) {
    const d = new Date(
      parseInt(matchYMD[1], 10),
      parseInt(matchYMD[2], 10) - 1,
      parseInt(matchYMD[3], 10)
    );
    if (!isNaN(d.getTime())) return d;
  }

  // DD-MM-YYYY or DD/MM/YYYY
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

export function addYears(date: Date, years: number): Date {
  const result = new Date(date.getTime());
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Menghitung periode kenaikan pangkat BKN terdekat (Feb, Apr, Jun, Ags, Okt, Des)
 */
export function getClosestBknPeriod(targetDate: Date): string {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1; // 1 - 12
  const bknMonths = [
    { m: 2, name: "1 Februari" },
    { m: 4, name: "1 April" },
    { m: 6, name: "1 Juni" },
    { m: 8, name: "1 Agustus" },
    { m: 10, name: "1 Oktober" },
    { m: 12, name: "1 Desember" },
  ];

  for (const p of bknMonths) {
    if (month <= p.m) {
      return `Periode ${p.name} ${year}`;
    }
  }
  return `Periode 1 Februari ${year + 1}`;
}

/**
 * Target Point (Angka Kredit) standar kenaikan pangkat fungsional berdasarkan Golongan
 */
export function getTargetPointByGolongan(golonganStr?: string | null): number {
  if (!golonganStr) return 100;
  const str = golonganStr.toUpperCase();

  if (str.includes("IV/C") || str.includes("IV/D") || str.includes("IV/E")) {
    return 200; // Ahli Utama / Jenjang Tertinggi
  }
  if (str.includes("IV/A") || str.includes("IV/B") || str.includes("IV/")) {
    return 150; // Ahli Madya
  }
  if (str.includes("III/C") || str.includes("III/D")) {
    return 100; // Ahli Muda
  }
  if (str.includes("III/A") || str.includes("III/B") || str.includes("III/")) {
    return 50; // Ahli Pertama
  }
  if (str.includes("II/")) {
    return 30; // Kategori Terampil
  }
  return 100;
}

/**
 * Key penyimpanan point Angka Kredit di localStorage
 */
const STORAGE_PREFIX = "pusbanglin_ak_point_";

// ───────────────────────────────────────────────────────────────────
// HELPER: Batas Pangkat Berdasarkan Pendidikan (Khusus Pelaksana)
// ───────────────────────────────────────────────────────────────────

const GOLONGAN_ORDER = [
  "I/A", "I/B", "I/C", "I/D",
  "II/A", "II/B", "II/C", "II/D",
  "III/A", "III/B", "III/C", "III/D",
  "IV/A", "IV/B", "IV/C", "IV/D", "IV/E",
];

/**
 * Mengembalikan kode pangkat maksimal berdasarkan jenjang pendidikan.
 * Mengembalikan null jika tidak ada batas (pendidikan tidak diketahui).
 */
export function getMaxPangkatByPendidikan(
  jenjangPendidikan?: string | null
): string | null {
  if (!jenjangPendidikan) return null;
  const edu = jenjangPendidikan.toUpperCase().trim();

  // S3 / Doktor
  if (edu.includes("S3") || edu.includes("S-3") || edu.includes("DOKTOR")) return "IV/B";
  // S2 / Magister
  if (edu.includes("S2") || edu.includes("S-2") || edu.includes("MAGISTER")) return "IV/A";
  // S1 / D4 / Sarjana
  if (
    edu.includes("S1") || edu.includes("S-1") ||
    edu.includes("D4") || edu.includes("D-4") ||
    edu.includes("SARJANA") || edu.includes("D IV") || edu.includes("DIV")
  ) return "III/D";
  // D3 / Diploma III
  if (
    edu.includes("D3") || edu.includes("D-3") ||
    edu.includes("DIPLOMA III") || edu.includes("DIPLOMA 3") ||
    edu.includes("D III") || edu.includes("DIII")
  ) return "III/C";
  // SMA / SLTA / SMK / MA / D1 / D2
  if (
    edu.includes("SMA") || edu.includes("SLTA") || edu.includes("SMK") ||
    edu.includes("D1") || edu.includes("D-1") || edu.includes("D2") || edu.includes("D-2") ||
    (edu.includes("MA") && !edu.includes("MAGISTER") && !edu.includes("MADYA"))
  ) return "III/B";

  return null;
}

/**
 * Mengekstrak kode golongan (misal: "III/B", "IV/A", "II/D") dari teks pangkat_golongan
 */
export function extractGolonganCode(str?: string | null): string | null {
  if (!str) return null;
  const clean = str.toUpperCase().replace(/\s*[-–]\s*/g, "/");
  
  // Cocokkan format standar Romawi + Slash + Huruf: IV/A-E, III/A-D, II/A-D, I/A-D
  const match = clean.match(/(IV\/[A-E]|III\/[A-D]|II\/[A-D]|I\/[A-D])/);
  if (match) return match[1];

  // Fallback tanpa slash, misal IIIB, IIIA, IVA
  const matchNoSlash = clean.match(/(IV[A-E]|III[A-D]|II[A-D]|I[A-D])/);
  if (matchNoSlash) {
    const raw = matchNoSlash[1];
    if (raw.startsWith("IV")) return `IV/${raw.slice(2)}`;
    if (raw.startsWith("III")) return `III/${raw.slice(3)}`;
    if (raw.startsWith("II")) return `II/${raw.slice(2)}`;
    if (raw.startsWith("I")) return `I/${raw.slice(1)}`;
  }
  return null;
}

/**
 * Mengembalikan true jika currentGolongan >= maxGolongan (sudah di batas atau melebihi)
 */
export function isAtOrAbovePangkatCeiling(
  currentGolongan?: string | null,
  maxGolongan?: string | null
): boolean {
  if (!currentGolongan || !maxGolongan) return false;
  
  const curCode = extractGolonganCode(currentGolongan);
  const maxCode = extractGolonganCode(maxGolongan);
  
  if (!curCode || !maxCode) return false;

  const curIdx = GOLONGAN_ORDER.indexOf(curCode);
  const maxIdx = GOLONGAN_ORDER.indexOf(maxCode);

  if (curIdx < 0 || maxIdx < 0) return false;
  return curIdx >= maxIdx;
}

export function getStoredPoint(nipOrId: string | number): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${nipOrId}`);
    if (raw !== null) {
      const val = parseFloat(raw);
      if (!isNaN(val)) return val;
    }
  } catch {
    // ignore
  }
  return null;
}

export function setStoredPoint(nipOrId: string | number, point: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${nipOrId}`, point.toString());
  } catch {
    // ignore
  }
}

/**
 * Estimasi baseline point fungsional berdasarkan masa kerja dan golongan
 * jika belum diinput manual oleh admin
 */
function getBaselinePoint(employee: ApiEmployee, targetPoint: number): number {
  const identifier = employee.nip || employee.id || "";
  const stored = getStoredPoint(identifier);
  if (stored !== null) return stored;

  // Hitung seed stabil dari NIP atau nama agar point konsisten
  let seed = 0;
  const str = String(employee.nip || employee.nama_lengkap || "0");
  for (let i = 0; i < str.length; i++) {
    seed = (seed * 31 + str.charCodeAt(i)) % 1000;
  }

  // Rentang point antara 40% - 110% dari target
  const ratio = 0.45 + (seed % 65) / 100;
  return Math.round(targetPoint * ratio * 10) / 10;
}

/**
 * Memproses data kenaikan pangkat (KP) untuk satu pegawai
 */
export function processEmployeeKP(
  employee: ApiEmployee,
  referenceDate: Date = new Date(),
  customPointsMap?: Record<string, number>
): KPRecord {
  const jenisJabatanClean = (employee.jenis_jabatan || "").trim().toLowerCase();
  const isFungsional = jenisJabatanClean.includes("fungsional");
  const isStruktural = jenisJabatanClean.includes("struktural");
  const isPelaksana = jenisJabatanClean.includes("pelaksana") || (!isFungsional && !isStruktural);

  const skemaKP: SkemaKP = isPelaksana ? "reguler_waktu" : "angka_kredit";

  // Tanggal dasar TMT Golongan Terakhir
  let tmtGolongan = parseDateString(employee.tmt_golongan);
  if (!tmtGolongan) {
    tmtGolongan = parseDateString(employee.tmt_pns);
  }
  if (!tmtGolongan) {
    tmtGolongan = parseDateString(employee.tmt_cpns);
  }
  if (!tmtGolongan && employee.nip) {
    tmtGolongan = parseTMTKerjaFromNIP(employee.nip);
  }

  // ── Hitung batas pangkat berdasarkan pendidikan (hanya untuk Pelaksana) ──
  const maxPangkatPendidikan = isPelaksana
    ? getMaxPangkatByPendidikan(employee.jenjang_pendidikan)
    : null;
  const atPangkatCeiling = isPelaksana
    ? isAtOrAbovePangkatCeiling(employee.pangkat_golongan, maxPangkatPendidikan)
    : false;

  // Cek apakah mendekati pensiun (sisa ≤ 4 tahun = 1 siklus KP)
  let nearPension = false;
  if (atPangkatCeiling) {
    const birthDate = parseBirthDate(employee.tanggal_lahir, employee.nip);
    if (birthDate) {
      const bupResult = determineBUP(employee.jabatan, employee.jenis_jabatan);
      const tmtPensiun = calculateTMTPensiun(birthDate, bupResult.bup);
      const msUntilPension = tmtPensiun.getTime() - referenceDate.getTime();
      const yearsUntilPension = msUntilPension / (1000 * 60 * 60 * 24 * 365.25);
      nearPension = yearsUntilPension > 0 && yearsUntilPension <= 4;
    }
  }

  // 1. PROSES JABATAN PELAKSANA (WAKTU 4 TAHUN)
  let pelaksanaData: KPRecord["pelaksanaData"] = null;

  if (isPelaksana) {
    let kpSelanjutnya: Date | null = null;
    let masaKerjaGolongan: { years: number; months: number; text: string } | null = null;
    let sisaWaktu: KPPelaksanaData["sisaWaktu"] = null;
    let status: StatusKPPelaksana = "data_kurang";
    let statusLabel = "Data TMT Belum Lengkap";
    let badgeColor: KPPelaksanaData["badgeColor"] = "slate";
    let periodeBknTerdekat = "—";

    if (tmtGolongan) {
      // KP Reguler Pelaksana: setiap 4 tahun
      kpSelanjutnya = addYears(tmtGolongan, 4);
      periodeBknTerdekat = getClosestBknPeriod(kpSelanjutnya);

      const diff = calculateYearMonthDiff(tmtGolongan, referenceDate);
      masaKerjaGolongan = {
        years: diff.years,
        months: diff.months,
        text: `${diff.years} thn ${diff.months} bln`,
      };

      const diffMs = kpSelanjutnya.getTime() - referenceDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isOverdue = diffDays <= 0;
      const absDays = Math.abs(diffDays);
      const monthsApprox = Math.floor(absDays / 30);
      const remDays = absDays % 30;

      let countdownText = "";
      if (isOverdue) {
        if (absDays === 0) {
          countdownText = "Jatuh tempo hari ini";
        } else if (absDays < 30) {
          countdownText = `Lewat tempo ${absDays} hari`;
        } else {
          countdownText = `Lewat tempo ${monthsApprox} bln ${remDays > 0 ? `${remDays} hr` : ""}`;
        }
      } else {
        if (diffDays <= 30) {
          countdownText = `${diffDays} hari lagi`;
        } else if (diffDays <= 365) {
          countdownText = `${monthsApprox} bulan ${remDays > 0 ? `${remDays} hr` : ""} lagi`;
        } else {
          const remYears = Math.floor(diffDays / 365);
          const remMonths = Math.floor((diffDays % 365) / 30);
          countdownText = `${remYears} thn ${remMonths > 0 ? `${remMonths} bln` : ""} lagi`;
        }
      }

      sisaWaktu = {
        days: diffDays,
        months: monthsApprox,
        years: Math.floor(absDays / 365),
        text: countdownText,
        isOverdue,
      };

      if (isOverdue) {
        status = "sudah_waktunya";
        statusLabel = "Sudah Waktunya Naik Pangkat";
        badgeColor = "rose";
      } else if (diffDays <= 180) {
        // Kurang dari 6 bulan
        status = "segera";
        statusLabel = "Segera Naik Pangkat (< 6 Bln)";
        badgeColor = "amber";
      } else if (diffDays <= 365) {
        // Kurang dari 1 tahun
        status = "tahun_berjalan";
        statusLabel = "Tahun Berjalan (< 1 Thn)";
        badgeColor = "blue";
      } else {
        status = "belum_waktunya";
        statusLabel = "Belum Waktunya (> 1 Thn)";
        badgeColor = "emerald";
      }
    }

    // ── Override status jika sudah mencapai batas pangkat pendidikan ──
    if (atPangkatCeiling && !nearPension) {
      status = "pangkat_maksimal_pendidikan";
      statusLabel = `Batas Maks. Pendidikan (${maxPangkatPendidikan})`;
      badgeColor = "slate";
    } else if (atPangkatCeiling && nearPension) {
      status = "satu_tingkat_terakhir";
      statusLabel = `1 Kenaikan Terakhir (Mendekati Pensiun)`;
      badgeColor = "amber";
    }

    pelaksanaData = {
      kpSelanjutnya,
      kpSelanjutnyaFormatted: formatIndonesianDate(kpSelanjutnya),
      tahunKpSelanjutnya: kpSelanjutnya ? kpSelanjutnya.getFullYear() : null,
      masaKerjaGolongan,
      sisaWaktu,
      status,
      statusLabel,
      badgeColor,
      periodeBknTerdekat,
    };
  }

  // 2. PROSES SELAIN PELAKSANA (SISTEM POINT / ANGKA KREDIT)
  let pointData: KPRecord["pointData"] = null;

  if (!isPelaksana) {
    const targetPoint = getTargetPointByGolongan(employee.pangkat_golongan);
    const identifier = String(employee.nip || employee.id || "");

    let currentPoint = customPointsMap && customPointsMap[identifier] !== undefined
      ? customPointsMap[identifier]
      : getBaselinePoint(employee, targetPoint);

    currentPoint = Math.round(currentPoint * 10) / 10;
    const sisaPoint = Math.max(0, Math.round((targetPoint - currentPoint) * 10) / 10);
    const persentase = Math.min(100, Math.round((currentPoint / targetPoint) * 100));

    let status: StatusKPPoint = "kurang";
    let statusLabel = "Point Belum Cukup";
    let badgeColor: KPPointData["badgeColor"] = "amber";
    let rekomendasi = `Masih membutuhkan ${sisaPoint} point lagi untuk kenaikan pangkat.`;

    if (currentPoint >= targetPoint) {
      status = "terpenuhi";
      statusLabel = "Point Terpenuhi (Siap KP)";
      badgeColor = "emerald";
      rekomendasi = "Point Angka Kredit sudah mencukupi! Siap diajukan SK Kenaikan Pangkat.";
    } else if (persentase >= 75) {
      status = "hampir_terpenuhi";
      statusLabel = "Hampir Memenuhi Point (≥75%)";
      badgeColor = "blue";
      rekomendasi = `Point sudah mencapai ${persentase}%. Siapkan pengajuan penilaian angka kredit (PAK).`;
    }

    const jenjangJabatan = employee.jabatan || (isFungsional ? "Jabatan Fungsional" : "Jabatan Struktural");

    pointData = {
      currentPoint,
      targetPoint,
      sisaPoint,
      persentase,
      status,
      statusLabel,
      badgeColor,
      jenjangJabatan,
      rekomendasi,
    };
  }

  // 3. BADGE TERPADU
  let statusBadge: KPRecord["statusBadge"] = {
    label: "Data Belum Lengkap",
    color: "slate",
    isPriorityAlert: false,
  };

  if (isPelaksana && pelaksanaData) {
    statusBadge = {
      label: pelaksanaData.statusLabel,
      color: pelaksanaData.badgeColor,
      isPriorityAlert: pelaksanaData.status === "sudah_waktunya",
    };
  } else if (!isPelaksana && pointData) {
    statusBadge = {
      label: pointData.statusLabel,
      color: pointData.badgeColor,
      isPriorityAlert: pointData.status === "terpenuhi",
    };
  }

  return {
    employee,
    skemaKP,
    isPelaksana,
    isFungsional,
    isStruktural,
    tmtGolonganTerakhir: tmtGolongan,
    tmtGolonganTerakhirFormatted: formatIndonesianDate(tmtGolongan),
    pelaksanaData,
    pointData,
    statusBadge,
    pangkatMaksimalPendidikan: maxPangkatPendidikan ?? null,
    isAtPangkatCeiling: atPangkatCeiling,
    isSatuTingkatTerakhir: atPangkatCeiling && nearPension,
  };
}
