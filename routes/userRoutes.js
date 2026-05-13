const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  isSuperAdmin,
} = require("../middleware/roleMiddleware");

const {
  getUsers,
  getShareableUsers,
  deleteUser,
  promoteAdmin,
  demoteAdmin,
} = require("../controllers/userController");

router.get(
  "/shareable",
  authMiddleware,
  getShareableUsers
);

router.get(
  "/",
  authMiddleware,
  isSuperAdmin,
  getUsers
);

router.delete(
  "/delete/:id",
  authMiddleware,
  isSuperAdmin,
  deleteUser
);

router.put(
  "/promote/:id",
  authMiddleware,
  isSuperAdmin,
  promoteAdmin
);

router.put(
  "/demote/:id",
  authMiddleware,
  isSuperAdmin,
  demoteAdmin
);

module.exports = router;