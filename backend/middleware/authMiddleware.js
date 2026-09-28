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

        const supabaseAuth = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        const { data, error } = await supabaseAuth.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({
                success: false,
                message: "Token tidak valid atau sudah kedaluwarsa"
            });
        }

        req.user = data.user;
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