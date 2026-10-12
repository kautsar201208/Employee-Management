const { supabaseAdmin } = require("../config/supabase");

// =====================================================
// GET SEMUA DATA PEGAWAI OUTSOURCING
// Khusus admin
// =====================================================
const getOutsourcingEmployees = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("outsourcing_employees")
            .select("*")
            .order("no", { ascending: true });

        if (error) {
            console.error("Supabase outsourcing employees error:", error);

            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data pegawai alih daya",
                error: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data pegawai alih daya berhasil diambil",
            total: data.length,
            data: data
        });
    } catch (error) {
        console.error("Get outsourcing employees error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// =====================================================
// TAMBAH DATA PEGAWAI OUTSOURCING
// =====================================================
const createOutsourcingEmployee = async (req, res) => {
    try {
        const { nama_lengkap, jabatan, satuan_kerja } = req.body;

        if (!nama_lengkap || !jabatan) {
            return res.status(400).json({
                success: false,
                message: "Nama lengkap dan jabatan wajib diisi"
            });
        }

        // Tentukan nomor urut berikutnya jika tidak disediakan
        const { data: lastRow } = await supabaseAdmin
            .from("outsourcing_employees")
            .select("no")
            .order("no", { ascending: false })
            .limit(1)
            .maybeSingle();

        const nextNo = (lastRow?.no || 0) + 1;

        const { data, error } = await supabaseAdmin
            .from("outsourcing_employees")
            .insert([
                {
                    no: req.body.no ? Number(req.body.no) : nextNo,
                    nama_lengkap: nama_lengkap.trim(),
                    jabatan: jabatan.trim(),
                    satuan_kerja: (satuan_kerja || "PT Terra Perkasa Mandiri").trim()
                }
            ])
            .select()
            .single();

        if (error) {
            console.error("Create outsourcing employee error:", error);
            return res.status(500).json({
                success: false,
                message: "Gagal menambahkan data pegawai alih daya",
                error: error.message
            });
        }

        return res.status(201).json({
            success: true,
            message: "Data pegawai alih daya berhasil ditambahkan",
            data
        });
    } catch (error) {
        console.error("Create outsourcing employee error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// =====================================================
// UPDATE DATA PEGAWAI OUTSOURCING
// =====================================================
const updateOutsourcingEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_lengkap, jabatan, satuan_kerja, no } = req.body;

        const updateData = {};
        if (nama_lengkap !== undefined) updateData.nama_lengkap = nama_lengkap.trim();
        if (jabatan !== undefined) updateData.jabatan = jabatan.trim();
        if (satuan_kerja !== undefined) updateData.satuan_kerja = satuan_kerja.trim();
        if (no !== undefined) updateData.no = Number(no);

        const { data, error } = await supabaseAdmin
            .from("outsourcing_employees")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Update outsourcing employee error:", error);
            return res.status(500).json({
                success: false,
                message: "Gagal memperbarui data pegawai alih daya",
                error: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data pegawai alih daya berhasil diperbarui",
            data
        });
    } catch (error) {
        console.error("Update outsourcing employee error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// =====================================================
// HAPUS DATA PEGAWAI OUTSOURCING
// =====================================================
const deleteOutsourcingEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from("outsourcing_employees")
            .delete()
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Delete outsourcing employee error:", error);
            return res.status(500).json({
                success: false,
                message: "Gagal menghapus data pegawai alih daya",
                error: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data pegawai alih daya berhasil dihapus",
            data
        });
    } catch (error) {
        console.error("Delete outsourcing employee error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

module.exports = {
    getOutsourcingEmployees,
    createOutsourcingEmployee,
    updateOutsourcingEmployee,
    deleteOutsourcingEmployee
};