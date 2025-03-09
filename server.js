const express = require("express");
const app = express();
const authRoute = require("./routes/authRoutes");
const dbConnetion = require("./config/db");
const cookieParser = require("cookie-parser");
require("dotenv").config({ path: ".env" });
// middlewares
app.use(express.json());
app.use(cookieParser());
// db connection
dbConnetion();
// Route
app.use("/api/v1/auth", authRoute);
const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log("server is hosting");
});
