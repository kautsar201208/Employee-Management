const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// =====================================================
// LOAD ENV
// =====================================================

dotenv.config({
    path: path.join(__dirname, "../.env"),
});

// =====================================================
// KONFIGURASI
// =====================================================

const BUCKET = "employee-profiles";

const PHOTOS_FOLDER = path.join(
    __dirname,
    "../../employee-photos"
);

// =====================================================
// CEK ENV
// =====================================================

if (!process.env.SUPABASE_URL) {
    console.error("❌ SUPABASE_URL tidak ditemukan di .env");
    process.exit(1);
}

if (!process.env.SUPABASE_SECRET_KEY) {
    console.error("❌ SUPABASE_SECRET_KEY tidak ditemukan di .env");
    process.exit(1);
}

// =====================================================
// SUPABASE CLIENT
// =====================================================

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// =====================================================
// NORMALISASI NAMA
// =====================================================

function normalizeName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

// =====================================================
// CEK FILE GAMBAR
// PNG / JPG / JPEG
// =====================================================

function isImageFile(fileName) {
    const extension = path.extname(fileName).toLowerCase();

    return [
        ".png",
        ".jpg",
        ".jpeg",
    ].includes(extension);
}

// =====================================================
// TENTUKAN MIME TYPE
// =====================================================

function getContentType(fileName) {
    const extension = path.extname(fileName).toLowerCase();

    if (extension === ".png") {
        return "image/png";
    }

    if (extension === ".jpg") {
        return "image/jpeg";
    }

    if (extension === ".jpeg") {
        return "image/jpeg";
    }

    return "application/octet-stream";
}

// =====================================================
// MAIN
// =====================================================

