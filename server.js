const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { HostAddress } = require("mongodb");

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request bodies

// Sample Route
const test = "hi";

app.get("/", (req, res) => {
  res.json({ message: `Server is running! ${test}` });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});