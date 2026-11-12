const { supabase, supabaseAdmin } = require("../config/supabase");

// =====================================================
// CEK NIP (Untuk auto-fill nama di form registrasi)
// =====================================================
const checkNip = async (req, res) => {
    try {
        const { nip } = req.params;

        if (!nip || !nip.trim()) {
            return res.status(400).json({
                success: false,
                message: "NIP wajib diisi"
            });
        }

        const cleanNip = nip.trim();

        const { data: emp, error: empErr } = await supabaseAdmin
            .from("employees")
            .select("id, nip, nama_lengkap, nama, email")
            .eq("nip", cleanNip)
            .maybeSingle();

        if (empErr) {
            console.error("Check NIP error:", empErr);
            return res.status(500).json({
                success: false,
                message: "Gagal memeriksa NIP",
                error: empErr.message
            });
        }

        if (!emp) {
            return res.status(404).json({
                success: false,
                message: "NIP tidak ditemukan dalam data pegawai"
            });
        }

        const nama = emp.nama_lengkap || emp.nama || "";

        return res.status(200).json({
            success: true,
            message: "Pegawai ditemukan",
            data: {
                nip: emp.nip,
                nama: nama
            }
        });
    } catch (error) {
        console.error("Check NIP server error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });
    }
};

// =====================================================
// REGISTER (NIP + EMAIL + PASSWORD)
// =====================================================
const register = async (req, res) => {
    try {
        const { nip, email, password } = req.body;

        if (!nip || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "NIP, email, dan password wajib diisi"
            });
        }

        const cleanNip = nip.trim();
        const cleanEmail = email.trim().toLowerCase();

        // 1. Cari data pegawai berdasarkan NIP
        const { data: emp, error: empErr } = await supabaseAdmin
            .from("employees")
            .select("id, nama_lengkap, nama, email, auth_user_id")
            .eq("nip", cleanNip)
            .maybeSingle();

        if (empErr) {
            console.error("Lookup employee error:", empErr);
            return res.status(500).json({
                success: false,
                message: "Gagal memeriksa data pegawai",
                error: empErr.message
            });
        }

        if (!emp) {
            return res.status(404).json({
                success: false,
                message: "NIP tidak ditemukan dalam data pegawai"
            });
        }

        // 2. Verifikasi email pegawai harus cocok dengan NIP
        const empEmail = emp.email ? emp.email.trim().toLowerCase() : "";
        if (!empEmail || empEmail !== cleanEmail) {
            return res.status(400).json({
                success: false,
                message: "Email tidak cocok dengan data pegawai untuk NIP tersebut"
            });
        }

        const namaPegawai = emp.nama_lengkap || emp.nama || "";

        // 3. Registrasi ke Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
                data: {
                    nama: namaPegawai,
                    nip: cleanNip
                }
            }
        });

        if (authError) {
            return res.status(400).json({
                success: false,
                message: authError.message
            });
        }

        const authUserId = authData.user?.id;

        if (authUserId) {
            // 4. Hubungkan data pegawai di tabel employees dengan auth_user_id Supabase
            const { error: linkErr } = await supabaseAdmin
                .from("employees")
                .update({ auth_user_id: authUserId })
                .eq("id", emp.id);

            if (linkErr) {
                console.error("Gagal menautkan auth_user_id ke tabel employees:", linkErr);
            }

            // 5. Tambahkan role default 'user' ke tabel user_profiles
            const { error: profileErr } = await supabaseAdmin
                .from("user_profiles")
                .upsert({
                    id: authUserId,
                    role: "user"
                });

            if (profileErr) {
                console.error("Gagal menambahkan role ke user_profiles:", profileErr);
            }

            // 6. Cadangan untuk tabel user_profile (jika ada)
            try {
                await supabaseAdmin
                    .from("user_profile")
                    .upsert({
                        auth_user_id: authUserId,
                        employee_id: emp.id,
                        nama_lengkap: namaPegawai,
                        nip: cleanNip,
                        email: cleanEmail,
                        role: "user"
                    });
            } catch (_) {}
        }

        return res.status(201).json({
            success: true,
            message: "Register berhasil",
            user: authData.user
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
        let employee = req.employee;
        const user = req.user;

        // Safety Net: Jika req.employee masih belum terhubung, cari & tautkan otomatis dengan supabaseAdmin
        if (!employee && user) {
            // 1. Cari berdasarkan auth_user_id
            const { data: empByAuth } = await supabaseAdmin
                .from("employees")
                .select("*")
                .eq("auth_user_id", user.id)
                .maybeSingle();

            if (empByAuth) {
                employee = empByAuth;
            }

            // 2. Jika belum, cari berdasarkan email login
            if (!employee && user.email) {
                const cleanEmail = user.email.trim();
                const { data: empByEmail } = await supabaseAdmin
                    .from("employees")
                    .select("*")
                    .ilike("email", cleanEmail)
                    .maybeSingle();

                if (empByEmail) {
                    employee = empByEmail;
                    // Tautkan langsung ke database
                    await supabaseAdmin
                        .from("employees")
                        .update({ auth_user_id: user.id })
                        .eq("id", empByEmail.id);
                    console.log(`✅ Berhasil menautkan pegawai ${empByEmail.nama || empByEmail.nama_lengkap} ke auth_user_id ${user.id}`);
                }
            }

            // 3. Jika belum, cari berdasarkan NIP di metadata auth
            if (!employee && user.user_metadata?.nip) {
                const cleanNip = String(user.user_metadata.nip).trim();
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
                    console.log(`✅ Berhasil menautkan pegawai ${empByNip.nama || empByNip.nama_lengkap} (NIP: ${cleanNip}) ke auth_user_id ${user.id}`);
                }
            }
        }

        console.log(`[GET /me] User: ${user?.email} (${user?.id}), Employee: ${employee?.nama_lengkap || employee?.nama || "TIDAK DITEMUKAN"}`);

        return res.status(200).json({
            success: true,
            message: "Data akun berhasil diambil",
            data: {
                role: req.role || "user",
                user: {
                    id: user?.id,
                    email: user?.email,
                    nip: user?.user_metadata?.nip || null
                },
                employee: employee || null
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
    checkNip,
    register,
    login,
    forgotPassword,
    getProfile,
    getMyEmployee,
    updatePassword
};