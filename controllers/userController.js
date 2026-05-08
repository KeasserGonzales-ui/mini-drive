const db = require("../config/db");

const getUsers = (req, res) => {
  db.query(
    "SELECT id, name, email, role FROM users ORDER BY id DESC",
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "Error fetching users",
          error: err.message,
        });
      }

      res.status(200).json(rows);
    }
  );
};

const deleteUser = (req, res) => {
  const userId = Number(req.params.id);

  if (!userId) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  if (userId === Number(req.user.id)) {
    return res.status(400).json({
      message: "You cannot delete your own account",
    });
  }

  db.query(
    "SELECT id, name, email, role FROM users WHERE id = ?",
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "Error finding user",
          error: err.message,
        });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const targetUser = rows[0];

      if (targetUser.role === "superadmin") {
        return res.status(403).json({
          message: "Cannot delete Super Admin account",
        });
      }

      db.query("DELETE FROM files WHERE user_id = ?", [userId], (err) => {
        if (err) {
          return res.status(500).json({
            message: "Error deleting user files",
            error: err.message,
          });
        }

        db.query("DELETE FROM users WHERE id = ?", [userId], (err) => {
          if (err) {
            return res.status(500).json({
              message: "Error deleting user",
              error: err.message,
            });
          }

          res.status(200).json({
            message: "User deleted successfully",
            userId,
          });
        });
      });
    }
  );
};

const promoteAdmin = (req, res) => {
  updateUserRole(req, res, "admin");
};

const demoteAdmin = (req, res) => {
  updateUserRole(req, res, "user");
};

const updateUserRole = (req, res, newRole) => {
  const userId = Number(req.params.id);

  if (!userId) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  db.query(
    "SELECT id, name, email, role FROM users WHERE id = ?",
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "Error finding user",
          error: err.message,
        });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const targetUser = rows[0];

      if (targetUser.role === "superadmin") {
        return res.status(403).json({
          message: "Cannot change Super Admin role",
        });
      }

      db.query(
        "UPDATE users SET role = ? WHERE id = ?",
        [newRole, userId],
        (err, result) => {
          if (err) {
            return res.status(500).json({
              message: "Error updating role",
              error: err.message,
            });
          }

          res.status(200).json({
            message: `User role updated to ${newRole}`,
            userId,
            role: newRole,
            affectedRows: result.affectedRows,
            changedRows: result.changedRows,
          });
        }
      );
    }
  );
};

module.exports = {
  getUsers,
  deleteUser,
  promoteAdmin,
  demoteAdmin,
};