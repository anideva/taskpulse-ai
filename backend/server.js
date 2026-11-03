require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const aiRoutes = require("./routes/ai.routes");
const teamRoutes = require("./routes/teamRoutes");

connectDB();

const app = express();

// THIS IS REQUIRED (VERY IMPORTANT)
app.use(express.json());

// optional but good
app.use(cors());

app.use("/api/users", userRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/team", teamRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

