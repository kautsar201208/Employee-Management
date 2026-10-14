
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const PROJECT_ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(
  PROJECT_ROOT,
  "laporan_pencocokan_foto.csv"
);
const BACKUP_PATH = path.join(
  PROJECT_ROOT,
  "backup_profile_image_sebelum_update.csv"
);
const RESULT_PATH = path.join(
  PROJECT_ROOT,
  "laporan_update_profile_image.csv"
);

// Default aman: hanya pemeriksaan, tanpa mengubah database.
// Untuk benar-benar memperbarui, gunakan APPLY_PROFILE_IMAGES=true.
const APPLY_CHANGES =
  process.env.APPLY_PROFILE_IMAGES === "true";

// Akun testing tidak boleh diperbarui.
const EXCLUDED_FILENAMES = new Set(["andi.png"]);

// Pencocokan khusus Eva: gelar S.S. tidak tercantum di nama file.
// ID ini berasal dari kandidat pada laporan pencocokan sebelumnya.
const APPROVED_SPECIAL_MATCHES = {
  "eva yenita syam.png": {
    employeeId: "a0304953-fe86-4f3f-855c-d4e39b6c72d6",
    expectedName: "Eva Yenita Syam, S.S",
  },
};

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error(
    "SUPABASE_URL atau SUPABASE_SECRET_KEY tidak ditemukan di backend/.env"
  );
}

if (!fs.existsSync(REPORT_PATH)) {
  throw new Error(
    `Laporan pencocokan tidak ditemukan: ${REPORT_PATH}`
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function parseCSV(content) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (quoted) {
      if (char === '"' && content[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && content[i + 1] === "\n") {
        i++;
      }

      row.push(field);
      field = "";

      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
    } else {
      field += char;
    }
  }

  if (quoted) {
    throw new Error("CSV memiliki tanda kutip yang tidak berpasangan.");
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }
  }

  if (rows.length < 2) {
    throw new Error("CSV kosong atau tidak memiliki data pegawai.");
  }

  const headers = rows[0].map((value) =>
    value.replace(/^\uFEFF/, "").trim()
  );

  return rows.slice(1).map((values) => {
    const item = {};

    headers.forEach((header, index) => {
      item[header] = (values[index] || "").trim();
    });

    return item;
  });
}

function normalizeFilename(filename) {
  return path.basename(filename || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCSV(filePath, headers, rows) {
  const content = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(",")
    ),
  ].join("\r\n");

  fs.writeFileSync(filePath, "\uFEFF" + content, "utf8");
}

function extractCandidateId(candidateText) {
  const match = (candidateText || "").match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i
  );

  return match ? match[0] : "";
}

