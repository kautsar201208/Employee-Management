const express = require("express");
const router = express.Router();

const {
    getEmployees,
    getEmployeeById,
    searchEmployees,
    filterEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee
} = require("../controllers/employeeController");

const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");


// SEARCH PEGAWAI
router.get("/search", authenticate, searchEmployees);


// FILTER PEGAWAI
router.get("/filter", authenticate, filterEmployees);


// TAMBAH PEGAWAI
// Hanya admin
router.post("/", authenticate, adminOnly, createEmployee);


// UPDATE / EDIT PEGAWAI
// Hanya admin
router.put("/:id", authenticate, adminOnly, updateEmployee);


// DELETE / HAPUS PEGAWAI
// Hanya admin
router.delete("/:id", authenticate, adminOnly, deleteEmployee);


// GET SEMUA PEGAWAI
router.get("/", authenticate, getEmployees);


// GET DETAIL PEGAWAI
router.get("/:id", authenticate, getEmployeeById);


module.exports = router;