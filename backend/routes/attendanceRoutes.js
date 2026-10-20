const express = require("express");
const router = express.Router();
const { getAttendanceSummaries } = require("../controllers/attendanceController");
const authenticate = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

router.get("/", authenticate, adminOnly, getAttendanceSummaries);

module.exports = router;
