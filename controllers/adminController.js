const db = require("../config/db");

const getAdminStats = (req, res) => {
  const usersQuery =
    "SELECT COUNT(*) AS totalUsers FROM users";

  const filesQuery =
    "SELECT COUNT(*) AS totalFiles FROM files";

  db.query(usersQuery, (err, usersResult) => {
    if (err) {
      console.error("Users count error:", err);

      return res.status(500).json({
        message: "Users query failed",
      });
    }

    db.query(filesQuery, (err, filesResult) => {
      if (err) {
        console.error("Files count error:", err);

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

module.exports = {
  getAdminStats,
};