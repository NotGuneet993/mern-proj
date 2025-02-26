const express = require("express");
const session = require("express-session"); // Cookie / Session modules
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const uri = process.env.URI

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(cookieParser()); // Cookies

// CORS config
app.use(
  cors({
    origin: "https://www.knightnav.net/",
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

app.get("/", (req, res) => {
  res.json({ message: `Server is running! ${test}` });
});

// Login Route
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // TODO Replace validation skeleton with DB check
  if (username === "user" && password === "password") {
    req.session.user = { username }; // Store user in session
    return res.json({ success: true, message: "Logged in successfully" });
  }

  res.status(401).json({ success: false, message: "Invalid credentials" });
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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});