const express = require("express");
const User = require("../models/Users.js");

const router = express.Router();

// Check if email exists in KnightNav.Users
router.get("/exists/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (user) {
        console.log(res.json.value);
        return res.json({ exists: true });
    } else {
        console.log(res.json.value);
      return res.json({ exists: false });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;