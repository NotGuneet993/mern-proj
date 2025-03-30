const express = require("express");
const User = require("../models/Users.js");
const sendVerification = require("../functions/mailgun.js");

const router = express.Router();

// Login Route
// path is: /users/login
// inputs are an email and password
// a JSON with "username", "authorization" and "message" is returned
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const username = email;

  try {
    const user = await User.findOne({$or: [{email:email}, {username: username}]}); 
    if (!user) {
      return res.status(404).json({ username: null, authorization: false, message: "User not found" });
    }
    
    // This if statement holds, we're checking a pw hashed through frontend against a hashed pw in DB
    if (password !== user.password) {
      return res.status(403).json({ username: null, authorization: false, message: "Incorrect password" });
    }

    // Registration timeout logic
    let curTime = new Date().getMinutes();
    let diff = curTime - user.tkTime;
    diff = diff < 0 ? 6 : diff;
    const timeout = diff >= 5 ? true : false;
    if (!user.emailVerified) {
      if (!timeout) {
        return res.status(403).json({ username: null, authorization: false, message: `Account not verified! Check your email or register again in ${5-diff} minute(s).` });
      }
      else {
        try {
          await User.deleteOne({username: username});
          return res.status(403).json({ username: null, authorization: false, message: `Verification email timed out! Please register for KnightNav again.` });
        }
        // This shouldn't happen
        catch(error) {
          return res.status(500).json({ username: null, authorization: false, message: `Extraneous DB error : Failed to delete user ${username}` });
        }
      }
    }

    res.json({ username: user.username, authorization: true, message: "Logged in successfully" });
  } catch (error) {
    res.status(500).json({ username: null, authorization: false, message: `Server error : ${error}` });
  }
});

// Register route
// path is /users/register
// inputs are name, email, username, and password
// a JSON with "username", "authorization" and "message" is returned
router.post("/register", async (req, res) => {
  const {name, email, username, password} = req.body;

  try {
    // Check for duplicate emails / usernames
    const em = await User.findOne({ email });
    if (em) {
      return res.status(409).json({ username: null, authorization: false, message: `Email already in use` });
    }

    const user = await User.findOne({ username });
    if (user) {
      return res.status(409).json({ username: null, authorization: false, message: `User already exists` });
    }

    // No conflicts: create a new user
    newUser = new User({
      name : name,
      email : email,
      username : username,
      password: password,
      emailVerified: false,
      emailVerified: false,
      token : "",
      tkTime : "",
      tkTime : "",
      classes: null
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

    res.json({ username: username, authorization: false, message: "" });
  } catch (error) {
    res.status(500).json({ username: null, authorization: false, message: `Server error : ${error}` });
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
    if (user && user.emailVerified) {
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
// a JSON with "type," "username", "authorization" and "message" is returned
router.get("/verify", async (req, res) => {
  const {token , type} = req.query;
  
  try { 
    // Check for existing token
    const user = await User.findOne({ token });
    if (!user) {
      return res.redirect(`/`);
      // TODO redirect to a verification failed page
    }

    // Save current time and time of token creation
    const curTime = new Date().getMinutes();
    let diff = curTime - user.tkTime;
    diff = diff < 0 ? 6 : diff;
    const timeout = diff >= 5 ? true : false;

    // Update token statuses of the user
    await user.updateOne({ token: "" });
    await user.updateOne({ tkTime: "" });

    // Check if the token timed out (5 or more minutes)
    if (timeout) {
      // Uncomment to test, make it a comment when pushing
      //console.log("Verification attempted with expired token");

      if (type == "register") {
        try {
          await User.deleteOne({username: username});
          return res.redirect(`/`);
        }
        // This should never happen
        catch(error) {
          return res.status(500).json({ type: null, username: null, authorization: false, message: `Extraneous DB error : Failed to delete user ${username}` });
        }
      }

      return res.redirect(`/`)
      // TODO redirect to a verification failed page
    }

    // Successful registration
    if (type == "register") {
      await user.updateOne({ emailVerified: true });
      return res.redirect(`/verifyUser/${user.username}`);
    }
    
    // Proceed to change password
    else if (type == "forgot") {
      return res.redirect(`/verifyForgot/${user.username}`);
    }
    
    // This should never happen
    res.status(500).json({ type: null, username: null, authorization: false, 
      message:`Extraneous /verify error: "type" was neither register nor forgot` });
  } catch (error) {
    res.status(500).json({ type: null, username: null, authorization: false, message: `Server error : ${error}` });
  }
});

// Check email route
// path is /users/checkemail
// Input is username being checked
// a JSON with "verified" and "message" is returned
router.post("/checkemail", async (req, res) => {
  const { username } = req.body

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ verified: false, message: `No user found.`})
    }

    res.status(200).json({ verified: user.emailVerified, message: `Verified user found.`})
  } catch (error) {
    res.status(500).json({ verified: false, message: `Server error : ${error}` });
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
    }

    // All good: update password
    await user.updateOne({ password: `${newPassword}` });
    // TODO Redirect user to login page

    res.json({ authorization: false, message: "Password successfully changed" });
  }catch (error) {
    res.status(500).json({ authorization: false, message: `Server error : ${error}` });
  }
});

// Classes related endpoints
router.put("/addClassToUser", async (req, res) => {
  try {
    const { username, classId } = req.body;

    // Find & update user, pushing the classId into their classes array
    const updatedUser = await User.findOneAndUpdate(
      {username},
      { $push: { classes: classId } },
      { new: true } // return the updated user doc
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the updated user or just a message
    return res.status(200).json({
      message: "Class assigned to user successfully",
    });
  } catch (error) {
    res.status(500).json({ message: `Server error: ${error}` });
  }
});

// GET /users/classes?username=<username>
// This endpoint returns all populated class documents for the given user.
router.get("/classes", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ message: "Username query parameter is required" });
    }
    // Find the user by username and populate the 'classes' field.
    const userDoc = await User.findOne({ username }).populate("classes");
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }
    // Return the populated classes array.
    return res.status(200).json(userDoc.classes);
  } catch (error) {
    console.error("Error fetching user classes:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;