const express = require("express");
const path = require("path");

const app = express();

// Example API route (keeps backend working)
app.get("/api/hello", (req, res) => {
  res.json({ message: "API is working 🚀" });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, "public")));

// All other routes → frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));