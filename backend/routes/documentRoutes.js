const express = require("express");
const multer = require("multer");

const {
    uploadCertificate,
    getDocuments,
    deleteDocument
} = require("../controllers/documentController");

const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage()
});


// =====================================================
// GET DAFTAR SERTIFIKAT
// =====================================================
router.get(
    "/",
    authenticate,
    getDocuments
);


// =====================================================
// UPLOAD SERTIFIKAT USER
// =====================================================
router.post(
    "/upload",
    authenticate,
    upload.single("file"),
    uploadCertificate
);


// =====================================================
// UPLOAD SERTIFIKAT ADMIN
// =====================================================
router.post(
    "/upload-admin",
    authenticate,
    adminOnly,
    upload.single("file"),
    uploadCertificate
);


// =====================================================
// HAPUS SERTIFIKAT
// User  : hanya sertifikat miliknya
// Admin : bisa menghapus sertifikat apa saja
// =====================================================
router.delete(
    "/:id",
    authenticate,
    deleteDocument
);


module.exports = router;