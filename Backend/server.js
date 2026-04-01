require("./loadEnv");

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const db = require("./db");
const authRoutes = require("./routes/auth");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "Frontend")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", authRoutes);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "Frontend", "login.html"));
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
