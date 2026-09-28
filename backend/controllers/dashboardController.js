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


// GET DATA DASHBOARD
const getDashboard = async (req, res) => {
    try {
        const supabase = getSupabaseClient(req.accessToken);

        // Mengambil seluruh data pegawai
        const { data, error } = await supabase
            .from("employees")
            .select("tim_kerja");

        if (error) {
            console.log("SUPABASE ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data dashboard",
                error: error.message
            });
        }

        // Menghitung jumlah berdasarkan Tim Kerja
        const totalPegawai = data.length;

        const totalTU = data.filter(
            (employee) => employee.tim_kerja === "TU"
        ).length;

        const totalMolin = data.filter(
            (employee) => employee.tim_kerja === "Molin"
        ).length;

        const totalKI = data.filter(
            (employee) => employee.tim_kerja === "KI"
        ).length;

        const totalBidang = data.filter(
            (employee) => employee.tim_kerja === "Bidang"
        ).length;

        const totalKepalaPusat = data.filter(
            (employee) => employee.tim_kerja === "Kepala Pusat"
        ).length;

        return res.status(200).json({
            success: true,
            message: "Data dashboard berhasil diambil",
            data: {
                total_pegawai: totalPegawai,
                total_TU: totalTU,
                total_Molin: totalMolin,
                total_KI: totalKI,
                total_Bidang: totalBidang,
                total_Kepala_Pusat: totalKepalaPusat
            }
        });

    } catch (error) {
        console.error("Get dashboard error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


module.exports = {
    getDashboard
};