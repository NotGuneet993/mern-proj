require('dotenv').config();
const express = require("express");
const session = require("express-session");
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5001;
app.use(express.json()); 

// CORS config
const cors = require("cors");
const allowedOrigins = [ 
  "https://www.knightnav.net",
  "http://localhost:5173"
];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Will account for Cookies / Sessions
  })
);

// Cookie middleware
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Session middleware
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

// Token middleware
const crypto = require("crypto");
app.use((req, res, next) => {
  req.crypto = crypto;
  next();
});

//body parser 
app.use(bodyParser.json());

// Connect MongoDB Client
const mongoose = require("mongoose");
const uri = process.env.URI;
mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("MongoDB connected successfully");
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections in DB:", collections.map(c => c.name)); // Log available collections
  })
  .catch((err) => console.error("MongoDB connection error:", err));


// Connect Mailgun Client
const FormData = require("form-data"); 
const Mailgun = require("mailgun.js");
const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: "api",
  key: process.env.mailgun || "API_KEY",
});

// Mailgun middleware
app.use((req, res, next) => {
  req.mailgun = mg;
  next();
});

// Generate graph data
//const genGraph = require("./functions/tsrspmods.js");
//let { edges, labels, shortestPaths } = genGraph();
// TODO Uncomment 77 and 78 when we actually need it
// TODO When Ronan finalizes the graph these will become static and we can just store it in DB for good
// TODO Something with this data

/*
API Endpoints -----------------------------------------------------------
*/

//this is for all user related routes (API calls)
const userRoutes = require("./routes/userRoutes.js");
app.use("/users", userRoutes); 

const scheduleRoutes = require("./routes/scheduleRoutes.js");
app.use("/schedule", scheduleRoutes);

const locationsRoutes = require("./routes/locationsRoutes.js");
app.use("/locations", locationsRoutes);

// Start Server -------------- DO NOT PUT ANYTHING UNDER THIS LINE
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});