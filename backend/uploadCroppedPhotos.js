const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({
    path: path.join(__dirname, ".env")
});

// ==================================================
// KONFIGURASI
// ==================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const BUCKET_NAME = "employee-profiles";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PHOTO_FOLDER = path.join(
    PROJECT_ROOT,
    "employee-photos-cropped"
);

const REPORT_PATH = path.join(
    PROJECT_ROOT,
    "laporan_upload_foto.csv"
);

const SUPPORTED_FORMATS = [".png", ".jpg", ".jpeg"];

// ==================================================
// VALIDASI KONFIGURASI
// ==================================================

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

// ==================================================
// UTILITAS
// ==================================================

function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
}

function writeReport(rows) {
    const headers = [
        "nama_file_lokal",
        "storage_path",
        "public_url",
        "status",
        "pesan"
    ];

    const lines = [
        headers.join(","),
        ...rows.map(row =>
            headers.map(header => csvEscape(row[header])).join(",")
        )
    ];

    fs.writeFileSync(
        REPORT_PATH,
        "\uFEFF" + lines.join("\n"),
        "utf8"
    );
}

function createUniqueFileName(originalName) {
    const extension = path.extname(originalName).toLowerCase();
    const baseName = path
        .basename(originalName, path.extname(originalName))
        .replace(/[^a-zA-Z0-9_-]/g, "_");

    return `cropped/${crypto.randomUUID()}_${baseName}${extension}`;
}

// ==================================================
// UNGGAH FOTO
// ==================================================

async function main() {
    if (!fs.existsSync(PHOTO_FOLDER)) {
        console.error(
            `Folder foto tidak ditemukan: ${PHOTO_FOLDER}`
        );
        process.exitCode = 1;
        return;
    }

    const files = fs.readdirSync(PHOTO_FOLDER, {
        withFileTypes: true
    }).filter(entry => {
        return entry.isFile() &&
            SUPPORTED_FORMATS.includes(
                path.extname(entry.name).toLowerCase()
            );
    });

    if (files.length === 0) {
        console.error("Tidak ada foto yang ditemukan.");
        process.exitCode = 1;
        return;
    }

    console.log(`Ditemukan ${files.length} foto.`);
    console.log(`Bucket tujuan: ${BUCKET_NAME}`);
    console.log("Mulai mengunggah foto...\n");

    const reportRows = [];
    let success = 0;
    let failed = 0;

    for (const file of files) {
        const localPath = path.join(PHOTO_FOLDER, file.name);
        const storagePath = createUniqueFileName(file.name);

        try {
            const fileBuffer = fs.readFileSync(localPath);
            const extension = path.extname(file.name).toLowerCase();

            const contentType =
                extension === ".png"
                    ? "image/png"
                    : "image/jpeg";

            const { error: uploadError } = await supabaseAdmin
                .storage
                .from(BUCKET_NAME)
                .upload(storagePath, fileBuffer, {
                    contentType,
                    upsert: false,
                    cacheControl: "3600"
                });

            if (uploadError) {
                throw uploadError;
            }

            const { data: urlData } = supabaseAdmin
                .storage
                .from(BUCKET_NAME)
                .getPublicUrl(storagePath);

            const publicUrl = urlData.publicUrl;

            reportRows.push({
                nama_file_lokal: file.name,
                storage_path: storagePath,
                public_url: publicUrl,
                status: "BERHASIL",
                pesan: ""
            });

            success++;
            console.log(`BERHASIL: ${file.name}`);
        } catch (error) {
            reportRows.push({
                nama_file_lokal: file.name,
                storage_path: storagePath,
                public_url: "",
                status: "GAGAL",
                pesan: error.message || String(error)
            });

            failed++;
            console.error(
                `GAGAL: ${file.name} - ${error.message}`
            );
        }

        // Simpan laporan setelah setiap file agar progres tidak hilang
        writeReport(reportRows);
    }

    console.log("\n=== SELESAI ===");
    console.log(`Total foto: ${files.length}`);
    console.log(`Berhasil diunggah: ${success}`);
    console.log(`Gagal diunggah: ${failed}`);
    console.log(`Laporan: ${REPORT_PATH}`);

    if (failed > 0) {
        console.log(
            "\nPeriksa kolom pesan pada laporan untuk mengetahui penyebab kegagalan."
        );
        process.exitCode = 1;
    } else {
        console.log(
            "\nSemua foto berhasil diunggah. Database belum diubah."
        );
    }
}

main().catch(error => {
    console.error("Kesalahan proses:", error);
    process.exitCode = 1;
});