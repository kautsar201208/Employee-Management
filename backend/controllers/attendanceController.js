const { supabaseAdmin } = require("../config/supabase");

const getAttendanceSummaries = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from("employee_attendance_summaries")
            .select(`
                employee_id,
                attendance_year,
                alpha_days,
                late_minutes,
                early_leave_minutes,
                forgot_clock_in_count,
                forgot_clock_out_count,
                forgotten_attendance_alpha_days,
                total_alpha_equivalent_days,
                employee:employees!inner(nip, nama_lengkap, nama, jabatan)
            `)
            .order("attendance_year", { ascending: false })
            .order("employee_id", { ascending: true });

        if (error) {
            console.error("Attendance summary query error:", error);
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil rekap kehadiran",
                error: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Rekap kehadiran berhasil diambil",
            data
        });
    } catch (error) {
        console.error("Get attendance summaries error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil rekap kehadiran",
            error: error.message
        });
    }
};

module.exports = { getAttendanceSummaries };
