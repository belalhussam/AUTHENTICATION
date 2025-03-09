const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  logout,
  updateUser,
  deleteUser,
  changePassword,
  getLoginUser,
  forgetPassword,
  verifyResetCode,
  resetPassword,
  upload,
} = require("../services/authServices");
const { loginValidator } = require("../joi/validator/authValidator");

const validator = require("../middleware/commonValidation");
const { protectRoute, isAllowed } = require("../middleware/authMiddleware");
router.post("/signup", upload, signup);
router.post("/login", validator(loginValidator), login);
router.post("/logout", logout);
router
  .route("/")
  .put(protectRoute, upload, updateUser)
  .delete(protectRoute, isAllowed("admin"), deleteUser)
  .get(protectRoute, getLoginUser);
router.put("/changepassword", protectRoute, changePassword);
router.post("/forgetPassword", forgetPassword);
router.post("/verifyResetCode", verifyResetCode);
router.post("/resetPassword", resetPassword);
module.exports = router;
