const { createClient } = require("@supabase/supabase-js");


// Membuat koneksi Supabase menggunakan token user yang sedang login
const getSupabaseClient = (accessToken) => {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        }
    );
};


// =====================================================
// KATEGORI DOKUMEN YANG DIPERBOLEHKAN
// =====================================================
const allowedCategories = [
    "Sertifikat Pelatihan dan Uji",
    "Surat Keputusan"
];


// =====================================================
// UPLOAD DOKUMEN
// =====================================================
const uploadCertificate = async (req, res) => {
    try {
        // Pastikan ada file
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "File dokumen wajib dipilih"
            });
        }


        // =================================================
        // VALIDASI FORMAT FILE
        // =================================================
        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "application/pdf"
        ];

        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "Format file hanya boleh JPG, PNG, atau PDF"
            });
        }


        // =================================================
        // VALIDASI KATEGORI
        // =================================================
        const { kategori } = req.body;

        if (!kategori) {
            return res.status(400).json({
                success: false,
                message: "Kategori dokumen wajib dipilih"
            });
        }

        if (!allowedCategories.includes(kategori)) {
            return res.status(400).json({
                success: false,
                message: "Kategori dokumen tidak valid"
            });
        }


        // =================================================
        // MENENTUKAN EMPLOYEE ID
        // =================================================
        let employeeId;


        // USER
        // User hanya bisa upload dokumen miliknya sendiri
        if (req.role === "user") {

            if (!req.employee) {
                return res.status(404).json({
                    success: false,
                    message: "Akun belum terhubung dengan data pegawai"
                });
            }

            employeeId = req.employee.id;
        }


        // ADMIN
        // Admin bisa upload untuk pegawai mana saja
        else if (req.role === "admin") {

            employeeId = req.body.employee_id;

            if (!employeeId) {
                return res.status(400).json({
                    success: false,
                    message: "employee_id wajib diisi untuk admin"
                });
            }
        }


        // ROLE TIDAK DIKENALI
        else {
            return res.status(403).json({
                success: false,
                message: "Role user tidak dikenali"
            });
        }


        // =================================================
        // NAMA FILE
        // =================================================
        const originalName = req.file.originalname;

        const safeFileName = originalName
            .replace(/[^a-zA-Z0-9._-]/g, "_");


        // Membuat nama file unik
        const fileName = `${Date.now()}-${safeFileName}`;


        // Lokasi file di Storage
        const filePath = `${employeeId}/${fileName}`;


        // =================================================
        // SUPABASE CLIENT
        // =================================================
        const supabase = getSupabaseClient(req.accessToken);


        // =================================================
        // UPLOAD FILE KE STORAGE
        // =================================================
        const { error: uploadError } = await supabase
            .storage
            .from("employee-certificates")
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });


        if (uploadError) {
            console.error("Storage upload error:", uploadError);

            return res.status(400).json({
                success: false,
                message: "Gagal mengupload file dokumen",
                error: uploadError.message
            });
        }


        // =================================================
        // SIMPAN METADATA KE DATABASE
        // =================================================
        const { data, error: documentError } = await supabase
            .from("employee_documents")
            .insert([
                {
                    employee_id: employeeId,
                    nama_file: originalName,
                    kategori: kategori,
                    file_path: filePath,
                    file_type: req.file.mimetype,
                    file_size: req.file.size
                }
            ])
            .select()
            .single();


        // =================================================
        // JIKA METADATA GAGAL
        // HAPUS FILE DARI STORAGE
        // =================================================
        if (documentError) {
            console.error("Document metadata error:", documentError);

            await supabase
                .storage
                .from("employee-certificates")
                .remove([filePath]);

            return res.status(400).json({
                success: false,
                message: "File berhasil diupload tetapi metadata gagal disimpan",
                error: documentError.message
            });
        }


        // =================================================
        // RESPONSE
        // =================================================
        return res.status(201).json({
            success: true,
            message: "Dokumen berhasil diupload",
            data: data
        });

    } catch (error) {
        console.error("Upload document error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


// =====================================================
// GET DAFTAR DOKUMEN
// =====================================================
const getDocuments = async (req, res) => {
    try {
        const supabase = getSupabaseClient(req.accessToken);

        let query = supabase
            .from("employee_documents")
            .select("*")
            .order("created_at", { ascending: false });


        // =================================================
        // USER
        // Hanya melihat dokumen miliknya sendiri
        // =================================================
        if (req.role === "user") {

            if (!req.employee) {
                return res.status(404).json({
                    success: false,
                    message: "Akun belum terhubung dengan data pegawai"
                });
            }

            query = query.eq(
                "employee_id",
                req.employee.id
            );
        }


        // =================================================
        // ADMIN
        // Bisa melihat semua dokumen
        // =================================================
        else if (req.role === "admin") {
            // Tidak perlu filter
        }


        // =================================================
        // ROLE TIDAK DIKENALI
        // =================================================
        else {
            return res.status(403).json({
                success: false,
                message: "Role user tidak dikenali"
            });
        }


        // =================================================
        // AMBIL DATA
        // =================================================
        const { data, error } = await query;

        if (error) {
            console.error("Get documents error:", error);

            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data dokumen",
                error: error.message
            });
        }


        // =================================================
        // MEMBUAT SIGNED URL
        // =================================================
        const documentsWithUrl = [];

        for (const document of data) {

            const { data: signedUrlData, error: signedUrlError } =
                await supabase
                    .storage
                    .from("employee-certificates")
                    .createSignedUrl(
                        document.file_path,
                        3600
                    );


            if (signedUrlError) {
                console.error(
                    "Signed URL error:",
                    signedUrlError
                );

                documentsWithUrl.push({
                    ...document,
                    signed_url: null
                });

                continue;
            }


            documentsWithUrl.push({
                ...document,
                signed_url: signedUrlData.signedUrl
            });
        }


        // =================================================
        // RESPONSE
        // =================================================
        return res.status(200).json({
            success: true,
            message: "Data dokumen berhasil diambil",
            total: documentsWithUrl.length,
            data: documentsWithUrl
        });

    } catch (error) {
        console.error("Get documents error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


// =====================================================
// HAPUS DOKUMEN
// =====================================================
const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;


        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID dokumen wajib diisi"
            });
        }


        const supabase = getSupabaseClient(req.accessToken);


        // =================================================
        // CARI METADATA DOKUMEN
        // =================================================
        const { data: document, error: findError } = await supabase
            .from("employee_documents")
            .select("*")
            .eq("id", id)
            .maybeSingle();


        if (findError) {
            console.error("Find document error:", findError);

            return res.status(500).json({
                success: false,
                message: "Gagal mencari data dokumen",
                error: findError.message
            });
        }


        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Dokumen tidak ditemukan"
            });
        }


        // =================================================
        // USER
        // Hanya boleh menghapus dokumen miliknya
        // =================================================
        if (req.role === "user") {

            if (!req.employee) {
                return res.status(404).json({
                    success: false,
                    message: "Akun belum terhubung dengan data pegawai"
                });
            }


            if (document.employee_id !== req.employee.id) {
                return res.status(403).json({
                    success: false,
                    message: "Anda tidak memiliki akses untuk menghapus dokumen ini"
                });
            }
        }


        // =================================================
        // VALIDASI ROLE
        // =================================================
        if (req.role !== "user" && req.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Role user tidak dikenali"
            });
        }


        // =================================================
        // HAPUS FILE DARI STORAGE
        // =================================================
        const { error: storageError } = await supabase
            .storage
            .from("employee-certificates")
            .remove([document.file_path]);


        if (storageError) {
            console.error("Storage delete error:", storageError);

            return res.status(400).json({
                success: false,
                message: "Gagal menghapus file dari Storage",
                error: storageError.message
            });
        }


        // =================================================
        // HAPUS METADATA DARI DATABASE
        // =================================================
        const {
            data: deletedDocument,
            error: deleteError
        } = await supabase
            .from("employee_documents")
            .delete()
            .eq("id", id)
            .select()
            .single();


        if (deleteError) {
            console.error(
                "Delete document metadata error:",
                deleteError
            );

            return res.status(500).json({
                success: false,
                message: "File sudah dihapus dari Storage, tetapi metadata gagal dihapus",
                error: deleteError.message
            });
        }


        // =================================================
        // RESPONSE
        // =================================================
        return res.status(200).json({
            success: true,
            message: "Dokumen berhasil dihapus",
            data: deletedDocument
        });

    } catch (error) {
        console.error("Delete document error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


module.exports = {
    uploadCertificate,
    getDocuments,
    deleteDocument
};