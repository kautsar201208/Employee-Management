const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({
    path: path.join(__dirname, "../.env"),
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

const BUCKET_NAME = "employee-profiles";

// GANTI dengan NIP pegawai yang fotonya ingin dites
const NIP = "198807222024211015";

// Foto sementara untuk testing
const PHOTO_PATH = path.join(
    __dirname,
    "../../test-photo.png"
);

async function uploadPhoto() {
    try {
        console.log("=================================");
        console.log("TEST UPLOAD FOTO PEGAWAI");
        console.log("=================================");

        // Cek file foto
        if (!fs.existsSync(PHOTO_PATH)) {
            throw new Error(
                `File foto tidak ditemukan:\n${PHOTO_PATH}`
            );
        }

        // Cek NIP
        if (!NIP || NIP === "ISI_NIP_DI_SINI") {
            throw new Error(
                "Silakan isi NIP terlebih dahulu di dalam script."
            );
        }

        console.log("NIP       :", NIP);
        console.log("File foto :", PHOTO_PATH);

        // Baca file
        const fileBuffer = fs.readFileSync(PHOTO_PATH);

        console.log("Ukuran    :", fileBuffer.length, "bytes");

        // Ambil extension
        const extension = path.extname(PHOTO_PATH).toLowerCase();

        let contentType = "image/png";

        if (extension === ".jpg" || extension === ".jpeg") {
            contentType = "image/jpeg";
        }

        // Nama file di Storage = NIP
        const storagePath = `${NIP}${extension}`;

        console.log("Storage   :", storagePath);

        // Upload ke Supabase Storage
        const { data: uploadData, error: uploadError } =
            await supabase.storage
                .from(BUCKET_NAME)
                .upload(storagePath, fileBuffer, {
                    contentType,
                    upsert: true,
                    cacheControl: "3600",
                });

        if (uploadError) {
            console.error("UPLOAD ERROR:", uploadError);
            throw uploadError;
        }

        console.log("Upload berhasil!");
        console.log(uploadData);

        // Ambil Public URL
        const { data: publicUrlData } =
            supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(storagePath);

        const publicUrl = publicUrlData.publicUrl;

        console.log("");
        console.log("PUBLIC URL:");
        console.log(publicUrl);

        // Update database employees
        const { data: employeeData, error: updateError } =
            await supabase
                .from("employees")
                .update({
                    profile_image: publicUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq("nip", NIP)
                .select()
                .single();

        if (updateError) {
            console.error("DATABASE ERROR:", updateError);
            throw updateError;
        }

        console.log("");
        console.log("Database berhasil diupdate!");
        console.log(employeeData);

        console.log("");
        console.log("=================================");
        console.log("SELESAI");
        console.log("=================================");
        console.log("Foto:", publicUrl);

    } catch (error) {
        console.error("");
        console.error("=================================");
        console.error("GAGAL");
        console.error("=================================");
        console.error(error.message);

        process.exit(1);
    }
}

uploadPhoto();