const express = require("express");

const {
    register,
    login,
    getProfile
} = require("../controllers/authController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();


// REGISTER
router.post("/register", register);


// LOGIN
router.post("/login", login);


// PROFILE ADMIN
router.get("/profile", authenticate, getProfile);


module.exports = router;