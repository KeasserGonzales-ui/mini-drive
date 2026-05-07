const express = require("express");
const router = express.Router();

const {
  getAdminStats,
  getAllUsers,
  deleteUser,
  updateUserRole,
} = require("../controllers/adminController");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  adminOnly,
} = require("../middleware/adminMiddleware");

// protected admin dashboard stats
router.get(
  "/stats",
  authMiddleware,
  adminOnly,
  getAdminStats
);

// protected get users
router.get(
  "/users",
  authMiddleware,
  adminOnly,
  getAllUsers
);

// protected delete user
router.delete(
  "/users/:id",
  authMiddleware,
  adminOnly,
  deleteUser
);

// protected update role
router.patch(
  "/users/:id/role",
  authMiddleware,
  adminOnly,
  updateUserRole
);

module.exports = router;