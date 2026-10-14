const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({
    path: path.join(__dirname, ".env")
});

// =====================================================
// KONFIGURASI
// =====================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const PROJECT_ROOT = path.resolve(__dirname, "..");

const UPLOAD_REPORT = path.join(
    PROJECT_ROOT,
    "laporan_upload_foto.csv"
);

const OUTPUT_REPORT = path.join(
    PROJECT_ROOT,
    "laporan_pencocokan_foto.csv"
);

const REVIEW_REPORT = path.join(
    PROJECT_ROOT,
    "foto_perlu_ditinjau.csv"
);

const BUCKET_NAME = "employee-profiles";

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error(
        "ERROR: SUPABASE_URL atau SUPABASE_SECRET_KEY tidak ditemukan."
    );
    console.error("Periksa file backend/.env.");
    process.exit(1);
}

const supabaseAdmin = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// =====================================================
// MEMBACA CSV DENGAN AMAN
// Mendukung koma dan tanda kutip di dalam kolom
// =====================================================

function parseCSV(content) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    content = content.replace(/^\uFEFF/, "");

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const next = content[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                field += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            row.push(field);
            field = "";
        } else if (
            (char === "\n" || char === "\r") &&
            !inQuotes
        ) {
            if (char === "\r" && next === "\n") {
                i++;
            }

            row.push(field);

            if (row.some(value => value.trim() !== "")) {
                rows.push(row);
            }

            row = [];
            field = "";
        } else {
            field += char;
        }
    }

    if (field !== "" || row.length > 0) {
        row.push(field);

        if (row.some(value => value.trim() !== "")) {
            rows.push(row);
        }
    }

    if (rows.length === 0) {
        return [];
    }

    const headers = rows.shift().map(header => header.trim());

    return rows.map(values => {
        const record = {};

        headers.forEach((header, index) => {
            record[header] = (values[index] || "").trim();
        });

        return record;
    });
}

// =====================================================
// NORMALISASI NAMA
// =====================================================

function normalizeName(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\.(png|jpe?g)$/i, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function tokenize(value) {
    return normalizeName(value)
        .split(" ")
        .filter(Boolean);
}

function isPartialNameMatch(fileName, employeeName) {
    const file = normalizeName(fileName);
    const employee = normalizeName(employeeName);

    if (!file || !employee || file === employee) {
        return false;
    }

    // Hanya tandai sebagai kandidat tinjauan,
    // bukan sebagai kecocokan yang sudah pasti.
    return employee.startsWith(file + " ") ||
        file.startsWith(employee + " ");
}

function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
}

function writeCSV(filePath, headers, rows) {
    const lines = [
        headers.join(","),
        ...rows.map(row =>
            headers.map(header => csvEscape(row[header])).join(",")
        )
    ];

    fs.writeFileSync(
        filePath,
        "\uFEFF" + lines.join("\r\n"),
        "utf8"
    );
}

// =====================================================
// AMBIL SELURUH PEGAWAI DARI SUPABASE
// Hanya SELECT; tidak ada INSERT, UPDATE, atau DELETE.
// =====================================================

async function getAllEmployees() {
    const employees = [];
    const pageSize = 500;
    let from = 0;

    while (true) {
        const to = from + pageSize - 1;

        const { data, error } = await supabaseAdmin
            .from("employees")
            .select("id, no, nama, nama_lengkap, profile_image")
            .range(from, to);

        if (error) {
            throw new Error(
                `Gagal membaca tabel employees: ${error.message}`
            );
        }

        if (!data || data.length === 0) {
            break;
        }

        employees.push(...data);

        if (data.length < pageSize) {
            break;
        }

        from += pageSize;
    }

    return employees;
}

// =====================================================
// PROSES PENCOCOKAN
// =====================================================

