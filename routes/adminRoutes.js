const express = require("express");
const router = express.Router();

const {
  getAdminStats,
} = require("../controllers/adminController");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  adminOnly,
} = require("../middleware/adminMiddleware");

// admin dashboard stats
router.get(
  "/stats",
  authMiddleware,
  adminOnly,
  getAdminStats
);

module.exports = router;