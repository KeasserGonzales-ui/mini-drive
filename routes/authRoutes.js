const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { isSuperAdmin } = require("../middleware/roleMiddleware");

router.get("/", authController.testAuth);

router.get("/hello", authController.helloAuth);

router.post("/login-test", authController.loginTest);

router.get(
  "/profile",
  authMiddleware,
  authController.profile
);

router.post("/login", authController.login);

router.post(
  "/register",
  authMiddleware,
  isSuperAdmin,
  authController.register
);
module.exports = router;