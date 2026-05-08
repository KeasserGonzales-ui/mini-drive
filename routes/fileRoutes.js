const express = require("express");
const router = express.Router();

const fileController = require("../controllers/fileController");
const authMiddleware = require("../middleware/authMiddleware");

const {
  isSuperAdmin,
} = require("../middleware/roleMiddleware");

router.get("/", fileController.testFileController);

router.post(
  "/upload",
  authMiddleware,
  fileController.uploadMiddleware,
  fileController.uploadFile
);

router.get(
  "/:filename",
  authMiddleware,
  fileController.getFile
);

router.get(
  "/share/:filename",
  fileController.shareFile
);

router.delete(
  "/delete/:filename",
  authMiddleware,
  isSuperAdmin,
  fileController.deleteFile
);

module.exports = router;