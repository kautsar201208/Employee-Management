
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
            console.error(
                "Supabase outsourcing employees error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data pegawai outsourcing",
                error: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data pegawai outsourcing berhasil diambil",
            total: data.length,
            data: data
        });
    } catch (error) {
        console.error(
            "Get outsourcing employees error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });
    }
};

module.exports = {
    getOutsourcingEmployees
};