async function main() {
    console.log("");
    console.log("========================================");
    console.log("      BULK UPLOAD FOTO EMPLOYEE");
    console.log("========================================");
    console.log("");

    // =================================================
    // CEK FOLDER
    // =================================================

    if (!fs.existsSync(PHOTOS_FOLDER)) {
        console.error("❌ Folder foto tidak ditemukan:");
        console.error(PHOTOS_FOLDER);
        process.exit(1);
    }

    console.log("📁 Folder foto:");
    console.log(PHOTOS_FOLDER);
    console.log("");

    // =================================================
    // AMBIL SEMUA FILE PNG / JPG / JPEG
    // =================================================

    const files = fs
        .readdirSync(PHOTOS_FOLDER)
        .filter((file) => isImageFile(file));

    if (files.length === 0) {
        console.error("❌ Tidak ada foto PNG/JPG/JPEG di folder:");
        console.error(PHOTOS_FOLDER);
        process.exit(1);
    }

    console.log(`📸 Ditemukan ${files.length} file foto`);
    console.log("----------------------------------------");

    // =================================================
    // AMBIL DATA EMPLOYEE
    // =================================================

    console.log("🔍 Mengambil data employee dari database...");
    console.log("");

    const {
        data: employees,
        error: employeeError,
    } = await supabase
        .from("employees")
        .select("id, nama, nip, profile_image");

    if (employeeError) {
        console.error("❌ Gagal mengambil data employee:");
        console.error(employeeError);
        process.exit(1);
    }

    console.log(
        `✅ Ditemukan ${employees.length} employee di database`
    );

    console.log("----------------------------------------");

    // =================================================
    // BUAT MAP NAMA -> EMPLOYEE
    // =================================================

    const employeeMap = new Map();

    for (const employee of employees) {
        if (!employee.nama) {
            continue;
        }

        const normalizedName = normalizeName(employee.nama);

        employeeMap.set(normalizedName, employee);
    }

    // =================================================
    // HASIL PROSES
    // =================================================

    const success = [];
    const notFound = [];
    const failed = [];

    // =================================================
    // PROSES FOTO SATU PER SATU
    // =================================================

    for (const fileName of files) {
        console.log("");
        console.log("========================================");
        console.log(`📸 Memproses: ${fileName}`);
        console.log("========================================");

        // =================================================
        // AMBIL NAMA TANPA EXTENSION
        // =================================================

        const nameWithoutExtension = path.basename(
            fileName,
            path.extname(fileName)
        );

        const normalizedName = normalizeName(
            nameWithoutExtension
        );

        console.log(
            `👤 Nama dari file: ${nameWithoutExtension}`
        );

        // =================================================
        // CARI EMPLOYEE
        // =================================================

        const employee = employeeMap.get(normalizedName);

        if (!employee) {
            console.log("⚠️ Employee tidak ditemukan");
            console.log(
                `Nama yang dicari: "${nameWithoutExtension}"`
            );

            notFound.push({
                file: fileName,
                name: nameWithoutExtension,
            });

            continue;
        }

        console.log("✅ Employee ditemukan");
        console.log(`Nama : ${employee.nama}`);
        console.log(`NIP  : ${employee.nip}`);

        // =================================================
        // CEK NIP
        // =================================================

        if (!employee.nip) {
            console.log("❌ Employee tidak memiliki NIP");

            failed.push({
                file: fileName,
                name: employee.nama,
                reason: "NIP employee kosong",
            });

            continue;
        }

        // =================================================
        // BACA FILE
        // =================================================

        const localFilePath = path.join(
            PHOTOS_FOLDER,
            fileName
        );

        let fileBuffer;

        try {
            fileBuffer = fs.readFileSync(localFilePath);
        } catch (error) {
            console.log("❌ Gagal membaca file lokal");
            console.log(error.message);

            failed.push({
                file: fileName,
                name: employee.nama,
                nip: employee.nip,
                reason: "Gagal membaca file lokal",
            });

            continue;
        }

        console.log(
            `📦 Ukuran file: ${fileBuffer.length} bytes`
        );

        // =================================================
        // MIME TYPE
        // =================================================

        const contentType = getContentType(fileName);

        console.log(
            `🖼️ Content Type: ${contentType}`
        );

        // =================================================
        // STORAGE PATH
        // =================================================
        // Semua foto disimpan menggunakan NIP.
        //
        // Contoh:
        // 198807222024211015.png
        //
        // atau:
        // 199001012024011001.jpg
        //
        // Extension mengikuti file asli.
        // =================================================

        const extension = path
            .extname(fileName)
            .toLowerCase();

        const storagePath = `${employee.nip}${extension}`;

        console.log(
            `📤 Storage Path: ${storagePath}`
        );

        // =================================================
        // UPLOAD KE SUPABASE STORAGE
        // =================================================

        const {
            data: uploadData,
            error: uploadError,
        } = await supabase.storage
            .from(BUCKET)
            .upload(
                storagePath,
                fileBuffer,
                {
                    contentType,
                    cacheControl: "3600",
                    upsert: true,
                }
            );

        if (uploadError) {
            console.log("❌ Upload Storage gagal");
            console.log(uploadError);

            failed.push({
                file: fileName,
                name: employee.nama,
                nip: employee.nip,
                reason: uploadError.message,
            });

            continue;
        }

        console.log("✅ Upload Storage berhasil");

        if (uploadData) {
            console.log(uploadData);
        }

        // =================================================
        // BUAT PUBLIC URL
        // =================================================

        const {
            data: publicUrlData,
        } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(storagePath);

        const publicUrl = publicUrlData.publicUrl;

        console.log("");
        console.log("🌐 Public URL:");
        console.log(publicUrl);

        // =================================================
        // UPDATE DATABASE
        // =================================================

        console.log("");
        console.log("🗄️ Mengupdate employees.profile_image...");

        const {
            error: updateError,
        } = await supabase
            .from("employees")
            .update({
                profile_image: publicUrl,
            })
            .eq("id", employee.id);

        if (updateError) {
            console.log("❌ Database gagal diupdate");
            console.log(updateError);

            failed.push({
                file: fileName,
                name: employee.nama,
                nip: employee.nip,
                reason: updateError.message,
            });

            continue;
        }

        console.log("✅ Database berhasil diupdate");

        // =================================================
        // SUCCESS
        // =================================================

        success.push({
            file: fileName,
            name: employee.nama,
            nip: employee.nip,
            url: publicUrl,
        });
    }

    // =====================================================
    // HASIL AKHIR
    // =====================================================

    console.log("");
    console.log("");
    console.log("========================================");
    console.log("            HASIL UPLOAD");
    console.log("========================================");
    console.log("");

    console.log(`📸 Total foto       : ${files.length}`);
    console.log(`✅ Berhasil         : ${success.length}`);
    console.log(`⚠️ Tidak ditemukan : ${notFound.length}`);
    console.log(`❌ Gagal            : ${failed.length}`);

    // =====================================================
    // SUCCESS
    // =====================================================

    if (success.length > 0) {
        console.log("");
        console.log("========== BERHASIL ==========");

        for (const item of success) {
            console.log(
                `✅ ${item.file} → ${item.name} → ${item.nip}`
            );
        }
    }

    // =====================================================
    // NOT FOUND
    // =====================================================

    if (notFound.length > 0) {
        console.log("");
        console.log("======= EMPLOYEE TIDAK DITEMUKAN =======");

        for (const item of notFound) {
            console.log(
                `⚠️ ${item.file} → "${item.name}"`
            );
        }
    }

    // =====================================================
    // FAILED
    // =====================================================

    if (failed.length > 0) {
        console.log("");
        console.log("============= GAGAL =============");

        for (const item of failed) {
            console.log(
                `❌ ${item.file} → ${item.name}`
            );

            if (item.nip) {
                console.log(`   NIP: ${item.nip}`);
            }

            console.log(
                `   Alasan: ${item.reason}`
            );
        }
    }

    // =====================================================
    // SELESAI
    // =====================================================

    console.log("");
    console.log("========================================");
    console.log("           PROSES SELESAI");
    console.log("========================================");
    console.log("");
}

// =====================================================
// JALANKAN PROGRAM
// =====================================================

main().catch((error) => {
    console.error("");
    console.error("========================================");
    console.error("❌ ERROR FATAL");
    console.error("========================================");
    console.error("");
    console.error(error);
    console.error("");

    process.exit(1);
});