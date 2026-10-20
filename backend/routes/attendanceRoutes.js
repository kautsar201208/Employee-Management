const express = require("express");
const router = express.Router();
const {
    getAttendanceSummaries,
    createAttendanceSummary,
    updateAttendanceSummary,
    deleteAttendanceSummary
} = require("../controllers/attendanceController");
const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

router.get("/", authenticate, adminOnly, getAttendanceSummaries);
router.post("/", authenticate, adminOnly, createAttendanceSummary);
router.put("/:employeeId/:year", authenticate, adminOnly, updateAttendanceSummary);
router.delete("/:employeeId/:year", authenticate, adminOnly, deleteAttendanceSummary);

module.exports = router;