async function main() {
    if (!fs.existsSync(UPLOAD_REPORT)) {
        throw new Error(
            `Laporan unggahan tidak ditemukan: ${UPLOAD_REPORT}`
        );
    }

    const uploadedPhotos = parseCSV(
        fs.readFileSync(UPLOAD_REPORT, "utf8")
    );

    const successfulPhotos = uploadedPhotos.filter(photo => {
        return photo.status === "BERHASIL" &&
            photo.nama_file_lokal &&
            photo.public_url &&
            photo.storage_path;
    });

    if (successfulPhotos.length === 0) {
        throw new Error(
            "Tidak ada foto berhasil diunggah yang dapat dicocokkan."
        );
    }

    const employees = await getAllEmployees();

    if (employees.length === 0) {
        throw new Error(
            "Tidak ada data pegawai ditemukan pada tabel employees."
        );
    }

    console.log(`Pegawai dari database: ${employees.length}`);
    console.log(`Foto berhasil diunggah: ${successfulPhotos.length}`);

    const usedEmployeeIds = new Set();
    const matchRows = [];
    const reviewRows = [];

    for (const photo of successfulPhotos) {
        const fileName = path.basename(photo.nama_file_lokal);
        const fileKey = normalizeName(fileName);

        const exactMatches = employees.filter(employee => {
            return normalizeName(employee.nama) === fileKey ||
                normalizeName(employee.nama_lengkap) === fileKey;
        });

        let status = "";
        let selectedEmployee = null;
        let candidates = [];

        if (exactMatches.length === 1) {
            selectedEmployee = exactMatches[0];

            if (usedEmployeeIds.has(selectedEmployee.id)) {
                status = "AMBIGU_DUPLIKAT_FOTO";
                candidates = [selectedEmployee];
                selectedEmployee = null;
            } else {
                status = "COCOK_PASTI";
                usedEmployeeIds.add(selectedEmployee.id);
            }
        } else if (exactMatches.length > 1) {
            status = "AMBIGU_BEberapa_PEGAWAI";
            candidates = exactMatches;
        } else {
            candidates = employees.filter(employee => {
                return isPartialNameMatch(fileName, employee.nama) ||
                    isPartialNameMatch(fileName, employee.nama_lengkap);
            });

            if (candidates.length === 1) {
                status = "PERLU_TINJAUAN_NAMA_SEBAGIAN";
            } else if (candidates.length > 1) {
                status = "AMBIGU_NAMA_SEBAGIAN";
            } else {
                status = "TIDAK_DITEMUKAN";
            }
        }

        const candidateSummary = candidates.map(employee =>
            `${employee.id} | ${employee.nama || ""} | ${employee.nama_lengkap || ""}`
        ).join(" || ");

        const result = {
            nama_file_lokal: fileName,
            storage_path: photo.storage_path,
            public_url: photo.public_url,
            employee_id: selectedEmployee?.id || "",
            no: selectedEmployee?.no ?? "",
            nama_database: selectedEmployee?.nama || "",
            nama_lengkap_database: selectedEmployee?.nama_lengkap || "",
            profile_image_lama: selectedEmployee?.profile_image || "",
            status,
            kandidat_perlu_diperiksa: candidateSummary
        };

        matchRows.push(result);

        if (status !== "COCOK_PASTI") {
            reviewRows.push(result);
        }
    }

    const headers = [
        "nama_file_lokal",
        "storage_path",
        "public_url",
        "employee_id",
        "no",
        "nama_database",
        "nama_lengkap_database",
        "profile_image_lama",
        "status",
        "kandidat_perlu_diperiksa"
    ];

    writeCSV(OUTPUT_REPORT, headers, matchRows);
    writeCSV(REVIEW_REPORT, headers, reviewRows);

    const counts = {};

    for (const row of matchRows) {
        counts[row.status] = (counts[row.status] || 0) + 1;
    }

    console.log("\n=== HASIL PENCOCOKAN ===");
    console.log(`Jumlah pegawai dibaca: ${employees.length}`);
    console.log(`Jumlah foto diperiksa: ${matchRows.length}`);

    for (const [status, count] of Object.entries(counts)) {
        console.log(`${status}: ${count}`);
    }

    console.log(`\nLaporan lengkap: ${OUTPUT_REPORT}`);
    console.log(`Laporan tinjauan: ${REVIEW_REPORT}`);
    console.log("\nDatabase tidak diubah.");
}

main().catch(error => {
    console.error("\nGAGAL:", error.message);
    process.exitCode = 1;
});