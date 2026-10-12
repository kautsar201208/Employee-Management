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

// Format gambar yang didukung
const SUPPORTED_EXTENSIONS = [
    ".png",
    ".jpg",
    ".jpeg",
];

// =====================================================
// CEK ENV
// =====================================================
if (!process.env.SUPABASE_URL) {
    console.error("❌ SUPABASE_URL tidak ditemukan di backend/.env");
    process.exit(1);
}

if (!process.env.SUPABASE_SECRET_KEY) {
    console.error("❌ SUPABASE_SECRET_KEY tidak ditemukan di backend/.env");
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
// CONTENT TYPE
// =====================================================
function getContentType(extension) {
    switch (extension) {
        case ".png":
            return "image/png";

        case ".jpg":
            return "image/jpeg";

        case ".jpeg":
            return "image/jpeg";

        default:
            return null;
    }
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

    console.log("📁 Folder foto:");
    console.log(PHOTOS_FOLDER);

    console.log("");
    console.log("📦 Format yang didukung:");
    console.log("   ✅ PNG");
    console.log("   ✅ JPG");
    console.log("   ✅ JPEG");

    console.log("");
    console.log("----------------------------------------");

    // =================================================
    // CEK FOLDER FOTO
    // =================================================
    if (!fs.existsSync(PHOTOS_FOLDER)) {
        console.error("❌ Folder employee-photos tidak ditemukan!");
        console.error("");
        console.error("Lokasi yang dicari:");
        console.error(PHOTOS_FOLDER);

        process.exit(1);
    }

    // =================================================
    // AMBIL SEMUA FOTO
    // =================================================
    const files = fs
        .readdirSync(PHOTOS_FOLDER)
        .filter((file) => {
            const extension = path
                .extname(file)
                .toLowerCase();

            return SUPPORTED_EXTENSIONS.includes(
                extension
            );
        });

    // =================================================
    // CEK JUMLAH FOTO
    // =================================================
    if (files.length === 0) {
        console.error("");
        console.error(
            "❌ Tidak ada foto PNG/JPG/JPEG di folder!"
        );
        console.error("");
        console.error(
            "Masukkan foto ke:"
        );
        console.error(PHOTOS_FOLDER);

        process.exit(1);
    }

    console.log(
        `📸 Ditemukan ${files.length} foto`
    );

    console.log("----------------------------------------");

    // =================================================
    // AMBIL DATA EMPLOYEE
    // =================================================
    console.log(
        "🔍 Mengambil data employee dari database..."
    );

    const {
        data: employees,
        error: employeeError,
    } = await supabase
        .from("employees")
        .select(
            "id, nama, nip, profile_image"
        );

    // =================================================
    // CEK ERROR DATABASE
    // =================================================
    if (employeeError) {
        console.error("");
        console.error(
            "❌ Gagal mengambil data employee:"
        );

        console.error(employeeError);

        process.exit(1);
    }

    console.log(
        `✅ Ditemukan ${employees.length} employee di database`
    );

    console.log("----------------------------------------");

    // =================================================
    // BUAT MAP EMPLOYEE
    // =================================================
    const employeeMap = new Map();

    for (const employee of employees) {
        if (!employee.nama) {
            continue;
        }

        const normalizedName = normalizeName(
            employee.nama
        );

        employeeMap.set(
            normalizedName,
            employee
        );
    }

    // =================================================
    // ARRAY HASIL
    // =================================================
    const success = [];
    const notFound = [];
    const failed = [];

    // =================================================
    // PROSES SEMUA FOTO
    // =================================================
    for (const fileName of files) {
        console.log("");
        console.log("========================================");
        console.log(
            `📸 Memproses: ${fileName}`
        );
        console.log("========================================");

        // =================================================
        // EXTENSION
        // =================================================
        const extension = path
            .extname(fileName)
            .toLowerCase();

        // =================================================
        // NAMA FILE TANPA EXTENSION
        // =================================================
        const nameWithoutExtension = path.basename(
            fileName,
            path.extname(fileName)
        );

        console.log(
            `👤 Nama file: ${nameWithoutExtension}`
        );

        // =================================================
        // NORMALISASI NAMA
        // =================================================
        const normalizedName = normalizeName(
            nameWithoutExtension
        );

        // =================================================
        // CARI EMPLOYEE
        // =================================================
        const employee = employeeMap.get(
            normalizedName
        );

        // =================================================
        // JIKA EMPLOYEE TIDAK DITEMUKAN
        // =================================================
        if (!employee) {
            console.log("");
            console.log(
                "⚠️ EMPLOYEE TIDAK DITEMUKAN"
            );

            console.log(
                `Nama yang dicari: "${nameWithoutExtension}"`
            );

            notFound.push({
                file: fileName,
                name: nameWithoutExtension,
            });

            continue;
        }

        // =================================================
        // EMPLOYEE DITEMUKAN
        // =================================================
        console.log("");
        console.log(
            "✅ Employee ditemukan"
        );

        console.log(
            `Nama : ${employee.nama}`
        );

        console.log(
            `NIP  : ${employee.nip}`
        );

        // =================================================
        // CEK NIP
        // =================================================
        if (!employee.nip) {
            console.log("");
            console.log(
                "❌ Employee tidak memiliki NIP"
            );

            failed.push({
                file: fileName,
                name: employee.nama,
                reason: "NIP kosong",
            });

            continue;
        }

        // =================================================
        // FILE LOKAL
        // =================================================
        const localFilePath = path.join(
            PHOTOS_FOLDER,
            fileName
        );

        // =================================================
        // BACA FILE
        // =================================================
        let fileBuffer;

        try {
            fileBuffer = fs.readFileSync(
                localFilePath
            );
        } catch (error) {
            console.log("");
            console.log(
                "❌ Gagal membaca file lokal"
            );

            console.log(
                error.message
            );

            failed.push({
                file: fileName,
                name: employee.nama,
                nip: employee.nip,
                reason:
                    "Gagal membaca file lokal",
            });

            continue;
        }

        // =================================================
        // CEK UKURAN FILE
        // =================================================
        if (!fileBuffer || fileBuffer.length === 0) {
            console.log("");
            console.log(
                "❌ File kosong"
            );

            failed.push({
                file: fileName,
                name: employee.nama,
                nip: employee.nip,
                reason: "File kosong",
            });

            continue;
        }

        console.log("");
        console.log(
            `📦 Ukuran: ${fileBuffer.length} bytes`
        );

        // =================================================
        // CONTENT TYPE
        // =================================================
        const contentType =
            getContentType(extension);

        if (!contentType) {
            console.log("");
            console.log(
                `❌ Format tidak didukung: ${extension}`
            );

            failed.push({
                file: fileName,
                name: employee.nama,
                nip: employee.nip,
                reason:
                    `Format tidak didukung: ${extension}`,
            });

            continue;
        }

        console.log(
            `🖼️ Content-Type: ${contentType}`
        );

        // =================================================
        // STORAGE PATH
        // =================================================
        const storagePath =
            `${employee.nip}${extension}`;

        console.log("");
        console.log(
            `📤 Upload ke Storage: ${storagePath}`
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
                    contentType:
                        contentType,

                    cacheControl:
                        "3600",

                    upsert:
                        true,
                }
            );

        // =================================================
        // CEK ERROR UPLOAD
        // =================================================
        if (uploadError) {
            console.log("");
            console.log(
                "❌ UPLOAD GAGAL"
            );

            console.log(
                uploadError
            );

            failed.push({
                file: fileName,
                name: employee.nama,
                nip: employee.nip,
                reason:
                    uploadError.message,
            });

            continue;
        }

        console.log("");
        console.log(
            "✅ Upload berhasil!"
        );

        console.log(
            `Storage path: ${uploadData.path}`
        );

        // =================================================
        // PUBLIC URL
        // =================================================
        const {
            data: publicUrlData,
        } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(
                storagePath
            );

        const publicUrl =
            publicUrlData.publicUrl;

        console.log("");
        console.log(
            "🌐 Public URL:"
        );

        console.log(
            publicUrl
        );

        // =================================================
        // UPDATE DATABASE
        // =================================================
        console.log("");
        console.log(
            "🗄️ Mengupdate employees.profile_image..."
        );

        const {
            data: updatedEmployee,
            error: updateError,
        } = await supabase
            .from("employees")
            .update({
                profile_image:
                    publicUrl,
            })
            .eq(
                "id",
                employee.id
            )
            .select(
                "id, nama, nip, profile_image"
            )
            .single();

        // =================================================
        // CEK ERROR DATABASE
        // =================================================
        if (updateError) {
            console.log("");
            console.log(
                "❌ DATABASE GAGAL DIUPDATE"
            );

            console.log(
                updateError
            );

            failed.push({
                file: fileName,
                name: employee.nama,
                nip: employee.nip,
                reason:
                    updateError.message,
            });

            continue;
        }

        // =================================================
        // DATABASE BERHASIL
        // =================================================
        console.log("");
        console.log(
            "✅ Database berhasil diupdate!"
        );

        console.log(
            `Nama : ${updatedEmployee.nama}`
        );

        console.log(
            `NIP  : ${updatedEmployee.nip}`
        );

        console.log(
            `Foto : ${updatedEmployee.profile_image}`
        );

        // =================================================
        // SIMPAN SUCCESS
        // =================================================
        success.push({
            file: fileName,
            name: employee.nama,
            nip: employee.nip,
            storagePath:
                storagePath,
            publicUrl:
                publicUrl,
        });
    }

    // =====================================================
    // RINGKASAN
    // =====================================================
    console.log("");
    console.log("");
    console.log("========================================");
    console.log("              HASIL UPLOAD");
    console.log("========================================");

    console.log("");

    console.log(
        `📸 Total foto diproses : ${files.length}`
    );

    console.log(
        `✅ Berhasil            : ${success.length}`
    );

    console.log(
        `⚠️ Tidak ditemukan     : ${notFound.length}`
    );

    console.log(
        `❌ Gagal               : ${failed.length}`
    );

    // =====================================================
    // BERHASIL
    // =====================================================
    if (success.length > 0) {
        console.log("");
        console.log("========================================");
        console.log("              BERHASIL");
        console.log("========================================");

        for (const item of success) {
            console.log(
                `✅ ${item.file}`
            );

            console.log(
                `   Nama    : ${item.name}`
            );

            console.log(
                `   NIP     : ${item.nip}`
            );

            console.log(
                `   Storage : ${item.storagePath}`
            );

            console.log(
                `   URL     : ${item.publicUrl}`
            );

            console.log("");
        }
    }

    // =====================================================
    // TIDAK DITEMUKAN
    // =====================================================
    if (notFound.length > 0) {
        console.log("");
        console.log("========================================");
        console.log("        EMPLOYEE TIDAK DITEMUKAN");
        console.log("========================================");

        for (const item of notFound) {
            console.log(
                `⚠️ ${item.file}`
            );

            console.log(
                `   Nama: "${item.name}"`
            );

            console.log("");
        }
    }

    // =====================================================
    // GAGAL
    // =====================================================
    if (failed.length > 0) {
        console.log("");
        console.log("========================================");
        console.log("                 GAGAL");
        console.log("========================================");

        for (const item of failed) {
            console.log(
                `❌ ${item.file}`
            );

            console.log(
                `   Nama    : ${item.name || "-"}`
            );

            console.log(
                `   NIP     : ${item.nip || "-"}`
            );

            console.log(
                `   Alasan  : ${item.reason}`
            );

            console.log("");
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
// ERROR HANDLER
// =====================================================
main().catch((error) => {
    console.error("");
    console.error("========================================");
    console.error("                 ERROR");
    console.error("========================================");
    console.error("");

    console.error(error);

    console.error("");
    process.exit(1);
});
