const adminOnly = (req, res, next) => {
    if (req.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Akses ditolak. Hanya admin yang dapat mengakses fitur ini."
        });
    }

    next();
};

module.exports = adminOnly;