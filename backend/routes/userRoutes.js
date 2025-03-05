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
    
    // This if statement holds, we're checking a pw hashed through frontend against a hashed pw in DB
    if (password !== user.password) {
      return res.status(401).json({ authorization: false, message: "Invalid credentials" });
    }

    res.json({ authorization: true, message: "Login Successfully" });
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
      emailVerified: false,
      token : "",
      tkTime : "",
    });


    // Initialize email verification
    const mg = req.mailgun;
    const crypto = req.crypto;
    const token = crypto.randomBytes(32).toString("hex");
    // Uncomment to test, make it a comment when pushing
    //console.log(token);
    
    // Assign verification token to user and save in database to cross reference in /verify
    newUser.token = `${token}`;
    let curTime = new Date().getMinutes();
    newUser.tkTime = curTime;
    await newUser.save();

    // Send verification email
    await sendVerification(mg, name, email, token, "register");

    res.json({ authorization: false, message: "" });
  } catch (error) {
    res.status(500).json({ authorization: false, message: `Server error : ${error}` });
  }

});

// Forgot password route
// path is /users/forgot
// Sole input is email (that was entered in forgot password page)
// a JSON with "authorization" and "message" is returned
router.post("/forgot", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (user) {
      // Initialize email verification
      const mg = req.mailgun;
      const crypto = req.crypto;
      const token = crypto.randomBytes(32).toString("hex");
      // Uncomment to test, make it a comment when pushing
      // console.log(token);

      // Apply token to user and send verification email
      await user.updateOne({ token: `${token}` });
      let curTime = new Date().getMinutes();
      await user.updateOne({ tkTime: curTime });
      await sendVerification(mg, user.name, email, token, "forgot");
    }

    // TODO Note: Absolutely nothing is supposed to happen if user DNE or isn't email verified.
    // They will have already been redirected to the landing page either way

    res.json({ authorization: false, message: "" });
  } catch (error) {
    res.status(500).json({ authorization: false, message: `Server error : ${error}` });
  }
});

// Verify route
// path is /users/verify
// Inputs are token and type (from verification link), both acting as query
// a JSON with "authorization" and "message" is returned
router.get("/verify", async (req, res) => {
  const {token , type} = req.query;
  
  try { 
    // Check for existing token and if the found user is email verified
    const user = await User.findOne({ token });
    if ( !user || (type == "forgot" && user.emailVerified == false) ) {
      // Uncomment to test, make it a comment when pushing
      //if (user) { console.log("Attempted forgot password with unverified email"); } 
      return res.status(401).json({ authorization: false, message: "Invalid token" });
      // TODO Redirect to some 404 page
    }

    // Save current time and time of token creation
    const curTime = new Date().getMinutes();
    const tkTime = user.tkTime;

    // Update token statuses of the user
    await user.updateOne({ token: "" });
    await user.updateOne({ tkTime: "" });

    // Check if the token timed out (5 or more minutes)
    if ( curTime - tkTime >= 5) {
      // Uncomment to test, make it a comment when pushing
      //console.log("Verification attempted with expired token");
      return res.status(401).json({ authorization: false, message: "Invalid token" });
      // TODO Redirect to some 404 page
    }

    // Successful registration
    if (type == "register") {
      await user.updateOne({ emailVerified: true });
      return res.json({ authorization: true, message: "New user succcessfully verified." });
      // TODO Grab user info, save it to the session, and redirect them to the home page
    }
    
    // Proceed to change password
    else if (type == "forgot") {
      return res.json({ authorization: true, message: "Current user successfully verified." });
      // TODO Redirect to change password page
    }
    
    // This should never happen
    res.status(500).json({ authorization: false, 
      message:`Extraneous /verify error: "type" was neither register nor forgot` });
  } catch (error) {
    res.status(500).json({ authorization: false, message: `Server error : ${error}` });
  }
});

// Change password route
// Path is /users/changepw
// Inputs are username (that is stored in session) and newPassword
// a JSON with "authorization" and "message" is returned
router.post("/changepw", async (req, res) => {
  const {username , newPassword} = req.body;
  
  // TODO Note: This route's logic assumes that a user was authorized to enter /changepw through /verify
  try {
    const user = await User.findOne({ username });
    if (!user) {
      // This should never happen
      return res.status(500).json({ authorization: false, 
        message: "Extraneous /changepw error: User stored in session does not exist" });
    }

    // Same password
    if (newPassword == user.password) {
      return res.status(400).json({ authorization: false, message: "Can't make new password current password"});
      // TODO Print the error message, no redirect needed
    }

    // All good: update password
    await user.updateOne({ password: `${newPassword}` });
    // TODO Redirect user to login page

    res.json({ authorization: false, message: "Password successfully changed" });
  }catch (error) {
    res.status(500).json({ authorization: false, message: `Server error : ${error}` });
  }
});

module.exports = router;