async function main() {
  const csvContent = fs.readFileSync(REPORT_PATH, "utf8");
  const reportRows = parseCSV(csvContent);

  const planned = [];
  const skipped = [];
  const seenEmployeeIds = new Set();

  for (const row of reportRows) {
    const filename = row.nama_file_lokal || "";
    const normalizedFilename = normalizeFilename(filename);

    if (EXCLUDED_FILENAMES.has(normalizedFilename)) {
      skipped.push({
        nama_file_lokal: filename,
        alasan: "Akun testing Andi dikecualikan",
      });
      continue;
    }

    if (!row.public_url || !/^https?:\/\//i.test(row.public_url)) {
      skipped.push({
        nama_file_lokal: filename,
        alasan: "URL foto kosong atau tidak valid",
      });
      continue;
    }

    let employeeId = "";
    let source = "";

    if (row.status === "COCOK_PASTI") {
      employeeId = row.employee_id || "";
      source = "COCOK_PASTI";
    } else {
      const special =
        APPROVED_SPECIAL_MATCHES[normalizedFilename];

      if (special) {
        employeeId = special.employeeId;
        source = "PENC0COKAN_KHUSUS_DIKONFIRMASI_NAMA";
      } else {
        skipped.push({
          nama_file_lokal: filename,
          alasan: `Status belum disetujui: ${row.status || "kosong"}`,
        });
        continue;
      }
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        employeeId
      )
    ) {
      skipped.push({
        nama_file_lokal: filename,
        alasan: "ID pegawai kosong atau bukan UUID valid",
      });
      continue;
    }

    if (seenEmployeeIds.has(employeeId)) {
      throw new Error(
        `Lebih dari satu foto mengarah ke pegawai ${employeeId}. ` +
        "Proses dihentikan untuk mencegah salah pembaruan."
      );
    }

    seenEmployeeIds.add(employeeId);

    planned.push({
      nama_file_lokal: filename,
      employee_id: employeeId,
      public_url_baru: row.public_url,
      sumber_pencocokan: source,
      nama_database: row.nama_database || "",
      profile_image_lama: "",
      status_update: "MENUNGGU_PEMERIKSAAN",
      pesan: "",
    });
  }

  // Ambil data terbaru langsung dari database sebelum menulis.
  // Query ini hanya membaca tabel employees.
  const ids = planned.map((item) => item.employee_id);
  const currentEmployees = new Map();

  for (let i = 0; i < ids.length; i += 100) {
    const batchIds = ids.slice(i, i + 100);

    const { data, error } = await supabase
      .from("employees")
      .select("id, nama, nama_lengkap, profile_image")
      .in("id", batchIds);

    if (error) {
      throw new Error(`Gagal membaca employees: ${error.message}`);
    }

    for (const employee of data || []) {
      currentEmployees.set(employee.id, employee);
    }
  }

  const ready = [];

  for (const item of planned) {
    const employee = currentEmployees.get(item.employee_id);

    if (!employee) {
      item.status_update = "DILEWATI";
      item.pesan = "ID pegawai tidak ditemukan di database";
      continue;
    }

    if (
      item.sumber_pencocokan ===
        "PENC0COKAN_KHUSUS_DIKONFIRMASI_NAMA" &&
      normalizeFilename(item.nama_file_lokal) !==
        "eva yenita syam.png"
    ) {
      item.status_update = "DILEWATI";
      item.pesan = "Pencocokan khusus tidak valid";
      continue;
    }

    item.nama_database =
      employee.nama_lengkap || employee.nama || item.nama_database;

    item.profile_image_lama = employee.profile_image || "";

    if (employee.profile_image === item.public_url_baru) {
      item.status_update = "TIDAK_BERUBAH";
      item.pesan = "URL foto sudah sama";
      continue;
    }

    item.status_update = APPLY_CHANGES
      ? "MENUNGGU_UPDATE"
      : "SIMULASI_SAJA";

    ready.push({
      ...item,
      profile_image_lama: employee.profile_image || "",
    });
  }

  // Cadangan dibuat sebelum pembaruan apa pun.
  // File ini tidak menimpa cadangan yang sudah ada.
  if (APPLY_CHANGES) {
    if (fs.existsSync(BACKUP_PATH)) {
      throw new Error(
        `Cadangan sudah ada: ${BACKUP_PATH}\n` +
        "Pindahkan cadangan lama terlebih dahulu jika ingin melanjutkan."
      );
    }

    writeCSV(
      BACKUP_PATH,
      [
        "employee_id",
        "nama_database",
        "nama_file_lokal",
        "profile_image_lama",
        "public_url_baru",
        "waktu_cadangan",
      ],
      ready.map((item) => ({
        employee_id: item.employee_id,
        nama_database: item.nama_database,
        nama_file_lokal: item.nama_file_lokal,
        profile_image_lama: item.profile_image_lama,
        public_url_baru: item.public_url_baru,
        waktu_cadangan: new Date().toISOString(),
      }))
    );

    console.log(`Cadangan URL lama: ${BACKUP_PATH}`);
  }

  if (APPLY_CHANGES) {
    for (const item of ready) {
      const { data, error } = await supabase
        .from("employees")
        .update({ profile_image: item.public_url_baru })
        .eq("id", item.employee_id)
        .select("id");

      if (error) {
        item.status_update = "GAGAL";
        item.pesan = error.message;
        continue;
      }

      if (!data || data.length !== 1) {
        item.status_update = "PERLU_VERIFIKASI";
        item.pesan =
          "Jumlah baris yang diperbarui bukan satu; periksa database.";
        continue;
      }

      item.status_update = "BERHASIL";
      item.pesan = "profile_image diperbarui";
    }
  }

  const allResults = [
    ...planned.map((item) => {
      const resolved = ready.find(
        (candidate) => candidate.employee_id === item.employee_id
      );

      return resolved || item;
    }),
  ];

  writeCSV(
    RESULT_PATH,
    [
      "employee_id",
      "nama_database",
      "nama_file_lokal",
      "profile_image_lama",
      "public_url_baru",
      "sumber_pencocokan",
      "status_update",
      "pesan",
    ],
    allResults
  );

  console.log("\n=== RINGKASAN ===");
  console.log(`Baris laporan dibaca: ${reportRows.length}`);
  console.log(`Kandidat unik: ${planned.length}`);
  console.log(`Siap diproses: ${ready.length}`);
  console.log(`Dikecualikan/tidak cocok: ${skipped.length}`);
  console.log(`Mode: ${APPLY_CHANGES ? "UPDATE DATABASE" : "SIMULASI"}`);
  console.log(`Laporan hasil: ${RESULT_PATH}`);

  if (skipped.length) {
    console.log("\n=== DATA YANG DILEWATI ===");
    for (const item of skipped) {
      console.log(`- ${item.nama_file_lokal}: ${item.alasan}`);
    }
  }

  if (!APPLY_CHANGES) {
    console.log(
      "\nSIMULASI SAJA: database tidak diubah. " +
      "Periksa laporan hasil sebelum mengaktifkan update."
    );
  } else {
    console.log("\n=== STATUS PEMBARUAN ===");
    for (const item of ready) {
      console.log(
        `${item.status_update}: ${item.nama_file_lokal} -> ${item.nama_database}`
      );
    }
    console.log(
      "\nPembaruan selesai. Periksa laporan hasil dan verifikasi data di Supabase."
    );
  }
}

main().catch((error) => {
  console.error("\nPROSES DIHENTIKAN:", error.message);
  process.exitCode = 1;
});
