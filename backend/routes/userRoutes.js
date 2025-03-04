const express = require("express");
const User = require("../models/Users.js");
const sendVerification = require("../functions/mailgun.js");

const router = express.Router();

// Login Route
// path is: /users/login
// inputs are an email and password
// a JSON with "authorization" and "message" is returned
router.post("/login", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const user = await User.findOne({$or: [{email:email}, {username: username}]}); 
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

    // No conflicts: create a new user
    newUser = new User({
      name : name,
      email : email,
      username : username,
      password: password,
      verified: false,
      token : "",
    });


    // Initialize email verification
    const mg = req.mailgun;
    const crypto = req.crypto;
    const token = crypto.randomBytes(32).toString("hex");
    console.log(`This token is being printed by /register in userRoutes.js and should be deleted when \
we are done testing email verification.\nToken: ${token}`); // TODO Delete when we're live
    
    // Assign verification token to user and save in database to cross reference in /verify
    newUser.token = `${token}`;
    await newUser.save();
    await sendVerification(mg, name, email, token);

    res.json({ authorization: false, message: "" });
  } catch (error) {
    res.status(500).json({ authorization: false, message: `Server error : ${error}` });
  }

});

// Verify route
// path is /users/verify
// Sole input is token from verification link acting as query
// a JSON with "authorization" and "message" is returned
router.get("/verify", async (req, res) => {
  const { token } = req.query;
  
  try { 
    // Compare tokens
    const user = await User.findOne({ token });
    if (!user) {
      res.status(401).json({ authorization: false, message: "Invalid token" });
      // TODO Redirect to some failed verification page
    }
    
    // All good, update the statuses of the newly created user.
    await user.updateOne({ verified: true });
    await user.updateOne({ token: ""});
    
    res.json({ authorization: true, message: "" });
    // TODO Redirect to some home page
  } catch (error) {
    res.status(500).json({ authorization: false, message: `Server error : ${error}` });
  }
});

// TODO: endpoint for user to fetch schedules

module.exports = router;