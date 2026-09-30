const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// Load .env
dotenv.config({
    path: path.join(__dirname, "../.env"),
});

// ===============================
// KONFIGURASI
// ===============================
const BUCKET = "employee-profiles";

const PHOTOS_FOLDER = path.join(
    __dirname,
    "../../employee-photos"
);

// ===============================
// CEK ENV
// ===============================
if (!process.env.SUPABASE_URL) {
    console.error("❌ SUPABASE_URL tidak ditemukan");
    process.exit(1);
}

if (!process.env.SUPABASE_SECRET_KEY) {
    console.error("❌ SUPABASE_SECRET_KEY tidak ditemukan");
    process.exit(1);
}

// ===============================
// SUPABASE CLIENT
// ===============================
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

// ===============================
// NORMALISASI NAMA
// ===============================
function normalizeName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

// ===============================
// MAIN
// ===============================
async function main() {
    console.log("========================================");
    console.log("   BULK UPLOAD FOTO EMPLOYEE");
    console.log("========================================");

    // ===============================
    // CEK FOLDER
    // ===============================
    if (!fs.existsSync(PHOTOS_FOLDER)) {
        console.error("❌ Folder foto tidak ditemukan:");
        console.error(PHOTOS_FOLDER);
        process.exit(1);
    }

    // ===============================
    // AMBIL SEMUA FILE PNG
    // ===============================
    const files = fs
        .readdirSync(PHOTOS_FOLDER)
        .filter((file) => {
            return path.extname(file).toLowerCase() === ".png";
        });

    if (files.length === 0) {
        console.error("❌ Tidak ada file PNG di folder:");
        console.error(PHOTOS_FOLDER);
        process.exit(1);
    }

    console.log(`📁 Ditemukan ${files.length} foto`);
    console.log("----------------------------------------");

    // ===============================
    // AMBIL DATA EMPLOYEE
    // ===============================
    console.log("🔍 Mengambil data employee dari database...");

    const { data: employees, error: employeeError } =
        await supabase
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

    // ===============================
    // BUAT MAP NAMA → EMPLOYEE
    // ===============================
    const employeeMap = new Map();

    for (const employee of employees) {
        if (!employee.nama) continue;

        const normalized = normalizeName(employee.nama);

        employeeMap.set(normalized, employee);
    }

    // ===============================
    // HASIL
    // ===============================
    const success = [];
    const notFound = [];
    const failed = [];

    // ===============================
    // PROSES FOTO SATU PER SATU
    // ===============================
    for (const fileName of files) {
        console.log("");
        console.log("========================================");
        console.log(`📸 Memproses: ${fileName}`);

        // Hilangkan extension .png
        const nameWithoutExtension = path.basename(
            fileName,
            path.extname(fileName)
        );

        const normalizedName = normalizeName(
            nameWithoutExtension
        );

        // ===============================
        // CARI EMPLOYEE
        // ===============================
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
        console.log("Nama :", employee.nama);
        console.log("NIP  :", employee.nip);

        // ===============================
        // BACA FILE
        // ===============================
        const localFilePath = path.join(
            PHOTOS_FOLDER,
            fileName
        );

        let fileBuffer;

        try {
            fileBuffer = fs.readFileSync(localFilePath);
        } catch (error) {
            console.log("❌ Gagal membaca file");

            failed.push({
                file: fileName,
                name: employee.nama,
                reason: "Gagal membaca file lokal",
            });

            continue;
        }

        // ===============================
        // STORAGE PATH
        // ===============================
        const storagePath = `${employee.nip}.png`;

        console.log(
            `📤 Upload ke Storage: ${storagePath}`
        );

        // ===============================
        // UPLOAD
        // ===============================
        const { data: uploadData, error: uploadError } =
            await supabase.storage
                .from(BUCKET)
                .upload(storagePath, fileBuffer, {
                    contentType: "image/png",
                    cacheControl: "3600",
                    upsert: true,
                });

        if (uploadError) {
            console.log("❌ Upload gagal");
            console.log(uploadError);

            failed.push({
                file: fileName,
                name: employee.nama,
                nip: employee.nip,
                reason: uploadError.message,
            });

            continue;
        }

        console.log("✅ Upload berhasil");

        // ===============================
        // PUBLIC URL
        // ===============================
        const { data: publicUrlData } =
            supabase.storage
                .from(BUCKET)
                .getPublicUrl(storagePath);

        const publicUrl = publicUrlData.publicUrl;

        console.log("🌐 URL:");
        console.log(publicUrl);

        // ===============================
        // UPDATE DATABASE
        // ===============================
        const { error: updateError } =
            await supabase
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

        success.push({
            file: fileName,
            name: employee.nama,
            nip: employee.nip,
        });
    }

    // ===============================
    // RINGKASAN
    // ===============================
    console.log("");
    console.log("");
    console.log("========================================");
    console.log("              HASIL UPLOAD");
    console.log("========================================");

    console.log("");
    console.log(`✅ Berhasil : ${success.length}`);
    console.log(`⚠️ Tidak ditemukan : ${notFound.length}`);
    console.log(`❌ Gagal : ${failed.length}`);

    // ===============================
    // SUCCESS
    // ===============================
    if (success.length > 0) {
        console.log("");
        console.log("========== BERHASIL ==========");

        for (const item of success) {
            console.log(
                `✅ ${item.file} → ${item.name} → ${item.nip}`
            );
        }
    }

    // ===============================
    // NOT FOUND
    // ===============================
    if (notFound.length > 0) {
        console.log("");
        console.log("======= EMPLOYEE TIDAK DITEMUKAN =======");

        for (const item of notFound) {
            console.log(
                `⚠️ ${item.file} → "${item.name}"`
            );
        }
    }

    // ===============================
    // FAILED
    // ===============================
    if (failed.length > 0) {
        console.log("");
        console.log("============= GAGAL =============");

        for (const item of failed) {
            console.log(
                `❌ ${item.file} → ${item.name}`
            );
            console.log(`   Alasan: ${item.reason}`);
        }
    }

    console.log("");
    console.log("========================================");
    console.log("           PROSES SELESAI");
    console.log("========================================");
}

main().catch((error) => {
    console.error("");
    console.error("❌ ERROR:");
    console.error(error);
    process.exit(1);
});