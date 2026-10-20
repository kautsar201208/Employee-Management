const { supabaseAdmin } = require("../config/supabase");

const SUMMARY_FIELDS = [
    "alpha_days",
    "late_minutes",
    "early_leave_minutes",
    "forgot_clock_in_count",
    "forgot_clock_out_count"
];

const validateSummary = (body) => {
    const year = Number(body.attendance_year);
    if (!Number.isInteger(year) || year < 2000 || year > 2200) {
        return "Tahun rekap harus antara 2000 dan 2200.";
    }

    for (const field of SUMMARY_FIELDS) {
        const rawValue = body[field];
        if (
            rawValue === undefined ||
            rawValue === null ||
            (typeof rawValue === "string" && rawValue.trim() === "")
        ) {
            return `${field} wajib diisi dengan bilangan bulat nol atau lebih.`;
        }
        const value = Number(body[field]);
        if (!Number.isSafeInteger(value) || value < 0) {
            return `${field} harus berupa bilangan bulat nol atau lebih.`;
        }
    }

    return null;
};

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
                employee:employees!inner(nip, nama_lengkap, nama, jabatan, status, pangkat_golongan, tim_kerja, profile_image)
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

const createAttendanceSummary = async (req, res) => {
    try {
        const { employee_id, attendance_year } = req.body;
        const validationError = validateSummary(req.body);
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }
        if (typeof employee_id !== "string" || !employee_id.trim()) {
            return res.status(400).json({
                success: false,
                message: "Pegawai wajib dipilih."
            });
        }

        const payload = {
            employee_id: employee_id.trim(),
            attendance_year: Number(attendance_year),
            ...Object.fromEntries(
                SUMMARY_FIELDS.map((field) => [field, Number(req.body[field])])
            )
        };
        const { data, error } = await supabaseAdmin
            .from("employee_attendance_summaries")
            .insert(payload)
            .select("employee_id, attendance_year");

        if (error) {
            if (error.code === "23505") {
                return res.status(409).json({
                    success: false,
                    message: "Rekap pegawai untuk tahun tersebut sudah ada."
                });
            }
            console.error("Attendance summary create error:", error);
            return res.status(400).json({
                success: false,
                message: "Gagal menambahkan rekap kehadiran.",
                error: error.message
            });
        }

        return res.status(201).json({
            success: true,
            message: "Rekap kehadiran berhasil ditambahkan.",
            data: data[0]
        });
    } catch (error) {
        console.error("Create attendance summary error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat menambahkan rekap kehadiran.",
            error: error.message
        });
    }
};

const updateAttendanceSummary = async (req, res) => {
    try {
        const { employeeId, year } = req.params;
        const validationError = validateSummary({
            ...req.body,
            attendance_year: year
        });
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const updateData = Object.fromEntries(
            SUMMARY_FIELDS.map((field) => [field, Number(req.body[field])])
        );
        const { data, error } = await supabaseAdmin
            .from("employee_attendance_summaries")
            .update(updateData)
            .eq("employee_id", employeeId)
            .eq("attendance_year", Number(year))
            .select("employee_id, attendance_year")
            .maybeSingle();

        if (error) {
            console.error("Attendance summary update error:", error);
            return res.status(400).json({
                success: false,
                message: "Gagal mengubah rekap kehadiran.",
                error: error.message
            });
        }
        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Rekap kehadiran tidak ditemukan."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Rekap kehadiran berhasil diubah.",
            data
        });
    } catch (error) {
        console.error("Update attendance summary error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengubah rekap kehadiran.",
            error: error.message
        });
    }
};

const deleteAttendanceSummary = async (req, res) => {
    try {
        const { employeeId, year } = req.params;
        const attendanceYear = Number(year);
        if (!Number.isInteger(attendanceYear) || attendanceYear < 2000 || attendanceYear > 2200) {
            return res.status(400).json({
                success: false,
                message: "Tahun rekap tidak valid."
            });
        }

        const { data, error } = await supabaseAdmin
            .from("employee_attendance_summaries")
            .delete()
            .eq("employee_id", employeeId)
            .eq("attendance_year", attendanceYear)
            .select("employee_id")
            .maybeSingle();

        if (error) {
            console.error("Attendance summary delete error:", error);
            return res.status(400).json({
                success: false,
                message: "Gagal menghapus rekap kehadiran.",
                error: error.message
            });
        }
        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Rekap kehadiran tidak ditemukan."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Rekap kehadiran berhasil dihapus."
        });
    } catch (error) {
        console.error("Delete attendance summary error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat menghapus rekap kehadiran.",
            error: error.message
        });
    }
};

module.exports = {
    getAttendanceSummaries,
    createAttendanceSummary,
    updateAttendanceSummary,
    deleteAttendanceSummary,
    validateSummary
};
