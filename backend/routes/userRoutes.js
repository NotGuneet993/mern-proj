const express = require("express");
const User = require("../models/Users.js");
const sendVerification = require("../functions/mailgun.js");

const router = express.Router();

// Login Route
// path is: /users/login
// inputs are an email and password
// a JSON with "authorization" and "message" is returned
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }); // TODO Also allow username as input
    if (!user) {
      return res.status(401).json({ authorization: false, message: "User not found" });
    }

    // Normally, you should hash and compare passwords, but for simplicity:
    // Note: The passwords are hashed before backend has access to them, so ln 22 is still valid
    // since we'd just be checking a hashed password from login against a hashed password in DB -Zen
    if (password !== user.password) {
      return res.status(401).json({ authorization: false, message: "Invalid credentials" });
    }

    res.json({ authorization: true, message: "" });
  } catch (error) {
    res.status(500).json({ authorization: false, message: `Server error : ${error}` });
  }
});

// Register route
// path is /users/register
// inputs are name, email, username, and password
// a JSON with "authorization" and "message" is returned
router.post("/register", async (req, res) => {
  const {name, email, username, password} = req.body;

  try {
    // Check for duplicate emails / usernames
    const em = await User.findOne({ email });
    if (em) {
      return res.status(409).json({ authorization: false, message: `Email already in use` });
    }

    const user = await User.findOne({ username });
    if (user) {
      return res.status(409).json({ authorization: false, message: `User already exists` });
    }

    // No conflicts: create a new user and subsequently save it to Users
    newUser = new User({
      name : name,
      email : email,
      username : username,
      password: password,
    });
    await newUser.save();

    // Email verification
    const mg = req.mailgun;
    const crypto = req.crypto;

    const tk = crypto.randomBytes(32).toString("hex");
    // TODO Make /verify route (see line 4 of ../functions/mailgun.js)
    // TODO Store token somewhere that can be accessed by /verify route
    await sendVerification(mg, name, email, tk);
    // TODO Established 'verified' property in Users as a boolean

    // TODO Use established 'verified' property to determine if user is authorized or not
    res.json({ authorization: false, message: "" });
  } catch (error) {
    res.status(500).json({ authorization: false, message: `Server error : ${error}` });
  }

});
// TODO create a page to verify email and when email is verified authorize and enter app

module.exports = router;