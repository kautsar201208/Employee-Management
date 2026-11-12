const { createClient } = require("@supabase/supabase-js");
const { supabaseAdmin } = require("../config/supabase");

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

        // Cari role user di user_profiles menggunakan supabaseUser
        let role = "user";
        try {
            const { data: profile } = await supabaseUser
                .from("user_profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle();

            if (profile?.role) {
                role = profile.role;
            } else {
                // Coba cek dengan supabaseAdmin jika ada
                const { data: profileAdmin } = await supabaseAdmin
                    .from("user_profiles")
                    .select("role")
                    .eq("id", user.id)
                    .maybeSingle();

                if (profileAdmin?.role) {
                    role = profileAdmin.role;
                } else {
                    // Daftarkan role user jika belum ada
                    await supabaseAdmin
                        .from("user_profiles")
                        .upsert({ id: user.id, role: "user" })
                        .catch(() => null);
                }
            }
        } catch (err) {
            console.warn("Notice: Gagal query user_profiles, menggunakan role default 'user':", err.message);
        }

        // Cari data pegawai berdasarkan auth_user_id
        let employee = null;

        // 1. Coba cari dengan supabaseUser
        try {
            const { data: empUser } = await supabaseUser
                .from("employees")
                .select("*")
                .eq("auth_user_id", user.id)
                .maybeSingle();
            if (empUser) employee = empUser;
        } catch (_) {}

        // 2. Coba cari dengan supabaseAdmin jika belum ketemu
        if (!employee) {
            try {
                const { data: empAdmin } = await supabaseAdmin
                    .from("employees")
                    .select("*")
                    .eq("auth_user_id", user.id)
                    .maybeSingle();
                if (empAdmin) employee = empAdmin;
            } catch (_) {}
        }

        // 3. Fallback: Cari berdasarkan email pengguna jika auth_user_id belum terhubung
        if (!employee && user.email) {
            const cleanEmail = user.email.trim();
            try {
                const { data: empByEmail } = await supabaseAdmin
                    .from("employees")
                    .select("*")
                    .ilike("email", cleanEmail)
                    .maybeSingle();

                if (empByEmail) {
                    employee = empByEmail;
                    // Tautkan auth_user_id
                    await supabaseAdmin
                        .from("employees")
                        .update({ auth_user_id: user.id })
                        .eq("id", empByEmail.id);
                    console.log(`✅ [authMiddleware] Berhasil menautkan pegawai ${empByEmail.nama || empByEmail.nama_lengkap} ke auth_user_id ${user.id}`);
                }
            } catch (_) {}
        }

        // 4. Fallback: Cari berdasarkan NIP di metadata jika ada
        if (!employee && user.user_metadata?.nip) {
            const cleanNip = String(user.user_metadata.nip).trim();
            try {
                const { data: empByNip } = await supabaseAdmin
                    .from("employees")
                    .select("*")
                    .eq("nip", cleanNip)
                    .maybeSingle();

                if (empByNip) {
                    employee = empByNip;
                    await supabaseAdmin
                        .from("employees")
                        .update({ auth_user_id: user.id })
                        .eq("id", empByNip.id);
                    console.log(`✅ [authMiddleware] Berhasil menautkan pegawai NIP ${cleanNip} ke auth_user_id ${user.id}`);
                }
            } catch (_) {}
        }

        // Simpan informasi ke request
        req.user = user;
        req.role = role;
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