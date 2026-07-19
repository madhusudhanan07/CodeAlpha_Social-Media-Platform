const express = require("express");
const router = express.Router();

const { registerUser } = require("../controllers/authController");

// =======================
// Test Route
// =======================
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Auth Route Working ✅"
    });
});

// =======================
// Register Route
// =======================
router.post("/register", registerUser);

module.exports = router;