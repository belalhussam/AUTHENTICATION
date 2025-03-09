const mongoose = require("mongoose");
const dbConnetion = () => {
  mongoose.connect(process.env.DATABASE_URL).then((conn) => {
    console.log(`database connected ${conn.connection.host}`);
  });
};
module.exports = dbConnetion;
