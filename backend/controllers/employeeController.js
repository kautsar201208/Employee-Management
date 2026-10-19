const { createClient } = require("@supabase/supabase-js");

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

const normalizePhoneNumber = (phone) => {
    if (!phone) return phone;
    const clean = String(phone).trim();
    if (clean.startsWith("8")) {
        return "0" + clean;
    }
    return clean;
};

const parseStatusAndKeterangan = (rawStatus, existingKeterangan) => {
    let status = rawStatus ? String(rawStatus).trim() : "";
    let keterangan = existingKeterangan ? String(existingKeterangan).trim() : "";

    if (keterangan && /cuti di luar tanggungan negara/i.test(keterangan)) {
        keterangan = "CLTN";
    }

    if (!keterangan || keterangan === "—") {
        if (rawStatus) {
            const match = String(rawStatus).match(/^(.*?)\s*[\(\-\[]\s*(Tugas Belajar|Cuti di Luar Tanggungan Negara|CLTN|Pensiun)\s*[\)\]]?$/i);
            if (match) {
                status = match[1].trim();
                const matchedKet = match[2].trim();
                keterangan = /cuti di luar tanggungan negara/i.test(matchedKet) ? "CLTN" : matchedKet;
            }
        }
    }

    if (!keterangan || keterangan === "—" || keterangan.trim() === "") {
        keterangan = "Aktif";
    }

    return { status, keterangan };
};

const formatEmployeeData = (emp) => {
    if (!emp) return emp;
    const { status, keterangan } = parseStatusAndKeterangan(emp.status, emp.keterangan);
    return {
        ...emp,
        status,
        keterangan: keterangan || "Aktif"
    };
};


// =====================================================
// GET SEMUA DATA PEGAWAI
// =====================================================
const getEmployees = async (req, res) => {
    try {
        const supabase = getSupabaseClient(req.accessToken);

        let query = supabase
            .from("employees")
            .select("*");

        // ADMIN → melihat semua pegawai
        if (req.role === "admin") {
            query = query.order("no", { ascending: true });
        }

        // USER → hanya melihat data pegawainya sendiri
        else if (req.role === "user") {
            if (!req.employee) {
                return res.status(404).json({
                    success: false,
                    message: "Akun belum terhubung dengan data pegawai"
                });
            }

            query = query
                .eq("auth_user_id", req.user.id)
                .order("no", { ascending: true });
        }

        else {
            return res.status(403).json({
                success: false,
                message: "Role user tidak dikenali"
            });
        }

        const { data, error } = await query;

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
            data: data.map(formatEmployeeData)
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


// =====================================================
// GET DATA PEGAWAI BERDASARKAN ID
// =====================================================
const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;

        const supabase = getSupabaseClient(req.accessToken);

        let query = supabase
            .from("employees")
            .select("*")
            .eq("id", id);

        // USER → hanya boleh membuka data pegawainya sendiri
        if (req.role === "user") {
            if (!req.employee) {
                return res.status(404).json({
                    success: false,
                    message: "Akun belum terhubung dengan data pegawai"
                });
            }

            query = query.eq(
                "auth_user_id",
                req.user.id
            );
        }

        // ADMIN → boleh membuka data pegawai mana saja
        else if (req.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Role user tidak dikenali"
            });
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
            console.log("SUPABASE ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Gagal mengambil detail pegawai",
                error: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Data pegawai tidak ditemukan"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Detail pegawai berhasil diambil",
            data: formatEmployeeData(data)
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


// =====================================================
// SEARCH DATA PEGAWAI
// =====================================================
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

        let query = supabase
            .from("employees")
            .select("*")
            .or(
                `nama_lengkap.ilike.%${keyword}%,nip.ilike.%${keyword}%,jabatan.ilike.%${keyword}%,tim_kerja.ilike.%${keyword}%`
            );

        // USER → pencarian hanya pada data miliknya
        if (req.role === "user") {
            if (!req.employee) {
                return res.status(404).json({
                    success: false,
                    message: "Akun belum terhubung dengan data pegawai"
                });
            }

            query = query.eq(
                "auth_user_id",
                req.user.id
            );
        }

        // ADMIN → mencari seluruh pegawai
        else if (req.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Role user tidak dikenali"
            });
        }

        const { data, error } = await query
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
            data: data.map(formatEmployeeData)
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


// =====================================================
// FILTER DATA PEGAWAI
// =====================================================
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
            query = query.eq(
                "jenis_jabatan",
                jenis_jabatan
            );
        }

        // USER → filter hanya data miliknya
        if (req.role === "user") {
            if (!req.employee) {
                return res.status(404).json({
                    success: false,
                    message: "Akun belum terhubung dengan data pegawai"
                });
            }

            query = query.eq(
                "auth_user_id",
                req.user.id
            );
        }

        // ADMIN → boleh filter seluruh pegawai
        else if (req.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Role user tidak dikenali"
            });
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
            data: data.map(formatEmployeeData)
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


// =====================================================
// TAMBAH DATA PEGAWAI
// ADMIN ONLY
// =====================================================
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
            email,
            keterangan
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

        const employeeData = {
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
            nomor_ponsel: normalizePhoneNumber(nomor_ponsel),
            email
        };

        if (keterangan !== undefined) {
            let cleanKet = (keterangan || "").trim();
            if (/cuti di luar tanggungan negara/i.test(cleanKet)) {
                cleanKet = "CLTN";
            }
            employeeData.keterangan = cleanKet || "Aktif";
        }

        let { data, error } = await supabase
            .from("employees")
            .insert([employeeData])
            .select()
            .single();

        if (error && error.message && error.message.includes("keterangan")) {
            delete employeeData.keterangan;
            const cleanKet = (keterangan || "").trim();
            const normalizedKet = /cuti di luar tanggungan negara/i.test(cleanKet) ? "CLTN" : cleanKet;
            if (normalizedKet && normalizedKet !== "Aktif") {
                employeeData.status = `${status || "PNS"} (${normalizedKet})`;
            } else if (status) {
                employeeData.status = status;
            }
            const retry = await supabase
                .from("employees")
                .insert([employeeData])
                .select()
                .single();
            data = retry.data;
            error = retry.error;
        }

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
            data: formatEmployeeData(data)
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


// =====================================================
// UPDATE DATA PEGAWAI
// ADMIN ONLY
// =====================================================
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
            email,
            keterangan
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

        const updateData = {
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
            nomor_ponsel: normalizePhoneNumber(nomor_ponsel),
            email,
            updated_at: new Date().toISOString()
        };

        if (keterangan !== undefined) {
            let cleanKet = (keterangan || "").trim();
            if (/cuti di luar tanggungan negara/i.test(cleanKet)) {
                cleanKet = "CLTN";
            }
            updateData.keterangan = cleanKet || "Aktif";
        }

        let { data, error } = await supabase
            .from("employees")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error && error.message && error.message.includes("keterangan")) {
            delete updateData.keterangan;
            const cleanKet = (keterangan || "").trim();
            const normalizedKet = /cuti di luar tanggungan negara/i.test(cleanKet) ? "CLTN" : cleanKet;
            if (normalizedKet && normalizedKet !== "Aktif") {
                updateData.status = `${status || "PNS"} (${normalizedKet})`;
            } else if (status) {
                updateData.status = status;
            }
            const retry = await supabase
                .from("employees")
                .update(updateData)
                .eq("id", id)
                .select()
                .single();
            data = retry.data;
            error = retry.error;
        }

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
            data: formatEmployeeData(data)
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


// =====================================================
// HAPUS DATA PEGAWAI
// ADMIN ONLY
// =====================================================
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