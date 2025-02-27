const express = require("express");
const User = require("../models/Users.js");

const router = express.Router();

// Login Route
// path is: /users/login
// imputs are am email and password
// a JSON with "authorization" and "message" is returned
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ authorization: false, message: "User not found" });
    }

    // Normally, you should hash and compare passwords, but for simplicity:
    if (password !== user.password) {
      return res.status(401).json({ authorization: false, message: "Invalid credentials" });
    }

    res.json({ authorization: true });
  } catch (error) {
    res.status(500).json({ authorization: false, message: "Server error" });
  }
});

module.exports = router;