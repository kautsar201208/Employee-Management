const express = require("express");
const router = express.Router();

const {
    getOutsourcingEmployees,
    createOutsourcingEmployee,
    updateOutsourcingEmployee,
    deleteOutsourcingEmployee
} = require("../controllers/outsourcingEmployeeController");

const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

// CRUD PEGAWAI ALIH DAYA (OUTSOURCING)
// Khusus admin yang dapat mengakses endpoint ini
router.get("/", authenticate, adminOnly, getOutsourcingEmployees);
router.post("/", authenticate, adminOnly, createOutsourcingEmployee);
router.put("/:id", authenticate, adminOnly, updateOutsourcingEmployee);
router.delete("/:id", authenticate, adminOnly, deleteOutsourcingEmployee);

module.exports = router;