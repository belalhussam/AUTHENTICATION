const User = require("../model/userModel");
const { v4: uuidv4 } = require("uuid");
const JWT = require("jsonwebtoken");
const redis = require("../config/redis");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const sendEmail = require("./sendEmail");
const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const imageCoverName = `profileImg-${uuidv4()}-${Date.now()}.jpeg`;
    cb(null, imageCoverName);
  },
});
exports.upload = multer({ storage: storage }).single("profileImg");

const createToken = (userId) => {
  const refreshToken = JWT.sign({ userId }, process.env.REFRESH_TOKEN_KEY, {
    expiresIn: "7d",
  });
  const accessToken = JWT.sign({ userId }, process.env.ACCESS_TOKEN_KEY, {
    expiresIn: "15m",
  });
  return { refreshToken, accessToken };
};
const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(
    `refresh_token:${userId}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60
  );
};

const setCookies = (res, refreshToken, accessToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
};
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      res.status(400).json({ message: "email already in use" });
    } else {
      const user = await User.create({
        name,
        email,
        password,
        profileImg: req.file.path,
      });
      // authenticate
      const { refreshToken, accessToken } = createToken(user._id);
      storeRefreshToken(user._id, refreshToken);
      setCookies(res, refreshToken, accessToken);
      res.status(200).json({ user: user, message: "registered successfully" });
    }
  } catch (err) {
    res.status(500).json({ message: err });
  }
};
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.comparePasswrod(password))) {
      // authenticate
      const { refreshToken, accessToken } = createToken(user._id);
      storeRefreshToken(user._id, refreshToken);
      setCookies(res, refreshToken, accessToken);
      res.status(200).json({ message: "login successfully" });
    } else {
      res.status(400).json({ message: "Invalid password or email" });
    }
  } catch (err) {
    res.status(500).json({ message: err });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const decoded = JWT.verify(refreshToken, process.env.REFRESH_TOKEN_KEY);
      await redis.del(`refresh_token:${decoded.userId}`);
    }
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: err });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        email,
      },
      { new: true }
    );

    res.status(200).json({ message: "updated", user });
  } catch (err) {
    res.status(500).json({ message: err });
  }
};
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res
        .status(400)
        .json({ message: "User not found or invalid currentpassword" });
    }
    user.password = req.body.newpassword;
    user.passwordChangedAt = Date.now();
    await user.save();
    const { refreshToken, accessToken } = createToken(user._id);
    storeRefreshToken(user._id, refreshToken);
    setCookies(res, refreshToken, accessToken);
    res.status(200).json({ message: "changePassword" });
  } catch (err) {
    res.status(400).json({ message: err });
  }
};
exports.getLoginUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(400).json({ message: "User not Found" });
    }
    res.status(200).json({ user: user });
  } catch (err) {
    res.status(400).json({ message: err });
  }
};
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    res.status(500).json({ message: err });
  }
};

exports.forgetPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      res
        .status(400)
        .json({ message: `There is no user with that email ${email}` });
    }
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedResetCode = crypto
      .createHash("sha256")
      .update(resetCode)
      .digest("hex");
    user.passwordResetCode = hashedResetCode;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    user.passwordResetVerified = false;
    await user.save();
    const message = `Hi ${user.name},\n We received a request to reset the password on your authentication. \n ${resetCode} \n Enter this code to complete the reset. \n Thanks for helping us keep your account secure.elbolbol`;
    try {
      await sendEmail({
        email: user.email,
        subject: "Your password reset code (valid for 10 min)",
        message,
      });
    } catch (err) {
      user.passwordResetCode = undefined;
      user.passwordResetExpires = undefined;
      user.passwordResetVerified = undefined;

      await user.save();
      return next(new ApiError("There is an error in sending email", 500));
    }

    res.status(200).json({
      status: "Success",
      message: "Reset code sent to email",
    });
  } catch (err) {
    res.status(400).json({ message: err });
  }
};
exports.verifyResetCode = async (req, res) => {
  try {
    const hashedResetCode = crypto
      .createHash("sha256")
      .update(req.body.resetCode)
      .digest("hex");
    const user = await User.findOne({
      passwordResetCode: hashedResetCode,
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: "Reset code invalid or expire" });
    }
    user.passwordResetVerified = true;
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    res.status(200).json({ message: "Success" });
  } catch (err) {
    res.status(400).json({ message: err });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.body.email,
    });
    if (!user) {
      return res
        .status(400)
        .json({ message: `There is no user with that email ${email}` });
    }
    if (!user.passwordResetVerified) {
      return res.status(400).json({ message: "Reset code not verified" });
    }
    user.password = req.body.newPassword;
    user.passwordChangedAt = Date.now();
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.verfiyPassResetPassword = undefined;
    await user.save();
    // authenticate
    const { refreshToken, accessToken } = createToken(user._id);
    storeRefreshToken(user._id, refreshToken);
    setCookies(res, refreshToken, accessToken);
    res.status(200).json({ accessToken });
  } catch (err) {
    res.status(400).json({ message: err });
  }
};
