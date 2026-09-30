const express = require("express");

const {
    register,
    login,
    forgotPassword,
    getProfile,
    getMyEmployee
} = require("../controllers/authController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.get("/profile", authenticate, getProfile);
router.get("/me", authenticate, getMyEmployee);

module.exports = router;