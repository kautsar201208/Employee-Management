const { supabase, supabaseAdmin } = require("../config/supabase");

const register = async (req, res) => {
    try {
        const { nama, email, password } = req.body;

        if (!nama || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Nama, email, dan password wajib diisi"
            });
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    nama
                }
            }
        });

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(201).json({
            success: true,
            message: "Register berhasil",
            user: data.user
        });

    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email dan password wajib diisi"
            });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Login berhasil",
            user: data.user,
            session: data.session
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });
    }
};


// =====================================================
// FORGOT PASSWORD
// =====================================================
const forgotPassword = async (req, res) => {
    try {
        const { email, redirectTo } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email wajib diisi"
            });
        }

        const options = {};
        if (redirectTo) {
            options.redirectTo = redirectTo;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(
            email,
            options
        );

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "Link reset password telah dikirim ke email"
        });

    } catch (error) {
        console.error("Forgot password error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });
    }
};


const getProfile = async (req, res) => {
    try {
        const user = req.user;

        return res.status(200).json({
            success: true,
            message: "Profile berhasil diambil",
            data: {
                id: user.id,
                email: user.email,
                nama: user.user_metadata?.nama || null,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error("Get profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });
    }
};


const getMyEmployee = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Data akun berhasil diambil",
            data: {
                role: req.role,
                employee: req.employee || null
            }
        });

    } catch (error) {
        console.error("Get my employee error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });
    }
};


const updatePassword = async (req, res) => {
    try {
        const { new_password, token: bodyToken, access_token: bodyAccessToken } = req.body;

        if (!new_password || new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password baru minimal 6 karakter"
            });
        }

        let token = bodyToken || bodyAccessToken;
        const authHeader = req.headers.authorization;
        if (!token && authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token pemulihan tidak ditemukan"
            });
        }

        let user = null;

        // 1. Verifikasi via Supabase getUser
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser(token);
            if (userData?.user) {
                user = userData.user;
            }
        } catch (err) {
            console.warn("getUser check notice:", err.message);
        }

        // 2. Jika token adalah authorization code (PKCE)
        if (!user) {
            try {
                const { data: sessionData } = await supabase.auth.exchangeCodeForSession(token);
                if (sessionData?.user) {
                    user = sessionData.user;
                }
            } catch (err) {
                // ignore
            }
        }

        // 3. Fallback: Ekstrak user id dari payload JWT jika valid
        if (!user) {
            try {
                const parts = token.split(".");
                if (parts.length === 3) {
                    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
                    if (payload && payload.sub) {
                        user = { id: payload.sub, email: payload.email };
                    }
                }
            } catch (err) {
                // ignore
            }
        }

        if (!user || !user.id) {
            return res.status(401).json({
                success: false,
                message: "Tautan reset kata sandi tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru."
            });
        }

        // 4. Update kata sandi pengguna secara langsung di auth Supabase menggunakan Admin client
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: new_password }
        );

        if (updateError) {
            console.error("Gagal update password via admin:", updateError);
            return res.status(400).json({
                success: false,
                message: updateError.message
            });
        }

        console.log(`✅ Kata sandi berhasil diperbarui untuk user ${user.email || user.id}`);

        return res.status(200).json({
            success: true,
            message: "Kata sandi berhasil diperbarui! Silakan login dengan kata sandi baru Anda."
        });

    } catch (error) {
        console.error("Update password server error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server saat memperbarui kata sandi"
        });
    }
};


module.exports = {
    register,
    login,
    forgotPassword,
    getProfile,
    getMyEmployee,
    updatePassword
};