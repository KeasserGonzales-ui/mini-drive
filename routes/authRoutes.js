const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { isSuperAdmin } = require("../middleware/roleMiddleware");

// TEST ROUTES
router.get("/", authController.testAuth);
router.get("/hello", authController.helloAuth);

// LOGIN
router.post("/login-test", authController.loginTest);
router.post("/login", authController.login);

// PROFILE
router.get(
  "/profile",
  authMiddleware,
  authController.profile
);

// REGISTER
router.post(
  "/register",
  authMiddleware,
  isSuperAdmin,
  authController.register
);

module.exports = router;