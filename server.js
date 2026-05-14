require("dotenv").config();

const cors = require("cors");
const express = require("express");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");

const loggerMiddleware = require("./middleware/loggerMiddleware");
const { isSuperAdmin } = require("./middleware/roleMiddleware");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.use(loggerMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicDir = path.join(__dirname, "public");
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

app.use(express.static(publicDir));

app.use("/auth", authRoutes);
app.use("/files", fileRoutes);
app.use("/users", userRoutes);
app.use("/api/admin", adminRoutes);

function ensureFoldersTable() {
  db.query(
    `
    CREATE TABLE IF NOT EXISTS folders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      user_id INT NOT NULL,
      parent_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    (err) => {
      if (err) {
        console.error("❌ Create folders table error:", err.message);
      } else {
        console.log("✅ folders table ready");
      }
    }
  );
}

function ensureUploadedAtColumn() {
  db.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'files'
    AND COLUMN_NAME = 'uploaded_at'
    `,
    (err, rows) => {
      if (err) return console.error("❌ Column check error:", err.message);

      if (rows.length === 0) {
        db.query(
          "ALTER TABLE files ADD COLUMN uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
          (err) => {
            if (err) return console.error("❌ Add uploaded_at error:", err.message);
            console.log("✅ uploaded_at column added to files table");
          }
        );
      } else {
        console.log("✅ uploaded_at column already exists");
      }
    }
  );
}

function ensureFolderIdColumn() {
  db.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'files'
    AND COLUMN_NAME = 'folder_id'
    `,
    (err, rows) => {
      if (err) return console.error("❌ folder_id check error:", err.message);

      if (rows.length === 0) {
        db.query(
          "ALTER TABLE files ADD COLUMN folder_id INT DEFAULT NULL",
          (err) => {
            if (err) return console.error("❌ Add folder_id error:", err.message);
            console.log("✅ folder_id column added to files table");
          }
        );
      } else {
        console.log("✅ folder_id column already exists");
      }
    }
  );
}

function logActivity(user, action, fileName = null, details = null) {
  if (!user) return;

  const sql = `
    INSERT INTO activity_logs 
    (user_id, username, email, role, action, file_name, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    user.id || null,
    user.name || user.username || null,
    user.email || null,
    user.role || null,
    action,
    fileName,
    details,
  ];

  db.query(sql, params, (err) => {
    if (err) {
      console.error("❌ Activity log error:", err.message);
    }
  });
}

app.get("/", (req, res) => {
  res.redirect("/login.html");
});

const verifyToken = (req, res, next) => {
  let authHeader = req.headers.authorization;

  if (!authHeader && req.query.token) {
    authHeader = "Bearer " + req.query.token;
  }

  if (!authHeader) {
    return res.status(403).json({
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    req.user = decoded;
    next();
  });
};

function isAdminRole(user) {
  return user.role === "admin" || user.role === "superadmin";
}

app.get("/api/admin/test", verifyToken, isSuperAdmin, (req, res) => {
  res.json({
    message: "Welcome Super Admin 🔥",
    admin: req.user,
  });
});

app.get("/api/admin/stats", verifyToken, isSuperAdmin, (req, res) => {
  db.query("SELECT COUNT(*) AS totalUsers FROM users", (err, userRows) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query("SELECT COUNT(*) AS totalFiles FROM files", (err, fileRows) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        totalUsers: userRows[0].totalUsers,
        totalFiles: fileRows[0].totalFiles,
      });
    });
  });
});

app.get("/api/admin/users", verifyToken, isSuperAdmin, (req, res) => {
  db.query(
    "SELECT id, name, email, role FROM users ORDER BY id DESC",
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get("/api/admin/files", verifyToken, (req, res) => {
  const user = req.user;
  const isAdminUser = isAdminRole(user);

  const search = req.query.search ? req.query.search.trim() : "";
  const visibility = req.query.visibility || "all";
  const sort = req.query.sort === "oldest" ? "ASC" : "DESC";
  const folderId = req.query.folder_id || "root";

  let sql = `
    SELECT
      files.id,
      files.filename,
      files.original_name,
      files.user_id,
      files.visibility,
      files.folder_id,
      files.uploaded_at,
      DATE_FORMAT(files.uploaded_at, '%M %d, %Y %h:%i %p') AS uploaded_date,
      users.name AS owner_name,
      users.email AS owner_email
    FROM files
    LEFT JOIN users ON files.user_id = users.id
    WHERE 1 = 1
  `;

  const params = [];

  if (!isAdminUser) {
    sql += " AND (files.user_id = ? OR files.visibility = 'public')";
    params.push(user.id);
  }

  if (folderId === "root") {
    sql += " AND files.folder_id IS NULL";
  } else if (folderId !== "all") {
    sql += " AND files.folder_id = ?";
    params.push(folderId);
  }

  if (search !== "") {
    sql += `
      AND (
        files.original_name LIKE ?
        OR files.filename LIKE ?
        OR users.name LIKE ?
        OR users.email LIKE ?
      )
    `;

    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }

  if (visibility === "public" || visibility === "private") {
    sql += " AND files.visibility = ?";
    params.push(visibility);
  }

  sql += ` ORDER BY files.uploaded_at ${sort}, files.id ${sort}`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Files query error:", err);

      return res.status(500).json({
        error: err.message,
      });
    }

    res.json(rows);
  });
});

