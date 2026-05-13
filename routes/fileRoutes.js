const express = require("express");
const router = express.Router();

const fileController = require("../controllers/fileController");
const authMiddleware = require("../middleware/authMiddleware");

const { isSuperAdmin } = require("../middleware/roleMiddleware");

router.get("/", fileController.testFileController);

router.post(
  "/upload",
  authMiddleware,
  fileController.uploadMiddleware,
  fileController.uploadFile
);

router.get(
  "/list",
  authMiddleware,
  fileController.getFiles
);

// GET FILES SHARED WITH CURRENT USER
router.get(
  "/shared-with-me",
  authMiddleware,
  fileController.getSharedWithMe
);

// SHARE FILE TO SPECIFIC USER
router.post(
  "/share",
  authMiddleware,
  fileController.shareFileToUser
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

router.get(
  "/:filename",
  authMiddleware,
  fileController.getFile
);

module.exports = router;