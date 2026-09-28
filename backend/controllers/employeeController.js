const { createClient } = require("@supabase/supabase-js");

// Membuat koneksi Supabase berdasarkan token user
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


// GET SEMUA PEGAWAI
const getEmployees = async (req, res) => {
    try {
        const supabase = getSupabaseClient(req.accessToken);

        const { data, error } = await supabase
            .from("employees")
            .select("*")
            .order("no", { ascending: true });

        if (error) {
            console.log("SUPABASE ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data pegawai",
                error: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data pegawai berhasil diambil",
            total: data.length,
            data: data
        });

    } catch (error) {
        console.error("Get employees error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


// GET DETAIL PEGAWAI BERDASARKAN ID
const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;

        const supabase = getSupabaseClient(req.accessToken);

        const { data, error } = await supabase
            .from("employees")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            console.log("SUPABASE ERROR:", error);

            return res.status(404).json({
                success: false,
                message: "Data pegawai tidak ditemukan",
                error: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Detail pegawai berhasil diambil",
            data: data
        });

    } catch (error) {
        console.error("Get employee by ID error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


// SEARCH PEGAWAI
const searchEmployees = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Kata pencarian wajib diisi"
            });
        }

        const keyword = q.trim();

        const supabase = getSupabaseClient(req.accessToken);

        const { data, error } = await supabase
            .from("employees")
            .select("*")
            .or(
                `nama_lengkap.ilike.%${keyword}%,nip.ilike.%${keyword}%,jabatan.ilike.%${keyword}%,tim_kerja.ilike.%${keyword}%`
            )
            .order("no", { ascending: true });

        if (error) {
            console.log("SUPABASE ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Gagal mencari data pegawai",
                error: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Pencarian pegawai berhasil",
            total: data.length,
            data: data
        });

    } catch (error) {
        console.error("Search employees error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


// FILTER PEGAWAI
const filterEmployees = async (req, res) => {
    try {
        const {
            tim_kerja,
            status,
            jenis_jabatan
        } = req.query;

        if (!tim_kerja && !status && !jenis_jabatan) {
            return res.status(400).json({
                success: false,
                message: "Minimal satu filter harus diisi"
            });
        }

        const supabase = getSupabaseClient(req.accessToken);

        let query = supabase
            .from("employees")
            .select("*");

        if (tim_kerja) {
            query = query.eq("tim_kerja", tim_kerja);
        }

        if (status) {
            query = query.eq("status", status);
        }

        if (jenis_jabatan) {
            query = query.eq("jenis_jabatan", jenis_jabatan);
        }

        const { data, error } = await query
            .order("no", { ascending: true });

        if (error) {
            console.log("SUPABASE ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Gagal memfilter data pegawai",
                error: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Filter data pegawai berhasil",
            total: data.length,
            data: data
        });

    } catch (error) {
        console.error("Filter employees error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


// TAMBAH PEGAWAI
const createEmployee = async (req, res) => {
    try {
        const {
            no,
            nama_lengkap,
            nama,
            nip,
            status,
            jenis_jabatan,
            jabatan,
            pangkat_golongan,
            tmt_golongan,
            tim_kerja,
            jenjang_pendidikan,
            jurusan_pendidikan,
            jenis_kelamin,
            tempat_lahir,
            tanggal_lahir,
            nomor_ktp,
            nomor_ponsel,
            email
        } = req.body;

        if (!nama_lengkap) {
            return res.status(400).json({
                success: false,
                message: "Nama lengkap wajib diisi"
            });
        }

        if (!nip) {
            return res.status(400).json({
                success: false,
                message: "NIP wajib diisi"
            });
        }

        const supabase = getSupabaseClient(req.accessToken);

        const { data, error } = await supabase
            .from("employees")
            .insert([
                {
                    no,
                    nama_lengkap,
                    nama,
                    nip,
                    status,
                    jenis_jabatan,
                    jabatan,
                    pangkat_golongan,
                    tmt_golongan,
                    tim_kerja,
                    jenjang_pendidikan,
                    jurusan_pendidikan,
                    jenis_kelamin,
                    tempat_lahir,
                    tanggal_lahir,
                    nomor_ktp,
                    nomor_ponsel,
                    email
                }
            ])
            .select()
            .single();

        if (error) {
            console.log("SUPABASE ERROR:", error);

            return res.status(400).json({
                success: false,
                message: "Gagal menambahkan data pegawai",
                error: error.message
            });
        }

        return res.status(201).json({
            success: true,
            message: "Data pegawai berhasil ditambahkan",
            data: data
        });

    } catch (error) {
        console.error("Create employee error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


// UPDATE / EDIT PEGAWAI
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            no,
            nama_lengkap,
            nama,
            nip,
            status,
            jenis_jabatan,
            jabatan,
            pangkat_golongan,
            tmt_golongan,
            tim_kerja,
            jenjang_pendidikan,
            jurusan_pendidikan,
            jenis_kelamin,
            tempat_lahir,
            tanggal_lahir,
            nomor_ktp,
            nomor_ponsel,
            email
        } = req.body;

        if (!nama_lengkap) {
            return res.status(400).json({
                success: false,
                message: "Nama lengkap wajib diisi"
            });
        }

        if (!nip) {
            return res.status(400).json({
                success: false,
                message: "NIP wajib diisi"
            });
        }

        const supabase = getSupabaseClient(req.accessToken);

        const { data, error } = await supabase
            .from("employees")
            .update({
                no,
                nama_lengkap,
                nama,
                nip,
                status,
                jenis_jabatan,
                jabatan,
                pangkat_golongan,
                tmt_golongan,
                tim_kerja,
                jenjang_pendidikan,
                jurusan_pendidikan,
                jenis_kelamin,
                tempat_lahir,
                tanggal_lahir,
                nomor_ktp,
                nomor_ponsel,
                email,
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.log("SUPABASE ERROR:", error);

            return res.status(400).json({
                success: false,
                message: "Gagal mengubah data pegawai",
                error: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data pegawai berhasil diubah",
            data: data
        });

    } catch (error) {
        console.error("Update employee error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


// DELETE / HAPUS PEGAWAI
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const supabase = getSupabaseClient(req.accessToken);

        const { data, error } = await supabase
            .from("employees")
            .delete()
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.log("SUPABASE ERROR:", error);

            return res.status(400).json({
                success: false,
                message: "Gagal menghapus data pegawai",
                error: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data pegawai berhasil dihapus",
            data: data
        });

    } catch (error) {
        console.error("Delete employee error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


module.exports = {
    getEmployees,
    getEmployeeById,
    searchEmployees,
    filterEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee
};