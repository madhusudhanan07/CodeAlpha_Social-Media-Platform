const db = require("../config/db");

exports.registerUser = async (req, res) => {
    try {
        console.log("📩 Request Body:", req.body);

        const { firebase_uid, email, full_name, username } = req.body;

        const [result] = await db.execute(
            `INSERT INTO users (firebase_uid, email, full_name, username)
             VALUES (?, ?, ?, ?)`,
            [firebase_uid, email, full_name, username]
        );

        console.log("✅ Insert Success:", result);

        res.status(201).json({
            success: true,
            message: "User registered successfully"
        });

    } catch (err) {
        console.error("❌ Register Error:", err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};