
const express = require("express");
const router = express.Router();

const {
    getOutsourcingEmployees
} = require("../controllers/outsourcingEmployeeController");

const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

// GET SEMUA DATA PEGAWAI OUTSOURCING
// Hanya admin yang dapat mengakses endpoint ini
router.get(
    "/",
    authenticate,
    adminOnly,
    getOutsourcingEmployees
);

module.exports = router;