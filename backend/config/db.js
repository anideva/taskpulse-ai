const mongoose = require("mongoose");
const dns = require("dns");

// Ensure MongoDB Atlas SRV records resolve reliably on Windows
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (err) {
  // Ignore if custom DNS cannot be set
}

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  } 
};

module.exports = connectDB;
