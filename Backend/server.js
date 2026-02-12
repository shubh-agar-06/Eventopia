const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");
const authRoutes = require("./routes/auth");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api", authRoutes);

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
