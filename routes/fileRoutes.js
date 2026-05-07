const express = require("express");
const router = express.Router();

const fileController = require("../controllers/fileController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", fileController.testFileController);

router.post(
  "/upload",
  authMiddleware,
  fileController.uploadMiddleware,
  fileController.uploadFile
);

module.exports = router;