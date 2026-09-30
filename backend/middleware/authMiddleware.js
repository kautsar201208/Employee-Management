const { createClient } = require("@supabase/supabase-js");

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Token tidak ditemukan"
            });
        }

        const token = authHeader.split(" ")[1];

        // Client untuk mengecek token user
        const supabaseAuth = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        const { data: userData, error: userError } =
            await supabaseAuth.auth.getUser(token);

        if (userError || !userData.user) {
            return res.status(401).json({
                success: false,
                message: "Token tidak valid atau sudah kedaluwarsa"
            });
        }

        const user = userData.user;

        // Client menggunakan token user
        const supabaseUser = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            }
        );

        // Cari role user
        const { data: profile, error: profileError } =
            await supabaseUser
                .from("user_profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle();

        if (profileError) {
            console.error("Profile lookup error:", profileError);

            return res.status(500).json({
                success: false,
                message: "Gagal mengambil role user",
                error: profileError.message
            });
        }

        if (!profile) {
            return res.status(403).json({
                success: false,
                message: "Role user belum terdaftar"
            });
        }

        // Cari data pegawai berdasarkan auth_user_id
        const { data: employee, error: employeeError } =
            await supabaseUser
                .from("employees")
                .select("*")
                .eq("auth_user_id", user.id)
                .maybeSingle();

        if (employeeError) {
            console.error("Employee lookup error:", employeeError);

            return res.status(500).json({
                success: false,
                message: "Gagal mencari data pegawai",
                error: employeeError.message
            });
        }

        // Simpan informasi ke request
        req.user = user;
        req.role = profile.role;
        req.employee = employee;
        req.accessToken = token;

        next();

    } catch (error) {
        console.error("Auth middleware error:", error);

        return res.status(401).json({
            success: false,
            message: "Autentikasi gagal"
        });
    }
};

module.exports = authenticate;