const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// Load .env dari folder backend
dotenv.config({
    path: path.join(__dirname, "../.env"),
});

// ===============================
// KONFIGURASI
// ===============================
const BUCKET = "employee-profiles";

// NIP employee yang ingin dites
const NIP = "198807222024211015";

// File test-photo.png berada di root project
// Employee Management System/
// ├── backend/
// │   └── scripts/
// │       └── testUploadPhoto.js
// └── test-photo.png
const FILE_PATH = path.join(__dirname, "../../test-photo.png");

// Nama file di Supabase Storage
const STORAGE_PATH = `${NIP}.png`;

// ===============================
// CEK ENV
// ===============================
if (!process.env.SUPABASE_URL) {
    console.error("❌ SUPABASE_URL tidak ditemukan di .env");
    process.exit(1);
}

if (!process.env.SUPABASE_SECRET_KEY) {
    console.error("❌ SUPABASE_SECRET_KEY tidak ditemukan di .env");
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
// MAIN
// ===============================
async function main() {
    console.log("========================================");
    console.log("      TEST UPLOAD FOTO EMPLOYEE");
    console.log("========================================");

    console.log("NIP           :", NIP);
    console.log("File lokal    :", FILE_PATH);
    console.log("Storage path  :", STORAGE_PATH);
    console.log("Bucket        :", BUCKET);
    console.log("----------------------------------------");

    // ===============================
    // 1. CEK FILE LOKAL
    // ===============================
    if (!fs.existsSync(FILE_PATH)) {
        console.error("❌ File test-photo.png tidak ditemukan!");
        console.error("");
        console.error("Pastikan file berada di:");
        console.error(FILE_PATH);
        process.exit(1);
    }

    const fileBuffer = fs.readFileSync(FILE_PATH);

    console.log("✅ File lokal ditemukan");
    console.log("Ukuran file   :", fileBuffer.length, "bytes");
    console.log("----------------------------------------");

    // ===============================
    // 2. UPLOAD KE SUPABASE STORAGE
    // ===============================
    console.log("📤 Mengupload foto ke Supabase Storage...");

    const { data: uploadData, error: uploadError } =
        await supabase.storage
            .from(BUCKET)
            .upload(STORAGE_PATH, fileBuffer, {
                contentType: "image/png",
                cacheControl: "3600",
                upsert: true,
            });

    if (uploadError) {
        console.error("❌ Upload gagal:");
        console.error(uploadError);
        process.exit(1);
    }

    console.log("✅ Upload berhasil!");
    console.log("Upload data:", uploadData);
    console.log("----------------------------------------");

    // ===============================
    // 3. BUAT PUBLIC URL
    // ===============================
    const { data: publicUrlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(STORAGE_PATH);

    const publicUrl = publicUrlData.publicUrl;

    console.log("🌐 Public URL:");
    console.log(publicUrl);
    console.log("----------------------------------------");

    // ===============================
    // 4. CEK FILE DI STORAGE
    // ===============================
    console.log("🔍 Mengecek file di Storage...");

    const { data: storageFiles, error: listError } =
        await supabase.storage
            .from(BUCKET)
            .list("", {
                search: STORAGE_PATH,
            });

    if (listError) {
        console.error("❌ Gagal mengecek Storage:");
        console.error(listError);
        process.exit(1);
    }

    const fileExists = storageFiles?.some(
        (file) => file.name === STORAGE_PATH
    );

    if (!fileExists) {
        console.error("❌ File tidak ditemukan di Storage!");
        console.log("Hasil list:", storageFiles);
        process.exit(1);
    }

    console.log("✅ File ditemukan di Storage!");
    console.log(storageFiles);
    console.log("----------------------------------------");

    // ===============================
    // 5. DOWNLOAD FILE UNTUK VERIFIKASI
    // ===============================
    console.log("⬇️ Mencoba download file dari Storage...");

    const { data: downloadedFile, error: downloadError } =
        await supabase.storage
            .from(BUCKET)
            .download(STORAGE_PATH);

    if (downloadError) {
        console.error("❌ Download/verifikasi gagal:");
        console.error(downloadError);
        process.exit(1);
    }

    console.log("✅ File berhasil didownload dari Storage!");
    console.log("Ukuran       :", downloadedFile.size, "bytes");
    console.log("Content Type :", downloadedFile.type);
    console.log("----------------------------------------");

    // ===============================
    // 6. UPDATE DATABASE EMPLOYEE
    // ===============================
    console.log("🗄️ Mengupdate profile_image di database...");

    const { data: employee, error: dbError } =
        await supabase
            .from("employees")
            .update({
                profile_image: publicUrl,
            })
            .eq("nip", NIP)
            .select("id, nama, nip, profile_image")
            .single();

    if (dbError) {
        console.error("❌ Update database gagal:");
        console.error(dbError);
        process.exit(1);
    }

    console.log("✅ Database berhasil diupdate!");
    console.log("----------------------------------------");

    console.log("DATA EMPLOYEE:");
    console.log(employee);

    console.log("----------------------------------------");
    console.log("🎉 TEST BERHASIL!");
    console.log("");
    console.log("Foto berhasil:");
    console.log("1. Dibaca dari komputer");
    console.log("2. Di-upload ke Supabase Storage");
    console.log("3. Ditemukan di Storage");
    console.log("4. Berhasil didownload dari Storage");
    console.log("5. URL disimpan ke employees.profile_image");
    console.log("");
    console.log("Public URL:");
    console.log(publicUrl);
    console.log("========================================");
}

// ===============================
// ERROR HANDLER
// ===============================
main().catch((error) => {
    console.error("");
    console.error("❌ ERROR:");
    console.error(error);
    process.exit(1);
});