/*
========================================
FOLDER ROUTES FIXED
========================================
*/

app.post("/folders/create", verifyToken, (req, res) => {
  const user = req.user;
  const { name, parent_id } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Folder name required",
    });
  }

  let cleanParentId = null;

  if (
    parent_id !== undefined &&
    parent_id !== null &&
    parent_id !== "" &&
    parent_id !== "root"
  ) {
    cleanParentId = Number(parent_id);

    if (isNaN(cleanParentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parent folder ID",
      });
    }
  }

  db.query(
    `
    CREATE TABLE IF NOT EXISTS folders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      user_id INT NOT NULL,
      parent_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    (tableErr) => {
      if (tableErr) {
        console.error("TABLE ERROR:", tableErr);

        return res.status(500).json({
          success: false,
          message: "TABLE ERROR: " + tableErr.message,
        });
      }

      db.query(
        `
        INSERT INTO folders (name, user_id, parent_id)
        VALUES (?, ?, ?)
        `,
        [name.trim(), user.id, cleanParentId],
        (insertErr, result) => {
          if (insertErr) {
            console.error("INSERT ERROR:", insertErr);

            return res.status(500).json({
              success: false,
              message: "INSERT ERROR: " + insertErr.message,
            });
          }

          return res.json({
            success: true,
            message: "Folder created successfully",
            folderId: result.insertId,
          });
        }
      );
    }
  );
});

app.get("/folders", verifyToken, (req, res) => {
  const user = req.user;
  const parentId = req.query.parent_id || "root";

  let sql = `
    SELECT
      id,
      name,
      user_id,
      parent_id,
      created_at,
      DATE_FORMAT(created_at, '%M %d, %Y %h:%i %p') AS created_date
    FROM folders
    WHERE user_id = ?
  `;

  const params = [user.id];

  if (parentId === "root") {
    sql += " AND parent_id IS NULL";
  } else {
    sql += " AND parent_id = ?";
    params.push(parentId);
  }

  sql += " ORDER BY created_at DESC, id DESC";

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Load folders error:", err);

      return res.status(500).json({
        success: false,
        message: err.message || "Failed to load folders",
      });
    }

    return res.json(rows);
  });
});

app.delete("/folders/:id", verifyToken, (req, res) => {
  const user = req.user;
  const folderId = Number(req.params.id);

  if (!folderId || isNaN(folderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid folder ID",
    });
  }

  db.query(
    "SELECT id, name FROM folders WHERE id = ? AND user_id = ?",
    [folderId, user.id],
    (err, rows) => {
      if (err) {
        console.error("Find folder error:", err);

        return res.status(500).json({
          success: false,
          message: err.message || "Failed to find folder",
        });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Folder not found",
        });
      }

      db.query(
        "UPDATE files SET folder_id = NULL WHERE folder_id = ? AND user_id = ?",
        [folderId, user.id],
        (err) => {
          if (err) {
            console.error("Move files error:", err);

            return res.status(500).json({
              success: false,
              message: err.message || "Failed to move files",
            });
          }

          db.query(
            "DELETE FROM folders WHERE id = ? AND user_id = ?",
            [folderId, user.id],
            (err) => {
              if (err) {
                console.error("Delete folder error:", err);

                return res.status(500).json({
                  success: false,
                  message: err.message || "Failed to delete folder",
                });
              }

              return res.json({
                success: true,
                message: "Folder deleted successfully",
              });
            }
          );
        }
      );
    }
  );
});

app.get("/api/activity-logs", verifyToken, isSuperAdmin, (req, res) => {
  db.query(
    `
    SELECT
      id,
      user_id,
      username,
      email,
      role,
      action,
      file_name,
      details,
      created_at,
      DATE_FORMAT(created_at, '%M %d, %Y %h:%i %p') AS activity_date
    FROM activity_logs
    ORDER BY created_at DESC, id DESC
    LIMIT 100
    `,
    (err, rows) => {
      if (err) {
        console.error("Activity logs query error:", err);

        return res.status(500).json({
          error: err.message,
        });
      }

      res.json(rows);
    }
  );
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Public folder: ${publicDir}`);
  console.log(`📁 Uploads folder: ${uploadsDir}`);

  ensureFoldersTable();
  ensureUploadedAtColumn();
  ensureFolderIdColumn();
});