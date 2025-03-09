const express = require("express");
const app = express();
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const { rateLimit } = require("express-rate-limit");
const authRoute = require("./routes/authRoutes");
const dbConnetion = require("./config/db");
const cookieParser = require("cookie-parser");
require("dotenv").config({ path: ".env" });
// middlewares
app.use(express.json({ limit: "10kb" }));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  message: "too many accounts from this IP ,please try again after an hour",
});
app.use(helmet());
app.use("/api", limiter);
app.use(cookieParser());
app.use(cors());
app.options("*", cors());
app.use(compression());
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
// db connection
dbConnetion();
// Route
app.use("/api/v1/auth", authRoute);
app.all("*", (req, res, next) => {
  next(
    res
      .status(400)
      .json({ message: `Can't find this route: ${req.originalUrl}` })
  );
});

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log("server is hosting");
});
// Handle rejection outside express
process.on("unhandledRejection", (err) => {
  console.error(`UnhandledRejection Errors: ${err.name} | ${err.message}`);
  server.close(() => {
    console.error(`Shutting down....`);
    process.exit(1);
  });
});
