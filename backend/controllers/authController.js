const { db } = require("../config/firebase");

const usersCol = db.collection('users');

exports.registerUser = async (req, res) => {
    try {
        console.log("📩 Request Body:", req.body);

        const { firebase_uid, email, full_name, username } = req.body;

        const userRef = usersCol.doc(firebase_uid);
        await userRef.set({
            firebase_uid,
            email,
            full_name,
            username,
            bio: '',
            profile_picture: '',
            cover_photo: null,
            location: '',
            website: '',
            joined_date: new Date()
        });

        console.log("✅ User Registered in Firestore:", firebase_uid);

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