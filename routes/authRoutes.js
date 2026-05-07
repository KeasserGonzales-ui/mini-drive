const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authController.testAuth);

router.get("/hello", authController.helloAuth);

router.post("/login-test", authController.loginTest);

router.get("/profile", authMiddleware, authController.profile);

module.exports = router;