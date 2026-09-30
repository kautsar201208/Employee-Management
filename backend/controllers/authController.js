const supabase = require("../config/supabase");

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
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email wajib diisi"
            });
        }

        const { error } = await supabase.auth.resetPasswordForEmail(
            email
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


module.exports = {
    register,
    login,
    forgotPassword,
    getProfile,
    getMyEmployee
};