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


// SEARCH PEGAWAI
router.get("/search", authenticate, searchEmployees);


// FILTER PEGAWAI
router.get("/filter", authenticate, filterEmployees);


// TAMBAH PEGAWAI
router.post("/", authenticate, createEmployee);


// UPDATE / EDIT PEGAWAI
router.put("/:id", authenticate, updateEmployee);


// DELETE / HAPUS PEGAWAI
router.delete("/:id", authenticate, deleteEmployee);


// GET SEMUA PEGAWAI
router.get("/", authenticate, getEmployees);


// GET DETAIL PEGAWAI
router.get("/:id", authenticate, getEmployeeById);


module.exports = router;