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
// KATEGORI DOKUMEN YANG DIPERBOLEHKAN & NORMALISASI
// =====================================================
const categoryMap = {
    sk: "Surat Keputusan",
    pendidikan: "Pendidikan Formal",
    sertifikat: "Sertifikat Pelatihan dan Uji",
    kependudukan: "Dokumen Kependudukan",
    skp: "Penilaian Kinerja",
};

const normalizeCategory = (input) => {
    if (!input) return "Surat Keputusan";
    const lower = input.toLowerCase().trim();
    if (categoryMap[lower]) return categoryMap[lower];
    if (lower.includes("sk") || lower.includes("keputusan")) return "Surat Keputusan";
    if (lower.includes("ijazah") || lower.includes("pendidikan") || lower.includes("transkrip")) return "Pendidikan Formal";
    if (lower.includes("sertifikat") || lower.includes("sertifikasi")) return "Sertifikat Pelatihan dan Uji";
    if (lower.includes("ktp") || lower.includes("kependudukan") || lower.includes("kk")) return "Dokumen Kependudukan";
    if (lower.includes("skp") || lower.includes("kinerja")) return "Penilaian Kinerja";
    return input;
};


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
            "image/webp",
            "application/pdf"
        ];

        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "Format file hanya boleh JPG, PNG, atau PDF"
            });
        }


        // =================================================
        // NORMALISASI KATEGORI
        // =================================================
        const kategori = normalizeCategory(req.body.kategori || req.body.category);


        // =================================================
        // MENENTUKAN EMPLOYEE ID
        // =================================================
        let employeeId;

        const supabase = getSupabaseClient(req.accessToken);

        // USER: Hanya bisa upload dokumen miliknya sendiri
        if (req.role === "user") {
            if (!req.employee) {
                const { data: emp } = await supabase
                    .from("employees")
                    .select("*")
                    .or(`auth_user_id.eq.${req.user.id},email.eq.${req.user.email}`)
                    .maybeSingle();

                if (emp) {
                    req.employee = emp;
                    employeeId = emp.id;
                } else {
                    return res.status(404).json({
                        success: false,
                        message: "Akun belum terhubung dengan data pegawai"
                    });
                }
            } else {
                employeeId = req.employee.id;
            }
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
        const displayTitle = req.body.title || req.body.nama_file || originalName;

        const { data, error: documentError } = await supabase
            .from("employee_documents")
            .insert([
                {
                    employee_id: employeeId,
                    nama_file: displayTitle,
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


        // Buat signed URL agar langsung bisa diakses/dipreview
        let signedUrl = null;
        try {
            const { data: signedData } = await supabase
                .storage
                .from("employee-certificates")
                .createSignedUrl(filePath, 3600);
            if (signedData) signedUrl = signedData.signedUrl;
        } catch (e) {}

        // =================================================
        // RESPONSE
        // =================================================
        return res.status(201).json({
            success: true,
            message: "Dokumen berhasil diupload",
            data: {
                ...data,
                signed_url: signedUrl
            }
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
                // Coba cari fallback
                const { data: emp } = await supabase
                    .from("employees")
                    .select("*")
                    .or(`auth_user_id.eq.${req.user.id},email.eq.${req.user.email}`)
                    .maybeSingle();

                if (emp) {
                    req.employee = emp;
                } else {
                    return res.status(200).json({
                        success: true,
                        message: "Belum ada dokumen",
                        total: 0,
                        data: []
                    });
                }
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
        // AMBIL DATA PEGAWAI TERKAIT
        // =================================================
        const employeeIds = [...new Set(data.map((d) => d.employee_id).filter(Boolean))];
        const employeeMap = {};
        if (employeeIds.length > 0) {
            const { data: emps, error: empErr } = await supabase
                .from("employees")
                .select("id, nama_lengkap, nama, nip, tim_kerja, jabatan, jenis_jabatan, profile_image, email")
                .in("id", employeeIds);

            if (!empErr && emps) {
                emps.forEach((emp) => {
                    employeeMap[emp.id] = emp;
                });
            }
        }

        // =================================================
        // MEMBUAT SIGNED URL SECARA PARALEL
        // =================================================
        const documentsWithUrl = await Promise.all(
            data.map(async (document) => {
                let signedUrl = null;
                try {
                    const { data: signedUrlData, error: signedUrlError } =
                        await supabase
                            .storage
                            .from("employee-certificates")
                            .createSignedUrl(
                                document.file_path,
                                3600
                            );

                    if (!signedUrlError && signedUrlData) {
                        signedUrl = signedUrlData.signedUrl;
                    }
                } catch (err) {
                    console.error("Signed URL error for", document.id, err);
                }

                const emp = employeeMap[document.employee_id] || null;

                return {
                    ...document,
                    signed_url: signedUrl,
                    employee: emp,
                    pegawai: emp
                };
            })
        );


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