const Redis = require("ioredis");
require("dotenv").config({ path: "config.env" });
const redis = new Redis(process.env.REDIS_DATABASE_URL);
module.exports = redis;
