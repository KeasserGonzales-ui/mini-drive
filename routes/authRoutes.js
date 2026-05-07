const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

router.get("/", authController.testAuth);

router.get("/hello", authController.helloAuth);

router.post("/login-test", authController.loginTest);

module.exports = router;