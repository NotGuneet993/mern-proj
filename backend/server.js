require('dotenv').config();
const express = require("express");
const session = require("express-session"); // Cookie / Session modules
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const uri = process.env.URI;
//  Mongoose queries the lowercase, plural form of the model name as the collection name.
//  i.e. User.findOne() checks collection titled "users" for object in question (User -> users)
const User = require("./User");

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(cookieParser()); // Cookies

const allowedOrigins = [ 
  "https://www.knightnav.net",
  "http://localhost:5173"
];

// CORS config
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Cookies / Sessions
  })
);

// Session Middleware
app.use(
  session({
    secret: "hi",
    resave: false,
      saveUninitialized: true,
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
  })
);

// Sample Route
const test = "hi";

app.get("/test", (req, res) => {
  res.json({ message: `Server is running! ${test}` });
});

// Register route
app.post("/register", async (req, res) => {
  const { name, email, username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ success: false, message: "User already exists" });

    const newUser = new User({ name, email, username, password });
    await newUser.save();

    res.json({ success: true, message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Login Route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    const isMatch = (password == user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    req.session.user = { id: user._id, username: user.username };
    res.json({ success: true, message: "Logged in successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Check Auth Route
app.get("/auth", (req, res) => {
  if (req.session.user) {
    return res.json({ isAuthenticated: true, user: req.session.user });
  }
  res.status(401).json({ isAuthenticated: false });
});

// Logout Route
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid"); // Clear session cookie
    res.json({ success: true, message: "Logged out" });
  });
});

// Connect MongoDB Client
mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});