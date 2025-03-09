const JWT = require("jsonwebtoken");
const User = require("../model/userModel");
const protectRoute = async (req, res, next) => {
  const accessToken = req.cookies.accessToken;
  if (!accessToken) {
    res
      .status(401)
      .json({ message: "Unauthorized - No access token provider" });
  }
  try {
    const decoded = JWT.verify(accessToken, process.env.ACCESS_TOKEN_KEY);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;

    next();
  } catch (err) {
    if (err.name === "TokenExpireError") {
      return res
        .status(401)
        .json({ message: "Unathorized - Access token expire" });
    } else {
      return res.status(401).json({ message: err });
    }
  }
};
const isAllowed = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(400).json({ message: "Unathorized for this route" });
    }
    next();
  };
};

module.exports = { protectRoute, isAllowed };
