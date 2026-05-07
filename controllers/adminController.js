const db = require("../config/db");

// update user role
const updateUserRole = (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  const allowedRoles = [
    "user",
    "admin",
    "superadmin",
  ];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      message: "Invalid role",
    });
  }

  const query =
    "UPDATE users SET role = ? WHERE id = ?";

  db.query(query, [role, userId], (err, result) => {

    if (err) {
      console.error("Update role error:", err);

      return res.status(500).json({
        message: "Failed to update role",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "Role updated successfully",
      userId,
      newRole: role,
    });

  });
};

// admin dashboard stats
const getAdminStats = (req, res) => {
  const usersQuery =
    "SELECT COUNT(*) AS totalUsers FROM users";

  const filesQuery =
    "SELECT COUNT(*) AS totalFiles FROM files";

  db.query(usersQuery, (err, usersResult) => {

    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Users query failed",
      });
    }

    db.query(filesQuery, (err, filesResult) => {

      if (err) {
        console.error(err);

        return res.status(500).json({
          message: "Files query failed",
        });
      }

      res.json({
        totalUsers: usersResult[0].totalUsers,
        totalFiles: filesResult[0].totalFiles,
      });

    });

  });
};

// get all users
const getAllUsers = (req, res) => {

  const query =
    "SELECT id, name, email, role, created_at FROM users ORDER BY id DESC";

  db.query(query, (err, result) => {

    if (err) {
      console.error("Get users error:", err);

      return res.status(500).json({
        message: "Failed to fetch users",
      });
    }

    res.json(result);

  });

};

// delete user
const deleteUser = (req, res) => {
  const userId = req.params.id;

  if (Number(userId) === 1) {
    return res.status(403).json({
      message: "Cannot delete main admin account",
    });
  }

  const query =
    "DELETE FROM users WHERE id = ?";

  db.query(query, [userId], (err, result) => {

    if (err) {
      console.error("Delete user error:", err);

      return res.status(500).json({
        message: "Failed to delete user",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "User deleted successfully",
      deletedUserId: userId,
    });

  });

};

module.exports = {
  getAdminStats,
  getAllUsers,
  deleteUser,
  updateUserRole,
};