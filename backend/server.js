require('dotenv').config();
const express = require("express");
const session = require("express-session"); 

const app = express();
const PORT = process.env.PORT || 5001;
app.use(express.json()); 
app.use(cookieParser()); 

// middleware  setup
const cookieParser = require("cookie-parser");
const cors = require("cors");
const allowedOrigins = [ 
  "https://www.knightnav.net",
  "http://localhost:5173"
];

// MongoDB connection
const mongoose = require("mongoose");
const uri = process.env.URI;
const User = require("./models/Users.js"); 

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

// Connect MongoDB Client
mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("MongoDB connected successfully");
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections in DB:", collections.map(c => c.name)); // Log available collections
  })
  .catch((err) => console.error("MongoDB connection error:", err));

/*
API Endpoints -----------------------------------------------------------
*/

//this is for all user related routes (API calls)
const userRoutes = require("./routes/userRoutes.js");
app.use("/users", userRoutes); 



// Start Server -------------- DO NOT PUT ANYTHING UNDER THIS LINE
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});